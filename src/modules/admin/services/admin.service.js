const { AppError } = require("../../../shared/errors/app-error");
const { AdminRepository } = require("../repositories/admin.repository");
const { ProductService } = require("../../product/services/product.service");
const { TaxService } = require("../../tax/services/tax.service");
const {
  SubscriptionService,
} = require("../../subscription/services/subscription.service");
const { RbacService } = require("../../rbac/services/rbac.service");
const { createQueue } = require("../../../shared/queues/queue-factory");
const { redis } = require("../../../infrastructure/redis/redis-client");
const { mongoose } = require("../../../infrastructure/mongo/mongo-client");
const {
  postgresPool,
} = require("../../../infrastructure/postgres/postgres-client");
const { hashValue } = require("../../../shared/utils/hash");
const { ROLES } = require("../../../shared/constants/roles");
const {
  DEFAULT_PLATFORM_MODULES,
  DEFAULT_SELLER_MODULES,
  normalizeModuleName,
} = require("../../../shared/auth/module-scope");
const {
  SELLER_ONBOARDING_STATUS,
  buildSellerOnboardingState,
} = require("../../../shared/domain/seller-onboarding");

class AdminService {
  constructor({
    adminRepository = new AdminRepository(),
    productService = new ProductService(),
    taxService = new TaxService(),
    subscriptionService = new SubscriptionService(),
    rbacService = new RbacService(),
  } = {}) {
    this.adminRepository = adminRepository;
    this.productService = productService;
    this.taxService = taxService;
    this.subscriptionService = subscriptionService;
    this.rbacService = rbacService;
    this.queues = {
      notifications: createQueue("notifications"),
    };
  }

