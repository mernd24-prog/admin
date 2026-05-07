const { successResponse } = require("../../../shared/http/response");
const { PlatformService } = require("../services/platform.service");

class PlatformController {
  constructor({ platformService = new PlatformService() } = {}) {
    this.platformService = platformService;
  }

  createCategory = async (req, res) => {
    const category = await this.platformService.createCategory(req.body);
    res.status(201).json(successResponse(category));
  };

  updateCategory = async (req, res) => {
    const category = await this.platformService.updateCategory(req.params.categoryKey, req.body);
    res.json(successResponse(category));
  };

  getCategory = async (req, res) => {
    const category = await this.platformService.getCategory(req.params.categoryKey);
    res.json(successResponse(category));
  };

  listCategories = async (req, res) => {
    const result = await this.platformService.listCategories(req.query);
    res.json(successResponse(result.items, { total: result.total }));
  };

  deleteCategory = async (req, res) => {
    const category = await this.platformService.deleteCategory(req.params.categoryKey);
    res.json(successResponse(category));
  };

  createProductFamily = async (req, res) => {
    const family = await this.platformService.createProductFamily(req.body);
    res.status(201).json(successResponse(family));
  };

  updateProductFamily = async (req, res) => {
    const family = await this.platformService.updateProductFamily(req.params.familyCode, req.body);
    res.json(successResponse(family));
  };

  getProductFamily = async (req, res) => {
    const family = await this.platformService.getProductFamily(req.params.familyCode);
    res.json(successResponse(family));
  };

  listProductFamilies = async (req, res) => {
    const result = await this.platformService.listProductFamilies(req.query);
    res.json(successResponse(result.items, { total: result.total }));
  };

  deleteProductFamily = async (req, res) => {
    const family = await this.platformService.deleteProductFamily(req.params.familyCode);
    res.json(successResponse(family));
  };

  createProductVariant = async (req, res) => {
    const variant = await this.platformService.createProductVariant(req.body);
    res.status(201).json(successResponse(variant));
  };

  updateProductVariant = async (req, res) => {
    const variant = await this.platformService.updateProductVariant(req.params.variantId, req.body);
    res.json(successResponse(variant));
  };

  getProductVariant = async (req, res) => {
    const variant = await this.platformService.getProductVariant(req.params.variantId);
    res.json(successResponse(variant));
  };

  listProductVariants = async (req, res) => {
    const result = await this.platformService.listProductVariants(req.query);
    res.json(successResponse(result.items, { total: result.total }));
  };

  deleteProductVariant = async (req, res) => {
    const variant = await this.platformService.deleteProductVariant(req.params.variantId);
    res.json(successResponse(variant));
  };

  createHsnCode = async (req, res) => {
    const item = await this.platformService.createHsnCode(req.body);
    res.status(201).json(successResponse(item));
  };

  updateHsnCode = async (req, res) => {
    const item = await this.platformService.updateHsnCode(req.params.hsnCode, req.body);
    res.json(successResponse(item));
  };

  getHsnCode = async (req, res) => {
    const item = await this.platformService.getHsnCode(req.params.hsnCode);
    res.json(successResponse(item));
  };

  listHsnCodes = async (req, res) => {
    const result = await this.platformService.listHsnCodes(req.query);
    res.json(successResponse(result.items, { total: result.total }));
  };

  deleteHsnCode = async (req, res) => {
    const item = await this.platformService.deleteHsnCode(req.params.hsnCode);
    res.json(successResponse(item));
  };

  createGeography = async (req, res) => {
    const item = await this.platformService.createGeography(req.body);
    res.status(201).json(successResponse(item));
  };

  updateGeography = async (req, res) => {
    const item = await this.platformService.updateGeography(req.params.countryCode, req.body);
    res.json(successResponse(item));
  };

  getGeography = async (req, res) => {
    const item = await this.platformService.getGeography(req.params.countryCode);
    res.json(successResponse(item));
  };

  listGeographies = async (req, res) => {
    const result = await this.platformService.listGeographies(req.query);
    res.json(successResponse(result.items, { total: result.total }));
  };

  deleteGeography = async (req, res) => {
    const item = await this.platformService.deleteGeography(req.params.countryCode);
    res.json(successResponse(item));
  };

  createContentPage = async (req, res) => {
    const item = await this.platformService.createContentPage(req.body);
    res.status(201).json(successResponse(item));
  };

  updateContentPage = async (req, res) => {
    const item = await this.platformService.updateContentPage(req.params.slug, req.body);
    res.json(successResponse(item));
  };

  getContentPage = async (req, res) => {
    const item = await this.platformService.getContentPage(req.params.slug);
    res.json(successResponse(item));
  };

  listContentPages = async (req, res) => {
    const result = await this.platformService.listContentPages(req.query);
    res.json(successResponse(result.items, { total: result.total }));
  };

  deleteContentPage = async (req, res) => {
    const item = await this.platformService.deleteContentPage(req.params.slug);
    res.json(successResponse(item));
  };
}

module.exports = { PlatformController };