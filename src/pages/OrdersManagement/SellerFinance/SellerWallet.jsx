import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MdAccountBalanceWallet, MdHourglassTop, MdLock, MdPayments, MdRefresh } from "react-icons/md";
import PageHeader from "../../../components/Shared/PageHeader";
import StatusBadge from "../../../components/Shared/StatusBadge";
import Loader from "../../../components/Loader/Loader";
import { getMySellerWalletSummary } from "../../../Redux/sellerCommissionsSlice";
import { formatCurrency, formatDateTime, formatLabel } from "../../../utils/formatters";
import { toast } from "sonner";

const unwrap = (value = {}) => value?.data?.data || value?.data || {};
const money = (value, currency = "INR") => formatCurrency(Number(value || 0), "₹0", currency);
const label = (value = "") => String(value || "pending").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const BalanceCard = ({ title, value, hint, icon, tone = "blue" }) => {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    purple: "border-purple-200 bg-purple-50 text-purple-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide opacity-75">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>
        <span className="rounded-lg bg-white/70 p-2 text-xl">{icon}</span>
      </div>
      <p className="mt-2 text-xs opacity-80">{hint}</p>
    </div>
  );
};

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
        <BalanceCard title="Available for payout" value={money(balances.availableBalance, currency)} hint={`${counts.available || 0} eligible order entries`} icon={<MdAccountBalanceWallet />} tone="green" />
        <BalanceCard title="Pending receivable" value={money(balances.pendingBalance, currency)} hint={wallet.nextEligibleAt ? `Next release ${formatDateTime(wallet.nextEligibleAt)}` : "Waiting for delivery or return window"} icon={<MdHourglassTop />} tone="amber" />
        <BalanceCard title="On hold" value={money(balances.blockedBalance, currency)} hint={`${counts.blocked || 0} entries under return, refund, or dispute hold`} icon={<MdLock />} tone="red" />
        <BalanceCard title="Payout in process" value={money(balances.inProcessBalance, currency)} hint={`${wallet.payouts?.inProcessCount || 0} payout requests processing`} icon={<MdPayments />} tone="blue" />
        <BalanceCard title="Total paid" value={money(balances.paidBalance, currency)} hint={`${wallet.payouts?.paidCount || 0} completed payouts`} icon={<MdPayments />} tone="purple" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div><h2 className="text-[18px] font-medium text-gray-900">Receivable ledger</h2><p className="text-xs text-gray-500">Order-level movement from pending to payout.</p></div>
            <span className="text-xs text-gray-500">{wallet.total || items.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Net receivable</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Reason / release</th><th className="px-4 py-3">Updated</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => <tr key={item.commissionId} className="hover:bg-gray-50"><td className="px-4 py-3"><button type="button" className="font-mono text-xs font-semibold text-blue-700 hover:underline" onClick={() => navigate(`/app/orders/view/${item.orderId}`)}>{String(item.orderId || "—").slice(0, 12)}</button></td><td className="px-4 py-3 font-semibold">{money(item.netAmount, item.currency || currency)}</td><td className="px-4 py-3"><StatusBadge status={item.releaseStatus || item.status} dot /></td><td className="px-4 py-3"><div className="max-w-xs text-xs text-gray-600">{formatLabel(item.releaseReason || label(item.releaseStatus))}</div>{item.eligibleAt && <div className="mt-1 text-[11px] text-gray-400">Eligible {formatDateTime(item.eligibleAt)}</div>}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{formatDateTime(item.updatedAt || item.createdAt)}</td></tr>)}
                {!items.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No seller wallet entries yet.</td></tr>}
              </tbody>
            </table>
          </div>
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
