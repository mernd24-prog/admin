import React, { useEffect, useState } from 'react';
import { MdSecurity, MdAdd, MdEdit, MdDelete, MdExpandMore, MdExpandLess, MdCheck } from 'react-icons/md';
import { PageHeader, ConfirmModal, StatusBadge } from '../../../components/Shared';
import PermissionGuard from '../../../components/Atoms/PermissionGuard/PermissionGuard';
import { usePermission, ACTIONS, ROLES } from '../../../_helpers/usePermission';
import { axiosPrivate as axiosProvider } from '../../../_helpers/axiosProvider';
import { toast } from 'react-toastify';

const ROLE_COLORS = {
  'super-admin':      'bg-purple-100 text-purple-700',
  'admin':            'bg-blue-100 text-blue-700',
  'sub-admin':        'bg-indigo-100 text-indigo-600',
  'seller':           'bg-orange-100 text-orange-700',
  'seller-admin':     'bg-yellow-100 text-yellow-700',
  'seller-sub-admin': 'bg-gray-100 text-gray-600',
};

const MODULE_ACTIONS = ['view', 'create', 'edit', 'delete', 'approve'];

const PermissionMatrix = ({ modules = [], rolePermissions = {}, onChange, readOnly = false }) => {
  const [expanded, setExpanded] = useState(true);

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const RolesPermissions = () => {
  const { isSuperAdmin, isAdmin } = usePermission();
  const [roles, setRoles]               = useState([]);
  const [modules, setModules]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState(null);
  const [permissions, setPermissions]   = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [rolesRes, modsRes] = await Promise.all([
          axiosProvider.get('/rbac/roles'),
          axiosProvider.get('/rbac/modules'),
        ]);
        setRoles(rolesRes.data?.data || []);
        setModules(modsRes.data?.data || []);
      } catch {
        toast.error('Failed to load RBAC data');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const selectRole = async (role) => {
    setSelected(role);
    try {
      const res = await axiosProvider.get(`/rbac/roles/${role._id}/permissions`);
      const perms = {};
      (res.data?.data || []).forEach((p) => {
        if (!perms[p.moduleSlug]) perms[p.moduleSlug] = {};
        perms[p.moduleSlug][p.action] = true;
      });
      setPermissions(perms);
    } catch {
      setPermissions({});
    }
  };

  const handlePermChange = (moduleSlug, action, checked) => {
    setPermissions((prev) => ({
      ...prev,
      [moduleSlug]: { ...(prev[moduleSlug] || {}), [action]: checked },
    }));
  };

  const savePermissions = async () => {
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
          </div>
          {loading ? (
            <div className="p-4 space-y-2 animate-pulse">
              {[1,2,3,4,5,6].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-lg" />)}
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {[
                { name: 'Super Admin', slug: ROLES.SUPER_ADMIN },
                { name: 'Admin', slug: ROLES.ADMIN },
                { name: 'Sub Admin', slug: ROLES.SUB_ADMIN },
                { name: 'Seller', slug: ROLES.SELLER },
                { name: 'Seller Admin', slug: ROLES.SELLER_ADMIN },
                { name: 'Seller Sub Admin', slug: ROLES.SELLER_SUB_ADMIN },
                ...roles.filter((r) => !Object.values(ROLES).includes(r.slug)),
              ].map((role) => (
                <li
                  key={role.slug || role._id}
                  onClick={() => selectRole(role)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selected?.slug === role.slug || selected?._id === role._id ? 'bg-[#F0F0F3]' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role.slug] || 'bg-gray-100 text-gray-600'}`}>
                      {role.name || role.slug}
                    </span>
                  </div>
                  {(selected?.slug === role.slug || selected?._id === role._id) && (
                    <MdCheck size={16} className="text-[#989AFF]" />
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
                  <h3 className="text-sm font-semibold text-gray-800">{selected.name || selected.slug}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Configure module access for this role</p>
                </div>
                {canEdit && (
                  <button
                    onClick={savePermissions}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#989AFF] rounded-lg hover:bg-[#7b7de8] disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Permissions'}
                  </button>
                )}
              </div>
              <PermissionMatrix
                modules={modules.length ? modules : [
                  { slug: 'products', name: 'Product Management' },
                  { slug: 'inventory', name: 'Inventory Management' },
                  { slug: 'orders', name: 'Order Management' },
                  { slug: 'users', name: 'User Management' },
                  { slug: 'rbac', name: 'RBAC Management' },
                  { slug: 'pricing', name: 'Marketing & Promotions' },
                  { slug: 'analytics', name: 'Analytics' },
                  { slug: 'tax', name: 'Tax & Compliance' },
                ]}
                rolePermissions={permissions}
                onChange={canEdit ? handlePermChange : undefined}
                readOnly={!canEdit}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-80 flex items-center justify-center text-gray-300">
              <div className="text-center">
                <MdSecurity size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">Select a role to view its permissions</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RolesPermissions;
