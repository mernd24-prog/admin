import axios from "axios";
import { sessionStorageGetItem } from "./globalFunctions";
import { normalizeApiError } from "./normalizeApiError";
import {
  forceLogout,
  getAuthErrorCode,
  getAuthErrorMessage,
  getStoredAccessToken,
  getStoredRefreshToken,
  isAuthEndpoint,
  isTokenExpiring,
  persistAuthTokens,
  shouldForceLogoutForResponse,
} from "./authSession";
import {
  getSelectedSellerOrganizationHeader,
  getSelectedSellerOrganizationId,
  setSelectedSellerOrganizationId,
} from "./sellerOrganizationContext";

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");
const trimLeadingSlash = (value = "") => value.replace(/^\/+/, "");

const configuredApiBase =
  process.env.REACT_APP_API_BASE_URL || process.env.VITE_API_BASE_URL;

const normalizedApiBase = trimTrailingSlash(configuredApiBase);

export const apiUrl = normalizedApiBase.endsWith("/api/v1")
  ? `${normalizedApiBase}/`
  : `${normalizedApiBase}/api/v1/`;

export const socketApiUrl =
  process.env.REACT_APP_SOCKET_URL ||
  process.env.VITE_SOCKET_URL ||
  normalizedApiBase.replace(/\/api\/v1$/, "");

const axiosPublic = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  },
});

const axiosPrivate = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  },
});

const axiosImage = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "multipart/form-data",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  },
});

const axiosRefresh = axios.create({
  baseURL: apiUrl,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  },
});

let refreshPromise = null;
const MAX_SAFE_AUTH_HEADER_TOKEN_LENGTH = 7000;

const normalizeRefreshResponse = (response) => {
  const raw = response?.data?.data || response?.data || {};
  const tokens = raw?.tokens || raw?.data?.tokens || {};

  return {
    accessToken:
      raw?.accessToken ||
      raw?.token ||
      tokens?.accessToken ||
      raw?.data?.accessToken ||
      raw?.data?.token ||
      null,
    refreshToken:
      raw?.refreshToken ||
      tokens?.refreshToken ||
      raw?.data?.refreshToken ||
      null,
  };
};

