import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../_helpers/apiConfig';
import { ENDPOINTS } from '../_helpers/endpoints';

const splitFullName = (fullName = "") => {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || "User",
    lastName: parts.join(" ") || "User",
  };
};

const isUrl = (value) => {
  try {
    return Boolean(value) && Boolean(new URL(value));
  } catch {
    return false;
  }
};

const toProfileUpdateBody = (payload = {}) => {
  const profile = payload.profile || {};
  const nameParts = splitFullName(
    payload.full_name ||
    payload.fullName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ")
  );
  const avatarUrl = payload.user_image || payload.avatarUrl || profile.avatarUrl;

  return {
    profile: {
      firstName: profile.firstName || nameParts.firstName,
      lastName: profile.lastName || nameParts.lastName,
      ...(isUrl(avatarUrl) ? { avatarUrl } : {}),
    },
  };
};

export const adminLogin = createAsyncThunk("user/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await apiRequest('POST', ENDPOINTS.auth.login, credentials);

    if (!response.data || !response.data.token) {
      throw new Error(response.message || 'Invalid credentials');
    }
    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Login failed');
  }
});

export const forgotPassword = createAsyncThunk("admin/forgotPassword", async (filters) => {
  const response = await apiRequest('POST', ENDPOINTS.auth.forgotPassword, filters);
  return response;
});

export const updatePasswordAdmin = createAsyncThunk(
  "admin/updatePasswordAdmin",
  async (_filters, { rejectWithValue }) =>
    rejectWithValue(
      "Admin password reset for another user is not available in the backend. Use the forgot/reset password flow.",
    ),
);



export const verifyOtp = createAsyncThunk("admin/forgotPassOTPVerify", async (filters) => {
  const response = await apiRequest('POST', ENDPOINTS.auth.verifyOtp, {
    ...filters,
    purpose: filters?.purpose || "forgot_password",
  });
  return response;
});




export const resetPassword = createAsyncThunk("admin/setNewPassword", async (filters) => {
  const response = await apiRequest('POST', ENDPOINTS.auth.resetPassword, {
    ...filters,
    newPassword: filters?.newPassword || filters?.password,
  });
  return response;
});

export const getProfile = createAsyncThunk("admin/getProfile", async (filters) => {
  const response = await apiRequest('GET', ENDPOINTS.auth.me, filters);
  return response;
});

export const updateProfile = createAsyncThunk("admin/update-profile", async (filters) => {
  const response = await apiRequest('PATCH', ENDPOINTS.auth.me, toProfileUpdateBody(filters));
  return response;
});





const authSlice = createSlice({
  name: 'auth',
  initialState: {

    total: null,
    loading: false,
    error: null,
    profileData: []
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder


      .addCase(getProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profileData = action?.payload?.data;
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })




      .addCase(adminLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        localStorage.setItem('accessToken', action.payload.data.token);
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })

      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
  },
});


// Export the actions and reducer
export const { logout } = authSlice.actions;
export default authSlice.reducer;
