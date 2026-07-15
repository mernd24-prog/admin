import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import FormLayout from "../../components/FormLayout/FormLayout";
import PasswordInput from "../../components/Atoms/password/PasswordInput";
import Loader from "../../components/Loader/Loader";
import FormSubmitButton from "../../components/Atoms/FormButton/FormSubmitButton";
import { AUTH_FORM_TYPES } from "../../context/AuthLayoutContext";
import AuthTermsCheckbox from "./components/AuthTermsCheckbox";
import {
  AUTH_INPUT_CLASS_NAME,
  AUTH_LABEL_CLASS_NAME,
} from "./authFormStyles";
import { AUTH_ROUTES } from "./authRoutes";
import { useAuthFlow } from "./useAuthFlow";
import { useAuthPageMeta } from "./useAuthPageMeta";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuthFlow({
    currentFormType: AUTH_FORM_TYPES.RESET_PASSWORD,
  });
  const email = auth.formFields.forgotEmail || location.state?.email || "";
  const otp = auth.formFields.forgotOtp || location.state?.otp || "";

  useAuthPageMeta("Reset Password", "Create a new account password.");

  useEffect(() => {
    if (!email || !otp) {
      navigate(AUTH_ROUTES.FORGOT_PASSWORD, { replace: true });
    }
  }, [email, navigate, otp]);

  return (
    <div className="relative overflow-hidden">
      <Loader loading={auth.isBusy} />
      <FormLayout
        title="Reset Password"
        subTitle="Create a new password to secure your account"
        onSubmit={auth.handleResetPasswordSubmit}
        bottomText="Don't have an account?"
        linkText="Register"
        onLinkClick={auth.goToRegister}
      >
        <div className="relative z-10 flex flex-col gap-4">
          <PasswordInput
            id="newPassword"
            name="newPassword"
            label="New Password"
            value={auth.formFields.newPassword}
            placeholder="New password"
            onChange={auth.handleInputChange}
            errorMessage={auth.formErrors.newPassword}
            inputClassName={AUTH_INPUT_CLASS_NAME}
            labelClassName={AUTH_LABEL_CLASS_NAME}
            autoFocus
          />

          <PasswordInput
            id="confirmNewPassword"
            name="confirmNewPassword"
            label="Confirm Password"
            value={auth.formFields.confirmNewPassword}
            placeholder="Confirm new password"
            onChange={auth.handleInputChange}
            errorMessage={auth.formErrors.confirmNewPassword}
            inputClassName={AUTH_INPUT_CLASS_NAME}
            labelClassName={AUTH_LABEL_CLASS_NAME}
          />

          {auth.loginError && (
            <div className="animate-fade-in rounded-md bg-red-50 p-2 text-[11px] leading-[15px] text-red-800">
              {auth.loginError}
            </div>
          )}

          <div
            className="pt-1 animate-fade-in"
            style={{ animationDelay: "0.3s" }}
          >
            <AuthTermsCheckbox
              checked={auth.termsAccepted}
              onChange={(event) => auth.setTermsAccepted(event.target.checked)}
            />
            <FormSubmitButton
              buttonLabel={auth.loading ? "Resetting..." : "Reset Password"}
            />
          </div>
        </div>
      </FormLayout>
    </div>
  );
};

export default ResetPasswordPage;
