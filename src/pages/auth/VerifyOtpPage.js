import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FormLayout from "../../components/FormLayout/FormLayout";
import FormSubmitButton from "../../components/Atoms/FormButton/FormSubmitButton";
import Loader from "../../components/Loader/Loader";
import OtpCodeInputs from "../../components/AuthVerification/OtpCodeInputs";
import { AUTH_FORM_TYPES } from "../../context/AuthLayoutContext";
import { AUTH_ROUTES } from "./authRoutes";
import { useAuthFlow } from "./useAuthFlow";
import { useAuthPageMeta } from "./useAuthPageMeta";

const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuthFlow({
    currentFormType: AUTH_FORM_TYPES.VERIFICATION_CODE,
  });
  const email = auth.formFields.forgotEmail || location.state?.email || "";

  useAuthPageMeta("Verify OTP", "Verify your password recovery code.");

  useEffect(() => {
    if (!email) {
      navigate(AUTH_ROUTES.FORGOT_PASSWORD, { replace: true });
    }
  }, [email, navigate]);

  return (
    <div className="relative overflow-hidden">
      <Loader loading={auth.isBusy} />
      <FormLayout
        title="Verification Code"
        subTitle={`Enter the 6-digit code sent to ${email}`}
        onSubmit={auth.handleVerificationSubmit}
      >
        <div className="relative z-10 flex flex-col gap-4">
          <OtpCodeInputs
            codeInputRefs={auth.codeInputRefs}
            verificationCode={auth.verificationCode}
            onCodeChange={auth.handleCodeChange}
            onCodeKeyDown={auth.handleCodeKeyDown}
            onCodePaste={auth.handleCodePaste}
            containerClassName="flex space-x-2"
            inputClassName="h-12 w-12 animate-pop-in rounded-md border border-transparent bg-white text-center text-lg outline-none transition-all duration-300 focus:border-[#d8d4cf] focus:ring-2 focus:ring-[#e8e3dd]"
            getInputStyle={(index) => ({ animationDelay: `${index * 0.1}s` })}
          />

          {auth.formErrors.verificationCode && (
            <div className="animate-fade-in rounded-md bg-red-50 p-2 text-center text-[11px] leading-[15px] text-red-800">
              {auth.formErrors.verificationCode}
            </div>
          )}

          <div
            className="mt-6 animate-fade-in"
            style={{ animationDelay: "0.7s" }}
          >
            <FormSubmitButton
              buttonLabel={auth.loading ? "Verifying..." : "Verify Code"}
            />
          </div>

          <div
            className="mt-4 flex items-center justify-between gap-4 text-sm animate-fade-in"
            style={{ animationDelay: "0.8s" }}
          >
            <p className="min-w-0 text-gray-500">
              Didn't receive the code?{" "}
              <button
                type="button"
                className="font-medium text-[#031b52] transition-colors hover:text-[#082f91] hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:no-underline"
                onClick={auth.handleResendOtp}
                disabled={auth.resendCooldown > 0 || auth.loading}
              >
                {auth.resendOtpLabel}
              </button>
            </p>
            <button
              type="button"
              className="shrink-0 whitespace-nowrap text-[#031b52] transition-colors hover:text-[#082f91] hover:underline"
              onClick={() => auth.goToLogin({ reset: true })}
            >
              Back to Login
            </button>
          </div>
        </div>
      </FormLayout>
    </div>
  );
};

export default VerifyOtpPage;
