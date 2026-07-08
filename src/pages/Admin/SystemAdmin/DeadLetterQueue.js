/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdDelete, MdRefresh, MdReplay } from "react-icons/md";
import Loader from "../../../components/Loader/Loader";
import Input from "../../../components/Atoms/Input/Input";
import { ConfirmModal, DataTable, FilterBar, PageHeader, StatusBadge } from "../../../components/Shared";
import { getDeadLetterEvents, retryDeadLetterEvent, discardDeadLetterEvent } from "../../../Redux/adminCoreSlice";
import { useListPage } from "../../../hooks/useListPage";

const STATUSES = ["pending", "retrying", "discarded", "failed"];
const FILTER_FIELDS = [
  { key: "status", type: "select", label: "Status", options: STATUSES.map((v) => ({ value: v, label: v })) },
  { key: "eventType", type: "text", label: "Event Type", width: "w-56" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  const candidate = data?.list || data?.events || data?.items;
  const list = Array.isArray(candidate) ? candidate : [];
  return {
    list,
    total: Number(data?.total ?? list.length),
  };
};

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY, h:mm A") : "—");

const DeadLetterQueue = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector?.deadLetterData);

  const list = useListPage({ defaultPageSize: 20 });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, action: "", event: null, reason: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = toQueryParams();
      await dispatch(getDeadLetterEvents({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      toast.error(err?.message || "Failed to load dead letter events");
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleAction = useCallback(async () => {
    const { action, event, reason } = confirm;
    if (!event) return;
    const eventId = event._id || event.id;
    try {
      setActionLoading(true);
      if (action === "retry") {
        await dispatch(retryDeadLetterEvent({ eventId, reason })).unwrap();
        toast.success("Event queued for retry");
      } else {
        await dispatch(discardDeadLetterEvent({ eventId, reason })).unwrap();
        toast.success("Event discarded");
      }
      setConfirm({ open: false, action: "", event: null, reason: "" });
      fetchEvents();
    } catch (err) {
      toast.error(err?.message || `Action failed`);
    } finally {
      setActionLoading(false);
    }
  }, [confirm, dispatch, fetchEvents]);

  const COLUMNS = [
    {
      key: "eventType",
      label: "Event Type",
      render: (v) => <span className="font-mono text-xs font-medium text-gray-800">{v || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v} color={v === "discarded" ? "gray" : v === "retrying" ? "blue" : "red"} />,
    },
    {
      key: "retryCount",
      label: "Retries",
      render: (v) => <span className="text-sm font-medium">{v ?? 0}</span>,
    },
    {
      key: "errorMessage",
      label: "Error",
      render: (v) => <span className="text-xs text-red-600 truncate max-w-[200px] block">{v || "—"}</span>,
    },
    {
      key: "createdAt",
      label: "Occurred",
      render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span>,
    },
    {
      key: "lastAttemptAt",
      label: "Last Attempt",
      render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span>,
    },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-1">
          {row.status !== "discarded" && (
            <>
              <button
                onClick={() => setConfirm({ open: true, action: "retry", event: row, reason: "" })}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                title="Retry"
              >
                <MdReplay size={18} />
              </button>
              <button
                onClick={() => setConfirm({ open: true, action: "discard", event: row, reason: "" })}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Discard"
              >
                <MdDelete size={18} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dead Letter Queue"
        subtitle="Failed events that could not be processed"
        actions={
          <button onClick={fetchEvents}>
            <MdRefresh size={16} /> Refresh
          </button>
        }
      />

      <FilterBar fields={FILTER_FIELDS} listPage={list} />

      {loading ? <Loader /> : (
        <DataTable
          columns={COLUMNS}
          data={payload.list}
          total={payload.total}
          listPage={list}
          emptyMessage="No dead letter events"
        />
      )}

      <ConfirmModal
        isOpen={confirm.open}
        title={confirm.action === "retry" ? "Retry Event" : "Discard Event"}
        description={confirm.action === "retry" ? "Retry processing this failed event?" : "Permanently discard this event? It will not be retried."}
        onConfirm={handleAction}
        onCancel={() => setConfirm({ open: false, action: "", event: null, reason: "" })}
        loading={actionLoading}
        confirmLabel={confirm.action === "retry" ? "Retry" : "Discard"}
        confirmVariant={confirm.action === "discard" ? "danger" : "primary"}
      >
        <div className="mt-3">
          <Input
            label="Reason (optional)"
            value={confirm.reason}
            onChange={(e) => setConfirm((p) => ({ ...p, reason: e.target.value }))}
            placeholder="Add a note..."
          />
        </div>
      </ConfirmModal>
    </div>
  );
};

export default DeadLetterQueue;
