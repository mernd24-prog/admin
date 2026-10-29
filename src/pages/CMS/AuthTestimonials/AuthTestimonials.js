/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useFormik } from "formik";
import { toast } from "sonner";
import { MdAdd, MdDelete, MdEdit, MdReviews } from "react-icons/md";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import ImageUpload from "../../../components/Atoms/ImageGallery/ImageUpload";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import {
  ConfirmModal,
  DataTable,
  PageHeader,
} from "../../../components/Shared";
import {
  createContentPage,
  deleteContentPage,
  getContentPages,
  updateContentPage,
} from "../../../Redux/adminCoreSlice";
import { uploadFile } from "../../../_helpers/globalFunctions";
import FormSection from "../../../components/Atoms/FormSection/FormSection";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import FormSelectGroup from "../../../components/Atoms/FormSelectGroup/FormSelectGroup";
import { authTestimonialValidationSchema } from "../../../_helpers/validationSchemas";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_TYPE = "auth_testimonial";

const emptyForm = {
  recordSlug: "",
  name: "",
  avatarUrl: "",
  rating: 5,
  reviewText: "",
  googleRating: 4.7,
  googleReviewCount: "",
  googlePlaceUrl: "",
  pageTarget: "all",
  sortOrder: 0,
  published: true,
};

const PAGE_TARGET_OPTIONS = [
  {
    label: "Login + Register",
    value: "all",
  },
  {
    label: "Login only",
    value: "login",
  },
  {
    label: "Register only",
    value: "register",
  },
];

const PUBLISHED_OPTIONS = [
  {
    label: "Yes",
    value: "yes",
  },
  {
    label: "Draft",
    value: "no",
  },
];

const slugify = (value = "") =>
  String(value || "auth-testimonial")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "auth-testimonial";

const pageSlug = (page = {}) => page?.slug || page?.id || page?._id || "";

const metaOf = (page = {}) => page.metadata?.data || page.metadata || {};

const truncateText = (value = "", maxLength = 90) => {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text || "N/A";

  return `${text.slice(0, maxLength).trim()}...`;
};

const toForm = (page = {}) => {
  const meta = metaOf(page);

  return {
    ...emptyForm,
    recordSlug: pageSlug(page),
    name: page.title || page.author?.name || meta.name || "",
    avatarUrl: page.author?.avatar || page.image?.url || meta.avatarUrl || "",
    rating: Number(meta.rating ?? 5),
    reviewText: page.description || page.body || meta.reviewText || "",
    googleRating: Number(meta.googleRating ?? 4.7),
    googleReviewCount: meta.googleReviewCount || "",
    googlePlaceUrl: meta.googlePlaceUrl || "",
    pageTarget: meta.pageTarget || "all",
    sortOrder: Number(page.sortOrder ?? 0),
    published: Boolean(page.published),
  };
};

const buildPayload = (form = {}) => {
  const name = String(form.name || "").trim();
  const reviewText = String(form.reviewText || "").trim();
  const avatarUrl = String(form.avatarUrl || "").trim();

  const slug =
    form.recordSlug || `auth-testimonial-${slugify(name)}-${Date.now()}`;

  const metadata = {
    data: {
      name,
      avatarUrl,
      rating: Number(form.rating),
      reviewText,
      googleRating:
        form.googleRating === "" || form.googleRating == null
          ? 0
          : Number(form.googleRating),
      googleReviewCount: String(form.googleReviewCount || "").trim(),
      googlePlaceUrl: String(form.googlePlaceUrl || "").trim(),
      pageTarget: form.pageTarget || "all",
    },
  };

  return {
    slug,
    title: name,
    pageType: PAGE_TYPE,
    status: form.published ? "published" : "draft",
    published: Boolean(form.published),
    description: reviewText,
    body: reviewText,
    excerpt: reviewText,
    image: {
      url: avatarUrl,
      alt: name,
      type: "avatar",
    },
    author: {
      name,
      avatar: avatarUrl,
    },
    sortOrder:
      form.sortOrder === "" || form.sortOrder == null
        ? 0
        : Number(form.sortOrder),
    visibility: {
      channels: ["web"],
      roles: ["public"],
    },
    metadata,
  };
};

