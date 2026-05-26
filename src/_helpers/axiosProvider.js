import axios from 'axios';
import { sessionStorageGetItem } from './globalFunctions';
import { normalizeApiError } from './normalizeApiError';
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
} from './authSession';

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");
const trimLeadingSlash = (value = "") => value.replace(/^\/+/, "");

const configuredApiBase =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    "http://192.168.16.47:4000";

const normalizedApiBase = trimTrailingSlash(configuredApiBase);

export const apiUrl = normalizedApiBase.endsWith("/api/v1")
    ? `${normalizedApiBase}/`
    : `${normalizedApiBase}/api/v1/`;

export const socketApiUrl =
    process.env.REACT_APP_SOCKET_URL ||
    process.env.VITE_SOCKET_URL ||
    `${normalizedApiBase.replace(/\/api\/v1$/, "")}/socket`;

const axiosPublic = axios.create({
    baseURL: apiUrl,
    headers: { "Content-Type": "application/json" },
});

const axiosPrivate = axios.create({
    baseURL: apiUrl,
    headers: { "Content-Type": "application/json" },
});

const axiosImage = axios.create({
    baseURL: apiUrl,
    headers: { 'Content-Type': 'multipart/form-data' },
});

const axiosRefresh = axios.create({
    baseURL: apiUrl,
    headers: { "Content-Type": "application/json" },
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
    const authData = sessionStorageGetItem();
    const token = getStoredAccessToken() || authData?.token;
    if (!token) {
        return Promise.reject(new Error("No authentication token found"));
    }

    config.headers.Authorization = `Bearer ${token}`;
    return config;
};

const shouldForceLogout = (error) => {
    return shouldForceLogoutForResponse(error);
};

const createErrorResponseInterceptor = (instance) => async (error) => {
    const originalRequest = error?.config || {};
    const status = error?.response?.status || error?.status;
    const authCode = getAuthErrorCode(error);
    const canRefresh =
        status === 401 &&
        (!authCode || authCode === "TOKEN_EXPIRED" || authCode === "TOKEN_INVALID") &&
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
            forceLogout(getAuthErrorCode(refreshError) || "TOKEN_EXPIRED", getAuthErrorMessage(refreshError));
            return Promise.reject(refreshError);
        }
    }

    if (shouldForceLogout(error) && !isAuthEndpoint(originalRequest.url)) {
        forceLogout(authCode || "SESSION_INVALID", getAuthErrorMessage(error));
    }

    if (!error.response) {
        const baseURL = trimTrailingSlash(error?.config?.baseURL || apiUrl);
        const requestPath = trimLeadingSlash(error?.config?.url || "");
        const requestUrl = requestPath ? `${baseURL}/${requestPath}` : baseURL;
        return Promise.reject({
            message: `Network error. API not reachable: ${requestUrl}`,
        });
    }

    const data = error.response.data || {};
    const responseStatus = error.response.status;
    const fallback = responseStatus === 403
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
    const storedAccessToken = getStoredAccessToken();
    const shouldRefreshBeforeRequest =
        !isAuthEndpoint(config.url) &&
        getStoredRefreshToken() &&
        (
            isTokenExpiring(storedAccessToken) ||
            String(storedAccessToken || "").length > MAX_SAFE_AUTH_HEADER_TOKEN_LENGTH
        );

    if (shouldRefreshBeforeRequest) {
        try {
            const accessToken = await refreshAccessToken();
            config.headers.Authorization = `Bearer ${accessToken}`;
            return config;
        } catch (error) {
            forceLogout(getAuthErrorCode(error) || "TOKEN_EXPIRED", getAuthErrorMessage(error));
            throw error;
        }
    }

    return authRequestInterceptor(config);
};

[axiosPrivate, axiosImage].forEach(instance => {
    instance.interceptors.request.use(refreshBeforeRequestInterceptor);
    instance.interceptors.response.use(
        (response) => {
            if (response?.data?.code === 3) {
                forceLogout("SESSION_INVALID", "Session expired. Please login again.");
                return Promise.reject({ message: "Session expired" });
            }
            return response;
        },
        createErrorResponseInterceptor(instance)
    );
});

axiosPublic.interceptors.response.use(
    (response) => response,
    createErrorResponseInterceptor(axiosPublic)
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
