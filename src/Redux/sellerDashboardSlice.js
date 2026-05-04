import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  sellerDashboardData: {},
};

export const getSellerDashboard = createApiThunkPrivate(
  "sellerDashboard/getSellerDashboard",
  ENDPOINTS.dashboard.overview,
  "GET",
  true
);

const sellerDashboardSlice = createSlice({
  name: "sellerDashboard",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, getSellerDashboard, "sellerDashboardData");
  },
});

export default sellerDashboardSlice.reducer;
