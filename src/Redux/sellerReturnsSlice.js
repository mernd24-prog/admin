import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  myReturnsData: {},
  orderReturnData: {},
  approveReturnData: {},
  refundReturnData: {},
};

export const getMyReturns = createApiThunkPrivate(
  "sellerReturns/getMyReturns",
  ENDPOINTS.returns.mine,
  "GET",
  true
);

export const getReturnByOrder = createApiThunkPrivate(
  "sellerReturns/getReturnByOrder",
  (payload) => ENDPOINTS.returns.byOrder(payload?.orderId || payload?.id),
  "GET"
);

export const approveReturn = createApiThunkPrivate(
  "sellerReturns/approveReturn",
  (payload) => ENDPOINTS.returns.approve(payload?.returnId || payload?.id),
  "POST"
);

export const refundReturn = createApiThunkPrivate(
  "sellerReturns/refundReturn",
  (payload) => ENDPOINTS.returns.refund(payload?.returnId || payload?.id),
  "POST"
);

const sellerReturnsSlice = createSlice({
  name: "sellerReturns",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, getMyReturns, "myReturnsData");
    createExtraReducersForThunk(builder, getReturnByOrder, "orderReturnData");
    createExtraReducersForThunk(builder, approveReturn, "approveReturnData");
    createExtraReducersForThunk(builder, refundReturn, "refundReturnData");
  },
});

export default sellerReturnsSlice.reducer;
