const { mongoose } = require("../../../infrastructure/mongo/mongo-client");

const featureRequestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    submittedBy: { type: String, required: true, index: true },
    votes: { type: Number, default: 0 },
    status: { type: String, default: "open", index: true },
    tags: [{ type: String }],
  },
  { timestamps: true },
);

const FeatureRequestModel = mongoose.model("FeatureRequest", featureRequestSchema);

module.exports = { FeatureRequestModel };

