import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MdSecurity, MdAdd, MdEdit, MdCheck, MdExpandMore, MdExpandLess,
  MdLock, MdRefresh, MdPerson, MdGroups, MdInfo, MdArrowRightAlt,
} from 'react-icons/md';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../../components/Shared';
import PermissionGuard from '../../../components/Atoms/PermissionGuard/PermissionGuard';
import { usePermission, ACTIONS, ROLES } from '../../../_helpers/usePermission';
import { axiosPrivate as axiosProvider } from '../../../_helpers/axiosProvider';
import { toast } from 'sonner';

/* ─── Constants ──────────────────────────────────────────────────────────── */

const ROLE_META = {
  'super-admin':      { color: 'bg-purple-100 text-purple-700 border-purple-200', model: 'unrestricted', label: 'Super Admin',       desc: 'Bypasses all permission checks' },
  'admin':            { color: 'bg-blue-100 text-[var(--admin-blue)] border-blue-200',      model: 'per-user',     label: 'Admin',             desc: 'Permissions set individually per admin' },
  'sub-admin':        { color: 'bg-indigo-100 text-indigo-600 border-indigo-200', model: 'per-user',     label: 'Sub Admin',         desc: 'Permissions set individually per sub-admin' },
  'seller':           { color: 'bg-amber-100 text-amber-700 border-amber-200',    model: 'role-wide',    label: 'Seller',            desc: 'All sellers share these permissions' },
  'seller-admin':     { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', model: 'per-user',     label: 'Seller Admin',      desc: 'Permissions set individually per seller admin' },
  'seller-sub-admin': { color: 'bg-gray-100 text-gray-600 border-gray-200',       model: 'per-user',     label: 'Seller Sub Admin',  desc: 'Permissions set individually' },
  'buyer':            { color: 'bg-green-100 text-green-700 border-green-200',    model: 'no-access',    label: 'Buyer',             desc: 'Customer account — no admin panel access' },
};

const MODEL_BADGE = {
  'unrestricted': 'bg-purple-50 text-purple-600 border-purple-200',
  'role-wide':    'bg-teal-50 text-teal-600 border-teal-200',
  'per-user':     'bg-blue-50 text-blue-600 border-blue-200',
  'no-access':    'bg-gray-50 text-gray-400 border-gray-200',
  'custom':       'bg-orange-50 text-orange-600 border-orange-200',
};
const MODEL_LABEL = {
  'unrestricted': 'Unrestricted',
  'role-wide':    'Role-Wide',
  'per-user':     'Per-User',
  'no-access':    'No Access',
  'custom':       'Custom Role',
};

const STANDARD_SLUGS = Object.values(ROLES);
const ALL_ACTIONS = ['view', 'create', 'update', 'delete', 'status_change', 'approve', 'reject', 'assign', 'export', 'import'];
const ACTION_ALIASES = { add: 'create', edit: 'update', status: 'status_change', approval: 'approve', action: 'status_change', review: 'approve', manage: 'status_change' };
const ACTION_LABELS  = { status_change: 'Status', create: 'Create', update: 'Update', delete: 'Delete', approve: 'Approve', reject: 'Reject', export: 'Export', import: 'Import', assign: 'Assign', view: 'View' };

const normalizeAction = (a = '') => { const v = String(a).trim().toLowerCase(); return ACTION_ALIASES[v] || v; };

/* ─── Permission Matrix ──────────────────────────────────────────────────── */
const PermissionMatrix = ({ modules = [], matrixState = {}, permissionMap = {}, onChange, readOnly = false }) => {
  const [expanded, setExpanded] = useState(true);

  const visibleActions = useMemo(() => {
    const used = new Set();
    modules.forEach((mod) => {
      (mod.permissions || []).forEach((p) => {
        const n = normalizeAction(p.action);
        if (p.id && ALL_ACTIONS.includes(n)) used.add(n);
      });
    });
    return ALL_ACTIONS.filter((a) => used.has(a));
  }, [modules]);

  const toggleAll = (modSlug, checked) => {
    visibleActions.forEach((action) => {
      const perm = permissionMap[modSlug]?.[action];
      if (perm) onChange?.(perm.id, checked, modSlug, action);
    });
  };

  const allChecked = (modSlug) =>
    visibleActions.every((a) => { const perm = permissionMap[modSlug]?.[a]; return !perm || matrixState[perm.id] === true; });

  if (!modules.length) {
    return (
      <div className="bg-white rounded-xl border border-[var(--admin-line)] shadow-sm p-10 text-center">
        <MdSecurity size={40} className="mx-auto mb-3 text-[var(--admin-line)]" />
        <p className="text-sm text-gray-400 font-medium">No modules found in database.</p>
        <p className="text-xs text-gray-300 mt-1">Run <code className="font-mono bg-gray-100 px-1 rounded">node scripts/db/seed-rbac.js</code> to populate.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--admin-line)] shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3 border-b border-[var(--admin-line)] hover:bg-[var(--admin-surface-soft)] transition-colors"
        onClick={() => setExpanded((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Permission Matrix</span>
          <span className="text-xs text-gray-400">({modules.length} modules, {visibleActions.length} actions)</span>
        </div>
        {expanded ? <MdExpandLess size={18} className="text-gray-400" /> : <MdExpandMore size={18} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--admin-surface-soft)] border-b border-[var(--admin-line)]">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide w-44 sticky left-0 bg-[var(--admin-surface-soft)]">Module</th>
                {visibleActions.map((a) => (
                  <th key={a} className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {ACTION_LABELS[a] || a.replace('_', ' ')}
                  </th>
                ))}
                {!readOnly && <th className="px-3 py-2.5 text-center text-gray-400 font-semibold uppercase tracking-wide w-12">All</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7efde]">
              {modules.map((mod) => (
                <tr key={mod.id || mod.slug} className="hover:bg-[var(--admin-surface-soft)]/60 transition-colors">
                  <td className="px-4 py-2.5 sticky left-0 bg-white">
                    <span className="font-medium text-gray-700 text-xs">{mod.moduleName || mod.name}</span>
                    <span className="block text-[10px] text-gray-400 font-mono">{mod.moduleKey || mod.slug}</span>
                  </td>
                  {visibleActions.map((action) => {
                    const perm = permissionMap[mod.slug || mod.moduleKey]?.[action];
                    const isChecked = perm ? (matrixState[perm.id] ?? perm.assigned ?? false) : false;
                    return (
                      <td key={action} className="px-3 py-2.5 text-center">
                        {perm ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={readOnly}
                            onChange={(e) => onChange?.(perm.id, e.target.checked, mod.slug || mod.moduleKey, action)}
                            className="w-4 h-4 accent-[var(--admin-blue)] cursor-pointer disabled:cursor-default rounded"
                          />
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    );
                  })}
                  {!readOnly && (
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={allChecked(mod.slug || mod.moduleKey)}
                        onChange={(e) => toggleAll(mod.slug || mod.moduleKey, e.target.checked)}
                        className="w-4 h-4 accent-[var(--admin-gold)] cursor-pointer rounded"
                        title="Toggle all"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ─── Create / Edit Role Modal ───────────────────────────────────────────── */
const RoleModal = ({ role, onClose, onSave }) => {
  const [form, setForm] = useState({ name: role?.name || '', slug: role?.slug || '', description: role?.description || '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const autoSlug = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.slug.trim()) e.slug = 'Slug is required';
    else if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'Lowercase letters, numbers and hyphens only';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (role?.id) { await axiosProvider.patch(`/rbac/roles/${role.id}`, form); toast.success('Role updated'); }
      else { await axiosProvider.post('/rbac/roles', form); toast.success('Role created'); }
      onSave?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save role');
    } finally { setSaving(false); }
  };

  const isStandard = role?.id && STANDARD_SLUGS.includes(role?.slug);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[var(--admin-line)]">
        <div className="px-6 py-4 border-b border-[var(--admin-line)] bg-[var(--admin-surface-soft)] rounded-t-2xl">
          <h3 className="text-sm font-semibold text-gray-800">{role?.id ? 'Edit Role' : 'Create Custom Role'}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{role?.id ? 'Update role name and description' : 'A custom role lets you group a reusable set of permissions'}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role Name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={(e) => { const n = e.target.value; setForm((p) => ({ ...p, name: n, ...(!role?.id ? { slug: autoSlug(n) } : {}) })); setErrors((p) => ({ ...p, name: undefined })); }}
              className={`w-full border ${errors.name ? 'border-red-300' : 'border-[var(--admin-line)]'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30`}
              placeholder="e.g. Content Manager"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug <span className="text-red-500">*</span></label>
            <input
              value={form.slug}
              onChange={(e) => { setForm((p) => ({ ...p, slug: e.target.value })); setErrors((p) => ({ ...p, slug: undefined })); }}
              disabled={isStandard}
              className={`w-full border ${errors.slug ? 'border-red-300' : 'border-[var(--admin-line)]'} rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30 disabled:bg-[var(--admin-surface-soft)] disabled:text-gray-400`}
              placeholder="content-manager"
            />
            {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug}</p>}
            {isStandard && <p className="text-[10px] text-amber-500 mt-1">System role slug — cannot be changed</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2}
              className="w-full border border-[var(--admin-line)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30 resize-none"
              placeholder="What this role is for" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--admin-line)]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-medium text-white bg-[var(--admin-blue)] rounded-lg hover:bg-[#2d3070] disabled:opacity-50">
              {saving ? 'Saving…' : (role?.id ? 'Update Role' : 'Create Role')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Save Confirm ───────────────────────────────────────────────────────── */
const SaveConfirmModal = ({ onConfirm, onCancel, changedCount }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-[var(--admin-line)]">
      <div className="px-6 py-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[var(--admin-blue)]/10 flex items-center justify-center shrink-0">
            <MdLock size={20} className="text-[var(--admin-blue)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Save Role Permissions</h3>
            <p className="text-xs text-gray-400">This affects every user assigned to this role</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {changedCount > 0
            ? `${changedCount} permission${changedCount !== 1 ? 's' : ''} changed. All users with this role will have their sessions refreshed.`
            : 'Save the current permission matrix for this role?'}
        </p>
      </div>
      <div className="px-6 pb-5 flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
        <button onClick={onConfirm} className="px-5 py-2 text-sm font-medium text-white bg-[var(--admin-blue)] rounded-lg hover:bg-[#2d3070]">Save</button>
      </div>
    </div>
  </div>
);

/* ─── How-It-Works Banner ────────────────────────────────────────────────── */
const HowItWorksBanner = () => {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('rbac_howto_dismissed') === '1');
  if (dismissed) return null;
  return (
    <div className="bg-[#f0f4ff] border border-[#c7d4f5] rounded-xl px-5 py-4 mb-5 flex gap-4 items-start">
      <div className="w-8 h-8 rounded-lg bg-[var(--admin-blue)]/15 flex items-center justify-center shrink-0 mt-0.5">
        <MdInfo size={18} className="text-[var(--admin-blue)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--admin-blue)] mb-2">How the two permission levels work</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg border border-[#c7d4f5] p-3">
            <div className="flex items-center gap-2 mb-1">
              <MdGroups size={15} className="text-teal-600" />
              <span className="text-xs font-semibold text-teal-700">This page — Role-Level Defaults</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Permissions you set here apply to <strong>every user</strong> who has this role.
              Useful for <strong>seller</strong> role and custom roles. For admin/sub-admin, this is typically left empty.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#c7d4f5] p-3">
            <div className="flex items-center gap-2 mb-1">
              <MdPerson size={15} className="text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-700">Admin Users page — Per-User</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Set permissions for a <strong>specific admin or sub-admin</strong>.
              This is the primary way to control what each person can access. Stacks on top of role defaults.
            </p>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          <strong>Quick rule:</strong> If you want "all sellers can view products" → set it here on Seller role. If you want "only this one sub-admin can create orders" → set it in Admin Users for that person.
        </p>
      </div>
      <button onClick={() => { setDismissed(true); localStorage.setItem('rbac_howto_dismissed', '1'); }} className="text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0 mt-0.5">×</button>
    </div>
  );
};

/* ─── Role context panel for per-user roles ─────────────────────────────── */
const PerUserRolePanel = ({ role }) => (
  <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-4">
    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
      <MdPerson size={20} className="text-blue-600" />
    </div>
    <div>
      <p className="text-sm font-semibold text-blue-800 mb-1">
        {ROLE_META[role.slug]?.label || role.name} uses per-user permissions
      </p>
      <p className="text-xs text-blue-600 leading-relaxed mb-3">
        For the <strong>{ROLE_META[role.slug]?.label || role.name}</strong> role, permissions are configured
        <strong> individually per user</strong> — not at the role level. The matrix below shows role-level defaults
        (usually all unchecked), which is intentional.
      </p>
      <p className="text-xs text-blue-500 mb-3">
        To set what a specific admin or sub-admin can do, go to <strong>Admin Users</strong> and use the
        "User Permissions" or "Copy From / Apply Template" actions.
      </p>
      <Link
        to="/app/admin-users"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-white border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
      >
        Go to Admin Users <MdArrowRightAlt size={14} />
      </Link>
    </div>
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────────────── */
const RolesPermissions = () => {
  const { isSuperAdmin, isAdmin } = usePermission();
  const [roles, setRoles]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [matrixState, setMatrixState] = useState({});
  const [originalState, setOriginalState] = useState({});
  const [permissionMap, setPermissionMap] = useState({});
  const [matrixModules, setMatrixModules] = useState([]);
  const [permLoading, setPermLoading] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [modal, setModal]             = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosProvider.get('/rbac/roles', { params: { active: null, limit: 200 } });
      setRoles(res.data?.data || []);
    } catch { toast.error('Failed to load roles'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const displayRoles = useMemo(() => {
    const standard = STANDARD_SLUGS.map((slug) => {
      const found = roles.find((r) => r.slug === slug);
      const meta = ROLE_META[slug] || {};
      return found
        ? { ...found, displayName: meta.label || found.name, _model: meta.model || 'custom' }
        : { slug, displayName: meta.label || slug, _placeholder: true, _model: meta.model || 'custom' };
    });
    const custom = roles.filter((r) => !STANDARD_SLUGS.includes(r.slug));
    return [
      ...standard,
      ...custom.map((r) => ({ ...r, displayName: r.name, _model: 'custom' })),
    ];
  }, [roles]);

  const selectRole = async (role) => {
    if (role._placeholder || !role.id) {
      setSelected(role);
      setMatrixModules([]);
      setMatrixState({});
      setOriginalState({});
      setPermissionMap({});
      return;
    }
    setSelected(role);
    setPermLoading(true);
    try {
      const res = await axiosProvider.get('/rbac/permission-management/modules', {
        params: role.slug ? { roleSlug: role.slug } : { roleId: role.id },
      });
      const mods  = res.data?.data?.modules || [];
      const map   = {};
      const state = {};

      mods.forEach((mod) => {
        const key = mod.slug || mod.moduleKey;
        map[key] = {};
        const canonical = {};
        const assignedBy = {};
        (mod.permissions || []).forEach((p) => {
          const action = normalizeAction(p.action);
          if (!p.id || !ALL_ACTIONS.includes(action)) return;
          assignedBy[action] = assignedBy[action] || Boolean(p.assigned);
          if (!canonical[action] || p.action === action) canonical[action] = { ...p, action };
        });
        Object.entries(canonical).forEach(([action, p]) => {
          const assigned = Boolean(p.assigned) || Boolean(assignedBy[action]);
          map[key][action] = { ...p, assigned };
          state[p.id] = assigned;
        });
      });

      setMatrixModules(mods);
      setMatrixState(state);
      setOriginalState(state);
      setPermissionMap(map);
    } catch {
      toast.error('Failed to load permissions for role');
      setMatrixModules([]);
      setMatrixState({});
      setOriginalState({});
      setPermissionMap({});
    } finally { setPermLoading(false); }
  };

  const handlePermChange = (permissionId, checked, moduleSlug, action) => {
    setMatrixState((prev) => {
      const next = { ...prev, [permissionId]: checked };
      const modulePerm = permissionMap[moduleSlug] || {};
      if (checked && action !== 'view' && modulePerm.view?.id) next[modulePerm.view.id] = true;
      if (!checked && action === 'view') Object.values(modulePerm).forEach((p) => { if (p?.id) next[p.id] = false; });
      return next;
    });
  };

  const changedCount = useMemo(
    () => Object.keys(matrixState).filter((id) => matrixState[id] !== originalState[id]).length,
    [matrixState, originalState],
  );

  const savePermissions = async () => {
    if (!selected?.id) { toast.error('Select a role first'); return; }
    setSaving(true);
    setShowSaveConfirm(false);
    try {
      const permissionIds = Object.entries(matrixState).filter(([, v]) => v).map(([id]) => id);
      await axiosProvider.put(`/rbac/roles/${selected.id}/permissions`, { permissionIds });
      toast.success('Permissions saved — affected user sessions will refresh');
      await selectRole(selected);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save permissions');
    } finally { setSaving(false); }
  };

  const canEdit = isSuperAdmin || isAdmin;
  const isSelectedRole = (role) => selected && ((role.id && selected.id === role.id) || (!role.id && selected.slug === role.slug));

  const assignedCount = useMemo(() =>
    Object.values(matrixState).filter(Boolean).length,
  [matrixState]);

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Set role-wide default permissions and manage custom roles"
        breadcrumbs={[{ label: 'Users & Access' }, { label: 'Roles & Permissions' }]}
        actions={
          <PermissionGuard module="rbac" action={ACTIONS.CREATE}>
            <button
              onClick={() => setModal('create')}

            >
              <MdAdd size={16} /> New Custom Role
            </button>
          </PermissionGuard>
        }
      />

      <HowItWorksBanner />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ── Left: Roles list ── */}
        <div className="bg-white rounded-xl border border-[var(--admin-line)] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--admin-line)] bg-[var(--admin-surface-soft)]">
            <h3 className="text-sm font-semibold text-gray-700">Roles</h3>
            <p className="text-xs text-gray-400 mt-0.5">Select a role to view or edit its permissions</p>
          </div>

          {loading ? (
            <div className="p-4 space-y-2 animate-pulse">
              {[1,2,3,4,5,6,7].map((i) => <div key={i} className="h-12 bg-[var(--admin-surface-soft)] rounded-lg" />)}
            </div>
          ) : (
            <ul className="divide-y divide-[#f7efde]">
              {displayRoles.map((role) => {
                const meta = ROLE_META[role.slug];
                const model = role._model || 'custom';
                return (
                  <li
                    key={role.id || role.slug}
                    onClick={() => selectRole(role)}
                    className={`flex items-start justify-between px-3 py-3 cursor-pointer hover:bg-[var(--admin-surface-soft)] transition-colors border-l-2 ${
                      isSelectedRole(role) ? 'bg-[var(--admin-surface-soft)] border-l-[var(--admin-blue)]' : 'border-l-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium border ${meta?.color || 'bg-orange-100 text-orange-600 border-orange-200'}`}>
                          {role.displayName || role.name || role.slug}
                        </span>
                        {role._placeholder && <span className="text-gray-300 text-[10px]" title="Not in database">○</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${MODEL_BADGE[model]}`}>
                          {MODEL_LABEL[model]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      {isSelectedRole(role) && <MdCheck size={14} className="text-[var(--admin-blue)]" />}
                      {!role._placeholder && canEdit && !role.isSuperAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setModal(role); }}
                          className="p-1 text-gray-300 hover:text-[var(--admin-blue)] rounded transition-colors"
                          title="Edit role"
                        >
                          <MdEdit size={13} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Right: Permission detail ── */}
        <div className="lg:col-span-3">
          {!selected ? (
            <div className="bg-white rounded-xl border border-[var(--admin-line)] shadow-sm h-64 flex items-center justify-center">
              <div className="text-center">
                <MdSecurity size={40} className="mx-auto mb-3 text-[var(--admin-line)]" />
                <p className="text-sm font-medium text-gray-400">Select a role from the left</p>
                <p className="text-xs text-gray-300 mt-1">Configure role-wide permission defaults</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header bar */}
              <div className="bg-white rounded-xl border border-[var(--admin-line)] shadow-sm px-5 py-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--admin-blue)]/10 flex items-center justify-center shrink-0">
                      <MdSecurity size={18} className="text-[var(--admin-blue)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-800">
                          {selected.displayName || selected.name || selected.slug}
                        </h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${MODEL_BADGE[selected._model]}`}>
                          {MODEL_LABEL[selected._model]}
                        </span>
                        {selected.isSuperAdmin && (
                          <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full border border-purple-200">Bypasses all checks</span>
                        )}
                        {selected._placeholder && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full border border-amber-200">Needs DB seed</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {ROLE_META[selected.slug]?.desc || selected.description || 'Custom role'}
                        {!selected._placeholder && !selected.isSuperAdmin && ` · ${assignedCount} permission${assignedCount !== 1 ? 's' : ''} assigned at role level`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {changedCount > 0 && canEdit && !selected._placeholder && !selected.isSuperAdmin && (
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        {changedCount} unsaved
                      </span>
                    )}
                    {canEdit && !selected._placeholder && !selected.isSuperAdmin && (
                      <>
                        <button
                          onClick={() => selectRole(selected)}
                          disabled={permLoading}
                          className="p-2 text-gray-400 hover:text-[var(--admin-blue)] rounded-lg hover:bg-[var(--admin-surface-soft)] transition-colors"
                          title="Reload"
                        >
                          <MdRefresh size={16} className={permLoading ? 'animate-spin' : ''} />
                        </button>
                        <button
                          onClick={() => setShowSaveConfirm(true)}
                          disabled={saving || permLoading || changedCount === 0}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--admin-blue)] rounded-lg hover:bg-[#2d3070] disabled:opacity-40 transition-colors shadow-sm"
                        >
                          {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Content area */}
              {selected.isSuperAdmin ? (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-8 text-center">
                  <MdSecurity size={36} className="mx-auto mb-3 text-purple-300" />
                  <p className="text-sm font-semibold text-purple-700">Super Admin bypasses all permission checks</p>
                  <p className="text-xs text-purple-400 mt-1">The permission matrix is not enforced for this role. Super admins can do everything.</p>
                </div>
              ) : selected._placeholder ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-8 text-center">
                  <MdSecurity size={36} className="mx-auto mb-3 text-amber-300" />
                  <p className="text-sm font-semibold text-amber-700">Role not in database yet</p>
                  <p className="text-xs text-amber-500 mt-1 mb-3">Run the RBAC seed to create standard roles.</p>
                  <code className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-mono">
                    node scripts/db/seed-rbac.js
                  </code>
                </div>
              ) : selected._model === 'no-access' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                  <MdSecurity size={36} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-600">Buyers have no admin panel access</p>
                  <p className="text-xs text-gray-400 mt-1">This role is for customer accounts only.</p>
                </div>
              ) : permLoading ? (
                <div className="bg-white rounded-xl border border-[var(--admin-line)] shadow-sm p-8 animate-pulse">
                  <div className="space-y-3">
                    {[1,2,3,4,5].map((i) => <div key={i} className="h-8 bg-[var(--admin-surface-soft)] rounded" />)}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Context callout for per-user roles */}
                  {selected._model === 'per-user' && <PerUserRolePanel role={selected} />}

                  {/* Matrix */}
                  <PermissionMatrix
                    modules={matrixModules}
                    matrixState={matrixState}
                    permissionMap={permissionMap}
                    onChange={canEdit ? handlePermChange : undefined}
                    readOnly={!canEdit}
                  />

                  {/* Footer guidance */}
                  {selected._model === 'per-user' && assignedCount === 0 && !permLoading && (
                    <p className="text-xs text-gray-400 text-center py-2">
                      All unchecked is expected for this role — individual permissions are set in Admin Users.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <RoleModal
          role={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={loadRoles}
        />
      )}

      {showSaveConfirm && (
        <SaveConfirmModal
          changedCount={changedCount}
          onConfirm={savePermissions}
          onCancel={() => setShowSaveConfirm(false)}
        />
      )}
    </div>
  );
};

export default RolesPermissions;
