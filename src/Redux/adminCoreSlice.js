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
  adminPayoutsData: {},
  adminsData: {},
  createAdminData: {},
  createAdminPayoutData: {},
  taxReportsData: {},
  createTaxInvoiceData: {},
  deliveryServiceabilityData: {},
  orderEwayBillData: {},
  createOrderEwayBillData: {},
  updateEwayBillStatusData: {},
  realtimeAnalyticsData: {},
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
  platformFeeConfigsData: {},
  platformFeeConfigData: {},
  createPlatformFeeConfigData: {},
  updatePlatformFeeConfigData: {},
  deletePlatformFeeConfigData: {},
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
  rbacPermissionManagementModulesData: {},
  rbacModulesData: {},
  createRbacModuleData: {},
  updateRbacModuleData: {},
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

const pickQuery = (keys = []) => (params = {}) =>
  keys.reduce((acc, key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") acc[key] = value;
    return acc;
  }, {});

const listAccessModuleQueryKeys = ["role", "roleId", "roleSlug", "userId", "active", "includePermissions"];
const listOrderQueryKeys = ["status", "fromDate", "toDate", "limit", "offset"];
const moderationQueueQueryKeys = ["status", "category", "page", "limit"];
const updateModerationKeys = ["status", "rejectionReason", "checklist"];

export const getDashboardOverview = createApiThunkPrivate(
  "adminCore/getDashboardOverview",
  ENDPOINTS.dashboard.overview,
  "GET"
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
  { transformBody: (payload = {}) => toManagedUserCreateBody(payload) }
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
  { transformParams: pickQuery(["ownerAdminId"]) }
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
  ENDPOINTS.sellers.vendors,
  "GET",
  true,
  { transformParams: (params = {}) => toListParams(params) }
);

export const updateAdminVendorStatus = createApiThunkPrivate(
  "adminCore/updateAdminVendorStatus",
  (payload) => ENDPOINTS.sellers.vendorStatus(payload?.sellerId || firstId(payload)),
  "PATCH",
  false,
  { transformBody: toVendorStatusBody }
);

export const reviewAdminSellerKyc = createApiThunkPrivate(
  "adminCore/reviewAdminSellerKyc",
  (payload) => ENDPOINTS.sellers.kycReview(payload?.sellerId || firstId(payload)),
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

export const getAdminPayments = createApiThunkPrivate("adminCore/getAdminPayments", ENDPOINTS.payments.admin, "GET", true, { transformParams: pickQuery(["status", "provider", "fromDate", "toDate", "limit", "offset"]) });
export const getAdminPayouts = createApiThunkPrivate("adminCore/getAdminPayouts", ENDPOINTS.payouts.admin, "GET", true, { transformParams: pickQuery(["sellerId", "status", "fromDate", "toDate", "limit", "offset"]) });
export const createAdminPayout = createApiThunkPrivate("adminCore/createAdminPayout", ENDPOINTS.payouts.admin, "POST");
export const getTaxReports = createApiThunkPrivate("adminCore/getTaxReports", ENDPOINTS.tax.adminReports, "GET", true, { transformParams: pickQuery(["fromDate", "toDate", "taxComponent", "limit", "offset"]) });
export const createTaxInvoice = createApiThunkPrivate("adminCore/createTaxInvoice", (payload) => ENDPOINTS.tax.adminInvoice(payload.orderId), "POST", false, { transformBody: noBody });
export const getDeliveryServiceability = createApiThunkPrivate("adminCore/getDeliveryServiceability", ENDPOINTS.delivery.serviceability, "GET");
export const getOrderEwayBill = createApiThunkPrivate("adminCore/getOrderEwayBill", (payload) => ENDPOINTS.delivery.orderEwayBill(payload.orderId), "GET");
export const createOrderEwayBill = createApiThunkPrivate("adminCore/createOrderEwayBill", (payload) => ENDPOINTS.delivery.orderEwayBill(payload.orderId), "POST", false, { transformBody: (payload = {}) => omitPayload(payload, ["orderId", "id"]) });
export const updateEwayBillStatus = createApiThunkPrivate("adminCore/updateEwayBillStatus", (payload) => ENDPOINTS.delivery.ewayBillStatus(payload.ewayBillId), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["ewayBillId", "id"]) });

