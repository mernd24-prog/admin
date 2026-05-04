import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";
import { toListParams, toManagedUserCreateBody } from "../_helpers/adminApi";

const initialState = {
  dashboardOverviewData: {},
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

export const getDashboardOverview = createApiThunkPrivate(
  "adminCore/getDashboardOverview",
  ENDPOINTS.dashboard.overview,
  "GET"
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

export const getAdminPayments = createApiThunkPrivate("adminCore/getAdminPayments", ENDPOINTS.payments.admin, "GET");
export const getAdminPayouts = createApiThunkPrivate("adminCore/getAdminPayouts", ENDPOINTS.payouts.admin, "GET");
export const createAdminPayout = createApiThunkPrivate("adminCore/createAdminPayout", ENDPOINTS.payouts.admin, "POST");
export const getTaxReports = createApiThunkPrivate("adminCore/getTaxReports", ENDPOINTS.tax.adminReports, "GET");
export const createTaxInvoice = createApiThunkPrivate("adminCore/createTaxInvoice", (payload) => ENDPOINTS.tax.adminInvoice(payload.orderId), "POST");
export const getDeliveryServiceability = createApiThunkPrivate("adminCore/getDeliveryServiceability", ENDPOINTS.delivery.serviceability, "GET");
export const getOrderEwayBill = createApiThunkPrivate("adminCore/getOrderEwayBill", (payload) => ENDPOINTS.delivery.orderEwayBill(payload.orderId), "GET");
export const createOrderEwayBill = createApiThunkPrivate("adminCore/createOrderEwayBill", (payload) => ENDPOINTS.delivery.orderEwayBill(payload.orderId), "POST");
export const updateEwayBillStatus = createApiThunkPrivate("adminCore/updateEwayBillStatus", (payload) => ENDPOINTS.delivery.ewayBillStatus(payload.ewayBillId), "PATCH");

export const getRealtimeAnalytics = createApiThunkPrivate("adminCore/getRealtimeAnalytics", ENDPOINTS.analytics.realtime, "GET");
export const getReturnsAnalytics = createApiThunkPrivate("adminCore/getReturnsAnalytics", ENDPOINTS.analytics.returns, "GET");
export const getChargebacks = createApiThunkPrivate("adminCore/getChargebacks", ENDPOINTS.analytics.chargebacks, "GET");

export const getApiKeys = createApiThunkPrivate("adminCore/getApiKeys", ENDPOINTS.platform.apiKeys, "GET");
export const createApiKey = createApiThunkPrivate("adminCore/createApiKey", ENDPOINTS.platform.apiKeys, "POST");
export const getWebhooks = createApiThunkPrivate("adminCore/getWebhooks", ENDPOINTS.platform.webhooks, "GET");
export const createWebhook = createApiThunkPrivate("adminCore/createWebhook", ENDPOINTS.platform.webhooks, "POST");
export const getFeatureFlags = createApiThunkPrivate("adminCore/getFeatureFlags", ENDPOINTS.platform.featureFlags, "GET");
export const upsertFeatureFlag = createApiThunkPrivate("adminCore/upsertFeatureFlag", ENDPOINTS.platform.featureFlags, "PUT");

export const getSubscriptionPlans = createApiThunkPrivate("adminCore/getSubscriptionPlans", ENDPOINTS.platform.subscriptionPlans, "GET");
export const getSubscriptionPlan = createApiThunkPrivate("adminCore/getSubscriptionPlan", (payload) => ENDPOINTS.platform.subscriptionPlan(payload.planId || payload.id), "GET");
export const createSubscriptionPlan = createApiThunkPrivate("adminCore/createSubscriptionPlan", ENDPOINTS.platform.subscriptionPlans, "POST");
export const updateSubscriptionPlan = createApiThunkPrivate("adminCore/updateSubscriptionPlan", (payload) => ENDPOINTS.platform.subscriptionPlan(payload.planId || payload.id), "PATCH");
export const deleteSubscriptionPlan = createApiThunkPrivate("adminCore/deleteSubscriptionPlan", (payload) => ENDPOINTS.platform.subscriptionPlan(payload.planId || payload.id), "DELETE");
export const getPlatformSubscriptions = createApiThunkPrivate("adminCore/getPlatformSubscriptions", ENDPOINTS.platform.subscriptions, "GET");
export const updatePlatformSubscriptionStatus = createApiThunkPrivate("adminCore/updatePlatformSubscriptionStatus", (payload) => ENDPOINTS.platform.subscriptionStatus(payload.subscriptionId || payload.id), "PATCH");
export const getPlatformFeeConfigs = createApiThunkPrivate("adminCore/getPlatformFeeConfigs", ENDPOINTS.platform.feeConfig, "GET");
export const getPlatformFeeConfig = createApiThunkPrivate("adminCore/getPlatformFeeConfig", (payload) => ENDPOINTS.platform.feeConfigDetail(payload.configId || payload.id), "GET");
export const createPlatformFeeConfig = createApiThunkPrivate("adminCore/createPlatformFeeConfig", ENDPOINTS.platform.feeConfig, "POST");
export const updatePlatformFeeConfig = createApiThunkPrivate("adminCore/updatePlatformFeeConfig", (payload) => ENDPOINTS.platform.feeConfigDetail(payload.configId || payload.id), "PATCH");
export const deletePlatformFeeConfig = createApiThunkPrivate("adminCore/deletePlatformFeeConfig", (payload) => ENDPOINTS.platform.feeConfigDetail(payload.configId || payload.id), "DELETE");

export const getPlatformCategories = createApiThunkPrivate("adminCore/getPlatformCategories", ENDPOINTS.platform.categories, "GET");
export const getPlatformCategory = createApiThunkPrivate("adminCore/getPlatformCategory", (payload) => ENDPOINTS.platform.category(payload.categoryKey || payload.key || payload.id), "GET");
export const createPlatformCategory = createApiThunkPrivate("adminCore/createPlatformCategory", ENDPOINTS.platform.categories, "POST");
export const updatePlatformCategory = createApiThunkPrivate("adminCore/updatePlatformCategory", (payload) => ENDPOINTS.platform.category(payload.categoryKey || payload.key || payload.id), "PATCH");
export const deletePlatformCategory = createApiThunkPrivate("adminCore/deletePlatformCategory", (payload) => ENDPOINTS.platform.category(payload.categoryKey || payload.key || payload.id), "DELETE");

export const getProductFamilies = createApiThunkPrivate("adminCore/getProductFamilies", ENDPOINTS.platform.productFamilies, "GET");
export const getProductFamily = createApiThunkPrivate("adminCore/getProductFamily", (payload) => ENDPOINTS.platform.productFamily(payload.familyCode || payload.code || payload.id), "GET");
export const createProductFamily = createApiThunkPrivate("adminCore/createProductFamily", ENDPOINTS.platform.productFamilies, "POST");
export const updateProductFamily = createApiThunkPrivate("adminCore/updateProductFamily", (payload) => ENDPOINTS.platform.productFamily(payload.familyCode || payload.code || payload.id), "PATCH");
export const deleteProductFamily = createApiThunkPrivate("adminCore/deleteProductFamily", (payload) => ENDPOINTS.platform.productFamily(payload.familyCode || payload.code || payload.id), "DELETE");

export const getProductVariants = createApiThunkPrivate("adminCore/getProductVariants", ENDPOINTS.platform.productVariants, "GET");
export const getProductVariant = createApiThunkPrivate("adminCore/getProductVariant", (payload) => ENDPOINTS.platform.productVariant(payload.variantId || payload.id), "GET");
export const createProductVariant = createApiThunkPrivate("adminCore/createProductVariant", ENDPOINTS.platform.productVariants, "POST");
export const updateProductVariant = createApiThunkPrivate("adminCore/updateProductVariant", (payload) => ENDPOINTS.platform.productVariant(payload.variantId || payload.id), "PATCH");
export const deleteProductVariant = createApiThunkPrivate("adminCore/deleteProductVariant", (payload) => ENDPOINTS.platform.productVariant(payload.variantId || payload.id), "DELETE");

export const getHsnCodes = createApiThunkPrivate("adminCore/getHsnCodes", ENDPOINTS.platform.hsnCodes, "GET");
export const getHsnCode = createApiThunkPrivate("adminCore/getHsnCode", (payload) => ENDPOINTS.platform.hsnCode(payload.hsnCode || payload.code || payload.id), "GET");
export const createHsnCode = createApiThunkPrivate("adminCore/createHsnCode", ENDPOINTS.platform.hsnCodes, "POST");
export const updateHsnCode = createApiThunkPrivate("adminCore/updateHsnCode", (payload) => ENDPOINTS.platform.hsnCode(payload.hsnCode || payload.code || payload.id), "PATCH");
export const deleteHsnCode = createApiThunkPrivate("adminCore/deleteHsnCode", (payload) => ENDPOINTS.platform.hsnCode(payload.hsnCode || payload.code || payload.id), "DELETE");

export const getGeographies = createApiThunkPrivate("adminCore/getGeographies", ENDPOINTS.platform.geography, "GET");
export const getGeography = createApiThunkPrivate("adminCore/getGeography", (payload) => ENDPOINTS.platform.geographyDetail(payload.countryCode || payload.code || payload.id), "GET");
export const createGeography = createApiThunkPrivate("adminCore/createGeography", ENDPOINTS.platform.geography, "POST");
export const updateGeography = createApiThunkPrivate("adminCore/updateGeography", (payload) => ENDPOINTS.platform.geographyDetail(payload.countryCode || payload.code || payload.id), "PATCH");
export const deleteGeography = createApiThunkPrivate("adminCore/deleteGeography", (payload) => ENDPOINTS.platform.geographyDetail(payload.countryCode || payload.code || payload.id), "DELETE");

export const getContentPages = createApiThunkPrivate("adminCore/getContentPages", ENDPOINTS.platform.contentPages, "GET");
export const getContentPage = createApiThunkPrivate("adminCore/getContentPage", (payload) => ENDPOINTS.platform.contentPage(payload.slug || payload.id), "GET");
export const createContentPage = createApiThunkPrivate("adminCore/createContentPage", ENDPOINTS.platform.contentPages, "POST");
export const updateContentPage = createApiThunkPrivate("adminCore/updateContentPage", (payload) => ENDPOINTS.platform.contentPage(payload.slug || payload.id), "PATCH");
export const deleteContentPage = createApiThunkPrivate("adminCore/deleteContentPage", (payload) => ENDPOINTS.platform.contentPage(payload.slug || payload.id), "DELETE");

export const getRbacPermissionManagementModules = createApiThunkPrivate("rbac/getPermissionManagementModules", ENDPOINTS.rbac.permissionManagementModules, "GET");
export const getRbacModules = createApiThunkPrivate("rbac/getModules", ENDPOINTS.rbac.modules, "GET");
export const createRbacModule = createApiThunkPrivate("rbac/createModule", ENDPOINTS.rbac.modules, "POST");
export const updateRbacModule = createApiThunkPrivate("rbac/updateModule", (payload) => ENDPOINTS.rbac.module(payload.moduleId || payload.id), "PATCH");
export const deleteRbacModule = createApiThunkPrivate("rbac/deleteModule", (payload) => ENDPOINTS.rbac.module(payload.moduleId || payload.id), "DELETE");
export const getRbacPermissions = createApiThunkPrivate("rbac/getPermissions", ENDPOINTS.rbac.permissions, "GET");
export const createRbacPermission = createApiThunkPrivate("rbac/createPermission", ENDPOINTS.rbac.permissions, "POST");
export const updateRbacPermission = createApiThunkPrivate("rbac/updatePermission", (payload) => ENDPOINTS.rbac.permission(payload.permissionId || payload.id), "PATCH");
export const getRbacRoles = createApiThunkPrivate("rbac/getRoles", ENDPOINTS.rbac.roles, "GET");
export const createRbacRole = createApiThunkPrivate("rbac/createRole", ENDPOINTS.rbac.roles, "POST");
export const updateRbacRole = createApiThunkPrivate("rbac/updateRole", (payload) => ENDPOINTS.rbac.role(payload.roleId || payload.id), "PATCH");
export const getRolePermissions = createApiThunkPrivate("rbac/getRolePermissions", (payload) => ENDPOINTS.rbac.rolePermissions(payload.roleId || payload.id), "GET");
export const updateRolePermissionsBulk = createApiThunkPrivate("rbac/updateRolePermissionsBulk", (payload) => ENDPOINTS.rbac.rolePermissionsBulk(payload.roleId || payload.id), "POST");
export const getUserPermissions = createApiThunkPrivate("rbac/getUserPermissions", (payload) => ENDPOINTS.rbac.userPermissions(payload.userId || payload.id), "GET");
export const getUserEffectivePermissions = createApiThunkPrivate("rbac/getUserEffectivePermissions", (payload) => ENDPOINTS.rbac.userEffectivePermissions(payload.userId || payload.id), "GET");
export const getUserRoles = createApiThunkPrivate("rbac/getUserRoles", (payload) => ENDPOINTS.rbac.userRoles(payload.userId || payload.id), "GET");

export const getSystemHealth = createApiThunkPrivate("system/getHealth", ENDPOINTS.system.health, "GET");
export const getSystemQueues = createApiThunkPrivate("system/getQueues", ENDPOINTS.system.queues, "GET");
export const pauseSystemQueue = createApiThunkPrivate("system/pauseQueue", (payload) => ENDPOINTS.system.pauseQueue(payload.queueName), "POST");
export const resumeSystemQueue = createApiThunkPrivate("system/resumeQueue", (payload) => ENDPOINTS.system.resumeQueue(payload.queueName), "POST");
export const getDeadLetterEvents = createApiThunkPrivate("system/getDeadLetterEvents", ENDPOINTS.system.deadLetter, "GET");
export const retryDeadLetterEvent = createApiThunkPrivate("system/retryDeadLetterEvent", (payload) => ENDPOINTS.system.retryDeadLetter(payload.eventId), "POST");
export const discardDeadLetterEvent = createApiThunkPrivate("system/discardDeadLetterEvent", (payload) => ENDPOINTS.system.discardDeadLetter(payload.eventId), "POST");

const register = (builder, thunk, key) => createExtraReducersForThunk(builder, thunk, key);

const adminCoreSlice = createSlice({
  name: "adminCore",
  initialState,
  extraReducers: (builder) => {
    [
      [getDashboardOverview, "dashboardOverviewData"],
      [getAdmins, "adminsData"],
      [createAdmin, "createAdminData"],
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
