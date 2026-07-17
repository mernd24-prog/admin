const trimRoute = (value = "") =>
  `/${String(value || "")
    .replace(/^\/app/, "")
    .replace(/\/:\w+\??/g, "")
    .replace(/\/+$/, "")
    .replace(/^\/+/, "")}`.replace(/\/$/, "") || "/";

export const normalizeModuleCode = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");

export const routeCodeFromPath = (routePath = "") =>
  String(routePath || "")
    .replace(/^\/app\/?/, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\/:\w+\??/g, "");

export const SELF_SERVICE_ROUTES = ["/profile", "/changePassword"];

export const SELLER_BLOCKED_ROUTE_CODES = new Set([
  "admin-users",
  "user-permissions",
  "roles-permissions",
  "module-management",
  "activity-logs",
  "rbac-audit-log",
  "permission-templates",
  "users",
  "users-addresses",
  "transactions",
  "seller",
  "seller/view",
  "seller-management",
  "seller-staff",
  "seller-users",
  "seller-organizations",
  "seller-kyc",
  "seller-bank",
  "seller-kyc-detail",
  "seller-bank-detail",
  "seller-onboarding",
  "seller-status",
  "country",
  "state",
  "city",
  "zip-codes",
  "platform-commission",
  "seller-tiers",
  "payout-ops-queue",
  "negative-balances",
  "api-keys",
  "feature-flags",
  "webhooks",
  "system-health",
  "queue-management",
  "dead-letter-queue",
  "warehouse",
  "inventory-transactions",
]);

export const SELLER_BLOCKED_MODULE_CODES = new Set([
  "rbac",
  "admin-users",
  "admin_users",
  "users",
  "locations",
  "countries",
  "states",
  "cities",
  "zip-codes",
  "zip_codes",
  "seller-kyc",
  "seller_kyc",
  "seller-bank",
  "seller_bank",
  "platform-commission",
  "seller-tiers",
  "payout-ops-queue",
  "negative-balances",
  "api-keys",
  "feature-flags",
  "webhooks",
  "system-health",
  "queue-management",
  "dead-letter-queue",
]);

export const SELLER_ALLOWED_MODULE_CODES = new Set([
  "seller-dashboard",
  "products",
  "reviews",
  "inventory",
  "orders",
  "returns",
  "cancellations",
  "queries",
  "coupons",
  "pricing",
  "notifications",
  "delivery",
  "analytics",
  "reports",
  "seller-management",
  "sellers/commissions",
  "seller-payouts",
  "seller-cod-collections",
  "cod-config",
  "tax",
  "tax-invoices",
  "credit-notes",
]);

export const isSellerBlockedRoute = (routePath = "") => {
  const code = routeCodeFromPath(routePath);
  return Array.from(SELLER_BLOCKED_ROUTE_CODES).some(
    (blocked) => code === blocked || code.startsWith(`${blocked}/`),
  );
};

export const isSellerBlockedModule = (moduleCode = "") =>
  SELLER_BLOCKED_MODULE_CODES.has(normalizeModuleCode(moduleCode));

export const isSellerAllowedModule = (moduleCode = "") => {
  const normalized = normalizeModuleCode(moduleCode);
  return !isSellerBlockedModule(normalized) && SELLER_ALLOWED_MODULE_CODES.has(normalized);
};

export const MODULE_TAB_ORDER = [
  "Dashboard",
  "Catalog Management",
  "Inventory Management",
  "Orders Management",
  "Payments & Finance",
  "Shipping & Fulfilment",
  "Returns & Cancellations",
  "Invoices & Taxation",
  "Seller Finance & Payouts",
  "Commerce Settings",
  "Users & Access",
  "Marketing",
  "Reports & Analytics",
  "Location Management",
  "Settings",
  "Access Control",
  "Admin",
  "Users & Sellers",
  "Seller Management",
  "Catalog",
  "Content",
  "Shopping",
  "Payments & Finance",
  "Insights & Risk",
  "Assigned",
  "Access",
];

