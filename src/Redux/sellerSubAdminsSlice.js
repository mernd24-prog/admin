import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";
import { DEFAULT_SELLER_MODULES, firstId, normalizeAllowedModules, toSubAdminCreateBody } from "../_helpers/adminApi";
import { getSelectedSellerOrganizationId } from "../_helpers/sellerOrganizationContext";

const withActiveOrg = (keys = []) => (payload = {}) => {
  const base = keys.reduce((acc, key) => {
    const v = payload?.[key];
    if (v !== undefined && v !== null && v !== "") acc[key] = v;
    return acc;
  }, {});
  const organizationId = payload?.organizationId || getSelectedSellerOrganizationId();
  return organizationId ? { ...base, organizationId } : base;
};

const initialState = {
  listSubAdminsData: {},
  createSubAdminData: {},
  updateSubAdminModulesData: {},
  updateSubAdminStatusData: {},
  deleteSubAdminData: {},
  hierarchyData: {},
};

export const listSellerSubAdmins = createApiThunkPrivate(
  "sellerSubAdmins/listSellerSubAdmins",
  ENDPOINTS.sellers.subAdmins,
  "GET",
  true,
  { transformParams: withActiveOrg(["limit", "q", "search"]) }
);

export const getSellerSubAdminHierarchy = createApiThunkPrivate(
  "sellerSubAdmins/getSellerSubAdminHierarchy",
  ENDPOINTS.sellers.subAdmins,
  "GET",
  true,
  {
    transformParams: (params = {}) => {
      const organizationId = params?.organizationId || getSelectedSellerOrganizationId();
      return {
        hierarchy: true,
        ...(params.limit ? { limit: params.limit } : {}),
        ...(params.q || params.search ? { q: params.q || params.search } : {}),
        ...(organizationId ? { organizationId } : {}),
      };
    },
  }
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

export const updateSellerSubAdminStatus = createApiThunkPrivate(
  "sellerSubAdmins/updateSellerSubAdminStatus",
  (payload) => ENDPOINTS.sellers.subAdminStatus(firstId(payload)),
  "PATCH",
  false,
  {
    transformBody: (payload = {}) => ({
      accountStatus: payload.accountStatus || payload.status,
    }),
  }
);

export const deleteSellerSubAdmin = createApiThunkPrivate(
  "sellerSubAdmins/deleteSellerSubAdmin",
  (payload) => ENDPOINTS.sellers.subAdmin(firstId(payload)),
  "DELETE",
  false
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
    createExtraReducersForThunk(
      builder,
      updateSellerSubAdminStatus,
      "updateSubAdminStatusData"
    );
    createExtraReducersForThunk(builder, deleteSellerSubAdmin, "deleteSubAdminData");
    createExtraReducersForThunk(builder, getSellerSubAdminHierarchy, "hierarchyData");
  },
});

export default sellerSubAdminsSlice.reducer;
