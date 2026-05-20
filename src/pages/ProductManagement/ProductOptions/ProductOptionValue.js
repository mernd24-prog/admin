import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getPlatformOptions,
  getPlatformOptionValues,
  createPlatformOptionValue,
  updatePlatformOptionValue,
  deletePlatformOptionValue,
  updatePlatformOption,
} from '../../../Redux/adminCoreSlice';
import Loader from '../../../components/Loader/Loader';
import Pagination from '../../../components/Pagination/Pagination';
import AddButton from '../../../components/Button/AddButton';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';

const PAGE_SIZE = 20;
const idOf = (r) => r?._id || r?.id || '';

const emptyForm = { name: '', valueCode: '', colorHex: '', imageUrl: '', sortOrder: 0, active: true };

export default function ProductOptionValue() {
  const { id: optionId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((s) => s.adminCore);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [parentOption, setParentOption] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const raw = selector?.platformOptionValuesData?.data;
  const items = Array.isArray(raw) ? raw : (raw?.list || raw?.items || []);
  const total = selector?.platformOptionValuesData?.meta?.total || raw?.total || items.length;
  const loading = selector?.loading;

  const isColorSwatch = parentOption?.displayType === 'color_swatch';
  const isThumbnail = parentOption?.displayType === 'thumbnail';

  // Load parent option info
  useEffect(() => {
    if (!optionId) return;
    dispatch(getPlatformOptions({ limit: 200 }))
      .unwrap()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.list || res?.data?.items || []);
        const found = list.find((o) => idOf(o) === optionId);
        if (found) setParentOption(found);
      })
      .catch(() => {});
  }, [dispatch, optionId]);

  const load = useCallback(() => {
    if (!optionId) return;
    dispatch(getPlatformOptionValues({ optionId, page, limit: PAGE_SIZE, q: search || undefined }));
  }, [dispatch, optionId, page, search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, sortOrder: items.length });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      valueCode: row.valueCode || '',
      colorHex: row.colorHex || '',
      imageUrl: row.imageUrl || '',
      sortOrder: row.sortOrder ?? 0,
      active: row.active !== false,
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Value name is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await dispatch(updatePlatformOptionValue({ id: idOf(editing), optionId, ...form })).unwrap();
        toast.success('Value updated');
      } else {
        await dispatch(createPlatformOptionValue({ optionId, ...form })).unwrap();
        toast.success('Value created');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deletePlatformOptionValue({ id: idOf(deleteTarget) })).unwrap();
      toast.success('Value deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  const handleToggleActive = async (row) => {
    try {
      await dispatch(updatePlatformOptionValue({ id: idOf(row), optionId, active: !row.active })).unwrap();
      toast.success(row.active ? 'Disabled' : 'Enabled');
      load();
    } catch (err) {
      toast.error(err?.message || 'Failed');
    }
  };

  // Auto-generate valueCode from name
  const handleNameChange = (value) => {
    setForm((f) => ({
      ...f,
      name: value,
      valueCode: f.valueCode || value.trim().toLowerCase().replace(/\s+/g, '_'),
    }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Loader loading={loading} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/product-options')}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Attributes
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              {parentOption?.name || 'Attribute'} Values
            </h1>
            {parentOption?.displayType && (
              <p className="text-xs text-gray-400 mt-0.5">
                Display type: <span className="font-medium capitalize">{parentOption.displayType.replace('_', ' ')}</span>
                {isColorSwatch && ' · Enter hex codes for swatches'}
                {isThumbnail && ' · Enter image URLs for thumbnails'}
              </p>
            )}
          </div>
        </div>
        <AddButton onClick={openAdd} />
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search values…"
          className="w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Values Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Value Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">
                  No values yet. Click "Add" to create the first value for this attribute.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={idOf(row)} className="hover:bg-gray-50">
                  {/* Preview */}
                  <td className="px-4 py-3">
                    {isColorSwatch && row.colorHex ? (
                      <span
                        className="inline-block w-8 h-8 rounded-full border border-gray-300 shadow-sm"
                        style={{ backgroundColor: row.colorHex }}
                        title={row.colorHex}
                      />
                    ) : isThumbnail && row.imageUrl ? (
                      <img src={row.imageUrl} alt={row.name} className="w-8 h-8 rounded object-cover border border-gray-200" />
                    ) : (
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                        {row.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.valueCode || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{row.sortOrder ?? '—'}</td>
                  <td className="px-4 py-3">
                    <ToggleButton isToggle={row.active !== false} handleClick={() => handleToggleActive(row)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(row)} className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50">
                        Edit
                      </button>
                      <button onClick={() => setDeleteTarget(row)} className="px-3 py-1 text-xs font-medium text-red-500 border border-red-200 rounded hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <Pagination totalPages={Math.ceil(total / PAGE_SIZE)} currentPage={page} onPageChange={setPage} />
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-5">
              {editing ? `Edit "${editing.name}"` : `Add value to "${parentOption?.name || 'Attribute'}"`}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value Name <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={isColorSwatch ? 'e.g. Black, Red, Navy Blue' : isThumbnail ? 'e.g. Small, Large' : 'e.g. S, M, L, XL, 128GB'}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              {/* Color Hex — shown only for color_swatch type */}
              {isColorSwatch && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color (Hex)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.colorHex || '#000000'}
                      onChange={(e) => setForm((f) => ({ ...f, colorHex: e.target.value }))}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer p-0.5"
                    />
                    <input
                      value={form.colorHex}
                      onChange={(e) => setForm((f) => ({ ...f, colorHex: e.target.value }))}
                      placeholder="#1A1919"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    {form.colorHex && (
                      <span
                        className="w-8 h-8 rounded-full border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: form.colorHex }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Image URL — shown only for thumbnail type */}
              {isThumbnail && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail Image URL</label>
                  <input
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  {form.imageUrl && (
                    <img src={form.imageUrl} alt="Preview" className="mt-2 h-12 w-12 object-cover rounded border border-gray-200" />
                  )}
                </div>
              )}

              {/* Value Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value Code</label>
                <p className="text-xs text-gray-400 mb-1">Auto-generated from name. Used in APIs and filters.</p>
                <input
                  value={form.valueCode}
                  onChange={(e) => setForm((f) => ({ ...f, valueCode: e.target.value }))}
                  placeholder="e.g. black, size_xl, 128gb"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  className="w-28 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Active */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? 'Saving…' : editing ? 'Update' : 'Add Value'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeletePopup
        isDeleteModalOpen={Boolean(deleteTarget)}
        closeDeleteModal={() => setDeleteTarget(null)}
        confirmDelete={handleDelete}
        DeleteHeading={`Delete value "${deleteTarget?.name}"?`}
      />
    </div>
  );
}
