/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  // FilterBar,
  ConfirmModal,
  BulkActionBar,
  ExportButton,
} from "../../../components/Shared";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
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
import {ButtonLoader} from "../../../components/Loader/Loader";

// const FILTER_FIELDS = [
//   {
//     key: "isDisable",
//     type: "select",
//     label: "Status",
//     width: "w-36",
//     options: [
//       { value: "false", label: "Active" },
//       { value: "true", label: "Disabled" },
//     ],
//   },
//   {
//     key: "approvalStatus",
//     type: "select",
//     label: "Approval",
//     width: "w-36",
//     options: [
//       { value: "approved", label: "Approved" },
//       { value: "pending", label: "Pending" },
//       { value: "rejected", label: "Rejected" },
//     ],
//   },
// ];
const INITIAL_FILTERS = {
  search: "",
  activationStatus: { value: "All", label: "All" },
  approvalStatus: { value: "All", label: "All" },
  dateFrom: "",
  dateTo: "",
};

const ACTIVATION_STATUS_OPTIONS = [
  { value: "All", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const APPROVAL_STATUS_OPTIONS = [
  { value: "All", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
];
const getBrandInitial = (name = "") => {
  const firstLetter = String(name)
    .trim()
    .match(/[a-z0-9]/i)?.[0];
  return (firstLetter || "B").toUpperCase();
};

const isBrandReviewable = (brand = {}) =>
  brand.needsApprovalReview ||
  !brand.approvalStatus ||
  brand.approvalStatus === "pending";

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
    width: "80px",
    render: (v, row) => (
      <BrandAssetCell src={v} name={row.name} />
    ),
  },
  {
    key: "name",
    label: "Brand Name",
    width: "280px",
    sortable: true,
    render: (v) => (
      <span className="font-medium text-gray-800">
        {v}
      </span>
    ),
  },
  {
    key: "thumbnails",
    label: "Thumbnail",
    width: "120px",
    render: (v, row) => (
      <BrandAssetCell
        src={v}
        name={row.name}
        type="thumbnail"
      />
    ),
  },
  {
    key: "approvalStatus",
    label: "Status",
    width: "140px",
    render: (v, row) => {
      if (row.needsApprovalReview) {
        return <StatusBadge status="pending" dot />;
      }

      const status = v || "review_required";

      if (status === "review_required") {
        return <StatusBadge status="pending" dot />;
      }

      return (
        <StatusBadge
          status={
            status === "approved"
              ? row.active === false || row.isDisable
                ? "inactive"
                : "active"
              : status
          }
          dot
        />
      );
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
const [uploadingType, setUploadingType] = useState(null);
const [logoPreview, setLogoPreview] = useState("");
const [thumbnailPreview, setThumbnailPreview] = useState("");

const [logoError, setLogoError] = useState(false);
const [thumbnailError, setThumbnailError] = useState(false);
  const [brands, setBrands] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRefresh, setIsRefresh] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

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

  const selectedBrands = useMemo(
    () => brands.filter((brand) => list.selectedKeys.includes(brand._id)),
    [brands, list.selectedKeys],
  );
  const selectedReviewableBrands = useMemo(
    () => selectedBrands.filter(isBrandReviewable),
    [selectedBrands],
  );

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
          ...(params.approvalStatus && {
            approvalStatus: params.approvalStatus,
          }),
        }),
      ).unwrap();
      const data = res?.data || {};
      setBrands(data?.list || []);
      setTotal(data?.total || 0);
    } catch (err) {
      toast.error(err?.message || "Failed to fetch brands");
    } finally {
      setLoading(false);
  const handleBrandImageUpload = async (file, type) => {
  if (!file) return;

  try {
    setUploadingType(type);

    if (type === "BRANDS") {
      setLogoError(false);
    }

    if (type === "BRAND_THUMBNAIL") {
      setThumbnailError(false);
    }

    await handleFileUpload(file, type);

    const previewUrl = URL.createObjectURL(file);

    if (type === "BRANDS") {
      setLogoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return previewUrl;
      });

      if (errors.logo) {
        setErrors((prev) => ({
          ...prev,
          logo: undefined,
        }));
      }
    }

    if (type === "BRAND_THUMBNAIL") {
      setThumbnailPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return previewUrl;
      });

      if (errors.thumbnails) {
        setErrors((prev) => ({
          ...prev,
          thumbnails: undefined,
        }));
      }
    }
  } catch (error) {
    console.error("Image upload failed:", error);
  } finally {
    setUploadingType(null);
  }
};

 const fetchList = useCallback(async () => {
  setLoading(true);

  try {
    const activationValue = appliedFilters?.activationStatus?.value;
    const approvalValue = appliedFilters?.approvalStatus?.value;

    const res = await dispatch(
      getBrandList({
        page: list.page,
        size: list.pageSize || 10,

        keyWord: appliedFilters?.search || "",
        searchFields: "name",

        select:
          "name isDisable createdAt logo thumbnails approvalStatus needsApprovalReview active",

        sortBy: list.sortKey || "name",
        sortOrder: list.sortDir || "asc",

        ...(activationValue === "Active"
          ? { isDisable: false }
          : {}),

        ...(activationValue === "Inactive"
          ? { isDisable: true }
          : {}),

        ...(approvalValue && approvalValue !== "All"
          ? { approvalStatus: approvalValue }
          : {}),

        ...(appliedFilters?.dateFrom
          ? { dateFrom: appliedFilters.dateFrom }
          : {}),

        ...(appliedFilters?.dateTo
          ? { dateTo: appliedFilters.dateTo }
          : {}),
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
  list.sortKey,
  list.sortDir,
  appliedFilters,
  isRefresh,
]);

  // useEffect(() => {
  //   fetchList();
  // }, [
  //   list.page,
  //   list.pageSize,
  //   list.search,
  //   list.filters,
  //   list.sortKey,
  //   list.sortDir,
  //   isRefresh,
  // ]);
useEffect(() => {
  fetchList();
}, [fetchList]);
useEffect(() => {
  const delay =
    filters.search !== appliedFilters.search ? 300 : 0;

  const timer = setTimeout(() => {
    setAppliedFilters(filters);
    list.setPage(1);
  }, delay);

  return () => clearTimeout(timer);
}, [filters]);
const handleSearchApply = () => {
  setAppliedFilters(filters);
  list.setPage(1);
};

const clearFilters = () => {
  setFilters(INITIAL_FILTERS);
  setAppliedFilters(INITIAL_FILTERS);
  list.setPage(1);
};
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
    const reviewIds = Array.isArray(reviewTarget.selectedData)
      ? reviewTarget.selectedData.map((brand) => brand._id).filter(Boolean)
      : [reviewTarget._id].filter(Boolean);
    if (!reviewIds.length) {
      toast.error("Select at least one brand");
      return;
    }
    try {
      await dispatch(reviewBrandSubmission({
        _id: reviewIds.length > 1 ? reviewIds : reviewIds[0],
        action,
        rejectionReason: rejectionReason.trim(),
      })).unwrap();
      toast.success(`${reviewIds.length} brand${reviewIds.length === 1 ? "" : "s"} ${action === "approve" ? "approved" : "rejected"}`);
      setReviewTarget(null);
      setRejectionReason("");
      list.clearSelection();
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
        label: "ACTIONS",
        headerClassName: "text-left",
        cellClassName: "admin-table-action-cell !text-left",
        render: (_, row) => (
  <div className="flex items-center !justify-start gap-1.5">

    {/* Edit */}
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

    {/* Enable / Disable */}
    {!isBrandReviewable(row) && (
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

    {/* Delete */}
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

    {/* Approve - Last */}
    {isBrandReviewable(row) && (
      <PermissionGuard module="brands" action={ACTIONS.UPDATE} hide>
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700"
          title="Approve brand"
          onClick={() => {
            setReviewTarget(row);
            setRejectionReason("");
          }}
        >
          Approve
        </button>
      </PermissionGuard>
    )}

    {/* Reject - Last */}
    {isBrandReviewable(row) && (
      <PermissionGuard module="brands" action={ACTIONS.UPDATE} hide>
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-red-50 px-2 text-xs font-semibold text-red-700"
          title="Reject brand"
          onClick={() => {
            setReviewTarget({
              ...row,
              reviewAction: "reject",
            });
            setRejectionReason("");
          }}
        >
          Reject
        </button>
      </PermissionGuard>
    )}

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
              <button onClick={() => setModalMode("add")}>
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
        selectable
        selectedKeys={list.selectedKeys}
        onSelectionChange={list.setSelectedKeys}
        bulkActionBar={
          <BulkActionBar
            selectedCount={list.selectedCount}
            totalCount={brands.length}
            onClear={list.clearSelection}
            module="brands"
            actions={[
              {
                label: `Approve ${selectedReviewableBrands.length || ""}`.trim(),
                icon: <MdCheckCircle />,
                action: ACTIONS.UPDATE,
                variant: "primary",
                disabled: selectedReviewableBrands.length === 0,
                onClick: () => {
                  setReviewTarget({
                    selectedData: selectedReviewableBrands,
                    reviewAction: "approve",
                    name: `${selectedReviewableBrands.length} selected brand${selectedReviewableBrands.length === 1 ? "" : "s"}`,
                  });
                  setRejectionReason("");
                },
              },
            ]}
          />
        }
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
    <div className="overflow-hidden rounded-xl border border-[var(--admin-line)] bg-white shadow-sm">

  {/* Search + Filters */}
  <section className="border-b border-[var(--admin-line)]">
  <SearchComponent
  filters={filters}
  setFilters={setFilters}

  isSearchShow={true}

  isActivationStatus={true}
  activationStatusOptions={ACTIVATION_STATUS_OPTIONS}

  isApprovalOptions={true}
  approvalOptions={APPROVAL_STATUS_OPTIONS}

  dateFrom={true}
  dateTo={true}

  applyFilters={handleSearchApply}
  handleSearchRemove={clearFilters}

  isSearchDown={false}
  defaultSearchOpen={true}

  compactFilterBar={true}
  hideFilterActions={true}
  largeSearchInput={true}

  exclusiveStatusFilters={false}

  filterGridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-7"

  searchActions={
    <ExportButton
      data={brands}
      filename="brands"
      columns={BASE_COLUMNS}
      requiredModule="brands"
    />
  }
/>
  </section>

  {/* Brand Table */}
  <section>
    <DataTable
      columns={columns}
      data={brands}
      loading={loading}

      totalCount={total}

      page={list.page}
      pageSize={list.pageSize}

      onPageChange={list.setPage}
      onPageSizeChange={list.setPageSize}

      onSort={list.setSort}

      sortKey={list.sortKey}
      sortDir={list.sortDir}

      emptyText="No brands found."

      emptyIcon={
        <MdBrandingWatermark
          size={40}
          className="text-gray-200"
        />
      }

      requiredModule="brands"

      // exportConfig={{
      //   filename: "brands",
      //   columns: BASE_COLUMNS,
      // }}

      cardClassName="
        overflow-hidden
        rounded-none
        border-0
        shadow-none
      "

      tableContainerClassName="
        hide-scrollbar
        max-h-[calc(100vh-360px)]
        overflow-x-auto
        overflow-y-auto
        pb-2
      "
    />
  </section>

</div>

      {/* Add / Edit Modal */}
{modalMode && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
    <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--admin-navy)]">
            {modalMode === "add" ? "Add Brand" : "Edit Brand"}
          </h2>

          <p className="mt-0.5 text-xs text-gray-500">
            {modalMode === "add"
              ? "Add brand details and upload brand images."
              : "Update brand details and images."}
          </p>
        </div>

        <button
          type="button"
          onClick={closeModal}
          className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Brand Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Brand Name <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  name: e.target.value,
                }));

                if (errors.name) {
                  setErrors((prev) => ({
                    ...prev,
                    name: undefined,
                  }));
                }
              }}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none transition ${
                errors.name
                  ? "border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-gray-300 focus:border-[var(--admin-gold)] focus:ring-2 focus:ring-[var(--admin-gold)]/20"
              }`}
              placeholder="e.g. Apple, Samsung"
              maxLength={50}
            />

            {errors.name && (
              <p className="mt-1 text-xs text-red-500">
                {errors.name}
              </p>
            )}
          </div>

          {/* Brand Logo */}
          <div>
            <div className="mb-2">
              <label className="text-sm font-medium text-gray-700">
                Brand Logo <span className="text-red-500">*</span>
              </label>

              <p className="mt-0.5 text-xs text-gray-500">
                Recommended format: PNG or WEBP
              </p>
            </div>

            {uploadingType === "BRANDS" ? (
              <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                <ButtonLoader />
                <span className="text-xs font-medium text-gray-500">
                  Uploading logo...
                </span>
              </div>
            ) : (logoPreview || formData.logo) && !logoError ? (
              <div className="relative flex min-h-[150px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4">
                <img
                  src={logoPreview || formData.logo}
                  alt="Brand Logo"
                  onLoad={() => setLogoError(false)}
                  onError={() => {
                    if (!logoPreview) {
                      setLogoError(true);
                    }
                  }}
                  className="max-h-28 max-w-[80%] object-contain"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (logoPreview) {
                      URL.revokeObjectURL(logoPreview);
                    }

                    setLogoPreview("");
                    setLogoError(false);

                    setFormData((prev) => ({
                      ...prev,
                      logo: "",
                    }));
                  }}
                  className="absolute right-3 top-3 rounded-md border border-red-100 bg-white px-2.5 py-1.5 text-xs font-medium text-red-500 shadow-sm transition hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ) : (
              <ImageUpload
                id="brand-logo"
                label="Upload Logo"
                onChange={(file) =>
                  handleBrandImageUpload(file, "BRANDS")
                }
                isDisabled={uploadingType !== null}
              />
            )}

            {errors.logo && (
              <p className="mt-1.5 text-xs text-red-500">
                {errors.logo}
              </p>
            )}
          </div>

          {/* Thumbnail */}
          <div>
            <div className="mb-2">
              <label className="text-sm font-medium text-gray-700">
                Thumbnail <span className="text-red-500">*</span>
              </label>

              <p className="mt-0.5 text-xs text-gray-500">
                Used as the brand thumbnail across the catalog.
              </p>
            </div>

            {uploadingType === "BRAND_THUMBNAIL" ? (
              <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                <ButtonLoader />
                <span className="text-xs font-medium text-gray-500">
                  Uploading thumbnail...
                </span>
              </div>
            ) : (thumbnailPreview || formData.thumbnails) &&
              !thumbnailError ? (
              <div className="relative flex min-h-[150px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4">
                <img
                  src={thumbnailPreview || formData.thumbnails}
                  alt="Brand Thumbnail"
                  onLoad={() => setThumbnailError(false)}
                  onError={() => {
                    if (!thumbnailPreview) {
                      setThumbnailError(true);
                    }
                  }}
                  className="max-h-28 max-w-[80%] object-contain"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (thumbnailPreview) {
                      URL.revokeObjectURL(thumbnailPreview);
                    }

                    setThumbnailPreview("");
                    setThumbnailError(false);

                    setFormData((prev) => ({
                      ...prev,
                      thumbnails: "",
                    }));
                  }}
                  className="absolute right-3 top-3 rounded-md border border-red-100 bg-white px-2.5 py-1.5 text-xs font-medium text-red-500 shadow-sm transition hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ) : (
              <ImageUpload
                id="brand-thumbnail"
                label="Upload Thumbnail"
                onChange={(file) =>
                  handleBrandImageUpload(file, "BRAND_THUMBNAIL")
                }
                isDisabled={uploadingType !== null}
              />
            )}

            {errors.thumbnails && (
              <p className="mt-1.5 text-xs text-red-500">
                {errors.thumbnails}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-gray-700">
                Brand Status
              </p>

              <p className="mt-0.5 text-xs text-gray-500">
                Enable or disable this brand.
              </p>
            </div>

            <ToggleButton
              isToggle={!formData.isDisable}
              handleClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  isDisable: !prev.isDisable,
                }))
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={closeModal}
            disabled={saving || uploadingType !== null}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || uploadingType !== null}
            className="min-w-[120px] rounded-lg bg-[var(--admin-gold)] px-5 py-2 text-sm font-semibold text-[var(--admin-navy)] transition hover:bg-[var(--admin-gold-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <ButtonLoader />
                Saving...
              </span>
            ) : modalMode === "add" ? (
              "Create Brand"
            ) : (
              "Save Changes"
            )}
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
                {reviewTarget.reviewAction === "reject" ? "Reject" : "Approve"}{" "}
                Brand
              </h2>
              <button type="button" onClick={() => setReviewTarget(null)}>
                <MdClose size={20} />
              </button>
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
              <button
                type="button"
                className="rounded-lg border px-4 py-2 text-sm"
                onClick={() => setReviewTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-[var(--admin-gold)] px-4 py-2 text-sm text-white"
                onClick={() =>
                  handleReview(reviewTarget.reviewAction || "approve")
                }
              >
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
