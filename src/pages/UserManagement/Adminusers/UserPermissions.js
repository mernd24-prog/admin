import React, { useState, useMemo, useEffect, useCallback } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getAdminUserDetails, getAllModulePermission, updateModulePermission } from '../../../Redux/userManagementSlice';
import { toast } from 'sonner';
import Loader from '../../../components/Loader/Loader';
import PermissionsSelector from '../../../components/Atoms/PermissionsTab/PermissionsSelector';

const ACTION_ALIASES = {
    create: 'add',
    update: 'edit',
    approve: 'approval',
    review: 'approval',
    manage: 'status',
    action: 'status',
};

const getPayload = (sliceData) => sliceData?.data?.data || sliceData?.normalized?.data || {};

const getModuleActions = (module) => {
    const actions = (module.permissions || [])
        .map((permission) => ACTION_ALIASES[permission.action] || permission.action)
        .filter(Boolean);
    const unique = Array.from(new Set(['view', ...actions]));
    return unique.filter((action) => ['view', 'add', 'edit', 'delete', 'status', 'approval'].includes(action));
};

const UserPermissions = ({ setModuleName }) => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const selector = useSelector(state => state.user);
    const [permissions, setPermissions] = useState([]);
    const [filters, setFilters] = useState({ search: '' });
    const [userName, setUserName] = useState('');

    useEffect(() => {
        if (id) {
            dispatch(getAdminUserDetails({ _id: id }));
            dispatch(getAllModulePermission({ role: 'sub-admin', includePermissions: true }));
        }
    }, [id, dispatch]);

    useEffect(() => {
        const user = getPayload(selector?.getAdminUserDetailsData);
        const modulePayload = getPayload(selector?.getAllModulePermissionData);
        const modules = modulePayload?.modules || modulePayload?.list || [];
        const allowedModules = Array.isArray(user?.allowedModules) ? user.allowedModules : [];
        const label = user?.full_name || user?.userName || user?.email || '';

        setUserName(label);
        if (setModuleName) setModuleName(label);

        if (!modules.length) {
            setPermissions([]);
            return;
        }

        setPermissions(modules.map((module) => {
            const selected = allowedModules.includes(module.slug);
            return {
                id: module.slug,
                module: module.name || module.slug,
                tab: module.slug,
                availablePermissions: getModuleActions(module),
                permissions: selected ? getModuleActions(module) : ['none'],
            };
        }));
    }, [selector?.getAdminUserDetailsData, selector?.getAllModulePermissionData, setModuleName]);

    const assignedModules = (items) => items
        .filter((item) => item.permissions.length && !item.permissions.includes('none'))
        .map((item) => item.id);

    const handlePermissionChange = useCallback((permissionId, newPermissions) => {
        const previous = permissions;
        const next = permissions.map((item) => {
            if (item.id !== permissionId) return item;
            const selected = newPermissions.includes('none') || !newPermissions.length
                ? ['none']
                : item.availablePermissions;
            return { ...item, permissions: selected };
        });
        const allowedModules = assignedModules(next);

        if (!allowedModules.length) {
            toast.error('At least one module is required for this admin user.');
            return;
        }

        setPermissions(next);
        dispatch(updateModulePermission({ _id: id, allowedModules }))
            .unwrap()
            .then((response) => {
                toast.success(response?.message || 'Permission updated successfully');
                dispatch(getAdminUserDetails({ _id: id }));
            })
            .catch((error) => {
                toast.error(error || 'Failed to update permissions');
                setPermissions(previous);
            });
    }, [permissions, dispatch, id]);

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
                onChange={(value) => handlePermissionChange(permission.id, value)}
            />,
        ]);
    }, [filteredPermissions, handlePermissionChange]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <Loader loading={selector?.loading} />
            <div className="flex items-center justify-between">
                <div>
                    <nav className="flex space-x-1 text-sm text-gray-500">
                        <span>Home</span>  <span>/</span>  <span>Admin User</span> <span>/</span>
                        <span className="text-gray-700 font-medium">Permissions</span>  <span>/</span>
                        <span className="text-gray-700 font-medium">{userName}</span>
                    </nav>
                </div>
            </div>

            <div className="bg-white overflow-hidden ">
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
            </div>
        </div>
    );
};

export default UserPermissions;
