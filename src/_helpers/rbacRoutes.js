const trimRoute = (value = "") =>
  `/${String(value || "")
    .replace(/^\/app/, "")
    .replace(/\/:\w+\??/g, "")
    .replace(/\/+$/, "")
    .replace(/^\/+/, "")}`.replace(/\/$/, "") || "/";

export const SELF_SERVICE_ROUTES = ["/profile", "/changePassword"];

export const MODULE_TAB_ORDER = [
  "Access Control",
  "Admin",
  "Users & Sellers",
  "Seller Management",
  "Catalog",
  "Content",
  "Shopping",
  "Payments & Finance",
  "Marketing",
  "Insights & Risk",
  "Settings",
  "Assigned",
  "Access",
];

const MODULE_LABELS = {
  admin: "Admin Dashboard",
  analytics: "Analytics",
  rbac: "RBAC Management",
  users: "User Management",
  sellers: "Seller Management",
  "seller-management": "Seller Admin Management",
  "sellers/commissions": "Seller Commissions",
  products: "Product Management",
  platform: "Platform Catalog",
  cms: "CMS Management",
  warranty: "Warranty",
  inventory: "Inventory Management",
  carts: "Cart Management",
  orders: "Order Management",
  returns: "Return Management",
  payments: "Payment Management",
  wallets: "Wallet Management",
  subscriptions: "Subscriptions",
  tax: "Tax Management",
  locations: "Location Management",
  delivery: "Delivery Management",
  pricing: "Pricing & Promotions",
  "dynamic-pricing": "Dynamic Pricing",
  referral: "Referral Commerce",
  loyalty: "Loyalty",
  recommendations: "Recommendations",
  notifications: "Notifications",
  fraud: "Fraud Management",
};

const MODULE_TABS = {
  rbac: "Access Control",
  admin: "Admin",
  users: "Users & Sellers",
  sellers: "Users & Sellers",
  "seller-management": "Seller Management",
  "sellers/commissions": "Users & Sellers",
  products: "Catalog",
  platform: "Catalog",
  cms: "Content",
  warranty: "Catalog",
  inventory: "Catalog",
  carts: "Shopping",
  orders: "Shopping",
  returns: "Shopping",
  delivery: "Shopping",
  payments: "Payments & Finance",
  wallets: "Payments & Finance",
  tax: "Payments & Finance",
  locations: "Settings",
  subscriptions: "Payments & Finance",
  pricing: "Marketing",
  "dynamic-pricing": "Marketing",
  loyalty: "Marketing",
  referral: "Marketing",
  recommendations: "Marketing",
  notifications: "Marketing",
  analytics: "Insights & Risk",
  fraud: "Insights & Risk",
};

