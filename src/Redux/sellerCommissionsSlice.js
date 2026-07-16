import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";
import { getSelectedSellerOrganizationId } from "../_helpers/sellerOrganizationContext";

const initialState = {
  myCommissionsData: {},
  myPayoutsData: {},
  mySettlementsData: {},
  financeSummaryData: {},
  adminCommissionsData: {},
  adminPayoutsData: {},
  settlementsData: {},
  walletSummaryData: {},
  payoutOperationsQueueData: {},
  negativeBalancesData: {},
  calculateCommissionData: {},
  processPayoutsData: {},
  completePayoutData: {},
  failPayoutData: {},
  approvePayoutData: {},
  holdPayoutData: {},
  releasePayoutHoldData: {},
  retryPayoutData: {},
  resolveNegativeBalanceData: {},
};

const pickQuery = (keys = []) => (payload = {}) =>
  keys.reduce((acc, key) => {
    const value = payload?.[key];
    if (value !== undefined && value !== null && value !== "") acc[key] = value;
    return acc;
  }, {});

const withSelectedOrganization = (keys = []) => (payload = {}) => {
  const base = pickQuery(keys)(payload);
  const organizationId = payload.organizationId || getSelectedSellerOrganizationId();
  return organizationId ? { ...base, organizationId } : base;
};

export const getSellerCommissions = createApiThunkPrivate(
  "sellerCommissions/getSellerCommissions",
  ENDPOINTS.payouts.myCommissions,
  "GET",
  true,
  { transformParams: withSelectedOrganization(["status", "orderId", "payoutId", "search", "fromDate", "toDate", "limit", "offset"]) }
);

export const getSellerPayouts = createApiThunkPrivate(
  "sellerCommissions/getSellerPayouts",
  ENDPOINTS.payouts.myPayouts,
  "GET",
  true,
  { transformParams: withSelectedOrganization(["status", "payoutId", "search", "fromDate", "toDate", "limit", "offset"]) }
);

export const getMySellerSettlements = createApiThunkPrivate(
  "sellerCommissions/getMySellerSettlements",
  ENDPOINTS.payouts.mySettlements,
  "GET",
  true,
  { transformParams: withSelectedOrganization(["status", "payoutId", "search", "fromDate", "toDate", "limit", "offset"]) }
);

export const getSellerSettlements = createApiThunkPrivate(
  "sellerCommissions/getSellerSettlements",
  ENDPOINTS.payouts.settlements,
  "GET",
  true,
  { transformParams: withSelectedOrganization(["sellerId", "status", "fromDate", "toDate", "limit", "offset"]) }
);

export const getSellerFinanceSummary = createApiThunkPrivate(
  "sellerCommissions/getSellerFinanceSummary",
  ENDPOINTS.payouts.summary,
  "GET",
  true,
  { transformParams: withSelectedOrganization(["sellerId", "fromDate", "toDate"]) }
);

export const getAdminSellerCommissions = createApiThunkPrivate(
  "sellerCommissions/getAdminSellerCommissions",
  ENDPOINTS.payouts.commissions,
  "GET",
  true,
  { transformParams: pickQuery(["sellerId", "organizationId", "status", "orderId", "payoutId", "search", "fromDate", "toDate", "limit", "offset"]) }
);

export const getAdminSellerPayouts = createApiThunkPrivate(
  "sellerCommissions/getAdminSellerPayouts",
  ENDPOINTS.payouts.sellerPayouts,
  "GET",
  true,
  { transformParams: pickQuery(["sellerId", "organizationId", "status", "payoutId", "search", "fromDate", "toDate", "limit", "offset"]) }
);

export const getSellerWalletSummary = createApiThunkPrivate(
  "sellerCommissions/getSellerWalletSummary",
  (payload) => ENDPOINTS.payouts.sellerWallet(payload?.sellerId || payload?.id),
  "GET",
  true,
  { transformParams: pickQuery(["organizationId", "fromDate", "toDate"]) }
);

export const getPayoutOperationsQueue = createApiThunkPrivate(
  "sellerCommissions/getPayoutOperationsQueue",
  ENDPOINTS.payouts.operationsQueue,
  "GET",
  true,
  { transformParams: pickQuery(["sellerId", "organizationId", "status", "queue", "search", "fromDate", "toDate", "limit", "offset"]) }
);

export const getNegativeBalances = createApiThunkPrivate(
  "sellerCommissions/getNegativeBalances",
  ENDPOINTS.payouts.negativeBalances,
  "GET",
  true,
  { transformParams: pickQuery(["sellerId", "organizationId", "status", "search", "limit", "offset"]) }
);

