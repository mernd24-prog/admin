import { createAsyncThunk } from "@reduxjs/toolkit";
import { apiRequest } from "./apiConfig";

export const DEFAULT_PLATFORM_MODULES = [
  "users",
  "products",
  "carts",
  "orders",
  "payments",
  "platform",
  "sellers",
  "notifications",
  "analytics",
  "pricing",
  "wallets",
  "tax",
  "subscriptions",
  "rbac",
  "warranty",
  "loyalty",
  "recommendations",
  "returns",
  "fraud",
  "dynamic-pricing",
  "referral",
  "delivery",
  "admin",
];

export const DEFAULT_SELLER_MODULES = [
  "products",
  "orders",
  "pricing",
  "notifications",
  "analytics",
  "sellers",
  "sellers/commissions",
  "returns",
  "delivery",
];

export const getApiErrorMessage = (error) =>
  error?.error?.message ||
  error?.message ||
  (typeof error === "string" ? error : null) ||
  "Something went wrong!";

export const toIdList = (payload = {}) => {
  const value = payload.ids || payload._id || payload.userId || payload.sellerId || payload.id;
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
};

export const firstId = (payload = {}) => toIdList(payload)[0];

export const splitName = (fullName = "") => {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || "User",
    lastName: parts.join(" "),
  };
};

const isUrl = (value) => {
  try {
    return Boolean(value) && Boolean(new URL(value));
  } catch {
    return false;
  }
};

export const toProfile = (payload = {}, requireLastName = false) => {
  const hasAvatarInput =
    Object.prototype.hasOwnProperty.call(payload, "avatarUrl") ||
    Object.prototype.hasOwnProperty.call(payload, "user_image") ||
    Object.prototype.hasOwnProperty.call(payload, "profileImage") ||
    Object.prototype.hasOwnProperty.call(payload.profile || {}, "avatarUrl");
  const avatarUrl =
    payload.avatarUrl ||
    payload.user_image ||
    payload.profileImage ||
    payload.profile?.avatarUrl ||
    "";
  const avatarPatch = isUrl(avatarUrl)
    ? { avatarUrl }
    : hasAvatarInput
      ? { avatarUrl: avatarUrl || "" }
      : {};

  if (payload.profile?.firstName) {
    return {
      firstName: payload.profile.firstName,
      lastName: payload.profile.lastName || (requireLastName ? "User" : ""),
      ...avatarPatch,
    };
  }

  const name = splitName(payload.full_name || payload.fullName || payload.name || payload.userName || payload.email);
  return {
    firstName: name.firstName,
    lastName: name.lastName || (requireLastName ? "User" : ""),
    ...avatarPatch,
  };
};

export const normalizeAllowedModules = (modules, fallback = DEFAULT_PLATFORM_MODULES) => {
  const source = Array.isArray(modules) && modules.length ? modules : fallback;
  return Array.from(new Set(source.map((moduleName) => String(moduleName || "").trim().toLowerCase()).filter(Boolean)));
};

export const toAccountStatus = (payload = {}) => {
  if (payload.accountStatus) return payload.accountStatus;
  if (payload.status) return payload.status;
  return payload.isDisable ? "suspended" : "active";
};

export const toListParams = (params = {}, defaults = {}) => ({
  ...defaults,
  ...(params.q || params.keyWord || params.search ? { q: params.q || params.keyWord || params.search } : {}),
  ...(params.page !== undefined && params.page !== null ? { page: Number(params.page) } : {}),
  ...(params.limit || params.size ? { limit: Number(params.limit || params.size) } : {}),
  ...(params.offset !== undefined && params.offset !== null ? { offset: Number(params.offset) } : {}),
  ...(params.role ? { role: params.role } : {}),
  ...(params.accountStatus ? { accountStatus: params.accountStatus } : {}),
  ...(params.status ? { status: params.status } : {}),
  ...(params.onboardingStatus ? { onboardingStatus: params.onboardingStatus } : {}),
  ...(params.active !== undefined ? { active: params.active } : {}),
});

export const toManagedUserCreateBody = (payload = {}, options = {}) => ({
  email: String(payload.email || "").trim(),
  phone: payload.phone || null,
  password: payload.password,
  profile: toProfile(payload, options.requireLastName),
  ...(options.allowedModules
    ? { allowedModules: normalizeAllowedModules(payload.allowedModules, options.allowedModules) }
    : {}),
  ...(Array.isArray(payload.modulePermissions)
    ? { modulePermissions: payload.modulePermissions }
    : {}),
});

export const toBuyerCreateBody = (payload = {}) => ({
  email: String(payload.email || "").trim(),
  phone: payload.phone || null,
  password: payload.password,
  role: payload.role || "buyer",
  accountStatus: toAccountStatus(payload),
  profile: toProfile(payload),
});

