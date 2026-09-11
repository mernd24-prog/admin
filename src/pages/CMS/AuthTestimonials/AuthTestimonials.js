/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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

const PAGE_SIZE = 10;
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
    rating: Number(meta.rating || 5),
    reviewText: page.description || page.body || meta.reviewText || "",
    googleRating: Number(meta.googleRating || 4.7),
    googleReviewCount: meta.googleReviewCount || "",
    googlePlaceUrl: meta.googlePlaceUrl || "",
    pageTarget: meta.pageTarget || "all",
    sortOrder: Number(page.sortOrder || 0),
    published: Boolean(page.published),
  };
};

const buildPayload = (form = {}) => {
  const name = form.name.trim();
  const reviewText = form.reviewText.trim();
  const slug =
    form.recordSlug || `auth-testimonial-${slugify(name)}-${Date.now()}`;
  const metadata = {
    data: {
      name,
      avatarUrl: form.avatarUrl.trim(),
      rating: Number(form.rating || 0),
      reviewText,
      googleRating: Number(form.googleRating || 0),
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
    image: { url: form.avatarUrl.trim(), alt: name, type: "avatar" },
    author: { name, avatar: form.avatarUrl.trim() },
    sortOrder: Number(form.sortOrder || 0),
    visibility: { channels: ["web"], roles: ["public"] },
    metadata,
  };
};

const Field = ({ label, children, error }) => (
  <label className="block text-sm font-medium text-[#202337]">
    <span>{label}</span>
    <div className="mt-1">{children}</div>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </label>
);

const inputClass =
  "w-full rounded-md border border-[#d8deec] bg-white px-3 py-2 text-sm text-[#202337] outline-none focus:border-[#2f6fed] focus:ring-2 focus:ring-[#dce7ff]";

const AuthTestimonials = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);
  const [pageNo, setPageNo] = useState(1);
  const [search, setSearch] = useState("");
  const [isRefresh, setIsRefresh] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
        limit: PAGE_SIZE,
        q: search,
        pageType: PAGE_TYPE,
      }),
    );
  }, [dispatch, pageNo, search]);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials, isRefresh]);

  const resetModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm);
    setErrors({});
  };
  const closeModal = () => {
    if (submitting) return;
    resetModal();
  };

  const patchForm = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.name.trim()) nextErrors.name = "Name is required";
    if (!formData.reviewText.trim())
      nextErrors.reviewText = "Review text is required";
    const rating = Number(formData.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5)
      nextErrors.rating = "Rating must be between 1 and 5";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const uploadAvatar = async (file) => {
    if (!file || uploadingAvatar) return;
    try {
      setUploadingAvatar(true);
      const url = await uploadFile(file, "auth-testimonials");
      patchForm("avatarUrl", url);
      toast.success("Avatar uploaded to Cloudinary");
    } catch (error) {
      toast.error(error?.message || "Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting || uploadingAvatar || !validate()) return;
    const body = buildPayload(formData);
    try {
      setSubmitting(true);
      if (formData.recordSlug) {
        await dispatch(
          updateContentPage({ ...body, slug: formData.recordSlug }),
        ).unwrap();
        toast.success("Auth testimonial updated");
      } else {
        await dispatch(createContentPage(body)).unwrap();
        toast.success("Auth testimonial added");
      }
      resetModal();
      setIsRefresh((value) => !value);
    } catch (error) {
      toast.error(error?.message || "Failed to save auth testimonial");
    } finally {
      setSubmitting(false);
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
    { key: "sortOrder", label: "Order" },
    {
      key: "published",
      label: "Live",
      render: (value, row) => (
        <ToggleButton
          isToggle={Boolean(value)}
          handleClick={() => togglePublished(row)}
          loading={statusLoadingSlug === pageSlug(row)}
          disabled={Boolean(statusLoadingSlug) || submitting || deleting}
        />
      ),
    },
  ];

  const rowActions = (row) => [
    {
      label: "Edit",
      icon: <MdEdit size={16} />,
      onClick: () => {
        setFormData(toForm(row));
        setIsModalOpen(true);
      },
      disabled: submitting || deleting || Boolean(statusLoadingSlug),
    },
    {
      label: "Delete",
      icon: <MdDelete size={16} />,
      onClick: () => setDeleteTarget(row),
      danger: true,
      disabled: submitting || deleting || Boolean(statusLoadingSlug),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Auth Testimonials"
        subtitle="Manage testimonials shown on login and seller registration screens"
        breadcrumbs={[{ label: "Settings" }, { label: "Auth Testimonials" }]}
        actions={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1"
          >
            <MdAdd size={16} /> Add Testimonial
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={testimonials}
        loading={selector.loading}
        totalCount={total}
        page={pageNo}
        pageSize={PAGE_SIZE}
        onPageChange={setPageNo}
        onSearch={(value) => {
          setSearch(value?.trim() || "");
          setPageNo(1);
        }}
        rowActions={rowActions}
        searchPlaceholder="Search auth testimonials..."
        emptyText="No auth testimonials found."
        emptyIcon={<MdReviews size={40} className="text-gray-200" />}
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
        onSubmit={handleSubmit}
        loading={submitting || uploadingAvatar}
        title={
          formData.recordSlug ? "Edit Auth Testimonial" : "Add Auth Testimonial"
        }
        submitButtonText={formData.recordSlug ? "Update" : "Create"}
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
                value={formData.name}
                onChange={(event) => patchForm("name", event.target.value)}
                error={errors.name}
                placeholder="Enter reviewer name"
                maxLength={80}
                required
              />

              {/* Avatar */}
              <div>
                <ImageUpload
                  id="auth-testimonial-avatar"
                  label="Upload Avatar"
                  file={formData.avatarUrl}
                  onChange={uploadAvatar}
                  isDisabled={uploadingAvatar || submitting}
                  previewClassName="!h-32 !min-h-32 rounded-full object-cover"
                />

                <input
                  className={`${inputClass} mt-2`}
                  value={formData.avatarUrl}
                  onChange={(event) =>
                    patchForm("avatarUrl", event.target.value)
                  }
                  placeholder="Uploaded Cloudinary URL"
                  disabled={uploadingAvatar}
                />

                <p className="mt-1 text-xs text-[#65718b]">
                  Upload folder: ecommerce/uploads/auth-testimonials
                </p>
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
                value={formData.rating}
                onChange={(event) => patchForm("rating", event.target.value)}
                error={errors.rating}
                placeholder="Enter rating"
                required
              />

              {/* Show On */}
              <FormSelectGroup
                label="Show On"
                options={[
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
                ]}
                value={
                  [
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
                  ].find((option) => option.value === formData.pageTarget) ||
                  null
                }
                onChange={(selectedOption) =>
                  patchForm("pageTarget", selectedOption?.value || "all")
                }
                placeholder="Select page"
              />

              {/* Review Text */}
              <FormInput
                label="Review Text"
                type="textarea"
                name="reviewText"
                value={formData.reviewText}
                onChange={(event) =>
                  patchForm("reviewText", event.target.value)
                }
                error={errors.reviewText}
                placeholder="Enter customer review"
                maxLength={600}
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
                value={formData.googleRating}
                onChange={(event) =>
                  patchForm("googleRating", event.target.value)
                }
                placeholder="Enter Google rating"
              />

              {/* Google Review Count */}
              <FormInput
                label="Google Review Count"
                name="googleReviewCount"
                value={formData.googleReviewCount}
                onChange={(event) =>
                  patchForm("googleReviewCount", event.target.value)
                }
                placeholder="e.g. 128 reviews"
              />

              {/* Google URL */}
              <FormInput
                label="Google Place / Review URL"
                name="googlePlaceUrl"
                value={formData.googlePlaceUrl}
                onChange={(event) =>
                  patchForm("googlePlaceUrl", event.target.value)
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
                value={formData.sortOrder}
                onChange={(event) => patchForm("sortOrder", event.target.value)}
                placeholder="Enter display order"
              />

              {/* Published */}
              <FormSelectGroup
                label="Published"
                options={[
                  {
                    label: "Yes",
                    value: "yes",
                  },
                  {
                    label: "Draft",
                    value: "no",
                  },
                ]}
                value={{
                  label: formData.published ? "Yes" : "Draft",
                  value: formData.published ? "yes" : "no",
                }}
                onChange={(selectedOption) =>
                  patchForm("published", selectedOption?.value === "yes")
                }
                placeholder="Select status"
              />
            </div>
          </FormSection>
        </div>
      </DefaultModal>
    </div>
  );
};

export default AuthTestimonials;