export const getRealtimeAnalytics = createApiThunkPrivate("adminCore/getRealtimeAnalytics", ENDPOINTS.analytics.realtime, "GET", true, { transformParams: pickQuery(["hours"]) });
export const getReturnsAnalytics = createApiThunkPrivate("adminCore/getReturnsAnalytics", ENDPOINTS.analytics.returns, "GET", true, { transformParams: pickQuery(["fromDate", "toDate"]) });
export const getChargebacks = createApiThunkPrivate("adminCore/getChargebacks", ENDPOINTS.analytics.chargebacks, "GET", true, { transformParams: pickQuery(["status", "fromDate", "toDate", "limit", "offset"]) });

export const getApiKeys = createApiThunkPrivate("adminCore/getApiKeys", ENDPOINTS.platform.apiKeys, "GET", true, { transformParams: pickQuery(["ownerId", "status", "limit", "offset"]) });
export const createApiKey = createApiThunkPrivate("adminCore/createApiKey", ENDPOINTS.platform.apiKeys, "POST");
export const getWebhooks = createApiThunkPrivate("adminCore/getWebhooks", ENDPOINTS.platform.webhooks, "GET", true, { transformParams: pickQuery(["ownerId", "status", "limit", "offset"]) });
export const createWebhook = createApiThunkPrivate("adminCore/createWebhook", ENDPOINTS.platform.webhooks, "POST");
export const getFeatureFlags = createApiThunkPrivate("adminCore/getFeatureFlags", ENDPOINTS.platform.featureFlags, "GET", true, { transformParams: pickQuery(["enabled", "limit", "offset"]) });
export const upsertFeatureFlag = createApiThunkPrivate("adminCore/upsertFeatureFlag", ENDPOINTS.platform.featureFlags, "PUT");

export const getSubscriptionPlans = createApiThunkPrivate("adminCore/getSubscriptionPlans", ENDPOINTS.platform.subscriptionPlans, "GET", true, { transformParams: pickQuery(["active", "limit", "offset"]) });
export const getSubscriptionPlan = createApiThunkPrivate("adminCore/getSubscriptionPlan", (payload) => ENDPOINTS.platform.subscriptionPlan(payload.planId || payload.id), "GET");
export const createSubscriptionPlan = createApiThunkPrivate("adminCore/createSubscriptionPlan", ENDPOINTS.platform.subscriptionPlans, "POST");
export const updateSubscriptionPlan = createApiThunkPrivate("adminCore/updateSubscriptionPlan", (payload) => ENDPOINTS.platform.subscriptionPlan(payload.planId || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["planId", "id"]) });
export const deleteSubscriptionPlan = createApiThunkPrivate("adminCore/deleteSubscriptionPlan", (payload) => ENDPOINTS.platform.subscriptionPlan(payload.planId || payload.id), "DELETE", false, { transformParams: noParams });
export const getPlatformSubscriptions = createApiThunkPrivate("adminCore/getPlatformSubscriptions", ENDPOINTS.platform.subscriptions, "GET", true, { transformParams: pickQuery(["status", "userRole", "limit", "offset"]) });
export const updatePlatformSubscriptionStatus = createApiThunkPrivate("adminCore/updatePlatformSubscriptionStatus", (payload) => ENDPOINTS.platform.subscriptionStatus(payload.subscriptionId || payload.id), "PATCH", false, { transformBody: (payload = {}) => pickPayload(payload, ["status"]) });
export const getPlatformFeeConfigs = createApiThunkPrivate("adminCore/getPlatformFeeConfigs", ENDPOINTS.platform.feeConfig, "GET", true, { transformParams: pickQuery(["active", "category", "limit", "offset"]) });
export const getPlatformFeeConfig = createApiThunkPrivate("adminCore/getPlatformFeeConfig", (payload) => ENDPOINTS.platform.feeConfigDetail(payload.configId || payload.id), "GET");
export const createPlatformFeeConfig = createApiThunkPrivate("adminCore/createPlatformFeeConfig", ENDPOINTS.platform.feeConfig, "POST");
export const updatePlatformFeeConfig = createApiThunkPrivate("adminCore/updatePlatformFeeConfig", (payload) => ENDPOINTS.platform.feeConfigDetail(payload.configId || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["configId", "id"]) });
export const deletePlatformFeeConfig = createApiThunkPrivate("adminCore/deletePlatformFeeConfig", (payload) => ENDPOINTS.platform.feeConfigDetail(payload.configId || payload.id), "DELETE", false, { transformParams: noParams });

