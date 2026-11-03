const fs = require("fs"),
  path = require("path");
const parser = require("@babel/parser");
const {
  getRequestModule,
  cleanModuleName,
} = require("../../backend/src/shared/auth/module-access");
const root = path.resolve(__dirname, "../../backend/src");
const cache = new Map();
function walk(node, fn) {
  if (!node || typeof node !== "object") return;
  fn(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((v) => walk(v, fn));
    else if (value && typeof value === "object") walk(value, fn);
  }
}
function string(node) {
  if (node?.type === "StringLiteral") return node.value;
  if (node?.type === "TemplateLiteral")
    return node.quasis
      .map((q) => q.value.cooked)
      .join("ENV")
      .replace("ENV", "/api/v1");
  return null;
}
function parse(file) {
  if (cache.has(file)) return cache.get(file);
  const code = fs.readFileSync(file, "utf8");
  const ast = parser.parse(code, { sourceType: "unambiguous" });
  const imports = new Map(),
    guards = new Map(),
    routers = new Set(["app"]),
    calls = [],
    platformOnly = [];
  walk(ast, (node) => {
    if (
      node.type === "IfStatement" &&
      node.test?.type === "UnaryExpression" &&
      node.test.operator === "!" &&
      node.test.argument?.name === "seller"
    )
      platformOnly.push([node.consequent.start, node.consequent.end]);
    if (
      node.type === "VariableDeclarator" &&
      node.init?.type === "CallExpression"
    ) {
      let init = node.init;
      if (init.callee.name === "Router" || init.callee.property?.name === "Router") routers.add(node.id.name);
      if (
        init.callee.name === "require" &&
        string(init.arguments[0])?.startsWith(".")
      ) {
        let target =
          path.resolve(path.dirname(file), string(init.arguments[0])) + ".js";
        if (node.id.type === "ObjectPattern")
          for (const p of node.id.properties) imports.set(p.value.name, target);
        else imports.set(node.id.name, target);
      } else if (init.callee.name === "allowPermissions")
        guards.set(node.id.name, init.arguments.map(string).filter(Boolean));
    }
    if (
      node.type === "CallExpression" &&
      node.callee.type === "MemberExpression" &&
      routers.has(node.callee.object?.name) &&
      ["get", "post", "put", "patch", "delete", "use"].includes(
        node.callee.property.name,
      )
    ) {
      calls.push(node);
    }
  });
  const data = { imports, guards, calls, platformOnly };
  cache.set(file, data);
  return data;
}
function perms(node, data) {
  if (node?.type === "Identifier") return data.guards.get(node.name) || [];
  if (
    node?.type === "CallExpression" &&
    node.callee.name === "allowPermissions"
  )
    return node.arguments.map(string).filter(Boolean);
  return [];
}
const routes = [];
function visit(
  file,
  prefix,
  inherited = [],
  seen = new Set(),
  sellerMode = false,
) {
  if (!fs.existsSync(file) || seen.has(file)) return;
  const next = new Set([...seen, file]);
  const data = parse(file);
  for (const call of data.calls) {
    if (
      sellerMode &&
      data.platformOnly.some(([a, b]) => call.start >= a && call.end <= b)
    )
      continue;
    const method = call.callee.property.name;
    const local = string(call.arguments[0]);
    if (local === null) continue;
    const full = (prefix + "/" + local)
      .replace(/\/{2,}/g, "/")
      .replace(/\/$/, "");
    const permissions = [
      ...inherited,
      ...call.arguments.flatMap((arg) => perms(arg, data)),
    ];
    if (method === "use") {
      for (const arg of call.arguments.slice(1)) {
        let id =
          arg.type === "Identifier"
            ? arg.name
            : arg.type === "CallExpression"
              ? arg.callee.name
              : null;
        const target = data.imports.get(id);
        if (target)
          visit(
            target,
            full,
            permissions,
            next,
            Boolean(
              arg.type === "CallExpression" &&
              arg.arguments[0]?.properties?.some(
                (p) => p.key.name === "seller" && p.value.value === true,
              ),
            ),
          );
      }
    } else
      routes.push({
        method: method.toUpperCase(),
        path: full,
        permissions,
        file: path.relative(root, file),
      });
  }
}
visit(path.join(root, "api/register-routes.js"), "");

