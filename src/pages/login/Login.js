import FormLayout from "../../components/FormLayout/FormLayout";
import EmailInput from "../../components/Atoms/EmailInput";
import PasswordInput from "../../components/Atoms/password/PasswordInput";
import Loader from "../../components/Loader/Loader";
import FormSubmitButton from "../../components/Atoms/FormButton/FormSubmitButton";
import { AUTH_FORM_TYPES } from "../../context/AuthLayoutContext";
import { useAuthFlow } from "../auth/useAuthFlow";
import AuthTermsCheckbox from "../auth/components/AuthTermsCheckbox";
import {
  AUTH_INPUT_CLASS_NAME,
  AUTH_LABEL_CLASS_NAME,
} from "../auth/authFormStyles";
import { useAuthPageMeta } from "../auth/useAuthPageMeta";

const Login = () => {
  const auth = useAuthFlow({
    currentFormType: AUTH_FORM_TYPES.LOGIN,
    clearAuthOnMount: true,
  });

  useAuthPageMeta(
    auth.sellerPanel ? "Seller Login" : "Admin Login",
    "Login to access your account.",
  );

  return (
    <div className="relative overflow-hidden">
      <Loader loading={auth.isBusy} />
      <FormLayout
        title="Welcome back!"
        subTitle={
          auth.sellerPanel
            ? "Enter your seller email and password to continue"
            : "Enter your credentials to access your account"
        }
        onSubmit={auth.handleLoginSubmit}
        cardClassName="min-h-[286px]"
        bottomText={auth.sellerPanel ? "Don't have an account?" : undefined}
        linkText={auth.sellerPanel ? "Register" : undefined}
        onLinkClick={auth.sellerPanel ? auth.goToRegister : undefined}
        showLogo
      >
        <div className="relative z-10 flex flex-col">
          <div className={auth.sellerPanel ? "mb-[24px]" : "mb-[18px]"}>
            <EmailInput
              id="email"
              name="email"
              label="Email Address"
              value={auth.formFields.email}
              placeholder="e.g. John Doe"
              onChange={auth.handleInputChange}
              errorMessage={auth.formErrors.email}
              inputClassName={AUTH_INPUT_CLASS_NAME}
              labelClassName={AUTH_LABEL_CLASS_NAME}
              autoFocus
            />
          </div>

          <div className="mb-[8px]">
            <PasswordInput
              id="password"
              name="password"
              label="Password"
              value={auth.formFields.password}
              placeholder="••••••••"
              onChange={auth.handleInputChange}
              errorMessage={auth.formErrors.password}
              inputClassName={AUTH_INPUT_CLASS_NAME}
              labelClassName={AUTH_LABEL_CLASS_NAME}
            />
          </div>

          {auth.loginError && (
            <div className="mb-[10px] animate-fade-in rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-[15px] text-red-700">
              {auth.loginError}
            </div>
          )}

          {auth.sellerPanel && (
            <div
              className="mb-[24px] flex min-h-[13px] items-center justify-end"
              style={{ animationDelay: "0.3s" }}
            >
              <button
                type="button"
                onClick={auth.goToForgotPassword}
                className="text-[12px] font-medium text-[#031b52] transition-all hover:text-[#082f91] hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <FormSubmitButton
            buttonLabel={
              auth.loading
                ? "Signing in..."
                : auth.sellerPanel
                  ? "Seller Login"
                  : "Login"
            }
          />

          {auth.sellerPanel && (
            <AuthTermsCheckbox
              checked={auth.termsAccepted}
              onChange={(event) => auth.setTermsAccepted(event.target.checked)}
            />
          )}
        </div>
      </FormLayout>
    </div>
  );
};

export default Login;
