import axios from 'axios';
import { apiUrl, refreshAccessToken } from './axiosProvider';
import { normalizeApiError } from './normalizeApiError';
import {
  forceLogout,
  getStoredAccessToken,
  getStoredRefreshToken,
  isAuthEndpoint,
  isTokenExpiring,
} from './authSession';

const apiClient = axios.create({
  baseURL: apiUrl,
});

const getSessionToken = () => {
  try {
    const sessionUser = JSON.parse(sessionStorage.getItem("EcomAdmin") || "null");
    return sessionUser?.token || null;
  } catch {
    return null;
  }
};

export const setHeaders = () => {
  const user = localStorage.getItem('accessToken') || getSessionToken();

  return {
    headers: {
      'Content-Type': 'application/json',
      ...(user ? { Authorization: `Bearer ${user}` } : {}),
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
    isTokenExpiring(accessToken) &&
    getStoredRefreshToken()
  ) {
    try {
      return await refreshAccessToken();
    } catch (error) {
      forceLogout("Session expired. Please login again.");
      throw error;
    }
  }

  return accessToken;
};

const shouldRetryWithRefresh = (error, endpoint, tokenOverride = null) => {
  if (tokenOverride || isAuthEndpoint(endpoint) || !getStoredRefreshToken()) return false;

  const status = error?.response?.status || error?.status;
  const data = error?.response?.data || error || {};
  return status === 401 || data?.code === 3 || data?.error?.code === 3;
};

const shouldForceLogout = (error, endpoint, tokenOverride = null) => {
  if (tokenOverride || isAuthEndpoint(endpoint)) return false;

  const status = error?.response?.status || error?.status;
  const data = error?.response?.data || error || {};
  return status === 401 || data?.code === 3 || data?.error?.code === 3;
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
        forceLogout("Session expired. Please login again.");
        throw normalizeApiError(refreshError);
      }
    }

    if (shouldForceLogout(error, endpoint, tokenOverride)) {
      forceLogout("Session expired. Please login again.");
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
        forceLogout("Session expired. Please login again.");
        throw normalizeApiError(refreshError);
      }
    }

    if (shouldForceLogout(error, endpoint)) {
      forceLogout("Session expired. Please login again.");
    }

    throw normalizeApiError(error);
  }
};
