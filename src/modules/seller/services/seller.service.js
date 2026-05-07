const { SellerRepository } = require("../repositories/seller.repository");
const { buildDomainEvent } = require("../../../contracts/events/event-factory");
const { DOMAIN_EVENTS } = require("../../../contracts/events/domain-events");
const { eventPublisher } = require("../../../infrastructure/events/event-publisher");
const { KYC_STATUS } = require("../../../shared/domain/commerce-constants");
const { AppError } = require("../../../shared/errors/app-error");
const { hashValue } = require("../../../shared/utils/hash");
const { ROLES } = require("../../../shared/constants/roles");
const { DEFAULT_SELLER_MODULES, normalizeModuleName } = require("../../../shared/auth/module-scope");
const {
  SELLER_ONBOARDING_STATUS,
  buildSellerOnboardingState,
  getSellerKycStatus,
  hasCompleteSellerBankDetails: hasCompleteSellerBankDetailsForOnboarding,
  hasCompleteSellerProfile: hasCompleteSellerProfileForOnboarding,
  resolveSellerOnboardingStatus,
} = require("../../../shared/domain/seller-onboarding");

class SellerService {
  constructor({ sellerRepository = new SellerRepository() } = {}) {
    this.sellerRepository = sellerRepository;
  }

  resolveSellerId(actor) {
    return actor.ownerSellerId || actor.userId;
  }

  toPlainObject(value = {}) {
    if (!value) {
      return {};
    }
    if (typeof value.toObject === "function") {
      return value.toObject({ depopulate: true });
    }
    return { ...value };
  }

  mergeSellerProfile(existingProfile = {}, payload = {}) {
    const profile = this.toPlainObject(existingProfile);
    const profileFields = { ...payload };
    const { bankDetails, businessAddress, pickupAddress } = profileFields;
    delete profileFields.onboardingChecklist;
    delete profileFields.bankDetails;
    delete profileFields.businessAddress;
    delete profileFields.pickupAddress;

    return {
      ...profile,
      ...profileFields,
      ...(bankDetails
        ? { bankDetails: { ...(profile.bankDetails || {}), ...bankDetails } }
        : {}),
      ...(businessAddress
        ? { businessAddress: { ...(profile.businessAddress || {}), ...businessAddress } }
        : {}),
      ...(pickupAddress
        ? { pickupAddress: { ...(profile.pickupAddress || {}), ...pickupAddress } }
        : {}),
    };
  }

  mergeKycIntoSellerProfile(sellerProfile = {}, kyc = null) {
    if (!kyc) {
      return this.toPlainObject(sellerProfile);
    }

    const profile = this.toPlainObject(sellerProfile);
    return {
      ...profile,
      legalBusinessName: profile.legalBusinessName || kyc.legal_name,
      businessType: profile.businessType || kyc.business_type,
      panNumber: profile.panNumber || kyc.pan_number,
      gstNumber: profile.gstNumber || kyc.gst_number,
      aadhaarNumber: profile.aadhaarNumber || kyc.aadhaar_number,
    };
  }

  applySellerProfileDefaults(sellerProfile = {}, user = {}, kyc = null) {
    const profile = this.mergeKycIntoSellerProfile(sellerProfile, kyc);
    const profileName = [user?.profile?.firstName, user?.profile?.lastName]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ");

    return {
      ...profile,
      displayName: profile.displayName || profileName || undefined,
      supportEmail: profile.supportEmail || user?.email || undefined,
      supportPhone: profile.supportPhone || user?.phone || undefined,
    };
  }

  withOnboardingState(sellerProfile = {}, kyc = null, user = {}) {
    const profile = this.applySellerProfileDefaults(sellerProfile, user, kyc);
    const { checklist, onboardingStatus } = buildSellerOnboardingState({
      sellerProfile: profile,
      user,
      kyc,
    });

    return {
      ...profile,
      onboardingChecklist: checklist,
      onboardingStatus,
    };
  }

