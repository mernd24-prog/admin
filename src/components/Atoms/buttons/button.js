import React from "react";
import { useLocation } from "react-router-dom";
import PermissionGuard from "../PermissionGuard/PermissionGuard";
import { getRouteModuleCandidates } from "../../../_helpers/rbacRoutes";

const Button = React.memo(
  ({
    type = "button",
    onClick,
    children = "Button",
    className = "",
    style = {},
    isDisable = false,
    loading = false,
    variant = "secondary",
    requiredModule,
    requiredAction,
    ...rest
  }) => {
    const location = useLocation();
    const inferredModule = getRouteModuleCandidates(location.pathname)[0];
    const guardModule = requiredModule
      ? inferredModule || requiredModule
      : null;
    const button = (
      <button
        type={type}
        onClick={onClick}
        disabled={isDisable || loading}
        style={style}
        className={`admin-btn-${variant} w-auto ${className}`}
        {...rest}
      >
        {loading && (
          <span className="admin-button-spinner" aria-hidden="true" />
        )}
        {children}
      </button>
    );
    return guardModule ? (
      <PermissionGuard module={guardModule} action={requiredAction} hide>
        {button}
      </PermissionGuard>
    ) : (
      button
    );
  },
);

export default Button;
