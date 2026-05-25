import React from "react";

const CustomCheckbox = ({
  id,
  name,
  checked,
  onChange,
  className = "",
}) => {
  return (
    <label
      className={`relative inline-flex shrink-0 cursor-pointer items-center select-none ${className}`}
    >
      <input
        id={id}
        name={name}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
      />

      <span className="h-[18px] w-[18px] rounded-[5px] border border-[#d0c9bd] bg-white shadow-sm transition-all duration-200 peer-checked:border-[#082f91] peer-checked:bg-[#082f91] peer-focus-visible:ring-2 peer-focus-visible:ring-[#d9e2ff] peer-focus-visible:ring-offset-1" />

      <svg
        className="pointer-events-none absolute left-[3px] top-[3px] h-3 w-3 text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </label>
  );
};

export default CustomCheckbox;
