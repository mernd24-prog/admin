import React from "react";

const ButtonTransparent = React.memo(({
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
            className={`group relative w-full flex space-x-4 justify-center py-2 px-4  border-[#000000] border-2 text-sm font-bold rounded-md text-black hover:scale-95 transition-all duration-300 ease-in-out ${className}`}
            {...rest}
        >
            {children}
        </button>
    );
});

export default ButtonTransparent;