const formatModuleLabel = (value = "") =>
  String(value || "")
    .replace(/[-/_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

// ─── Default landing route per module ────────────────────────────────────────
export const MODULE_DEFAULT_ROUTES = {
  // Core
  admin:    "home",
  analytics:"home",
  rbac:     "admin-users",
  // Catalog
  products: "product-catalog",
  platform: "categories",
  warranty: "warranty",
  // Inventory
  inventory:"inventory-overview",
  // Orders
  carts:        "orders",
  orders:       "orders",
  returns:      "order-return-reasons",
  payments:     "orders",
  wallets:      "transactions",
  subscriptions:"settings",
  // Users
  users:              "users",
  sellers:            "seller",
  "seller-management": "seller-users",
  "sellers/commissions":"transactions",
  // Marketing
  pricing:        "discount-coupons",
  "dynamic-pricing":"special-price",
  referral:       "referral-commerce",
  loyalty:        "reward-on-purchase",
  recommendations:"similar-products",
  notifications:  "messages",
  // Tax & Compliance
  tax:      "tax",
  locations:"country",
  delivery: "shipping-packages",
  // Settings / misc
  fraud: "settings",
  cms:   "content-management",
};

export const getModuleLabel = (moduleSlug) => {
  const slug = String(moduleSlug || "").trim().toLowerCase();
  return MODULE_LABELS[slug] || formatModuleLabel(slug);
};

export const getModuleMeta = (moduleSlug) => {
  const slug = String(moduleSlug || "").trim().toLowerCase();
  const tab = MODULE_TABS[slug] || "Settings";
  return {
    slug,
    label: getModuleLabel(slug),
    name: getModuleLabel(slug),
    tab,
    route: MODULE_DEFAULT_ROUTES[slug] || slug,
    order: MODULE_TAB_ORDER.indexOf(tab) === -1
      ? MODULE_TAB_ORDER.length
      : MODULE_TAB_ORDER.indexOf(tab),
  };
};

// ─── Route → modules mapping (for permission checks) ─────────────────────────
const ROUTE_MODULES = [
  // Core
  [["/home"], ["admin", "analytics"]],

  // Users & Access
  [["/admin-users", "/user-permissions", "/roles-permissions", "/module-management"], ["rbac"]],
  [["/activity-logs"], ["rbac"]],
  [["/users", "/users-addresses"], ["users"]],
  [["/transactions"], ["users", "wallets", "sellers/commissions"]],
  [["/seller", "/seller-staff", "/seller-users"], ["sellers"]],

  // Catalog Management — products
  [
    [
      "/product-catalog", "/add-product", "/draft-products",
      "/pending-products", "/rejected-products",
      "/product-tags", "/store", "/bar-code", "/qty-head",
      "/seo-media",
    ],
    ["products"],
  ],

  // Catalog Management — platform
  [
    [
      "/categories", "/category-attributes", "/collections",
      "/brands", "/product-families", "/product-option-value",
      "/product-option-values", "/product-options", "/product-variants",
      "/product-dimensions", "/finish", "/batch",
      "/tax-structure", "/tax-category", "/tax-category-rules",
      "/shipping-duration",
    ],
    ["platform", "products"],
  ],

  // Inventory Management
  [
    [
      "/inventory-overview", "/variant-inventory",
      "/seller-Product-Inventory", "/inventory-adjustment",
      "/warehouse", "/low-stock-alerts", "/threshold-products",
    ],
    ["inventory", "products"],
  ],

  // Orders Management
  [
    [
      "/orders", "/view-orders", "/order-status",
      "/gift-card-orders", "/order-cancellation-reasons", "/product-reviews",
      "/refunds", "/shipment-tracking",
    ],
    ["orders"],
  ],
  [["/order-return-reasons"], ["returns", "orders"]],
  [["/subscription-orders", "/view-subscription-orders"], ["subscriptions", "orders"]],

  // Marketing
  [
    [
      "/discount-coupons", "/special-price", "/volume-discounts",
      "/PPC-promotions-management",
      "/product-event-weightages", "/recommended-product-tag-weightages",
      "/badges", "/ribbons", "/campaigns",
    ],
    ["pricing"],
  ],
  [["/similar-products", "/frequently-bought-together"], ["recommendations"]],
  [["/reward-on-purchase"], ["loyalty"]],
  [["/referral-commerce"], ["referral"]],
  [["/promotions-banners"], ["cms", "pricing"]],

  // Tax & Compliance
  [["/tax", "/subTax", "/tax-rule", "/hsn-code"], ["tax"]],
  [["/state", "/city", "/country", "/zipcode", "/zip-codes"], ["locations"]],
  [["/warranty"], ["warranty", "products"]],
  [
    [
      "/shipping-company-users", "/shipping-packages",
      "/shipping-profile", "/pickup-addresses", "/delivery-staff",
      "/shipping-duration",
    ],
    ["delivery"],
  ],

  // Reports & Analytics
  [
    [
      "/reports-sales", "/reports-products",
      "/reports-inventory", "/reports-sellers",
    ],
    ["analytics"],
  ],

  // CMS / Content
  [
    [
      "/content-management", "/content-management/all",
      "/content-management/content", "/content-management/faq",
      "/content-management/homepage-slide", "/content-management/banner-location",
      "/content-management/promotion-banner", "/content-management/holiday",
      "/content-management/privacy-policy", "/content-management/return-policy",
      "/content-management/payment-policy", "/content-management/terms-and-conditions",
      "/content-management/help-and-support",
      "/privacy-policy",
    ],
    ["cms", "platform"],
  ],

  // Settings
  [
    ["/settings", "/setting", "/payment-settings", "/seo-settings", "/rotate"],
    ["admin", "platform", "fraud"],
  ],

  // Notifications
  [["/messages"], ["notifications", "users"]],

  // Misc legacy
  [
    [
      "/supplier", "/goods-receive", "/stoks", "/inventory",
      "/store/store-page", "/product", "/purchase", "/sale",
      "/ledger", "/upload-file",
    ],
    ["admin", "products"],
  ],
];

export const getModuleRoute = (moduleSlug) =>
  MODULE_DEFAULT_ROUTES[String(moduleSlug || "").trim().toLowerCase()] ||
  getModuleMeta(moduleSlug).route ||
  String(moduleSlug || "").trim();

export const isSelfServiceRoute = (path) => {
  const route = trimRoute(path);
  return SELF_SERVICE_ROUTES.some((r) => route === r);
};

export const getRouteModuleCandidates = (path) => {
  const route = trimRoute(path);
  const matched = ROUTE_MODULES.find(([prefixes]) =>
    prefixes.some((p) => route === p || route.startsWith(`${p}/`))
  );
  return matched ? matched[1] : [];
};
