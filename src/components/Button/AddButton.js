import React from "react";
import { IoMdAddCircleOutline } from "react-icons/io";
import { useLocation } from "react-router-dom";
import PermissionGuard from "../Atoms/PermissionGuard/PermissionGuard";
import { getRouteModuleCandidates } from "../../_helpers/rbacRoutes";

const AddButton = React.memo(
  ({
    type = "button",
    onClick,
    children = "Button",
    className = "",
    style = {},
    isDisable = false,
    labelName,
    loading = false,
    requiredModule,
    requiredAction = "create",
    ...rest
  }) => {
    const location = useLocation();
    const inferredModule = getRouteModuleCandidates(location.pathname)[0];
    const guardModule = inferredModule || requiredModule;
    const button = (
      <button
        type={type}
        onClick={onClick}
        disabled={isDisable || loading}
        className={`admin-btn-secondary  group w-auto ${className} `}
        {...rest}
      >
        {loading ? (
          <span className="admin-button-spinner " />
        ) : (
          <IoMdAddCircleOutline className="text-xl" />
        )}
        {labelName ? <span>{labelName}</span> : <span>Add</span>}
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

export default AddButton;
