import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";
import { DEFAULT_SELLER_MODULES, firstId, normalizeAllowedModules, toSubAdminCreateBody } from "../_helpers/adminApi";

const initialState = {
  listSubAdminsData: {},
  createSubAdminData: {},
  updateSubAdminModulesData: {},
};

export const listSellerSubAdmins = createApiThunkPrivate(
  "sellerSubAdmins/listSellerSubAdmins",
  ENDPOINTS.sellers.subAdmins,
  "GET"
);

export const createSellerSubAdmin = createApiThunkPrivate(
  "sellerSubAdmins/createSellerSubAdmin",
  ENDPOINTS.sellers.subAdmins,
  "POST",
  false,
  { transformBody: (payload = {}) => toSubAdminCreateBody(payload, DEFAULT_SELLER_MODULES) }
);

export const updateSellerSubAdminModules = createApiThunkPrivate(
  "sellerSubAdmins/updateSellerSubAdminModules",
  (payload) => ENDPOINTS.sellers.subAdminModules(firstId(payload)),
  "PATCH",
  false,
  {
    transformBody: (payload = {}) => ({
      allowedModules: normalizeAllowedModules(payload.allowedModules, DEFAULT_SELLER_MODULES),
      ...(Array.isArray(payload.modulePermissions)
        ? { modulePermissions: payload.modulePermissions }
        : {}),
    }),
  }
);

const sellerSubAdminsSlice = createSlice({
  name: "sellerSubAdmins",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, listSellerSubAdmins, "listSubAdminsData");
    createExtraReducersForThunk(builder, createSellerSubAdmin, "createSubAdminData");
    createExtraReducersForThunk(
      builder,
      updateSellerSubAdminModules,
      "updateSubAdminModulesData"
    );
  },
});

export default sellerSubAdminsSlice.reducer;
