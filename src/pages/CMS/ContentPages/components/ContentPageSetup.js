import React, { useEffect, useMemo, useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import FormInput from "../../../../components/Atoms/FormInput/FormInput";
import FormToggleRow from "../../../../components/Atoms/FormToggleRow/FormToggleRow";
import ButtonTransparent from "../../../../components/ButtonTransparent/button";
import NewButton from "../../../../components/Button/NewButton";
import ToggleButton from "../../../../components/Atoms/ToggleButton/ToggleButton";
import { TextEditor } from "../../../../components/Atoms/FormInput/TextEditor";
import ImageUpload from "../../../../components/Atoms/ImageGallery/ImageUpload";
import { uploadFile } from "../../../../_helpers/globalFunctions";
// import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import { FormSection } from "../../../../components/Shared";
import { toast } from "sonner";
import DefaultModal from "../../../../components/Atoms/Modal/DefaultRightSideModal";

const emptyImage = {
  url: "",
  alt: "",
  title: "",
  caption: "",
  type: "",
};

const emptyCta = {
  label: "",
  url: "",
  target: "_self",
};

const emptyPoint = {
  title: "",
  description: "",
  image: { ...emptyImage },
  cta: { ...emptyCta },
  sortOrder: 0,
};

const emptySection = {
  type: "content",
  title: "",
  description: "",
  image: { ...emptyImage },
  gallery: [],
  points: [],
  cta: { ...emptyCta },
  sortOrder: 0,
};

const emptySeo = {
  metaTitle: "",
  metaDescription: "",
  keywords: [],
  focusKeyword: "",
  canonicalUrl: "",
  robots: "index,follow",
  ogTitle: "",
  ogDescription: "",
  ogImage: { ...emptyImage },
  twitterTitle: "",
  twitterDescription: "",
  twitterImage: { ...emptyImage },
  schemaType: "WebPage",
  schemaJson: {},
  breadcrumbs: [],
};

const emptyForm = {
  slug: "",
  title: "",
  pageType: "static_page",
  status: "draft",
  description: "",
  body: "",
  excerpt: "",
  category: "",
  tags: [],
  image: { ...emptyImage, type: "hero" },
  gallery: [],
  sections: [],
  points: [],
  cta: { ...emptyCta },
  seo: { ...emptySeo },
  visibility: {
    channels: ["web", "app"],
    roles: ["public"],
  },
  sortOrder: 0,
  coverImage: "",
  thumbnailUrl: "",
  heroImage: "",
  galleryImages: [],
  author: {
    name: "",
    avatar: "",
  },
  readTime: 0,
  language: "en",
  published: false,
  publishedAt: "",
  metadata: {},
};

const toCsv = (value = []) => (Array.isArray(value) ? value.join(", ") : "");

const fromCsv = (value = "") =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const withUpdatedItem = (items = [], index, updater) =>
  items.map((item, itemIndex) => (itemIndex === index ? updater(item) : item));

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeImage = (value, fallback = {}) => {
  if (typeof value === "string") {
    return { ...emptyImage, ...fallback, url: value };
  }
  return { ...emptyImage, ...fallback, ...(value || {}) };
};

const normalizeCta = (value) => ({ ...emptyCta, ...(value || {}) });

const normalizePoint = (point = {}, index = 0) => ({
  ...emptyPoint,
  ...point,
  image: normalizeImage(point.image, { type: "point" }),
  cta: normalizeCta(point.cta),
  sortOrder: Number(point.sortOrder ?? index),
});

const normalizeSection = (section = {}, index = 0) => ({
  ...emptySection,
  ...section,
  image: normalizeImage(section.image, { type: "section" }),
  gallery: asArray(section.gallery).map((item) =>
    normalizeImage(item, { type: "section_gallery" }),
  ),
  points: asArray(section.points).map(normalizePoint),
  cta: normalizeCta(section.cta),
  sortOrder: Number(section.sortOrder ?? index),
});

const normalizeContentFormData = (value = {}, overrides = {}) => {
  const source = value || {};
  const metadata = source.metadata || {};
  const metadataData = metadata.data || {};
  const sourceSections = asArray(source.sections).length
    ? source.sections
    : asArray(metadataData.sections);
  const sourcePoints = asArray(source.points).length
    ? source.points
    : asArray(metadataData.points);
  const imageUrl =
    source.image?.url ||
    source.heroImage ||
    source.coverImage ||
    source.thumbnailUrl ||
    "";

  return {
    ...emptyForm,
    ...source,
    ...overrides,
    slug: overrides.slug ?? source.slug ?? "",
    title: overrides.title ?? source.title ?? metadataData.title ?? "",
    pageType: overrides.pageType ?? source.pageType ?? "static_page",
    status: source.status || (source.published ? "published" : "draft"),
    description: source.description ?? metadataData.description ?? "",
    excerpt:
      source.excerpt ?? source.description ?? metadataData.description ?? "",
    tags: asArray(source.tags),
    image: normalizeImage(source.image, {
      url: imageUrl,
      alt: source.title || metadataData.title || "",
      type: "hero",
    }),
    gallery: asArray(source.gallery).map((item) =>
      normalizeImage(item, { alt: source.title || "" }),
    ),
    sections: sourceSections.map(normalizeSection),
    points: sourcePoints.map(normalizePoint),
    cta: normalizeCta(source.cta),
    seo: {
      ...emptySeo,
      ...(source.seo || {}),
      ogImage: normalizeImage(source.seo?.ogImage, { type: "og" }),
      twitterImage: normalizeImage(source.seo?.twitterImage, {
        type: "twitter",
      }),
      keywords: asArray(source.seo?.keywords),
      breadcrumbs: asArray(source.seo?.breadcrumbs),
      schemaJson: source.seo?.schemaJson || {},
    },
    visibility: {
      channels: asArray(source.visibility?.channels).length
        ? source.visibility.channels
        : ["web", "app"],
      roles: asArray(source.visibility?.roles).length
        ? source.visibility.roles
        : ["public"],
    },
    sortOrder: Number(source.sortOrder || 0),
    galleryImages: asArray(source.galleryImages),
    author: {
      ...emptyForm.author,
      ...(source.author || {}),
    },
    readTime: Number(source.readTime || 0),
    language: source.language || "en",
    published: Boolean(source.published || source.status === "published"),
    metadata,
  };
};

const ContentPageSetup = ({
  errors = {},
  formData,
  initialData,
  pageType = "",
  isOpen,
  onChange,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const isControlled = Boolean(formData && onChange);
  const [internalFormData, setInternalFormData] = useState(() =>
    normalizeContentFormData(initialData || {}, pageType ? { pageType } : {}),
  );

  useEffect(() => {
    if (!isOpen || isControlled) return;
    setInternalFormData(
      normalizeContentFormData(initialData || {}, pageType ? { pageType } : {}),
    );
  }, [initialData, isControlled, isOpen, pageType]);

  const normalizedControlledFormData = useMemo(
    () =>
      normalizeContentFormData(
        formData || {},
        pageType ? { pageType: formData?.pageType || pageType } : {},
      ),
    [formData, pageType],
  );

  const activeFormData = isControlled
    ? normalizedControlledFormData
    : internalFormData;

  if (!isOpen) return null;

  const setField = (name, value) => {
    if (isControlled) {
      onChange({ target: { name, value } });
      return;
    }
    setInternalFormData((prev) =>
      normalizeContentFormData({ ...prev, [name]: value }),
    );
  };

  const setNested = (parent, key, value) => {
    setField(parent, {
      ...(activeFormData[parent] || {}),
      [key]: value,
    });
  };

  const setImage = (parent, key, value) => {
    if (parent === "image") {
      setField("image", {
        ...(activeFormData.image || emptyImage),
        [key]: value,
      });
      return;
    }

    setNested(parent, "image", {
      ...((activeFormData[parent] || {}).image || emptyImage),
      [key]: value,
    });
  };

  const setSeoImage = (field, key, value) => {
    setField("seo", {
      ...(activeFormData.seo || {}),
      [field]: {
        ...((activeFormData.seo || {})[field] || emptyImage),
        [key]: value,
      },
    });
  };

  const uploadCmsImage = async (file, onUploaded) => {
    if (!file) return;
    try {
      const url = await uploadFile(file, "CMS");
      onUploaded(url);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error?.message || error || "Image upload failed");
    }
  };

  const updateSection = (index, updater) => {
    setField(
      "sections",
      withUpdatedItem(activeFormData.sections || [], index, updater),
    );
  };

  const updatePoint = (sectionIndex, pointIndex, updater) => {
    updateSection(sectionIndex, (section) => ({
      ...section,
      points: withUpdatedItem(section.points || [], pointIndex, updater),
    }));
  };

  const updateGallery = (name, value) => {
    setField(
      name,
      fromCsv(value).map((url) => ({ url, alt: activeFormData.title || "" })),
    );
  };

  const addSection = () => {
    setField("sections", [
      ...(activeFormData.sections || []),
      { ...emptySection },
    ]);
  };

  const removeSection = (index) => {
    setField(
      "sections",
      (activeFormData.sections || []).filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  };

  const addPoint = (sectionIndex) => {
    updateSection(sectionIndex, (section) => ({
      ...section,
      points: [...(section.points || []), { ...emptyPoint }],
    }));
  };

  const removePoint = (sectionIndex, pointIndex) => {
    updateSection(sectionIndex, (section) => ({
      ...section,
      points: (section.points || []).filter(
        (_, itemIndex) => itemIndex !== pointIndex,
      ),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;
    if (isControlled) {
      onSubmit(event);
      return;
    }
    onSubmit(activeFormData);
  };

  const form = activeFormData || emptyForm;
  const sections = form.sections || [];
  const seo = form.seo || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <DefaultModal
        isOpen={isOpen}
        onClose={onClose}
        title={
          form?.recordSlug || initialData
            ? "Edit Content Page"
            : "Create Content Page"
        }
        onSubmit={handleSubmit}
        submitButtonText={
          form?.recordSlug || initialData ? "Update Page" : "Create Page"
        }
        closeButtonText="Cancel"
        loading={loading}
      >
        <div className="space-y-4 py-1">
          {/* =========================================================
        BASIC INFORMATION
    ========================================================= */}
          <FormSection
            title="Basic Information"
            subtitle="Define the page title, URL, type, language, and basic information."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FormInput
                label="Title"
                name="title"
                value={form.title || ""}
                onChange={(e) => setField("title", e.target.value)}
                error={errors.title}
                placeholder="About Us"
                required
              />

              <FormInput
                label="Slug"
                name="slug"
                value={form.slug || ""}
                onChange={(e) => setField("slug", e.target.value)}
                error={errors.slug}
                placeholder="about-us"
                required
              />

              <FormInput
                label="Page Type"
                name="pageType"
                value={form.pageType || ""}
                onChange={(e) => setField("pageType", e.target.value)}
                error={errors.pageType}
                placeholder="static_page"
                required
              />

              <FormInput
                label="Category"
                name="category"
                value={form.category || ""}
                onChange={(e) => setField("category", e.target.value)}
                error={errors.category}
                placeholder="company / support / legal"
              />

              <FormInput
                label="Language"
                name="language"
                value={form.language || "en"}
                onChange={(e) => setField("language", e.target.value)}
                error={errors.language}
                placeholder="en"
              />

              <FormInput
                label="Sort Order"
                name="sortOrder"
                type="number"
                value={form.sortOrder || 0}
                onChange={(e) =>
                  setField("sortOrder", Number(e.target.value || 0))
                }
                error={errors.sortOrder}
                placeholder="0"
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-1">
              <FormInput
                label="Description"
                name="description"
                value={form.description || ""}
                onChange={(e) => setField("description", e.target.value)}
                error={errors.description}
                placeholder="Short customer-facing page description"
                type="textarea"
              />

              <FormInput
                label="Excerpt"
                name="excerpt"
                value={form.excerpt || ""}
                onChange={(e) => setField("excerpt", e.target.value)}
                error={errors.excerpt}
                placeholder="Listing summary"
                type="textarea"
              />
            </div>
          </FormSection>

          {/* =========================================================
        MAIN MEDIA
    ========================================================= */}
          <FormSection
            title="Main Image & Gallery"
            subtitle="Manage the primary page image and supporting gallery information."
          >
            <div>
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-800">
                  Main Image
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Upload the primary image for this page.
                </p>
              </div>

              <ImageUpload
                id="cms-main-image"
                label="Main Image"
                file={form.image?.url || ""}
                onChange={(file) =>
                  uploadCmsImage(file, (url) => setNested("image", "url", url))
                }
                onRemove={() => setNested("image", "url", "")}
              />

              <p className="mt-3 text-xs leading-5 text-gray-500">
                This image is also synced to legacy{" "}
                <span className="font-medium text-gray-600">heroImage</span>,{" "}
                <span className="font-medium text-gray-600">coverImage</span>,
                and{" "}
                <span className="font-medium text-gray-600">thumbnailUrl</span>{" "}
                when saved.
              </p>
            </div>

            {/* Image Information */}
            <div className="mt-5 border-t border-gray-200 pt-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-800">
                  Image Information
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  These details are used for accessibility, SEO, captions, and
                  legacy image fields when the page is saved.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormInput
                  label="Image URL"
                  value={form.image?.url || ""}
                  onChange={(e) => setNested("image", "url", e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />

                <FormInput
                  label="Image Alt"
                  value={form.image?.alt || ""}
                  onChange={(e) => setNested("image", "alt", e.target.value)}
                  placeholder="Describe the image"
                />

                <FormInput
                  label="Image Title"
                  value={form.image?.title || ""}
                  onChange={(e) => setNested("image", "title", e.target.value)}
                  placeholder="Image title"
                />

                <FormInput
                  label="Image Caption"
                  value={form.image?.caption || ""}
                  onChange={(e) =>
                    setNested("image", "caption", e.target.value)
                  }
                  placeholder="Image caption"
                />
                <FormInput
                  label="Image Type"
                  value={form.image?.type || ""}
                  onChange={(e) => setNested("image", "type", e.target.value)}
                  placeholder="image"
                />

                <FormInput
                  label="Gallery URLs"
                  value={(form.galleryImages || []).join(", ")}
                  onChange={(e) =>
                    setField("galleryImages", fromCsv(e.target.value))
                  }
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                />
              </div>
            </div>

            {/* Gallery */}
            <div className="mt-5 border-t border-gray-200 pt-5">
              {/* Your existing gallery code */}
            </div>
          </FormSection>

          {/* =========================================================
        SECTIONS
    ========================================================= */}
          <FormSection
            title="Page Sections"
            subtitle="Build rich page layouts using configurable sections and content points."
          >
            <div className="space-y-5">
              {/* Section Toolbar */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">
                      Content Sections
                    </p>

                    {sections.length > 0 && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        {sections.length}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 max-w-lg text-xs leading-5 text-gray-500">
                    Add, edit, reorder, or remove sections from your page.
                  </p>
                </div>

                <div className="shrink-0">
                  <NewButton
                    type="button"
                    onClick={addSection}
                    className="!w-auto whitespace-nowrap px-5"
                  >
                    Add Section
                  </NewButton>
                </div>
              </div>

              {/* Sections */}
              {sections.length > 0 ? (
                <div className="space-y-5">
                  {sections.map((section, sectionIndex) => (
                    <div
                      key={`section-${sectionIndex}`}
                      className="rounded-xl bg-white p-4 shadow-[0_4px_14px_rgba(0,0,0,0.07)]"
                    >
                      {/* ==================== Section Header ==================== */}
                      <div className="flex items-center justify-between gap-4">
                        {/* Section Info */}
                        <div className="flex min-w-0 items-center gap-3">
                          {/* Section Number */}
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-blue)]/10 text-xs font-bold text-[var(--admin-blue)]">
                            {String(sectionIndex + 1).padStart(2, "0")}
                          </div>

                          {/* Section Heading */}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-5 text-gray-800">
                              Section {sectionIndex + 1}
                            </p>

                            <p className="mt-0.5 truncate text-xs leading-4 text-gray-500">
                              {section.title ||
                                section.type ||
                                "Content section"}
                            </p>
                          </div>
                        </div>

                        {/* Remove Section */}
                        <button
                          type="button"
                          onClick={() => removeSection(sectionIndex)}
                          className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium leading-5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>

                      {/* ==================== Section Details ==================== */}
                      <div className="mt-3 border-t border-gray-200 pt-5">
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-800">
                            Section Details
                          </p>

                          <p className="mt-0.5 text-xs leading-5 text-gray-500">
                            Configure the section type, title, order, and image
                            information.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {/* Section Type */}
                          <FormInput
                            label="Section Type"
                            value={section.type || ""}
                            onChange={(e) =>
                              updateSection(sectionIndex, (item) => ({
                                ...item,
                                type: e.target.value,
                              }))
                            }
                            placeholder="hero / feature_grid / faq"
                          />

                          {/* Sort Order */}
                          <FormInput
                            label="Sort Order"
                            type="number"
                            value={section.sortOrder || 0}
                            onChange={(e) =>
                              updateSection(sectionIndex, (item) => ({
                                ...item,
                                sortOrder: Number(e.target.value || 0),
                              }))
                            }
                            placeholder="0"
                          />

                          {/* Section Title */}
                          <FormInput
                            label="Section Title"
                            value={section.title || ""}
                            onChange={(e) =>
                              updateSection(sectionIndex, (item) => ({
                                ...item,
                                title: e.target.value,
                              }))
                            }
                            placeholder="Our Story"
                          />

                          {/* Section Image URL */}
                          <FormInput
                            label="Section Image URL"
                            value={section.image?.url || ""}
                            onChange={(e) =>
                              updateSection(sectionIndex, (item) => ({
                                ...item,
                                image: {
                                  ...(item.image || emptyImage),
                                  url: e.target.value,
                                },
                              }))
                            }
                            placeholder="https://example.com/section.jpg"
                          />

                          {/* Section Image Alt */}
                          <FormInput
                            label="Section Image Alt"
                            value={section.image?.alt || ""}
                            onChange={(e) =>
                              updateSection(sectionIndex, (item) => ({
                                ...item,
                                image: {
                                  ...(item.image || emptyImage),
                                  alt: e.target.value,
                                },
                              }))
                            }
                            placeholder="Section image alt"
                          />

                          {/* Gallery */}
                          <FormInput
                            label="Section Gallery URLs"
                            value={(section.gallery || [])
                              .map((item) => item.url)
                              .join(", ")}
                            onChange={(e) =>
                              updateSection(sectionIndex, (item) => ({
                                ...item,
                                gallery: fromCsv(e.target.value).map((url) => ({
                                  url,
                                  alt: item.title || "",
                                })),
                              }))
                            }
                            placeholder="url1, url2"
                          />
                        </div>
                      </div>

                      {/* ==================== Section Image ==================== */}
                      <div className="mt-5 border-t border-gray-200 pt-5">
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-800">
                            Section Image
                          </p>

                          <p className="mt-0.5 text-xs leading-5 text-gray-500">
                            Upload an image to visually support this section.
                          </p>
                        </div>

                        <ImageUpload
                          id={`cms-section-image-${sectionIndex}`}
                          label="Section Image"
                          file={section.image?.url || ""}
                          onChange={(file) =>
                            uploadCmsImage(file, (url) =>
                              updateSection(sectionIndex, (item) => ({
                                ...item,
                                image: {
                                  ...(item.image || emptyImage),
                                  url,
                                },
                              })),
                            )
                          }
                        />
                      </div>

                      {/* ==================== Section Content ==================== */}
                      <div className="mt-5 border-t border-gray-200 pt-5">
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-800">
                            Section Content
                          </p>

                          <p className="mt-0.5 text-xs leading-5 text-gray-500">
                            Add the main description or supporting content for
                            this section.
                          </p>
                        </div>

                        <FormInput
                          label="Section Description"
                          value={section.description || ""}
                          onChange={(e) =>
                            updateSection(sectionIndex, (item) => ({
                              ...item,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Write a short description for this section..."
                          type="textarea"
                        />
                      </div>

                      {/* ==================== Section CTA ==================== */}
                      <div className="mt-5 border-t border-gray-200 pt-5">
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-800">
                            Section CTA
                          </p>

                          <p className="mt-0.5 text-xs leading-5 text-gray-500">
                            Add an optional call-to-action for this section.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          {/* CTA Label */}
                          <FormInput
                            label="CTA Label"
                            value={section.cta?.label || ""}
                            onChange={(e) =>
                              updateSection(sectionIndex, (item) => ({
                                ...item,
                                cta: {
                                  ...(item.cta || emptyCta),
                                  label: e.target.value,
                                },
                              }))
                            }
                            placeholder="Shop Now"
                          />

                          {/* CTA URL */}
                          <FormInput
                            label="CTA URL"
                            value={section.cta?.url || ""}
                            onChange={(e) =>
                              updateSection(sectionIndex, (item) => ({
                                ...item,
                                cta: {
                                  ...(item.cta || emptyCta),
                                  url: e.target.value,
                                },
                              }))
                            }
                            placeholder="/products"
                          />

                          {/* CTA Target */}
                          <FormInput
                            label="CTA Target"
                            value={section.cta?.target || "_self"}
                            onChange={(e) =>
                              updateSection(sectionIndex, (item) => ({
                                ...item,
                                cta: {
                                  ...(item.cta || emptyCta),
                                  target: e.target.value,
                                },
                              }))
                            }
                            placeholder="_self"
                          />
                        </div>
                      </div>

                      {/* ==================== Content Points ==================== */}
                      <div className="mt-5 border-t border-gray-200 pt-5">
                        {/* Points Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-800">
                                Content Points
                              </p>

                              {(section.points || []).length > 0 && (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                                  {section.points.length}
                                </span>
                              )}
                            </div>

                            <p className="mt-1 max-w-lg text-xs leading-5 text-gray-500">
                              Add individual features or supporting content for
                              this section.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => addPoint(sectionIndex)}
                            className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-[var(--admin-blue)] transition-colors hover:bg-[var(--admin-blue)]/10"
                          >
                            Add Point
                          </button>
                        </div>

                        {/* Points List */}
                        <div className="mt-5">
                          {(section.points || []).length > 0 ? (
                            <div className="space-y-4">
                              {section.points.map((point, pointIndex) => (
                                <div
                                  key={`point-${sectionIndex}-${pointIndex}`}
                                  className="overflow-hidden rounded-xl bg-white shadow-[0_3px_12px_rgba(0,0,0,0.06)]"
                                >
                                  {/* Point Header */}
                                  <div className="flex items-center justify-between gap-3 bg-gray-50/80 px-4 py-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                      {/* Point Number */}
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-blue)]/10 text-xs font-bold leading-none text-[var(--admin-blue)]">
                                        {String(pointIndex + 1).padStart(
                                          2,
                                          "0",
                                        )}
                                      </div>

                                      {/* Point Info */}
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold leading-5 text-gray-800">
                                          Point {pointIndex + 1}
                                        </p>

                                        <p className="truncate text-xs leading-4 text-gray-500">
                                          {point.title || "Supporting content"}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Remove Point */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removePoint(sectionIndex, pointIndex)
                                      }
                                      className="shrink-0 px-2 py-1 text-xs font-medium leading-5 text-red-500 transition-colors hover:text-red-600"
                                    >
                                      Remove
                                    </button>
                                  </div>

                                  {/* Point Content */}
                                  <div className="space-y-4 p-4">
                                    {/* Point Fields */}
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                      <FormInput
                                        label="Point Title"
                                        value={point.title || ""}
                                        onChange={(e) =>
                                          updatePoint(
                                            sectionIndex,
                                            pointIndex,
                                            (item) => ({
                                              ...item,
                                              title: e.target.value,
                                            }),
                                          )
                                        }
                                        placeholder="Fast Delivery"
                                      />

                                      <FormInput
                                        label="Point Sort Order"
                                        type="number"
                                        value={point.sortOrder || 0}
                                        onChange={(e) =>
                                          updatePoint(
                                            sectionIndex,
                                            pointIndex,
                                            (item) => ({
                                              ...item,
                                              sortOrder: Number(
                                                e.target.value || 0,
                                              ),
                                            }),
                                          )
                                        }
                                        placeholder="0"
                                      />

                                      <FormInput
                                        label="Point Image URL"
                                        value={point.image?.url || ""}
                                        onChange={(e) =>
                                          updatePoint(
                                            sectionIndex,
                                            pointIndex,
                                            (item) => ({
                                              ...item,
                                              image: {
                                                ...(item.image || emptyImage),
                                                url: e.target.value,
                                              },
                                            }),
                                          )
                                        }
                                        placeholder="https://example.com/icon.png"
                                      />

                                      <FormInput
                                        label="Point Image Alt"
                                        value={point.image?.alt || ""}
                                        onChange={(e) =>
                                          updatePoint(
                                            sectionIndex,
                                            pointIndex,
                                            (item) => ({
                                              ...item,
                                              image: {
                                                ...(item.image || emptyImage),
                                                alt: e.target.value,
                                              },
                                            }),
                                          )
                                        }
                                        placeholder="Fast delivery icon"
                                      />
                                    </div>

                                    {/* Point Image */}
                                    <div className="pt-2">
                                      <div className="mb-3">
                                        <p className="text-xs font-semibold text-gray-700">
                                          Point Image
                                        </p>

                                        <p className="mt-0.5 text-xs text-gray-500">
                                          Upload an image to represent this
                                          point.
                                        </p>
                                      </div>

                                      <ImageUpload
                                        id={`cms-point-image-${sectionIndex}-${pointIndex}`}
                                        label="Point Image"
                                        file={point.image?.url || ""}
                                        onChange={(file) =>
                                          uploadCmsImage(file, (url) =>
                                            updatePoint(
                                              sectionIndex,
                                              pointIndex,
                                              (item) => ({
                                                ...item,
                                                image: {
                                                  ...(item.image || emptyImage),
                                                  url,
                                                },
                                              }),
                                            ),
                                          )
                                        }
                                      />
                                    </div>

                                    {/* Point Description */}
                                    <div className="pt-2">
                                      <FormInput
                                        label="Point Description"
                                        value={point.description || ""}
                                        onChange={(e) =>
                                          updatePoint(
                                            sectionIndex,
                                            pointIndex,
                                            (item) => ({
                                              ...item,
                                              description: e.target.value,
                                            }),
                                          )
                                        }
                                        placeholder="Describe this point..."
                                        type="textarea"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* Empty Points State */
                            <div className="rounded-xl bg-gray-50/70 px-5 py-6 text-center">
                              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                                <span className="text-sm font-semibold text-gray-400">
                                  +
                                </span>
                              </div>

                              <p className="mt-3 text-sm font-medium text-gray-700">
                                No points added yet
                              </p>

                              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-gray-500">
                                Use the{" "}
                                <span className="font-medium">Add Point</span>{" "}
                                button above to add features or supporting
                                information.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ==================== Empty State ==================== */
                <div className="rounded-xl bg-gray-50/70 px-6 py-10 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--admin-blue)]/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[var(--admin-blue)]"
                    >
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                  </div>

                  <p className="mt-4 text-sm font-semibold text-gray-800">
                    No sections added yet
                  </p>

                  <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-gray-500">
                    Use the <span className="font-medium">Add Section</span>{" "}
                    button above to start building your page with content,
                    images, CTAs, and supporting points.
                  </p>
                </div>
              )}
            </div>
          </FormSection>

          {/* =========================================================
        BODY CONTENT
    ========================================================= */}
          <FormSection
            title="Body Content"
            subtitle="Add the main long-form content displayed on the page."
          >
            <TextEditor
              label="Body"
              value={form.body || ""}
              onChange={(val) => setField("body", val)}
              placeholder="Optional long-form page content..."
              height="280px"
              error={errors.body}
            />
          </FormSection>

          {/* =========================================================
        CTA / TAGS / VISIBILITY
    ========================================================= */}
          <FormSection
            title="CTA, Tags & Visibility"
            subtitle="Configure the page call-to-action and audience visibility."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <FormInput
                label="CTA Label"
                value={form.cta?.label || ""}
                onChange={(e) => setNested("cta", "label", e.target.value)}
                placeholder="Start Shopping"
              />

              <FormInput
                label="CTA URL"
                value={form.cta?.url || ""}
                onChange={(e) => setNested("cta", "url", e.target.value)}
                placeholder="/products"
              />

              <FormInput
                label="CTA Target"
                value={form.cta?.target || "_self"}
                onChange={(e) => setNested("cta", "target", e.target.value)}
                placeholder="_self"
              />

              <FormInput
                label="Tags"
                value={toCsv(form.tags)}
                onChange={(e) => setField("tags", fromCsv(e.target.value))}
                error={errors.tags}
                placeholder="policy, ecommerce, support"
              />

              <FormInput
                label="Channels"
                value={toCsv(form.visibility?.channels)}
                onChange={(e) =>
                  setField("visibility", {
                    ...(form.visibility || {}),
                    channels: fromCsv(e.target.value),
                  })
                }
                placeholder="web, app"
              />

              <FormInput
                label="Roles"
                value={toCsv(form.visibility?.roles)}
                onChange={(e) =>
                  setField("visibility", {
                    ...(form.visibility || {}),
                    roles: fromCsv(e.target.value),
                  })
                }
                placeholder="public, buyer"
              />
            </div>
          </FormSection>

          {/* =========================================================
        SEO
    ========================================================= */}
          <FormSection
            title="SEO"
            subtitle="Optimize page metadata, search visibility, and social sharing."
          >
            {/* SEO Fields */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Meta Title"
                value={seo.metaTitle || ""}
                onChange={(e) => setNested("seo", "metaTitle", e.target.value)}
                placeholder="About Sam Global"
              />

              <FormInput
                label="Focus Keyword"
                value={seo.focusKeyword || ""}
                onChange={(e) =>
                  setNested("seo", "focusKeyword", e.target.value)
                }
                placeholder="online marketplace"
              />

              <FormInput
                label="Canonical URL"
                value={seo.canonicalUrl || ""}
                onChange={(e) =>
                  setNested("seo", "canonicalUrl", e.target.value)
                }
                placeholder="https://example.com/about-us"
              />

              <FormInput
                label="Robots"
                value={seo.robots || "index,follow"}
                onChange={(e) => setNested("seo", "robots", e.target.value)}
                placeholder="index,follow"
              />

              <FormInput
                label="SEO Keywords"
                value={toCsv(seo.keywords)}
                onChange={(e) =>
                  setNested("seo", "keywords", fromCsv(e.target.value))
                }
                placeholder="shopping, marketplace, sellers"
              />

              <FormInput
                label="Schema Type"
                value={seo.schemaType || "WebPage"}
                onChange={(e) => setNested("seo", "schemaType", e.target.value)}
                placeholder="WebPage"
              />
            </div>

            {/* Meta Description */}
            <div className="mt-4">
              <FormInput
                label="Meta Description"
                value={seo.metaDescription || ""}
                onChange={(e) =>
                  setNested("seo", "metaDescription", e.target.value)
                }
                placeholder="Search result description"
                type="textarea"
              />
            </div>

            {/* Open Graph */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-800">
                  Open Graph
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Configure Open Graph sharing information.
                </p>
              </div>

              <div className="space-y-5">
                {/* OG Image */}
                <ImageUpload
                  id="cms-og-image"
                  label="OG Image"
                  file={seo.ogImage?.url || ""}
                  onChange={(file) =>
                    uploadCmsImage(file, (url) =>
                      setSeoImage("ogImage", "url", url),
                    )
                  }
                  onRemove={() => setSeoImage("ogImage", "url", "")}
                />

                {/* OG Title + URL */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormInput
                    label="OG Title"
                    value={seo.ogTitle || ""}
                    onChange={(e) =>
                      setNested("seo", "ogTitle", e.target.value)
                    }
                    placeholder="Social title"
                  />

                  <FormInput
                    label="OG Image URL"
                    value={seo.ogImage?.url || ""}
                    onChange={(e) =>
                      setSeoImage("ogImage", "url", e.target.value)
                    }
                    placeholder="https://example.com/og.jpg"
                  />
                </div>

                {/* OG Description */}
                <FormInput
                  label="OG Description"
                  value={seo.ogDescription || ""}
                  onChange={(e) =>
                    setNested("seo", "ogDescription", e.target.value)
                  }
                  placeholder="Social description"
                  type="textarea"
                />
              </div>
            </div>

            {/* Twitter */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Twitter</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Configure Twitter sharing information.
                </p>
              </div>

              <div className="space-y-5">
                {/* Twitter Image */}
                <ImageUpload
                  id="cms-twitter-image"
                  label="Twitter Image"
                  file={seo.twitterImage?.url || ""}
                  onChange={(file) =>
                    uploadCmsImage(file, (url) =>
                      setSeoImage("twitterImage", "url", url),
                    )
                  }
                  onRemove={() => setSeoImage("twitterImage", "url", "")}
                />

                {/* Twitter Title + URL */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormInput
                    label="Twitter Title"
                    value={seo.twitterTitle || ""}
                    onChange={(e) =>
                      setNested("seo", "twitterTitle", e.target.value)
                    }
                    placeholder="Twitter title"
                  />

                  <FormInput
                    label="Twitter Image URL"
                    value={seo.twitterImage?.url || ""}
                    onChange={(e) =>
                      setSeoImage("twitterImage", "url", e.target.value)
                    }
                    placeholder="https://example.com/twitter.jpg"
                  />
                </div>

                {/* Twitter Description */}
                <FormInput
                  label="Twitter Description"
                  value={seo.twitterDescription || ""}
                  onChange={(e) =>
                    setNested("seo", "twitterDescription", e.target.value)
                  }
                  placeholder="Twitter description"
                  type="textarea"
                />
              </div>
            </div>

            {/* Schema */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Schema</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Add structured data for search engines.
                </p>
              </div>

              <FormInput
                label="Schema JSON"
                value={JSON.stringify(seo.schemaJson || {}, null, 2)}
                onChange={(e) => {
                  try {
                    setNested(
                      "seo",
                      "schemaJson",
                      JSON.parse(e.target.value || "{}"),
                    );
                  } catch (error) {}
                }}
                placeholder='{"@type":"WebPage"}'
                type="textarea"
              />
            </div>
          </FormSection>

          {/* =========================================================
        AUTHOR & MEDIA
    ========================================================= */}
          <FormSection
            title="Author & Compatibility Media"
            subtitle="Manage author details and legacy-compatible media fields."
          >
            {/* Images */}
            <div className="space-y-5">
              <ImageUpload
                id="cms-author-avatar"
                label="Author Avatar"
                file={form.author?.avatar || ""}
                onChange={(file) =>
                  uploadCmsImage(file, (url) =>
                    setNested("author", "avatar", url),
                  )
                }
                onRemove={() => setNested("author", "avatar", "")}
              />

              <ImageUpload
                id="cms-cover-image"
                label="Cover Image"
                file={form.coverImage || ""}
                onChange={(file) =>
                  uploadCmsImage(file, (url) => setField("coverImage", url))
                }
                onRemove={() => setField("coverImage", "")}
              />

              <ImageUpload
                id="cms-thumbnail-image"
                label="Thumbnail"
                file={form.thumbnailUrl || ""}
                onChange={(file) =>
                  uploadCmsImage(file, (url) => setField("thumbnailUrl", url))
                }
                onRemove={() => setField("thumbnailUrl", "")}
              />
            </div>

            {/* Author & Media Fields */}
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Author Name"
                value={form.author?.name || ""}
                onChange={(e) => setNested("author", "name", e.target.value)}
                placeholder="Sam Global Team"
              />

              <FormInput
                label="Author Avatar URL"
                value={form.author?.avatar || ""}
                onChange={(e) => setNested("author", "avatar", e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />

              <FormInput
                label="Read Time"
                name="readTime"
                type="number"
                value={form.readTime || 0}
                onChange={(e) =>
                  setField("readTime", Number(e.target.value || 0))
                }
                placeholder="5"
              />

              <FormInput
                label="Published At"
                name="publishedAt"
                type="datetime-local"
                value={
                  form.publishedAt
                    ? new Date(form.publishedAt).toISOString().slice(0, 16)
                    : ""
                }
                onChange={(e) => setField("publishedAt", e.target.value)}
                error={errors.publishedAt}
              />

              <FormInput
                label="Cover Image URL"
                name="coverImage"
                value={form.coverImage || ""}
                onChange={(e) => setField("coverImage", e.target.value)}
                placeholder="Legacy cover image"
              />

              <FormInput
                label="Hero Image URL"
                name="heroImage"
                value={form.heroImage || ""}
                onChange={(e) => setField("heroImage", e.target.value)}
                placeholder="Legacy hero image"
              />

              <FormInput
                label="Thumbnail URL"
                name="thumbnailUrl"
                value={form.thumbnailUrl || ""}
                onChange={(e) => setField("thumbnailUrl", e.target.value)}
                placeholder="Legacy thumbnail URL"
              />

              <FormInput
                label="Gallery Image URLs"
                value={(form.galleryImages || []).join(", ")}
                onChange={(e) =>
                  setField("galleryImages", fromCsv(e.target.value))
                }
                placeholder="Legacy url1, url2"
              />
            </div>
          </FormSection>

          {/* =========================================================
        METADATA
    ========================================================= */}
          <FormSection
            title="Metadata"
            subtitle="Add additional JSON metadata used by the CMS and integrations."
          >
            <FormInput
              label="Metadata JSON"
              value={JSON.stringify(form.metadata || {}, null, 2)}
              onChange={(e) => {
                try {
                  setField("metadata", JSON.parse(e.target.value || "{}"));
                } catch (error) {}
              }}
              placeholder='{"cmsKey":"about-us"}'
              type="textarea"
            />
          </FormSection>

          {/* =========================================================
        PUBLISHING
    ========================================================= */}
          <FormSection
            title="Publishing"
            subtitle="Control the visibility and publication status of this page."
          >
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <FormToggleRow
                title="Publish Content"
                description="Published pages are publicly visible to customers."
                isToggle={form.status === "published" || !!form.published}
                handleClick={() => {
                  const isPublished =
                    form.status === "published" || !!form.published;

                  setField("status", isPublished ? "draft" : "published");

                  setField("published", !isPublished);
                }}
              />
            </div>
          </FormSection>
        </div>
      </DefaultModal>
    </div>
  );
};

export default ContentPageSetup;
