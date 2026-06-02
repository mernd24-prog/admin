import React, { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../../../components/Shared';
import { axiosPrivate as axiosProvider } from '../../../_helpers/axiosProvider';
import { toast } from 'sonner';

const ACTION_COLORS = {
  grant:           'bg-green-100 text-green-700',
  revoke:          'bg-red-100 text-red-600',
  role_assign:     'bg-blue-100 text-blue-700',
  role_remove:     'bg-orange-100 text-orange-700',
  module_add:      'bg-teal-100 text-teal-700',
  module_remove:   'bg-yellow-100 text-yellow-700',
  template_apply:  'bg-purple-100 text-purple-700',
  force_logout:    'bg-pink-100 text-pink-700',
  copy_permissions:'bg-indigo-100 text-indigo-700',
};

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'grant', label: 'Grant' },
  { value: 'revoke', label: 'Revoke' },
  { value: 'role_assign', label: 'Role Assign' },
  { value: 'role_remove', label: 'Role Remove' },
  { value: 'template_apply', label: 'Template Apply' },
  { value: 'force_logout', label: 'Force Logout' },
  { value: 'copy_permissions', label: 'Copy Permissions' },
];

const PAGE_SIZE = 50;

const RbacAuditLog = () => {
  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const [filters, setFilters] = useState({
    targetUserId: '',
    actorId:      '',
    action:       '',
    moduleSlug:   '',
    from:         '',
    to:           '',
  });

  const load = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      const params = { page: currentPage, limit: PAGE_SIZE };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await axiosProvider.get('/rbac/audit-logs', { params });
      const data = res.data?.data || {};
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(1); setPage(1); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6">
      <PageHeader
        title="RBAC Audit Log"
        subtitle="Track all permission grants, revocations, role changes, and force logouts"
        breadcrumbs={[{ label: 'Users & Access' }, { label: 'RBAC Audit Log' }]}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[var(--admin-line)] shadow-sm p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block text-gray-500 mb-1 font-medium">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              className="w-full border border-[var(--admin-line)] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30"
            >
              {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-gray-500 mb-1 font-medium">Module</label>
            <input
              value={filters.moduleSlug}
              onChange={(e) => setFilters((f) => ({ ...f, moduleSlug: e.target.value }))}
              placeholder="e.g. products"
              className="w-full border border-[var(--admin-line)] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30"
            />
          </div>
          <div>
            <label className="block text-gray-500 mb-1 font-medium">Actor ID</label>
            <input
              value={filters.actorId}
              onChange={(e) => setFilters((f) => ({ ...f, actorId: e.target.value }))}
              placeholder="User ID"
              className="w-full border border-[var(--admin-line)] rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30"
            />
          </div>
          <div>
            <label className="block text-gray-500 mb-1 font-medium">Target User ID</label>
            <input
              value={filters.targetUserId}
              onChange={(e) => setFilters((f) => ({ ...f, targetUserId: e.target.value }))}
              placeholder="User ID"
              className="w-full border border-[var(--admin-line)] rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30"
            />
          </div>
          <div>
            <label className="block text-gray-500 mb-1 font-medium">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="w-full border border-[var(--admin-line)] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30"
            />
          </div>
          <div>
            <label className="block text-gray-500 mb-1 font-medium">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="w-full border border-[var(--admin-line)] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--admin-blue)]/30"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => setFilters({ targetUserId: '', actorId: '', action: '', moduleSlug: '', from: '', to: '' })}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear filters
          </button>
          <span className="text-xs text-gray-400 ml-auto">{total} total records</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[var(--admin-line)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-10 bg-[var(--admin-surface-soft)] rounded" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No audit log entries found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--admin-surface-soft)] border-b border-[var(--admin-line)]">
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Actor</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Target User</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide">Module / Permission</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f7efde]">
                {items.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-[var(--admin-surface-soft)]/60 transition-colors">
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap font-mono">
                        {row.created_at ? new Date(row.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ACTION_COLORS[row.action] || 'bg-gray-100 text-gray-600'}`}>
                          {row.action?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-mono text-[10px] text-gray-600">{row.actorId || '—'}</div>
                        <div className="text-[10px] text-gray-400 capitalize">{row.actorRole || ''}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-mono text-[10px] text-gray-600">{row.targetUserId || '—'}</div>
                        <div className="text-[10px] text-gray-400 capitalize">{row.targetRole || ''}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        {row.moduleSlug && (
                          <span className="px-1.5 py-0.5 bg-[var(--admin-blue)]/10 text-[var(--admin-blue)] rounded text-[10px] font-medium mr-1">
                            {row.moduleSlug}
                          </span>
                        )}
                        {row.permissionSlug && (
                          <span className="font-mono text-[10px] text-gray-500">{row.permissionSlug}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {(row.newValue || row.oldValue) && (
                          <button
                            onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                            className="text-gray-300 hover:text-[var(--admin-blue)] text-base leading-none"
                            title="Show diff"
                          >
                            {expanded === row.id ? '▲' : '▼'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === row.id && (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 bg-[var(--admin-surface-soft)]">
                          <div className="grid grid-cols-2 gap-4 text-[10px]">
                            {row.oldValue && (
                              <div>
                                <p className="font-semibold text-gray-500 mb-1 uppercase tracking-wide">Before</p>
                                <pre className="bg-white border border-[var(--admin-line)] rounded p-2 overflow-x-auto text-gray-600 font-mono">
                                  {JSON.stringify(row.oldValue, null, 2)}
                                </pre>
                              </div>
                            )}
                            {row.newValue && (
                              <div>
                                <p className="font-semibold text-gray-500 mb-1 uppercase tracking-wide">After</p>
                                <pre className="bg-white border border-[var(--admin-line)] rounded p-2 overflow-x-auto text-gray-600 font-mono">
                                  {JSON.stringify(row.newValue, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>Page {page} of {totalPages} ({total} records)</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => { setPage((p) => p - 1); load(page - 1); }}
              className="px-3 py-1.5 border border-[var(--admin-line)] rounded-lg hover:bg-[var(--admin-surface-soft)] disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => { setPage((p) => p + 1); load(page + 1); }}
              className="px-3 py-1.5 border border-[var(--admin-line)] rounded-lg hover:bg-[var(--admin-surface-soft)] disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RbacAuditLog;
