import React from "react";

const Tooltip = ({ children, text, position = "top" }) => {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-[84%] left-1/2 -translate-x-1/2 border-t-white",
    bottom: "bottom-full left-1/2 -translate-x-1/2 rotate-180 border-t-white",
    left: "left-full top-1/2 -translate-y-1/2 -rotate-90 border-t-white",
    right: "right-full top-1/2 -translate-y-1/2 rotate-90 border-t-white",
  };

  return (
    <div className="relative group inline-flex items-center">
      {children}
      <div
        className={`absolute z-50 hidden group-hover:flex flex-col items-center 
                    px-2 py-1 text-xs text-black bg-white rounded shadow-md 
                    whitespace-nowrap transition-all duration-300 
                    ${positionClasses[position]}`}
      >
        {text}
        <div
          className={`absolute w-2 h-2 rotate-45 bg-white ${arrowClasses[position]}`}
        ></div>
      </div>
    </div>
  );
};

export default Tooltip;
