import { getPanelMode, getPanelRoleRules, PANEL_MODES } from "./panelConfig";
import { isSellerAllowedModule, isSellerBlockedModule } from "./rbacRoutes";

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
    products: ["products", "product", "product-catalog", "store", "bar-code"],
    categories: ["categories", "category", "category-attributes", "sub-categories", "sub-sub-categories"],
    "sub-categories": ["sub-categories", "sub_categories", "categories", "category-attributes"],
    "sub-sub-categories": ["sub-sub-categories", "sub_sub_categories", "categories", "category-attributes"],
    brands: ["brands", "brand"],
    option_masters: ["option-masters", "option_masters", "product-options", "product_options"],
    "option-masters": ["option-masters", "option_masters", "product-options", "product_options"],
    option_values: ["option-values", "option_values", "product-option-values", "product_option_values", "product-option-value"],
    "option-values": ["option-values", "option_values", "product-option-values", "product_option_values", "product-option-value"],
    platform: ["platform", "categories", "category-attributes", "brands", "product-options", "product-option-values", "product-families", "product-variants", "product-dimensions", "finish", "batch", "collections"],
    inventory: ["inventory", "stock", "stock-adjustment"],
    orders: ["orders", "order", "checkout-quote", "carts", "subscription_orders", "subscription-orders", "view-orders"],
    payments: ["payments", "payment", "payouts", "payments-finance", "chargebacks", "fraud-cases"],
    "cod-config": ["cod-config", "cod_config", "seller-cod-config", "charge-settings"],
    wallets: ["wallets", "wallet", "transactions", "user-transactions", "wallet-transactions", "wallet-management"],
    pricing: ["pricing", "coupons", "discount-coupons", "discount_coupons"],
    referral: ["referral", "referral-commerce", "influencers"],
    delivery: ["delivery", "delivery-shipping", "shipping-fulfilment", "delivery-staff", "delivery-agents", "shipment-tracking", "shipping-duration"],
    sellers: ["sellers", "seller", "vendors", "profile", "seller-management", "seller-users", "seller-staff", "seller-organizations"],
    "seller-management": ["seller-management", "sellers", "seller-admins", "seller-sub-admins", "seller-hierarchy", "seller-users", "seller-staff", "seller-organizations"],
    seller_kyc: ["seller-kyc", "seller_kyc", "seller-kyc-detail"],
    "seller-kyc": ["seller-kyc", "seller_kyc", "seller-kyc-detail"],
    seller_bank: ["seller-bank", "seller_bank", "seller-bank-detail"],
    "seller-bank": ["seller-bank", "seller_bank", "seller-bank-detail"],
    "sellers/commissions": ["sellers/commissions", "seller-finance-payouts", "seller-finance", "seller-commissions", "seller_commissions", "commissions", "seller-payouts", "seller_payouts", "payout-ops-queue", "negative-balances", "settlements"],
    notifications: ["notifications", "messages"],
    returns: ["returns", "return-requests", "returns-cancellations", "cancellations"],
    analytics: ["analytics", "dashboard", "home"],
    reports: ["reports", "reports-sales", "reports-products", "reports-inventory", "reports-sellers", "analytics"],
    users: ["users", "user", "customers", "admin_users", "admin-users"],
    admin_users: ["admin-users", "admin_users", "sub-admins", "sub_admins"],
    "admin-users": ["admin-users", "admin_users", "sub-admins", "sub_admins"],
    rbac: ["rbac", "admin_users", "admin-users", "user-permissions", "roles-permissions", "module-management"],
    tax: ["tax", "invoices-taxation", "tax-invoices", "credit-notes", "hsn-code", "hsn-codes", "subtax", "sub-tax", "tax-rule", "tax-documents", "gst"],
    "commerce-settings": ["commerce-settings", "commerce-settings-menu", "platform-commerce-settings", "seller-commerce-config", "commerce-templates", "seller-tiers", "platform-fee-config", "commission-rules", "discount-coupons", "cod-config", "subscription-plans"],
    locations: ["locations", "country", "countries", "state", "states", "city", "cities", "zipcode", "zip-code", "zip-codes", "pincode", "pin-code"],
    countries: ["country", "countries", "locations"],
    states: ["state", "states", "locations"],
    cities: ["city", "cities", "locations"],
    zip_codes: ["zipcode", "zip-code", "zip-codes", "pincode", "pin-code", "locations"],
    "zip-codes": ["zipcode", "zip-code", "zip-codes", "pincode", "pin-code", "locations"],
    coupons: ["coupons", "discount-coupons", "discount_coupons"],
  
  
    "cms-pages": ["cms-pages", "cms_pages", "content-management"],
    reviews: ["reviews", "product-reviews"],
    warranty: ["warranty", "warranty-templates"],
    fraud: ["fraud", "chargebacks"],
    system: ["system", "settings"],
  };

  const expandedModuleCodes = moduleCodes
    .map(normalizeCode)
    .flatMap((code) => [code, ...(moduleAliases[code] || [])].map(normalizeCode));

  const sellerOwnedModules = new Set([
    "dashboard",
    "seller-dashboard",
    "products",
    "reviews",
    "inventory",
    "orders",
    "cod-config",
    "coupons",
    "pricing",
    "notifications",
    "analytics",
    "reports",
    "tax",
    "tax-invoices",
    "credit-notes",
    "seller-management",
    "sellers/commissions",
    "seller-payouts",
    "returns",
    "cancellations",
    "delivery",
    "queries",
  ]);

  const sellerOwnedAliases = new Set(
    Object.entries(moduleAliases)
      .filter(([moduleKey]) => sellerOwnedModules.has(moduleKey))
      .flatMap(([, aliases]) => aliases.map(normalizeCode))
  );

  const isSellerOwnedCode = (code) =>
    sellerOwnedModules.has(code) || sellerOwnedAliases.has(code) || isSellerAllowedModule(code);

  if (panelMode === PANEL_MODES.SELLER) {
    if (expandedModuleCodes.some(isSellerBlockedModule)) return false;
    if (!expandedModuleCodes.some(isSellerOwnedCode)) return false;
    if (role === "seller") return true;
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
