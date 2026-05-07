const Joi = require("joi");
const {
  PRODUCT_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
} = require("../../../shared/domain/commerce-constants");

const accountStatuses = ["active", "suspended", "pending_approval"];
const sellerOnboardingStatuses = [
  "initiated",
  "in_progress",
  "under_review",
  "ready_for_go_live",
  "rejected",
];

const adminOverviewSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const listVendorsSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    q: Joi.string().allow(""),
    status: Joi.string().valid(...accountStatuses),
    onboardingStatus: Joi.string().valid(...sellerOnboardingStatuses),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }).required(),
  params: Joi.object({}).required(),
});

const listUsersSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    q: Joi.string().allow(""),
    role: Joi.string().valid(
      "admin",
      "sub-admin",
      "seller",
      "seller-sub-admin",
      "buyer",
      "super-admin",
    ),
    accountStatus: Joi.string().valid(...accountStatuses),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }).required(),
  params: Joi.object({}).required(),
});

const userParamSchema = Joi.object({
  body: Joi.object({}).default({}),
  query: Joi.object({}).required(),
  params: Joi.object({
    userId: Joi.string().required(),
  }).required(),
});

const updateUserSchema = Joi.object({
  body: Joi.object({
    role: Joi.string().valid(
      "admin",
      "sub-admin",
      "seller",
      "seller-sub-admin",
      "buyer",
      "super-admin",
    ),
    accountStatus: Joi.string().valid("active", "suspended"),
    profile: Joi.object({
      firstName: Joi.string().allow("", null),
      lastName: Joi.string().allow("", null),
      avatarUrl: Joi.string().uri().allow("", null),
    }),
  })
    .min(1)
    .required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    userId: Joi.string().required(),
  }).required(),
});

const deactivateUserSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().allow("", null),
  }).default({}),
  query: Joi.object({}).required(),
  params: Joi.object({
    userId: Joi.string().required(),
  }).required(),
});

const updateVendorStatusSchema = Joi.object({
  body: Joi.object({
    accountStatus: Joi.string().valid(...accountStatuses),
    status: Joi.string().valid(...accountStatuses),
  })
    .or("accountStatus", "status")
    .custom((value, helpers) => {
      if (
        value.accountStatus &&
        value.status &&
        value.accountStatus !== value.status
      ) {
        return helpers.error("any.invalid");
      }

      return { accountStatus: value.accountStatus || value.status };
    })
    .required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    sellerId: Joi.string().required(),
  }).required(),
});

const moderationQueueSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    status: Joi.string().valid(
      PRODUCT_STATUS.PENDING_APPROVAL,
      PRODUCT_STATUS.DRAFT,
      PRODUCT_STATUS.REJECTED,
      PRODUCT_STATUS.ACTIVE,
      PRODUCT_STATUS.INACTIVE,
    ),
    category: Joi.string(),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }).required(),
  params: Joi.object({}).required(),
});

const moderateProductSchema = Joi.object({
  body: Joi.object({
    status: Joi.string()
      .valid(
        PRODUCT_STATUS.ACTIVE,
        PRODUCT_STATUS.INACTIVE,
        PRODUCT_STATUS.REJECTED,
      )
      .required(),
    rejectionReason: Joi.string().allow("", null),
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

const listOrdersSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    status: Joi.string().valid(...Object.values(ORDER_STATUS)),
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
    limit: Joi.number().integer().min(1).max(500),
    offset: Joi.number().integer().min(0),
  }).required(),
  params: Joi.object({}).required(),
});

const listPaymentsSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    status: Joi.string().valid(...Object.values(PAYMENT_STATUS)),
    provider: Joi.string(),
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
    limit: Joi.number().integer().min(1).max(500),
    offset: Joi.number().integer().min(0),
  }).required(),
  params: Joi.object({}).required(),
});

const createPayoutSchema = Joi.object({
  body: Joi.object({
    sellerId: Joi.string().required(),
    periodStart: Joi.date().iso().required(),
    periodEnd: Joi.date().iso().required(),
    grossAmount: Joi.number().positive().required(),
    commissionAmount: Joi.number().min(0),
    processingFeeAmount: Joi.number().min(0),
    taxWithheldAmount: Joi.number().min(0),
    netPayoutAmount: Joi.number().min(0),
    currency: Joi.string().default("INR"),
    status: Joi.string().valid("scheduled", "processing", "paid", "failed"),
    scheduledAt: Joi.date().iso(),
    metadata: Joi.object().default({}),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const listPayoutsSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    sellerId: Joi.string(),
    status: Joi.string().valid("scheduled", "processing", "paid", "failed"),
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
    limit: Joi.number().integer().min(1).max(500),
    offset: Joi.number().integer().min(0),
  }).required(),
  params: Joi.object({}).required(),
});

const taxReportSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
    taxComponent: Joi.string().valid("cgst", "sgst", "igst", "tcs"),
    limit: Joi.number().integer().min(1).max(1000),
    offset: Joi.number().integer().min(0),
  }).required(),
  params: Joi.object({}).required(),
});

const generateInvoiceSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    orderId: Joi.string().required(),
  }).required(),
});

