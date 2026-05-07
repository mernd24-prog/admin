const { successResponse } = require("../../../shared/http/response");
const { OrderService } = require("../services/order.service");
const { requireActor } = require("../../../shared/auth/actor-context");

class OrderController {
  constructor({ orderService = new OrderService() } = {}) {
    this.orderService = orderService;
  }

  create = async (req, res) => {
    const actor = requireActor(req);
    const order = await this.orderService.createOrder(req.body, actor);
    res.status(201).json(successResponse(order));
  };

  listMine = async (req, res) => {
    const actor = requireActor(req);
    const orders = await this.orderService.listMyOrders(actor);
    res.json(successResponse(orders));
  };

  listSellerOrders = async (req, res) => {
    const actor = requireActor(req);
    const orders = await this.orderService.listSellerOrders(actor);
    res.json(successResponse(orders));
  };

  getOne = async (req, res) => {
    const actor = requireActor(req);
    const order = await this.orderService.getOrder(req.params.orderId, actor);
    res.json(successResponse(order));
  };

  cancel = async (req, res) => {
    const actor = requireActor(req);
    const order = await this.orderService.cancelOrder(req.params.orderId, req.body, actor);
    res.json(successResponse(order));
  };

  updateStatus = async (req, res) => {
    const actor = requireActor(req);
    const order = await this.orderService.updateOrderStatus(req.params.orderId, req.body.status, actor);
    res.json(successResponse(order));
  };
}

module.exports = { OrderController };
