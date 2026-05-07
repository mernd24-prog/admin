const express = require("express");
const { OrderController } = require("../controllers/order.controller");
const { asyncHandler } = require("../../../shared/middleware/async-handler");
const { authenticate } = require("../../../shared/middleware/authenticate");
const { authorizeCapability } = require("../../../shared/middleware/authorize");
const { CAPABILITIES } = require("../../../shared/constants/capabilities");
const { validateRequest } = require("../../../shared/middleware/validate-request");
const {
  createOrderSchema,
  updateOrderStatusSchema,
  orderParamSchema,
  cancelOrderSchema,
} = require("../validation/order.validation");

const orderRoutes = express.Router();
const orderController = new OrderController();

orderRoutes.get("/me", authenticate, asyncHandler(orderController.listMine));
orderRoutes.get(
  "/seller/me",
  authenticate,
  authorizeCapability(CAPABILITIES.ORDER_MANAGE),
  asyncHandler(orderController.listSellerOrders),
);
orderRoutes.post("/", authenticate, validateRequest(createOrderSchema), asyncHandler(orderController.create));
orderRoutes.get(
  "/:orderId",
  authenticate,
  validateRequest(orderParamSchema),
  asyncHandler(orderController.getOne),
);
orderRoutes.post(
  "/:orderId/cancel",
  authenticate,
  validateRequest(cancelOrderSchema),
  asyncHandler(orderController.cancel),
);
orderRoutes.patch(
  "/:orderId/status",
  authenticate,
  validateRequest(updateOrderStatusSchema),
  asyncHandler(orderController.updateStatus),
);

module.exports = { orderRoutes };
