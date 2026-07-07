import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { MdAdd, MdEdit, MdClose, MdRefresh, MdDashboardCustomize, MdCheck, MdExpandMore, MdExpandLess } from 'react-icons/md';
import { axiosPrivate as axiosProvider } from '../../../_helpers/axiosProvider';
import { PageHeader } from '../../../components/Shared';
import Loader from '../../../components/Loader/Loader';

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const CANONICAL_ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'status_change'];
const ROLE_OPTIONS = ['admin', 'sub-admin', 'seller', 'seller-admin', 'seller-sub-admin'];

const ACTION_PILL = {
  view:          'bg-blue-50 text-blue-600 border-blue-200',
  create:        'bg-green-50 text-green-600 border-green-200',
  update:        'bg-amber-50 text-amber-700 border-amber-200',
  delete:        'bg-red-50 text-red-600 border-red-200',
  status_change: 'bg-purple-50 text-purple-600 border-purple-200',
  approve:       'bg-teal-50 text-teal-600 border-teal-200',
  reject:        'bg-orange-50 text-orange-600 border-orange-200',
  assign:        'bg-indigo-50 text-indigo-600 border-indigo-200',
  export:        'bg-gray-50 text-gray-500 border-gray-200',
  import:        'bg-slate-50 text-slate-500 border-slate-200',
};

const slugify = (v = '') => String(v).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

/* ─── Small helpers ──────────────────────────────────────────────────────────── */

const groupSlugsByModule = (slugs = []) => {
  const map = {};
  slugs.forEach((slug) => {
    const [mod, action] = slug.split(':');
    if (!mod || !action) return;
    if (!map[mod]) map[mod] = [];
    if (!map[mod].includes(action)) map[mod].push(action);
  });
  return map;
};

