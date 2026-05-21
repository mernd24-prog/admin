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
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(ALLOWED_MODULES_KEY);
  localStorage.removeItem("authFlowState");
  localStorage.removeItem("authMode");
  localStorage.removeItem("sellerOnboardingToken");
  localStorage.removeItem("sellerOnboardingUser");
  sessionStorage.removeItem("EcomAdmin");
};

export const hasModuleAccess = (moduleCode) => {
  const role = normalizeRole(getStoredRole());
  const panelMode = getPanelMode();
  const { fullAccessRoles, restrictedRole } = getPanelRoleRules(panelMode);
  const moduleCodes = Array.isArray(moduleCode) ? moduleCode : [moduleCode];

  if (!isAllowedRoleForPanel(role, panelMode)) return false;
  if (!moduleCode) return false;

  const moduleAliases = {
    dashboard: ["home", "dashboard", "analytics"],
    products: ["products", "product-catalog", "seller-product-inventory", "categories", "category-attributes"],
    orders: ["orders", "order_status", "subscription_orders", "gift-card-orders"],
    pricing: ["pricing", "coupons", "discount-coupons", "discount_coupons"],
    referral: ["referral", "referral-commerce", "influencers"],
    delivery: ["delivery", "shipping_packages", "shipping_profile", "pickup_addresses", "delivery-staff"],
    sellers: ["sellers", "seller", "vendors", "profile", "seller-management"],
    "seller-management": ["seller-management", "seller-admins", "seller-sub-admins", "seller-hierarchy"],
    "sellers/commissions": ["sellers/commissions", "commissions", "transactions"],
    notifications: ["notifications", "messages"],
    returns: ["returns", "order_return_reasons"],
    analytics: ["analytics", "dashboard", "home"],
    users: ["users", "admin_users"],
    rbac: ["rbac", "admin_users"],
    tax: ["tax", "tax-structure", "tax-category"],
    system: ["system", "settings"],
  };

  const expandedModuleCodes = moduleCodes
    .map(String)
    .flatMap((code) => moduleAliases[code] || [code]);

  const sellerOwnedModules = new Set([
    "dashboard",
    "products",
    "orders",
    "pricing",
    "notifications",
    "analytics",
    "sellers",
    "seller-management",
    "sellers/commissions",
    "returns",
    "delivery",
  ]);

  const sellerOwnedAliases = new Set(
    Object.entries(moduleAliases)
      .filter(([moduleKey]) => sellerOwnedModules.has(moduleKey))
      .flatMap(([, aliases]) => aliases)
  );

  const isSellerOwnedCode = (code) =>
    sellerOwnedModules.has(code) || sellerOwnedAliases.has(code);

  if (panelMode === PANEL_MODES.SELLER) {
    if (!expandedModuleCodes.some(isSellerOwnedCode)) return false;
    if (fullAccessRoles.includes(role)) return true;
  } else if (fullAccessRoles.includes(role)) {
    return true;
  }

  const allowedModules = getAllowedModules().map(String);
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
