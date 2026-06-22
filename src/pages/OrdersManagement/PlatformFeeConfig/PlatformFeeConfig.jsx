import React, { useCallback, useEffect, useState } from "react";
import { MdMonetizationOn, MdAdd, MdEdit, MdDelete, MdRefresh } from "react-icons/md";
import { PageHeader, DataTable, StatusBadge, FilterBar, ConfirmModal } from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { toast } from "react-toastify";
import { useListPage } from "../../../hooks/useListPage";

const FEE_TYPE_OPTIONS = [
  { value: "flat", label: "Flat Amount" },
  { value: "percentage", label: "Percentage" },
  { value: "tiered", label: "Tiered" },
];

const TIER_OPTIONS = [
  { value: "all", label: "All Tiers" },
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
];

const FILTER_FIELDS = [
  {
    key: "feeType",
    type: "select",
    label: "Fee Type",
    width: "w-40",
    options: FEE_TYPE_OPTIONS,
  },
  {
    key: "isActive",
    type: "select",
    label: "Status",
    width: "w-36",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
];

const feeDisplay = (rule) => {
  if (rule.feeType === "flat") return `₹${rule.amount ?? 0}`;
  if (rule.feeType === "percentage") return `${((rule.rate ?? 0) * 100).toFixed(2)}%`;
  if (rule.feeType === "tiered") return `${(rule.tiers || []).length} tier(s)`;
  return "—";
};

const COLUMNS = [
  { key: "name", label: "Rule Name", sortable: true },
  {
    key: "feeType",
    label: "Type",
    render: (v) => (
      <span className="capitalize px-2 py-0.5 bg-[#F4F1ED] text-[var(--admin-navy)] text-xs rounded-full font-medium">
        {v}
      </span>
    ),
  },
  {
    key: "amount",
    label: "Fee Value",
    render: (_, row) => (
      <span className="font-mono font-semibold text-[var(--admin-navy)]">{feeDisplay(row)}</span>
    ),
  },
  {
    key: "minOrderAmount",
    label: "Min Order",
    render: (v) => (v ? <span className="font-mono text-gray-500">₹{v}</span> : <span className="text-gray-400">—</span>),
  },
  {
    key: "maxFeeAmount",
    label: "Fee Cap",
    render: (v) => (v ? <span className="font-mono text-gray-500">₹{v}</span> : <span className="text-gray-400">None</span>),
  },
  { key: "priority", label: "Priority", render: (v) => <span className="font-mono">{v ?? 0}</span> },
  {
    key: "isActive",
    label: "Status",
    render: (v) => <StatusBadge status={v ? "active" : "inactive"} dot />,
  },
];

const EMPTY_FORM = {
  name: "",
  feeType: "percentage",
  amount: "",
  rate: "",
  minOrderAmount: "",
  maxFeeAmount: "",
  applicableTiers: ["all"],
  priority: "0",
  isActive: true,
  notes: "",
};

const PlatformFeeConfig = () => {
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "priority" });
  const [rules, setRules] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, rule: null });

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = list.toQueryParams();
      const res = await axiosProvider.get(ENDPOINTS.finance.platformFeeRules, {
        params: {
          page: params.page,
          limit: params.limit,
          feeType: params.feeType || undefined,
          isActive: params.isActive || undefined,
        },
      });
      const data = res?.data?.data;
      const items = Array.isArray(data) ? data : data?.items || [];
      const totalCount = Number(res?.data?.pagination?.total ?? res?.data?.meta?.total ?? items.length);
      setRules(items);
      setTotal(totalCount);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load platform fee rules";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [list.page, list.pageSize, list.filters]);

  useEffect(() => {
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.pageSize, list.filters]);

  const openCreate = () => {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name || "",
      feeType: rule.feeType || "percentage",
      amount: rule.amount?.toString() || "",
      rate: rule.rate !== undefined ? (rule.rate * 100).toString() : "",
      minOrderAmount: rule.minOrderAmount?.toString() || "",
      maxFeeAmount: rule.maxFeeAmount?.toString() || "",
      applicableTiers: rule.applicableTiers || ["all"],
      priority: rule.priority?.toString() || "0",
      isActive: rule.isActive !== false,
      notes: rule.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Rule name is required");
    if (form.feeType === "flat" && (!form.amount || isNaN(Number(form.amount)))) {
      return toast.error("Valid flat amount is required");
    }
    if (form.feeType === "percentage" && (!form.rate || isNaN(Number(form.rate)))) {
      return toast.error("Valid percentage rate is required");
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        feeType: form.feeType,
        amount: form.feeType === "flat" ? Number(form.amount) : 0,
        rate: form.feeType === "percentage" ? Number(form.rate) / 100 : 0,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
        maxFeeAmount: form.maxFeeAmount ? Number(form.maxFeeAmount) : null,
        applicableTiers: form.applicableTiers,
        priority: Number(form.priority) || 0,
        isActive: form.isActive,
        notes: form.notes.trim(),
      };

      if (editingRule) {
        await axiosProvider.patch(ENDPOINTS.finance.platformFeeRule(editingRule._id), payload);
        toast.success("Platform fee rule updated");
      } else {
        await axiosProvider.post(ENDPOINTS.finance.platformFeeRules, payload);
        toast.success("Platform fee rule created");
      }

      setModalOpen(false);
      fetchRules();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.rule) return;
    try {
      await axiosProvider.delete(ENDPOINTS.finance.platformFeeRule(deleteConfirm.rule._id));
      toast.success("Platform fee rule deleted");
      setDeleteConfirm({ open: false, rule: null });
      fetchRules();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete rule");
    }
  };

  const toggleTier = (tier) => {
    setForm((f) => {
      if (tier === "all") return { ...f, applicableTiers: ["all"] };
      const current = f.applicableTiers.filter((t) => t !== "all");
      return {
        ...f,
        applicableTiers: current.includes(tier)
          ? current.filter((t) => t !== tier)
          : [...current, tier],
      };
    });
  };

  const columns = [
    ...COLUMNS,
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <PermissionGuard module="platform-fee" action={ACTIONS.EDIT} hide>
            <button
              onClick={() => openEdit(row)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[var(--admin-navy)] transition-colors"
              title="Edit"
            >
              <MdEdit size={15} />
            </button>
          </PermissionGuard>
          <PermissionGuard module="platform-fee" action={ACTIONS.DELETE} hide>
            <button
              onClick={() => setDeleteConfirm({ open: true, rule: row })}
              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete"
            >
              <MdDelete size={15} />
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Platform Fee Configuration"
        subtitle="Configure platform fees charged on seller orders"
        breadcrumbs={[{ label: "Commerce Settings" }, { label: "Platform Fee Config" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRules}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 text-gray-600"
            >
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="platform-fee" action={ACTIONS.CREATE} hide>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors"
              >
                <MdAdd size={16} /> Add Rule
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={rules}
        loading={loading}
        error={error}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder="Search fee rules..."
        emptyText="No platform fee rules configured."
        emptyIcon={<MdMonetizationOn size={40} className="text-gray-200" />}
        requiredModule="platform-fee"
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        }
      />

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5">
              {editingRule ? "Edit Platform Fee Rule" : "Add Platform Fee Rule"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  placeholder="e.g., Standard Platform Fee"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type *</label>
                  <select
                    value={form.feeType}
                    onChange={(e) => setForm((f) => ({ ...f, feeType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  >
                    {FEE_TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              {/* Fee value inputs based on type */}
              {form.feeType === "flat" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flat Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                      placeholder="50"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {form.feeType === "percentage" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Percentage Rate (%) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.rate}
                      onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                      placeholder="2.5"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                </div>
              )}

              {form.feeType === "tiered" && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  Tiered fee configuration can be set via API. Use flat or percentage for simpler configurations.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <input
                      type="number"
                      value={form.minOrderAmount}
                      onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fee Cap (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <input
                      type="number"
                      value={form.maxFeeAmount}
                      onChange={(e) => setForm((f) => ({ ...f, maxFeeAmount: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                      placeholder="No cap"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applicable Seller Tiers</label>
                <div className="flex flex-wrap gap-2">
                  {TIER_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => toggleTier(t.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        form.applicableTiers.includes(t.value)
                          ? "bg-[var(--admin-navy)] text-white border-[var(--admin-navy)]"
                          : "bg-white text-gray-600 border-gray-300 hover:border-[var(--admin-navy)]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] resize-none"
                  placeholder="Optional description"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-[var(--admin-gold)]"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] disabled:opacity-60 transition-colors"
              >
                {saving ? "Saving…" : editingRule ? "Save Changes" : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.open}
        title="Delete Platform Fee Rule"
        message={`Are you sure you want to delete "${deleteConfirm.rule?.name}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, rule: null })}
      />
    </div>
  );
};

export default PlatformFeeConfig;
