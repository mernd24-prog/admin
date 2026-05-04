import {
  apiDelete,
  apiGet,
  getOnboardingToken,
  apiPatch,
  apiPost,
  apiPut,
} from "./client";
import {
  adminEndpoints,
  authEndpoints,
  sellerCommissionEndpoints,
  sellerEndpoints,
} from "./endpoints";
import { getStoredRefreshToken } from "../_helpers/authSession";

const asObjectPayload = (idOrPayload, payload, key) =>
  idOrPayload && typeof idOrPayload === "object"
    ? idOrPayload
    : { ...(payload || {}), [key]: idOrPayload };

const firstValue = (payload = {}, keys = []) =>
  keys.map((key) => payload?.[key]).find(Boolean);

const withoutKeys = (payload = {}, keys = []) =>
  Object.entries(payload || {}).reduce((acc, [key, value]) => {
    if (!keys.includes(key)) acc[key] = value;
    return acc;
  }, {});

export const queryKeys = {
  listAccessModules: ["role", "roleId", "roleSlug", "active", "includePermissions"],
  listAdmins: ["q", "accountStatus", "page", "limit"],
  listPlatformSubAdmins: ["ownerAdminId"],
  listUsers: ["q", "role", "accountStatus", "page", "limit"],
  listVendors: ["q", "status", "onboardingStatus", "page", "limit"],
  moderationQueue: ["status", "category", "page", "limit"],
  listOrders: ["status", "fromDate", "toDate", "limit", "offset"],
  listPayments: ["status", "provider", "fromDate", "toDate", "limit", "offset"],
  listPayouts: ["sellerId", "status", "fromDate", "toDate", "limit", "offset"],
  taxReport: ["fromDate", "toDate", "taxComponent", "limit", "offset"],
  listApiKeys: ["ownerId", "status", "limit", "offset"],
  listWebhooks: ["ownerId", "status", "limit", "offset"],
  listFeatureFlags: ["enabled", "limit", "offset"],
  realtimeAnalytics: ["hours"],
  returnsAnalytics: ["fromDate", "toDate"],
  listChargebacks: ["status", "fromDate", "toDate", "limit", "offset"],
  listDeadLetter: ["status", "eventType", "limit", "offset"],
  listSubscriptionPlans: ["active", "limit", "offset"],
  listPlatformSubscriptions: ["status", "userRole", "limit", "offset"],
  listPlatformFeeConfigs: ["active", "category", "limit", "offset"],
  listCategories: ["page", "limit", "parentKey", "active", "categoryKey"],
  listProductFamilies: ["page", "limit", "category", "sellerId", "status"],
  listProductVariants: ["page", "limit", "productId", "familyCode", "sellerId", "status"],
  listHsnCodes: ["page", "limit", "category", "active"],
  listGeographies: ["page", "limit", "active"],
  listContentPages: ["page", "limit", "pageType", "language", "published"],
  sellerTracking: ["status", "deliveryStatus", "fromDate", "toDate", "limit", "offset"],
  sellerDashboard: ["fromDate", "toDate"],
};

