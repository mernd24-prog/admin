/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdEdit, MdRefresh } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { DataTable, FilterBar, PageHeader } from "../../../components/Shared";
import { getFeatureFlags, upsertFeatureFlag } from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";

const FILTER_FIELDS = [
  { key: "enabled", type: "select", label: "Status", options: [{ value: "true", label: "Enabled" }, { value: "false", label: "Disabled" }] },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  const candidate = data?.list || data?.flags || data?.items;
  const list = Array.isArray(candidate) ? candidate : [];
  return {
    list,
    total: Number(data?.total ?? list.length),
  };
};

const EMPTY_FORM = { flagKey: "", description: "", enabled: true, rolloutPercentage: 100 };

const FeatureFlags = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector?.featureFlagsData);

  const list = useListPage({ defaultPageSize: 30 });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      const params = toQueryParams();
      await dispatch(getFeatureFlags({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      toast.error(err?.message || "Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const openEdit = (flag) => {
    setForm({
      flagKey: flag.flagKey || flag.key || "",
      description: flag.description || "",
      enabled: flag.enabled !== false,
      rolloutPercentage: flag.rolloutPercentage ?? 100,
    });
    setEditing(flag);
  };

  const openCreate = () => { setForm(EMPTY_FORM); setEditing({}); };

  const handleSave = useCallback(async () => {
    if (!form.flagKey.trim()) { toast.error("Flag key required"); return; }
    try {
      setSaving(true);
      await dispatch(upsertFeatureFlag({
        flagKey: form.flagKey,
        description: form.description || undefined,
        enabled: form.enabled,
        rolloutPercentage: Number(form.rolloutPercentage) || 100,
      })).unwrap();
      toast.success(editing?._id ? "Flag updated" : "Flag created");
      setEditing(null);
      fetchFlags();
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }, [form, editing, dispatch, fetchFlags]);

  const quickToggle = useCallback(async (flag) => {
    const flagKey = flag.flagKey || flag.key;
    try {
      await dispatch(upsertFeatureFlag({ flagKey, enabled: !flag.enabled })).unwrap();
      toast.success(`Flag "${flagKey}" ${!flag.enabled ? "enabled" : "disabled"}`);
      fetchFlags();
    } catch (err) {
      toast.error(err?.message || "Toggle failed");
    }
  }, [dispatch, fetchFlags]);

  const COLUMNS = [
    {
      key: "flagKey",
      label: "Flag Key",
      render: (v) => <span className="font-mono text-sm font-medium">{v || "—"}</span>,
    },
    {
      key: "description",
      label: "Description",
      render: (v) => <span className="text-sm text-gray-600">{v || "—"}</span>,
    },
    {
      key: "rolloutPercentage",
      label: "Rollout",
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-200 rounded-full h-1.5">
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${v ?? 100}%` }} />
          </div>
          <span className="text-xs text-gray-600">{v ?? 100}%</span>
        </div>
      ),
    },
    {
      key: "enabled",
      label: "Enabled",
      render: (v, row) => (
        <PermissionGuard module="platform" action={ACTIONS.UPDATE} hide>
          <ToggleButton checked={v !== false} onChange={() => quickToggle(row)} />
        </PermissionGuard>
      ),
    },
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <PermissionGuard module="platform" action={ACTIONS.UPDATE} hide>
          <button onClick={() => openEdit(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
            <MdEdit size={18} />
          </button>
        </PermissionGuard>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Feature Flags"
        subtitle="Toggle platform features and control rollouts"
        actions={
          <div className="flex gap-2">
            <button onClick={fetchFlags}>
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="platform" action={ACTIONS.CREATE} hide>
              <button onClick={openCreate}>
                <MdAdd size={16} /> New Flag
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <FilterBar fields={FILTER_FIELDS} listPage={list} />

      {loading ? <Loader /> : (
        <DataTable columns={COLUMNS} data={payload.list} total={payload.total} listPage={list} emptyMessage="No feature flags found" />
      )}

      <DefaultModal isOpen={!!editing} onClose={() => setEditing(null)} title={editing?._id || editing?.flagKey ? "Edit Feature Flag" : "New Feature Flag"}>
        <div className="p-4 space-y-4">
          <Input
            label="Flag Key *"
            value={form.flagKey}
            onChange={(e) => setForm((p) => ({ ...p, flagKey: e.target.value }))}
            placeholder="e.g. new_checkout_flow"
            disabled={!!(editing?._id || editing?.flagKey)}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="What does this flag control?"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rollout: {form.rolloutPercentage}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={form.rolloutPercentage}
              onChange={(e) => setForm((p) => ({ ...p, rolloutPercentage: Number(e.target.value) }))}
              className="w-full"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-sm font-medium text-gray-700">Enabled</span>
          </label>
          <button onClick={handleSave} disabled={saving} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving..." : "Save Flag"}
          </button>
        </div>
      </DefaultModal>
    </div>
  );
};

export default FeatureFlags;
