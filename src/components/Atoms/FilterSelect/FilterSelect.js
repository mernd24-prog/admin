import React from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";

const customStyles = (error) => ({
  control: (provided, state) => ({
    ...provided,
    backgroundColor: "var(--admin-field)",
    borderColor: error
      ? "var(--admin-danger)"
      : state.isFocused
        ? "var(--admin-navy)"
        : "var(--admin-field-line)",
    boxShadow: error
      ? "0 0 0 1px var(--admin-danger)"
      : state.isFocused
        ? "0 0 0 2px rgba(8, 47, 145, 0.1)"
        : "none",
    borderRadius: "0.375rem",
    minHeight: "42px",
    paddingLeft: "0.5rem",
    paddingRight: "0.5rem",
    cursor: "pointer",
    "&:hover": {
      borderColor: error ? "var(--admin-danger)" : "var(--admin-navy)",
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#4A5568",
    fontSize: "0.875rem",
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#2D3748",
    fontSize: "0.875rem",
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: "0 4px",
    // color: hasError ? '#DC3545' : '#718096',
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
    position: "absolute",
  }),
});

const FilterSelect = ({
  label,
  options,
  value,
  onChange,
  isDisabled = false,
  placeholder = label ? label : "Search by User's Name or Username",
  isMulti = false,
  error = "",
  required,
  name,
  inputId = name,
  isLoading = false,
  isClearable = false,
  isSearchable = true,
  onBlur,
  helperText,
  className = "",
  loadOptions,
  defaultOptions = true,
  cacheOptions = true,
}) => {
  const SelectComponent = loadOptions ? AsyncSelect : Select;
  return (
    <div className={`admin-field relative  ${className}`}>
      {label && (
        <label htmlFor={inputId} className="admin-label">
          {label}
          {required && <span className="admin-required">*</span>}
        </label>
      )}
      <div className="relative text-sm min-w-40">
        <SelectComponent
          styles={customStyles(error)}
          className="capitalize"
          inputId={inputId}
          name={name}
          {...(loadOptions
            ? { loadOptions, defaultOptions, cacheOptions }
            : { options })}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          isDisabled={isDisabled}
          placeholder={placeholder}
          isMulti={isMulti}
          isLoading={isLoading}
          isClearable={isClearable}
          isSearchable={isSearchable}
          aria-invalid={Boolean(error)}
        />
        {error ? (
          <p className="admin-field-error" role="alert">
            {error}
          </p>
        ) : (
          helperText && <p className="admin-field-help">{helperText}</p>
        )}
      </div>
    </div>
  );
};

export default FilterSelect;
