import React, { useCallback, useEffect, useState } from "react";
import { MdPercent, MdAdd, MdEdit, MdDelete, MdRefresh } from "react-icons/md";
import { PageHeader, DataTable, StatusBadge, FilterBar, ConfirmModal } from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { toast } from "../../../utils/toast";
import { useListPage } from "../../../hooks/useListPage";
import PlatformFeeConfig from "../PlatformFeeConfig/PlatformFeeConfig";

const TIER_OPTIONS = [
  { value: "all", label: "All Tiers" },
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
];

const SCOPE_OPTIONS = [
  { value: "global", label: "Global default" },
  { value: "category", label: "Category" },
  { value: "product", label: "Product" },
  { value: "seller", label: "Seller" },
  { value: "organization", label: "Organization" },
];

const COMMISSION_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage" },
  { value: "fixed", label: "Fixed" },
  { value: "mixed", label: "Mixed" },
];

const APPLY_ON_OPTIONS = [
  { value: "product_amount", label: "Product amount" },
  { value: "order_subtotal", label: "Order subtotal" },
  { value: "final_paid_amount", label: "Final paid amount" },
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
    key: "ruleScope",
    type: "select",
    label: "Scope",
    width: "w-44",
    options: SCOPE_OPTIONS,
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
    key: "ruleScope",
    label: "Scope",
    render: (v) => (
      <span className="capitalize px-2 py-0.5 bg-[#EEF3FF] text-[#1f4fc9] text-xs rounded-full font-medium">
        {String(v || "global").replace(/_/g, " ")}
      </span>
    ),
  },
  {
    key: "commissionType",
    label: "Type",
    render: (v) => <span className="capitalize">{String(v || "percentage").replace(/_/g, " ")}</span>,
  },
  {
    key: "sellerTier",
    label: "Seller Tier",
    render: (v) => (
      <span className="capitalize px-2 py-0.5 bg-[#F4F1ED] text-[var(--admin-navy)] text-xs rounded-full font-medium">
        {v || "all"}
      </span>
    ),
  },
  {
    key: "categoryName",
    label: "Target",
    render: (v, row) => row.productSku || row.productId || v || row.sellerId || row.organizationId || <span className="text-gray-400">Global</span>,
  },
  {
    key: "rate",
    label: "Percentage",
    sortable: true,
    render: (v, row) => (
      <span className="font-mono font-semibold text-[var(--admin-navy)]">
        {row.percentage !== undefined && row.percentage !== null
          ? String(Number(row.percentage).toFixed(2)) + "%"
          : v !== undefined ? String((v * 100).toFixed(1)) + "%" : "—"}
      </span>
    ),
  },
  {
    key: "fixedFeeAmount",
    label: "Fixed Fee",
    render: (v) => Number(v || 0) > 0 ? <span className="font-mono">₹{Number(v).toFixed(2)}</span> : <span className="text-gray-400">—</span>,
  },
  {
    key: "applyOn",
    label: "Apply On",
    render: (v) => <span className="capitalize text-gray-600">{String(v || "product_amount").replace(/_/g, " ")}</span>,
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
  {
    key: "taxHandling",
    label: "Tax Handling",
    render: (v) => <span className="capitalize text-gray-600">{v || "exclusive"}</span>,
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
  ruleScope: "global",
  commissionType: "percentage",
  sellerTier: "all",
  categoryId: "",
  categoryName: "",
  productId: "",
  productSku: "",
  sellerId: "",
  organizationId: "",
  rate: "",
  fixedFeeAmount: "",
  taxRate: "0.18",
  applyOn: "product_amount",
  taxHandling: "exclusive",
  effectiveFrom: "",
  effectiveTo: "",
  priority: "0",
  isActive: true,
  notes: "",
};

const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");

const CommissionRules = () => {
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "priority" });
  const { toQueryParams } = list;
  const [activeRuleType, setActiveRuleType] = useState("commission");
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
      const params = toQueryParams();
      const res = await axiosProvider.get(ENDPOINTS.finance.commissionRules, {
        params: {
          page: params.page,
          limit: params.limit,
          sellerTier: params.sellerTier || undefined,
          ruleScope: params.ruleScope || undefined,
          isActive: params.isActive || undefined,
          search: params.search || undefined,
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
  }, [toQueryParams]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const openCreate = () => {
    setEditingRule(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name || "",
      ruleScope: rule.ruleScope || "global",
      commissionType: rule.commissionType || "percentage",
      sellerTier: rule.sellerTier || "all",
      categoryId: rule.categoryId || "",
      categoryName: rule.categoryName || "",
      productId: rule.productId || "",
      productSku: rule.productSku || "",
      sellerId: rule.sellerId || "",
      organizationId: rule.organizationId || "",
      rate: rule.percentage !== undefined && rule.percentage !== null
        ? String(rule.percentage)
        : rule.rate !== undefined ? (rule.rate * 100).toString() : "",
      fixedFeeAmount: rule.fixedFeeAmount?.toString() || "",
      taxRate: rule.taxRate !== undefined ? rule.taxRate.toString() : "0.18",
      applyOn: rule.applyOn || "product_amount",
      taxHandling: rule.taxHandling || "exclusive",
      effectiveFrom: toDateInput(rule.effectiveFrom),
      effectiveTo: toDateInput(rule.effectiveTo),
      priority: rule.priority?.toString() || "0",
      isActive: rule.isActive !== false,
      notes: rule.notes || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Rule name is required");
    if (["percentage", "mixed"].includes(form.commissionType) && (form.rate === "" || isNaN(Number(form.rate)))) {
      return toast.error("Valid commission percentage is required");
    }
    if (["fixed", "mixed"].includes(form.commissionType) && (form.fixedFeeAmount === "" || isNaN(Number(form.fixedFeeAmount)))) {
      return toast.error("Valid fixed fee is required");
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        ruleScope: form.ruleScope,
        commissionType: form.commissionType,
        sellerTier: form.sellerTier,
        categoryId: form.categoryId || null,
        categoryName: form.categoryName.trim(),
        productId: form.productId.trim(),
        productSku: form.productSku.trim(),
        sellerId: form.sellerId.trim(),
        organizationId: form.organizationId.trim(),
        percentage: ["percentage", "mixed"].includes(form.commissionType) ? Number(form.rate) : 0,
        rate: ["percentage", "mixed"].includes(form.commissionType) ? Number(form.rate) / 100 : 0,
        fixedFeeAmount: ["fixed", "mixed"].includes(form.commissionType) ? Number(form.fixedFeeAmount) : 0,
        taxRate: Number(form.taxRate) || 0.18,
        applyOn: form.applyOn,
        taxHandling: form.taxHandling,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo: form.effectiveTo || null,
        priority: Number(form.priority) || 0,
        isActive: form.isActive,
        status: form.isActive ? "active" : "inactive",
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

  const ruleTabs = (
    <div className="mb-4 inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white p-1">
      {[
        { value: "commission", label: "Seller Commission" },
        { value: "platform_fee", label: "Platform Fee" },
      ].map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            activeRuleType === tab.value
              ? "bg-[var(--admin-blue)] text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
          onClick={() => setActiveRuleType(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  if (activeRuleType === "platform_fee") {
    return (
      <div>
        {ruleTabs}
        <PlatformFeeConfig embedded />
      </div>
    );
  }

  return (
    <div>
      {ruleTabs}
      <PageHeader
        title="Commission & Fee Rules"
        subtitle="Configure global, category, product, seller, and organization commission rules"
        breadcrumbs={[{ label: "Commerce Settings" }, { label: "Commission & Fee Rules" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRules}

            >
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="commission" action={ACTIONS.CREATE} hide>
              <button
                onClick={openCreate}

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
          <strong>Rule priority:</strong> Product → Category → Seller → Organization → Global default.
          Higher priority numbers break ties within the same scope.
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rule Scope</label>
                  <select
                    value={form.ruleScope}
                    onChange={(e) => setForm((f) => ({ ...f, ruleScope: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  >
                    {SCOPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commission Type</label>
                  <select
                    value={form.commissionType}
                    onChange={(e) => setForm((f) => ({ ...f, commissionType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  >
                    {COMMISSION_TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apply On</label>
                  <select
                    value={form.applyOn}
                    onChange={(e) => setForm((f) => ({ ...f, applyOn: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  >
                    {APPLY_ON_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Handling</label>
                  <select
                    value={form.taxHandling}
                    onChange={(e) => setForm((f) => ({ ...f, taxHandling: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  >
                    <option value="exclusive">Exclusive</option>
                    <option value="inclusive">Inclusive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
                  <input
                    type="date"
                    value={form.effectiveFrom}
                    onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective To</label>
                  <input
                    type="date"
                    value={form.effectiveTo}
                    onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  />
                </div>
              </div>

              {form.ruleScope === "product" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                    <input
                      type="text"
                      value={form.productId}
                      onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                      placeholder="Mongo product id"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product SKU</label>
                    <input
                      type="text"
                      value={form.productSku}
                      onChange={(e) => setForm((f) => ({ ...f, productSku: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                      placeholder="Optional SKU"
                    />
                  </div>
                </div>
              )}

              {form.ruleScope === "seller" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seller ID</label>
                  <input
                    type="text"
                    value={form.sellerId}
                    onChange={(e) => setForm((f) => ({ ...f, sellerId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                    placeholder="Seller user id"
                  />
                </div>
              )}

              {form.ruleScope === "organization" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization ID</label>
                  <input
                    type="text"
                    value={form.organizationId}
                    onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                    placeholder="Seller organization id"
                  />
                </div>
              )}

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

              {form.ruleScope === "category" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                  <input
                    type="text"
                    value={form.categoryName}
                    onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                    placeholder="Category name"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {["percentage", "mixed"].includes(form.commissionType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Percentage Commission (%) *</label>
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
                )}

                {["fixed", "mixed"].includes(form.commissionType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Fee Per Unit (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <input
                      type="number"
                      value={form.fixedFeeAmount}
                      onChange={(e) => setForm((f) => ({ ...f, fixedFeeAmount: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                      placeholder="10"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                )}

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
