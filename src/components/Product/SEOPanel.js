import React, { useState } from 'react';

const CharCount = ({ value = '', max }) => {
  const len = String(value).length;
  const isOver = len > max;
  return (
    <span className={`text-xs ${isOver ? 'text-red-500' : 'text-gray-400'}`}>
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
const SEOPanel = ({ seo = {}, onChange, slug = '' }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');

  const handleKeywordAdd = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && keywordInput.trim()) {
      e.preventDefault();
      const existing = Array.isArray(seo.keywords) ? seo.keywords : [];
      if (!existing.includes(keywordInput.trim())) {
        onChange('seo.keywords', [...existing, keywordInput.trim()]);
      }
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw) => {
    onChange('seo.keywords', (seo.keywords || []).filter((k) => k !== kw));
  };

  const metaPreviewTitle = seo.metaTitle || 'Your Product Title';
  const metaPreviewDesc = seo.metaDescription || 'Your product description will appear here in Google search results.';
  const metaPreviewUrl = slug ? `yourstore.com/products/${slug}` : 'yourstore.com/products/product-slug';

  return (
    <div className="space-y-5">
      {/* Google preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Google Search Preview</p>
        <div className="space-y-1">
          <p className="text-xs text-green-700">{metaPreviewUrl}</p>
          <p className="text-base text-blue-600 hover:underline cursor-pointer leading-tight">
            {metaPreviewTitle.slice(0, 70)}
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">{metaPreviewDesc.slice(0, 160)}</p>
        </div>
      </div>

      {/* Meta title */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Meta Title</label>
          <CharCount value={seo.metaTitle} max={70} />
        </div>
        <input
          type="text"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
          placeholder="Compelling title for search engines (max 70 chars)"
          value={seo.metaTitle || ''}
          onChange={(e) => onChange('seo.metaTitle', e.target.value)}
          maxLength={70}
        />
      </div>

      {/* Meta description */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Meta Description</label>
          <CharCount value={seo.metaDescription} max={160} />
        </div>
        <textarea
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)] resize-none"
          placeholder="Summary shown in search results (max 160 chars)"
          value={seo.metaDescription || ''}
          onChange={(e) => onChange('seo.metaDescription', e.target.value)}
          maxLength={160}
        />
      </div>

      {/* Keywords */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Keywords</label>
        <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-md min-h-[42px] focus-within:ring-2 focus-within:ring-[var(--admin-blue)]">
          {(seo.keywords || []).map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--admin-blue)]/10 text-[var(--admin-blue)] text-xs rounded-full"
            >
              {kw}
              <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-red-500">×</button>
            </span>
          ))}
          <input
            type="text"
            className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
            placeholder="Type keyword + Enter"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordAdd}
          />
        </div>
        <p className="text-xs text-gray-400">Press Enter or comma to add a keyword</p>
      </div>

      {/* Canonical URL */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Canonical URL</label>
        <input
          type="url"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
          placeholder="https://yourstore.com/products/product-slug"
          value={seo.canonicalUrl || ''}
          onChange={(e) => onChange('seo.canonicalUrl', e.target.value)}
        />
        <p className="text-xs text-gray-400">Leave blank to use the default product URL</p>
      </div>

      {/* Advanced (OG) */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-[var(--admin-blue)] hover:underline"
        >
          <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Social / Open Graph settings
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4 pl-4 border-l-2 border-gray-100">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">OG Title</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
                placeholder="Title for Facebook/Twitter (defaults to meta title)"
                value={seo.ogTitle || ''}
                onChange={(e) => onChange('seo.ogTitle', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">OG Description</label>
              <textarea
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)] resize-none"
                placeholder="Description for social sharing"
                value={seo.ogDescription || ''}
                onChange={(e) => onChange('seo.ogDescription', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">OG Image URL</label>
              <input
                type="url"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
                placeholder="https://cdn.yourstore.com/og-image.jpg"
                value={seo.ogImage || ''}
                onChange={(e) => onChange('seo.ogImage', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SEOPanel;
