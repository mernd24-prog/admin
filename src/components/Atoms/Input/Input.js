import React, { useEffect, useId, useRef, useState } from "react";
import Select from "react-select";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { IoClose, IoCloudUploadOutline } from "react-icons/io5";

const selectStyles = (invalid, hasValue) => ({
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    background: hasValue ? "var(--admin-surface-soft)" : "var(--admin-field)",
    borderColor: invalid
      ? "var(--admin-danger)"
      : state.isFocused
        ? "var(--admin-blue)"
        : hasValue
          ? "var(--admin-line-strong)"
          : "var(--admin-field-line)",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(47, 107, 255, 0.11)" : "none",
    borderRadius: 6,
    fontSize: 13,
  }),
  singleValue: (base) => ({
    ...base,
    color: hasValue ? "var(--admin-ink)" : base.color,
    fontWeight: hasValue ? 500 : base.fontWeight,
    marginLeft: 0,
    marginRight: 0,
    maxWidth: "100%",
    overflow: "visible",
    textOverflow: "unset",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "break-word",
  }),
  valueContainer: (base) => ({
    ...base,
    minWidth: 0,
    padding: "2px 8px",
    overflow: "visible",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
  }),
  input: (base) => ({
    ...base,
    margin: 0,
    paddingBottom: 0,
    paddingTop: 0,
  }),
  multiValue: (base) => ({
    ...base,
    minWidth: 0,
    maxWidth: "100%",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "var(--admin-ink)",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),
  indicatorsContainer: (base) => ({ ...base, flexShrink: 0 }),
  menu: (base) => ({ ...base, borderRadius: 8, zIndex: 60 }),
  option: (base, state) => ({
    ...base,
    background: state.isSelected
      ? "var(--admin-navy)"
      : state.isFocused
        ? "var(--admin-blue-soft)"
        : base.background,
    color: state.isSelected ? "#fff" : "var(--admin-ink)",
    fontSize: 13,
    whiteSpace: "normal",
    wordBreak: "break-word",
  }),
});

const normalizeOptions = (options = []) =>
  options.map((option) =>
    typeof option === "object"
      ? option
      : { label: String(option), value: option },
  );