export const getPlatformCategories = createApiThunkPrivate("adminCore/getPlatformCategories", ENDPOINTS.platform.categories, "GET", true, { transformParams: pickQuery(["page", "limit", "parentKey", "active", "categoryKey"]) });
export const getPlatformCategory = createApiThunkPrivate("adminCore/getPlatformCategory", (payload) => ENDPOINTS.platform.category(payload.categoryKey || payload.key || payload.id), "GET");
export const createPlatformCategory = createApiThunkPrivate("adminCore/createPlatformCategory", ENDPOINTS.platform.categories, "POST");
export const updatePlatformCategory = createApiThunkPrivate("adminCore/updatePlatformCategory", (payload) => ENDPOINTS.platform.category(payload.categoryKey || payload.key || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["categoryKey", "key", "id"]) });
export const deletePlatformCategory = createApiThunkPrivate("adminCore/deletePlatformCategory", (payload) => ENDPOINTS.platform.category(payload.categoryKey || payload.key || payload.id), "DELETE", false, { transformParams: noParams });

export const getProductFamilies = createApiThunkPrivate("adminCore/getProductFamilies", ENDPOINTS.platform.productFamilies, "GET", true, { transformParams: pickQuery(["page", "limit", "category", "sellerId", "status"]) });
export const getProductFamily = createApiThunkPrivate("adminCore/getProductFamily", (payload) => ENDPOINTS.platform.productFamily(payload.familyCode || payload.code || payload.id), "GET");
export const createProductFamily = createApiThunkPrivate("adminCore/createProductFamily", ENDPOINTS.platform.productFamilies, "POST");
export const updateProductFamily = createApiThunkPrivate("adminCore/updateProductFamily", (payload) => ENDPOINTS.platform.productFamily(payload.familyCode || payload.code || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["familyCode", "code", "id"]) });
export const deleteProductFamily = createApiThunkPrivate("adminCore/deleteProductFamily", (payload) => ENDPOINTS.platform.productFamily(payload.familyCode || payload.code || payload.id), "DELETE", false, { transformParams: noParams });

export const getProductVariants = createApiThunkPrivate("adminCore/getProductVariants", ENDPOINTS.platform.productVariants, "GET", true, { transformParams: pickQuery(["page", "limit", "productId", "familyCode", "sellerId", "sku", "status"]) });
export const getProductVariant = createApiThunkPrivate("adminCore/getProductVariant", (payload) => ENDPOINTS.platform.productVariant(payload.variantId || payload.id), "GET");
export const createProductVariant = createApiThunkPrivate("adminCore/createProductVariant", ENDPOINTS.platform.productVariants, "POST");
export const updateProductVariant = createApiThunkPrivate("adminCore/updateProductVariant", (payload) => ENDPOINTS.platform.productVariant(payload.variantId || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["variantId", "id"]) });
export const deleteProductVariant = createApiThunkPrivate("adminCore/deleteProductVariant", (payload) => ENDPOINTS.platform.productVariant(payload.variantId || payload.id), "DELETE", false, { transformParams: noParams });

export const getHsnCodes = createApiThunkPrivate("adminCore/getHsnCodes", ENDPOINTS.platform.hsnCodes, "GET", true, { transformParams: pickQuery(["page", "limit", "category", "active"]) });
export const getHsnCode = createApiThunkPrivate("adminCore/getHsnCode", (payload) => ENDPOINTS.platform.hsnCode(payload.hsnCode || payload.code || payload.id), "GET");
export const createHsnCode = createApiThunkPrivate("adminCore/createHsnCode", ENDPOINTS.platform.hsnCodes, "POST");
export const updateHsnCode = createApiThunkPrivate("adminCore/updateHsnCode", (payload) => ENDPOINTS.platform.hsnCode(payload.hsnCode || payload.code || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["hsnCode", "code", "id"]) });
export const deleteHsnCode = createApiThunkPrivate("adminCore/deleteHsnCode", (payload) => ENDPOINTS.platform.hsnCode(payload.hsnCode || payload.code || payload.id), "DELETE", false, { transformParams: noParams });

