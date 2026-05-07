const express = require("express");
const { PricingController } = require("../controllers/pricing.controller");
const { authenticate } = require("../../../shared/middleware/authenticate");
const { authorizeCapability } = require("../../../shared/middleware/authorize");
const { CAPABILITIES } = require("../../../shared/constants/capabilities");
const { validateRequest } = require("../../../shared/middleware/validate-request");
const { createCouponSchema, updateCouponSchema, couponParamSchema } = require("../validation/pricing.validation");
const { asyncHandler } = require("../../../shared/middleware/async-handler");

const pricingRoutes = express.Router();
const pricingController = new PricingController();

pricingRoutes.get(
  "/coupons",
  authenticate,
  authorizeCapability(CAPABILITIES.ORDER_MANAGE),
  asyncHandler(pricingController.listCoupons),
);
pricingRoutes.post(
  "/coupons",
  authenticate,
  authorizeCapability(CAPABILITIES.ORDER_MANAGE),
  validateRequest(createCouponSchema),
  asyncHandler(pricingController.createCoupon),
);
pricingRoutes.get(
  "/coupons/:couponId",
  authenticate,
  authorizeCapability(CAPABILITIES.ORDER_MANAGE),
  validateRequest(couponParamSchema),
  asyncHandler(pricingController.getCoupon),
);
pricingRoutes.patch(
  "/coupons/:couponId",
  authenticate,
  authorizeCapability(CAPABILITIES.ORDER_MANAGE),
  validateRequest(updateCouponSchema),
  asyncHandler(pricingController.updateCoupon),
);
pricingRoutes.delete(
  "/coupons/:couponId",
  authenticate,
  authorizeCapability(CAPABILITIES.ORDER_MANAGE),
  validateRequest(couponParamSchema),
  asyncHandler(pricingController.deleteCoupon),
);

module.exports = { pricingRoutes };