/* ─── PermissionBuilder ──────────────────────────────────────────────────────── */
const PermissionBuilder = ({ value = [], onChange }) => {
  const [module, setModule] = useState('');
  const [picked, setPicked] = useState([]);

  const byModule = useMemo(() => groupSlugsByModule(value), [value]);
  const allMods = useMemo(() => Object.keys(byModule), [byModule]);

  const add = () => {
    const mod = module.trim().toLowerCase().replace(/\s+/g, '-');
    if (!mod || !picked.length) return;
    const newSlugs = picked.map((a) => `${mod}:${a}`).filter((s) => !value.includes(s));
    if (newSlugs.length) onChange([...value, ...newSlugs]);
    setModule('');
    setPicked([]);
  };

  const removeMod = (mod) => onChange(value.filter((s) => !s.startsWith(`${mod}:`)));

  const toggleAction = (a) =>
    setPicked((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  return (
    <div className="space-y-3">
      {/* Builder row */}
      <div className="bg-[var(--admin-surface-soft)] rounded-xl border border-[var(--admin-line)] p-3 space-y-2">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Add permissions</p>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/20"
            placeholder="Module slug (e.g. products)"
            value={module}
            onChange={(e) => setModule(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          />
          <button
            type="button"
            onClick={add}
            disabled={!module.trim() || !picked.length}
            className="px-3 py-1.5 text-sm font-medium text-white bg-[var(--admin-blue)] rounded-lg hover:bg-[#323580] disabled:opacity-40"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CANONICAL_ACTIONS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAction(a)}
              className={`px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
                picked.includes(a)
                  ? (ACTION_PILL[a] || 'bg-gray-100 text-gray-600 border-gray-300') + ' ring-1 ring-offset-0'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
              }`}
            >
              {picked.includes(a) && '✓ '}{a}
            </button>
          ))}
        </div>
      </div>

      {/* Current slugs grouped by module */}
      {allMods.length > 0 && (
        <div className="rounded-xl border border-[var(--admin-line)] overflow-hidden divide-y divide-[#f5f0e8]">
          {allMods.map((mod) => (
            <div key={mod} className="flex items-center gap-3 px-3 py-2 bg-white hover:bg-[#fafafa]">
              <span className="text-xs font-semibold text-gray-700 w-28 shrink-0 truncate">{mod}</span>
              <div className="flex flex-wrap gap-1 flex-1">
                {byModule[mod].map((action) => (
                  <span key={action} className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${ACTION_PILL[action] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {action}
                  </span>
                ))}
              </div>
              <button type="button" onClick={() => removeMod(mod)} className="p-1 text-gray-300 hover:text-red-400 shrink-0">
                <MdClose size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400">{value.length} slug{value.length !== 1 ? 's' : ''} across {allMods.length} module{allMods.length !== 1 ? 's' : ''}</p>
    </div>
  );
};

/* ─── Template Modal ────────────────────────────────────────────────────────── */
const TemplateModal = ({ template, onClose, onSave }) => {
  const isEdit = Boolean(template?.id);
  const [form, setForm] = useState({
    name: template?.name || '',
    slug: template?.slug || '',
    description: template?.description || '',
    roleScope: template?.roleScope || [],
    permissionSlugs: template?.permissionSlugs || [],
    isActive: template?.isActive !== false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.slug.trim()) errs.slug = 'Slug is required';
    if (!form.permissionSlugs.length) errs.permissionSlugs = 'Add at least one permission';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try { await onSave(form); }
    catch { /* handled by parent */ }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col border border-[var(--admin-line)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--admin-line)] bg-[var(--admin-surface-soft)] rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
              <MdDashboardCustomize size={16} className="text-teal-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">{isEdit ? 'Edit Template' : 'New Template'}</h3>
              <p className="text-[10px] text-gray-400">Permission bundle</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-gray-600 transition-colors">
            <MdClose size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Name + Slug */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Name <span className="text-red-400">*</span></label>
                <input
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/20 ${errors.name ? 'border-red-300' : 'border-gray-200'}`}
                  value={form.name}
                  onChange={(e) => { set('name', e.target.value); if (!isEdit) set('slug', slugify(e.target.value)); }}
                  maxLength={128}
                  placeholder="e.g. Catalog Manager"
                />
                {errors.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.name}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Slug <span className="text-red-400">*</span></label>
                <input
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/20 ${errors.slug ? 'border-red-300' : 'border-gray-200'}`}
                  value={form.slug}
                  onChange={(e) => set('slug', slugify(e.target.value))}
                  maxLength={128}
                  placeholder="catalog-manager"
                />
                {errors.slug && <p className="text-[10px] text-red-500 mt-0.5">{errors.slug}</p>}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
              <textarea
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/20"
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Optional — describe what this template grants"
                maxLength={500}
              />
            </div>

            {/* Role scope */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Applies to roles <span className="text-gray-400 font-normal">(empty = all roles)</span></label>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => {
                  const on = form.roleScope.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => set('roleScope', on ? form.roleScope.filter((r) => r !== role) : [...form.roleScope, role])}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        on ? 'border-[var(--admin-blue)] bg-[var(--admin-blue)]/10 text-[var(--admin-blue)]' : 'border-gray-200 text-gray-500 hover:border-[var(--admin-blue)]/40'
                      }`}
                    >
                      {on && <MdCheck size={12} />}{role}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Permissions <span className="text-red-400">*</span></label>
              <PermissionBuilder value={form.permissionSlugs} onChange={(v) => set('permissionSlugs', v)} />
              {errors.permissionSlugs && <p className="text-[10px] text-red-500 mt-1">{errors.permissionSlugs}</p>}
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set('isActive', !form.isActive)}
                className={`relative w-9 h-5 rounded-full transition-colors ${form.isActive ? 'bg-teal-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="text-xs font-medium text-gray-600">Active</span>
            </label>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex justify-end gap-2 px-5 py-4 border-t border-[var(--admin-line)] bg-[var(--admin-surface-soft)] rounded-b-2xl">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-white transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
const PermissionTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // 'all' | 'active' | 'inactive'
  const [modal, setModal] = useState(undefined);         // undefined=closed, null=new, obj=edit
  const [expanded, setExpanded] = useState(null);

  const fetch = useCallback(() => {
    setLoading(true);
    axiosProvider
      .get('/rbac/templates')
      .then((res) => {
        const raw = res.data?.data?.items || res.data?.data;
        setTemplates(Array.isArray(raw) ? raw : []);
      })
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const save = useCallback(async (form) => {
    const isEdit = Boolean(modal?.id);
    try {
      if (isEdit) {
        await axiosProvider.patch(`/rbac/templates/${modal.id}`, form);
        toast.success('Template updated');
      } else {
        await axiosProvider.post('/rbac/templates', form);
        toast.success('Template created');
      }
      setModal(undefined);
      fetch();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Save failed');
      throw err;
    }
  }, [modal, fetch]);

  const toggleActive = useCallback(async (tpl) => {
    try {
      await axiosProvider.patch(`/rbac/templates/${tpl.id}`, { isActive: !tpl.isActive });
      setTemplates((prev) => prev.map((t) => t.id === tpl.id ? { ...t, isActive: !tpl.isActive } : t));
      toast.success(tpl.isActive ? 'Deactivated' : 'Activated');
    } catch { toast.error('Failed'); }
  }, []);

  const filtered = useMemo(() => {
    let list = templates;
    if (filterActive === 'active') list = list.filter((t) => t.isActive);
    if (filterActive === 'inactive') list = list.filter((t) => !t.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.name?.toLowerCase().includes(q) || t.slug?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, filterActive, search]);

  const stats = useMemo(() => ({
    total: templates.length,
    active: templates.filter((t) => t.isActive).length,
  }), [templates]);

  return (
    <div className="min-h-screen bg-[#f8f5f0] p-6">
      <Loader loading={loading} />

      <PageHeader
        title="Permission Templates"
        subtitle="Reusable permission bundles — apply to any user in one click"
        breadcrumbs={[{ label: 'Users & Access' }, { label: 'Permission Templates' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetch}
              title="Refresh"

            >
              <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setModal(null)}

            >
              <MdAdd size={16} />
              New Template
            </button>
          </div>
        }
      />

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <span className="font-semibold text-gray-800">{stats.total}</span> total
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
          <span className="font-semibold text-gray-800">{stats.active}</span> active
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Filter pills */}
          {['all', 'active', 'inactive'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filterActive === f ? 'bg-[var(--admin-blue)] text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          {/* Search */}
          <input
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/20 w-36"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <MdDashboardCustomize size={40} className="mb-3 text-gray-200" />
          <p className="text-sm font-medium">{search || filterActive !== 'all' ? 'No templates match' : 'No templates yet'}</p>
          {!search && filterActive === 'all' && (
            <button onClick={() => setModal(null)} className="mt-3 text-sm text-[var(--admin-blue)] hover:underline">
              Create your first template →
            </button>
          )}
        </div>
      )}

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((tpl) => {
          const byMod = groupSlugsByModule(tpl.permissionSlugs || []);
          const isExpanded = expanded === tpl.id;
          const modCount = Object.keys(byMod).length;

          return (
            <div
              key={tpl.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                tpl.isActive ? 'border-[#d8e3f3]' : 'border-gray-200 opacity-70'
              }`}
            >
              {/* Card header */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-800 truncate">{tpl.name}</h4>
                      {!tpl.isActive && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Off</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{tpl.slug}</p>
                    {tpl.description && (
                      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{tpl.description}</p>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      title={tpl.isActive ? 'Deactivate' : 'Activate'}
                      onClick={() => toggleActive(tpl)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        tpl.isActive ? 'text-teal-400 hover:text-teal-600 hover:bg-teal-50' : 'text-gray-300 hover:text-teal-400 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${tpl.isActive ? 'bg-teal-400' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${tpl.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                    </button>
                    <button
                      title="Edit"
                      onClick={() => setModal(tpl)}
                      className="p-1.5 text-gray-400 hover:text-[var(--admin-blue)] rounded-lg hover:bg-[var(--admin-blue-soft)] transition-colors"
                    >
                      <MdEdit size={15} />
                    </button>
                  </div>
                </div>

                {/* Role scope tags */}
                {(tpl.roleScope || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tpl.roleScope.map((role) => (
                      <span key={role} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--admin-blue)]/10 text-[var(--admin-blue)] font-medium capitalize">
                        {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 bg-[var(--admin-surface-soft)] border-t border-[var(--admin-line)] flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span><b className="text-gray-700">{(tpl.permissionSlugs || []).length}</b> permissions</span>
                  <span><b className="text-gray-700">{modCount}</b> module{modCount !== 1 ? 's' : ''}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : tpl.id)}
                  className="flex items-center gap-1 text-[11px] font-medium text-[var(--admin-blue)] hover:underline"
                >
                  {isExpanded ? 'Hide' : 'Breakdown'}
                  {isExpanded ? <MdExpandLess size={14} /> : <MdExpandMore size={14} />}
                </button>
              </div>

              {/* Module breakdown (expandable) */}
              {isExpanded && (
                <div className="px-4 py-3 border-t border-[var(--admin-line)] space-y-2 bg-white">
                  {Object.entries(byMod).map(([mod, actions]) => (
                    <div key={mod} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-600 w-24 shrink-0 truncate">{mod}</span>
                      <div className="flex flex-wrap gap-1">
                        {actions.map((action) => (
                          <span key={action} className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize ${ACTION_PILL[action] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                            {action.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create / Edit modal */}
      {modal !== undefined && (
        <TemplateModal template={modal} onClose={() => setModal(undefined)} onSave={save} />
      )}
    </div>
  );
};

export default PermissionTemplates;
