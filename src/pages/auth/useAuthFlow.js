import { createRef, useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  adminLogin,
  forgotPassword,
  normalizeAuthPayload,
  registerWithOtp,
  resendOtp,
  resetPassword,
  verifyOtp,
  verifyRegistration,
} from "../../Redux/auth-Slice";
import {
  startAuthenticatedSession,
  startSellerOnboarding,
} from "../../Redux/seller-slice";
import {
  clearStoredAuth,
  getLegacyRoleId,
  isAllowedRoleForPanel,
  setStoredAuth,
} from "../../_helpers/authStorage";
import { isSellerPanel, PANEL_MODES } from "../../_helpers/panelConfig";
import {
  AUTH_FORM_TYPES,
  useAuthLayout,
} from "../../context/AuthLayoutContext";
import { AUTH_ROUTES } from "./authRoutes";

const RESEND_COOLDOWN_SECONDS = 30;
const AUTH_FLOW_DRAFT_KEY = "authFlowDraft";
const EMPTY_OTP = ["", "", "", "", "", ""];
const REGISTER_NAME_MAX_LENGTH = 20;
const REGISTER_NAME_REGEX = /^[A-Za-z]+$/;
const STANDARD_PASSWORD_LENGTH = 16;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_REGEX = /^[^\s@]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
const VALID_EMAIL_TLDS = new Set([
  "com",
  "in",
  "org",
  "net",
  "edu",
  "gov",
  "co",
  "io",
  "ai",
  "biz",
  "info",
]);

const normalizeEmail = (value) =>
  String(value || "").trim().toLowerCase();

const getEmailValidationError = (value) => {
  const email = String(value || "").trim();
  if (!email) return "Email is required.";
  if (email.length > EMAIL_MAX_LENGTH) {
    return `Email cannot exceed ${EMAIL_MAX_LENGTH} characters.`;
  }

  const atIndex = email.lastIndexOf("@");
  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  const topLevelDomain = domain.split(".").pop().toLowerCase();
  if (
    !EMAIL_REGEX.test(email) ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    domain.includes("..") ||
    !VALID_EMAIL_TLDS.has(topLevelDomain)
  ) {
    return "Please enter a valid email address.";
  }

  return null;
};

const sanitizeRegisterName = (value = "") =>
  String(value || "").replace(/[^A-Za-z]/g, "").slice(0, REGISTER_NAME_MAX_LENGTH);

const DEFAULT_FORM_FIELDS = {
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
};

const DEFAULT_FORM_ERRORS = {
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
};

const getApiErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) =>
  error?.payload ||
  error?.error?.message ||
  error?.message ||
  (typeof error === "string" ? error : "") ||
  fallback;

const getSuccessMessage = (response, fallback = "Success") =>
  response?.payload?.data?.message ||
  response?.payload?.message ||
  response?.payload?.raw?.message ||
  fallback;

