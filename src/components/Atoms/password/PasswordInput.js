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
            className={`admin-input h-[40px] pr-10
              ${inputClassName}
              
            `}
            placeholder={placeholder}
            {...rest}
          />
          {type === "password" ? (
            <FiEye
              size={14}
              className={`absolute right-[14px] top-1/2    -translate-y-1/2 cursor-pointer text-[#9a9a9a] ${iconClassName}`}
              onClick={clickEyeButton}
            />
          ) : (
            <FaEyeSlash
              size={14}
              className={`absolute right-[14px] top-1/2  -translate-y-1/2 cursor-pointer text-[#9a9a9a] ${iconClassName}`}
              onClick={clickEyeButton}
            />
          )}
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
