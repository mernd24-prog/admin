import { isSellerPanel } from "./panelConfig";

export const API_PREFIX = "/api/v1";

const byPanel = (adminPath, sellerPath = adminPath) =>
  (isSellerPanel() ? sellerPath : adminPath);

const byPanelFn = (adminBuilder, sellerBuilder = adminBuilder) => (...args) =>
  (isSellerPanel() ? sellerBuilder(...args) : adminBuilder(...args));

export const ENDPOINTS = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    social: "/auth/social",
    status: "/auth/status",
    refresh: "/auth/refresh",
    me: "/users/me",
    forgotPassword: "/auth/forgot-password",
    sendOtp: "/auth/send-otp",
    verifyOtp: "/auth/verify-otp",
    resendOtp: "/auth/resend-otp",
    resetPassword: "/auth/reset-password",
    changePassword: "/auth/change-password",
    registerOtp: "/auth/register-otp",
    verifyRegistration: "/auth/verify-registration",
  },
  dashboard: {
    overview: byPanel("/admin/dashboard/overview", "/sellers/me/dashboard"),
  },
  users: {
    adminUsers: "/admin/users",
    adminUser: (userId) => `/admin/users/${userId}`,
    myAddresses: "/users/me/addresses",
    myAddress: (addressId) => `/users/me/addresses/${addressId}`,
  },
  adminAccess: {
    modules: "/admin/access/modules",
    admins: "/admin/access/admins",
    subAdmins: byPanel("/admin/access/sub-admins", "/sellers/me/sub-admins"),
    subAdminModules: byPanelFn(
      (userId) => `/admin/access/sub-admins/${userId}/modules`,
      (userId) => `/sellers/me/sub-admins/${userId}/modules`
    ),
  },
  sellers: {
    onboardingKyc: "/sellers/onboarding/kyc",
    onboardingProfile: "/sellers/onboarding/profile",
    vendors: "/admin/vendors",
    vendorStatus: (sellerId) => `/admin/vendors/${sellerId}/status`,
    kycReview: (sellerId) => `/sellers/${sellerId}/kyc/review`,
    status: "/sellers/me/status",
    tracking: "/sellers/me/tracking",
    trackingOrder: (orderId) => `/sellers/me/tracking/${orderId}`,
    profile: "/sellers/me/profile",
    businessAddress: "/sellers/me/business-address",
    pickupAddress: "/sellers/me/pickup-address",
    bankDetails: "/sellers/me/bank-details",
    moreInfo: "/sellers/me/more-info",
    settings: "/sellers/me/settings",
    dashboard: "/sellers/me/dashboard",
    subAdmins: "/sellers/me/sub-admins",
    subAdminModules: (userId) => `/sellers/me/sub-admins/${userId}/modules`,
  },
  products: {
    list: "/products",
    listForPanel: byPanel("/products", "/products/seller/me"),
    search: "/products/search",
    sellerMine: "/products/seller/me",
    detail: (productId) => `/products/${productId}`,
    moderationQueue: "/admin/products/moderation-queue",
    moderate: (productId) => `/admin/products/${productId}/moderate`,
  },
  orders: {
    admin: "/admin/orders",
    mine: "/orders/me",
    sellerMine: "/orders/seller/me",
    listForPanel: byPanel("/admin/orders", "/orders/seller/me"),
    create: "/orders",
    detail: (orderId) => `/orders/${orderId}`,
    cancel: (orderId) => `/orders/${orderId}/cancel`,
    status: (orderId) => `/orders/${orderId}/status`,
  },
  payments: {
    admin: "/admin/payments",
  },
  payouts: {
    admin: "/admin/payouts",
    myCommissions: "/sellers/commissions/my-commissions",
    myPayouts: "/sellers/commissions/my-payouts",
    calculate: (orderId) => `/sellers/commissions/calculate/${orderId}`,
    process: "/sellers/commissions/process-payouts",
    settlements: "/sellers/commissions/settlements",
  },
  tax: {
    adminReports: "/admin/tax/reports",
    adminInvoice: (orderId) => `/admin/tax/orders/${orderId}/invoice`,
    invoice: (orderId) => `/tax/orders/${orderId}/invoice`,
    reports: "/tax/reports",
  },
  coupons: {
    list: "/pricing/coupons",
    detail: (couponId) => `/pricing/coupons/${couponId}`,
  },
  delivery: {
    serviceability: "/delivery/serviceability",
    orderEwayBill: (orderId) => `/delivery/orders/${orderId}/eway-bill`,
    ewayBillStatus: (ewayBillId) => `/delivery/eway-bills/${ewayBillId}/status`,
  },
  returns: {
    byOrder: (orderId) => `/returns/order/${orderId}`,
    mine: "/returns/my-returns",
    approve: (returnId) => `/returns/${returnId}/approve`,
    refund: (returnId) => `/returns/${returnId}/refund`,
    analytics: "/admin/returns/analytics",
  },
  notifications: {
    mine: "/notifications/me",
    preferences: "/notifications/preferences",
  },
  analytics: {
    seller: "/analytics",
    realtime: "/admin/analytics/realtime",
    returns: "/admin/returns/analytics",
    chargebacks: "/admin/chargebacks",
  },
  rbac: {
    permissionManagementModules: "/rbac/permission-management/modules",
    modules: "/rbac/modules",
    module: (moduleId) => `/rbac/modules/${moduleId}`,
    permissions: "/rbac/permissions",
    permission: (permissionId) => `/rbac/permissions/${permissionId}`,
    roles: "/rbac/roles",
    role: (roleId) => `/rbac/roles/${roleId}`,
    rolePermissions: (roleId) => `/rbac/roles/${roleId}/permissions`,
    rolePermissionsBulk: (roleId) => `/rbac/roles/${roleId}/permissions/bulk`,
    userPermissions: (userId) => `/rbac/users/${userId}/permissions`,
    userEffectivePermissions: (userId) => `/rbac/users/${userId}/permissions/effective`,
    userPermissionCheck: (userId) => `/rbac/users/${userId}/permissions/check`,
    userPermissionsBulk: (userId) => `/rbac/users/${userId}/permissions/bulk`,
    userRoles: (userId) => `/rbac/users/${userId}/roles`,
    userRoleCheck: (userId) => `/rbac/users/${userId}/roles/check`,
    userRolesBulk: (userId) => `/rbac/users/${userId}/roles/bulk`,
  },
  platform: {
    apiKeys: "/admin/platform/api-keys",
    webhooks: "/admin/platform/webhooks",
    featureFlags: "/admin/platform/feature-flags",
    subscriptionPlans: "/admin/platform/subscription-plans",
    subscriptionPlan: (planId) => `/admin/platform/subscription-plans/${planId}`,
    subscriptions: "/admin/platform/subscriptions",
    subscriptionStatus: (subscriptionId) => `/admin/platform/subscriptions/${subscriptionId}/status`,
    feeConfig: "/admin/platform/fee-config",
    feeConfigDetail: (configId) => `/admin/platform/fee-config/${configId}`,
    categories: "/admin/platform/categories",
    category: (categoryKey) => `/admin/platform/categories/${categoryKey}`,
    productFamilies: "/admin/platform/product-families",
    productFamily: (familyCode) => `/admin/platform/product-families/${familyCode}`,
    productVariants: "/admin/platform/product-variants",
    productVariant: (variantId) => `/admin/platform/product-variants/${variantId}`,
    hsnCodes: "/admin/platform/hsn-codes",
    hsnCode: (hsnCode) => `/admin/platform/hsn-codes/${hsnCode}`,
    geography: "/admin/platform/geography",
    geographyDetail: (countryCode) => `/admin/platform/geography/${countryCode}`,
    contentPages: "/admin/platform/content-pages",
    contentPage: (slug) => `/admin/platform/content-pages/${slug}`,
  },
  system: {
    health: "/admin/system/health",
    queues: "/admin/system/queues",
    pauseQueue: (queueName) => `/admin/system/queues/${queueName}/pause`,
    resumeQueue: (queueName) => `/admin/system/queues/${queueName}/resume`,
    deadLetter: "/admin/system/dead-letter",
    retryDeadLetter: (eventId) => `/admin/system/dead-letter/${eventId}/retry`,
    discardDeadLetter: (eventId) => `/admin/system/dead-letter/${eventId}/discard`,
  },
};

export const ORDER_STATUSES = [
  "cancelled",
  "packed",
  "shipped",
  "delivered",
  "fulfilled",
  "return_requested",
  "returned",
];

export const SELLER_FULFILLMENT_STATUSES = [
  "packed",
  "shipped",
  "delivered",
  "fulfilled",
  "return_requested",
  "returned",
];

export const DELIVERY_STATUSES = [
  "initiated",
  "manifested",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "cancelled",
];

export const COUPON_TYPES = ["percentage", "fixed"];

export const PERMISSION_ACTIONS = [
  "create",
  "view",
  "update",
  "delete",
  "action",
  "approve",
  "review",
  "manage",
];
