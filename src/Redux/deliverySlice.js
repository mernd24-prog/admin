import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  serviceabilityData: {},
  getOrderEwayBillData: {},
  createOrderEwayBillData: {},
  updateEwayBillStatusData: {},
};

export const getDeliveryServiceabilityForSeller = createApiThunkPrivate(
  "delivery/getDeliveryServiceabilityForSeller",
  ENDPOINTS.delivery.serviceability,
  "GET",
  true
);

export const getSellerOrderEwayBill = createApiThunkPrivate(
  "delivery/getSellerOrderEwayBill",
  (payload) => ENDPOINTS.delivery.orderEwayBill(payload?.orderId || payload?.id),
  "GET"
);

export const createSellerOrderEwayBill = createApiThunkPrivate(
  "delivery/createSellerOrderEwayBill",
  (payload) => ENDPOINTS.delivery.orderEwayBill(payload?.orderId || payload?.id),
  "POST"
);

export const updateSellerEwayBillStatus = createApiThunkPrivate(
  "delivery/updateSellerEwayBillStatus",
  (payload) => ENDPOINTS.delivery.ewayBillStatus(payload?.ewayBillId || payload?.id),
  "PATCH"
);

const deliverySlice = createSlice({
  name: "delivery",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, getDeliveryServiceabilityForSeller, "serviceabilityData");
    createExtraReducersForThunk(builder, getSellerOrderEwayBill, "getOrderEwayBillData");
    createExtraReducersForThunk(builder, createSellerOrderEwayBill, "createOrderEwayBillData");
    createExtraReducersForThunk(builder, updateSellerEwayBillStatus, "updateEwayBillStatusData");
  },
});

export default deliverySlice.reducer;
