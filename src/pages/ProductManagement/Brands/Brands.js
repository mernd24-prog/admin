/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import {
  PageHeader,
  DataTable,
  BulkActionBar,
  StatusBadge,
  // FilterBar,
  ConfirmModal,
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
import { ButtonLoader } from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import FormSection from "../../../components/Atoms/FormSection/FormSection";
import FormToggleRow from "../../../components/Atoms/FormToggleRow/FormToggleRow";

const INITIAL_FILTERS = {
  search: "",
  // activationStatus: { value: "All", label: "All" },
  approvalStatus: { value: "All", label: "All" },
  dateFrom: "",
  dateTo: "",
};

// const ACTIVATION_STATUS_OPTIONS = [
//   { value: "All", label: "All" },
//   { value: "Active", label: "Active" },
//   { value: "Inactive", label: "Inactive" },
// ];

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
    render: (v, row) => <BrandAssetCell src={v} name={row.name} />,
  },
  {
    key: "name",
    label: "Brand Name",
    width: "280px",
    sortable: false,
    render: (value) => (
      <span className="font-medium text-gray-800">{value}</span>
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
  isDisable: false,
};

const Brands = () => {
  const dispatch = useDispatch();
  const list = useListPage({
    defaultPageSize: 10,
  });
  const [uploadingType, setUploadingType] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [brands, setBrands] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
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

  const handleBrandImageUpload = async (file, type) => {
    if (!file) return;

    try {
      setUploadingType(type);

      if (type === "BRANDS") {
        setLogoError(false);
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
    } catch (error) {
      console.error("Image upload failed:", error);
    } finally {
      setUploadingType(null);
    }
  };

  const fetchList = useCallback(async () => {
    setLoading(true);

    try {
      // const activationValue = appliedFilters?.activationStatus?.value;
      const approvalValue = appliedFilters?.approvalStatus?.value;

      const res = await dispatch(
        getBrandList({
          page: list.page,
          size: list.pageSize || 10,

          keyWord: appliedFilters?.search || "",
          searchFields: "name",

          select:
            "name isDisable createdAt logo  approvalStatus needsApprovalReview active",

          // sortBy: list.sortKey || "name",
          // sortOrder: list.sortDir || "asc",

          // ...(activationValue === "Active" ? { isDisable: false } : {}),

          // ...(activationValue === "Inactive" ? { isDisable: true } : {}),

          ...(approvalValue && approvalValue !== "All"
            ? { approvalStatus: approvalValue }
            : {}),

          ...(appliedFilters?.dateFrom
            ? { dateFrom: appliedFilters.dateFrom }
            : {}),

          ...(appliedFilters?.dateTo ? { dateTo: appliedFilters.dateTo } : {}),
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
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);
  useEffect(() => {
    const delay = filters.search !== appliedFilters.search ? 300 : 0;

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
        logo: url,
      }));
      if (errors.logo) {
        setErrors((prev) => ({
          ...prev,
          logo: undefined,
        }));
      }
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
      await fetchList();
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
        setBrands((current) =>
          current.map((brand) =>
            brand._id === row._id
              ? { ...brand, isDisable: !row.isDisable, active: row.isDisable }
              : brand,
          ),
        );
        await fetchList();
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
      setBrands((current) =>
        current.filter((brand) => brand._id !== deleteTarget._id),
      );
      setTotal((current) => Math.max(0, current - 1));
      await fetchList();
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
      await dispatch(
        reviewBrandSubmission({
          _id: reviewIds.length > 1 ? reviewIds : reviewIds[0],
          action,
          rejectionReason: rejectionReason.trim(),
        }),
      ).unwrap();
      toast.success(
        `${reviewIds.length} brand${reviewIds.length === 1 ? "" : "s"} ${action === "approve" ? "approved" : "rejected"}`,
      );
      setReviewTarget(null);
      setRejectionReason("");
      list.clearSelection();
      const reviewedIds = new Set(reviewIds.map(String));
      setBrands((current) =>
        current.map((brand) =>
          reviewedIds.has(String(brand._id))
            ? {
                ...brand,
                approvalStatus: action === "approve" ? "approved" : "rejected",
                needsApprovalReview: false,
              }
            : brand,
        ),
      );
      await fetchList();
    } catch (err) {
      toast.error(err?.message || "Could not review brand");
    }
  };

  const handleBulkReview = (action) => {
    const selectedBrands = brands.filter((brand) =>
      list.selectedKeys.includes(brand._id),
    );

    const reviewableBrands = selectedBrands.filter(isBrandReviewable);

    if (!reviewableBrands.length) {
      toast.info("No selected brands require approval review");
      return;
    }

    setReviewTarget({
      selectedData: reviewableBrands,
      reviewAction: action,
      _id: reviewableBrands.length === 1 ? reviewableBrands[0]._id : undefined,
      name:
        reviewableBrands.length === 1
          ? reviewableBrands[0].name
          : `${reviewableBrands.length} selected brands`,
    });
    setRejectionReason("");
  };

  const columns = useMemo(() => [...BASE_COLUMNS], []);

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

      <div className="overflow-hidden rounded-xl border border-[var(--admin-line)] bg-white shadow-sm">
        {/* Search + Filters */}
        <section className="border-b border-[var(--admin-line)]">
          <SearchComponent
            filters={filters}
            setFilters={setFilters}
            isSearchShow={true}
            // isActivationStatus={true}
            // activationStatusOptions={ACTIVATION_STATUS_OPTIONS}
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
            // onSort={handleSort}
            // sortKey={list.sortKey}
            // sortDir={list.sortDir}
            emptyText="No brands found."
            emptyIcon={
              <MdBrandingWatermark size={40} className="text-gray-200" />
            }
            requiredModule="brands"
            selectable
            selectedKeys={list.selectedKeys}
            onSelectionChange={list.setSelectedKeys}
            rowKey="_id"
            rowActions={(row) => {
              const actions = [];

              // Edit
              actions.push({
                label: "Edit Brand",
                icon: <MdEdit size={16} />,
                requiredModule: "brands",
                requiredAction: ACTIONS.UPDATE,
                onClick: () => {
                  setFormData({
                    _id: row._id,
                    name: row.name || "",
                    logo: row.logo || "",
                    isDisable: row.isDisable || false,
                  });

                  setLogoPreview("");
                  setErrors({});
                  setModalMode("edit");
                },
              });

              // Enable / Disable
              if (!isBrandReviewable(row)) {
                actions.push({
                  label: row.isDisable ? "Enable Brand" : "Disable Brand",
                  icon: row.isDisable ? (
                    <MdCheckCircle size={16} />
                  ) : (
                    <MdBlock size={16} />
                  ),
                  requiredModule: "brands",
                  requiredAction: ACTIONS.STATUS_CHANGE,
                  onClick: () => {
                    setToggleTarget(row);
                    setToggleOpen(true);
                  },
                });
              }

              // Delete
              actions.push({
                label: "Delete Brand",
                icon: <MdDelete size={16} />,
                requiredModule: "brands",
                requiredAction: ACTIONS.DELETE,
                onClick: () => {
                  setDeleteTarget(row);
                  setDeleteOpen(true);
                },
              });

              // Approve / Reject
              if (isBrandReviewable(row)) {
                actions.push({
                  label: "Approve Brand",
                  icon: <MdCheckCircle size={16} />,
                  requiredModule: "brands",
                  requiredAction: ACTIONS.UPDATE,
                  onClick: () => {
                    setReviewTarget(row);
                    setRejectionReason("");
                  },
                });

                actions.push({
                  label: "Reject Brand",
                  icon: <MdClose size={16} />,
                  requiredModule: "brands",
                  requiredAction: ACTIONS.UPDATE,
                  onClick: () => {
                    setReviewTarget({
                      ...row,
                      reviewAction: "reject",
                    });
                    setRejectionReason("");
                  },
                });
              }

              return actions;
            }}
            bulkActionBar={
              <BulkActionBar
                selectedCount={list.selectedCount}
                totalCount={brands.length}
                onClear={list.clearSelection}
                module="brands"
                loading={loading}
                actions={[
                  {
                    label: "Approve",
                    icon: <MdCheckCircle />,
                    action: ACTIONS.UPDATE,
                    variant: "primary",
                    onClick: () => handleBulkReview("approve"),
                  },
                  {
                    label: "Reject",
                    icon: <MdClose />,
                    action: ACTIONS.UPDATE,
                    variant: "danger",
                    onClick: () => handleBulkReview("reject"),
                  },
                ]}
              />
            }
            cardClassName="
        overflow-hidden
        rounded-none
        border-0
        shadow-none
      "
            tableContainerClassName="
  hide-scrollbar
  max-h-[calc(100vh-260px)]
  overflow-x-auto
  overflow-y-auto
  pb-2
  w-full
"
          />
        </section>
      </div>
      {/* Add / Edit Brand Side Drawer */}
      <DefaultModal
        isOpen={Boolean(modalMode)}
        onClose={closeModal}
        onSubmit={handleSubmit}
        title={modalMode === "add" ? "Add Brand" : "Edit Brand"}
        isButtonView={true}
        submitButtonText={modalMode === "add" ? "Create Brand" : "Save Changes"}
        closeButtonText="Cancel"
        loading={saving || uploadingType !== null}
        width="600px"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ==================== Basic Information ==================== */}
          <FormSection
            title="Basic Information"
            description="Enter the basic details for this brand."
          >
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
                <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>
              )}
            </div>
          </FormSection>

          {/* ==================== Brand Images ==================== */}
          <FormSection>
            <div className="">
              {/* ==================== Brand Logo ==================== */}
              <ImageUpload
                id="brand-logo"
                label="Brand Logo"
                subtext="Recommended: PNG or WEBP"
                required
                file={logoPreview || formData.logo}
                onChange={(file) => handleBrandImageUpload(file, "BRANDS")}
                onRemove={() => {
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
                isLoading={uploadingType === "BRANDS"}
                loadingText="Uploading logo..."
                isDisabled={uploadingType !== null}
                errorMessage={errors.logo}
              />
            </div>
          </FormSection>

          {/* ==================== Status ==================== */}
          <FormSection
            title="Brand Status"
            description="Enable or disable this brand."
          >
            <FormToggleRow
              isToggle={!formData.isDisable}
              handleClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  isDisable: !prev.isDisable,
                }))
              }
            />
          </FormSection>
        </form>
      </DefaultModal>
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[3px]">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    reviewTarget.reviewAction === "reject"
                      ? "bg-red-50 text-red-600"
                      : "bg-[rgba(214,163,35,0.12)] text-[var(--admin-gold-dark)]"
                  }`}
                >
                  {reviewTarget.reviewAction === "reject" ? (
                    <MdClose size={23} />
                  ) : (
                    <MdCheckCircle size={23} />
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-[var(--admin-navy)]">
                    {reviewTarget.reviewAction === "reject"
                      ? "Reject Brand"
                      : "Approve Brand"}
                  </h2>

                  {/* <p className="mt-0.5 text-xs text-gray-500">
                    Brand submission review
                  </p> */}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReviewTarget(null);
                  setRejectionReason("");
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <MdClose size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 px-6 py-5">
              {/* Brand Information */}
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                <BrandAssetCell
                  src={reviewTarget.logo}
                  name={reviewTarget.name}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {reviewTarget.name}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {Array.isArray(reviewTarget.selectedData)
                      ? `${reviewTarget.selectedData.length} brands selected`
                      : "Brand submission"}
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                  Pending
                </span>
              </div>

              {/* Action Description */}
              <div
                className={`rounded-lg border p-3 ${
                  reviewTarget.reviewAction === "reject"
                    ? "border-red-100 bg-red-50/60"
                    : "border-amber-100 bg-amber-50/60"
                }`}
              >
                <p className="text-sm leading-relaxed text-gray-700">
                  {reviewTarget.reviewAction === "reject"
                    ? "Rejecting this submission will notify the seller that changes are required before the brand can be approved."
                    : "Approving this submission will accept the brand and allow it to proceed in the catalog."}
                </p>
              </div>

              {/* Rejection Reason */}
              {reviewTarget.reviewAction === "reject" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Rejection Reason
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <textarea
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    placeholder="Explain what the seller needs to change..."
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[var(--admin-gold)] focus:ring-2 focus:ring-[var(--admin-gold)]/15"
                    rows={4}
                    maxLength={500}
                  />

                  <div className="mt-1 flex justify-between">
                    <p className="text-xs text-gray-400">
                      Provide a clear reason for rejection.
                    </p>
                    <span className="text-xs text-gray-400">
                      {rejectionReason.length}/500
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setReviewTarget(null);
                  setRejectionReason("");
                }}
                className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  reviewTarget.reviewAction === "reject" &&
                  rejectionReason.trim().length < 2
                }
                onClick={() =>
                  handleReview(reviewTarget.reviewAction || "approve")
                }
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  reviewTarget.reviewAction === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[var(--admin-gold)] hover:bg-[var(--admin-gold-dark)]"
                }`}
              >
                {reviewTarget.reviewAction === "reject" ? (
                  <>
                    <MdClose size={17} />
                    Confirm Rejection
                  </>
                ) : (
                  <>
                    <MdCheckCircle size={17} />
                    Confirm Approval
                  </>
                )}
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
