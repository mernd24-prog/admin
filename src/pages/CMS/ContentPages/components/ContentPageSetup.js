import React, { useEffect, useRef, useState } from 'react';
import { RxCross2 } from 'react-icons/rx';
import { toast } from 'sonner';
import { TextEditor } from '../../../../components/Atoms/FormInput/TextEditor';
import { uploadFile } from '../../../../_helpers/globalFunctions';

const INITIAL = {
  slug: '',
  title: '',
  pageType: '',
  body: '',
  description: '',
  coverImage: '',
  points: [],
  language: 'en',
  published: false,
};

const ContentPageSetup = (props = {}) => {
  const {
    isOpen,
    onClose,
    onSubmit,
    initialData = null,
    pageType = '',
    lockedFields = [],
    bodyHint = 'Write the page body here.',
    isLoading = false,
  } = props || {};
  const [form, setForm] = useState({ ...INITIAL });
  const [errors, setErrors] = useState({});
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPointIndex, setUploadingPointIndex] = useState(null);
  const coverInputRef = useRef(null);
  const pointInputRefs = useRef({});

  const safeLockedFields = Array.isArray(lockedFields) ? lockedFields : [];
  const isLocked = (field) => safeLockedFields.includes(field);

  useEffect(() => {
    if (isOpen) {
      const source = initialData && typeof initialData === 'object' ? initialData : null;
      if (source) {
        setForm({
          slug: source?.slug || '',
          title: source?.title || '',
          pageType: source?.pageType || pageType || '',
          body: source?.body || '',
          description: source?.description || '',
          coverImage: source?.coverImage || '',
          points: Array.isArray(source?.points)
            ? source.points.map((p) => ({
                title: p?.title || '',
                description: p?.description || '',
                image: p?.image || '',
              }))
            : [],
          language: source?.language || 'en',
          published: Boolean(source?.published),
        });
      } else {
        setForm({ ...INITIAL, pageType: pageType || '' });
      }
      setErrors({});
    }
  }, [isOpen, initialData, pageType]);

  const validate = () => {
    const current = form && typeof form === 'object' ? form : INITIAL;
    const e = {};
    if (!String(current.title || '').trim()) e.title = 'Title is required';
    if (!String(current.slug || '').trim()) e.slug = 'Slug is required';
    else if (!/^[a-z0-9-]+$/.test(current.slug)) e.slug = 'Slug must be lowercase letters, numbers, and hyphens only';
    if (!String(current.pageType || '').trim()) e.pageType = 'Page type is required';
    return e;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if ((errors && typeof errors === 'object' ? errors[name] : undefined)) {
      setErrors((prev) => ({ ...(prev && typeof prev === 'object' ? prev : {}), [name]: '' }));
    }
  };

  const handleSlugify = () => {
    const current = form && typeof form === 'object' ? form : INITIAL;
    if (!isLocked('slug') && current.title && !current.slug) {
      const slug = current.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setForm((prev) => ({ ...prev, slug }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const current = form && typeof form === 'object' ? form : INITIAL;
    const sanitizedPoints = (Array.isArray(current.points) ? current.points : [])
      .map((p) => ({
        title: String(p?.title || '').trim(),
        description: String(p?.description || '').trim(),
        image: String(p?.image || '').trim(),
      }))
      .filter((p) => p.title || p.description || p.image)
      .filter((p) => p.title);
    const payload = { ...current, points: sanitizedPoints };
    if (typeof onSubmit === 'function') onSubmit(payload);
  };

  const updatePoint = (index, key, value) => {
    setForm((prev) => {
      const base = prev && typeof prev === 'object' ? prev : INITIAL;
      const points = Array.isArray(base.points) ? [...base.points] : [];
      points[index] = { ...(points[index] || { title: '', description: '', image: '' }), [key]: value };
      return { ...base, points };
    });
  };

  const addPoint = () => {
    setForm((prev) => {
      const base = prev && typeof prev === 'object' ? prev : INITIAL;
      const points = Array.isArray(base.points) ? [...base.points] : [];
      points.push({ title: '', description: '', image: '' });
      return { ...base, points };
    });
  };

  const removePoint = (index) => {
    setForm((prev) => {
      const base = prev && typeof prev === 'object' ? prev : INITIAL;
      const points = (Array.isArray(base.points) ? base.points : []).filter((_, i) => i !== index);
      return { ...base, points };
    });
  };

  const isValidImage = (file) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!file) return false;
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, WEBP files are allowed');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5MB');
      return false;
    }
    return true;
  };

  const handleCoverUpload = async (event) => {
    const file = event?.target?.files?.[0];
    if (!isValidImage(file)) return;
    try {
      setUploadingCover(true);
      const imageUrl = await uploadFile(file, 'CMS');
      setForm((prev) => ({ ...(prev && typeof prev === 'object' ? prev : INITIAL), coverImage: imageUrl }));
      toast.success('Cover image uploaded');
    } catch (err) {
      toast.error(err?.message || 'Cover image upload failed');
    } finally {
      setUploadingCover(false);
      if (event?.target) event.target.value = '';
    }
  };

  const handlePointUpload = async (index, event) => {
    const file = event?.target?.files?.[0];
    if (!isValidImage(file)) return;
    try {
      setUploadingPointIndex(index);
      const imageUrl = await uploadFile(file, 'CMS');
      updatePoint(index, 'image', imageUrl);
      toast.success('Point image uploaded');
    } catch (err) {
      toast.error(err?.message || 'Point image upload failed');
    } finally {
      setUploadingPointIndex(null);
      if (event?.target) event.target.value = '';
    }
  };

  if (!isOpen) return null;

  const safeForm = form && typeof form === 'object' ? form : INITIAL;
  const safeErrors = errors && typeof errors === 'object' ? errors : {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {initialData ? 'Edit Page' : 'Add Page'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <RxCross2 size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Title *</label>
            <input
              name="title"
              value={safeForm.title || ''}
              onChange={handleChange}
              onBlur={handleSlugify}
              placeholder="Page title"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 ${safeErrors.title ? 'border-red-400' : 'border-gray-300'}`}
            />
            {safeErrors.title && <p className="mt-1 text-xs text-red-500">{safeErrors.title}</p>}
          </div>

          {/* Slug */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Slug *</label>
            <input
              name="slug"
              value={safeForm.slug || ''}
              onChange={handleChange}
              placeholder="page-slug"
              disabled={isLocked('slug')}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isLocked('slug') ? 'bg-amber-50 border-amber-300 text-amber-700 cursor-not-allowed' : safeErrors.slug ? 'border-red-400' : 'border-gray-300'}`}
            />
            {isLocked('slug') && (
              <p className="mt-1 text-xs text-amber-600">Slug is locked — changing it would break the customer page that fetches this content.</p>
            )}
            {safeErrors.slug && <p className="mt-1 text-xs text-red-500">{safeErrors.slug}</p>}
          </div>

          {/* Page Type */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Page Type *</label>
            <input
              name="pageType"
              value={safeForm.pageType || ''}
              onChange={handleChange}
              placeholder="content-type"
              disabled={isLocked('pageType')}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 ${isLocked('pageType') ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' : safeErrors.pageType ? 'border-red-400' : 'border-gray-300'}`}
            />
            {safeErrors.pageType && <p className="mt-1 text-xs text-red-500">{safeErrors.pageType}</p>}
          </div>

          {/* Body */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Body</label>
            <TextEditor
              value={safeForm.body || ''}
              onChange={(content) => setForm((prev) => ({ ...(prev && typeof prev === 'object' ? prev : INITIAL), body: content }))}
              placeholder={bodyHint}
              height="220px"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={safeForm.description || ''}
              onChange={handleChange}
              placeholder="Short summary"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Cover Image URL</label>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 disabled:opacity-60"
              >
                {uploadingCover ? 'Uploading...' : 'Upload Image'}
              </button>
              <input ref={coverInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleCoverUpload} />
            </div>
            <input
              name="coverImage"
              value={safeForm.coverImage || ''}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {safeForm.coverImage ? (
              <img src={safeForm.coverImage} alt="cover-preview" className="w-28 h-16 mt-2 object-cover border border-gray-200 rounded" />
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Points</label>
              <button type="button" onClick={addPoint} className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50">Add Point</button>
            </div>
            <div className="space-y-2">
              {(Array.isArray(safeForm.points) ? safeForm.points : []).map((p, idx) => (
                <div key={`point-${idx}`} className="p-3 border border-gray-200 rounded-lg space-y-2">
                  <input
                    value={p?.title || ''}
                    onChange={(e) => updatePoint(idx, 'title', e.target.value)}
                    placeholder="Point title"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                  <textarea
                    value={p?.description || ''}
                    onChange={(e) => updatePoint(idx, 'description', e.target.value)}
                    placeholder="Point description"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                  <input
                    value={p?.image || ''}
                    onChange={(e) => updatePoint(idx, 'image', e.target.value)}
                    placeholder="Point image URL"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => pointInputRefs.current[idx]?.click()}
                      disabled={uploadingPointIndex === idx}
                      className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 disabled:opacity-60"
                    >
                      {uploadingPointIndex === idx ? 'Uploading...' : 'Upload Point Image'}
                    </button>
                    <input
                      ref={(el) => { pointInputRefs.current[idx] = el; }}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handlePointUpload(idx, e)}
                    />
                  </div>
                  {p?.image ? <img src={p.image} alt={`point-${idx}`} className="w-24 h-14 object-cover border border-gray-200 rounded" /> : null}
                  <div className="text-right">
                    <button type="button" onClick={() => removePoint(idx)} className="px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Language + Published */}
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <label className="block mb-1 text-sm font-medium text-gray-700">Language</label>
              <select
                name="language"
                value={safeForm.language || 'en'}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
              </select>
            </div>
            <label className="flex items-center gap-2 mt-5 cursor-pointer select-none">
              <input
                type="checkbox"
                name="published"
                checked={Boolean(safeForm.published)}
                onChange={handleChange}
                className="w-4 h-4 accent-indigo-600"
              />
              <span className="text-sm font-medium text-gray-700">Published</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => (typeof onClose === 'function' ? onClose() : null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
            >
              {isLoading ? 'Saving...' : initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentPageSetup;
