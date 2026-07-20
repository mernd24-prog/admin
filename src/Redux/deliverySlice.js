import { createSlice } from "@reduxjs/toolkit";
import { createApiThunkPrivate, createExtraReducersForThunk } from "../_helpers/ApiThunk";
import { ENDPOINTS } from "../_helpers/endpoints";

const initialState = {
  serviceabilityData: {},
  ratesData: {},
  shipmentsData: {},
  shipmentData: {},
  createShipmentData: {},
  trackingEventData: {},
  // Shipping Profiles
  shippingProfilesData: {},
  shippingProfileData: {},
  createShippingProfileData: {},
  updateShippingProfileData: {},
  deleteShippingProfileData: {},
  bulkDeleteShippingProfilesData: {},
  setDefaultShippingProfileData: {},
  shippingProfileTemplatesData: {},
  createShippingProfileTemplateData: {},
  updateShippingProfileTemplateData: {},
  deleteShippingProfileTemplateData: {},
  cloneShippingProfileTemplateData: {},
};

const pickQuery = (keys = []) => (params = {}) =>
  keys.reduce((acc, key) => {
    const value = params?.[key];
    if (value !== undefined && value !== null && value !== "") acc[key] = value;
    return acc;
  }, {});

const omitPayload = (payload = {}, keys = []) =>
  Object.entries(payload || {}).reduce((acc, [key, value]) => {
    if (!keys.includes(key) && value !== undefined) acc[key] = value;
    return acc;
  }, {});

export const getDeliveryServiceabilityForSeller = createApiThunkPrivate(
  "delivery/getDeliveryServiceabilityForSeller",
  ENDPOINTS.delivery.serviceability,
  "GET",
  true
);

export const getShippingRate = createApiThunkPrivate(
  "delivery/getShippingRate",
  ENDPOINTS.delivery.rates,
  "GET",
  true,
  { transformParams: pickQuery(["pincode", "weightGrams", "shippingMode", "cod", "provider"]) }
);

export const getShipments = createApiThunkPrivate(
  "delivery/getShipments",
  ENDPOINTS.delivery.shipments,
  "GET",
  true,
  { transformParams: pickQuery(["orderId", "returnId", "shipmentType", "direction", "sellerId", "status", "courierName", "awbNumber", "search", "cod", "fromDate", "toDate", "sortBy", "sortDir", "limit", "offset"]) }
);

export const createShipment = createApiThunkPrivate(
  "delivery/createShipment",
  ENDPOINTS.delivery.shipments,
  "POST"
);

export const getShipment = createApiThunkPrivate(
  "delivery/getShipment",
  (payload) => ENDPOINTS.delivery.shipment(payload?.shipmentId || payload?.id),
  "GET"
);

export const addShipmentTracking = createApiThunkPrivate(
  "delivery/addShipmentTracking",
  (payload) => ENDPOINTS.delivery.shipmentTracking(payload?.shipmentId || payload?.id),
  "POST",
  false,
  { transformBody: (payload = {}) => omitPayload(payload, ["shipmentId", "id"]) }
);

// ── Shipping Profiles ──────────────────────────────────────────────────────

export const getShippingProfiles = createApiThunkPrivate(
  "delivery/getShippingProfiles",
  ENDPOINTS.shippingProfiles.list,
  "GET",
  true,
  { transformParams: pickQuery(["sellerId", "organizationId", "active", "search", "limit", "offset"]) }
);

export const createShippingProfile = createApiThunkPrivate(
  "delivery/createShippingProfile",
  ENDPOINTS.shippingProfiles.create,
  "POST"
);

export const getShippingProfile = createApiThunkPrivate(
  "delivery/getShippingProfile",
  (payload) => ENDPOINTS.shippingProfiles.detail(payload?.profileId || payload?.id),
  "GET"
);

export const updateShippingProfile = createApiThunkPrivate(
  "delivery/updateShippingProfile",
  (payload) => ENDPOINTS.shippingProfiles.update(payload?.profileId || payload?.id),
  "PATCH",
  false,
  { transformBody: (payload = {}) => omitPayload(payload, ["profileId", "id"]) }
);

