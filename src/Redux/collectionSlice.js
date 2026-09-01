import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

export const listCollections = createApiThunkPrivate("collection/list", ENDPOINTS.platform.collections, "GET", true);
export const createCollection = createApiThunkPrivate("collection/create", ENDPOINTS.platform.collections, "POST");
export const updateCollection = createApiThunkPrivate("collection/update", (p) => ENDPOINTS.platform.collection(p.collectionId), "PATCH", false, { transformBody: ({ collectionId, ...body }) => body });
export const deleteCollection = createApiThunkPrivate("collection/delete", (p) => ENDPOINTS.platform.collection(p.collectionId), "DELETE");

const slice = createSlice({
  name: "collection",
  initialState: { loading: false, listData: {} },
  reducers: {},
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, listCollections, "listData");
    createExtraReducersForThunk(builder, createCollection, "createData");
    createExtraReducersForThunk(builder, updateCollection, "updateData");
    createExtraReducersForThunk(builder, deleteCollection, "deleteData");
  },
});
export default slice.reducer;