  async submitKyc(payload, actor) {
    const sellerId = this.resolveSellerId(actor);
    const record = await this.sellerRepository.upsertKyc({
      ...payload,
      sellerId,
      verificationStatus: KYC_STATUS.SUBMITTED,
    });

    const seller = await this.sellerRepository.findSellerById(sellerId);
    if (seller) {
      const existingProfile = this.mergeSellerProfile(
        this.mergeKycIntoSellerProfile(seller.sellerProfile || {}, record),
        { bankDetails: payload.bankDetails || {} },
      );
      await this.sellerRepository.updateSellerProfile(
        sellerId,
        this.withOnboardingState(existingProfile, record, seller),
      );
    }

    await eventPublisher.publish(
      buildDomainEvent(
        DOMAIN_EVENTS.SELLER_KYC_SUBMITTED_V1,
        {
          sellerId,
          verificationStatus: record.verification_status,
          legalName: record.legal_name,
        },
        {
          source: "seller-module",
          aggregateId: sellerId,
        },
      ),
    );
    return record;
  }

  async updateProfile(payload, actor) {
    const sellerId = this.resolveSellerId(actor);
    const existingSeller = await this.sellerRepository.findSellerById(sellerId);
    if (!existingSeller) {
      throw new AppError("Seller profile not found", 404);
    }

    const kycRecord = await this.sellerRepository.findKycBySellerId(sellerId);
    const nextProfile = this.mergeSellerProfile(existingSeller.sellerProfile || {}, payload);
    const nextProfileWithOnboarding = this.withOnboardingState(nextProfile, kycRecord, existingSeller);
    const updatedSeller = await this.sellerRepository.updateSellerProfile(sellerId, nextProfileWithOnboarding);

    if (
      nextProfileWithOnboarding.onboardingStatus === SELLER_ONBOARDING_STATUS.READY_FOR_GO_LIVE &&
      existingSeller.accountStatus !== "active"
    ) {
      await this.sellerRepository.updateSellerAccountStatus(
        sellerId,
        "active",
        nextProfileWithOnboarding.onboardingStatus,
      );
    }

    return updatedSeller?.sellerProfile || null;
  }

  async getProfile(actor) {
    const sellerId = this.resolveSellerId(actor);
    const [seller, kyc] = await Promise.all([
      this.sellerRepository.findSellerById(sellerId),
      this.sellerRepository.findKycBySellerId(sellerId),
    ]);

    if (!seller) {
      throw new AppError("Seller profile not found", 404);
    }

    return {
      profile: this.withOnboardingState(seller.sellerProfile || {}, kyc, seller),
      settings: seller.sellerSettings || null,
      kyc,
    };
  }

  assertSellerWebActor(actor) {
    const allowedRoles = [ROLES.SELLER, ROLES.SELLER_SUB_ADMIN];
    if (!allowedRoles.includes(actor.role)) {
      throw new AppError("Only seller accounts can access seller web status", 403);
    }

    if (actor.role === ROLES.SELLER_SUB_ADMIN) {
      const allowedModules = (actor.allowedModules || []).map(normalizeModuleName);
      const canViewSellerWeb = ["sellers", "orders", "delivery"].some((moduleName) =>
        allowedModules.includes(moduleName),
      );
      if (!canViewSellerWeb) {
        throw new AppError("Seller web status is not assigned to this sub-admin", 403);
      }
    }

    const sellerId = this.resolveSellerId(actor);
    if (!sellerId) {
      throw new AppError("Seller account could not be resolved", 403);
    }

    return sellerId;
  }

  buildSellerWebNextSteps(checklist = {}, kycStatus = null) {
    const labels = {
      profileCompleted: "Complete seller profile",
      kycSubmitted: "Submit seller KYC",
      bankLinked: "Complete bank details",
      gstVerified: "Verify GST details if applicable",
      firstProductPublished: "Publish first product from seller panel",
    };

    const nextSteps = Object.entries(labels)
      .filter(([key]) => checklist[key] !== true)
      .map(([, label]) => label);

    if (kycStatus === KYC_STATUS.REJECTED) {
      return ["Review KYC rejection reason in seller panel", ...nextSteps];
    }

    if ([KYC_STATUS.SUBMITTED, KYC_STATUS.UNDER_REVIEW].includes(kycStatus)) {
      return ["Wait for KYC verification", ...nextSteps];
    }

    return nextSteps;
  }

