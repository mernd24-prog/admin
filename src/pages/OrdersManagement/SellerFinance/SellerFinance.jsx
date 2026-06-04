import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  MdCalculate,
  MdCheckCircle,
  MdClose,
  MdPayments,
  MdRefresh,
  MdSearch,
} from "react-icons/md";
import { PageHeader, StatusBadge } from "../../../components/Shared";
import {
  calculateSellerCommission,
  completeSellerPayout,
  failSellerPayout,
  getAdminSellerCommissions,
  getAdminSellerPayouts,
  getSellerFinanceSummary,
  getSellerSettlements,
  processSellerPayouts,
} from "../../../Redux/sellerCommissionsSlice";

const unwrap = (payload) => payload?.data?.data || payload?.data || {};
const listOf = (payload) => {
  const root = unwrap(payload);
  return root.items || root.list || root.rows || [];
};

const money = (value) => {
  const numeric = Number(value || 0);
  return `₹${numeric.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const shortId = (value = "") => {
  const text = String(value || "");
  return text.length > 12 ? `${text.slice(0, 8)}...${text.slice(-4)}` : text || "-";
};

const dateTime = (value) => (value ? new Date(value).toLocaleString() : "-");

const MetricCard = ({ label, value, hint }) => (
  <div className="rounded-lg border border-[#E6E6E6] bg-white p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-[#65718b]">{label}</p>
    <p className="mt-2 text-xl font-semibold text-[#202337]">{value}</p>
    {hint ? <p className="mt-1 text-xs text-[#65718b]">{hint}</p> : null}
  </div>
);

const IconButton = ({ title, icon, onClick, disabled = false, tone = "blue" }) => {
  const toneClass = {
    blue: "text-[#2f6fed] hover:bg-[#f3f6ff]",
    green: "text-[#208a3c] hover:bg-[#effbf4]",
    red: "text-[#d92d20] hover:bg-[#fff1f0]",
  }[tone] || "text-[#2f6fed] hover:bg-[#f3f6ff]";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${toneClass} disabled:cursor-not-allowed disabled:opacity-40`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </button>
  );
};

