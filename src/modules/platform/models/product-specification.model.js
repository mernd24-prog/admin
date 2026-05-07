const { mongoose } = require("../../../infrastructure/mongo/mongo-client");

const productSpecificationSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, index: true },
    category: { type: String, required: true, index: true },
    groups: [
      {
        name: { type: String, required: true },
        attributes: [
          {
            key: { type: String, required: true },
            value: { type: String, required: true },
            unit: { type: String },
          },
        ],
      },
    ],
    compareEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSpecificationSchema.index({ productId: 1 }, { unique: true });

const ProductSpecificationModel = mongoose.model("ProductSpecification", productSpecificationSchema);

module.exports = { ProductSpecificationModel };

