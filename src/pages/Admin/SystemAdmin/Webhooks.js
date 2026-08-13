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
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import { getWebhooks, createWebhook } from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { formatLabel } from "../../../utils/formatters";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import OrangeButton from "../../../components/Atoms/buttons/OrangeButton";

const STATUSES = ["active", "paused", "failed"];
const FILTER_FIELDS = [
  {
    key: "ownerId",
    type: "asyncDropdown",
    label: "Owner",
    load: (search) =>
      dropdownApi.getSellers({
        keyWord: search,
        searchFields: "storeName,email",
      }),
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    options: STATUSES.map((v) => ({ value: v, label: formatLabel(v) })),
  },
];

const COMMON_EVENTS = [
  "order.created",
  "order.status_changed",
  "order.shipped",
  "order.delivered",
  "payment.captured",
  "payment.failed",
  "return.requested",
  "return.approved",
  "seller.approved",
  "seller.rejected",
  "product.approved",
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  const candidate = data?.list || data?.webhooks || data?.items;
  const list = Array.isArray(candidate) ? candidate : [];
  return {
    list,
    total: Number(data?.total ?? list.length),
  };
};

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");
const EMPTY_FORM = {
  endpointUrl: "",
  secret: "",
  eventTypes: [],
  ownerId: "",
  maxRetries: 5,
};

const Webhooks = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector?.webhooksData);

  const list = useListPage({ defaultPageSize: 20 });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customEvent, setCustomEvent] = useState("");
  const [saving, setSaving] = useState(false);
  const [sellerOptions, setSellerOptions] = useState([]);
  useEffect(() => {
    dropdownApi
      .getSellers({ limit: 100 })
      .then(setSellerOptions)
      .catch(() => {});
  }, []);

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const params = toQueryParams();
      await dispatch(
        getWebhooks({ ...params, offset: (params.page - 1) * params.limit }),
      ).unwrap();
    } catch (err) {
      toast.error(err?.message || "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

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
      setForm((p) => ({
        ...p,
        eventTypes: [...p.eventTypes, customEvent.trim()],
      }));
      setCustomEvent("");
    }
  };

  const handleCreate = useCallback(async () => {
    if (!form.endpointUrl.trim()) {
      toast.error("Endpoint URL required");
      return;
    }
    if (!form.endpointUrl.startsWith("http")) {
      toast.error("URL must start with http(s)://");
      return;
    }
    if (form.eventTypes.length === 0) {
      toast.error("Select at least one event type");
      return;
    }
    try {
      setSaving(true);
      await dispatch(
        createWebhook({
          endpointUrl: form.endpointUrl,
          secret: form.secret || undefined,
          eventTypes: form.eventTypes,
          ownerId: form.ownerId || undefined,
          maxRetries: Number(form.maxRetries) || 5,
        }),
      ).unwrap();
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
      render: (v) => (
        <span className="font-mono text-xs text-gray-800 truncate max-w-[200px] block">
          {v || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <StatusBadge
          status={v || "active"}
          color={v === "failed" ? "red" : v === "paused" ? "yellow" : "green"}
        />
      ),
    },
    {
      key: "eventTypes",
      label: "Events",
      render: (v) => (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(v) ? v : []).slice(0, 2).map((e) => (
            <span
              key={e}
              className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded"
            >
              {e}
            </span>
          ))}
          {(Array.isArray(v) ? v : []).length > 2 && (
            <span className="text-xs text-gray-400">+{v.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      key: "deliverySuccessRate",
      label: "Success",
      render: (v) => (
        <span
          className={`text-sm font-medium ${Number(v) < 80 ? "text-red-600" : "text-green-600"}`}
        >
          {v != null ? `${v}%` : "—"}
        </span>
      ),
    },
    {
      key: "ownerId",
      label: "Owner",
      render: (v, row) => {
        const name =
          row.ownerName ||
          row.owner?.name ||
          sellerOptions.find((o) => o.value === v)?.label;
        return name ? (
          <span className="text-sm text-gray-700">{name}</span>
        ) : (
          <span className="font-mono text-xs text-gray-500">
            {v ? String(v).slice(-8) : "platform"}
          </span>
        );
      },
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
            <button onClick={fetchWebhooks}>
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="platform" action={ACTIONS.CREATE} hide>
              <button onClick={() => setShowCreate(true)}>
                <MdAdd size={16} /> Add Webhook
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <FilterBar fields={FILTER_FIELDS} listPage={list} />

      {loading ? (
        <Loader />
      ) : (
        <DataTable
          columns={COLUMNS}
          data={payload.list}
          total={payload.total}
          listPage={list}
          emptyMessage="No webhooks configured"
        />
      )}

      <DefaultModal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false);
          setForm(EMPTY_FORM);
        }}
        title="Add Webhook"
        isButtonView={false}
      >
        <div className="flex flex-col gap-4 pb-6">
          <Input
            label="Endpoint URL"
            required
            value={form.endpointUrl}
            onChange={(e) =>
              setForm((p) => ({ ...p, endpointUrl: e.target.value }))
            }
            placeholder="https://your-server.com/webhook"
          />
          <Input
            label="Secret (for HMAC signing)"
            value={form.secret}
            onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))}
            placeholder="Leave blank to auto-generate"
          />
          <FilterSelect
            label="Owner (leave blank for platform)"
            options={[
              { value: "", label: "— Platform (no specific seller) —" },
              ...sellerOptions,
            ]}
            value={
              sellerOptions.find(
                (o) => String(o.value) === String(form.ownerId),
              ) || { value: "", label: "— Platform (no specific seller) —" }
            }
            onChange={(opt) =>
              setForm((p) => ({ ...p, ownerId: opt?.value || "" }))
            }
            isClearable
          />
          <Input
            label="Max Retries"
            type="number"
            value={form.maxRetries}
            onChange={(e) =>
              setForm((p) => ({ ...p, maxRetries: e.target.value }))
            }
          />
          <div className="flex flex-col gap-2">
            <label className="admin-label !mb-0 flex items-center justify-between">
              <span>Event Types</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_EVENTS.map((e) => {
                const isSelected = form.eventTypes.includes(e);
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => toggleEvent(e)}
                    className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                      isSelected
                        ? "bg-[var(--admin-gold)] text-white border-[var(--admin-gold)] shadow-sm"
                        : "bg-white text-gray-700 border-gray-300 hover:border-[var(--admin-gold)]"
                    }`}
                  >
                    {e}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={customEvent}
                onChange={(e) => setCustomEvent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomEvent()}
                placeholder="Custom event type..."
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--admin-gold)]"
              />
              <button
                type="button"
                onClick={addCustomEvent}
                className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Add
              </button>
            </div>
            {form.eventTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                {form.eventTypes.map((e) => (
                  <span
                    key={e}
                    className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-medium"
                  >
                    {e}
                    <button
                      type="button"
                      onClick={() => toggleEvent(e)}
                      className="text-amber-600 hover:text-red-600 font-bold"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="pt-3">
            <OrangeButton
              onClick={handleCreate}
              disabled={saving}
              className="w-full justify-center py-2.5 text-sm font-semibold"
            >
              {saving ? "Creating..." : "Create Webhook"}
            </OrangeButton>
          </div>
        </div>
      </DefaultModal>
    </div>
  );
};

export default Webhooks;
