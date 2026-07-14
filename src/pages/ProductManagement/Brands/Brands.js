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
  reviewBrandSubmission,
} from "../../../Redux/productSlice";
import {
  MdAdd,
  MdBlock,
  MdBrandingWatermark,
  MdCheckCircle,
  MdDelete,
  MdEdit,
  MdImage,
  MdClose,
} from "react-icons/md";

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
  {
    key: "approvalStatus",
    type: "select",
    label: "Approval",
    width: "w-36",
    options: [
      { value: "approved", label: "Approved" },
      { value: "pending", label: "Pending" },
      { value: "rejected", label: "Rejected" },
    ],
  },
];

const getBrandInitial = (name = "") => {
  const firstLetter = String(name)
    .trim()
    .match(/[a-z0-9]/i)?.[0];
  return (firstLetter || "B").toUpperCase();
};

const BrandAssetCell = ({ src, name, type = "logo" }) => {
  const [imageError, setImageError] = useState(false);
  const frameClass = "h-10 w-10 rounded-full";
  const initialClass = "text-xs";

  useEffect(() => {
    setImageError(false);
  }, [src]);

  if (src && !imageError) {
    return (
      <div
        className={`${frameClass} overflow-hidden border border-[var(--admin-line)] bg-white shadow-sm ring-2 ring-white`}
      >
        <img
          src={src}
          alt={
            type === "thumbnail"
              ? `${name || "Brand"} thumbnail`
              : `${name || "Brand"} logo`
          }
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${frameClass} relative flex items-center justify-center overflow-hidden border border-[var(--admin-line)] bg-[var(--admin-field)] shadow-sm ring-2 ring-white`}
      title={name || "Brand"}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#fffaf1_0%,#ffffff_50%,#fff3d2_100%)]" />
      <MdImage
        size={18}
        className="absolute text-[var(--admin-line-strong)] opacity-50"
      />
      <span
        className={`${initialClass} relative flex h-full w-full items-center justify-center rounded-full bg-[rgba(214,163,35,0.82)] font-bold leading-none text-[var(--admin-navy)]`}
      >
        {getBrandInitial(name)}
      </span>
    </div>
  );
};

const BASE_COLUMNS = [
  {
    key: "logo",
    label: "Logo",
    width: "20",
    render: (v, row) => <BrandAssetCell src={v} name={row.name} />,
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
    width: "28",
    render: (v, row) => (
      <BrandAssetCell src={v} name={row.name} type="thumbnail" />
    ),
  },
  {
    key: "approvalStatus",
    label: "Status",
    render: (v, row) => {
      const status = v || (row.active === false || row.isDisable ? "inactive" : "approved");
      return <StatusBadge status={status === "approved" ? (row.active === false || row.isDisable ? "inactive" : "active") : status} dot />;
    },
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
    defaultSortKey: "name",
    defaultSortDir: "asc",
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
  const [reviewTarget, setReviewTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

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
          sortBy: list.sortKey || "name",
          sortOrder: list.sortDir || "asc",
          ...(params.isDisable !== undefined && {
            isDisable: params.isDisable,
          }),
          ...(params.approvalStatus && { approvalStatus: params.approvalStatus }),
        }),
      ).unwrap();
      const data = res?.data || {};
      setBrands(data?.list || []);
      setTotal(data?.total || 0);
    } catch (err) {
      toast.error(err?.message || "Failed to fetch brands");
    } finally {
      setLoading(false);
    }
  }, [
    dispatch,
    list.page,
    list.pageSize,
    list.search,
    list.filters,
    list.sortKey,
    list.sortDir,
    isRefresh,
  ]);

  useEffect(() => {
    fetchList();
  }, [
    list.page,
    list.pageSize,
    list.search,
    list.filters,
    list.sortKey,
    list.sortDir,
    isRefresh,
  ]);

  const validateForm = () => {
    const errs = {};
    if (!formData.name?.trim()) errs.name = "Brand name is required";
    else if (formData.name.trim().length < 2) errs.name = "Min 2 characters";
    if (!formData.logo) errs.logo = "Logo is required";
    if (!formData.thumbnails) errs.thumbnails = "Thumbnail is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const closeModal = () => {
    setModalMode(null);
    setFormData(EMPTY_FORM);
    setErrors({});
  };

  const handleFileUpload = async (file, type) => {
    const allowed = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
    const ext = file.name?.split(".").pop()?.toLowerCase();
    if (
      !allowed.includes(file.type) &&
      !["png", "jpg", "jpeg", "webp"].includes(ext)
    ) {
      toast.error("Only JPG/PNG/WEBP images allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max file size is 5MB");
      return;
    }
    setImageLoading(true);
    try {
      const url = await uploadFile(file, type);
      setFormData((prev) => ({
        ...prev,
        ...(type === "BRANDS" ? { logo: url } : { thumbnails: url }),
      }));
      if (errors[type === "BRANDS" ? "logo" : "thumbnails"])
        setErrors((prev) => ({
          ...prev,
          [type === "BRANDS" ? "logo" : "thumbnails"]: undefined,
        }));
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
        res = await dispatch(
          updateBrand({ ...payload, _id: formData._id }),
        ).unwrap();
      } else {
        res = await dispatch(createBrand(payload)).unwrap();
      }
      toast.success(
        res?.message || `Brand ${modalMode === "edit" ? "updated" : "created"}`,
      );
      closeModal();
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = useCallback(
    async (row) => {
      try {
        await dispatch(
          enableDisableBrand({ _id: [row._id], isDisable: !row.isDisable }),
        ).unwrap();
        toast.success("Brand status updated");
        setToggleOpen(false);
        setToggleTarget(null);
        setIsRefresh((r) => !r);
      } catch (err) {
        toast.error(err?.message || "Failed to update status");
      }
    },
    [dispatch],
  );

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

  const handleReview = async (action) => {
    if (!reviewTarget) return;
    if (action === "reject" && rejectionReason.trim().length < 2) {
      toast.error("Enter a rejection reason");
      return;
    }
    try {
      await dispatch(reviewBrandSubmission({
        _id: reviewTarget._id,
        action,
        rejectionReason: rejectionReason.trim(),
      })).unwrap();
      toast.success(`Brand ${action === "approve" ? "approved" : "rejected"}`);
      setReviewTarget(null);
      setRejectionReason("");
      setIsRefresh((r) => !r);
    } catch (err) {
      toast.error(err?.message || "Could not review brand");
    }
  };

  const columns = useMemo(
    () => [
      ...BASE_COLUMNS,
      {
        key: "actions",
        label: "Actions",
        headerClassName: "text-center",
        cellClassName: "admin-table-action-cell",
        render: (_, row) => (
          <div className="flex items-center justify-center gap-1.5">
            {row.approvalStatus === "pending" && (
              <PermissionGuard module="brands" action={ACTIONS.UPDATE} hide>
                <button
                  type="button"
                  className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700"
                  title="Approve brand"
                  onClick={() => { setReviewTarget(row); setRejectionReason(""); }}
                >
                  Approve
                </button>
              </PermissionGuard>
            )}
            {row.approvalStatus === "pending" && (
              <PermissionGuard module="brands" action={ACTIONS.UPDATE} hide>
                <button
                  type="button"
                  className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-red-50 px-2 text-xs font-semibold text-red-700"
                  title="Reject brand"
                  onClick={() => { setReviewTarget({ ...row, reviewAction: "reject" }); setRejectionReason(""); }}
                >
                  Reject
                </button>
              </PermissionGuard>
            )}
            <PermissionGuard module="brands" action={ACTIONS.UPDATE} hide>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--admin-line)] bg-white text-[var(--admin-navy)] shadow-sm transition hover:border-[var(--admin-gold)] hover:bg-[var(--admin-gold-soft)]"
                title="Edit brand"
                onClick={() => {
                  setFormData({
                    _id: row._id,
                    name: row.name || "",
                    logo: row.logo || "",
                    thumbnails: row.thumbnails || "",
                    isDisable: row.isDisable || false,
                  });
                  setModalMode("edit");
                }}
              >
                <MdEdit size={18} />
              </button>
            </PermissionGuard>
            {row.approvalStatus !== "pending" && (
              <PermissionGuard
                module="brands"
                action={ACTIONS.STATUS_CHANGE}
                hide
              >
                <button
                  type="button"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border shadow-sm transition ${
                    row.isDisable
                      ? "border-emerald-100 bg-emerald-50 text-emerald-600 hover:border-emerald-200"
                      : "border-[var(--admin-gold)] bg-[var(--admin-gold-soft)] text-[var(--admin-gold-dark)] hover:bg-white"
                  }`}
                  title={row.isDisable ? "Enable brand" : "Disable brand"}
                  onClick={() => {
                    setToggleTarget(row);
                    setToggleOpen(true);
                  }}
                >
                  {row.isDisable ? (
                    <MdCheckCircle size={18} />
                  ) : (
                    <MdBlock size={18} />
                  )}
                </button>
              </PermissionGuard>
            )}
            <PermissionGuard module="brands" action={ACTIONS.DELETE} hide>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-white text-red-600 shadow-sm transition hover:border-red-200 hover:bg-red-50"
                title="Delete brand"
                onClick={() => {
                  setDeleteTarget(row);
                  setDeleteOpen(true);
                }}
              >
                <MdDelete size={18} />
              </button>
            </PermissionGuard>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Brands"
        subtitle="Manage product brands and their logos"
        breadcrumbs={[{ label: "Catalog" }, { label: "Brands" }]}
        actions={
          <div className="flex items-center gap-2">
            <PermissionGuard module="brands" action={ACTIONS.CREATE} hide>
              <button
                onClick={() => setModalMode("add")}

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
          <div className="brand-filter-inline">
            <FilterBar
              filters={FILTER_FIELDS}
              values={list.filters}
              onChange={list.setFilter}
              onClear={list.clearFilters}
              loading={loading}
              activeCount={list.activeFilterCount}
            />
          </div>
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
                    if (errors.name)
                      setErrors((p) => ({ ...p, name: undefined }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                  placeholder="e.g. Apple, Samsung"
                  maxLength={50}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Logo <span className="text-red-500">*</span>
                </label>
                {formData.logo && (
                  <div className="mb-2 flex items-center gap-3">
                    <img
                      src={formData.logo}
                      alt="Logo preview"
                      className="h-14 w-14 rounded-lg object-contain border border-gray-200 bg-gray-50"
                    />
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:underline"
                      onClick={() => setFormData((p) => ({ ...p, logo: "" }))}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <ImageUpload
                  id="brand-logo"
                  label="Upload Logo (PNG/WEBP recommended)"
                  onChange={(file) => handleFileUpload(file, "BRANDS")}
                  isDisabled={imageLoading}
                />
                {errors.logo && (
                  <p className="text-red-500 text-xs mt-1">{errors.logo}</p>
                )}
              </div>

              {/* Thumbnail Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thumbnail <span className="text-red-500">*</span>
                </label>
                {formData.thumbnails && (
                  <div className="mb-2 flex items-center gap-3">
                    <img
                      src={formData.thumbnails}
                      alt="Thumb preview"
                      className="h-14 w-20 rounded-lg object-cover border border-gray-200 bg-gray-50"
                    />
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:underline"
                      onClick={() =>
                        setFormData((p) => ({ ...p, thumbnails: "" }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                )}
                <ImageUpload
                  id="brand-thumbnail"
                  label="Upload Thumbnail"
                  onChange={(file) => handleFileUpload(file, "BRAND_THUMBNAIL")}
                  isDisabled={imageLoading}
                />
                {errors.thumbnails && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.thumbnails}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border rounded-lg px-4 py-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Active
                </span>
                <ToggleButton
                  isToggle={!formData.isDisable}
                  handleClick={() =>
                    setFormData((p) => ({ ...p, isDisable: !p.isDisable }))
                  }
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || imageLoading}
                  className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] disabled:opacity-60 transition-colors"
                >
                  {saving
                    ? "Saving…"
                    : modalMode === "add"
                      ? "Create Brand"
                      : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Brand"
        message={`Delete brand "${deleteTarget?.name}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
      />

      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--admin-navy)]">
                {reviewTarget.reviewAction === "reject" ? "Reject" : "Approve"} Brand
              </h2>
              <button type="button" onClick={() => setReviewTarget(null)}><MdClose size={20} /></button>
            </div>
            <p className="mb-4 text-sm text-gray-600">{reviewTarget.name}</p>
            {reviewTarget.reviewAction === "reject" && (
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Explain what the seller needs to change"
                className="mb-4 w-full rounded-lg border border-gray-300 p-2 text-sm"
                rows={4}
              />
            )}
            <div className="flex justify-end gap-3">
              <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => setReviewTarget(null)}>Cancel</button>
              <button type="button" className="rounded-lg bg-[var(--admin-gold)] px-4 py-2 text-sm text-white" onClick={() => handleReview(reviewTarget.reviewAction || "approve")}>
                {reviewTarget.reviewAction === "reject" ? "Reject" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={toggleOpen}
        onClose={() => {
          setToggleOpen(false);
          setToggleTarget(null);
        }}
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
