/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdRefresh } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import { DataTable, FilterBar, PageHeader, StatusBadge } from "../../../components/Shared";
import { getWebhooks, createWebhook } from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";

const STATUSES = ["active", "paused", "failed"];
const FILTER_FIELDS = [
  { key: "ownerId", type: "text", label: "Owner ID", width: "w-56" },
  { key: "status", type: "select", label: "Status", options: STATUSES.map((v) => ({ value: v, label: v })) },
];

const COMMON_EVENTS = [
  "order.created", "order.status_changed", "order.shipped", "order.delivered",
  "payment.captured", "payment.failed", "return.requested", "return.approved",
  "seller.approved", "seller.rejected", "product.approved",
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.webhooks || data?.items || data || [],
    total: Number(data?.total || data?.list?.length || 0),
  };
};

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");
const EMPTY_FORM = { endpointUrl: "", secret: "", eventTypes: [], ownerId: "", maxRetries: 5 };

const Webhooks = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.webhooksData);

  const list = useListPage({ defaultPageSize: 20 });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customEvent, setCustomEvent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const params = toQueryParams();
      await dispatch(getWebhooks({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      toast.error(err?.message || "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const toggleEvent = (event) => {
    setForm((p) => ({
      ...p,
      eventTypes: p.eventTypes.includes(event)
        ? p.eventTypes.filter((e) => e !== event)
        : [...p.eventTypes, event],
    }));
  };

  const addCustomEvent = () => {
    if (customEvent.trim() && !form.eventTypes.includes(customEvent.trim())) {
      setForm((p) => ({ ...p, eventTypes: [...p.eventTypes, customEvent.trim()] }));
      setCustomEvent("");
    }
  };

  const handleCreate = useCallback(async () => {
    if (!form.endpointUrl.trim()) { toast.error("Endpoint URL required"); return; }
    if (!form.endpointUrl.startsWith("http")) { toast.error("URL must start with http(s)://"); return; }
    if (form.eventTypes.length === 0) { toast.error("Select at least one event type"); return; }
    try {
      setSaving(true);
      await dispatch(createWebhook({
        endpointUrl: form.endpointUrl,
        secret: form.secret || undefined,
        eventTypes: form.eventTypes,
        ownerId: form.ownerId || undefined,
        maxRetries: Number(form.maxRetries) || 5,
      })).unwrap();
      toast.success("Webhook created");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchWebhooks();
    } catch (err) {
      toast.error(err?.message || "Failed to create webhook");
    } finally {
      setSaving(false);
    }
  }, [form, dispatch, fetchWebhooks]);

  const COLUMNS = [
    {
      key: "endpointUrl",
      label: "Endpoint",
      render: (v) => <span className="font-mono text-xs text-gray-800 truncate max-w-[200px] block">{v || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v || "active"} color={v === "failed" ? "red" : v === "paused" ? "yellow" : "green"} />,
    },
    {
      key: "eventTypes",
      label: "Events",
      render: (v) => (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(v) ? v : []).slice(0, 2).map((e) => (
            <span key={e} className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{e}</span>
          ))}
          {(Array.isArray(v) ? v : []).length > 2 && <span className="text-xs text-gray-400">+{v.length - 2}</span>}
        </div>
      ),
    },
    {
      key: "deliverySuccessRate",
      label: "Success",
      render: (v) => <span className={`text-sm font-medium ${Number(v) < 80 ? "text-red-600" : "text-green-600"}`}>{v != null ? `${v}%` : "—"}</span>,
    },
    {
      key: "ownerId",
      label: "Owner",
      render: (v) => <span className="font-mono text-xs text-gray-500">{v ? String(v).slice(-8) : "platform"}</span>,
    },
    {
      key: "createdAt",
      label: "Created",
      render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span>,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Webhooks"
        subtitle="Manage outbound webhook endpoints"
        actions={
          <div className="flex gap-2">
            <button onClick={fetchWebhooks} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="platform" action={ACTIONS.CREATE} hide>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <MdAdd size={16} /> Add Webhook
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <FilterBar fields={FILTER_FIELDS} listPage={list} />

      {loading ? <Loader /> : (
        <DataTable columns={COLUMNS} data={payload.list} total={payload.total} listPage={list} emptyMessage="No webhooks configured" />
      )}

      <DefaultModal isOpen={showCreate} onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); }} title="Add Webhook">
        <div className="p-4 space-y-4">
          <Input label="Endpoint URL *" value={form.endpointUrl} onChange={(e) => setForm((p) => ({ ...p, endpointUrl: e.target.value }))} placeholder="https://your-server.com/webhook" />
          <Input label="Secret (for HMAC signing)" value={form.secret} onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))} placeholder="Leave blank to auto-generate" />
          <Input label="Owner ID (optional)" value={form.ownerId} onChange={(e) => setForm((p) => ({ ...p, ownerId: e.target.value }))} placeholder="Seller ID for seller-owned webhooks" />
          <Input label="Max Retries" type="number" value={form.maxRetries} onChange={(e) => setForm((p) => ({ ...p, maxRetries: e.target.value }))} />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Event Types *</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_EVENTS.map((e) => (
                <button
                  key={e}
                  onClick={() => toggleEvent(e)}
                  className={`text-xs px-2 py-1 rounded border ${form.eventTypes.includes(e) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customEvent}
                onChange={(e) => setCustomEvent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomEvent()}
                placeholder="Custom event type..."
                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
              />
              <button onClick={addCustomEvent} className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">Add</button>
            </div>
            {form.eventTypes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.eventTypes.map((e) => (
                  <span key={e} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    {e}
                    <button onClick={() => toggleEvent(e)} className="text-blue-400 hover:text-red-500">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleCreate} disabled={saving} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Creating..." : "Create Webhook"}
          </button>
        </div>
      </DefaultModal>
    </div>
  );
};

export default Webhooks;
