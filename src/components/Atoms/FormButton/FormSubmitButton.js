import React from "react";

const FormSubmitButton = ({
  buttonLabel = "Log In",
  type = "submit",
  onClick,
}) => {
  return (
    <div>
      <button
        type={type}
        onClick={onClick}
        className="w-full px-4 py-2 text-black bg-white  hover:bg-[#ed7dd1] outline-none"
      >
        {buttonLabel}
      </button>
    </div>
  );
};

export default FormSubmitButton;
