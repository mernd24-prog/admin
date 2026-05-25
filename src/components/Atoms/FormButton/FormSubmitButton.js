import React from "react";

const FormSubmitButton = ({
  buttonLabel = "Log In",
  type = "submit",
  onClick,
  className = "",
  disabled = false,
}) => {
  return (
    <div className="w-full">
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`admin-btn-primary h-[46px] w-full font-inter ${className}`}
      >
        {buttonLabel}
      </button>
    </div>
  );
};

export default FormSubmitButton;
