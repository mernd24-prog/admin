import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MdAccountBalanceWallet, MdHourglassTop, MdLock, MdPayments, MdRefresh } from "react-icons/md";
import PageHeader from "../../../components/Shared/PageHeader";
import StatusBadge from "../../../components/Shared/StatusBadge";
import Loader from "../../../components/Loader/Loader";
import SummaryCard from "../../../components/Shared/SummaryCard";
import DataTable from "../../../components/Shared/DataTable";
import { getMySellerWalletSummary } from "../../../Redux/sellerCommissionsSlice";
import { formatCurrency, formatDateTime12Hour, formatLabel } from "../../../utils/formatters";
import { toast } from "sonner";

const unwrap = (value = {}) => value?.data?.data || value?.data || {};
const money = (value, currency = "INR") => formatCurrency(Number(value || 0), "₹0", currency);
const label = (value = "") => String(value || "pending").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

export default function SellerWallet() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const walletState = useSelector((state) => state.sellerCommissions?.walletSummaryData || {});
  const wallet = unwrap(walletState);
  const balances = wallet.balances || {};
  const counts = wallet.counts || {};
  const currency = wallet.currency || "INR";
  const items = Array.isArray(wallet.items) ? wallet.items : [];
  const loading = Boolean(walletState.loading);
  const ledgerColumns = useMemo(() => [
    {
      key: "orderId",
      label: "Order",
      render: (value) => (
        <button
          type="button"
          className="font-mono text-xs font-semibold text-blue-700 hover:underline"
          onClick={() => navigate(`/app/orders/view/${value}`)}
        >
          {String(value || "—").slice(0, 12)}
        </button>
      ),
    },
    {
      key: "netAmount",
      label: "Net receivable",
      cellClassName: "font-semibold",
      render: (value, item) => money(value, item.currency || currency),
    },
    {
      key: "releaseStatus",
      label: "Status",
      render: (value, item) => <StatusBadge status={value || item.status} dot />,
    },
    {
      key: "releaseReason",
      label: "Reason / release",
      render: (value, item) => (
        <div>
          <div className="max-w-xs text-xs text-gray-600">
            {formatLabel(value || label(item.releaseStatus))}
          </div>
          {item.eligibleAt && (
            <div className="mt-1 text-[11px] text-gray-400">
              Eligible {formatDateTime12Hour(item.eligibleAt)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "updatedAt",
      label: "Updated",
      cellClassName: "whitespace-nowrap text-xs text-gray-500",
      render: (value, item) => formatDateTime12Hour(value || item.createdAt),
    },
  ], [currency, navigate]);

  const load = useCallback(async () => {
    try {
      await dispatch(getMySellerWalletSummary({ limit: 100, offset: 0 })).unwrap();
    } catch (error) {
      toast.error(error?.message || error || "Unable to load seller wallet");
    }
  }, [dispatch]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <Loader loading={loading} />
      <PageHeader
        title="Wallet"
        subtitle="Track receivables, holds, payout processing, adjustments, and released earnings."
        breadcrumbs={[{ label: "My Finance & Payouts" }, { label: "Wallet" }]}
        actions={<button type="button" className="admin-btn-secondary inline-flex items-center gap-2" onClick={load}><MdRefresh /> Refresh</button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
  <SummaryCard
    title="Available for payout"
    value={money(balances.availableBalance, currency)}
    description={`${counts.available || 0} eligible order entries`}
    icon={<MdAccountBalanceWallet size={22} />}
  />

  <SummaryCard
    title="Pending receivable"
    value={money(balances.pendingBalance, currency)}
    description={
      wallet.nextEligibleAt
        ? `Next release ${formatDateTime12Hour(wallet.nextEligibleAt)}`
        : "Waiting for delivery or return window"
    }
    icon={<MdHourglassTop size={22} />}
  />

  <SummaryCard
    title="On hold"
    value={money(balances.blockedBalance, currency)}
    description={`${counts.blocked || 0} entries under return, refund, or dispute hold`}
    icon={<MdLock size={22} />}
  />

  <SummaryCard
    title="Payout in process"
    value={money(balances.inProcessBalance, currency)}
    description={`${wallet.payouts?.inProcessCount || 0} payout requests processing`}
    icon={<MdPayments size={22} />}
  />

  <SummaryCard
    title="Total paid"
    value={money(balances.paidBalance, currency)}
    description={`${wallet.payouts?.paidCount || 0} completed payouts`}
    icon={<MdPayments size={22} />}
  />
</div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div><h2 className="text-[18px] font-medium text-gray-900">Receivable ledger</h2><p className="text-xs text-gray-500">Order-level movement from pending to payout.</p></div>
            <span className="text-xs text-gray-500">{wallet.total || items.length} entries</span>
          </div>
          <DataTable
            columns={ledgerColumns}
            data={items}
            loading={loading}
            totalCount={items.length}
            pageSize={Math.max(items.length, 1)}
            rowKey={(item) => item.commissionId || item.orderId}
            emptyText="No seller wallet entries yet."
            cardClassName="overflow-hidden"
          />
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4"><h2 className="text-[18px] font-medium text-gray-900">Payout readiness</h2><div className={`mt-3 rounded-lg p-3 text-sm ${wallet.canRequestPayout ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><strong>{wallet.canRequestPayout ? "Ready for payout" : "Not yet eligible"}</strong><p className="mt-1 text-xs">{wallet.canRequestPayout ? "The available balance meets the payout policy." : wallet.minimumPayoutShortfall > 0 ? `${money(wallet.minimumPayoutShortfall, currency)} more is needed to meet the minimum payout.` : "Wait for pending or held amounts to become available."}</p></div><button type="button" className="admin-btn mt-4 w-full" onClick={() => navigate("/app/seller-payouts")}>View payouts</button></div>
          <div className="rounded-xl border border-gray-200 bg-white p-4"><h2 className="text-[18px] font-medium text-gray-900">Adjustments</h2><p className="mt-2 font-medium text-gray-900">{money(balances.refundAdjustmentBalance, currency)}</p><p className="mt-1 text-xs text-gray-500">Refunds, chargebacks, corrections, and negative balance recovery.</p></div>
          <div className="rounded-xl border border-gray-200 bg-white p-4"><h2 className="text-[18px] font-medium text-gray-900">Total open balance</h2><p className="mt-2 font-medium text-gray-900">{money(balances.totalOpenBalance, currency)}</p><p className="mt-1 text-xs text-gray-500">Pending, available, processing, and held receivables.</p></div>
        </aside>
      </div>
    </div>
  );
}
