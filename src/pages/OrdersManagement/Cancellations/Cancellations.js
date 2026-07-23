/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdReplay, MdVisibility, MdPayment } from "react-icons/md";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  getCancellationList,
  retryCancellation,
  completeCancellationRefund,
} from "../../../Redux/orderSlice";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";

const STATUSES = [
  "processing",
  "refund_pending",
  "manual_review",
  "completed",
  "failed",
];
const REFUND_STATUSES = [
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
  processing: "blue",
  refund_pending: "yellow",
  manual_review: "orange",
  completed: "green",
  failed: "red",
};

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
    options: STATUSES.map((v) => ({ value: v, label: v.replace(/_/g, " ") })),
  },
  {
    key: "refundStatus",
    type: "select",
    label: "Refund",
    options: REFUND_STATUSES.map((v) => ({
      value: v,
      label: v.replace(/_/g, " "),
    })),
  },
  {
    key: "scope",
    type: "select",
    label: "Scope",
    options: SCOPES.map((v) => ({ value: v, label: v })),
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

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY, h:mm A") : "—");
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
    createdAt: row.createdAt || row.created_at,
    sellerScoped: Boolean(row.sellerScoped ?? row.seller_scoped),
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

  const COLUMNS = [
    {
      key: "cancellationNumber",
      label: "Cancellation #",
      render: (v, row) => (
        <span className="font-mono text-xs text-gray-600">
          {v || String(row.id || "—").slice(-8)}
        </span>
      ),
    },
    {
      key: "orderId",
      label: "Order #",
      render: (v, row) => (
        <span className="font-mono text-xs">
          #{row.orderNumber || String(v || "—").slice(-8)}
        </span>
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
          className={`text-xs px-2 py-0.5 rounded-full ${v === "completed" ? "bg-green-100 text-green-700" : v === "failed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}
        >
          {display(v)}
        </span>
      ),
    },
    {
      key: "paymentProvider",
      label: "Refunded Through",
      render: (_, row) => (
        <span className="text-xs text-gray-700">{refundSource(row)}</span>
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
            <div className="font-medium text-gray-800">{money(v)}</div>
          )}
          <div className="text-gray-500">
            {row.sellerFinanceAdjustments.length
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
      render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span>,
    },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-1">
          <button
            onClick={() => setDetail(row)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="View"
          >
            <MdVisibility size={18} />
          </button>
          {!isSeller && (
            <PermissionGuard module="orders" action={ACTIONS.UPDATE} hide>
              {["refund_pending", "failed"].includes(row.status) && (
                <button
                  onClick={() =>
                    setRetryConfirm({ open: true, item: row, note: "" })
                  }
                  className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                  title="Retry Refund"
                >
                  <MdReplay size={18} />
                </button>
              )}
              {row.status === "manual_review" && (
                <button
                  onClick={() =>
                    setManualRefund({
                      open: true,
                      item: row,
                      referenceId: "",
                      proofUrl: "",
                      note: "",
                    })
                  }
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title="Complete Manual Refund"
                >
                  <MdPayment size={18} />
                </button>
              )}
            </PermissionGuard>
          )}
        </div>
      ),
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
            : "Manage complete order cancellations and customer refunds"
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500">Cancellation #</p>
                <p className="font-mono text-xs">
                  {detail.cancellationNumber || detail.id}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Order #</p>
                <p className="font-mono text-xs">
                  #
                  {detail.orderNumber ||
                    String(detail.orderId || "—").slice(-8)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Cancellation Status</p>
                <StatusBadge
                  status={detail.status}
                  color={STATUS_COLOR[detail.status] || "gray"}
                />
              </div>
              <div>
                <p className="text-gray-500">Refund Status</p>
                <p>{display(detail.refundStatus)}</p>
              </div>
              <div>
                <p className="text-gray-500">Scope</p>
                <p className="capitalize">{detail.scope || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500">
                  {isSeller ? "My Cancelled Item Value" : "Customer Refund"}
                </p>
                <p className="font-medium">{money(detail.refundAmount)}</p>
              </div>
              <div>
                <p className="text-gray-500">Refunded Through</p>
                <p>{refundSource(detail)}</p>
              </div>
              {!isSeller && (
                <div>
                  <p className="text-gray-500">Seller Cancelled Value</p>
                  <p>{money(detail.sellerCancelledValue)}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Seller Finance Impact</p>
                <p>
                  {detail.sellerFinanceAdjustments.length
                    ? "Recovered from settlement"
                    : "No payout — cancelled before settlement"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Inventory</p>
                <StatusBadge status={detail.inventoryStatus || "pending"} />
              </div>
              <div>
                <p className="text-gray-500">Shipment</p>
                <StatusBadge status={detail.shipmentStatus || "pending"} />
              </div>
              <div>
                <p className="text-gray-500">Seller Finance</p>
                <StatusBadge status={detail.financeStatus || "pending"} />
              </div>
              <div>
                <p className="text-gray-500">Reason</p>
                <p>{display(detail.reason)}</p>
              </div>
              <div>
                <p className="text-gray-500">Created</p>
                <p>{fmt(detail.createdAt)}</p>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 font-semibold text-gray-800">
                {isSeller ? "My cancelled items" : "Cancelled items"}
              </p>
              <div className="space-y-2">
                {(detail.items || []).map((item) => (
                  <div
                    key={item.orderItemId || item.order_item_id}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-800">
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
                  <div className="text-xs text-gray-500">
                    No cancelled items found.
                  </div>
                )}
              </div>
            </div>
            {detail.note && (
              <div>
                <p className="text-gray-500">Note</p>
                <p>{detail.note}</p>
              </div>
            )}
          </div>
        )}
      </DefaultModal>

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
        <div className="mt-3">
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
        <div className="p-4 space-y-4">
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
            className="w-full py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-60"
          >
            {actionLoading ? "Processing..." : "Complete Refund"}
          </button>
        </div>
      </DefaultModal>
    </div>
  );
};

export default Cancellations;