const MODULE_LABELS = {
  admin: "Admin Dashboard",
  "seller-dashboard": "Seller Dashboard",
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
  "my-organizations": "My Store",
  "seller-organizations": "Seller Store Management",
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
  "cod-collections": "COD Collections",
  "commerce-settings": "Commerce Settings",
  "platform-commission": "Commerce Settings",
  "seller-tiers": "Commerce Settings",
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
  referral: "Referral Commerce",
  loyalty: "Loyalty",
  recommendations: "Recommendations",
  fraud: "Fraud Management",
  deals: "Deal Management",
  "payments-finance": "Payments & Finance",
  "shipping-fulfilment": "Shipping & Fulfilment",
  "returns-cancellations": "Returns & Cancellations",
  queries: "Queries",
  "help-support": "Help & Support",
  "invoices-taxation": "Invoices & Taxation",
  "seller-finance-payouts": "Seller Finance & Payouts",
  "commerce-settings-menu": "Commerce Settings",
  "deal-management": "Deal Management",
  cancellations: "Cancellation Management",
  "seller-onboarding": "Seller Onboarding",
  "seller-status": "Seller Status Management",
  "seller-sub-admins": "Seller Sub-Admin Management",
  "content-pages": "CMS Pages",
  "users-addresses": "User Addresses",
  preferences: "Preferences",
  collections: "Collections",
  badges: "Badges & Ribbons",
  "wallet-management": "Wallet Management",
  "notification-templates": "Notification Templates",
  "fraud-cases": "Fraud Cases",
  // Tax & Finance
  "tax-invoices": "Tax Invoice Management",
  "credit-notes": "Credit Note Management",
  // Subscription plans
  "subscription-plans": "Subscription Plan Management",
  // Payment config
  "cod-config": "COD Configuration",
  chargebacks: "Chargeback Management",
  // Payouts
  "seller-payouts": "Seller Payout Management",
  "seller-cod-collections": "COD Collections",
  "payout-ops-queue": "Payout Ops Queue",
  "negative-balances": "Negative Balance Recovery",
  // Deal sub-sections
  "deal-payouts": "Deal Payout Management",
  "deal-sponsorships": "Deal Sponsorship Management",
  // Referral
  "influencer-management": "Influencer Management",
  // Analytics
  "analytics-events": "Analytics Events",
  // Platform settings
  "api-keys": "API Key Management",
  "feature-flags": "Feature Flags",
  webhooks: "Webhook Management",
  // System management
  "system-health": "System Health",
  "queue-management": "Queue Management",
  "dead-letter-queue": "Dead Letter Queue",
};

