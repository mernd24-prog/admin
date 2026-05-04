import React from 'react'

const FormSubmitButton = ({
  buttonLabel = 'Log In',
  type = "submit"
}) => {
  return (
    <div>
      <button
        type={type}
        className="w-full px-4 py-2 text-black bg-white  hover:bg-[#418dcf] outline-none"
      >
        {buttonLabel}
      </button>
    </div>
  )
}

export default FormSubmitButton