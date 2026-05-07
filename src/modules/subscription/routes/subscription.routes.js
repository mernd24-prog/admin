const express = require("express");
const { SubscriptionController } = require("../controllers/subscription.controller");
const { asyncHandler } = require("../../../shared/middleware/async-handler");
const { authenticate } = require("../../../shared/middleware/authenticate");
const { authorize } = require("../../../shared/middleware/authorize");
const { validateRequest } = require("../../../shared/middleware/validate-request");
const { ROLES } = require("../../../shared/constants/roles");
const {
  listPlansSchema,
  purchasePlanSchema,
  subscriptionIdParamSchema,
  createPlanSchema,
  listPlansAdminSchema,
  planIdParamSchema,
  updatePlanSchema,
  listSubscriptionsAdminSchema,
  updateSubscriptionStatusAdminSchema,
  createPlatformFeeConfigSchema,
  listPlatformFeeConfigSchema,
  platformFeeConfigIdParamSchema,
  updatePlatformFeeConfigSchema,
} = require("../validation/subscription.validation");

const subscriptionRoutes = express.Router();
const subscriptionController = new SubscriptionController();

subscriptionRoutes.get("/plans", validateRequest(listPlansSchema), asyncHandler(subscriptionController.listPlans));
subscriptionRoutes.post(
  "/purchase",
  authenticate,
  validateRequest(purchasePlanSchema),
  asyncHandler(subscriptionController.purchasePlan),
);
subscriptionRoutes.get("/me", authenticate, asyncHandler(subscriptionController.listMine));
subscriptionRoutes.put(
  "/:subscriptionId/pause",
  authenticate,
  validateRequest(subscriptionIdParamSchema),
  asyncHandler(subscriptionController.pauseMine),
);
subscriptionRoutes.put(
  "/:subscriptionId/resume",
  authenticate,
  validateRequest(subscriptionIdParamSchema),
  asyncHandler(subscriptionController.resumeMine),
);
subscriptionRoutes.put(
  "/:subscriptionId/cancel",
  authenticate,
  validateRequest(subscriptionIdParamSchema),
  asyncHandler(subscriptionController.cancelMine),
);

subscriptionRoutes.post(
  "/admin/plans",
  authenticate,
  authorize(ROLES.ADMIN),
  validateRequest(createPlanSchema),
  asyncHandler(subscriptionController.createPlan),
);
subscriptionRoutes.get(
  "/admin/plans",
  authenticate,
  authorize(ROLES.ADMIN),
  validateRequest(listPlansAdminSchema),
  asyncHandler(subscriptionController.listPlansAdmin),
);
subscriptionRoutes.get(
  "/admin/plans/:planId",
  authenticate,
  authorize(ROLES.ADMIN),
  validateRequest(planIdParamSchema),
  asyncHandler(subscriptionController.getPlan),
);
subscriptionRoutes.patch(
  "/admin/plans/:planId",
  authenticate,
  authorize(ROLES.ADMIN),
  validateRequest(updatePlanSchema),
  asyncHandler(subscriptionController.updatePlan),
);
subscriptionRoutes.delete(
  "/admin/plans/:planId",
  authenticate,
  authorize(ROLES.ADMIN),
  validateRequest(planIdParamSchema),
  asyncHandler(subscriptionController.deletePlan),
);
subscriptionRoutes.get(
  "/admin/subscriptions",
  authenticate,
  authorize(ROLES.ADMIN),
  validateRequest(listSubscriptionsAdminSchema),
  asyncHandler(subscriptionController.listSubscriptionsAdmin),
);
subscriptionRoutes.patch(
  "/admin/subscriptions/:subscriptionId/status",
  authenticate,
  authorize(ROLES.ADMIN),
  validateRequest(updateSubscriptionStatusAdminSchema),
  asyncHandler(subscriptionController.updateSubscriptionStatusAdmin),
);
subscriptionRoutes.post(
  "/admin/platform-fee-config",
  authenticate,
  authorize(ROLES.ADMIN),
  validateRequest(createPlatformFeeConfigSchema),
  asyncHandler(subscriptionController.createPlatformFeeConfig),
);
subscriptionRoutes.get(
  "/admin/platform-fee-config",
  authenticate,
  authorize(ROLES.ADMIN),
  validateRequest(listPlatformFeeConfigSchema),
  asyncHandler(subscriptionController.listPlatformFeeConfigs),
);
subscriptionRoutes.get(
  "/admin/platform-fee-config/:configId",
  authenticate,
  authorize(ROLES.ADMIN),
  validateRequest(platformFeeConfigIdParamSchema),
  asyncHandler(subscriptionController.getPlatformFeeConfig),
);
subscriptionRoutes.patch(
  "/admin/platform-fee-config/:configId",
  authenticate,
  authorize(ROLES.ADMIN),
  validateRequest(updatePlatformFeeConfigSchema),
  asyncHandler(subscriptionController.updatePlatformFeeConfig),
);
subscriptionRoutes.delete(
  "/admin/platform-fee-config/:configId",
  authenticate,
  authorize(ROLES.ADMIN),
  validateRequest(platformFeeConfigIdParamSchema),
  asyncHandler(subscriptionController.deletePlatformFeeConfig),
);

module.exports = { subscriptionRoutes };
