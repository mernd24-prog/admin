import { getAllowedModules, getStoredRole, normalizeRole } from './authStorage';

export const PERMISSION_ACTIONS = ['view', 'add', 'update', 'delete', 'action'];

export const normalizePermissionAction = (action = '') => {
  const value = String(action || '').trim().toLowerCase();
  if (value === 'create') return 'add';
  if (value === 'edit') return 'update';
  if (['approve', 'review', 'manage', 'status', 'approval'].includes(value)) return 'action';
  return value;
};

export const makePermission = (module, action = 'view') =>
  `${String(module || '').trim().toLowerCase()}:${normalizePermissionAction(action)}`;

export const getStoredPermissions = () => {
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const sessionUser = JSON.parse(sessionStorage.getItem('EcomAdmin') || '{}');
    const permissions = currentUser.permissions || sessionUser.permissions || [];
    return Array.isArray(permissions) ? permissions : [];
  } catch {
    return [];
  }
};

export const hasPermission = (module, action = 'view', options = {}) => {
  const role = normalizeRole(options.role || getStoredRole());
  if (role === 'super-admin' || role === 'seller') return true;

  const moduleSlug = String(module || '').trim().toLowerCase();
  if (!moduleSlug) return false;

  const allowedModules = (options.allowedModules || getAllowedModules()).map((item) =>
    String(item || '').trim().toLowerCase()
  );
  if (!allowedModules.includes(moduleSlug)) return false;

  const permissions = options.permissions || getStoredPermissions();
  const normalizedAction = normalizePermissionAction(action);
  return permissions.includes(makePermission(moduleSlug, normalizedAction)) || permissions.includes(normalizedAction);
};
