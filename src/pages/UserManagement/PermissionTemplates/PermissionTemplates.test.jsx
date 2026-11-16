import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { PermissionBuilder, TemplateModal } from "./PermissionTemplates";
import { axiosPrivate } from "../../../_helpers/axiosProvider";
jest.mock("../../../_helpers/axiosProvider", () => ({
  axiosPrivate: { get: jest.fn() },
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
let root, container;
const response = (data) => ({ data: { data } });
const permissions = ["view", "update"].map((action) => ({
  id: `${action}-id`,
  slug: `orders:${action}`,
  action,
  active: true,
  assignable: true,
}));
const catalog = {
  modules: [
    {
      id: "orders",
      slug: "orders",
      moduleName: "Order operations",
      permissions,
    },
    {
      slug: "unconfigured",
      moduleName: "Unconfigured capability",
      permissions: [],
    },
    {
      slug: "restricted",
      moduleName: "Restricted capability",
      permissions: [
        {
          id: "deny",
          action: "delete",
          slug: "restricted:delete",
          assignable: false,
        },
      ],
    },
  ],
};
const mount = async (element) => {
// eslint-disable-next-line testing-library/no-unnecessary-act -- ReactDOM createRoot requires act; no Testing Library is used.
  await act(async () => root.render(element));
};
const click = async (label) => {
  const button = [...container.querySelectorAll("button")].find(
    (item) => item.textContent.trim() === label,
  );
  if (!button) throw new Error(`Missing ${label}`);
  await act(async () => button.click());
};
const choose = async () => {
  const select = container.querySelector(
    'select[aria-label="Permission module"]',
  );
  await act(async () => {
    select.value = "orders";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  axiosPrivate.get.mockImplementation((url) =>
    Promise.resolve(
      response(
        url === "/rbac/roles"
          ? [
              {
                id: "regional",
                slug: "regional",
                name: "Regional team",
                active: true,
              },
            ]
          : catalog,
      ),
    ),
  );
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("only persisted assignable module permissions become choices", async () => {
  await mount(<PermissionBuilder onChange={jest.fn()} />);
  const text = [...container.querySelectorAll("option")].map(
    (item) => item.textContent,
  );
  expect(text).toContain("Order operations");
  expect(text).not.toContain("Unconfigured capability");
  expect(text).not.toContain("Restricted capability");
  await choose();
  expect(
    [...container.querySelectorAll("button")].map((button) =>
      button.textContent.trim(),
    ),
  ).not.toContain("delete");
});

test("adding an action uses actual permission slugs and includes View without duplicates", async () => {
  const onChange = jest.fn();
  await mount(
    <PermissionBuilder value={["orders:view"]} onChange={onChange} />,
  );
  await choose();
  await click("update");
  await click("Add");
  expect(onChange).toHaveBeenCalledWith(["orders:view", "orders:update"]);
  expect(
    [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Add",
    ).disabled,
  ).toBe(true);
});

test("catalog failure has a working retry rather than fabricated permission options", async () => {
  axiosPrivate.get
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(response(catalog));
  await mount(<PermissionBuilder onChange={jest.fn()} />);
  expect(container.textContent).toContain(
    "Unable to load assignable permissions.",
  );
  expect(container.querySelector("select").disabled).toBe(true);
  await click("Retry permissions");
  expect(container.querySelector("select").disabled).toBe(false);
  expect(container.textContent).toContain("Order operations");
});

test("role-scope choices come from saved role names", async () => {
  const onSave = jest.fn();
  await mount(
    <TemplateModal
      template={{
        id: "tpl",
        name: "Operations",
        slug: "operations",
        permissionSlugs: ["orders:view"],
      }}
      onClose={jest.fn()}
      onSave={onSave}
    />,
  );
  expect(container.textContent).toContain("Regional team");
  expect(
    [...container.querySelectorAll("button")].some((button) =>
      ["admin", "seller", "sub-admin"].includes(button.textContent.trim()),
    ),
  ).toBe(false);
  await click("Regional team");
  expect(
    [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Regional team"))
      .getAttribute("aria-pressed"),
  ).toBe("true");
  await act(async () =>
    container
      .querySelector("form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({ roleScope: ["regional"] }),
  );
});

test("obsolete saved role scopes can be explicitly removed", async () => {
  await mount(
    <TemplateModal
      template={{
        id: "tpl",
        name: "Legacy",
        slug: "legacy",
        roleScope: ["retired-role"],
        permissionSlugs: ["orders:view"],
      }}
      onClose={jest.fn()}
      onSave={jest.fn()}
    />,
  );
  await click("Remove unavailable role: retired-role");
  expect(container.textContent).not.toContain("retired-role");
});
