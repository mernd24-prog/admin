const { mongoose } = require("../../../infrastructure/mongo/mongo-client");

const productFamilySchema = new mongoose.Schema(
  {
    familyCode: { type: String, required: true, unique: true, index: true },
    sellerId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    baseAttributes: { type: Object, default: {} },
    variantAxes: [{ type: String }],
    status: { type: String, default: "active", index: true },
  },
  { timestamps: true },
);

const ProductFamilyModel = mongoose.model("ProductFamily", productFamilySchema);

module.exports = { ProductFamilyModel };
