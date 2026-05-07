const { mongoose } = require("../../../infrastructure/mongo/mongo-client");

const userPreferenceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    preferredCategories: [{ type: String }],
    preferredBrands: [{ type: String }],
    preferredPriceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
    },
    language: { type: String, default: "en" },
    timezone: { type: String, default: "Asia/Kolkata" },
    blockedSellerIds: [{ type: String }],
  },
  { timestamps: true },
);

const UserPreferenceModel = mongoose.model("UserPreference", userPreferenceSchema);

module.exports = { UserPreferenceModel };

