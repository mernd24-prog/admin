import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";
import { getSelectedSellerOrganizationId } from "../_helpers/sellerOrganizationContext";

const initialState = {
  listSellerProductsData: {},
  getSellerProductDetailsData: {},
  createSellerProductData: {},
  updateSellerProductData: {},
  deleteSellerProductData: {},
};

export const listSellerProducts = createApiThunkPrivate(
  "sellerProducts/listSellerProducts",
  ENDPOINTS.products.sellerMine,
  "GET",
  true,
  {
    transformParams: (params = {}) => {
      const organizationId = params.organizationId || getSelectedSellerOrganizationId();
      return {
        ...params,
        ...(organizationId ? { organizationId } : {}),
      };
    },
  }
);

export const getSellerProductDetails = createApiThunkPrivate(
  "sellerProducts/getSellerProductDetails",
  (payload) => ENDPOINTS.products.detail(payload?.productId || payload?.id || payload?._id),
  "GET"
);

export const createSellerProduct = createApiThunkPrivate(
  "sellerProducts/createSellerProduct",
  ENDPOINTS.products.list,
  "POST"
);

export const updateSellerProduct = createApiThunkPrivate(
  "sellerProducts/updateSellerProduct",
  (payload) => ENDPOINTS.products.detail(payload?.productId || payload?.id || payload?._id),
  "PATCH"
);

export const deleteSellerProduct = createApiThunkPrivate(
  "sellerProducts/deleteSellerProduct",
  (payload) => ENDPOINTS.products.detail(payload?.productId || payload?.id || payload?._id),
  "DELETE"
);

const sellerProductsSlice = createSlice({
  name: "sellerProducts",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, listSellerProducts, "listSellerProductsData");
    createExtraReducersForThunk(
      builder,
      getSellerProductDetails,
      "getSellerProductDetailsData"
    );
    createExtraReducersForThunk(builder, createSellerProduct, "createSellerProductData");
    createExtraReducersForThunk(builder, updateSellerProduct, "updateSellerProductData");
    createExtraReducersForThunk(builder, deleteSellerProduct, "deleteSellerProductData");
  },
});

export default sellerProductsSlice.reducer;
