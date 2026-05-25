import React from "react";

const Button = React.memo(({
    type = "button",
    onClick,
    children = "Button",
    className = "",
    style = {},
    isDisable = false,
    ...rest
}) => {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisable}
            style={style}
            className={`admin-btn-secondary w-auto ${className}`} {...rest}>
            {children}
        </button>
    );
});

export default Button;
