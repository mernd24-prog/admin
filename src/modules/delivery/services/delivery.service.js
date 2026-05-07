"use strict";

const { AppError } = require("../../../shared/errors/app-error");
const { DeliveryRepository } = require("../repositories/delivery.repository");
const { OrderRepository } = require("../../order/repositories/order.repository");

class DeliveryService {
  constructor({
    deliveryRepository = new DeliveryRepository(),
    orderRepository = new OrderRepository(),
  } = {}) {
    this.deliveryRepository = deliveryRepository;
    this.orderRepository = orderRepository;
  }

  async getServiceability(pincode) {
    const result = await this.deliveryRepository.getServiceability(pincode);
    return {
      pincode,
      serviceable: Boolean(result.serviceability?.serviceable) && result.exclusions.length === 0,
      codAvailable: Boolean(result.serviceability?.cod_available),
      estimatedDeliveryDays: result.serviceability?.estimated_delivery_days || null,
      city: result.serviceability?.city || null,
      state: result.serviceability?.state || null,
      zoneCode: result.serviceability?.zone_code || null,
      exclusions: result.exclusions,
    };
  }

  async createEWayBill(orderId, payload, actor) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    await this.assertCanManageOrder(orderId, actor);

    return this.deliveryRepository.createEWayBill({
      ...payload,
      orderId,
    });
  }

  async getEWayBill(orderId, actor) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new AppError("Order not found", 404);
    }

    await this.assertCanViewOrder(order, orderId, actor);
    return this.deliveryRepository.findEWayBillByOrderId(orderId);
  }

  async updateEWayBillStatus(ewayBillId, payload, actor) {
    const existing = await this.deliveryRepository.findEWayBillById(ewayBillId);
    if (!existing) {
      throw new AppError("Delivery record not found", 404);
    }

    await this.assertCanManageOrder(existing.order_id, actor);

    const record = await this.deliveryRepository.updateEWayBillStatus(ewayBillId, payload);
    if (!record) {
      throw new AppError("Delivery record not found", 404);
    }
    return record;
  }

  async assertCanViewOrder(order, orderId, actor) {
    if (["admin", "super-admin"].includes(actor.role) || order.buyer_id === actor.userId) {
      return;
    }

    await this.assertCanManageOrder(orderId, actor);
  }

  async assertCanManageOrder(orderId, actor) {
    if (["admin", "super-admin"].includes(actor.role)) {
      return;
    }

    if (!["seller", "seller-sub-admin"].includes(actor.role)) {
      throw new AppError("You are not allowed to manage delivery for this order", 403);
    }

    const sellerId = actor.ownerSellerId || actor.userId;
    const isSellerInOrder = await this.orderRepository.isSellerInOrder(orderId, sellerId);
    if (!isSellerInOrder) {
      throw new AppError("You are not allowed to manage delivery for this order", 403);
    }
  }
}

module.exports = { DeliveryService };
