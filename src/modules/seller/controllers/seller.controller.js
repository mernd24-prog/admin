const { successResponse } = require("../../../shared/http/response");
const { SellerService } = require("../services/seller.service");
const { requireActor } = require("../../../shared/auth/actor-context");

class SellerController {
  constructor({ sellerService = new SellerService() } = {}) {
    this.sellerService = sellerService;
  }

  submitKyc = async (req, res) => {
    const actor = requireActor(req);
    const kyc = await this.sellerService.submitKyc(req.body, actor);
    res.status(201).json(successResponse(kyc));
  };

  reviewKyc = async (req, res) => {
    const actor = requireActor(req);
    const kyc = await this.sellerService.reviewKyc(req.params.sellerId, req.body, actor);
    res.json(successResponse(kyc));
  };

  getProfile = async (req, res) => {
    const actor = requireActor(req);
    const profile = await this.sellerService.getProfile(actor);
    res.json(successResponse(profile));
  };

  getWebStatus = async (req, res) => {
    const actor = requireActor(req);
    const status = await this.sellerService.getWebStatus(actor);
    res.json(successResponse(status));
  };

  listWebTracking = async (req, res) => {
    const actor = requireActor(req);
    const tracking = await this.sellerService.listWebTracking(req.query, actor);
    res.json(successResponse(tracking));
  };

  getWebTrackingOrder = async (req, res) => {
    const actor = requireActor(req);
    const tracking = await this.sellerService.getWebTrackingOrder(req.params.orderId, actor);
    res.json(successResponse(tracking));
  };

  updateProfile = async (req, res) => {
    const actor = requireActor(req);
    const profile = await this.sellerService.updateProfile(req.body, actor);
    res.json(successResponse(profile));
  };

  updateBusinessAddress = async (req, res) => {
    const actor = requireActor(req);
    const profile = await this.sellerService.patchProfileSection("businessAddress", req.body, actor);
    res.json(successResponse(profile));
  };

  updatePickupAddress = async (req, res) => {
    const actor = requireActor(req);
    const profile = await this.sellerService.patchProfileSection("pickupAddress", req.body, actor);
    res.json(successResponse(profile));
  };

  updateBankDetails = async (req, res) => {
    const actor = requireActor(req);
    const profile = await this.sellerService.patchProfileSection("bankDetails", req.body, actor);
    res.json(successResponse(profile));
  };

  updateMoreInfo = async (req, res) => {
    const actor = requireActor(req);
    const profile = await this.sellerService.updateMoreInfo(req.body, actor);
    res.json(successResponse(profile));
  };

  updateSettings = async (req, res) => {
    const actor = requireActor(req);
    const settings = await this.sellerService.updateSettings(req.body, actor);
    res.json(successResponse(settings));
  };

  dashboard = async (req, res) => {
    const actor = requireActor(req);
    const dashboard = await this.sellerService.getDashboard(req.query, actor);
    res.json(successResponse(dashboard));
  };

  createSubAdmin = async (req, res) => {
    const actor = requireActor(req);
    const user = await this.sellerService.createSellerSubAdmin(req.body, actor);
    res.status(201).json(successResponse(user));
  };

  listSubAdmins = async (req, res) => {
    const actor = requireActor(req);
    const users = await this.sellerService.listSellerSubAdmins(actor);
    res.json(successResponse(users));
  };

  updateSubAdminModules = async (req, res) => {
    const actor = requireActor(req);
    const user = await this.sellerService.updateSellerSubAdminModules(req.params.userId, req.body, actor);
    res.json(successResponse(user));
  };
}

module.exports = { SellerController };