export const toSubAdminCreateBody = (payload = {}, fallbackModules = ["admin"]) =>
  toManagedUserCreateBody(payload, { allowedModules: fallbackModules });

export const toSellerRegisterBody = (payload = {}) => ({
  email: String(payload.email || "").trim(),
  phone: String(payload.phone || "").trim(),
  password: payload.password,
  role: "seller",
  ...(payload.isDisable ? { accountStatus: toAccountStatus(payload) } : {}),
  profile: toProfile(payload, true),
  sellerProfile: {
    displayName: payload.displayName || payload.storeName || payload.full_name || payload.fullName || payload.name,
    legalBusinessName: payload.legalBusinessName || payload.businessName || payload.full_name || payload.fullName || payload.name,
    supportEmail: payload.email,
    supportPhone: payload.phone,
  },
});

export const toUserUpdateBody = (payload = {}) => {
  const body = {};
  if (
    payload.accountStatus ||
    payload.status ||
    typeof payload.isDisable === "boolean"
  ) {
    body.accountStatus = toAccountStatus(payload);
  }
  if (payload.role) {
    body.role = payload.role;
  }
  const hasProfile = payload.profile || payload.full_name || payload.fullName || payload.name || payload.userName;
  if (hasProfile) {
    body.profile = toProfile(payload);
  }
  const hasSellerProfile =
    payload.sellerProfile ||
    payload.displayName ||
    payload.legalBusinessName ||
    payload.supportEmail ||
    payload.supportPhone ||
    payload.businessType ||
    payload.registrationNumber ||
    payload.gstNumber ||
    payload.panNumber ||
    payload.aadhaarNumber ||
    payload.businessWebsite ||
    payload.primaryContactName ||
    payload.description ||
    payload.onboardingStatus;
  if (hasSellerProfile) {
    body.sellerProfile = {
      ...(payload.sellerProfile || {}),
      ...(payload.displayName ? { displayName: payload.displayName } : {}),
      ...(payload.legalBusinessName ? { legalBusinessName: payload.legalBusinessName } : {}),
      ...(payload.supportEmail ? { supportEmail: payload.supportEmail } : {}),
      ...(payload.supportPhone ? { supportPhone: payload.supportPhone } : {}),
      ...(payload.businessType ? { businessType: payload.businessType } : {}),
      ...(payload.registrationNumber ? { registrationNumber: payload.registrationNumber } : {}),
      ...(payload.gstNumber ? { gstNumber: payload.gstNumber } : {}),
      ...(payload.panNumber ? { panNumber: payload.panNumber } : {}),
      ...(payload.aadhaarNumber ? { aadhaarNumber: payload.aadhaarNumber } : {}),
      ...(payload.businessWebsite ? { businessWebsite: payload.businessWebsite } : {}),
      ...(payload.primaryContactName ? { primaryContactName: payload.primaryContactName } : {}),
      ...(payload.description ? { description: payload.description } : {}),
      ...(payload.onboardingStatus ? { onboardingStatus: payload.onboardingStatus } : {}),
    };
  }
  return body;
};

export const toVendorStatusBody = (payload = {}) => ({
  accountStatus: toAccountStatus(payload),
});

export const toKycReviewBody = (payload = {}) => ({
  kycStatus: payload.kycStatus || payload.verificationStatus || payload.status,
  rejectionReason: payload.rejectionReason || null,
});

export const unsupportedThunk = (name, message) =>
  createAsyncThunk(name, async (_payload, { rejectWithValue }) => rejectWithValue(message));

export const patchMany = (name, endpointBuilder, bodyBuilder, successMessage) =>
  createAsyncThunk(name, async (payload, { rejectWithValue }) => {
    try {
      const ids = toIdList(payload);
      if (!ids.length) {
        return rejectWithValue("Missing record id");
      }

      const results = [];
      for (const id of ids) {
        results.push(await apiRequest("PATCH", endpointBuilder(id), bodyBuilder(payload)));
      }

      return {
        success: true,
        message: results[0]?.message || successMessage,
        data: ids.length === 1 ? (results[0]?.data ?? results[0]) : results.map((item) => item?.data ?? item),
        meta: { total: ids.length },
        raw: results,
      };
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  });

export const deleteMany = (name, endpointBuilder, successMessage = "Deleted successfully") =>
  createAsyncThunk(name, async (payload, { rejectWithValue }) => {
    try {
      const ids = toIdList(payload);
      if (!ids.length) {
        return rejectWithValue("Missing record id");
      }

      const results = [];
      for (const id of ids) {
        results.push(await apiRequest("DELETE", endpointBuilder(id)));
      }

      return {
        success: true,
        message: results[0]?.message || successMessage,
        data: ids.length === 1 ? (results[0]?.data ?? results[0]) : results.map((item) => item?.data ?? item),
        meta: { total: ids.length },
        raw: results,
      };
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error));
    }
  });
