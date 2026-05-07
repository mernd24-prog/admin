const express = require("express");
const { ProductController } = require("../controllers/product.controller");
const { asyncHandler } = require("../../../shared/middleware/async-handler");
const { authenticate } = require("../../../shared/middleware/authenticate");
const { authorizeCapability } = require("../../../shared/middleware/authorize");
const { validateRequest } = require("../../../shared/middleware/validate-request");
const {
  createProductSchema,
  updateProductSchema,
  listProductSchema,
  searchProductSchema,
  reviewProductSchema,
  productParamSchema,
} = require("../validation/product.validation");
const { CAPABILITIES } = require("../../../shared/constants/capabilities");

const productRoutes = express.Router();
const productController = new ProductController();

productRoutes.get("/", validateRequest(listProductSchema), asyncHandler(productController.list));
productRoutes.get("/search", validateRequest(searchProductSchema), asyncHandler(productController.search));
productRoutes.get(
  "/seller/me",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(listProductSchema),
  asyncHandler(productController.listMine),
);
productRoutes.patch(
  "/:productId/review",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_REVIEW),
  validateRequest(reviewProductSchema),
  asyncHandler(productController.review),
);
productRoutes.get("/:productId", asyncHandler(productController.getOne));
productRoutes.post(
  "/",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(createProductSchema),
  asyncHandler(productController.create),
);
productRoutes.patch(
  "/:productId",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(updateProductSchema),
  asyncHandler(productController.update),
);
productRoutes.delete(
  "/:productId",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(productParamSchema),
  asyncHandler(productController.delete),
);

module.exports = { productRoutes };
