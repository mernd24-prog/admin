import React, { useCallback, useEffect, useState } from "react";
import { MdPercent, MdAdd, MdEdit, MdDelete, MdRefresh } from "react-icons/md";
import { PageHeader, DataTable, StatusBadge, FilterBar, ConfirmModal } from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { toast } from "react-toastify";
import { useListPage } from "../../../hooks/useListPage";

const TIER_OPTIONS = [
  { value: "all", label: "All Tiers" },
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
];

const FILTER_FIELDS = [
  {
    key: "sellerTier",
    type: "select",
    label: "Seller Tier",
    width: "w-44",
    options: TIER_OPTIONS,
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

const COLUMNS = [
  { key: "name", label: "Rule Name", sortable: true },
  {
    key: "sellerTier",
    label: "Seller Tier",
    render: (v) => (
      <span className="capitalize px-2 py-0.5 bg-[#F4F1ED] text-[var(--admin-navy)] text-xs rounded-full font-medium">
        {v || "all"}
      </span>
    ),
  },
  { key: "categoryName", label: "Category Override", render: (v) => v || <span className="text-gray-400">—</span> },
  {
    key: "rate",
    label: "Rate",
    sortable: true,
    render: (v) => (
      <span className="font-mono font-semibold text-[var(--admin-navy)]">
        {v !== undefined ? `${(v * 100).toFixed(1)}%` : "—"}
      </span>
    ),
  },
  {
    key: "taxRate",
    label: "Tax on Commission",
    render: (v) => (
      <span className="font-mono text-gray-500">
        {v !== undefined ? `${(v * 100).toFixed(0)}%` : "18%"}
      </span>
    ),
  },
  { key: "priority", label: "Priority", render: (v) => <span className="font-mono">{v ?? 0}</span> },
  {
    key: "isActive",
    label: "Status",
    render: (v) => <StatusBadge status={v ? "active" : "inactive"} dot />,
  },
  { key: "notes", label: "Notes", render: (v) => v || <span className="text-gray-400">—</span> },
];

const EMPTY_FORM = {
  name: "",
  sellerTier: "all",
  categoryId: "",
  categoryName: "",
  rate: "",
  taxRate: "0.18",
  priority: "0",
  isActive: true,
  notes: "",
};

const CommissionRules = () => {
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
      const res = await axiosProvider.get(ENDPOINTS.finance.commissionRules, {
        params: {
          page: params.page,
          limit: params.limit,
          sellerTier: params.sellerTier || undefined,
          isActive: params.isActive || undefined,
        },
      });
      const data = res?.data?.data;
      const items = Array.isArray(data) ? data : data?.items || [];
      const totalCount = Number(res?.data?.pagination?.total ?? res?.data?.meta?.total ?? items.length);
      setRules(items);
      setTotal(totalCount);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load commission rules";
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
      sellerTier: rule.sellerTier || "all",
      categoryId: rule.categoryId || "",
      categoryName: rule.categoryName || "",
      rate: rule.rate !== undefined ? (rule.rate * 100).toString() : "",
      taxRate: rule.taxRate !== undefined ? rule.taxRate.toString() : "0.18",
      priority: rule.priority?.toString() || "0",
      isActive: rule.isActive !== false,
      notes: rule.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Rule name is required");
    if (!form.rate || isNaN(Number(form.rate))) return toast.error("Valid rate is required");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sellerTier: form.sellerTier,
        categoryId: form.categoryId || null,
        categoryName: form.categoryName.trim(),
        rate: Number(form.rate) / 100,
        taxRate: Number(form.taxRate) || 0.18,
        priority: Number(form.priority) || 0,
        isActive: form.isActive,
        notes: form.notes.trim(),
      };

      if (editingRule) {
        await axiosProvider.patch(ENDPOINTS.finance.commissionRule(editingRule._id), payload);
        toast.success("Commission rule updated");
      } else {
        await axiosProvider.post(ENDPOINTS.finance.commissionRules, payload);
        toast.success("Commission rule created");
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
      await axiosProvider.delete(ENDPOINTS.finance.commissionRule(deleteConfirm.rule._id));
      toast.success("Commission rule deleted");
      setDeleteConfirm({ open: false, rule: null });
      fetchRules();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete rule");
    }
  };

  const columns = [
    ...COLUMNS,
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <PermissionGuard module="commission" action={ACTIONS.EDIT} hide>
            <button
              onClick={() => openEdit(row)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[var(--admin-navy)] transition-colors"
              title="Edit"
            >
              <MdEdit size={15} />
            </button>
          </PermissionGuard>
          <PermissionGuard module="commission" action={ACTIONS.DELETE} hide>
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
        title="Commission Rules"
        subtitle="Configure seller commission rates by tier and category"
        breadcrumbs={[{ label: "Commerce Settings" }, { label: "Commission Rules" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRules}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 text-gray-600"
            >
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="commission" action={ACTIONS.CREATE} hide>
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

      {/* Default rates info banner */}
      <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex items-start gap-3">
        <MdPercent size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <strong>Default fallback rates:</strong> Bronze 15% · Silver 12% · Gold 10% · Platinum 8% · Commission Tax 18%.
          Rules defined here override these defaults. Higher priority number wins when multiple rules match.
        </div>
      </div>

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
        searchPlaceholder="Search rules..."
        emptyText="No commission rules configured."
        emptyIcon={<MdPercent size={40} className="text-gray-200" />}
        requiredModule="commission"
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
              {editingRule ? "Edit Commission Rule" : "Add Commission Rule"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  placeholder="e.g., Bronze Tier Default Rate"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seller Tier</label>
                  <select
                    value={form.sellerTier}
                    onChange={(e) => setForm((f) => ({ ...f, sellerTier: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  >
                    {TIER_OPTIONS.map((t) => (
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Override (optional)</label>
                <input
                  type="text"
                  value={form.categoryName}
                  onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  placeholder="Category name (leave blank to apply to all categories)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.rate}
                      onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                      placeholder="15"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax on Commission</label>
                  <select
                    value={form.taxRate}
                    onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  >
                    <option value="0">0%</option>
                    <option value="0.05">5%</option>
                    <option value="0.12">12%</option>
                    <option value="0.18">18% (Default)</option>
                    <option value="0.28">28%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] resize-none"
                  placeholder="Optional description or notes"
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
        title="Delete Commission Rule"
        message={`Are you sure you want to delete "${deleteConfirm.rule?.name}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, rule: null })}
      />
    </div>
  );
};

export default CommissionRules;
