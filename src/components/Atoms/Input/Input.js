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
  indicatorSeparator: () => ({ display: "none" }),
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
  onFocus,
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
  showLengthCount = true,
  limitMessage,
  limitReached = false,
  enforceMaxLength = true,
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
  const [isFocused, setIsFocused] = useState(false);
  const [maxLengthAttempted, setMaxLengthAttempted] = useState(false);
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

  const exceedsMaxLength = (input, insertedText) => {
    if (!enforceMaxLength || !maxLength || typeof insertedText !== "string") {
      return false;
    }
    const currentValue = String(input.value ?? value ?? "");
    const selectionStart = input.selectionStart ?? currentValue.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;
    return (
      currentValue.length -
        (selectionEnd - selectionStart) +
        insertedText.length >
      maxLength
    );
  };

  const handleBeforeInput = (event) => {
    if (
      event.nativeEvent?.inputType?.startsWith("insert") &&
      exceedsMaxLength(event.currentTarget, event.nativeEvent.data)
    ) {
      event.preventDefault();
      setMaxLengthAttempted(true);
    }
    rest.onBeforeInput?.(event);
  };

  const isNegativeNumberInput = () =>
    type === "number" ||
    type === "percentage" ||
    ((!type || type === "text") &&
      (rest.inputMode === "numeric" || rest.inputMode === "decimal"));

  const handleKeyDown = (event) => {
    // Prevent negative sign for inputs without a type and numeric inputs.
    if (isNegativeNumberInput() && event.key === "-") {
      event.preventDefault();
      return;
    }

    if (
      event.key?.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      exceedsMaxLength(event.currentTarget, event.key)
    ) {
      event.preventDefault();
      setMaxLengthAttempted(true);
    }

    rest.onKeyDown?.(event);
  };

  const handlePaste = (event) => {
    const pastedText = event.clipboardData?.getData("text") || "";

    if (isNegativeNumberInput() && pastedText.trim().startsWith("-")) {
      event.preventDefault();
      return;
    }

    if (exceedsMaxLength(event.currentTarget, pastedText)) {
      event.preventDefault();
      setMaxLengthAttempted(true);
    }

    rest.onPaste?.(event);
  };

  const handleChange = (eventOrValue) => {
    const nextValue = eventOrValue?.target?.value;
    if (typeof nextValue === "string" && nextValue.length < maxLength) {
      setMaxLengthAttempted(false);
    }
    emit(eventOrValue);
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
    ...rest,
    id: inputId,
    name,
    value,
    defaultValue,
    placeholder,
    required,
    disabled: disable || loading,
    readOnly,
    onFocus: (event) => {
      setIsFocused(true);
      onFocus?.(event);
    },
    onBlur: (event) => {
      setIsFocused(false);
      setMaxLengthAttempted(false);
      onBlur?.(event);
    },
    onBeforeInput: handleBeforeInput,
    onKeyDown: handleKeyDown,
    onPaste: handlePaste,
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
          classNamePrefix="admin-react-select"
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
          maxLength={enforceMaxLength ? maxLength : undefined}
          minLength={minLength}
          onChange={handleChange}
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
        type={type === "password" ? passwordType : simpleType}
        min={type === "percentage" ? 0 : min}
        max={type === "percentage" ? 100 : max}
        step={type === "price" ? "0.01" : step}
        maxLength={enforceMaxLength ? maxLength : undefined}
        minLength={minLength}
        onChange={handleChange}
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
        ) : isFocused &&
          (limitReached || maxLengthAttempted) &&
          limitMessage ? (
          <p className="admin-field-error" role="status">
            {limitMessage}
          </p>
        ) : helperText && !hideExternalLabel ? (
          <p id={`${inputId}-help`} className="admin-field-help">
            {helperText}
          </p>
        ) : (
          <span />
        )}
        {showLengthCount && maxLength && typeof value === "string" && (
          <span className="admin-field-count">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
};

export default Input;
