import React, { useState, useMemo, useEffect, useCallback } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getAdminUserDetails, updateModulePermission } from '../../../Redux/userManagementSlice';
import { listSellerSubAdmins } from '../../../Redux/sellerSubAdminsSlice';
import { toast } from 'sonner';
import Loader from '../../../components/Loader/Loader';
import PermissionsSelector from '../../../components/Atoms/PermissionsTab/PermissionsSelector';
import DefaultModal from '../../../components/DefaultModal/DefaultModal';
import { isSellerPanel } from '../../../_helpers/panelConfig';
import { apiRequest } from '../../../_helpers/apiConfig';
import { ENDPOINTS } from '../../../_helpers/endpoints';
import { getStoredRole, getStoredUser, normalizeRole } from '../../../_helpers/authStorage';

const ACTION_ALIASES = {
    create: 'add',
    edit: 'update',
    approve: 'action',
    review: 'action',
    manage: 'action',
    status: 'action',
    approval: 'action',
};
const ACTION_ALIASES_TO_STANDARD = {
    create: 'add',
    edit: 'update',
    status: 'action',
    approval: 'action',
    approve: 'action',
    review: 'action',
    manage: 'action',
};
const BACKEND_PERMISSION_ACTIONS = ['view', 'add', 'update', 'delete', 'action'];
const GOLD_GRADIENT = 'linear-gradient(90deg, #A26D27 0%, #CE9F2D 100%)';
const PRIMARY_BUTTON_CLASS = 'px-3 py-1.5 text-xs text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed';
const SECONDARY_BUTTON_CLASS = 'px-3 py-1.5 text-xs border border-[#CE9F2D] text-[#8A5A1F] rounded-md hover:bg-[#CE9F2D]/10 disabled:opacity-50 disabled:cursor-not-allowed';

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
            className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${checked ? 'border-transparent' : 'border-[#CE9F2D] bg-white'}`}
            style={checked ? { background: GOLD_GRADIENT } : undefined}
        >
            {checked && (
                <span className="h-1.5 w-2.5 -translate-y-px rotate-[-45deg] border-b-2 border-l-2 border-white" />
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
        .map((permission) => ACTION_ALIASES_TO_STANDARD[ACTION_ALIASES[permission.action] || permission.action] || permission.action)
        .filter(Boolean);
    const unique = Array.from(new Set(['view', ...actions]));
    return unique.filter((action) => BACKEND_PERMISSION_ACTIONS.includes(action));
};

const getAssignedModuleActions = (module) => {
    const assigned = (module.permissions || [])
        .filter((permission) => permission.assigned)
        .map((permission) => ACTION_ALIASES_TO_STANDARD[ACTION_ALIASES[permission.action] || permission.action] || permission.action)
        .filter(Boolean);
    return Array.from(new Set(assigned));
};

const normalizeActionsForBackend = (actions = []) => {
    const normalized = actions
        .map((action) => ACTION_ALIASES_TO_STANDARD[ACTION_ALIASES[action] || action] || action)
        .filter((action) => BACKEND_PERMISSION_ACTIONS.includes(action));

    const withView = normalized.includes('view') ? normalized : ['view', ...normalized];
    return Array.from(new Set(withView));
};

const ASSIGNMENT_ACTIONS = ['update', 'action', 'add', 'delete', 'view'];

const SIDEBAR_TAB_ORDER = [
    'Home',
    'Users',
    'Product Management',
    'Orders',
    'Seller Management',
    'Analytics',
    'Promotions',
    'Shipping/Pickup',
    'Tax',
    'Settings',
];

const getModuleCode = (module) =>
    module?.slug || module?.module || module?.module_code?.module_code || module?.module_code;

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
            .map((permission) => ACTION_ALIASES_TO_STANDARD[ACTION_ALIASES[permission.action] || permission.action] || permission.action)
            .filter((action) => BACKEND_PERMISSION_ACTIONS.includes(action));
        result[moduleCode] = new Set(Array.from(new Set(assigned)));
    });
    return result;
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
    const [pendingBulkAction, setPendingBulkAction] = useState(null);
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
        if (role === 'admin' || role === 'super-admin' || role === 'seller') {
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
                const hasAssignmentAction = ASSIGNMENT_ACTIONS.some((action) =>
                    rbacActions.has(action) || sellerAccessActions.has(action)
                );
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
        const allowedModules = Array.isArray(user?.allowedModules) ? user.allowedModules : [];
        const userUsesModuleScope = ['sub-admin', 'seller-sub-admin'].includes(user?.role);
        const label = user?.full_name || user?.userName || user?.email || '';

        setUserName(label);
        if (setModuleName) setModuleName(label);

        if (!modules.length) {
            setPermissions([]);
            return;
        }

        const visibleModules = modules
            .filter((module) => sellerPanel || !sidebarModuleSlugs.size || sidebarModuleSlugs.has(module.slug))
            .sort((a, b) => {
                const tabA = a.tab || a.metadata?.tab || '';
                const tabB = b.tab || b.metadata?.tab || '';
                const tabIndexA = SIDEBAR_TAB_ORDER.indexOf(tabA);
                const tabIndexB = SIDEBAR_TAB_ORDER.indexOf(tabB);
                const normalizedIndexA = tabIndexA === -1 ? SIDEBAR_TAB_ORDER.length : tabIndexA;
                const normalizedIndexB = tabIndexB === -1 ? SIDEBAR_TAB_ORDER.length : tabIndexB;
                if (normalizedIndexA !== normalizedIndexB) return normalizedIndexA - normalizedIndexB;
                return String(a.name || a.slug).localeCompare(String(b.name || b.slug));
            });

        setPermissions(visibleModules.map((module) => {
            const availablePermissions = getModuleActions(module);
            const actorModuleActions = actorPermissionMap[module.slug] || new Set();
            const effectiveAssignablePermissions = canAssignPermissions
                ? (hasActorPermissionCeiling
                    ? availablePermissions.filter((action) => action === 'view' || actorModuleActions.has(action))
                    : availablePermissions)
                : [];
            const assignedActions = getAssignedModuleActions(module).filter((action) => availablePermissions.includes(action));
            const selected = userUsesModuleScope
                ? allowedModules.includes(module.slug)
                : Boolean(module.assigned || assignedActions.length);
            const selectedPermissions = assignedActions.length
                ? assignedActions
                : (selected ? ['view'] : ['none']);
            return {
                id: module.slug,
                module: module.name || module.slug,
                tab: module.tab || module.metadata?.tab || module.slug,
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
    ]);

    useEffect(() => {
        setSelectedModules((prev) =>
            prev.filter((moduleId) => permissions.some((permission) => permission.id === moduleId && permission.canAssign))
        );
    }, [permissions]);

    const assignedModules = (items) => items
        .filter((item) => item.permissions.length && !item.permissions.includes('none'))
        .map((item) => item.id);

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
            String(permission.tab || '').toLowerCase().includes(filters.search.toLowerCase())
        );
    }, [permissions, filters.search]);

    const selectableFilteredPermissions = useMemo(
        () => filteredPermissions.filter((permission) => permission.canAssign),
        [filteredPermissions],
    );

    const selectedModuleSet = useMemo(() => new Set(selectedModules), [selectedModules]);

    const allFilteredSelected = selectableFilteredPermissions.length > 0 &&
        selectableFilteredPermissions.every((permission) => selectedModuleSet.has(permission.id));

    const handleModuleSelection = useCallback((moduleId, checked) => {
        setSelectedModules((prev = []) => {
            if (checked) return Array.from(new Set([...prev, moduleId]));
            return prev.filter((id) => id !== moduleId);
        });
    }, []);

    const handleSelectAll = useCallback((checked) => {
        if (!checked) {
            setSelectedModules((prev = []) =>
                prev.filter((moduleId) => !selectableFilteredPermissions.some((permission) => permission.id === moduleId))
            );
            return;
        }
        setSelectedModules((prev = []) =>
            Array.from(new Set([...prev, ...selectableFilteredPermissions.map((permission) => permission.id)]))
        );
    }, [selectableFilteredPermissions]);

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

    const tableData = useMemo(() => {
        return filteredPermissions.map((permission) => [
            <AccessCheckbox
                key={`select-${permission.id}`}
                checked={selectedModuleSet.has(permission.id)}
                disabled={!permission.canAssign}
                onChange={(checked) => handleModuleSelection(permission.id, checked)}
                ariaLabel={`Select ${permission.module}`}
            />,
            <div key={`module-${permission.id}`}>
                <div className="font-medium capitalize">{permission.module}</div>
                <div className="text-xs text-gray-500">{permission.tab}</div>
            </div>,
            <PermissionsSelector
                key={`perm-${permission.id}`}
                module={permission.module}
                selected={permission.permissions}
                availablePermissions={permission.canAssign ? permission.assignablePermissions : permission.availablePermissions}
                disabled={!permission.canAssign}
                onChange={(value) => handlePermissionChange(permission.id, value)}
            />,
        ]);
    }, [filteredPermissions, handleModuleSelection, handlePermissionChange, selectedModuleSet]);

    const storedRole = normalizeRole(getStoredRole());
    const canCreateSubSubAdmin = canAssignPermissions && (storedRole === 'admin' || storedRole === 'super-admin' || storedRole === 'sub-admin');

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <Loader loading={selector?.loading} />
            <div className="flex items-center justify-between flex-wrap gap-3">
                <nav className="flex space-x-1 text-sm text-gray-500 items-center">
                    <Link to="/app/home" className="hover:underline text-[#3E4094]">Home</Link>
                    <span>/</span>
                    <Link to="/app/admin-users" className="hover:underline text-[#3E4094]">Admin Users</Link>
                    <span>/</span>
                    <span className="text-gray-700 font-medium">Permissions</span>
                    {userName && <><span>/</span><span className="text-gray-800 font-semibold">{userName}</span></>}
                </nav>
                {canCreateSubSubAdmin && !sellerPanel && (
                    <button
                        type="button"
                        onClick={() => navigate('/app/admin-users')}
                        className={PRIMARY_BUTTON_CLASS}
                        style={{ background: GOLD_GRADIENT }}
                    >
                        + Add Sub-Admin
                    </button>
                )}
            </div>

            {/* Info banner showing what this user can access */}
            {userName && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="text-sm font-medium text-blue-800">{userName}</p>
                        <p className="text-xs text-blue-600 mt-0.5">
                            {canAssignPermissions
                                ? 'You can update access for modules you are allowed to manage.'
                                : 'You can view this user\'s module permissions. Contact an admin to make changes.'}
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white overflow-hidden border border-gray-200 rounded-lg">
                <div className="p-4 border-b">
                    <SearchComponent
                        filters={filters}
                        setFilters={setFilters}
                        placeholder="Search modules or tabs..."
                    />
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <AccessCheckbox
                                checked={allFilteredSelected}
                                disabled={!selectableFilteredPermissions.length}
                                onChange={handleSelectAll}
                                ariaLabel="Select all modules"
                            />
                            Select All
                        </div>
                        <span className="text-xs text-gray-500">Selected: {selectedModules.length} modules</span>
                        <button
                            type="button"
                            onClick={() => handleBulkPermissionUpdate('grant')}
                            disabled={!selectedModules.length}
                            className={PRIMARY_BUTTON_CLASS}
                            style={{ background: GOLD_GRADIENT }}
                        >
                            Allow ({selectedModules.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => handleBulkPermissionUpdate('revoke')}
                            disabled={!selectedModules.length}
                            className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Remove
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedModules([])}
                            disabled={!selectedModules.length}
                            className={SECONDARY_BUTTON_CLASS}
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <TableData
                        tableHeadings={['', 'Module', 'Permissions']}
                        data={tableData}
                        className="min-w-full"
                    />
                </div>
                {!permissions.length && (
                    <p className="p-6 text-sm text-gray-400 text-center">No modules found for this user.</p>
                )}
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
                buttonStyle={pendingBulkAction === 'grant' ? { background: GOLD_GRADIENT } : undefined}
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
        </div>
    );
};

export default UserPermissions;
