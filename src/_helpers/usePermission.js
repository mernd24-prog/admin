import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getStoredRole, getStoredUser, normalizeRole } from './authStorage';
import { isSellerPanel } from './panelConfig';
import {
  getRouteModuleCandidates,
  isSelfServiceRoute,
  isSellerAllowedModule,
  isSellerBlockedModule,
  isSellerBlockedRoute,
} from './rbacRoutes';

/**
 * PERMISSION ACTIONS — match backend RBAC action slugs exactly.
 * Covers all actions defined in the RBAC flow guide.
 */
export const ACTIONS = {
  VIEW:          'view',
  CREATE:        'create',
  ADD:           'create',        // alias → create
  UPDATE:        'update',
  EDIT:          'update',        // alias → update
  DELETE:        'delete',
  STATUS_CHANGE: 'status_change',
  STATUS:        'status_change', // alias → status_change
  APPROVE:       'approve',
  REJECT:        'reject',
  ASSIGN:        'assign',
  EXPORT:        'export',
  IMPORT:        'import',
  RESTORE:       'restore',
  BULK_ACTION:   'bulk_action',
  ADJUST:        'adjust',
};

const ACTION_ALIASES = {
  add: 'create',
  edit: 'update',
  status: 'status_change',
  approval: 'approve',
  action: 'status_change',
  review: 'approve',
  manage: 'status_change',
  activate: 'status_change',
  deactivate: 'status_change',
  enable: 'status_change',
  disable: 'status_change',
  archive: 'status_change',
  recover: 'restore',
  bulk: 'bulk_action',
  'bulk-action': 'bulk_action',
  'bulk action': 'bulk_action',
  bulkaction: 'bulk_action',
  adjustment: 'adjust',
  'stock-adjustment': 'adjust',
  stock_adjustment: 'adjust',
};

const ACTION_EQUIVALENTS = {
  create: ['add'],
  update: ['edit'],
  approve: ['approval', 'review'],
  status_change: ['status', 'action', 'manage', 'activate', 'deactivate', 'enable', 'disable', 'archive'],
  restore: ['recover'],
  bulk_action: ['bulk', 'bulk-action', 'bulk action', 'bulkaction'],
  adjust: ['adjustment', 'stock-adjustment', 'stock_adjustment'],
};

const normalizeAction = (action = '') => {
  const value = String(action || '').trim().toLowerCase();
  return ACTION_ALIASES[value] || value;
};

const expandActionCandidates = (action = '') => {
  const normalized = normalizeAction(action);
  const aliases = ACTION_EQUIVALENTS[normalized] || [];
  return Array.from(new Set([normalized, ...aliases]));
};

const normalizeModuleCode = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');

const MODULE_ALIASES = {
  admin: ['seller-dashboard'],
  dashboard: ['seller-dashboard', 'admin'],
  home: ['seller-dashboard', 'admin'],
  seller: ['sellers'],
  sellers: ['seller-management'],
  'seller-management': ['sellers'],
  'seller-users': ['sellers', 'seller-management'],
  'seller-sub-admins': ['sellers', 'seller-management'],
  'seller-organizations': ['sellers', 'seller-management'],
  commission: ['sellers/commissions'],
  commissions: ['sellers/commissions'],
  'commission-rules': ['sellers/commissions'],
  'seller-finance': ['sellers/commissions'],
  'seller-finance-payouts': ['sellers/commissions', 'seller-payouts'],
  'seller-payouts': ['sellers/commissions'],
  products: ['product'],
  product: ['products'],
  'product-catalog': ['products'],
  inventory: ['stock'],
  delivery: ['shipping-fulfilment', 'shipment-tracking', 'delivery-agents'],
  'shipment-tracking': ['delivery'],
  'delivery-agents': ['delivery'],
  tax: ['tax-invoices', 'credit-notes'],
  'tax-invoices': ['tax'],
  'credit-notes': ['tax'],
  'cod-config': ['commerce-settings'],
};

