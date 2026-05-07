const express = require("express");
const { WarrantyController } = require("../controllers/warranty.controller");
const { authenticate } = require("../../../shared/middleware/authenticate");
const { authorize } = require("../../../shared/middleware/authorize");
const { asyncHandler } = require("../../../shared/middleware/async-handler");
const { validateRequest } = require("../../../shared/middleware/validate-request");
const { ROLES } = require("../../../shared/constants/roles");
const {
  registerWarrantySchema,
  warrantyIdSchema,
  orderIdSchema,
  customerIdSchema,
  claimWarrantySchema,
  updateClaimStatusSchema,
  productIdSchema,
} = require("../validation/warranty.validation");

const warrantyRoutes = express.Router();
const warrantyController = new WarrantyController();

// Public routes
warrantyRoutes.get(
  "/products/:productId/warranty",
  validateRequest(productIdSchema),
  asyncHandler(warrantyController.getProductWarranty),
);

// Authenticated routes
warrantyRoutes.use(authenticate);

warrantyRoutes.post(
  "/register",
  validateRequest(registerWarrantySchema),
  asyncHandler(warrantyController.registerWarranty),
);

warrantyRoutes.get(
  "/:warrantyId",
  validateRequest(warrantyIdSchema),
  asyncHandler(warrantyController.getWarranty),
);

warrantyRoutes.get(
  "/orders/:orderId",
  validateRequest(orderIdSchema),
  asyncHandler(warrantyController.getWarrantiesByOrder),
);

warrantyRoutes.get(
  "/customers/:customerId",
  validateRequest(customerIdSchema),
  asyncHandler(warrantyController.getWarrantiesByCustomer),
);

warrantyRoutes.post(
  "/:warrantyId/claims",
  validateRequest(claimWarrantySchema),
  asyncHandler(warrantyController.claimWarranty),
);

// Admin routes
warrantyRoutes.patch(
  "/:warrantyId/claims/:claimId/status",
  authorize(ROLES.ADMIN),
  validateRequest(updateClaimStatusSchema),
  asyncHandler(warrantyController.updateClaimStatus),
);

module.exports = { warrantyRoutes };