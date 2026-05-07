const { mongoose } = require("../../../infrastructure/mongo/mongo-client");

const productReviewSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, index: true },
    buyerId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "" },
    reviewText: { type: String, default: "" },
    media: { type: [String], default: [] },
    helpfulVotes: { type: Number, default: 0 },
    status: { type: String, default: "published", index: true },
  },
  { timestamps: true },
);

productReviewSchema.index({ productId: 1, createdAt: -1 });

const ProductReviewModel = mongoose.model("ProductReview", productReviewSchema);

module.exports = { ProductReviewModel };
