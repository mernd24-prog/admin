import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";
import {
  DEFAULT_PLATFORM_MODULES,
  firstId,
  normalizeAllowedModules,
  toKycReviewBody,
  toListParams,
  toManagedUserCreateBody,
  toSubAdminCreateBody,
  toUserUpdateBody,
  toVendorStatusBody,
} from "../_helpers/adminApi";

const initialState = {
  accessModulesData: {},
  dashboardOverviewData: {},
  platformSubAdminsData: {},
  createPlatformSubAdminData: {},
  updatePlatformSubAdminModulesData: {},
  adminUsersData: {},
  adminUserData: {},
  updateAdminUserData: {},
  deactivateAdminUserData: {},
  adminVendorsData: {},
  updateVendorStatusData: {},
  reviewSellerKycData: {},
  adminProductModerationQueueData: {},
  moderateAdminProductData: {},
  adminOrdersData: {},
  adminPaymentsData: {},
  codConfigData: {},
  updateCodConfigData: {},
  approvePaymentData: {},
  rejectPaymentData: {},
  adminReturnsData: {},
  adminReturnData: {},
  approveReturnData: {},
  rejectReturnData: {},
  updateReturnData: {},
  refundReturnData: {},
  adminPayoutsData: {},
  walletTransactionsData: {},
  adminsData: {},
  createAdminData: {},
  createAdminPayoutData: {},
  taxReportsData: {},
  taxInvoicesData: {},
  taxInvoiceData: {},
  taxCreditNotesData: {},
  marketplaceInvoicesData: {},
  createTaxInvoiceData: {},
  createMarketplaceInvoicesData: {},
  createTaxCreditNoteData: {},
  dispatchTaxInvoiceData: {},
  dispatchTaxCreditNoteData: {},
  taxDocumentDispatchesData: {},
  retryTaxDocumentDispatchData: {},
  deliveryServiceabilityData: {},
  realtimeAnalyticsData: {},
  adminMarketplaceAnalyticsData: {},
  returnsAnalyticsData: {},
  chargebacksData: {},
  apiKeysData: {},
  createApiKeyData: {},
  webhooksData: {},
  createWebhookData: {},
  featureFlagsData: {},
  upsertFeatureFlagData: {},
  subscriptionPlansData: {},
  subscriptionPlanData: {},
  createSubscriptionPlanData: {},
  updateSubscriptionPlanData: {},
  deleteSubscriptionPlanData: {},
  platformSubscriptionsData: {},
  updatePlatformSubscriptionStatusData: {},
  platformCategoriesData: {},
  platformCategoryData: {},
  createPlatformCategoryData: {},
  updatePlatformCategoryData: {},
  deletePlatformCategoryData: {},
  productFamiliesData: {},
  productFamilyData: {},
  createProductFamilyData: {},
  updateProductFamilyData: {},
  deleteProductFamilyData: {},
  productVariantsData: {},
  productVariantData: {},
  createProductVariantData: {},
  updateProductVariantData: {},
  deleteProductVariantData: {},
  hsnCodesData: {},
  hsnCodeData: {},
  createHsnCodeData: {},
  updateHsnCodeData: {},
  deleteHsnCodeData: {},
  geographiesData: {},
  geographyData: {},
  createGeographyData: {},
  updateGeographyData: {},
  deleteGeographyData: {},
  contentPagesData: {},
  contentPageData: {},
  createContentPageData: {},
  updateContentPageData: {},
  deleteContentPageData: {},
  platformOptionsData: {},
  createPlatformOptionData: {},
  updatePlatformOptionData: {},
  deletePlatformOptionData: {},
  platformOptionValuesData: {},
  createPlatformOptionValueData: {},
  updatePlatformOptionValueData: {},
  deletePlatformOptionValueData: {},
  productReviewsData: {},
  createProductReviewData: {},
  updateProductReviewData: {},
  bulkUpdateProductReviewsData: {},
  deleteProductReviewData: {},
  rbacPermissionManagementModulesData: {},
  rbacModulesData: {},
  rbacSidebarModulesData: {},
  createRbacModuleData: {},
  updateRbacModuleData: {},
  updateRbacModuleStatusData: {},
  reorderRbacModulesData: {},
  deleteRbacModuleData: {},
  rbacPermissionsData: {},
  createRbacPermissionData: {},
  updateRbacPermissionData: {},
  rbacRolesData: {},
  createRbacRoleData: {},
  updateRbacRoleData: {},
  rolePermissionsData: {},
  updateRolePermissionsData: {},
  userPermissionsData: {},
  userEffectivePermissionsData: {},
  userRolesData: {},
  systemHealthData: {},
  systemQueuesData: {},
  pauseQueueData: {},
  resumeQueueData: {},
  deadLetterData: {},
  retryDeadLetterData: {},
  discardDeadLetterData: {},
  dealsData: {},
  dealData: {},
  createDealData: {},
  updateDealData: {},
  submitDealData: {},
  approveDealData: {},
  rejectDealData: {},
  pauseDealData: {},
  resumeDealData: {},
  cancelDealData: {},
  renewDealData: {},
  dealAnalyticsData: {},
  dealPayoutsData: {},
  generateDealPayoutData: {},
  processDealPayoutData: {},
};

const pickPayload = (payload = {}, keys = []) =>
  keys.reduce((acc, key) => {
    if (payload?.[key] !== undefined) acc[key] = payload[key];
    return acc;
  }, {});

const omitPayload = (payload = {}, keys = []) =>
  Object.entries(payload || {}).reduce((acc, [key, value]) => {
    if (!keys.includes(key) && value !== undefined) acc[key] = value;
    return acc;
  }, {});

const noBody = () => undefined;
const noParams = () => undefined;
const toBool = (value, fallback = undefined) =>
  value === undefined || value === null ? fallback : Boolean(value);
const toNum = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const firstDefined = (...values) => values.find((v) => v !== undefined && v !== null);

const pickQuery = (keys = []) => (params = {}) =>
  keys.reduce((acc, key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") acc[key] = value;
    return acc;
  }, {});

const listAccessModuleQueryKeys = ["role", "roleId", "roleSlug", "userId", "active", "includePermissions"];
const listOrderQueryKeys = ["status", "sellerId", "fromDate", "toDate", "limit", "offset"];
const moderationQueueQueryKeys = ["status", "category", "page", "limit"];
const updateModerationKeys = ["status", "rejectionReason", "checklist"];

const toAdminPayoutBody = (payload = {}) => ({
  ...(firstDefined(payload.sellerId, payload.seller_id) ? { sellerId: firstDefined(payload.sellerId, payload.seller_id) } : {}),
  ...(firstDefined(payload.periodStart, payload.period_start, payload.fromDate, payload.startDate)
    ? { periodStart: firstDefined(payload.periodStart, payload.period_start, payload.fromDate, payload.startDate) }
    : {}),
  ...(firstDefined(payload.periodEnd, payload.period_end, payload.toDate, payload.endDate)
    ? { periodEnd: firstDefined(payload.periodEnd, payload.period_end, payload.toDate, payload.endDate) }
    : {}),
  ...(toNum(firstDefined(payload.grossAmount, payload.gross_amount, payload.amount)) !== undefined
    ? { grossAmount: toNum(firstDefined(payload.grossAmount, payload.gross_amount, payload.amount)) }
    : {}),
  ...(toNum(firstDefined(payload.commissionAmount, payload.commission_amount)) !== undefined
    ? { commissionAmount: toNum(firstDefined(payload.commissionAmount, payload.commission_amount)) }
    : {}),
  ...(toNum(firstDefined(payload.processingFeeAmount, payload.processing_fee_amount)) !== undefined
    ? { processingFeeAmount: toNum(firstDefined(payload.processingFeeAmount, payload.processing_fee_amount)) }
    : {}),
  ...(toNum(firstDefined(payload.taxWithheldAmount, payload.tax_withheld_amount)) !== undefined
    ? { taxWithheldAmount: toNum(firstDefined(payload.taxWithheldAmount, payload.tax_withheld_amount)) }
    : {}),
  ...(toNum(firstDefined(payload.netPayoutAmount, payload.net_payout_amount)) !== undefined
    ? { netPayoutAmount: toNum(firstDefined(payload.netPayoutAmount, payload.net_payout_amount)) }
    : {}),
  ...(firstDefined(payload.currency, payload.currencyCode) ? { currency: firstDefined(payload.currency, payload.currencyCode) } : {}),
  ...(payload.status ? { status: payload.status } : {}),
  ...(firstDefined(payload.scheduledAt, payload.scheduled_at)
    ? { scheduledAt: firstDefined(payload.scheduledAt, payload.scheduled_at) }
    : {}),
  ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
});

