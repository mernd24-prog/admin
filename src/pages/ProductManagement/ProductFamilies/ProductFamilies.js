/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  MdFamilyRestroom,
  MdAdd,
  MdDelete,
  MdEdit,
  MdClose,
} from "react-icons/md";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import {
  PageHeader,
  DataTable,
  ConfirmModal,
  ExportButton,
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
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";

const idFromRecord = (item = {}) =>
  item?.familyCode || item?.code || item?.id || "";
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

const ProductFamilies = () => {
  const dispatch = useDispatch();
  const list = useListPage({
    defaultPageSize: 10,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });

  const selector = useSelector((state) => state.adminCore);
  const productSelector = useSelector((state) => state.product);
  const storeSelector = useSelector((state) => state.store);

  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    activationStatus: { value: "All", label: "All" },
  });
  const { toQueryParams } = list;

  const payload = selector?.productFamiliesData?.data?.data || {};
  const families = payload?.list || [];
  const total = payload?.total || 0;

  const categoryList = productSelector?.getListData?.data?.data?.list || [];
  const sellerOptions = transformArray(
    storeSelector?.getAllSellerListData?.data?.data?.list || [],
  );

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
    dispatch(
      getProductFamilies({
        page: params.page,
        limit: params.limit || 10,
        q: params.search || undefined,
        status: params.status || undefined,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      }),
    );
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    setSelectedKeys([]);
    load();
  }, [load]);

  useEffect(() => {
    dispatch(getList({ limit: 100 }));
    dispatch(getAllSellerList());
  }, []);

  // Automatic search & filter handling when search input or status filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const searchVal = filters.search || "";
      const statusVal =
        filters.activationStatus?.value === "All"
          ? ""
          : filters.activationStatus?.value || "";

      list.setSearch(searchVal);
      list.setFilter("status", statusVal);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search, filters.activationStatus?.value]);

  const handleSearchClear = () => {
    setFilters({
      search: "",
      activationStatus: { value: "All", label: "All" },
    });
    list.clearFilters();
    list.setSearch("");
    list.setPage(1);
  };

  const handleBulkAction = async (action, rows) => {
    const targetKeys = rows && rows.length ? rows : selectedKeys;
    if (!targetKeys.length) return;
    if (action === "Active" || action === "Inactive") {
      const nextStatus = action === "Active" ? "active" : "inactive";
      setSaving(true);
      try {
        await Promise.all(
          targetKeys.map((familyCode) =>
            dispatch(
              updateProductFamily({
                familyCode,
                status: nextStatus,
              }),
            ).unwrap(),
          ),
        );
        toast.success(
          `Selected product families ${nextStatus === "active" ? "activated" : "deactivated"} successfully`,
        );
        setSelectedKeys([]);
        load();
      } catch (err) {
        toast.error(err?.message || "Failed to update product families status");
      } finally {
        setSaving(false);
      }
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!String(formData.familyCode || "").trim())
      nextErrors.familyCode = "Required";
    if (formData.familyCode && !/^[A-Za-z0-9_-]+$/.test(formData.familyCode)) {
      nextErrors.familyCode = "Use letters, numbers, underscores, or hyphens";
    }
    if (!String(formData.title || "").trim()) nextErrors.title = "Required";
    if (!String(formData.category || "").trim())
      nextErrors.category = "Required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm);
    setErrors({});
  };

  const toPayload = () => ({
    familyCode: String(formData.familyCode || "").trim(),
    title: String(formData.title || "").trim(),
    category: String(formData.category || "").trim(),
    sellerId: String(formData.sellerId || "").trim() || undefined,
    status: formData.status || "active",
    variantAxes: (formData.variantAxes || [])
      .map((v) => String(v || "").trim())
      .filter(Boolean),
    baseAttributes: toAttributeObject(formData.baseAttributes || []),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (formData._editingId) {
        await dispatch(
          updateProductFamily({
            ...toPayload(),
            familyCode: formData._editingId,
          }),
        ).unwrap();
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
      await dispatch(
        updateProductFamily({
          familyCode,
          status: toggleTarget.status === "active" ? "inactive" : "active",
        }),
      ).unwrap();
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
      variantAxes:
        Array.isArray(row.variantAxes) && row.variantAxes.length
          ? row.variantAxes
          : [""],
      baseAttributes: toAttributeRows(row.baseAttributes || {}),
    });
    setIsModalOpen(true);
  };

  const columns = useMemo(
    () => [
      {
        key: "familyCode",
        label: "Family Code",
        sortable: true,
        render: (v, row) => (
          <span className="font-mono text-xs">{v || row.code}</span>
        ),
      },
      {
        key: "title",
        label: "Title",
        sortable: true,
        render: (v, row) => (
          <span className="font-medium text-gray-800">{v || row.name}</span>
        ),
      },
      {
        key: "category",
        label: "Category",
        render: (v) => (
          <span className="text-sm text-gray-600">{v || "—"}</span>
        ),
      },
      {
        key: "sellerId",
        label: "Seller",
        render: (v, row) => (
          <span className="text-sm text-gray-600">
            {row.sellerName || v || "—"}
          </span>
        ),
      },
      {
        key: "variantAxes",
        label: "Variant Axes",
        render: (v) => (
          <span className="text-sm text-gray-500">
            {Array.isArray(v) && v.length ? v.join(", ") : "—"}
          </span>
        ),
      },
      {
        key: "active",
        label: "Active",
        render: (_, row) => (
          <ToggleButton
            isToggle={row.status === "active"}
            handleClick={() => setToggleTarget(row)}
            requiredModule="products"
          />
        ),
      },
    ],
    [],
  );

  const exportData = useMemo(() => {
    if (selectedKeys.length > 0) {
      return families.filter((f) => selectedKeys.includes(idFromRecord(f)));
    }
    return families;
  }, [families, selectedKeys]);

  return (
    <div>
      <PageHeader
        title="Product Families"
        subtitle="Define product families with shared variant axes and base attributes"
        breadcrumbs={[
          { label: "Product Management" },
          { label: "Product Families" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <ExportButton
              data={exportData}
              filename="product-families"
              columns={columns}
              requiredModule="products"
            />
            <PermissionGuard module="products" action={ACTIONS.CREATE} hide>
              <button onClick={() => setIsModalOpen(true)}>
                <MdAdd size={16} /> Add Family
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl border border-[var(--admin-line)] bg-white shadow-sm">
        <section className="border-b border-[var(--admin-line)]">
          <SearchComponent
            selectedRow={selectedKeys}
            setSelectedRow={setSelectedKeys}
            filters={filters}
            setFilters={setFilters}
            isSearchShow={true}
            isActivationStatus={true}
            activationStatusOptions={[
              { value: "All", label: "All" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            applyFilters={() => {}}
            handleSearchRemove={handleSearchClear}
            isActionButton={true}
            isStatusAction={true}
            handleAction={handleBulkAction}
            requiredModule="products"
            isSearchDown={false}
            defaultSearchOpen={true}
            compactFilterBar={true}
            hideFilterActions={true}
            largeSearchInput={true}
          />
        </section>
        <section>
          <DataTable
            columns={columns}
            data={families}
            loading={selector.loading}
            totalCount={total}
            page={list.page}
            pageSize={list.pageSize}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
            onSort={list.setSort}
            sortKey={list.sortKey}
            sortDir={list.sortDir}
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            rowKey={(row) => idFromRecord(row)}
            emptyText="No product families found."
            emptyIcon={<MdFamilyRestroom size={40} className="text-gray-200" />}
            requiredModule="products"
            cardClassName="overflow-hidden rounded-none border-0 shadow-none"
            rowActions={(row) => [
              {
                label: "Edit Family",
                icon: <MdEdit size={16} className="text-emerald-600" />,
                requiredModule: "products",
                requiredAction: ACTIONS.UPDATE,
                onClick: () => openEdit(row),
              },
              {
                label: "Delete Family",
                icon: <MdDelete size={16} className="text-red-600" />,
                danger: true,
                requiredModule: "products",
                requiredAction: ACTIONS.DELETE,
                onClick: () => setDeleteTarget(row),
              },
            ]}
          />
        </section>
      </div>

      <DefaultModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        title={
          formData._editingId ? "Edit Product Family" : "Add Product Family"
        }
        submitButtonText="Save"
        closeButtonText="Cancel"
        isButtonView={true}
        loading={saving}
        width="600px"
      >
        <div className="space-y-5">
          {/* ==================== Basic Information ==================== */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#1E293B]">
                Basic Information
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Enter the basic details for this product family.
              </p>
            </div>

            <div className="space-y-4">
              {/* Family Code */}
              <FormInput
                label="Family Code"
                name="familyCode"
                value={formData.familyCode}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    familyCode: e.target.value,
                  }))
                }
                error={errors.familyCode}
                disabled={Boolean(formData._editingId)}
              />

              {/* Title */}
              <FormInput
                label="Title"
                name="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    title: e.target.value,
                  }))
                }
                error={errors.title}
              />

              {/* Category */}
              <FilterSelect
                label="Category *"
                options={categoryOptions}
                value={
                  categoryOptions.find(
                    (opt) =>
                      String(opt.value) === String(formData.category || ""),
                  ) || null
                }
                onChange={(option) => {
                  setFormData((p) => ({
                    ...p,
                    category: option?.value || "",
                  }));

                  setErrors((p) => ({
                    ...p,
                    category: undefined,
                  }));
                }}
                error={errors.category}
                placeholder="Select category"
              />

              {/* Seller */}
              <FilterSelect
                label="Seller (optional)"
                options={sellerOptions}
                value={
                  sellerOptions.find(
                    (opt) =>
                      String(opt.value) === String(formData.sellerId || ""),
                  ) || null
                }
                onChange={(option) =>
                  setFormData((p) => ({
                    ...p,
                    sellerId: option?.value || "",
                  }))
                }
                placeholder="Select seller"
              />
            </div>
          </div>

          {/* ==================== Variant Axes ==================== */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#1E293B]">
                  Variant Axes
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Define the options used to create product variants.
                </p>
              </div>

              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-[var(--admin-gold)] transition hover:bg-[#CB9C2D]/10"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    variantAxes: [...(p.variantAxes || []), ""],
                  }))
                }
              >
                + Add Axis
              </button>
            </div>

            <div className="space-y-2.5">
              {(formData.variantAxes || []).map((axis, idx) => (
                <div key={`axis-${idx}`} className="relative flex items-center">
                  <input
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-3 pr-9 text-sm text-gray-800 outline-none transition focus:border-[var(--admin-gold)] focus:ring-2 focus:ring-[var(--admin-gold)]/20"
                    value={axis}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        variantAxes: (p.variantAxes || []).map((v, i) =>
                          i === idx ? e.target.value : v,
                        ),
                      }))
                    }
                    placeholder="e.g. Color, Size"
                  />

                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                    onClick={() =>
                      setFormData((p) => ({
                        ...p,
                        variantAxes: (p.variantAxes || []).filter(
                          (_, i) => i !== idx,
                        ) || [""],
                      }))
                    }
                    title="Remove axis"
                  >
                    <MdClose size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ==================== Base Attributes ==================== */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#1E293B]">
                  Base Attributes
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Add default attributes for products in this family.
                </p>
              </div>

              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-[var(--admin-gold)] transition hover:bg-[#CB9C2D]/10"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    baseAttributes: [
                      ...(p.baseAttributes || []),
                      emptyAttribute,
                    ],
                  }))
                }
              >
                + Add Attribute
              </button>
            </div>

            <div className="space-y-2.5">
              {(formData.baseAttributes || []).map((row, idx) => (
                <div
                  key={`attr-${idx}`}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  {/* Key */}
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[var(--admin-gold)] focus:ring-2 focus:ring-[var(--admin-gold)]/20"
                    placeholder="Attribute key"
                    value={row.key}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        baseAttributes: (p.baseAttributes || []).map((r, i) =>
                          i === idx
                            ? {
                                ...r,
                                key: e.target.value,
                              }
                            : r,
                        ),
                      }))
                    }
                  />

                  {/* Value + Remove */}
                  <div className="relative flex items-center">
                    <input
                      className="w-full rounded-lg border border-gray-300 py-2.5 pl-3 pr-9 text-sm text-gray-800 outline-none transition focus:border-[var(--admin-gold)] focus:ring-2 focus:ring-[var(--admin-gold)]/20"
                      placeholder="Attribute value"
                      value={row.value}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          baseAttributes: (p.baseAttributes || []).map(
                            (r, i) =>
                              i === idx
                                ? {
                                    ...r,
                                    value: e.target.value,
                                  }
                                : r,
                          ),
                        }))
                      }
                    />

                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                      onClick={() =>
                        setFormData((p) => ({
                          ...p,
                          baseAttributes: (p.baseAttributes || []).filter(
                            (_, i) => i !== idx,
                          ) || [emptyAttribute],
                        }))
                      }
                      title="Remove attribute"
                    >
                      <MdClose size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ==================== Status ==================== */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="pr-4">
                <h3 className="text-sm font-semibold text-[#1E293B]">
                  Family Status
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  Enable or disable this product family.
                </p>
              </div>

              <ToggleButton
                isToggle={formData.status === "active"}
                handleClick={() =>
                  setFormData((p) => ({
                    ...p,
                    status: p.status === "active" ? "inactive" : "active",
                  }))
                }
              />
            </div>
          </div>
        </div>
      </DefaultModal>

      <ConfirmModal
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggleConfirm}
        title={`${toggleTarget?.status === "active" ? "Deactivate" : "Activate"} Product Family`}
        message={`${toggleTarget?.status === "active" ? "Deactivate" : "Activate"} family "${toggleTarget?.title}"?`}
        variant={toggleTarget?.status === "active" ? "warning" : "success"}
        confirmLabel={
          toggleTarget?.status === "active" ? "Deactivate" : "Activate"
        }
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
