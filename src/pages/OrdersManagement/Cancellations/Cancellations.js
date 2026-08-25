import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdCancel, MdCheckCircle, MdReplay, MdVisibility, MdPayment } from "react-icons/md";
import { dropdownApi } from "../../../_helpers/dropdownApi";
// import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  OrderLink,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  getCancellationList,
  retryCancellation,
  approveCancellation,
  rejectCancellation,
  approveCancellationRefund,
  completeCancellationRefund,
} from "../../../Redux/orderSlice";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { formatDateTime12Hour, formatLabel } from "../../../utils/formatters";

const STATUSES = [
  "requested",
  "approved",
  "processing",
  "refund_pending",
  "manual_review",
  "completed",
  "failed",
  "rejected",
];
const REFUND_STATUSES = [
  "not_started",
  "not_required",
  "pending",
  "provider_pending",
  "manual_review",
  "completed",
  "failed",
];
const SCOPES = ["full", "partial"];
const getInitialQuery = (key) =>
  new URLSearchParams(window.location.search).get(key) || "";

const STATUS_COLOR = {
  requested: "yellow",
  approved: "blue",
  processing: "blue",
  refund_pending: "yellow",
  manual_review: "orange",
  completed: "green",
  failed: "red",
  rejected: "red",
};

const CLASS_TEXT_XS_MUTED = "text-xs text-gray-500";
const CLASS_TEXT_XS_GRAY = "text-xs text-gray-600";
const CLASS_TEXT_SM_GRAY = "text-sm text-gray-700";
const CLASS_DETAIL_LABEL = "text-gray-500";
const CLASS_DETAIL_CARD =
  "rounded-lg border border-gray-100 bg-gray-50 p-3";
const CLASS_DETAIL_VALUE = "font-medium text-gray-800";
const CLASS_DETAIL_SECTION =
  "border-t border-gray-100 pt-3";
const CLASS_MODAL_BODY = "mt-3";
const CLASS_INPUT_MODAL = "mt-3";
const CLASS_ACTION_ICON_BLUE = "text-blue-600";
const CLASS_ACTION_ICON_RED = "text-red-600";
const CLASS_ACTION_ICON_GREEN = "text-green-600";
const CLASS_ACTION_ICON_ORANGE = "text-orange-600";
const CLASS_CONFIRM_NOTE_INPUT = "mt-3";
const CLASS_MANUAL_REFUND_BODY = "p-4 space-y-4";
const CLASS_MANUAL_REFUND_BUTTON =
  "w-full py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-60";
const CLASS_REFUND_STATUS_BASE =
  "text-xs px-2 py-0.5 rounded-full";


const FILTER_FIELDS = [
  { key: "search", type: "text", label: "Search", width: "w-56" },
  { key: "orderId", type: "text", label: "Order #", width: "w-48" },
  {
    key: "buyerId",
    type: "asyncDropdown",
    label: "Buyer",
    width: "w-52",
    load: (search) =>
      dropdownApi.getBuyers({
        keyWord: search,
        searchFields: "full_name,email",
      }),
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    options: STATUSES.map((s) => ({
      value: s,
      label: formatLabel(s),
    })),
  },
  {
    key: "refundStatus",
    type: "select",
    label: "Refund",
    options: REFUND_STATUSES.map((s) => ({
      value: s,
      label: formatLabel(s),
    })),
  },
  {
    key: "scope",
    type: "select",
    label: "Scope",
    options: SCOPES.map((s) => ({
      value: s,
      label: formatLabel(s),
    })),
  },
  // { key: "fromDate", type: "date", label: "From" },
  // { key: "toDate", type: "date", label: "To" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || data?.cancellations || data || [],
    total: Number(
      data?.total || data?.list?.length || data?.items?.length || 0,
    ),
  };
};

