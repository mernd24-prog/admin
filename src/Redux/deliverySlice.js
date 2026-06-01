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
  createManifestData: {},
  getOrderEwayBillData: {},
  createOrderEwayBillData: {},
  updateEwayBillStatusData: {},
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
  { transformParams: pickQuery(["orderId", "sellerId", "status", "courierName", "awbNumber", "cod", "fromDate", "toDate", "limit", "offset"]) }
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

export const createShipmentManifest = createApiThunkPrivate(
  "delivery/createShipmentManifest",
  ENDPOINTS.delivery.manifests,
  "POST"
);

export const getSellerOrderEwayBill = createApiThunkPrivate(
  "delivery/getSellerOrderEwayBill",
  (payload) => ENDPOINTS.delivery.orderEwayBill(payload?.orderId || payload?.id),
  "GET"
);

export const createSellerOrderEwayBill = createApiThunkPrivate(
  "delivery/createSellerOrderEwayBill",
  (payload) => ENDPOINTS.delivery.orderEwayBill(payload?.orderId || payload?.id),
  "POST"
);

export const updateSellerEwayBillStatus = createApiThunkPrivate(
  "delivery/updateSellerEwayBillStatus",
  (payload) => ENDPOINTS.delivery.ewayBillStatus(payload?.ewayBillId || payload?.id),
  "PATCH"
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
    createExtraReducersForThunk(builder, createShipmentManifest, "createManifestData");
    createExtraReducersForThunk(builder, getSellerOrderEwayBill, "getOrderEwayBillData");
    createExtraReducersForThunk(builder, createSellerOrderEwayBill, "createOrderEwayBillData");
    createExtraReducersForThunk(builder, updateSellerEwayBillStatus, "updateEwayBillStatusData");
  },
});

export default deliverySlice.reducer;
