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
        className={`flex h-[46px] w-full items-center justify-center gap-[10px] rounded-[7px] bg-[#082f91] px-4 text-sm md:text-lg font-inter font-bold text-white shadow-[0_8px_16px_rgba(8,47,145,0.28)] outline-none transition-all duration-300 hover:bg-[#062779] hover:shadow-[0_10px_18px_rgba(8,47,145,0.32)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
      >
        {buttonLabel}
      </button>
    </div>
  );
};

export default FormSubmitButton;