const createApiKeySchema = Joi.object({
  body: Joi.object({
    ownerId: Joi.string(),
    keyName: Joi.string().min(3).max(120).required(),
    scopes: Joi.array().items(Joi.string()).default([]),
    expiresAt: Joi.date().iso().allow(null),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const listApiKeysSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    ownerId: Joi.string(),
    status: Joi.string().valid("active", "revoked", "expired"),
    limit: Joi.number().integer().min(1).max(500),
    offset: Joi.number().integer().min(0),
  }).required(),
  params: Joi.object({}).required(),
});

const createWebhookSubscriptionSchema = Joi.object({
  body: Joi.object({
    ownerId: Joi.string(),
    endpointUrl: Joi.string().uri().required(),
    secret: Joi.string().min(8).required(),
    eventTypes: Joi.array().items(Joi.string()).min(1).required(),
    retryPolicy: Joi.object({
      maxRetries: Joi.number().integer().min(0).max(25),
      backoffMs: Joi.number().integer().min(0),
    }).default({ maxRetries: 5 }),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const listWebhookSubscriptionsSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    ownerId: Joi.string(),
    status: Joi.string().valid("active", "paused", "disabled"),
    limit: Joi.number().integer().min(1).max(500),
    offset: Joi.number().integer().min(0),
  }).required(),
  params: Joi.object({}).required(),
});

const upsertFeatureFlagSchema = Joi.object({
  body: Joi.object({
    flagKey: Joi.string().min(3).max(120).required(),
    description: Joi.string().allow("", null),
    enabled: Joi.boolean().required(),
    rolloutPercentage: Joi.number().integer().min(0).max(100).required(),
    targetRules: Joi.object().default({}),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const listFeatureFlagsSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    enabled: Joi.boolean(),
    limit: Joi.number().integer().min(1).max(500),
    offset: Joi.number().integer().min(0),
  }).required(),
  params: Joi.object({}).required(),
});

const realtimeAnalyticsSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    hours: Joi.number().integer().min(1).max(168).default(24),
  }).required(),
  params: Joi.object({}).required(),
});

const returnsAnalyticsSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
  }).required(),
  params: Joi.object({}).required(),
});

const listChargebacksSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    status: Joi.string().valid(
      "pending",
      "accepted",
      "rejected",
      "won",
      "lost",
    ),
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
    limit: Joi.number().integer().min(1).max(500),
    offset: Joi.number().integer().min(0),
  }).required(),
  params: Joi.object({}).required(),
});

const listDeadLetterSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    status: Joi.string().valid("failed", "retry_scheduled", "discarded"),
    eventType: Joi.string(),
    limit: Joi.number().integer().min(1).max(500),
    offset: Joi.number().integer().min(0),
  }).required(),
  params: Joi.object({}).required(),
});

const deadLetterActionSchema = Joi.object({
  body: Joi.object({
    reason: Joi.string().allow("", null),
  }).default({}),
  query: Joi.object({}).required(),
  params: Joi.object({
    eventId: Joi.string().guid({ version: "uuidv4" }).required(),
  }).required(),
});

const queueStatusSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const queueActionSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    queueName: Joi.string().valid("notifications").required(),
  }).required(),
});

const createSubscriptionPlanSchema = Joi.object({
  body: Joi.object({
    planCode: Joi.string().trim().uppercase().min(3).max(64).required(),
    title: Joi.string().min(3).max(180).required(),
    description: Joi.string().allow("", null),
    targetRoles: Joi.array()
      .items(Joi.string().valid("buyer", "seller", "admin"))
      .default([]),
    featureFlags: Joi.array().items(Joi.string()).default([]),
    monthlyPrice: Joi.number().min(0).required(),
    yearlyPrice: Joi.number().min(0).required(),
    currency: Joi.string().default("INR"),
    active: Joi.boolean().default(true),
    metadata: Joi.object().default({}),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const listSubscriptionPlanSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    active: Joi.boolean(),
    limit: Joi.number().integer().min(1).max(500),
    offset: Joi.number().integer().min(0),
  }).required(),
  params: Joi.object({}).required(),
});

const subscriptionPlanParamSchema = Joi.object({
  body: Joi.object({}).default({}),
  query: Joi.object({}).required(),
  params: Joi.object({
    planId: Joi.string().guid({ version: "uuidv4" }).required(),
  }).required(),
});

const updateSubscriptionPlanSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().min(3).max(180),
    description: Joi.string().allow("", null),
    targetRoles: Joi.array().items(
      Joi.string().valid("buyer", "seller", "admin"),
    ),
    featureFlags: Joi.array().items(Joi.string()),
    monthlyPrice: Joi.number().min(0),
    yearlyPrice: Joi.number().min(0),
    currency: Joi.string(),
    active: Joi.boolean(),
    metadata: Joi.object(),
  })
    .min(1)
    .required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    planId: Joi.string().guid({ version: "uuidv4" }).required(),
  }).required(),
});

const listPlatformSubscriptionsSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    status: Joi.string().valid("active", "paused", "cancelled", "expired"),
    userRole: Joi.string().valid("buyer", "seller", "admin"),
    limit: Joi.number().integer().min(1).max(500),
    offset: Joi.number().integer().min(0),
  }).required(),
  params: Joi.object({}).required(),
});

const updatePlatformSubscriptionStatusSchema = Joi.object({
  body: Joi.object({
    status: Joi.string().valid("active", "paused", "cancelled").required(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    subscriptionId: Joi.string().guid({ version: "uuidv4" }).required(),
  }).required(),
});

const createPlatformFeeConfigSchema = Joi.object({
  body: Joi.object({
    category: Joi.string().trim().required(),
    commissionPercent: Joi.number().min(0).max(100).required(),
    fixedFeeAmount: Joi.number().min(0).default(0),
    closingFeeAmount: Joi.number().min(0).default(0),
    active: Joi.boolean().default(true),
    effectiveFrom: Joi.date().iso().allow(null),
    effectiveTo: Joi.date().iso().allow(null),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const listPlatformFeeConfigSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    active: Joi.boolean(),
    category: Joi.string(),
    limit: Joi.number().integer().min(1).max(500),
    offset: Joi.number().integer().min(0),
  }).required(),
  params: Joi.object({}).required(),
});

const platformFeeConfigParamSchema = Joi.object({
  body: Joi.object({}).default({}),
  query: Joi.object({}).required(),
  params: Joi.object({
    configId: Joi.string().guid({ version: "uuidv4" }).required(),
  }).required(),
});

const updatePlatformFeeConfigSchema = Joi.object({
  body: Joi.object({
    category: Joi.string().trim(),
    commissionPercent: Joi.number().min(0).max(100),
    fixedFeeAmount: Joi.number().min(0),
    closingFeeAmount: Joi.number().min(0),
    active: Joi.boolean(),
    effectiveFrom: Joi.date().iso().allow(null),
    effectiveTo: Joi.date().iso().allow(null),
  })
    .min(1)
    .required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    configId: Joi.string().guid({ version: "uuidv4" }).required(),
  }).required(),
});

const listAccessModulesSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    role: Joi.string()
      .valid(
        "admin",
        "sub-admin",
        "seller",
        "seller-sub-admin",
        "buyer",
        "super-admin",
      )
      .default("sub-admin"),
    roleId: Joi.string().guid({ version: "uuidv4" }),
    roleSlug: Joi.string().trim().min(2).max(128),
    active: Joi.boolean().default(true),
    includePermissions: Joi.boolean().default(true),
  })
    .oxor("roleId", "roleSlug")
    .required(),
  params: Joi.object({}).required(),
});

const createAdminSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    phone: Joi.string().allow("", null),
    password: Joi.string().min(8).required(),
    profile: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().allow("", null),
    }).required(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const listAdminsSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    q: Joi.string().allow(""),
    accountStatus: Joi.string().valid("active", "suspended"),
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }).required(),
  params: Joi.object({}).required(),
});

const createPlatformSubAdminSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    phone: Joi.string().allow("", null),
    password: Joi.string().min(8).required(),
    profile: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().allow("", null),
    }).required(),
    allowedModules: Joi.array().items(Joi.string()).min(1).required(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const listPlatformSubAdminsSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    ownerAdminId: Joi.string(),
  }).required(),
  params: Joi.object({}).required(),
});

const updatePlatformSubAdminModulesSchema = Joi.object({
  body: Joi.object({
    allowedModules: Joi.array().items(Joi.string()).min(1).required(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    userId: Joi.string().required(),
  }).required(),
});

module.exports = {
  adminOverviewSchema,
  listVendorsSchema,
  listUsersSchema,
  userParamSchema,
  updateUserSchema,
  deactivateUserSchema,
  updateVendorStatusSchema,
  moderationQueueSchema,
  moderateProductSchema,
  listOrdersSchema,
  listPaymentsSchema,
  createPayoutSchema,
  listPayoutsSchema,
  taxReportSchema,
  generateInvoiceSchema,
  createApiKeySchema,
  listApiKeysSchema,
  createWebhookSubscriptionSchema,
  listWebhookSubscriptionsSchema,
  upsertFeatureFlagSchema,
  listFeatureFlagsSchema,
  realtimeAnalyticsSchema,
  returnsAnalyticsSchema,
  listChargebacksSchema,
  listDeadLetterSchema,
  deadLetterActionSchema,
  queueStatusSchema,
  queueActionSchema,
  createSubscriptionPlanSchema,
  listSubscriptionPlanSchema,
  subscriptionPlanParamSchema,
  updateSubscriptionPlanSchema,
  listPlatformSubscriptionsSchema,
  updatePlatformSubscriptionStatusSchema,
  createPlatformFeeConfigSchema,
  listPlatformFeeConfigSchema,
  platformFeeConfigParamSchema,
  updatePlatformFeeConfigSchema,
  listAccessModulesSchema,
  createAdminSchema,
  listAdminsSchema,
  createPlatformSubAdminSchema,
  listPlatformSubAdminsSchema,
  updatePlatformSubAdminModulesSchema,
};