const fmt = (value) => formatDateTime12Hour(value, "—");
const display = (v = "") => String(v || "—").replace(/_/g, " ");
const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const normalizeCancellation = (row = {}) => {
  const items = Array.isArray(row.items) ? row.items : [];
  return {
    ...row,
    id: row.id || row._id,
    cancellationNumber: row.cancellationNumber || row.cancellation_number,
    orderId: row.orderId || row.order_id,
    orderNumber: row.orderNumber || row.order_number,
    refundStatus: row.refundStatus || row.refund_status,
    refundAmount: Number(row.refundAmount ?? row.refund_amount ?? 0),
    walletRefundAmount: Number(
      row.walletRefundAmount ?? row.wallet_refund_amount ?? 0,
    ),
    providerRefundAmount: Number(
      row.providerRefundAmount ?? row.provider_refund_amount ?? 0,
    ),
    refundMethod: row.refundMethod || row.refund_method,
    paymentProvider: row.paymentProvider || row.payment_provider,
    providerRefundId: row.providerRefundId || row.provider_refund_id,
    sourceOrderStatus: row.sourceOrderStatus || row.source_order_status,
    inventoryStatus: row.inventoryStatus || row.inventory_status,
    shipmentStatus: row.shipmentStatus || row.shipment_status,
    financeStatus: row.financeStatus || row.finance_status,
    requestedByRole: row.requestedByRole || row.requested_by_role,
    refundDestination: row.refundDestination || row.metadata?.refundDestination || "original_payment_method",
    createdAt: row.createdAt || row.created_at,
    sellerScoped: Boolean(row.sellerScoped ?? row.seller_scoped),
    sellerCanReview: Boolean(row.sellerCanReview ?? row.seller_can_review),
    sellerCancelledValue: items.reduce(
      (sum, item) =>
        sum +
        Math.max(
          0,
          Number(item.itemAmount || item.item_amount || 0) -
            Number(item.discountAmount || item.discount_amount || 0),
        ),
      0,
    ),
    sellerFinanceAdjustments: Array.isArray(
      row.metadata?.sellerFinance?.adjustments,
    )
      ? row.metadata.sellerFinance.adjustments
      : [],
  };
};

const refundSource = (row = {}) => {
  if (row.status === "requested") return "Awaiting cancellation approval";
  if (row.status === "rejected") return "No refund — request rejected";
  if (row.sellerScoped)
    return row.refundStatus === "not_required"
      ? "No customer refund required"
      : "Managed by platform";
  if (row.refundStatus === "not_required")
    return row.paymentProvider === "cod"
      ? "No refund — COD not collected"
      : "No captured payment";
  const sources = [];
  if (row.providerRefundAmount > 0)
    sources.push(
      row.paymentProvider === "razorpay"
        ? "Platform via Razorpay"
        : "Admin manual refund",
    );
  if (row.walletRefundAmount > 0) sources.push("Platform wallet");
  return (
    sources.join(" + ") ||
    (row.refundMethod === "manual" ? "Admin manual refund" : "Platform")
  );
};

