import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import SellerCodCollections from "./SellerFinance/SellerCodCollections";
import CodCollections from "./Payments/CodCollections";
import { axiosPrivate } from "../../_helpers/axiosProvider";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../../_helpers/axiosProvider", () => ({
  axiosPrivate: { get: jest.fn(), post: jest.fn() },
}));
jest.mock("../../_helpers/dropdownApi", () => ({
  dropdownApi: { getSellers: jest.fn().mockResolvedValue([]) },
}));
jest.mock("../../components/Atoms/Input/Input", () => (props) => (
  <textarea aria-label={props.labelName} value={props.value || ""} onChange={props.onChange} />
));
jest.mock("../../components/Atoms/FormInput/FormInput", () => (props) => (
  <textarea aria-label={props.label} name={props.name} value={props.value || ""} onChange={props.onChange} />
));
jest.mock("../../components/Atoms/FormSection/FormSection", () => (props) => (
  <section><h2>{props.title}</h2>{props.children}</section>
));
jest.mock("../../components/Atoms/Modal/DefaultRightSideModal", () => (props) => props.isOpen ? (
  <div role="dialog"><h1>{props.title}</h1>{props.children}<button onClick={props.onSubmit}>{props.submitButtonText || "Submit"}</button></div>
) : null);
jest.mock("../../components/Shared", () => ({
  PageHeader: ({ title, subtitle }) => <header><h1>{title}</h1><p>{subtitle}</p></header>,
  OrderLink: ({ orderNumber }) => <span>{orderNumber}</span>,
  SellerIdentity: ({ sellerId }) => <span>{sellerId}</span>,
  StatusBadge: ({ label }) => <span>{label}</span>,
  DataTable: ({ columns, rowActions, requiredModule }) => {
    const seller = requiredModule === "sellers/commissions";
    const row = seller
      ? { id: "collection-1", shipment_id: "11111111-1111-4111-8111-111111111111", status: "pending", expected_amount: 1000, remaining_amount: 1000 }
      : { id: "22222222-2222-4222-8222-222222222222", shipment_id: "11111111-1111-4111-8111-111111111111", status: "confirmed", expected_amount: 1000, remaining_amount: 1000 };
    const actions = rowActions?.(row) || [];
    return <div>{columns.map((column) => <span key={column.key}>{column.label}</span>)}{actions.map((action) => <button key={action.label} data-permission={action.requiredAction} onClick={action.onClick}>{action.label}</button>)}</div>;
  },
}));

const render = async (Component) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(<Component />); });
  return { container, root };
};

beforeEach(() => {
  axiosPrivate.get.mockResolvedValue({ data: { data: { items: [] } } });
  axiosPrivate.post.mockResolvedValue({ data: { success: true } });
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.clearAllMocks();
});

test("seller UI confirms full retained COD without payment or remittance fields", async () => {
  const { container, root } = await render(SellerCodCollections);
  expect(container.textContent).toContain("COD cash");
  expect(container.textContent).toContain("Recovered");
  expect(container.textContent).toContain("Still owed");
  expect(container.textContent).toContain("Recovery");

  const action = [...container.querySelectorAll("button")].find((button) => button.textContent === "Confirm cash retained");
  await act(async () => { action.click(); });
  expect(container.textContent).toContain("I confirm that I collected and retained the full COD amount");
  expect(container.textContent).not.toContain("reference");
  expect(container.textContent).not.toContain("remittance");
  expect(container.textContent).not.toContain("dispute");

  const checkbox = container.querySelector('input[type="checkbox"]');
  await act(async () => { checkbox.click(); });
  const submit = [...container.querySelectorAll("button")].find((button) => button.textContent === "Confirm cash retained");
  await act(async () => { submit.click(); });
  expect(axiosPrivate.post).toHaveBeenCalledWith(
    "/payments/cod-collections/shipments/11111111-1111-4111-8111-111111111111/confirm",
    { confirmation: true, notes: null },
  );
  await act(async () => { root.unmount(); });
});

test("admin UI verifies collection without clearing the COD liability", async () => {
  const { container, root } = await render(CodCollections);
  const action = [...container.querySelectorAll("button")].find((button) => button.textContent === "Verify collection");
  expect(action.dataset.permission).toBe("approve");
  await act(async () => { action.click(); });
  expect(container.textContent).toContain("does not clear the liability");
  expect(container.textContent).toContain("remains owed");
  expect(container.textContent).not.toContain("Record COD Remittance");

  const submit = [...container.querySelectorAll("button")].find((button) => button.textContent === "Verify collection");
  await act(async () => { submit.click(); });
  expect(axiosPrivate.post).toHaveBeenCalledWith(
    "/payments/cod-collections/22222222-2222-4222-8222-222222222222/verify",
    { notes: null },
  );
  const payload = axiosPrivate.post.mock.calls[0][1];
  expect(payload).not.toHaveProperty("markRemitted");
  expect(payload).not.toHaveProperty("referenceId");
  expect(payload).not.toHaveProperty("collectedAmount");
  await act(async () => { root.unmount(); });
});
