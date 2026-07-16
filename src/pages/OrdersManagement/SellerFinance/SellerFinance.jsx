import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  MdCalculate,
  MdCheckCircle,
  MdClose,
  MdDownload,
  MdPayments,
  MdRefresh,
  MdSearch,
} from "react-icons/md";
import {
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";
import { downloadApiFile } from "../../../_helpers/downloadApi";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { apiRequest } from "../../../_helpers/apiConfig";
import {
  calculateSellerCommission,
  completeSellerPayout,
  failSellerPayout,
  getAdminSellerCommissions,
  getAdminSellerPayouts,
  getMySellerSettlements,
  getSellerCommissions,
  getSellerFinanceSummary,
  getSellerPayouts,
  getSellerSettlements,
  processSellerPayouts,
} from "../../../Redux/sellerCommissionsSlice";
import { formatLabel } from "../../../utils/formatters";

const unwrap = (payload) => payload?.data?.data || payload?.data || {};
const listOf = (payload) => {
  const root = unwrap(payload);
  return root.items || root.list || root.rows || [];
};

const money = (value) => {
  const numeric = Number(value || 0);
  return `₹${numeric.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const sellerLabel = (id, options) => options.find((o) => o.value === id)?.label || "Seller details unavailable";
const organizationName = (row = {}) => {
  const snapshot = row.organizationSnapshot || row.organization_snapshot || {};
  return snapshot.storeDisplayName || snapshot.legalBusinessName || row.organizationName || row.organization_name || "Default organization";
};

const dateTime = (value) => (value ? new Date(value).toLocaleString() : "-");
const eligibilityCountdown = (value) => {
  if (!value) return "Waiting for delivery";
  const remaining = new Date(value).getTime() - Date.now();
  if (remaining <= 0) return "Window closed";
  const hours = Math.ceil(remaining / 3600000);
  return hours <= 48 ? `${hours} hour${hours === 1 ? "" : "s"} left` : `${Math.ceil(hours / 24)} days left`;
};
const payoutDecision = (row = {}) => {
  const status = String(row.lifecycleStatus || row.releaseStatus || row.status || "pending").toLowerCase();
  if (["eligible", "available"].includes(status) && !row.payout_id) return { allowed: true, label: "Allowed", reason: "Return window closed; no active hold" };
  if (row.payout_id) return { allowed: false, label: "In Payout", reason: "Already added to a payout" };
  if (["held", "blocked", "on_hold"].includes(status)) return { allowed: false, label: "Held", reason: row.payoutHoldReason || "Return, refund, dispute, or payment hold" };
  if (row.releaseReason === "waiting_for_item_return_window") return { allowed: false, label: "Not Yet", reason: `Return window open · ${eligibilityCountdown(row.returnWindowEndsAt || row.eligibleAt)}` };
  if (!row.deliveredAt) return { allowed: false, label: "Not Yet", reason: "Waiting for delivery" };
  return { allowed: false, label: "Not Yet", reason: row.releaseReason ? formatLabel(row.releaseReason) : "Waiting for eligibility" };
};

const MetricCard = ({ label, value, hint }) => (
  <div className="rounded-lg border border-[#E6E6E6] bg-white p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-[#65718b]">{label}</p>
    <p className="mt-2 text-xl font-semibold text-[#202337]">{value}</p>
    {hint ? <p className="mt-1 text-xs text-[#65718b]">{formatLabel(hint)}</p> : null}
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

const ModalOverlay = ({ isOpen, onClose, title, children, onSubmit, submitting }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl border border-[#E6E6E6] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E6E6E6] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#202337]">{title}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#65718b] hover:bg-[#f3f6ff]">
            <MdClose size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-[#E6E6E6] px-5 py-3">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-md border border-[#E6E6E6] px-4 py-2 text-sm font-medium text-[#65718b] hover:bg-[#f8faff]">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} disabled={submitting} className="rounded-md bg-[#2f6fed] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {submitting ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

const FieldRow = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-[#65718b]">{label}</label>
    {children}
  </div>
);

const inputCls = "min-h-[38px] rounded-md border border-[#E6E6E6] px-3 text-sm outline-none focus:border-[#2f6fed]";

const PAYMENT_METHODS = ["manual", "neft", "rtgs", "imps", "upi", "cheque", "bank_transfer"];

const SellerFinance = () => {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const financeState = useSelector((state) => state.sellerCommissions);
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [filters, setFilters] = useState({
    sellerId: initialParams.get("sellerId") || "",
    organizationId: initialParams.get("organizationId") || "",
    status: "",
    search: initialParams.get("orderId") || "",
  });
  const [orderId, setOrderId] = useState(initialParams.get("orderId") || "");
  const [submitting, setSubmitting] = useState(false);
  const [sellerOptions, setSellerOptions] = React.useState([]);
  const [orderOptions, setOrderOptions] = useState([]);
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [processOrganizationOptions, setProcessOrganizationOptions] = useState([]);

  React.useEffect(() => {
    if (isSeller) return;
    dropdownApi.getSellers({ limit: 100 }).then(setSellerOptions).catch(() => {});
    dropdownApi.getOrders({ limit: 100 }).then(setOrderOptions).catch(() => {});
  }, [isSeller]);

  // Process Payout modal
  const [processModal, setProcessModal] = useState({
    open: false,
    mode: "order",
    orderId: initialParams.get("orderId") || "",
    sellerId: initialParams.get("sellerId") || "",
    organizationId: initialParams.get("organizationId") || "",
    paymentMethod: "manual",
    paymentReference: "",
    periodStart: "",
    periodEnd: "",
    note: "",
  });

  // Complete Payout modal
  const [completeModal, setCompleteModal] = useState({ open: false, payout: null, paymentReference: "", paymentMethod: "manual", note: "" });

  // Fail Payout modal
  const [failModal, setFailModal] = useState({ open: false, payout: null, reason: "", note: "" });

  const loadFinance = useCallback(async () => {
    try {
      if (isSeller) {
        const sellerFilters = {
          status: filters.status,
          search: filters.search,
          limit: 100,
        };
        await Promise.all([
          dispatch(getSellerCommissions(sellerFilters)).unwrap(),
          dispatch(getSellerPayouts(sellerFilters)).unwrap(),
          dispatch(getMySellerSettlements({ ...sellerFilters, limit: 50 })).unwrap(),
        ]);
      } else {
        await Promise.all([
          dispatch(getSellerFinanceSummary(filters)).unwrap(),
          dispatch(getAdminSellerCommissions({ ...filters, limit: 200 })).unwrap(),
          dispatch(getAdminSellerPayouts({ ...filters, limit: 200 })).unwrap(),
          dispatch(getSellerSettlements({ sellerId: filters.sellerId, organizationId: filters.organizationId, limit: 50 })).unwrap(),
        ]);
      }
    } catch (error) {
      toast.error(error?.message || error || "Unable to load seller finance");
    }
  }, [dispatch, filters, isSeller]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  const commissions = listOf(isSeller ? financeState.myCommissionsData?.data : financeState.adminCommissionsData?.data);
  const payouts = listOf(isSeller ? financeState.myPayoutsData?.data : financeState.adminPayoutsData?.data);
  const settlements = listOf(isSeller ? financeState.mySettlementsData?.data : financeState.settlementsData?.data);
  const adminSummary = unwrap(financeState.financeSummaryData?.data);
  const summary = useMemo(() => {
    if (!isSeller) return adminSummary;
    const totals = commissions.reduce(
      (acc, row) => ({
        count: acc.count + 1,
        grossAmount: acc.grossAmount + Number(row.amount || row.gross_amount || row.grossAmount || 0),
        commissionAmount: acc.commissionAmount + Number(row.commission_amount || row.commissionAmount || 0),
        commissionTaxAmount: acc.commissionTaxAmount + Number(row.tax_amount || row.taxAmount || 0),
        refundAmount: acc.refundAmount + Number(row.refund_amount || row.refundAmount || 0),
        payableAmount: acc.payableAmount + Number(row.net_amount || row.netAmount || 0),
      }),
      {
        count: 0,
        grossAmount: 0,
        commissionAmount: 0,
        commissionTaxAmount: 0,
        refundAmount: 0,
        payableAmount: 0,
      },
    );
    const paidAmount = payouts.reduce((total, row) => {
      const status = String(row.status || "").toLowerCase();
      if (!["paid", "completed"].includes(status)) return total;
      return total + Number(row.net_amount || row.netAmount || 0);
    }, 0);
    return {
      commissions: totals,
      payouts: { paidAmount },
    };
  }, [adminSummary, commissions, isSeller, payouts]);
  const loading = financeState.loading;

  const sellerOverview = useMemo(() => {
    const grouped = new Map();
    commissions.forEach((row) => {
      const sellerId = String(row.seller_id || row.sellerId || "unknown");
      const current = grouped.get(sellerId) || {
        sellerId,
        sellerName: row.sellerName || row.seller?.displayName || row.seller?.businessName || sellerLabel(sellerId, sellerOptions),
        gross: 0,
        payable: 0,
        pending: 0,
        eligible: 0,
        held: 0,
        released: 0,
        nextEligibleAt: null,
      };
      current.gross += Number(row.amount || 0);
      current.payable += Number(row.net_amount || row.netAmount || 0);
      const lifecycle = String(row.lifecycleStatus || row.releaseStatus || row.status || "pending").toLowerCase();
      if (["available", "eligible"].includes(lifecycle)) current.eligible += 1;
      else if (["held", "blocked", "on_hold"].includes(lifecycle)) current.held += 1;
      else if (["paid", "released", "completed"].includes(lifecycle)) current.released += 1;
      else current.pending += 1;
      const eligibleAt = row.eligibleAt || row.eligible_at;
      if (eligibleAt && (!current.nextEligibleAt || new Date(eligibleAt) < new Date(current.nextEligibleAt))) {
        current.nextEligibleAt = eligibleAt;
      }
      grouped.set(sellerId, current);
    });
    payouts.forEach((row) => {
      const sellerId = String(row.seller_id || row.sellerId || "unknown");
      const current = grouped.get(sellerId);
      if (!current) return;
      if (["completed", "paid"].includes(String(row.status || "").toLowerCase())) {
        current.released += 1;
      }
    });
    return Array.from(grouped.values()).sort((left, right) => right.eligible - left.eligible || right.pending - left.pending);
  }, [commissions, payouts, sellerOptions]);

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

  const loadOrganizationsForSeller = useCallback(async (sellerId) => {
    if (!sellerId) return [];
    const response = await apiRequest("GET", ENDPOINTS.sellers.organizations(sellerId), { limit: 100 });
    const data = response?.data?.data || response?.normalized?.data || response?.data || {};
    const list = data.organizations || data.items || data.list || [];
    return list.map((item) => ({
      value: item.id || item.organizationId,
      label: item.storeDisplayName || item.legalBusinessName || item.id || item.organizationId,
      status: item.approvalStatus,
    })).filter((item) => item.value);
  }, []);

  useEffect(() => {
    let active = true;
    loadOrganizationsForSeller(filters.sellerId)
      .then((options) => {
        if (!active) return;
        setOrganizationOptions(options);
        setFilters((prev) => (
          prev.organizationId && !options.some((option) => String(option.value) === String(prev.organizationId))
            ? { ...prev, organizationId: "" }
            : prev
        ));
      })
      .catch(() => {
        if (active) setOrganizationOptions([]);
      });
    return () => { active = false; };
  }, [filters.sellerId, loadOrganizationsForSeller]);

  useEffect(() => {
    let active = true;
    loadOrganizationsForSeller(processModal.sellerId)
      .then((options) => {
        if (!active) return;
        setProcessOrganizationOptions(options);
        setProcessModal((prev) => (
          prev.organizationId && !options.some((option) => String(option.value) === String(prev.organizationId))
            ? { ...prev, organizationId: "" }
            : prev
        ));
      })
      .catch(() => {
        if (active) setProcessOrganizationOptions([]);
      });
    return () => { active = false; };
  }, [processModal.sellerId, loadOrganizationsForSeller]);

  const updateFilter = (key, value) => setFilters((prev) => ({
    ...prev,
    [key]: value,
    ...(key === "sellerId" ? { organizationId: "" } : {}),
  }));

  const handleCalculate = async () => {
    if (!orderId.trim()) { toast.error("Order ID is required"); return; }
    try {
      setSubmitting(true);
      await dispatch(calculateSellerCommission({ orderId: orderId.trim(), organizationId: filters.organizationId || undefined })).unwrap();
      toast.success("Commission recalculated");
      setOrderId("");
      await loadFinance();
    } catch (error) {
      toast.error(error?.message || error || "Unable to calculate commission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessPayoutSubmit = async () => {
    if (!processModal.sellerId.trim()) { toast.error("Seller ID is required"); return; }
    const selectedCommissions = processModal.mode === "order"
      ? commissions.filter((commission) =>
        String(commission.order_id || commission.orderId) === String(processModal.orderId) &&
        ["eligible", "available"].includes(String(commission.lifecycleStatus || commission.releaseStatus || "").toLowerCase()) &&
        !commission.payout_id)
      : [];
    if (processModal.mode === "order" && !processModal.orderId) { toast.error("Select an eligible order"); return; }
    if (processModal.mode === "order" && !selectedCommissions.length) { toast.error("This order has no eligible unpaid commission"); return; }
    try {
      setSubmitting(true);
      const payload = {
        sellerId: processModal.sellerId.trim(),
        organizationId: processModal.organizationId || undefined,
        paymentMethod: processModal.paymentMethod,
        paymentReference: processModal.paymentReference.trim() || `admin_${Date.now()}`,
        note: processModal.note.trim() || undefined,
        ...(selectedCommissions.length ? { commissionIds: selectedCommissions.map((commission) => commission.id) } : {}),
      };
      if (processModal.periodStart) payload.periodStart = processModal.periodStart;
      if (processModal.periodEnd) payload.periodEnd = processModal.periodEnd;
      await dispatch(processSellerPayouts(payload)).unwrap();
      toast.success("Payout created and sent to the approval queue");
      setProcessModal({ open: false, mode: "order", orderId: "", sellerId: "", organizationId: "", paymentMethod: "manual", paymentReference: "", periodStart: "", periodEnd: "", note: "" });
      await loadFinance();
    } catch (error) {
      toast.error(error?.message || error || "Unable to process payout");
    } finally {
      setSubmitting(false);
    }
  };

  const eligibleOrders = useMemo(() => {
    const orders = new Map();
    commissions.forEach((commission) => {
      const lifecycle = String(commission.lifecycleStatus || commission.releaseStatus || "").toLowerCase();
      if (!["eligible", "available"].includes(lifecycle) || commission.payout_id) return;
      const id = commission.order_id || commission.orderId;
      if (!id) return;
      const current = orders.get(String(id)) || {
        id: String(id),
        label: commission.orderNumber || commission.order_number || String(id).slice(-8),
        amount: 0,
      };
      current.amount += Number(commission.net_amount || commission.netAmount || 0);
      orders.set(String(id), current);
    });
    return Array.from(orders.values());
  }, [commissions]);

  const handleSingleCommissionPayout = async (commission) => {
    const sellerId = commission.seller_id || commission.sellerId;
    if (!sellerId || !commission.id) return;
    const orderId = commission.order_id || commission.orderId;
    const commissionIds = commissions
      .filter((row) =>
        String(row.order_id || row.orderId) === String(orderId) &&
        ["eligible", "available"].includes(String(row.lifecycleStatus || row.releaseStatus || "").toLowerCase()) &&
        !row.payout_id)
      .map((row) => row.id);
    try {
      setSubmitting(true);
      await dispatch(processSellerPayouts({
        sellerId,
        organizationId: commission.organization_id || commission.organizationId || undefined,
        commissionIds,
        paymentMethod: "manual",
        paymentReference: `commission_${commission.id}_${Date.now()}`,
        note: `Single eligible commission payout for order ${commission.order_number || commission.order_id}`,
      })).unwrap();
      toast.success("This order's eligible amount was added to the payout approval queue");
      await loadFinance();
    } catch (error) {
      toast.error(error?.message || error || "Unable to initiate this commission payout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompletePayoutSubmit = async () => {
    if (!completeModal.paymentReference.trim()) { toast.error("Payment reference is required"); return; }
    try {
      setSubmitting(true);
      await dispatch(completeSellerPayout({
        payoutId: completeModal.payout.id,
        paymentReference: completeModal.paymentReference.trim(),
        paymentMethod: completeModal.paymentMethod,
        note: completeModal.note.trim() || undefined,
      })).unwrap();
      toast.success("Payout marked as completed");
      setCompleteModal({ open: false, payout: null, paymentReference: "", paymentMethod: "manual", note: "" });
      await loadFinance();
    } catch (error) {
      toast.error(error?.message || error || "Unable to complete payout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFailPayoutSubmit = async () => {
    if (!failModal.reason.trim()) { toast.error("Failure reason is required"); return; }
    try {
      setSubmitting(true);
      await dispatch(failSellerPayout({
        payoutId: failModal.payout.id,
        reason: failModal.reason.trim(),
        note: failModal.note.trim() || undefined,
      })).unwrap();
      toast.success("Payout released back to pending");
      setFailModal({ open: false, payout: null, reason: "", note: "" });
      await loadFinance();
    } catch (error) {
      toast.error(error?.message || error || "Unable to fail payout");
    } finally {
      setSubmitting(false);
    }
  };

  const openCompleteModal = (payout) => {
    setCompleteModal({
      open: true,
      payout,
      paymentReference: payout.payment_reference || "",
      paymentMethod: payout.payment_method || "manual",
      note: "",
    });
  };

  const openFailModal = (payout) => {
    setFailModal({ open: true, payout, reason: "", note: "" });
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <PageHeader
        title={isSeller ? "My Finance" : "Seller Finance"}
        subtitle={
          isSeller
            ? "View commission deductions, settlement ledger, payout status, and downloadable statements"
            : "Commission, settlement, refund adjustment, and payout management"
        }
        breadcrumbs={[
          { label: "Home", to: "/app/home" },
          { label: "Seller Finance & Payouts" },
          { label: "Seller Finance" },
        ]}
      />

      {/* Commission Breakdown Info Banner */}
      <div className="mb-4 rounded-lg border border-[#e0ecff] bg-[#f0f6ff] px-4 py-3 text-xs text-[#2f6fed]">
        <strong>How commission is calculated:</strong> The configured platform commission and GST are calculated from each order item's checkout snapshot.
        Seller receives: <em>eligible item value − platform commission − commission GST − refund adjustments</em> after that item's return window closes.
      </div>

      {!isSeller && filters.sellerId && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <strong>Eligible</strong> means the item is delivered, its return window has closed, and no return, refund, dispute, or payout hold is active. Only eligible rows can be initiated individually.
        </div>
      )}

      {filters.sellerId && (
        <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-[#E6E6E6] bg-white p-3">
          {[
            ["return_window_open", "Return Window Open"],
            ["eligible", "Eligible for Payout"],
            ["held", "Held"],
            ["", "All"],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => updateFilter("status", value)}
              className={`rounded-md px-3 py-2 text-xs font-semibold ${filters.status === value ? "bg-[#2f6fed] text-white" : "bg-[#f3f6ff] text-[#2f6fed]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {!isSeller && (
        <div className="mb-4">
          <TableShell
            title="Seller-wise Payout Queue"
            headings={["Seller", "Gross", "Payable", "Pending Window", "Eligible", "Held", "Released", "Next Eligible", "Action"]}
            emptyText="No seller commission records found"
          >
            {sellerOverview.length ? sellerOverview.map((seller) => (
              <tr key={seller.sellerId} className={String(filters.sellerId) === seller.sellerId ? "bg-blue-50" : ""}>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="font-semibold text-[#202337]">{seller.sellerName}</div>
                  <div className="font-mono text-[11px] text-[#65718b]">{seller.sellerId}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">{money(seller.gross)}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#208a3c]">{money(seller.payable)}</td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status="pending" dot /> <span className="ml-1">{seller.pending}</span></td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status="eligible" dot /> <span className="ml-1">{seller.eligible}</span></td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status="held" dot /> <span className="ml-1">{seller.held}</span></td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status="released" dot /> <span className="ml-1">{seller.released}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-[#65718b]">{seller.nextEligibleAt ? dateTime(seller.nextEligibleAt) : "—"}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <button
                    type="button"
                    className="rounded-md bg-[#2f6fed] px-3 py-2 text-xs font-semibold text-white"
                    onClick={() => {
                      updateFilter("sellerId", seller.sellerId);
                      setProcessModal((prev) => ({ ...prev, sellerId: seller.sellerId, organizationId: "" }));
                    }}
                  >
                    View Seller
                  </button>
                </td>
              </tr>
            )) : null}
          </TableShell>
        </div>
      )}

      {!isSeller && !filters.sellerId && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Select <strong>View Seller</strong> to inspect that seller's commissions, return-window dues, settlements, and payout actions.
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>

      <div className={`mb-4 grid grid-cols-1 gap-3 ${isSeller ? "" : "lg:grid-cols-3"}`}>
        <div className="rounded-lg border border-[#E6E6E6] bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#202337]">
            <MdSearch size={18} /> Filters
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-1">
            {!isSeller && (
              <>
                <select className={inputCls} value={filters.sellerId} onChange={(e) => updateFilter("sellerId", e.target.value)}>
                  <option value="">All Sellers</option>
                  {sellerOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <select className={inputCls} value={filters.organizationId} onChange={(e) => updateFilter("organizationId", e.target.value)} disabled={!filters.sellerId}>
                  <option value="">{filters.sellerId ? "All Organizations" : "Select seller first"}</option>
                  {organizationOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </>
            )}
            <input
              className={inputCls}
              placeholder={isSeller ? "Search order or payout..." : "Search order, seller, payout..."}
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
            <select className={inputCls} value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="return_window_open">Return Window Open</option>
              <option value="eligible">Eligible</option>
              <option value="held">Held</option>
              <option value="released">Released</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {!isSeller && (
          <div className="rounded-lg border border-[#E6E6E6] bg-white p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#202337]">
              <MdCalculate size={18} /> Recalculate Order Commission
            </div>
            <div className="flex gap-2">
              <select className={`${inputCls} min-w-0 flex-1`} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                <option value="">Select order</option>
                {orderId && !orderOptions.some((option) => String(option.value) === String(orderId)) && (
                  <option value={orderId}>Order #{orderId}</option>
                )}
                {orderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <button type="button" className="inline-flex min-h-[38px] items-center justify-center rounded-md bg-[#2f6fed] px-4 text-sm font-medium text-white disabled:opacity-60" onClick={handleCalculate} disabled={submitting}>
                Run
              </button>
            </div>
          </div>
        )}

        {!isSeller && (
          <div className="rounded-lg border border-[#E6E6E6] bg-white p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#202337]">
              <MdPayments size={18} /> Process Seller Payout
            </div>
            <PermissionGuard module="sellers/commissions" action={ACTIONS.UPDATE} hide>
              <button
                type="button"
                className="inline-flex min-h-[38px] w-full items-center justify-center rounded-md bg-[#208a3c] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setProcessModal((prev) => ({ ...prev, open: true, sellerId: filters.sellerId || prev.sellerId, organizationId: filters.organizationId || prev.organizationId }))}
                disabled={!filters.sellerId}
              >
                {filters.sellerId ? "Initiate Seller Payout" : "Select Seller First"}
              </button>
            </PermissionGuard>
          </div>
        )}
      </div>

      <div className={`${!isSeller && !filters.sellerId ? "hidden" : "mb-4"}`}>
        <TableShell
          title="Order Payout Eligibility"
          headings={["Order", "Delivered", "Return Window Starts", "Return Window Ends", "Net Payable", "Can Payout?", "Reason", ...(!isSeller ? ["Action"] : [])]}
          emptyText="No order payout records found for this seller"
        >
          {commissions.length ? commissions.map((row) => {
            const decision = payoutDecision(row);
            return (
              <tr key={`eligibility-${row.id}`}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">#{row.orderNumber || row.order_number || String(row.order_id || "").slice(-8)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">{row.deliveredAt ? dateTime(row.deliveredAt) : <span className="text-amber-700">Not delivered</span>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">{row.returnWindowStartsAt ? dateTime(row.returnWindowStartsAt) : "Starts after delivery"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">
                  {row.returnWindowEndsAt ? dateTime(row.returnWindowEndsAt) : "—"}
                  {row.returnWindowEndsAt && new Date(row.returnWindowEndsAt) > new Date() && <div className="mt-1 font-semibold text-amber-700">{eligibilityCountdown(row.returnWindowEndsAt)}</div>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#208a3c]">{money(row.net_amount)}</td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={decision.allowed ? "eligible" : decision.label === "Held" ? "held" : "pending"} dot /><div className="mt-1 text-xs font-semibold">{decision.label}</div></td>
                <td className="min-w-[220px] px-4 py-3 text-xs text-[#65718b]">{decision.reason}</td>
                {!isSeller && (
                  <td className="whitespace-nowrap px-4 py-3">
                    {decision.allowed ? (
                      <PermissionGuard module="sellers/commissions" action={ACTIONS.UPDATE} hide>
                        <button type="button" className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => handleSingleCommissionPayout(row)} disabled={submitting}>Payout This Order</button>
                      </PermissionGuard>
                    ) : <span className="text-xs text-[#65718b]">Not allowed</span>}
                  </td>
                )}
              </tr>
            );
          }) : null}
        </TableShell>
      </div>

      <details className={`${!isSeller && !filters.sellerId ? "hidden" : "rounded-lg border border-[#E6E6E6] bg-white"}`}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#202337]">Advanced financial breakdown and payout history</summary>
        <div className="grid grid-cols-1 gap-4 border-t border-[#E6E6E6] p-4 xl:grid-cols-2">
        <TableShell
          title="Seller Commissions"
          headings={[
            "Order",
            ...(!isSeller ? ["Seller"] : []),
            "Organization",
            "Gross",
            "Commission",
            "GST",
            "Refund Adj.",
            "Net Payable",
            "Status",
            "Created",
            ...(!isSeller ? ["Payout Action"] : []),
          ]}
          emptyText="No commissions found"
        >
          {commissions.length ? commissions.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">#{row.orderNumber || row.order_number || String(row.order_id || "").slice(-8)}</td>
              {!isSeller && <td className="whitespace-nowrap px-4 py-3 text-xs">{row.sellerName || row.seller?.displayName || row.seller?.businessName || sellerLabel(row.seller_id, sellerOptions)}</td>}
              <td className="whitespace-nowrap px-4 py-3 text-xs">{organizationName(row)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#d92d20]">−{money(row.commission_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#d92d20]">−{money(row.tax_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#d92d20]">−{money(row.refund_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#208a3c]">{money(row.net_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={row.lifecycleStatus || row.releaseStatus || row.status} dot />
                {row.releaseReason === "waiting_for_item_return_window" && <div className="mt-1 text-[11px] font-semibold text-amber-700">Return Window Open · {eligibilityCountdown(row.eligibleAt)}</div>}
                {row.eligibleAt && <div className="text-[11px] text-gray-500">Eligible on {dateTime(row.eligibleAt)}</div>}
              </td>
              <td className="whitespace-nowrap px-4 py-3">{dateTime(row.created_at)}</td>
              {!isSeller && (
                <td className="whitespace-nowrap px-4 py-3">
                  {["eligible", "available"].includes(String(row.lifecycleStatus || row.releaseStatus || "").toLowerCase()) && !row.payout_id ? (
                    <PermissionGuard module="sellers/commissions" action={ACTIONS.UPDATE} hide>
                      <button
                        type="button"
                        className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        onClick={() => handleSingleCommissionPayout(row)}
                        disabled={submitting}
                      >
                        Payout This Order
                      </button>
                    </PermissionGuard>
                  ) : (
                    <span className="text-xs text-[#65718b]">
                      {row.payout_id ? "Already in payout" : "Wait until eligible"}
                    </span>
                  )}
                </td>
              )}
            </tr>
          )) : null}
        </TableShell>

        <TableShell
          title="Seller Payouts"
          headings={[
            ...(!isSeller ? ["Seller"] : []),
            "Organization",
            "Period",
            "Gross",
            "Commission",
            "Refund",
            "Net",
            "Status",
            ...(!isSeller ? ["Actions"] : []),
          ]}
          emptyText="No payouts found"
        >
          {payouts.length ? payouts.map((row) => (
            <tr key={row.id}>
              {!isSeller && <td className="whitespace-nowrap px-4 py-3 text-xs">{row.sellerName || row.seller?.displayName || row.seller?.businessName || sellerLabel(row.seller_id, sellerOptions)}</td>}
              <td className="whitespace-nowrap px-4 py-3 text-xs">{organizationName(row)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs">{row.period_start} – {row.period_end}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.total_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#d92d20]">−{money(row.commission_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#d92d20]">−{money(row.refund_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#208a3c]">{money(row.net_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={row.lifecycleStatus || row.status} dot /></td>
              {!isSeller && (
                <td className="whitespace-nowrap px-4 py-3">
                  <PermissionGuard module="sellers/commissions" action={ACTIONS.UPDATE} hide>
                    <div className="flex items-center gap-1">
                      <IconButton
                        title="Mark payout complete — enter payment reference"
                        tone="green"
                        icon={<MdCheckCircle size={18} />}
                        onClick={() => openCompleteModal(row)}
                        disabled={row.status !== "processing"}
                      />
                      <IconButton
                        title="Fail payout — release back to pending"
                        tone="red"
                        icon={<MdClose size={18} />}
                        onClick={() => openFailModal(row)}
                        disabled={row.status === "completed" || row.status === "failed"}
                      />
                    </div>
                  </PermissionGuard>
                </td>
              )}
            </tr>
          )) : null}
        </TableShell>
      </div>

      <div className="m-4 mt-0">
        <TableShell
          title="Settlement Ledger"
          headings={[
            ...(!isSeller ? ["Seller"] : []),
            "Organization",
            "Gross",
            "Commission",
            "Refund",
            "Adjustment",
            "Net",
            "Status",
            "Created",
            "Statement",
          ]}
          emptyText="No settlements found"
        >
          {settlements.length ? settlements.map((row) => (
            <tr key={row.id}>
              {!isSeller && <td className="whitespace-nowrap px-4 py-3 text-xs">{row.sellerName || row.seller?.displayName || row.seller?.businessName || sellerLabel(row.seller_id, sellerOptions)}</td>}
              <td className="whitespace-nowrap px-4 py-3 text-xs">{organizationName(row)}</td>
              <td className="whitespace-nowrap px-4 py-3">{money(row.gross_amount || row.amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#d92d20]">−{money(row.commission_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#d92d20]">−{money(row.refund_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#d92d20]">−{money(row.adjustment_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#208a3c]">{money(row.net_amount || row.amount)}</td>
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={row.status} dot /></td>
              <td className="whitespace-nowrap px-4 py-3">{dateTime(row.created_at)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <PermissionGuard module="sellers/commissions" action={ACTIONS.VIEW} hide>
                  <button
                    type="button"
                    title="Download Settlement Statement"
                    aria-label="Download settlement statement"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#2f6fed] transition hover:bg-[#f3f6ff]"
                    onClick={() => downloadApiFile(
                      isSeller
                        ? ENDPOINTS.payouts.mySettlementStatement(row.id)
                        : ENDPOINTS.payouts.settlementStatement(row.id),
                      {},
                      { filename: `settlement-${row.id}.pdf`, format: "pdf" }
                    )}
                  >
                    <MdDownload size={18} />
                  </button>
                </PermissionGuard>
              </td>
            </tr>
          )) : null}
        </TableShell>
      </div>
      </details>

      {!isSeller && (
        <>
          {/* Process Payout Modal */}
          <ModalOverlay
            isOpen={processModal.open}
            onClose={() => setProcessModal((prev) => ({ ...prev, open: false }))}
            title="Initiate Seller Payout"
            onSubmit={handleProcessPayoutSubmit}
            submitting={submitting}
          >
            <div className="space-y-3">
              <FieldRow label="Payout Type *">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 text-sm font-semibold ${processModal.mode === "order" ? "border-[#2f6fed] bg-blue-50 text-[#2f6fed]" : "border-[#E6E6E6] text-[#65718b]"}`}
                    onClick={() => setProcessModal((prev) => ({ ...prev, mode: "order" }))}
                  >
                    Particular Order
                  </button>
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-2 text-sm font-semibold ${processModal.mode === "bulk" ? "border-[#2f6fed] bg-blue-50 text-[#2f6fed]" : "border-[#E6E6E6] text-[#65718b]"}`}
                    onClick={() => setProcessModal((prev) => ({ ...prev, mode: "bulk", orderId: "" }))}
                  >
                    Bulk Eligible Orders
                  </button>
                </div>
              </FieldRow>
              <FieldRow label="Seller *">
                <select className={inputCls} value={processModal.sellerId} onChange={(e) => setProcessModal((prev) => ({ ...prev, sellerId: e.target.value, organizationId: "" }))}>
                  <option value="">— Select seller —</option>
                  {sellerOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Organization">
                <select className={inputCls} value={processModal.organizationId} onChange={(e) => setProcessModal((prev) => ({ ...prev, organizationId: e.target.value }))} disabled={!processModal.sellerId}>
                  <option value="">{processModal.sellerId ? "All Organizations Separately" : "Select seller first"}</option>
                  {processOrganizationOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </FieldRow>
              {processModal.mode === "order" ? (
                <FieldRow label="Eligible Order *">
                  <select className={inputCls} value={processModal.orderId} onChange={(e) => setProcessModal((prev) => ({ ...prev, orderId: e.target.value }))}>
                    <option value="">— Select eligible order —</option>
                    {eligibleOrders.map((order) => <option key={order.id} value={order.id}>#{order.label} · {money(order.amount)}</option>)}
                  </select>
                </FieldRow>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Period Start">
                    <input type="date" className={inputCls} value={processModal.periodStart} onChange={(e) => setProcessModal((prev) => ({ ...prev, periodStart: e.target.value }))} />
                  </FieldRow>
                  <FieldRow label="Period End">
                    <input type="date" className={inputCls} value={processModal.periodEnd} onChange={(e) => setProcessModal((prev) => ({ ...prev, periodEnd: e.target.value }))} />
                  </FieldRow>
                </div>
              )}
              <FieldRow label="Payment Method">
                <select className={inputCls} value={processModal.paymentMethod} onChange={(e) => setProcessModal((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                </select>
              </FieldRow>
              <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                {processModal.mode === "order"
                  ? "Only eligible unpaid commissions from the selected order will be prepared."
                  : "All eligible unpaid orders for this seller and period will be prepared together."}
                {" "}Approval remains required. Enter the transaction/UTR reference only when completing payment.
              </div>
              <FieldRow label="Internal Note">
                <textarea className={`${inputCls} resize-none py-2`} rows={2} placeholder="Optional note" value={processModal.note} onChange={(e) => setProcessModal((prev) => ({ ...prev, note: e.target.value }))} />
              </FieldRow>
            </div>
          </ModalOverlay>

          {/* Complete Payout Modal */}
          <ModalOverlay
        isOpen={completeModal.open}
        onClose={() => setCompleteModal((prev) => ({ ...prev, open: false }))}
        title="Complete Payout"
        onSubmit={handleCompletePayoutSubmit}
        submitting={submitting}
      >
        {completeModal.payout && (
          <div className="mb-3 rounded-md bg-[#f8faff] p-3 text-xs text-[#65718b]">
            <div>Seller: <span className="font-medium">{completeModal.payout.sellerName || completeModal.payout.seller?.name || sellerLabel(completeModal.payout.seller_id, sellerOptions)}</span></div>
            <div>Net Amount: <span className="font-semibold text-[#208a3c]">{money(completeModal.payout.net_amount)}</span></div>
          </div>
        )}
        <div className="space-y-3">
          <FieldRow label="Payment Reference *">
            <input className={inputCls} placeholder="UTR / transaction ID / cheque no." value={completeModal.paymentReference} onChange={(e) => setCompleteModal((prev) => ({ ...prev, paymentReference: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Payment Method">
            <select className={inputCls} value={completeModal.paymentMethod} onChange={(e) => setCompleteModal((prev) => ({ ...prev, paymentMethod: e.target.value }))}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Internal Note">
            <textarea className={`${inputCls} resize-none py-2`} rows={2} placeholder="Optional note" value={completeModal.note} onChange={(e) => setCompleteModal((prev) => ({ ...prev, note: e.target.value }))} />
          </FieldRow>
        </div>
          </ModalOverlay>

          {/* Fail Payout Modal */}
          <ModalOverlay
        isOpen={failModal.open}
        onClose={() => setFailModal((prev) => ({ ...prev, open: false }))}
        title="Fail Payout"
        onSubmit={handleFailPayoutSubmit}
        submitting={submitting}
      >
        {failModal.payout && (
          <div className="mb-3 rounded-md bg-[#fff8f0] p-3 text-xs text-[#b45309]">
            <div>Seller: <span className="font-medium">{failModal.payout.sellerName || failModal.payout.seller?.displayName || sellerLabel(failModal.payout.seller_id, sellerOptions)}</span></div>
            <div>This will release the payout back to <strong>pending</strong> status so it can be retried.</div>
          </div>
        )}
        <div className="space-y-3">
          <FieldRow label="Failure Reason *">
            <input className={inputCls} placeholder="e.g. Incorrect bank details, payment bounced" value={failModal.reason} onChange={(e) => setFailModal((prev) => ({ ...prev, reason: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Internal Note">
            <textarea className={`${inputCls} resize-none py-2`} rows={2} placeholder="Optional additional context" value={failModal.note} onChange={(e) => setFailModal((prev) => ({ ...prev, note: e.target.value }))} />
          </FieldRow>
        </div>
          </ModalOverlay>
        </>
      )}
    </div>
  );
};

export default SellerFinance;
