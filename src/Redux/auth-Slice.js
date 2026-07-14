import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { apiRequest } from "../_helpers/apiConfig";
import { ENDPOINTS } from "../_helpers/endpoints";
import {
  clearStoredAuth,
  extractAllowedModules,
  extractRole,
  setStoredAuth,
} from "../_helpers/authStorage";

/*
BACKEND ROUTES USED

POST /auth/register
POST /auth/register-otp
POST /auth/verify-registration
POST /auth/login
POST /auth/forgot-password
POST /auth/verify-otp
POST /auth/resend-otp
POST /auth/reset-password
POST /auth/change-password
POST /auth/refresh
*/

const unwrapApiData = (response) => {
  if (response?.success === true && Object.prototype.hasOwnProperty.call(response, "data")) {
    return response.data;
  }
  return response?.data || response;
};

export const normalizeAuthPayload = (response) => {
  const raw = unwrapApiData(response) || {};
  const tokens = raw?.tokens || raw?.data?.tokens || {};
  const user = raw?.user || raw?.data?.user || raw?.data || null;
  const flowState = raw?.flowState || raw?.data?.flowState || null;
  const accessToken =
    raw?.accessToken ||
    raw?.token ||
    tokens?.accessToken ||
    raw?.data?.accessToken ||
    raw?.data?.token ||
    null;
  const refreshToken =
    raw?.refreshToken ||
    tokens?.refreshToken ||
    raw?.data?.refreshToken ||
    null;
  const onboardingToken =
    raw?.onboardingToken ||
    raw?.data?.onboardingToken ||
    tokens?.onboardingToken ||
    flowState?.onboardingToken ||
    null;
  const role = extractRole(user, raw, flowState);
  const allowedModules = extractAllowedModules(user, raw);
  const sidebarModulesSource =
    user?.sidebarModules ??
    raw?.sidebarModules ??
    raw?.data?.sidebarModules;
  const modulePermissionsSource =
    user?.modulePermissions ??
    raw?.modulePermissions ??
    raw?.data?.modulePermissions;
  const sidebarModules = Array.isArray(sidebarModulesSource)
    ? sidebarModulesSource
    : undefined;
  const modulePermissions = Array.isArray(modulePermissionsSource)
    ? modulePermissionsSource
    : undefined;

  return {
    raw,
    user,
    flowState,
    accessToken,
    refreshToken,
    role,
    allowedModules,
    sidebarModules,
    modulePermissions,
    requiresOnboarding: Boolean(
      raw?.requiresOnboarding || flowState?.requiresOnboarding || onboardingToken,
    ),
    onboardingToken,
    message: raw?.message || response?.message || "Success",
  };
};

const normalizeError = (error, fallback) =>
  error?.error?.message ||
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

//
// ================================
// LOGIN
// ================================
//

export const adminLogin = createAsyncThunk(
  "auth/adminLogin",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        "POST",
        ENDPOINTS.auth.login,
        credentials
      );

      if (!response?.data) {
        throw new Error(response?.message || "Invalid credentials");
      }

      return response;
    } catch (error) {
      return rejectWithValue(
        normalizeError(error, "Login failed")
      );
    }
  }
);

export const sendOtp = createAsyncThunk(
  "auth/sendOtp",
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest("POST", ENDPOINTS.auth.sendOtp, payload);
    } catch (error) {
      return rejectWithValue(normalizeError(error, "Failed to send OTP"));
    }
  }
);

export const verifySellerLoginOtp = createAsyncThunk(
  "auth/verifySellerLoginOtp",
  async (payload, { rejectWithValue }) => {
    try {
      return await apiRequest("POST", ENDPOINTS.auth.verifyOtp, {
        ...payload,
        purpose: "login",
      });
    } catch (error) {
      return rejectWithValue(normalizeError(error, "OTP login failed"));
    }
  }
);

//
// ================================
// REGISTER WITH OTP
// ================================
//

export const registerWithOtp = createAsyncThunk(
  "auth/registerWithOtp",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        "POST",
        ENDPOINTS.auth.registerOtp,
        payload
      );

      return response;
    } catch (error) {
      return rejectWithValue(
        normalizeError(error, "Registration failed")
      );
    }
  }
);

//
// ================================
// VERIFY REGISTRATION
// ================================
//

export const verifyRegistration = createAsyncThunk(
  "auth/verifyRegistration",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        "POST",
        ENDPOINTS.auth.verifyRegistration,
        payload
      );

      return response;
    } catch (error) {
      return rejectWithValue(
        normalizeError(error, "Verification failed")
      );
    }
  }
);

//
// ================================
// FORGOT PASSWORD
// ================================
//

export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        "POST",
        ENDPOINTS.auth.forgotPassword,
        payload
      );

      return response;
    } catch (error) {
      return rejectWithValue(
        normalizeError(error, "Forgot password failed")
      );
    }
  }
);

//
// ================================
// VERIFY OTP
// ================================
//

