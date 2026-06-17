import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate } from "../_helpers/ApiThunk";

const INTERESTS_BASE = "/admin/interests";

export const getInterestListData = createApiThunkPrivate(
  "admin/interests/list",
  INTERESTS_BASE,
  "GET",
);

export const createInterest = createApiThunkPrivate(
  "admin/interests/create",
  INTERESTS_BASE,
  "POST",
);

export const updateInterest = createApiThunkPrivate(
  "admin/interests/update",
  (payload) => `${INTERESTS_BASE}/${payload._id}`,
  "PATCH",
);

export const deleteInterest = createApiThunkPrivate(
  "admin/interests/delete",
  (payload) => `${INTERESTS_BASE}/${payload._id}`,
  "DELETE",
);

export const enableDisableInterest = createApiThunkPrivate(
  "admin/interests/toggle",
  (payload) => `${INTERESTS_BASE}/${payload._id[0]}/toggle`,
  "PATCH",
);

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    interestListData: {},
    createInterestData: {},
    updateInterestData: {},
    deleteInterestData: {},
    enableDisableInterestData: {},
  },
  reducers: {},
});

export default adminSlice.reducer;
