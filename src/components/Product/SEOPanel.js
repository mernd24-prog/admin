import React, { useEffect, useState } from "react";
import ImageUpload from "../Atoms/ImageGallery/ImageUpload";
import FormInput from "../Atoms/FormInput/FormInput";
import {
  FiGlobe,
  FiMonitor,
  FiSmartphone,
  FiMoreVertical,
  FiHash,
} from "react-icons/fi";

const isHttpUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
};

/**
 * SEO metadata panel.
 *
 * Props:
 *  seo      - { metaTitle, metaDescription, keywords, canonicalUrl, ogTitle, ogDescription, ogImage }
 *  onChange - (field, value) => void
 *  slug     - string (product slug, read-only)
 */
const SEOPanel = ({
  seo: seoProp = {},
  onChange,
  formik,
  slug = "",
  errors: externalErrors = {},
  onOgImageUpload,
  onOgImageRemove,
  ogImageUploading = false,
}) => {
  const seo = formik?.values || seoProp;
  const formikErrors = formik?.errors || {};
  const errors = {
    ...externalErrors,
    ...Object.fromEntries(
      Object.entries(formikErrors).filter(
        ([field]) => formik?.touched?.[field] || formik?.submitCount > 0,
      ),
    ),
  };
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");
  const [previewMode, setPreviewMode] = useState("desktop");
  const [ogImagePasteError, setOgImagePasteError] = useState("");
  const ogImageError = errors.ogImage || ogImagePasteError;
  const keywords = Array.isArray(seo.keywords) ? seo.keywords : [];
  const maxKeywords = 20;
  const keywordsAtMax = keywords.length >= maxKeywords;
  const keywordError =
    typeof errors.keywords === "string"
      ? errors.keywords
      : Array.isArray(errors.keywords)
        ? errors.keywords.find((error) => typeof error === "string") || ""
        : "";

  const updateSeoField = (field, value) => {
    onChange(`seo.${field}`, value);
    formik?.setFieldValue(field, value);
  };

  const touchSeoField = (field) => {
    formik?.setFieldTouched(field, true);
  };

  useEffect(() => {
    if (errors.ogTitle || errors.ogDescription || errors.ogImage) {
      setShowAdvanced(true);
    }
  }, [errors.ogTitle, errors.ogDescription, errors.ogImage]);

  const addKeyword = () => {
    const keyword = keywordInput.trim();
    if (
      keyword.length >= 2 &&
      !keywords.some(
        (item) => String(item).trim().toLowerCase() === keyword.toLowerCase(),
      ) &&
      keyword.length <= 60 &&
      keywords.length < maxKeywords
    ) {
      updateSeoField("keywords", [...keywords, keyword]);
      setKeywordInput("");
    }
  };

  const handleKeywordAdd = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();

      const keyword = keywordInput.trim();
      if (
        keyword.length >= 2 &&
        !keywords.some(
          (item) => String(item).trim().toLowerCase() === keyword.toLowerCase(),
        ) &&
        keyword.length <= 60 &&
        keywords.length < maxKeywords
      ) {
        updateSeoField("keywords", [...keywords, keyword]);
        setKeywordInput("");
      }
    }
  };

  const removeKeyword = (kw) => {
    updateSeoField(
      "keywords",
      keywords.filter((k) => k !== kw),
    );
  };

  const metaPreviewTitle = seo.metaTitle || "Your Product Title";
  const metaPreviewDesc =
    seo.metaDescription ||
    "Add a meta description to see how it appears in search engine snippets.";
  const cleanSlug = slug || "product-slug";
  const titleLen = (seo.metaTitle || "").length;
  const descLen = (seo.metaDescription || "").length;

  return (
    <div className="space-y-5">
      {/* Modern Google Search Preview Card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        {/* Header toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-slate-50/80 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              className="shrink-0"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
              />
            </svg>
            <span className="text-xs font-semibold text-gray-700 tracking-wide">
              Google Search Snippet Preview
            </span>
          </div>

          {/* Desktop / Mobile Toggle */}
          <div className="flex items-center rounded-lg bg-gray-200/70 p-0.5 text-xs font-medium text-gray-600">
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
                previewMode === "desktop"
                  ? "bg-white text-gray-900 shadow-xs font-semibold"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <FiMonitor size={12} /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
                previewMode === "mobile"
                  ? "bg-white text-gray-900 shadow-xs font-semibold"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <FiSmartphone size={12} /> Mobile
            </button>
          </div>
        </div>

        {/* Snippet display */}
        <div className="p-4 sm:p-5">
          <div
            className={
              previewMode === "mobile"
                ? "max-w-[390px] mx-auto p-3.5 rounded-xl border border-gray-200 bg-white shadow-xs"
                : "max-w-2xl"
            }
          >
            {/* Breadcrumbs / Favicon row */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200">
                  <FiGlobe size={13} className="text-slate-500" />
                </div>
                <div className="min-w-0 truncate text-xs text-[#202124]">
                  <span className="font-semibold text-gray-900">
                    Sam Global
                  </span>
                  <span className="mx-1 text-gray-400">·</span>
                  <span className="text-gray-500 truncate">
                    https://yourstore.com › products › {cleanSlug}
                  </span>
                </div>
              </div>
              <FiMoreVertical size={14} className="text-gray-400 shrink-0" />
            </div>

            {/* Clickable Blue Title */}
            <h3 className="text-[18px] sm:text-[19px] font-normal leading-snug text-[#1a0dab] hover:underline cursor-pointer break-words">
              {metaPreviewTitle.slice(0, 70)}
            </h3>

            {/* Gray snippet description */}
            <p className="mt-1 text-[13px] sm:text-[13.5px] leading-relaxed text-[#4d5156] break-words">
              {metaPreviewDesc.slice(0, 160)}
            </p>
          </div>
        </div>

        {/* Bottom health bar */}
        {/* <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/50 px-4 py-2 text-[11px] text-gray-500">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Title:{" "}
              <strong className="font-semibold text-gray-700">
                {titleLen}/70
              </strong>{" "}
              chars
            </span>
            <span>·</span>
            <span>
              Description:{" "}
              <strong className="font-semibold text-gray-700">
                {descLen}/160
              </strong>{" "}
              chars
            </span>
          </div>
        </div> */}
      </div>

      {/* Meta title */}
      <div className="space-y-1">
        <FormInput
          label="Meta Title"
          name="metaTitle"
          type="text"
          className="!mb-0"
          inputClassName="product-flat-gold-focus !h-[42px]"
          placeholder="Compelling title for search engine results"
          value={seo.metaTitle || ""}
          onChange={(e) => updateSeoField("metaTitle", e.target.value)}
          onBlur={() => touchSeoField("metaTitle")}
          maxLength={70}
          minLength={3}
          showLengthCount
          limitMessage="Meta title must be 70 characters or fewer."
          error={errors.metaTitle}
        />
      </div>

      {/* Meta description */}
      <div className="space-y-1">
        <FormInput
          label="Meta Description"
          name="metaDescription"
          type="textarea"
          rows={3}
          className="!mb-0"
          inputClassName="product-flat-gold-focus !h-[64px] resize-none !pt-4"
          placeholder="Summary shown in search results"
          value={seo.metaDescription || ""}
          onChange={(e) => updateSeoField("metaDescription", e.target.value)}
          onBlur={() => touchSeoField("metaDescription")}
          maxLength={160}
          showLengthCount
          limitMessage="Meta description must be 160 characters or fewer."
          error={errors.metaDescription}
        />
      </div>

      {/* Keywords */}
      <div className="space-y-2" data-error-field="seo.keywords">
        <FormInput
          labelName="Keywords"
          name="keywords"
          type="text"
          required
          className="!mb-0"
          placeholder={
            keywordsAtMax
              ? `Max ${maxKeywords} keywords reached`
              : "Add keyword..."
          }
          value={keywordInput}
          disabled={keywordsAtMax}
          onChange={(e) => setKeywordInput(e.target.value)}
          onKeyDown={handleKeywordAdd}
          onBlur={() => {
            addKeyword();
            touchSeoField("keywords");
          }}
          maxLength={60}
          showLengthCount={false}
          aria-required="true"
          error={keywordError}
          helperText="Required — type a keyword, then press Enter or comma to add it."
        />
        <div className="flex min-h-[34px] flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-2">
          {keywords.length ? (
            keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md bg-[var(--admin-blue)]/10 px-2 py-1 text-xs font-medium text-[var(--admin-blue)]"
              >
                <FiHash size={10} className="shrink-0 opacity-60" />
                <span className="min-w-0 break-all">{kw}</span>
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  className="ml-1 shrink-0 text-sm leading-none hover:text-red-500"
                  aria-label={`Remove keyword ${kw}`}
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400">
              No keywords added yet.
            </span>
          )}
        </div>

        <p className="select-none text-xs text-gray-400">
          Press{" "}
          <kbd className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 font-mono text-[10px]">
            Enter
          </kbd>{" "}
          or{" "}
          <kbd className="rounded border border-gray-200 bg-gray-100 px-1 py-0.5 font-mono text-[10px]">
            ,
          </kbd>{" "}
          to add ·{" "}
          <span className={keywordsAtMax ? "font-semibold text-red-500" : ""}>
            {keywords.length}/{maxKeywords}
          </span>{" "}
          keywords
        </p>
      </div>

      {/* Canonical URL */}
      <div className="space-y-1">
        <FormInput
          label="Canonical URL"
          name="canonicalUrl"
          type="url"
          className="!mb-0"
          maxLength={2048}
          showLengthCount
          limitMessage="Canonical URL must be 2048 characters or fewer."
          inputClassName="product-flat-gold-focus !h-[42px]"
          placeholder="https://yourstore.com/products/product-slug"
          value={seo.canonicalUrl || ""}
          onChange={(e) => updateSeoField("canonicalUrl", e.target.value)}
          onBlur={() => touchSeoField("canonicalUrl")}
          error={errors.canonicalUrl}
        />
        <p className="text-xs text-gray-400">
          Leave blank to use the default product URL
        </p>
      </div>

      {/* Advanced (OG) */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-[var(--admin-blue)] hover:underline"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          Social / Open Graph settings
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4 pl-4 border-l-2 border-gray-100">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  OG Title
                </label>
              </div>

              <FormInput
                label=""
                name="ogTitle"
                type="text"
                className="!mb-0"
                inputClassName="product-flat-gold-focus"
                placeholder="Title for Facebook/Twitter sharing "
                value={seo.ogTitle || ""}
                onChange={(e) => updateSeoField("ogTitle", e.target.value)}
                onBlur={() => touchSeoField("ogTitle")}
                maxLength={70}
                showLengthCount
                limitMessage="Open Graph title must be 70 characters or fewer."
                error={errors.ogTitle}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  OG Description
                </label>
              </div>

              <FormInput
                label=""
                name="ogDescription"
                type="textarea"
                rows={2}
                className="!mb-0"
                inputClassName="product-flat-gold-focus resize-none"
                placeholder="Description for social sharing"
                value={seo.ogDescription || ""}
                onChange={(e) =>
                  updateSeoField("ogDescription", e.target.value)
                }
                onBlur={() => touchSeoField("ogDescription")}
                maxLength={160}
                showLengthCount
                limitMessage="Open Graph description must be 160 characters or fewer."
                error={errors.ogDescription}
              />
            </div>
            <div className="space-y-3">
              <ImageUpload
                id="product-og-image-upload"
                label="OG Image"
                subtext="Upload an image or paste a valid HTTP/HTTPS image URL below."
                file={seo.ogImage || ""}
                onChange={onOgImageUpload}
                onRemove={onOgImageRemove}
                isLoading={ogImageUploading}
                loadingText="Uploading OG image..."
              />
              <div className="space-y-1">
               <FormInput
  label="OG Image URL"
  name="ogImage"
  type="url"
  maxLength={2048}
  limitMessage="OG Image URL must be 2048 characters or fewer."
  className="!mb-0"
  inputClassName="product-flat-gold-focus"
  placeholder="https://cdn.yourstore.com/og-image.jpg"
  value={seo.ogImage || ""}
  onPaste={(event) => {
    const pastedUrl = event.clipboardData
      ?.getData("text")
      ?.trim();

    if (!pastedUrl) return;

    if (pastedUrl.length > 2048) {
      event.preventDefault();
      setOgImagePasteError("OG Image URL must be 2048 characters or fewer.");
      return;
    }

    if (!isHttpUrl(pastedUrl)) {
      event.preventDefault();
      setOgImagePasteError(
        "Pasted image URLs must be valid HTTP/HTTPS URLs.",
      );
      return;
    }

    setOgImagePasteError("");
  }}
  onChange={(e) => {
    setOgImagePasteError("");
    updateSeoField("ogImage", e.target.value);
  }}
  onBlur={() => touchSeoField("ogImage")}
  error={ogImageError}
/>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SEOPanel;
