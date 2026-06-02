import React from "react";
import { twMerge } from "tailwind-merge";

const TransparentButton = React.memo(
  ({
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
        className={twMerge(
          `button-outline-primary transition-all duration-300 ease-in-out transform hover:scale-[1.01] border border-[var(--admin-blue)] bg-transparent px-4 py-2 text-[var(--admin-blue)] ${className}`,
        )}
        style={style}
        {...rest}
      >
        {label}
      </button>
    );
  },
);

export default TransparentButton;
