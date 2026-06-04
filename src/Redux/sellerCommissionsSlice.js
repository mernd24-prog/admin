import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  myCommissionsData: {},
  myPayoutsData: {},
  financeSummaryData: {},
  adminCommissionsData: {},
  adminPayoutsData: {},
  settlementsData: {},
  calculateCommissionData: {},
  processPayoutsData: {},
  completePayoutData: {},
  failPayoutData: {},
};

const pickQuery = (keys = []) => (payload = {}) =>
  keys.reduce((acc, key) => {
    const value = payload?.[key];
    if (value !== undefined && value !== null && value !== "") acc[key] = value;
    return acc;
  }, {});

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

export const getSellerFinanceSummary = createApiThunkPrivate(
  "sellerCommissions/getSellerFinanceSummary",
  ENDPOINTS.payouts.summary,
  "GET",
  true,
  { transformParams: pickQuery(["sellerId", "fromDate", "toDate"]) }
);

export const getAdminSellerCommissions = createApiThunkPrivate(
  "sellerCommissions/getAdminSellerCommissions",
  ENDPOINTS.payouts.commissions,
  "GET",
  true,
  { transformParams: pickQuery(["sellerId", "status", "orderId", "payoutId", "search", "fromDate", "toDate", "limit", "offset"]) }
);

export const getAdminSellerPayouts = createApiThunkPrivate(
  "sellerCommissions/getAdminSellerPayouts",
  ENDPOINTS.payouts.sellerPayouts,
  "GET",
  true,
  { transformParams: pickQuery(["sellerId", "status", "payoutId", "search", "fromDate", "toDate", "limit", "offset"]) }
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

export const completeSellerPayout = createApiThunkPrivate(
  "sellerCommissions/completeSellerPayout",
  (payload) => ENDPOINTS.payouts.complete(payload?.payoutId || payload?.id),
  "POST",
  false,
  { transformBody: (payload = {}) => ({ paymentReference: payload.paymentReference, paymentMethod: payload.paymentMethod, notes: payload.notes }) }
);

export const failSellerPayout = createApiThunkPrivate(
  "sellerCommissions/failSellerPayout",
  (payload) => ENDPOINTS.payouts.fail(payload?.payoutId || payload?.id),
  "POST",
  false,
  { transformBody: (payload = {}) => ({ reason: payload.reason }) }
);

const sellerCommissionsSlice = createSlice({
  name: "sellerCommissions",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, getSellerCommissions, "myCommissionsData");
    createExtraReducersForThunk(builder, getSellerPayouts, "myPayoutsData");
    createExtraReducersForThunk(builder, getSellerFinanceSummary, "financeSummaryData");
    createExtraReducersForThunk(builder, getAdminSellerCommissions, "adminCommissionsData");
    createExtraReducersForThunk(builder, getAdminSellerPayouts, "adminPayoutsData");
    createExtraReducersForThunk(builder, getSellerSettlements, "settlementsData");
    createExtraReducersForThunk(builder, calculateSellerCommission, "calculateCommissionData");
    createExtraReducersForThunk(builder, processSellerPayouts, "processPayoutsData");
    createExtraReducersForThunk(builder, completeSellerPayout, "completePayoutData");
    createExtraReducersForThunk(builder, failSellerPayout, "failPayoutData");
  },
});

export default sellerCommissionsSlice.reducer;
