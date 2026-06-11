import React, { useEffect, useRef } from "react";
import { MdClose, MdSearch } from "react-icons/md";

const SearchInput = ({
  placeholder,
  searchTerm,
  handleChange,
  handleRemove,
  onSubmit,
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
  const clearSearch = () => {
    clearTimeout(timerRef.current);
    if (handleRemove) {
      handleRemove();
      return;
    }
    handleChange?.({ target: { value: "" } });
  };
  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="relative w-full  min-w-0 header-search-pill group relative p-1">
      <MdSearch
        size={14}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--admin-ink)] transition-colors group-hover:text-[var(--admin-blue)] group-focus-within:text-[var(--admin-blue)]"
      />
      <input
        type="text"
        placeholder={placeholder || "Search..."}
        value={searchTerm}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={placeholder || "Search"}
        className="admin-input admin-header-search-input block pl-4 pr-10 p-1"
      />
      {searchTerm && !disabled && (
        <button
          type="button"
          onClick={clearSearch}
          className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[var(--admin-muted)] transition hover:bg-[var(--admin-blue-soft)] hover:text-[var(--admin-blue)]"
          aria-label="Clear search"
        >
          <MdClose size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