const expandModuleCandidates = (moduleSlug = '') => {
  const normalized = normalizeModuleCode(moduleSlug);
  const aliases = MODULE_ALIASES[normalized] || [];
  return Array.from(new Set([normalized, ...aliases.map(normalizeModuleCode)]));
};

const safeParseStorage = (storage, key, fallback = null) => {
  try {
    return storage?.getItem ? JSON.parse(storage.getItem(key) || 'null') || fallback : fallback;
  } catch {
    return fallback;
  }
};

const permissionLikeToSlug = (permission) => {
  if (typeof permission === 'string') return permission;
  if (!permission || typeof permission !== 'object') return '';
  return permission.slug || permission.permission || permission.permissionSlug || '';
};

const getStoredPermissionSlugs = () => {
  const localUser = getStoredUser() || {};
  const sessionUser =
    typeof window === 'undefined'
      ? {}
      : safeParseStorage(window.sessionStorage, 'EcomAdmin', {});
  return [
    localUser.permissions,
    localUser.effectivePermissions,
    localUser.assignedPermissions,
    localUser.permissionSummary?.permissions,
    sessionUser?.permissions,
    sessionUser?.effectivePermissions,
    sessionUser?.assignedPermissions,
    sessionUser?.permissionSummary?.permissions,
  ]
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .map(permissionLikeToSlug)
    .map((permission) => String(permission || '').trim().toLowerCase())
    .filter((permission) => permission.includes(':'));
};

const applyPermissionSlugToMap = (map, permissionSlug) => {
  const [moduleSlug, actionSlug] = String(permissionSlug || '').split(':');
  const slug = normalizeModuleCode(moduleSlug);
  const action = normalizeAction(actionSlug);
  if (!slug || !action) return;

  if (!map[slug]) map[slug] = { _assigned: false };
  map[slug]._assigned = true;
  map[slug][action] = true;

  if (action !== ACTIONS.VIEW) {
    map[slug][ACTIONS.VIEW] = true;
  }
};

/**
 * ROLE constants — mirrors backend roles.js
 */
export const ROLES = {
  SUPER_ADMIN:      'super-admin',
  ADMIN:            'admin',
  SUB_ADMIN:        'sub-admin',
  SELLER:           'seller',
  SELLER_ADMIN:     'seller-admin',
  SELLER_SUB_ADMIN: 'seller-sub-admin',
};

/**
 * usePermission()
 *
 * Returns helpers to check permissions from the Redux store without
 * prop-drilling.  Reads the same `getMyModulePermissionData` that the
 * sidebar already uses.
 *
 * Usage:
 *   const { can, canAny, isRole, isSuperAdmin } = usePermission();
 *   if (can('products', ACTIONS.CREATE)) { ... }
 *   if (canAny('products', [ACTIONS.EDIT, ACTIONS.DELETE])) { ... }
 */
