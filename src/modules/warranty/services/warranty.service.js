const { WarrantyRepository } = require("../repositories/warranty.repository");
const { ProductRepository } = require("../../product/repositories/product.repository");
const { OrderRepository } = require("../../order/repositories/order.repository");
const { EventPublisher } = require("../../../infrastructure/events/event-publisher");
const { v4: uuidv4 } = require("uuid");

class WarrantyService {
  constructor({
    warrantyRepository = new WarrantyRepository(),
    productRepository = new ProductRepository(),
    orderRepository = new OrderRepository(),
    eventPublisher = new EventPublisher(),
  } = {}) {
    this.warrantyRepository = warrantyRepository;
    this.productRepository = productRepository;
    this.orderRepository = orderRepository;
    this.eventPublisher = eventPublisher;
  }

  async registerWarranty(orderId, productId, variantId = null) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new Error("Order not found");

    const product = await this.productRepository.findById(productId);
    if (!product) throw new Error("Product not found");

    if (!product.warranty) throw new Error("Product has no warranty");

    const warrantyData = {
      warrantyId: uuidv4(),
      orderId,
      productId,
      variantId,
      customerId: order.customerId,
      sellerId: order.sellerId,
      warrantyDetails: product.warranty,
      startDate: new Date(),
      endDate: this.calculateEndDate(product.warranty),
      status: "active",
      claims: [],
    };

    const warranty = await this.warrantyRepository.create(warrantyData);

    await this.eventPublisher.publish("warranty.registered", {
      warrantyId: warranty.warrantyId,
      orderId,
      productId,
      customerId: order.customerId,
    });

    return warranty;
  }

  async getWarranty(warrantyId) {
    return await this.warrantyRepository.findById(warrantyId);
  }

  async getWarrantiesByOrder(orderId) {
    return await this.warrantyRepository.findByOrderId(orderId);
  }

  async getWarrantiesByCustomer(customerId) {
    return await this.warrantyRepository.findByCustomerId(customerId);
  }

  async claimWarranty(warrantyId, claimData) {
    const warranty = await this.warrantyRepository.findById(warrantyId);
    if (!warranty) throw new Error("Warranty not found");

    if (warranty.status !== "active") throw new Error("Warranty is not active");

    const claim = {
      claimId: uuidv4(),
      ...claimData,
      status: "pending",
      createdAt: new Date(),
    };

    warranty.claims.push(claim);
    await this.warrantyRepository.update(warrantyId, warranty);

    await this.eventPublisher.publish("warranty.claimed", {
      warrantyId,
      claimId: claim.claimId,
      customerId: warranty.customerId,
    });

    return claim;
  }

  async updateClaimStatus(warrantyId, claimId, status, notes = null) {
    const warranty = await this.warrantyRepository.findById(warrantyId);
    if (!warranty) throw new Error("Warranty not found");

    const claim = warranty.claims.find(c => c.claimId === claimId);
    if (!claim) throw new Error("Claim not found");

    claim.status = status;
    if (notes) claim.notes = notes;
    claim.updatedAt = new Date();

    await this.warrantyRepository.update(warrantyId, warranty);

    return claim;
  }

  calculateEndDate(warranty) {
    const startDate = new Date();
    if (warranty.periodUnit === "years") {
      startDate.setFullYear(startDate.getFullYear() + warranty.period);
    } else if (warranty.periodUnit === "months") {
      startDate.setMonth(startDate.getMonth() + warranty.period);
    } else if (warranty.periodUnit === "days") {
      startDate.setDate(startDate.getDate() + warranty.period);
    }
    return startDate;
  }

  async getProductWarranty(productId) {
    const product = await this.productRepository.findById(productId);
    return product?.warranty || null;
  }
}

module.exports = { WarrantyService };