const readAuthFlowDraft = () => {
  if (typeof window === "undefined") return {};

  try {
    return JSON.parse(sessionStorage.getItem(AUTH_FLOW_DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeAuthFlowDraft = (formFields, verificationCode = EMPTY_OTP) => {
  if (typeof window === "undefined") return;

  sessionStorage.setItem(
    AUTH_FLOW_DRAFT_KEY,
    JSON.stringify({ formFields, verificationCode }),
  );
};

const clearAuthFlowDraft = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_FLOW_DRAFT_KEY);
};

export const useAuthFlow = ({
  currentFormType,
  clearAuthOnMount = false,
  hydrateDraftOnMount = true,
} = {}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { formType, setFormType } = useAuthLayout();
  const { authSlice } = useSelector((state) => state);
  const { loading } = authSlice || {};
  const sellerPanel = isSellerPanel();
  const panelMode = sellerPanel ? PANEL_MODES.SELLER : PANEL_MODES.ADMIN;
  const activeFormType = currentFormType || formType || AUTH_FORM_TYPES.LOGIN;
  const initialDraftRef = useRef(
    hydrateDraftOnMount ? readAuthFlowDraft() : {},
  );
  const [loginError, setLoginError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formFields, setFormFields] = useState(() => ({
    ...DEFAULT_FORM_FIELDS,
    ...(initialDraftRef.current?.formFields || {}),
  }));
  const [formErrors, setFormErrors] = useState(DEFAULT_FORM_ERRORS);
  const [, setFormAnimation] = useState("slide-in");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationCode, setVerificationCode] = useState(() => {
    const draftCode = initialDraftRef.current?.verificationCode;
    return Array.isArray(draftCode) && draftCode.length === 6
      ? draftCode
      : EMPTY_OTP;
  });
  const codeInputRefs = useRef(
    Array(6)
      .fill()
      .map(() => createRef()),
  ).current;

  useEffect(() => {
    if (currentFormType) {
      setFormType(currentFormType);
    }
  }, [currentFormType, setFormType]);

  useEffect(() => {
    const routeState = location.state || {};
    const nextFields = {};
    if (routeState.email) nextFields.forgotEmail = routeState.email;
    if (routeState.otp) nextFields.forgotOtp = routeState.otp;
    if (!Object.keys(nextFields).length) return;

    setFormFields((prev) => {
      const next = { ...prev, ...nextFields };
      writeAuthFlowDraft(next, verificationCode);
      return next;
    });
  }, [location.state, verificationCode]);

  useEffect(() => {
    if (!clearAuthOnMount) return;

    const logoutReason = localStorage.getItem("logoutReason");
    clearStoredAuth();
    clearAuthFlowDraft();
    setFormFields(DEFAULT_FORM_FIELDS);
    setFormErrors(DEFAULT_FORM_ERRORS);
    setVerificationCode(EMPTY_OTP);
    setTermsAccepted(false);
    setLoginError("");

    if (logoutReason) {
      try {
        const parsed = JSON.parse(logoutReason);
        toast.error(parsed?.message || "Please login again to continue.");
      } catch {
        toast.error(logoutReason);
      }
      localStorage.removeItem("logoutReason");
    }

    const savedCredentials = localStorage.getItem("EcomAdminRemember");
    if (savedCredentials) {
      try {
        const { email } = JSON.parse(savedCredentials);
        setFormFields((prev) => {
          const next = { ...prev, email };
          writeAuthFlowDraft(next, EMPTY_OTP);
          return next;
        });
      } catch (error) {
        console.error("Invalid stored credentials:", error);
      }
    }
  }, [clearAuthOnMount]);

  useEffect(() => {
    setFormAnimation("slide-out");
    const timer = setTimeout(() => {
      setFormAnimation("slide-in");
    }, 300);

    return () => clearTimeout(timer);
  }, [activeFormType]);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;

    const timer = setTimeout(() => {
      setResendCooldown((seconds) => Math.max(seconds - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const updateFormFields = useCallback(
    (patch) => {
      setFormFields((prev) => {
        const nextPatch = typeof patch === "function" ? patch(prev) : patch;
        const next = { ...prev, ...nextPatch };
        writeAuthFlowDraft(next, verificationCode);
        return next;
      });
    },
    [verificationCode],
  );

  const validateFields = useCallback(
    (targetFormType = activeFormType) => {
      let isValid = true;
      const errors = {};

      if (targetFormType === AUTH_FORM_TYPES.LOGIN) {
        const emailError = getEmailValidationError(formFields.email);
        if (emailError) {
          errors.email = emailError;
          isValid = false;
        }

        if (!formFields.password.trim()) {
          errors.password = "Password is required.";
          isValid = false;
        } else if (formFields.password.length > STANDARD_PASSWORD_LENGTH) {
          errors.password = `Password cannot exceed ${STANDARD_PASSWORD_LENGTH} characters.`;
          isValid = false;
        }
      } else if (targetFormType === AUTH_FORM_TYPES.FORGOT_PASSWORD) {
        const forgotEmailError = getEmailValidationError(
          formFields.forgotEmail,
        );
        if (forgotEmailError) {
          errors.forgotEmail = forgotEmailError;
          isValid = false;
        }
      } else if (targetFormType === AUTH_FORM_TYPES.VERIFICATION_CODE) {
        const code = verificationCode.join("");
        if (code.length !== 6) {
          errors.verificationCode =
            "Please enter the complete verification code.";
          isValid = false;
        }
      } else if (targetFormType === AUTH_FORM_TYPES.RESET_PASSWORD) {
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
      } else if (targetFormType === AUTH_FORM_TYPES.REGISTER) {
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
        } else if (formFields.firstName.trim().length > REGISTER_NAME_MAX_LENGTH) {
          errors.firstName = `First name cannot be more than ${REGISTER_NAME_MAX_LENGTH} characters`;
          isValid = false;
        } else if (!REGISTER_NAME_REGEX.test(formFields.firstName.trim())) {
          errors.firstName = "First name can contain only letters";
          isValid = false;
        }

        if (!formFields.lastName.trim()) {
          errors.lastName = "Last name is required";
          isValid = false;
        } else if (formFields.lastName.trim().length < 2) {
          errors.lastName = "Last name must be at least 2 characters";
          isValid = false;
        } else if (formFields.lastName.trim().length > REGISTER_NAME_MAX_LENGTH) {
          errors.lastName = `Last name cannot be more than ${REGISTER_NAME_MAX_LENGTH} characters`;
          isValid = false;
        } else if (!REGISTER_NAME_REGEX.test(formFields.lastName.trim())) {
          errors.lastName = "Last name can contain only letters";
          isValid = false;
        }

        if (!formFields.phone.trim()) {
          errors.phone = "Phone is required";
          isValid = false;
        } else if (!/^[6-9]\d{9}$/.test(formFields.phone.trim())) {
          errors.phone =
            "Phone number must be 10 digits and start with 6, 7, 8, or 9";
          isValid = false;
        }

        const registerEmailError = getEmailValidationError(
          formFields.registerEmail,
        );
        if (registerEmailError) {
          errors.registerEmail = registerEmailError;
          isValid = false;
        }

        if (!formFields.registerPassword.trim()) {
          errors.registerPassword = "Password is required";
          isValid = false;
        } else if (formFields.registerPassword.length < 8) {
          errors.registerPassword = "Password must be at least 8 characters";
          isValid = false;
        } else if (formFields.registerPassword.length > STANDARD_PASSWORD_LENGTH) {
          errors.registerPassword = `Password cannot exceed ${STANDARD_PASSWORD_LENGTH} characters`;
          isValid = false;
        } else if (
          !/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/.test(
            formFields.registerPassword,
          )
        ) {
          errors.registerPassword =
            "Password must contain at least one uppercase letter, one number & one special character";
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
    },
    [activeFormType, formFields, sellerPanel, verificationCode],
  );

  const setInlineError = useCallback((targetFormType, message) => {
    const safeMessage = message || "Something went wrong. Please try again.";
    if (
      targetFormType === AUTH_FORM_TYPES.VERIFICATION_CODE ||
      targetFormType === AUTH_FORM_TYPES.REGISTER_VERIFICATION
    ) {
      setFormErrors((prev) => ({ ...prev, verificationCode: safeMessage }));
      return;
    }
    setLoginError(safeMessage);
  }, []);

  const resetForm = useCallback(() => {
    setFormFields(DEFAULT_FORM_FIELDS);
    setFormErrors(DEFAULT_FORM_ERRORS);
    setVerificationCode(EMPTY_OTP);
    setResendCooldown(0);
    setTermsAccepted(false);
    setLoginError("");
    clearAuthFlowDraft();
  }, []);

  const requireTermsAgreement = useCallback(
    (targetFormType = activeFormType) => {
      if (!sellerPanel || termsAccepted) return true;
      setInlineError(
        targetFormType,
        "Please agree to the terms, privacy, and cancellation policies.",
      );
      return false;
    },
    [activeFormType, sellerPanel, setInlineError, termsAccepted],
  );

  const storeOrClearCredentials = useCallback(
    (email) => {
      if (termsAccepted && email) {
        localStorage.setItem("EcomAdminRemember", JSON.stringify({ email }));
      } else {
        localStorage.removeItem("EcomAdminRemember");
      }
    },
    [termsAccepted],
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
        sidebarModules: auth.sidebarModules || [],
        modulePermissions: auth.modulePermissions || [],
      };

      setStoredAuth({
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        user,
        role,
        allowedModules: auth.allowedModules || [],
        sidebarModules: auth.sidebarModules || [],
        modulePermissions: auth.modulePermissions || [],
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

  const handleInputChange = useCallback(
    (event) => {
      const { name, value } = event.target;
      const nextValue =
        name === "firstName" || name === "lastName"
          ? sanitizeRegisterName(value)
          : value.trim();
      updateFormFields({ [name]: nextValue });
      setFormErrors((prev) => ({ ...prev, [name]: null }));
      setLoginError("");
    },
    [updateFormFields],
  );

  const handleInputBlur = useCallback(
    (event) => {
      const { name } = event.target;
      const value = String(formFields[name] || "").trim();
      let error = null;

      if (activeFormType === AUTH_FORM_TYPES.LOGIN) {
        if (name === "email") {
          error = getEmailValidationError(value);
        } else if (name === "password") {
          error = !value
            ? "Password is required."
            : value.length > STANDARD_PASSWORD_LENGTH
              ? `Password cannot exceed ${STANDARD_PASSWORD_LENGTH} characters.`
              : null;
        }
      } else if (activeFormType === AUTH_FORM_TYPES.REGISTER) {
        if (name === "firstName") {
          error = !value
            ? "First name is required"
            : value.length < 2
              ? "First name must be at least 2 characters"
              : value.length > REGISTER_NAME_MAX_LENGTH
                ? `First name cannot be more than ${REGISTER_NAME_MAX_LENGTH} characters`
                : !REGISTER_NAME_REGEX.test(value)
                  ? "First name can contain only letters"
                  : null;
        } else if (name === "lastName") {
          error = !value
            ? "Last name is required"
            : value.length < 2
              ? "Last name must be at least 2 characters"
              : value.length > REGISTER_NAME_MAX_LENGTH
                ? `Last name cannot be more than ${REGISTER_NAME_MAX_LENGTH} characters`
                : !REGISTER_NAME_REGEX.test(value)
                  ? "Last name can contain only letters"
                  : null;
        } else if (name === "phone") {
          error = !value
            ? "Phone is required"
            : !/^[6-9]\d{9}$/.test(value)
              ? "Phone number must be 10 digits and start with 6, 7, 8, or 9"
              : null;
        } else if (name === "registerEmail") {
          error = getEmailValidationError(value);
        } else if (name === "registerPassword") {
          error = !value
            ? "Password is required"
            : value.length < 8
              ? "Password must be at least 8 characters"
              : value.length > STANDARD_PASSWORD_LENGTH
                ? `Password cannot exceed ${STANDARD_PASSWORD_LENGTH} characters`
                : !/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/.test(value)
                  ? "Password must contain at least one uppercase letter, one number & one special character"
                  : null;
        } else if (name === "confirmRegisterPassword") {
          error = !value
            ? "Please confirm your password"
            : value !== formFields.registerPassword
              ? "Passwords do not match"
              : null;
        }
      }

      setFormErrors((prev) => ({ ...prev, [name]: error }));
    },
    [activeFormType, formFields],
  );

  const handleCodeChange = useCallback(
    (index, value) => {
      if (!/^\d*$/.test(value)) return;

      setVerificationCode((prev) => {
        const next = [...prev];
        next[index] = value;
        writeAuthFlowDraft(formFields, next);
        return next;
      });
      setFormErrors((prev) => ({ ...prev, verificationCode: null }));

      if (value !== "" && index < 5 && codeInputRefs[index + 1]?.current) {
        codeInputRefs[index + 1].current.focus();
      }
    },
    [codeInputRefs, formFields],
  );

  const handleCodeKeyDown = useCallback(
    (index, event) => {
      if (
        event.key === "Backspace" &&
        verificationCode[index] === "" &&
        index > 0
      ) {
        codeInputRefs[index - 1].current.focus();
      }
    },
    [codeInputRefs, verificationCode],
  );

  const handleCodePaste = useCallback(
    (event) => {
      event.preventDefault();
      const pastedData = event.clipboardData.getData("text").trim();
      if (!/^\d+$/.test(pastedData)) return;

      const digits = pastedData.split("").slice(0, 6);
      const nextCode = [...verificationCode];

      digits.forEach((digit, index) => {
        if (index < 6) nextCode[index] = digit;
      });

      setVerificationCode(nextCode);
      writeAuthFlowDraft(formFields, nextCode);

      const nextEmptyIndex = nextCode.findIndex((value) => value === "");
      if (nextEmptyIndex !== -1 && codeInputRefs[nextEmptyIndex]?.current) {
        codeInputRefs[nextEmptyIndex].current.focus();
      } else if (digits.length < 6 && codeInputRefs[digits.length]?.current) {
        codeInputRefs[digits.length].current.focus();
      } else if (codeInputRefs[5]?.current) {
        codeInputRefs[5].current.focus();
      }
    },
    [codeInputRefs, formFields, verificationCode],
  );

const handleLoginSubmit = useCallback(
  async (event) => {
    event.preventDefault();

    if (!validateFields(AUTH_FORM_TYPES.LOGIN)) {
      setFormAnimation("slide-in");
      return;
    }

    if (!requireTermsAgreement(AUTH_FORM_TYPES.LOGIN)) {
      return;
    }

    const email = normalizeEmail(formFields.email);
    const password = formFields.password;

    if (getEmailValidationError(email)) {
      setFormErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address.",
      }));
      setLoginError("");
      setFormAnimation("error");

      setTimeout(() => {
        setFormAnimation("loading");
      }, 500);

      return;
    }

    storeOrClearCredentials(email);

    try {
      setFormAnimation("loading");

      const response = await dispatch(
        adminLogin({
          email,
          password,
        }),
      );

      if (response?.error) {
        const apiMessage = getApiErrorMessage(response);
        const normalizedApiMessage = String(apiMessage || "").toLowerCase();
        const isEmailValidationError =
          normalizedApiMessage.includes("email must be") ||
          normalizedApiMessage.includes("valid email") ||
          normalizedApiMessage.includes("invalid email");

        if (isEmailValidationError) {
          setFormErrors((prev) => ({
            ...prev,
            email: "Please enter a valid email address.",
          }));
          setLoginError("");
        } else {
          setInlineError(AUTH_FORM_TYPES.LOGIN, apiMessage);
        }

        setFormAnimation("error");

        setTimeout(() => {
          setFormAnimation("slide-in");
        }, 500);

        return;
      }

      setFormAnimation("success-animation");

      setTimeout(() => {
        const auth = normalizeAuthPayload(response?.payload);

        if (auth.requiresOnboarding && auth.onboardingToken) {
          if (!sellerPanel) {
            clearStoredAuth();

            setInlineError(
              AUTH_FORM_TYPES.LOGIN,
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
          navigate(AUTH_ROUTES.VERIFICATION_COMPLETE);
          return;
        }

        if (!auth.accessToken) {
          setInlineError(
            AUTH_FORM_TYPES.LOGIN,
            "Login did not return an access token.",
          );

          return;
        }

        if (!isAllowedRoleForPanel(auth.role, panelMode)) {
          clearStoredAuth();

          setInlineError(
            AUTH_FORM_TYPES.LOGIN,
            sellerPanel
              ? "Please use a seller account for this panel."
              : "Please use an admin account for this panel.",
          );

          return;
        }

        persistAuthenticatedSession(auth);
        toast.success("Login successful");
        resetForm();
        navigate(AUTH_ROUTES.APP_HOME);
      }, 600);
    } catch (error) {
      const apiMessage = getApiErrorMessage(
        error,
        "Login failed. Please try again.",
      );

      const friendlyMessage = apiMessage
        ?.toLowerCase()
        .includes("email must be a valid email")
        ? "Please enter a valid email address."
        : apiMessage;

      setInlineError(
        AUTH_FORM_TYPES.LOGIN,
        friendlyMessage,
      );

      setFormAnimation("error");

      setTimeout(() => {
        setFormAnimation("slide-in");
      }, 500);
    }
  },
  [
    dispatch,
    formFields.email,
    formFields.password,
    navigate,
    panelMode,
    persistAuthenticatedSession,
    requireTermsAgreement,
    resetForm,
    sellerPanel,
    setInlineError,
    storeOrClearCredentials,
    validateFields,
  ],
);

  const handleForgotPasswordSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!sellerPanel) {
        navigate(AUTH_ROUTES.LOGIN, { replace: true });
        return;
      }

      if (!validateFields(AUTH_FORM_TYPES.FORGOT_PASSWORD)) {
        setFormAnimation("slide-in");
        return;
      }

      if (!requireTermsAgreement(AUTH_FORM_TYPES.FORGOT_PASSWORD)) {
        return;
      }

      try {
        setFormAnimation("loading");
        setIsLoading(true);
        const response = await dispatch(
          forgotPassword({ email: normalizeEmail(formFields.forgotEmail) }),
        );
        setIsLoading(false);

        if (response?.error) {
          setInlineError(
            AUTH_FORM_TYPES.FORGOT_PASSWORD,
            getApiErrorMessage(
              response,
              "Failed to process request. Please try again.",
            ),
          );
          setFormAnimation("error");
          setTimeout(() => setFormAnimation("slide-in"), 500);
          return;
        }

        setFormAnimation("success-animation");
        toast.success(getSuccessMessage(response));
        setTimeout(() => {
          setVerificationCode(EMPTY_OTP);
          writeAuthFlowDraft(formFields, EMPTY_OTP);
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          navigate(AUTH_ROUTES.VERIFY_OTP, {
            state: { email: normalizeEmail(formFields.forgotEmail) },
          });
        }, 600);
      } catch (error) {
        setInlineError(
          AUTH_FORM_TYPES.FORGOT_PASSWORD,
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
    },
    [
      dispatch,
      formFields,
      navigate,
      requireTermsAgreement,
      sellerPanel,
      setInlineError,
      validateFields,
    ],
  );

  const handleVerificationSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!validateFields(AUTH_FORM_TYPES.VERIFICATION_CODE)) {
        setFormAnimation("slide-in");
        return;
      }

      try {
        setFormAnimation("loading");
        const code = verificationCode.join("");
        const response = await dispatch(
          verifyOtp({
            email: normalizeEmail(formFields.forgotEmail),
            otp: code,
            purpose: "forgot_password",
          }),
        );

        if (response?.error) {
          setFormErrors((prev) => ({
            ...prev,
            verificationCode: response.payload || "Invalid or expired OTP.",
          }));
          setInlineError(
            AUTH_FORM_TYPES.VERIFICATION_CODE,
            getApiErrorMessage(response),
          );
          setFormAnimation("error");
          setTimeout(() => setFormAnimation("slide-in"), 500);
          return;
        }

        setFormAnimation("success-animation");
        toast.success(getSuccessMessage(response));
        setTimeout(() => {
          updateFormFields({ forgotOtp: code });
          setResendCooldown(0);
          navigate(AUTH_ROUTES.RESET_PASSWORD, {
            state: {
              email: normalizeEmail(formFields.forgotEmail),
              otp: code,
            },
          });
        }, 600);
      } catch (error) {
        setInlineError(
          AUTH_FORM_TYPES.VERIFICATION_CODE,
          getApiErrorMessage(error, "Verification failed. Please try again."),
        );
        console.error("Verification error:", error);
      }
    },
    [
      dispatch,
      formFields.forgotEmail,
      navigate,
      setInlineError,
      updateFormFields,
      validateFields,
      verificationCode,
    ],
  );

  const handleResetPasswordSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!validateFields(AUTH_FORM_TYPES.RESET_PASSWORD)) {
        setFormAnimation("slide-in");
        return;
      }

      if (!requireTermsAgreement(AUTH_FORM_TYPES.RESET_PASSWORD)) {
        return;
      }

      try {
        setFormAnimation("loading");
        const { forgotEmail, forgotOtp, newPassword } = formFields;
        const response = await dispatch(
          resetPassword({
            email: normalizeEmail(forgotEmail),
            otp: forgotOtp || verificationCode.join(""),
            newPassword,
            password: newPassword,
          }),
        );

        if (response?.error) {
          setInlineError(
            AUTH_FORM_TYPES.RESET_PASSWORD,
            getApiErrorMessage(
              response,
              "Password reset failed. Please try again.",
            ),
          );
          setFormAnimation("error");
          setTimeout(() => setFormAnimation("slide-in"), 500);
          return;
        }

        setFormAnimation("success-animation");
        setTimeout(() => {
          toast.success("Password reset successful. Please log in.");
          resetForm();
          navigate(AUTH_ROUTES.LOGIN);
        }, 600);
      } catch (error) {
        setInlineError(
          AUTH_FORM_TYPES.RESET_PASSWORD,
          getApiErrorMessage(error, "Password reset failed. Please try again."),
        );
        console.error("Password reset error:", error);
      }
    },
    [
      dispatch,
      formFields,
      navigate,
      requireTermsAgreement,
      resetForm,
      setInlineError,
      validateFields,
      verificationCode,
    ],
  );

  const handleRegisterSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!sellerPanel) {
        setInlineError(
          AUTH_FORM_TYPES.REGISTER,
          "Admin accounts are created by a super admin. Please use admin login.",
        );
        return;
      }

      if (!validateFields(AUTH_FORM_TYPES.REGISTER)) {
        setFormAnimation("slide-in");
        return;
      }

      if (!requireTermsAgreement(AUTH_FORM_TYPES.REGISTER)) {
        return;
      }

      const firstName = formFields.firstName.trim();
      const lastName = formFields.lastName.trim();

      try {
        const response = await dispatch(
          registerWithOtp({
            email: normalizeEmail(formFields.registerEmail),
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
          toast.success(getSuccessMessage(response, "OTP sent successfully"));
          setVerificationCode(EMPTY_OTP);
          writeAuthFlowDraft(formFields, EMPTY_OTP);
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          navigate(AUTH_ROUTES.REGISTER_VERIFY_OTP);
        } else {
          const apiMessage = getApiErrorMessage(
            response,
            "Registration failed. Please check the form and try again.",
          );
          if (/(?:body\.)?email.*valid email|invalid email/i.test(apiMessage)) {
            setFormErrors((prev) => ({
              ...prev,
              registerEmail: "Please enter a valid email address.",
            }));
            setLoginError("");
          } else {
            setInlineError(AUTH_FORM_TYPES.REGISTER, apiMessage);
          }
        }
      } catch (error) {
        const apiMessage = getApiErrorMessage(
          error,
          "Registration failed. Please try again.",
        );
        if (/(?:body\.)?email.*valid email|invalid email/i.test(apiMessage)) {
          setFormErrors((prev) => ({
            ...prev,
            registerEmail: "Please enter a valid email address.",
          }));
          setLoginError("");
        } else {
          setInlineError(AUTH_FORM_TYPES.REGISTER, apiMessage);
        }
      }
    },
    [
      dispatch,
      formFields,
      navigate,
      requireTermsAgreement,
      sellerPanel,
      setInlineError,
      validateFields,
    ],
  );

  const handleRegisterOtpSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      const code = verificationCode.join("");

      if (code.length !== 6) {
        setInlineError(
          AUTH_FORM_TYPES.REGISTER_VERIFICATION,
          "Enter complete OTP",
        );
        return;
      }

      try {
        const response = await dispatch(
          verifyRegistration({
            email: normalizeEmail(formFields.registerEmail),
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
            navigate(AUTH_ROUTES.VERIFICATION_COMPLETE);
            return;
          }
          toast.success(response.payload?.message);
          resetForm();
          navigate(AUTH_ROUTES.LOGIN);
        } else {
          const message = response.payload || "Invalid or expired OTP.";
          setFormErrors((prev) => ({ ...prev, verificationCode: message }));
        }
      } catch (error) {
        setInlineError(
          AUTH_FORM_TYPES.REGISTER_VERIFICATION,
          getApiErrorMessage(error, "Verification failed. Please try again."),
        );
      }
    },
    [
      dispatch,
      formFields.registerEmail,
      navigate,
      resetForm,
      setInlineError,
      verificationCode,
    ],
  );

  const handleResendOtp = useCallback(
    async (event) => {
      event.preventDefault();
      if (resendCooldown > 0) return;

      try {
        setFormAnimation("loading");
        const isRegistrationOtp =
          activeFormType === AUTH_FORM_TYPES.REGISTER_VERIFICATION;
        const email = normalizeEmail(
          isRegistrationOtp
            ? formFields.registerEmail
            : formFields.forgotEmail,
        );
        const purpose = isRegistrationOtp ? "registration" : "forgot_password";
        const response = await dispatch(resendOtp({ email, purpose }));
        if (!response?.error) {
          toast.success(getSuccessMessage(response, "OTP resent successfully"));
          setVerificationCode(EMPTY_OTP);
          writeAuthFlowDraft(formFields, EMPTY_OTP);
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
        } else {
          setInlineError(
            activeFormType,
            response?.payload || "Failed to resend OTP",
          );
        }
      } catch (error) {
        setInlineError(
          activeFormType,
          getApiErrorMessage(error, "Failed to resend code. Please try again."),
        );
        console.error("Resend OTP error:", error);
      }
    },
    [activeFormType, dispatch, formFields, resendCooldown, setInlineError],
  );

  const goToLogin = useCallback(
    ({ reset = false } = {}) => {
      if (reset) resetForm();
      navigate(AUTH_ROUTES.LOGIN);
    },
    [navigate, resetForm],
  );

  const goToForgotPassword = useCallback(() => {
    if (!sellerPanel) {
      navigate(AUTH_ROUTES.LOGIN, { replace: true });
      return;
    }
    navigate(AUTH_ROUTES.FORGOT_PASSWORD);
  }, [navigate, sellerPanel]);

  const goToRegister = useCallback(() => {
    if (sellerPanel) {
      navigate(AUTH_ROUTES.REGISTER);
      return;
    }
    toast.info("Please contact your administrator to create an account.");
  }, [navigate, sellerPanel]);

  const resendOtpLabel =
    resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP";

  return {
    activeFormType,
    codeInputRefs,
    formErrors,
    formFields,
    goToForgotPassword,
    goToLogin,
    goToRegister,
    handleCodeChange,
    handleCodeKeyDown,
    handleCodePaste,
    handleForgotPasswordSubmit,
    handleInputBlur,
    handleInputChange,
    handleLoginSubmit,
    handleRegisterOtpSubmit,
    handleRegisterSubmit,
    handleResendOtp,
    handleResetPasswordSubmit,
    handleVerificationSubmit,
    isBusy: loading || isLoading || false,
    loading,
    loginError,
    resendCooldown,
    resendOtpLabel,
    resetForm,
    sellerPanel,
    setTermsAccepted,
    termsAccepted,
    updateFormFields,
    verificationCode,
  };
};
