import React, { useState, useMemo, useEffect, useCallback } from 'react';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import { useParams, useNavigate } from 'react-router-dom';
import { MdAdd, MdCheck, MdInfoOutline, MdBarChart, MdClose, MdRefresh } from 'react-icons/md';
import { useDispatch, useSelector } from 'react-redux';
import { getAdminUserDetails, updateModulePermission } from '../../../Redux/userManagementSlice';
import { listSellerSubAdmins } from '../../../Redux/sellerSubAdminsSlice';
import { toast } from 'sonner';
import Loader from '../../../components/Loader/Loader';
import PermissionsSelector from '../../../components/Atoms/PermissionsTab/PermissionsSelector';
import DefaultModal from '../../../components/DefaultModal/DefaultModal';
import { PageHeader } from '../../../components/Shared';
import { isSellerPanel } from '../../../_helpers/panelConfig';
import { apiRequest } from '../../../_helpers/apiConfig';
import { ENDPOINTS } from '../../../_helpers/endpoints';
import { getStoredRole, getStoredUser, normalizeRole } from '../../../_helpers/authStorage';
import { MODULE_TAB_ORDER } from '../../../_helpers/rbacRoutes';
import { axiosPrivate as axiosProvider } from '../../../_helpers/axiosProvider';

const ACTION_ALIASES = {
    review: 'approval',
    manage: 'status',
};
const ACTION_EQUIVALENTS = {
    create: ['add'],
    add: ['create'],
    edit: ['update'],
    update: ['edit'],
    approve: ['approval'],
    approval: ['approve'],
    status: ['status_change', 'action'],
    status_change: ['status', 'action'],
    manage: ['status', 'action'],
    action: ['status', 'status_change', 'manage'],
};
const BACKEND_PERMISSION_ACTIONS = [
    'view',
    'create',
    'add',
    'edit',
    'update',
    'delete',
    'approve',
    'approval',
    'reject',
    'assign',
    'export',
    'import',
    'status_change',
    'status',
    'restore',
    'bulk_action',
    'action',
];
const SEARCH_ACCENT = '#082f91';
const PRIMARY_BUTTON_CLASS = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#082f91] rounded-lg hover:bg-[#06256f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
const SECONDARY_BUTTON_CLASS = 'px-4 py-2 text-sm font-medium border border-[#082f91] text-[#082f91] rounded-lg hover:bg-[#eef3ff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

const normalizeAction = (action = '') => {
    const value = String(action || '').trim().toLowerCase();
    return ACTION_ALIASES[value] || value;
};

const normalizeModuleCode = (value = '') =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/_/g, '-');

const expandActionCandidates = (action = '') => {
    const normalized = normalizeAction(action);
    const aliases = ACTION_EQUIVALENTS[normalized] || [];
    return Array.from(new Set([normalized, ...aliases]));
};

const AccessCheckbox = ({ checked, disabled, onChange, ariaLabel }) => (
    <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={(event) => {
            event.stopPropagation();
            if (typeof onChange === 'function') {
                onChange(!checked);
            }
        }}
        className={`inline-flex h-4 w-4 items-center justify-center bg-transparent p-0 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
        <span
            className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${checked ? 'border-[#082f91] bg-[#082f91]' : 'border-[#082f91] bg-white'}`}
        >
            {checked && (
                <MdCheck size={13} className="text-white" />
            )}
        </span>
    </button>
);

const getPayload = (sliceData) => sliceData?.data?.data || sliceData?.normalized?.data || {};

const getListItems = (sliceData) => {
    const payload = getPayload(sliceData);
    if (Array.isArray(payload)) return payload;
    return payload?.list || payload?.items || [];
};

const getModuleActions = (module) => {
    const actions = (module.permissions || [])
        .map((permission) => normalizeAction(permission.action))
        .filter(Boolean);
    const unique = Array.from(new Set(['view', ...actions]));
    return unique.filter((action) => BACKEND_PERMISSION_ACTIONS.includes(action));
};

