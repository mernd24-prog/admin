import axios from "axios";
import { apiUrl, refreshAccessToken } from "../_helpers/axiosProvider";
import {
  forceLogout,
  getSellerOnboardingToken,
  getStoredAccessToken,
  getStoredRefreshToken,
  isAuthEndpoint,
  isTokenExpiring,
} from "../_helpers/authSession";
import { normalizeApiError } from "./normalizeApiError";
import { toRelativeApiPath } from "./endpoints";

export const apiClient = axios.create({
  baseURL: apiUrl,
  headers: { "Content-Type": "application/json" },
});

const getSessionToken = () => {
  try {
    const sessionUser = JSON.parse(sessionStorage.getItem("EcomAdmin") || "null");
    return sessionUser?.token || null;
  } catch {
    return null;
  }
};

export const getAuthToken = () =>
  localStorage.getItem("accessToken") ||
  getSessionToken();

const getRequestToken = async (endpoint, tokenOverride = null) => {
  if (tokenOverride) return tokenOverride;

  const token = getStoredAccessToken() || getAuthToken();
  if (
    token &&
    !isAuthEndpoint(endpoint) &&
    isTokenExpiring(token) &&
    getStoredRefreshToken()
  ) {
    try {
      return await refreshAccessToken();
    } catch (error) {
      forceLogout("Session expired. Please login again.");
      throw error;
    }
  }

  return token;
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

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const compactQuery = (value = {}) => {
  if (!isPlainObject(value)) return value;

  return Object.entries(value).reduce((acc, [key, entry]) => {
    if (entry === undefined || entry === null || entry === "") return acc;
    acc[key] = entry;
    return acc;
  }, {});
};

export const pickFields = (value, allowedFields = []) => {
  if (value === undefined) return undefined;
  if (!allowedFields?.length || !isPlainObject(value)) return value;

  return allowedFields.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(value, key) && value[key] !== undefined) {
      acc[key] = value[key];
    }
    return acc;
  }, {});
};

export const apiRequest = async ({
  method = "GET",
  endpoint,
  query,
  body,
  token,
  allowedQueryKeys = [],
  allowedBodyKeys = [],
  sendBodyForDelete = false,
} = {}) => {
  const lowerMethod = String(method).toLowerCase();
  const requestQuery = compactQuery(pickFields(query || {}, allowedQueryKeys));
  const requestBody = pickFields(body, allowedBodyKeys);

  const buildConfig = async (retryToken = null) => {
    const authToken = retryToken || await getRequestToken(endpoint, token);
    const config = {
      method: lowerMethod,
      url: toRelativeApiPath(endpoint),
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    };

    if (lowerMethod === "get" || (lowerMethod === "delete" && !sendBodyForDelete)) {
      config.params = requestQuery;
    } else {
      config.params = requestQuery;
      config.data = requestBody;
    }

    return config;
  };

  try {
    const response = await apiClient(await buildConfig());
    return response.data;
  } catch (error) {
    if (shouldRetryWithRefresh(error, endpoint, token)) {
      try {
        const accessToken = await refreshAccessToken();
        const response = await apiClient(await buildConfig(accessToken));
        return response.data;
      } catch (refreshError) {
        forceLogout("Session expired. Please login again.");
        throw normalizeApiError(refreshError);
      }
    }

    if (shouldForceLogout(error, endpoint, token)) {
      forceLogout("Session expired. Please login again.");
    }

    throw normalizeApiError(error);
  }
};

export const getOnboardingToken = () => getSellerOnboardingToken();


export const apiGet = (endpoint, options = {}) =>
  apiRequest({ ...options, endpoint, method: "GET" });

export const apiPost = (endpoint, body, options = {}) =>
  apiRequest({ ...options, endpoint, body, method: "POST" });

export const apiPatch = (endpoint, body, options = {}) =>
  apiRequest({ ...options, endpoint, body, method: "PATCH" });

export const apiPut = (endpoint, body, options = {}) =>
  apiRequest({ ...options, endpoint, body, method: "PUT" });

export const apiDelete = (endpoint, body, options = {}) =>
  apiRequest({ ...options, endpoint, body, method: "DELETE" });

export default apiClient;
