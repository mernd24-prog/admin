const express = require("express");
const { AuthController } = require("../controllers/auth.controller");
const { validateRequest } = require("../../../shared/middleware/validate-request");
const { asyncHandler } = require("../../../shared/middleware/async-handler");
const { authRateLimit } = require("../../../shared/middleware/auth-rate-limit");
const { authenticate } = require("../../../shared/middleware/authenticate");
const {
  loginSchema,
  refreshSchema,
  registerSchema,
  registerWithOtpSchema,
  verifyRegistrationSchema,
  socialLoginSchema,
  sendOtpSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require("../validation/auth.validation");

const authRoutes = express.Router();
const authController = new AuthController();

authRoutes.use(authRateLimit);
authRoutes.post("/register", validateRequest(registerSchema), asyncHandler(authController.register));
authRoutes.post("/register-otp", validateRequest(registerWithOtpSchema), asyncHandler(authController.registerWithOtp));
authRoutes.post("/verify-registration", validateRequest(verifyRegistrationSchema), asyncHandler(authController.verifyRegistration));
authRoutes.post("/login", validateRequest(loginSchema), asyncHandler(authController.login));
authRoutes.post("/social", validateRequest(socialLoginSchema), asyncHandler(authController.socialLogin));
authRoutes.post("/refresh", validateRequest(refreshSchema), asyncHandler(authController.refresh));

authRoutes.post("/send-otp", validateRequest(sendOtpSchema), asyncHandler(authController.sendOtp));
authRoutes.post("/verify-otp", validateRequest(verifyOtpSchema), asyncHandler(authController.verifyOtp));
authRoutes.post("/resend-otp", validateRequest(resendOtpSchema), asyncHandler(authController.resendOtp));
authRoutes.post("/forgot-password", validateRequest(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
authRoutes.post("/reset-password", validateRequest(resetPasswordSchema), asyncHandler(authController.resetPassword));
authRoutes.post("/change-password", authenticate, validateRequest(changePasswordSchema), asyncHandler(authController.changePassword));
authRoutes.get("/status", authenticate, asyncHandler(authController.status));

module.exports = { authRoutes };
  