export const getGeographies = createApiThunkPrivate("adminCore/getGeographies", ENDPOINTS.platform.geography, "GET", true, { transformParams: pickQuery(["page", "limit", "active"]) });
export const getGeography = createApiThunkPrivate("adminCore/getGeography", (payload) => ENDPOINTS.platform.geographyDetail(payload.countryCode || payload.code || payload.id), "GET");
export const createGeography = createApiThunkPrivate("adminCore/createGeography", ENDPOINTS.platform.geography, "POST");
export const updateGeography = createApiThunkPrivate("adminCore/updateGeography", (payload) => ENDPOINTS.platform.geographyDetail(payload.countryCode || payload.code || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["countryCode", "code", "id"]) });
export const deleteGeography = createApiThunkPrivate("adminCore/deleteGeography", (payload) => ENDPOINTS.platform.geographyDetail(payload.countryCode || payload.code || payload.id), "DELETE", false, { transformParams: noParams });

export const getContentPages = createApiThunkPrivate("adminCore/getContentPages", ENDPOINTS.platform.contentPages, "GET", true, { transformParams: pickQuery(["page", "limit", "q", "pageType", "language", "published"]) });
export const getContentPage = createApiThunkPrivate("adminCore/getContentPage", (payload) => ENDPOINTS.platform.contentPage(payload.slug || payload.id), "GET");
export const createContentPage = createApiThunkPrivate("adminCore/createContentPage", ENDPOINTS.platform.contentPages, "POST");
export const updateContentPage = createApiThunkPrivate("adminCore/updateContentPage", (payload) => ENDPOINTS.platform.contentPage(payload.id || payload.slug), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["id"]) });
export const deleteContentPage = createApiThunkPrivate("adminCore/deleteContentPage", (payload) => ENDPOINTS.platform.contentPage(payload.slug || payload.id), "DELETE", false, { transformParams: noParams });

export const getRbacPermissionManagementModules = createApiThunkPrivate("rbac/getPermissionManagementModules", ENDPOINTS.rbac.permissionManagementModules, "GET", true, {
  transformParams: (params = {}) => ({
    ...(params.roleId ? { roleId: params.roleId } : {}),
    ...(params.roleSlug || params.role ? { roleSlug: params.roleSlug || params.role } : {}),
    ...(params.active !== undefined ? { active: params.active } : {}),
  }),
});
export const getRbacModules = createApiThunkPrivate("rbac/getModules", ENDPOINTS.rbac.modules, "GET", true, { transformParams: pickQuery(["active", "limit", "offset"]) });
export const createRbacModule = createApiThunkPrivate("rbac/createModule", ENDPOINTS.rbac.modules, "POST");
export const updateRbacModule = createApiThunkPrivate("rbac/updateModule", (payload) => ENDPOINTS.rbac.module(payload.moduleId || payload.id), "PATCH", false, { transformBody: (payload = {}) => omitPayload(payload, ["moduleId", "id"]) });
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
      [getAdminPayouts, "adminPayoutsData"],
      [createAdminPayout, "createAdminPayoutData"],
      [getTaxReports, "taxReportsData"],
      [createTaxInvoice, "createTaxInvoiceData"],
      [getDeliveryServiceability, "deliveryServiceabilityData"],
      [getOrderEwayBill, "orderEwayBillData"],
      [createOrderEwayBill, "createOrderEwayBillData"],
      [updateEwayBillStatus, "updateEwayBillStatusData"],
      [getRealtimeAnalytics, "realtimeAnalyticsData"],
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
      [getPlatformFeeConfigs, "platformFeeConfigsData"],
      [getPlatformFeeConfig, "platformFeeConfigData"],
      [createPlatformFeeConfig, "createPlatformFeeConfigData"],
      [updatePlatformFeeConfig, "updatePlatformFeeConfigData"],
      [deletePlatformFeeConfig, "deletePlatformFeeConfigData"],
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
      [getRbacPermissionManagementModules, "rbacPermissionManagementModulesData"],
      [getRbacModules, "rbacModulesData"],
      [createRbacModule, "createRbacModuleData"],
      [updateRbacModule, "updateRbacModuleData"],
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
    ].forEach(([thunk, key]) => register(builder, thunk, key));
  },
});

export default adminCoreSlice.reducer;