const toApiKeyBody = (payload = {}) => ({
  ...(firstDefined(payload.ownerId, payload.owner_id) ? { ownerId: firstDefined(payload.ownerId, payload.owner_id) } : {}),
  keyName: firstDefined(payload.keyName, payload.key_name, payload.name, payload.title),
  scopes: Array.isArray(payload.scopes) ? payload.scopes : [],
  expiresAt: firstDefined(payload.expiresAt, payload.expires_at, null),
});

const toWebhookBody = (payload = {}) => ({
  ...(firstDefined(payload.ownerId, payload.owner_id) ? { ownerId: firstDefined(payload.ownerId, payload.owner_id) } : {}),
  endpointUrl: firstDefined(payload.endpointUrl, payload.endpoint_url, payload.url),
  secret: payload.secret,
  eventTypes: Array.isArray(payload.eventTypes) ? payload.eventTypes : (Array.isArray(payload.events) ? payload.events : []),
  retryPolicy: {
    maxRetries: toNum(firstDefined(payload.retryPolicy?.maxRetries, payload.retryPolicy?.max_retries, payload.maxRetries, payload.max_retries), 5),
    ...(toNum(firstDefined(payload.retryPolicy?.backoffMs, payload.retryPolicy?.backoff_ms, payload.backoffMs, payload.backoff_ms)) !== undefined
      ? { backoffMs: toNum(firstDefined(payload.retryPolicy?.backoffMs, payload.retryPolicy?.backoff_ms, payload.backoffMs, payload.backoff_ms)) }
      : {}),
  },
});

const toFeatureFlagBody = (payload = {}) => ({
  flagKey: firstDefined(payload.flagKey, payload.flag_key, payload.key),
  ...(payload.description !== undefined ? { description: payload.description } : {}),
  ...(firstDefined(payload.enabled, payload.isEnabled, payload.active) !== undefined
    ? { enabled: toBool(firstDefined(payload.enabled, payload.isEnabled, payload.active), false) }
    : {}),
  ...(toNum(firstDefined(payload.rolloutPercentage, payload.rollout_percentage, payload.rollout)) !== undefined
    ? { rolloutPercentage: toNum(firstDefined(payload.rolloutPercentage, payload.rollout_percentage, payload.rollout), 100) }
    : {}),
  ...(payload.targetRules !== undefined || payload.target_rules !== undefined
    ? { targetRules: payload.targetRules || payload.target_rules || {} }
    : {}),
});

const toSubscriptionPlanBody = (payload = {}) => ({
  ...(firstDefined(payload.planCode, payload.plan_code, payload.code) ? { planCode: firstDefined(payload.planCode, payload.plan_code, payload.code) } : {}),
  ...(payload.title !== undefined ? { title: payload.title } : {}),
  ...(payload.description !== undefined ? { description: payload.description } : {}),
  ...(firstDefined(payload.targetRoles, payload.target_roles, payload.roles) !== undefined
    ? { targetRoles: firstDefined(payload.targetRoles, payload.target_roles, payload.roles) || [] }
    : {}),
  ...(firstDefined(payload.featureFlags, payload.feature_flags) !== undefined
    ? { featureFlags: firstDefined(payload.featureFlags, payload.feature_flags) || [] }
    : {}),
  ...(toNum(firstDefined(payload.monthlyPrice, payload.monthly_price)) !== undefined
    ? { monthlyPrice: toNum(firstDefined(payload.monthlyPrice, payload.monthly_price)) }
    : {}),
  ...(toNum(firstDefined(payload.yearlyPrice, payload.yearly_price)) !== undefined
    ? { yearlyPrice: toNum(firstDefined(payload.yearlyPrice, payload.yearly_price)) }
    : {}),
  ...(firstDefined(payload.currency, payload.currencyCode) ? { currency: firstDefined(payload.currency, payload.currencyCode) } : {}),
  ...(payload.active !== undefined ? { active: Boolean(payload.active) } : {}),
  ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
});

const toPlatformCategoryBody = (payload = {}) => ({
  ...(firstDefined(payload.categoryKey, payload.key, payload.code) ? { categoryKey: firstDefined(payload.categoryKey, payload.key, payload.code) } : {}),
  ...(firstDefined(payload.title, payload.name) !== undefined ? { title: firstDefined(payload.title, payload.name) } : {}),
  ...(firstDefined(payload.parentKey, payload.parent_key, payload.parentId, payload.parent_id) !== undefined
    ? { parentKey: firstDefined(payload.parentKey, payload.parent_key, payload.parentId, payload.parent_id, "") }
    : {}),
  ...(toNum(firstDefined(payload.level, payload.depth)) !== undefined ? { level: toNum(firstDefined(payload.level, payload.depth), 0) } : {}),
  ...(payload.attributesSchema !== undefined || payload.attributes_schema !== undefined
    ? { attributesSchema: payload.attributesSchema || payload.attributes_schema || {} }
    : {}),
  ...(firstDefined(payload.active, payload.isActive) !== undefined ? { active: toBool(firstDefined(payload.active, payload.isActive), true) } : {}),
  ...(toNum(firstDefined(payload.sortOrder, payload.sort_order)) !== undefined ? { sortOrder: toNum(firstDefined(payload.sortOrder, payload.sort_order), 0) } : {}),
});

const toProductFamilyBody = (payload = {}) => ({
  ...(firstDefined(payload.familyCode, payload.family_code, payload.code) ? { familyCode: firstDefined(payload.familyCode, payload.family_code, payload.code) } : {}),
  ...(firstDefined(payload.sellerId, payload.seller_id) !== undefined ? { sellerId: firstDefined(payload.sellerId, payload.seller_id) } : {}),
  ...(firstDefined(payload.title, payload.name) !== undefined ? { title: firstDefined(payload.title, payload.name) } : {}),
  ...(firstDefined(payload.category, payload.categoryCode, payload.category_code) !== undefined ? { category: firstDefined(payload.category, payload.categoryCode, payload.category_code) } : {}),
  ...(payload.baseAttributes !== undefined || payload.base_attributes !== undefined
    ? { baseAttributes: payload.baseAttributes || payload.base_attributes || {} }
    : {}),
  ...(firstDefined(payload.variantAxes, payload.variant_axes) !== undefined
    ? { variantAxes: firstDefined(payload.variantAxes, payload.variant_axes) || [] }
    : {}),
  ...(payload.status !== undefined ? { status: payload.status } : {}),
});

const toProductVariantBody = (payload = {}) => ({
  ...(firstDefined(payload.familyCode, payload.family_code) ? { familyCode: firstDefined(payload.familyCode, payload.family_code) } : {}),
  ...(firstDefined(payload.productId, payload.product_id) ? { productId: firstDefined(payload.productId, payload.product_id) } : {}),
  ...(firstDefined(payload.sellerId, payload.seller_id) ? { sellerId: firstDefined(payload.sellerId, payload.seller_id) } : {}),
  ...(payload.sku !== undefined ? { sku: payload.sku } : {}),
  ...(payload.attributes !== undefined ? { attributes: payload.attributes } : {}),
  ...(toNum(payload.stock) !== undefined ? { stock: toNum(payload.stock) } : {}),
  ...(toNum(firstDefined(payload.reservedStock, payload.reserved_stock)) !== undefined ? { reservedStock: toNum(firstDefined(payload.reservedStock, payload.reserved_stock)) } : {}),
  ...(payload.status !== undefined ? { status: payload.status } : {}),
});

