import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  listSellerOrdersData: {},
  getSellerOrderDetailsData: {},
  updateSellerOrderStatusData: {},
  cancelSellerOrderData: {},
};

export const listSellerOrders = createApiThunkPrivate(
  "sellerOrders/listSellerOrders",
  ENDPOINTS.orders.sellerMine,
  "GET",
  true
);

export const getSellerOrderDetails = createApiThunkPrivate(
  "sellerOrders/getSellerOrderDetails",
  (payload) => ENDPOINTS.orders.detail(payload?.orderId || payload?.id || payload?.order_no),
  "GET"
);

export const updateSellerOrderStatus = createApiThunkPrivate(
  "sellerOrders/updateSellerOrderStatus",
  (payload) => ENDPOINTS.orders.status(payload?.orderId || payload?.id || payload?.order_no),
  "PATCH"
);

export const cancelSellerOrder = createApiThunkPrivate(
  "sellerOrders/cancelSellerOrder",
  (payload) => ENDPOINTS.orders.cancel(payload?.orderId || payload?.id || payload?.order_no),
  "POST"
);

const sellerOrdersSlice = createSlice({
  name: "sellerOrders",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, listSellerOrders, "listSellerOrdersData");
    createExtraReducersForThunk(builder, getSellerOrderDetails, "getSellerOrderDetailsData");
    createExtraReducersForThunk(builder, updateSellerOrderStatus, "updateSellerOrderStatusData");
    createExtraReducersForThunk(builder, cancelSellerOrder, "cancelSellerOrderData");
  },
});

export default sellerOrdersSlice.reducer;
