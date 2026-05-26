import React from "react";
import PermissionGuard from "../Atoms/PermissionGuard/PermissionGuard";

const NewButton = React.memo(({
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
    const button = (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisable || loading}
            className={`admin-btn-primary group w-full font-[Inter] ${className}`} {...rest}>
            {loading && <span className="admin-button-spinner" />}
            {children}
        </button>
    );
    return requiredModule ? (
        <PermissionGuard module={requiredModule} action={requiredAction} hide>
            {button}
        </PermissionGuard>
    ) : button;
});

export default NewButton;
