/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdRefresh, MdVisibility } from "react-icons/md";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import { ConfirmModal, DataTable, FilterBar, PageHeader, StatusBadge } from "../../../components/Shared";
import { getChargebacks } from "../../../Redux/adminCoreSlice";
import { axiosPrivate } from "../../../_helpers/axiosProvider";
import { useListPage } from "../../../hooks/useListPage";

const STATUSES = ["open", "under_review", "won", "lost", "cancelled", "expired"];
const STATUS_COLOR = { open: "yellow", under_review: "blue", won: "green", lost: "red", cancelled: "gray", expired: "gray" };

const FILTER_FIELDS = [
  { key: "status", type: "select", label: "Status", options: STATUSES.map((v) => ({ value: v, label: v.replace(/_/g, " ") })) },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.chargebacks || data?.cases || data?.items || data || [],
    total: Number(data?.total || data?.list?.length || 0),
  };
};

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");
const money = (v) => `₹${Number(v || 0).toFixed(2)}`;
const display = (v = "") => String(v || "—").replace(/_/g, " ");

const FraudCases = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.chargebacksData);

  const list = useListPage({ defaultPageSize: 20 });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [reviewConfirm, setReviewConfirm] = useState({ open: false, item: null, decision: "approve", notes: "" });
  const [reviewing, setReviewing] = useState(false);

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      const params = toQueryParams();
      await dispatch(getChargebacks({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      toast.error(err?.message || "Failed to load fraud cases");
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleReview = useCallback(async () => {
    const { item, decision, notes } = reviewConfirm;
    if (!item) return;
    const fraudId = item._id || item.id;
    try {
      setReviewing(true);
      await axiosPrivate.post(`/fraud/${fraudId}/review`, { decision, notes });
      toast.success(`Case ${decision}d`);
      setReviewConfirm({ open: false, item: null, decision: "approve", notes: "" });
      fetchCases();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Review failed");
    } finally {
      setReviewing(false);
    }
  }, [reviewConfirm, fetchCases]);

  const COLUMNS = [
    { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs text-gray-500">{String(v || "—").slice(-8)}</span> },
    { key: "paymentId", label: "Payment", render: (v) => <span className="font-mono text-xs">{String(v || "—").slice(-8)}</span> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v} color={STATUS_COLOR[v] || "gray"} /> },
    { key: "amount", label: "Amount", render: (v) => <span className="text-sm font-semibold">{money(v)}</span> },
    { key: "reason", label: "Reason", render: (v) => <span className="text-sm capitalize">{display(v)}</span> },
    { key: "provider", label: "Provider", render: (v) => <span className="text-sm capitalize">{v || "—"}</span> },
    {
      key: "dueDate",
      label: "Due",
      render: (v) => <span className={`text-xs ${v && new Date(v) < new Date() ? "text-red-600 font-medium" : "text-gray-500"}`}>{fmt(v)}</span>,
    },
    { key: "createdAt", label: "Reported", render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span> },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => setDetail(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View"><MdVisibility size={18} /></button>
          {(row.status === "open" || row.status === "under_review") && (
            <button
              onClick={() => setReviewConfirm({ open: true, item: row, decision: "approve", notes: "" })}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Review
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Fraud Cases"
        subtitle="Monitor payment chargebacks and fraud incidents"
        breadcrumbs={[{ label: "Payments & Finance" }, { label: "Fraud Cases" }]}
        actions={
          <button onClick={fetchCases}>
            <MdRefresh size={16} /> Refresh
          </button>
        }
      />
      <FilterBar fields={FILTER_FIELDS} listPage={list} />
      <DataTable columns={COLUMNS} data={payload.list} total={payload.total} listPage={list} loading={loading} emptyMessage="No fraud cases found" />

      <DefaultModal isOpen={!!detail} onClose={() => setDetail(null)} title="Fraud Case Detail">
        {detail && (
          <div className="p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-gray-500">Case ID</p><p className="font-mono text-xs">{detail._id || detail.id}</p></div>
              <div><p className="text-gray-500">Status</p><StatusBadge status={detail.status} color={STATUS_COLOR[detail.status] || "gray"} /></div>
              <div><p className="text-gray-500">Payment ID</p><p className="font-mono text-xs">{detail.paymentId || "—"}</p></div>
              <div><p className="text-gray-500">Order ID</p><p className="font-mono text-xs">{detail.orderId || "—"}</p></div>
              <div><p className="text-gray-500">Amount</p><p className="font-semibold">{money(detail.amount)}</p></div>
              <div><p className="text-gray-500">Provider</p><p className="capitalize">{detail.provider || "—"}</p></div>
              <div><p className="text-gray-500">Reason</p><p>{display(detail.reason)}</p></div>
              <div><p className="text-gray-500">Reference #</p><p className="font-mono text-xs">{detail.referenceNumber || "—"}</p></div>
              <div><p className="text-gray-500">Due Date</p><p className={detail.dueDate && new Date(detail.dueDate) < new Date() ? "text-red-600 font-medium" : ""}>{fmt(detail.dueDate)}</p></div>
              <div><p className="text-gray-500">Reported</p><p>{fmt(detail.createdAt)}</p></div>
            </div>
            {detail.notes && <div><p className="text-gray-500">Notes</p><p>{detail.notes}</p></div>}
          </div>
        )}
      </DefaultModal>

      <ConfirmModal
        isOpen={reviewConfirm.open}
        title="Review Fraud Case"
        description="Submit your decision for this chargeback/fraud case"
        onConfirm={handleReview}
        onCancel={() => setReviewConfirm({ open: false, item: null, decision: "approve", notes: "" })}
        loading={reviewing}
        confirmLabel="Submit Decision"
      >
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={reviewConfirm.decision}
              onChange={(e) => setReviewConfirm((p) => ({ ...p, decision: e.target.value }))}
            >
              <option value="approve">Approve (Accept Chargeback)</option>
              <option value="dispute">Dispute (Contest Chargeback)</option>
              <option value="flag">Flag for Further Review</option>
            </select>
          </div>
          <Input
            label="Notes"
            value={reviewConfirm.notes}
            onChange={(e) => setReviewConfirm((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Decision notes..."
          />
        </div>
      </ConfirmModal>
    </div>
  );
};

export default FraudCases;
