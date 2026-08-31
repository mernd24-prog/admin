import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MdArrowForward, MdRefresh, MdTune, MdVisibility } from "react-icons/md";
import PageHeader from "../../../components/Shared/PageHeader";
import DataTable from "../../../components/Shared/DataTable";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import { OrderLink } from "../../../components/Shared/EntityLink";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { getMyPromotionFundingLedger, getMySellerWalletSummary } from "../../../Redux/sellerCommissionsSlice";
import { FinanceChoiceFilters, FinanceEmptyState, FinanceMetricCard, FinanceNav, FinancePageGuide, FinanceStatusBadge, financeDateTime, financeMoney, signedFinanceMoney, unwrapFinance } from "./financeUi";

const CATEGORIES = [["", "All"], ["returns", "Returns & refunds"], ["promotions", "Promotions"], ["cod", "COD"], ["holds", "Holds"], ["recoveries", "Recoveries"], ["other", "Other"]];
export default function FinanceAdjustments() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const category = params.get("type") || "";
  const promotionState = useSelector((store) => store.sellerCommissions?.promotionLedgerData || {});
  const walletState = useSelector((store) => store.sellerCommissions?.walletSummaryData || {});
  const promotionPayload = unwrapFinance(promotionState);
  const wallet = unwrapFinance(walletState);
  const totals = promotionPayload.totals || {};
  const balances = wallet.balances || {};
  const [codRows, setCodRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [, , codResponse] = await Promise.all([
        dispatch(getMyPromotionFundingLedger({ limit: 100, offset: 0 })).unwrap(),
        dispatch(getMySellerWalletSummary({ limit: 100, offset: 0 })).unwrap(),
        axiosProvider.get(ENDPOINTS.payments.myCodCollections),
      ]);
      const codData = codResponse?.data?.data;
      setCodRows(Array.isArray(codData) ? codData : codData?.items || codData?.list || []);
    } catch (error) { toast.error(error?.response?.data?.message || error?.message || "Unable to load adjustments"); }
    finally { setLoading(false); }
  }, [dispatch]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const promotionRows = Array.isArray(promotionPayload.items) ? promotionPayload.items : [];
    const walletItems = Array.isArray(wallet.items) ? wallet.items : [];
    const promotions = promotionRows.map((row) => ({ ...row, adjustmentType: "promotions", title: Number(row.reversalAmount || 0) > 0 ? "Reversed promotion" : "Marketplace funded promotion", amount: Number(row.netPlatformContributionAmount || 0), description: "The customer promotion is split by funding source. Marketplace contribution is included toward your receivable, not charged as commission." }));
    const cod = codRows.map((row) => ({ ...row, adjustmentType: "cod", title: "COD amount collected", amount: -Math.abs(Number(row.collected_amount || row.expected_amount || 0)), description: "You collected this amount directly from the customer. Once verified, it is recovered from available or future earnings." }));
    const holds = walletItems.filter((row) => ["held", "blocked", "on_hold"].includes(String(row.releaseStatus || row.status || "").toLowerCase())).map((row) => ({ ...row, adjustmentType: "holds", title: "Temporary hold", amount: Number(row.netAmount || row.net_amount || 0), description: "This earning is temporarily unavailable while a return, refund, dispute, or another hold is active." }));
    const refunds = walletItems.filter((row) => Number(row.refundAmount || row.refund_amount || 0) !== 0).map((row) => ({ ...row, adjustmentType: "returns", title: "Return or refund adjustment", amount: -Math.abs(Number(row.refundAmount || row.refund_amount || 0)), description: "The related earning was reduced because an item was returned or refunded." }));
    const other = walletItems.filter((row) => Number(row.adjustmentAmount || row.adjustment_amount || 0) !== 0).map((row) => ({ ...row, adjustmentType: "other", title: "Other adjustment", amount: Number(row.adjustmentAmount || row.adjustment_amount || 0), description: "An adjustment recorded by the existing settlement calculation." }));
    return [...refunds, ...promotions, ...cod, ...holds, ...other].filter((row) => !category || row.adjustmentType === category);
  }, [category, codRows, promotionPayload.items, wallet.items]);
  const owed = Math.abs(Number(balances.codLiabilityBalance || 0));
  const columns = useMemo(() => [
    { key: "title", label: "Adjustment", render: (value, row) => <div><strong>{value}</strong><p className="mt-1 max-w-md text-xs leading-5 text-[var(--admin-muted)]">{row.description}</p></div> },
    { key: "order", label: "Order", render: (_, row) => row.orderId || row.order_id ? <OrderLink orderId={row.orderId || row.order_id} orderNumber={row.orderNumber || row.order_number} /> : "—" },
    { key: "amount", label: "Amount", render: (value, row) => <strong className={Number(value) < 0 ? "text-red-700" : row.adjustmentType === "holds" ? "text-amber-700" : "text-emerald-700"}>{row.adjustmentType === "holds" ? financeMoney(value, row.currency) : signedFinanceMoney(value, row.currency)}</strong> },
    { key: "status", label: "Status", render: (_, row) => <FinanceStatusBadge row={row} /> },
    { key: "created", label: "Date", render: (_, row) => financeDateTime(row.createdAt || row.created_at || row.updatedAt) },
    { key: "action", label: "Action", render: (_, row) => <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => setDetail(row)}><MdVisibility /> View details</button> },
  ], []);
  return <div className="space-y-5"><PageHeader title="Adjustments" subtitle="Understand why your earnings changed." breadcrumbs={[{ label: "My Finance & Payouts" }, { label: "Adjustments" }]} actions={<button type="button" className="admin-btn-secondary" onClick={load}><MdRefresh /> Refresh</button>} /><FinanceNav />
    <FinancePageGuide step="3" icon={MdTune} title="See why your balance changed" description="Credits add money and deductions reduce it. Returns, promotions, collected COD and temporary holds are separated here." points={["A minus amount reduces your balance", "Open details to see the reason"]} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><FinanceMetricCard tone="red" label="Returns & refunds" value={financeMoney(wallet.refundAdjustmentTotal || 0)} description="Earnings reversed because of returns or refunds." /><FinanceMetricCard tone="green" label="Promotion contribution" value={financeMoney(totals.netPlatformContributionAmount)} description="Marketplace contribution remaining after reversals." /><FinanceMetricCard tone="red" label="COD amount owed" value={financeMoney(owed)} description="Seller-collected customer cash still owed to the platform." /><FinanceMetricCard tone="amber" label="Temporary holds" value={financeMoney(balances.blockedBalance)} description="Unavailable while an issue is active." /></div>
    <FinanceChoiceFilters label="Filter adjustments" value={category} onChange={(key) => setParams(key ? { type: key } : {})} options={CATEGORIES} />
    {category === "cod" && <button type="button" onClick={() => navigate("/app/seller-cod-collections")} className="admin-card flex w-full items-center justify-between p-4 text-left"><div><strong>Submit or manage a COD collection</strong><p className="mt-1 text-xs text-[var(--admin-muted)]">Upload collection proof and send it for Admin verification.</p></div><MdArrowForward /></button>}
    {rows.length || loading ? <DataTable columns={columns} data={rows} loading={loading} totalCount={rows.length} pageSize={20} rowKey={(row) => `${row.adjustmentType}-${row.id || row.orderId || row.shipment_id}`} emptyText="No adjustments found." /> : <FinanceEmptyState title="No adjustments" description="There are currently no returns, refunds, COD recoveries, or other adjustments affecting your earnings." />}
    <DefaultModal isOpen={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.title || "Adjustment details"} isButtonView={false}>{detail && <div className="space-y-4 p-2"><div className="rounded-lg bg-[var(--admin-soft)] p-4"><div className="flex justify-between gap-4"><span className="text-sm text-[var(--admin-muted)]">Amount</span><strong className="text-xl">{signedFinanceMoney(detail.amount, detail.currency)}</strong></div><p className="mt-3 text-sm leading-6">{detail.description}</p></div>{detail.adjustmentType === "promotions" && <div className="space-y-2 rounded-lg border border-[var(--admin-line)] p-4 text-sm"><div className="flex justify-between"><span>Customer discount</span><span>{financeMoney(detail.customerDiscountAmount, detail.currency)}</span></div><div className="flex justify-between"><span>Marketplace funded</span><span>{financeMoney(detail.marketplaceContributionAmount, detail.currency)}</span></div><div className="flex justify-between"><span>Seller funded</span><span>{financeMoney(detail.sellerFundedDiscountAmount, detail.currency)}</span></div><div className="flex justify-between"><span>Payment partner funded</span><span>{financeMoney(detail.paymentPartnerContributionAmount, detail.currency)}</span></div><div className="flex justify-between"><span>Reversed</span><span>{financeMoney(detail.reversalAmount, detail.currency)}</span></div></div>}</div>}</DefaultModal>
  </div>;
}
