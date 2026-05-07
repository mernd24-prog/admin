export const PANEL_MODES = {
  ADMIN: "admin",
  SELLER: "seller",
};

const normalizeMode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const configuredMode =
  normalizeMode(process.env.REACT_APP_PANEL_MODE) ||
  normalizeMode(process.env.VITE_PANEL_MODE) ||
  normalizeMode(process.env.REACT_APP_APP_MODE) ||
  normalizeMode(process.env.VITE_APP_MODE) ||
  PANEL_MODES.SELLER;

export const getPanelMode = () =>
  configuredMode === PANEL_MODES.SELLER
    ? PANEL_MODES.SELLER
    : PANEL_MODES.ADMIN;

export const isSellerPanel = () => getPanelMode() === PANEL_MODES.SELLER;
export const isAdminPanel = () => getPanelMode() === PANEL_MODES.ADMIN;

export const PANEL_ROLE_RULES = {
  [PANEL_MODES.ADMIN]: {
    allowedRoles: ["super-admin", "admin", "sub-admin"],
    fullAccessRoles: ["super-admin", "admin"],
    restrictedRole: "sub-admin",
    blockedRoles: ["seller", "seller-sub-admin", "buyer"],
  },
  [PANEL_MODES.SELLER]: {
    allowedRoles: ["seller", "seller-sub-admin"],
    fullAccessRoles: ["seller"],
    restrictedRole: "seller-sub-admin",
    blockedRoles: ["super-admin", "admin", "sub-admin", "buyer"],
  },
};

export const getPanelRoleRules = (panelMode = getPanelMode()) =>
  PANEL_ROLE_RULES[panelMode] || PANEL_ROLE_RULES[PANEL_MODES.ADMIN];

export const getDefaultAppHome = () => "/app/home";
