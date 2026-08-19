export const PANEL_MODES = {
  ADMIN: "admin",
  SELLER: "seller",
  INFLUENCER: "influencer",
};

// const normalizeMode = (value) =>
//   String(value || "")
//     .trim()
//     .toLowerCase();

// const resolvePanelMode = (value) => {
//   const mode = normalizeMode(value);
//   if (["seller", "sellers", "seller-panel", "seller_panel"].includes(mode)) {
//     return PANEL_MODES.SELLER;
//   }
//   if (["admin", "administrator", "admin-panel", "admin_panel"].includes(mode)) {
//     return PANEL_MODES.ADMIN;
//   }
//   return "";
// };

// const detectModeFromRuntime = () => {
//   if (typeof window === "undefined") {
//     return "";
//   }

//   const host = normalizeMode(window.location.hostname);
//   const path = normalizeMode(window.location.pathname);
//   if (host.includes("seller") || path.startsWith("/seller")) {
//     return PANEL_MODES.SELLER;
//   }

//   return "";
// };

// const requestedMode = String(process.env.REACT_APP_PANEL_MODE || "")
//   .trim()
//   .toLowerCase();
// const configuredMode = Object.values(PANEL_MODES).includes(requestedMode)
//   ? requestedMode
//   : PANEL_MODES.ADMIN;

const configuredMode =PANEL_MODES.SELLER;

export const getPanelMode = () => configuredMode;

export const isSellerPanel = () => getPanelMode() === PANEL_MODES.SELLER;
export const isAdminPanel = () => getPanelMode() === PANEL_MODES.ADMIN;
export const isInfluencerPanel = () => getPanelMode() === PANEL_MODES.INFLUENCER;

export const PANEL_ROLE_RULES = {
  [PANEL_MODES.ADMIN]: {
    allowedRoles: ["super-admin", "admin", "sub-admin"],
    fullAccessRoles: ["super-admin"],
    restrictedRole: "sub-admin",
    blockedRoles: ["seller", "seller-admin", "seller-sub-admin", "buyer"],
  },
  [PANEL_MODES.SELLER]: {
    allowedRoles: ["seller", "seller-admin", "seller-sub-admin"],
    fullAccessRoles: ["seller"],
    restrictedRole: "seller-sub-admin",
    blockedRoles: ["super-admin", "admin", "sub-admin", "buyer"],
  },
  [PANEL_MODES.INFLUENCER]: {
    allowedRoles: ["influencer"],
    fullAccessRoles: [],
    restrictedRole: "influencer",
    blockedRoles: [
      "super-admin",
      "admin",
      "sub-admin",
      "seller",
      "seller-admin",
      "seller-sub-admin",
      "buyer",
    ],
  },
};

export const getPanelRoleRules = (panelMode = getPanelMode()) =>
  PANEL_ROLE_RULES[panelMode] || PANEL_ROLE_RULES[PANEL_MODES.ADMIN];

export const getDefaultAppHome = (panelMode = getPanelMode()) =>
  panelMode === PANEL_MODES.INFLUENCER ? "/app/dashboard" : "/app/home";