  async getOverview() {
    return this.adminRepository.getOverviewStats();
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

  getRecordId(record = {}) {
    return String(record._id || record.id || "");
  }

  async getSellerKycByIdMap(sellerIds = []) {
    const rows = await this.adminRepository.findSellerKycBySellerIds(sellerIds);
    return new Map(rows.map((row) => [String(row.seller_id), row]));
  }

  enrichSellerForAdmin(seller, kyc = null) {
    const plainSeller = this.toPlainObject(seller);
    const sellerProfile = this.toPlainObject(plainSeller.sellerProfile || {});
    const onboardingState = buildSellerOnboardingState({
      sellerProfile,
      user: plainSeller,
      kyc,
    });

    return {
      ...plainSeller,
      sellerProfile: {
        ...sellerProfile,
        onboardingChecklist: onboardingState.checklist,
        onboardingStatus: onboardingState.onboardingStatus,
      },
      onboarding: {
        status: onboardingState.onboardingStatus,
        checklist: onboardingState.checklist,
        kycStatus: onboardingState.kycStatus,
        kycRejectionReason: kyc?.rejection_reason || null,
        kycSubmittedAt: kyc?.submitted_at || null,
        kycReviewedAt: kyc?.reviewed_at || null,
        requirements: onboardingState.requirements,
      },
    };
  }

  async enrichSellersForAdmin(items = []) {
    const plainItems = items.map((item) => this.toPlainObject(item));
    const sellerIds = plainItems
      .filter((item) => item.role === ROLES.SELLER || !item.role)
      .map((item) => this.getRecordId(item))
      .filter(Boolean);
    const kycBySellerId = await this.getSellerKycByIdMap(sellerIds);

    return plainItems.map((item) => {
      if (item.role && item.role !== ROLES.SELLER) {
        return item;
      }
      return this.enrichSellerForAdmin(
        item,
        kycBySellerId.get(this.getRecordId(item)) || null,
      );
    });
  }

  async listVendors(query) {
    const result = await this.adminRepository.listVendors(query);
    return {
      ...result,
      items: await this.enrichSellersForAdmin(result.items),
    };
  }

  async listUsers(query) {
    const result = await this.adminRepository.listUsers(query);
    return {
      ...result,
      items: await this.enrichSellersForAdmin(result.items),
    };
  }

  async getUser(userId) {
    const user = await this.adminRepository.getUserById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    if (user.role === ROLES.SELLER) {
      const kycBySellerId = await this.getSellerKycByIdMap([userId]);
      return this.enrichSellerForAdmin(
        user,
        kycBySellerId.get(String(userId)) || null,
      );
    }
    return user;
  }

  async updateUser(userId, payload) {
    const user = await this.adminRepository.updateUserById(userId, payload);
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  }

  async deactivateUser(userId, payload) {
    const user = await this.adminRepository.deactivateUserById(
      userId,
      payload?.reason || null,
    );
    if (!user) {
      throw new AppError("User not found", 404);
    }
    return user;
  }

  async updateVendorStatus(sellerId, payload) {
    const currentSeller = await this.adminRepository.getUserById(sellerId);
    if (!currentSeller || currentSeller.role !== ROLES.SELLER) {
      throw new AppError("Seller not found", 404);
    }

    const requestedAccountStatus = payload.accountStatus || payload.status;
    const kycBySellerId = await this.getSellerKycByIdMap([sellerId]);
    const kyc = kycBySellerId.get(String(sellerId)) || null;
    const onboardingState = buildSellerOnboardingState({
      sellerProfile: currentSeller.sellerProfile || {},
      user: currentSeller,
      kyc,
    });

    if (
      requestedAccountStatus === "active" &&
      onboardingState.onboardingStatus !==
        SELLER_ONBOARDING_STATUS.READY_FOR_GO_LIVE
    ) {
      throw new AppError("Seller onboarding is not ready for go-live", 400, {
        onboardingStatus: onboardingState.onboardingStatus,
        checklist: onboardingState.checklist,
        kycStatus: onboardingState.kycStatus,
      });
    }

    const seller = await this.adminRepository.updateVendorStatus(sellerId, {
      accountStatus: requestedAccountStatus,
      onboardingStatus: onboardingState.onboardingStatus,
    });
    if (!seller) {
      throw new AppError("Seller not found", 404);
    }
    return this.enrichSellerForAdmin(seller, kyc);
  }

  async listProductModerationQueue(query) {
    return this.adminRepository.listProductsForModeration(query);
  }

  async moderateProduct(productId, payload, actor) {
    return this.productService.reviewProduct(productId, payload, actor);
  }

  async listOrders(query) {
    return this.adminRepository.listOrders({
      ...query,
      limit: Number(query.limit || 50),
      offset: Number(query.offset || 0),
    });
  }

  async listPayments(query) {
    return this.adminRepository.listPayments({
      ...query,
      limit: Number(query.limit || 50),
      offset: Number(query.offset || 0),
    });
  }

  async createPayout(payload) {
    const grossAmount = Number(payload.grossAmount);
    const commissionAmount = Number(payload.commissionAmount || 0);
    const processingFeeAmount = Number(payload.processingFeeAmount || 0);
    const taxWithheldAmount = Number(payload.taxWithheldAmount || 0);
    const netPayoutAmount = Number(
      payload.netPayoutAmount ??
        (
          grossAmount -
          commissionAmount -
          processingFeeAmount -
          taxWithheldAmount
        ).toFixed(2),
    );

    return this.adminRepository.createPayout({
      ...payload,
      grossAmount,
      commissionAmount,
      processingFeeAmount,
      taxWithheldAmount,
      netPayoutAmount,
    });
  }

  async listPayouts(query) {
    return this.adminRepository.listPayouts({
      ...query,
      limit: Number(query.limit || 50),
      offset: Number(query.offset || 0),
    });
  }

  async getTaxReport(query) {
    return this.taxService.getTaxReport(query);
  }

  async generateInvoice(orderId) {
    return this.taxService.generateInvoice(orderId);
  }

  async createApiKey(payload, actor) {
    return this.adminRepository.createApiKey({
      ownerId: payload.ownerId || actor.userId,
      keyName: payload.keyName,
      scopes: payload.scopes || [],
      expiresAt: payload.expiresAt || null,
    });
  }

  async listApiKeys(query) {
    return this.adminRepository.listApiKeys({
      ownerId: query.ownerId || null,
      status: query.status || null,
      limit: Number(query.limit || 50),
      offset: Number(query.offset || 0),
    });
  }

  async createWebhookSubscription(payload, actor) {
    return this.adminRepository.createWebhookSubscription({
      ownerId: payload.ownerId || actor.userId,
      endpointUrl: payload.endpointUrl,
      secret: payload.secret,
      eventTypes: payload.eventTypes || [],
      retryPolicy: payload.retryPolicy || {},
    });
  }

  async listWebhookSubscriptions(query) {
    return this.adminRepository.listWebhookSubscriptions({
      ownerId: query.ownerId || null,
      status: query.status || null,
      limit: Number(query.limit || 50),
      offset: Number(query.offset || 0),
    });
  }

  async upsertFeatureFlag(payload, actor) {
    return this.adminRepository.upsertFeatureFlag({
      flagKey: payload.flagKey,
      description: payload.description || null,
      enabled: Boolean(payload.enabled),
      rolloutPercentage: Number(payload.rolloutPercentage || 0),
      targetRules: payload.targetRules || {},
      actorId: actor.userId,
    });
  }

  async listFeatureFlags(query) {
    const enabled =
      query.enabled === undefined
        ? null
        : String(query.enabled).toLowerCase() === "true";
    return this.adminRepository.listFeatureFlags({
      enabled,
      limit: Number(query.limit || 100),
      offset: Number(query.offset || 0),
    });
  }

  async getRealtimeAnalytics(query) {
    return this.adminRepository.getRealtimeAnalytics({
      hours: Number(query.hours || 24),
    });
  }

  async getReturnsAnalytics(query) {
    return this.adminRepository.getReturnsAnalytics(query);
  }

  async listChargebacks(query) {
    return this.adminRepository.listChargebacks({
      ...query,
      limit: Number(query.limit || 50),
      offset: Number(query.offset || 0),
    });
  }

  async getSystemHealth() {
    const checks = {
      postgres: { status: "unknown" },
      redis: { status: "unknown" },
      mongo: { status: "unknown" },
    };

    try {
      await postgresPool.query("SELECT 1");
      checks.postgres.status = "ok";
    } catch (error) {
      checks.postgres = { status: "down", error: error.message };
    }

    try {
      const pong = await redis.ping();
      checks.redis.status = pong === "PONG" ? "ok" : "degraded";
    } catch (error) {
      checks.redis = { status: "down", error: error.message };
    }

    checks.mongo = {
      status: mongoose.connection.readyState === 1 ? "ok" : "down",
      readyState: mongoose.connection.readyState,
    };

    const overall = Object.values(checks).every(
      (check) => check.status === "ok",
    )
      ? "ok"
      : "degraded";
    return { overall, checks };
  }

  async getQueueStatus() {
    const entries = await Promise.all(
      Object.entries(this.queues).map(async ([name, queue]) => {
        const counts = await queue.getJobCounts(
          "waiting",
          "active",
          "completed",
          "failed",
          "delayed",
          "paused",
        );
        return { queue: name, counts };
      }),
    );

    return { queues: entries };
  }

  async pauseQueue(queueName) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new AppError("Unsupported queue", 404);
    }
    await queue.pause();
    return { queue: queueName, paused: true };
  }

  async resumeQueue(queueName) {
    const queue = this.queues[queueName];
    if (!queue) {
      throw new AppError("Unsupported queue", 404);
    }
    await queue.resume();
    return { queue: queueName, paused: false };
  }

  async listDeadLetterEvents(query) {
    return this.adminRepository.listDeadLetterEvents({
      ...query,
      limit: Number(query.limit || 50),
      offset: Number(query.offset || 0),
    });
  }

  async retryDeadLetterEvent(eventId) {
    const result = await this.adminRepository.retryDeadLetterEvent(eventId);
    if (!result) {
      throw new AppError("Dead letter event not found", 404);
    }
    return result;
  }

  async discardDeadLetterEvent(eventId, payload) {
    const result = await this.adminRepository.discardDeadLetterEvent(
      eventId,
      payload?.reason || null,
    );
    if (!result) {
      throw new AppError("Dead letter event not found", 404);
    }
    return result;
  }

  async createSubscriptionPlan(payload) {
    return this.subscriptionService.createPlan(payload);
  }

  async listSubscriptionPlans(query) {
    return this.subscriptionService.listPlansAdmin(query);
  }

  async getSubscriptionPlan(planId) {
    return this.subscriptionService.getPlan(planId);
  }

  async updateSubscriptionPlan(planId, payload) {
    return this.subscriptionService.updatePlan(planId, payload);
  }

  async deleteSubscriptionPlan(planId) {
    return this.subscriptionService.deletePlan(planId);
  }

  async listPlatformSubscriptions(query) {
    return this.subscriptionService.listSubscriptionsAdmin(query);
  }

  async updatePlatformSubscriptionStatus(subscriptionId, status) {
    return this.subscriptionService.updateSubscriptionStatusAdmin(
      subscriptionId,
      status,
    );
  }

  async createPlatformFeeConfig(payload) {
    return this.subscriptionService.createPlatformFeeConfig(payload);
  }

  async listPlatformFeeConfigs(query) {
    return this.subscriptionService.listPlatformFeeConfigs(query);
  }

  async getPlatformFeeConfig(configId) {
    return this.subscriptionService.getPlatformFeeConfig(configId);
  }

  async updatePlatformFeeConfig(configId, payload) {
    return this.subscriptionService.updatePlatformFeeConfig(configId, payload);
  }

  async deletePlatformFeeConfig(configId) {
    return this.subscriptionService.deletePlatformFeeConfig(configId);
  }

  formatModuleName(moduleName) {
    return String(moduleName || "")
      .split("/")
      .pop()
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  getAssignableModuleSlugs(role) {
    if ([ROLES.SELLER, ROLES.SELLER_SUB_ADMIN].includes(role)) {
      return DEFAULT_SELLER_MODULES;
    }
    if (role === ROLES.BUYER) {
      return [];
    }
    return DEFAULT_PLATFORM_MODULES;
  }

  buildRbacModuleLookup(modules = []) {
    const lookup = new Map();
    const aliases = {
      product: "products",
      products: "product",
      user: "users",
      users: "user",
      order: "orders",
      orders: "order",
      seller: "sellers",
      sellers: "seller",
    };

    modules.forEach((module) => {
      lookup.set(module.slug, module);
      if (aliases[module.slug]) {
        lookup.set(aliases[module.slug], module);
      }
    });

    return lookup;
  }

  async listAccessModules(query = {}) {
    const targetRole = query.role || ROLES.SUB_ADMIN;
    const assignableModuleSlugs = this.getAssignableModuleSlugs(targetRole);
    const roleSlug = query.roleSlug || targetRole;
    let permissionMatrix = null;

    try {
      permissionMatrix = await this.rbacService.getPermissionManagementMatrix({
        roleId: query.roleId,
        roleSlug,
        active: query.active,
      });
    } catch (error) {
      if (!(error instanceof AppError) || error.statusCode !== 404) {
        throw error;
      }
      permissionMatrix = await this.rbacService.getPermissionManagementMatrix({
        active: query.active,
      });
    }

    const rbacModulesBySlug = this.buildRbacModuleLookup(
      permissionMatrix.modules,
    );
    const includePermissions = query.includePermissions !== false;
    const modules = assignableModuleSlugs.map((moduleSlug) => {
      const rbacModule = rbacModulesBySlug.get(moduleSlug) || null;
      return {
        slug: moduleSlug,
        name: rbacModule?.name || this.formatModuleName(moduleSlug),
        icon: rbacModule?.icon || null,
        description: rbacModule?.description || null,
        assignable: true,
        source: rbacModule ? "rbac" : "platform",
        permissions: includePermissions
          ? rbacModule?.permissions || []
          : undefined,
        assignedPermissionCount: rbacModule?.assignedPermissionCount || 0,
      };
    });

    return {
      role: targetRole,
      rbacRole: permissionMatrix.role,
      modules,
      totals: {
        modules: modules.length,
        permissions: modules.reduce(
          (total, module) => total + (module.permissions?.length || 0),
          0,
        ),
        assignedPermissions: modules.reduce(
          (total, module) => total + (module.assignedPermissionCount || 0),
          0,
        ),
      },
    };
  }

  sanitizeModules(modules) {
    const normalized = Array.from(
      new Set((modules || []).map(normalizeModuleName).filter(Boolean)),
    );
    return normalized.filter((moduleName) =>
      DEFAULT_PLATFORM_MODULES.includes(moduleName),
    );
  }

  async createAdmin(payload, actor = {}) {
    const existing = await this.adminRepository.findUserByEmail(payload.email);
    if (existing) {
      throw new AppError("User already exists", 409);
    }
    const passwordHash = await hashValue(payload.password);
    const user = await this.adminRepository.createManagedUser({
      email: payload.email,
      phone: payload.phone,
      passwordHash,
      role: ROLES.ADMIN,
      profile: payload.profile,
      accountStatus: "active",
      emailVerified: true,
      authProviders: [],
      refreshSessions: [],
      allowedModules: [],
    });

    await this.rbacService.assignRoleToUserBySlug(
      String(user.id),
      ROLES.ADMIN,
      actor.userId,
      {
        ignoreMissing: true,
        ignoreExisting: true,
      },
    );

    return user;
  }

  async listAdmins(query = {}) {
    return this.adminRepository.listUsers({
      ...query,
      role: ROLES.ADMIN,
    });
  }

  async createPlatformSubAdmin(payload, actor) {
    const existing = await this.adminRepository.findUserByEmail(payload.email);
    if (existing) {
      throw new AppError("User already exists", 409);
    }
    const allowedModules = this.sanitizeModules(payload.allowedModules);
    if (!allowedModules.length) {
      throw new AppError("At least one valid module is required", 400);
    }
    const passwordHash = await hashValue(payload.password);
    const user = await this.adminRepository.createManagedUser({
      email: payload.email,
      phone: payload.phone,
      passwordHash,
      role: ROLES.SUB_ADMIN,
      profile: payload.profile,
      ownerAdminId: actor.userId,
      allowedModules,
      accountStatus: "active",
      emailVerified: true,
      authProviders: [],
      refreshSessions: [],
    });

    await this.rbacService.assignRoleToUserBySlug(
      String(user.id),
      ROLES.SUB_ADMIN,
      actor.userId,
      {
        ignoreMissing: true,
        ignoreExisting: true,
      },
    );

    return user;
  }

  async listPlatformSubAdmins(query, actor) {
    const ownerAdminId = query.ownerAdminId || actor.userId;
    return this.adminRepository.listSubAdmins({ ownerAdminId });
  }

  async updatePlatformSubAdminModules(userId, payload, actor) {
    const allowedModules = this.sanitizeModules(payload.allowedModules);
    if (!allowedModules.length) {
      throw new AppError("At least one valid module is required", 400);
    }
    const updated = await this.adminRepository.updateSubAdminModules(
      userId,
      actor.userId,
      allowedModules,
    );
    if (!updated) {
      throw new AppError("Sub-admin not found", 404);
    }
    return updated;
  }
}

module.exports = { AdminService };
