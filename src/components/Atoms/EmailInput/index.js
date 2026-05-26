import React, { useState, useCallback, useEffect, useRef } from "react";
import { LuAsterisk } from "react-icons/lu";

const EmailInput = React.memo(
  ({
    id = "email",
    name = "email",
    value = "",
    placeholder = "",
    onChange,
    onBlur,
    icon: Icon,
    className = "",
    containerClassName = "",
    inputClassName = "",
    label = "",
    labelClassName = "",
    errorMessage,
    iconClassName = "",
    isDisable = false,
    autoFocus = false,
    required = false,
    type = "text",
    onlyNumber = false,
    ...rest
  }) => {
    const [email, setEmail] = useState(value);
    const [, setIsValid] = useState(true);

    const MIN_EMAIL_LENGTH = 3;

    const handleChange = useCallback(
      (event) => {
        const newEmail = onlyNumber
          ? event.target.value.replace(/\D/g, "")
          : event.target.value;

        setEmail(newEmail);
        setIsValid(newEmail.length >= MIN_EMAIL_LENGTH);

        if (onChange) {
          onChange({
            ...event,
            target: {
              ...event.target,
              name: event.target.name,
              value: newEmail,
            },
          });
        }
      },
      [onChange, onlyNumber],
    );

    const handleBlur = useCallback(
      (event) => {
        setIsValid(email.length >= MIN_EMAIL_LENGTH);

        if (onBlur) {
          onBlur(event);
        }
      },
      [email, onBlur],
    );

    useEffect(() => {
      const nextValue = String(value ?? "");
      setEmail(nextValue);
      setIsValid(nextValue.length >= MIN_EMAIL_LENGTH);
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
  mb-[6px] flex items-start gap-1
  font-[Inter] text-[13px] font-medium leading-[17px]
  tracking-[0.14px] align-middle text-[#484555]
  opacity-100
  ${labelClassName}
`}
          >
            {label}

            {required && (
              <LuAsterisk className="mt-[2px] text-[10px]  text-[#B42318]" />
            )}
          </label>
        )}

        {/* INPUT WRAPPER */}
        <div className="relative">
          {/* ICON */}
          {Icon && (
            <Icon
              className={`
                absolute right-[14px] top-1/2 -translate-y-1/2
                text-[#9a9a9a] text-[15px]
                ${iconClassName}
              `}
            />
          )}

          {/* INPUT */}
          <input
            ref={inputRef}
            disabled={isDisable}
            id={id}
            name={name}
            type={type}
            value={email}
            required={required}
            autoComplete="off"
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`
              admin-input h-[40px] ${Icon ? "pr-10" : "pr-3"}
              disabled:cursor-not-allowed
              disabled:opacity-70

              ${errorMessage ? "border-red-400 focus:ring-red-100" : ""}

              ${inputClassName}
              ${className}
            `}
            {...rest}
          />
        </div>

        {/* ERROR MESSAGE */}
        {errorMessage && (
          <p className="mt-1 text-[11px] leading-[15px] text-[#B42318]">
            {errorMessage}
          </p>
        )}
      </div>
    );
  },
);

export default EmailInput;
