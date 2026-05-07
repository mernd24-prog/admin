import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { apiRequest } from "../_helpers/apiConfig";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  submitSellerKycData: {},
  updateOnboardingProfileData: {},
};

const getOnboardingToken = (payload = {}, state = {}) =>
  payload?.onboardingToken ||
  state?.seller?.onboardingToken ||
  localStorage.getItem("sellerOnboardingToken");

const withoutToken = (payload = {}) => {
  const { onboardingToken, ...body } = payload || {};
  return body;
};

export const submitSellerKycDetails = createAsyncThunk(
  "sellerOnboarding/submitSellerKycDetails",
  async (payload = {}, { rejectWithValue, getState }) => {
    try {
      return await apiRequest(
        "POST",
        ENDPOINTS.sellers.onboardingKyc,
        withoutToken(payload),
        "json",
        getOnboardingToken(payload, getState())
      );
    } catch (error) {
      return rejectWithValue(error?.message || error);
    }
  }
);

export const updateSellerOnboardingDetails = createAsyncThunk(
  "sellerOnboarding/updateSellerOnboardingDetails",
  async (payload = {}, { rejectWithValue, getState }) => {
    try {
      return await apiRequest(
        "PATCH",
        ENDPOINTS.sellers.onboardingProfile,
        withoutToken(payload),
        "json",
        getOnboardingToken(payload, getState())
      );
    } catch (error) {
      return rejectWithValue(error?.message || error);
    }
  }
);

const sellerOnboardingSlice = createSlice({
  name: "sellerOnboarding",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, submitSellerKycDetails, "submitSellerKycData");
    createExtraReducersForThunk(
      builder,
      updateSellerOnboardingDetails,
      "updateOnboardingProfileData"
    );
  },
});

export default sellerOnboardingSlice.reducer;