const getAssignedModuleActions = (module) => {
    const assigned = (module.permissions || [])
        .filter((permission) => permission.assigned)
        .map((permission) => normalizeAction(permission.action))
        .filter(Boolean);
    return Array.from(new Set(assigned));
};

const normalizeActionsForBackend = (actions = []) => {
    const normalized = actions
        .map((action) => normalizeAction(action))
        .filter((action) => BACKEND_PERMISSION_ACTIONS.includes(action));

    const withView = normalized.includes('view') ? normalized : ['view', ...normalized];
    return Array.from(new Set(withView));
};

const ASSIGNMENT_ACTIONS = ['assign', 'create', 'add', 'edit', 'update', 'approval', 'approve', 'status', 'status_change', 'action', 'delete'];

const getModuleCode = (module) =>
    normalizeModuleCode(
        module?.slug ||
        module?.moduleKey ||
        module?.moduleSlug ||
        module?.module ||
        module?.module_code?.module_code ||
        module?.module_code ||
        module?.metadata?.requiredModule
    );

const hasAssignedModuleAccess = (module = {}) => {
    if (module.assigned) return true;
    return (module.permissions || []).some((permission) => permission?.assigned);
};

const buildAssignedActionMap = (modules = []) => {
    const result = {};
    modules.forEach((module) => {
        const moduleCode = getModuleCode(module);
        if (!moduleCode) return;
        const assigned = (module.permissions || [])
            .filter((permission) => permission?.assigned)
            .flatMap((permission) => expandActionCandidates(permission.action))
            .filter((action) => BACKEND_PERMISSION_ACTIONS.includes(action));
        result[moduleCode] = new Set(Array.from(new Set(assigned)));
    });
    return result;
};

/* ─── Effective Permissions Modal ───────────────────────────────────────── */
const ACTION_BADGE_COLORS = {
  view:          'bg-blue-50 text-blue-600 border-blue-100',
  create:        'bg-green-50 text-green-600 border-green-100',
  update:        'bg-amber-50 text-amber-600 border-amber-100',
  delete:        'bg-red-50 text-red-600 border-red-100',
  status_change: 'bg-purple-50 text-purple-600 border-purple-100',
  approve:       'bg-teal-50 text-teal-600 border-teal-100',
  reject:        'bg-orange-50 text-orange-600 border-orange-100',
  assign:        'bg-indigo-50 text-indigo-600 border-indigo-100',
  export:        'bg-gray-50 text-gray-600 border-gray-200',
};

