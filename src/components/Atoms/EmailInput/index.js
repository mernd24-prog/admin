import React, { useState, useCallback, useEffect, useRef } from "react";
import { LuAsterisk } from "react-icons/lu";
import { AiOutlineUser } from "react-icons/ai";

const EmailInput = React.memo(
  ({
    id = "email",
    name = "email",
    value = "",
    placeholder = "",
    onChange,
    onBlur,
    icon: Icon = AiOutlineUser,
    className = "",
    containerClassName = "",
    inputClassName = "",
    label = "",
    labelClassName = "",
    errorMessage,
    iconClassName = "",
    isDisable = false,
    autoFocus = false,
    ...rest
  }) => {
    const [email, setEmail] = useState(value);
    const [, setIsValid] = useState(true);

    const MIN_EMAIL_LENGTH = 3;

    const handleChange = useCallback(
      (event) => {
        const newEmail = event.target.value;

        setEmail(newEmail);
        setIsValid(newEmail.length >= MIN_EMAIL_LENGTH);

        if (onChange) {
          onChange(event);
        }
      },
      [onChange]
    );

    const handleBlur = useCallback(
      (event) => {
        setIsValid(email.length >= MIN_EMAIL_LENGTH);

        if (onBlur) {
          onBlur(event);
        }
      },
      [email, onBlur]
    );

    useEffect(() => {
      setEmail(value);
      setIsValid(value.length >= MIN_EMAIL_LENGTH);
    }, [value]);

    const inputRef = useRef();

    useEffect(() => {
      if (autoFocus && inputRef.current) {
        inputRef.current.focus();
      }
    }, [autoFocus]);

    return (
      <div className={`w-full ${containerClassName}`}>

        {/* LABEL */}
        {label && (
          <label
            htmlFor={id}
            className={`
              mb-2 flex items-start gap-1
              text-sm font-medium text-[#1E1E1E]
              ${labelClassName}
            `}
          >
            {label}

            <LuAsterisk className="text-[#B42318] text-[10px] mt-[2px]" />
          </label>
        )}

        {/* INPUT WRAPPER */}
        <div className="relative">

          {/* ICON */}
          <Icon
            className={`
              absolute right-[14px] top-1/2 -translate-y-1/2
              text-[#9a9a9a] text-[15px]
              ${iconClassName}
            `}
          />

          {/* INPUT */}
          <input
            ref={inputRef}
            disabled={isDisable}
            id={id}
            name={name}
            type="text"
            value={email}
            autoComplete="off"
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`
              w-full h-[38px]
              rounded-md
              border border-transparent
              bg-white
              pl-3 pr-10
              text-[12px]
              text-[#101828]
              placeholder:text-[#9a9a9a]
              outline-none
              transition-all duration-300

              focus:bg-white
              focus:border-[#d8d4cf]
              focus:ring-2
              focus:ring-[#e8e3dd]

              disabled:cursor-not-allowed
              disabled:opacity-70

              ${
                errorMessage
                  ? "border-red-400 focus:ring-red-100"
                  : ""
              }

              ${inputClassName}
              ${className}
            `}
            {...rest}
          />

        </div>

        {/* ERROR MESSAGE */}
        {errorMessage && (
          <p className="mt-2 text-sm text-[#B42318]">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

export default EmailInput;
