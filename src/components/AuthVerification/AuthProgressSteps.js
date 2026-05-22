import React from "react";
import { FaCheck, FaShieldAlt } from "react-icons/fa";

const defaultSteps = [
  { label: "Account", icon: FaCheck },
  { label: "OTP", icon: FaCheck },
  { label: "Verified", icon: FaShieldAlt },
];

const AuthProgressSteps = ({
  steps = defaultSteps,
  activeStep = 0,
  className = "",
}) => (
  <div
    className={`mb-10 flex w-full max-w-[510px] items-start justify-between px-2 sm:mb-[54px] sm:px-0 ${className}`}
  >
    {steps.map((step, index) => {
      const StepIcon = step.icon;
      const isActive = index <= activeStep;
      const isConnectorActive = index <= activeStep;

      return (
        <React.Fragment key={step.label}>
          <div className="flex min-w-[62px] flex-col items-center">
            <div
              className={`flex h-[38px] w-[38px] items-center justify-center rounded-full border-4 sm:h-[42px] sm:w-[42px] ${
                isActive ? "border-[#df9e1e] bg-[#eba51d]" : " bg-[#8d929a]"
              }`}
            >
              <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/30 text-white">
                <StepIcon size={10} />
              </div>
            </div>
            <span
              className={`mt-[10px] text-[10px] font-semibold tracking-[0.8px] sm:text-[12px] sm:tracking-[1px] ${
                isActive ? "text-[#e29a10]" : "text-[#7f848c]"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`mt-[19px] h-[2px] flex-1 sm:mt-[20px] ${
                isConnectorActive ? "bg-[#eba51d]" : "bg-[#8d929a]"
              }`}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

export default AuthProgressSteps;
