import { createAsyncThunk } from "@reduxjs/toolkit";
import { axiosImage, axiosPrivate, axiosPublic } from "./axiosProvider";

const resolveEndpoint = (url, payload) =>
  typeof url === "function" ? url(payload) : url;

const isObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const splitPayload = (payload = {}) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { body: payload, params: payload };
  }

  return {
    body: payload.body || payload.data || payload,
    params: payload.params || payload.query || payload,
  };
};

const getProfileName = (record = {}) => {
  const profile = record.profile || {};
  const sellerProfile = record.sellerProfile || {};
  const parts = [profile.firstName, profile.lastName]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return (
    record.full_name ||
    record.fullName ||
    sellerProfile.displayName ||
    sellerProfile.legalBusinessName ||
    parts.join(" ") ||
    record.title ||
    record.name ||
    record.email ||
    ""
  );
};

const normalizeLegacyRecord = (record) => {
  if (!isObject(record)) return record;

  const next = { ...record };
  const id = next._id || next.id || next.userId || next.sellerId;
  const accountStatus = next.accountStatus || next.status;
  const fullName = getProfileName(next);

  if (id && !next._id) next._id = String(id);
  if (!next.full_name && fullName) next.full_name = fullName;
  if (!next.userName && next.email) next.userName = String(next.email).split("@")[0];
  if (!next.name && next.title) next.name = next.title;
  if (!next.title && next.name) next.title = next.name;

  if (typeof next.isDisable !== "boolean") {
    if (accountStatus) {
      next.isDisable = !["active", "ready_for_go_live", "verified"].includes(accountStatus);
    } else if (typeof next.active === "boolean") {
      next.isDisable = !next.active;
    } else if (typeof next.enabled === "boolean") {
      next.isDisable = !next.enabled;
    }
  }

  return next;
};

const normalizeList = (items = []) => items.map(normalizeLegacyRecord);

const unwrapPayload = (payload) => {
  if (payload?.raw && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload;
  }

  const raw = payload?.status && payload?.config ? payload.data : payload;

  if (isObject(raw) && Object.prototype.hasOwnProperty.call(raw, "data")) {
    return {
      data: raw.data,
      meta: raw.meta,
      raw,
      message: raw.message,
      success: raw.success,
    };
  }

  return {
    data: raw,
    meta: raw?.meta,
    raw,
    message: raw?.message,
    success: raw?.success,
  };
};

export const asLegacyData = (payload) => {
  if (!payload) return payload;
  if (payload.legacyCompatible) return payload;

  const unwrapped = unwrapPayload(payload);
  const { data, meta, raw } = unwrapped;
  let legacyData = data;

  if (Array.isArray(data)) {
    const list = normalizeList(data);
    legacyData = {
      list,
      total: meta?.total ?? list.length,
      page: meta?.page,
      limit: meta?.limit,
    };
  } else if (data && typeof data === "object") {
    const listSource = Array.isArray(data.list)
      ? data.list
      : Array.isArray(data.items)
        ? data.items
        : null;

    if (listSource) {
      const list = normalizeList(listSource);
      legacyData = {
        ...data,
        list,
        items: list,
        total: data.total ?? meta?.total ?? list.length,
        page: data.page ?? meta?.page,
        limit: data.limit ?? meta?.limit,
      };
    } else {
      legacyData = {
        ...normalizeLegacyRecord(data),
        total: data.total ?? meta?.total,
        page: data.page ?? meta?.page,
        limit: data.limit ?? meta?.limit,
      };
    }
  }

  return {
    ...unwrapped,
    legacyCompatible: true,
    normalized: unwrapped,
    data: legacyData,
    meta,
    raw,
    message: unwrapped.message || raw?.message,
    success: unwrapped.success,
  };
};

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.error?.message ||
  error?.raw?.error?.message ||
  error?.message ||
  error?.raw?.message ||
  (typeof error === "string" ? error : null) ||
  "Something went wrong!";

const createApiThunk = (axiosInstance) => {
  return (name, url, method = "POST", legacyOrOptions = false, maybeOptions = {}) => {
    const options = isObject(legacyOrOptions) ? legacyOrOptions : maybeOptions;

    return createAsyncThunk(name, async (payload, { rejectWithValue }) => {
      try {
        const lowerMethod = method.toLowerCase();
        const { body, params } = splitPayload(payload);
        const endpointPayload = options.resolvePayload
          ? options.resolvePayload(payload, { body, params })
          : payload;
        const requestBody = options.transformBody
          ? options.transformBody(body, payload)
          : body;
        const requestParams = options.transformParams
          ? options.transformParams(params, payload)
          : params;

        const config = {
          method: lowerMethod,
          url: resolveEndpoint(url, endpointPayload),
        };

        if (lowerMethod === "get" || lowerMethod === "delete") {
          config.params = requestParams;
        } else {
          config.data = requestBody;
        }

        return asLegacyData(await axiosInstance(config));
      } catch (error) {
        return rejectWithValue(getErrorMessage(error));
      }
    });
  };
};

export const createApiThunkPublic = createApiThunk(axiosPublic);
export const createApiThunkPrivate = createApiThunk(axiosPrivate);
export const createApiThunkPrivateImage = createApiThunk(axiosImage);

export const createExtraReducersForThunk = (builder, thunkAction, sliceName) => {
  builder
    .addCase(thunkAction.pending, (state) => {
      state.loading = true;
      state.error = null;
      if (!state[sliceName]) {
        state[sliceName] = {};
      }
    })
    .addCase(thunkAction.fulfilled, (state, action) => {
      state.loading = false;
      if (!state[sliceName]) {
        state[sliceName] = {};
      }
      const compatiblePayload = asLegacyData(action?.payload || {});
      state[sliceName].data = compatiblePayload;
      state[sliceName].normalized = action?.payload || {};
    })
    .addCase(thunkAction.rejected, (state, action) => {
      state.loading = false;
      if (!state[sliceName]) {
        state[sliceName] = {};
      }
      state[sliceName].error =
        action?.payload || `Something went wrong while fetching ${sliceName} details.`;
    });
};

export const createCrudThunks = (resourceName, endpoints) => ({
  list: createApiThunkPrivate(`${resourceName}/list`, endpoints.list, "GET"),
  detail: endpoints.detail
    ? createApiThunkPrivate(`${resourceName}/detail`, (payload) => endpoints.detail(payload.id), "GET")
    : undefined,
  create: endpoints.create
    ? createApiThunkPrivate(`${resourceName}/create`, endpoints.create, "POST")
    : undefined,
  update: endpoints.update
    ? createApiThunkPrivate(`${resourceName}/update`, (payload) => endpoints.update(payload.id), "PATCH")
    : undefined,
  remove: endpoints.remove
    ? createApiThunkPrivate(`${resourceName}/remove`, (payload) => endpoints.remove(payload.id), "DELETE")
    : undefined,
});
