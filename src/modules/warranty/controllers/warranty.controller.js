const { successResponse } = require("../../../shared/http/response");
const { WarrantyService } = require("../services/warranty.service");

class WarrantyController {
  constructor({ warrantyService = new WarrantyService() } = {}) {
    this.warrantyService = warrantyService;
  }

  registerWarranty = async (req, res) => {
    const { orderId, productId, variantId } = req.body;
    const warranty = await this.warrantyService.registerWarranty(orderId, productId, variantId);
    res.status(201).json(successResponse(warranty));
  };

  getWarranty = async (req, res) => {
    const warranty = await this.warrantyService.getWarranty(req.params.warrantyId);
    res.json(successResponse(warranty));
  };

  getWarrantiesByOrder = async (req, res) => {
    const warranties = await this.warrantyService.getWarrantiesByOrder(req.params.orderId);
    res.json(successResponse(warranties));
  };

  getWarrantiesByCustomer = async (req, res) => {
    const warranties = await this.warrantyService.getWarrantiesByCustomer(req.params.customerId);
    res.json(successResponse(warranties));
  };

  claimWarranty = async (req, res) => {
    const claim = await this.warrantyService.claimWarranty(req.params.warrantyId, req.body);
    res.status(201).json(successResponse(claim));
  };

  updateClaimStatus = async (req, res) => {
    const { status, notes } = req.body;
    const claim = await this.warrantyService.updateClaimStatus(req.params.warrantyId, req.params.claimId, status, notes);
    res.json(successResponse(claim));
  };

  getProductWarranty = async (req, res) => {
    const warranty = await this.warrantyService.getProductWarranty(req.params.productId);
    res.json(successResponse(warranty));
  };
}

module.exports = { WarrantyController };