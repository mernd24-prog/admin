import { createSlice } from "@reduxjs/toolkit";
import { toast } from "../utils/toast";

const alertSlice = createSlice({
  name: "alert",
  initialState: {},
  reducers: {
    showSuccess: (_, action) => {
      toast.success(action.payload);
    },
    showError: (_, action) => {
      toast.error(action.payload);
    },
    showInfo: (_, action) => {
      toast.info(action.payload);
    },
    showWarning: (_, action) => {
      toast.warning(action.payload);
    },
  },
});

export const { showSuccess, showError, showInfo, showWarning } = alertSlice.actions;
export default alertSlice.reducer;