const MODULE_TABS = {
  rbac: "Users & Access",
  admin_users: "Users & Access",
  "admin-users": "Users & Access",
  admin: "Dashboard",
  "seller-dashboard": "Dashboard",
  users: "Users & Access",
  sellers: "Users & Access",
  seller_kyc: "Users & Access",
  "seller-kyc": "Users & Access",
  seller_bank: "Users & Access",
  "seller-bank": "Users & Access",
  "seller-management": "Users & Access",
  "seller-organizations": "Users & Access",
  "sellers/commissions": "Seller Finance & Payouts",
  products: "Catalog Management",
  categories: "Catalog Management",
  sub_categories: "Catalog Management",
  "sub-categories": "Catalog Management",
  sub_sub_categories: "Catalog Management",
  "sub-sub-categories": "Catalog Management",
  brands: "Catalog Management",
  option_masters: "Catalog Management",
  "option-masters": "Catalog Management",
  option_values: "Catalog Management",
  "option-values": "Catalog Management",
  platform: "Catalog Management",
  warranty: "Catalog Management",
  reviews: "Catalog Management",
  inventory: "Inventory Management",
  carts: "Orders Management",
  orders: "Orders Management",
  returns: "Returns & Cancellations",
  queries: "Support",
  "help-support": "Support",
  payments: "Payments & Finance",
  "cod-collections": "Payments & Finance",
  "commerce-settings": "Commerce Settings",
  wallets: "Payments & Finance",
  subscriptions: "Orders Management",
  coupons: "Commerce Settings",
  pricing: "Commerce Settings",
  banners: "Marketing",
  notifications: "Marketing",
  loyalty: "Marketing",
  referral: "Marketing",
  recommendations: "Marketing",
  tax: "Invoices & Taxation",
  delivery: "Shipping & Fulfilment",
  locations: "Location Management",
  countries: "Location Management",
  states: "Location Management",
  cities: "Location Management",
  zip_codes: "Location Management",
  "zip-codes": "Location Management",
  reports: "Reports & Analytics",
  analytics: "Reports & Analytics",
  cms: "Settings",
  cms_pages: "Settings",
  "cms-pages": "Settings",
  fraud: "Payments & Finance",
  deals: "Marketing",
  "deal-management": "Marketing",
  cancellations: "Returns & Cancellations",
  "seller-onboarding": "Users & Access",
  "seller-status": "Users & Access",
  "seller-sub-admins": "Users & Access",
  "content-pages": "Settings",
  "users-addresses": "Users & Access",
  preferences: "Settings",
  collections: "Catalog Management",
  badges: "Marketing",
  "wallet-management": "Payments & Finance",
  "notification-templates": "Marketing",
  "fraud-cases": "Payments & Finance",
  // Tax & Finance
  "tax-invoices": "Invoices & Taxation",
  "credit-notes": "Invoices & Taxation",
  // Subscription plans
  "subscription-plans": "Commerce Settings",
  // Payment config & chargebacks
  "cod-config": "Commerce Settings",
  chargebacks: "Payments & Finance",
  // Payouts
  "seller-payouts": "Seller Finance & Payouts",
  "seller-cod-collections": "Seller Finance & Payouts",
  "payout-ops-queue": "Seller Finance & Payouts",
  "negative-balances": "Seller Finance & Payouts",
  // Deal sub-sections
  "deal-payouts": "Marketing",
  "deal-sponsorships": "Marketing",
  // Referral
  "influencer-management": "Marketing",
  // Analytics
  "analytics-events": "Reports & Analytics",
  // Platform settings
  "api-keys": "Settings",
  "feature-flags": "Settings",
  webhooks: "Settings",
  // System management
  "system-health": "Settings",
  "queue-management": "Settings",
  "dead-letter-queue": "Settings",
};

