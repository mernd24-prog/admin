const trimRoute = (value = "") =>
  `/${String(value || "")
    .replace(/^\/app/, "")
    .replace(/\/:\w+\??/g, "")
    .replace(/\/+$/, "")
    .replace(/^\/+/, "")}`.replace(/\/$/, "") || "/";

export const SELF_SERVICE_ROUTES = ["/profile", "/changePassword"];

export const MODULE_CATALOG = {
  admin: { label: "Admin Dashboard", tab: "Home", route: "home", order: 10 },
  analytics: { label: "Analytics", tab: "Home", route: "home", order: 20 },
  rbac: { label: "Access Control", tab: "Access Control", route: "admin-users", order: 30 },
  users: { label: "User Management", tab: "Users & Sellers", route: "users", order: 40 },
  sellers: { label: "Seller Management", tab: "Users & Sellers", route: "seller", order: 50 },
  "seller-management": { label: "Seller Admin Management", tab: "Seller Management", route: "seller-management", order: 55 },
  "sellers/commissions": { label: "Seller Commissions", tab: "Users & Sellers", route: "transactions", order: 60 },
  products: { label: "Product Management", tab: "Catalog", route: "product-catalog", order: 70 },
  platform: { label: "Platform Catalog", tab: "Catalog", route: "content-pages", order: 80 },
  cms: { label: "CMS Management", tab: "Content", route: "content-pages", order: 90 },
  warranty: { label: "Warranty", tab: "Catalog", route: "warranty", order: 100 },
  carts: { label: "Cart Management", tab: "Shopping", route: "orders", order: 110 },
  orders: { label: "Order Management", tab: "Shopping", route: "orders", order: 120 },
  returns: { label: "Return Management", tab: "Shopping", route: "order-return-reasons", order: 130 },
  delivery: { label: "Delivery Management", tab: "Shopping", route: "shipping-packages", order: 140 },
  payments: { label: "Payment Management", tab: "Payments & Finance", route: "orders", order: 150 },
  wallets: { label: "Wallet Management", tab: "Payments & Finance", route: "transactions", order: 160 },
  tax: { label: "Tax Management", tab: "Payments & Finance", route: "tax", order: 170 },
  subscriptions: { label: "Subscriptions", tab: "Payments & Finance", route: "settings", order: 180 },
  pricing: { label: "Pricing & Promotions", tab: "Marketing", route: "discount-coupons", order: 190 },
  "dynamic-pricing": { label: "Dynamic Pricing", tab: "Marketing", route: "special-price", order: 200 },
  loyalty: { label: "Loyalty", tab: "Marketing", route: "reward-purchase", order: 210 },
  referral: { label: "Referral Commerce", tab: "Marketing", route: "referral-commerce", order: 220 },
  recommendations: { label: "Recommendations", tab: "Marketing", route: "similar-products", order: 230 },
  notifications: { label: "Notifications", tab: "Settings", route: "messages", order: 240 },
  fraud: { label: "Fraud Management", tab: "Insights & Risk", route: "settings", order: 250 },
};

export const MODULE_TAB_ORDER = [
  "Home",
  "Access Control",
  "Users & Sellers",
  "Seller Management",
  "Catalog",
  "Content",
  "Shopping",
  "Payments & Finance",
  "Marketing",
  "Insights & Risk",
  "Product Management",
  "Orders",
  "Promotions",
  "Shipping/Pickup",
  "Tax",
  "Settings",
];

export const getModuleMeta = (moduleSlug) => {
  const slug = String(moduleSlug || "").trim().toLowerCase();
  return MODULE_CATALOG[slug] || {
    label: slug,
    tab: "Settings",
    route: slug,
    order: 999,
  };
};

export const getModuleLabel = (moduleSlug) => getModuleMeta(moduleSlug).label;
export const getModuleTab = (moduleSlug) => getModuleMeta(moduleSlug).tab;

