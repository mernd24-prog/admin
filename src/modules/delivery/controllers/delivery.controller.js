"use strict";

const { successResponse } = require("../../../shared/http/response");
const { requireActor } = require("../../../shared/auth/actor-context");
const { DeliveryService } = require("../services/delivery.service");

class DeliveryController {
  constructor({ deliveryService = new DeliveryService() } = {}) {
    this.deliveryService = deliveryService;
  }

  serviceability = async (req, res) => {
    const result = await this.deliveryService.getServiceability(req.query.pincode);
    res.json(successResponse(result));
  };

  createEWayBill = async (req, res) => {
    const actor = requireActor(req);
    const result = await this.deliveryService.createEWayBill(req.params.orderId, req.body, actor);
    res.status(201).json(successResponse(result));
  };

  getEWayBill = async (req, res) => {
    const actor = requireActor(req);
    const result = await this.deliveryService.getEWayBill(req.params.orderId, actor);
    res.json(successResponse(result));
  };

  updateEWayBillStatus = async (req, res) => {
    const actor = requireActor(req);
    const result = await this.deliveryService.updateEWayBillStatus(req.params.ewayBillId, req.body, actor);
    res.json(successResponse(result));
  };
}

module.exports = { DeliveryController };
