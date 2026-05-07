import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  getSellerProfileData: {},
  updateSellerProfileData: {},
  updateBusinessAddressData: {},
  updatePickupAddressData: {},
  updateBankDetailsData: {},
  updateMoreInfoData: {},
  updateSellerSettingsData: {},
};

export const getSellerProfile = createApiThunkPrivate(
  "sellerProfile/getSellerProfile",
  ENDPOINTS.sellers.profile,
  "GET"
);

export const updateSellerProfile = createApiThunkPrivate(
  "sellerProfile/updateSellerProfile",
  ENDPOINTS.sellers.profile,
  "PATCH"
);

export const updateSellerBusinessAddress = createApiThunkPrivate(
  "sellerProfile/updateSellerBusinessAddress",
  ENDPOINTS.sellers.businessAddress,
  "PATCH"
);

export const updateSellerPickupAddress = createApiThunkPrivate(
  "sellerProfile/updateSellerPickupAddress",
  ENDPOINTS.sellers.pickupAddress,
  "PATCH"
);

export const updateSellerBankDetails = createApiThunkPrivate(
  "sellerProfile/updateSellerBankDetails",
  ENDPOINTS.sellers.bankDetails,
  "PATCH"
);

export const updateSellerMoreInfo = createApiThunkPrivate(
  "sellerProfile/updateSellerMoreInfo",
  ENDPOINTS.sellers.moreInfo,
  "PATCH"
);

export const updateSellerSettings = createApiThunkPrivate(
  "sellerProfile/updateSellerSettings",
  ENDPOINTS.sellers.settings,
  "PATCH"
);

const sellerProfileSlice = createSlice({
  name: "sellerProfile",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, getSellerProfile, "getSellerProfileData");
    createExtraReducersForThunk(builder, updateSellerProfile, "updateSellerProfileData");
    createExtraReducersForThunk(builder, updateSellerBusinessAddress, "updateBusinessAddressData");
    createExtraReducersForThunk(builder, updateSellerPickupAddress, "updatePickupAddressData");
    createExtraReducersForThunk(builder, updateSellerBankDetails, "updateBankDetailsData");
    createExtraReducersForThunk(builder, updateSellerMoreInfo, "updateMoreInfoData");
    createExtraReducersForThunk(builder, updateSellerSettings, "updateSellerSettingsData");
  },
});

export default sellerProfileSlice.reducer;
