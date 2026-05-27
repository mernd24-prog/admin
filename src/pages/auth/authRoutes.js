export const AUTH_ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  VERIFY_OTP: "/verify-otp",
  RESET_PASSWORD: "/reset-password",
  REGISTER: "/register",
  REGISTER_VERIFY_OTP: "/register-verify-otp",
  VERIFICATION_COMPLETE: "/seller/verification-complete",
  ONBOARDING: "/seller/onboarding",
  ONBOARDING_COMPLETE: "/seller/onboarding/complete",
  SELLER_STATUS: "/seller/status/:status",
  SELLER_STATUS_BASE: "/seller/status",
  SELLER_STATUS_PENDING: "/seller/status/pending",
  SELLER_STATUS_REJECTED: "/seller/status/rejected",
  SELLER_STATUS_APPROVED: "/seller/status/approved",
  APP_HOME: "/app/home",
};

export const LEGACY_AUTH_REDIRECTS = {
  "/forgotPassword": AUTH_ROUTES.FORGOT_PASSWORD,
  "/verifyOtp": AUTH_ROUTES.VERIFY_OTP,
  "/ResetPassword": AUTH_ROUTES.RESET_PASSWORD,
  "/verification-complete": AUTH_ROUTES.VERIFICATION_COMPLETE,
};
