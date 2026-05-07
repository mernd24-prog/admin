import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  sellerDashboardData: {},
};

export const getSellerDashboard = createApiThunkPrivate(
  "sellerDashboard/getSellerDashboard",
  ENDPOINTS.sellers.dashboard,
  "GET",
  true,
  {
    transformParams: (params = {}) => ({
      ...(params.fromDate ? { fromDate: params.fromDate } : {}),
      ...(params.toDate ? { toDate: params.toDate } : {}),
    }),
  }
);

const sellerDashboardSlice = createSlice({
  name: "sellerDashboard",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, getSellerDashboard, "sellerDashboardData");
  },
});

export default sellerDashboardSlice.reducer;
