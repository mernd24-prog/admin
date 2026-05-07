const { mongoose } = require("../../../infrastructure/mongo/mongo-client");

const productVariantSchema = new mongoose.Schema(
  {
    familyCode: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    sellerId: { type: String, required: true, index: true },
    sku: { type: String, required: true, index: true },
    attributes: { type: Object, default: {} },
    stock: { type: Number, default: 0 },
    reservedStock: { type: Number, default: 0 },
    status: { type: String, default: "active", index: true },
  },
  { timestamps: true },
);

productVariantSchema.index({ sellerId: 1, sku: 1 }, { unique: true });

const ProductVariantModel = mongoose.model("ProductVariant", productVariantSchema);

module.exports = { ProductVariantModel };
