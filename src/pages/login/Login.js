import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { GoArrowRight } from "react-icons/go";
import { GoDotFill } from "react-icons/go";
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
import { showError } from "../../Redux/alertSlice";
import FormLayout from "../../components/FormLayout/FormLayout";
import Checkbox from "../../components/Atoms/Checkbox/Checkbox";
import EmailInput from "../../components/Atoms/EmailInput";
import PasswordInput from "../../components/Atoms/password/PasswordInput";
import Loader from "../../components/Loader/Loader";
import { CiUser, CiLock } from "react-icons/ci";
import { MdEmail } from "react-icons/md";
import FormSubmitButton from "../../components/Atoms/FormButton/FormSubmitButton";
import { toast } from "sonner";
import { isSellerPanel, PANEL_MODES } from "../../_helpers/panelConfig";
import {
  clearStoredAuth,
  getLegacyRoleId,
  isAllowedRoleForPanel,
  setStoredAuth,
} from "../../_helpers/authStorage";
import { useAuthLayout } from "../../context/AuthLayoutContext";
import IconButton from "../../components/Atoms/buttons/iconButton";

const RESEND_COOLDOWN_SECONDS = 30;

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

    firstName: "",
    lastName: "",
    phone: "",
    registerEmail: "",
    registerPassword: "",
    referralCode: "",
  });
  const [formErrors, setFormErrors] = useState({
    firstName: null,
    lastName: null,
    phone: null,
    registerEmail: null,
    registerPassword: null,
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
        setRememberMe(true);
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
      } else if (formFields.password.length < 6) {
        errors.password = "Password must be at least 6 characters long.";
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
      } else if (!passwordRegex.test(formFields.newPassword)) {
        errors.newPassword =
          "Password must be at least 8 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., @$!%*?&).";
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
      if (!formFields.firstName.trim()) {
        errors.firstName = "First name is required";
        isValid = false;
      } else if (formFields.firstName.trim().length < 2) {
        errors.firstName = "First name must be at least 2 characters";
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
      } else if (
        formFields.phone.trim().length < 10 ||
        formFields.phone.trim().length > 15
      ) {
        errors.phone = "Phone must be between 10 and 15 digits";
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
      }
    }

    setFormErrors(errors);
    return isValid;
  }, [formState, formFields, sellerPanel, verificationCode]);
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!sellerPanel) {
      toast.error(
        "Admin accounts are created by a super admin. Please use admin login.",
      );
      return;
    }

    if (!validateLoginFields()) {
      setFormAnimation("slide-in");
      return;
    }

    try {
      const response = await dispatch(
        registerWithOtp({
          email: formFields.registerEmail,
          phone: formFields.phone,
          password: formFields.registerPassword,
          role: "seller",
          profile: {
            firstName: formFields.firstName,
            lastName: formFields.lastName,
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
        toast.error(response.payload);
      }
    } catch (error) {
      console.log(error);
      // toast.error("Registration failed");
    }
  };
  const handleRegisterOtpSubmit = async (e) => {
    e.preventDefault();

    const code = verificationCode.join("");

    if (code.length !== 6) {
      toast.error("Enter complete OTP");
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
        toast.error(message);
      }
    } catch (error) {
      toast.error("Verification failed");
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
      firstName: "",
      lastName: "",
      phone: "",
      registerEmail: "",
      registerPassword: "",
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
      firstName: null,
      lastName: null,
      phone: null,
      registerEmail: null,
      registerPassword: null,
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
        toast.error(res.payload || res?.error?.message);
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
              toast.error("Seller onboarding belongs in the seller panel.");
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
            toast.error("Login did not return an access token.");
            return;
          }

          if (!isAllowedRoleForPanel(auth.role, panelMode)) {
            clearStoredAuth();
            toast.error(
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
      toast.error("Login failed. Please try again.");
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validateLoginFields()) {
      setFormAnimation("slide-in");
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
      dispatch(showError("Failed to process request. Please try again."));
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
      dispatch(showError("Verification failed. Please try again."));
      console.error("Verification error:", error);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validateLoginFields()) {
      setFormAnimation("slide-in");
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
      dispatch(showError("Password reset failed. Please try again."));
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
          toast.error(response?.payload || "Failed to resend OTP");
        }
      } catch (error) {
        dispatch(showError("Failed to resend code. Please try again."));
        console.error("Resend OTP error:", error);
      }
    },
    [
      dispatch,
      formFields.forgotEmail,
      formFields.registerEmail,
      formState,
      resendCooldown,
    ],
  );

  const resendOtpLabel =
    resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP";

  // const getAnimationClasses = useCallback(() => {
  //   switch (formAnimation) {
  //     case "slide-in":
  //       return "animate-slide-in opacity-100 transform translate-x-0";
  //     case "slide-out":
  //       return "animate-slide-out opacity-0 transform -translate-x-full";
  //     case "loading":
  //       return "animate-pulse";
  //     case "success-animation":
  //       return "animate-success-bounce";
  //     case "error":
  //       return "animate-error";
  //     default:
  //       return "";
  //   }
  // }, [formAnimation]);

  const renderForm = () => {
    // const animationClasses = getAnimationClasses();

    switch (formState) {
      case "login":
        return (
          <FormLayout
            title={sellerPanel ? "Seller Login" : "Welcome back!"}
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
                  value={formFields.email}
                  placeholder="Email address"
                  icon={MdEmail}
                  onChange={handleInputChange}
                  errorMessage={formErrors.email}
                  inputClassName="h-[38px] border-[#ded9f0] bg-[#fbf9ff] focus:border-[#d7cdea] focus:ring-[#eee8f8]"
                  autoFocus
                />
              </div>

              <div className="mb-[8px]">
                <PasswordInput
                  id="password"
                  name="password"
                  value={formFields.password}
                  placeholder="Password*"
                  icon={CiLock}
                  onChange={handleInputChange}
                  errorMessage={formErrors.password}
                  inputClassName="h-[38px] border-[#ded9f0] bg-[#fbf9ff] focus:border-[#d7cdea] focus:ring-[#eee8f8]"
                />
              </div>

              {loginError && (
                <div className="mb-[10px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 animate-fade-in">
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
            text-[11px]
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

              <label className="mt-[20px] flex cursor-pointer items-start gap-[10px]">
                <Checkbox
                  id="remember_me"
                  name="remember_me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mt-[1px] h-[14px] w-[14px] shrink-0 rounded border-gray-300"
                />

                <span className="text-[8px] leading-[14px] text-[#667085]">
                  I agree to all{" "}
                  <span className="font-semibold text-[#031b52]">
                    Terms, Privacy, and Cancellation Policies.
                  </span>
                </span>
              </label>
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
                  value={formFields.forgotEmail}
                  placeholder="Email address"
                  icon={MdEmail}
                  onChange={handleInputChange}
                  errorMessage={formErrors.forgotEmail}
                  inputClassName="h-[38px] border-[#ded9f0] bg-[#fbf9ff] focus:border-[#d7cdea] focus:ring-[#eee8f8]"
                  autoFocus
                />
              </div>

              {loginError && (
                <div className="p-2 text-sm text-red-800 rounded-md animate-fade-in bg-red-50">
                  {loginError}
                </div>
              )}

              <div
                className="pt-4 animate-fade-in"
                style={{ animationDelay: "0.2s" }}
              >
                <FormSubmitButton
                  buttonLabel={loading ? "Sending OTP..." : "Send OTP"}
                />
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
                <div className="p-2 text-sm text-center text-red-800 rounded-md animate-fade-in bg-red-50">
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
                className="flex justify-between mt-4 text-sm animate-fade-in"
                style={{ animationDelay: "0.8s" }}
              >
                <p className="text-gray-500">
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
                <p
                  className="cursor-pointer text-center text-[#031b52] transition-colors hover:text-[#082f91] hover:underline"
                  onClick={toggleForgotPassword}
                >
                  Back to Login
                </p>
              </div>
            </div>
          </FormLayout>
        );

      case "resetPassword":
        return (
          <FormLayout
            title="Reset Password"
            subTitle="Please create a new password for your account"
            onSubmit={handleResetPasswordSubmit}
            // className={`${animationClasses} transition-all duration-300`}
          >
            <div className="relative z-10 flex flex-col gap-4">
              <div>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  value={formFields.newPassword}
                  placeholder="New password"
                  icon={CiLock}
                  onChange={handleInputChange}
                  errorMessage={formErrors.newPassword}
                  autoFocus
                />
              </div>

              <div>
                <PasswordInput
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  value={formFields.confirmNewPassword}
                  placeholder="Confirm new password"
                  icon={CiLock}
                  onChange={handleInputChange}
                  errorMessage={formErrors.confirmNewPassword}
                />
              </div>

              {loginError && (
                <div className="p-2 text-sm text-red-800 rounded-md animate-fade-in bg-red-50">
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
              </div>

              <p
                className="mt-3 cursor-pointer text-center text-xs font-medium text-[#031b52] transition-all duration-300 hover:text-[#082f91] hover:underline animate-fade-in"
                onClick={toggleForgotPassword}
                style={{ animationDelay: "0.4s" }}
              >
                Back to Login
              </p>
            </div>
          </FormLayout>
        );
      case "register":
        return (
          <FormLayout
            title="Registration Form"
            subTitle="Please fill your details to register"
            onSubmit={handleRegisterSubmit}
            bottomText="Already have an account?"
            linkText="Back to Login"
            onLinkClick={() => {
              resetForm();
              setFormState("login");
            }}
            //className={`${animationClasses} transition-all duration-300`}
            showLogo
          >
            <div className="relative z-10 flex flex-col gap-3">
              <EmailInput
                id="firstName"
                name="firstName"
                // label="First Name"
                value={formFields.firstName}
                placeholder="Enter first name"
                icon={CiUser}
                onChange={handleInputChange}
                errorMessage={formErrors.firstName}
              />

              <EmailInput
                id="lastName"
                name="lastName"
                // label="Last Name"
                value={formFields.lastName}
                placeholder="Enter last name"
                icon={CiUser}
                onChange={handleInputChange}
                errorMessage={formErrors.lastName}
              />

              <EmailInput
                id="phone"
                name="phone"
                // label="Phone Number"
                value={formFields.phone}
                placeholder="Enter phone number"
                icon={CiUser}
                onChange={handleInputChange}
                errorMessage={formErrors.phone}
              />

              <EmailInput
                id="registerEmail"
                name="registerEmail"
                // label="Email Address"
                value={formFields.registerEmail}
                placeholder="Enter email"
                icon={MdEmail}
                onChange={handleInputChange}
                errorMessage={formErrors.registerEmail}
              />

              <PasswordInput
                id="registerPassword"
                name="registerPassword"
                // label="Password"
                value={formFields.registerPassword}
                placeholder="Enter password"
                icon={CiLock}
                onChange={handleInputChange}
                errorMessage={formErrors.registerPassword}
              />

              <EmailInput
                id="referralCode"
                name="referralCode"
                // label="Referral Code (Optional)"
                value={formFields.referralCode}
                placeholder="Enter referral code"
                icon={CiUser}
                onChange={handleInputChange}
              />

              <div className="mt-4">
                <FormSubmitButton
                  buttonLabel={loading ? "Registering..." : "Register"}
                />
              </div>

              <p
                className="mt-4 cursor-pointer text-center text-xs font-medium text-[#031b52] transition-all duration-300 hover:text-[#082f91] hover:underline animate-fade-in"
                onClick={() => {
                  resetForm();
                  setFormState("login");
                }}
              >
                Already have an account? Back to Login
              </p>
            </div>
          </FormLayout>
        );

      case "registerVerification":
        return (
          <FormLayout
            title="Verify Your Account"
            subTitle="We’ve sent a verification code to your registered mobile number. Please enter the code below to confirm your identity and continue the verification process."
            onSubmit={handleRegisterOtpSubmit}
            // className={`${animationClasses} transition-all duration-300`}
          >
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex justify-center space-x-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={codeInputRefs[index]}
                    type="text"
                    maxLength={1}
                    className="h-12 w-12 rounded-md border border-transparent bg-white text-center text-lg outline-none transition-all duration-300 focus:border-[#d8d4cf] focus:ring-2 focus:ring-[#e8e3dd]"
                    value={verificationCode[index]}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    onPaste={index === 0 ? handleCodePaste : undefined}
                  />
                ))}
              </div>
            </div>
            <div className="relative z-10 mx-auto flex w-full max-w-full flex-col items-center justify-center overflow-hidden px-2 py-4 sm:px-6 md:px-8">
              <p className="text-center text-[11px] sm:text-[14px] md:text-[15px] font-medium text-[#222]">
                Phone Number :{" "}
                <span className="font-semibold text-[#082f91]">
                  **** **** 1234
                </span>
              </p>

              <div className="mt-4 grid w-full max-w-[270px] grid-cols-6 gap-1.5 min-[360px]:max-w-[320px] min-[360px]:gap-2 sm:max-w-[420px] sm:gap-3 md:max-w-[520px]">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={codeInputRefs[index]}
                    type="text"
                    maxLength={1}
                    className="aspect-square w-full rounded-[5px] border border-[#eeeeee] bg-white text-center text-[13px] sm:text-[17px] md:text-[20px] text-[#9a9a9a] shadow-[0_4px_8px_rgba(0,0,0,0.12)] outline-none transition-all duration-300 focus:border-[#082f91] focus:ring-2 focus:ring-[#dbe3ff]"
                    value={verificationCode[index]}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    onPaste={index === 0 ? handleCodePaste : undefined}
                  />
                ))}
              </div>

              {formErrors.verificationCode && (
                <div className="mt-4 w-full max-w-[270px] rounded-md bg-red-50 px-3 py-2 text-center text-xs text-red-800 sm:max-w-[420px]">
                  {formErrors.verificationCode}
                </div>
              )}

              <div className="mt-6 w-full max-w-[270px] min-[360px]:max-w-[320px] sm:max-w-[420px] md:max-w-[520px]">
                <FormSubmitButton
                  buttonLabel={loading ? "Verifying..." : "Verify & Continue"}
                  className="h-[40px] w-full rounded-[8px] text-[12px] sm:h-[46px] sm:text-[14px] md:h-[52px] md:text-[15px]"
                />
              </div>

              <p className="mt-3 text-center text-[11px] sm:text-[13px] md:text-[14px] font-medium text-[#555]">
                Didn’t receive code?{" "}
                <button
                  type="button"
                  className="font-semibold text-[#082f91] hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:no-underline"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                >
                  {resendOtpLabel}
                </button>
              </p>
            </div>
          </FormLayout>
        );

      case "verificationComplete":
        return (
          <div className="  h-full w-full rounded-lg bg-white/40 shadow-[0_0_15px_rgba(0,0,0,0.15)]">
            <div className="flex flex-col items-center justify-center  p-8">
              <img
                src="/Img/auth-img/completed.png"
                alt="Verification Complete"
                className="w-[11rem] lg:w-[10rem] h-[8rem] object-cover"
              />
              <div className="mb-6 flex justify-center items-center mx-auto w-fit  ">
                <IconButton label="Account Verified" icon={<GoDotFill />} />
              </div>

              <div>
                <h1 className="font-extrabold text-blue text-2xl  xl:text-4xl font-inter text-center xl:leading-[50px]">
                  Verification Complete!
                  <br />
                  <span className="text-ink font-semibold">
                    You're One Step Closer to Selling
                  </span>
                </h1>
                <h5 className="font-inter text-xl text-darkInk text-center max-w-2xl mt-8">
                  Complete your KYC verification to activate your seller account
                  and start listing products on the marketplace.
                </h5>
                <div className="my-6 flex justify-center items-center mx-auto w-fit  ">
                  <IconButton
                    label="Next Step: KYC Verification"
                    className="rounded-lg bg-golden/30"
                    icon={<GoArrowRight />}
                  />
                </div>
                <FormSubmitButton
                  onClick={() => {
                    navigate("/seller/onboarding");
                  }}
                  buttonLabel="Continue to KYC Verification"
                  className="mt-8"
                />
              </div>
            </div>
          </div>
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