const toHsnCodeBody = (payload = {}) => ({
  ...(payload.code !== undefined ? { code: String(payload.code) } : {}),
  ...(payload.description !== undefined ? { description: payload.description } : {}),
  ...(toNum(firstDefined(payload.gstRate, payload.IGST, payload.gst_rate)) !== undefined ? { gstRate: toNum(firstDefined(payload.gstRate, payload.IGST, payload.gst_rate)) } : {}),
  ...(toNum(firstDefined(payload.cessRate, payload.additionalTax, payload.cess_rate)) !== undefined ? { cessRate: toNum(firstDefined(payload.cessRate, payload.additionalTax, payload.cess_rate)) } : {}),
  ...(payload.taxType !== undefined ? { taxType: payload.taxType } : {}),
  ...(payload.exempt !== undefined ? { exempt: Boolean(payload.exempt) } : {}),
  ...(payload.category !== undefined ? { category: payload.category } : {}),
  ...(payload.active !== undefined ? { active: Boolean(payload.active) } : {}),
});

const toGeographyBody = (payload = {}) => ({
  ...(firstDefined(payload.countryCode, payload.country_code) ? { countryCode: firstDefined(payload.countryCode, payload.country_code) } : {}),
  ...(firstDefined(payload.countryName, payload.country_name, payload.name) ? { countryName: firstDefined(payload.countryName, payload.country_name, payload.name) } : {}),
  ...(payload.active !== undefined ? { active: Boolean(payload.active) } : {}),
  states: Array.isArray(payload.states) ? payload.states : [],
});

const toContentPageBody = (payload = {}) => ({
  ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
  ...(payload.title !== undefined ? { title: payload.title } : {}),
  ...(payload.pageType !== undefined ? { pageType: payload.pageType } : {}),
  ...(payload.status !== undefined ? { status: payload.status } : {}),
  ...(payload.description !== undefined ? { description: payload.description } : {}),
  ...(payload.body !== undefined ? { body: payload.body } : {}),
  ...(payload.description !== undefined ? { description: payload.description } : {}),
  ...(payload.coverImage !== undefined ? { coverImage: payload.coverImage } : {}),
  ...(payload.points !== undefined ? { points: payload.points } : {}),
  ...(payload.excerpt !== undefined ? { excerpt: payload.excerpt } : {}),
  ...(payload.category !== undefined ? { category: payload.category } : {}),
  ...(payload.tags !== undefined ? { tags: payload.tags || [] } : {}),
  ...(payload.image !== undefined ? { image: payload.image || {} } : {}),
  ...(payload.gallery !== undefined ? { gallery: payload.gallery || [] } : {}),
  ...(payload.sections !== undefined ? { sections: payload.sections || [] } : {}),
  ...(payload.cta !== undefined ? { cta: payload.cta || {} } : {}),
  ...(payload.seo !== undefined ? { seo: payload.seo || {} } : {}),
  ...(payload.visibility !== undefined ? { visibility: payload.visibility || {} } : {}),
  ...(payload.sortOrder !== undefined ? { sortOrder: Number(payload.sortOrder || 0) } : {}),
  ...(payload.coverImage !== undefined ? { coverImage: payload.coverImage } : {}),
  ...(payload.thumbnailUrl !== undefined ? { thumbnailUrl: payload.thumbnailUrl } : {}),
  ...(payload.heroImage !== undefined ? { heroImage: payload.heroImage } : {}),
  ...(payload.galleryImages !== undefined ? { galleryImages: payload.galleryImages || [] } : {}),
  ...(payload.author !== undefined ? { author: payload.author || {} } : {}),
  ...(payload.readTime !== undefined ? { readTime: Number(payload.readTime || 0) } : {}),
  ...(payload.language !== undefined ? { language: payload.language } : {}),
  ...(payload.published !== undefined ? { published: Boolean(payload.published) } : {}),
  ...(payload.publishedAt !== undefined ? { publishedAt: payload.publishedAt } : {}),
  ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
});

export const getDashboardOverview = createApiThunkPrivate(
  "adminCore/getDashboardOverview",
  ENDPOINTS.dashboard.overview,
  "GET",
  true,
  { transformParams: pickQuery(["fromDate", "toDate", "limit"]) }
);

export const getAccessModules = createApiThunkPrivate(
  "adminCore/getAccessModules",
  ENDPOINTS.adminAccess.modules,
  "GET",
  true,
  { transformParams: pickQuery(listAccessModuleQueryKeys) }
);

export const getAdmins = createApiThunkPrivate(
  "adminCore/getAdmins",
  ENDPOINTS.adminAccess.admins,
  "GET",
  true,
  { transformParams: (params = {}) => toListParams(params) }
);

export const createAdmin = createApiThunkPrivate(
  "adminCore/createAdmin",
  ENDPOINTS.adminAccess.admins,
  "POST",
  false,
  { transformBody: (payload = {}) => toManagedUserCreateBody(payload, { allowedModules: DEFAULT_PLATFORM_MODULES }) }
);

export const createPlatformSubAdmin = createApiThunkPrivate(
  "adminCore/createPlatformSubAdmin",
  ENDPOINTS.adminAccess.subAdmins,
  "POST",
  false,
  { transformBody: (payload = {}) => toSubAdminCreateBody(payload, ["admin"]) }
);

export const getPlatformSubAdmins = createApiThunkPrivate(
  "adminCore/getPlatformSubAdmins",
  ENDPOINTS.adminAccess.subAdmins,
  "GET",
  true,
  { transformParams: pickQuery(["ownerAdminId", "ownerSellerId", "q", "search", "status", "page", "limit"]) }
);

export const updatePlatformSubAdminModules = createApiThunkPrivate(
  "adminCore/updatePlatformSubAdminModules",
  (payload) => ENDPOINTS.adminAccess.subAdminModules(firstId(payload)),
  "PATCH",
  false,
  {
    transformBody: (payload = {}) => ({
      allowedModules: normalizeAllowedModules(payload.allowedModules, DEFAULT_PLATFORM_MODULES),
      ...(Array.isArray(payload.modulePermissions)
        ? { modulePermissions: payload.modulePermissions }
        : {}),
    }),
  }
);

export const getAdminUsers = createApiThunkPrivate(
  "adminCore/getAdminUsers",
  ENDPOINTS.users.adminUsers,
  "GET",
  true,
  { transformParams: (params = {}) => toListParams(params) }
);

export const getAdminUser = createApiThunkPrivate(
  "adminCore/getAdminUser",
  (payload) => ENDPOINTS.users.adminUser(payload?.userId || firstId(payload)),
  "GET"
);

export const updateAdminUser = createApiThunkPrivate(
  "adminCore/updateAdminUser",
  (payload) => ENDPOINTS.users.adminUser(payload?.userId || firstId(payload)),
  "PATCH",
  false,
  { transformBody: toUserUpdateBody }
);

export const deactivateAdminUser = createApiThunkPrivate(
  "adminCore/deactivateAdminUser",
  (payload) => ENDPOINTS.users.adminUser(payload?.userId || firstId(payload)),
  "DELETE",
  false,
  {
    sendBodyForDelete: true,
    transformBody: (payload = {}) => pickPayload(payload, ["reason"]),
  }
);

export const getAdminVendors = createApiThunkPrivate(
  "adminCore/getAdminVendors",
  ENDPOINTS.sellers.list,
  "GET",
  true,
  { transformParams: (params = {}) => toListParams(params) }
);

export const updateAdminVendorStatus = createApiThunkPrivate(
  "adminCore/updateAdminVendorStatus",
  (payload) => ENDPOINTS.sellers.adminStatus(payload?.sellerId || firstId(payload)),
  "PATCH",
  false,
  { transformBody: toVendorStatusBody }
);

export const reviewAdminSellerKyc = createApiThunkPrivate(
  "adminCore/reviewAdminSellerKyc",
  (payload) => ENDPOINTS.sellers.kycReviewAdmin(payload?.sellerId || firstId(payload)),
  "PATCH",
  false,
  { transformBody: toKycReviewBody }
);

export const getAdminProductModerationQueue = createApiThunkPrivate(
  "adminCore/getAdminProductModerationQueue",
  ENDPOINTS.products.moderationQueue,
  "GET",
  true,
  { transformParams: pickQuery(moderationQueueQueryKeys) }
);

export const moderateAdminProduct = createApiThunkPrivate(
  "adminCore/moderateAdminProduct",
  (payload) => ENDPOINTS.products.moderate(payload?.productId || firstId(payload)),
  "PATCH",
  false,
  { transformBody: (payload = {}) => pickPayload(payload, updateModerationKeys) }
);

