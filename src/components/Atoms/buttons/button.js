import React from "react";
import PermissionGuard from "../PermissionGuard/PermissionGuard";

const Button = React.memo(({
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
    const button = (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisable || loading}
            style={style}
            className={`admin-btn-${variant} w-auto ${className}`} {...rest}>
            {loading && <span className="admin-button-spinner" aria-hidden="true" />}
            {children}
        </button>
    );
    return requiredModule ? (
        <PermissionGuard module={requiredModule} action={requiredAction} hide>
            {button}
        </PermissionGuard>
    ) : button;
});

export default Button;
