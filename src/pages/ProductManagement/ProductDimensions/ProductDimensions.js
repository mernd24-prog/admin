/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdStraighten, MdAdd, MdDelete, MdEdit, MdToggleOff, MdToggleOn } from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  ConfirmModal,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { useListPage } from "../../../hooks/useListPage";
import {
  createDimension,
  enableDisableDimension,
  getListDimension,
  softDeleteDimension,
  updateDimension,
} from "../../../Redux/productSlice";

const FILTER_FIELDS = [
  {
    key: "isDisable",
    type: "select",
    label: "Status",
    width: "w-36",
    options: [
      { value: "false", label: "Active" },
      { value: "true", label: "Disabled" },
    ],
  },
];

const BASE_COLUMNS = [
  {
    key: "dimensions_value",
    label: "Dimension Value",
    sortable: true,
    render: (v) => <span className="font-medium text-gray-800 capitalize">{v || "—"}</span>,
  },
  {
    key: "isDisable",
    label: "Status",
    render: (v) => <StatusBadge status={v ? "inactive" : "active"} dot />,
  },
];

const EMPTY_FORM = { _id: "", dimensions_value: "", isDisable: false };

const ProductDimensions = () => {
  const dispatch = useDispatch();
  const list = useListPage({ defaultPageSize: 10, defaultSortKey: "createdAt", defaultSortDir: "desc" });

  const [isRefresh, setIsRefresh] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selector = useSelector((state) => state.product);
  const listData = selector?.getListDimensionData?.data?.data || {};
  const dimensionList = listData?.list || [];
  const total = Number(listData?.total || 0);

  useEffect(() => {
    const params = list.toQueryParams();
    dispatch(
      getListDimension({
        page: params.page,
        size: params.limit || 10,
        keyWord: params.search || "",
        searchFields: "dimensions_value",
        select: "dimensions_value isDisable",
        sortBy: params.sortBy,
        sortDir: params.sortDir,
        ...(params.isDisable !== undefined && { isDisable: params.isDisable }),
      })
    );
  }, [list.page, list.pageSize, list.search, list.filters, list.sortKey, list.sortDir, isRefresh]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const errs = {};
    const val = formData.dimensions_value?.trim();
    if (!val) errs.dimensions_value = "Dimension value is required";
    else if (val.length < 2) errs.dimensions_value = "Min 2 characters";
    else if (val.length > 50) errs.dimensions_value = "Max 50 characters";
    else if (!/^[a-zA-Z0-9\s-]+$/.test(val)) errs.dimensions_value = "No special characters allowed";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const closeModal = () => { setModalMode(null); setFormData(EMPTY_FORM); setErrors({}); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = { dimensions_value: formData.dimensions_value.trim(), isDisable: formData.isDisable };
    try {
      let res;
      if (modalMode === "edit") {
        res = await dispatch(updateDimension({ ...payload, _id: formData._id })).unwrap();
      } else {
        res = await dispatch(createDimension(payload)).unwrap();
      }
      if (res?.error) { toast.error(res.error); return; }
      toast.success(res?.message || `Dimension ${modalMode === "edit" ? "updated" : "created"}`);
      closeModal();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally { setSaving(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await dispatch(softDeleteDimension({ _id: [deleteTarget._id] })).unwrap();
      toast.success(res?.message || "Dimension deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    }
  };

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return;
    try {
      const res = await dispatch(enableDisableDimension({ _id: [toggleTarget._id], isDisable: !toggleTarget.isDisable })).unwrap();
      toast.success(res?.message || "Status updated");
      setConfirmOpen(false);
      setToggleTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Status update failed");
    }
  };

  const columns = useMemo(
    () => [
      ...BASE_COLUMNS,
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <PermissionGuard module="products" action={ACTIONS.UPDATE} hide>
              <button
                type="button"
                className="admin-icon-btn"
                title="Edit dimension"
                onClick={() => {
                  setFormData({ _id: row._id, dimensions_value: row.dimensions_value || "", isDisable: row.isDisable || false });
                  setModalMode("edit");
                }}
              >
                <MdEdit size={18} />
              </button>
            </PermissionGuard>
            <PermissionGuard module="products" action={ACTIONS.STATUS_CHANGE} hide>
              <button
                type="button"
                className={row.isDisable ? "admin-icon-btn text-green-600" : "admin-icon-btn text-yellow-600"}
                title={row.isDisable ? "Enable dimension" : "Disable dimension"}
                onClick={() => { setToggleTarget(row); setConfirmOpen(true); }}
              >
                {row.isDisable ? <MdToggleOn size={20} /> : <MdToggleOff size={20} />}
              </button>
            </PermissionGuard>
            <PermissionGuard module="products" action={ACTIONS.DELETE} hide>
              <button
                type="button"
                className="admin-icon-btn text-red-600"
                title="Delete dimension"
                onClick={() => { setDeleteTarget(row); setDeleteOpen(true); }}
              >
                <MdDelete size={18} />
              </button>
            </PermissionGuard>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Product Dimensions"
        subtitle="Manage dimension values for products"
        breadcrumbs={[{ label: "Product Management" }, { label: "Dimensions" }]}
        actions={
          <PermissionGuard module="products" action={ACTIONS.CREATE} hide>
            <button
              onClick={() => setModalMode("add")}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors"
            >
              <MdAdd size={16} /> Add Dimension
            </button>
          </PermissionGuard>
        }
      />

      <DataTable
        columns={columns}
        data={dimensionList}
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
        searchPlaceholder="Search dimensions…"
        emptyText="No dimensions found."
        emptyIcon={<MdStraighten size={40} className="text-gray-200" />}
        requiredModule="products"
        exportConfig={{ filename: "product-dimensions", columns: BASE_COLUMNS }}
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

      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5">
              {modalMode === "add" ? "Add Dimension" : "Edit Dimension"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dimension Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="dimensions_value"
                  value={formData.dimensions_value}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  placeholder="e.g. 10x20cm, Small, XL"
                  maxLength={50}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/^\s+/, "").replace(/[^a-zA-Z0-9\s-]/g, "");
                  }}
                />
                {errors.dimensions_value && <p className="text-red-500 text-xs mt-1">{errors.dimensions_value}</p>}
              </div>

              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <ToggleButton isToggle={!formData.isDisable} handleClick={() => setFormData((p) => ({ ...p, isDisable: !p.isDisable }))} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] disabled:opacity-60 transition-colors">
                  {saving ? "Saving…" : modalMode === "add" ? "Create" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setToggleTarget(null); }}
        onConfirm={handleToggleConfirm}
        title={`${toggleTarget?.isDisable ? "Enable" : "Disable"} Dimension`}
        message={`${toggleTarget?.isDisable ? "Enable" : "Disable"} "${toggleTarget?.dimensions_value}"?`}
        variant={toggleTarget?.isDisable ? "success" : "warning"}
        confirmLabel={toggleTarget?.isDisable ? "Enable" : "Disable"}
      />

      <ConfirmModal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Dimension"
        message={`Delete dimension "${deleteTarget?.dimensions_value}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
      />
    </div>
  );
};

export default ProductDimensions;