const {
  inferRequestAction,
} = require("../../backend/src/shared/middleware/access");
const {
  MODULE_CATALOG,
} = require("../../backend/src/shared/auth/module-catalog");
const known = new Set(
  MODULE_CATALOG.map((module) => cleanModuleName(module.slug)),
);
const rules = new Map();
const actions = new Map();
for (const route of routes) {
  const pathname = route.path.replace(/^\/api\/v\d+/, "") || "/";
  const module = getRequestModule({ originalUrl: route.path });
  const declared = route.permissions.map((slug) => ({
    module: cleanModuleName(slug.split(":")[0]),
    action: slug.split(":")[1],
  }));
  const last = declared.at(-1);
  if (last)
    rules.set(`${route.method} ${pathname}`, [
      route.method,
      pathname,
      last.module,
      last.action,
    ]);
  const capability = last || {
    module,
    action: inferRequestAction({
      originalUrl: route.path,
      method: route.method,
    }),
  };
  if (!known.has(capability.module)) continue;
  const list = actions.get(capability.module) || new Set();
  list.add("view");
  list.add(capability.action);
  actions.set(capability.module, list);
}

// Client-side exports and other local controls are valid capabilities too.
const {
  normalizePermissionAction,
  PERMISSION_ACTIONS,
} = require("../../backend/src/shared/auth/rbac-permissions");
function addUi(module, action) {
  module = cleanModuleName(module);
  action = normalizePermissionAction(String(action || "").toLowerCase());
  if (!known.has(module) || !PERMISSION_ACTIONS.includes(action)) return;
  const list = actions.get(module) || new Set();
  list.add("view");
  list.add(action);
  actions.set(module, list);
}
function memberAction(node) {
  if (node?.type === "StringLiteral") return node.value;
  if (node?.type === "MemberExpression" && node.object.name === "ACTIONS")
    return node.property.name;
  return null;
}
function scanUi(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      scanUi(file);
      continue;
    }
    if (!/\.[jt]sx?$/.test(file) || /\.(test|spec)\.[jt]sx?$/.test(file))
      continue;
    const ast = parser.parse(fs.readFileSync(file, "utf8"), {
      sourceType: "unambiguous",
      plugins: ["jsx"],
    });
    walk(ast, (node) => {
      if (node.type === "CallExpression" && node.callee.name === "can")
        addUi(string(node.arguments[0]), memberAction(node.arguments[1]));
      if (
        node.type === "JSXOpeningElement" &&
        node.name.name === "PermissionGuard"
      ) {
        const attribute = (name) =>
          node.attributes.find((attr) => attr.name?.name === name)?.value;
        const module = attribute("module");
        const action = attribute("action");
        addUi(
          string(module?.expression || module),
          memberAction(action?.expression || action),
        );
      }
      if (node.type === "ObjectExpression") {
        const property = (name) =>
          node.properties.find((prop) => prop.key?.name === name)?.value;
        addUi(
          string(property("requiredModule")),
          memberAction(property("requiredAction")),
        );
      }
    });
  }
}
scanUi(path.resolve(__dirname, "../src"));
const ruleRows = [...rules.values()].sort(
  (a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]),
);
const actionRows = Object.fromEntries(
  [...actions]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, values]) => [module, [...values].sort()]),
);
const files = [
  [
    path.join(root, "shared/auth/route-permission-map.json"),
    "[\n" +
      ruleRows.map((row) => "  " + JSON.stringify(row)).join(",\n") +
      "\n]\n",
  ],
  [
    path.join(root, "shared/auth/route-permission-actions.json"),
    "{\n" +
      Object.entries(actionRows)
        .map(
          ([key, value]) =>
            "  " + JSON.stringify(key) + ": " + JSON.stringify(value),
        )
        .join(",\n") +
      "\n}\n",
  ],
];
let stale = false;
for (const [file, content] of files) {
  if (process.argv.includes("--write")) fs.writeFileSync(file, content);
  else if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content) {
    stale = true;
    console.error("Stale route policy:", path.relative(root, file));
  }
}
console.log(
  `Inspected ${routes.length} mounted route declarations; ${ruleRows.length} explicit permission mappings; ${actions.size} backend capabilities.`,
);
if (stale) process.exitCode = 1;
