import axios from 'axios';
import { apiUrl } from './axiosProvider';

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

const normalizeApiError = (error) => {
  const data = error?.response?.data;
  return {
    ...(data || {}),
    message:
      data?.error?.message ||
      data?.message ||
      error?.message ||
      'Unknown error occurred',
  };
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
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('role');
  localStorage.removeItem('allowedModules');
  localStorage.removeItem('authFlowState');
  localStorage.removeItem('authMode');
  localStorage.removeItem('sellerOnboardingToken');
  localStorage.removeItem('sellerOnboardingUser');
  sessionStorage.removeItem("EcomAdmin");

  window.location.replace('/login');
  window.location.reload()
}

export const apiRequest = async (method, endpoint, data, contentType = "json", tokenOverride = null) => {
  const token = tokenOverride || localStorage.getItem('accessToken') || getSessionToken();
  const lowerMethod = String(method || "GET").toLowerCase();
  try {
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

    const response = await apiClient(config);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const apiRequestImage = async (method, endpoint, data) => {
  let user = localStorage.getItem('accessToken');

  try {
    const response = await apiClient({
      method: method,
      url: endpoint,
      data: data,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${user}`,
      },
    });

    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
