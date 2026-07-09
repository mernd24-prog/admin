import React, { useEffect, useRef } from "react";
import { MdClose, MdSearch } from "react-icons/md";
import { formatLabel } from "../../../utils/formatters";

const SearchInput = ({
  placeholder,
  searchTerm,
  handleChange,
  handleRemove,
  onSubmit,
  debounce = 0,
  disabled = false,
  large = false,
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
    <div
      className={`admin-table-search group relative w-full min-w-0 ${
        large ? "admin-table-search--large" : ""
      }`}
    >
      <MdSearch
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--admin-muted)] transition-colors group-hover:text-[var(--admin-blue)] group-focus-within:text-[var(--admin-blue)]"
      />
      <input
        type="text"
        placeholder={formatLabel(placeholder || "Search...")}
        value={searchTerm}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label={formatLabel(placeholder || "Search")}
        className="admin-input admin-table-search-input block w-full !pl-10 !pr-10"
      />
      {searchTerm && !disabled && (
        <button
          type="button"
          onClick={clearSearch}
          className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--admin-muted)] transition hover:bg-[var(--admin-blue-soft)] hover:text-[var(--admin-blue)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-blue)]"
          aria-label={formatLabel("Clear search")}
        >
          <MdClose size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
