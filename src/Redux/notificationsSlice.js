import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  notificationsData: {},
  notificationPreferencesData: {},
  updateNotificationPreferencesData: {},
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
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, getMyNotifications, "notificationsData");
    createExtraReducersForThunk(builder, getNotificationPreferences, "notificationPreferencesData");
    createExtraReducersForThunk(
      builder,
      updateNotificationPreferences,
      "updateNotificationPreferencesData"
    );
  },
});

export default notificationsSlice.reducer;