  async getWebStatus(actor) {
    const sellerId = this.assertSellerWebActor(actor);
    const [seller, kyc] = await Promise.all([
      this.sellerRepository.findSellerById(sellerId),
      this.sellerRepository.findKycBySellerId(sellerId),
    ]);

    if (!seller) {
      throw new AppError("Seller profile not found", 404);
    }

    const onboardingState = buildSellerOnboardingState({
      sellerProfile: seller.sellerProfile || {},
      user: seller || {},
      kyc,
    });
    const profile = this.withOnboardingState(seller.sellerProfile || {}, kyc, seller);

    return {
      sellerId,
      accountStatus: seller.accountStatus || null,
      role: actor.role,
      email: seller.email,
      phone: seller.phone || null,
      profile: {
        displayName: profile.displayName || null,
        legalBusinessName: profile.legalBusinessName || null,
        businessType: profile.businessType || null,
        supportEmail: profile.supportEmail || null,
        supportPhone: profile.supportPhone || null,
        businessWebsite: profile.businessWebsite || null,
        primaryContactName: profile.primaryContactName || null,
      },
      onboarding: {
        status: onboardingState.onboardingStatus,
        complete: onboardingState.onboardingStatus === SELLER_ONBOARDING_STATUS.READY_FOR_GO_LIVE,
        checklist: onboardingState.checklist,
        kycStatus: onboardingState.kycStatus,
        nextSteps: this.buildSellerWebNextSteps(onboardingState.checklist, onboardingState.kycStatus),
      },
      kyc: kyc
        ? {
            status: kyc.verification_status,
            legalName: kyc.legal_name,
            businessType: kyc.business_type,
            rejectionReason: kyc.rejection_reason || null,
            submittedAt: kyc.submitted_at || null,
            reviewedAt: kyc.reviewed_at || null,
          }
        : null,
      webAccess: {
        mode: "read_only_status_tracking",
        actionsLiveIn: "dedicated_seller_admin_panel",
        allowedModules: actor.allowedModules || [],
      },
    };
  }

