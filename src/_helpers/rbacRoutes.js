const trimRoute = (value = "") =>
  `/${String(value || "")
    .replace(/^\/app/, "")
    .replace(/\/:\w+\??/g, "")
    .replace(/\/+$/, "")
    .replace(/^\/+/, "")}`.replace(/\/$/, "") || "/";

export const SELF_SERVICE_ROUTES = ["/profile", "/changePassword"];

export const MODULE_DEFAULT_ROUTES = {
  admin: "home",
  analytics: "home",
  rbac: "admin-users",
  users: "users",
  sellers: "seller",
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
