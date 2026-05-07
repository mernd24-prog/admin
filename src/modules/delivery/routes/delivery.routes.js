"use strict";

const express = require("express");
const { DeliveryController } = require("../controllers/delivery.controller");
const { authenticate } = require("../../../shared/middleware/authenticate");
const { authorizeCapability } = require("../../../shared/middleware/authorize");
const { CAPABILITIES } = require("../../../shared/constants/capabilities");
const { validateRequest } = require("../../../shared/middleware/validate-request");
const { asyncHandler } = require("../../../shared/middleware/async-handler");
const {
  serviceabilitySchema,
  orderDeliveryParamSchema,
  createEWayBillSchema,
  updateEWayBillStatusSchema,
} = require("../validation/delivery.validation");

const deliveryRoutes = express.Router();
const deliveryController = new DeliveryController();

deliveryRoutes.get(
  "/serviceability",
  validateRequest(serviceabilitySchema),
  asyncHandler(deliveryController.serviceability),
);

deliveryRoutes.get(
  "/orders/:orderId/eway-bill",
  authenticate,
  validateRequest(orderDeliveryParamSchema),
  asyncHandler(deliveryController.getEWayBill),
);

deliveryRoutes.post(
  "/orders/:orderId/eway-bill",
  authenticate,
  authorizeCapability(CAPABILITIES.ORDER_MANAGE),
  validateRequest(createEWayBillSchema),
  asyncHandler(deliveryController.createEWayBill),
);

deliveryRoutes.patch(
  "/eway-bills/:ewayBillId/status",
  authenticate,
  authorizeCapability(CAPABILITIES.ORDER_MANAGE),
  validateRequest(updateEWayBillStatusSchema),
  asyncHandler(deliveryController.updateEWayBillStatus),
);

module.exports = { deliveryRoutes };
