import React, { useEffect, useMemo, useState } from "react";
import { MdOutlineClose } from "react-icons/md";
import FormInput from "../../../../components/Atoms/FormInput/FormInput";
import ButtonTransparent from "../../../../components/ButtonTransparent/button";
import NewButton from "../../../../components/Button/NewButton";
import ToggleButton from "../../../../components/Atoms/ToggleButton/ToggleButton";
import { TextEditor } from "../../../../components/Atoms/FormInput/TextEditor";
import ImageUpload from "../../../../components/Atoms/ImageGallery/ImageUpload";
import { uploadFile } from "../../../../_helpers/globalFunctions";
import { toast } from "sonner";

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
  gallery: asArray(section.gallery).map((item) => normalizeImage(item, { type: "section_gallery" })),
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
  const imageUrl = source.image?.url || source.heroImage || source.coverImage || source.thumbnailUrl || "";

  return {
    ...emptyForm,
    ...source,
    ...overrides,
    slug: overrides.slug ?? source.slug ?? "",
    title: overrides.title ?? source.title ?? metadataData.title ?? "",
    pageType: overrides.pageType ?? source.pageType ?? "static_page",
    status: source.status || (source.published ? "published" : "draft"),
    description: source.description ?? metadataData.description ?? "",
    excerpt: source.excerpt ?? source.description ?? metadataData.description ?? "",
    tags: asArray(source.tags),
    image: normalizeImage(source.image, {
      url: imageUrl,
      alt: source.title || metadataData.title || "",
      type: "hero",
    }),
    gallery: asArray(source.gallery).map((item) => normalizeImage(item, { alt: source.title || "" })),
    sections: sourceSections.map(normalizeSection),
    points: sourcePoints.map(normalizePoint),
    cta: normalizeCta(source.cta),
    seo: {
      ...emptySeo,
      ...(source.seo || {}),
      ogImage: normalizeImage(source.seo?.ogImage, { type: "og" }),
      twitterImage: normalizeImage(source.seo?.twitterImage, { type: "twitter" }),
      keywords: asArray(source.seo?.keywords),
      breadcrumbs: asArray(source.seo?.breadcrumbs),
      schemaJson: source.seo?.schemaJson || {},
    },
    visibility: {
      channels: asArray(source.visibility?.channels).length ? source.visibility.channels : ["web", "app"],
      roles: asArray(source.visibility?.roles).length ? source.visibility.roles : ["public"],
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
}) => {
  const isControlled = Boolean(formData && onChange);
  const [internalFormData, setInternalFormData] = useState(() =>
    normalizeContentFormData(initialData || {}, pageType ? { pageType } : {}),
  );

  useEffect(() => {
    if (!isOpen || isControlled) return;
    setInternalFormData(normalizeContentFormData(initialData || {}, pageType ? { pageType } : {}));
  }, [initialData, isControlled, isOpen, pageType]);

  const normalizedControlledFormData = useMemo(
    () => normalizeContentFormData(formData || {}, pageType ? { pageType: formData?.pageType || pageType } : {}),
    [formData, pageType],
  );

  const activeFormData = isControlled ? normalizedControlledFormData : internalFormData;

  if (!isOpen) return null;

  const setField = (name, value) => {
    if (isControlled) {
      onChange({ target: { name, value } });
      return;
    }
    setInternalFormData((prev) => normalizeContentFormData({ ...prev, [name]: value }));
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
    setField("sections", withUpdatedItem(activeFormData.sections || [], index, updater));
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
    setField("sections", [...(activeFormData.sections || []), { ...emptySection }]);
  };

  const removeSection = (index) => {
    setField("sections", (activeFormData.sections || []).filter((_, itemIndex) => itemIndex !== index));
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
      points: (section.points || []).filter((_, itemIndex) => itemIndex !== pointIndex),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
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
      <div className="w-11/12 max-w-6xl max-h-[95vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              {form?.recordSlug || initialData ? "Edit Content Page" : "Create Content Page"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage page content, media, sections, points, CTA, visibility, and SEO.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 transition hover:bg-gray-100"
          >
            <MdOutlineClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput label="Title" name="title" value={form.title || ""} onChange={(e) => setField("title", e.target.value)} error={errors.title} placeholder="About Us" required />
              <FormInput label="Slug" name="slug" value={form.slug || ""} onChange={(e) => setField("slug", e.target.value)} error={errors.slug} placeholder="about-us" required />
              <FormInput label="Page Type" name="pageType" value={form.pageType || ""} onChange={(e) => setField("pageType", e.target.value)} error={errors.pageType} placeholder="static_page" required />
              <FormInput label="Category" name="category" value={form.category || ""} onChange={(e) => setField("category", e.target.value)} error={errors.category} placeholder="company / support / legal" />
              <FormInput label="Language" name="language" value={form.language || "en"} onChange={(e) => setField("language", e.target.value)} error={errors.language} placeholder="en" />
              <FormInput label="Sort Order" name="sortOrder" type="number" value={form.sortOrder || 0} onChange={(e) => setField("sortOrder", Number(e.target.value || 0))} error={errors.sortOrder} placeholder="0" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput label="Description" name="description" value={form.description || ""} onChange={(e) => setField("description", e.target.value)} error={errors.description} placeholder="Short customer-facing page description" />
              <FormInput label="Excerpt" name="excerpt" value={form.excerpt || ""} onChange={(e) => setField("excerpt", e.target.value)} error={errors.excerpt} placeholder="Listing summary" />
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">Main Image & Gallery</h3>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
              <ImageUpload
                id="cms-main-image"
                label="Upload Main Image"
                file={form.image?.url || ""}
                onChange={(file) => uploadCmsImage(file, (url) => setImage("image", "url", url))}
              />
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-semibold text-gray-800">Preview</p>
                <p className="mt-1">This image is also synced to legacy `heroImage`, `coverImage`, and `thumbnailUrl` when saved.</p>
                {form.image?.url && (
                  <a className="mt-2 block break-all text-blue-600" href={form.image.url} target="_blank" rel="noreferrer">
                    {form.image.url}
                  </a>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput label="Image URL" value={form.image?.url || ""} onChange={(e) => setImage("image", "url", e.target.value)} placeholder="https://example.com/hero.jpg" />
              <FormInput label="Image Alt" value={form.image?.alt || ""} onChange={(e) => setImage("image", "alt", e.target.value)} placeholder="About Sam Global" />
              <FormInput label="Image Title" value={form.image?.title || ""} onChange={(e) => setImage("image", "title", e.target.value)} placeholder="Hero image title" />
              <FormInput label="Image Caption" value={form.image?.caption || ""} onChange={(e) => setImage("image", "caption", e.target.value)} placeholder="Optional caption" />
              <FormInput label="Image Type" value={form.image?.type || ""} onChange={(e) => setImage("image", "type", e.target.value)} placeholder="hero" />
              <FormInput label="Gallery URLs" value={(form.gallery || []).map((item) => item.url).join(", ")} onChange={(e) => updateGallery("gallery", e.target.value)} placeholder="url1, url2, url3" />
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Sections</h3>
              <NewButton type="button" onClick={addSection}>Add Section</NewButton>
            </div>

            <div className="space-y-5">
              {sections.map((section, sectionIndex) => (
                <div key={`section-${sectionIndex}`} className="rounded-lg border bg-gray-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-semibold text-gray-800">Section {sectionIndex + 1}</p>
                    <ButtonTransparent type="button" onClick={() => removeSection(sectionIndex)}>Remove</ButtonTransparent>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormInput label="Section Type" value={section.type || ""} onChange={(e) => updateSection(sectionIndex, (item) => ({ ...item, type: e.target.value }))} placeholder="hero / feature_grid / faq" />
                    <FormInput label="Sort Order" type="number" value={section.sortOrder || 0} onChange={(e) => updateSection(sectionIndex, (item) => ({ ...item, sortOrder: Number(e.target.value || 0) }))} placeholder="0" />
                    <FormInput label="Section Title" value={section.title || ""} onChange={(e) => updateSection(sectionIndex, (item) => ({ ...item, title: e.target.value }))} placeholder="Our Story" />
                    <div className="md:row-span-3">
                      <ImageUpload
                        id={`cms-section-image-${sectionIndex}`}
                        label="Section Image Upload"
                        file={section.image?.url || ""}
                        onChange={(file) =>
                          uploadCmsImage(file, (url) =>
                            updateSection(sectionIndex, (item) => ({
                              ...item,
                              image: { ...(item.image || emptyImage), url },
                            })),
                          )
                        }
                      />
                    </div>
                    <FormInput label="Section Image URL" value={section.image?.url || ""} onChange={(e) => updateSection(sectionIndex, (item) => ({ ...item, image: { ...(item.image || emptyImage), url: e.target.value } }))} placeholder="https://example.com/section.jpg" />
                    <FormInput label="Section Image Alt" value={section.image?.alt || ""} onChange={(e) => updateSection(sectionIndex, (item) => ({ ...item, image: { ...(item.image || emptyImage), alt: e.target.value } }))} placeholder="Section image alt" />
                    <FormInput label="Section Gallery URLs" value={(section.gallery || []).map((item) => item.url).join(", ")} onChange={(e) => updateSection(sectionIndex, (item) => ({ ...item, gallery: fromCsv(e.target.value).map((url) => ({ url, alt: item.title || "" })) }))} placeholder="url1, url2" />
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700">Section Description</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-md border p-3 text-sm outline-none focus:border-black"
                      value={section.description || ""}
                      onChange={(e) => updateSection(sectionIndex, (item) => ({ ...item, description: e.target.value }))}
                      placeholder="Section description"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormInput label="Section CTA Label" value={section.cta?.label || ""} onChange={(e) => updateSection(sectionIndex, (item) => ({ ...item, cta: { ...(item.cta || emptyCta), label: e.target.value } }))} placeholder="Shop Now" />
                    <FormInput label="Section CTA URL" value={section.cta?.url || ""} onChange={(e) => updateSection(sectionIndex, (item) => ({ ...item, cta: { ...(item.cta || emptyCta), url: e.target.value } }))} placeholder="/products" />
                    <FormInput label="Section CTA Target" value={section.cta?.target || "_self"} onChange={(e) => updateSection(sectionIndex, (item) => ({ ...item, cta: { ...(item.cta || emptyCta), target: e.target.value } }))} placeholder="_self" />
                  </div>

                  <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="font-semibold text-gray-700">Points</p>
                      <ButtonTransparent type="button" onClick={() => addPoint(sectionIndex)}>Add Point</ButtonTransparent>
                    </div>

                    <div className="space-y-3">
                      {(section.points || []).map((point, pointIndex) => (
                        <div key={`point-${sectionIndex}-${pointIndex}`} className="rounded-md border bg-white p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">Point {pointIndex + 1}</p>
                            <button type="button" className="text-sm text-red-600" onClick={() => removePoint(sectionIndex, pointIndex)}>Remove</button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <FormInput label="Point Title" value={point.title || ""} onChange={(e) => updatePoint(sectionIndex, pointIndex, (item) => ({ ...item, title: e.target.value }))} placeholder="Fast Delivery" />
                            <ImageUpload
                              id={`cms-point-image-${sectionIndex}-${pointIndex}`}
                              label="Point Image Upload"
                              file={point.image?.url || ""}
                              onChange={(file) =>
                                uploadCmsImage(file, (url) =>
                                  updatePoint(sectionIndex, pointIndex, (item) => ({
                                    ...item,
                                    image: { ...(item.image || emptyImage), url },
                                  })),
                                )
                              }
                            />
                            <FormInput label="Point Image URL" value={point.image?.url || ""} onChange={(e) => updatePoint(sectionIndex, pointIndex, (item) => ({ ...item, image: { ...(item.image || emptyImage), url: e.target.value } }))} placeholder="https://example.com/icon.png" />
                            <FormInput label="Point Image Alt" value={point.image?.alt || ""} onChange={(e) => updatePoint(sectionIndex, pointIndex, (item) => ({ ...item, image: { ...(item.image || emptyImage), alt: e.target.value } }))} placeholder="Fast delivery icon" />
                            <FormInput label="Point Sort Order" type="number" value={point.sortOrder || 0} onChange={(e) => updatePoint(sectionIndex, pointIndex, (item) => ({ ...item, sortOrder: Number(e.target.value || 0) }))} placeholder="0" />
                          </div>
                          <div className="mt-3">
                            <label className="mb-2 block text-sm font-medium text-gray-700">Point Description</label>
                            <textarea
                              rows={2}
                              className="w-full rounded-md border p-3 text-sm outline-none focus:border-black"
                              value={point.description || ""}
                              onChange={(e) => updatePoint(sectionIndex, pointIndex, (item) => ({ ...item, description: e.target.value }))}
                              placeholder="Point description"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {!sections.length && (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                  Add sections for rich CMS layouts.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">Body Content</h3>
            <TextEditor
              label="Body"
              value={form.body || ""}
              onChange={(val) => setField("body", val)}
              placeholder="Optional long-form page content..."
              height="280px"
              error={errors.body}
            />
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">CTA, Tags & Visibility</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormInput label="CTA Label" value={form.cta?.label || ""} onChange={(e) => setNested("cta", "label", e.target.value)} placeholder="Start Shopping" />
              <FormInput label="CTA URL" value={form.cta?.url || ""} onChange={(e) => setNested("cta", "url", e.target.value)} placeholder="/products" />
              <FormInput label="CTA Target" value={form.cta?.target || "_self"} onChange={(e) => setNested("cta", "target", e.target.value)} placeholder="_self" />
              <FormInput label="Tags" value={toCsv(form.tags)} onChange={(e) => setField("tags", fromCsv(e.target.value))} error={errors.tags} placeholder="policy, ecommerce, support" />
              <FormInput label="Channels" value={toCsv(form.visibility?.channels)} onChange={(e) => setField("visibility", { ...(form.visibility || {}), channels: fromCsv(e.target.value) })} placeholder="web, app" />
              <FormInput label="Roles" value={toCsv(form.visibility?.roles)} onChange={(e) => setField("visibility", { ...(form.visibility || {}), roles: fromCsv(e.target.value) })} placeholder="public, buyer" />
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">SEO</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput label="Meta Title" value={seo.metaTitle || ""} onChange={(e) => setNested("seo", "metaTitle", e.target.value)} placeholder="About Sam Global" />
              <FormInput label="Focus Keyword" value={seo.focusKeyword || ""} onChange={(e) => setNested("seo", "focusKeyword", e.target.value)} placeholder="online marketplace" />
              <FormInput label="Canonical URL" value={seo.canonicalUrl || ""} onChange={(e) => setNested("seo", "canonicalUrl", e.target.value)} placeholder="https://example.com/about-us" />
              <FormInput label="Robots" value={seo.robots || "index,follow"} onChange={(e) => setNested("seo", "robots", e.target.value)} placeholder="index,follow" />
              <FormInput label="SEO Keywords" value={toCsv(seo.keywords)} onChange={(e) => setNested("seo", "keywords", fromCsv(e.target.value))} placeholder="shopping, marketplace, sellers" />
              <FormInput label="Schema Type" value={seo.schemaType || "WebPage"} onChange={(e) => setNested("seo", "schemaType", e.target.value)} placeholder="WebPage" />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Meta Description</label>
              <textarea rows={3} className="w-full rounded-md border p-3 text-sm outline-none focus:border-black" value={seo.metaDescription || ""} onChange={(e) => setNested("seo", "metaDescription", e.target.value)} placeholder="Search result description" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <ImageUpload
                id="cms-og-image"
                label="OG Image Upload"
                file={seo.ogImage?.url || ""}
                onChange={(file) => uploadCmsImage(file, (url) => setSeoImage("ogImage", "url", url))}
              />
              <ImageUpload
                id="cms-twitter-image"
                label="Twitter Image Upload"
                file={seo.twitterImage?.url || ""}
                onChange={(file) => uploadCmsImage(file, (url) => setSeoImage("twitterImage", "url", url))}
              />
              <FormInput label="OG Title" value={seo.ogTitle || ""} onChange={(e) => setNested("seo", "ogTitle", e.target.value)} placeholder="Social title" />
              <FormInput label="OG Image URL" value={seo.ogImage?.url || ""} onChange={(e) => setSeoImage("ogImage", "url", e.target.value)} placeholder="https://example.com/og.jpg" />
              <FormInput label="Twitter Title" value={seo.twitterTitle || ""} onChange={(e) => setNested("seo", "twitterTitle", e.target.value)} placeholder="Twitter title" />
              <FormInput label="Twitter Image URL" value={seo.twitterImage?.url || ""} onChange={(e) => setSeoImage("twitterImage", "url", e.target.value)} placeholder="https://example.com/twitter.jpg" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">OG Description</label>
                <textarea rows={3} className="w-full rounded-md border p-3 text-sm outline-none focus:border-black" value={seo.ogDescription || ""} onChange={(e) => setNested("seo", "ogDescription", e.target.value)} placeholder="Social description" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Twitter Description</label>
                <textarea rows={3} className="w-full rounded-md border p-3 text-sm outline-none focus:border-black" value={seo.twitterDescription || ""} onChange={(e) => setNested("seo", "twitterDescription", e.target.value)} placeholder="Twitter description" />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Schema JSON</label>
              <textarea
                rows={5}
                className="w-full rounded-md border p-3 font-mono text-sm outline-none focus:border-black"
                value={JSON.stringify(seo.schemaJson || {}, null, 2)}
                onChange={(e) => {
                  try {
                    setNested("seo", "schemaJson", JSON.parse(e.target.value || "{}"));
                  } catch (error) {}
                }}
                placeholder='{"@type":"WebPage"}'
              />
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">Author & Compatibility Media</h3>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <ImageUpload
                id="cms-author-avatar"
                label="Author Avatar Upload"
                file={form.author?.avatar || ""}
                onChange={(file) => uploadCmsImage(file, (url) => setNested("author", "avatar", url))}
              />
              <ImageUpload
                id="cms-cover-image"
                label="Cover Image Upload"
                file={form.coverImage || ""}
                onChange={(file) => uploadCmsImage(file, (url) => setField("coverImage", url))}
              />
              <ImageUpload
                id="cms-thumbnail-image"
                label="Thumbnail Upload"
                file={form.thumbnailUrl || ""}
                onChange={(file) => uploadCmsImage(file, (url) => setField("thumbnailUrl", url))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput label="Author Name" value={form.author?.name || ""} onChange={(e) => setNested("author", "name", e.target.value)} placeholder="Sam Global Team" />
              <FormInput label="Author Avatar" value={form.author?.avatar || ""} onChange={(e) => setNested("author", "avatar", e.target.value)} placeholder="https://example.com/avatar.jpg" />
              <FormInput label="Read Time" name="readTime" type="number" value={form.readTime || 0} onChange={(e) => setField("readTime", Number(e.target.value || 0))} placeholder="5" />
              <FormInput label="Published At" name="publishedAt" type="datetime-local" value={form.publishedAt ? new Date(form.publishedAt).toISOString().slice(0, 16) : ""} onChange={(e) => setField("publishedAt", e.target.value)} error={errors.publishedAt} />
              <FormInput label="Cover Image" name="coverImage" value={form.coverImage || ""} onChange={(e) => setField("coverImage", e.target.value)} placeholder="Legacy cover image" />
              <FormInput label="Hero Image" name="heroImage" value={form.heroImage || ""} onChange={(e) => setField("heroImage", e.target.value)} placeholder="Legacy hero image" />
              <FormInput label="Thumbnail URL" name="thumbnailUrl" value={form.thumbnailUrl || ""} onChange={(e) => setField("thumbnailUrl", e.target.value)} placeholder="Legacy thumbnail URL" />
              <FormInput label="Gallery Image URLs" value={(form.galleryImages || []).join(", ")} onChange={(e) => setField("galleryImages", fromCsv(e.target.value))} placeholder="Legacy url1, url2" />
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">Metadata JSON</h3>
            <textarea
              rows={5}
              className="w-full rounded-md border p-3 font-mono text-sm outline-none focus:border-black"
              placeholder='{"cmsKey":"about-us"}'
              value={JSON.stringify(form.metadata || {}, null, 2)}
              onChange={(e) => {
                try {
                  setField("metadata", JSON.parse(e.target.value || "{}"));
                } catch (error) {}
              }}
            />
          </div>

          <div className="rounded-lg border p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Publish Content</h3>
                <p className="text-sm text-gray-500">Published pages are publicly visible.</p>
              </div>

              <ToggleButton
                isToggle={form.status === "published" || !!form.published}
                handleClick={() => {
                  const isPublished = form.status === "published" || !!form.published;
                  setField("status", isPublished ? "draft" : "published");
                  setField("published", !isPublished);
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t pt-5">
            <ButtonTransparent type="button" onClick={onClose}>Cancel</ButtonTransparent>
            <NewButton type="submit">{form?.recordSlug || initialData ? "Update Page" : "Create Page"}</NewButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentPageSetup;
