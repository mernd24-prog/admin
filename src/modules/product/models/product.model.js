const { mongoose } = require("../../../infrastructure/mongo/mongo-client");

const productSchema = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, index: true },
    title: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, index: true },
    mrp: { type: Number, required: true },
    gstRate: { type: Number, required: true, default: 18 },
    currency: { type: String, default: "INR" },
    category: { type: String, required: true, index: true },
    productFamilyCode: { type: String, index: true },
    sku: { type: String, index: true },
    color: { type: String, index: true },
    attributes: { type: Object, default: {} },
    options: [
      {
        name: { type: String, required: true },
        values: [{ type: String }],
        required: { type: Boolean, default: false },
        displayType: { type: String, default: "dropdown" },
      },
    ],
    dimensions: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
      unit: { type: String, default: "cm" },
      weight: { type: Number },
      weightUnit: { type: String, default: "kg" },
    },
    hsnCode: { type: String, index: true },
    origin: {
      country: { type: String, index: true },
      state: { type: String, index: true },
      city: { type: String, index: true },
    },
    warranty: {
      period: { type: Number, min: 0 },
      periodUnit: { type: String, enum: ["days", "weeks", "months", "years"], default: "months" },
      type: { type: String, default: "manufacturer" },
      provider: { type: String },
      terms: { type: String },
      returnPolicy: {
        eligible: { type: Boolean, default: true },
        days: { type: Number, min: 0, default: 7 },
        type: { type: String, default: "standard" },
        restockingFee: { type: Number, default: 0 },
      },
      serviceableCountries: [{ type: String }],
    },
    metadata: { type: Object, default: {} },
    stock: { type: Number, required: true, default: 0 },
    reservedStock: { type: Number, required: true, default: 0 },
    images: [{ type: String }],
    rating: { type: Number, default: 0 },
    status: { type: String, default: "draft", index: true },
    moderation: {
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
      reviewedBy: { type: String },
      rejectionReason: { type: String },
      checklist: {
        titleVerified: { type: Boolean, default: false },
        categoryVerified: { type: Boolean, default: false },
        complianceVerified: { type: Boolean, default: false },
        mediaVerified: { type: Boolean, default: false },
      },
    },
  },
  { timestamps: true },
);

productSchema.index({ title: "text", description: "text", category: 1 });

const ProductModel = mongoose.model("Product", productSchema);

module.exports = { ProductModel };
