import React from 'react';
import useDropdownOptions from '../../hooks/useDropdownOptions';

const Field = ({ label, hint, children }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

/**
 * Digital product configuration panel.
 *
 * Props:
 *  digital  - object matching the digital sub-schema
 *  onChange - (field, value) => void  (field = 'digital.xxx')
 */
const DigitalProductPanel = ({ digital = {}, onChange }) => {
  const fileTypes = useDropdownOptions('digital-file-types');
  const licenseTypes = useDropdownOptions('digital-license-types');
  const set = (key, val) => onChange(`digital.${key}`, val);

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700 font-medium">Digital Product</p>
        <p className="text-xs text-blue-600 mt-0.5">
          Customers receive a download link or license key after purchase. No physical shipping.
        </p>
      </div>

      {/* File URL */}
      <Field label="Download File URL *" hint="Direct link to the file or a signed CDN URL. Customers get this after payment.">
        <input
          type="url"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
          placeholder="https://cdn.yourstore.com/files/product.zip"
          value={digital.fileUrl || ''}
          onChange={(e) => set('fileUrl', e.target.value)}
        />
      </Field>

      {/* Preview URL */}
      <Field label="Preview / Sample URL" hint="Free sample or preview version (optional).">
        <input
          type="url"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
          placeholder="https://cdn.yourstore.com/previews/sample.pdf"
          value={digital.previewUrl || ''}
          onChange={(e) => set('previewUrl', e.target.value)}
        />
      </Field>

      {/* File type + size row */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="File Type">
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
            value={digital.fileType || ''}
            onChange={(e) => set('fileType', e.target.value)}
          >
            <option value="">Select type…</option>
            {fileTypes.options.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>

        <Field label="File Size (MB)" hint="Shown to customers before download.">
          <input
            type="number"
            min={0}
            step={0.1}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
            placeholder="e.g. 24.5"
            value={digital.fileSize || ''}
            onChange={(e) => set('fileSize', Number(e.target.value))}
          />
        </Field>
      </div>

      {/* Download limit + expiry row */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Download Limit" hint="0 or blank = unlimited.">
          <input
            type="number"
            min={0}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
            placeholder="e.g. 3"
            value={digital.downloadLimit || ''}
            onChange={(e) => set('downloadLimit', Number(e.target.value) || 0)}
          />
        </Field>

        <Field label="Link Expiry (days)" hint="0 or blank = never expires.">
          <input
            type="number"
            min={0}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
            placeholder="e.g. 30"
            value={digital.expiryDays || ''}
            onChange={(e) => set('expiryDays', Number(e.target.value) || 0)}
          />
        </Field>
      </div>

      {/* License type */}
      <Field label="License Type">
        <select
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
          value={digital.licenseType || 'single_use'}
          onChange={(e) => set('licenseType', e.target.value)}
        >
          {licenseTypes.options.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </Field>

      {/* Access control */}
      <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <input
          id="requiresAuth"
          type="checkbox"
          className="mt-0.5 accent-[var(--admin-blue)]"
          checked={!!digital.requiresAuth}
          onChange={(e) => set('requiresAuth', e.target.checked)}
        />
        <div>
          <label htmlFor="requiresAuth" className="text-sm font-medium text-gray-700 cursor-pointer">
            Require account login to download
          </label>
          <p className="text-xs text-gray-400 mt-0.5">
            Customers must be signed in to access the file. Recommended for premium content.
          </p>
        </div>
      </div>

      {/* Version + changelog */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Version" hint="e.g. 2.1.0">
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
            placeholder="1.0.0"
            value={digital.version || ''}
            onChange={(e) => set('version', e.target.value)}
          />
        </Field>

        <Field label="Platform / Compatibility" hint="e.g. Windows, macOS, iOS">
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]"
            placeholder="All platforms"
            value={digital.platform || ''}
            onChange={(e) => set('platform', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Changelog / Release Notes">
        <textarea
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)] resize-none"
          placeholder="What's new in this version…"
          value={digital.changelog || ''}
          onChange={(e) => set('changelog', e.target.value)}
        />
      </Field>
    </div>
  );
};

export default DigitalProductPanel;
