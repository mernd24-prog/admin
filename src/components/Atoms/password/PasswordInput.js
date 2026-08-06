import React, { useState } from "react";
import { LuAsterisk } from "react-icons/lu";
import { FaEyeSlash } from "react-icons/fa";
import { FiEye } from "react-icons/fi";

const PasswordInput = React.memo(
  ({
    id = "default-id",
    name = "default-name",
    placeholder = "Enter password",
    label = "",
    inputClassName = "",
    iconClassName = "",
    containerClassName = "",
    labelClassName = "",
    autoComplete = "off",
    errorMessage = "",
    required = false,
    value = "",
    ...rest
  }) => {
    const [type, setType] = useState("password");
    const clickEyeButton = () => {
      setType(type === "password" ? "text" : "password");
    };

    return (
      <div className={containerClassName}>
        {label && (
          <label
            htmlFor={id}
            className={`mb-[6px] flex items-start gap-1 text-[13px] font-medium leading-[18px] text-[#344054] sm:text-[14px] sm:leading-[20px] ${labelClassName}`}
          >
            {label}
            {required && (
              <LuAsterisk className="mt-[2px] text-[#B42318]" size={10} />
            )}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            autoComplete={autoComplete}
            required={required}
            className={`admin-input h-[40px] ${inputClassName} !pr-12`}
            placeholder={placeholder}
            {...rest}
          />

          <button
            type="button"
            onClick={clickEyeButton}
            className={`absolute right-0 top-0 z-10 flex h-[40px] w-10 items-center justify-center text-[#9a9a9a] hover:text-[#031b52] ${iconClassName}`}
            aria-label={type === "password" ? "Show password" : "Hide password"}
          >
            {type === "password" ? (
              <FiEye size={14} />
            ) : (
              <FaEyeSlash size={14} />
            )}
          </button>
        </div>
        {errorMessage && (
          <div className="mt-1 text-[11px] leading-[15px] text-red-700">
            {errorMessage}
          </div>
        )}
      </div>
    );
  },
);

export default PasswordInput;
