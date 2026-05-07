const { mongoose } = require("../../../infrastructure/mongo/mongo-client");

const sellerHolidaySchema = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, default: "vacation" },
    autoReactivate: { type: Boolean, default: true },
  },
  { timestamps: true },
);

sellerHolidaySchema.index({ sellerId: 1, startDate: 1, endDate: 1 });

const SellerHolidayModel = mongoose.model("SellerHoliday", sellerHolidaySchema);

module.exports = { SellerHolidayModel };

