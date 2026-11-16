import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { usePermission } from "./usePermission";
import { getRouteModuleCandidates } from "./rbacRoutes";
let mockState, access, root, container;
let mockUser = {};
let mockRole = "sub-admin";
let mockSellerPanel = false;
jest.mock("react-redux", () => ({
  useSelector: (selector) => selector(mockState),
}));
jest.mock("./authStorage", () => ({
  getStoredRole: () => mockRole,
  getStoredUser: () => mockUser,
  normalizeRole: (value) => value,
}));
jest.mock("./panelConfig", () => ({ isSellerPanel: () => mockSellerPanel }));
const mod = (slug, actions) => ({
  slug,
  permissions: actions.map((action) => ({ action, assigned: true })),
});
function Probe() {
  access = usePermission();
  return null;
}
const render = (modules) => {
  if (modules)
    mockState.user.getMyModulePermissionData = { data: { data: { modules } } };
  act(() => root.render(<Probe />));
};
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  mockState = { user: {}, adminCore: {} };
  mockUser = {};
  mockRole = "sub-admin";
  mockSellerPanel = false;
  sessionStorage.clear();
  localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
test("empty and failed matrices deny stale browser and management catalog grants", () => {
  sessionStorage.setItem(
    "EcomAdmin",
    JSON.stringify({ permissions: ["products:view", "products:create"] }),
  );
  mockState.adminCore.accessModulesData = {
    data: { data: { modules: [mod("products", ["view", "create"])] } },
  };
  render();
  expect(access.can("products")).toBe(false);
  expect(access.canRoute("/app/product-catalog")).toBe(false);
  render([mod("products", ["view", "create"])]);
  expect(access.can("products", "create")).toBe(true);
  mockState.user.getMyModulePermissionData = {
    ...mockState.user.getMyModulePermissionData,
    error: "Forbidden",
  };
  render();
  expect(access.can("products", "create")).toBe(false);
});
test("direct Add/Edit URLs require their own actions", () => {
  render([mod("products", ["view"])]);
  expect(access.canRoute("/app/product-catalog")).toBe(true);
  expect(access.canRoute("/app/product-catalog/form")).toBe(false);
  expect(access.canRoute("/app/product-catalog/form/id")).toBe(false);
  render([mod("products", ["view", "create"])]);
  expect(access.canRoute("/app/product-catalog/form?copy=one")).toBe(true);
  expect(access.canRoute("/app/product-catalog/form/id")).toBe(false);
  render([mod("products", ["view", "update"])]);
  expect(access.canRoute("/app/product-catalog/form/id")).toBe(true);
});
test("referral capabilities cannot authorize sibling pages", () => {
  render([mod("referral-rules", ["view", "update"])]);
  expect(access.canRoute("/app/referral-commerce/rules")).toBe(true);
  expect(access.canRoute("/app/referral-commerce/payouts")).toBe(false);
  expect(access.canRoute("/app/referral-commerce/influencers/view/id")).toBe(
    false,
  );
  render([mod("referral", ["view", "update"])]);
  expect(access.canRoute("/app/referral-commerce/product-amounts")).toBe(true);
  expect(access.canRoute("/app/referral-commerce/payouts")).toBe(false);
});
test("unrelated modules cannot authorize payments, returns, brands or RBAC", () => {
  render([mod("orders", ["view"]), mod("products", ["view"])]);
  for (const path of [
    "/app/payments",
    "/app/returns",
    "/app/cancellations",
    "/app/brands",
    "/app/module-management",
    "/app/unknown",
  ])
    expect(access.canRoute(path)).toBe(false);
  expect(access.canRoute("/app/orders/view/id")).toBe(true);
  expect(access.canRoute("/app/profile")).toBe(true);
});
test("denied/inactive actions cannot enable controls and writes require view", () => {
  render([
    {
      slug: "products",
      permissions: [
        { action: "view", assigned: true },
        { action: "create", assigned: true, denied: true },
        { action: "update", assigned: true, active: false },
      ],
    },
  ]);
  expect(access.can("products")).toBe(true);
  expect(access.can("products", "create")).toBe(false);
  expect(access.can("products", "update")).toBe(false);
  render([mod("products", ["update"])]);
  expect(access.can("products", "update")).toBe(false);
});
test("existing owner policies stay within the panel", () => {
  mockRole = "seller";
  mockSellerPanel = true;
  render();
  expect(access.canRoute("/app/product-catalog")).toBe(true);
  expect(access.canRoute("/app/module-management")).toBe(false);
  mockRole = "super-admin";
  mockSellerPanel = false;
  render();
  expect(access.canRoute("/app/module-management")).toBe(true);
});
test("specific capability wins over dynamic parent navigation", () => {
  expect(
    getRouteModuleCandidates("/app/referral-commerce/payouts", [
      { slug: "referral", routePath: "/app/referral-commerce" },
    ]),
  ).toEqual(["referral-payouts"]);
});

test("permissionPath overrides cannot drop the actual URL action requirement", () => {
  render([mod("inventory", ["view"])]);
  expect(access.canRoute("/inventory", [], "/app/inventory-adjustment")).toBe(
    false,
  );
  render([mod("inventory", ["view", "adjust"])]);
  expect(access.canRoute("/inventory", [], "/app/inventory-adjustment")).toBe(
    true,
  );
});

test("a previous account matrix and a pending permission refresh cannot grant access", () => {
  mockUser = { id: "new-user" };
  mockState.user.getMyModulePermissionData = {
    data: {
      data: {
        user: { id: "old-user" },
        role: "sub-admin",
        modules: [mod("products", ["view", "update"])],
      },
    },
  };
  render();
  expect(access.can("products", "update")).toBe(false);
  mockState.user.getMyModulePermissionData.data.data.user.id = "new-user";
  render();
  expect(access.can("products", "update")).toBe(true);
  mockState.user.getMyModulePermissionData.loading = true;
  render();
  expect(access.can("products", "update")).toBe(false);
});
