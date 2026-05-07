import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  sellerAnalyticsData: {},
};

export const getSellerAnalytics = createApiThunkPrivate(
  "sellerAnalytics/getSellerAnalytics",
  ENDPOINTS.analytics.seller,
  "GET",
  true
);

const sellerAnalyticsSlice = createSlice({
  name: "sellerAnalytics",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, getSellerAnalytics, "sellerAnalyticsData");
  },
});

export default sellerAnalyticsSlice.reducer;
