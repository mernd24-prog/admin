/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdAdd, MdDelete, MdEdit, MdLayersClear, MdToggleOff, MdToggleOn } from "react-icons/md";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import { ConfirmModal, DataTable, FilterBar, PageHeader, StatusBadge } from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import {
  createProductVariant,
  deleteProductVariant,
  getProductFamilies,
  getProductVariants,
  updateProductVariant,
} from "../../../Redux/adminCoreSlice";
import { getAllProducts } from "../../../Redux/productSlice";
import { getAllSellerList } from "../../../Redux/StoreSlice";
import { transformArray } from "../../../_helpers/globalFunctions";
import { useListPage } from "../../../hooks/useListPage";
import useDropdownOptions from "../../../hooks/useDropdownOptions";

const variantIdFromRecord = (variant = {}) =>
  variant?.id || variant?._id || variant?.variantId || "";

const emptyAttribute = { key: "", value: "" };

const emptyForm = {
  variantId: "",
  familyCode: "",
  productId: "",
  sellerId: "",
  sku: "",
  stock: 0,
  reservedStock: 0,
  status: "active",
  attributes: [],
};

const FILTER_FIELDS = [
  {
    key: "status",
    type: "select",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "out_of_stock", label: "Out of Stock" },
    ],
    width: "w-44",
  },
];

const toAttributeRows = (obj = {}) => {
  const entries = Object.entries(obj || {});
  if (!entries.length) return [];
  return entries.map(([key, value]) => ({ key, value: String(value ?? "") }));
};

const toAttributeObject = (rows = []) =>
  rows.reduce((acc, row) => {
    const key = String(row.key || "").trim();
    if (!key) return acc;
    acc[key] = String(row.value || "").trim();
    return acc;
  }, {});

