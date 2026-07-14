/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdRefresh, MdReplay, MdVisibility, MdPayment } from "react-icons/md";
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

const STATUSES = ["processing", "refund_pending", "manual_review", "completed", "failed"];
const REFUND_STATUSES = ["not_required", "pending", "provider_pending", "manual_review", "completed", "failed"];
const SCOPES = ["full", "partial"];

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
    load: (search) => dropdownApi.getBuyers({ keyWord: search, searchFields: "full_name,email" }),
  },
  { key: "status", type: "select", label: "Status", options: STATUSES.map((v) => ({ value: v, label: v.replace(/_/g, " ") })) },
  { key: "refundStatus", type: "select", label: "Refund", options: REFUND_STATUSES.map((v) => ({ value: v, label: v.replace(/_/g, " ") })) },
  { key: "scope", type: "select", label: "Scope", options: SCOPES.map((v) => ({ value: v, label: v })) },
  // { key: "fromDate", type: "date", label: "From" },
  // { key: "toDate", type: "date", label: "To" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || data?.cancellations || data || [],
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
  };
};

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY, h:mm A") : "—");
const display = (v = "") => String(v || "—").replace(/_/g, " ");

const Cancellations = () => {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const selector = useSelector((s) => s.order);
  const payload = unwrapList(selector.cancellationListData);

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [retryConfirm, setRetryConfirm] = useState({ open: false, item: null, note: "" });
  const [manualRefund, setManualRefund] = useState({ open: false, item: null, referenceId: "", proofUrl: "", note: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCancellations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getCancellationList({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      const msg = err?.message || "Failed to load cancellations";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchCancellations(); }, [fetchCancellations]);

  const handleRetry = useCallback(async () => {
    if (isSeller) {
      toast.error("Cancellation refund retry is admin-only");
      return;
    }
    const { item, note } = retryConfirm;
    if (!item) return;
    try {
      setActionLoading(true);
      await dispatch(retryCancellation({ cancellationId: item._id || item.id, note })).unwrap();
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
      await dispatch(completeCancellationRefund({
        cancellationId: item._id || item.id,
        referenceId,
        proofUrl: proofUrl || null,
        note,
      })).unwrap();
      toast.success("Manual refund completed");
      setManualRefund({ open: false, item: null, referenceId: "", proofUrl: "", note: "" });
      fetchCancellations();
    } catch (err) {
      toast.error(err?.message || "Manual refund failed");
    } finally {
      setActionLoading(false);
    }
  }, [isSeller, manualRefund, dispatch, fetchCancellations]);

  const COLUMNS = [
    {
      key: "id",
      label: "ID",
      render: (v) => <span className="font-mono text-xs text-gray-500">{String(v || "—").slice(-8)}</span>,
    },
    {
      key: "orderId",
      label: "Order",
      render: (v, row) => <span className="font-mono text-xs">#{row.orderNumber || row.order_number || String(v || "—").slice(-8)}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (v) => <StatusBadge status={v} color={STATUS_COLOR[v] || "gray"} />,
    },
    {
      key: "refundStatus",
      label: "Refund",
      render: (v) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${v === "completed" ? "bg-green-100 text-green-700" : v === "failed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
          {display(v)}
        </span>
      ),
    },
    {
      key: "scope",
      label: "Scope",
      render: (v) => <span className="text-sm capitalize">{v || "—"}</span>,
    },
    {
      key: "refundAmount",
      label: "Refund Amt",
      render: (v) => <span className="text-sm font-medium">₹{Number(v || 0).toFixed(2)}</span>,
    },
    {
      key: "createdAt",
      label: "Date",
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
                  onClick={() => setRetryConfirm({ open: true, item: row, note: "" })}
                  className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                  title="Retry Refund"
                >
                  <MdReplay size={18} />
                </button>
              )}
              {row.status === "manual_review" && (
                <button
                  onClick={() => setManualRefund({ open: true, item: row, referenceId: "", proofUrl: "", note: "" })}
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cancellations"
        subtitle="Manage order cancellations and refunds"
        breadcrumbs={[{ label: "Returns & Cancellations" }, { label: "Cancellations" }]}
      />

      <FilterBar fields={isSeller ? FILTER_FIELDS.filter((field) => field.key !== "buyerId") : FILTER_FIELDS} listPage={list} />

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
          data={payload.list}
          total={payload.total}
          listPage={list}
          emptyMessage="No cancellations found"
        />
      )}

      {/* Detail */}
      <DefaultModal isOpen={!!detail} onClose={() => setDetail(null)} title="Cancellation Detail">
        {detail && (
          <div className="p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-gray-500">Cancellation ID</p><p className="font-mono text-xs">{detail._id || detail.id}</p></div>
              <div><p className="text-gray-500">Order</p><p className="font-mono text-xs">#{detail.orderNumber || detail.order_number || String(detail.orderId || "—").slice(-8)}</p></div>
              <div><p className="text-gray-500">Status</p><StatusBadge status={detail.status} color={STATUS_COLOR[detail.status] || "gray"} /></div>
              <div><p className="text-gray-500">Refund Status</p><p>{display(detail.refundStatus)}</p></div>
              <div><p className="text-gray-500">Scope</p><p className="capitalize">{detail.scope || "—"}</p></div>
              <div><p className="text-gray-500">Refund Amount</p><p className="font-medium">₹{Number(detail.refundAmount || 0).toFixed(2)}</p></div>
              <div><p className="text-gray-500">Reason</p><p>{display(detail.reason)}</p></div>
              <div><p className="text-gray-500">Created</p><p>{fmt(detail.createdAt)}</p></div>
            </div>
            {detail.note && (
              <div><p className="text-gray-500">Note</p><p>{detail.note}</p></div>
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
            onChange={(e) => setRetryConfirm((p) => ({ ...p, note: e.target.value }))}
            placeholder="Add a note..."
          />
        </div>
      </ConfirmModal>

      {/* Manual refund modal */}
      <DefaultModal
        isOpen={manualRefund.open}
        onClose={() => setManualRefund({ open: false, item: null, referenceId: "", proofUrl: "", note: "" })}
        title="Complete Manual Refund"
      >
        <div className="p-4 space-y-4">
          <Input
            label="Reference ID *"
            value={manualRefund.referenceId}
            onChange={(e) => setManualRefund((p) => ({ ...p, referenceId: e.target.value }))}
            placeholder="Bank transfer / UPI reference..."
          />
          <Input
            label="Proof URL"
            value={manualRefund.proofUrl}
            onChange={(e) => setManualRefund((p) => ({ ...p, proofUrl: e.target.value }))}
            placeholder="https://..."
          />
          <Input
            label="Note"
            value={manualRefund.note}
            onChange={(e) => setManualRefund((p) => ({ ...p, note: e.target.value }))}
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
