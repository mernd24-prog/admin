import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import {
  adminLogin,
  forgotPassword,
  normalizeAuthPayload,
  verifyOtp,
  verifySellerLoginOtp,
  resetPassword,
  registerWithOtp,
  verifyRegistration,
  resendOtp,
  sendOtp,
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
  const [formAnimation, setFormAnimation] = useState("slide-in");
  const [isLoading, setIsLoading] = useState(false);
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

      if (!sellerPanel && !formFields.password.trim()) {
        errors.password = "Password is required.";
        isValid = false;
      } else if (!sellerPanel && formFields.password.length < 6) {
        errors.password = "Password must be at least 6 characters long.";
        isValid = false;
      }
    } else if (formState === "sellerLoginVerification") {
      const code = verificationCode.join("");
      if (code.length !== 6) {
        errors.verificationCode =
          "Please enter the complete verification code.";
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
      setFormAnimation("shake");
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
        toast.error(response.payload);
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
      if (currentFormState !== "login") {
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
          setFormState("verificationCode");
        } else if (currentFormState === "verificationCode") {
          setFormFields((prev) => ({
            ...prev,
            forgotOtp: verificationCode.join(""),
          }));
          setFormState("resetPassword");
        } else if (currentFormState === "resetPassword") {
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
      setFormAnimation("shake");
      setTimeout(() => setFormAnimation("slide-in"), 500);
      return;
    }

    const { email, password } = formFields;
    storeOrClearCredentials(email);

    try {
      setFormAnimation("loading");
      if (sellerPanel) {
        const response = await dispatch(sendOtp({ email, purpose: "login" }));
        if (response?.error) {
          toast.error(response.payload || "Failed to send login OTP");
          setFormAnimation("error");
          setTimeout(() => setFormAnimation("slide-in"), 500);
          return;
        }
        toast.success(
          response?.payload?.data?.message ||
            response?.payload?.message ||
            "OTP sent successfully",
        );
        setVerificationCode(["", "", "", "", "", ""]);
        setFormState("sellerLoginVerification");
        return;
      }

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

  const handleSellerLoginOtpSubmit = async (e) => {
    e.preventDefault();
    if (!validateLoginFields()) {
      setFormAnimation("shake");
      setTimeout(() => setFormAnimation("slide-in"), 500);
      return;
    }

    try {
      setFormAnimation("loading");
      const response = await dispatch(
        verifySellerLoginOtp({
          email: formFields.email,
          otp: verificationCode.join(""),
        }),
      );
      handleApiResponse(response, "login");
    } catch (error) {
      toast.error("OTP login failed. Please try again.");
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validateLoginFields()) {
      setFormAnimation("shake");
      setTimeout(() => setFormAnimation("slide-in"), 500);
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
      setFormAnimation("shake");
      setTimeout(() => setFormAnimation("slide-in"), 500);
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

      handleApiResponse(response, "verificationCode");
    } catch (error) {
      dispatch(showError("Verification failed. Please try again."));
      console.error("Verification error:", error);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validateLoginFields()) {
      setFormAnimation("shake");
      setTimeout(() => setFormAnimation("slide-in"), 500);
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
      try {
        setFormAnimation("loading");
        const isSellerLoginOtp = formState === "sellerLoginVerification";
        const isRegistrationOtp = formState === "registerVerification";
        const email = isRegistrationOtp
          ? formFields.registerEmail
          : isSellerLoginOtp
            ? formFields.email
            : formFields.forgotEmail;
        const purpose = isRegistrationOtp
          ? "registration"
          : isSellerLoginOtp
            ? "login"
            : "forgot_password";
        const response = await dispatch(resendOtp({ email, purpose }));
        if (!response?.error) {
          toast.success(
            response?.payload?.data?.message ||
              response?.payload?.message ||
              "OTP resent successfully",
          );
          setVerificationCode(["", "", "", "", "", ""]);
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
      formFields.email,
      formFields.forgotEmail,
      formFields.registerEmail,
      formState,
    ],
  );

  const getAnimationClasses = useCallback(() => {
    switch (formAnimation) {
      case "slide-in":
        return "animate-slide-in opacity-100 transform translate-x-0";
      case "slide-out":
        return "animate-slide-out opacity-0 transform -translate-x-full";
      case "shake":
        return "animate-shake";
      case "loading":
        return "animate-pulse";
      case "success-animation":
        return "animate-success-bounce";
      case "error":
        return "animate-error";
      default:
        return "";
    }
  }, [formAnimation]);

  const renderForm = () => {
    const animationClasses = getAnimationClasses();

    switch (formState) {
      case "login":
        return (
          <FormLayout
            title={sellerPanel ? "Seller Login" : "Welcome back!"}
            subTitle={
              sellerPanel
                ? "Enter your seller email to receive a login OTP"
                : "Enter your credentials to access your account"
            }
            onSubmit={handleLoginSubmit}
            className={`${animationClasses} transition-all duration-300`}
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
                  autoFocus
                />
              </div>

              {/* PASSWORD */}
              {!sellerPanel && (
                <div className="mb-[8px]">
                  <PasswordInput
                    id="password"
                    name="password"
                    value={formFields.password}
                    placeholder="Password*"
                    icon={CiLock}
                    onChange={handleInputChange}
                    errorMessage={formErrors.password}
                  />
                </div>
              )}

              {/* ERROR */}
              {loginError && (
                <div className="mb-[10px] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 animate-fade-in">
                  {loginError}
                </div>
              )}

              {/* FORGOT */}
              <div
                className="mb-[24px] flex min-h-[13px] items-center justify-end"
                style={{ animationDelay: "0.3s" }}
              >
                {!sellerPanel && (
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
                )}
              </div>

              {/* BUTTON */}
              <div>
                <FormSubmitButton
                  buttonLabel={
                    loading
                      ? sellerPanel
                        ? "Sending OTP..."
                        : "Signing in..."
                      : sellerPanel
                        ? "Send Login OTP"
                        : "Login"
                  }
                />
              </div>

              {/* AGREEMENT */}
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

              {/* FOOTER */}
              {sellerPanel && (
                <div
                  className="pt-2 text-center animate-fade-in"
                  style={{ animationDelay: "0.5s" }}
                >
                  <button
                    type="button"
                    onClick={() => setFormState("register")}
                    className="
            text-xs
            font-medium
            text-[#c89a3c]
            hover:underline
            transition-all
          "
                  >
                    New seller? Register with OTP
                  </button>
                </div>
              )}
            </div>
          </FormLayout>
        );

      case "sellerLoginVerification":
        return (
          <FormLayout
            title="Seller Login OTP"
            subTitle={`Enter the 6-digit OTP sent to ${formFields.email}`}
            onSubmit={handleSellerLoginOtpSubmit}
            className={`${animationClasses} transition-all duration-300`}
          >
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex justify-center space-x-2 animate-fade-in">
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
                  buttonLabel={loading ? "Verifying..." : "Verify & Login"}
                />
              </div>

              <div
                className="flex justify-between mt-4 text-sm animate-fade-in"
                style={{ animationDelay: "0.8s" }}
              >
                <button
                  type="button"
                  className="font-medium text-[#031b52] transition-colors hover:text-[#082f91] hover:underline"
                  onClick={handleResendOtp}
                >
                  Resend OTP
                </button>
                <button
                  type="button"
                  className="text-[#031b52] transition-colors hover:text-[#082f91] hover:underline"
                  onClick={() => {
                    setVerificationCode(["", "", "", "", "", ""]);
                    setFormState("login");
                  }}
                >
                  Back to Login
                </button>
              </div>
            </div>
          </FormLayout>
        );

      case "forgotPassword":
        return (
          <FormLayout
            title="Password Recovery"
            subTitle="Enter your email to recover your password."
            onSubmit={handleForgotPasswordSubmit}
            bottomText="Remember your password?"
            linkText="Back to Login"
            onLinkClick={toggleForgotPassword}
            className={`${animationClasses} transition-all duration-300`}
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
                  buttonLabel={loading ? "Submitting..." : "Send Reset Link"}
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
            className={`${animationClasses} transition-all duration-300`}
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
                    className="font-medium text-[#031b52] transition-colors hover:text-[#082f91] hover:underline"
                    onClick={handleResendOtp}
                  >
                    Resend
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
            className={`${animationClasses} transition-all duration-300`}
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
            className={`${animationClasses} transition-all duration-300`}
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
            title="Verify Registration"
            subTitle={`Enter the 6-digit OTP sent to ${formFields.registerEmail}`}
            onSubmit={handleRegisterOtpSubmit}
            className={`${animationClasses} transition-all duration-300`}
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

              {formErrors.verificationCode && (
                <div className="p-2 text-sm text-center text-red-800 rounded-md bg-red-50">
                  {formErrors.verificationCode}
                </div>
              )}

              <div className="mt-4">
                <FormSubmitButton
                  buttonLabel={
                    loading ? "Verifying..." : "Verify & Complete Registration"
                  }
                />
              </div>

              <p
                className="cursor-pointer text-center text-xs font-medium text-[#031b52] hover:text-[#082f91] hover:underline"
                onClick={() => {
                  resetForm();
                  setFormState("login");
                }}
              >
                Back to Login
              </p>
            </div>
          </FormLayout>
        );

      case "verificationComplete":
        return (
          <div className="h-[45rem] w-full rounded-lg bg-white/40 shadow-[0_0_15px_rgba(0,0,0,0.15)]">
            <div className="flex flex-col items-center justify-center gap-6 p-8">
              <img
                src="/Img/auth-img/completed.png"
                alt="Verification Complete"
                className=""
              />
              <div>
                <h1 className="font-extrabold text-blue text-4xl font-inter text-center leading-[50px]">
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
                <FormSubmitButton
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

      <style jsx global>{`
        @keyframes slide-in {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slide-out {
          0% {
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            transform: translateX(20px);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-5px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(5px);
          }
        }

        @keyframes success-bounce {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-20px);
          }
          60% {
            transform: translateY(-10px);
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pop-in {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          70% {
            transform: scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes float {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
          100% {
            transform: translateY(0) rotate(0deg);
          }
        }

        .animate-slide-in {
          animation: slide-in 0.4s ease-out forwards;
        }
        .animate-slide-out {
          animation: slide-out 0.4s ease-in forwards;
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        .animate-success-bounce {
          animation: success-bounce 1s;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        .animate-pop-in {
          animation: pop-in 0.4s ease-out forwards;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;