export const getAdminOrders = createApiThunkPrivate(
  "adminCore/getAdminOrders",
  ENDPOINTS.orders.admin,
  "GET",
  true,
  { transformParams: pickQuery(listOrderQueryKeys) }
);

export const getAdminPayments = createApiThunkPrivate("adminCore/getAdminPayments", ENDPOINTS.payments.admin, "GET", true, { transformParams: pickQuery(["status", "provider", "buyerId", "orderId", "search", "fromDate", "toDate", "sortBy", "sortDir", "limit", "offset"]) });
export const getCodConfig = createApiThunkPrivate("adminCore/getCodConfig", ENDPOINTS.payments.codConfig, "GET");
export const updateCodConfig = createApiThunkPrivate("adminCore/updateCodConfig", ENDPOINTS.payments.codConfig, "PUT", false, {
  transformBody: (payload = {}) => ({
    enabled: Boolean(payload.enabled),
    chargeAmount: toNum(payload.chargeAmount, 0),
    minOrderAmount: toNum(payload.minOrderAmount, null),
    maxOrderAmount: toNum(payload.maxOrderAmount, null),
    currency: payload.currency || "INR",
    metadata: payload.metadata || {},
  }),
});
export const approvePayment = createApiThunkPrivate("adminCore/approvePayment", (payload) => ENDPOINTS.payments.approve(payload.paymentId || payload.id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["referenceId", "reason"]) });
export const rejectPayment = createApiThunkPrivate("adminCore/rejectPayment", (payload) => ENDPOINTS.payments.reject(payload.paymentId || payload.id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["referenceId", "reason"]) });
export const getAdminReturns = createApiThunkPrivate("adminCore/getAdminReturns", ENDPOINTS.returns.list, "GET", true, { transformParams: pickQuery(["status", "reason", "buyerId", "orderId", "sellerId", "refundStatus", "shipmentStatus", "search", "fromDate", "toDate", "sortBy", "sortDir", "limit", "offset"]) });
export const getAdminReturn = createApiThunkPrivate("adminCore/getAdminReturn", (payload) => ENDPOINTS.returns.detail(payload.returnId || payload.id || payload._id), "GET");
export const approveReturn = createApiThunkPrivate("adminCore/approveReturn", (payload) => ENDPOINTS.returns.approve(payload.returnId || payload.id || payload._id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["refundAmount", "note", "items"]) });
export const rejectReturn = createApiThunkPrivate("adminCore/rejectReturn", (payload) => ENDPOINTS.returns.reject(payload.returnId || payload.id || payload._id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["reason"]) });
export const scheduleReturn = createApiThunkPrivate("adminCore/scheduleReturn", (payload) => ENDPOINTS.returns.schedule(payload.returnId || payload.id || payload._id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["mode", "manualShipBack", "provider", "courierName", "awbNumber", "trackingNumber", "shippingMode", "pickupScheduledAt", "expectedDeliveryAt", "labelData", "packageSnapshot", "pickupAddressSnapshot", "warehouseAddressSnapshot", "rateSnapshot", "cost", "idempotencyKey", "metadata", "note"]) });
export const updateReturnReverseTracking = createApiThunkPrivate("adminCore/updateReturnReverseTracking", (payload) => ENDPOINTS.returns.reverseTracking(payload.returnId || payload.id || payload._id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["shipmentId", "status", "eventTime", "location", "note", "source", "deliveryException", "rawPayload"]) });
export const receiveReturn = createApiThunkPrivate("adminCore/receiveReturn", (payload) => ENDPOINTS.returns.receive(payload.returnId || payload.id || payload._id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["notes", "items"]) });
export const qcReturn = createApiThunkPrivate("adminCore/qcReturn", (payload) => ENDPOINTS.returns.qc(payload.returnId || payload.id || payload._id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["passed", "condition", "notes", "items"]) });
export const refundReturn = createApiThunkPrivate("adminCore/refundReturn", (payload) => ENDPOINTS.returns.refund(payload.returnId || payload.id || payload._id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["refundAmount", "referenceId", "method", "walletAmount", "providerAmount", "idempotencyKey", "note"]) });
export const retryReturnRefund = createApiThunkPrivate("adminCore/retryReturnRefund", (payload) => ENDPOINTS.returns.retryRefund(payload.returnId || payload.id || payload._id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["refundAmount", "referenceId", "method", "walletAmount", "providerAmount", "note"]) });
export const syncReturnRefund = createApiThunkPrivate("adminCore/syncReturnRefund", (payload) => ENDPOINTS.returns.syncRefund(payload.returnId || payload.id || payload._id), "POST", false, { transformBody: noBody });
export const replaceReturn = createApiThunkPrivate("adminCore/replaceReturn", (payload) => ENDPOINTS.returns.replacement(payload.returnId || payload.id || payload._id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["replacementOrderId", "replacementShipmentId", "trackingNumber", "metadata", "note"]) });
export const closeReturn = createApiThunkPrivate("adminCore/closeReturn", (payload) => ENDPOINTS.returns.close(payload.returnId || payload.id || payload._id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["reason", "note"]) });
export const getAdminPayouts = createApiThunkPrivate("adminCore/getAdminPayouts", ENDPOINTS.payouts.admin, "GET", true, { transformParams: pickQuery(["sellerId", "status", "fromDate", "toDate", "limit", "offset"]) });
export const createAdminPayout = createApiThunkPrivate("adminCore/createAdminPayout", ENDPOINTS.payouts.admin, "POST", false, { transformBody: toAdminPayoutBody });
export const getWalletTransactions = createApiThunkPrivate("adminCore/getWalletTransactions", ENDPOINTS.wallets.adminTransactions, "GET", true, { transformParams: pickQuery(["userId", "type", "status", "referenceType", "referenceId", "search", "fromDate", "toDate", "limit", "offset"]) });
export const getTaxReports = createApiThunkPrivate("adminCore/getTaxReports", ENDPOINTS.tax.reports, "GET", true, { transformParams: pickQuery(["fromDate", "toDate", "taxComponent", "organizationId", "format", "limit", "offset"]) });
export const createTaxInvoice = createApiThunkPrivate("adminCore/createTaxInvoice", (payload) => ENDPOINTS.tax.adminInvoice(payload.orderId), "POST", false, { transformBody: noBody });
export const getMarketplaceInvoices = createApiThunkPrivate("adminCore/getMarketplaceInvoices", (payload) => ENDPOINTS.tax.marketplaceInvoices(payload.orderId || payload.id), "GET", true, { transformParams: pickQuery(["format"]) });
export const createMarketplaceInvoices = createApiThunkPrivate("adminCore/createMarketplaceInvoices", (payload) => ENDPOINTS.tax.marketplaceInvoices(payload.orderId || payload.id), "POST", false, { transformBody: noBody });
export const getTaxInvoices = createApiThunkPrivate("adminCore/getTaxInvoices", ENDPOINTS.tax.invoices, "GET", true, { transformParams: pickQuery(["fromDate", "toDate", "sellerId", "organizationId", "buyerId", "state", "status", "invoiceType", "referenceType", "referenceId", "hsnCode", "search", "sortBy", "sortDir", "limit", "offset"]) });
export const getTaxInvoice = createApiThunkPrivate("adminCore/getTaxInvoice", (payload) => ENDPOINTS.tax.invoiceDetail(payload.invoiceId || payload.id), "GET");
export const getTaxCreditNotes = createApiThunkPrivate("adminCore/getTaxCreditNotes", ENDPOINTS.tax.creditNotes, "GET", true, { transformParams: pickQuery(["fromDate", "toDate", "orderId", "buyerId", "sellerId", "organizationId", "referenceType", "referenceId", "status", "search", "sortBy", "sortDir", "limit", "offset"]) });
export const createTaxCreditNote = createApiThunkPrivate("adminCore/createTaxCreditNote", ENDPOINTS.tax.creditNotes, "POST", false, { transformBody: (payload = {}) => omitPayload(payload, ["id"]) });
export const dispatchTaxInvoice = createApiThunkPrivate("adminCore/dispatchTaxInvoice", (payload) => ENDPOINTS.tax.invoiceDispatch(payload.invoiceId || payload.id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["channel", "recipient", "note"]) });
export const dispatchTaxCreditNote = createApiThunkPrivate("adminCore/dispatchTaxCreditNote", (payload) => ENDPOINTS.tax.creditNoteDispatch(payload.creditNoteId || payload.id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["channel", "recipient", "note"]) });
export const getTaxDocumentDispatches = createApiThunkPrivate("adminCore/getTaxDocumentDispatches", ENDPOINTS.tax.documentDispatches, "GET", true, { transformParams: pickQuery(["documentType", "status", "channel", "search", "fromDate", "toDate", "limit", "offset"]) });
export const retryTaxDocumentDispatch = createApiThunkPrivate("adminCore/retryTaxDocumentDispatch", (payload) => ENDPOINTS.tax.documentDispatchRetry(payload.dispatchId || payload.id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["note"]) });
export const getDeliveryServiceability = createApiThunkPrivate("adminCore/getDeliveryServiceability", ENDPOINTS.delivery.serviceability, "GET");

