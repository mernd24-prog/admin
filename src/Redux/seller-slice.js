import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "../_helpers/apiConfig";
import { ENDPOINTS } from "../_helpers/endpoints";

const ONBOARDING_TOKEN_KEY = "sellerOnboardingToken";
const ONBOARDING_USER_KEY = "sellerOnboardingUser";
const AUTH_FLOW_STATE_KEY = "authFlowState";
const AUTH_MODE_KEY = "authMode";
const REFRESH_TOKEN_KEY = "refreshToken";

const getStoredJson = (key) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    return null;
  }
};

const normalizeError = (error, fallback) => {
  const apiError = error?.response?.data || error;
  return {
    message: apiError?.error?.message || apiError?.message || fallback,
    details: Array.isArray(apiError?.error?.details)
      ? apiError.error.details
      : Array.isArray(apiError?.details)
        ? apiError.details
        : [],
  };
};

export const submitSellerKyc = createAsyncThunk(
  "seller/submitSellerKyc",
  async (payload, { rejectWithValue, getState }) => {
    try {
      const token =
        payload?.onboardingToken || getState()?.seller?.onboardingToken || localStorage.getItem(ONBOARDING_TOKEN_KEY);
      const response = await apiRequest(
        "POST",
        ENDPOINTS.sellers.onboardingKyc,
        payload,
        "json",
        token
      );
      return response;
    } catch (error) {
      return rejectWithValue(normalizeError(error, "Failed to submit KYC"));
    }
  }
);

export const updateSellerOnboardingProfile = createAsyncThunk(
  "seller/updateSellerOnboardingProfile",
  async (payload, { rejectWithValue, getState }) => {
    try {
      const token =
        payload?.onboardingToken || getState()?.seller?.onboardingToken || localStorage.getItem(ONBOARDING_TOKEN_KEY);
      const response = await apiRequest(
        "PATCH",
        ENDPOINTS.sellers.onboardingProfile,
        payload,
        "json",
        token
      );
      return response;
    } catch (error) {
      return rejectWithValue(normalizeError(error, "Failed to update seller profile"));
    }
  }
);

export const fetchAuthStatus = createAsyncThunk(
  "seller/fetchAuthStatus",
  async (payload = {}, { rejectWithValue }) => {
    try {
      const onboardingToken = localStorage.getItem(ONBOARDING_TOKEN_KEY);
      const accessToken = localStorage.getItem("accessToken");
      const token = payload?.token || onboardingToken || accessToken;
      if (!token) {
        return null;
      }
      const response = await apiRequest("GET", ENDPOINTS.auth.status, null, "json", token);
      return response?.data || response;
    } catch (error) {
      return rejectWithValue(normalizeError(error, "Unable to fetch auth status"));
    }
  }
);

export const fetchSellerWebStatus = createAsyncThunk(
  "seller/fetchSellerWebStatus",
  async (_payload = {}, { rejectWithValue }) => {
    try {
      const response = await apiRequest("GET", ENDPOINTS.sellers.myStatus);
      return response;
    } catch (error) {
      return rejectWithValue(normalizeError(error, "Unable to fetch seller status"));
    }
  }
);

