import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../_helpers/apiConfig';

export const adminLogin = createAsyncThunk("user/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await apiRequest('POST', '/auth/login', credentials);

    if (!response.data || !response.data.token) {
      throw new Error(response.message || 'Invalid credentials');
    }
    return response;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || error.message || 'Login failed');
  }
});

export const forgotPassword = createAsyncThunk("admin/forgotPassword", async (filters) => {
  const response = await apiRequest('POST', '/auth/forgotPassword', filters);
  return response;
});



//updatePassword
export const updatePasswordAdmin = createAsyncThunk("admin/updatePasswordAdmin", async (filters) => {
  const response = await apiRequest('POST', '/v1/admin/updatePasswordAdmin', filters);
  return response;
});



export const verifyOtp = createAsyncThunk("admin/forgotPassOTPVerify", async (filters) => {
  const response = await apiRequest('POST', '/auth/verifyForgotPasswordOtp', filters);
  return response;
});




export const resetPassword = createAsyncThunk("admin/setNewPassword", async (filters) => {
  const response = await apiRequest('POST', '/auth/setNewPassword', filters);
  return response;
});

export const getProfile = createAsyncThunk("admin/getProfile", async (filters) => {
  const response = await apiRequest('GET', '/users/me', filters);
  return response;
});

export const updateProfile = createAsyncThunk("admin/update-profile", async (filters) => {
  const response = await apiRequest('POST', '/auth/update-profile', filters);
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