export const refreshAccessToken = async () => {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token found");
  }

  if (!refreshPromise) {
    refreshPromise = axiosRefresh
      .post("/auth/refresh", { refreshToken })
      .then((response) => {
        const tokens = normalizeRefreshResponse(response);
        if (!tokens.accessToken) {
          throw new Error("Refresh response did not include an access token");
        }
        persistAuthTokens(tokens);
        return tokens.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

const authRequestInterceptor = (config) => {
  config.headers = config.headers || {};
  const authData = sessionStorageGetItem();
  const token = getStoredAccessToken() || authData?.token;
  const suppliedAuthorization = config.headers?.Authorization;
  if (!token && !suppliedAuthorization) {
    return Promise.reject(new Error("No authentication token found"));
  }

  if (!suppliedAuthorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  Object.assign(
    config.headers,
    getSelectedSellerOrganizationHeader(config.url),
  );
  return config;
};

const shouldForceLogout = (error) => {
  return shouldForceLogoutForResponse(error);
};

const syncSelectedSellerOrganization = (response) => {
  const selectedOrganizationId =
    response?.headers?.["x-selected-organization-id"];
  if (
    selectedOrganizationId &&
    selectedOrganizationId !== getSelectedSellerOrganizationId()
  ) {
    setSelectedSellerOrganizationId(selectedOrganizationId);
  }
  return response;
};

const createErrorResponseInterceptor = (instance) => async (error) => {
  const originalRequest = error?.config || {};
  const status = error?.response?.status || error?.status;
  const authCode = getAuthErrorCode(error);
  const canRefresh =
    status === 401 &&
    (!authCode ||
      authCode === "TOKEN_EXPIRED" ||
      authCode === "TOKEN_INVALID") &&
    !originalRequest._retry &&
    !isAuthEndpoint(originalRequest.url) &&
    Boolean(getStoredRefreshToken());

  if (canRefresh) {
    try {
      originalRequest._retry = true;
      const accessToken = await refreshAccessToken();
      originalRequest.headers = {
        ...(originalRequest.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      };
      return instance(originalRequest);
    } catch (refreshError) {
      // Another tab may have refreshed the token concurrently (cross-tab race).
      // If localStorage now has a fresh, non-expiring access token, use it instead
      // of forcing logout — the other tab's refresh already handled session rotation.
      const freshToken = getStoredAccessToken();
      if (freshToken && !isTokenExpiring(freshToken, 30 * 1000)) {
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${freshToken}`,
        };
        return instance(originalRequest);
      }
      forceLogout(
        getAuthErrorCode(refreshError) || "TOKEN_EXPIRED",
        getAuthErrorMessage(refreshError),
      );
      return Promise.reject(refreshError);
    }
  }

  if (shouldForceLogout(error) && !isAuthEndpoint(originalRequest.url)) {
    forceLogout(authCode || "SESSION_INVALID", getAuthErrorMessage(error));
  }

  if (!error.response) {
    // Pre-send rejections (e.g. missing auth token) carry a plain Error.message but no config.url.
    // Distinguish them from real network failures so the message is accurate.
    if (error?.config == null && error?.message) {
      return Promise.reject({ message: error.message });
    }
    const baseURL = trimTrailingSlash(error?.config?.baseURL || apiUrl);
    const requestPath = trimLeadingSlash(error?.config?.url || "");
    const requestUrl = requestPath ? `${baseURL}/${requestPath}` : baseURL;
    return Promise.reject({
      message: `Network error. API temporarily unreachable: ${requestUrl}. Please retry.`,
    });
  }

  const data = error.response.data || {};
  const responseStatus = error.response.status;
  const fallback =
    responseStatus === 403
      ? "Access denied. Insufficient permissions."
      : responseStatus === 413
        ? "File or data is too large. Please reduce the size and try again."
        : responseStatus === 500
          ? "Internal server error. Please try again later."
          : "An unknown error occurred";
  const normalized = normalizeApiError(error, fallback);

  return Promise.reject({
    ...data,
    status: responseStatus,
    message: normalized.message,
    details: normalized.details,
  });
};

const refreshBeforeRequestInterceptor = async (config) => {
  config.headers = config.headers || {};
  Object.assign(
    config.headers,
    getSelectedSellerOrganizationHeader(config.url),
  );
  if (config.headers?.Authorization) {
    return authRequestInterceptor(config);
  }

  const storedAccessToken = getStoredAccessToken();
  const shouldRefreshBeforeRequest =
    !isAuthEndpoint(config.url) &&
    getStoredRefreshToken() &&
    (isTokenExpiring(storedAccessToken) ||
      String(storedAccessToken || "").length >
        MAX_SAFE_AUTH_HEADER_TOKEN_LENGTH);

  if (shouldRefreshBeforeRequest) {
    try {
      const accessToken = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    } catch (error) {
      // Another tab may have refreshed successfully; check localStorage before logging out.
      const freshToken = getStoredAccessToken();
      if (freshToken && !isTokenExpiring(freshToken, 30 * 1000)) {
        config.headers.Authorization = `Bearer ${freshToken}`;
        return config;
      }
      forceLogout(
        getAuthErrorCode(error) || "TOKEN_EXPIRED",
        getAuthErrorMessage(error),
      );
      throw error;
    }
  }

  return authRequestInterceptor(config);
};

[axiosPrivate, axiosImage].forEach((instance) => {
  instance.interceptors.request.use(refreshBeforeRequestInterceptor);
  instance.interceptors.response.use((response) => {
    if (response?.data?.code === 3) {
      forceLogout("SESSION_INVALID", "Session expired. Please login again.");
      return Promise.reject({ message: "Session expired" });
    }
    return syncSelectedSellerOrganization(response);
  }, createErrorResponseInterceptor(instance));
});

axiosPublic.interceptors.response.use(
  (response) => response,
  createErrorResponseInterceptor(axiosPublic),
);

const uploadImageDirect = async (apiPath, formData) => {
  try {
    const response = await axiosImage.post(apiPath, formData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export { axiosPrivate, axiosPublic, axiosImage, uploadImageDirect };
