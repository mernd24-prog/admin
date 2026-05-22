import React from "react";
import { twMerge } from "tailwind-merge";

const IconButton = React.memo(
  ({
    type = "button",
    onClick,
    label = "Button",
    className = "",
    style = {},
    isDisable = false,
    icon,
    ...rest
  }) => {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={isDisable}
        className={twMerge(
          "py-2 bg-golden/45 text-blue font-medium font-inter text-sm px-8 rounded-xl",
          className,
        )}
        style={style}
        {...rest}
      >
        <span className="flex gap-2 items-center">
          {icon}
          {label}
        </span>
      </button>
    );
  },
);

export default IconButton;
