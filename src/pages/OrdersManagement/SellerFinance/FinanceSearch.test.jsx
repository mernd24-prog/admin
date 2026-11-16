import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import FinanceStatements from "./FinanceStatements";
import FinanceAdjustments from "./FinanceAdjustments";
jest.mock("react-redux", () => ({ useDispatch: jest.fn(), useSelector: jest.fn() }));
jest.mock("../../../Redux/sellerCommissionsSlice", () => ({
  getMySellerSettlements: () => ({}), getMyPromotionFundingLedger: () => ({}), getMySellerWalletSummary: () => ({}),
}));
jest.mock("../../../_helpers/axiosProvider", () => ({ axiosPrivate: { get: async () => ({ data: { data: [] } }) } }));
jest.mock("../../../components/Loader/Loader", () => () => null);
jest.mock("../../../_helpers/downloadApi", () => ({ downloadApiFile: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;
let container, root;
const state = { sellerCommissions: {
  mySettlementsData: { data: { items: [
    { id: "alpha", net_amount: 1250, status: "paid", created_at: "2026-11-13" },
    { id: "beta", net_amount: 750, status: "pending", created_at: "2026-11-14" },
  ] } },
  promotionLedgerData: { data: { items: [
    { id: "promo-alpha", orderId: "order-alpha", orderNumber: "ORD-ALPHA", netPlatformContributionAmount: 25, status: "paid" },
    { id: "promo-beta", orderId: "order-beta", orderNumber: "ORD-BETA", netPlatformContributionAmount: 75, status: "pending" },
  ] } },
  walletSummaryData: { data: { items: [], balances: {} } },
} };
beforeEach(() => {
  useDispatch.mockReturnValue(() => ({ unwrap: async () => ({}) }));
  useSelector.mockImplementation(selector => selector(state));
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
// ReactDOM createRoot requires act; no Testing Library helpers are used.
// eslint-disable-next-line testing-library/no-unnecessary-act
const mountPage = async Component => { await act(async () => root.render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Component /></MemoryRouter>)); };
const search = async value => {
  const input = container.querySelector('input[type="text"]');
  await act(async () => Simulate.change(input, { target: { value } }));
};
const body = () => container.querySelector("tbody").textContent;
test("statement search filters references and clears", async () => {
  await mountPage(FinanceStatements);
  await search("alpha"); expect(body().toLowerCase()).toContain("alpha"); expect(body().toLowerCase()).not.toContain("beta");
  await search("1250"); expect(body().toLowerCase()).toContain("alpha"); expect(body().toLowerCase()).not.toContain("beta");
  await search("no-match"); expect(body().toLowerCase()).not.toContain("beta");
  await search(""); expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
});
test("adjustment search filters display order numbers, amounts and clears", async () => {
  await mountPage(FinanceAdjustments);
  await search("ORD-ALPHA"); expect(body()).toContain("ORD-ALPHA"); expect(body()).not.toContain("ORD-BETA");
  await search("75"); expect(body()).toContain("ORD-BETA"); expect(body()).not.toContain("ORD-ALPHA");
  await search(""); expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
});
