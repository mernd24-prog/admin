import React from "react";
import FilterSelect from "../FilterSelect/FilterSelect";

const FormSelectGroup = ({
  label,
  description,
  options = [],
  value,
  onChange,
  placeholder = "Select option",
  error = "",
  required = false,
  isDisabled = false,
  isMulti = false,
  isSearchable = true,
  isClearable = false,
  isLoading = false,
  className = "",
  selectClassName = "",
  name,
  id,
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-[#1E293B]"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      {description && (
        <p className="text-xs text-gray-500">
          {description}
        </p>
      )}

      <FilterSelect
        id={id}
        name={name}
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isMulti={isMulti}
        isSearchable={isSearchable}
        isClearable={isClearable}
        isLoading={isLoading}
        error={error}
        className={`w-full ${selectClassName}`}
      />

      {error && (
        <p className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default React.memo(FormSelectGroup);