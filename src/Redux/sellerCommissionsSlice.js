import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  myCommissionsData: {},
  myPayoutsData: {},
  settlementsData: {},
  calculateCommissionData: {},
  processPayoutsData: {},
};

export const getSellerCommissions = createApiThunkPrivate(
  "sellerCommissions/getSellerCommissions",
  ENDPOINTS.payouts.myCommissions,
  "GET",
  true
);

export const getSellerPayouts = createApiThunkPrivate(
  "sellerCommissions/getSellerPayouts",
  ENDPOINTS.payouts.myPayouts,
  "GET",
  true
);

export const getSellerSettlements = createApiThunkPrivate(
  "sellerCommissions/getSellerSettlements",
  ENDPOINTS.payouts.settlements,
  "GET",
  true
);

export const calculateSellerCommission = createApiThunkPrivate(
  "sellerCommissions/calculateSellerCommission",
  (payload) => ENDPOINTS.payouts.calculate(payload?.orderId || payload?.id),
  "POST",
  false,
  { transformBody: () => undefined }
);

export const processSellerPayouts = createApiThunkPrivate(
  "sellerCommissions/processSellerPayouts",
  ENDPOINTS.payouts.process,
  "POST"
);

const sellerCommissionsSlice = createSlice({
  name: "sellerCommissions",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, getSellerCommissions, "myCommissionsData");
    createExtraReducersForThunk(builder, getSellerPayouts, "myPayoutsData");
    createExtraReducersForThunk(builder, getSellerSettlements, "settlementsData");
    createExtraReducersForThunk(builder, calculateSellerCommission, "calculateCommissionData");
    createExtraReducersForThunk(builder, processSellerPayouts, "processPayoutsData");
  },
});

export default sellerCommissionsSlice.reducer;
