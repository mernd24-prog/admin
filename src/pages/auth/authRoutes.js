export const AUTH_ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  VERIFY_OTP: "/verify-otp",
  RESET_PASSWORD: "/reset-password",
  REGISTER: "/register",
  REGISTER_VERIFY_OTP: "/register-verify-otp",
  VERIFICATION_COMPLETE: "/verification-complete",
  ONBOARDING: "/seller/onboarding",
  APP_HOME: "/app/home",
};

export const LEGACY_AUTH_REDIRECTS = {
  "/forgotPassword": AUTH_ROUTES.FORGOT_PASSWORD,
  "/verifyOtp": AUTH_ROUTES.VERIFY_OTP,
  "/ResetPassword": AUTH_ROUTES.RESET_PASSWORD,
};
