import React from "react";
import { MdOutlineClose } from "react-icons/md";
import FormInput from "../../../../components/Atoms/FormInput/FormInput";
import ButtonTransparent from "../../../../components/ButtonTransparent/button";
import NewButton from "../../../../components/Button/NewButton";
import ToggleButton from "../../../../components/Atoms/ToggleButton/ToggleButton";
import { TextEditor } from "../../../../components/Atoms/FormInput/TextEditor";

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

const toCsv = (value = []) => (Array.isArray(value) ? value.join(", ") : "");

const fromCsv = (value = "") =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const withUpdatedItem = (items = [], index, updater) =>
  items.map((item, itemIndex) => (itemIndex === index ? updater(item) : item));

const ContentPageSetup = ({
  errors = {},
  formData,
  isOpen,
  onChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const setField = (name, value) => {
    onChange({ target: { name, value } });
  };

  const setNested = (parent, key, value) => {
    setField(parent, {
      ...(formData[parent] || {}),
      [key]: value,
    });
  };

  const setImage = (parent, key, value) => {
    if (parent === "image") {
      setField("image", {
        ...(formData.image || emptyImage),
        [key]: value,
      });
      return;
    }

    setNested(parent, "image", {
      ...((formData[parent] || {}).image || emptyImage),
      [key]: value,
    });
  };

  const setSeoImage = (field, key, value) => {
    setField("seo", {
      ...(formData.seo || {}),
      [field]: {
        ...((formData.seo || {})[field] || emptyImage),
        [key]: value,
      },
    });
  };

  const updateSection = (index, updater) => {
    setField("sections", withUpdatedItem(formData.sections || [], index, updater));
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
      fromCsv(value).map((url) => ({ url, alt: formData.title || "" })),
    );
  };

  const addSection = () => {
    setField("sections", [...(formData.sections || []), { ...emptySection }]);
  };

  const removeSection = (index) => {
    setField("sections", (formData.sections || []).filter((_, itemIndex) => itemIndex !== index));
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

  const sections = formData.sections || [];
  const seo = formData.seo || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-11/12 max-w-6xl max-h-[95vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              {formData?.recordSlug ? "Edit Content Page" : "Create Content Page"}
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

        <form onSubmit={onSubmit} className="space-y-6 pt-6">
          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput label="Title" name="title" value={formData.title || ""} onChange={onChange} error={errors.title} placeholder="About Us" required />
              <FormInput label="Slug" name="slug" value={formData.slug || ""} onChange={onChange} error={errors.slug} placeholder="about-us" required />
              <FormInput label="Page Type" name="pageType" value={formData.pageType || ""} onChange={onChange} error={errors.pageType} placeholder="static_page" required />
              <FormInput label="Category" name="category" value={formData.category || ""} onChange={onChange} error={errors.category} placeholder="company / support / legal" />
              <FormInput label="Language" name="language" value={formData.language || "en"} onChange={onChange} error={errors.language} placeholder="en" />
              <FormInput label="Sort Order" name="sortOrder" type="number" value={formData.sortOrder || 0} onChange={onChange} error={errors.sortOrder} placeholder="0" />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput label="Description" name="description" value={formData.description || ""} onChange={onChange} error={errors.description} placeholder="Short customer-facing page description" />
              <FormInput label="Excerpt" name="excerpt" value={formData.excerpt || ""} onChange={onChange} error={errors.excerpt} placeholder="Listing summary" />
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">Main Image & Gallery</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput label="Image URL" value={formData.image?.url || ""} onChange={(e) => setImage("image", "url", e.target.value)} placeholder="https://example.com/hero.jpg" />
              <FormInput label="Image Alt" value={formData.image?.alt || ""} onChange={(e) => setImage("image", "alt", e.target.value)} placeholder="About Sam Global" />
              <FormInput label="Image Title" value={formData.image?.title || ""} onChange={(e) => setImage("image", "title", e.target.value)} placeholder="Hero image title" />
              <FormInput label="Image Caption" value={formData.image?.caption || ""} onChange={(e) => setImage("image", "caption", e.target.value)} placeholder="Optional caption" />
              <FormInput label="Image Type" value={formData.image?.type || ""} onChange={(e) => setImage("image", "type", e.target.value)} placeholder="hero" />
              <FormInput label="Gallery URLs" value={(formData.gallery || []).map((item) => item.url).join(", ")} onChange={(e) => updateGallery("gallery", e.target.value)} placeholder="url1, url2, url3" />
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
              value={formData.body || ""}
              onChange={(val) => setField("body", val)}
              placeholder="Optional long-form page content..."
              height="280px"
              error={errors.body}
            />
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">CTA, Tags & Visibility</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormInput label="CTA Label" value={formData.cta?.label || ""} onChange={(e) => setNested("cta", "label", e.target.value)} placeholder="Start Shopping" />
              <FormInput label="CTA URL" value={formData.cta?.url || ""} onChange={(e) => setNested("cta", "url", e.target.value)} placeholder="/products" />
              <FormInput label="CTA Target" value={formData.cta?.target || "_self"} onChange={(e) => setNested("cta", "target", e.target.value)} placeholder="_self" />
              <FormInput label="Tags" value={toCsv(formData.tags)} onChange={(e) => setField("tags", fromCsv(e.target.value))} error={errors.tags} placeholder="policy, ecommerce, support" />
              <FormInput label="Channels" value={toCsv(formData.visibility?.channels)} onChange={(e) => setField("visibility", { ...(formData.visibility || {}), channels: fromCsv(e.target.value) })} placeholder="web, app" />
              <FormInput label="Roles" value={toCsv(formData.visibility?.roles)} onChange={(e) => setField("visibility", { ...(formData.visibility || {}), roles: fromCsv(e.target.value) })} placeholder="public, buyer" />
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput label="Author Name" value={formData.author?.name || ""} onChange={(e) => setNested("author", "name", e.target.value)} placeholder="Sam Global Team" />
              <FormInput label="Author Avatar" value={formData.author?.avatar || ""} onChange={(e) => setNested("author", "avatar", e.target.value)} placeholder="https://example.com/avatar.jpg" />
              <FormInput label="Read Time" name="readTime" type="number" value={formData.readTime || 0} onChange={onChange} placeholder="5" />
              <FormInput label="Published At" name="publishedAt" type="datetime-local" value={formData.publishedAt ? new Date(formData.publishedAt).toISOString().slice(0, 16) : ""} onChange={onChange} error={errors.publishedAt} />
              <FormInput label="Cover Image" name="coverImage" value={formData.coverImage || ""} onChange={onChange} placeholder="Legacy cover image" />
              <FormInput label="Hero Image" name="heroImage" value={formData.heroImage || ""} onChange={onChange} placeholder="Legacy hero image" />
              <FormInput label="Thumbnail URL" name="thumbnailUrl" value={formData.thumbnailUrl || ""} onChange={onChange} placeholder="Legacy thumbnail URL" />
              <FormInput label="Gallery Image URLs" value={(formData.galleryImages || []).join(", ")} onChange={(e) => setField("galleryImages", fromCsv(e.target.value))} placeholder="Legacy url1, url2" />
            </div>
          </div>

          <div className="rounded-lg border p-5">
            <h3 className="mb-4 text-lg font-semibold">Metadata JSON</h3>
            <textarea
              rows={5}
              className="w-full rounded-md border p-3 font-mono text-sm outline-none focus:border-black"
              placeholder='{"cmsKey":"about-us"}'
              value={JSON.stringify(formData.metadata || {}, null, 2)}
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
                isToggle={formData.status === "published" || !!formData.published}
                handleClick={() => {
                  const isPublished = formData.status === "published" || !!formData.published;
                  setField("status", isPublished ? "draft" : "published");
                  setField("published", !isPublished);
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t pt-5">
            <ButtonTransparent type="button" onClick={onClose}>Cancel</ButtonTransparent>
            <NewButton type="submit">{formData?.recordSlug ? "Update Page" : "Create Page"}</NewButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentPageSetup;