  toTrackingOrder(row = {}) {
    return {
      orderId: row.order_id,
      buyerId: row.buyer_id,
      orderStatus: row.order_status,
      currency: row.currency,
      amounts: {
        payableAmount: Number(row.payable_amount || 0),
        totalAmount: Number(row.total_amount || 0),
        sellerOrderTotal: Number(row.seller_order_total || 0),
      },
      sellerItems: {
        count: Number(row.items_count || 0),
        units: Number(row.units || 0),
      },
      delivery: {
        status: row.delivery_status || "not_created",
        eWayBillId: row.eway_bill_id || null,
        eWayBillNumber: row.e_way_bill_number || null,
        transporterName: row.transporter_name || null,
        vehicleNumber: row.vehicle_number || null,
        updatedAt: row.delivery_updated_at || null,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  normalizeTrackingQuery(query = {}) {
    return {
      status: query.status || null,
      deliveryStatus: query.deliveryStatus || null,
      fromDate: query.fromDate || null,
      toDate: query.toDate || null,
      limit: Number(query.limit || 20),
      offset: Number(query.offset || 0),
    };
  }

  async listWebTracking(query, actor) {
    const sellerId = this.assertSellerWebActor(actor);
    const filters = this.normalizeTrackingQuery(query);
    const [orders, summary] = await Promise.all([
      this.sellerRepository.fetchSellerTrackingOrders(sellerId, filters),
      this.sellerRepository.fetchSellerTrackingSummary(sellerId, filters),
    ]);

    return {
      filters,
      summary,
      orders: orders.map((row) => this.toTrackingOrder(row)),
      meta: {
        count: orders.length,
        limit: filters.limit,
        offset: filters.offset,
      },
    };
  }

  async getWebTrackingOrder(orderId, actor) {
    const sellerId = this.assertSellerWebActor(actor);
    const detail = await this.sellerRepository.fetchSellerTrackingOrderDetail(sellerId, orderId);
    if (!detail) {
      throw new AppError("Seller order tracking record not found", 404);
    }

    return {
      ...this.toTrackingOrder(detail.order),
      items: detail.items.map((item) => ({
        orderItemId: item.id,
        productId: item.product_id,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unit_price || 0),
        lineTotal: Number(item.line_total || 0),
      })),
    };
  }

  async patchProfileSection(section, payload, actor) {
    const sellerId = this.resolveSellerId(actor);
    const [existingSeller, kycRecord] = await Promise.all([
      this.sellerRepository.findSellerById(sellerId),
      this.sellerRepository.findKycBySellerId(sellerId),
    ]);
    if (!existingSeller) {
      throw new AppError("Seller profile not found", 404);
    }

    const existingProfile = this.toPlainObject(existingSeller.sellerProfile || {});
    const nextProfile = {
      ...existingProfile,
      [section]: {
        ...(existingProfile[section] || {}),
        ...payload,
      },
    };
    const updatedSeller = await this.sellerRepository.updateSellerProfile(
      sellerId,
      this.withOnboardingState(nextProfile, kycRecord, existingSeller),
    );

    return updatedSeller?.sellerProfile || null;
  }

  async updateMoreInfo(payload, actor) {
    const sellerId = this.resolveSellerId(actor);
    const [existingSeller, kycRecord] = await Promise.all([
      this.sellerRepository.findSellerById(sellerId),
      this.sellerRepository.findKycBySellerId(sellerId),
    ]);
    if (!existingSeller) {
      throw new AppError("Seller profile not found", 404);
    }

    const nextProfile = this.mergeSellerProfile(existingSeller.sellerProfile || {}, payload);
    const updatedSeller = await this.sellerRepository.updateSellerProfile(
      sellerId,
      this.withOnboardingState(nextProfile, kycRecord, existingSeller),
    );

    return updatedSeller?.sellerProfile || null;
  }

  resolveOnboardingStatus(checklist, kycStatus = null, currentStatus = SELLER_ONBOARDING_STATUS.INITIATED) {
    const resolvedKycStatus =
      kycStatus || (checklist?.gstVerified === true ? KYC_STATUS.VERIFIED : getSellerKycStatus(null, checklist));

    return resolveSellerOnboardingStatus(checklist, resolvedKycStatus, currentStatus);
  }

  hasCompleteBankDetails(bankDetails = {}) {
    return hasCompleteSellerBankDetailsForOnboarding(bankDetails);
  }

  hasCompleteProfileDetails(profile = {}) {
    return hasCompleteSellerProfileForOnboarding(profile);
  }

  async updateSettings(payload, actor) {
    const sellerId = this.resolveSellerId(actor);
    const existingSeller = await this.sellerRepository.findSellerById(sellerId);
    if (!existingSeller) {
      throw new AppError("Seller profile not found", 404);
    }

    const nextSettings = {
      ...(existingSeller.sellerSettings || {}),
      ...payload,
    };

    const updatedSeller = await this.sellerRepository.updateSellerSettings(sellerId, nextSettings);
    return updatedSeller?.sellerSettings || null;
  }

  async getDashboard(query, actor) {
    const sellerId = this.resolveSellerId(actor);
    const fromDate = query.fromDate ? new Date(query.fromDate) : this.getDateBeforeDays(30);
    const toDate = query.toDate ? new Date(query.toDate) : new Date();

    const [summary, topProducts, recentOrders, seller, kyc] = await Promise.all([
      this.sellerRepository.fetchDashboardSummary(sellerId, fromDate, toDate),
      this.sellerRepository.fetchTopProducts(sellerId, fromDate, toDate),
      this.sellerRepository.fetchRecentOrders(sellerId),
      this.sellerRepository.findSellerById(sellerId),
      this.sellerRepository.findKycBySellerId(sellerId),
    ]);

    const totalOrders = Number(summary?.total_orders || 0);
    const gmv = Number(summary?.gmv || 0);
    const onboardingState = buildSellerOnboardingState({
      sellerProfile: seller?.sellerProfile || {},
      user: seller || {},
      kyc,
    });

    return {
      window: {
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
      },
      onboarding: {
        status: onboardingState.onboardingStatus,
        checklist: onboardingState.checklist,
        kycStatus: onboardingState.kycStatus,
      },
      metrics: {
        totalOrders,
        unitsSold: Number(summary?.units_sold || 0),
        gmv,
        deliveredRevenue: Number(summary?.delivered_revenue || 0),
        cancelledOrders: Number(summary?.cancelled_orders || 0),
        returnedOrders: Number(summary?.returned_orders || 0),
        averageOrderValue: totalOrders > 0 ? Number((gmv / totalOrders).toFixed(2)) : 0,
        averageItemValue: Number(summary?.avg_item_value || 0),
      },
      topProducts,
      recentOrders,
    };
  }

  getDateBeforeDays(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  async reviewKyc(sellerId, payload, actor) {
    const record = await this.sellerRepository.reviewKyc(sellerId, {
      ...payload,
      reviewedBy: actor.userId,
    });

    if (!record) {
      throw new AppError("Seller KYC record not found", 404);
    }

    const seller = await this.sellerRepository.findSellerById(sellerId);
    if (seller) {
      const existingProfile = this.mergeKycIntoSellerProfile(seller.sellerProfile || {}, record);
      const nextProfile = this.withOnboardingState(existingProfile, record, seller);
      const nextAccountStatus =
        nextProfile.onboardingStatus === SELLER_ONBOARDING_STATUS.READY_FOR_GO_LIVE
          ? "active"
          : "pending_approval";

      await this.sellerRepository.updateSellerOnboardingState(
        sellerId,
        nextProfile,
        nextAccountStatus,
      );
    }

    await eventPublisher.publish(
      buildDomainEvent(
        DOMAIN_EVENTS.KYC_STATUS_UPDATED_V1,
        {
          sellerId,
          verificationStatus: record.verification_status,
          rejectionReason: record.rejection_reason,
        },
        {
          source: "seller-module",
          aggregateId: sellerId,
        },
      ),
    );

    return record;
  }

  sanitizeModules(modules) {
    const normalized = Array.from(new Set((modules || []).map(normalizeModuleName).filter(Boolean)));
    return normalized.filter((moduleName) => DEFAULT_SELLER_MODULES.includes(moduleName));
  }

  async createSellerSubAdmin(payload, actor) {
    const sellerId = this.resolveSellerId(actor);
    const existing = await this.sellerRepository.findUserByEmail(payload.email);
    if (existing) {
      throw new AppError("User already exists", 409);
    }
    const allowedModules = this.sanitizeModules(payload.allowedModules);
    if (!allowedModules.length) {
      throw new AppError("At least one valid seller module is required", 400);
    }
    const passwordHash = await hashValue(payload.password);
    return this.sellerRepository.createManagedUser({
      email: payload.email,
      phone: payload.phone,
      passwordHash,
      role: ROLES.SELLER_SUB_ADMIN,
      profile: payload.profile,
      ownerSellerId: sellerId,
      allowedModules,
      accountStatus: "active",
      emailVerified: true,
      authProviders: [],
      refreshSessions: [],
    });
  }

  async listSellerSubAdmins(actor) {
    const sellerId = this.resolveSellerId(actor);
    return this.sellerRepository.listSellerSubAdmins(sellerId);
  }

  async updateSellerSubAdminModules(userId, payload, actor) {
    const sellerId = this.resolveSellerId(actor);
    const allowedModules = this.sanitizeModules(payload.allowedModules);
    if (!allowedModules.length) {
      throw new AppError("At least one valid seller module is required", 400);
    }
    const updated = await this.sellerRepository.updateSellerSubAdminModules(sellerId, userId, allowedModules);
    if (!updated) {
      throw new AppError("Seller sub-admin not found", 404);
    }
    return updated;
  }
}

module.exports = { SellerService };
