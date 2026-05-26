import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import {
  adminLogin,
  forgotPassword,
  normalizeAuthPayload,
  verifyOtp,
  resetPassword,
  registerWithOtp,
  verifyRegistration,
  resendOtp,
} from "../../Redux/auth-Slice";
import {
  startAuthenticatedSession,
  startSellerOnboarding,
} from "../../Redux/seller-slice";
import FormLayout from "../../components/FormLayout/FormLayout";
import Checkbox from "../../components/Atoms/Checkbox/Checkbox";
import EmailInput from "../../components/Atoms/EmailInput";
import PasswordInput from "../../components/Atoms/password/PasswordInput";
import Loader from "../../components/Loader/Loader";
import FormSubmitButton from "../../components/Atoms/FormButton/FormSubmitButton";
import AuthProgressSteps from "../../components/AuthVerification/AuthProgressSteps";
import OtpVerificationCard from "../../components/AuthVerification/OtpVerificationCard";
import { toast } from "sonner";
import { isSellerPanel, PANEL_MODES } from "../../_helpers/panelConfig";
import {
  clearStoredAuth,
  getLegacyRoleId,
  isAllowedRoleForPanel,
  setStoredAuth,
} from "../../_helpers/authStorage";
import { useAuthLayout } from "../../context/AuthLayoutContext";
import SellerStatusScreen from "../../components/StatusScreen/SellerStatusScreen";

const RESEND_COOLDOWN_SECONDS = 30;

const getApiErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) =>
  error?.payload ||
  error?.error?.message ||
  error?.message ||
  (typeof error === "string" ? error : "") ||
  fallback;

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { formType: formState, setFormType: setFormState } = useAuthLayout();
  const { authSlice } = useSelector((state) => state);
  const { loading } = authSlice || {};
  const sellerPanel = isSellerPanel();
  const panelMode = sellerPanel ? PANEL_MODES.SELLER : PANEL_MODES.ADMIN;
  const [loginError, setLoginError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [formFields, setFormFields] = useState({
    email: "",
    password: "",
    forgotEmail: "",
    forgotOtp: "",
    newPassword: "",
    confirmNewPassword: "",

    fullName: "",
    firstName: "",
    lastName: "",
    phone: "",
    registerEmail: "",
    registerPassword: "",
    confirmRegisterPassword: "",
    referralCode: "",
  });
  const [formErrors, setFormErrors] = useState({
    fullName: null,
    firstName: null,
    lastName: null,
    phone: null,
    registerEmail: null,
    registerPassword: null,
    confirmRegisterPassword: null,
  });
  const [, setFormAnimation] = useState("slide-in");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeInputRefs = Array(6)
    .fill()
    .map(() => React.createRef());

  useEffect(() => {
    clearStoredAuth();
    const savedCredentials = localStorage.getItem("EcomAdminRemember");
    if (savedCredentials) {
      try {
        const { email } = JSON.parse(savedCredentials);
        setFormFields((prev) => ({ ...prev, email }));
      } catch (e) {
        console.error("Invalid stored credentials:", e);
      }
    }
  }, []);

  useEffect(() => {
    setFormAnimation("slide-out");
    const timer = setTimeout(() => {
      setFormAnimation("slide-in");
    }, 300);

    return () => clearTimeout(timer);
  }, [formState]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;

    const timer = setTimeout(() => {
      setResendCooldown((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const validateLoginFields = useCallback(() => {
    let isValid = true;
    const errors = {};
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (formState === "login") {
      if (!formFields.email.trim()) {
        errors.email = "Email is required.";
        isValid = false;
      } else if (!emailRegex.test(formFields.email)) {
        errors.email = "Please enter a valid email address.";
        isValid = false;
      }

      if (!formFields.password.trim()) {
        errors.password = "Password is required.";
        isValid = false;
      } else if (
        !/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
          formFields.password,
        )
      ) {
        errors.password = "Please enter a valid password.";
        isValid = false;
      }
    } else if (formState === "forgotPassword") {
      if (!formFields.forgotEmail.trim()) {
        errors.forgotEmail = "Email is required.";
        isValid = false;
      } else if (!emailRegex.test(formFields.forgotEmail)) {
        errors.forgotEmail = "Please enter a valid email address.";
        isValid = false;
      }
    } else if (formState === "verificationCode") {
      const code = verificationCode.join("");
      if (code.length !== 6) {
        errors.verificationCode =
          "Please enter the complete verification code.";
        isValid = false;
      }
    } else if (formState === "resetPassword") {
      if (!formFields.newPassword.trim()) {
        errors.newPassword = "New password is required.";
        isValid = false;
      } else if (
        !/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
          formFields.newPassword,
        )
      ) {
        errors.newPassword =
          "Use 8+ characters with uppercase, number & special character.";
        isValid = false;
      }

      if (!formFields.confirmNewPassword.trim()) {
        errors.confirmNewPassword = "Please confirm your new password.";
        isValid = false;
      } else if (
        formFields.newPassword.trim() &&
        formFields.confirmNewPassword.trim() &&
        formFields.newPassword !== formFields.confirmNewPassword
      ) {
        errors.confirmNewPassword = "Passwords do not match.";
        isValid = false;
      }
    } else if (formState === "register") {
      if (!sellerPanel) {
        errors.registerEmail =
          "Registration is available only on the seller panel.";
        isValid = false;
      }
      if (!formFields.fullName.trim()) {
        errors.fullName = "Full name is required";
        isValid = false;
      } else if (formFields.fullName.trim().length < 2) {
        errors.fullName = "Full name must be at least 2 characters";
        isValid = false;
      }

      if (!formFields.lastName.trim()) {
        errors.lastName = "Last name is required";
        isValid = false;
      } else if (formFields.lastName.trim().length < 2) {
        errors.lastName = "Last name must be at least 2 characters";
        isValid = false;
      }

      if (!formFields.phone.trim()) {
        errors.phone = "Phone is required";
        isValid = false;
      } else if (!/^\d{10}$/.test(formFields.phone.trim())) {
        errors.phone = "Phone number must be exactly 10 digits";
        isValid = false;
      }

      if (!formFields.registerEmail.trim()) {
        errors.registerEmail = "Email is required";
        isValid = false;
      } else if (!emailRegex.test(formFields.registerEmail)) {
        errors.registerEmail = "Invalid email";
        isValid = false;
      }

      if (!formFields.registerPassword.trim()) {
        errors.registerPassword = "Password is required";
        isValid = false;
      } else if (formFields.registerPassword.length < 8) {
        errors.registerPassword = "Minimum 8 characters required";
        isValid = false;
      } else if (!/^(?=.*[A-Z])(?=.*\d).+$/.test(formFields.registerPassword)) {
        errors.registerPassword =
          "Password must contain at least one uppercase letter and one number";
        isValid = false;
      }

      if (!formFields.confirmRegisterPassword.trim()) {
        errors.confirmRegisterPassword = "Please confirm your password";
        isValid = false;
      } else if (
        formFields.registerPassword &&
        formFields.confirmRegisterPassword !== formFields.registerPassword
      ) {
        errors.confirmRegisterPassword = "Passwords do not match";
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  }, [formState, formFields, sellerPanel, verificationCode]);

  const setInlineError = useCallback((targetFormState, message) => {
    const safeMessage = message || "Something went wrong. Please try again.";
    if (
      targetFormState === "verificationCode" ||
      targetFormState === "registerVerification"
    ) {
      setFormErrors((prev) => ({ ...prev, verificationCode: safeMessage }));
      return;
    }
    setLoginError(safeMessage);
  }, []);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!sellerPanel) {
      setInlineError(
        "register",
        "Admin accounts are created by a super admin. Please use admin login.",
      );
      return;
    }

    if (!validateLoginFields()) {
      setFormAnimation("slide-in");
      return;
    }

    if (!requireTermsAgreement()) {
      return;
    }

    const firstName = formFields.fullName.trim();
    const lastName = formFields.lastName.trim();

    try {
      const response = await dispatch(
        registerWithOtp({
          email: formFields.registerEmail,
          phone: formFields.phone,
          password: formFields.registerPassword,
          role: "seller",
          profile: {
            firstName,
            lastName,
          },
          referralCode: formFields.referralCode || "",
        }),
      );

      if (!response?.error) {
        toast.success(
          response.payload?.data?.message ||
            response.payload?.message ||
            "OTP sent successfully",
        );
        setVerificationCode(["", "", "", "", "", ""]);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setFormState("registerVerification");
      } else {
        setInlineError(
          "register",
          getApiErrorMessage(
            response,
            "Registration failed. Please check the form and try again.",
          ),
        );
      }
    } catch (error) {
      console.log(error);
      setInlineError(
        "register",
        getApiErrorMessage(error, "Registration failed. Please try again."),
      );
    }
  };
  const handleRegisterOtpSubmit = async (e) => {
    e.preventDefault();

    const code = verificationCode.join("");

    if (code.length !== 6) {
      setInlineError("registerVerification", "Enter complete OTP");
      return;
    }

    try {
      const response = await dispatch(
        verifyRegistration({
          email: formFields.registerEmail,
          otp: code,
        }),
      );

      if (!response?.error) {
        setResendCooldown(0);
        const auth = normalizeAuthPayload(response?.payload);
        if (auth.requiresOnboarding && auth.onboardingToken) {
          dispatch(
            startSellerOnboarding({
              onboardingToken: auth.onboardingToken,
              user: auth.user || null,
              flowState: auth.flowState || null,
            }),
          );
          toast.success("Verification complete. Continue seller onboarding.");
          // navigate("/seller/onboarding");
          setFormState("verificationComplete");
          return;
        }
        toast.success(response.payload?.message);
        resetForm();
        setFormState("login");
      } else {
        const message = response.payload || "Invalid or expired OTP.";
        setFormErrors((prev) => ({ ...prev, verificationCode: message }));
      }
    } catch (error) {
      setInlineError(
        "registerVerification",
        getApiErrorMessage(error, "Verification failed. Please try again."),
      );
    }
  };
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({ ...prev, [name]: value.trim() }));
    setFormErrors((prev) => ({ ...prev, [name]: null }));
    setLoginError("");
  }, []);

  const handleCodeChange = useCallback(
    (index, value) => {
      if (!/^\d*$/.test(value)) return;

      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);
      setFormErrors((prev) => ({ ...prev, verificationCode: null }));

      if (value !== "" && index < 5 && codeInputRefs[index + 1]?.current) {
        codeInputRefs[index + 1].current.focus();
      }
    },
    [verificationCode, codeInputRefs, setFormErrors],
  );

  const handleCodeKeyDown = useCallback(
    (index, e) => {
      if (
        e.key === "Backspace" &&
        verificationCode[index] === "" &&
        index > 0
      ) {
        codeInputRefs[index - 1].current.focus();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [verificationCode, codeInputRefs],
  );

  const handleCodePaste = useCallback(
    (e) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData("text").trim();
      if (!/^\d+$/.test(pastedData)) return;

      const digits = pastedData.split("").slice(0, 6);
      const newCode = [...verificationCode];

      digits.forEach((digit, i) => {
        if (i < 6) newCode[i] = digit;
      });

      setVerificationCode(newCode);

      const nextEmptyIndex = newCode.findIndex((val) => val === "");
      if (nextEmptyIndex !== -1 && codeInputRefs[nextEmptyIndex]?.current) {
        codeInputRefs[nextEmptyIndex].current.focus();
      } else if (digits.length < 6 && codeInputRefs[digits.length]?.current) {
        codeInputRefs[digits.length].current.focus();
      } else if (codeInputRefs[5]?.current) {
        codeInputRefs[5].current.focus();
      }
    },
    [verificationCode, codeInputRefs],
  );

  const resetForm = useCallback(() => {
    setFormFields({
      email: "",
      password: "",
      forgotEmail: "",
      forgotOtp: "",
      newPassword: "",
      confirmNewPassword: "",
      fullName: "",
      firstName: "",
      lastName: "",
      phone: "",
      registerEmail: "",
      registerPassword: "",
      confirmRegisterPassword: "",
      referralCode: "",
    });
    setVerificationCode(["", "", "", "", "", ""]);
    setResendCooldown(0);
    setRememberMe(false);
    setFormErrors({
      email: null,
      password: null,
      forgotEmail: null,
      verificationCode: null,
      newPassword: null,
      confirmNewPassword: null,
      fullName: null,
      firstName: null,
      lastName: null,
      phone: null,
      registerEmail: null,
      registerPassword: null,
      confirmRegisterPassword: null,
    });
  }, []);

  const storeOrClearCredentials = useCallback(
    (email) => {
      if (rememberMe && email) {
        localStorage.setItem("EcomAdminRemember", JSON.stringify({ email }));
      } else {
        localStorage.removeItem("EcomAdminRemember");
      }
    },
    [rememberMe],
  );

  const requireTermsAgreement = useCallback(() => {
    if (rememberMe) return true;
    setInlineError(
      formState,
      "Please agree to the terms, privacy, and cancellation policies.",
    );
    return false;
  }, [formState, rememberMe, setInlineError]);

  const persistAuthenticatedSession = useCallback(
    (auth) => {
      const user = auth.user || {};
      const role = auth.role;
      const legacyRoleId = getLegacyRoleId(role);
      const sessionUser = {
        ...user,
        userId: user.id || user._id || user.userId,
        token: auth.accessToken,
        refreshToken: auth.refreshToken,
        role,
        roleSlug: role,
        roleId: legacyRoleId,
        role_id: legacyRoleId,
        allowedModules: auth.allowedModules || [],
      };

      setStoredAuth({
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        user,
        role,
        allowedModules: auth.allowedModules || [],
      });
      sessionStorage.setItem("EcomAdmin", JSON.stringify(sessionUser));
      window.dispatchEvent(new Event("auth:changed"));

      if (sellerPanel) {
        dispatch(
          startAuthenticatedSession({
            accessToken: auth.accessToken,
            refreshToken: auth.refreshToken,
            flowState: auth.flowState,
          }),
        );
      }
    },
    [dispatch, sellerPanel],
  );

  const handleApiResponse = useCallback(
    (res, currentFormState) => {
      if (res?.error) {
        setInlineError(currentFormState, getApiErrorMessage(res));
        setFormAnimation("error");
        setTimeout(() => setFormAnimation("slide-in"), 500);
        return false;
      }
      setFormAnimation("success-animation");
      if (
        currentFormState !== "login" &&
        currentFormState !== "resetPassword"
      ) {
        toast.success(
          res.payload?.data?.message ||
            res.payload?.message ||
            res.payload?.raw?.message ||
            "Success",
        );
      }
      setTimeout(() => {
        if (currentFormState === "login") {
          const auth = normalizeAuthPayload(res?.payload);
          if (auth.requiresOnboarding && auth.onboardingToken) {
            if (!sellerPanel) {
              clearStoredAuth();
              setInlineError(
                "login",
                "Seller onboarding belongs in the seller panel.",
              );
              return;
            }
            dispatch(
              startSellerOnboarding({
                onboardingToken: auth.onboardingToken,
                user: auth.user || null,
                flowState: auth.flowState || null,
              }),
            );
            toast.success("Continue seller onboarding.");
            // navigate("/seller/onboarding");
            setFormState("verificationComplete");

            return;
          }

          if (!auth.accessToken) {
            setInlineError("login", "Login did not return an access token.");
            return;
          }

          if (!isAllowedRoleForPanel(auth.role, panelMode)) {
            clearStoredAuth();
            setInlineError(
              "login",
              sellerPanel
                ? "Please use a seller account for this panel."
                : "Please use an admin account for this panel.",
            );
            return;
          }

          persistAuthenticatedSession(auth);
          toast.success("Login successful");
          resetForm();
          navigate("/app/home");
        } else if (currentFormState === "forgotPassword") {
          setVerificationCode(["", "", "", "", "", ""]);
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          setFormState("verificationCode");
        } else if (currentFormState === "verificationCode") {
          setFormFields((prev) => ({
            ...prev,
            forgotOtp: verificationCode.join(""),
          }));
          setResendCooldown(0);
          setFormState("resetPassword");
        } else if (currentFormState === "resetPassword") {
          toast.success("Password reset successful. Please log in.");
          resetForm();
          setFormState("login");
        }
      }, 600);

      return true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      dispatch,
      setInlineError,
      navigate,
      panelMode,
      persistAuthenticatedSession,
      resetForm,
      setFormState,
      sellerPanel,
      verificationCode,
    ],
  );

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!validateLoginFields()) {
      setFormAnimation("slide-in");
      return;
    }

    if (!requireTermsAgreement()) {
      return;
    }

    const { email, password } = formFields;
    storeOrClearCredentials(email);

    try {
      setFormAnimation("loading");
      const response = await dispatch(
        adminLogin({
          email,
          password,
        }),
      );
      handleApiResponse(response, "login");
    } catch (error) {
      setInlineError(
        "login",
        getApiErrorMessage(error, "Login failed. Please try again."),
      );
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validateLoginFields()) {
      setFormAnimation("slide-in");
      return;
    }

    if (!requireTermsAgreement()) {
      return;
    }

    try {
      setFormAnimation("loading");
      setIsLoading(true);
      const response = await dispatch(
        forgotPassword({ email: formFields.forgotEmail }),
      );
      setIsLoading(false);
      handleApiResponse(response, "forgotPassword");
    } catch (error) {
      setInlineError(
        "forgotPassword",
        getApiErrorMessage(
          error,
          "Failed to process request. Please try again.",
        ),
      );
      console.error("Forgot password error:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    if (!validateLoginFields()) {
      setFormAnimation("slide-in");
      return;
    }

    try {
      setFormAnimation("loading");
      const code = verificationCode.join("");
      const response = await dispatch(
        verifyOtp({
          email: formFields.forgotEmail,
          otp: code,
          purpose: "forgot_password",
        }),
      );

      if (response?.error) {
        setFormErrors((prev) => ({
          ...prev,
          verificationCode: response.payload || "Invalid or expired OTP.",
        }));
      }
      handleApiResponse(response, "verificationCode");
    } catch (error) {
      setInlineError(
        "verificationCode",
        getApiErrorMessage(error, "Verification failed. Please try again."),
      );
      console.error("Verification error:", error);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validateLoginFields()) {
      setFormAnimation("slide-in");
      return;
    }

    if (!requireTermsAgreement()) {
      return;
    }

    try {
      setFormAnimation("loading");
      const { forgotEmail, forgotOtp, newPassword } = formFields;
      const response = await dispatch(
        resetPassword({
          email: forgotEmail,
          otp: forgotOtp || verificationCode.join(""),
          newPassword,
          password: newPassword,
        }),
      );
      handleApiResponse(response, "resetPassword");
    } catch (error) {
      setInlineError(
        "resetPassword",
        getApiErrorMessage(error, "Password reset failed. Please try again."),
      );
      console.error("Password reset error:", error);
    }
  };

  const toggleForgotPassword = useCallback(() => {
    setFormAnimation("slide-out");
    setTimeout(() => {
      setFormState((prev) => (prev === "login" ? "forgotPassword" : "login"));
      resetForm();
    }, 300);
  }, [resetForm, setFormState]);

  const handleResendOtp = useCallback(
    async (e) => {
      e.preventDefault();
      if (resendCooldown > 0) return;

      try {
        setFormAnimation("loading");
        const isRegistrationOtp = formState === "registerVerification";
        const email = isRegistrationOtp
          ? formFields.registerEmail
          : formFields.forgotEmail;
        const purpose = isRegistrationOtp ? "registration" : "forgot_password";
        const response = await dispatch(resendOtp({ email, purpose }));
        if (!response?.error) {
          toast.success(
            response?.payload?.data?.message ||
              response?.payload?.message ||
              "OTP resent successfully",
          );
          setVerificationCode(["", "", "", "", "", ""]);
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
        } else {
          setInlineError(
            formState,
            response?.payload || "Failed to resend OTP",
          );
        }
      } catch (error) {
        setInlineError(
          formState,
          getApiErrorMessage(error, "Failed to resend code. Please try again."),
        );
        console.error("Resend OTP error:", error);
      }
    },
    [
      dispatch,
      formFields.forgotEmail,
      formFields.registerEmail,
      formState,
      resendCooldown,
      setInlineError,
    ],
  );

  const resendOtpLabel =
    resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP";

  const BootmCheckBox = () => {
    return (
      <label className="mt-[20px]  flex cursor-pointer items-center gap-[10px]">
        <Checkbox
          id="remember_me"
          name="remember_me"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="mt-[1px]"
        />

        <span className="text-sm font-inter text-[#667085]">
          I agree to all{" "}
          <span className="font-semibold text-[#031b52]">
            Terms, Privacy, and Cancellation Policies.
          </span>
        </span>
      </label>
    );
  };

  const renderForm = () => {
    // const animationClasses = getAnimationClasses();const animationClasses = getAnimationClasses();
    const authInputClassName =
      "h-[38px] border-[#ded9f0] bg-[#fbf9ff] text-[12px] focus:border-[#d7cdea] focus:ring-[#eee8f8] sm:h-[40px] sm:text-[13px]";
    const authLabelClassName = "text-[#344054]";

    switch (formState) {
      case "login":
        return (
          <FormLayout
            title={"Welcome back!"}
            subTitle={
              sellerPanel
                ? "Enter your seller email and password to continue"
                : "Enter your credentials to access your account"
            }
            onSubmit={handleLoginSubmit}
            // className={`${animationClasses} transition-all duration-300`}
            cardClassName="min-h-[286px]"
            bottomText="Don't have an account?"
            linkText="Register"
            onLinkClick={() => {
              if (sellerPanel) {
                setFormState("register");
                return;
              }
              toast.info(
                "Please contact your administrator to create an account.",
              );
            }}
            showLogo
          >
            <div className="relative z-10 flex flex-col">
              {/* EMAIL */}
              <div className={sellerPanel ? "mb-[24px]" : "mb-[18px]"}>
                <EmailInput
                  id="email"
                  name="email"
                  label="Email Address"
                  value={formFields.email}
                  placeholder="e.g. John Doe"
                  onChange={handleInputChange}
                  errorMessage={formErrors.email}
                  inputClassName={authInputClassName}
                  labelClassName={authLabelClassName}
                  autoFocus
                />
              </div>

              <div className="mb-[8px]">
                <PasswordInput
                  id="password"
                  name="password"
                  label="Password"
                  value={formFields.password}
                  placeholder="••••••••"
                  onChange={handleInputChange}
                  errorMessage={formErrors.password}
                  inputClassName={authInputClassName}
                  labelClassName={authLabelClassName}
                />
              </div>

              {loginError && (
                <div className="mb-[10px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-[15px] text-red-700 animate-fade-in">
                  {loginError}
                </div>
              )}

              <div
                className="mb-[24px] flex min-h-[13px] items-center justify-end"
                style={{ animationDelay: "0.3s" }}
              >
                <button
                  type="button"
                  onClick={toggleForgotPassword}
                  className="
            text-[12px]
            font-medium
            text-[#031b52]
            transition-all
            hover:text-[#082f91]
            hover:underline
          "
                >
                  Forgot password?
                </button>
              </div>

              <div>
                <FormSubmitButton
                  buttonLabel={
                    loading
                      ? "Signing in..."
                      : sellerPanel
                        ? "Seller Login"
                        : "Login"
                  }
                />
              </div>

              <BootmCheckBox />
            </div>
          </FormLayout>
        );

      case "forgotPassword":
        return (
          <FormLayout
            title="Password Recovery"
            subTitle="Enter your email to recover your password."
            onSubmit={handleForgotPasswordSubmit}
            bottomText="Don't have an account?"
            linkText="Register"
            onLinkClick={() => {
              if (sellerPanel) {
                setFormState("register");
                return;
              }
              toast.info(
                "Please contact your administrator to create an account.",
              );
            }}
            // className={`${animationClasses} transition-all duration-300`}
            cardClassName="min-h-[210px] py-[38px]"
          >
            <div className="relative z-10 flex flex-col gap-4">
              <div>
                <EmailInput
                  id="forgotEmail"
                  name="forgotEmail"
                  label="Email Address"
                  value={formFields.forgotEmail}
                  placeholder="Email address"
                  onChange={handleInputChange}
                  errorMessage={formErrors.forgotEmail}
                  inputClassName={authInputClassName}
                  labelClassName={authLabelClassName}
                  autoFocus
                />
              </div>

              {loginError && (
                <div className="p-2 text-[11px] leading-[15px] text-red-800 rounded-md animate-fade-in bg-red-50">
                  {loginError}
                </div>
              )}

              <div className="pt-4">
                <FormSubmitButton
                  buttonLabel={
                    loading ? "Sending Reset Link..." : "Send Reset Link"
                  }
                />
                <BootmCheckBox />
              </div>
            </div>
          </FormLayout>
        );

      case "verificationCode":
        return (
          <FormLayout
            title="Verification Code"
            subTitle={`Enter the 6-digit code sent to ${formFields.forgotEmail}`}
            onSubmit={handleVerificationSubmit}
            // className={`${animationClasses} transition-all duration-300`}
          >
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex space-x-2 ">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={codeInputRefs[index]}
                    type="text"
                    maxLength={1}
                    className="h-12 w-12 rounded-md border border-transparent bg-white text-center text-lg outline-none transition-all duration-300 focus:border-[#d8d4cf] focus:ring-2 focus:ring-[#e8e3dd] animate-pop-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    value={verificationCode[index]}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    onPaste={index === 0 ? handleCodePaste : undefined}
                  />
                ))}
              </div>

              {formErrors.verificationCode && (
                <div className="p-2 text-center text-[11px] leading-[15px] text-red-800 rounded-md animate-fade-in bg-red-50">
                  {formErrors.verificationCode}
                </div>
              )}

              <div
                className="mt-6 animate-fade-in"
                style={{ animationDelay: "0.7s" }}
              >
                <FormSubmitButton
                  buttonLabel={loading ? "Verifying..." : "Verify Code"}
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
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                  >
                    {resendOtpLabel}
                  </button>
                </p>
                <button
                  type="button"
                  className="shrink-0 whitespace-nowrap text-[#031b52] transition-colors hover:text-[#082f91] hover:underline"
                  onClick={toggleForgotPassword}
                >
                  Back to Login
                </button>
              </div>
            </div>
          </FormLayout>
        );

      case "resetPassword":
        return (
          <FormLayout
            title="Reset Password"
            subTitle="Create a new password to secure your account"
            onSubmit={handleResetPasswordSubmit}
            bottomText="Don't have an account?"
            linkText="Register"
            onLinkClick={() => {
              if (sellerPanel) {
                setFormState("register");
                return;
              }
              toast.info(
                "Please contact your administrator to create an account.",
              );
            }}
            // className={`${animationClasses} transition-all duration-300`}
          >
            <div className="relative z-10 flex flex-col gap-4">
              <div>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  label="New Password"
                  value={formFields.newPassword}
                  placeholder="New password"
                  onChange={handleInputChange}
                  errorMessage={formErrors.newPassword}
                  inputClassName={authInputClassName}
                  labelClassName={authLabelClassName}
                  autoFocus
                />
              </div>

              <div>
                <PasswordInput
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  label="Confirm Password"
                  value={formFields.confirmNewPassword}
                  placeholder="Confirm new password"
                  onChange={handleInputChange}
                  errorMessage={formErrors.confirmNewPassword}
                  inputClassName={authInputClassName}
                  labelClassName={authLabelClassName}
                />
              </div>

              {loginError && (
                <div className="p-2 text-[11px] leading-[15px] text-red-800 rounded-md animate-fade-in bg-red-50">
                  {loginError}
                </div>
              )}

              <div
                className="pt-4 animate-fade-in"
                style={{ animationDelay: "0.3s" }}
              >
                <FormSubmitButton
                  buttonLabel={loading ? "Resetting..." : "Reset Password"}
                />

                <BootmCheckBox />
              </div>
            </div>
          </FormLayout>
        );
      case "register":
        return (
          <div className="w-full">
            <div className="flex justify-center ">
              <AuthProgressSteps activeStep={0} />
            </div>
            <div className="mb-10 text-center">
              <h2 className="font-inter text-3xl font-extrabold  text-blue ">
                Create Your Vendor Account
              </h2>
              <p className="mt-3 font-inter text-lg  text-darkInk">
                Set up your secure profile and start selling on Sam Global.
              </p>
            </div>

            <form
              onSubmit={handleRegisterSubmit}
              className="mx-auto min-h-[440px] w-full rounded-[8px] bg-white/25 shadow-[0_0_15px_rgba(0,0,0,0.15)]  px-5 py-10  sm:px-10 md:min-h-[480px] md:px-[64px] md:py-[70px] xl:min-h-[400px]"
            >
              <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
                <EmailInput
                  id="fullName"
                  name="fullName"
                  label="Full Name"
                  value={formFields.fullName}
                  placeholder="e.g. John"
                  onChange={handleInputChange}
                  errorMessage={formErrors.fullName}
                  inputClassName={authInputClassName}
                  labelClassName={authLabelClassName}
                />
                <EmailInput
                  id="lastName"
                  name="lastName"
                  label="Last Name"
                  value={formFields.lastName}
                  placeholder="e.g. Doe"
                  onChange={handleInputChange}
                  errorMessage={formErrors.lastName}
                  inputClassName={authInputClassName}
                  labelClassName={authLabelClassName}
                />

                <EmailInput
                  id="registerEmail"
                  name="registerEmail"
                  label="Email Address"
                  value={formFields.registerEmail}
                  placeholder="john@example.com"
                  onChange={handleInputChange}
                  errorMessage={formErrors.registerEmail}
                  inputClassName={authInputClassName}
                  labelClassName={authLabelClassName}
                />

                <EmailInput
                  id="phone"
                  name="phone"
                  type="tel"
                  onlyNumber={true}
                  maxLength={10}
                  inputMode="numeric"
                  label="Phone Number"
                  value={formFields.phone}
                  placeholder="Enter 10 digit number"
                  onChange={handleInputChange}
                  errorMessage={formErrors.phone}
                  inputClassName={authInputClassName}
                  labelClassName={authLabelClassName}
                />

                <PasswordInput
                  id="registerPassword"
                  name="registerPassword"
                  label="Password"
                  value={formFields.registerPassword}
                  placeholder="••••••••"
                  onChange={handleInputChange}
                  errorMessage={formErrors.registerPassword}
                  inputClassName={authInputClassName}
                  labelClassName={authLabelClassName}
                />

                <PasswordInput
                  id="confirmRegisterPassword"
                  name="confirmRegisterPassword"
                  label="Confirm Password"
                  value={formFields.confirmRegisterPassword}
                  placeholder="••••••••"
                  onChange={handleInputChange}
                  errorMessage={formErrors.confirmRegisterPassword}
                  inputClassName={authInputClassName}
                  labelClassName={authLabelClassName}
                />
              </div>

              <div className="my-8">
                <BootmCheckBox />
              </div>

              {loginError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] leading-[15px] text-red-700 md:col-span-2">
                  {loginError}
                </div>
              )}

              <div className=" grid grid-cols-1 gap-3 md:grid-cols-[150px_1fr]">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setFormState("login");
                  }}
                  className="px-6 py-2 rounded-lg border border-blue text-blue font-semibold"
                >
                  Back
                </button>
                <FormSubmitButton
                  buttonLabel={
                    loading
                      ? "Sending Verification..."
                      : "Continue to Verification"
                  }
                  className="h-[40px] rounded-[7px] font-inter text-[12px]"
                />
              </div>
            </form>
          </div>
        );

      case "registerVerification":
        return (
          <FormLayout
            title="Verify Your Account"
            subTitle="We’ve sent a verification code to your registered mobile number. Please enter the code below to confirm your identity and continue the verification process."
            subTitleClassName=" text-center font-inter !text-[19px] font-normal !leading-[35px] tracking-[0%] text-[#484555]"
            onSubmit={handleRegisterOtpSubmit}
            showLogo={false}
            shellClassName="items-start pt-10 pb-8 sm:pt-[58px] lg:pt-[54px]"
            className="!max-w-[812px]"
            titleClassName="!text-[29px] sm:!text-[29px] font-medium"
            // subTitleClassName="max-w-[720px] text-[16px] leading-[28px] text-[#484557] sm:text-[20px] sm:leading-[34px]"
            cardClassName="mt-[24px] min-h-[380px] !max-w-[812px] justify-center rounded-[10px] px-5 py-9 sm:min-h-[454px] sm:px-10 sm:py-10"
            topContent={<AuthProgressSteps activeStep={1} />}
          >
            <OtpVerificationCard
              codeInputRefs={codeInputRefs}
              verificationCode={verificationCode}
              onCodeChange={handleCodeChange}
              onCodeKeyDown={handleCodeKeyDown}
              onCodePaste={handleCodePaste}
              errorMessage={formErrors.verificationCode}
              loading={loading}
              resendCooldown={resendCooldown}
              resendOtpLabel={resendOtpLabel}
              onResendOtp={handleResendOtp}
            />
          </FormLayout>
        );

      case "verificationComplete":
        return (
          <SellerStatusScreen
            variant="verificationComplete"
            onButtonClick={() => {
              navigate("/seller/onboarding");
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative overflow-hidden">
      <Loader loading={loading || isLoading || false} />
      {renderForm()}
    </div>
  );
};

export default Login;
