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
  rbac: "Roles & Permissions",
  admin_users: "Admin/Sub Admin Management",
  "admin-users": "Admin/Sub Admin Management",
  users: "User Management",
  sellers: "Seller/Vendor Management",
  seller_kyc: "Seller KYC Management",
  "seller-kyc": "Seller KYC Management",
  seller_bank: "Seller Bank Management",
  "seller-bank": "Seller Bank Management",
  "seller-management": "Seller Admin Management",
  "sellers/commissions": "Seller Commissions",
  products: "Product Management",
  categories: "Category Management",
  sub_categories: "Sub Category Management",
  "sub-categories": "Sub Category Management",
  sub_sub_categories: "Sub Sub Category Management",
  "sub-sub-categories": "Sub Sub Category Management",
  brands: "Brand Management",
  option_masters: "Option Master Management",
  "option-masters": "Option Master Management",
  option_values: "Option Value Management",
  "option-values": "Option Value Management",
  platform: "Platform Catalog",
  cms: "CMS Management",
  cms_pages: "CMS/Page Management",
  "cms-pages": "CMS/Page Management",
  warranty: "Warranty",
  inventory: "Inventory Management",
  carts: "Cart Management",
  orders: "Order Management",
  returns: "Return Management",
  payments: "Payment Management",
  wallets: "Wallet Management",
  subscriptions: "Subscriptions",
  coupons: "Coupon Management",
  banners: "Banner Management",
  reviews: "Review & Rating Management",
  notifications: "Notification Management",
  reports: "Report Management",
  tax: "Tax Management",
  locations: "Location Management",
  countries: "Country Management",
  states: "State Management",
  cities: "City Management",
  zip_codes: "Zip Code Management",
  "zip-codes": "Zip Code Management",
  delivery: "Delivery Management",
  pricing: "Pricing & Promotions",
  "dynamic-pricing": "Dynamic Pricing",
  referral: "Referral Commerce",
  loyalty: "Loyalty",
  recommendations: "Recommendations",
  fraud: "Fraud Management",
};

const MODULE_TABS = {
  rbac: "Access Control",
  admin_users: "Access Control",
  "admin-users": "Access Control",
  admin: "Admin",
  users: "Users & Sellers",
  sellers: "Users & Sellers",
  seller_kyc: "Users & Sellers",
  "seller-kyc": "Users & Sellers",
  seller_bank: "Users & Sellers",
  "seller-bank": "Users & Sellers",
  "seller-management": "Seller Management",
  "sellers/commissions": "Users & Sellers",
  products: "Catalog",
  categories: "Catalog",
  sub_categories: "Catalog",
  sub_sub_categories: "Catalog",
  brands: "Catalog",
  option_masters: "Catalog",
  option_values: "Catalog",
  platform: "Catalog",
  cms: "Content",
  cms_pages: "Content",
  "cms-pages": "Content",
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
  countries: "Settings",
  states: "Settings",
  cities: "Settings",
  zip_codes: "Settings",
  "zip-codes": "Settings",
  subscriptions: "Payments & Finance",
  coupons: "Marketing",
  banners: "Content",
  reviews: "Shopping",
  notifications: "Marketing",
  reports: "Insights & Risk",
  pricing: "Marketing",
  "dynamic-pricing": "Marketing",
  loyalty: "Marketing",
  referral: "Marketing",
  recommendations: "Marketing",
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
  admin:      "home",
  analytics:  "home",
  rbac:       "roles-permissions",
  admin_users:"admin-users",
  "admin-users": "admin-users",
  // Catalog
  products:          "product-catalog",
  categories:        "categories",
  sub_categories:    "categories",
  sub_sub_categories:"categories",
  brands:            "brands",
  option_masters:    "product-options",
  option_values:     "product-option-values",
  platform:          "categories",
  warranty:          "warranty",
  // Inventory
  inventory:"inventory-overview",
  // Orders
  carts:        "orders",
  orders:       "orders",
  returns:      "order-return-reasons",
  reviews:      "product-reviews",
  payments:     "orders",
  wallets:      "transactions",
  subscriptions:"settings",
  // Users
  users:              "users",
  sellers:            "seller",
  seller_kyc:         "seller",
  seller_bank:        "seller",
  "seller-management": "seller-users",
  "sellers/commissions":"transactions",
  // CMS/Content
  cms:       "content-management",
  cms_pages: "content-management",
  banners:   "content-management",
  // Marketing
  coupons:         "discount-coupons",
  pricing:         "discount-coupons",
  "dynamic-pricing":"special-price",
  referral:        "referral-commerce",
  loyalty:         "reward-on-purchase",
  recommendations: "similar-products",
  notifications:   "messages",
  reports:         "reports-sales",
  // Tax & Compliance
  tax:       "tax",
  locations: "country",
  countries: "country",
  states:    "state",
  cities:    "city",
  zip_codes: "zip-codes",
  delivery:  "shipping-packages",
  // Settings / misc
  fraud: "settings",
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

  // Users & Access — admin_users is its own module per RBAC guide
  [["/admin-users"], ["admin_users", "rbac"]],
  [["/user-permissions"], ["admin_users", "rbac"]],
  [["/roles-permissions"], ["rbac"]],
  [["/module-management"], ["rbac"]],
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

  // Catalog Management — categories
  [["/categories", "/category-attributes"], ["categories", "platform", "products"]],
  // Catalog Management — brands
  [["/brands"], ["brands", "platform", "products"]],
  // Catalog Management — option masters / values
  [
    ["/product-options", "/product-option-value", "/product-option-values"],
    ["option_masters", "option_values", "platform", "products"],
  ],
  // Catalog Management — other platform catalog
  [
    [
      "/collections", "/product-families", "/product-variants",
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
  [["/country"], ["countries", "locations"]],
  [["/state"], ["states", "locations"]],
  [["/city"], ["cities", "locations"]],
  [["/zip-codes", "/zipcode"], ["zip_codes", "locations"]],
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