export const MODULE_DEFAULT_ROUTES = {
  admin: "home",
  analytics: "home",
  rbac: "admin-users",
  users: "users",
  sellers: "seller",
  "seller-management": "seller-management",
  "sellers/commissions": "transactions",
  products: "product-catalog",
  platform: "content-pages",
  cms: "content-pages",
  warranty: "warranty",
  carts: "orders",
  orders: "orders",
  returns: "order-return-reasons",
  delivery: "shipping-packages",
  payments: "orders",
  wallets: "transactions",
  tax: "tax",
  subscriptions: "settings",
  pricing: "discount-coupons",
  "dynamic-pricing": "special-price",
  referral: "referral-commerce",
  loyalty: "reward-purchase",
  recommendations: "similar-products",
  notifications: "messages",
  fraud: "settings",
};

const ROUTE_MODULES = [
  [["/home"], ["admin", "analytics"]],
  [["/admin-users", "/user-permissions"], ["rbac", "users"]],
  [["/seller-management"], ["seller-management", "sellers"]],
  [["/users", "/users-addresses", "/messages"], ["users"]],
  [["/transactions"], ["users", "wallets", "sellers/commissions"]],
  [["/seller"], ["sellers"]],
  [
    [
      "/product-catalog",
      "/product-families",
      "/product-option-value",
      "/product-options",
      "/product-tags",
      "/threshold-products",
      "/brands",
      "/store",
      "/pattern",
      "/finish",
      "/colors",
      "/batch",
      "/bar-code",
      "/hsn-code",
      "/qty-head",
    ],
    ["products"],
  ],
  [
    [
      "/categories",
      "/category-attributes",
      "/collections",
      "/product-variants",
      "/product-dimensions",
      "/tax-structure",
      "/tax-category",
      "/tax-category-rules",
      "/state",
      "/city",
      "/country",
      "/zipcode",
      "/shipping-duration",
    ],
    ["platform", "products"],
  ],
  [
    [
      "/orders",
      "/view-orders",
      "/order-status",
      "/gift-card-orders",
      "/order-cancellation-reasons",
      "/product-reviews",
    ],
    ["orders"],
  ],
  [["/order-return-reasons"], ["returns", "orders"]],
  [["/subscription-orders", "/view-subscription-orders"], ["subscriptions", "orders"]],
  [["/discount-coupons", "/special-price", "/volume-discounts", "/similar-products", "/frequently-bought-together", "/PPC-promotions-management", "/reward-on-purchase", "/product-event-weightages", "/recommended-product-tag-weightages", "/badges", "/ribbons"], ["pricing"]],
  [["/referral-commerce"], ["referral", "pricing"]],
  [["/shipping-company-users", "/shipping-packages", "/shipping-profile", "/pickup-addresses", "/delivery-staff"], ["delivery"]],
  [["/homepage-slides", "/banners", "/inner-banners", "/content-pages", "/faqs", "/faqsList", "/return-policy", "/return-policy-list", "/holidays", "/holidays-list", "/payment-policy", "/payment-policy-list", "/privacy-policies", "/privacy-policies-list", "/terms-and-conditions", "/help-and-support", "/promotions-banners", "/privacy-policy"], ["cms"]],
  [["/tax", "/subTax", "/tax-rule"], ["tax"]],
  [["/warranty"], ["warranty", "products"]],
  [["/settings", "/setting", "/rotate"], ["admin", "platform", "fraud"]],
  [["/supplier", "/goods-receive", "/stoks", "/inventory", "/store/store-page", "/product", "/purchase", "/sale", "/ledger", "/upload-file"], ["admin", "products"]],
];

export const getModuleRoute = (moduleSlug) =>
  MODULE_DEFAULT_ROUTES[String(moduleSlug || "").trim().toLowerCase()] ||
  getModuleMeta(moduleSlug).route ||
  String(moduleSlug || "").trim();

export const isSelfServiceRoute = (path) => {
  const route = trimRoute(path);
  return SELF_SERVICE_ROUTES.some((selfRoute) => route === selfRoute);
};

export const getRouteModuleCandidates = (path) => {
  const route = trimRoute(path);
  const matched = ROUTE_MODULES.find(([routePrefixes]) =>
    routePrefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`)),
  );

  return matched ? matched[1] : [];
};
