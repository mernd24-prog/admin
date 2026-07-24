import { createSlice } from "@reduxjs/toolkit";
import {
  createApiThunkPrivate,
  createExtraReducersForThunk,
} from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";
import { toListParams } from "../_helpers/adminApi";

const initialState = {
  getInventoryListData: {},
  getInventoryDetailData: {},
  bulkUpdateInventoryData: {},
  adjustInventoryData: {},
};

export const getInventoryList = createApiThunkPrivate(
  "inventory/getInventoryList",
  ENDPOINTS.inventory.variants,
  "GET",
  true,
  {
    transformParams: (params = {}) => ({
      ...toListParams(params),
      ...(params.stockStatus
        ? { stockStatus: params.stockStatus }
        : {}),
      ...(params.variantStatus
        ? { variantStatus: params.variantStatus }
        : {}),
      ...(params.status
        ? { status: params.status }
        : {}),
    }),
  },
);

export const getInventoryDetail = createApiThunkPrivate(
  "inventory/getInventoryDetail",
  (payload = {}) =>
    ENDPOINTS.inventory.product(
      payload.productId || payload.id,
    ),
  "GET",
  true,
);

export const bulkUpdateInventory = createApiThunkPrivate(

    "inventory/bulkUpdateInventory",

    (payload) =>
      ENDPOINTS.inventory.adjustVariant(
        payload.productId,
         payload.updates?.[0]?.variantSku, 
      ),

    "PATCH",
    false,
  {
    transformBody: (payload = {}) => ({
      updates: Array.isArray(payload.updates)
        ? payload.updates.map((item) => ({
            productId: item.productId,
            ...(item.variantId
              ? { variantId: item.variantId }
              : {}),
            ...(item.variantSku
              ? { variantSku: item.variantSku }
              : {}),
            adjustmentType:
              item.adjustmentType || "set",
            quantity: Number(item.quantity),
            reason:
              item.reason ||
              "Inventory Excel update",
            note:
              item.note ||
              "Stock updated through inventory manager",
          }))
        : [],
    }),
  },
);

export const adjustInventory = createApiThunkPrivate(
  "inventory/adjustInventory",
  (payload) =>
    ENDPOINTS.inventory.adjustVariant(
      payload.productId,
      payload.variantSku,
    ),
  "PATCH",
  false,
  {
    transformBody: (payload = {}) => ({
      adjustmentType: payload.adjustmentType || "set",
      quantity: Number(payload.quantity),
      reason: payload.reason || "Inventory Excel update",
      note:
        payload.note ||
        "Stock updated through inventory manager",
    }),
  },
);

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    createExtraReducersForThunk(
      builder,
      getInventoryList,
      "getInventoryListData",
    );

    createExtraReducersForThunk(
      builder,
      getInventoryDetail,
      "getInventoryDetailData",
    );

    createExtraReducersForThunk(
      builder,
      bulkUpdateInventory,
      "bulkUpdateInventoryData",
    );

    createExtraReducersForThunk(
      builder,
      adjustInventory,
      "adjustInventoryData",
    );
  },
});

export default inventorySlice.reducer;