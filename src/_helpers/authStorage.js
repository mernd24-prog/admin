import { getPanelMode, getPanelRoleRules, PANEL_MODES } from "./panelConfig";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "currentUser";
const ROLE_KEY = "role";
const ALLOWED_MODULES_KEY = "allowedModules";

export const ADMIN_ROLES = ["super-admin", "admin", "sub-admin"];
export const BLOCKED_ADMIN_ROLES = ["seller", "seller-admin", "seller-sub-admin", "buyer"];
export const LEGACY_ROLE_IDS = {
  "super-admin": 1,
  admin: 1,
  "sub-admin": 2,
  seller: 3,
  "seller-admin": 8,
  "seller-sub-admin": 9,
  buyer: 5,
};

const LEGACY_ROLE_BY_ID = {
  1: "admin",
  2: "sub-admin",
  3: "seller",
  5: "buyer",
  8: "seller-admin",
  9: "seller-sub-admin",
};

const safeParse = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const normalizeRole = (roleLike) => {
  if (!roleLike) return "";
  if (typeof roleLike === "number") return LEGACY_ROLE_BY_ID[roleLike] || "";
  if (typeof roleLike === "string") {
    const cleanRole = roleLike.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
    return LEGACY_ROLE_BY_ID[cleanRole] || cleanRole;
  }
  return normalizeRole(roleLike.slug || roleLike.code || roleLike.name || roleLike.role);
};

export const getLegacyRoleId = (roleLike) =>
  LEGACY_ROLE_IDS[normalizeRole(roleLike)] || null;

export const extractRole = (...sources) => {
  for (const source of sources) {
    const role = normalizeRole(
      source?.role ||
        source?.roleName ||
        source?.role_code ||
        source?.roleCode ||
        source?.role_id ||
        source?.roleId
    );
    if (role) return role;
  }
  return "";
};

export const extractAllowedModules = (...sources) => {
  for (const source of sources) {
    const modules =
      source?.allowedModules ||
      source?.allowed_modules ||
      source?.modules ||
      source?.permissions?.allowedModules;
    if (Array.isArray(modules)) return modules.map(String);
  }
  return [];
};

export const isAllowedAdminRole = (role) => ADMIN_ROLES.includes(normalizeRole(role));
export const isBlockedAdminRole = (role) => BLOCKED_ADMIN_ROLES.includes(normalizeRole(role));
export const SELLER_ROLES = ["seller", "seller-admin", "seller-sub-admin"];
export const BLOCKED_SELLER_ROLES = ["super-admin", "admin", "sub-admin", "buyer"];
export const isAllowedSellerRole = (role) => SELLER_ROLES.includes(normalizeRole(role));
export const isBlockedSellerRole = (role) => BLOCKED_SELLER_ROLES.includes(normalizeRole(role));

export const isAllowedRoleForPanel = (role, panelMode = getPanelMode()) => {
  const { allowedRoles } = getPanelRoleRules(panelMode);
  return allowedRoles.includes(normalizeRole(role));
};

export const isAllowedRoleForCurrentPanel = (role) => isAllowedRoleForPanel(role, getPanelMode());

export const isRestrictedRoleForPanel = (role, panelMode = getPanelMode()) =>
  normalizeRole(role) === getPanelRoleRules(panelMode).restrictedRole;

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const getStoredUser = () => safeParse(localStorage.getItem(USER_KEY), null);
export const getStoredRole = () => localStorage.getItem(ROLE_KEY) || "";
export const getAllowedModules = () =>
  safeParse(localStorage.getItem(ALLOWED_MODULES_KEY), []);

export const getStoredAuth = () => ({
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
  user: getStoredUser(),
  role: getStoredRole(),
  allowedModules: getAllowedModules(),
});

export const setStoredAuth = ({
  accessToken,
  refreshToken,
  user,
  role,
  allowedModules,
}) => {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (role) localStorage.setItem(ROLE_KEY, normalizeRole(role));
  if (Array.isArray(allowedModules)) {
    localStorage.setItem(ALLOWED_MODULES_KEY, JSON.stringify(allowedModules.map(String)));
  }
};

