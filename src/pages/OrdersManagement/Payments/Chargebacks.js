/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdRefresh, MdVisibility } from "react-icons/md";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import { getChargebacks } from "../../../Redux/adminCoreSlice";
import { useListPage } from "../../../hooks/useListPage";

const STATUSES = ["open", "under_review", "won", "lost", "cancelled", "expired"];

const STATUS_COLOR = {
  open: "yellow",
  under_review: "blue",
  won: "green",
  lost: "red",
  cancelled: "gray",
  expired: "gray",
};

const FILTER_FIELDS = [
  { key: "status", type: "select", label: "Status", options: STATUSES.map((v) => ({ value: v, label: v.replace(/_/g, " ") })) },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || data?.chargebacks || data || [],
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
  };
};

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");
const money = (v) => `₹${Number(v || 0).toFixed(2)}`;
const display = (v = "") => String(v || "—").replace(/_/g, " ");

const Chargebacks = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.chargebacksData);

  const list = useListPage({ defaultPageSize: 20 });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);

  const fetchChargebacks = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getChargebacks({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      const msg = err?.message || "Failed to load chargebacks";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchChargebacks(); }, [fetchChargebacks]);

  const COLUMNS = [
    {
      key: "id",
      label: "ID",
      render: (v) => <span className="font-mono text-xs text-gray-500">{String(v || "—").slice(-8)}</span>,
    },
    {
      key: "paymentId",
      label: "Payment ID",
      render: (v) => <span className="font-mono text-xs">{String(v || "—").slice(-8)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v} color={STATUS_COLOR[v] || "gray"} />,
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (v) => <span className="text-sm font-semibold">{money(v)}</span>,
    },
    {
      key: "reason",
      label: "Reason",
      render: (v) => <span className="text-sm capitalize">{display(v)}</span>,
    },
    {
      key: "provider",
      label: "Provider",
      render: (v) => <span className="text-sm capitalize">{v || "—"}</span>,
    },
    {
      key: "dueDate",
      label: "Due Date",
      render: (v) => <span className={`text-xs ${v && new Date(v) < new Date() ? "text-red-600 font-medium" : "text-gray-500"}`}>{fmt(v)}</span>,
    },
    {
      key: "createdAt",
      label: "Reported",
      render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span>,
    },
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <button onClick={() => setDetail(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
          <MdVisibility size={18} />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Chargebacks"
        subtitle="Monitor and track payment chargebacks"
        actions={
          <button onClick={fetchChargebacks} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <MdRefresh size={16} /> Refresh
          </button>
        }
      />

      <FilterBar fields={FILTER_FIELDS} listPage={list} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {loading ? <Loader /> : (
        <DataTable
          columns={COLUMNS}
          data={payload.list}
          total={payload.total}
          listPage={list}
          emptyMessage="No chargebacks found"
        />
      )}

      <DefaultModal isOpen={!!detail} onClose={() => setDetail(null)} title="Chargeback Detail">
        {detail && (
          <div className="p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-gray-500">Chargeback ID</p><p className="font-mono text-xs">{detail._id || detail.id}</p></div>
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
    </div>
  );
};

export default Chargebacks;
