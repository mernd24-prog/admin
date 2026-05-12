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

const buildAssignedActionMap = (modules = []) => {
    const result = {};
    modules.forEach((module) => {
        const moduleCode = module?.slug || module?.module || module?.module_code?.module_code || module?.module_code;
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
    const hasActorPermissionCeiling = useMemo(
        () => Object.keys(actorPermissionMap || {}).length > 0,
        [actorPermissionMap],
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

        setPermissions(modules.map((module) => {
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
                tab: module.slug,
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
    ]);

    const assignedModules = (items) => items
        .filter((item) => item.permissions.length && !item.permissions.includes('none'))
        .map((item) => item.id);

    const assignedModulePermissions = (items) => items
        .filter((item) => item.permissions.length && !item.permissions.includes('none'))
        .map((item) => ({
            module: item.id,
            actions: normalizeActionsForBackend(item.permissions.filter((permission) => permission !== 'none')),
        }));

    const handlePermissionChange = useCallback((permissionId, newPermissions) => {
        const previous = permissions;
        const next = permissions.map((item) => {
            if (item.id !== permissionId) return item;
            if (!item.canAssign) return item;
            const allowedForAssigner = new Set(item.assignablePermissions || []);
            const selected = newPermissions.includes('none') || !newPermissions.length
                ? ['none']
                : Array.from(new Set(['view', ...newPermissions])).filter((permission) =>
                    item.availablePermissions.includes(permission) && allowedForAssigner.has(permission)
                );
            return { ...item, permissions: selected };
        });
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
        dispatch(updateModulePermission({ _id: id, allowedModules, modulePermissions }))
            .unwrap()
            .then((response) => {
                toast.success(response?.message || 'Permission updated successfully');
                if (sellerPanel) {
                    dispatch(listSellerSubAdmins());
                } else {
                    dispatch(getAdminUserDetails({ _id: id }));
                }
            })
            .catch((error) => {
                toast.error(error || 'Failed to update permissions');
                setPermissions(previous);
            });
    }, [permissions, dispatch, id, sellerPanel, canAssignPermissions]);

    const filteredPermissions = useMemo(() => {
        return permissions.filter(permission =>
            String(permission.module || '').toLowerCase().includes(filters.search.toLowerCase()) ||
            String(permission.tab || '').toLowerCase().includes(filters.search.toLowerCase())
        );
    }, [permissions, filters.search]);

    const tableData = useMemo(() => {
        return filteredPermissions.map((permission) => [
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
    }, [filteredPermissions, handlePermissionChange]);

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
                        className="px-3 py-1.5 text-xs bg-[#3E4094] text-white rounded-md hover:bg-[#2e3074]"
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
                                ? 'You can assign permissions for modules you have access to. Toggle actions below to grant or revoke access.'
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
                </div>
                <div className="overflow-x-auto">
                    <TableData
                        tableHeadings={['Module', 'Permissions']}
                        data={tableData}
                        className="min-w-full"
                    />
                </div>
                {!permissions.length && (
                    <p className="p-6 text-sm text-gray-400 text-center">No modules found for this user.</p>
                )}
            </div>
        </div>
    );
};

export default UserPermissions;
