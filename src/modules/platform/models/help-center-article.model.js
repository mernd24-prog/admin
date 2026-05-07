const { mongoose } = require("../../../infrastructure/mongo/mongo-client");

const helpCenterArticleSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    category: { type: String, required: true, index: true },
    body: { type: String, required: true },
    tags: [{ type: String }],
    language: { type: String, default: "en", index: true },
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

const HelpCenterArticleModel = mongoose.model("HelpCenterArticle", helpCenterArticleSchema);

module.exports = { HelpCenterArticleModel };