const formatModuleLabel = (value = "") =>
  String(value || "")
    .replace(/[-/_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

// ─── Default landing route per module ────────────────────────────────────────
export const MODULE_DEFAULT_ROUTES = {
  // Core
  admin:      "home",
  "seller-dashboard": "home",
  analytics:  "analytics",
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

  // Inventory
  inventory:"inventory",
  // Orders
  carts:        "carts",
  orders:       "orders",
  returns:      "returns",
  queries:      "queries",
  "help-support": "help-support",
  reviews:      "product-reviews",
  payments:     "payments",
  "cod-collections": "cod-collections",
  wallets:      "wallet-transactions",
  subscriptions:"subscription-orders",
  "payments-finance": "payments",
  "shipping-fulfilment": "shipment-tracking",
  "returns-cancellations": "returns",
  "invoices-taxation": "tax-invoices",
  "seller-finance-payouts": "seller-finance",
  "commerce-settings-menu": "commerce-settings",
  // Users
  users:              "users",
  sellers:            "seller",
  seller_kyc:         "seller",
  "seller-kyc":       "seller",
  seller_bank:        "seller",
  "seller-bank":      "seller",
  "seller-management":"seller-users",
  "my-organizations": "my-organizations",
  "sellers/commissions":"seller-finance",
  "seller-cod-collections": "seller-cod-collections",
  commission:           "platform-commission",
  "commission-rules":   "platform-commission",
  "platform-fee":       "platform-commission",
  "platform-fee-rules": "platform-commission",
  "commerce-settings":  "commerce-settings",
  "platform-commerce-settings": "platform-commission",
  "seller-commerce-config": "platform-commission",
  "commerce-templates": "platform-commission",
  "platform-commission": "platform-commission",
  "seller-tiers": "seller-tiers",
  // CMS/Content
 
  cms_pages: "content-management",
  
  // Marketing
  coupons:         "discount-coupons",
  pricing:         "discount-coupons",
  referral:        "referral-commerce",
  notifications:   "messages",
  reports:         "reports-sales",
  // Invoices & Taxation
  tax:       "tax",
  locations: "country",
  countries: "country",
  states:    "state",
  cities:    "city",
  zip_codes: "zip-codes",
  delivery:  "shipment-tracking",
  // Settings / misc
  fraud: "fraud-cases",
  "fraud-cases": "fraud-cases",
  deals: "deal-management",
  "deal-management": "deal-management",
  cancellations: "cancellations",
  "seller-onboarding": "seller",
  "seller-status": "seller",
  "category-attributes": "categories",
  "seller-sub-admins": "seller-sub-admins",
  "content-pages": "content-pages",
  "users-addresses": "users-addresses",
  preferences: "preferences",
  collections: "collections",
  badges: "badges",
  "wallet-management": "wallet-management",
  "notification-templates": "notification-templates",
  // Reports
  // Tax & Finance
  "tax-invoices": "tax-invoices",
  "credit-notes": "credit-notes",
  // Subscription plans
  "subscription-plans": "subscription-plans",
  // Payment config
  "cod-config": "cod-config",
  chargebacks: "chargebacks",
  // Payouts
  "seller-payouts": "seller-payouts",
  "payout-ops-queue": "payout-ops-queue",
  "negative-balances": "negative-balances",
  "platform-fee-config": "platform-commission",
  // Deal sub-sections
  "deal-payouts": "deal-payouts",
  "deal-sponsorships": "deal-sponsorships",
  // Referral
  "influencer-management": "influencer-management",
  // Analytics events
  "analytics-events": "analytics-events",
  // Platform settings
  "api-keys": "api-keys",
  "feature-flags": "feature-flags",
  webhooks: "webhooks",
  // System management
  "system-health": "system-health",
  "queue-management": "queue-management",
  "dead-letter-queue": "dead-letter-queue",
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
  [["/home"], ["admin", "seller-dashboard", "analytics"]],

  // Users & Access — admin_users is its own module per RBAC guide
  [["/admin-users"], ["admin_users", "rbac"]],
  [["/user-permissions"], ["admin_users", "rbac"]],
  [["/roles-permissions"], ["rbac"]],
  [["/module-management"], ["rbac"]],
  [["/activity-logs"], ["rbac"]],
  [["/rbac-audit-log"], ["rbac"]],
  [["/permission-templates"], ["rbac"]],
  [["/users", "/users-addresses"], ["users"]],
  [["/transactions"], ["users", "wallets", "sellers/commissions"]],
  [["/seller"], ["sellers"]],
  [["/seller-management", "/seller-staff", "/seller-users", "/seller-sub-admins", "/seller-organizations"], ["seller-management", "sellers"]],
  [["/my-organizations"], ["seller-management"]],
  [["/seller-kyc", "/seller-kyc-detail"], ["seller_kyc", "seller-kyc", "sellers"]],
  [["/seller-bank", "/seller-bank-detail"], ["seller_bank", "seller-bank", "sellers"]],
  [["/seller-onboarding"], ["sellers", "seller_kyc"]],

  // Catalog Management — products
  [
    [
      "/product-catalog", "/product-catalog/archived", "/store", "/bar-code", "/qty-head", "/seller-special-price-manager",
    ],
    ["products"],
  ],

  // Catalog Management — categories
  [["/categories", "/category-attributes"], ["categories", "platform", "products"]],
  // Catalog Management — brands
  [["/brands"], ["brands", "platform", "products"]],
  // Catalog Management — option masters / values
  [["/product-options"], ["option_masters", "platform", "products"]],
  [
    ["/product-option-value", "/product-option-values"],
    ["option_values", "option_masters", "platform", "products"],
  ],
  // Catalog Management — other platform catalog
  [
    [
      "/collections", "/product-families", "/product-variants",
      "/product-dimensions", "/finish", "/batch",
    ],
    ["platform", "products"],
  ],

  // Inventory Management
  [
    [
      "/inventory", "/inventory-overview", "/variant-inventory",
      "/seller-Product-Inventory", "/seller-product-inventory", "/inventory-adjustment",
      "/inventory-transactions", "/warehouse", "/low-stock-alerts", "/threshold-products", "/inventory-audit",
    ],
    ["inventory", "products"],
  ],

  // Orders Management
  [
    [
      "/orders", "/orders/view", "/view-orders", "/checkout-quote",
    ],
    ["orders"],
  ],
  [["/carts"], ["carts"]],
  [["/product-reviews"], ["reviews", "orders"]],
  [["/subscription-orders"], ["subscriptions", "orders"]],

  // Payments & Finance
  [["/payments", "/cod-collections"], ["payments", "wallets", "orders"]],
  [["/chargebacks"], ["payments", "orders"]],
  [["/fraud-cases", "/fraud"], ["fraud", "payments"]],
  [["/wallet-management", "/wallet-transactions"], ["wallets"]],

  // Shipping & Fulfilment
  [
    [
      "/shipping-company-users", "/shipment-tracking",
      "/shipping-duration",
    ],
    ["delivery"],
  ],

  // Returns & Cancellations
  [["/returns"], ["returns", "orders"]],
  [["/cancellations"], ["orders", "cancellations"]],
  [["/queries", "/help-support"], ["queries"]],

  // Seller Finance & Payouts
  [["/seller-finance", "/seller-wallet", "/seller-cod-collections", "/payout-ops-queue", "/negative-balances"], ["sellers/commissions"]],
  [["/seller-payouts"], ["sellers/commissions"]],

  // Commerce Settings
  [["/commerce-settings", "/platform-commission", "/seller-tiers"], ["commerce-settings", "platform-commission", "seller-tiers", "admin", "payments", "orders"]],
  [["/cod-config"], ["cod-config"]],
  [["/subscription-plans"], ["subscriptions", "platform", "admin"]],

  // Marketing
  [["/discount-coupons"], ["coupons", "pricing"]],
  [["/badges", "/ribbons"], ["badges", "platform", "pricing"]],
  [["/referral-commerce"], ["referral"]],
 

  // Invoices & Taxation
  [
    [
      "/tax", "/subTax", "/tax-rule", "/hsn-code",
      "/tax-documents", "/tax-invoices", "/credit-notes",
    ],
    ["tax"],
  ],
  [["/country"], ["countries", "locations"]],
  [["/state"], ["states", "locations"]],
  [["/city"], ["cities", "locations"]],
  [["/zip-codes", "/zipcode"], ["zip_codes", "locations"]],
  [["/warranty"], ["warranty", "products"]],

  // Analytics
  [["/analytics"], ["analytics", "reports"]],

  // Notifications
  [["/messages"], ["notifications", "users"]],

  // Reports & Analytics
  [
    [
      "/reports-sales", "/reports-products",
      "/reports-inventory", "/reports-sellers",
    ],
    ["reports", "analytics"],
  ],

  // CMS / Content
  

  // Settings
  [["/settings", "/setting", "/rotate"], ["admin", "platform", "fraud"]],

  // Seller Management — additional
  [["/seller-onboarding"], ["sellers", "seller_kyc"]],
  [["/seller-status"], ["sellers"]],
  [["/seller-sub-admins", "/seller-organizations"], ["seller-management", "sellers"]],

  // CMS & Content — additional
  [["/content-pages", "/auth-testimonials"], ["cms_pages", "cms"]],

  // Users — additional
  [["/users-addresses", "/user-addresses"], ["users"]],

  // Deals
  [["/deal-management", "/deals"], ["deals"]],

  // Notification templates
  [["/notification-templates"], ["notifications"]],

  // Collections & Badges
  [["/collections"], ["platform", "products"]],

  // Preferences
  [["/preferences"], ["admin"]],

  // Deal sub-sections
  [["/deal-payouts"], ["deals"]],
  [["/deal-sponsorships"], ["deals"]],

  

  // Analytics events
  [["/analytics-events"], ["analytics", "reports"]],

  // Platform settings
  [["/api-keys"], ["admin", "platform"]],
  [["/feature-flags"], ["admin", "platform"]],
  [["/webhooks"], ["admin", "platform"]],

  // System management
  [["/system-health"], ["admin"]],
  [["/queue-management"], ["admin"]],
  [["/dead-letter-queue"], ["admin"]],

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

const getAccessModuleSlug = (module = {}) =>
  normalizeModuleCode(
    typeof module === "string"
      ? module
      : module?.slug ||
          module?.moduleKey ||
          module?.moduleSlug ||
          module?.module ||
          module?.module_code?.module_code ||
          module?.module_code ||
          module?.metadata?.requiredModule,
  );

const moduleRouteEntry = (module, route, overrides = {}) => {
  const slug = getAccessModuleSlug(module);
  const meta = getModuleMeta(slug);
  const label =
    overrides.label ||
    (typeof module === "object" ? module.name || module.moduleName : "") ||
    meta.label;
  const tab =
    overrides.tab ||
    (typeof module === "object" ? module.tab || module.metadata?.tab : "") ||
    meta.tab;
  const routeCode = routeCodeFromPath(route || overrides.route || meta.route || slug);

  if (!routeCode) return null;

  return {
    module: slug,
    slug,
    label,
    name: label,
    tab,
    route: routeCode,
    module_code: routeCode,
    order: overrides.order ?? meta.order,
    source: typeof module === "object" ? module.source : undefined,
  };
};

export const getAccessModuleRouteEntries = (
  module,
  _options = {},
) => {
  const slug = getAccessModuleSlug(module);
  if (!slug) return [];

  const metadata = typeof module === "object" ? module.metadata || {} : {};
  const explicitRoutes = [
    metadata.routeKey,
    metadata.frontendRoute,
    metadata.route,
    typeof module === "object" ? module.routePath : "",
  ]
    .map(routeCodeFromPath)
    .filter(Boolean);
  const route = explicitRoutes[0] || getModuleRoute(slug);
  const entry = moduleRouteEntry(module, route);
  return entry ? [entry] : [];
};

export const isSelfServiceRoute = (path) => {
  const route = trimRoute(path);
  return SELF_SERVICE_ROUTES.some((r) => route === r);
};

const getDynamicRouteModuleCandidates = (path, modules = [], options = {}) => {
  const route = trimRoute(path);
  return (Array.isArray(modules) ? modules : [])
    .flatMap((module) =>
      getAccessModuleRouteEntries(module, options)
        .filter((entry) => {
          const entryRoute = trimRoute(entry.route);
          return route === entryRoute || route.startsWith(`${entryRoute}/`);
        })
        .flatMap((entry) => [
          entry.module,
          module?.metadata?.requiredModule,
          module?.requiredModule,
          module?.moduleKey,
          module?.moduleSlug,
          module?.slug,
        ]),
    )
    .map(normalizeModuleCode)
    .filter(Boolean);
};

export const getRouteModuleCandidates = (path, modules = [], options = {}) => {
  const route = trimRoute(path);
  const dynamicCandidates = getDynamicRouteModuleCandidates(path, modules, options);
  const matched = ROUTE_MODULES.find(([prefixes]) =>
    prefixes.some((p) => route === p || route.startsWith(`${p}/`))
  );
  return Array.from(new Set([...(matched ? matched[1] : []), ...dynamicCandidates]));
};
