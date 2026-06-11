/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
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
import ImageUpload from "../../../components/Atoms/ImageGallery/ImageUpload";
import { uploadFile } from "../../../_helpers/globalFunctions";
import { useListPage } from "../../../hooks/useListPage";
import {
  createBrand,
  getBrandList,
  updateBrand,
  deleteBrand,
  enableDisableBrand,
} from "../../../Redux/productSlice";
import { MdAdd, MdBrandingWatermark, MdDelete, MdEdit, MdToggleOff, MdToggleOn } from "react-icons/md";

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
    key: "logo",
    label: "Logo",
    render: (v, row) =>
      v ? (
        <img
          src={v}
          alt={row.name}
          className="h-10 w-10 rounded-lg object-contain border border-gray-100 bg-gray-50"
        />
      ) : (
        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
          No logo
        </div>
      ),
  },
  {
    key: "name",
    label: "Brand Name",
    sortable: true,
    render: (v) => <span className="font-medium text-gray-800">{v}</span>,
  },
  {
    key: "thumbnails",
    label: "Thumbnail",
    render: (v, row) =>
      v ? (
        <img
          src={v}
          alt={`${row.name} thumbnail`}
          className="h-10 w-16 rounded-md object-cover border border-gray-100 bg-gray-50"
        />
      ) : (
        <span className="text-xs text-gray-400">—</span>
      ),
  },
  {
    key: "isDisable",
    label: "Status",
    render: (v) => <StatusBadge status={v ? "inactive" : "active"} dot />,
  },
];

const EMPTY_FORM = {
  name: "",
  logo: "",
  thumbnails: "",
  isDisable: false,
};