export const calculateSellerCommission = createApiThunkPrivate(
  "sellerCommissions/calculateSellerCommission",
  (payload) => ENDPOINTS.payouts.calculate(payload?.orderId || payload?.id),
  "POST",
  false,
  { transformBody: (payload = {}) => pickQuery(["organizationId"])(payload) }
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
  { transformBody: (payload = {}) => ({ paymentReference: payload.paymentReference, paymentMethod: payload.paymentMethod, notes: payload.notes || payload.note }) }
);

export const failSellerPayout = createApiThunkPrivate(
  "sellerCommissions/failSellerPayout",
  (payload) => ENDPOINTS.payouts.fail(payload?.payoutId || payload?.id),
  "POST",
  false,
  { transformBody: (payload = {}) => ({ reason: payload.reason }) }
);

export const cancelSellerPayout = createApiThunkPrivate(
  "sellerCommissions/cancelSellerPayout",
  (payload) => ENDPOINTS.payouts.cancel(payload?.payoutId || payload?.id),
  "POST",
  false,
  { transformBody: (payload = {}) => ({ reason: payload.reason }) }
);

export const approveSellerPayout = createApiThunkPrivate(
  "sellerCommissions/approveSellerPayout",
  (payload) => ENDPOINTS.payouts.approve(payload?.payoutId || payload?.id),
  "POST",
  false,
  { transformBody: (payload = {}) => ({ note: payload.note, paymentMethod: payload.paymentMethod }) }
);

export const holdSellerPayout = createApiThunkPrivate(
  "sellerCommissions/holdSellerPayout",
  (payload) => ENDPOINTS.payouts.hold(payload?.payoutId || payload?.id),
  "POST",
  false,
  { transformBody: (payload = {}) => ({ reason: payload.reason }) }
);

export const releaseSellerPayoutHold = createApiThunkPrivate(
  "sellerCommissions/releaseSellerPayoutHold",
  (payload) => ENDPOINTS.payouts.releaseHold(payload?.payoutId || payload?.id),
  "POST",
  false,
  { transformBody: (payload = {}) => ({ approve: payload.approve === true, note: payload.note }) }
);

export const retrySellerPayout = createApiThunkPrivate(
  "sellerCommissions/retrySellerPayout",
  (payload) => ENDPOINTS.payouts.retry(payload?.payoutId || payload?.id),
  "POST",
  false,
  {
    transformBody: (payload = {}) => ({
      paymentReference: payload.paymentReference,
      paymentMethod: payload.paymentMethod,
      autoProcess: payload.autoProcess === true,
    }),
  }
);

export const resolveNegativeBalance = createApiThunkPrivate(
  "sellerCommissions/resolveNegativeBalance",
  (payload) => ENDPOINTS.payouts.resolveNegativeBalance(payload?.settlementId || payload?.id),
  "POST",
  false,
  {
    transformBody: (payload = {}) => ({
      action: payload.action,
      amount: payload.amount,
      referenceId: payload.referenceId,
      note: payload.note,
    }),
  }
);

const sellerCommissionsSlice = createSlice({
  name: "sellerCommissions",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, getSellerCommissions, "myCommissionsData");
    createExtraReducersForThunk(builder, getSellerPayouts, "myPayoutsData");
    createExtraReducersForThunk(builder, getMySellerSettlements, "mySettlementsData");
    createExtraReducersForThunk(builder, getSellerFinanceSummary, "financeSummaryData");
    createExtraReducersForThunk(builder, getAdminSellerCommissions, "adminCommissionsData");
    createExtraReducersForThunk(builder, getAdminSellerPayouts, "adminPayoutsData");
    createExtraReducersForThunk(builder, getSellerSettlements, "settlementsData");
    createExtraReducersForThunk(builder, getSellerWalletSummary, "walletSummaryData");
    createExtraReducersForThunk(builder, getPayoutOperationsQueue, "payoutOperationsQueueData");
    createExtraReducersForThunk(builder, getNegativeBalances, "negativeBalancesData");
    createExtraReducersForThunk(builder, calculateSellerCommission, "calculateCommissionData");
    createExtraReducersForThunk(builder, processSellerPayouts, "processPayoutsData");
    createExtraReducersForThunk(builder, completeSellerPayout, "completePayoutData");
    createExtraReducersForThunk(builder, failSellerPayout, "failPayoutData");
    createExtraReducersForThunk(builder, cancelSellerPayout, "cancelPayoutData");
    createExtraReducersForThunk(builder, approveSellerPayout, "approvePayoutData");
    createExtraReducersForThunk(builder, holdSellerPayout, "holdPayoutData");
    createExtraReducersForThunk(builder, releaseSellerPayoutHold, "releasePayoutHoldData");
    createExtraReducersForThunk(builder, retrySellerPayout, "retryPayoutData");
    createExtraReducersForThunk(builder, resolveNegativeBalance, "resolveNegativeBalanceData");
  },
});

export default sellerCommissionsSlice.reducer;