export const getRealtimeAnalytics = createApiThunkPrivate("adminCore/getRealtimeAnalytics", ENDPOINTS.analytics.realtime, "GET", true, { transformParams: pickQuery(["hours"]) });
export const getAdminMarketplaceAnalytics = createApiThunkPrivate("adminCore/getAdminMarketplaceAnalytics", ENDPOINTS.analytics.adminDashboard, "GET", true, { transformParams: pickQuery(["fromDate", "toDate", "sellerId", "granularity"]) });
export const getReturnsAnalytics = createApiThunkPrivate("adminCore/getReturnsAnalytics", ENDPOINTS.analytics.returns, "GET", true, { transformParams: pickQuery(["fromDate", "toDate"]) });
export const getChargebacks = createApiThunkPrivate("adminCore/getChargebacks", ENDPOINTS.analytics.chargebacks, "GET", true, { transformParams: pickQuery(["status", "fromDate", "toDate", "limit", "offset"]) });

export const getApiKeys = createApiThunkPrivate("adminCore/getApiKeys", ENDPOINTS.platform.apiKeys, "GET", true, { transformParams: pickQuery(["ownerId", "status", "limit", "offset"]) });
export const createApiKey = createApiThunkPrivate("adminCore/createApiKey", ENDPOINTS.platform.apiKeys, "POST", false, { transformBody: toApiKeyBody });
export const getWebhooks = createApiThunkPrivate("adminCore/getWebhooks", ENDPOINTS.platform.webhooks, "GET", true, { transformParams: pickQuery(["ownerId", "status", "limit", "offset"]) });
export const createWebhook = createApiThunkPrivate("adminCore/createWebhook", ENDPOINTS.platform.webhooks, "POST", false, { transformBody: toWebhookBody });
export const getFeatureFlags = createApiThunkPrivate("adminCore/getFeatureFlags", ENDPOINTS.platform.featureFlags, "GET", true, { transformParams: pickQuery(["enabled", "limit", "offset"]) });
export const upsertFeatureFlag = createApiThunkPrivate("adminCore/upsertFeatureFlag", ENDPOINTS.platform.featureFlags, "PUT", false, { transformBody: toFeatureFlagBody });

export const getSubscriptionPlans = createApiThunkPrivate("adminCore/getSubscriptionPlans", ENDPOINTS.platform.subscriptionPlans, "GET", true, { transformParams: pickQuery(["active", "limit", "offset"]) });
export const getSubscriptionPlan = createApiThunkPrivate("adminCore/getSubscriptionPlan", (payload) => ENDPOINTS.platform.subscriptionPlan(payload.planId || payload.id), "GET");
export const createSubscriptionPlan = createApiThunkPrivate("adminCore/createSubscriptionPlan", ENDPOINTS.platform.subscriptionPlans, "POST", false, { transformBody: toSubscriptionPlanBody });
export const updateSubscriptionPlan = createApiThunkPrivate("adminCore/updateSubscriptionPlan", (payload) => ENDPOINTS.platform.subscriptionPlan(payload.planId || payload.id), "PATCH", false, { transformBody: (payload = {}) => toSubscriptionPlanBody(omitPayload(payload, ["planId", "id"])) });
export const deleteSubscriptionPlan = createApiThunkPrivate("adminCore/deleteSubscriptionPlan", (payload) => ENDPOINTS.platform.subscriptionPlan(payload.planId || payload.id), "DELETE", false, { transformParams: noParams });
export const getPlatformSubscriptions = createApiThunkPrivate("adminCore/getPlatformSubscriptions", ENDPOINTS.platform.subscriptions, "GET", true, { transformParams: pickQuery(["status", "userRole", "limit", "offset"]) });
export const updatePlatformSubscriptionStatus = createApiThunkPrivate("adminCore/updatePlatformSubscriptionStatus", (payload) => ENDPOINTS.platform.subscriptionStatus(payload.subscriptionId || payload.id), "PATCH", false, { transformBody: (payload = {}) => pickPayload(payload, ["status"]) });

export const getPlatformCategories = createApiThunkPrivate("adminCore/getPlatformCategories", ENDPOINTS.platform.categories, "GET", true, { transformParams: pickQuery(["page", "limit", "parentKey", "active", "categoryKey"]) });
export const getPlatformCategory = createApiThunkPrivate("adminCore/getPlatformCategory", (payload) => ENDPOINTS.platform.category(payload.categoryKey || payload.key || payload.id), "GET");
export const createPlatformCategory = createApiThunkPrivate("adminCore/createPlatformCategory", ENDPOINTS.platform.categories, "POST", false, { transformBody: toPlatformCategoryBody });
export const updatePlatformCategory = createApiThunkPrivate("adminCore/updatePlatformCategory", (payload) => ENDPOINTS.platform.category(payload.categoryKey || payload.key || payload.id), "PATCH", false, { transformBody: (payload = {}) => toPlatformCategoryBody(omitPayload(payload, ["categoryKey", "key", "id"])) });
export const deletePlatformCategory = createApiThunkPrivate("adminCore/deletePlatformCategory", (payload) => ENDPOINTS.platform.category(payload.categoryKey || payload.key || payload.id), "DELETE", false, { transformParams: noParams });

export const getProductFamilies = createApiThunkPrivate("adminCore/getProductFamilies", ENDPOINTS.platform.productFamilies, "GET", true, { transformParams: pickQuery(["page", "limit", "q", "search", "sortBy", "sortDir", "category", "sellerId", "status"]) });
export const getProductFamily = createApiThunkPrivate("adminCore/getProductFamily", (payload) => ENDPOINTS.platform.productFamily(payload.familyCode || payload.code || payload.id), "GET");
export const createProductFamily = createApiThunkPrivate("adminCore/createProductFamily", ENDPOINTS.platform.productFamilies, "POST", false, { transformBody: toProductFamilyBody });
export const updateProductFamily = createApiThunkPrivate("adminCore/updateProductFamily", (payload) => ENDPOINTS.platform.productFamily(payload.familyCode || payload.code || payload.id), "PATCH", false, { transformBody: (payload = {}) => toProductFamilyBody(omitPayload(payload, ["familyCode", "code", "id"])) });
export const deleteProductFamily = createApiThunkPrivate("adminCore/deleteProductFamily", (payload) => ENDPOINTS.platform.productFamily(payload.familyCode || payload.code || payload.id), "DELETE", false, { transformParams: noParams });

export const getProductVariants = createApiThunkPrivate("adminCore/getProductVariants", ENDPOINTS.platform.productVariants, "GET", true, { transformParams: pickQuery(["page", "limit", "q", "search", "sortBy", "sortDir", "productId", "familyCode", "sellerId", "sku", "status"]) });
export const getProductVariant = createApiThunkPrivate("adminCore/getProductVariant", (payload) => ENDPOINTS.platform.productVariant(payload.variantId || payload.id), "GET");
export const createProductVariant = createApiThunkPrivate("adminCore/createProductVariant", ENDPOINTS.platform.productVariants, "POST", false, { transformBody: toProductVariantBody });
export const updateProductVariant = createApiThunkPrivate("adminCore/updateProductVariant", (payload) => ENDPOINTS.platform.productVariant(payload.variantId || payload.id), "PATCH", false, { transformBody: (payload = {}) => toProductVariantBody(omitPayload(payload, ["variantId", "id"])) });
export const deleteProductVariant = createApiThunkPrivate("adminCore/deleteProductVariant", (payload) => ENDPOINTS.platform.productVariant(payload.variantId || payload.id), "DELETE", false, { transformParams: noParams });