export const bodyKeys = {
  login: ["email", "password", "phone", "otp", "purpose"],
  register: ["email", "phone", "password", "role", "profile", "referralCode"],
  verifyRegistration: ["email", "phone", "otp"],
  forgotPassword: ["email", "phone"],
  sendOtp: ["email", "phone", "purpose"],
  verifyOtp: ["email", "phone", "otp", "purpose"],
  resendOtp: ["email", "phone", "purpose"],
  resetPassword: ["email", "phone", "otp", "newPassword", "password"],
  changePassword: ["currentPassword", "newPassword", "password"],
  refresh: ["refreshToken"],
  createAdmin: ["email", "phone", "password", "profile"],
  createSubAdmin: ["email", "phone", "password", "profile", "allowedModules"],
  updateAllowedModules: ["allowedModules"],
  updateUser: ["role", "accountStatus", "profile"],
  deactivateUser: ["reason"],
  updateVendorStatus: ["accountStatus"],
  moderateProduct: ["status", "rejectionReason", "checklist"],
  createPayout: [
    "sellerId",
    "periodStart",
    "periodEnd",
    "grossAmount",
    "commissionAmount",
    "processingFeeAmount",
    "taxWithheldAmount",
    "netPayoutAmount",
    "currency",
    "status",
    "scheduledAt",
    "metadata",
  ],
  createApiKey: ["ownerId", "keyName", "scopes", "expiresAt"],
  createWebhook: ["ownerId", "endpointUrl", "secret", "eventTypes", "retryPolicy"],
  upsertFeatureFlag: ["flagKey", "description", "enabled", "rolloutPercentage", "targetRules"],
  deadLetterAction: ["reason"],
  createSubscriptionPlan: [
    "planCode",
    "title",
    "description",
    "targetRoles",
    "featureFlags",
    "monthlyPrice",
    "yearlyPrice",
    "currency",
    "active",
    "metadata",
  ],
  updateSubscriptionPlan: [
    "title",
    "description",
    "targetRoles",
    "featureFlags",
    "monthlyPrice",
    "yearlyPrice",
    "currency",
    "active",
    "metadata",
  ],
  updatePlatformSubscriptionStatus: ["status"],
  createPlatformFeeConfig: [
    "category",
    "commissionPercent",
    "fixedFeeAmount",
    "closingFeeAmount",
    "active",
    "effectiveFrom",
    "effectiveTo",
  ],
  updatePlatformFeeConfig: [
    "category",
    "commissionPercent",
    "fixedFeeAmount",
    "closingFeeAmount",
    "active",
    "effectiveFrom",
    "effectiveTo",
  ],
  createCategory: [
    "categoryKey",
    "title",
    "parentKey",
    "level",
    "attributesSchema",
    "active",
    "sortOrder",
  ],
  updateCategory: ["title", "parentKey", "level", "attributesSchema", "active", "sortOrder"],
  createProductFamily: [
    "familyCode",
    "sellerId",
    "title",
    "category",
    "baseAttributes",
    "variantAxes",
    "status",
  ],
  updateProductFamily: ["title", "category", "baseAttributes", "variantAxes", "status"],
  createProductVariant: [
    "familyCode",
    "productId",
    "sellerId",
    "sku",
    "attributes",
    "stock",
    "reservedStock",
    "status",
  ],
  updateProductVariant: [
    "familyCode",
    "productId",
    "sellerId",
    "sku",
    "attributes",
    "stock",
    "reservedStock",
    "status",
  ],
  createHsnCode: [
    "code",
    "description",
    "gstRate",
    "cessRate",
    "taxType",
    "exempt",
    "category",
    "active",
  ],
  updateHsnCode: [
    "description",
    "gstRate",
    "cessRate",
    "taxType",
    "exempt",
    "category",
    "active",
  ],
  createGeography: ["countryCode", "countryName", "active", "states"],
  updateGeography: ["countryName", "active", "states"],
  createContentPage: [
    "slug",
    "title",
    "pageType",
    "body",
    "language",
    "published",
    "publishedAt",
    "metadata",
  ],
  updateContentPage: [
    "title",
    "pageType",
    "body",
    "language",
    "published",
    "publishedAt",
    "metadata",
  ],
  sellerKyc: [
    "panNumber",
    "gstNumber",
    "aadhaarNumber",
    "legalName",
    "businessType",
    "dateOfBirth",
    "documents",
    "bankDetails",
  ],
  sellerProfile: [
    "displayName",
    "legalBusinessName",
    "description",
    "supportEmail",
    "supportPhone",
    "businessType",
    "registrationNumber",
    "gstNumber",
    "panNumber",
    "aadhaarNumber",
    "dateOfBirth",
    "businessWebsite",
    "primaryContactName",
    "bankDetails",
    "businessAddress",
    "pickupAddress",
  ],
  sellerAddress: ["line1", "line2", "city", "state", "country", "postalCode"],
  sellerBank: ["accountHolderName", "accountNumber", "ifscCode", "bankName", "branchName"],
  sellerMoreInfo: [
    "description",
    "businessWebsite",
    "primaryContactName",
    "registrationNumber",
    "supportEmail",
    "supportPhone",
  ],
  sellerSettings: [
    "autoAcceptOrders",
    "handlingTimeHours",
    "returnWindowDays",
    "ndrResponseHours",
    "shippingModes",
    "payoutSchedule",
  ],
  reviewSellerKyc: ["verificationStatus", "rejectionReason"],
  processPayouts: ["sellerId"],
};

