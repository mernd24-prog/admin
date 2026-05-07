import { clearStoredAuth } from "./authStorage";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const SESSION_USER_KEY = "EcomAdmin";
const SESSION_EXPIRED_EVENT = "auth:session-expired";

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
  ].some((path) => normalized.includes(path));
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

export const forceLogout = (reason = "Session expired") => {
  clearStoredAuth();
  localStorage.removeItem("token");

  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, {
      detail: { reason },
    })
  );

  const currentPath = window.location.pathname;
  if (!currentPath.includes("/login")) {
    window.location.replace("/login");
  }
};

export const SESSION_EXPIRED_EVENT_NAME = SESSION_EXPIRED_EVENT;
