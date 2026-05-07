const mongoose = require("mongoose");

const warrantySchema = new mongoose.Schema({
  warrantyId: { type: String, required: true, unique: true },
  orderId: { type: String, required: true },
  productId: { type: String, required: true },
  variantId: { type: String, default: null },
  customerId: { type: String, required: true },
  sellerId: { type: String, required: true },
  warrantyDetails: {
    period: { type: Number, required: true },
    periodUnit: { type: String, enum: ["days", "months", "years"], required: true },
    type: { type: String, required: true },
    provider: { type: String, required: true },
    terms: { type: String },
    returnPolicy: {
      eligible: { type: Boolean, default: true },
      days: { type: Number, default: 30 },
      type: { type: String, enum: ["refund", "exchange", "repair"], default: "refund" },
      restockingFee: { type: Number, default: 0 },
    },
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ["active", "expired", "voided"], default: "active" },
  claims: [{
    claimId: { type: String, required: true },
    reason: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ["pending", "approved", "rejected", "completed"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    notes: { type: String },
  }],
}, { timestamps: true });

const Warranty = mongoose.model("Warranty", warrantySchema);

class WarrantyRepository {
  async create(warrantyData) {
    const warranty = new Warranty(warrantyData);
    return await warranty.save();
  }

  async findById(warrantyId) {
    return await Warranty.findOne({ warrantyId });
  }

  async findByOrderId(orderId) {
    return await Warranty.find({ orderId });
  }

  async findByCustomerId(customerId) {
    return await Warranty.find({ customerId });
  }

  async update(warrantyId, updateData) {
    return await Warranty.findOneAndUpdate({ warrantyId }, updateData, { new: true });
  }

  async delete(warrantyId) {
    return await Warranty.findOneAndDelete({ warrantyId });
  }
}

module.exports = { WarrantyRepository };