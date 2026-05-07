const Joi = require("joi");

const paginationQuery = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

const createCategorySchema = Joi.object({
  body: Joi.object({
    categoryKey: Joi.string().trim().required(),
    title: Joi.string().trim().required(),
    parentKey: Joi.string().allow(null, ""),
    level: Joi.number().integer().min(0).default(0),
    attributesSchema: Joi.object().default({}),
    active: Joi.boolean().default(true),
    sortOrder: Joi.number().integer().default(0),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateCategorySchema = Joi.object({
  body: Joi.object({
    title: Joi.string().trim(),
    parentKey: Joi.string().allow(null, ""),
    level: Joi.number().integer().min(0),
    attributesSchema: Joi.object(),
    active: Joi.boolean(),
    sortOrder: Joi.number().integer(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    categoryKey: Joi.string().required(),
  }).required(),
});

const listCategoriesSchema = Joi.object({
  body: Joi.object({}).required(),
  query: paginationQuery.concat(
    Joi.object({
      parentKey: Joi.string(),
      active: Joi.boolean(),
      categoryKey: Joi.string(),
    }),
  ),
  params: Joi.object({}).required(),
});

const categoryKeySchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    categoryKey: Joi.string().required(),
  }).required(),
});

const createProductFamilySchema = Joi.object({
  body: Joi.object({
    familyCode: Joi.string().trim().required(),
    sellerId: Joi.string().required(),
    title: Joi.string().trim().required(),
    category: Joi.string().required(),
    baseAttributes: Joi.object().default({}),
    variantAxes: Joi.array().items(Joi.string()).default([]),
    status: Joi.string().default("active"),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateProductFamilySchema = Joi.object({
  body: Joi.object({
    title: Joi.string().trim(),
    category: Joi.string(),
    baseAttributes: Joi.object(),
    variantAxes: Joi.array().items(Joi.string()),
    status: Joi.string(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    familyCode: Joi.string().required(),
  }).required(),
});

const listProductFamiliesSchema = Joi.object({
  body: Joi.object({}).required(),
  query: paginationQuery.concat(
    Joi.object({
      category: Joi.string(),
      sellerId: Joi.string(),
      status: Joi.string(),
    }),
  ),
  params: Joi.object({}).required(),
});

const productFamilyCodeSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    familyCode: Joi.string().required(),
  }).required(),
});

const createProductVariantSchema = Joi.object({
  body: Joi.object({
    familyCode: Joi.string().trim().required(),
    productId: Joi.string().required(),
    sellerId: Joi.string().required(),
    sku: Joi.string().trim().required(),
    attributes: Joi.object().default({}),
    stock: Joi.number().integer().min(0).default(0),
    reservedStock: Joi.number().integer().min(0).default(0),
    status: Joi.string().default("active"),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateProductVariantSchema = Joi.object({
  body: Joi.object({
    familyCode: Joi.string().trim(),
    productId: Joi.string(),
    sellerId: Joi.string(),
    sku: Joi.string().trim(),
    attributes: Joi.object(),
    stock: Joi.number().integer().min(0),
    reservedStock: Joi.number().integer().min(0),
    status: Joi.string(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    variantId: Joi.string().required(),
  }).required(),
});

const listProductVariantsSchema = Joi.object({
  body: Joi.object({}).required(),
  query: paginationQuery.concat(
    Joi.object({
      productId: Joi.string(),
      familyCode: Joi.string(),
      sellerId: Joi.string(),
      status: Joi.string(),
    }),
  ),
  params: Joi.object({}).required(),
});

const productVariantIdSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    variantId: Joi.string().required(),
  }).required(),
});

const createHsnCodeSchema = Joi.object({
  body: Joi.object({
    code: Joi.string().trim().required(),
    description: Joi.string().trim().required(),
    gstRate: Joi.number().min(0).required(),
    cessRate: Joi.number().min(0).default(0),
    taxType: Joi.string().valid("gst", "igst", "sgst", "cgst", "exempt").default("gst"),
    exempt: Joi.boolean().default(false),
    category: Joi.string().allow(null, ""),
    active: Joi.boolean().default(true),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateHsnCodeSchema = Joi.object({
  body: Joi.object({
    description: Joi.string().trim(),
    gstRate: Joi.number().min(0),
    cessRate: Joi.number().min(0),
    taxType: Joi.string().valid("gst", "igst", "sgst", "cgst", "exempt"),
    exempt: Joi.boolean(),
    category: Joi.string().allow(null, ""),
    active: Joi.boolean(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    hsnCode: Joi.string().required(),
  }).required(),
});

const listHsnCodesSchema = Joi.object({
  body: Joi.object({}).required(),
  query: paginationQuery.concat(
    Joi.object({
      category: Joi.string(),
      active: Joi.boolean(),
    }),
  ),
  params: Joi.object({}).required(),
});

const hsnCodeParamSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    hsnCode: Joi.string().required(),
  }).required(),
});

const createGeographySchema = Joi.object({
  body: Joi.object({
    countryCode: Joi.string().trim().required(),
    countryName: Joi.string().trim().required(),
    active: Joi.boolean().default(true),
    states: Joi.array()
      .items(
        Joi.object({
          stateCode: Joi.string().trim().required(),
          stateName: Joi.string().trim().required(),
          cities: Joi.array().items(Joi.string().trim()).default([]),
        }),
      )
      .default([]),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateGeographySchema = Joi.object({
  body: Joi.object({
    countryName: Joi.string().trim(),
    active: Joi.boolean(),
    states: Joi.array().items(
      Joi.object({
        stateCode: Joi.string().trim().required(),
        stateName: Joi.string().trim().required(),
        cities: Joi.array().items(Joi.string().trim()).default([]),
      }),
    ),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    countryCode: Joi.string().required(),
  }).required(),
});

const listGeographiesSchema = Joi.object({
  body: Joi.object({}).required(),
  query: paginationQuery.concat(Joi.object({ active: Joi.boolean() })),
  params: Joi.object({}).required(),
});

const geographyParamSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    countryCode: Joi.string().required(),
  }).required(),
});

const createContentPageSchema = Joi.object({
  body: Joi.object({
    slug: Joi.string().trim().required(),
    title: Joi.string().trim().required(),
    pageType: Joi.string().trim().required(),
    body: Joi.string().required(),
    language: Joi.string().trim().default("en"),
    published: Joi.boolean().default(false),
    publishedAt: Joi.date().optional(),
    metadata: Joi.object().default({}),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateContentPageSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().trim(),
    pageType: Joi.string().trim(),
    body: Joi.string(),
    language: Joi.string().trim(),
    published: Joi.boolean(),
    publishedAt: Joi.date().optional(),
    metadata: Joi.object(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    slug: Joi.string().required(),
  }).required(),
});

const listContentPagesSchema = Joi.object({
  body: Joi.object({}).required(),
  query: paginationQuery.concat(
    Joi.object({
      pageType: Joi.string(),
      language: Joi.string(),
      published: Joi.boolean(),
    }),
  ),
  params: Joi.object({}).required(),
});

const contentPageSlugSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    slug: Joi.string().required(),
  }).required(),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesSchema,
  categoryKeySchema,
  createProductFamilySchema,
  updateProductFamilySchema,
  listProductFamiliesSchema,
  productFamilyCodeSchema,
  createProductVariantSchema,
  updateProductVariantSchema,
  listProductVariantsSchema,
  productVariantIdSchema,
  createHsnCodeSchema,
  updateHsnCodeSchema,
  listHsnCodesSchema,
  hsnCodeParamSchema,
  hsnCodeSchema: hsnCodeParamSchema,
  createGeographySchema,
  updateGeographySchema,
  listGeographiesSchema,
  geographyParamSchema,
  geographyCodeSchema: geographyParamSchema,
  createContentPageSchema,
  updateContentPageSchema,
  listContentPagesSchema,
  contentPageSlugSchema,
};
