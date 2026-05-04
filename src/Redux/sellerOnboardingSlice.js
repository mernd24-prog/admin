import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  submitSellerKycData: {},
  updateOnboardingProfileData: {},
};

export const submitSellerKycDetails = createApiThunkPrivate(
  "sellerOnboarding/submitSellerKycDetails",
  ENDPOINTS.sellers.onboardingKyc,
  "POST"
);

export const updateSellerOnboardingDetails = createApiThunkPrivate(
  "sellerOnboarding/updateSellerOnboardingDetails",
  ENDPOINTS.sellers.onboardingProfile,
  "PATCH"
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
