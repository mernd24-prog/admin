import React from "react";

const ButtonTransparent = React.memo(
  ({
    type = "button",
    onClick,
    children = "Button",
    className = "",
    style = {},
    ...rest
  }) => {
    return (
      <button
        type={type}
        onClick={onClick}
        // disabled={isDisable}
        className={`group relative w-full flex space-x-4 justify-center py-2 px-4 border-[#D8D8D8] border text-[16px] font-[600] font-[Inter] rounded-md text-[#1E1E1E] bg-white hover:scale-95 transition-all duration-300 ease-in-out  hover:bg-[#fafafa]
 hover:text-black hover:border-gray-600  ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

export default ButtonTransparent;
