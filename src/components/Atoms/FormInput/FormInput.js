import React from "react";
import Input from "../Input/Input";

// Kept as a compatibility alias so existing forms use the unified input system.
const FormInput = React.forwardRef(({
  label,
  className = "",
  type,
  options = [],
  name,
  value,
  onChange,
  error,
  required,
  inputRef,
  ...props
}, ref) => {
  const targetRef = ref || inputRef;

  if (type === "select") {
    return (
      <div className={`admin-field mb-4 ${className}`}>
        {label && (
          <label htmlFor={name} className="admin-label">
            {label}
            {required && <span className="admin-required">*</span>}
          </label>
        )}
        <select
          ref={targetRef}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          className={`admin-input ${error ? "admin-input-error" : ""}`}
          {...props}
        >
          {options.map((option) => (
            <option
              key={
                typeof option === "object"
                  ? (option.value ?? option.label)
                  : option
              }
              value={typeof option === "object" ? (option.value ?? "") : option}
            >
              {typeof option === "object"
                ? (option.label ?? option.value ?? "")
                : option}
            </option>
          ))}
        </select>
        {error && (
          <p className="admin-field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
  return (
    <Input
      ref={targetRef}
      labelName={label}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      error={error}
      required={required}
      className={`mb-4 ${className}`}
      {...props}
    />
  );
});

FormInput.displayName = "FormInput";

export default FormInput;
