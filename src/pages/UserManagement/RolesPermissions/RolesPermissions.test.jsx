import React, { act } from "react";
import { createRoot } from "react-dom/client";
import RolesPermissions from "./RolesPermissions";
import { axiosPrivate } from "../../../_helpers/axiosProvider";
let mockCanManage = true;
jest.mock("../../../_helpers/axiosProvider", () => ({
  axiosPrivate: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));
jest.mock("../../../_helpers/usePermission", () => ({
  ACTIONS: { CREATE: "create", UPDATE: "update", ASSIGN: "assign" },
  usePermission: () => ({
    isSuperAdmin: false,
    can: (_module, action) => action !== "assign" || mockCanManage,
  }),
}));
jest.mock("../../../components/Shared", () => ({
  PageHeader: ({ title, actions }) => (
    <header>
      {title}
      {actions}
    </header>
  ),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
let root, container;
const role = (id, name) => ({
  id,
  name,
  slug: id,
  type: "custom",
  active: true,
});
const moduleRow = (name) => ({
  id: "module-id",
  slug: "orders",
  moduleName: name,
  permissions: ["view", "update"].map((action) => ({
    id: `${action}-id`,
    action,
    slug: `orders:${action}`,
    assigned: false,
    assignable: true,
  })),
});
const response = (data) => ({ data: { data } });
const mount = async () => {
// eslint-disable-next-line testing-library/no-unnecessary-act -- ReactDOM createRoot requires act; no Testing Library is used.
  await act(async () => root.render(<RolesPermissions />));
};
const click = async (label) => {
  const buttons = [...container.querySelectorAll("button")];
  const button =
    buttons.find((item) => item.textContent.trim() === label) ||
    buttons.find((item) => item.textContent.startsWith(label));
  if (!button) throw new Error(`Missing button ${label}`);
  await act(async () => button.click());
};
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  mockCanManage = true;
  jest.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  axiosPrivate.get.mockImplementation((url) =>
    Promise.resolve(
      response(
        url === "/rbac/roles"
          ? [role("warehouse", "Warehouse operators")]
          : { canManageRole: true, modules: [moduleRow("Orders")] },
      ),
    ),
  );
  axiosPrivate.put.mockResolvedValue(response({}));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("empty saved roles do not fabricate standard roles or seed instructions", async () => {
  axiosPrivate.get.mockResolvedValue(response([]));
  await mount();
  expect(container.textContent).toContain("No saved roles found.");
  for (const text of [
    "Super Admin",
    "Seller",
    "Role not in database",
    "seed-rbac",
    "How the two permission levels work",
  ])
    expect(container.textContent).not.toContain(text);
});

test("the actual saved role name and description replace hardcoded role descriptions", async () => {
  axiosPrivate.get.mockImplementation((url) =>
    Promise.resolve(
      response(
        url === "/rbac/roles"
          ? [
              {
                ...role("admin", "Regional operations"),
                description: "Handles the north region",
              },
            ]
          : { canManageRole: false, modules: [moduleRow("Orders")] },
      ),
    ),
  );
  await mount();
  await click("Regional operations");
  expect(container.textContent).toContain("Handles the north region");
  expect(container.textContent).not.toContain(
    "Permissions set individually per admin",
  );
  expect(axiosPrivate.get).toHaveBeenLastCalledWith(
    "/rbac/permission-management/modules",
    { params: { roleId: "admin" } },
  );
});

test("editing a supported action includes View and saves only to the selected saved role", async () => {
  await mount();
  await click("Warehouse operators");
  const edit = container.querySelector('input[aria-label="Orders Edit"]');
  await act(async () => edit.click());
  expect(
    container.querySelector('input[aria-label="Orders View"]').checked,
  ).toBe(true);
  await click("Save permissions");
  await click("Save");
  expect(axiosPrivate.put).toHaveBeenCalledWith(
    "/rbac/roles/warehouse/permissions",
    { permissionIds: ["view-id", "update-id"] },
  );
});

test("read-only roles have no save or bulk assignment controls", async () => {
  mockCanManage = false;
  await mount();
  await click("Warehouse operators");
  expect(container.textContent).not.toContain("Save permissions");
  expect(
    container.querySelector('[title="Toggle all assignable actions"]'),
  ).toBeNull();
  expect(
    container.querySelector('input[aria-label="Orders Edit"]').disabled,
  ).toBe(true);
});

test("a slow previous role response cannot replace the currently selected role matrix", async () => {
  let resolveFirst, resolveSecond;
  axiosPrivate.get.mockImplementation((url, options) =>
    url === "/rbac/roles"
      ? Promise.resolve(
          response([
            role("first", "First team"),
            role("second", "Second team"),
          ]),
        )
      : new Promise((resolve) => {
          if (options.params.roleId === "first") resolveFirst = resolve;
          else resolveSecond = resolve;
        }),
  );
  await mount();
  await click("First team");
  await click("Second team");
  await act(async () =>
    resolveSecond(
      response({ canManageRole: true, modules: [moduleRow("Second matrix")] }),
    ),
  );
  await act(async () =>
    resolveFirst(
      response({ canManageRole: true, modules: [moduleRow("First matrix")] }),
    ),
  );
  expect(container.textContent).toContain("Second matrix");
  expect(container.textContent).not.toContain("First matrix");
});

test("missing matrix capabilities never enable saving by default", async () => {
  axiosPrivate.get.mockImplementation((url) =>
    Promise.resolve(
      response(
        url === "/rbac/roles"
          ? [role("warehouse", "Warehouse operators")]
          : { modules: [moduleRow("Orders")] },
      ),
    ),
  );
  await mount();
  await click("Warehouse operators");
  expect(container.textContent).not.toContain("Save permissions");
});

test('an unconfigured catalog row has no nonfunctional save or select-all controls', async () => {
  axiosPrivate.get.mockImplementation(url => Promise.resolve(response(url === '/rbac/roles' ? [role('warehouse', 'Warehouse operators')] : {
    canManageRole: true, modules: [{ slug: 'compliance', moduleName: 'Compliance', configured: false, permissions: [] }],
  })));
  await mount(); await click('Warehouse operators');
  expect(container.textContent).toContain('Compliance');
  expect(container.textContent).not.toContain('Save permissions');
  expect(container.querySelector('input[type="checkbox"]')).toBeNull();
});
