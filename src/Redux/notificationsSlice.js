import { createSlice } from "@reduxjs/toolkit";
import {
  createApiThunkPrivate,
  createExtraReducersForThunk,
} from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const READ_NOTIFICATION_IDS_KEY = "readNotificationIds";
const NOTIFICATION_READ_BASELINE_KEY = "notificationReadBaselineAt";

const getStoredReadNotificationIds = () => {
  try {
    const value = JSON.parse(
      localStorage.getItem(READ_NOTIFICATION_IDS_KEY) || "[]"
    );
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
};

const getNotificationReadBaseline = () => {
  const storedBaseline = Number(
    localStorage.getItem(NOTIFICATION_READ_BASELINE_KEY) || 0
  );
  if (storedBaseline) return storedBaseline;

  const legacySeenAt = Number(
    localStorage.getItem("notificationsSeenAt") || 0
  );
  const baseline = legacySeenAt || Date.now();
  localStorage.setItem(NOTIFICATION_READ_BASELINE_KEY, String(baseline));
  return baseline;
};

export const getNotificationKey = (notification = {}) =>
  String(
    notification._id ||
      notification.id ||
      notification.notificationId ||
      notification.notification_id ||
      [
        notification.createdAt || notification.created_at || "",
        notification.subject || notification.payload?.title || "",
        notification.template || "",
      ].join("|")
  );

export const isNotificationUnread = (
  notification = {},
  readNotificationIds = [],
  notificationsSeenAt = 0
) => {
  const notificationKey = getNotificationKey(notification);
  if (notificationKey && readNotificationIds.includes(notificationKey)) {
    return false;
  }
  if (typeof notification.unread === "boolean") return notification.unread;
  if (typeof notification.isUnread === "boolean") return notification.isUnread;
  if (typeof notification.is_read === "boolean") return !notification.is_read;
  if (typeof notification.read === "boolean") return !notification.read;
  if (
    notification.readAt ||
    notification.read_at ||
    notification.viewedAt ||
    notification.viewed_at
  ) {
    return false;
  }

  const created =
    notification.createdAt ||
    notification.created_at ||
    notification.time ||
    notification.date;
  const createdTimestamp = created ? new Date(created).getTime() : 0;
  return notificationsSeenAt && createdTimestamp
    ? createdTimestamp > notificationsSeenAt
    : true;
};

const initialState = {
  notificationsData: {},
  notificationPreferencesData: {},
  updateNotificationPreferencesData: {},
  readNotificationIds: getStoredReadNotificationIds(),
  notificationReadBaselineAt: getNotificationReadBaseline(),

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
    markNotificationRead: (state, action) => {
      const notificationKey = getNotificationKey(action.payload);
      if (!notificationKey || state.readNotificationIds.includes(notificationKey)) {
        return;
      }
      state.readNotificationIds = [
        ...state.readNotificationIds,
        notificationKey,
      ].slice(-1000);
      localStorage.setItem(
        READ_NOTIFICATION_IDS_KEY,
        JSON.stringify(state.readNotificationIds)
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

export const {
  markNotificationRead,
  setNotificationsSeenAt,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
