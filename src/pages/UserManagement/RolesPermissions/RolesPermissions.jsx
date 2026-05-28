import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MdSecurity, MdAdd, MdEdit, MdCheck, MdExpandMore, MdExpandLess,
  MdLock, MdLockOpen, MdRefresh,
} from 'react-icons/md';
import { PageHeader } from '../../../components/Shared';
import PermissionGuard from '../../../components/Atoms/PermissionGuard/PermissionGuard';
import { usePermission, ACTIONS, ROLES } from '../../../_helpers/usePermission';
import { axiosPrivate as axiosProvider } from '../../../_helpers/axiosProvider';
import { toast } from 'sonner';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const ROLE_COLORS = {
  'super-admin':      'bg-purple-100 text-purple-700 border-purple-200',
  'admin':            'bg-blue-100 text-[#3E4094] border-blue-200',
  'sub-admin':        'bg-indigo-100 text-indigo-600 border-indigo-200',
  'seller':           'bg-amber-100 text-amber-700 border-amber-200',
  'seller-admin':     'bg-yellow-100 text-yellow-700 border-yellow-200',
  'seller-sub-admin': 'bg-gray-100 text-gray-600 border-gray-200',
};

const STANDARD_ROLE_NAMES = {
  [ROLES.SUPER_ADMIN]:      'Super Admin',
  [ROLES.ADMIN]:            'Admin',
  [ROLES.SUB_ADMIN]:        'Sub Admin',
  [ROLES.SELLER]:           'Seller',
  [ROLES.SELLER_ADMIN]:     'Seller Admin',
  [ROLES.SELLER_SUB_ADMIN]: 'Seller Sub Admin',
};

const STANDARD_SLUGS = Object.values(ROLES);

const ALL_ACTIONS = ['view', 'create', 'update', 'delete', 'status_change', 'approve', 'reject', 'assign', 'export', 'import'];
const ACTION_ALIASES = {
  add: 'create',
  edit: 'update',
  status: 'status_change',
  approval: 'approve',
  action: 'status_change',
  review: 'approve',
  manage: 'status_change',
};

const normalizeAction = (action = '') => {
  const value = String(action || '').trim().toLowerCase();
  return ACTION_ALIASES[value] || value;
};

const ACTION_LABELS = {
  status_change: 'Status',
  create:        'Create',
  update:        'Update',
  delete:        'Delete',
  approve:       'Approve',
  reject:        'Reject',
  export:        'Export',
  import:        'Import',
  assign:        'Assign',
  view:          'View',
};

