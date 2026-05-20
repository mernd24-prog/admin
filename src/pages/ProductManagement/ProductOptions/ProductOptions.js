import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getPlatformOptions,
  createPlatformOption,
  updatePlatformOption,
  deletePlatformOption,
} from '../../../Redux/adminCoreSlice';
import Loader from '../../../components/Loader/Loader';
import Pagination from '../../../components/Pagination/Pagination';
import AddButton from '../../../components/Button/AddButton';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';

const PAGE_SIZE = 15;

const DISPLAY_TYPE_META = {
  button:       { label: 'Button',       color: 'bg-blue-100 text-blue-700' },
  dropdown:     { label: 'Dropdown',     color: 'bg-gray-100 text-gray-600' },
  color_swatch: { label: 'Color Swatch', color: 'bg-pink-100 text-pink-700' },
  radio:        { label: 'Radio',        color: 'bg-purple-100 text-purple-700' },
  thumbnail:    { label: 'Thumbnail',    color: 'bg-yellow-100 text-yellow-700' },
};

const DISPLAY_TYPES = Object.entries(DISPLAY_TYPE_META).map(([value, meta]) => ({ value, label: meta.label }));

const emptyForm = { name: '', displayType: 'button', description: '', active: true };

const idOf = (r) => r?._id || r?.id || '';

export default function ProductOptions() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((s) => s.adminCore);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const raw = selector?.platformOptionsData?.data;
  const items = Array.isArray(raw) ? raw : (raw?.list || raw?.items || []);
  const total = selector?.platformOptionsData?.meta?.total || raw?.total || items.length;
  const loading = selector?.loading;

  const load = useCallback(() => {
    dispatch(getPlatformOptions({ page, limit: PAGE_SIZE, q: search || undefined }));
  }, [dispatch, page, search]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ name: row.name || '', displayType: row.displayType || 'button', description: row.description || '', active: row.active !== false });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await dispatch(updatePlatformOption({ id: idOf(editing), ...form })).unwrap();
        toast.success('Attribute updated');
      } else {
        await dispatch(createPlatformOption(form)).unwrap();
        toast.success('Attribute created');
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
      await dispatch(deletePlatformOption({ id: idOf(deleteTarget) })).unwrap();
      toast.success('Attribute deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  const handleToggleActive = async (row) => {
    try {
      await dispatch(updatePlatformOption({ id: idOf(row), active: !row.active })).unwrap();
      toast.success(row.active ? 'Disabled' : 'Enabled');
      load();
    } catch (err) {
      toast.error(err?.message || 'Failed');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <Loader loading={loading} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Product Attributes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Define attributes like Color, Size, RAM, Material — and their selectable values.
          </p>
        </div>
        <AddButton onClick={openAdd} />
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search attributes…"
          className="w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Attribute Name', 'Display Type', 'Description', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-sm text-gray-400">
                  No attributes yet. Click "Add" to create your first one.
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const dtMeta = DISPLAY_TYPE_META[row.displayType] || DISPLAY_TYPE_META.button;
                return (
                  <tr key={idOf(row)} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{row.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${dtMeta.color}`}>
                        {dtMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
                      {row.description || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ToggleButton
                        isToggle={row.active !== false}
                        handleClick={() => handleToggleActive(row)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/product-option-value/${idOf(row)}`)}
                          className="px-3 py-1 text-xs font-medium text-green-600 border border-green-200 rounded hover:bg-green-50"
                        >
                          Manage Values →
                        </button>
                        <button
                          onClick={() => openEdit(row)}
                          className="px-3 py-1 text-xs font-medium text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(row)}
                          className="px-3 py-1 text-xs font-medium text-red-500 border border-red-200 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
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
              {editing ? 'Edit Attribute' : 'New Attribute'}
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attribute Name <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Color, Size, RAM, Material"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
              </div>

              {/* Display Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Type</label>
                <p className="text-xs text-gray-400 mb-2">How this attribute appears to customers on the product page</p>
                <div className="grid grid-cols-2 gap-2">
                  {DISPLAY_TYPES.map((dt) => (
                    <button
                      key={dt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, displayType: dt.value }))}
                      className={`px-3 py-2 text-sm rounded-lg border text-left transition-colors ${
                        form.displayType === dt.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {dt.value === 'button' && '⬜ '}
                      {dt.value === 'dropdown' && '▾ '}
                      {dt.value === 'color_swatch' && '🎨 '}
                      {dt.value === 'radio' && '◉ '}
                      {dt.value === 'thumbnail' && '🖼 '}
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Available color options for this product"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                <span className="text-sm text-gray-700">Active (visible to sellers)</span>
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
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      <DeletePopup
        isDeleteModalOpen={Boolean(deleteTarget)}
        closeDeleteModal={() => setDeleteTarget(null)}
        confirmDelete={handleDelete}
        DeleteHeading={`Delete "${deleteTarget?.name}"?`}
      />
    </div>
  );
}
