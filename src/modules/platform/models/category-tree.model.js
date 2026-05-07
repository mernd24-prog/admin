const { mongoose } = require("../../../infrastructure/mongo/mongo-client");

const categoryTreeSchema = new mongoose.Schema(
  {
    categoryKey: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    parentKey: { type: String, default: null, index: true },
    level: { type: Number, default: 0, min: 0 },
    attributesSchema: { type: Object, default: {} },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const CategoryTreeModel = mongoose.model("CategoryTree", categoryTreeSchema);

module.exports = { CategoryTreeModel };