const EffectivePermissionsModal = ({ userId, userName, onClose }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosProvider.get(`/rbac/users/${userId}/permissions/effective`);
      setData(res.data?.data || {});
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to load effective permissions');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const modules = data?.permissionsByAction
    ? Object.entries(
        (data.effectivePermissions || []).reduce((acc, slug) => {
          const [mod, action] = slug.split(':');
          if (!acc[mod]) acc[mod] = [];
          acc[mod].push(action);
          return acc;
        }, {})
      )
    : [];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-[#e7dfd1]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7dfd1] bg-[#faf6ee] rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Effective Permissions</h3>
            <p className="text-xs text-gray-400 mt-0.5">{userName} — final computed access</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-1.5 text-gray-400 hover:text-[#3E4094] rounded-lg hover:bg-white transition-colors" title="Reload">
              <MdRefresh size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-white transition-colors">
              <MdClose size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3,4].map((i) => <div key={i} className="h-10 bg-[#faf6ee] rounded-lg" />)}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">{error}</div>
          ) : (
            <div className="space-y-4">
              {/* Summary stats */}
              {data && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Role Permissions',   count: (data.rolePermissions || []).length,   color: 'text-blue-600 bg-blue-50 border-blue-100' },
                    { label: 'Extra User Grants',  count: (data.extraUserPermissions || []).length, color: 'text-green-600 bg-green-50 border-green-100' },
                    { label: 'Denied',             count: (data.deniedPermissions || []).length,  color: 'text-red-600 bg-red-50 border-red-100' },
                  ].map(({ label, count, color }) => (
                    <div key={label} className={`rounded-lg border p-3 text-center ${color}`}>
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-xs mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Per-module breakdown */}
              {modules.length ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Module Access Breakdown</h4>
                  {modules.map(([mod, actions]) => (
                    <div key={mod} className="flex items-start gap-3 p-3 rounded-lg border border-[#e7dfd1] bg-white">
                      <div className="w-36 shrink-0">
                        <p className="text-xs font-semibold text-gray-700 capitalize">{mod.replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{mod}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {actions.map((action) => (
                          <span
                            key={action}
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${ACTION_BADGE_COLORS[action] || 'bg-gray-50 text-gray-500 border-gray-200'}`}
                          >
                            {action.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-400">
                  <MdBarChart size={32} className="mx-auto mb-2 text-gray-200" />
                  No effective permissions found
                </div>
              )}

              {/* Denied permissions */}
              {data?.deniedPermissions?.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wide">Explicitly Denied</h4>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-red-50 rounded-lg border border-red-100">
                    {data.deniedPermissions.map((slug) => (
                      <span key={slug} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 font-mono">
                        {slug}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[#e7dfd1] bg-[#faf6ee] rounded-b-2xl shrink-0">
          <p className="text-[10px] text-gray-400">
            Formula: Role permissions + User direct grants + Sidebar expansions − Denied permissions
          </p>
        </div>
      </div>
    </div>
  );
};

const UserPermissions = ({ setModuleName }) => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const selector = useSelector(state => state.user);
    const sellerSelector = useSelector(state => state.sellerSubAdmins);
    const sellerPanel = isSellerPanel();
    const [permissions, setPermissions] = useState([]);
    const [filters, setFilters] = useState({ search: '' });
    const [userName, setUserName] = useState('');
    const [modulePayload, setModulePayload] = useState({});
    const [actorPermissionMap, setActorPermissionMap] = useState({});
    const [canAssignPermissions, setCanAssignPermissions] = useState(false);
    const [selectedModules, setSelectedModules] = useState([]);
    const [selectedTabName, setSelectedTabName] = useState('');
    const [pendingBulkAction, setPendingBulkAction] = useState(null);
    const [showEffective, setShowEffective] = useState(false);
    const hasActorPermissionCeiling = useMemo(
        () => Object.keys(actorPermissionMap || {}).length > 0,
        [actorPermissionMap],
    );
    const sidebarModules = selector?.getMyModulePermissionData?.data?.data?.modules;
    const sidebarModuleSlugs = useMemo(
        () => new Set(
            (Array.isArray(sidebarModules) ? sidebarModules : [])
                .filter(hasAssignedModuleAccess)
                .map(getModuleCode)
                .filter(Boolean)
        ),
        [sidebarModules],
    );
    const sidebarTabOrder = MODULE_TAB_ORDER;

    useEffect(() => {
        if (id) {
            if (sellerPanel) {
                dispatch(listSellerSubAdmins());
            } else {
                dispatch(getAdminUserDetails({ _id: id }));
            }
        }
    }, [id, dispatch, sellerPanel]);

    useEffect(() => {
        let isMounted = true;
        const role = normalizeRole(getStoredRole());
        if (role === 'super-admin' || role === 'seller') {
            setCanAssignPermissions(true);
            setActorPermissionMap({});
            return () => {
                isMounted = false;
            };
        }

        const currentUser = getStoredUser() || {};
        const currentUserId = currentUser?._id || currentUser?.id || currentUser?.userId;
        if (!currentUserId) {
            setCanAssignPermissions(false);
            setActorPermissionMap({});
            return () => {
                isMounted = false;
            };
        }

        apiRequest('GET', ENDPOINTS.adminAccess.modules, {
            userId: currentUserId,
            role,
            includePermissions: true,
        })
            .then((response) => {
                if (!isMounted) return;
                const payload = response?.data?.data || response?.normalized?.data || response?.data || {};
                const modules = Array.isArray(payload?.modules) ? payload.modules : [];
                const map = buildAssignedActionMap(modules);
                setActorPermissionMap(map);
                const rbacActions = map.rbac || map['admin-users'] || new Set();
                const sellerAccessActions = map.sellers || new Set();
                const hasNamedAssignmentAction = ASSIGNMENT_ACTIONS.some((action) =>
                    rbacActions.has(action) || sellerAccessActions.has(action)
                );
                const hasAssignmentAction = hasNamedAssignmentAction;
                setCanAssignPermissions(hasAssignmentAction);
            })
            .catch(() => {
                if (!isMounted) return;
                setCanAssignPermissions(false);
                setActorPermissionMap({});
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const sellerSubAdmins = getListItems(sellerSelector?.listSubAdminsData);
        const user = sellerPanel
            ? sellerSubAdmins.find((item) =>
                String(item?._id || item?.id || item?.userId) === String(id)
            )
            : getPayload(selector?.getAdminUserDetailsData);
        const selectedUserId = user?._id || user?.id || user?.userId;
        if (!id || !selectedUserId || String(selectedUserId) !== String(id)) return;

        apiRequest('GET', ENDPOINTS.adminAccess.modules, {
            userId: selectedUserId,
            role: user?.role || 'sub-admin',
            includePermissions: true,
        })
            .then((response) => {
                setModulePayload(response?.data?.data || response?.normalized?.data || response?.data || {});
            })
            .catch(() => {
                setModulePayload({});
            });
    }, [
        id,
        dispatch,
        sellerPanel,
        selector?.getAdminUserDetailsData,
        sellerSelector?.listSubAdminsData,
    ]);

    useEffect(() => {
        const sellerSubAdmins = getListItems(sellerSelector?.listSubAdminsData);
        const user = sellerPanel
            ? sellerSubAdmins.find((item) =>
                String(item?._id || item?.id || item?.userId) === String(id)
            )
            : getPayload(selector?.getAdminUserDetailsData);
        const modules = modulePayload?.modules || modulePayload?.list || [];
        const allowedModules = Array.isArray(user?.allowedModules)
            ? user.allowedModules.map(normalizeModuleCode)
            : [];
        const userUsesModuleScope = ['sub-admin', 'seller-admin', 'seller-sub-admin'].includes(user?.role);
        const label = user?.full_name || user?.userName || user?.email || '';

        setUserName(label);
        if (setModuleName) setModuleName(label);

        if (!modules.length) {
            setPermissions([]);
            return;
        }

        const visibleModules = modules
            .filter((module) => {
                const moduleSlug = getModuleCode(module);
                return sellerPanel || !sidebarModuleSlugs.size || sidebarModuleSlugs.has(moduleSlug);
            })
            .sort((a, b) => {
                const tabA = a.tab || a.metadata?.tab || '';
                const tabB = b.tab || b.metadata?.tab || '';
                const tabIndexA = sidebarTabOrder.indexOf(tabA);
                const tabIndexB = sidebarTabOrder.indexOf(tabB);
                const normalizedIndexA = tabIndexA === -1 ? sidebarTabOrder.length : tabIndexA;
                const normalizedIndexB = tabIndexB === -1 ? sidebarTabOrder.length : tabIndexB;
                if (normalizedIndexA !== normalizedIndexB) return normalizedIndexA - normalizedIndexB;
                return String(a.name || a.slug).localeCompare(String(b.name || b.slug));
            });

        setPermissions(visibleModules.map((module) => {
            const moduleSlug = getModuleCode(module);
            const availablePermissions = getModuleActions(module);
            const actorModuleActions = actorPermissionMap[moduleSlug] || new Set();
            const effectiveAssignablePermissions = canAssignPermissions
                ? (hasActorPermissionCeiling
                    ? availablePermissions.filter((action) =>
                        action === 'view' ||
                        expandActionCandidates(action).some((candidate) => actorModuleActions.has(candidate))
                    )
                    : availablePermissions)
                : [];
            const assignedActions = getAssignedModuleActions(module).filter((action) => availablePermissions.includes(action));
            const selected = userUsesModuleScope
                ? allowedModules.includes(moduleSlug)
                : Boolean(module.assigned || assignedActions.length);
            const selectedPermissions = assignedActions.length
                ? assignedActions
                : (selected ? ['view'] : ['none']);
            return {
                id: moduleSlug,
                module: module.name || moduleSlug,
                tab: module.tab || module.metadata?.tab || moduleSlug,
                availablePermissions,
                assignablePermissions: effectiveAssignablePermissions,
                canAssign: canAssignPermissions && effectiveAssignablePermissions.includes('view'),
                permissions: selectedPermissions,
            };
        }));
    }, [
        id,
        sellerPanel,
        selector?.getAdminUserDetailsData,
        modulePayload,
        sellerSelector?.listSubAdminsData,
        setModuleName,
        actorPermissionMap,
        hasActorPermissionCeiling,
        canAssignPermissions,
        sidebarModuleSlugs,
        sidebarTabOrder,
    ]);

    useEffect(() => {
        setSelectedModules((prev) =>
            prev.filter((moduleId) => permissions.some((permission) => permission.id === moduleId && permission.canAssign))
        );
    }, [permissions]);

    const assignedModules = (items) => Array.from(new Set(
        items
            .filter((item) => item.permissions.length && !item.permissions.includes('none'))
            .map((item) => item.id)
            .filter(Boolean)
    ));

    const assignedModulePermissions = (items) => items
        .filter((item) => item.permissions.length && !item.permissions.includes('none'))
        .map((item) => ({
            module: item.id,
            actions: normalizeActionsForBackend(item.permissions.filter((permission) => permission !== 'none')),
        }));

    const refreshUserPermissions = useCallback(() => {
        if (sellerPanel) {
            dispatch(listSellerSubAdmins());
        } else {
            dispatch(getAdminUserDetails({ _id: id }));
        }
    }, [dispatch, id, sellerPanel]);

    const persistPermissionChanges = useCallback((next, previous, successMessage = 'Permission updated successfully') => {
        const allowedModules = assignedModules(next);
        const modulePermissions = assignedModulePermissions(next);

        if (!allowedModules.length) {
            toast.error('At least one module is required for this user.');
            return;
        }
        if (!canAssignPermissions) {
            toast.error('You do not have permission to assign module permissions.');
            return;
        }

        setPermissions(next);
        return dispatch(updateModulePermission({ _id: id, allowedModules, modulePermissions }))
            .unwrap()
            .then((response) => {
                toast.success(response?.message || successMessage);
                refreshUserPermissions();
            })
            .catch((error) => {
                toast.error(error || 'Failed to update permissions');
                setPermissions(previous);
            });
    }, [canAssignPermissions, dispatch, id, refreshUserPermissions]);

    const normalizeSelectedPermissions = (item, newPermissions) => {
        const allowedForAssigner = new Set(item.assignablePermissions || []);
        if (newPermissions.includes('none') || !newPermissions.length) {
            return ['none'];
        }
        const selected = Array.from(new Set(['view', ...newPermissions])).filter((permission) =>
            item.availablePermissions.includes(permission) && allowedForAssigner.has(permission)
        );
        return selected.length ? selected : ['none'];
    };

    const handlePermissionChange = useCallback((permissionId, newPermissions) => {
        const previous = permissions;
        const next = permissions.map((item) => {
            if (item.id !== permissionId) return item;
            if (!item.canAssign) return item;
            return { ...item, permissions: normalizeSelectedPermissions(item, newPermissions) };
        });

        persistPermissionChanges(next, previous);
    }, [permissions, persistPermissionChanges]);

    const filteredPermissions = useMemo(() => {
        return permissions.filter(permission =>
            String(permission.module || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            String(permission.tab || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            String(permission.id || '').toLowerCase().includes(filters.search.toLowerCase())
        );
    }, [permissions, filters.search]);

    const groupedPermissions = useMemo(() => {
        const grouped = filteredPermissions.reduce((acc, permission) => {
            const tabName = permission.tab || 'Other';
            if (!acc[tabName]) acc[tabName] = [];
            acc[tabName].push(permission);
            return acc;
        }, {});

        return Object.entries(grouped)
            .map(([tabName, items]) => ({
                tabName,
                items: [...items].sort((a, b) =>
                    String(a.module || a.id).localeCompare(String(b.module || b.id))
                ),
            }))
            .sort((a, b) => {
                const indexA = sidebarTabOrder.indexOf(a.tabName);
                const indexB = sidebarTabOrder.indexOf(b.tabName);
                const safeA = indexA === -1 ? sidebarTabOrder.length : indexA;
                const safeB = indexB === -1 ? sidebarTabOrder.length : indexB;
                if (safeA !== safeB) return safeA - safeB;
                return a.tabName.localeCompare(b.tabName);
            });
    }, [filteredPermissions, sidebarTabOrder]);

    useEffect(() => {
        if (!groupedPermissions.length) {
            setSelectedTabName('');
            return;
        }
        const selectedExists = groupedPermissions.some((group) => group.tabName === selectedTabName);
        if (!selectedExists) {
            setSelectedTabName(groupedPermissions[0].tabName);
        }
    }, [groupedPermissions, selectedTabName]);

    const activeGroup = useMemo(
        () => groupedPermissions.find((group) => group.tabName === selectedTabName) || groupedPermissions[0],
        [groupedPermissions, selectedTabName],
    );

    const activeItems = useMemo(() => activeGroup?.items || [], [activeGroup]);
    const activeSelectableItems = useMemo(
        () => activeItems.filter((permission) => permission.canAssign),
        [activeItems],
    );

    const selectedModuleSet = useMemo(() => new Set(selectedModules), [selectedModules]);

    const handleModuleSelection = useCallback((moduleId, checked) => {
        setSelectedModules((prev = []) => {
            if (checked) return Array.from(new Set([...prev, moduleId]));
            return prev.filter((id) => id !== moduleId);
        });
    }, []);

    const handleGroupSelection = useCallback((items = [], checked) => {
        const selectableIds = items
            .filter((permission) => permission.canAssign)
            .map((permission) => permission.id);
        if (!selectableIds.length) return;

        setSelectedModules((prev = []) => {
            if (checked) return Array.from(new Set([...prev, ...selectableIds]));
            return prev.filter((id) => !selectableIds.includes(id));
        });
    }, []);

    const applyBulkPermissionUpdate = useCallback(() => {
        if (!selectedModules.length || !pendingBulkAction) return;
        const selectedSet = new Set(selectedModules);
        const previous = permissions;
        const next = permissions.map((item) => {
            if (!selectedSet.has(item.id) || !item.canAssign) return item;
            if (pendingBulkAction === 'grant') {
                return {
                    ...item,
                    permissions: normalizeSelectedPermissions(item, item.assignablePermissions || ['view']),
                };
            }
            return { ...item, permissions: ['none'] };
        });

        persistPermissionChanges(
            next,
            previous,
            pendingBulkAction === 'grant' ? 'Access allowed for selected modules' : 'Access removed from selected modules',
        )?.then(() => {
            setSelectedModules([]);
            setPendingBulkAction(null);
        });
    }, [pendingBulkAction, permissions, persistPermissionChanges, selectedModules]);

    const handleBulkPermissionUpdate = useCallback((action) => {
        if (!selectedModules.length) return;
        setPendingBulkAction(action);
    }, [selectedModules.length]);

    const storedRole = normalizeRole(getStoredRole());
    const canCreateSubSubAdmin = canAssignPermissions && (storedRole === 'admin' || storedRole === 'super-admin');

    return (
        <div className="p-6">
            <Loader loading={selector?.loading} />
            <PageHeader
                title="User Permissions"
                subtitle={userName ? `Manage module access for ${userName}` : 'Manage user module access'}
                breadcrumbs={[
                    { label: 'Users & Access' },
                    { label: 'Admin Users', to: '/app/admin-users' },
                    { label: 'Permissions' },
                ]}
                actions={
                  <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowEffective(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#3E4094] border border-[#3E4094] rounded-lg hover:bg-[#eef3ff] transition-colors"
                        title="View final computed permissions for this user"
                    >
                        <MdBarChart size={16} /> Effective Permissions
                    </button>
                    {canCreateSubSubAdmin && !sellerPanel && (
                        <button
                            type="button"
                            onClick={() => navigate('/app/admin-users')}
                            className={PRIMARY_BUTTON_CLASS}
                        >
                            <MdAdd size={16} /> Add Sub-Admin
                        </button>
                    )}
                  </div>
                }
            />

            {/* Info banner showing what this user can access */}
            {userName && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#b7c5e6] bg-white p-4 shadow-sm">
                    <MdInfoOutline size={18} className="mt-0.5 flex-shrink-0 text-[#082f91]" />
                    <div>
                        <p className="text-sm font-semibold text-gray-800">{userName}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                            {canAssignPermissions
                                ? 'You can update access for modules you are allowed to manage.'
                                : 'You can view this user\'s module permissions. Contact an admin to make changes.'}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div className="overflow-hidden rounded-xl border border-[#b7c5e6] bg-white shadow-sm">
                    <div className="border-b border-[#b7c5e6] px-4 py-3">
                        <h3 className="text-sm font-semibold text-gray-700">Modules</h3>
                        <div className="mt-3">
                            <SearchComponent
                                filters={filters}
                                setFilters={setFilters}
                                placeholder="Search modules..."
                            />
                        </div>
                    </div>
                    {groupedPermissions.length ? (
                        <ul className="divide-y divide-[#eef3ff]">
                            {groupedPermissions.map(({ tabName, items }) => {
                                const selectableItems = items.filter((permission) => permission.canAssign);
                                const selectedInGroup = selectableItems.filter((permission) => selectedModuleSet.has(permission.id)).length;
                                const assignedInGroup = items.filter((permission) =>
                                    permission.permissions.length && !permission.permissions.includes('none')
                                ).length;
                                const isActive = activeGroup?.tabName === tabName;

                                return (
                                    <li
                                        key={tabName}
                                        onClick={() => setSelectedTabName(tabName)}
                                        className={`flex cursor-pointer items-center justify-between gap-3 border-l-2 px-4 py-3 transition-colors hover:bg-gray-50 ${isActive ? 'border-l-[#082f91] bg-[#eef3ff]' : 'border-l-transparent'}`}
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-gray-700">{tabName}</p>
                                            <p className="text-xs text-gray-400">
                                                {assignedInGroup}/{items.length} access
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!!selectedInGroup && (
                                                <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-xs font-medium text-[#082f91]">
                                                    {selectedInGroup}
                                                </span>
                                            )}
                                            {isActive && <MdCheck size={16} className="text-[#082f91]" />}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="p-6 text-center text-sm text-gray-400">No modules found.</p>
                    )}
                </div>

                <div className="lg:col-span-3">
                    {activeGroup ? (
                        <div className="overflow-hidden rounded-xl border border-[#b7c5e6] bg-white shadow-sm">
                            <div className="border-b border-[#b7c5e6] px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-800">{activeGroup.tabName}</h3>
                                        <p className="mt-0.5 text-xs text-gray-400">
                                            {activeItems.length} module{activeItems.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                                            <AccessCheckbox
                                                checked={activeSelectableItems.length > 0 && activeSelectableItems.every((permission) => selectedModuleSet.has(permission.id))}
                                                disabled={!activeSelectableItems.length}
                                                onChange={(checked) => handleGroupSelection(activeItems, checked)}
                                                ariaLabel={`Select ${activeGroup.tabName}`}
                                            />
                                            Select Module
                                        </div>
                                        <span className="text-xs text-gray-500">Selected: {selectedModules.length}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleBulkPermissionUpdate('grant')}
                                            disabled={!selectedModules.length}
                                            className={PRIMARY_BUTTON_CLASS}
                                        >
                                            Allow ({selectedModules.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleBulkPermissionUpdate('revoke')}
                                            disabled={!selectedModules.length}
                                            className="px-4 py-2 text-sm font-medium border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Remove
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedModules([])}
                                            disabled={!selectedModules.length}
                                            className={SECONDARY_BUTTON_CLASS}
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 p-4">
                                {activeItems.map((permission) => (
                                    <div
                                        key={permission.id}
                                        className="grid grid-cols-1 gap-3 rounded-lg border border-[#b7c5e6] p-3 transition-colors hover:bg-[#eef3ff]/60 md:grid-cols-[minmax(180px,260px),1fr]"
                                    >
                                        <div className="flex items-start gap-2">
                                            <AccessCheckbox
                                                checked={selectedModuleSet.has(permission.id)}
                                                disabled={!permission.canAssign}
                                                onChange={(checked) => handleModuleSelection(permission.id, checked)}
                                                ariaLabel={`Select ${permission.module}`}
                                            />
                                            <div>
                                                <p className="text-sm font-medium capitalize text-gray-700">{permission.module}</p>
                                                <p className="text-xs text-gray-400">{permission.id}</p>
                                            </div>
                                        </div>
                                        <PermissionsSelector
                                            module={permission.module}
                                            selected={permission.permissions}
                                            availablePermissions={permission.canAssign ? permission.assignablePermissions : permission.availablePermissions}
                                            disabled={!permission.canAssign}
                                            onChange={(value) => handlePermissionChange(permission.id, value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-80 items-center justify-center rounded-xl border border-[#b7c5e6] bg-white text-sm text-gray-300 shadow-sm">
                            Select a section to view modules
                        </div>
                    )}
                </div>
            </div>

            <DefaultModal
                isOpen={Boolean(pendingBulkAction)}
                closeModal={() => setPendingBulkAction(null)}
                heading={pendingBulkAction === 'grant' ? 'Allow access?' : 'Remove access?'}
                submitButtonChildren={pendingBulkAction === 'grant' ? 'Allow' : 'Remove'}
                cancelButtonChildren="Cancel"
                modalClassName="max-w-md"
                childrenClassName="text-sm text-gray-600"
                buttonClassName={pendingBulkAction === 'revoke' ? '!bg-red-600 !text-white hover:!bg-red-700' : '!text-white'}
                buttonStyle={pendingBulkAction === 'grant' ? { background: SEARCH_ACCENT } : undefined}
                onSubmit={applyBulkPermissionUpdate}
                closeButton
            >
                <p>
                    {pendingBulkAction === 'grant'
                        ? `Give this user access to ${selectedModules.length} selected module${selectedModules.length !== 1 ? 's' : ''}?`
                        : `Remove this user's access from ${selectedModules.length} selected module${selectedModules.length !== 1 ? 's' : ''}?`}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                    This will update the user's module access.
                </p>
            </DefaultModal>

            {showEffective && (
                <EffectivePermissionsModal
                    userId={id}
                    userName={userName}
                    onClose={() => setShowEffective(false)}
                />
            )}
        </div>
    );
};

export default UserPermissions;