const Cancellations = () => {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const selector = useSelector((s) => s.order);
  const payload = unwrapList(selector.cancellationListData);
  const cancellations = payload.list.map(normalizeCancellation);

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
    defaultFilters: { orderId: getInitialQuery("orderId") },
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [retryConfirm, setRetryConfirm] = useState({
    open: false,
    item: null,
    note: "",
  });
  const [manualRefund, setManualRefund] = useState({
    open: false,
    item: null,
    referenceId: "",
    proofUrl: "",
    note: "",
  });
  const [approveRefund, setApproveRefund] = useState({ open: false, item: null, note: "" });
  const [approveRequest, setApproveRequest] = useState({ open: false, item: null, note: "" });
  const [rejectRequest, setRejectRequest] = useState({ open: false, item: null, reason: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCancellations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(
        getCancellationList({
          ...params,
          offset: (params.page - 1) * params.limit,
        }),
      ).unwrap();
    } catch (err) {
      const msg = err?.message || "Failed to load cancellations";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchCancellations();
  }, [fetchCancellations]);

  const handleRetry = useCallback(async () => {
    if (isSeller) {
      toast.error("Cancellation refund retry is admin-only");
      return;
    }
    const { item, note } = retryConfirm;
    if (!item) return;
    try {
      setActionLoading(true);
      await dispatch(
        retryCancellation({ cancellationId: item._id || item.id, note }),
      ).unwrap();
      toast.success("Cancellation refund retried");
      setRetryConfirm({ open: false, item: null, note: "" });
      fetchCancellations();
    } catch (err) {
      toast.error(err?.message || "Retry failed");
    } finally {
      setActionLoading(false);
    }
  }, [isSeller, retryConfirm, dispatch, fetchCancellations]);

  const handleManualRefund = useCallback(async () => {
    if (isSeller) {
      toast.error("Manual cancellation refund is admin-only");
      return;
    }
    const { item, referenceId, proofUrl, note } = manualRefund;
    if (!item) return;
    if (!referenceId.trim() || referenceId.trim().length < 3) {
      toast.error("Reference ID is required (min 3 chars)");
      return;
    }
    try {
      setActionLoading(true);
      await dispatch(
        completeCancellationRefund({
          cancellationId: item._id || item.id,
          referenceId,
          proofUrl: proofUrl || null,
          note,
        }),
      ).unwrap();
      toast.success("Manual refund completed");
      setManualRefund({
        open: false,
        item: null,
        referenceId: "",
        proofUrl: "",
        note: "",
      });
      fetchCancellations();
    } catch (err) {
      toast.error(err?.message || "Manual refund failed");
    } finally {
      setActionLoading(false);
    }
  }, [isSeller, manualRefund, dispatch, fetchCancellations]);

  const handleApproveRefund = useCallback(async () => {
    if (isSeller || !approveRefund.item) return;
    try {
      setActionLoading(true);
      await dispatch(approveCancellationRefund({
        cancellationId: approveRefund.item._id || approveRefund.item.id,
        note: approveRefund.note,
      })).unwrap();
      toast.success("Refund approved and submitted for processing");
      setApproveRefund({ open: false, item: null, note: "" });
      fetchCancellations();
    } catch (err) {
      toast.error(err?.message || "Refund approval failed");
    } finally {
      setActionLoading(false);
    }
  }, [isSeller, approveRefund, dispatch, fetchCancellations]);

  const handleApproveRequest = useCallback(async () => {
    if (!approveRequest.item) return;
    try {
      setActionLoading(true);
      await dispatch(approveCancellation({
        cancellationId: approveRequest.item._id || approveRequest.item.id,
        note: approveRequest.note,
      })).unwrap();
      toast.success("Selected item quantity cancellation approved");
      setApproveRequest({ open: false, item: null, note: "" });
      fetchCancellations();
    } catch (err) {
      toast.error(err?.message || "Cancellation approval failed");
    } finally {
      setActionLoading(false);
    }
  }, [approveRequest, dispatch, fetchCancellations]);

  const handleRejectRequest = useCallback(async () => {
    if (!rejectRequest.item || rejectRequest.reason.trim().length < 3) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      setActionLoading(true);
      await dispatch(rejectCancellation({
        cancellationId: rejectRequest.item._id || rejectRequest.item.id,
        reason: rejectRequest.reason.trim(),
      })).unwrap();
      toast.success("Cancellation request rejected");
      setRejectRequest({ open: false, item: null, reason: "" });
      fetchCancellations();
    } catch (err) {
      toast.error(err?.message || "Cancellation rejection failed");
    } finally {
      setActionLoading(false);
    }
  }, [rejectRequest, dispatch, fetchCancellations]);

  const COLUMNS = [
    {
      key: "cancellationNumber",
      label: "Cancellation #",
      render: (v, row) => (
        <span className={`font-mono ${CLASS_TEXT_XS_GRAY}`}>
          {v || String(row.id || "—").slice(-8)}
        </span>
      ),
    },
    {
      key: "orderId",
      label: "Order #",
      render: (v, row) => (
        <OrderLink orderId={row.orderId || row.order_id || v} orderNumber={row.orderNumber || row.order_number} />
      ),
    },
    {
      key: "status",
      label: "Cancellation Status",
      sortable: true,
      render: (v) => (
        <StatusBadge status={v} color={STATUS_COLOR[v] || "gray"} />
      ),
    },
    {
      key: "refundStatus",
      label: "Refund Status",
      render: (v) => (
        <span
          className={`${CLASS_REFUND_STATUS_BASE} ${v === "completed" ? "bg-green-100 text-green-700" : v === "failed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}
        >
          {display(v)}
        </span>
      ),
    },
    {
      key: "paymentProvider",
      label: "Refunded Through",
      render: (_, row) => (
        <span className={CLASS_TEXT_SM_GRAY}>{refundSource(row)}</span>
      ),
    },
    {
      key: "refundAmount",
      label: isSeller ? "My Cancelled Item Value" : "Customer Refund",
      render: (v) => <span className="text-sm font-medium">{money(v)}</span>,
    },
    {
      key: "sellerCancelledValue",
      label: isSeller ? "My Settlement Impact" : "Seller Impact",
      render: (v, row) => (
        <div className="text-xs">
          {!isSeller && (
            <div className={CLASS_DETAIL_VALUE}>{money(v)}</div>
          )}
          <div className={CLASS_DETAIL_LABEL}>
            {row.status === "requested"
              ? "Pending approval — no adjustment"
              : row.status === "rejected"
                ? "No adjustment — request rejected"
                : row.sellerFinanceAdjustments.length
              ? "Recovered from settlement"
              : [
                    "pending_payment",
                    "payment_failed",
                    "confirmed",
                    "processing",
                    "packed",
                    "ready_to_ship",
                    "on_hold",
                  ].includes(row.sourceOrderStatus)
                ? "No payout — cancelled before settlement"
                : display(row.financeStatus || "pending")}
          </div>
        </div>
      ),
    },
    {
      key: "scope",
      label: "Order Scope",
      render: (v) => <span className="text-sm capitalize">{v || "—"}</span>,
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (v) => <span className={CLASS_TEXT_XS_MUTED}>{fmt(v)}</span>,
    },
  ];
  const filters = isSeller
    ? FILTER_FIELDS.filter(
        (field) => field.key !== "buyerId" && field.key !== "scope",
      )
    : FILTER_FIELDS;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cancellations"
        subtitle={
          isSeller
            ? "View cancellations and settlement impact for only your products."
            : "Manage full-order and item/quantity cancellations and customer refunds"
        }
        breadcrumbs={[
          { label: isSeller ? "Seller Orders" : "Returns & Cancellations" },
          { label: "Cancellations" },
        ]}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <DataTable
          columns={COLUMNS}
          data={cancellations}
          total={payload.total}
          listPage={list}
          emptyMessage="No cancellations found"
          filterBar={<FilterBar fields={filters} listPage={list} />}
          rowActions={(row) => {
            const actions = [
              {
                label: "View Details",
                icon: <MdVisibility size={16} className={CLASS_ACTION_ICON_BLUE} />,
                onClick: () => setDetail(row),
              },
            ];

            if (row.status === "requested" && (!isSeller || row.sellerCanReview)) {
              actions.push({
                label: "Approve Cancellation",
                icon: <MdCheckCircle size={16} className={CLASS_ACTION_ICON_BLUE} />,
                requiredModule: "orders",
                requiredAction: ACTIONS.UPDATE,
                onClick: () => setApproveRequest({ open: true, item: row, note: "" }),
              });
              actions.push({
                label: "Reject Cancellation",
                icon: <MdCancel size={16} className={CLASS_ACTION_ICON_RED} />,
                requiredModule: "orders",
                requiredAction: ACTIONS.UPDATE,
                onClick: () => setRejectRequest({ open: true, item: row, reason: "" }),
              });
            }

            if (
              !isSeller &&
              ["refund_pending", "failed"].includes(row.status)
            ) {
              actions.push({
                label: "Retry Refund",
                icon: <MdReplay size={16} className={CLASS_ACTION_ICON_ORANGE} />,
                requiredModule: "orders",
                requiredAction: ACTIONS.UPDATE,
                onClick: () =>
                  setRetryConfirm({
                    open: true,
                    item: row,
                    note: "",
                  }),
              });
            }

            if (!isSeller && row.status === "manual_review") {
              if (row.paymentProvider === "razorpay" || row.providerRefundAmount <= 0) actions.push({
                label: "Approve Refund",
                icon: <MdCheckCircle size={16} className={CLASS_ACTION_ICON_BLUE} />,
                requiredModule: "orders",
                requiredAction: ACTIONS.UPDATE,
                onClick: () => setApproveRefund({ open: true, item: row, note: "" }),
              });
              if (row.providerRefundAmount > 0 && row.paymentProvider !== "razorpay") {
                actions.push({
                  label: "Complete Manual Refund",
                  icon: <MdPayment size={16} className={CLASS_ACTION_ICON_GREEN} />,
                  requiredModule: "orders",
                  requiredAction: ACTIONS.UPDATE,
                  onClick: () =>
                    setManualRefund({
                      open: true,
                      item: row,
                      referenceId: "",
                      proofUrl: "",
                      note: "",
                    }),
                });
              }
            }

            return actions;
          }}
        />
      )}

      {/* Detail */}
      <DefaultModal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Cancellation Detail"
      >
        {detail && (
          <div className="p-4 space-y-3 text-sm">
            {isSeller && detail.status === "requested" && !detail.sellerCanReview && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                This request contains products from multiple sellers. Only an admin can approve or reject the combined request.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={CLASS_DETAIL_LABEL}>Cancellation #</p>
                <p className="font-mono text-xs">
                  {detail.cancellationNumber || detail.id}
                </p>
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Order #</p>
                <p><OrderLink orderId={detail.orderId || detail.order_id} orderNumber={detail.orderNumber || detail.order_number} /></p>
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Cancellation Status</p>
                <StatusBadge
                  status={detail.status}
                  color={STATUS_COLOR[detail.status] || "gray"}
                />
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Refund Status</p>
                <p>{display(detail.refundStatus)}</p>
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Scope</p>
                <p className="capitalize">{detail.scope || "—"}</p>
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>
                  {isSeller ? "My Cancelled Item Value" : "Customer Refund"}
                </p>
                <p className="font-medium">{money(detail.refundAmount)}</p>
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Refunded Through</p>
                <p>{refundSource(detail)}</p>
              </div>
              {!isSeller && (
                <div>
                  <p className={CLASS_DETAIL_LABEL}>Seller Cancelled Value</p>
                  <p>{money(detail.sellerCancelledValue)}</p>
                </div>
              )}
              <div>
                <p className={CLASS_DETAIL_LABEL}>Seller Finance Impact</p>
                <p>
                  {detail.sellerFinanceAdjustments.length
                    ? "Recovered from settlement"
                    : "No payout — cancelled before settlement"}
                </p>
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Inventory</p>
                <StatusBadge status={detail.inventoryStatus || "pending"} />
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Shipment</p>
                <StatusBadge status={detail.shipmentStatus || "pending"} />
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Seller Finance</p>
                <StatusBadge status={detail.financeStatus || "pending"} />
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Reason</p>
                <p>{display(detail.reason)}</p>
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Created</p>
                <p>{fmt(detail.createdAt)}</p>
              </div>
            </div>
            <div className={CLASS_DETAIL_SECTION}>
              <p className="mb-2 font-semibold text-gray-800">
                {detail.status === "requested"
                  ? (isSeller ? "My requested items" : "Requested items and quantities")
                  : (isSeller ? "My cancelled items" : "Cancelled items")}
              </p>
              <div className="space-y-2">
                {(detail.items || []).map((item) => (
                  <div
                    key={item.orderItemId || item.order_item_id}
                    className={CLASS_DETAIL_CARD}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={CLASS_DETAIL_VALUE}>
                          {item.productTitle || item.product_title || "Product"}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          SKU: {item.variantSku || item.variant_sku || "—"} ·
                          Quantity: {item.quantity || 0}
                        </div>
                      </div>
                      <div className="font-semibold text-gray-800">
                        {money(
                          item.refundAmount ??
                            item.refund_amount ??
                            item.itemAmount ??
                            item.item_amount,
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {!detail.items?.length && (
                  <div className={CLASS_TEXT_XS_MUTED}>
                    No cancelled items found.
                  </div>
                )}
              </div>
            </div>
            {detail.note && (
              <div>
                <p className={CLASS_DETAIL_LABEL}>Note</p>
                <p>{detail.note}</p>
              </div>
            )}
          </div>
        )}
      </DefaultModal>

      {/* Cancellation approval */}
      <ConfirmModal
        isOpen={approveRequest.open}
        title="Approve item cancellation"
        description="Approve cancellation of the selected item quantities? Refund processing starts only after this approval."
        onConfirm={handleApproveRequest}
        onCancel={() => setApproveRequest({ open: false, item: null, note: "" })}
        loading={actionLoading}
        confirmLabel="Approve Cancellation"
      >
        <div className={CLASS_MODAL_BODY}>
          <Input
            label="Approval note (optional)"
            value={approveRequest.note}
            onChange={(e) => setApproveRequest((p) => ({ ...p, note: e.target.value }))}
          />
        </div>
      </ConfirmModal>

      <ConfirmModal
        isOpen={rejectRequest.open}
        title="Reject item cancellation"
        description="Reject the selected item and quantity cancellation request? No refund will be initiated."
        onConfirm={handleRejectRequest}
        onCancel={() => setRejectRequest({ open: false, item: null, reason: "" })}
        loading={actionLoading}
        confirmLabel="Reject Cancellation"
      >
        <div className={CLASS_MODAL_BODY}>
          <Input
            label="Rejection reason *"
            value={rejectRequest.reason}
            onChange={(e) => setRejectRequest((p) => ({ ...p, reason: e.target.value }))}
          />
        </div>
      </ConfirmModal>

      {/* Refund approval */}
      <ConfirmModal
        isOpen={approveRefund.open}
        title="Approve cancellation refund"
        description={`Approve the ${approveRefund.item?.scope === "partial" ? "selected item/quantity" : "full order"} refund and submit the eligible amount to Razorpay?`}
        onConfirm={handleApproveRefund}
        onCancel={() => setApproveRefund({ open: false, item: null, note: "" })}
        loading={actionLoading}
        confirmLabel="Approve Refund"
      >
        <div className={CLASS_MODAL_BODY}>
          <Input label="Approval note (optional)" value={approveRefund.note} onChange={(e) => setApproveRefund((p) => ({ ...p, note: e.target.value }))} />
        </div>
      </ConfirmModal>

      {/* Retry confirm */}
      <ConfirmModal
        isOpen={retryConfirm.open}
        title="Retry Refund"
        description="Retry the refund for this cancellation?"
        onConfirm={handleRetry}
        onCancel={() => setRetryConfirm({ open: false, item: null, note: "" })}
        loading={actionLoading}
        confirmLabel="Retry"
      >
        <div className={CLASS_MODAL_BODY}>
          <Input
            label="Note (optional)"
            value={retryConfirm.note}
            onChange={(e) =>
              setRetryConfirm((p) => ({ ...p, note: e.target.value }))
            }
            placeholder="Add a note..."
          />
        </div>
      </ConfirmModal>

      {/* Manual refund modal */}
      <DefaultModal
        isOpen={manualRefund.open}
        onClose={() =>
          setManualRefund({
            open: false,
            item: null,
            referenceId: "",
            proofUrl: "",
            note: "",
          })
        }
        title="Complete Manual Refund"
      >
        <div className={CLASS_MANUAL_REFUND_BODY}>
          <Input
            label="Reference ID *"
            value={manualRefund.referenceId}
            onChange={(e) =>
              setManualRefund((p) => ({ ...p, referenceId: e.target.value }))
            }
            placeholder="Bank transfer / UPI reference..."
          />
          <Input
            label="Proof URL"
            value={manualRefund.proofUrl}
            onChange={(e) =>
              setManualRefund((p) => ({ ...p, proofUrl: e.target.value }))
            }
            placeholder="https://..."
          />
          <Input
            label="Note"
            value={manualRefund.note}
            onChange={(e) =>
              setManualRefund((p) => ({ ...p, note: e.target.value }))
            }
            placeholder="Additional notes..."
          />
          <button
            onClick={handleManualRefund}
            disabled={actionLoading}
            className={CLASS_MANUAL_REFUND_BUTTON}
          >
            {actionLoading ? "Processing..." : "Complete Refund"}
          </button>
        </div>
      </DefaultModal>
    </div>
  );
};

export default Cancellations;
