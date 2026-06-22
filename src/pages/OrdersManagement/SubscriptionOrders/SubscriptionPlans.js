/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdDelete, MdEdit, MdRefresh } from "react-icons/md";
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
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
} from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";

const FILTER_FIELDS = [
  { key: "active", type: "select", label: "Status", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.plans || data?.items || data || [],
    total: Number(data?.total || data?.list?.length || 0),
  };
};

const money = (v, currency = "INR") => v != null ? `${currency} ${Number(v).toFixed(2)}` : "—";

const EMPTY_FORM = {
  planCode: "",
  title: "",
  description: "",
  monthlyPrice: "",
  yearlyPrice: "",
  currency: "INR",
  active: true,
};

const SubscriptionPlans = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.subscriptionPlansData);

  const list = useListPage({ defaultPageSize: 20 });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getSubscriptionPlans({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      const msg = err?.message || "Failed to load subscription plans";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openCreate = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); };

  const openEdit = (plan) => {
    setForm({
      planCode: plan.planCode || plan.plan_code || "",
      title: plan.title || "",
      description: plan.description || "",
      monthlyPrice: plan.monthlyPrice ?? "",
      yearlyPrice: plan.yearlyPrice ?? "",
      currency: plan.currency || "INR",
      active: plan.active !== false,
    });
    setEditingId(plan._id || plan.id);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); };

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    if (!form.planCode.trim()) { toast.error("Plan code required"); return; }
    try {
      setSaving(true);
      const body = {
        planCode: form.planCode,
        title: form.title,
        description: form.description || undefined,
        monthlyPrice: form.monthlyPrice !== "" ? Number(form.monthlyPrice) : undefined,
        yearlyPrice: form.yearlyPrice !== "" ? Number(form.yearlyPrice) : undefined,
        currency: form.currency || "INR",
        active: form.active,
      };
      if (editingId) {
        await dispatch(updateSubscriptionPlan({ planId: editingId, ...body })).unwrap();
        toast.success("Plan updated");
      } else {
        await dispatch(createSubscriptionPlan(body)).unwrap();
        toast.success("Plan created");
      }
      closeForm();
      fetchPlans();
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }, [form, editingId, dispatch, fetchPlans]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await dispatch(deleteSubscriptionPlan({ planId: deleteTarget._id || deleteTarget.id })).unwrap();
      toast.success("Plan deleted");
      setDeleteTarget(null);
      fetchPlans();
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, dispatch, fetchPlans]);

  const COLUMNS = [
    {
      key: "planCode",
      label: "Code",
      render: (v) => <span className="font-mono text-sm font-medium">{v || "—"}</span>,
    },
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (v) => <span className="font-medium text-gray-800">{v || "—"}</span>,
    },
    {
      key: "monthlyPrice",
      label: "Monthly",
      render: (v, row) => <span className="text-sm">{money(v, row.currency)}</span>,
    },
    {
      key: "yearlyPrice",
      label: "Yearly",
      render: (v, row) => <span className="text-sm">{money(v, row.currency)}</span>,
    },
    {
      key: "active",
      label: "Status",
      render: (v) => <StatusBadge status={v ? "active" : "inactive"} color={v ? "green" : "gray"} />,
    },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-1">
          <PermissionGuard module="subscriptions" action={ACTIONS.UPDATE} hide>
            <button onClick={() => openEdit(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
              <MdEdit size={18} />
            </button>
          </PermissionGuard>
          <PermissionGuard module="subscriptions" action={ACTIONS.DELETE} hide>
            <button onClick={() => setDeleteTarget(row)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete">
              <MdDelete size={18} />
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Subscription Plans"
        subtitle="Manage platform subscription plans"
        breadcrumbs={[{ label: "Commerce Settings" }, { label: "Subscription Plans" }]}
        actions={
          <div className="flex gap-2">
            <button onClick={fetchPlans} className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="subscriptions" action={ACTIONS.CREATE} hide>
              <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <MdAdd size={16} /> New Plan
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <FilterBar fields={FILTER_FIELDS} listPage={list} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <DataTable
          columns={COLUMNS}
          data={payload.list}
          total={payload.total}
          listPage={list}
          emptyMessage="No subscription plans found"
        />
      )}

      {/* Create / Edit modal */}
      <DefaultModal
        isOpen={showForm}
        onClose={closeForm}
        title={editingId ? "Edit Subscription Plan" : "New Subscription Plan"}
      >
        <div className="p-4 space-y-4">
          <Input
            label="Plan Code *"
            value={form.planCode}
            onChange={(e) => setForm((p) => ({ ...p, planCode: e.target.value }))}
            placeholder="e.g. BASIC_MONTHLY"
            disabled={!!editingId}
          />
          <Input
            label="Title *"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Plan title..."
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Plan description..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monthly Price"
              type="number"
              value={form.monthlyPrice}
              onChange={(e) => setForm((p) => ({ ...p, monthlyPrice: e.target.value }))}
              placeholder="0.00"
            />
            <Input
              label="Yearly Price"
              type="number"
              value={form.yearlyPrice}
              onChange={(e) => setForm((p) => ({ ...p, yearlyPrice: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <Input
            label="Currency"
            value={form.currency}
            onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
            placeholder="INR"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update Plan" : "Create Plan"}
          </button>
        </div>
      </DefaultModal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Plan"
        description={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
};

export default SubscriptionPlans;
