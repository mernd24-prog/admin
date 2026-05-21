import React from 'react';
import { usePermission } from '../../../_helpers/usePermission';

/**
 * PermissionGuard
 *
 * Conditionally renders children based on RBAC permissions.
 *
 * Props:
 *   module   {string}          — module slug  (e.g. "products")
 *   action   {string}          — action slug  (e.g. "create", "delete")
 *   actions  {string[]}        — allow any of these actions  (alternative to `action`)
 *   allOf    {string[]}        — require ALL of these actions
 *   fallback {React.ReactNode} — what to render when access is denied (default: null)
 *   hide     {boolean}         — if true, renders nothing on deny instead of fallback
 *
 * Examples:
 *   <PermissionGuard module="products" action="create">
 *     <AddProductButton />
 *   </PermissionGuard>
 *
 *   <PermissionGuard module="products" actions={["edit","delete"]} fallback={<ReadOnlyView />}>
 *     <EditPanel />
 *   </PermissionGuard>
 */
const PermissionGuard = ({
  module: moduleSlug,
  action,
  actions,
  allOf,
  fallback = null,
  hide = false,
  children,
}) => {
  const { can, canAny, canAll } = usePermission();

  let allowed = false;

  if (allOf && allOf.length > 0) {
    allowed = canAll(moduleSlug, allOf);
  } else if (actions && actions.length > 0) {
    allowed = canAny(moduleSlug, actions);
  } else if (action) {
    allowed = can(moduleSlug, action);
  } else {
    // No specific action — just check module access
    allowed = can(moduleSlug);
  }

  if (!allowed) {
    return hide ? null : (fallback ?? null);
  }

  return <>{children}</>;
};

export default PermissionGuard;