const sellerSlice = createSlice({
  name: "seller",
  initialState: {
    loading: false,
    error: null,
    success: null,
    onboardingRequired: !!localStorage.getItem(ONBOARDING_TOKEN_KEY),
    onboardingToken: localStorage.getItem(ONBOARDING_TOKEN_KEY) || null,
    onboardingUser: getStoredJson(ONBOARDING_USER_KEY),
    flowState: getStoredJson(AUTH_FLOW_STATE_KEY),
    authMode: localStorage.getItem(AUTH_MODE_KEY) || null,
    kycSubmitted: false,
    profileSubmitted: false,
    statusData: null,
  },
  reducers: {
    startSellerOnboarding(state, action) {
      const token = action.payload?.onboardingToken || null;
      const user = action.payload?.user || null;
      const flowState = action.payload?.flowState || null;
      state.onboardingRequired = !!token;
      state.onboardingToken = token;
      state.onboardingUser = user;
      state.flowState = flowState;
      state.authMode = "onboarding";
      state.error = null;
      state.success = null;
      state.kycSubmitted = false;
      state.profileSubmitted = false;
      if (token) {
        localStorage.setItem(ONBOARDING_TOKEN_KEY, token);
      }
      if (user) {
        localStorage.setItem(ONBOARDING_USER_KEY, JSON.stringify(user));
      }
      if (flowState) {
        localStorage.setItem(AUTH_FLOW_STATE_KEY, JSON.stringify(flowState));
      }
      localStorage.setItem(AUTH_MODE_KEY, "onboarding");
      localStorage.removeItem("accessToken");
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
    startAuthenticatedSession(state, action) {
      const accessToken = action.payload?.accessToken || null;
      const refreshToken = action.payload?.refreshToken || null;
      const flowState = action.payload?.flowState || null;
      state.onboardingRequired = false;
      state.onboardingToken = null;
      state.onboardingUser = null;
      state.flowState = flowState;
      state.authMode = "authenticated";
      if (accessToken) localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      if (flowState) localStorage.setItem(AUTH_FLOW_STATE_KEY, JSON.stringify(flowState));
      localStorage.setItem(AUTH_MODE_KEY, "authenticated");
      localStorage.removeItem(ONBOARDING_TOKEN_KEY);
      localStorage.removeItem(ONBOARDING_USER_KEY);
    },
    completeSellerOnboarding(state) {
      state.onboardingRequired = false;
      state.onboardingToken = null;
      state.onboardingUser = null;
      state.kycSubmitted = true;
      state.profileSubmitted = true;
      state.error = null;
      state.success = "Onboarding completed and sent for review";
      localStorage.removeItem(ONBOARDING_TOKEN_KEY);
      localStorage.removeItem(ONBOARDING_USER_KEY);
      localStorage.removeItem(AUTH_MODE_KEY);
    },
    clearSellerOnboarding(state) {
      state.onboardingRequired = false;
      state.onboardingToken = null;
      state.onboardingUser = null;
      state.flowState = null;
      state.authMode = null;
      state.kycSubmitted = false;
      state.profileSubmitted = false;
      state.error = null;
      state.success = null;
      localStorage.removeItem(ONBOARDING_TOKEN_KEY);
      localStorage.removeItem(ONBOARDING_USER_KEY);
      localStorage.removeItem(AUTH_FLOW_STATE_KEY);
      localStorage.removeItem(AUTH_MODE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
    clearSellerStatus(state) {
      state.error = null;
      state.success = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitSellerKyc.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitSellerKyc.fulfilled, (state, action) => {
        state.loading = false;
        state.kycSubmitted = true;
        state.success = action.payload?.message || "KYC submitted successfully";
      })
      .addCase(submitSellerKyc.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || action.payload || action.error.message;
      })
      .addCase(updateSellerOnboardingProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSellerOnboardingProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profileSubmitted = true;
        state.success = action.payload?.message || "Profile submitted successfully";
      })
      .addCase(updateSellerOnboardingProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || action.payload || action.error.message;
      })
      .addCase(fetchAuthStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        if (!action.payload) return;
        state.flowState = action.payload;
        state.kycSubmitted = !!action.payload?.checklist?.kycSubmitted;
        state.profileSubmitted = !!action.payload?.checklist?.profileCompleted;
        const requiresOnboarding = !!action.payload?.requiresOnboarding;
        state.onboardingRequired = requiresOnboarding;
        state.authMode = requiresOnboarding ? "onboarding" : "authenticated";
        localStorage.setItem(AUTH_MODE_KEY, state.authMode);
        localStorage.setItem(AUTH_FLOW_STATE_KEY, JSON.stringify(action.payload));
        if (!requiresOnboarding) {
          state.onboardingToken = null;
          state.onboardingUser = null;
          localStorage.removeItem(ONBOARDING_TOKEN_KEY);
          localStorage.removeItem(ONBOARDING_USER_KEY);
        }
      })
      .addCase(fetchAuthStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || action.payload || action.error.message;
      })
      .addCase(fetchSellerWebStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSellerWebStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.statusData = action.payload?.data || action.payload;
      })
      .addCase(fetchSellerWebStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || action.payload || action.error.message;
      });
  },
});

export const {
  startSellerOnboarding,
  startAuthenticatedSession,
  completeSellerOnboarding,
  clearSellerOnboarding,
  clearSellerStatus,
} = sellerSlice.actions;

export default sellerSlice.reducer;