export const getHsnCodes = createApiThunkPrivate("adminCore/getHsnCodes", ENDPOINTS.platform.hsnCodes, "GET", true, { transformParams: pickQuery(["page", "limit", "category", "active"]) });
export const getHsnCode = createApiThunkPrivate("adminCore/getHsnCode", (payload) => ENDPOINTS.platform.hsnCode(payload.hsnCode || payload.code || payload.id), "GET");
export const createHsnCode = createApiThunkPrivate("adminCore/createHsnCode", ENDPOINTS.platform.hsnCodes, "POST", false, { transformBody: toHsnCodeBody });
export const updateHsnCode = createApiThunkPrivate("adminCore/updateHsnCode", (payload) => ENDPOINTS.platform.hsnCode(payload.hsnCode || payload.code || payload.id), "PATCH", false, { transformBody: (payload = {}) => toHsnCodeBody(omitPayload(payload, ["hsnCode", "code", "id"])) });
export const deleteHsnCode = createApiThunkPrivate("adminCore/deleteHsnCode", (payload) => ENDPOINTS.platform.hsnCode(payload.hsnCode || payload.code || payload.id), "DELETE", false, { transformParams: noParams });

export const getGeographies = createApiThunkPrivate("adminCore/getGeographies", ENDPOINTS.platform.geography, "GET", true, { transformParams: pickQuery(["page", "limit", "active"]) });
export const getGeography = createApiThunkPrivate("adminCore/getGeography", (payload) => ENDPOINTS.platform.geographyDetail(payload.countryCode || payload.code || payload.id), "GET");
export const createGeography = createApiThunkPrivate("adminCore/createGeography", ENDPOINTS.platform.geography, "POST", false, { transformBody: toGeographyBody });
export const updateGeography = createApiThunkPrivate("adminCore/updateGeography", (payload) => ENDPOINTS.platform.geographyDetail(payload.countryCode || payload.code || payload.id), "PATCH", false, { transformBody: (payload = {}) => toGeographyBody(omitPayload(payload, ["countryCode", "code", "id"])) });
export const deleteGeography = createApiThunkPrivate("adminCore/deleteGeography", (payload) => ENDPOINTS.platform.geographyDetail(payload.countryCode || payload.code || payload.id), "DELETE", false, { transformParams: noParams });

export const getContentPages = createApiThunkPrivate("adminCore/getContentPages", ENDPOINTS.platform.contentPages, "GET", true, { transformParams: pickQuery(["page", "limit", "q", "pageType", "language", "published"]) });
export const getContentPage = createApiThunkPrivate("adminCore/getContentPage", (payload) => ENDPOINTS.platform.contentPage(payload.slug || payload.id), "GET");
export const createContentPage = createApiThunkPrivate("adminCore/createContentPage", ENDPOINTS.platform.contentPages, "POST", false, { transformBody: (_, payload) => toContentPageBody(payload) });
export const updateContentPage = createApiThunkPrivate("adminCore/updateContentPage", (payload) => ENDPOINTS.platform.contentPage(payload.id || payload.slug), "PATCH", false, { transformBody: (_, payload) => toContentPageBody(omitPayload(payload, ["id"])) });
export const deleteContentPage = createApiThunkPrivate("adminCore/deleteContentPage", (payload) => ENDPOINTS.platform.contentPage(payload.slug || payload.id), "DELETE", false, { transformParams: noParams });

export const getProductReviews = createApiThunkPrivate("adminCore/getProductReviews", (payload = {}) => payload.sellerScope ? ENDPOINTS.platform.sellerProductReviews : ENDPOINTS.platform.productReviews, "GET", true, { transformParams: pickQuery(["page", "limit", "q", "keyWord", "search", "productId", "buyerId", "orderId", "status", "rating", "sortBy", "sortDir", "sortOrder"]) });
export const createProductReview = createApiThunkPrivate("adminCore/createProductReview", ENDPOINTS.platform.createProductReview, "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["productId", "buyerName", "buyerId", "rating", "title", "reviewText", "media", "status"]) });
export const updateProductReview = createApiThunkPrivate("adminCore/updateProductReview", (payload) => ENDPOINTS.platform.productReview(payload.reviewId || payload._id || payload.id), "PATCH", false, { transformBody: (payload = {}) => pickPayload(payload, ["rating", "title", "reviewText", "media", "helpfulVotes", "status", "rejectionReason", "adminReply"]) });
export const bulkUpdateProductReviews = createApiThunkPrivate("adminCore/bulkUpdateProductReviews", ENDPOINTS.platform.productReviewsBulkAction, "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["reviewIds", "action", "status", "rejectionReason", "reason"]) });
export const deleteProductReview = createApiThunkPrivate("adminCore/deleteProductReview", (payload) => ENDPOINTS.platform.productReview(payload.reviewId || payload._id || payload.id), "DELETE", false, { transformParams: noParams });

// Platform attribute options (admin-managed: Color, Size, RAM, etc.)
export const getPlatformOptions = createApiThunkPrivate("adminCore/getPlatformOptions", ENDPOINTS.platform.productOptions, "GET", true, { transformParams: pickQuery(["page", "limit", "q", "active"]) });
export const createPlatformOption = createApiThunkPrivate("adminCore/createPlatformOption", ENDPOINTS.platform.productOptions, "POST", false, { transformBody: (_, p) => pickPayload(p, ["name", "slug", "displayType", "description", "active"]) });
export const updatePlatformOption = createApiThunkPrivate("adminCore/updatePlatformOption", (p) => ENDPOINTS.platform.productOption(p.id || p._id), "PATCH", false, { transformBody: (_, p) => pickPayload(omitPayload(p, ["id", "_id"]), ["name", "slug", "displayType", "description", "active"]) });
export const deletePlatformOption = createApiThunkPrivate("adminCore/deletePlatformOption", (p) => ENDPOINTS.platform.productOption(p.id || p._id), "DELETE", false, { transformParams: noParams });

// Platform attribute values (Red/Blue for Color, S/M/L for Size, etc.)
export const getPlatformOptionValues = createApiThunkPrivate("adminCore/getPlatformOptionValues", ENDPOINTS.platform.productOptionValues, "GET", true, { transformParams: pickQuery(["page", "limit", "q", "optionId", "option_id", "active"]) });
export const createPlatformOptionValue = createApiThunkPrivate("adminCore/createPlatformOptionValue", ENDPOINTS.platform.productOptionValues, "POST", false, { transformBody: (_, p) => pickPayload(p, ["optionId", "optionName", "name", "valueCode", "colorHex", "imageUrl", "sortOrder", "active"]) });
export const updatePlatformOptionValue = createApiThunkPrivate("adminCore/updatePlatformOptionValue", (p) => ENDPOINTS.platform.productOptionValue(p.id || p._id), "PATCH", false, { transformBody: (_, p) => pickPayload(omitPayload(p, ["id", "_id"]), ["optionId", "optionName", "name", "valueCode", "colorHex", "imageUrl", "sortOrder", "active"]) });
export const deletePlatformOptionValue = createApiThunkPrivate("adminCore/deletePlatformOptionValue", (p) => ENDPOINTS.platform.productOptionValue(p.id || p._id), "DELETE", false, { transformParams: noParams });

export const getRbacPermissionManagementModules = createApiThunkPrivate("rbac/getPermissionManagementModules", ENDPOINTS.rbac.permissionManagementModules, "GET", true, {
  transformParams: (params = {}) => ({
    ...(params.roleId ? { roleId: params.roleId } : {}),
    ...(params.roleSlug || params.role ? { roleSlug: params.roleSlug || params.role } : {}),
    ...(params.active !== undefined ? { active: params.active } : {}),
  }),
});
export const getRbacModules = createApiThunkPrivate("rbac/getModules", ENDPOINTS.rbac.modules, "GET", true, { transformParams: pickQuery(["active", "includeInactive", "status", "q", "sidebar", "parentModuleId", "limit", "offset"]) });
export const getRbacSidebarModules = createApiThunkPrivate("rbac/getSidebarModules", ENDPOINTS.rbac.sidebarModules, "GET", true, { transformParams: noParams });
export const createRbacModule = createApiThunkPrivate("rbac/createModule", ENDPOINTS.rbac.modules, "POST");
export const updateRbacModule = createApiThunkPrivate("rbac/updateModule", (payload) => ENDPOINTS.rbac.module(payload.moduleId || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["moduleId", "id"]) });
export const updateRbacModuleStatus = createApiThunkPrivate("rbac/updateModuleStatus", (payload) => ENDPOINTS.rbac.moduleStatus(payload.moduleId || payload.id), "PATCH", false, { transformBody: (payload = {}) => pickPayload(payload, ["status"]) });
export const reorderRbacModules = createApiThunkPrivate("rbac/reorderModules", ENDPOINTS.rbac.reorderModules, "POST", false, { transformBody: (payload = {}) => ({ modules: payload.modules || [] }) });
export const deleteRbacModule = createApiThunkPrivate("rbac/deleteModule", (payload) => ENDPOINTS.rbac.module(payload.moduleId || payload.id), "DELETE", false, { transformParams: noParams });
export const getRbacPermissions = createApiThunkPrivate("rbac/getPermissions", ENDPOINTS.rbac.permissions, "GET", true, { transformParams: pickQuery(["moduleId", "active", "limit", "offset"]) });
export const createRbacPermission = createApiThunkPrivate("rbac/createPermission", ENDPOINTS.rbac.permissions, "POST");
export const updateRbacPermission = createApiThunkPrivate("rbac/updatePermission", (payload) => ENDPOINTS.rbac.permission(payload.permissionId || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["permissionId", "id"]) });
export const getRbacRoles = createApiThunkPrivate("rbac/getRoles", ENDPOINTS.rbac.roles, "GET", true, { transformParams: pickQuery(["active", "limit", "offset"]) });
export const createRbacRole = createApiThunkPrivate("rbac/createRole", ENDPOINTS.rbac.roles, "POST");
export const updateRbacRole = createApiThunkPrivate("rbac/updateRole", (payload) => ENDPOINTS.rbac.role(payload.roleId || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["roleId", "id"]) });
export const getRolePermissions = createApiThunkPrivate("rbac/getRolePermissions", (payload) => ENDPOINTS.rbac.rolePermissions(payload.roleId || payload.id), "GET", true, { transformParams: noParams });
export const updateRolePermissionsBulk = createApiThunkPrivate("rbac/updateRolePermissionsBulk", (payload) => ENDPOINTS.rbac.rolePermissionsBulk(payload.roleId || payload.id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["permissionIds"]) });
export const getUserPermissions = createApiThunkPrivate("rbac/getUserPermissions", (payload) => ENDPOINTS.rbac.userPermissions(payload.userId || payload.id), "GET", true, { transformParams: noParams });
export const getUserEffectivePermissions = createApiThunkPrivate("rbac/getUserEffectivePermissions", (payload) => ENDPOINTS.rbac.userEffectivePermissions(payload.userId || payload.id), "GET", true, { transformParams: noParams });
export const getUserRoles = createApiThunkPrivate("rbac/getUserRoles", (payload) => ENDPOINTS.rbac.userRoles(payload.userId || payload.id), "GET", true, { transformParams: noParams });

