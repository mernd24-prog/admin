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
    size = "default",
    ...rest
  }) => {
    const sizeClass =
      size === "compact"
        ? "!min-h-9 !px-4 !py-0 text-[13px]"
        : "";

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={isDisable}
        className={twMerge(
          "button-outline-primary transition-all duration-300 ease-in-out transform border border-[var(--admin-blue)] px-4 py-2 text-[var(--admin-blue)]",
          sizeClass,
          className,
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
