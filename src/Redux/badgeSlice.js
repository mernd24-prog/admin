import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

export const listBadges = createApiThunkPrivate(
  "badge/listBadges",
  ENDPOINTS.platform.badges,
  "GET",
  true,
);

export const getBadge = createApiThunkPrivate(
  "badge/getBadge",
  (payload) => ENDPOINTS.platform.badge(payload?.badgeId || payload?.id || payload?._id),
  "GET",
);

export const createBadge = createApiThunkPrivate(
  "badge/createBadge",
  ENDPOINTS.platform.badges,
  "POST",
);

export const updateBadge = createApiThunkPrivate(
  "badge/updateBadge",
  (payload) => ENDPOINTS.platform.badge(payload?.badgeId || payload?.id || payload?._id),
  "PATCH",
  false,
  {
    transformBody: (payload = {}) => {
      const { badgeId, id, _id, ...rest } = payload;
      return rest;
    },
  },
);

export const deleteBadge = createApiThunkPrivate(
  "badge/deleteBadge",
  (payload) => ENDPOINTS.platform.badge(payload?.badgeId || payload?.id || payload?._id),
  "DELETE",
);

export const listActiveBadges = createApiThunkPrivate(
  "badge/listActiveBadges",
  ENDPOINTS.platform.badgesActive,
  "GET",
  true,
);

const initialState = {
  loading: false,
  error: null,
  listBadgesData: {},
  getBadgeData: {},
  createBadgeData: {},
  updateBadgeData: {},
  deleteBadgeData: {},
  listActiveBadgesData: {},
};

const badgeSlice = createSlice({
  name: "badge",
  initialState,
  reducers: {
    clearBadgeForm(state) {
      state.createBadgeData = {};
      state.updateBadgeData = {};
      state.deleteBadgeData = {};
      state.getBadgeData = {};
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, listBadges, "listBadgesData");
    createExtraReducersForThunk(builder, getBadge, "getBadgeData");
    createExtraReducersForThunk(builder, createBadge, "createBadgeData");
    createExtraReducersForThunk(builder, updateBadge, "updateBadgeData");
    createExtraReducersForThunk(builder, deleteBadge, "deleteBadgeData");
    createExtraReducersForThunk(builder, listActiveBadges, "listActiveBadgesData");
  },
});

export const { clearBadgeForm } = badgeSlice.actions;
export default badgeSlice.reducer;