export const clearStoredAuth = () => {
  [
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    USER_KEY,
    ROLE_KEY,
    ALLOWED_MODULES_KEY,
    "authFlowState",
    "authMode",
    "sellerOnboardingToken",
    "sellerOnboardingUser",
    "token",
    "adminuser",
    "sidebarModules",
    "rbacSidebarModules",
    "permissions",
    "modulePermissions",
  ].forEach((key) => localStorage.removeItem(key));
  [
    "EcomAdmin",
    "adminuser",
    "sidebarModules",
    "rbacSidebarModules",
    "permissions",
    "modulePermissions",
  ].forEach((key) => sessionStorage.removeItem(key));
};

export const hasModuleAccess = (moduleCode) => {
  const normalizeCode = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/_/g, "-");

  const role = normalizeRole(getStoredRole());
  const panelMode = getPanelMode();
  const { fullAccessRoles, restrictedRole } = getPanelRoleRules(panelMode);
  const moduleCodes = Array.isArray(moduleCode) ? moduleCode : [moduleCode];
  const sessionUser = safeParse(sessionStorage.getItem("EcomAdmin"), {});

  if (!isAllowedRoleForPanel(role, panelMode)) return false;
  if (!moduleCode) return false;

  const moduleAliases = {
    dashboard: ["home", "dashboard", "analytics", "admin"],
    products: ["products", "product", "product-catalog", "add-product", "draft-products", "pending-products", "change-pending-products", "rejected-products", "product-tags", "store", "bar-code", "seo-media"],
    categories: ["categories", "category", "category-attributes", "sub-categories", "sub-sub-categories"],
    "sub-categories": ["sub-categories", "sub_categories", "categories", "category-attributes"],
    "sub-sub-categories": ["sub-sub-categories", "sub_sub_categories", "categories", "category-attributes"],
    brands: ["brands", "brand"],
    option_masters: ["option-masters", "option_masters", "product-options", "product_options"],
    "option-masters": ["option-masters", "option_masters", "product-options", "product_options"],
    option_values: ["option-values", "option_values", "product-option-values", "product_option_values", "product-option-value"],
    "option-values": ["option-values", "option_values", "product-option-values", "product_option_values", "product-option-value"],
    platform: ["platform", "categories", "category-attributes", "brands", "product-options", "product-option-values", "product-families", "product-variants", "product-dimensions", "finish", "batch", "collections"],
    inventory: ["inventory", "seller-product-inventory", "seller-product-inventories", "inventory-overview", "variant-inventory", "inventory-adjustment", "warehouse", "low-stock-alerts", "threshold-products", "stock", "stock-adjustment"],
    orders: ["orders", "order", "order_status", "order-status", "subscription_orders", "subscription-orders", "gift-card-orders", "order-cancellation-reasons", "view-orders"],
    payments: ["payments", "payment", "refunds", "refund", "payouts"],
    wallets: ["wallets", "wallet", "transactions", "user-transactions"],
    pricing: ["pricing", "coupons", "discount-coupons", "discount_coupons", "special-price", "volume-discounts", "ppc-promotions-management", "campaigns"],
    referral: ["referral", "referral-commerce", "influencers"],
    delivery: ["delivery", "delivery-shipping", "shipping_packages", "shipping-packages", "shipping_profile", "shipping-profile", "pickup_addresses", "pickup-addresses", "delivery-staff", "shipping-company-users", "shipment-tracking", "shipping-duration"],
    sellers: ["sellers", "seller", "vendors", "profile", "seller-management", "seller-users", "seller-staff"],
    "seller-management": ["seller-management", "sellers", "seller-admins", "seller-sub-admins", "seller-hierarchy", "seller-users", "seller-staff"],
    seller_kyc: ["seller-kyc", "seller_kyc", "seller-kyc-detail"],
    "seller-kyc": ["seller-kyc", "seller_kyc", "seller-kyc-detail"],
    seller_bank: ["seller-bank", "seller_bank", "seller-bank-detail"],
    "seller-bank": ["seller-bank", "seller_bank", "seller-bank-detail"],
    "sellers/commissions": ["sellers/commissions", "seller-finance", "seller-commissions", "seller_commissions", "commissions", "seller-payouts", "seller_payouts", "settlements"],
    notifications: ["notifications", "messages"],
    returns: ["returns", "return-requests", "order_return_reasons", "order-return-reasons"],
    analytics: ["analytics", "dashboard", "home"],
    reports: ["reports", "reports-sales", "reports-products", "reports-inventory", "reports-sellers", "analytics"],
    users: ["users", "user", "customers", "admin_users", "admin-users"],
    admin_users: ["admin-users", "admin_users", "sub-admins", "sub_admins"],
    "admin-users": ["admin-users", "admin_users", "sub-admins", "sub_admins"],
    rbac: ["rbac", "admin_users", "admin-users", "user-permissions", "roles-permissions", "module-management"],
    tax: ["tax", "tax-structure", "tax-category", "tax-category-rules", "hsn-code", "hsn-codes", "subtax", "sub-tax", "tax-rule", "tax-documents", "gst"],
    locations: ["locations", "country", "countries", "state", "states", "city", "cities", "zipcode", "zip-code", "zip-codes", "pincode", "pin-code"],
    countries: ["country", "countries", "locations"],
    states: ["state", "states", "locations"],
    cities: ["city", "cities", "locations"],
    zip_codes: ["zipcode", "zip-code", "zip-codes", "pincode", "pin-code", "locations"],
    "zip-codes": ["zipcode", "zip-code", "zip-codes", "pincode", "pin-code", "locations"],
    coupons: ["coupons", "discount-coupons", "discount_coupons"],
    banners: ["banners", "promotion-banners", "promotions-banners", "content-management/promotion-banner"],
    cms: ["cms", "cms-pages", "cms_pages", "content-management"],
    cms_pages: ["cms-pages", "cms_pages", "content-management"],
    "cms-pages": ["cms-pages", "cms_pages", "content-management"],
    reviews: ["reviews", "product-reviews"],
    "dynamic-pricing": ["dynamic-pricing", "dynamic_pricing", "special-price"],
    loyalty: ["loyalty", "reward-on-purchase"],
    recommendations: ["recommendations", "similar-products", "frequently-bought-together", "product-event-weightages", "recommended-product-tag-weightages"],
    warranty: ["warranty", "warranty-templates"],
    fraud: ["fraud", "chargebacks"],
    system: ["system", "settings"],
  };

  const expandedModuleCodes = moduleCodes
    .map(normalizeCode)
    .flatMap((code) => (moduleAliases[code] || [code]).map(normalizeCode));

  const sellerOwnedModules = new Set([
    "dashboard",
    "products",
    "inventory",
    "orders",
    "coupons",
    "pricing",
    "notifications",
    "analytics",
    "reports",
    "sellers",
    "seller-management",
    "sellers/commissions",
    "returns",
    "delivery",
  ]);

  const sellerOwnedAliases = new Set(
    Object.entries(moduleAliases)
      .filter(([moduleKey]) => sellerOwnedModules.has(moduleKey))
      .flatMap(([, aliases]) => aliases.map(normalizeCode))
  );

  const isSellerOwnedCode = (code) =>
    sellerOwnedModules.has(code) || sellerOwnedAliases.has(code);

  if (panelMode === PANEL_MODES.SELLER) {
    if (!expandedModuleCodes.some(isSellerOwnedCode)) return false;
    if (fullAccessRoles.includes(role)) return true;
  } else if (fullAccessRoles.includes(role)) {
    return true;
  }

  const storedPermissionValues = [
    ...(Array.isArray(getStoredUser()?.permissions) ? getStoredUser().permissions : []),
    ...(Array.isArray(sessionUser?.permissions)
      ? sessionUser?.permissions
      : []),
  ];
  const permissionModules = storedPermissionValues
    .map((permission) => String(permission || "").trim().toLowerCase())
    .filter((permission) => permission.includes(":"))
    .filter((permission) => normalizeCode(permission.split(":")[1]) === "view")
    .map((permission) => normalizeCode(permission.split(":")[0]));
  const legacyAllowedModules = [
    ...(Array.isArray(getStoredUser()?.allowedModules)
      ? getStoredUser().allowedModules
      : []),
    ...(Array.isArray(sessionUser?.allowedModules)
      ? sessionUser.allowedModules
      : []),
    ...getAllowedModules(),
  ].map(normalizeCode);

  const allowedModules = Array.from(
    new Set([
      ...legacyAllowedModules,
      ...permissionModules,
    ]),
  );
  if (role !== restrictedRole && !allowedModules.length) return false;

  return expandedModuleCodes.some((code) => {
    if (panelMode === PANEL_MODES.SELLER && !isSellerOwnedCode(code)) {
      return false;
    }
    if (allowedModules.includes(code)) return true;
    return allowedModules.some((allowedCode) => {
      if (allowedCode === code) return true;
      if (allowedCode.includes("/") && code.includes("/")) {
        return code.startsWith(allowedCode);
      }
      return false;
    });
  });
};

export { getPanelMode, PANEL_MODES };
