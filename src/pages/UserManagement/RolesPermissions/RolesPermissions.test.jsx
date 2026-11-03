import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import RolesPermissions from "./RolesPermissions";
import { axiosPrivate } from "../../../_helpers/axiosProvider";
import { usePermission } from "../../../_helpers/usePermission";
jest.mock("../../../_helpers/axiosProvider", () => ({
  axiosPrivate: { get: jest.fn(), put: jest.fn() },
}));
jest.mock("../../../_helpers/usePermission", () => ({
  usePermission: jest.fn(),
  ACTIONS: { CREATE: "create", ASSIGN: "assign" },
  ROLES: {
    ADMIN: "admin",
    SUPER_ADMIN: "super-admin",
    SELLER: "seller",
    BUYER: "buyer",
  },
}));
jest.mock(
  "../../../components/Atoms/PermissionGuard/PermissionGuard",
  () =>
    ({ children }) => <>{children}</>,
);
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
let container, root;
const role = {
  id: "role",
  name: "Content Ops",
  slug: "content-ops",
  type: "custom",
};
const permissions = ["view", "create", "restore", "bulk_action", "adjust"].map(
  (action) => ({
    id: action,
    slug: `products:${action}`,
    action,
    assigned: false,
  }),
);
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  usePermission.mockReturnValue({ isSuperAdmin: true, can: () => true });
  axiosPrivate.get.mockImplementation(async (url) => ({
    data: {
      data:
        url === "/rbac/roles"
          ? [role]
          : {
              modules: [
                {
                  id: "products",
                  slug: "products",
                  name: "Product Management",
                  permissions,
                },
              ],
            },
    },
  }));
  axiosPrivate.put.mockResolvedValue({ data: { success: true } });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.clearAllMocks();
});
async function renderAndSelect(selected = role) {
  // ReactDOM createRoot rendering requires act; this is not a Testing Library render.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () =>
    root.render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <RolesPermissions />
      </MemoryRouter>,
    ),
  );
  const item = [...container.querySelectorAll("li")].find((element) =>
    element.textContent.includes(selected.name),
  );
  await act(async () => item.click());
}
const button = (label) =>
  [...container.querySelectorAll("button")].find(
    (element) => element.textContent.trim() === label,
  );
test("role matrix displays restore, bulk action and adjust from backend permissions", async () => {
  await renderAndSelect();
  expect(container.textContent).toContain("restore");
  expect(container.textContent).toContain("bulk action");
  expect(container.textContent).toContain("adjust");
  expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
});
test("checking create also checks view and save submits both permission IDs", async () => {
  await renderAndSelect();
  const boxes = container.querySelectorAll('tbody input[type="checkbox"]');
  await act(async () => boxes[1].click());
  expect(boxes[0].checked).toBe(true);
  expect(boxes[1].checked).toBe(true);
  await act(async () => button("Save Changes").click());
  await act(async () => button("Save").click());
  expect(axiosPrivate.put).toHaveBeenCalledWith(
    "/rbac/roles/role/permissions",
    { permissionIds: ["view", "create"] },
  );
});
test("removing view clears every selected action for that module", async () => {
  await renderAndSelect();
  const boxes = container.querySelectorAll('tbody input[type="checkbox"]');
  await act(async () => boxes[1].click());
  await act(async () => boxes[0].click());
  for (const box of boxes) expect(box.checked).toBe(false);
});
test("delegated admin sees system role defaults as read-only", async () => {
  const admin = {
    id: "admin-role",
    slug: "admin",
    name: "Admin",
    type: "system",
  };
  usePermission.mockReturnValue({ isSuperAdmin: false, can: () => true });
  axiosPrivate.get.mockImplementation(async (url) => ({
    data: {
      data:
        url === "/rbac/roles"
          ? [admin]
          : {
              modules: [
                {
                  id: "products",
                  slug: "products",
                  name: "Product Management",
                  permissions,
                },
              ],
            },
    },
  }));
  await renderAndSelect(admin);
  expect(button("Save Changes")).toBeUndefined();
  for (const box of container.querySelectorAll("tbody input"))
    expect(box.disabled).toBe(true);
});
