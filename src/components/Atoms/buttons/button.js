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
            className={`inline-flex items-center justify-center px-5 h-[2.625rem] text-[0.85rem] font-medium border-[#dee2e6] py-[0.6rem] hover:bg-gray-200     w-auto    text-sm border-2 shadow-sm  hover:text-black ${className} `} {...rest}>
            {children}
        </button>
    );
});

export default Button;
