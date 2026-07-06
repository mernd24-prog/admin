/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdFamilyRestroom, MdAdd, MdDelete, MdEdit, MdToggleOff, MdToggleOn } from "react-icons/md";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  ConfirmModal,
  FilterBar,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import {
  createProductFamily,
  deleteProductFamily,
  getProductFamilies,
  updateProductFamily,
} from "../../../Redux/adminCoreSlice";
import { getList } from "../../../Redux/productSlice";
import { getAllSellerList } from "../../../Redux/StoreSlice";
import { transformArray } from "../../../_helpers/globalFunctions";

const idFromRecord = (item = {}) => item?.familyCode || item?.code || item?.id || "";
const emptyAttribute = { key: "", value: "" };

const emptyForm = {
  familyCode: "",
  title: "",
  category: "",
  sellerId: "",
  status: "active",
  variantAxes: [""],
  baseAttributes: [emptyAttribute],
};

const FILTER_FIELDS = [
  {
    key: "status",
    type: "select",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
    width: "w-40",
  },
];

const toAttributeRows = (obj = {}) => {
  const entries = Object.entries(obj || {});
  if (!entries.length) return [emptyAttribute];
  return entries.map(([key, value]) => ({ key, value: String(value ?? "") }));
};

const toAttributeObject = (rows = []) =>
  rows.reduce((acc, row) => {
    const key = String(row.key || "").trim();
    if (!key) return acc;
    acc[key] = String(row.value || "").trim();
    return acc;
  }, {});

const COLUMNS = [
  {
    key: "familyCode",
    label: "Family Code",
    sortable: true,
    render: (v, row) => <span className="font-mono text-xs">{v || row.code}</span>,
  },
  {
    key: "title",
    label: "Title",
    sortable: true,
    render: (v, row) => <span className="font-medium text-gray-800">{v || row.name}</span>,
  },
  { key: "category", label: "Category", render: (v) => <span className="text-sm text-gray-600">{v || "—"}</span> },
  { key: "sellerId", label: "Seller", render: (v, row) => <span className="text-sm text-gray-600">{row.sellerName || v || "—"}</span> },
  {
    key: "variantAxes",
    label: "Variant Axes",
    render: (v) => <span className="text-sm text-gray-500">{Array.isArray(v) && v.length ? v.join(", ") : "—"}</span>,
  },
  {
    key: "status",
    label: "Status",
    render: (v) => <StatusBadge status={v === "active" ? "active" : "inactive"} dot />,
  },
];