const Brands = () => {
  const dispatch = useDispatch();
  const list = useListPage({
    defaultPageSize: 10,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });

  const [brands, setBrands] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRefresh, setIsRefresh] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleOpen, setToggleOpen] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = list.toQueryParams();
      const res = await dispatch(
        getBrandList({
          page: params.page,
          size: params.limit || 10,
          keyWord: params.search || "",
          searchFields: "name",
          select: "name isDisable createdAt logo thumbnails",
          sortBy: list.sortKey || "createdAt",
          sortOrder: list.sortDir || "desc",
          ...(params.isDisable !== undefined && { isDisable: params.isDisable }),
        })
      ).unwrap();
      const data = res?.data || {};
      setBrands(data?.list || []);
      setTotal(data?.total || 0);
    } catch (err) {
      toast.error(err?.message || "Failed to fetch brands");
    } finally {
      setLoading(false);
    }
  }, [dispatch, list.page, list.pageSize, list.search, list.filters, list.sortKey, list.sortDir, isRefresh]);

  useEffect(() => {
    fetchList();
  }, [list.page, list.pageSize, list.search, list.filters, list.sortKey, list.sortDir, isRefresh]);

  const validateForm = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = "Brand name is required";
    else if (formData.name.trim().length < 2) errs.name = "Min 2 characters";
    if (!formData.logo) errs.logo = "Logo is required";
    if (!formData.thumbnails) errs.thumbnails = "Thumbnail is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const closeModal = () => { setModalMode(null); setFormData(EMPTY_FORM); setErrors({}); };

  const handleFileUpload = async (file, type) => {
    const allowed = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
    const ext = file.name?.split(".").pop()?.toLowerCase();
    if (!allowed.includes(file.type) && !["png", "jpg", "jpeg", "webp"].includes(ext)) {
      toast.error("Only JPG/PNG/WEBP images allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max file size is 5MB"); return; }
    setImageLoading(true);
    try {
      const url = await uploadFile(file, type);
      setFormData((prev) => ({
        ...prev,
        ...(type === "BRANDS" ? { logo: url } : { thumbnails: url }),
      }));
      if (errors[type === "BRANDS" ? "logo" : "thumbnails"])
        setErrors((prev) => ({ ...prev, [type === "BRANDS" ? "logo" : "thumbnails"]: undefined }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error("Image upload failed");
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    const payload = {
      name: formData.name.trim(),
      logo: formData.logo,
      thumbnails: formData.thumbnails,
      isDisable: formData.isDisable,
    };
    try {
      let res;
      if (modalMode === "edit") {
        res = await dispatch(updateBrand({ ...payload, _id: formData._id })).unwrap();
      } else {
        res = await dispatch(createBrand(payload)).unwrap();
      }
      toast.success(res?.message || `Brand ${modalMode === "edit" ? "updated" : "created"}`);
      closeModal();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally { setSaving(false); }
  };

  const handleToggleStatus = useCallback(async (row) => {
    try {
      await dispatch(enableDisableBrand({ _id: [row._id], isDisable: !row.isDisable })).unwrap();
      toast.success("Brand status updated");
      setToggleOpen(false);
      setToggleTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Failed to update status");
    }
  }, [dispatch]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteBrand({ _id: [deleteTarget._id] })).unwrap();
      toast.success("Brand deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Delete failed");
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
            <PermissionGuard module="brands" action={ACTIONS.UPDATE} hide>
              <button
                type="button"
                className="admin-icon-btn"
                title="Edit brand"
                onClick={() => {
                  setFormData({ _id: row._id, name: row.name || "", logo: row.logo || "", thumbnails: row.thumbnails || "", isDisable: row.isDisable || false });
                  setModalMode("edit");
                }}
              >
                <MdEdit size={18} />
              </button>
            </PermissionGuard>
            <PermissionGuard module="brands" action={ACTIONS.STATUS_CHANGE} hide>
              <button
                type="button"
                className={row.isDisable ? "admin-icon-btn text-green-600" : "admin-icon-btn text-yellow-600"}
                title={row.isDisable ? "Enable brand" : "Disable brand"}
                onClick={() => { setToggleTarget(row); setToggleOpen(true); }}
              >
                {row.isDisable ? <MdToggleOn size={20} /> : <MdToggleOff size={20} />}
              </button>
            </PermissionGuard>
            <PermissionGuard module="brands" action={ACTIONS.DELETE} hide>
              <button
                type="button"
                className="admin-icon-btn text-red-600"
                title="Delete brand"
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
        title="Brands"
        subtitle="Manage product brands and their logos"
        breadcrumbs={[{ label: "Catalog" }, { label: "Brands" }]}
        actions={
          <div className="flex items-center gap-2">
            <PermissionGuard module="brands" action={ACTIONS.CREATE} hide>
              <button
                onClick={() => setModalMode("add")}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors"
              >
                <MdAdd size={16} /> Add Brand
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={brands}
        loading={loading}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder="Search brands…"
        emptyText="No brands found."
        emptyIcon={<MdBrandingWatermark size={40} className="text-gray-200" />}
        requiredModule="brands"
        exportConfig={{ filename: "brands", columns: BASE_COLUMNS }}
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

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-5">
              {modalMode === "add" ? "Add Brand" : "Edit Brand"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, name: e.target.value }));
                    if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  placeholder="e.g. Apple, Samsung"
                  maxLength={50}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Logo <span className="text-red-500">*</span>
                </label>
                {formData.logo && (
                  <div className="mb-2 flex items-center gap-3">
                    <img src={formData.logo} alt="Logo preview" className="h-14 w-14 rounded-lg object-contain border border-gray-200 bg-gray-50" />
                    <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => setFormData((p) => ({ ...p, logo: "" }))}>Remove</button>
                  </div>
                )}
                <ImageUpload
                  id="brand-logo"
                  label="Upload Logo (PNG/WEBP recommended)"
                  onChange={(file) => handleFileUpload(file, "BRANDS")}
                  isDisabled={imageLoading}
                />
                {errors.logo && <p className="text-red-500 text-xs mt-1">{errors.logo}</p>}
              </div>

              {/* Thumbnail Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thumbnail <span className="text-red-500">*</span>
                </label>
                {formData.thumbnails && (
                  <div className="mb-2 flex items-center gap-3">
                    <img src={formData.thumbnails} alt="Thumb preview" className="h-14 w-20 rounded-lg object-cover border border-gray-200 bg-gray-50" />
                    <button type="button" className="text-xs text-red-500 hover:underline" onClick={() => setFormData((p) => ({ ...p, thumbnails: "" }))}>Remove</button>
                  </div>
                )}
                <ImageUpload
                  id="brand-thumbnail"
                  label="Upload Thumbnail"
                  onChange={(file) => handleFileUpload(file, "BRAND_THUMBNAIL")}
                  isDisabled={imageLoading}
                />
                {errors.thumbnails && <p className="text-red-500 text-xs mt-1">{errors.thumbnails}</p>}
              </div>

              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <ToggleButton
                  isToggle={!formData.isDisable}
                  handleClick={() => setFormData((p) => ({ ...p, isDisable: !p.isDisable }))}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving || imageLoading} className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] disabled:opacity-60 transition-colors">
                  {saving ? "Saving…" : modalMode === "add" ? "Create Brand" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Brand"
        message={`Delete brand "${deleteTarget?.name}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
      />

      <ConfirmModal
        open={toggleOpen}
        onClose={() => { setToggleOpen(false); setToggleTarget(null); }}
        onConfirm={() => handleToggleStatus(toggleTarget)}
        title={`${toggleTarget?.isDisable ? "Enable" : "Disable"} Brand`}
        message={`${toggleTarget?.isDisable ? "Enable" : "Disable"} "${toggleTarget?.name}"?`}
        variant={toggleTarget?.isDisable ? "success" : "warning"}
        confirmLabel={toggleTarget?.isDisable ? "Enable" : "Disable"}
      />
    </div>
  );
};

export default Brands;
