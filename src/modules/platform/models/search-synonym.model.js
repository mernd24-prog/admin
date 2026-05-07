const { mongoose } = require("../../../infrastructure/mongo/mongo-client");

const searchSynonymSchema = new mongoose.Schema(
  {
    term: { type: String, required: true, index: true },
    synonyms: [{ type: String, required: true }],
    category: { type: String, default: "global", index: true },
    active: { type: Boolean, default: true, index: true },
    source: { type: String, default: "manual" },
  },
  { timestamps: true },
);

searchSynonymSchema.index({ term: 1, category: 1 }, { unique: true });

const SearchSynonymModel = mongoose.model("SearchSynonym", searchSynonymSchema);

module.exports = { SearchSynonymModel };

