const Joi = require("joi");

const registerWarrantySchema = Joi.object({
  body: Joi.object({
    orderId: Joi.string().required(),
    productId: Joi.string().required(),
    variantId: Joi.string().optional(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const warrantyIdSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    warrantyId: Joi.string().required(),
  }).required(),
});

const orderIdSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    orderId: Joi.string().required(),
  }).required(),
});

const customerIdSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    customerId: Joi.string().required(),
  }).required(),
});

const claimWarrantySchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().required(),
    description: Joi.string().optional(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    warrantyId: Joi.string().required(),
  }).required(),
});

const updateClaimStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string().valid("pending", "approved", "rejected", "completed").required(),
    notes: Joi.string().optional(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    warrantyId: Joi.string().required(),
    claimId: Joi.string().required(),
  }).required(),
});

const productIdSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    productId: Joi.string().required(),
  }).required(),
});

module.exports = {
  registerWarrantySchema,
  warrantyIdSchema,
  orderIdSchema,
  customerIdSchema,
  claimWarrantySchema,
  updateClaimStatusSchema,
  productIdSchema,
};