export function usePermission() {
  const selector = useSelector((state) => state.user);
  const adminCoreSelector = useSelector((state) => state.adminCore);
  const permissions = selector?.getMyModulePermissionData?.data?.data?.modules;
  const accessModules = useMemo(() => {
    const accessModulePayload =
      adminCoreSelector?.accessModulesData?.data?.data ||
      adminCoreSelector?.accessModulesData?.normalized?.data ||
      adminCoreSelector?.accessModulesData?.data?.normalized?.data ||
      adminCoreSelector?.accessModulesData?.data ||
      {};
    return Array.isArray(accessModulePayload?.modules)
      ? accessModulePayload.modules
      : Array.isArray(accessModulePayload?.list)
        ? accessModulePayload.list
        : Array.isArray(accessModulePayload?.items)
          ? accessModulePayload.items
          : Array.isArray(accessModulePayload)
            ? accessModulePayload
            : [];
  }, [adminCoreSelector?.accessModulesData]);
  const role = normalizeRole(getStoredRole());
  // Build a fast lookup: { moduleSlug: { action: bool } }
  const permMap = useMemo(() => {
    const map = {};
    const moduleSources = [
      ...(Array.isArray(permissions) ? permissions : []),
      ...(Array.isArray(accessModules) ? accessModules : []),
    ];

    if (moduleSources.length) {
      moduleSources.forEach((mod) => {
        const slug = normalizeModuleCode(
          mod.slug ||
          mod.moduleKey ||
          mod.moduleSlug ||
          mod.module ||
          mod.module_code?.module_code ||
          mod.module_code ||
          mod.metadata?.requiredModule
        );
        if (!slug) return;

        if (!map[slug]) map[slug] = { _assigned: false };
        if (mod.assigned === true) {
          map[slug]._assigned = true;
          map[slug].view = true;
        }

        if (Array.isArray(mod.permissions)) {
          mod.permissions.forEach((p) => {
            const action = normalizeAction(p.action);
            if (!action) return;
            const assigned = p.assigned === true;
            map[slug][action] = map[slug][action] === true || assigned;
            if (action === 'view' && assigned) {
              map[slug]._assigned = true;
            }
          });
        }
      });
    }

    getStoredPermissionSlugs().forEach((permissionSlug) =>
      applyPermissionSlugToMap(map, permissionSlug)
    );

    return map;
  }, [permissions, accessModules]);

  /**
   * can(moduleSlug, action?)
   *
   * Super-admin / admin always returns true.
   * For restricted roles, checks the permission matrix.
   * If action is omitted, checks module-level assignment only.
   */
  const can = (moduleSlug, action) => {
    const moduleCandidates = expandModuleCandidates(moduleSlug);
    // Super-admin bypasses permission matrix checks. Admin, sub-admin, and
    // seller delegated users are permission-driven.
    if (role === ROLES.SUPER_ADMIN) return true;
    if (
      isSellerPanel() &&
      moduleCandidates.some((candidate) => isSellerBlockedModule(candidate))
    ) {
      return false;
    }
    if (
      role === ROLES.SELLER &&
      isSellerPanel() &&
      moduleCandidates.some((candidate) => isSellerAllowedModule(candidate))
    ) {
      return true;
    }

    const mod = moduleCandidates.map((candidate) => permMap[candidate]).find(Boolean);
    const normalizedAction = action ? normalizeAction(action) : ACTIONS.VIEW;

    // Module/page access is view access. Route bootstrap is handled by Layout;
    // component guards should only trust the backend permission matrix.
    if (!action || normalizedAction === ACTIONS.VIEW) {
      if (mod) return mod.view === true || mod._assigned === true;
      return false;
    }

    if (!mod || !mod._assigned) return false;

    const actionCandidates = expandActionCandidates(normalizedAction);
    const hasExplicitGrant = actionCandidates.some((candidate) => mod[candidate] === true);
    if (hasExplicitGrant) return true;

    return false;
  };

  /**
   * canAny(moduleSlug, actions[])
   * Returns true if the user has at least one of the listed actions.
   */
  const canAny = (moduleSlug, actions = []) =>
    actions.some((a) => can(moduleSlug, a));

  /**
   * canAll(moduleSlug, actions[])
   * Returns true only if the user has ALL listed actions.
   */
  const canAll = (moduleSlug, actions = []) =>
    actions.every((a) => can(moduleSlug, a));

  /**
   * canRoute(path)
   * Returns true if the user can access the given route path.
   */
  const canRoute = (path) => {
    if (isSelfServiceRoute(path)) return true;
    if (isSellerPanel() && isSellerBlockedRoute(path)) return false;
    const candidates = getRouteModuleCandidates(path);
    if (!candidates.length) return true;
    return candidates.some((mod) => can(mod));
  };

  /** isRole(roleSlug) — exact role match */
  const isRole = (r) => role === r;

  const isSuperAdmin = isRole(ROLES.SUPER_ADMIN);
  const isAdmin      = isRole(ROLES.SUPER_ADMIN) || isRole(ROLES.ADMIN);
  const isSeller     = isRole(ROLES.SELLER) || isRole(ROLES.SELLER_ADMIN) || isRole(ROLES.SELLER_SUB_ADMIN);

  return { can, canAny, canAll, canRoute, isRole, isSuperAdmin, isAdmin, isSeller, role, permMap };
}
