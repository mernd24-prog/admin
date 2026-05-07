const express = require("express");
const { PlatformController } = require("../controllers/platform.controller");
const { authenticate } = require("../../../shared/middleware/authenticate");
const { authorizeCapability } = require("../../../shared/middleware/authorize");
const { asyncHandler } = require("../../../shared/middleware/async-handler");
const { validateRequest } = require("../../../shared/middleware/validate-request");
const { CAPABILITIES } = require("../../../shared/constants/capabilities");
const {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesSchema,
  categoryKeySchema,
  createProductFamilySchema,
  updateProductFamilySchema,
  listProductFamiliesSchema,
  productFamilyCodeSchema,
  createProductVariantSchema,
  updateProductVariantSchema,
  listProductVariantsSchema,
  productVariantIdSchema,
  createHsnCodeSchema,
  updateHsnCodeSchema,
  listHsnCodesSchema,
  hsnCodeParamSchema,
  createGeographySchema,
  updateGeographySchema,
  listGeographiesSchema,
  geographyParamSchema,
  createContentPageSchema,
  updateContentPageSchema,
  listContentPagesSchema,
  contentPageSlugSchema,
} = require("../validation/platform.validation");

const platformRoutes = express.Router();
const platformController = new PlatformController();

platformRoutes.get("/categories", validateRequest(listCategoriesSchema), asyncHandler(platformController.listCategories));
platformRoutes.get("/categories/:categoryKey", validateRequest(categoryKeySchema), asyncHandler(platformController.getCategory));
platformRoutes.post(
  "/categories",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(createCategorySchema),
  asyncHandler(platformController.createCategory),
);
platformRoutes.patch(
  "/categories/:categoryKey",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(updateCategorySchema),
  asyncHandler(platformController.updateCategory),
);
platformRoutes.delete(
  "/categories/:categoryKey",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(categoryKeySchema),
  asyncHandler(platformController.deleteCategory),
);

platformRoutes.get("/families", validateRequest(listProductFamiliesSchema), asyncHandler(platformController.listProductFamilies));
platformRoutes.get("/families/:familyCode", validateRequest(productFamilyCodeSchema), asyncHandler(platformController.getProductFamily));
platformRoutes.post(
  "/families",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(createProductFamilySchema),
  asyncHandler(platformController.createProductFamily),
);
platformRoutes.patch(
  "/families/:familyCode",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(updateProductFamilySchema),
  asyncHandler(platformController.updateProductFamily),
);
platformRoutes.delete(
  "/families/:familyCode",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(productFamilyCodeSchema),
  asyncHandler(platformController.deleteProductFamily),
);

platformRoutes.get("/variants", validateRequest(listProductVariantsSchema), asyncHandler(platformController.listProductVariants));
platformRoutes.get("/variants/:variantId", validateRequest(productVariantIdSchema), asyncHandler(platformController.getProductVariant));
platformRoutes.post(
  "/variants",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(createProductVariantSchema),
  asyncHandler(platformController.createProductVariant),
);
platformRoutes.patch(
  "/variants/:variantId",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(updateProductVariantSchema),
  asyncHandler(platformController.updateProductVariant),
);
platformRoutes.delete(
  "/variants/:variantId",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(productVariantIdSchema),
  asyncHandler(platformController.deleteProductVariant),
);

platformRoutes.get("/hsn-codes", validateRequest(listHsnCodesSchema), asyncHandler(platformController.listHsnCodes));
platformRoutes.get("/hsn-codes/:hsnCode", validateRequest(hsnCodeParamSchema), asyncHandler(platformController.getHsnCode));
platformRoutes.post(
  "/hsn-codes",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(createHsnCodeSchema),
  asyncHandler(platformController.createHsnCode),
);
platformRoutes.patch(
  "/hsn-codes/:hsnCode",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(updateHsnCodeSchema),
  asyncHandler(platformController.updateHsnCode),
);
platformRoutes.delete(
  "/hsn-codes/:hsnCode",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(hsnCodeParamSchema),
  asyncHandler(platformController.deleteHsnCode),
);

platformRoutes.get("/geographies", validateRequest(listGeographiesSchema), asyncHandler(platformController.listGeographies));
platformRoutes.get("/geographies/:countryCode", validateRequest(geographyParamSchema), asyncHandler(platformController.getGeography));
platformRoutes.post(
  "/geographies",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(createGeographySchema),
  asyncHandler(platformController.createGeography),
);
platformRoutes.patch(
  "/geographies/:countryCode",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(updateGeographySchema),
  asyncHandler(platformController.updateGeography),
);
platformRoutes.delete(
  "/geographies/:countryCode",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(geographyParamSchema),
  asyncHandler(platformController.deleteGeography),
);

platformRoutes.get("/cms", validateRequest(listContentPagesSchema), asyncHandler(platformController.listContentPages));
platformRoutes.get("/cms/:slug", validateRequest(contentPageSlugSchema), asyncHandler(platformController.getContentPage));
platformRoutes.post(
  "/cms",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(createContentPageSchema),
  asyncHandler(platformController.createContentPage),
);
platformRoutes.patch(
  "/cms/:slug",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(updateContentPageSchema),
  asyncHandler(platformController.updateContentPage),
);
platformRoutes.delete(
  "/cms/:slug",
  authenticate,
  authorizeCapability(CAPABILITIES.CATALOG_MANAGE),
  validateRequest(contentPageSlugSchema),
  asyncHandler(platformController.deleteContentPage),
);

module.exports = { platformRoutes };