export const deleteShippingProfile = createApiThunkPrivate(
  "delivery/deleteShippingProfile",
  (payload) => ENDPOINTS.shippingProfiles.delete(payload?.profileId || payload?.id),
  "DELETE"
);

export const bulkDeleteShippingProfiles = createApiThunkPrivate(
  "delivery/bulkDeleteShippingProfiles",
  ENDPOINTS.shippingProfiles.bulkDelete,
  "POST",
  false,
  { transformBody: (payload = {}) => ({ profileIds: payload.profileIds || [] }) }
);

export const setDefaultShippingProfile = createApiThunkPrivate(
  "delivery/setDefaultShippingProfile",
  (payload) => ENDPOINTS.shippingProfiles.setDefault(payload?.profileId || payload?.id),
  "POST"
);

export const getShippingProfileTemplates = createApiThunkPrivate(
  "delivery/getShippingProfileTemplates",
  ENDPOINTS.shippingProfiles.templates,
  "GET",
  true,
  { transformParams: pickQuery(["status", "active", "search", "limit", "offset"]) }
);

export const createShippingProfileTemplate = createApiThunkPrivate(
  "delivery/createShippingProfileTemplate",
  ENDPOINTS.shippingProfiles.templates,
  "POST"
);

export const updateShippingProfileTemplate = createApiThunkPrivate(
  "delivery/updateShippingProfileTemplate",
  (payload) => ENDPOINTS.shippingProfiles.template(payload?.templateId || payload?.id),
  "PATCH",
  false,
  { transformBody: (payload = {}) => omitPayload(payload, ["templateId", "id"]) }
);

export const deleteShippingProfileTemplate = createApiThunkPrivate(
  "delivery/deleteShippingProfileTemplate",
  (payload) => ENDPOINTS.shippingProfiles.template(payload?.templateId || payload?.id),
  "DELETE"
);

export const cloneShippingProfileTemplate = createApiThunkPrivate(
  "delivery/cloneShippingProfileTemplate",
  (payload) => ENDPOINTS.shippingProfiles.cloneTemplate(payload?.templateId || payload?.id),
  "POST",
  false,
  { transformBody: (payload = {}) => omitPayload(payload, ["templateId", "id"]) }
);

const deliverySlice = createSlice({
  name: "delivery",
  initialState,
  extraReducers: (builder) => {
    createExtraReducersForThunk(builder, getDeliveryServiceabilityForSeller, "serviceabilityData");
    createExtraReducersForThunk(builder, getShippingRate, "ratesData");
    createExtraReducersForThunk(builder, getShipments, "shipmentsData");
    createExtraReducersForThunk(builder, getShipment, "shipmentData");
    createExtraReducersForThunk(builder, createShipment, "createShipmentData");
    createExtraReducersForThunk(builder, addShipmentTracking, "trackingEventData");
    createExtraReducersForThunk(builder, getShippingProfiles, "shippingProfilesData");
    createExtraReducersForThunk(builder, createShippingProfile, "createShippingProfileData");
    createExtraReducersForThunk(builder, getShippingProfile, "shippingProfileData");
    createExtraReducersForThunk(builder, updateShippingProfile, "updateShippingProfileData");
    createExtraReducersForThunk(builder, deleteShippingProfile, "deleteShippingProfileData");
    createExtraReducersForThunk(builder, bulkDeleteShippingProfiles, "bulkDeleteShippingProfilesData");
    createExtraReducersForThunk(builder, setDefaultShippingProfile, "setDefaultShippingProfileData");
    createExtraReducersForThunk(builder, getShippingProfileTemplates, "shippingProfileTemplatesData");
    createExtraReducersForThunk(builder, createShippingProfileTemplate, "createShippingProfileTemplateData");
    createExtraReducersForThunk(builder, updateShippingProfileTemplate, "updateShippingProfileTemplateData");
    createExtraReducersForThunk(builder, deleteShippingProfileTemplate, "deleteShippingProfileTemplateData");
    createExtraReducersForThunk(builder, cloneShippingProfileTemplate, "cloneShippingProfileTemplateData");
  },
});

export default deliverySlice.reducer;
