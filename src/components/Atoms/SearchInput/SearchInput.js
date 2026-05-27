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

      {
        searchTerm ? <IoClose
          className="absolute z-10 text-gray-800 transform -translate-y-1/2 right-3 top-1/2"
          size={20} onClick={handleRemove}
          role="button"
          aria-label="Clear search"
        /> : <IoSearchOutline
          className="absolute z-10 transform -translate-y-1/2 right-3 top-1/2 text-[#082f91]"
          size={20}
        />
      }
      <input
        type="text"
        placeholder={placeholder || "Search..."}
        value={searchTerm}
        onChange={onChange}
        disabled={disabled}
        aria-label={placeholder || "Search"}
        className="admin-input block pl-4 pr-10"
      />
    </div>
  );
};

export default SearchInput;
