/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdContentCopy, MdRefresh, MdVisibility, MdVisibilityOff } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import { DataTable, FilterBar, PageHeader, StatusBadge } from "../../../components/Shared";
import { getApiKeys, createApiKey } from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";

const STATUSES = ["active", "revoked", "expired"];
const FILTER_FIELDS = [
  { key: "ownerId", type: "asyncDropdown", label: "Owner", load: (search) => dropdownApi.getSellers({ keyWord: search, searchFields: "storeName,email" }) },
  { key: "status", type: "select", label: "Status", options: STATUSES.map((v) => ({ value: v, label: v })) },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.keys || data?.items || data || [],
    total: Number(data?.total || data?.list?.length || 0),
  };
};

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");
const EMPTY_FORM = { keyName: "", ownerId: "", scopes: "", expiresAt: "" };

const ApiKeys = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.apiKeysData);

  const list = useListPage({ defaultPageSize: 20 });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sellerOptions, setSellerOptions] = useState([]);
  useEffect(() => { dropdownApi.getSellers({ limit: 100 }).then(setSellerOptions).catch(() => {}); }, []);
  const [createdKey, setCreatedKey] = useState(null);
  const [showKeys, setShowKeys] = useState({});

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const params = toQueryParams();
      await dispatch(getApiKeys({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      toast.error(err?.message || "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = useCallback(async () => {
    if (!form.keyName.trim()) { toast.error("Key name required"); return; }
    try {
      setSaving(true);
      const res = await dispatch(createApiKey({
        keyName: form.keyName,
        ownerId: form.ownerId || undefined,
        scopes: form.scopes ? form.scopes.split(",").map((s) => s.trim()).filter(Boolean) : [],
        expiresAt: form.expiresAt || null,
      })).unwrap();
      const key = res?.data?.data || res?.data || {};
      setCreatedKey(key);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchKeys();
    } catch (err) {
      toast.error(err?.message || "Failed to create API key");
    } finally {
      setSaving(false);
    }
  }, [form, dispatch, fetchKeys]);

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text).then(() => toast.success("Copied!"));
  };

  const COLUMNS = [
    {
      key: "keyName",
      label: "Name",
      render: (v) => <span className="font-medium text-gray-800">{v || "—"}</span>,
    },
    {
      key: "keyPrefix",
      label: "Key Prefix",
      render: (v, row) => {
        const id = row._id || row.id;
        const show = showKeys[id];
        const display = show ? (row.key || v || "—") : `${v || "***"}...`;
        return (
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs">{display}</span>
            <button onClick={() => setShowKeys((p) => ({ ...p, [id]: !show }))} className="p-0.5 text-gray-400 hover:text-gray-600">
              {show ? <MdVisibilityOff size={14} /> : <MdVisibility size={14} />}
            </button>
          </div>
        );
      },
    },
    {
      key: "ownerId",
      label: "Owner",
      render: (v, row) => { const name = row.ownerName || row.owner?.name || sellerOptions.find((o) => o.value === v)?.label; return name ? <span className="text-sm text-gray-700">{name}</span> : <span className="font-mono text-xs text-gray-500">{v ? String(v).slice(-8) : "platform"}</span>; },
    },
    {
      key: "scopes",
      label: "Scopes",
      render: (v) => (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(v) ? v : []).slice(0, 3).map((s) => (
            <span key={s} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{s}</span>
          ))}
          {(Array.isArray(v) ? v : []).length > 3 && <span className="text-xs text-gray-400">+{v.length - 3}</span>}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v || "active"} color={v === "revoked" ? "red" : v === "expired" ? "gray" : "green"} />,
    },
    {
      key: "expiresAt",
      label: "Expires",
      render: (v) => <span className={`text-xs ${v && new Date(v) < new Date() ? "text-red-500" : "text-gray-500"}`}>{fmt(v)}</span>,
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
        title="API Keys"
        subtitle="Manage API keys for platform integrations"
        actions={
          <div className="flex gap-2">
            <button onClick={fetchKeys} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="platform" action={ACTIONS.CREATE} hide>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <MdAdd size={16} /> New Key
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <FilterBar fields={FILTER_FIELDS} listPage={list} />

      {loading ? <Loader /> : (
        <DataTable columns={COLUMNS} data={payload.list} total={payload.total} listPage={list} emptyMessage="No API keys found" />
      )}

      {/* Create modal */}
      <DefaultModal isOpen={showCreate} onClose={() => { setShowCreate(false); setForm(EMPTY_FORM); }} title="Create API Key">
        <div className="p-4 space-y-4">
          <Input label="Key Name *" value={form.keyName} onChange={(e) => setForm((p) => ({ ...p, keyName: e.target.value }))} placeholder="e.g. Mobile App Key" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner <span className="text-gray-400 font-normal">(leave blank for platform)</span></label>
            <select value={form.ownerId} onChange={(e) => setForm((p) => ({ ...p, ownerId: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Platform (no specific seller) —</option>
              {sellerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Input label="Scopes (comma separated)" value={form.scopes} onChange={(e) => setForm((p) => ({ ...p, scopes: e.target.value }))} placeholder="read:products, write:orders" />
          <Input label="Expires At" type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))} />
          <button onClick={handleCreate} disabled={saving} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Creating..." : "Create API Key"}
          </button>
        </div>
      </DefaultModal>

      {/* Show created key */}
      <DefaultModal isOpen={!!createdKey} onClose={() => setCreatedKey(null)} title="API Key Created">
        <div className="p-4 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800 mb-1">Save this key — it won't be shown again</p>
            <p className="text-xs text-yellow-700">Copy and store it securely.</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">API Key</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="font-mono text-sm flex-1 break-all">{createdKey?.key || createdKey?.apiKey || "—"}</span>
              <button onClick={() => copyToClipboard(createdKey?.key || createdKey?.apiKey)} className="p-1 text-gray-500 hover:text-gray-800">
                <MdContentCopy size={16} />
              </button>
            </div>
          </div>
          <button onClick={() => setCreatedKey(null)} className="w-full py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900">
            Done
          </button>
        </div>
      </DefaultModal>
    </div>
  );
};

export default ApiKeys;
