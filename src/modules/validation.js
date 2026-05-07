const Joi = require("joi");

const loyaltyValidation = {
  addPoints: Joi.object({
    points: Joi.number().positive().required(),
    reason: Joi.string().valid("purchase", "referral", "birthday", "tier_upgrade").required(),
    expiresAt: Joi.date().iso().optional(),
    transactionId: Joi.string().optional(),
  }),

  redeemPoints: Joi.object({
    points: Joi.number().positive().required(),
  }),

  getPointsHistory: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
  }),
};

const recommendationValidation = {
  getRecommendations: Joi.object({
    limit: Joi.number().default(10).max(50),
  }),
  recordInteraction: Joi.object({
    productId: Joi.string().required(),
    interactionType: Joi.string().valid("clicked", "purchased", "viewed").required(),
  }),
  getTrending: Joi.object({
    category: Joi.string().optional(),
    period: Joi.string().valid("today", "week", "month").default("week"),
  }),

  addRecommendation: Joi.object({
    productId: Joi.string().required(),
    reason: Joi.string().required(),
    score: Joi.number().min(0).max(100),
  }),
};

const returnValidation = {
  requestReturn: Joi.object({
    orderId: Joi.string().required(),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().required(),
          quantity: Joi.number().positive().required(),
          unitPrice: Joi.number().positive().required(),
        }),
      )
      .required(),
    reason: Joi.string().valid("defective", "not_as_described", "changed_mind", "other").required(),
    description: Joi.string().max(500),
  }),

  approveReturn: Joi.object({
    refundAmount: Joi.number().positive().required(),
  }),

  shipReturn: Joi.object({
    trackingNumber: Joi.string().required(),
  }),
  getReturnByOrder: Joi.object({
    orderId: Joi.string().required(),
  }),
  processRefund: Joi.object({
    returnId: Joi.string().required(),
  }),
};

const dynamicPricingValidation = {
  getPriceForProduct: Joi.object({
    productId: Joi.string().required(),
    userTier: Joi.string().valid("bronze", "silver", "gold", "platinum"),
    quantity: Joi.number().default(1).min(1),
  }),

  adjustPrice: Joi.object({
    productId: Joi.string().required(),
    newPrice: Joi.number().positive().required(),
    reason: Joi.string().required(),
  }),

  applyRule: Joi.object({
    productId: Joi.string().required(),
    type: Joi.string().valid("time_based", "volume_based", "demand_based", "seasonal").required(),
    condition: Joi.object().required(),
    priceModifier: Joi.number().positive().required(),
    priority: Joi.number().required(),
  }),
};

const notificationValidation = {
  updatePreferences: Joi.object({
    channels: Joi.object({
      email: Joi.boolean(),
      sms: Joi.boolean(),
      push: Joi.boolean(),
      inApp: Joi.boolean(),
    }),
    eventTypes: Joi.object({
      order: Joi.boolean(),
      payment: Joi.boolean(),
      shipping: Joi.boolean(),
      promo: Joi.boolean(),
      referral: Joi.boolean(),
      newProduct: Joi.boolean(),
    }),
    frequency: Joi.string().valid("real_time", "daily", "weekly", "never"),
    doNotDisturbStart: Joi.string().pattern(/^\d{2}:\d{2}$/),
    doNotDisturbEnd: Joi.string().pattern(/^\d{2}:\d{2}$/),
    timezone: Joi.string(),
  }),
};

const fraudValidation = {
  analyzeOrder: Joi.object({
    order: Joi.object().required(),
    paymentInfo: Joi.object().required(),
    userProfile: Joi.object(),
    orderHistory: Joi.array(),
  }),

  reviewOrder: Joi.object({
    decision: Joi.string().valid("approved", "rejected").required(),
    notes: Joi.string().max(500),
  }),
};

const commissionValidation = {
  calculateCommission: Joi.object({
    orderId: Joi.string().required(),
  }),
  processPayouts: Joi.object({
    sellerId: Joi.string().required(),
  }),
};

module.exports = {
  loyaltyValidation,
  recommendationValidation,
  returnValidation,
  dynamicPricingValidation,
  notificationValidation,
  fraudValidation,
  commissionValidation,
};