export const adminApi = {
  listAccessModules: (query) =>
    apiGet(adminEndpoints.accessModules, { query, allowedQueryKeys: queryKeys.listAccessModules }),
  createAdmin: (body) =>
    apiPost(adminEndpoints.admins, body, { allowedBodyKeys: bodyKeys.createAdmin }),
  listAdmins: (query) =>
    apiGet(adminEndpoints.admins, { query, allowedQueryKeys: queryKeys.listAdmins }),
  createPlatformSubAdmin: (body) =>
    apiPost(adminEndpoints.subAdmins, body, { allowedBodyKeys: bodyKeys.createSubAdmin }),
  listPlatformSubAdmins: (query) =>
    apiGet(adminEndpoints.subAdmins, { query, allowedQueryKeys: queryKeys.listPlatformSubAdmins }),
  updatePlatformSubAdminModules: (userIdOrPayload, body) => {
    const payload = asObjectPayload(userIdOrPayload, body, "userId");
    return apiPatch(adminEndpoints.subAdminModules(firstValue(payload, ["userId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updateAllowedModules,
    });
  },
  dashboardOverview: () => apiGet(adminEndpoints.dashboardOverview),
  listUsers: (query) =>
    apiGet(adminEndpoints.users, { query, allowedQueryKeys: queryKeys.listUsers }),
  getUserDetail: (userIdOrPayload) => {
    const payload = asObjectPayload(userIdOrPayload, null, "userId");
    return apiGet(adminEndpoints.userById(firstValue(payload, ["userId", "id"])));
  },
  updateUser: (userIdOrPayload, body) => {
    const payload = asObjectPayload(userIdOrPayload, body, "userId");
    return apiPatch(adminEndpoints.userById(firstValue(payload, ["userId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updateUser,
    });
  },
  deactivateUser: (userIdOrPayload, body) => {
    const payload = asObjectPayload(userIdOrPayload, body, "userId");
    return apiDelete(adminEndpoints.userById(firstValue(payload, ["userId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.deactivateUser,
      sendBodyForDelete: true,
    });
  },
  listVendors: (query) =>
    apiGet(adminEndpoints.vendors, { query, allowedQueryKeys: queryKeys.listVendors }),
  updateVendorStatus: (sellerIdOrPayload, body) => {
    const payload = asObjectPayload(sellerIdOrPayload, body, "sellerId");
    return apiPatch(adminEndpoints.vendorStatus(firstValue(payload, ["sellerId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updateVendorStatus,
    });
  },
  productModerationQueue: (query) =>
    apiGet(adminEndpoints.moderationQueue, { query, allowedQueryKeys: queryKeys.moderationQueue }),
  moderateProduct: (productIdOrPayload, body) => {
    const payload = asObjectPayload(productIdOrPayload, body, "productId");
    return apiPatch(adminEndpoints.moderateProduct(firstValue(payload, ["productId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.moderateProduct,
    });
  },
  listOrders: (query) =>
    apiGet(adminEndpoints.orders, { query, allowedQueryKeys: queryKeys.listOrders }),
  listPayments: (query) =>
    apiGet(adminEndpoints.payments, { query, allowedQueryKeys: queryKeys.listPayments }),
  createPayout: (body) =>
    apiPost(adminEndpoints.payouts, body, { allowedBodyKeys: bodyKeys.createPayout }),
  listPayouts: (query) =>
    apiGet(adminEndpoints.payouts, { query, allowedQueryKeys: queryKeys.listPayouts }),
  taxReports: (query) =>
    apiGet(adminEndpoints.taxReports, { query, allowedQueryKeys: queryKeys.taxReport }),
  generateInvoice: (orderIdOrPayload) => {
    const payload = asObjectPayload(orderIdOrPayload, null, "orderId");
    return apiPost(adminEndpoints.invoice(firstValue(payload, ["orderId", "id"])));
  },
  createApiKey: (body) =>
    apiPost(adminEndpoints.apiKeys, body, { allowedBodyKeys: bodyKeys.createApiKey }),
  listApiKeys: (query) =>
    apiGet(adminEndpoints.apiKeys, { query, allowedQueryKeys: queryKeys.listApiKeys }),
  createWebhook: (body) =>
    apiPost(adminEndpoints.webhooks, body, { allowedBodyKeys: bodyKeys.createWebhook }),
  listWebhooks: (query) =>
    apiGet(adminEndpoints.webhooks, { query, allowedQueryKeys: queryKeys.listWebhooks }),
  upsertFeatureFlag: (body) =>
    apiPut(adminEndpoints.featureFlags, body, { allowedBodyKeys: bodyKeys.upsertFeatureFlag }),
  listFeatureFlags: (query) =>
    apiGet(adminEndpoints.featureFlags, { query, allowedQueryKeys: queryKeys.listFeatureFlags }),
  realtimeAnalytics: (query) =>
    apiGet(adminEndpoints.realtimeAnalytics, { query, allowedQueryKeys: queryKeys.realtimeAnalytics }),
  returnsAnalytics: (query) =>
    apiGet(adminEndpoints.returnsAnalytics, { query, allowedQueryKeys: queryKeys.returnsAnalytics }),
  listChargebacks: (query) =>
    apiGet(adminEndpoints.chargebacks, { query, allowedQueryKeys: queryKeys.listChargebacks }),
  systemHealth: () => apiGet(adminEndpoints.systemHealth),
  queueStatus: () => apiGet(adminEndpoints.queues),
  pauseQueue: (queueNameOrPayload) => {
    const payload = asObjectPayload(queueNameOrPayload, null, "queueName");
    return apiPost(adminEndpoints.pauseQueue(payload?.queueName));
  },
  resumeQueue: (queueNameOrPayload) => {
    const payload = asObjectPayload(queueNameOrPayload, null, "queueName");
    return apiPost(adminEndpoints.resumeQueue(payload?.queueName));
  },
  listDeadLetterEvents: (query) =>
    apiGet(adminEndpoints.deadLetter, { query, allowedQueryKeys: queryKeys.listDeadLetter }),
  retryDeadLetterEvent: (eventIdOrPayload, body) => {
    const payload = asObjectPayload(eventIdOrPayload, body, "eventId");
    return apiPost(adminEndpoints.retryDeadLetter(firstValue(payload, ["eventId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.deadLetterAction,
    });
  },
  discardDeadLetterEvent: (eventIdOrPayload, body) => {
    const payload = asObjectPayload(eventIdOrPayload, body, "eventId");
    return apiPost(adminEndpoints.discardDeadLetter(firstValue(payload, ["eventId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.deadLetterAction,
    });
  },
  createSubscriptionPlan: (body) =>
    apiPost(adminEndpoints.subscriptionPlans, body, { allowedBodyKeys: bodyKeys.createSubscriptionPlan }),
  listSubscriptionPlans: (query) =>
    apiGet(adminEndpoints.subscriptionPlans, { query, allowedQueryKeys: queryKeys.listSubscriptionPlans }),
  getSubscriptionPlan: (planIdOrPayload) => {
    const payload = asObjectPayload(planIdOrPayload, null, "planId");
    return apiGet(adminEndpoints.subscriptionPlanById(firstValue(payload, ["planId", "id"])));
  },
  updateSubscriptionPlan: (planIdOrPayload, body) => {
    const payload = asObjectPayload(planIdOrPayload, body, "planId");
    return apiPatch(adminEndpoints.subscriptionPlanById(firstValue(payload, ["planId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updateSubscriptionPlan,
    });
  },
  deleteSubscriptionPlan: (planIdOrPayload) => {
    const payload = asObjectPayload(planIdOrPayload, null, "planId");
    return apiDelete(adminEndpoints.subscriptionPlanById(firstValue(payload, ["planId", "id"])));
  },
  listPlatformSubscriptions: (query) =>
    apiGet(adminEndpoints.platformSubscriptions, {
      query,
      allowedQueryKeys: queryKeys.listPlatformSubscriptions,
    }),
  updatePlatformSubscriptionStatus: (subscriptionIdOrPayload, body) => {
    const payload = asObjectPayload(subscriptionIdOrPayload, body, "subscriptionId");
    return apiPatch(adminEndpoints.platformSubscriptionStatus(firstValue(payload, ["subscriptionId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updatePlatformSubscriptionStatus,
    });
  },
  createPlatformFeeConfig: (body) =>
    apiPost(adminEndpoints.feeConfig, body, { allowedBodyKeys: bodyKeys.createPlatformFeeConfig }),
  listPlatformFeeConfigs: (query) =>
    apiGet(adminEndpoints.feeConfig, { query, allowedQueryKeys: queryKeys.listPlatformFeeConfigs }),
  getPlatformFeeConfig: (configIdOrPayload) => {
    const payload = asObjectPayload(configIdOrPayload, null, "configId");
    return apiGet(adminEndpoints.feeConfigById(firstValue(payload, ["configId", "id"])));
  },
  updatePlatformFeeConfig: (configIdOrPayload, body) => {
    const payload = asObjectPayload(configIdOrPayload, body, "configId");
    return apiPatch(adminEndpoints.feeConfigById(firstValue(payload, ["configId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updatePlatformFeeConfig,
    });
  },
  deletePlatformFeeConfig: (configIdOrPayload) => {
    const payload = asObjectPayload(configIdOrPayload, null, "configId");
    return apiDelete(adminEndpoints.feeConfigById(firstValue(payload, ["configId", "id"])));
  },
  createCategory: (body) =>
    apiPost(adminEndpoints.categories, body, { allowedBodyKeys: bodyKeys.createCategory }),
  listCategories: (query) =>
    apiGet(adminEndpoints.categories, { query, allowedQueryKeys: queryKeys.listCategories }),
  getCategory: (categoryKeyOrPayload) => {
    const payload = asObjectPayload(categoryKeyOrPayload, null, "categoryKey");
    return apiGet(adminEndpoints.categoryByKey(firstValue(payload, ["categoryKey", "key", "id"])));
  },
  updateCategory: (categoryKeyOrPayload, body) => {
    const payload = asObjectPayload(categoryKeyOrPayload, body, "categoryKey");
    return apiPatch(adminEndpoints.categoryByKey(firstValue(payload, ["categoryKey", "key", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updateCategory,
    });
  },
  deleteCategory: (categoryKeyOrPayload) => {
    const payload = asObjectPayload(categoryKeyOrPayload, null, "categoryKey");
    return apiDelete(adminEndpoints.categoryByKey(firstValue(payload, ["categoryKey", "key", "id"])));
  },
  createProductFamily: (body) =>
    apiPost(adminEndpoints.productFamilies, body, { allowedBodyKeys: bodyKeys.createProductFamily }),
  listProductFamilies: (query) =>
    apiGet(adminEndpoints.productFamilies, { query, allowedQueryKeys: queryKeys.listProductFamilies }),
  getProductFamily: (familyCodeOrPayload) => {
    const payload = asObjectPayload(familyCodeOrPayload, null, "familyCode");
    return apiGet(adminEndpoints.productFamilyByCode(firstValue(payload, ["familyCode", "code", "id"])));
  },
  updateProductFamily: (familyCodeOrPayload, body) => {
    const payload = asObjectPayload(familyCodeOrPayload, body, "familyCode");
    return apiPatch(adminEndpoints.productFamilyByCode(firstValue(payload, ["familyCode", "code", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updateProductFamily,
    });
  },
  deleteProductFamily: (familyCodeOrPayload) => {
    const payload = asObjectPayload(familyCodeOrPayload, null, "familyCode");
    return apiDelete(adminEndpoints.productFamilyByCode(firstValue(payload, ["familyCode", "code", "id"])));
  },
  createProductVariant: (body) =>
    apiPost(adminEndpoints.productVariants, body, { allowedBodyKeys: bodyKeys.createProductVariant }),
  listProductVariants: (query) =>
    apiGet(adminEndpoints.productVariants, { query, allowedQueryKeys: queryKeys.listProductVariants }),
  getProductVariant: (variantIdOrPayload) => {
    const payload = asObjectPayload(variantIdOrPayload, null, "variantId");
    return apiGet(adminEndpoints.productVariantById(firstValue(payload, ["variantId", "id"])));
  },
  updateProductVariant: (variantIdOrPayload, body) => {
    const payload = asObjectPayload(variantIdOrPayload, body, "variantId");
    return apiPatch(adminEndpoints.productVariantById(firstValue(payload, ["variantId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updateProductVariant,
    });
  },
  deleteProductVariant: (variantIdOrPayload) => {
    const payload = asObjectPayload(variantIdOrPayload, null, "variantId");
    return apiDelete(adminEndpoints.productVariantById(firstValue(payload, ["variantId", "id"])));
  },
  createHsnCode: (body) =>
    apiPost(adminEndpoints.hsnCodes, body, { allowedBodyKeys: bodyKeys.createHsnCode }),
  listHsnCodes: (query) =>
    apiGet(adminEndpoints.hsnCodes, { query, allowedQueryKeys: queryKeys.listHsnCodes }),
  getHsnCode: (hsnCodeOrPayload) => {
    const payload = asObjectPayload(hsnCodeOrPayload, null, "hsnCode");
    return apiGet(adminEndpoints.hsnCodeByCode(firstValue(payload, ["hsnCode", "code", "id"])));
  },
  updateHsnCode: (hsnCodeOrPayload, body) => {
    const payload = asObjectPayload(hsnCodeOrPayload, body, "hsnCode");
    return apiPatch(adminEndpoints.hsnCodeByCode(firstValue(payload, ["hsnCode", "code", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updateHsnCode,
    });
  },
  deleteHsnCode: (hsnCodeOrPayload) => {
    const payload = asObjectPayload(hsnCodeOrPayload, null, "hsnCode");
    return apiDelete(adminEndpoints.hsnCodeByCode(firstValue(payload, ["hsnCode", "code", "id"])));
  },
  createGeography: (body) =>
    apiPost(adminEndpoints.geography, body, { allowedBodyKeys: bodyKeys.createGeography }),
  listGeography: (query) =>
    apiGet(adminEndpoints.geography, { query, allowedQueryKeys: queryKeys.listGeographies }),
  getGeography: (countryCodeOrPayload) => {
    const payload = asObjectPayload(countryCodeOrPayload, null, "countryCode");
    return apiGet(adminEndpoints.geographyByCode(firstValue(payload, ["countryCode", "code", "id"])));
  },
  updateGeography: (countryCodeOrPayload, body) => {
    const payload = asObjectPayload(countryCodeOrPayload, body, "countryCode");
    return apiPatch(adminEndpoints.geographyByCode(firstValue(payload, ["countryCode", "code", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updateGeography,
    });
  },
  deleteGeography: (countryCodeOrPayload) => {
    const payload = asObjectPayload(countryCodeOrPayload, null, "countryCode");
    return apiDelete(adminEndpoints.geographyByCode(firstValue(payload, ["countryCode", "code", "id"])));
  },
  createContentPage: (body) =>
    apiPost(adminEndpoints.contentPages, body, { allowedBodyKeys: bodyKeys.createContentPage }),
  listContentPages: (query) =>
    apiGet(adminEndpoints.contentPages, { query, allowedQueryKeys: queryKeys.listContentPages }),
  getContentPage: (slugOrPayload) => {
    const payload = asObjectPayload(slugOrPayload, null, "slug");
    return apiGet(adminEndpoints.contentPageBySlug(firstValue(payload, ["slug", "id"])));
  },
  updateContentPage: (slugOrPayload, body) => {
    const payload = asObjectPayload(slugOrPayload, body, "slug");
    return apiPatch(adminEndpoints.contentPageBySlug(firstValue(payload, ["slug", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updateContentPage,
    });
  },
  deleteContentPage: (slugOrPayload) => {
    const payload = asObjectPayload(slugOrPayload, null, "slug");
    return apiDelete(adminEndpoints.contentPageBySlug(firstValue(payload, ["slug", "id"])));
  },
};

export const authApi = {
  register: (body) =>
    apiPost(authEndpoints.register, body, { allowedBodyKeys: bodyKeys.register }),
  registerOtp: (body) =>
    apiPost(authEndpoints.registerOtp, body, { allowedBodyKeys: bodyKeys.register }),
  verifyRegistration: (body) =>
    apiPost(authEndpoints.verifyRegistration, body, {
      allowedBodyKeys: bodyKeys.verifyRegistration,
    }),
  login: (body) =>
    apiPost(authEndpoints.login, body, { allowedBodyKeys: bodyKeys.login }),
  social: (body) => apiPost(authEndpoints.social, body),
  status: (token) => apiGet(authEndpoints.status, { token }),
  refresh: (body = {}) =>
    apiPost(
      authEndpoints.refresh,
      { refreshToken: body.refreshToken || getStoredRefreshToken() },
      { allowedBodyKeys: bodyKeys.refresh }
    ),
  me: () => apiGet(authEndpoints.me),
  forgotPassword: (body) =>
    apiPost(authEndpoints.forgotPassword, body, {
      allowedBodyKeys: bodyKeys.forgotPassword,
    }),
  sendOtp: (body) =>
    apiPost(authEndpoints.sendOtp, body, { allowedBodyKeys: bodyKeys.sendOtp }),
  verifyOtp: (body) =>
    apiPost(authEndpoints.verifyOtp, body, { allowedBodyKeys: bodyKeys.verifyOtp }),
  resendOtp: (body) =>
    apiPost(authEndpoints.resendOtp, body, { allowedBodyKeys: bodyKeys.resendOtp }),
  resetPassword: (body) =>
    apiPost(authEndpoints.resetPassword, body, { allowedBodyKeys: bodyKeys.resetPassword }),
  changePassword: (body) =>
    apiPost(authEndpoints.changePassword, body, {
      allowedBodyKeys: bodyKeys.changePassword,
    }),
};

export const sellerApi = {
  submitOnboardingKyc: (body, token) =>
    apiPost(sellerEndpoints.onboardingKyc, body, {
      token: token || getOnboardingToken(),
      allowedBodyKeys: bodyKeys.sellerKyc,
    }),
  updateOnboardingProfile: (body, token) =>
    apiPatch(sellerEndpoints.onboardingProfile, body, {
      token: token || getOnboardingToken(),
      allowedBodyKeys: bodyKeys.sellerProfile,
    }),
  reviewSellerKyc: (sellerIdOrPayload, body) => {
    const payload = asObjectPayload(sellerIdOrPayload, body, "sellerId");
    return apiPatch(sellerEndpoints.reviewKyc(firstValue(payload, ["sellerId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.reviewSellerKyc,
    });
  },
  getSellerStatus: () => apiGet(sellerEndpoints.status),
  listSellerTracking: (query) =>
    apiGet(sellerEndpoints.tracking, { query, allowedQueryKeys: queryKeys.sellerTracking }),
  getSellerTrackingDetail: (orderIdOrPayload) => {
    const payload = asObjectPayload(orderIdOrPayload, null, "orderId");
    return apiGet(sellerEndpoints.trackingOrder(firstValue(payload, ["orderId", "id"])));
  },
  getSellerProfile: () => apiGet(sellerEndpoints.profile),
  updateSellerProfile: (body) =>
    apiPatch(sellerEndpoints.profile, body, { allowedBodyKeys: bodyKeys.sellerProfile }),
  updateBusinessAddress: (body) =>
    apiPatch(sellerEndpoints.businessAddress, body, { allowedBodyKeys: bodyKeys.sellerAddress }),
  updatePickupAddress: (body) =>
    apiPatch(sellerEndpoints.pickupAddress, body, { allowedBodyKeys: bodyKeys.sellerAddress }),
  updateBankDetails: (body) =>
    apiPatch(sellerEndpoints.bankDetails, body, { allowedBodyKeys: bodyKeys.sellerBank }),
  updateMoreInfo: (body) =>
    apiPatch(sellerEndpoints.moreInfo, body, { allowedBodyKeys: bodyKeys.sellerMoreInfo }),
  updateSettings: (body) =>
    apiPatch(sellerEndpoints.settings, body, { allowedBodyKeys: bodyKeys.sellerSettings }),
  sellerDashboard: (query) =>
    apiGet(sellerEndpoints.dashboard, { query, allowedQueryKeys: queryKeys.sellerDashboard }),
  createSellerSubAdmin: (body) =>
    apiPost(sellerEndpoints.subAdmins, body, { allowedBodyKeys: bodyKeys.createSubAdmin }),
  listSellerSubAdmins: () => apiGet(sellerEndpoints.subAdmins),
  updateSellerSubAdminModules: (userIdOrPayload, body) => {
    const payload = asObjectPayload(userIdOrPayload, body, "userId");
    return apiPatch(sellerEndpoints.subAdminModules(firstValue(payload, ["userId", "id"])), payload, {
      allowedBodyKeys: bodyKeys.updateAllowedModules,
    });
  },
};

export const sellerCommissionApi = {
  myCommissions: () => apiGet(sellerCommissionEndpoints.myCommissions),
  myPayouts: () => apiGet(sellerCommissionEndpoints.myPayouts),
  calculateOrderCommission: (orderIdOrPayload) => {
    const payload = asObjectPayload(orderIdOrPayload, null, "orderId");
    return apiPost(sellerCommissionEndpoints.calculate(firstValue(payload, ["orderId", "id"])));
  },
  processBatchPayouts: (body) =>
    apiPost(sellerCommissionEndpoints.processPayouts, body, {
      allowedBodyKeys: bodyKeys.processPayouts,
    }),
  viewSettlements: () => apiGet(sellerCommissionEndpoints.settlements),
};

export const sanitizeRouteBody = withoutKeys;
