import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  MdAccountBalance,
  MdLocalOffer,
  MdPayments,
  MdStorefront,
  MdUndo,
} from "react-icons/md";
import PageHeader from "../../../components/Shared/PageHeader";
import SummaryCard from "../../../components/Shared/SummaryCard";
import { isSellerPanel } from "../../../_helpers/panelConfig";
import {
  getMyPromotionFundingLedger,
  getPromotionFundingLedger,
} from "../../../Redux/sellerCommissionsSlice";

const money = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(Number(value || 0));

const statusClass = {
  reserved: "bg-gray-100 text-gray-700",
  earned: "bg-blue-100 text-blue-700",
  settled: "bg-green-100 text-green-700",
  reversed: "bg-red-100 text-red-700",
};

const PromotionFundingLedger = () => {
  const dispatch = useDispatch();
  const sellerMode = isSellerPanel();
  const state = useSelector((store) => store.sellerCommissions?.promotionLedgerData);
  const payload = state?.data?.data || state?.data || {};
  const rows = Array.isArray(payload?.items) ? payload.items : [];
  const totals = payload?.totals || {};
  const [filters, setFilters] = useState({ search: "", fundingType: "", limit: 50, offset: 0 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const action = sellerMode ? getMyPromotionFundingLedger : getPromotionFundingLedger;
      await dispatch(action(filters)).unwrap();
    } catch (error) {
      toast.error(error?.message || "Failed to load promotion funding ledger");
    } finally {
      setLoading(false);
    }
  }, [dispatch, filters, sellerMode]);

  useEffect(() => { load(); }, [load]);

  const cards = [
    ["Customer discounts", totals.customerDiscountAmount, "Total promotion shown to customers", MdLocalOffer],
    ["Marketplace contribution", totals.marketplaceContributionAmount, "Platform-funded seller invoice payment", MdStorefront],
    ["Payment partner contribution", totals.paymentPartnerContributionAmount, "Bank/payment-partner-funded payment", MdAccountBalance],
    ["Contribution reversals", totals.reversalAmount, "Reversed for refunded items", MdUndo],
    ["Net contribution", totals.netPlatformContributionAmount, "Still payable or already settled", MdPayments],
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Promotion Funding Ledger"
        subtitle="Item-level proof of who funded each discount and how it reached the seller invoice."
        breadcrumbs={[
          { label: sellerMode ? "My Finance & Payouts" : "Seller Finance & Payouts" },
          { label: "Promotion Funding Ledger" },
        ]}
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        A marketplace contribution is not extra commission. Example: for a ₹1,000 seller invoice with a
        ₹500 marketplace promotion, customer payment ₹500 + marketplace contribution ₹500 = seller invoice ₹1,000.
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, hint, Icon]) => (
          <SummaryCard
            key={label}
            title={label}
            value={money(value)}
            description={hint}
            icon={<Icon size={18} />}
          />
        ))}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-[1fr_240px_auto]">
          <input
            className="admin-input"
            placeholder="Search order, product, or SKU"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, offset: 0 }))}
          />
          <select
            className="admin-input"
            value={filters.fundingType}
            onChange={(event) => setFilters((current) => ({ ...current, fundingType: event.target.value, offset: 0 }))}
          >
            <option value="">All funding sources</option>
            <option value="marketplace">Marketplace</option>
            <option value="seller">Seller</option>
            <option value="shared">Shared</option>
            <option value="payment_partner">Payment partner</option>
          </select>
          <button type="button" className="admin-btn-secondary" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Order / Item</th>
                {!sellerMode && <th className="px-4 py-3">Seller</th>}
                <th className="px-4 py-3">Funding</th>
                <th className="px-4 py-3 text-right">Customer Discount</th>
                <th className="px-4 py-3 text-right">Seller-funded</th>
                <th className="px-4 py-3 text-right">Platform / Partner</th>
                <th className="px-4 py-3 text-right">Reversed</th>
                <th className="px-4 py-3 text-right">Net Contribution</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-gray-500">
                    {Number(filters.offset || 0) + index + 1}.
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-semibold">{row.orderNumber || row.orderId}</div>
                    <div className="mt-1 font-medium text-gray-900">{row.productTitle || "Order item"}</div>
                    <div className="text-xs text-gray-500">{row.productSku || "No SKU"} · Qty {row.quantity}</div>
                  </td>
                  {!sellerMode && <td className="px-4 py-3 font-mono text-xs">{row.sellerId}</td>}
                  <td className="px-4 py-3 capitalize">{String(row.fundingType || "").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-right">{money(row.customerDiscountAmount, row.currency)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{money(row.sellerFundedDiscountAmount, row.currency)}</td>
                  <td className="px-4 py-3 text-right text-blue-700">
                    {money(Number(row.marketplaceContributionAmount || 0) + Number(row.paymentPartnerContributionAmount || 0), row.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-700">{money(row.reversalAmount, row.currency)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{money(row.netPlatformContributionAmount, row.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass[row.status] || statusClass.reserved}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.payoutId || "Not batched"}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={sellerMode ? 10 : 11} className="px-4 py-10 text-center text-gray-500">
                  {loading ? "Loading promotion entries…" : "No funded discounts found."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default PromotionFundingLedger;
