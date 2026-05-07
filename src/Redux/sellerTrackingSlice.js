import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const trackingQueryKeys = [
  "status",
  "deliveryStatus",
  "fromDate",
  "toDate",
  "limit",
  "offset",
];

const pickQuery = (params = {}) =>
  trackingQueryKeys.reduce((acc, key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") acc[key] = value;
    return acc;
  }, {});

const initialState = {
  sellerTrackingListData: {},
  sellerTrackingDetailData: {},
};

export const listSellerTracking = createApiThunkPrivate(
  "sellerTracking/listSellerTracking",
  ENDPOINTS.sellers.tracking,
  "GET",
  true,
  { transformParams: pickQuery }
);

export const getSellerTrackingDetail = createApiThunkPrivate(
  "sellerTracking/getSellerTrackingDetail",
  (payload) => ENDPOINTS.sellers.trackingOrder(payload?.orderId || payload?.id || payload?.order_no),
  "GET"
);

const sellerTrackingSlice = createSlice({
  name: "sellerTracking",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, listSellerTracking, "sellerTrackingListData");
    createExtraReducersForThunk(builder, getSellerTrackingDetail, "sellerTrackingDetailData");
  },
});

export default sellerTrackingSlice.reducer;
