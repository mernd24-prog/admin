import axios from 'axios';
import { apiUrl, refreshAccessToken } from './axiosProvider';
import { normalizeApiError } from './normalizeApiError';
import {
  forceLogout,
  getAuthErrorCode,
  getAuthErrorMessage,
  getStoredAccessToken,
  getStoredRefreshToken,
  isAuthEndpoint,
  isTokenExpiring,
  shouldForceLogoutForResponse,
} from './authSession';
import { getSelectedSellerOrganizationId } from './sellerOrganizationContext';

const apiClient = axios.create({
  baseURL: apiUrl,
});

const MAX_SAFE_AUTH_HEADER_TOKEN_LENGTH = 7000;

const getSessionToken = () => {
  try {
    const sessionUser = JSON.parse(sessionStorage.getItem("EcomAdmin") || "null");
    return sessionUser?.token || null;
  } catch {
    return null;
  }
};

const getOrganizationHeader = () => {
  const organizationId = getSelectedSellerOrganizationId();
  return organizationId ? { 'X-Organization-Id': organizationId } : {};
};

export const setHeaders = () => {
  const user = localStorage.getItem('accessToken') || getSessionToken();
  const safeToken = String(user || "").length > MAX_SAFE_AUTH_HEADER_TOKEN_LENGTH ? null : user;

  return {
    headers: {
      'Content-Type': 'application/json',
      ...(safeToken ? { Authorization: `Bearer ${safeToken}` } : {}),
      ...getOrganizationHeader(),
    },
  };
};

export function logoutFunction() {
  forceLogout("Logged out");
}

const getApiToken = async (endpoint, tokenOverride = null) => {
  if (tokenOverride) return tokenOverride;

  const accessToken = getStoredAccessToken() || localStorage.getItem('accessToken') || getSessionToken();
  if (
    accessToken &&
    !isAuthEndpoint(endpoint) &&
    (
      isTokenExpiring(accessToken) ||
      String(accessToken || "").length > MAX_SAFE_AUTH_HEADER_TOKEN_LENGTH
    ) &&
    getStoredRefreshToken()
  ) {
    try {
      return await refreshAccessToken();
    } catch (error) {
      forceLogout(getAuthErrorCode(error) || "TOKEN_EXPIRED", getAuthErrorMessage(error));
      throw error;
    }
  }

  return accessToken;
};

const shouldRetryWithRefresh = (error, endpoint, tokenOverride = null) => {
  if (tokenOverride || isAuthEndpoint(endpoint) || !getStoredRefreshToken()) return false;

  const status = error?.response?.status || error?.status;
  const code = getAuthErrorCode(error);
  return status === 401 &&
    (!code || code === "TOKEN_EXPIRED" || code === "TOKEN_INVALID");
};

const shouldForceLogout = (error, endpoint) => {
  if (isAuthEndpoint(endpoint)) return false;

  return shouldForceLogoutForResponse(error);
};

export const apiRequest = async (method, endpoint, data, contentType = "json", tokenOverride = null) => {
  const lowerMethod = String(method || "GET").toLowerCase();
  const buildConfig = async (retryToken = null) => {
    const token = retryToken || await getApiToken(endpoint, tokenOverride);
    const config = {
      method,
      url: endpoint,
      headers: {
        'Content-Type': contentType === "json" ? 'application/json' : "multipart/form-data",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...getOrganizationHeader(),
      },
    };

    if (lowerMethod === "get" || lowerMethod === "delete") {
      config.params = data || undefined;
    } else {
      config.data = data;
    }

    return config;
  };

  try {
    const response = await apiClient(await buildConfig());
    return response.data;
  } catch (error) {
    if (shouldRetryWithRefresh(error, endpoint, tokenOverride)) {
      try {
        const accessToken = await refreshAccessToken();
        const response = await apiClient(await buildConfig(accessToken));
        return response.data;
      } catch (refreshError) {
        forceLogout(getAuthErrorCode(refreshError) || "TOKEN_EXPIRED", getAuthErrorMessage(refreshError));
        throw normalizeApiError(refreshError);
      }
    }

    if (shouldForceLogout(error, endpoint, tokenOverride)) {
      forceLogout(getAuthErrorCode(error) || "SESSION_INVALID", getAuthErrorMessage(error));
    }

    throw normalizeApiError(error);
  }
};

export const apiRequestImage = async (method, endpoint, data) => {
  const buildConfig = async (retryToken = null) => {
    const token = retryToken || await getApiToken(endpoint);
    return {
      method: method,
      url: endpoint,
      data: data,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...getOrganizationHeader(),
      },
    };
  };

  try {
    const response = await apiClient(await buildConfig());

    return response.data;
  } catch (error) {
    if (shouldRetryWithRefresh(error, endpoint)) {
      try {
        const accessToken = await refreshAccessToken();
        const response = await apiClient(await buildConfig(accessToken));
        return response.data;
      } catch (refreshError) {
        forceLogout(getAuthErrorCode(refreshError) || "TOKEN_EXPIRED", getAuthErrorMessage(refreshError));
        throw normalizeApiError(refreshError);
      }
    }

    if (shouldForceLogout(error, endpoint)) {
      forceLogout(getAuthErrorCode(error) || "SESSION_INVALID", getAuthErrorMessage(error));
    }

    throw normalizeApiError(error);
  }
};
