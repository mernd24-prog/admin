import React from "react";
import { IoMdAddCircleOutline } from "react-icons/io";
import PermissionGuard from "../Atoms/PermissionGuard/PermissionGuard";

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
    return requiredModule ? (
      <PermissionGuard module={requiredModule} action={requiredAction} hide>
        {button}
      </PermissionGuard>
    ) : (
      button
    );
  },
);

export default AddButton;
