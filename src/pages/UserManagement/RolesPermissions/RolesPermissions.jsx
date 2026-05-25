import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MdSecurity, MdAdd, MdEdit, MdCheck, MdExpandMore, MdExpandLess } from 'react-icons/md';
import { PageHeader } from '../../../components/Shared';
import PermissionGuard from '../../../components/Atoms/PermissionGuard/PermissionGuard';
import { usePermission, ACTIONS, ROLES } from '../../../_helpers/usePermission';
import { axiosPrivate as axiosProvider } from '../../../_helpers/axiosProvider';
import { toast } from 'sonner';

const ROLE_COLORS = {
  'super-admin':      'bg-purple-100 text-purple-700',
  'admin':            'bg-blue-100 text-blue-700',
  'sub-admin':        'bg-indigo-100 text-indigo-600',
  'seller':           'bg-orange-100 text-orange-700',
  'seller-admin':     'bg-yellow-100 text-yellow-700',
  'seller-sub-admin': 'bg-gray-100 text-gray-600',
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

const ALL_ACTIONS = ['view', 'create', 'edit', 'update', 'delete', 'approve', 'reject', 'assign', 'export', 'import', 'status_change'];

/* ─── Permission Matrix ──────────────────────────────────────────────────── */
const PermissionMatrix = ({ modules = [], matrixState = {}, permissionMap = {}, onChange, readOnly = false }) => {
  const [expanded, setExpanded] = useState(true);

  const visibleActions = useMemo(() => {
    const used = new Set();
    modules.forEach((mod) => {
      Object.keys(mod.permissionsByAction || {}).forEach((action) => {
        if (mod.permissionsByAction[action]) used.add(action);
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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <MdSecurity size={36} className="mx-auto mb-2 text-gray-200" />
        <p className="text-sm text-gray-400">No modules found in database. Run the RBAC seed first.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3 border-b border-gray-100 hover:bg-gray-50"
        onClick={() => setExpanded((o) => !o)}
      >
        <span className="text-sm font-semibold text-gray-700">Permission Matrix ({modules.length} modules)</span>
        {expanded ? <MdExpandLess size={18} className="text-gray-400" /> : <MdExpandMore size={18} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide w-48 sticky left-0 bg-gray-50">Module</th>
                {visibleActions.map((a) => (
                  <th key={a} className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wide capitalize whitespace-nowrap">
                    {a.replace('_', ' ')}
                  </th>
                ))}
                {!readOnly && (
                  <th className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wide w-14">All</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {modules.map((mod) => (
                <tr key={mod.id || mod.slug} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-medium text-gray-700 sticky left-0 bg-white">
                    {mod.moduleName || mod.name}
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
                            onChange={(e) => onChange?.(perm.id, e.target.checked)}
                            className="w-4 h-4 accent-[#989AFF] cursor-pointer disabled:cursor-default"
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
                        className="w-4 h-4 accent-[#3E4094] cursor-pointer"
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
  const [form, setForm] = useState({
    name: role?.name || '',
    slug: role?.slug || '',
    description: role?.description || '',
    type: role?.type || 'custom',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.slug.trim()) e.slug = 'Slug is required';
    else if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'Slug must be lowercase letters, numbers and hyphens only';
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">{role?.id ? 'Edit Role' : 'Create Role'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role Name *</label>
            <input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((p) => ({ ...p, name, ...(!role?.id ? { slug: autoSlug(name) } : {}) }));
                setErrors((p) => ({ ...p, name: undefined }));
              }}
              className={`w-full border ${errors.name ? 'border-red-300' : 'border-gray-200'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#989AFF]/40`}
              placeholder="e.g. Content Manager"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug *</label>
            <input
              value={form.slug}
              onChange={(e) => { setForm((p) => ({ ...p, slug: e.target.value })); setErrors((p) => ({ ...p, slug: undefined })); }}
              disabled={Boolean(role?.id && STANDARD_SLUGS.includes(role?.slug))}
              className={`w-full border ${errors.slug ? 'border-red-300' : 'border-gray-200'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#989AFF]/40 disabled:bg-gray-50 disabled:text-gray-400`}
              placeholder="e.g. content-manager"
            />
            {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#989AFF]/40 resize-none"
              placeholder="Short description of this role"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-[#989AFF] rounded-lg hover:bg-[#7b7de8] disabled:opacity-50">
              {saving ? 'Saving…' : (role?.id ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
const RolesPermissions = () => {
  const { isSuperAdmin, isAdmin } = usePermission();
  const [roles, setRoles]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [matrixState, setMatrixState] = useState({});   // permissionId -> bool
  const [permissionMap, setPermissionMap] = useState({}); // modSlug -> action -> permission
  const [matrixModules, setMatrixModules] = useState([]);
  const [permLoading, setPermLoading] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [modal, setModal]             = useState(null); // null | 'create' | role object for edit

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
      setPermissionMap({});
      return;
    }
    setSelected(role);
    setPermLoading(true);
    try {
      const res = await axiosProvider.get('/rbac/permission-management/modules', {
        params: { roleId: role.id },
      });
      const matrix = res.data?.data || {};
      const mods = matrix.modules || [];
      const map = {};
      const state = {};
      mods.forEach((mod) => {
        const key = mod.slug || mod.moduleKey;
        map[key] = {};
        (mod.permissions || []).forEach((p) => {
          map[key][p.action] = p;
          state[p.id] = p.assigned;
        });
      });
      setMatrixModules(mods);
      setMatrixState(state);
      setPermissionMap(map);
    } catch {
      toast.error('Failed to load permissions for role');
      setMatrixModules([]);
      setMatrixState({});
      setPermissionMap({});
    } finally {
      setPermLoading(false);
    }
  };

  const handlePermChange = (permissionId, checked) => {
    setMatrixState((prev) => ({ ...prev, [permissionId]: checked }));
  };

  const savePermissions = async () => {
    if (!selected?.id) { toast.error('Select a role first'); return; }
    setSaving(true);
    try {
      // Collect all permission IDs that should be assigned
      const permissionIds = Object.entries(matrixState)
        .filter(([, assigned]) => assigned)
        .map(([id]) => id);

      await axiosProvider.put(`/rbac/roles/${selected.id}/permissions`, { permissionIds });
      toast.success('Permissions saved successfully');
      // Reload to reflect actual DB state
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
        subtitle="Manage roles and configure module access per role"
        breadcrumbs={[{ label: 'Users & Access' }, { label: 'Roles & Permissions' }]}
        actions={
          <PermissionGuard module="rbac" action={ACTIONS.CREATE}>
            <button
              onClick={() => setModal('create')}
              className="flex items-center gap-2 px-4 py-2 bg-[#989AFF] text-white text-sm rounded-lg hover:bg-[#7b7de8]"
            >
              <MdAdd size={16} /> New Role
            </button>
          </PermissionGuard>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Roles list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">All Roles</h3>
            <p className="text-xs text-gray-400 mt-0.5">Select a role to configure permissions</p>
          </div>

          {loading ? (
            <div className="p-4 space-y-2 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {displayRoles.map((role) => (
                <li
                  key={role.id || role.slug}
                  onClick={() => selectRole(role)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelectedRole(role) ? 'bg-[#F0F0F3]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium truncate max-w-[140px] ${
                        ROLE_COLORS[role.slug] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {role.displayName || role.name || role.slug}
                    </span>
                    {role._placeholder && (
                      <span className="text-gray-300 text-xs shrink-0" title="Not in database yet">○</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isSelectedRole(role) && <MdCheck size={15} className="text-[#989AFF]" />}
                    {!role._placeholder && canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setModal(role); }}
                        className="p-1 text-gray-400 hover:text-[#989AFF] rounded"
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

        {/* Permission matrix */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {selected.displayName || selected.name || selected.slug}
                    {selected.isSuperAdmin && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Super Admin</span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selected._placeholder
                      ? 'This role has no DB record yet — run the RBAC seed to create it'
                      : 'Configure which module actions are allowed for this role'}
                  </p>
                </div>
                {canEdit && !selected._placeholder && !selected.isSuperAdmin && (
                  <button
                    onClick={savePermissions}
                    disabled={saving || permLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#989AFF] rounded-lg hover:bg-[#7b7de8] disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Permissions'}
                  </button>
                )}
              </div>

              {selected.isSuperAdmin ? (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 text-center">
                  <MdSecurity size={32} className="mx-auto mb-2 text-purple-400" />
                  <p className="text-sm font-medium text-purple-700">Super Admin has unrestricted access to all modules</p>
                  <p className="text-xs text-purple-400 mt-1">Permissions are not enforced for this role</p>
                </div>
              ) : permLoading ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 animate-pulse">
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-8 bg-gray-100 rounded" />)}
                  </div>
                </div>
              ) : (
                <PermissionMatrix
                  modules={matrixModules}
                  matrixState={matrixState}
                  permissionMap={permissionMap}
                  onChange={canEdit ? handlePermChange : undefined}
                  readOnly={!canEdit || Boolean(selected._placeholder)}
                />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-80 flex items-center justify-center">
              <div className="text-center">
                <MdSecurity size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">Select a role on the left to configure permissions</p>
              </div>
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
    </div>
  );
};

export default RolesPermissions;