export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        "POST",
        ENDPOINTS.auth.verifyOtp,
        payload
      );

      return response;
    } catch (error) {
      return rejectWithValue(
        normalizeError(error, "OTP verification failed")
      );
    }
  }
);

//
// ================================
// RESEND OTP
// ================================
//

export const resendOtp = createAsyncThunk(
  "auth/resendOtp",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        "POST",
        ENDPOINTS.auth.resendOtp,
        payload
      );

      return response;
    } catch (error) {
      return rejectWithValue(
        normalizeError(error, "Resend OTP failed")
      );
    }
  }
);

//
// ================================
// RESET PASSWORD
// ================================
//

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        "POST",
        ENDPOINTS.auth.resetPassword,
        payload
      );

      return response;
    } catch (error) {
      return rejectWithValue(
        normalizeError(error, "Reset password failed")
      );
    }
  }
);

//
// ================================
// CHANGE PASSWORD
// ================================
//

export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        "POST",
        ENDPOINTS.auth.changePassword,
        payload
      );

      return response;
    } catch (error) {
      return rejectWithValue(
        normalizeError(error, "Change password failed")
      );
    }
  }
);

//
// ================================
// REFRESH TOKEN
// ================================
//

export const refreshToken = createAsyncThunk(
  "auth/refreshToken",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        "POST",
        ENDPOINTS.auth.refresh,
        payload
      );

      return response;
    } catch (error) {
      return rejectWithValue(
        normalizeError(error, "Refresh token failed")
      );
    }
  }
);

//
// ================================
// SLICE
// ================================
//

const authSlice = createSlice({
  name: "auth",
  initialState: {
    loading: false,
    user: null,
    token: localStorage.getItem("accessToken") || null,
    error: null,
    success: null,
    profileData: [],
  },

  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = null;
      state.success = null;
      clearStoredAuth();
    },

    clearAuthState(state) {
      state.loading = false;
      state.error = null;
      state.success = null;
    },
  },

  extraReducers: (builder) => {
    builder

      //
      // ================================
      // LOGIN
      // ================================
      //

      .addCase(adminLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(adminLogin.fulfilled, (state, action) => {
        state.loading = false;
        const auth = normalizeAuthPayload(action.payload);
        state.user = auth.user || action.payload;
        state.token = auth.accessToken;
        state.success = auth.message || "Login successful";

        if (auth.accessToken) {
          setStoredAuth({
            accessToken: auth.accessToken,
            refreshToken: auth.refreshToken,
            user: auth.user,
            role: auth.role,
            allowedModules: auth.allowedModules,
            sidebarModules: auth.sidebarModules,
            modulePermissions: auth.modulePermissions,
          });
        }
      })

      .addCase(adminLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(sendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.success = unwrapApiData(action.payload)?.message || "OTP sent successfully";
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(verifySellerLoginOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifySellerLoginOtp.fulfilled, (state, action) => {
        const auth = normalizeAuthPayload(action.payload);
        state.loading = false;
        state.user = auth.user || action.payload;
        state.token = auth.accessToken;
        state.success = auth.message || "Login successful";
      })
      .addCase(verifySellerLoginOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(registerWithOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerWithOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.success = unwrapApiData(action.payload)?.message || "OTP sent successfully";
      })
      .addCase(registerWithOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(verifyRegistration.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyRegistration.fulfilled, (state, action) => {
        const auth = normalizeAuthPayload(action.payload);
        state.loading = false;
        state.user = auth.user || action.payload;
        state.success = auth.message || "Registration verified";
      })
      .addCase(verifyRegistration.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(resendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.success = unwrapApiData(action.payload)?.message || "OTP resent successfully";
      })
      .addCase(resendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      //
      // ================================
      // FORGOT PASSWORD
      // ================================
      //

      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.success =
          action.payload?.message || "OTP sent successfully";
      })

      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      //
      // ================================
      // VERIFY OTP
      // ================================
      //

      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.success =
          action.payload?.message || "OTP verified successfully";
      })

      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      //
      // ================================
      // RESET PASSWORD
      // ================================
      //

      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.success =
          action.payload?.message || "Password reset successful";
      })

      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      //
      // ================================
      // REFRESH TOKEN
      // ================================
      //

      .addCase(refreshToken.pending, (state) => {
        state.error = null;
      })

      .addCase(refreshToken.fulfilled, (state, action) => {
        const auth = normalizeAuthPayload(action.payload);
        state.token = auth.accessToken || state.token;
        if (auth.accessToken) {
          setStoredAuth({
            accessToken: auth.accessToken,
            refreshToken: auth.refreshToken,
            user: auth.user || state.user,
            role: auth.role,
            allowedModules: auth.allowedModules,
            sidebarModules: auth.sidebarModules,
            modulePermissions: auth.modulePermissions,
          });
        }
      })

      .addCase(refreshToken.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export const {
  logout,
  clearAuthState,
} = authSlice.actions;

export default authSlice.reducer;