const inputClass =
  "w-full rounded-md border border-[#d8deec] bg-white px-3 py-2 text-sm text-[#202337] outline-none focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dce7ff]";

const AuthTestimonials = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);

  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [isRefresh, setIsRefresh] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [statusLoadingSlug, setStatusLoadingSlug] = useState("");

  const payload = selector?.contentPagesData?.data?.data || {};

  const testimonials = useMemo(
    () => (payload?.list || []).filter((page) => page.pageType === PAGE_TYPE),
    [payload?.list],
  );

  const total = payload?.total || testimonials.length;

  const fetchTestimonials = useCallback(() => {
    dispatch(
      getContentPages({
        page: pageNo,
        limit: pageSize,
        q: search,
        pageType: PAGE_TYPE,
      }),
    );
  }, [dispatch, pageNo, pageSize, search]);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials, isRefresh]);

  const formik = useFormik({
    initialValues: emptyForm,
    validationSchema: authTestimonialValidationSchema,
    validateOnChange: true,
    validateOnBlur: true,

    onSubmit: async (values, { resetForm }) => {
      if (uploadingAvatar) {
        toast.error("Please wait until the avatar upload is complete.");
        return;
      }

      const body = buildPayload(values);

      try {
        if (values.recordSlug) {
          await dispatch(
            updateContentPage({
              ...body,
              slug: values.recordSlug,
            }),
          ).unwrap();

          toast.success("Auth testimonial updated");
        } else {
          await dispatch(createContentPage(body)).unwrap();

          toast.success("Auth testimonial added");
        }

        resetForm({ values: emptyForm });
        setIsModalOpen(false);
        setIsRefresh((value) => !value);
      } catch (error) {
        toast.error(error?.message || "Failed to save auth testimonial");
      }
    },
  });

  const resetModal = () => {
    setIsModalOpen(false);
    formik.resetForm({ values: emptyForm });
  };

  const closeModal = () => {
    if (formik.isSubmitting || uploadingAvatar) return;

    resetModal();
  };

  const openAddModal = () => {
    formik.resetForm({ values: emptyForm });
    setIsModalOpen(true);
  };

  const openEditModal = (row) => {
    formik.resetForm({ values: toForm(row) });
    setIsModalOpen(true);
  };

  const patchForm = (key, value) => {
    formik.setFieldValue(key, value);
  };

  const uploadAvatar = async (file) => {
    if (!file || uploadingAvatar || formik.isSubmitting) return;

    try {
      setUploadingAvatar(true);

      const url = await uploadFile(file, "onboarding-testimonials");

      await formik.setFieldValue("avatarUrl", url);
      await formik.setFieldTouched("avatarUrl", true, false);

      toast.success("Avatar uploaded to Cloudinary");
    } catch (error) {
      toast.error(error?.message || "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const togglePublished = async (page) => {
    const slug = pageSlug(page);

    if (!slug || statusLoadingSlug) return;

    try {
      setStatusLoadingSlug(slug);

      await dispatch(
        updateContentPage({
          slug,
          published: !page.published,
          status: !page.published ? "published" : "draft",
        }),
      ).unwrap();

      toast.success("Visibility updated");
      setIsRefresh((value) => !value);
    } catch (error) {
      toast.error(error?.message || "Failed to update visibility");
    } finally {
      setStatusLoadingSlug("");
    }
  };

  const confirmDelete = async () => {
    const slug = pageSlug(deleteTarget);

    if (!slug || deleting) return;

    try {
      setDeleting(true);

      await dispatch(deleteContentPage({ slug })).unwrap();

      toast.success("Auth testimonial deleted");
      setDeleteTarget(null);
      setIsRefresh((value) => !value);
    } catch (error) {
      toast.error(error?.message || "Failed to delete auth testimonial");
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "title",
      label: "Reviewer",
      render: (value, row) => {
        const form = toForm(row);

        return (
          <div className="flex items-center gap-3">
            <img
              src={form.avatarUrl || "/Img/auth-img/user1.jpeg"}
              alt={form.name}
              className="h-10 w-10 rounded-full border border-[#eadfbd] object-cover"
            />

            <div>
              <div className="font-semibold text-[#202337]">{value}</div>

              <div className="text-xs text-[#65718b]">
                {form.pageTarget === "all"
                  ? "Login + register"
                  : form.pageTarget}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "description",
      label: "Review",
      cellClassName: "max-w-[360px]",
      render: (value, row) => {
        const review = toForm(row).reviewText || value;

        return (
          <span
            className="block max-w-[360px] overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[#65718b]"
            title={review}
          >
            {truncateText(review)}
          </span>
        );
      },
    },
    {
      key: "rating",
      label: "Rating",
      render: (_, row) => `${toForm(row).rating}/5`,
    },
    {
      key: "sortOrder",
      label: "Order",
    },
    {
      key: "published",
      label: "Live",
      render: (value, row) => (
        <ToggleButton
          isToggle={Boolean(value)}
          handleClick={() => togglePublished(row)}
          loading={statusLoadingSlug === pageSlug(row)}
          disabled={
            Boolean(statusLoadingSlug) || formik.isSubmitting || deleting
          }
        />
      ),
    },
  ];

  const rowActions = (row) => [
    {
      label: "Edit",
      icon: <MdEdit aria-hidden="true" size={16} />,
      onClick: () => openEditModal(row),
      disabled: formik.isSubmitting || deleting || Boolean(statusLoadingSlug),
    },
    {
      label: "Delete",
      icon: <MdDelete aria-hidden="true" size={16} />,
      onClick: () => setDeleteTarget(row),
      danger: true,
      disabled: formik.isSubmitting || deleting || Boolean(statusLoadingSlug),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Onboarding Testimonials"
        subtitle="Manage testimonials shown on login and seller registration screens"
        breadcrumbs={[
          { label: "Settings" },
          { label: "Onboarding Testimonials" },
        ]}
        actions={
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1"
          >
            <MdAdd aria-hidden="true" size={16} />
            Add Testimonial
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={testimonials}
        loading={selector.loading}
        totalCount={total}
        page={pageNo}
        pageSize={pageSize}
        onPageChange={setPageNo}
        onPageSizeChange={(limit) => {
          setPageSize(limit);
          setPageNo(1);
        }}
        onSearch={(value) => {
          setSearch(value?.trim() || "");
          setPageNo(1);
        }}
        onRefresh={fetchTestimonials}
        rowActions={rowActions}
        searchPlaceholder="Search auth testimonials..."
        emptyText="No auth testimonials found."
        emptyIcon={
          <MdReviews aria-hidden="true" size={40} className="text-gray-200" />
        }
        requiredModule="cms"
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        variant="danger"
        title="Delete Testimonial?"
        message={`Delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />

      <DefaultModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={formik.handleSubmit}
        loading={formik.isSubmitting || uploadingAvatar}
        title={
          formik.values.recordSlug
            ? "Edit Auth Testimonial"
            : "Add Auth Testimonial"
        }
        submitButtonText={formik.values.recordSlug ? "Update" : "Create"}
        closeButtonText="Cancel"
        isButtonView={true}
      >
        <div className="space-y-5">
          {/* ==================== Basic Information ==================== */}
          <FormSection
            title="Basic Information"
            description="Add the basic information for this testimonial."
          >
            <div className="space-y-4">
              {/* Reviewer Name */}
              <FormInput
                label="Reviewer Name"
                name="name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.name && formik.errors.name
                    ? formik.errors.name
                    : ""
                }
                placeholder="Enter reviewer name"
                required
              />

              {/* Avatar */}
              <div>
                <ImageUpload
                  id="auth-testimonial-avatar"
                  label="Upload Avatar"
                  file={formik.values.avatarUrl}
                  onChange={uploadAvatar}
                  isDisabled={uploadingAvatar || formik.isSubmitting}
                  previewClassName="!h-32 !min-h-32 object-contain"
                />

                {/* <input
                  className={`${inputClass} mt-2`}
                  name="avatarUrl"
                  value={formik.values.avatarUrl}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Uploaded Cloudinary URL"
                  disabled={uploadingAvatar || formik.isSubmitting}
                />

                {formik.touched.avatarUrl && formik.errors.avatarUrl && (
                  <p className="mt-1 text-xs text-red-600">
                    {formik.errors.avatarUrl}
                  </p>
                )} */}

                {/* <p className="mt-1 text-xs text-[#65718b]">
                  Upload folder: ecommerce/uploads/onboarding-testimonials
                </p> */}
              </div>
            </div>
          </FormSection>

          {/* ==================== Review Details ==================== */}
          <FormSection
            title="Review Details"
            description="Add the rating and review content provided by the customer."
          >
            <div className="space-y-4">
              {/* Rating */}
              <FormInput
                label="Rating"
                name="rating"
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={formik.values.rating}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.rating && formik.errors.rating
                    ? formik.errors.rating
                    : ""
                }
                placeholder="Enter rating"
                required
              />

              {/* Show On */}
              <FormSelectGroup
                label="Show On"
                options={PAGE_TARGET_OPTIONS}
                value={
                  PAGE_TARGET_OPTIONS.find(
                    (option) => option.value === formik.values.pageTarget,
                  ) || null
                }
                onChange={(selectedOption) => {
                  patchForm("pageTarget", selectedOption?.value || "all");
                  formik.setFieldTouched("pageTarget", true, false);
                }}
                placeholder="Select page"
              />

              {formik.touched.pageTarget && formik.errors.pageTarget && (
                <p className="mt-1 text-xs text-red-600">
                  {formik.errors.pageTarget}
                </p>
              )}

              {/* Review Text */}
              <FormInput
                label="Review Text"
                type="textarea"
                name="reviewText"
                value={formik.values.reviewText}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.reviewText && formik.errors.reviewText
                    ? formik.errors.reviewText
                    : ""
                }
                placeholder="Enter customer review"
                multiline
                rows={5}
                required
              />
            </div>
          </FormSection>

          {/* ==================== Google Review Details ==================== */}
          <FormSection
            title="Google Review Details"
            description="Add Google rating and review information displayed with the testimonial."
          >
            <div className="space-y-4">
              {/* Google Average Rating */}
              <FormInput
                label="Google Average Rating"
                name="googleRating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formik.values.googleRating}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.googleRating && formik.errors.googleRating
                    ? formik.errors.googleRating
                    : ""
                }
                placeholder="Enter Google rating"
              />

              {/* Google Review Count */}
              <FormInput
                label="Google Review Count"
                name="googleReviewCount"
                value={formik.values.googleReviewCount}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.googleReviewCount &&
                  formik.errors.googleReviewCount
                    ? formik.errors.googleReviewCount
                    : ""
                }
                placeholder="e.g. 128 reviews"
              />

              {/* Google URL */}
              <FormInput
                label="Google Place / Review URL"
                name="googlePlaceUrl"
                value={formik.values.googlePlaceUrl}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.googlePlaceUrl && formik.errors.googlePlaceUrl
                    ? formik.errors.googlePlaceUrl
                    : ""
                }
                placeholder="https://g.page/..."
              />
            </div>
          </FormSection>

          {/* ==================== Display Settings ==================== */}
          <FormSection
            title="Display Settings"
            description="Control the testimonial order and publication status."
          >
            <div className="space-y-4">
              {/* Sort Order */}
              <FormInput
                label="Sort Order"
                name="sortOrder"
                type="number"
                min="0"
                value={formik.values.sortOrder}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={
                  formik.touched.sortOrder && formik.errors.sortOrder
                    ? formik.errors.sortOrder
                    : ""
                }
                placeholder="Enter display order"
              />

              {/* Published */}
              <FormSelectGroup
                label="Published"
                options={PUBLISHED_OPTIONS}
                value={{
                  label: formik.values.published ? "Yes" : "Draft",
                  value: formik.values.published ? "yes" : "no",
                }}
                onChange={(selectedOption) => {
                  patchForm("published", selectedOption?.value === "yes");
                  formik.setFieldTouched("published", true, false);
                }}
                placeholder="Select status"
              />

              {formik.touched.published && formik.errors.published && (
                <p className="mt-1 text-xs text-red-600">
                  {formik.errors.published}
                </p>
              )}
            </div>
          </FormSection>
        </div>
      </DefaultModal>
    </div>
  );
};

export default AuthTestimonials;
