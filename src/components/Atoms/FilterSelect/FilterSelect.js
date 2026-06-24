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
        ? "var(--admin-blue)"
        : "var(--admin-field-line)",
    boxShadow: error
      ? "0 0 0 1px var(--admin-danger)"
      : state.isFocused
        ? "0 0 0 3px rgba(47, 107, 255, 0.11)"
        : "none",
    borderRadius: "0.375rem",
    minHeight: "36px",
    cursor: "pointer",
    "&:hover": {
      borderColor: error ? "var(--admin-danger)" : "var(--admin-blue)",
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: "2px 8px",
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "var(--admin-muted)",
    fontSize: "0.875rem",
    paddingLeft: "2px",
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "var(--admin-ink)",
    fontSize: "0.875rem",
    paddingLeft: "2px",
  }),
  input: (provided) => ({
    ...provided,
    margin: 0,
    paddingBottom: 0,
    paddingTop: 0,
  }),
  multiValue: (provided) => ({
    ...provided,
    minWidth: 0,
    maxWidth: "100%",
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: "0 8px 0 4px",
    // color: hasError ? '#DC3545' : '#718096',
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    flexShrink: 0,
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: 8,
    zIndex: 9999,
    position: "absolute",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "var(--admin-navy)"
      : state.isFocused
        ? "var(--admin-blue-soft)"
        : provided.backgroundColor,
    color: state.isSelected ? "#fff" : "var(--admin-ink)",
    whiteSpace: "normal",
    wordBreak: "break-word",
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 10000,
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
  const menuPortalTarget =
    typeof document !== "undefined" ? document.body : undefined;

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
          menuPortalTarget={menuPortalTarget}
          menuPosition="fixed"
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