export const getSystemHealth = createApiThunkPrivate("system/getHealth", ENDPOINTS.system.health, "GET");
export const getSystemQueues = createApiThunkPrivate("system/getQueues", ENDPOINTS.system.queues, "GET");
export const pauseSystemQueue = createApiThunkPrivate("system/pauseQueue", (payload) => ENDPOINTS.system.pauseQueue(payload.queueName), "POST", false, { transformBody: noBody });
export const resumeSystemQueue = createApiThunkPrivate("system/resumeQueue", (payload) => ENDPOINTS.system.resumeQueue(payload.queueName), "POST", false, { transformBody: noBody });
export const getDeadLetterEvents = createApiThunkPrivate("system/getDeadLetterEvents", ENDPOINTS.system.deadLetter, "GET", true, { transformParams: pickQuery(["status", "eventType", "limit", "offset"]) });
export const retryDeadLetterEvent = createApiThunkPrivate("system/retryDeadLetterEvent", (payload) => ENDPOINTS.system.retryDeadLetter(payload.eventId), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["reason"]) });
export const discardDeadLetterEvent = createApiThunkPrivate("system/discardDeadLetterEvent", (payload) => ENDPOINTS.system.discardDeadLetter(payload.eventId), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["reason"]) });

export const getDeals = createApiThunkPrivate("adminCore/getDeals", ENDPOINTS.deals.list, "GET", true, { transformParams: pickQuery(["status", "dealType", "sellerId", "productId", "search", "fromDate", "toDate", "sortBy", "sortDir", "limit", "offset"]) });
export const getDeal = createApiThunkPrivate("adminCore/getDeal", (payload) => ENDPOINTS.deals.detail(payload.dealId || payload.id), "GET");
export const createDeal = createApiThunkPrivate("adminCore/createDeal", ENDPOINTS.deals.create, "POST", false, { transformBody: (payload = {}) => omitPayload(payload, ["id"]) });
export const updateDeal = createApiThunkPrivate("adminCore/updateDeal", (payload) => ENDPOINTS.deals.update(payload.dealId || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["dealId", "id"]) });
export const submitDeal = createApiThunkPrivate("adminCore/submitDeal", (payload) => ENDPOINTS.deals.submit(payload.dealId || payload.id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["reason", "note"]) });
export const approveDeal = createApiThunkPrivate("adminCore/approveDeal", (payload) => ENDPOINTS.deals.approve(payload.dealId || payload.id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["note"]) });
export const rejectDeal = createApiThunkPrivate("adminCore/rejectDeal", (payload) => ENDPOINTS.deals.reject(payload.dealId || payload.id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["reason", "note"]) });
export const pauseDeal = createApiThunkPrivate("adminCore/pauseDeal", (payload) => ENDPOINTS.deals.pause(payload.dealId || payload.id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["note"]) });
export const resumeDeal = createApiThunkPrivate("adminCore/resumeDeal", (payload) => ENDPOINTS.deals.resume(payload.dealId || payload.id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["note"]) });
export const cancelDeal = createApiThunkPrivate("adminCore/cancelDeal", (payload) => ENDPOINTS.deals.cancel(payload.dealId || payload.id), "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["reason", "note"]) });
export const renewDeal = createApiThunkPrivate("adminCore/renewDeal", (payload) => ENDPOINTS.deals.renew(payload.dealId || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["dealId", "id"]) });
export const getDealAnalytics = createApiThunkPrivate("adminCore/getDealAnalytics", ENDPOINTS.deals.analytics, "GET", true, { transformParams: pickQuery(["fromDate", "toDate", "sellerId", "dealType"]) });
export const getDealPayouts = createApiThunkPrivate("adminCore/getDealPayouts", ENDPOINTS.deals.payouts, "GET", true, { transformParams: pickQuery(["status", "sellerId", "fromDate", "toDate", "limit", "offset"]) });
export const generateDealPayout = createApiThunkPrivate("adminCore/generateDealPayout", ENDPOINTS.deals.generatePayout, "POST", false, { transformBody: (payload = {}) => pickPayload(payload, ["fromDate", "toDate", "sellerId", "dealIds"]) });
export const processDealPayout = createApiThunkPrivate("adminCore/processDealPayout", (payload) => ENDPOINTS.deals.processPayout(payload.payoutId || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["payoutId", "id"]) });

const register = (builder, thunk, key) => createExtraReducersForThunk(builder, thunk, key);

