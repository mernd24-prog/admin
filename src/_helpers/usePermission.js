import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getStoredRole, hasModuleAccess } from './authStorage';
import { getRouteModuleCandidates, isSelfServiceRoute } from './rbacRoutes';

/**
 * PERMISSION ACTIONS — match backend RBAC action slugs.
 */
export const ACTIONS = {
  VIEW:    'view',
  CREATE:  'create',
  EDIT:    'edit',
  DELETE:  'delete',
  APPROVE: 'approve',
  ADJUST:  'adjust',
  EXPORT:  'export',
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
  const permissions = selector?.getMyModulePermissionData?.data?.data?.modules;
  const role = getStoredRole();

  // Build a fast lookup: { moduleSlug: { action: bool } }
  const permMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(permissions)) return map;

    permissions.forEach((mod) => {
      const slug = mod.slug || mod.module_code?.module_code || mod.module_code;
      if (!slug) return;

      map[slug] = { _assigned: mod.assigned !== false };

      if (Array.isArray(mod.permissions)) {
        mod.permissions.forEach((p) => {
          map[slug][p.action] = p.assigned !== false;
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
    // Super-admin and full admin always allowed
    if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) return true;

    // Module-level check via authStorage alias resolution
    if (!hasModuleAccess(moduleSlug)) return false;

    // Action-level check
    if (!action) return true;

    const mod = permMap[moduleSlug];
    if (!mod) return false;
    if (!mod._assigned) return false;

    // If action not specifically set, fall back to module assignment
    return mod[action] !== false;
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
