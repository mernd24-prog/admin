import React, { act } from "react";
import { MemoryRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { SellerFinanceWalletDetails } from "./SellerFinance";
import { apiRequest } from "../../../_helpers/apiConfig";
import { usePermission } from "../../../_helpers/usePermission";

jest.mock("../../../_helpers/apiConfig", () => ({ apiRequest: jest.fn() }));
jest.mock("../../../_helpers/usePermission", () => ({ ACTIONS: { UPDATE: "update" }, usePermission: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
global.IS_REACT_ACT_ENVIRONMENT = true;
let container;
let root;
const response = (amount, extra = {}) => ({ data: { currency: "INR", sellerWallet: { availableBalance: amount, lockedBalance: 7, transactions: [] }, ...extra } });
const render = async (props = {}) => {
  // ReactDOM createRoot requires act; this is not a Testing Library render.
  // eslint-disable-next-line testing-library/no-unnecessary-act
  await act(async () => { root.render(<MemoryRouter><SellerFinanceWalletDetails {...props} /></MemoryRouter>); });
  await act(async () => {
    container.querySelectorAll('button[aria-expanded="false"]').forEach(button => button.click());
  });
};
beforeEach(() => {
  apiRequest.mockReset();
  usePermission.mockReturnValue({ isSeller: false, can: () => true });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

test("aggregate view does not request an arbitrary seller wallet", async () => {
  await render();
  expect(apiRequest).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Select a seller");
});
test("wallet follows seller/organization filters and clears on deselection", async () => {
  apiRequest.mockResolvedValue(response(123));
  await render({ sellerId: "seller-a", organizationId: "org-a" });
  expect(apiRequest).toHaveBeenCalledWith("GET", expect.stringContaining("seller-a"), { organizationId: "org-a" });
  expect(container.textContent).toContain("123");
  await render();
  expect(container.textContent).not.toContain("123");
});
test("late previous seller response cannot overwrite current wallet", async () => {
  let resolveFirst;
  apiRequest.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; })).mockResolvedValueOnce(response(222));
  await render({ sellerId: "seller-a" });
  await render({ sellerId: "seller-b" });
  await act(async () => { resolveFirst(response(999)); });
  expect(container.textContent).toContain("222");
  expect(container.textContent).not.toContain("999");
});
test("wallet request failure supports retry", async () => {
  apiRequest.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(response(55));
  await render({ sellerId: "seller-a" });
  expect(container.querySelector('[role="alert"]').textContent).toBe("Unavailable");
  await act(async () => { container.querySelector("button").click(); });
  expect(container.querySelector('[role="alert"]')).toBeNull();
});
test("platform lock disables seller destination controls", async () => {
  usePermission.mockReturnValue({ isSeller: true, can: () => true });
  apiRequest.mockImplementation((_method, path) => Promise.resolve(path.includes("organizations") ? { data: { items: [] } } : response(30, { payoutPreference: { destination: "seller_wallet", sellerCanChoose: false } })));
  await render();
  expect([...container.querySelectorAll('input[type="radio"]')].every(input => input.disabled)).toBe(true);
});
test("view-only seller cannot change payout destination", async () => {
  usePermission.mockReturnValue({ isSeller: true, can: () => false });
  apiRequest.mockImplementation((_method, path) => Promise.resolve(path.includes("organizations") ? { data: { items: [] } } : response(30, { payoutPreference: { destination: "razorpayx", sellerCanChoose: true } })));
  await render();
  expect([...container.querySelectorAll('input[type="radio"]')].every(input => input.disabled)).toBe(true);
});
test("finance organization filter refreshes scoped wallet", async () => {
  apiRequest.mockResolvedValue(response(10));
  await render({ sellerId: "seller-a", organizationId: "org-a" });
  await render({ sellerId: "seller-a", organizationId: "org-b" });
  expect(apiRequest).toHaveBeenLastCalledWith("GET", expect.stringContaining("seller-a"), { organizationId: "org-b" });
});
test("history keeps every returned wallet credit", async () => {
  const transactions = Array.from({ length: 8 }, (_, index) => ({ id: String(index), amount: index + 10, status: "completed", referenceId: `credit-${index}`, createdAt: "2026-01-01T00:00:00Z" }));
  apiRequest.mockResolvedValue(response(20, { sellerWallet: { availableBalance: 20, transactions } }));
  await render({ sellerId: "seller-a" });
  transactions.forEach(transaction => expect(container.textContent).toContain(transaction.referenceId));
});

test("previewing another bank organization does not refilter finance or change the preference target", async () => {
  usePermission.mockReturnValue({ isSeller: true, can: () => true });
  const organizations = ["org-a", "org-b"].map(id => ({
    id, storeDisplayName: id,
    bankDetails: { accountHolderName: id, accountNumber: "12345678", bankName: `Bank ${id}`, ifscCode: "BANK0001234" },
  }));
  apiRequest.mockImplementation((_method, path) => Promise.resolve(path.includes("organizations")
    ? { data: { items: organizations } }
    : response(30, { payoutPreference: { destination: "razorpayx", organizationId: "org-a" } })));
  await render();
  const callsBeforePreview = apiRequest.mock.calls.length;
  await act(async () => {
    const select = container.querySelector('select[name="walletBankOrganization"]');
    select.value = "org-b";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(container.textContent).toContain("Bank org-b");
  expect(apiRequest.mock.calls).toHaveLength(callsBeforePreview);
  await act(async () => { container.querySelectorAll('input[type="radio"]')[1].click(); });
  expect(apiRequest).toHaveBeenCalledWith("PATCH", expect.stringContaining("my-payout-preference"), {
    payoutDestination: "seller_wallet", organizationId: "org-a",
  });
});

test("seller can still see minimum payout shortfall and next release", async () => {
  usePermission.mockReturnValue({ isSeller: true, can: () => true });
  apiRequest.mockImplementation((_method, path) => Promise.resolve(path.includes("organizations")
    ? { data: { items: [] } }
    : response(30, { minimumPayoutShortfall: 500, nextEligibleAt: "2026-01-02T00:00:00Z" })));
  await render();
  expect(container.textContent).toContain("500");
  expect(container.textContent).toContain("more is needed to meet the minimum payout");
  expect(container.textContent).toContain("Next expected release");
});

test("failed preference update keeps the persisted destination", async () => {
  usePermission.mockReturnValue({ isSeller: true, can: () => true });
  apiRequest.mockImplementation((method, path) => method === "PATCH"
    ? Promise.reject(new Error("Update failed"))
    : Promise.resolve(path.includes("organizations") ? { data: { items: [] } }
      : response(30, { payoutPreference: { destination: "razorpayx", organizationId: "org-a" } })));
  await render();
  await act(async () => { container.querySelectorAll('input[type="radio"]')[1].click(); });
  expect(container.querySelectorAll('input[type="radio"]')[0].checked).toBe(true);
  expect(container.querySelectorAll('input[type="radio"]')[1].checked).toBe(false);
});

test("successful destination update reloads the persisted preference", async () => {
  usePermission.mockReturnValue({ isSeller: true, can: () => true });
  let destination = "razorpayx";
  apiRequest.mockImplementation((method, path, payload) => {
    if (method === "PATCH") destination = payload.payoutDestination;
    return Promise.resolve(path.includes("organizations") ? { data: { items: [] } }
      : response(30, { payoutPreference: { destination, organizationId: "org-a" } }));
  });
  await render();
  await act(async () => { container.querySelectorAll('input[type="radio"]')[1].click(); });
  await act(async () => { container.querySelectorAll('button[aria-expanded="false"]').forEach(button => button.click()); });
  expect(container.querySelectorAll('input[type="radio"]')[1].checked).toBe(true);
});

test("finance refresh reloads wallet balances after payout operations", async () => {
  apiRequest.mockResolvedValueOnce(response(111)).mockResolvedValueOnce(response(222));
  await render({ sellerId: "seller-a", refreshKey: false });
  await render({ sellerId: "seller-a", refreshKey: true });
  expect(apiRequest).toHaveBeenCalledTimes(2);
  expect(container.textContent).toContain("222");
  expect(container.textContent).not.toContain("111");
});

test("wallet refresh also reloads saved bank details", async () => {
  usePermission.mockReturnValue({ isSeller: true, can: () => true });
  let bankName = "Original bank";
  apiRequest.mockImplementation((_method, path) => Promise.resolve(path.includes("organizations")
    ? { data: { items: [{ id: "org-a", bankDetails: { bankName, accountHolderName: "Seller", accountNumber: "12345678", ifscCode: "BANK0001234" } }] } }
    : response(30, { payoutPreference: { destination: "razorpayx", organizationId: "org-a" } })));
  await render();
  expect(container.textContent).toContain("Original bank");
  bankName = "Updated bank";
  await act(async () => { container.querySelector('button[aria-label="Refresh wallet"]').click(); });
  await act(async () => { container.querySelectorAll('button[aria-expanded="false"]').forEach(button => button.click()); });
  expect(container.textContent).toContain("Updated bank");
  expect(container.textContent).not.toContain("Original bank");
});
