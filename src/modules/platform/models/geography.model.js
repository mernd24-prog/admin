const { mongoose } = require("../../../infrastructure/mongo/mongo-client");

const geographySchema = new mongoose.Schema(
  {
    countryCode: { type: String, required: true, unique: true, index: true },
    countryName: { type: String, required: true },
    active: { type: Boolean, default: true, index: true },
    states: [
      {
        stateCode: { type: String, required: true },
        stateName: { type: String, required: true },
        cities: [{ type: String }],
      },
    ],
  },
  { timestamps: true },
);

const GeographyModel = mongoose.model("Geography", geographySchema);

module.exports = { GeographyModel };