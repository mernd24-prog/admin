const express = require("express");
const { SellerController } = require("../controllers/seller.controller");
const { asyncHandler } = require("../../../shared/middleware/async-handler");
const { authenticate, authenticatePendingSeller } = require("../../../shared/middleware/authenticate");
const { authorizeCapability } = require("../../../shared/middleware/authorize");
const { validateRequest } = require("../../../shared/middleware/validate-request");
const {
  submitKycSchema,
  reviewSellerKycSchema,
  updateSellerProfileSchema,
  updateSellerSettingsSchema,
  updateSellerAddressSchema,
  updateSellerBankSchema,
  updateSellerMoreInfoSchema,
  sellerDashboardSchema,
  sellerWebStatusSchema,
  sellerTrackingSchema,
  sellerTrackingOrderSchema,
  createSellerSubAdminSchema,
  listSellerSubAdminsSchema,
  updateSellerSubAdminModulesSchema,
} = require("../validation/seller.validation");
const { CAPABILITIES } = require("../../../shared/constants/capabilities");

const sellerRoutes = express.Router();
const sellerController = new SellerController();

// Onboarding routes - accessible with onboarding token
sellerRoutes.post(
  "/onboarding/kyc",
  authenticatePendingSeller,
  validateRequest(submitKycSchema),
  asyncHandler(sellerController.submitKyc),
);
sellerRoutes.patch(
  "/onboarding/profile",
  authenticatePendingSeller,
  validateRequest(updateSellerProfileSchema),
  asyncHandler(sellerController.updateProfile),
);

// Admin routes
sellerRoutes.patch(
  "/:sellerId/kyc/review",
  authenticate,
  authorizeCapability(CAPABILITIES.KYC_REVIEW),
  validateRequest(reviewSellerKycSchema),
  asyncHandler(sellerController.reviewKyc),
);

// Authenticated seller routes
sellerRoutes.get(
  "/me/status",
  authenticate,
  validateRequest(sellerWebStatusSchema),
  asyncHandler(sellerController.getWebStatus),
);
sellerRoutes.get(
  "/me/tracking",
  authenticate,
  validateRequest(sellerTrackingSchema),
  asyncHandler(sellerController.listWebTracking),
);
sellerRoutes.get(
  "/me/tracking/:orderId",
  authenticate,
  validateRequest(sellerTrackingOrderSchema),
  asyncHandler(sellerController.getWebTrackingOrder),
);
sellerRoutes.get(
  "/me/profile",
  authenticate,
  authorizeCapability(CAPABILITIES.SELLER_PROFILE_MANAGE),
  asyncHandler(sellerController.getProfile),
);
sellerRoutes.patch(
  "/me/profile",
  authenticate,
  authorizeCapability(CAPABILITIES.SELLER_PROFILE_MANAGE),
  validateRequest(updateSellerProfileSchema),
  asyncHandler(sellerController.updateProfile),
);
sellerRoutes.patch(
  "/me/business-address",
  authenticate,
  authorizeCapability(CAPABILITIES.SELLER_PROFILE_MANAGE),
  validateRequest(updateSellerAddressSchema),
  asyncHandler(sellerController.updateBusinessAddress),
);
sellerRoutes.patch(
  "/me/pickup-address",
  authenticate,
  authorizeCapability(CAPABILITIES.SELLER_PROFILE_MANAGE),
  validateRequest(updateSellerAddressSchema),
  asyncHandler(sellerController.updatePickupAddress),
);
sellerRoutes.patch(
  "/me/bank-details",
  authenticate,
  authorizeCapability(CAPABILITIES.SELLER_PROFILE_MANAGE),
  validateRequest(updateSellerBankSchema),
  asyncHandler(sellerController.updateBankDetails),
);
sellerRoutes.patch(
  "/me/more-info",
  authenticate,
  authorizeCapability(CAPABILITIES.SELLER_PROFILE_MANAGE),
  validateRequest(updateSellerMoreInfoSchema),
  asyncHandler(sellerController.updateMoreInfo),
);
sellerRoutes.patch(
  "/me/settings",
  authenticate,
  authorizeCapability(CAPABILITIES.SELLER_PROFILE_MANAGE),
  validateRequest(updateSellerSettingsSchema),
  asyncHandler(sellerController.updateSettings),
);
sellerRoutes.get(
  "/me/dashboard",
  authenticate,
  authorizeCapability(CAPABILITIES.SELLER_DASHBOARD_VIEW),
  validateRequest(sellerDashboardSchema),
  asyncHandler(sellerController.dashboard),
);
sellerRoutes.post(
  "/me/sub-admins",
  authenticate,
  authorizeCapability(CAPABILITIES.SELLER_PROFILE_MANAGE),
  validateRequest(createSellerSubAdminSchema),
  asyncHandler(sellerController.createSubAdmin),
);
sellerRoutes.get(
  "/me/sub-admins",
  authenticate,
  authorizeCapability(CAPABILITIES.SELLER_PROFILE_MANAGE),
  validateRequest(listSellerSubAdminsSchema),
  asyncHandler(sellerController.listSubAdmins),
);
sellerRoutes.patch(
  "/me/sub-admins/:userId/modules",
  authenticate,
  authorizeCapability(CAPABILITIES.SELLER_PROFILE_MANAGE),
  validateRequest(updateSellerSubAdminModulesSchema),
  asyncHandler(sellerController.updateSubAdminModules),
);

module.exports = { sellerRoutes };