const adminCoreSlice = createSlice({
  name: "adminCore",
  initialState,
  extraReducers: (builder) => {
    [
      [getDashboardOverview, "dashboardOverviewData"],
      [getAccessModules, "accessModulesData"],
      [getAdmins, "adminsData"],
      [createAdmin, "createAdminData"],
      [createPlatformSubAdmin, "createPlatformSubAdminData"],
      [getPlatformSubAdmins, "platformSubAdminsData"],
      [updatePlatformSubAdminModules, "updatePlatformSubAdminModulesData"],
      [getAdminUsers, "adminUsersData"],
      [getAdminUser, "adminUserData"],
      [updateAdminUser, "updateAdminUserData"],
      [deactivateAdminUser, "deactivateAdminUserData"],
      [getAdminVendors, "adminVendorsData"],
      [updateAdminVendorStatus, "updateVendorStatusData"],
      [reviewAdminSellerKyc, "reviewSellerKycData"],
      [getAdminProductModerationQueue, "adminProductModerationQueueData"],
      [moderateAdminProduct, "moderateAdminProductData"],
      [getAdminOrders, "adminOrdersData"],
      [getAdminPayments, "adminPaymentsData"],
      [getCodConfig, "codConfigData"],
      [updateCodConfig, "updateCodConfigData"],
      [approvePayment, "approvePaymentData"],
      [rejectPayment, "rejectPaymentData"],
      [getAdminReturns, "adminReturnsData"],
      [getAdminReturn, "adminReturnData"],
      [approveReturn, "approveReturnData"],
      [rejectReturn, "rejectReturnData"],
      [scheduleReturn, "updateReturnData"],
      [updateReturnReverseTracking, "updateReturnData"],
      [receiveReturn, "updateReturnData"],
      [qcReturn, "updateReturnData"],
      [refundReturn, "refundReturnData"],
      [retryReturnRefund, "refundReturnData"],
      [syncReturnRefund, "refundReturnData"],
      [replaceReturn, "updateReturnData"],
      [closeReturn, "updateReturnData"],
      [getAdminPayouts, "adminPayoutsData"],
      [createAdminPayout, "createAdminPayoutData"],
      [getWalletTransactions, "walletTransactionsData"],
      [getTaxReports, "taxReportsData"],
      [getTaxInvoices, "taxInvoicesData"],
      [getTaxInvoice, "taxInvoiceData"],
      [getTaxCreditNotes, "taxCreditNotesData"],
      [getMarketplaceInvoices, "marketplaceInvoicesData"],
      [createTaxInvoice, "createTaxInvoiceData"],
      [createMarketplaceInvoices, "createMarketplaceInvoicesData"],
      [createTaxCreditNote, "createTaxCreditNoteData"],
      [dispatchTaxInvoice, "dispatchTaxInvoiceData"],
      [dispatchTaxCreditNote, "dispatchTaxCreditNoteData"],
      [getTaxDocumentDispatches, "taxDocumentDispatchesData"],
      [retryTaxDocumentDispatch, "retryTaxDocumentDispatchData"],
      [getDeliveryServiceability, "deliveryServiceabilityData"],
      [getRealtimeAnalytics, "realtimeAnalyticsData"],
      [getAdminMarketplaceAnalytics, "adminMarketplaceAnalyticsData"],
      [getReturnsAnalytics, "returnsAnalyticsData"],
      [getChargebacks, "chargebacksData"],
      [getApiKeys, "apiKeysData"],
      [createApiKey, "createApiKeyData"],
      [getWebhooks, "webhooksData"],
      [createWebhook, "createWebhookData"],
      [getFeatureFlags, "featureFlagsData"],
      [upsertFeatureFlag, "upsertFeatureFlagData"],
      [getSubscriptionPlans, "subscriptionPlansData"],
      [getSubscriptionPlan, "subscriptionPlanData"],
      [createSubscriptionPlan, "createSubscriptionPlanData"],
      [updateSubscriptionPlan, "updateSubscriptionPlanData"],
      [deleteSubscriptionPlan, "deleteSubscriptionPlanData"],
      [getPlatformSubscriptions, "platformSubscriptionsData"],
      [updatePlatformSubscriptionStatus, "updatePlatformSubscriptionStatusData"],
      [getPlatformCategories, "platformCategoriesData"],
      [getPlatformCategory, "platformCategoryData"],
      [createPlatformCategory, "createPlatformCategoryData"],
      [updatePlatformCategory, "updatePlatformCategoryData"],
      [deletePlatformCategory, "deletePlatformCategoryData"],
      [getProductFamilies, "productFamiliesData"],
      [getProductFamily, "productFamilyData"],
      [createProductFamily, "createProductFamilyData"],
      [updateProductFamily, "updateProductFamilyData"],
      [deleteProductFamily, "deleteProductFamilyData"],
      [getProductVariants, "productVariantsData"],
      [getProductVariant, "productVariantData"],
      [createProductVariant, "createProductVariantData"],
      [updateProductVariant, "updateProductVariantData"],
      [deleteProductVariant, "deleteProductVariantData"],
      [getHsnCodes, "hsnCodesData"],
      [getHsnCode, "hsnCodeData"],
      [createHsnCode, "createHsnCodeData"],
      [updateHsnCode, "updateHsnCodeData"],
      [deleteHsnCode, "deleteHsnCodeData"],
      [getGeographies, "geographiesData"],
      [getGeography, "geographyData"],
      [createGeography, "createGeographyData"],
      [updateGeography, "updateGeographyData"],
      [deleteGeography, "deleteGeographyData"],
      [getContentPages, "contentPagesData"],
      [getContentPage, "contentPageData"],
      [createContentPage, "createContentPageData"],
      [updateContentPage, "updateContentPageData"],
      [deleteContentPage, "deleteContentPageData"],
      [getProductReviews, "productReviewsData"],
      [createProductReview, "createProductReviewData"],
      [updateProductReview, "updateProductReviewData"],
      [bulkUpdateProductReviews, "bulkUpdateProductReviewsData"],
      [deleteProductReview, "deleteProductReviewData"],
      [getPlatformOptions, "platformOptionsData"],
      [createPlatformOption, "createPlatformOptionData"],
      [updatePlatformOption, "updatePlatformOptionData"],
      [deletePlatformOption, "deletePlatformOptionData"],
      [getPlatformOptionValues, "platformOptionValuesData"],
      [createPlatformOptionValue, "createPlatformOptionValueData"],
      [updatePlatformOptionValue, "updatePlatformOptionValueData"],
      [deletePlatformOptionValue, "deletePlatformOptionValueData"],
      [getRbacPermissionManagementModules, "rbacPermissionManagementModulesData"],
      [getRbacModules, "rbacModulesData"],
      [getRbacSidebarModules, "rbacSidebarModulesData"],
      [createRbacModule, "createRbacModuleData"],
      [updateRbacModule, "updateRbacModuleData"],
      [updateRbacModuleStatus, "updateRbacModuleStatusData"],
      [reorderRbacModules, "reorderRbacModulesData"],
      [deleteRbacModule, "deleteRbacModuleData"],
      [getRbacPermissions, "rbacPermissionsData"],
      [createRbacPermission, "createRbacPermissionData"],
      [updateRbacPermission, "updateRbacPermissionData"],
      [getRbacRoles, "rbacRolesData"],
      [createRbacRole, "createRbacRoleData"],
      [updateRbacRole, "updateRbacRoleData"],
      [getRolePermissions, "rolePermissionsData"],
      [updateRolePermissionsBulk, "updateRolePermissionsData"],
      [getUserPermissions, "userPermissionsData"],
      [getUserEffectivePermissions, "userEffectivePermissionsData"],
      [getUserRoles, "userRolesData"],
      [getSystemHealth, "systemHealthData"],
      [getSystemQueues, "systemQueuesData"],
      [pauseSystemQueue, "pauseQueueData"],
      [resumeSystemQueue, "resumeQueueData"],
      [getDeadLetterEvents, "deadLetterData"],
      [retryDeadLetterEvent, "retryDeadLetterData"],
      [discardDeadLetterEvent, "discardDeadLetterData"],
      [getDeals, "dealsData"],
      [getDeal, "dealData"],
      [createDeal, "createDealData"],
      [updateDeal, "updateDealData"],
      [submitDeal, "submitDealData"],
      [approveDeal, "approveDealData"],
      [rejectDeal, "rejectDealData"],
      [pauseDeal, "pauseDealData"],
      [resumeDeal, "resumeDealData"],
      [cancelDeal, "cancelDealData"],
      [renewDeal, "renewDealData"],
      [getDealAnalytics, "dealAnalyticsData"],
      [getDealPayouts, "dealPayoutsData"],
      [generateDealPayout, "generateDealPayoutData"],
      [processDealPayout, "processDealPayoutData"],
    ].forEach(([thunk, key]) => register(builder, thunk, key));
  },
});

export default adminCoreSlice.reducer;
