/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdPause, MdPlayArrow, MdRefresh } from "react-icons/md";
import Loader from "../../../components/Loader/Loader";
import { ConfirmModal, DataTable, PageHeader, StatusBadge } from "../../../components/Shared";
import { getSystemQueues, pauseSystemQueue, resumeSystemQueue } from "../../../Redux/adminCoreSlice";

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return data;
  return data?.list || data?.queues || data?.items || (Array.isArray(data) ? data : []);
};

const QueueManagement = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const queues = unwrapList(selector.systemQueuesData);

  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, action: "", queue: null });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQueues = useCallback(async () => {
    try {
      setLoading(true);
      await dispatch(getSystemQueues()).unwrap();
    } catch (err) {
      toast.error(err?.message || "Failed to load queues");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => { fetchQueues(); }, [fetchQueues]);

  const handleAction = useCallback(async () => {
    const { action, queue } = confirm;
    if (!queue) return;
    const queueName = queue.name || queue.queueName || queue.id;
    try {
      setActionLoading(true);
      if (action === "pause") {
        await dispatch(pauseSystemQueue({ queueName })).unwrap();
        toast.success(`Queue "${queueName}" paused`);
      } else {
        await dispatch(resumeSystemQueue({ queueName })).unwrap();
        toast.success(`Queue "${queueName}" resumed`);
      }
      setConfirm({ open: false, action: "", queue: null });
      fetchQueues();
    } catch (err) {
      toast.error(err?.message || `Failed to ${action} queue`);
    } finally {
      setActionLoading(false);
    }
  }, [confirm, dispatch, fetchQueues]);

  const COLUMNS = [
    {
      key: "name",
      label: "Queue Name",
      render: (v) => <span className="font-mono text-sm font-medium">{v || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v || "unknown"} color={v === "active" || v === "running" ? "green" : v === "paused" ? "yellow" : "gray"} />,
    },
    {
      key: "waiting",
      label: "Waiting",
      render: (v) => <span className="text-sm font-medium">{v ?? "—"}</span>,
    },
    {
      key: "active",
      label: "Active",
      render: (v) => <span className="text-sm">{v ?? "—"}</span>,
    },
    {
      key: "completed",
      label: "Completed",
      render: (v) => <span className="text-sm text-green-600">{v ?? "—"}</span>,
    },
    {
      key: "failed",
      label: "Failed",
      render: (v) => <span className={`text-sm font-medium ${Number(v) > 0 ? "text-red-600" : "text-gray-600"}`}>{v ?? "—"}</span>,
    },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => {
        const isPaused = row.status === "paused" || row.isPaused;
        return (
          <div className="flex gap-1">
            {isPaused ? (
              <button
                onClick={() => setConfirm({ open: true, action: "resume", queue: row })}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                <MdPlayArrow size={14} /> Resume
              </button>
            ) : (
              <button
                onClick={() => setConfirm({ open: true, action: "pause", queue: row })}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                <MdPause size={14} /> Pause
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Queue Management"
        subtitle="Monitor and control background job queues"
        actions={
          <button onClick={fetchQueues} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <MdRefresh size={16} /> Refresh
          </button>
        }
      />

      {loading ? (
        <Loader />
      ) : queues.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No queues found</div>
      ) : (
        <DataTable columns={COLUMNS} data={queues} total={queues.length} emptyMessage="No queues found" />
      )}

      <ConfirmModal
        isOpen={confirm.open}
        title={confirm.action === "pause" ? "Pause Queue" : "Resume Queue"}
        description={`${confirm.action === "pause" ? "Pause" : "Resume"} queue "${confirm.queue?.name}"?`}
        onConfirm={handleAction}
        onCancel={() => setConfirm({ open: false, action: "", queue: null })}
        loading={actionLoading}
        confirmLabel={confirm.action === "pause" ? "Pause" : "Resume"}
        confirmVariant={confirm.action === "pause" ? "danger" : "success"}
      />
    </div>
  );
};

export default QueueManagement;
