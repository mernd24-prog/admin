import React from "react";
import { useLocation } from "react-router-dom";
import PermissionGuard from "../Atoms/PermissionGuard/PermissionGuard";
import { getRouteModuleCandidates } from "../../_helpers/rbacRoutes";

const NewButton = React.memo(
  ({
    type = "button",
    onClick,
    children = "Button",
    className = "",
    style = {},
    isDisable = false,
    loading = false,
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
        className={`admin-btn-primary group w-full font-[Inter] ${className}`}
        {...rest}
      >
        {loading && <span className="admin-button-spinner" />}
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

export default NewButton;
