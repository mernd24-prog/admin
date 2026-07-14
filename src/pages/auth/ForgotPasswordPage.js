import FormLayout from "../../components/FormLayout/FormLayout";
import EmailInput from "../../components/Atoms/EmailInput";
import Loader from "../../components/Loader/Loader";
import FormSubmitButton from "../../components/Atoms/FormButton/FormSubmitButton";
import { AUTH_FORM_TYPES } from "../../context/AuthLayoutContext";
import { useAuthFlow } from "./useAuthFlow";
import AuthTermsCheckbox from "./components/AuthTermsCheckbox";
import {
  AUTH_INPUT_CLASS_NAME,
  AUTH_LABEL_CLASS_NAME,
} from "./authFormStyles";
import { useAuthPageMeta } from "./useAuthPageMeta";

const ForgotPasswordPage = () => {
  const auth = useAuthFlow({
    currentFormType: AUTH_FORM_TYPES.FORGOT_PASSWORD,
  });

  useAuthPageMeta(
    "Forgot Password",
    "Recover your seller account password.",
  );

  return (
    <div className="relative overflow-hidden">
      <Loader loading={auth.isBusy} />
      <FormLayout
        title="Password Recovery"
        subTitle="Enter your email to recover your password."
        onSubmit={auth.handleForgotPasswordSubmit}
        bottomText="Don't have an account?"
        linkText="Register"
        onLinkClick={auth.goToRegister}
        cardClassName="min-h-[210px] py-[38px]"
      >
        <div className="relative z-10 flex flex-col gap-4">
          <EmailInput
            id="forgotEmail"
            name="forgotEmail"
            label="Email Address"
            value={auth.formFields.forgotEmail}
            placeholder="Email address"
            onChange={auth.handleInputChange}
            errorMessage={auth.formErrors.forgotEmail}
            inputClassName={AUTH_INPUT_CLASS_NAME}
            labelClassName={AUTH_LABEL_CLASS_NAME}
            autoFocus
          />

          {auth.loginError && (
            <div className="animate-fade-in rounded-md bg-red-50 p-2 text-[11px] leading-[15px] text-red-800">
              {auth.loginError}
            </div>
          )}

          <div className="pt-2">
            <AuthTermsCheckbox
              checked={auth.termsAccepted}
              onChange={(event) => auth.setTermsAccepted(event.target.checked)}
            />
            <FormSubmitButton
              buttonLabel={
                auth.loading ? "Sending Reset Link..." : "Send Reset Link"
              }
            />

          </div>
        </div>
      </FormLayout>
    </div>
  );
};

export default ForgotPasswordPage;
