import { getAllowedModules, getStoredRole, normalizeRole } from './authStorage';

export const PERMISSION_ACTIONS = [
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

export const normalizePermissionAction = (action = '') => {
  const value = String(action || '').trim().toLowerCase();
  return ACTION_ALIASES[value] || value;
};

export const makePermission = (module, action = 'view') =>
  `${String(module || '').trim().toLowerCase()}:${normalizePermissionAction(action)}`;

const getModuleFromPermission = (permission = '') => {
  const value = String(permission || '').trim().toLowerCase();
  if (!value.includes(':')) return '';
  return value.split(':')[0];
};

const buildActionCandidates = (action = 'view') => {
  const normalized = normalizePermissionAction(action);
  const aliases = ACTION_EQUIVALENTS[normalized] || [];
  return Array.from(new Set([normalized, ...aliases]));
};

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

  const permissions = options.permissions || getStoredPermissions();
  const permissionModules = permissions
    .map(getModuleFromPermission)
    .filter(Boolean);
  const moduleScope = new Set([...allowedModules, ...permissionModules]);
  if (!moduleScope.has(moduleSlug)) return false;

  const actionCandidates = buildActionCandidates(action);
  const permissionCandidates = actionCandidates.flatMap((candidate) => [
    makePermission(moduleSlug, candidate),
    candidate,
  ]);
  return permissionCandidates.some((candidate) => permissions.includes(candidate));
};
