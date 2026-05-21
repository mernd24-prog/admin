const trimRoute = (value = "") =>
  `/${String(value || "")
    .replace(/^\/app/, "")
    .replace(/\/:\w+\??/g, "")
    .replace(/\/+$/, "")
    .replace(/^\/+/, "")}`.replace(/\/$/, "") || "/";

export const SELF_SERVICE_ROUTES = ["/profile", "/changePassword"];

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
  delivery: "shipping-packages",
  // Settings / misc
  fraud: "settings",
  cms:   "content-management",
};

// ─── Route → modules mapping (for permission checks) ─────────────────────────
const ROUTE_MODULES = [
  // Core
  [["/home"], ["admin", "analytics"]],

  // Users & Access
  [["/admin-users", "/user-permissions", "/roles-permissions"], ["rbac", "users"]],
  [["/activity-logs"], ["rbac"]],
  [["/users", "/users-addresses", "/messages"], ["users"]],
  [["/transactions"], ["users", "wallets", "sellers/commissions"]],
  [["/seller", "/seller-staff"], ["sellers"]],

  // Catalog Management — products
  [
    [
      "/product-catalog", "/add-product", "/draft-products",
      "/pending-products", "/rejected-products",
      "/product-families", "/product-option-value", "/product-option-values",
      "/product-options", "/product-tags", "/threshold-products",
      "/brands", "/store", "/finish", "/batch", "/bar-code", "/hsn-code", "/qty-head",
      "/seo-media",
    ],
    ["products"],
  ],

  // Catalog Management — platform
  [
    [
      "/categories", "/category-attributes", "/collections",
      "/product-variants", "/product-dimensions",
      "/tax-structure", "/tax-category", "/tax-category-rules",
      "/state", "/city", "/country", "/zipcode", "/shipping-duration",
    ],
    ["platform", "products"],
  ],

  // Inventory Management
  [
    [
      "/inventory-overview", "/variant-inventory",
      "/inventory-adjustment", "/warehouse", "/low-stock-alerts",
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
      "/similar-products", "/frequently-bought-together",
      "/PPC-promotions-management", "/reward-on-purchase",
      "/product-event-weightages", "/recommended-product-tag-weightages",
      "/badges", "/ribbons", "/campaigns",
    ],
    ["pricing"],
  ],
  [["/referral-commerce"], ["referral", "pricing"]],
  [["/promotions-banners"], ["cms", "pricing"]],

  // Tax & Compliance
  [["/tax", "/subTax", "/tax-rule"], ["tax"]],
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
