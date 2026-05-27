import React, { useEffect, useRef } from "react";

const SearchInput = ({
  placeholder,
  searchTerm,
  handleChange,
  debounce = 0,
  disabled = false,
}) => {
  const timerRef = useRef();
  useEffect(() => () => clearTimeout(timerRef.current), []);
  const onChange = (event) => {
    event.target.value = event.target.value.replace(/^\s+/, "");
    if (!debounce) return handleChange?.(event);
    const value = event.target.value;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => handleChange?.({ target: { value } }),
      debounce,
    );
  };

  return (
    <div className="relative w-full ">
      <input
        type="text"
        placeholder={placeholder || "Search..."}
        value={searchTerm}
        onChange={onChange}
        disabled={disabled}
        aria-label={placeholder || "Search"}
        className="admin-input block pr-10 pl-10"
      />
    </div>
  );
};

export default SearchInput;
