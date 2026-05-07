"use strict";

const fs = require("fs");
const path = require("path");

const API_PREFIX = "/api/v1";
const COLLECTION_PATH = path.resolve("postman_collection.json");
const ROUTE_REGISTRY_PATH = path.resolve("src/api/register-routes.js");

const GROUP_NAMES = {
  "/auth": "Auth",
  "/users": "Users",
  "/products": "Products",
  "/carts": "Cart",
  "/orders": "Orders",
  "/payments": "Payments",
  "/platform": "Platform",
  "/sellers": "Sellers",
  "/notifications": "Notifications",
  "/analytics": "Analytics",
  "/pricing": "Pricing",
  "/wallets": "Wallet",
  "/admin": "Admin",
  "/tax": "Tax",
  "/subscriptions": "Subscriptions",
  "/rbac": "RBAC",
  "/warranty": "Warranty",
  "/loyalty": "Loyalty",
  "/recommendations": "Recommendations",
  "/returns": "Returns",
  "/fraud": "Fraud",
  "/dynamic-pricing": "Dynamic Pricing",
  "/delivery": "Delivery",
  "/sellers/commissions": "Seller Commissions",
  "/meta": "Health & Meta",
};

const PUBLIC_ENDPOINTS = new Set([
  "GET /health",
  "GET /api/v1/meta/routes",
  "POST /api/v1/auth/register",
  "POST /api/v1/auth/register-otp",
  "POST /api/v1/auth/verify-registration",
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/social",
  "POST /api/v1/auth/refresh",
  "POST /api/v1/auth/send-otp",
  "POST /api/v1/auth/verify-otp",
  "POST /api/v1/auth/resend-otp",
  "POST /api/v1/auth/forgot-password",
  "POST /api/v1/auth/reset-password",
  "POST /api/v1/payments/webhooks/razorpay",
  "GET /api/v1/products",
  "GET /api/v1/products/search",
  "GET /api/v1/products/:productId",
  "GET /api/v1/platform/categories",
  "GET /api/v1/platform/categories/:categoryKey",
  "GET /api/v1/platform/families",
  "GET /api/v1/platform/families/:familyCode",
  "GET /api/v1/platform/variants",
  "GET /api/v1/platform/variants/:variantId",
  "GET /api/v1/platform/hsn-codes",
  "GET /api/v1/platform/hsn-codes/:hsnCode",
  "GET /api/v1/platform/geographies",
  "GET /api/v1/platform/geographies/:countryCode",
  "GET /api/v1/platform/cms",
  "GET /api/v1/platform/cms/:slug",
  "GET /api/v1/recommendations/trending",
  "GET /api/v1/warranty/products/:productId/warranty",
  "GET /api/v1/delivery/serviceability",
]);

const BODY_BY_ROUTE = {
  "PATCH /api/v1/users/me": {
    profile: { firstName: "John", lastName: "Doe" },
  },
  "POST /api/v1/users/me/kyc": {
    documentType: "aadhaar",
    documentNumber: "123456789012",
  },
  "PATCH /api/v1/users/:userId/kyc/review": {
    status: "approved",
    remarks: "Verified",
  },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toRequirePath(fromFile, requirePath) {
  const withExtension = requirePath.endsWith(".js") ? requirePath : `${requirePath}.js`;
  return path.normalize(path.resolve(path.dirname(fromFile), withExtension));
}

function parseRouteRegistry() {
  const registrySource = fs.readFileSync(ROUTE_REGISTRY_PATH, "utf8");
  const imports = new Map();
  const importRegex = /const\s+(?:\{\s*(\w+)\s*\}|(\w+))\s*=\s*require\("([^"]+)"\)/g;

  for (const match of registrySource.matchAll(importRegex)) {
    imports.set(match[1] || match[2], toRequirePath(ROUTE_REGISTRY_PATH, match[3]));
  }

  const mounts = [];
  const mountRegex = /app\.use\(`\$\{env\.apiPrefix\}([^`]+)`,\s*(\w+)/g;

  for (const match of registrySource.matchAll(mountRegex)) {
    mounts.push({
      basePath: match[1],
      exportName: match[2],
      filePath: imports.get(match[2]),
    });
  }

  return mounts;
}

function parseRouteFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const routeRegex = /\b\w+(?:Routes|Router)?\.(get|post|put|patch|delete)\s*\(\s*(["'`])([^"'`]+)\2/gi;
  const routes = [];

  for (const match of source.matchAll(routeRegex)) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[3],
    });
  }

  return routes;
}

