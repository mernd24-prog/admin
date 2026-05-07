import React from "react";



const CustomCheckbox = ({
  checked,
  onChange,

  className = "",
}) => {
  return (
    <label
      className={`relative inline-flex items-center cursor-pointer select-none ${className} `}
    >
      <input
        type="checkbox"
        className="peer hidden"
        checked={checked}
        onChange={onChange}
      />

      <span className="w-4 h-4 border border-[#4a4a4f] rounded bg-transparent peer-checked:bg-[#0055ff] peer-checked:border-[#0055ff] transition-all duration-300" />

      <svg
        className="absolute left-[2px] top-[3px] w-3 h-3 text-black opacity-0 peer-checked:opacity-100 transition-opacity duration-300 pointer-events-none"
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
