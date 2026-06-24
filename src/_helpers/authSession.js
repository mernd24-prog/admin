import { clearStoredAuth } from "./authStorage";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const SESSION_USER_KEY = "EcomAdmin";
const SESSION_EXPIRED_EVENT = "auth:session-expired";

export const FORCE_LOGOUT_CODES = new Set([
  "USER_NOT_FOUND",
  "USER_INACTIVE",
  "USER_BLOCKED",
  "USER_DELETED",
  "TOKEN_EXPIRED",
  "TOKEN_INVALID",
  "ROLE_CHANGED",
  "ROLE_INACTIVE",
  "PERMISSION_REMOVED",
  "SESSION_INVALID",
  "FORCE_LOGOUT",
]);

export const FORCE_LOGOUT_MESSAGES = {
  USER_NOT_FOUND: "Your account no longer exists. Please contact administrator.",
  USER_DELETED: "Your account has been removed. Please contact administrator.",
  USER_INACTIVE: "Your account has been deactivated. Please contact administrator.",
  USER_BLOCKED: "Your account has been blocked. Please contact support.",
  TOKEN_EXPIRED: "Your session has expired. Please login again.",
  TOKEN_INVALID: "Invalid session. Please login again.",
  ROLE_CHANGED: "Your role was changed. Please login again.",
  ROLE_INACTIVE: "Your role is no longer active. Please contact administrator.",
  PERMISSION_REMOVED: "Your permissions were updated. Please login again.",
  SESSION_INVALID: "Your session is no longer valid. Please login again.",
  FORCE_LOGOUT: "Please login again to continue.",
};

const safeParse = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const safeAtob = (value) => {
  try {
    return window.atob(value);
  } catch {
    try {
      return atob(value);
    } catch {
      return "";
    }
  }
};

export const getSessionUser = () =>
  safeParse(sessionStorage.getItem(SESSION_USER_KEY), null);

export const getStoredAccessToken = () =>
  localStorage.getItem(ACCESS_TOKEN_KEY) || getSessionUser()?.token || null;

export const getStoredRefreshToken = () =>
  localStorage.getItem(REFRESH_TOKEN_KEY) || getSessionUser()?.refreshToken || null;

export const getSellerOnboardingToken = () =>
  localStorage.getItem("sellerOnboardingToken") || null;

export const getJwtExpiryMs = (token) => {
  if (!token || String(token).split(".").length < 3) return null;

  const payload = String(token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const decoded = safeParse(safeAtob(payload), null);
  return decoded?.exp ? decoded.exp * 1000 : null;
};

export const isTokenExpiring = (token, skewMs = 60 * 1000) => {
  const expiresAt = getJwtExpiryMs(token);
  return Boolean(expiresAt && expiresAt - Date.now() <= skewMs);
};

export const isAuthEndpoint = (url = "") => {
  const normalized = String(url || "").toLowerCase();
  return [
    "/auth/login",
    "/auth/register",
    "/auth/register-otp",
    "/auth/verify-registration",
    "/auth/forgot-password",
    "/auth/send-otp",
    "/auth/verify-otp",
    "/auth/resend-otp",
    "/auth/reset-password",
    "/auth/change-password",
    "/auth/refresh",
    // Public lookup endpoints — no auth token required
    "/meta/dropdowns",
    "/meta/routes", 
  ].some((path) => normalized.includes(path));
};

export const getAuthErrorCode = (errorOrResponse = {}) => {
  const data = errorOrResponse?.response?.data || errorOrResponse?.data || errorOrResponse || {};
  return data?.code || data?.error?.code || null;
};

export const getAuthErrorMessage = (errorOrResponse = {}, fallback = "Session expired. Please login again.") => {
  const data = errorOrResponse?.response?.data || errorOrResponse?.data || errorOrResponse || {};
  const code = getAuthErrorCode(errorOrResponse);
  return data?.message ||
    data?.error?.message ||
    FORCE_LOGOUT_MESSAGES[code] ||
    fallback;
};

export const shouldForceLogoutForResponse = (errorOrResponse = {}) => {
  const status = errorOrResponse?.response?.status || errorOrResponse?.status;
  const code = getAuthErrorCode(errorOrResponse);
  return FORCE_LOGOUT_CODES.has(code) || status === 401;
};

export const persistAuthTokens = ({ accessToken, refreshToken } = {}) => {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

  const sessionUser = getSessionUser();
  if (sessionUser && (accessToken || refreshToken)) {
    sessionStorage.setItem(
      SESSION_USER_KEY,
      JSON.stringify({
        ...sessionUser,
        ...(accessToken ? { token: accessToken } : {}),
        ...(refreshToken ? { refreshToken } : {}),
      })
    );
  }
};

export const forceLogout = (reasonCodeOrMessage = "SESSION_INVALID", message = null) => {
  const isKnownCode = FORCE_LOGOUT_CODES.has(reasonCodeOrMessage);
  const reasonCode = isKnownCode ? reasonCodeOrMessage : "SESSION_INVALID";
  const reason = message || FORCE_LOGOUT_MESSAGES[reasonCodeOrMessage] || reasonCodeOrMessage || FORCE_LOGOUT_MESSAGES[reasonCode];

  clearStoredAuth();

  if (typeof window === "undefined") return;
  localStorage.setItem("logoutReason", JSON.stringify({ code: reasonCode, message: reason }));

  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, {
      detail: { code: reasonCode, reason, message: reason },
    })
  );
  window.dispatchEvent(new CustomEvent("auth:changed"));

  const currentPath = window.location.pathname;
  if (!currentPath.includes("/login")) {
    window.location.replace("/login");
  }
};

export const SESSION_EXPIRED_EVENT_NAME = SESSION_EXPIRED_EVENT;