const Input = ({
  id,
  label,
  labelName = label,
  helperText,
  name,
  placeholder,
  type = "text",
  value,
  defaultValue,
  onChange,
  onBlur,
  required = false,
  errorMessage,
  hasError,
  error = errorMessage,
  success,
  loading = false,
  togglePasswordVisibility,
  isPasswordVisible,
  rows = 4,
  maxLength,
  minLength,
  disabled = false,
  disable = disabled,
  readOnly = false,
  options = [],
  isMulti = false,
  isClearable = false,
  searchable = true,
  clearable = false,
  accept,
  multiple = false,
  prefix,
  suffix,
  icon,
  debounce = 0,
  className = "",
  inputClassName = "",
  min,
  max,
  step,
  children,
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id || name || generatedId;
  const invalid = Boolean(error || hasError);
  const [showPassword, setShowPassword] = useState(Boolean(isPasswordVisible));
  const [dragActive, setDragActive] = useState(false);
  const timerRef = useRef();

  useEffect(() => {
    if (isPasswordVisible !== undefined) setShowPassword(isPasswordVisible);
  }, [isPasswordVisible]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const emit = (eventOrValue) => {
    if (!onChange) return;
    if (!debounce) {
      onChange(eventOrValue);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(eventOrValue), debounce);
  };

  const togglePassword = () => {
    setShowPassword((visible) => !visible);
    togglePasswordVisibility?.();
  };

  const baseStyles = `admin-input ${invalid ? "admin-input-error" : ""} ${success ? "admin-input-success" : ""} ${inputClassName}`;
  const passwordType =
    type === "password" ? (showPassword ? "text" : "password") : type;
  const simpleType =
    type === "price" || type === "percentage"
      ? "number"
      : type === "phone"
        ? "tel"
        : type;
  const describedBy =
    `${helperText ? `${inputId}-help ` : ""}${invalid ? `${inputId}-error` : ""}`.trim() ||
    undefined;
  const commonProps = {
    id: inputId,
    name,
    value,
    defaultValue,
    placeholder,
    required,
    disabled: disable || loading,
    readOnly,
    onBlur,
    "aria-invalid": invalid,
    "aria-describedby": describedBy,
  };

  const renderField = () => {
    if (
      [
        "select",
        "multi-select",
        "searchable-select",
        "async-select",
        "dependent-select",
      ].includes(type)
    ) {
      const list = normalizeOptions(options);
      const selectedValue =
        type === "multi-select" || isMulti
          ? list.filter(
              (option) =>
                (value || []).includes?.(option.value) ||
                (value || []).some?.((item) => item.value === option.value),
            )
          : list.find((option) => option.value === value) || value || null;
      const hasSelectedValue = Array.isArray(selectedValue)
        ? selectedValue.length > 0
        : Boolean(selectedValue);
      return (
        <Select
          inputId={inputId}
          name={name}
          options={list}
          value={selectedValue}
          defaultValue={defaultValue}
          onChange={emit}
          onBlur={onBlur}
          placeholder={placeholder}
          isMulti={type === "multi-select" || isMulti}
          isClearable={isClearable || clearable}
          isSearchable={searchable}
          isDisabled={disable || loading || readOnly}
          isLoading={loading}
          styles={selectStyles(invalid, hasSelectedValue)}
          aria-invalid={invalid}
        />
      );
    }
    if (type === "textarea") {
      return (
        <textarea
          {...commonProps}
          rows={rows}
          maxLength={maxLength}
          minLength={minLength}
          onChange={emit}
          className={`${baseStyles} admin-textarea`}
        />
      );
    }
    if (type === "checkbox" || type === "switch" || type === "toggle") {
      return (
        <label className={`admin-switch ${disable ? "opacity-60" : ""}`}>
          <input
            {...commonProps}
            type="checkbox"
            checked={Boolean(value)}
            onChange={emit}
            className="sr-only peer"
          />
          <span className="admin-switch-track" />
          <span>{children || helperText || labelName}</span>
        </label>
      );
    }
    if (type === "radio") {
      return (
        <div
          className="flex flex-wrap gap-4"
          role="radiogroup"
          aria-labelledby={`${inputId}-label`}
        >
          {normalizeOptions(options).map((option) => (
            <label
              key={option.value}
              className="inline-flex items-center gap-2 text-sm text-gray-700"
            >
              <input
                {...commonProps}
                id={`${inputId}-${option.value}`}
                type="radio"
                value={option.value}
                checked={value === option.value}
                onChange={emit}
              />
              {option.label}
            </label>
          ))}
        </div>
      );
    }
    if (["file", "image", "image-upload", "drag-drop-upload"].includes(type)) {
      return (
        <label
          className={`admin-dropzone ${dragActive ? "admin-dropzone-active" : ""} ${invalid ? "admin-input-error" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            const files = event.dataTransfer.files;
            emit({ target: { name, files, value: files?.[0] } });
          }}
        >
          <IoCloudUploadOutline size={22} />
          <span>{placeholder || "Choose or drop a file"}</span>
          <input
            {...commonProps}
            value={undefined}
            type="file"
            accept={accept || (type.includes("image") ? "image/*" : undefined)}
            multiple={multiple}
            onChange={emit}
            className="sr-only"
          />
        </label>
      );
    }
    return (
      <input
        {...commonProps}
        {...rest}
        type={type === "password" ? passwordType : simpleType}
        min={type === "percentage" ? 0 : min}
        max={type === "percentage" ? 100 : max}
        step={type === "price" ? "0.01" : step}
        maxLength={maxLength}
        minLength={minLength}
        onChange={emit}
        className={baseStyles}
      />
    );
  };

  const hideExternalLabel = ["checkbox", "switch", "toggle"].includes(type);

  return (
    <div className={`admin-field ${className}`}>
      {!hideExternalLabel && labelName && (
        <label
          id={`${inputId}-label`}
          htmlFor={inputId}
          className="admin-label "
        >
          {labelName} {required && <span className="admin-required">*</span>}
        </label>
      )}
      <div className="relative">
        {(prefix || icon) && (
          <span className="admin-input-prefix">{icon || prefix}</span>
        )}
        {renderField()}
        {suffix && <span className="admin-input-suffix">{suffix}</span>}
        {clearable &&
          value &&
          !disable &&
          !["select", "multi-select"].includes(type) && (
            <button
              type="button"
              className="admin-input-clear"
              aria-label={`Clear ${labelName || name}`}
              onClick={() => emit({ target: { name, value: "" } })}
            >
              <IoClose />
            </button>
          )}
        {type === "password" && (
          <button
            type="button"
            onClick={togglePassword}
            className="admin-password-toggle"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        )}
      </div>
      <div className="flex justify-between gap-2">
        {invalid ? (
          <p id={`${inputId}-error`} className="admin-field-error" role="alert">
            {error || errorMessage}
          </p>
        ) : helperText && !hideExternalLabel ? (
          <p id={`${inputId}-help`} className="admin-field-help">
            {helperText}
          </p>
        ) : (
          <span />
        )}
        {maxLength && typeof value === "string" && (
          <span className="admin-field-count">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
};

export default Input;
