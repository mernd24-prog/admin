import React, { useState } from "react";
import {
  FiGlobe,
  FiMonitor,
  FiSmartphone,
  FiMoreVertical,
} from "react-icons/fi";

const CharCount = ({ value = "", max }) => {
  const len = String(value).length;
  const isOver = len > max;
  return (
    <span className={`text-xs ${isOver ? "text-red-500" : "text-gray-400"}`}>
      {len}/{max}
    </span>
  );
};

/**
 * SEO metadata panel.
 *
 * Props:
 *  seo      - { metaTitle, metaDescription, keywords, canonicalUrl, ogTitle, ogDescription, ogImage }
 *  onChange - (field, value) => void
 *  slug     - string (product slug, read-only)
 */
const SEOPanel = ({ seo = {}, onChange, slug = "" }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");
  const [previewMode, setPreviewMode] = useState("desktop");

  const handleKeywordAdd = (e) => {
    if ((e.key === "Enter" || e.key === ",") && keywordInput.trim()) {
      e.preventDefault();
      const existing = Array.isArray(seo.keywords) ? seo.keywords : [];
      if (!existing.includes(keywordInput.trim())) {
        onChange("seo.keywords", [...existing, keywordInput.trim()]);
      }
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw) => {
    onChange(
      "seo.keywords",
      (seo.keywords || []).filter((k) => k !== kw),
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/50 px-4 py-2 text-[11px] text-gray-500">
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
        </div>
      </div>

      {/* Meta title */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Meta Title
          </label>
          <CharCount value={seo.metaTitle} max={70} />
        </div>
        <input
          type="text"
          className="admin-input product-flat-gold-focus !h-[42px]"
          placeholder="Compelling title for search engines (max 70 chars)"
          value={seo.metaTitle || ""}
          onChange={(e) => onChange("seo.metaTitle", e.target.value)}
          maxLength={70}
        />
      </div>

      {/* Meta description */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Meta Description
          </label>
          <CharCount value={seo.metaDescription} max={160} />
        </div>
        <textarea
          rows={3}
          className="admin-input product-flat-gold-focus !h-[64px] resize-none !pt-4"
          placeholder="Summary shown in search results (max 160 chars)"
          value={seo.metaDescription || ""}
          onChange={(e) => onChange("seo.metaDescription", e.target.value)}
          maxLength={160}
        />
      </div>

      {/* Keywords */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Keywords</label>
        <div className="admin-input flex min-h-[42px] flex-wrap gap-1.5 rounded-md border border-gray-300 p-2 transition-colors focus-within:border-[var(--admin-gold)]">
          {(seo.keywords || []).map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--admin-blue)]/10 text-[var(--admin-blue)] text-xs rounded-full"
            >
              {kw}
              <button
                type="button"
                onClick={() => removeKeyword(kw)}
                className="hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            className="product-tag-input min-w-[120px] flex-1 text-sm"
            placeholder="Type keyword + Enter"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordAdd}
          />
        </div>
        <p className="text-xs text-gray-400">
          Press Enter or comma to add a keyword
        </p>
      </div>

      {/* Canonical URL */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">
          Canonical URL
        </label>
        <input
          type="url"
          className="admin-input product-flat-gold-focus !h-[42px]"
          placeholder="https://yourstore.com/products/product-slug"
          value={seo.canonicalUrl || ""}
          onChange={(e) => onChange("seo.canonicalUrl", e.target.value)}
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
              <label className="text-sm font-medium text-gray-700">
                OG Title
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
                placeholder="Title for Facebook/Twitter (defaults to meta title)"
                value={seo.ogTitle || ""}
                onChange={(e) => onChange("seo.ogTitle", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                OG Description
              </label>
              <textarea
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)] resize-none"
                placeholder="Description for social sharing"
                value={seo.ogDescription || ""}
                onChange={(e) => onChange("seo.ogDescription", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                OG Image URL
              </label>
              <input
                type="url"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
                placeholder="https://cdn.yourstore.com/og-image.jpg"
                value={seo.ogImage || ""}
                onChange={(e) => onChange("seo.ogImage", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SEOPanel;
