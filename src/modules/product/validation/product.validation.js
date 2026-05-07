const Joi = require("joi");
const { PRODUCT_STATUS } = require("../../../shared/domain/commerce-constants");

const createProductSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().min(3).max(120).required(),
    description: Joi.string().min(10).required(),
    price: Joi.number().positive().required(),
    mrp: Joi.number().positive().required(),
    category: Joi.string().required(),
    productFamilyCode: Joi.string(),
    sku: Joi.string(),
    color: Joi.string(),
    attributes: Joi.object().default({}),
    options: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().trim().required(),
          values: Joi.array().items(Joi.string().trim()).required(),
          required: Joi.boolean().default(false),
          displayType: Joi.string().trim().default("dropdown"),
        }),
      )
      .default([]),
    dimensions: Joi.object({
      length: Joi.number().positive(),
      width: Joi.number().positive(),
      height: Joi.number().positive(),
      unit: Joi.string().trim().default("cm"),
      weight: Joi.number().positive(),
      weightUnit: Joi.string().trim().default("kg"),
    }).default({}),
    hsnCode: Joi.string(),
    origin: Joi.object({
      country: Joi.string().trim(),
      state: Joi.string().trim(),
      city: Joi.string().trim(),
    }).default({}),
    warranty: Joi.object({
      period: Joi.number().integer().min(0),
      periodUnit: Joi.string().valid("days", "weeks", "months", "years").default("months"),
      type: Joi.string().trim().default("manufacturer"),
      provider: Joi.string().trim(),
      terms: Joi.string().trim(),
      returnPolicy: Joi.object({
        eligible: Joi.boolean().default(true),
        days: Joi.number().integer().min(0).default(7),
        type: Joi.string().trim().default("standard"),
        restockingFee: Joi.number().min(0).default(0),
      }).default({}),
      serviceableCountries: Joi.array().items(Joi.string().trim()).default([]),
    }).default({}),
    metadata: Joi.object().default({}),
    stock: Joi.number().integer().min(0).required(),
    images: Joi.array().items(Joi.string().uri()).default([]),
    status: Joi.string()
      .valid(...Object.values(PRODUCT_STATUS))
      .default(PRODUCT_STATUS.DRAFT),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateProductSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().min(3).max(120),
    description: Joi.string().min(10),
    price: Joi.number().positive(),
    mrp: Joi.number().positive(),
    category: Joi.string(),
    productFamilyCode: Joi.string(),
    sku: Joi.string(),
    color: Joi.string(),
    attributes: Joi.object(),
    options: Joi.array().items(
      Joi.object({
        name: Joi.string().trim().required(),
        values: Joi.array().items(Joi.string().trim()).required(),
        required: Joi.boolean(),
        displayType: Joi.string().trim(),
      }),
    ),
    dimensions: Joi.object({
      length: Joi.number().positive(),
      width: Joi.number().positive(),
      height: Joi.number().positive(),
      unit: Joi.string().trim(),
      weight: Joi.number().positive(),
      weightUnit: Joi.string().trim(),
    }),
    hsnCode: Joi.string(),
    origin: Joi.object({
      country: Joi.string().trim(),
      state: Joi.string().trim(),
      city: Joi.string().trim(),
    }),
    warranty: Joi.object({
      period: Joi.number().integer().min(0),
      periodUnit: Joi.string().valid("days", "weeks", "months", "years"),
      type: Joi.string().trim(),
      provider: Joi.string().trim(),
      terms: Joi.string().trim(),
      returnPolicy: Joi.object({
        eligible: Joi.boolean(),
        days: Joi.number().integer().min(0),
        type: Joi.string().trim(),
        restockingFee: Joi.number().min(0),
      }),
      serviceableCountries: Joi.array().items(Joi.string().trim()),
    }),
    metadata: Joi.object(),
    stock: Joi.number().integer().min(0),
    images: Joi.array().items(Joi.string().uri()),
    status: Joi.string().valid(...Object.values(PRODUCT_STATUS)),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    productId: Joi.string().required(),
  }).required(),
});

const listProductSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    category: Joi.string(),
    status: Joi.string(),
    hsnCode: Joi.string(),
    color: Joi.string(),
    country: Joi.string(),
    state: Joi.string(),
    city: Joi.string(),
    productFamilyCode: Joi.string(),
    sku: Joi.string(),
  }).required(),
  params: Joi.object({}).required(),
});

const searchProductSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    q: Joi.string().min(2).required(),
  }).required(),
  params: Joi.object({}).required(),
});

const reviewProductSchema = Joi.object({
  body: Joi.object({
    status: Joi.string()
      .valid(PRODUCT_STATUS.ACTIVE, PRODUCT_STATUS.INACTIVE, PRODUCT_STATUS.REJECTED)
      .required(),
    rejectionReason: Joi.string().max(500).allow("", null),
    checklist: Joi.object({
      titleVerified: Joi.boolean(),
      categoryVerified: Joi.boolean(),
      complianceVerified: Joi.boolean(),
      mediaVerified: Joi.boolean(),
    }).default({}),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    productId: Joi.string().required(),
  }).required(),
});

const productParamSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    productId: Joi.string().required(),
  }).required(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  listProductSchema,
  searchProductSchema,
  reviewProductSchema,
  productParamSchema,
};
