import React from "react";
import FormSubmitButton from "../Atoms/FormButton/FormSubmitButton";
import OtpCodeInputs from "./OtpCodeInputs";

const maskPhoneNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";

  return `**** **** ${digits.slice(-4)}`;
};

const OtpVerificationCard = ({
  codeInputRefs,
  verificationCode,
  onCodeChange,
  onCodeKeyDown,
  onCodePaste,
  errorMessage,
  loading,
  resendCooldown,
  resendOtpLabel,
  onResendOtp,
  phone,
  maskedPhone,
}) => {
  const displayPhone = maskedPhone || maskPhoneNumber(phone);

  return (
    <div className="relative z-10  mx-auto flex w-full max-w-full flex-col items-center justify-center">
      <p className="text-center font-[Inter] text-[16px] font-medium leading-[30px] tracking-[0%] text-[#2E2E2E]">
        Phone Number :{" "}
        <span className="font-semibold text-[#3E4094]">
          {displayPhone || "Registered mobile number"}
        </span>
      </p>

      <OtpCodeInputs
        codeInputRefs={codeInputRefs}
        verificationCode={verificationCode}
        onCodeChange={onCodeChange}
        onCodeKeyDown={onCodeKeyDown}
        onCodePaste={onCodePaste}
        containerClassName="mt-[18px] grid w-full max-w-[476px] grid-cols-6 gap-2 min-[420px]:gap-[10px] sm:gap-[14px]"
        inputClassName="aspect-square w-full rounded-[4px] border border-[#eeeeee] bg-white text-center text-[18px] text-[#9a9a9a] shadow-[0_4px_8px_rgba(0,0,0,0.12)] outline-none transition-all duration-300 focus:border-[#082f91] focus:ring-2 focus:ring-[#dbe3ff] sm:h-[70px] sm:text-[22px]"
      />

      {errorMessage && (
        <div className="mt-4 w-full max-w-[570px] rounded-md bg-red-50 px-3 py-2 text-center text-xs text-red-800">
          {errorMessage}
        </div>
      )}

      <div className="mt-[30px] w-full max-w-[570px] sm:mt-[37px]">
        <FormSubmitButton
          buttonLabel={loading ? "Verifying..." : "Verify & Continue"}
          className="h-[40px] w-full rounded-[8px] !text-[13px]"
        />
      </div>

      <p className="mt-[13px] text-center font-[Inter] text-[15px] font-medium leading-[25px] tracking-[0%] text-[#6B7280]">
        Didn’t receive code?{" "}
        <button
          type="button"
          className="font-semibold text-[#082f91] hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:no-underline"
          onClick={onResendOtp}
          disabled={resendCooldown > 0 || loading}
        >
          {resendOtpLabel}
        </button>
      </p>
    </div>
  );
};

export default OtpVerificationCard;
