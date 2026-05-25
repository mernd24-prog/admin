import React from "react";

const NewButton = React.memo(({
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
            className={`admin-btn-primary group w-full font-[Inter] ${className}`} {...rest}>
            {children}
        </button>
    );
});

export default NewButton;
