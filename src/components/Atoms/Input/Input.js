import { FaEye, FaEyeSlash } from "react-icons/fa";

const Input = ({
  labelName,
  name,
  placeholder,
  type = "text",
  value,
  onChange,
  required,
  errorMessage,
  hasError,
  togglePasswordVisibility,
  isPasswordVisible,
  error,
  rows = 4,
  maxLength,
  minLength,
  disable = false,
}) => {
  const inputType =
    type === "password" ? (isPasswordVisible ? "text" : "password") : type;

    const baseStyles = `admin-input placeholder:text-gray-400
    appearance-none ${hasError ? "!border-[#DC3545]" : ""
    }`;

  const handleSanitizeInput = (e) => {
    const input = e.target;
    const allowedTypes = [
      "text",
      "search",
      "email",
      "url",
      "tel",
      "number",
      "textarea",
      "password",
    ];

    if (
      !allowedTypes.includes(input.type) ||
      typeof input.setSelectionRange !== "function"
    ) {
      return;
    }

    const { value } = input;
    const sanitizedValue = value.replace(/^[^a-zA-Z0-9]+/, "");

    if (sanitizedValue !== value) {
      const cursor = input.selectionStart;

      try {
        input.value = sanitizedValue;
        input.setSelectionRange(
          Math.max(cursor - 1, 0),
          Math.max(cursor - 1, 0)
        );
        const event = new Event("input", { bubbles: true });
        input.dispatchEvent(event);
      } catch (err) {
        console.warn("Could not set cursor position:", err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 mb-2">
      <label
        htmlFor={name}
        className="admin-label cursor-default"
      >
        {labelName} {required && <span className="text-[#DC3545]">*</span>}
      </label>

      <div className="relative">
        {type === "textarea" ? (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            onInput={handleSanitizeInput}
            placeholder={placeholder}
            required={required}
            rows={rows}
            maxLength={maxLength}
            minLength={minLength}
            className={`${baseStyles} resize-none`}
          />
        ) : type === "percentage" ? (
          <input
            id={name}
            name={name}
            type="number"
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") return onChange(e);
              const number = Number(val);
              if (number >= 0 && number <= 100) {
                onChange(e);
              }
            }}
            onKeyDown={(e) => {
              if (["e", "E", "+", "-"].includes(e.key)) {
                e.preventDefault();
              }
            }}
            required={required}
            className={`h-[2.625rem] ${baseStyles}`}
            max={100}
            min={0}
          />
        ) : (
          <input
            id={name}
            name={name}
            type={inputType}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onInput={
              ["text", "search", "email", "url", "tel", "number", "password"].includes(
                type
              )
                ? handleSanitizeInput
                : undefined
            }
            required={required}
            className={`h-[2.625rem] ${baseStyles}`}
            maxLength={maxLength}
            minLength={minLength}
            disabled={disable}
          />
        )}

        {type === "password" && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-3 text-gray-500 focus:outline-none"
          >
            {isPasswordVisible ? <FaEyeSlash /> : <FaEye />}
          </button>
        )}
      </div>

      {error && (
        <p className="text-[#DC3545] text-xs font-normal leading-[14.52px]">
          {error}
        </p>
      )}
    </div>
  );
};


export default Input