const VariantFormModal = ({ open, onClose, onSubmit, formData, setFormData, errors, familyOptions, productOptions, sellerOptions, statusOptions }) => {
  if (!open) return null;

  const updateField = (field, value) => setFormData((p) => ({ ...p, [field]: value }));

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-lg shadow-xl mx-4">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            {formData.variantId ? "Edit Product Variant" : "Add Product Variant"}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FilterSelect
              label="Family"
              options={familyOptions}
              value={familyOptions.find((o) => String(o.value) === String(formData.familyCode || "")) || null}
              onChange={(o) => { updateField("familyCode", o?.value || ""); }}
              error={errors.familyCode}
              placeholder="Select family"
              required
            />
            <FormInput
              label="SKU"
              name="sku"
              value={formData.sku}
              onChange={(e) => updateField("sku", e.target.value)}
              error={errors.sku}
              required
            />
            <FilterSelect
              label="Product"
              options={productOptions}
              value={productOptions.find((o) => String(o.value) === String(formData.productId || "")) || null}
              onChange={(o) => { updateField("productId", o?.value || ""); }}
              error={errors.productId}
              placeholder="Select product"
              required
            />
            <FilterSelect
              label="Seller"
              options={sellerOptions}
              value={sellerOptions.find((o) => String(o.value) === String(formData.sellerId || "")) || null}
              onChange={(o) => { updateField("sellerId", o?.value || ""); }}
              error={errors.sellerId}
              placeholder="Select seller"
              required
            />
            <FormInput
              label="Stock"
              name="stock"
              type="number"
              value={formData.stock}
              onChange={(e) => updateField("stock", Number(e.target.value || 0))}
              error={errors.stock}
              required
            />
            <FormInput
              label="Reserved Stock"
              name="reservedStock"
              type="number"
              value={formData.reservedStock}
              onChange={(e) => updateField("reservedStock", Number(e.target.value || 0))}
              error={errors.reservedStock}
            />
            <FormInput
              label="Status"
              name="status"
              type="select"
              value={formData.status}
              onChange={(e) => updateField("status", e.target.value)}
              options={statusOptions}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Attributes</label>
              <button
                type="button"
                className="text-xs text-blue-600"
                onClick={() => updateField("attributes", [...(formData.attributes || []), { ...emptyAttribute }])}
              >
                Add Attribute
              </button>
            </div>
            {!(formData.attributes || []).length && (
              <p className="text-xs text-gray-500">Optional. Add custom attribute overrides.</p>
            )}
            {(formData.attributes || []).map((row, idx) => (
              <div key={`attr-${idx}`} className="grid grid-cols-2 gap-2">
                <input
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder="key"
                  value={row.key}
                  onChange={(e) => updateField("attributes", (formData.attributes || []).map((r, i) => i === idx ? { ...r, key: e.target.value } : r))}
                />
                <div className="flex gap-2">
                  <input
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="value"
                    value={row.value}
                    onChange={(e) => updateField("attributes", (formData.attributes || []).map((r, i) => i === idx ? { ...r, value: e.target.value } : r))}
                  />
                  <button
                    type="button"
                    className="px-2 text-red-600"
                    onClick={() => updateField("attributes", (formData.attributes || []).filter((_, i) => i !== idx))}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="admin-btn-secondary">Cancel</button>
            <button type="submit" className="admin-btn-primary">
              {formData.variantId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductVariants = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);
  const productSelector = useSelector((state) => state.product);
  const storeSelector = useSelector((state) => state.store);
  const list = useListPage({ defaultPageSize: 10, defaultSortKey: "createdAt", defaultSortDir: "desc" });

  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toQueryParams } = list;

  const productStatuses = useDropdownOptions("product-statuses");

  const listPayload = selector?.productVariantsData?.data?.data || {};
  const variants = listPayload?.list || [];
  const total = listPayload?.total || 0;
  const families = selector?.productFamiliesData?.data?.data?.list || [];
  const products = productSelector?.getAllProductsData?.data?.data?.list || [];
  const sellerOptions = transformArray(storeSelector?.getAllSellerListData?.data?.data?.list || []);

  const familyOptions = useMemo(
    () => families.map((f) => ({ value: f.familyCode || f.code, label: `${f.title || f.name || f.familyCode} (${f.familyCode || f.code})` })),
    [families],
  );
  const productOptions = useMemo(
    () => products.map((p) => ({ value: p._id || p.id, label: p.title || p.name || p.slug || p._id })),
    [products],
  );
  const familyLabelMap = useMemo(
    () => Object.fromEntries(familyOptions.map((o) => [String(o.value), o.label])),
    [familyOptions],
  );
  const productLabelMap = useMemo(
    () => Object.fromEntries(productOptions.map((o) => [String(o.value), o.label])),
    [productOptions],
  );
  const sellerLabelMap = useMemo(
    () => Object.fromEntries(sellerOptions.map((o) => [String(o.value), o.label])),
    [sellerOptions],
  );

  const fetchVariants = useCallback(() => {
    const params = toQueryParams();
    dispatch(getProductVariants({
      page: params.page,
      limit: params.limit || 10,
      q: params.search || undefined,
      status: params.status || undefined,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
    }));
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchVariants(); }, [fetchVariants]);

  useEffect(() => {
    dispatch(getProductFamilies({ page: 1, limit: 100 }));
    dispatch(getAllProducts({ page: 1, limit: 100 }));
    dispatch(getAllSellerList());
  }, [dispatch]);

  const validateForm = () => {
    const nextErrors = {};
    ["familyCode", "productId", "sellerId", "sku"].forEach((field) => {
      if (!String(formData[field] || "").trim()) nextErrors[field] = "Required";
    });
    if (Number(formData.stock) < 0) nextErrors.stock = "Stock cannot be negative";
    if (Number(formData.reservedStock) < 0) nextErrors.reservedStock = "Reserved stock cannot be negative";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeModal = () => { setIsModalOpen(false); setFormData(emptyForm); setErrors({}); };

  const toPayload = () => ({
    familyCode: String(formData.familyCode || "").trim(),
    productId: String(formData.productId || "").trim(),
    sellerId: String(formData.sellerId || "").trim(),
    sku: String(formData.sku || "").trim(),
    stock: Number(formData.stock || 0),
    reservedStock: Number(formData.reservedStock || 0),
    status: formData.status || "active",
    attributes: toAttributeObject(formData.attributes || []),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (formData.variantId) {
        await dispatch(updateProductVariant({ ...toPayload(), variantId: formData.variantId })).unwrap();
        toast.success("Product variant updated successfully");
      } else {
        await dispatch(createProductVariant(toPayload())).unwrap();
        toast.success("Product variant created successfully");
      }
      closeModal();
      fetchVariants();
    } catch (error) {
      toast.error(error?.message || "Failed to save product variant");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (variant) => {
    setFormData({
      variantId: variantIdFromRecord(variant),
      familyCode: variant.familyCode || "",
      productId: variant.productId || "",
      sellerId: variant.sellerId || "",
      sku: variant.sku || "",
      stock: variant.stock ?? 0,
      reservedStock: variant.reservedStock ?? 0,
      status: variant.status || "active",
      attributes: toAttributeRows(variant.attributes || {}),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    const variantId = variantIdFromRecord(deleteTarget);
    if (!variantId) return;
    setSaving(true);
    try {
      await dispatch(deleteProductVariant({ variantId })).unwrap();
      toast.success("Product variant deleted successfully");
      setDeleteTarget(null);
      fetchVariants();
    } catch (error) {
      toast.error(error?.message || "Failed to delete product variant");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    const variantId = variantIdFromRecord(toggleTarget);
    if (!variantId) return;
    setSaving(true);
    try {
      await dispatch(
        updateProductVariant({ variantId, status: toggleTarget.status === "active" ? "inactive" : "active" }),
      ).unwrap();
      toast.success("Status updated successfully");
      setToggleTarget(null);
      fetchVariants();
    } catch (error) {
      toast.error(error?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "sku",
      label: "SKU",
      sortable: true,
      render: (v) => <span className="font-mono text-sm">{v}</span>,
    },
    {
      key: "familyCode",
      label: "Family",
      sortable: true,
      render: (v) => <span>{familyLabelMap[String(v || "")] || v || "—"}</span>,
    },
    {
      key: "productId",
      label: "Product",
      render: (v, row) => <span>{productLabelMap[String(v || "")] || row?.productTitle || v || "—"}</span>,
    },
    {
      key: "sellerId",
      label: "Seller",
      render: (v, row) => <span>{sellerLabelMap[String(v || "")] || row?.sellerName || v || "—"}</span>,
    },
    { key: "stock", label: "Stock", sortable: true, render: (v) => <span className="font-mono text-sm">{v ?? 0}</span> },
    { key: "reservedStock", label: "Reserved", sortable: true, render: (v) => <span className="font-mono text-sm">{v ?? 0}</span> },
    {
      key: "attributes",
      label: "Attributes",
      render: (v) => <span className="font-mono text-sm">{Object.keys(v || {}).length || 0}</span>,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (v) => <StatusBadge status={v === "active" ? "active" : "inactive"} dot />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <PermissionGuard module="products" action={ACTIONS.UPDATE} hide>
            <button type="button" onClick={() => openEdit(row)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" title="Edit variant">
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
              title={row.status === "active" ? "Disable variant" : "Enable variant"}
            >
              {row.status === "active" ? <MdToggleOff size={18} /> : <MdToggleOn size={18} />}
            </button>
          </PermissionGuard>
          <PermissionGuard module="products" action={ACTIONS.DELETE} hide>
            <button type="button" onClick={() => setDeleteTarget(row)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50" title="Delete variant">
              <MdDelete size={16} />
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Product Variants"
        subtitle="Manage SKU-level product variants with inventory and attribute overrides"
        breadcrumbs={[{ label: "Product Management" }, { label: "Product Variants" }]}
        actions={
          <PermissionGuard module="products" action={ACTIONS.CREATE} hide>
            <button onClick={() => setIsModalOpen(true)} className="admin-btn-primary">
              <MdAdd size={16} /> Add Variant
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={columns}
        data={variants}
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
        searchPlaceholder="Search by SKU..."
        emptyText="No product variants found."
        emptyIcon={<MdLayersClear size={40} className="text-gray-200" />}
        requiredModule="products"
        exportConfig={{ filename: "product-variants", columns: columns.filter((column) => column.key !== "actions") }}
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

      <VariantFormModal
        open={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        familyOptions={familyOptions}
        productOptions={productOptions}
        sellerOptions={sellerOptions}
        statusOptions={productStatuses.options}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        variant="danger"
        title="Delete Product Variant?"
        message={`Delete variant "${deleteTarget?.sku || ""}"?`}
        confirmLabel="Delete"
        loading={saving}
      />
      <ConfirmModal
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        title={`${toggleTarget?.status === "active" ? "Disable" : "Enable"} Variant?`}
        message={`${toggleTarget?.status === "active" ? "Disable" : "Enable"} variant "${toggleTarget?.sku || ""}"?`}
        confirmLabel={toggleTarget?.status === "active" ? "Disable" : "Enable"}
        variant={toggleTarget?.status === "active" ? "warning" : "success"}
        loading={saving}
      />
    </div>
  );
};

export default ProductVariants;
