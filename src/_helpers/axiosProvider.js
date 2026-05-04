import axios from 'axios';
import { sessionStorageGetItem } from './globalFunctions';

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const configuredApiBase =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    "http://localhost:4000";

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

const getApiMessage = (data, fallback) =>
    data?.error?.message ||
    data?.message ||
    (Array.isArray(data?.error) ? data.error[0]?.message : null) ||
    fallback;

const authRequestInterceptor = (config) => {
    const authData = sessionStorageGetItem();
    const token = authData?.token || localStorage.getItem("accessToken");
    if (!token) {
        return Promise.reject(new Error("No authentication token found"));
    }

    config.headers.Authorization = `Bearer ${token}`;
    return config;
};

const errorResponseInterceptor = (error) => {
    if (!error.response) {
        return Promise.reject({ message: "Network error. Please try again." });
    }

    const data = error.response.data || {};
    const status = error.response.status;
    const fallback = status === 403
        ? "Access denied. Insufficient permissions."
        : status === 500
            ? "Internal server error. Please try again later."
            : "An unknown error occurred";

    return Promise.reject({
        ...data,
        status,
        message: getApiMessage(data, fallback),
    });
};

[axiosPrivate, axiosImage].forEach(instance => {
    instance.interceptors.request.use(authRequestInterceptor);
    instance.interceptors.response.use(
        (response) => {
            if (response?.data?.code === 3) {
                return Promise.reject({ message: "Session expired" });
            }
            return response;
        },
        errorResponseInterceptor
    );
});

axiosPublic.interceptors.response.use(
    (response) => response,
    errorResponseInterceptor
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
