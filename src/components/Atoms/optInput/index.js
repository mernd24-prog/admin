import React, { useState, useRef } from "react";


const OtpInputComponent= ({
  labelName,
  name,
  placeholder,
  type,
  value,
  onChange,
  onKeyDown,
  required = false,
  errorMessage = null,
}) => {
  const [otp, setOtp] = useState(new Array(6).fill('')); 
  const inputRefs = useRef([]);

  const handleOtpChange = (index, e) => {
    const newOtp = [...otp];
    newOtp[index] = e.target.value;
    setOtp(newOtp);
    onChange(e, index); 
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '') {
      const prevIndex = index - 1;
      if (prevIndex >= 0) {
        inputRefs.current[prevIndex]?.focus();
      }
    } else if (e.key !== 'Backspace' && otp[index]?.length === 1) {
      const nextIndex = index + 1;
      if (nextIndex < otp.length) {
        inputRefs.current[nextIndex]?.focus();
      }
    }
    if (onKeyDown) onKeyDown(e, index);
  };

  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold leading-5">
        {labelName} {required && <span className="text-[#DC3545]">*</span>}
      </label>
      <div className="flex justify-between w-full gap-4 mt-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }} 
            type="text"
            value={digit}
            maxLength={1}
            onChange={(e) => handleOtpChange(index, e)}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            className="w-full h-14 text-center text-xl border rounded-md focus:ring-1 focus:ring-[#8089A0] outline-none"
            placeholder={placeholder}
          />
        ))}
      </div>
      {errorMessage && <p className="text-[#DC3545] text-xs font-normal leading-[14.52px] flex justify-end">{errorMessage}</p>}
    </div>
  );
};

export default OtpInputComponent;
