import FormSubmitButton from "../../components/Atoms/FormButton/FormSubmitButton";
import EmailInput from "../../components/Atoms/EmailInput";
import PasswordInput from "../../components/Atoms/password/PasswordInput";
import Loader from "../../components/Loader/Loader";
import AuthProgressSteps from "../../components/AuthVerification/AuthProgressSteps";
import { AUTH_FORM_TYPES } from "../../context/AuthLayoutContext";
import AuthTermsCheckbox from "./components/AuthTermsCheckbox";
import { AUTH_INPUT_CLASS_NAME, AUTH_LABEL_CLASS_NAME } from "./authFormStyles";
import { useAuthFlow } from "./useAuthFlow";
import { useAuthPageMeta } from "./useAuthPageMeta";

const RegisterPage = () => {
  const auth = useAuthFlow({
    currentFormType: AUTH_FORM_TYPES.REGISTER,
    hydrateDraftOnMount: false,
  });

  useAuthPageMeta("Register", "Create your seller account.");

  return (
    <div className="relative overflow-hidden">
      <Loader loading={auth.isBusy} />
      <div className="w-full">
        <div className="flex justify-center">
          <AuthProgressSteps activeStep={0} />
        </div>
        <div className="mb-10 text-center">
          <h2 className="font-inter text-3xl font-extrabold text-black sm:text-2xl 3xl:text-4xl">
            Create Your Vendor Account
          </h2>
          <p className="mt-1 3xl:mt-3 font-inter sm:text-base 3xl:text-lg text-darkInk">
            Set up your secure profile and start selling on Sam Global.
          </p>
        </div>

        <form
          onSubmit={auth.handleRegisterSubmit}
          className="mx-auto min-h-[440px] w-full rounded-[14px] border border-[#dedede] bg-[#f7f5f2] px-5  shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-10 md:min-h-[480px] md:px-[64px] sm:py-[35px] 3xl:py-[70px] xl:min-h-[400px]"
        >
          <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
            <EmailInput
              id="firstName"
              name="firstName"
              label="First Name"
              value={auth.formFields.firstName}
              placeholder="e.g. John"
              onChange={auth.handleInputChange}
              errorMessage={auth.formErrors.firstName}
              inputClassName={AUTH_INPUT_CLASS_NAME}
              labelClassName={AUTH_LABEL_CLASS_NAME}
            />
            <EmailInput
              id="lastName"
              name="lastName"
              label="Last Name"
              value={auth.formFields.lastName}
              placeholder="e.g. Doe"
              onChange={auth.handleInputChange}
              errorMessage={auth.formErrors.lastName}
              inputClassName={AUTH_INPUT_CLASS_NAME}
              labelClassName={AUTH_LABEL_CLASS_NAME}
            />

            <EmailInput
              id="registerEmail"
              name="registerEmail"
              label="Email Address"
              value={auth.formFields.registerEmail}
              placeholder="john@example.com"
              onChange={auth.handleInputChange}
              errorMessage={auth.formErrors.registerEmail}
              inputClassName={AUTH_INPUT_CLASS_NAME}
              labelClassName={AUTH_LABEL_CLASS_NAME}
            />

            <EmailInput
              id="phone"
              name="phone"
              type="tel"
              onlyNumber={true}
              maxLength={10}
              inputMode="numeric"
              label="Phone Number"
              value={auth.formFields.phone}
              placeholder="Enter 10 digit number"
              onChange={auth.handleInputChange}
              errorMessage={auth.formErrors.phone}
              inputClassName={AUTH_INPUT_CLASS_NAME}
              labelClassName={AUTH_LABEL_CLASS_NAME}
            />

            <PasswordInput
              id="registerPassword"
              name="registerPassword"
              label="Password"
              value={auth.formFields.registerPassword}
              placeholder="••••••••"
              onChange={auth.handleInputChange}
              errorMessage={auth.formErrors.registerPassword}
              inputClassName={AUTH_INPUT_CLASS_NAME}
              labelClassName={AUTH_LABEL_CLASS_NAME}
            />

            <PasswordInput
              id="confirmRegisterPassword"
              name="confirmRegisterPassword"
              label="Confirm Password"
              value={auth.formFields.confirmRegisterPassword}
              placeholder="••••••••"
              onChange={auth.handleInputChange}
              errorMessage={auth.formErrors.confirmRegisterPassword}
              inputClassName={AUTH_INPUT_CLASS_NAME}
              labelClassName={AUTH_LABEL_CLASS_NAME}
            />
          </div>

          <div className="my-8">
            <AuthTermsCheckbox
              checked={auth.termsAccepted}
              onChange={(event) => auth.setTermsAccepted(event.target.checked)}
            />
          </div>

          {auth.loginError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-[15px] text-red-700  md:col-span-2">
              {auth.loginError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_1fr]">
            <button
              type="button"
              onClick={() => auth.goToLogin({ reset: true })}
              className="rounded-lg border border-blue px-6 py-2 font-semibold text-blue"
            >
              Back
            </button>
            <FormSubmitButton
              buttonLabel={
                auth.loading
                  ? "Sending Verification..."
                  : "Continue to Verification"
              }
              className="h-[40px] rounded-[7px] font-inter text-[12px]"
              disabled={auth.isBusy}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
