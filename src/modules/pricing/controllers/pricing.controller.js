const { successResponse } = require("../../../shared/http/response");
const { PricingService } = require("../services/pricing.service");

class PricingController {
  constructor({ pricingService = new PricingService() } = {}) {
    this.pricingService = pricingService;
  }

  createCoupon = async (req, res) => {
    const coupon = await this.pricingService.createCoupon(req.body);
    res.status(201).json(successResponse(coupon));
  };

  listCoupons = async (req, res) => {
    const coupons = await this.pricingService.listCoupons();
    res.json(successResponse(coupons));
  };

  getCoupon = async (req, res) => {
    const coupon = await this.pricingService.getCoupon(req.params.couponId);
    res.json(successResponse(coupon));
  };

  updateCoupon = async (req, res) => {
    const coupon = await this.pricingService.updateCoupon(req.params.couponId, req.body);
    res.json(successResponse(coupon));
  };

  deleteCoupon = async (req, res) => {
    const coupon = await this.pricingService.deleteCoupon(req.params.couponId);
    res.json(successResponse(coupon));
  };
}

module.exports = { PricingController };
