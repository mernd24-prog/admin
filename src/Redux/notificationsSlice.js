import { createSlice } from "@reduxjs/toolkit";
import {
  createApiThunkPrivate,
  createExtraReducersForThunk,
} from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  notificationsData: {},
  notificationPreferencesData: {},
  updateNotificationPreferencesData: {},

  // Store the last time notifications were viewed
  notificationsSeenAt: Number(
    localStorage.getItem("notificationsSeenAt") || 0
  ),
};

export const getMyNotifications = createApiThunkPrivate(
  "notifications/getMyNotifications",
  ENDPOINTS.notifications.mine,
  "GET",
  true
);

export const getNotificationPreferences = createApiThunkPrivate(
  "notifications/getNotificationPreferences",
  ENDPOINTS.notifications.preferences,
  "GET"
);

export const updateNotificationPreferences = createApiThunkPrivate(
  "notifications/updateNotificationPreferences",
  ENDPOINTS.notifications.preferences,
  "PUT"
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,

  reducers: {
    setNotificationsSeenAt: (state, action) => {
      state.notificationsSeenAt = action.payload;

      // Persist to localStorage
      localStorage.setItem(
        "notificationsSeenAt",
        String(action.payload)
      );
    },
  },

  extraReducers: (builder) => {
    createExtraReducersForThunk(
      builder,
      getMyNotifications,
      "notificationsData"
    );

    createExtraReducersForThunk(
      builder,
      getNotificationPreferences,
      "notificationPreferencesData"
    );

    createExtraReducersForThunk(
      builder,
      updateNotificationPreferences,
      "updateNotificationPreferencesData"
    );
  },
});

export const { setNotificationsSeenAt } = notificationsSlice.actions;

export default notificationsSlice.reducer;