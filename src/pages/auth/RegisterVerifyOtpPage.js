import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FormLayout from "../../components/FormLayout/FormLayout";
import AuthProgressSteps from "../../components/AuthVerification/AuthProgressSteps";
import OtpVerificationCard from "../../components/AuthVerification/OtpVerificationCard";
import Loader from "../../components/Loader/Loader";
import { AUTH_FORM_TYPES } from "../../context/AuthLayoutContext";
import { AUTH_ROUTES } from "./authRoutes";
import { useAuthFlow } from "./useAuthFlow";
import { useAuthPageMeta } from "./useAuthPageMeta";

const RegisterVerifyOtpPage = () => {
  const navigate = useNavigate();
  const auth = useAuthFlow({
    currentFormType: AUTH_FORM_TYPES.REGISTER_VERIFICATION,
  });

  useAuthPageMeta("Verify Registration", "Verify your seller account.");

  useEffect(() => {
    if (!auth.formFields.registerEmail) {
      navigate(AUTH_ROUTES.REGISTER, { replace: true });
    }
  }, [auth.formFields.registerEmail, navigate]);

  return (
    <div className="relative overflow-hidden">
      <Loader loading={auth.isBusy} />
      <FormLayout
        title="Verify Your Account"
        subTitle="We've sent a verification code to your registered mobile number. Please enter the code below to confirm your identity and continue the verification process."
        subTitleClassName=" text-center font-inter !text-[19px] font-normal !leading-[35px] tracking-[0%] text-[#484555]"
        onSubmit={auth.handleRegisterOtpSubmit}
        showLogo={false}
        shellClassName="items-start pt-10 pb-8 sm:pt-[58px] lg:pt-[54px]"
        className="!max-w-[812px]"
        titleClassName="!text-[29px] sm:!text-[29px] font-medium"
        cardClassName="mt-[24px] min-h-[380px] !max-w-[812px] justify-center rounded-[10px] px-5 py-9 sm:min-h-[454px] sm:px-10 sm:py-10"
        topContent={<AuthProgressSteps activeStep={1} />}
      >
        <OtpVerificationCard
          codeInputRefs={auth.codeInputRefs}
          verificationCode={auth.verificationCode}
          onCodeChange={auth.handleCodeChange}
          onCodeKeyDown={auth.handleCodeKeyDown}
          onCodePaste={auth.handleCodePaste}
          errorMessage={auth.formErrors.verificationCode}
          loading={auth.loading}
          resendCooldown={auth.resendCooldown}
          resendOtpLabel={auth.resendOtpLabel}
          onResendOtp={auth.handleResendOtp}
        />
      </FormLayout>
    </div>
  );
};

export default RegisterVerifyOtpPage;