/* ─── Permission Matrix ──────────────────────────────────────────────────── */
const PermissionMatrix = ({ modules = [], matrixState = {}, permissionMap = {}, onChange, readOnly = false }) => {
  const [expanded, setExpanded] = useState(true);

  const visibleActions = useMemo(() => {
    const used = new Set();
    modules.forEach((mod) => {
      Object.keys(mod.permissionsByAction || {}).forEach((action) => {
        const normalized = normalizeAction(action);
        if (mod.permissionsByAction[action] && ALL_ACTIONS.includes(normalized)) used.add(normalized);
      });
      (mod.permissions || []).forEach((p) => {
        const normalized = normalizeAction(p.action);
        if (p.id && ALL_ACTIONS.includes(normalized)) used.add(normalized);
      });
    });
    return ALL_ACTIONS.filter((a) => used.has(a));
  }, [modules]);

  const toggleAll = (modSlug, checked) => {
    visibleActions.forEach((action) => {
      const perm = permissionMap[modSlug]?.[action];
      if (perm) onChange?.(perm.id, checked);
    });
  };

  const allChecked = (modSlug) =>
    visibleActions.every((a) => {
      const perm = permissionMap[modSlug]?.[a];
      return !perm || matrixState[perm.id] === true;
    });

  if (!modules.length) {
    return (
      <div className="bg-white rounded-xl border border-[#e7dfd1] shadow-sm p-10 text-center">
        <MdSecurity size={40} className="mx-auto mb-3 text-[#e7dfd1]" />
        <p className="text-sm text-gray-400 font-medium">No modules found in database.</p>
        <p className="text-xs text-gray-300 mt-1">Run the RBAC seed to populate modules.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#e7dfd1] shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3 border-b border-[#e7dfd1] hover:bg-[#faf6ee] transition-colors"
        onClick={() => setExpanded((o) => !o)}
      >
        <span className="text-sm font-semibold text-gray-700">
          Permission Matrix
          <span className="ml-2 text-xs font-normal text-gray-400">({modules.length} modules)</span>
        </span>
        {expanded ? <MdExpandLess size={18} className="text-gray-400" /> : <MdExpandMore size={18} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#faf6ee] border-b border-[#e7dfd1]">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide w-48 sticky left-0 bg-[#faf6ee]">Module</th>
                {visibleActions.map((a) => (
                  <th key={a} className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {ACTION_LABELS[a] || a.replace('_', ' ')}
                  </th>
                ))}
                {!readOnly && (
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wide w-14">All</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f7efde]">
              {modules.map((mod) => (
                <tr key={mod.id || mod.slug} className="hover:bg-[#faf6ee]/60 transition-colors">
                  <td className="px-4 py-2.5 sticky left-0 bg-white">
                    <span className="font-medium text-gray-700 text-xs">{mod.moduleName || mod.name}</span>
                    {mod.moduleKey && (
                      <span className="block text-[10px] text-gray-400 font-mono">{mod.moduleKey || mod.slug}</span>
                    )}
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
                            className="w-4 h-4 accent-[#3E4094] cursor-pointer disabled:cursor-default rounded"
                          />
                        ) : (
                          <span className="text-gray-200 text-base">—</span>
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
                        className="w-4 h-4 accent-[#CE9F2D] cursor-pointer rounded"
                        title="Toggle all actions for this module"
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
  const [form, setForm] = useState({
    name:        role?.name        || '',
    slug:        role?.slug        || '',
    description: role?.description || '',
    type:        role?.type        || 'custom',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

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
      if (role?.id) {
        await axiosProvider.patch(`/rbac/roles/${role.id}`, form);
        toast.success('Role updated');
      } else {
        await axiosProvider.post('/rbac/roles', form);
        toast.success('Role created');
      }
      onSave?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const autoSlug = (name) =>
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-[#e7dfd1]">
        <div className="px-6 py-4 border-b border-[#e7dfd1] bg-[#faf6ee] rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-800">{role?.id ? 'Edit Role' : 'Create Role'}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Configure role name, slug, and description</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role Name <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((p) => ({ ...p, name, ...(!role?.id ? { slug: autoSlug(name) } : {}) }));
                setErrors((p) => ({ ...p, name: undefined }));
              }}
              className={`w-full border ${errors.name ? 'border-red-300' : 'border-[#e7dfd1]'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094]/30 bg-white`}
              placeholder="e.g. Content Manager"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug <span className="text-red-500">*</span></label>
            <input
              value={form.slug}
              onChange={(e) => { setForm((p) => ({ ...p, slug: e.target.value })); setErrors((p) => ({ ...p, slug: undefined })); }}
              disabled={Boolean(role?.id && STANDARD_SLUGS.includes(role?.slug))}
              className={`w-full border ${errors.slug ? 'border-red-300' : 'border-[#e7dfd1]'} rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#3E4094]/30 bg-white disabled:bg-[#faf6ee] disabled:text-gray-400`}
              placeholder="e.g. content-manager"
            />
            {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug}</p>}
            {STANDARD_SLUGS.includes(role?.slug) && (
              <p className="text-[10px] text-amber-500 mt-1">Standard role slug — cannot be changed</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full border border-[#e7dfd1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E4094]/30 resize-none bg-white"
              placeholder="Short description of this role"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#e7dfd1]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-[#3E4094] rounded-lg hover:bg-[#2d3070] disabled:opacity-50 transition-colors"
            >
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
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-[#e7dfd1]">
      <div className="px-6 py-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#3E4094]/10 flex items-center justify-center">
            <MdLock size={20} className="text-[#3E4094]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Save Permissions</h3>
            <p className="text-xs text-gray-400">This will update role access for all assigned users</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {changedCount > 0
            ? `You have modified ${changedCount} permission${changedCount !== 1 ? 's' : ''}. Saving will invalidate sessions for all users with this role.`
            : 'Save the current permission matrix for this role?'
          }
        </p>
      </div>
      <div className="px-6 pb-5 flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
        <button
          onClick={onConfirm}
          className="px-5 py-2 text-sm font-medium text-white bg-[#3E4094] rounded-lg hover:bg-[#2d3070] transition-colors"
        >
          Save Permissions
        </button>
      </div>
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
    } catch {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const displayRoles = useMemo(() => {
    const standard = STANDARD_SLUGS.map((slug) => {
      const found = roles.find((r) => r.slug === slug);
      return found
        ? { ...found, displayName: STANDARD_ROLE_NAMES[slug] || found.name }
        : { slug, displayName: STANDARD_ROLE_NAMES[slug] || slug, _placeholder: true };
    });
    const custom = roles.filter((r) => !STANDARD_SLUGS.includes(r.slug));
    return [...standard, ...custom.map((r) => ({ ...r, displayName: r.name }))];
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
      // Use roleSlug per RBAC guide — no scope filter so all modules appear
      const res = await axiosProvider.get('/rbac/permission-management/modules', {
        params: {
          ...(role.slug ? { roleSlug: role.slug } : { roleId: role.id }),
        },
      });
      const matrix = res.data?.data || {};
      const mods   = matrix.modules || [];
      const map    = {};
      const state  = {};

      mods.forEach((mod) => {
        const key = mod.slug || mod.moduleKey;
        map[key] = {};
        const canonicalPermissions = {};
        const assignedByAction = {};
        (mod.permissions || []).forEach((permission) => {
          const action = normalizeAction(permission.action);
          if (!permission.id || !ALL_ACTIONS.includes(action)) return;
          assignedByAction[action] = assignedByAction[action] || Boolean(permission.assigned);
          if (!canonicalPermissions[action] || permission.action === action) {
            canonicalPermissions[action] = { ...permission, action };
          }
        });

        Object.entries(canonicalPermissions).forEach(([action, permission]) => {
          const assigned = Boolean(permission.assigned) || Boolean(assignedByAction[action]);
          map[key][action] = { ...permission, assigned };
          state[permission.id] = assigned;
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
    } finally {
      setPermLoading(false);
    }
  };

  const handlePermChange = (permissionId, checked, moduleSlug, action) => {
    setMatrixState((prev) => {
      const next = { ...prev, [permissionId]: checked };
      const modulePermissions = permissionMap[moduleSlug] || {};

      if (checked && action !== 'view' && modulePermissions.view?.id) {
        next[modulePermissions.view.id] = true;
      }

      if (!checked && action === 'view') {
        Object.values(modulePermissions).forEach((permission) => {
          if (permission?.id) next[permission.id] = false;
        });
      }

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
      const permissionIds = Object.entries(matrixState)
        .filter(([, assigned]) => assigned)
        .map(([id]) => id);

      await axiosProvider.put(`/rbac/roles/${selected.id}/permissions`, { permissionIds });
      toast.success('Permissions saved — affected sessions will refresh');
      await selectRole(selected);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const canEdit = isSuperAdmin || isAdmin;

  const isSelectedRole = (role) =>
    selected && ((role.id && selected.id === role.id) || (role.slug && selected.slug === role.slug));

  return (
    <div className="p-6">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage roles and configure module-level action access per role"
        breadcrumbs={[{ label: 'Users & Access' }, { label: 'Roles & Permissions' }]}
        actions={
          <PermissionGuard module="rbac" action={ACTIONS.CREATE}>
            <button
              onClick={() => setModal('create')}
              className="flex items-center gap-2 px-4 py-2 bg-[#3E4094] text-white text-sm rounded-lg hover:bg-[#2d3070] transition-colors shadow-sm"
            >
              <MdAdd size={16} /> New Role
            </button>
          </PermissionGuard>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* ── Roles list ── */}
        <div className="bg-white rounded-xl border border-[#e7dfd1] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e7dfd1] bg-[#faf6ee]">
            <h3 className="text-sm font-semibold text-gray-700">All Roles</h3>
            <p className="text-xs text-gray-400 mt-0.5">Select a role to configure its permissions</p>
          </div>

          {loading ? (
            <div className="p-4 space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-10 bg-[#faf6ee] rounded-lg" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-[#f7efde]">
              {displayRoles.map((role) => (
                <li
                  key={role.id || role.slug}
                  onClick={() => selectRole(role)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#faf6ee] transition-colors ${
                    isSelectedRole(role) ? 'bg-[#faf6ee] border-l-2 border-l-[#3E4094]' : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border truncate max-w-[140px] ${
                        ROLE_COLORS[role.slug] || 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {role.displayName || role.name || role.slug}
                    </span>
                    {role._placeholder && (
                      <span className="text-gray-300 text-xs shrink-0" title="Not in database yet — run RBAC seed">○</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isSelectedRole(role) && <MdCheck size={15} className="text-[#3E4094]" />}
                    {!role._placeholder && canEdit && !role.isSuperAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setModal(role); }}
                        className="p-1 text-gray-300 hover:text-[#3E4094] rounded transition-colors"
                        title="Edit role"
                      >
                        <MdEdit size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Permission matrix ── */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="space-y-4">
              {/* Header bar */}
              <div className="bg-white rounded-xl border border-[#e7dfd1] shadow-sm px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#3E4094]/10 flex items-center justify-center">
                    <MdSecurity size={18} className="text-[#3E4094]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      {selected.displayName || selected.name || selected.slug}
                      {selected.isSuperAdmin && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Unrestricted</span>
                      )}
                      {selected._placeholder && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full">Needs DB Seed</span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selected._placeholder
                        ? 'Run the RBAC seed script to create this role in the database'
                        : selected.isSuperAdmin
                          ? 'Super Admin bypasses all permission restrictions'
                          : 'Toggle checkboxes to grant or revoke module actions for this role'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {changedCount > 0 && canEdit && !selected._placeholder && !selected.isSuperAdmin && (
                    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      {changedCount} unsaved change{changedCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {canEdit && !selected._placeholder && !selected.isSuperAdmin && (
                    <>
                      <button
                        onClick={() => selectRole(selected)}
                        disabled={permLoading}
                        className="p-2 text-gray-400 hover:text-[#3E4094] rounded-lg hover:bg-[#faf6ee] transition-colors"
                        title="Reload permissions"
                      >
                        <MdRefresh size={16} className={permLoading ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => setShowSaveConfirm(true)}
                        disabled={saving || permLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3E4094] rounded-lg hover:bg-[#2d3070] disabled:opacity-50 transition-colors shadow-sm"
                      >
                        <MdLockOpen size={15} />
                        {saving ? 'Saving…' : 'Save Permissions'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Matrix body */}
              {selected.isSuperAdmin ? (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-8 text-center">
                  <MdSecurity size={36} className="mx-auto mb-3 text-purple-300" />
                  <p className="text-sm font-medium text-purple-700">Super Admin has unrestricted access to all modules</p>
                  <p className="text-xs text-purple-400 mt-1">Permission matrix is not enforced for this role</p>
                </div>
              ) : selected._placeholder ? (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-8 text-center">
                  <MdSecurity size={36} className="mx-auto mb-3 text-amber-300" />
                  <p className="text-sm font-medium text-amber-700">Role not found in database</p>
                  <p className="text-xs text-amber-500 mt-1">Run <code className="font-mono bg-amber-100 px-1 rounded">scripts/db/seed-rbac.js</code> to create standard roles</p>
                </div>
              ) : permLoading ? (
                <div className="bg-white rounded-xl border border-[#e7dfd1] shadow-sm p-8 animate-pulse">
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-8 bg-[#faf6ee] rounded" />)}
                  </div>
                </div>
              ) : (
                <PermissionMatrix
                  modules={matrixModules}
                  matrixState={matrixState}
                  permissionMap={permissionMap}
                  onChange={canEdit ? handlePermChange : undefined}
                  readOnly={!canEdit}
                />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#e7dfd1] shadow-sm h-80 flex items-center justify-center">
              <div className="text-center">
                <MdSecurity size={44} className="mx-auto mb-3 text-[#e7dfd1]" />
                <p className="text-sm font-medium text-gray-400">Select a role to configure its permissions</p>
                <p className="text-xs text-gray-300 mt-1">All module actions are managed here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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
