const trimRoute = (value = "") =>
  `/${String(value || "")
    .replace(/^\/app/, "")
    .replace(/\/:\w+\??/g, "")
    .replace(/\/+$/, "")
    .replace(/^\/+/, "")}`.replace(/\/$/, "") || "/";

export const SELF_SERVICE_ROUTES = ["/profile", "/changePassword"];

export const MODULE_TAB_ORDER = [
  "Dashboard",
  "Catalog Management",
  "Inventory Management",
  "Orders Management",
  "Delivery & Shipping",
  "Users & Access",
  "Marketing",
  "Tax & Compliance",
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
  "commerce-settings": "Commerce Settings",
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
  deals: "Deal Management",
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
  users: "Users & Access",
  sellers: "Users & Access",
  seller_kyc: "Users & Access",
  "seller-kyc": "Users & Access",
  seller_bank: "Users & Access",
  "seller-bank": "Users & Access",
  "seller-management": "Users & Access",
  "sellers/commissions": "Orders Management",
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
  returns: "Orders Management",
  payments: "Orders Management",
  "commerce-settings": "Orders Management",
  wallets: "Orders Management",
  subscriptions: "Orders Management",
  coupons: "Marketing",
  pricing: "Marketing",
  banners: "Marketing",
  notifications: "Marketing",
  "dynamic-pricing": "Marketing",
  loyalty: "Marketing",
  referral: "Marketing",
  recommendations: "Marketing",
  tax: "Tax & Compliance",
  delivery: "Delivery & Shipping",
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
  fraud: "Settings",
  deals: "Marketing",
  "deal-management": "Marketing",
  cancellations: "Orders Management",
  "seller-onboarding": "Users & Access",
  "seller-status": "Users & Access",
  "seller-sub-admins": "Users & Access",
  "content-pages": "Settings",
  "users-addresses": "Users & Access",
  preferences: "Settings",
  collections: "Catalog Management",
  badges: "Marketing",
  "wallet-management": "Orders Management",
  "notification-templates": "Marketing",
  "fraud-cases": "Settings",
  // Tax & Finance
  "tax-invoices": "Tax & Compliance",
  "credit-notes": "Tax & Compliance",
  // Subscription plans
  "subscription-plans": "Orders Management",
  // Payment config & chargebacks
  "cod-config": "Orders Management",
  chargebacks: "Orders Management",
  // Payouts
  "seller-payouts": "Orders Management",
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
  warranty:          "warranty",
  // Inventory
  inventory:"inventory-overview",
  // Orders
  carts:        "carts",
  orders:       "orders",
  returns:      "returns",
  reviews:      "product-reviews",
  payments:     "payments",
  wallets:      "transactions",
  subscriptions:"subscription-orders",
  // Users
  users:              "users",
  sellers:            "seller",
  seller_kyc:         "seller-kyc",
  "seller-kyc":       "seller-kyc",
  seller_bank:        "seller-bank",
  "seller-bank":      "seller-bank",
  "seller-management":"seller-users",
  "sellers/commissions":"seller-finance",
  commission:           "commission-rules",
  "commission-rules":   "commission-rules",
  "platform-fee":       "platform-fee-config",
  "platform-fee-rules": "platform-fee-config",
  "commerce-settings":  "commerce-settings",
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
  notifications:   "notifications",
  "dynamic-pricing": "dynamic-pricing",
  subscriptions:   "subscriptions",
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
  fraud: "fraud-cases",
  "fraud-cases": "fraud-cases",
  deals: "deal-management",
  "deal-management": "deal-management",
  cancellations: "cancellations",
  "seller-onboarding": "seller-onboarding",
  "seller-status": "seller-status",
  "seller-sub-admins": "seller-sub-admins",
  "content-pages": "content-pages",
  "users-addresses": "users-addresses",
  preferences: "preferences",
  collections: "collections",
  badges: "badges",
  "wallet-management": "wallet-management",
  "notification-templates": "notification-templates",
  // Reports
  "reports-orders": "reports-orders",
  "reports-payments": "reports-payments",
  "reports-returns": "reports-returns",
  "reports-cancellations": "reports-cancellations",
  "reports-delivery": "reports-delivery",
  "reports-commissions": "reports-commissions",
  "reports-users": "reports-users",
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
  [["/home"], ["admin", "analytics"]],

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
  [["/seller-finance"], ["sellers/commissions"]],
  [["/seller"], ["sellers"]],
  [["/seller-management", "/seller-staff", "/seller-users", "/seller-sub-admins"], ["seller-management", "sellers"]],
  [["/seller-kyc", "/seller-kyc-detail"], ["seller_kyc", "seller-kyc", "sellers"]],
  [["/seller-bank", "/seller-bank-detail"], ["seller_bank", "seller-bank", "sellers"]],
  [["/seller-onboarding"], ["sellers", "seller_kyc"]],

  // Catalog Management — products
  [
    [
      "/product-catalog", "/add-product", "/draft-products",
      "/pending-products", "/change-pending-products", "/rejected-products",
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
      "/inventory-overview", "/variant-inventory",
      "/seller-Product-Inventory", "/seller-product-inventory", "/inventory-adjustment",
      "/inventory-transactions", "/warehouse", "/low-stock-alerts", "/threshold-products", "/inventory-audit",
    ],
    ["inventory", "products"],
  ],

  // Orders Management
  [
    [
      "/orders", "/orders/view", "/view-orders", "/order-status",
      "/gift-card-orders", "/order-cancellation-reasons", "/checkout-quote",
    ],
    ["orders"],
  ],
  [["/carts"], ["carts"]],
  [["/payments", "/refunds"], ["payments", "wallets", "orders"]],
  [["/commission-rules"], ["commission", "commission-rules", "sellers/commissions"]],
  [["/platform-fee-config"], ["platform-fee", "platform-fee-rules", "admin"]],
  [["/commerce-settings"], ["commerce-settings", "admin", "payments", "orders"]],
  [["/product-reviews"], ["reviews", "orders"]],
  [["/returns", "/order-return-reasons"], ["returns", "orders"]],
  [["/subscription-orders", "/view-subscription-orders"], ["subscriptions", "orders"]],

  // Marketing
  [["/discount-coupons"], ["coupons", "pricing"]],
  [
    [
      "/special-price", "/volume-discounts",
      "/PPC-promotions-management",
      "/badges", "/ribbons", "/campaigns",
    ],
    ["pricing"],
  ],
  [
    [
      "/similar-products", "/frequently-bought-together",
      "/product-event-weightages", "/recommended-product-tag-weightages",
    ],
    ["recommendations", "pricing"],
  ],
  [["/reward-on-purchase"], ["loyalty"]],
  [["/referral-commerce"], ["referral"]],
  [["/promotions-banners", "/content-management/promotion-banner"], ["banners", "cms_pages", "cms", "pricing"]],

  // Tax & Compliance
  [
    [
      "/tax", "/subTax", "/tax-rule", "/hsn-code",
      "/tax-structure", "/tax-category", "/tax-category-rules",
      "/tax-documents",
    ],
    ["tax"],
  ],
  [["/country"], ["countries", "locations"]],
  [["/state"], ["states", "locations"]],
  [["/city"], ["cities", "locations"]],
  [["/zip-codes", "/zipcode"], ["zip_codes", "locations"]],
  [["/warranty"], ["warranty", "products"]],
  [
    [
      "/shipping-company-users", "/shipping-packages", "/shipment-tracking",
      "/shipping-profile", "/pickup-addresses", "/delivery-staff",
      "/shipping-duration",
    ],
    ["delivery"],
  ],

  // Analytics & Dynamic Pricing
  [["/analytics"], ["analytics", "reports"]],
  [["/dynamic-pricing"], ["pricing", "dynamic-pricing", "admin"]],

  // Notifications
  [["/messages", "/notifications"], ["notifications", "users"]],

  // Subscriptions overview
  [["/subscriptions"], ["subscriptions", "orders"]],

  // Reports & Analytics
  [
    [
      "/reports-sales", "/reports-products",
      "/reports-inventory", "/reports-sellers",
    ],
    ["reports", "analytics"],
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
    ["cms_pages", "cms", "platform"],
  ],

  // Settings
  [
    ["/settings", "/setting", "/payment-settings", "/seo-settings", "/rotate"],
    ["admin", "platform", "fraud"],
  ],

  // Seller Management — additional
  [["/seller-onboarding"], ["sellers", "seller_kyc"]],
  [["/seller-status"], ["sellers"]],
  [["/seller-sub-admins"], ["seller-management", "sellers"]],

  // CMS & Content — additional
  [["/content-pages"], ["cms_pages", "cms"]],

  // Users — additional
  [["/users-addresses", "/user-addresses"], ["users"]],

  // Deals
  [["/deal-management", "/deals"], ["deals"]],

  // Fraud
  [["/fraud-cases", "/fraud"], ["fraud"]],

  // Wallet
  [["/wallet-management", "/wallet-transactions"], ["wallets"]],

  // Notification templates
  [["/notification-templates"], ["notifications"]],

  // Cancellations
  [["/cancellations"], ["orders", "cancellations"]],

  // Collections & Badges
  [["/collections"], ["platform", "products"]],
  [["/badges", "/ribbons", "/campaigns"], ["platform", "pricing"]],

  // Preferences
  [["/preferences"], ["admin"]],

  // Reports — extended
  [["/reports-orders"], ["reports", "orders", "analytics"]],
  [["/reports-payments"], ["reports", "payments", "analytics"]],
  [["/reports-returns"], ["reports", "returns", "analytics"]],
  [["/reports-cancellations"], ["reports", "orders", "analytics"]],
  [["/reports-delivery"], ["reports", "delivery", "analytics"]],
  [["/reports-commissions"], ["reports", "sellers/commissions", "analytics"]],
  [["/reports-users"], ["reports", "users", "analytics"]],

  // Tax & Finance — invoices / credit notes
  [["/tax-invoices"], ["tax", "payments", "orders"]],
  [["/credit-notes"], ["tax", "returns", "payments"]],

  // Subscription plans
  [["/subscription-plans"], ["subscriptions", "platform", "admin"]],

  // Payment config & chargebacks
  [["/cod-config"], ["payments", "commerce-settings", "admin"]],
  [["/chargebacks"], ["payments", "orders"]],

  // Seller payouts
  [["/seller-payouts"], ["sellers/commissions", "payments"]],

  // Deal sub-sections
  [["/deal-payouts"], ["deals"]],
  [["/deal-sponsorships"], ["deals"]],

  // Referral influencers
  [["/influencer-management"], ["referral"]],

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
