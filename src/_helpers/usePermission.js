import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getStoredRole, hasModuleAccess } from './authStorage';
import { getRouteModuleCandidates, isSelfServiceRoute } from './rbacRoutes';

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
  BULK_ACTION:   'bulk_action',
  ADJUST:        'adjust',
};

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
  const permissions = selector?.getMyModulePermissionData?.data?.data?.modules;
  const role = getStoredRole();

  // Build a fast lookup: { moduleSlug: { action: bool } }
  const permMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(permissions)) return map;

    permissions.forEach((mod) => {
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

      map[slug] = { _assigned: mod.assigned !== false };

      if (Array.isArray(mod.permissions)) {
        mod.permissions.forEach((p) => {
          const action = normalizeAction(p.action);
          if (!action) return;
          map[slug][action] = p.assigned !== false;
        });
      }
    });
    return map;
  }, [permissions]);

  /**
   * can(moduleSlug, action?)
   *
   * Super-admin / admin always returns true.
   * For restricted roles, checks the permission matrix.
   * If action is omitted, checks module-level assignment only.
   */
  const can = (moduleSlug, action) => {
    const normalizedModule = normalizeModuleCode(moduleSlug);
    // Super-admin bypasses permission matrix checks.
    if (role === ROLES.SUPER_ADMIN) return true;

    // Module-level check via authStorage alias resolution
    if (!hasModuleAccess(normalizedModule || moduleSlug)) return false;

    // Action-level check
    if (!action) return true;

    const mod = permMap[normalizedModule] || permMap[moduleSlug];
    if (!mod) return false;
    if (!mod._assigned) return false;

    const actionCandidates = expandActionCandidates(action);
    const hasExplicitGrant = actionCandidates.some((candidate) => mod[candidate] === true);
    if (hasExplicitGrant) return true;

    const hasExplicitDeny = actionCandidates.some((candidate) => mod[candidate] === false);
    if (hasExplicitDeny) return false;

    // If action isn't present in the matrix, fall back to module-level assignment
    return mod._assigned === true;
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
