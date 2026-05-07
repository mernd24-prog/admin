import React from "react";

const TransparentButton = React.memo(({
    type = "button",
    onClick,
    label = "Button",
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
            className={` button-outline-primary transition-all duration-300 ease-in-out transform hover:scale-[1.01] border-2 border-[#0A73CF] bg-transparent px-4 py-2  ${className}`}
            style={style}
            {...rest}
        >
            {label}
        </button>
    );
});

export default TransparentButton;