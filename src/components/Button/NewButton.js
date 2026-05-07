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
            className={`group w-full flex space-x-4 justify-center py-2 px-4 border-[#D8D8D8] border text-[16px] font-[600] font-[Inter] rounded-md text-black bg-[#000000] hover:scale-95 transition-all duration-300 ease-in-out ${className}`} {...rest}>
            {children}
        </button>
    );
});

export default NewButton;