const ProductFamilies = () => {
  const dispatch = useDispatch();
  const list = useListPage({ defaultPageSize: 10, defaultSortKey: "createdAt", defaultSortDir: "desc" });

  const selector = useSelector((state) => state.adminCore);
  const productSelector = useSelector((state) => state.product);
  const storeSelector = useSelector((state) => state.store);

  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toQueryParams } = list;

  const payload = selector?.productFamiliesData?.data?.data || {};
  const families = payload?.list || [];
  const total = payload?.total || 0;

  const categoryList = productSelector?.getListData?.data?.data?.list || [];
  const sellerOptions = transformArray(storeSelector?.getAllSellerListData?.data?.data?.list || []);

  const categoryOptions = useMemo(() => {
    const options = [];
    const addOptions = (categories, prefix = "") => {
      if (!Array.isArray(categories)) return;
      categories.forEach((cat) => {
        const name = cat.name || cat.title || cat.categoryKey;
        const label = prefix ? `${prefix} > ${name}` : name;
        options.push({ value: cat.categoryKey || cat._id || cat.id, label });
        const children = cat.subcategories || cat.subCategories || [];
        if (children.length) addOptions(children, label);
      });
    };
    addOptions(categoryList);
    return options;
  }, [categoryList]);

  const load = useCallback(() => {
    const params = toQueryParams();
    dispatch(getProductFamilies({
      page: params.page,
      limit: params.limit || 10,
      q: params.search || undefined,
      status: params.status || undefined,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
    }));
  }, [dispatch, toQueryParams]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    dispatch(getList({ limit: 100 }));
    dispatch(getAllSellerList());
  }, []);

  const validateForm = () => {
    const nextErrors = {};
    if (!String(formData.familyCode || "").trim()) nextErrors.familyCode = "Required";
    if (formData.familyCode && !/^[A-Za-z0-9_-]+$/.test(formData.familyCode)) {
      nextErrors.familyCode = "Use letters, numbers, underscores, or hyphens";
    }
    if (!String(formData.title || "").trim()) nextErrors.title = "Required";
    if (!String(formData.category || "").trim()) nextErrors.category = "Required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeModal = () => { setIsModalOpen(false); setFormData(emptyForm); setErrors({}); };

  const toPayload = () => ({
    familyCode: String(formData.familyCode || "").trim(),
    title: String(formData.title || "").trim(),
    category: String(formData.category || "").trim(),
    sellerId: String(formData.sellerId || "").trim() || undefined,
    status: formData.status || "active",
    variantAxes: (formData.variantAxes || []).map((v) => String(v || "").trim()).filter(Boolean),
    baseAttributes: toAttributeObject(formData.baseAttributes || []),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (formData._editingId) {
        await dispatch(updateProductFamily({ ...toPayload(), familyCode: formData._editingId })).unwrap();
        toast.success("Product family updated");
      } else {
        await dispatch(createProductFamily(toPayload())).unwrap();
        toast.success("Product family created");
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err?.message || "Failed to save product family");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const familyCode = idFromRecord(deleteTarget);
    if (!familyCode) return;
    setSaving(true);
    try {
      await dispatch(deleteProductFamily({ familyCode })).unwrap();
      toast.success("Product family deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err?.message || "Failed to delete product family");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleConfirm = async () => {
    const familyCode = idFromRecord(toggleTarget);
    if (!familyCode) return;
    setSaving(true);
    try {
      await dispatch(updateProductFamily({ familyCode, status: toggleTarget.status === "active" ? "inactive" : "active" })).unwrap();
      toast.success("Status updated");
      setToggleTarget(null);
      load();
    } catch (err) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row) => {
    setFormData({
      _editingId: idFromRecord(row),
      familyCode: row.familyCode || row.code || "",
      title: row.title || row.name || "",
      category: row.category || "",
      sellerId: row.sellerId || "",
      status: row.status || "active",
      variantAxes: Array.isArray(row.variantAxes) && row.variantAxes.length ? row.variantAxes : [""],
      baseAttributes: toAttributeRows(row.baseAttributes || {}),
    });
    setIsModalOpen(true);
  };

  const columns = [
    ...COLUMNS,
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <PermissionGuard module="products" action={ACTIONS.UPDATE} hide>
            <button type="button" onClick={() => openEdit(row)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" title="Edit family">
              <MdEdit size={16} />
            </button>
          </PermissionGuard>
          <PermissionGuard module="products" action={ACTIONS.STATUS_CHANGE} hide>
            <button
              type="button"
              onClick={() => setToggleTarget(row)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                row.status === "active"
                  ? "border-yellow-100 text-yellow-600 hover:bg-yellow-50"
                  : "border-green-100 text-green-600 hover:bg-green-50"
              }`}
              title={row.status === "active" ? "Deactivate family" : "Activate family"}
            >
              {row.status === "active" ? <MdToggleOff size={18} /> : <MdToggleOn size={18} />}
            </button>
          </PermissionGuard>
          <PermissionGuard module="products" action={ACTIONS.DELETE} hide>
            <button type="button" onClick={() => setDeleteTarget(row)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50" title="Delete family">
              <MdDelete size={16} />
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 sm:px-0">
      <PageHeader
        title="Product Families"
        subtitle="Define product families with shared variant axes and base attributes"
        breadcrumbs={[{ label: "Product Management" }, { label: "Product Families" }]}
        actions={
          <PermissionGuard module="products" action={ACTIONS.CREATE} hide>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors"
            >
              <MdAdd size={16} /> Add Family
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={columns}
        data={families}
        loading={selector.loading}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder="Search families…"
        emptyText="No product families found."
        emptyIcon={<MdFamilyRestroom size={40} className="text-gray-200" />}
        requiredModule="products"
        exportConfig={{ filename: "product-families", columns: COLUMNS }}
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={selector.loading}
            activeCount={list.activeFilterCount}
          />
        }
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5">
              {formData._editingId ? "Edit Product Family" : "Add Product Family"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Family Code"
                name="familyCode"
                value={formData.familyCode}
                onChange={(e) => setFormData((p) => ({ ...p, familyCode: e.target.value }))}
                error={errors.familyCode}
                disabled={Boolean(formData._editingId)}
              />
              <FormInput
                label="Title"
                name="title"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                error={errors.title}
              />
              <FilterSelect
                label="Category *"
                options={categoryOptions}
                value={categoryOptions.find((opt) => String(opt.value) === String(formData.category || "")) || null}
                onChange={(option) => { setFormData((p) => ({ ...p, category: option?.value || "" })); setErrors((p) => ({ ...p, category: undefined })); }}
                error={errors.category}
                placeholder="Select category"
              />
              <FilterSelect
                label="Seller (optional)"
                options={sellerOptions}
                value={sellerOptions.find((opt) => String(opt.value) === String(formData.sellerId || "")) || null}
                onChange={(option) => setFormData((p) => ({ ...p, sellerId: option?.value || "" }))}
                placeholder="Select seller"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Variant Axes</label>
                  <button type="button" className="text-xs text-[var(--admin-gold)] hover:underline" onClick={() => setFormData((p) => ({ ...p, variantAxes: [...(p.variantAxes || []), ""] }))}>+ Add Axis</button>
                </div>
                {(formData.variantAxes || []).map((axis, idx) => (
                  <div key={`axis-${idx}`} className="flex gap-2">
                    <input
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                      value={axis}
                      onChange={(e) => setFormData((p) => ({ ...p, variantAxes: (p.variantAxes || []).map((v, i) => i === idx ? e.target.value : v) }))}
                      placeholder="e.g. color, size"
                    />
                    <button type="button" className="px-2 text-red-400 hover:text-red-600 text-xs" onClick={() => setFormData((p) => ({ ...p, variantAxes: (p.variantAxes || []).filter((_, i) => i !== idx) || [""] }))}>✕</button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Base Attributes</label>
                  <button type="button" className="text-xs text-[var(--admin-gold)] hover:underline" onClick={() => setFormData((p) => ({ ...p, baseAttributes: [...(p.baseAttributes || []), emptyAttribute] }))}>+ Add Attribute</button>
                </div>
                {(formData.baseAttributes || []).map((row, idx) => (
                  <div key={`attr-${idx}`} className="grid grid-cols-2 gap-2">
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                      placeholder="key"
                      value={row.key}
                      onChange={(e) => setFormData((p) => ({ ...p, baseAttributes: (p.baseAttributes || []).map((r, i) => i === idx ? { ...r, key: e.target.value } : r) }))}
                    />
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                        placeholder="value"
                        value={row.value}
                        onChange={(e) => setFormData((p) => ({ ...p, baseAttributes: (p.baseAttributes || []).map((r, i) => i === idx ? { ...r, value: e.target.value } : r) }))}
                      />
                      <button type="button" className="px-2 text-red-400 hover:text-red-600 text-xs" onClick={() => setFormData((p) => ({ ...p, baseAttributes: (p.baseAttributes || []).filter((_, i) => i !== idx) || [emptyAttribute] }))}>✕</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <ToggleButton isToggle={formData.status === "active"} handleClick={() => setFormData((p) => ({ ...p, status: p.status === "active" ? "inactive" : "active" }))} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] transition-colors disabled:opacity-60">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleConfirm}
        title={`${toggleTarget?.status === "active" ? "Deactivate" : "Activate"} Product Family`}
        message={`${toggleTarget?.status === "active" ? "Deactivate" : "Activate"} family "${toggleTarget?.title}"?`}
        variant={toggleTarget?.status === "active" ? "warning" : "success"}
        confirmLabel={toggleTarget?.status === "active" ? "Deactivate" : "Activate"}
        loading={saving}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Product Family"
        message={`Delete family "${deleteTarget?.title || deleteTarget?.familyCode}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        loading={saving}
      />
    </div>
  );
};

export default ProductFamilies;
