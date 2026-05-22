import React, { useEffect, useMemo, useState } from 'react';
import { MdSecurity, MdAdd, MdEdit, MdDelete, MdExpandMore, MdExpandLess, MdCheck } from 'react-icons/md';
import { PageHeader, ConfirmModal, StatusBadge } from '../../../components/Shared';
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

const MODULE_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'];

const DEFAULT_MODULES = [
  { slug: 'products',  name: 'Product Management' },
  { slug: 'inventory', name: 'Inventory Management' },
  { slug: 'orders',    name: 'Order Management' },
  { slug: 'users',     name: 'User Management' },
  { slug: 'rbac',      name: 'RBAC Management' },
  { slug: 'pricing',   name: 'Marketing & Promotions' },
  { slug: 'analytics', name: 'Analytics' },
  { slug: 'tax',       name: 'Tax & Compliance' },
];

/* ─── Permission Matrix ──────────────────────────────────────────────────── */
const PermissionMatrix = ({ modules = [], rolePermissions = {}, onChange, readOnly = false }) => {
  const [expanded, setExpanded] = useState(true);

  const toggleAll = (moduleSlug, checked) => {
    MODULE_ACTIONS.forEach((action) => onChange?.(moduleSlug, action, checked));
  };

  const allChecked = (moduleSlug) =>
    MODULE_ACTIONS.every((a) => rolePermissions[moduleSlug]?.[a]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3 border-b border-gray-100 hover:bg-gray-50"
        onClick={() => setExpanded((o) => !o)}
      >
        <span className="text-sm font-semibold text-gray-700">Permission Matrix</span>
        {expanded ? <MdExpandLess size={18} className="text-gray-400" /> : <MdExpandMore size={18} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide w-48">Module</th>
                {MODULE_ACTIONS.map((a) => (
                  <th key={a} className="px-4 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wide capitalize">{a}</th>
                ))}
                {!readOnly && (
                  <th className="px-4 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wide w-16">All</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {modules.map((mod) => (
                <tr key={mod.slug} className="hover:bg-gray-50/60">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{mod.name}</td>
                  {MODULE_ACTIONS.map((action) => {
                    const checked = rolePermissions[mod.slug]?.[action] ?? false;
                    return (
                      <td key={action} className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={readOnly}
                          onChange={(e) => onChange?.(mod.slug, action, e.target.checked)}
                          className="w-4 h-4 accent-[#989AFF] cursor-pointer disabled:cursor-default"
                        />
                      </td>
                    );
                  })}
                  {!readOnly && (
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={allChecked(mod.slug)}
                        onChange={(e) => toggleAll(mod.slug, e.target.checked)}
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

/* ─── Main Component ─────────────────────────────────────────────────────── */
const RolesPermissions = () => {
  const { isSuperAdmin, isAdmin } = usePermission();
  const [roles, setRoles]               = useState([]);
  const [modules, setModules]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState(null);
  const [permissions, setPermissions]   = useState({});
  const [saving, setSaving]             = useState(false);
  const [permLoading, setPermLoading]   = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [rolesRes, modsRes] = await Promise.all([
          axiosProvider.get('/rbac/roles'),
          axiosProvider.get('/rbac/modules'),
        ]);
        setRoles(rolesRes.data?.data || []);
        setModules(modsRes.data?.data || []);
      } catch {
        toast.error('Failed to load roles data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Build display list: standard roles first (merged with API data for _id), then custom roles
  const displayRoles = useMemo(() => {
    const standard = STANDARD_SLUGS.map((slug) => {
      const apiRole = roles.find((r) => r.slug === slug);
      return apiRole
        ? { ...apiRole, name: STANDARD_ROLE_NAMES[slug] || apiRole.name }
        : { name: STANDARD_ROLE_NAMES[slug], slug };
    });
    const custom = roles.filter((r) => !STANDARD_SLUGS.includes(r.slug));
    return [...standard, ...custom];
  }, [roles]);

  const selectRole = async (role) => {
    setSelected(role);
    setPermissions({});

    if (!role._id) {
      // Role not yet seeded in DB — show empty matrix
      return;
    }

    setPermLoading(true);
    try {
      const res = await axiosProvider.get(`/rbac/roles/${role._id}/permissions`);
      const perms = {};
      (res.data?.data || []).forEach((p) => {
        if (!perms[p.moduleSlug]) perms[p.moduleSlug] = {};
        perms[p.moduleSlug][p.action] = true;
      });
      setPermissions(perms);
    } catch {
      toast.error('Failed to load permissions for this role');
      setPermissions({});
    } finally {
      setPermLoading(false);
    }
  };

  const handlePermChange = (moduleSlug, action, checked) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleSlug]: { ...(prev[moduleSlug] || {}), [action]: checked },
    }));
  };

  const savePermissions = async () => {
    if (!selected?._id) {
      toast.error('This role has no database record yet — cannot save permissions');
      return;
    }
    setSaving(true);
    try {
      await axiosProvider.put(`/rbac/roles/${selected._id}/permissions`, { permissions });
      toast.success('Permissions saved successfully');
    } catch {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const canEdit = isSuperAdmin || isAdmin;
  const activeModules = modules.length ? modules : DEFAULT_MODULES;

  const isSelected = (role) =>
    selected && (
      (role._id && selected._id === role._id) ||
      (role.slug && selected.slug === role.slug)
    );

  return (
    <div className="p-6">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage roles and configure their module access"
        breadcrumbs={[{ label: 'Users & Access' }, { label: 'Roles & Permissions' }]}
        actions={
          <PermissionGuard module="rbac" action={ACTIONS.CREATE}>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#989AFF] text-white text-sm rounded-lg hover:bg-[#7b7de8]">
              <MdAdd size={16} /> New Role
            </button>
          </PermissionGuard>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Roles list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">System Roles</h3>
            <p className="text-xs text-gray-400 mt-0.5">Select a role to view permissions</p>
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
                  key={role._id || role.slug}
                  onClick={() => selectRole(role)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected(role) ? 'bg-[#F0F0F3]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium truncate ${
                        ROLE_COLORS[role.slug] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {role.name || role.slug}
                    </span>
                    {!role._id && (
                      <span className="text-gray-300 text-xs" title="Not yet in database">○</span>
                    )}
                  </div>
                  {isSelected(role) && (
                    <MdCheck size={16} className="text-[#989AFF] shrink-0 ml-1" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Permission matrix */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {selected.name || selected.slug}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selected._id
                      ? 'Configure module access for this role'
                      : 'This role has no database record — permissions cannot be saved until it is seeded.'}
                  </p>
                </div>
                {canEdit && selected._id && (
                  <button
                    onClick={savePermissions}
                    disabled={saving || permLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#989AFF] rounded-lg hover:bg-[#7b7de8] disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Permissions'}
                  </button>
                )}
              </div>

              {permLoading ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 animate-pulse">
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-8 bg-gray-100 rounded" />
                    ))}
                  </div>
                </div>
              ) : (
                <PermissionMatrix
                  modules={activeModules}
                  rolePermissions={permissions}
                  onChange={canEdit ? handlePermChange : undefined}
                  readOnly={!canEdit || !selected._id}
                />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-80 flex items-center justify-center">
              <div className="text-center">
                <MdSecurity size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">Select a role to view its permissions</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RolesPermissions;
