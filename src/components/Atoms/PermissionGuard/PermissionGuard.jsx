import React from "react";
import { usePermission } from "../../../_helpers/usePermission";

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
 *   allowSeller {boolean}      — allow seller roles for a scoped self-service action
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
  allowSeller = false,
  children,
}) => {
  const { can, canAny, canAll, isSeller } = usePermission();

  let allowed = allowSeller && isSeller;

  if (!allowed && allOf && allOf.length > 0) {
    allowed = canAll(moduleSlug, allOf);
  } else if (!allowed && actions && actions.length > 0) {
    allowed = canAny(moduleSlug, actions);
  } else if (!allowed && action) {
    allowed = can(moduleSlug, action);
  } else if (!allowed) {
    // No specific action — just check module access
    allowed = can(moduleSlug);
  }

  if (!allowed) {
    return hide ? null : (fallback ?? null);
  }

  return <>{children}</>;
};

export default PermissionGuard;