function joinRoute(basePath, routePath) {
  return `${API_PREFIX}${basePath}${routePath === "/" ? "" : routePath}`;
}

function discoverRoutes() {
  const routes = [
    {
      group: "Health & Meta",
      method: "GET",
      path: "/health",
    },
  ];

  for (const mount of parseRouteRegistry()) {
    if (!mount.filePath) {
      throw new Error(`No route file import found for ${mount.exportName}`);
    }

    for (const route of parseRouteFile(mount.filePath)) {
      routes.push({
        group: GROUP_NAMES[mount.basePath] || titleFromBasePath(mount.basePath),
        method: route.method,
        path: joinRoute(mount.basePath, route.path),
      });
    }
  }

  return dedupeRoutes(routes);
}

function dedupeRoutes(routes) {
  const seen = new Set();
  return routes.filter((route) => {
    const key = routeKey(route);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function titleFromBasePath(basePath) {
  return basePath
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/-/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function routeKey(route) {
  return `${route.method} ${route.path}`;
}

function requestKey(item) {
  if (!item.request) {
    return null;
  }

  const rawUrl = typeof item.request.url === "string" ? item.request.url : item.request.url.raw;
  return `${item.request.method} ${rawUrl.replace("{{baseUrl}}", "")}`;
}

function collectRequestKeys(collection) {
  const keys = new Set();

  function visit(items) {
    for (const item of items || []) {
      const key = requestKey(item);
      if (key) {
        keys.add(key);
      }
      if (item.item) {
        visit(item.item);
      }
    }
  }

  visit(collection.item);
  return keys;
}

function findOrCreateFolder(collection, name) {
  let folder = collection.item.find((item) => item.name === name && Array.isArray(item.item));
  if (!folder) {
    folder = { name, item: [] };
    collection.item.push(folder);
  }
  return folder;
}

function createRequestItem(route) {
  const key = routeKey(route);
  const item = {
    name: key,
    request: {
      method: route.method,
      header: [],
      url: `{{baseUrl}}${route.path}`,
    },
  };

  if (!PUBLIC_ENDPOINTS.has(key)) {
    item.request.auth = {
      type: "bearer",
      bearer: [{ key: "token", value: "{{accessToken}}", type: "string" }],
    };
  }

  const body = BODY_BY_ROUTE[key] || defaultBodyFor(route);
  if (body) {
    item.request.header.push({ key: "Content-Type", value: "application/json" });
    item.request.body = {
      mode: "raw",
      raw: JSON.stringify(body, null, 2),
    };
  }

  return item;
}

function defaultBodyFor(route) {
  if (!["POST", "PUT", "PATCH"].includes(route.method)) {
    return null;
  }

  if (route.method === "PATCH") {
    return { status: "active" };
  }

  return { example: true };
}

function syncCollection() {
  const collection = readJson(COLLECTION_PATH);
  const discoveredRoutes = discoverRoutes();
  const existingKeys = collectRequestKeys(collection);
  const routeKeys = new Set(discoveredRoutes.map(routeKey));
  const added = [];

  for (const route of discoveredRoutes) {
    const key = routeKey(route);
    if (existingKeys.has(key)) {
      continue;
    }

    findOrCreateFolder(collection, route.group).item.push(createRequestItem(route));
    existingKeys.add(key);
    added.push(key);
  }

  const extra = [...existingKeys].filter((key) => !routeKeys.has(key)).sort();
  fs.writeFileSync(COLLECTION_PATH, `${JSON.stringify(collection, null, 2)}\n`);

  console.log(`Discovered ${discoveredRoutes.length} API requests.`);
  console.log(`Added ${added.length} missing Postman request${added.length === 1 ? "" : "s"}.`);
  for (const key of added) {
    console.log(`  + ${key}`);
  }

  if (extra.length > 0) {
    console.log("Collection requests not found in registered API routes:");
    for (const key of extra) {
      console.log(`  - ${key}`);
    }
  }
}

syncCollection();