const TableShell = ({ title, headings, children, emptyText }) => (
  <section className="rounded-lg border border-[#E6E6E6] bg-white">
    <div className="border-b border-[#E6E6E6] px-4 py-3">
      <h2 className="text-sm font-semibold text-[#202337]">{title}</h2>
    </div>
    <div className="overflow-auto">
      <table className="min-w-full divide-y divide-[#EEF1F6] text-sm">
        <thead className="bg-[#f8faff] text-left text-xs font-semibold uppercase text-[#65718b]">
          <tr>
            {headings.map((heading) => (
              <th key={heading} className="whitespace-nowrap px-4 py-3">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF1F6] text-[#202337]">
          {children || (
            <tr>
              <td className="px-4 py-6 text-center text-[#65718b]" colSpan={headings.length}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);

const SellerFinance = () => {
  const dispatch = useDispatch();
  const financeState = useSelector((state) => state.sellerCommissions);
  const [filters, setFilters] = useState({ sellerId: "", status: "", search: "" });
  const [orderId, setOrderId] = useState("");
  const [payoutSellerId, setPayoutSellerId] = useState("");

  const loadFinance = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(getSellerFinanceSummary(filters)).unwrap(),
        dispatch(getAdminSellerCommissions({ ...filters, limit: 100 })).unwrap(),
        dispatch(getAdminSellerPayouts({ ...filters, limit: 100 })).unwrap(),
        dispatch(getSellerSettlements({ sellerId: filters.sellerId, limit: 50 })).unwrap(),
      ]);
    } catch (error) {
      toast.error(error || "Unable to load seller finance");
    }
  }, [dispatch, filters]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  const summary = unwrap(financeState.financeSummaryData?.data);
  const commissions = listOf(financeState.adminCommissionsData?.data);
  const payouts = listOf(financeState.adminPayoutsData?.data);
  const settlements = listOf(financeState.settlementsData?.data);
  const loading = financeState.loading;

  const metrics = useMemo(() => [
    {
      label: "Gross Sales",
      value: money(summary?.commissions?.grossAmount),
      hint: `${summary?.commissions?.count || 0} commission rows`,
    },
    {
      label: "Platform Commission",
      value: money(summary?.commissions?.commissionAmount),
      hint: `${money(summary?.commissions?.commissionTaxAmount)} GST on commission`,
    },
    {
      label: "Refund Adjustments",
      value: money(summary?.commissions?.refundAmount),
      hint: "Applied against seller payable",
    },
    {
      label: "Seller Payable",
      value: money(summary?.commissions?.payableAmount),
      hint: `${money(summary?.payouts?.paidAmount)} already paid`,
    },
  ], [summary]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleCalculate = async () => {
    if (!orderId.trim()) {
      toast.error("Order ID is required");
      return;
    }
    try {
      await dispatch(calculateSellerCommission({ orderId: orderId.trim() })).unwrap();
      toast.success("Commission recalculated");
      setOrderId("");
      await loadFinance();
    } catch (error) {
      toast.error(error || "Unable to calculate commission");
    }
  };

  const handleProcessPayout = async () => {
    if (!payoutSellerId.trim()) {
      toast.error("Seller ID is required");
      return;
    }
    try {
      await dispatch(processSellerPayouts({
        sellerId: payoutSellerId.trim(),
        paymentReference: `admin_${Date.now()}`,
        paymentMethod: "manual",
      })).unwrap();
      toast.success("Payout processed");
      setPayoutSellerId("");
      await loadFinance();
    } catch (error) {
      toast.error(error || "Unable to process payout");
    }
  };

  const handleCompletePayout = async (payout) => {
    const paymentReference = window.prompt("Payment reference", payout.payment_reference || `manual_${Date.now()}`);
    if (!paymentReference) return;
    try {
      await dispatch(completeSellerPayout({
        payoutId: payout.id,
        paymentReference,
        paymentMethod: payout.payment_method || "manual",
      })).unwrap();
      toast.success("Payout completed");
      await loadFinance();
    } catch (error) {
      toast.error(error || "Unable to complete payout");
    }
  };

  const handleFailPayout = async (payout) => {
    const reason = window.prompt("Failure reason", "Payment failed");
    if (!reason) return;
    try {
      await dispatch(failSellerPayout({ payoutId: payout.id, reason })).unwrap();
      toast.success("Payout released back to pending");
      await loadFinance();
    } catch (error) {
      toast.error(error || "Unable to fail payout");
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-3 md:p-5">
      <PageHeader
        title="Seller Finance"
        subtitle="Commission, settlement, refund adjustment, and payout management"
        breadcrumbs={[
          { label: "Home", to: "/app/home" },
          { label: "Orders Management" },
          { label: "Seller Finance" },
        ]}
        actions={(
          <button type="button" className="admin-btn-secondary" onClick={loadFinance} disabled={loading}>
            <MdRefresh size={17} /> Refresh
          </button>
        )}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-[#E6E6E6] bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#202337]">
            <MdSearch size={18} /> Filters
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-1">
            <input className="min-h-[38px] rounded-md border border-[#E6E6E6] px-3 text-sm outline-none focus:border-[#2f6fed]" placeholder="Seller ID" value={filters.sellerId} onChange={(event) => updateFilter("sellerId", event.target.value)} />
            <input className="min-h-[38px] rounded-md border border-[#E6E6E6] px-3 text-sm outline-none focus:border-[#2f6fed]" placeholder="Search order, seller, payout..." value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} />
            <select className="min-h-[38px] rounded-md border border-[#E6E6E6] px-3 text-sm outline-none focus:border-[#2f6fed]" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg border border-[#E6E6E6] bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#202337]">
            <MdCalculate size={18} /> Recalculate Order Commission
          </div>
          <div className="flex gap-2">
            <input className="min-h-[38px] min-w-0 flex-1 rounded-md border border-[#E6E6E6] px-3 text-sm outline-none focus:border-[#2f6fed]" placeholder="Order ID" value={orderId} onChange={(event) => setOrderId(event.target.value)} />
            <button type="button" className="inline-flex min-h-[38px] items-center justify-center rounded-md bg-[#2f6fed] px-4 text-sm font-medium text-white" onClick={handleCalculate}>
              Run
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-[#E6E6E6] bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#202337]">
            <MdPayments size={18} /> Process Seller Payout
          </div>
          <div className="flex gap-2">
            <input className="min-h-[38px] min-w-0 flex-1 rounded-md border border-[#E6E6E6] px-3 text-sm outline-none focus:border-[#2f6fed]" placeholder="Seller ID" value={payoutSellerId} onChange={(event) => setPayoutSellerId(event.target.value)} />
            <button type="button" className="inline-flex min-h-[38px] items-center justify-center rounded-md bg-[#208a3c] px-4 text-sm font-medium text-white" onClick={handleProcessPayout}>
              Pay
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <TableShell title="Seller Commissions" headings={["Order", "Seller", "Gross", "Commission", "GST", "Refund", "Payable", "Status", "Created"]} emptyText="No commissions found">
          {commissions.length ? commissions.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{shortId(row.order_id)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{shortId(row.seller_id)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.amount)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.commission_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.tax_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.refund_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold">{money(row.net_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={row.status} dot /></td>
              <td className="whitespace-nowrap px-4 py-3">{dateTime(row.created_at)}</td>
            </tr>
          )) : null}
        </TableShell>

        <TableShell title="Seller Payouts" headings={["Payout", "Seller", "Period", "Gross", "Commission", "Refund", "Net", "Status", "Actions"]} emptyText="No payouts found">
          {payouts.length ? payouts.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{shortId(row.id)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{shortId(row.seller_id)}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.period_start} - {row.period_end}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.total_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.commission_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.refund_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold">{money(row.net_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={row.status} dot /></td>
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex items-center gap-1">
                  <IconButton title="Complete payout" tone="green" icon={<MdCheckCircle size={18} />} onClick={() => handleCompletePayout(row)} disabled={row.status === "completed"} />
                  <IconButton title="Fail payout" tone="red" icon={<MdClose size={18} />} onClick={() => handleFailPayout(row)} disabled={row.status === "completed" || row.status === "failed"} />
                </div>
              </td>
            </tr>
          )) : null}
        </TableShell>
      </div>

      <div className="mt-4">
        <TableShell title="Settlement Ledger" headings={["Settlement", "Seller", "Payout", "Gross", "Commission", "Refund", "Adjustment", "Net", "Status", "Created"]} emptyText="No settlements found">
          {settlements.length ? settlements.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{shortId(row.id)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{shortId(row.seller_id)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{shortId(row.payout_id)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.gross_amount || row.amount)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.commission_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.refund_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.adjustment_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold">{money(row.net_amount || row.amount)}</td>
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={row.status} dot /></td>
              <td className="whitespace-nowrap px-4 py-3">{dateTime(row.created_at)}</td>
            </tr>
          )) : null}
        </TableShell>
      </div>
    </div>
  );
};

export default SellerFinance;
