const Joi = require("joi");
const { panPattern, gstPattern, aadhaarPattern } = require("../../../shared/validation/kyc");
const { KYC_STATUS, ORDER_STATUS } = require("../../../shared/domain/commerce-constants");
const { DELIVERY_STATUS } = require("../../delivery/models/delivery.model");

const submitKycSchema = Joi.object({
  body: Joi.object({
    panNumber: Joi.string().pattern(panPattern).required(),
    gstNumber: Joi.string().pattern(gstPattern).allow("", null),
    aadhaarNumber: Joi.string().pattern(aadhaarPattern).allow("", null),
    legalName: Joi.string().min(2).max(120).required(),
    businessType: Joi.string().valid("individual", "proprietorship", "partnership", "private_limited"),
    dateOfBirth: Joi.date().iso().allow("", null),
    documents: Joi.object({
      panDocumentUrl: Joi.string().uri().allow("", null),
      gstCertificateUrl: Joi.string().uri().allow("", null),
      aadhaarFrontUrl: Joi.string().uri().allow("", null),
      aadhaarBackUrl: Joi.string().uri().allow("", null),
      bankProofUrl: Joi.string().uri().allow("", null),
    }).default({}),
    bankDetails: Joi.object({
      accountHolderName: Joi.string().allow("", null),
      accountNumber: Joi.string().allow("", null),
      ifscCode: Joi.string().allow("", null),
      bankName: Joi.string().allow("", null),
      branchName: Joi.string().allow("", null),
    }).default({}),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const reviewSellerKycSchema = Joi.object({
  body: Joi.object({
    verificationStatus: Joi.string()
      .valid(KYC_STATUS.UNDER_REVIEW, KYC_STATUS.VERIFIED, KYC_STATUS.REJECTED)
      .required(),
    rejectionReason: Joi.string().allow("", null),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    sellerId: Joi.string().required(),
  }).required(),
});

const updateSellerProfileSchema = Joi.object({
  body: Joi.object({
    displayName: Joi.string().min(2).max(120).required(),
    legalBusinessName: Joi.string().min(2).max(160).required(),
    description: Joi.string().max(2000).allow("", null),
    supportEmail: Joi.string().email().required(),
    supportPhone: Joi.string().min(10).max(15).required(),
    businessType: Joi.string().valid("individual", "proprietorship", "partnership", "private_limited", "llp", "public_limited").allow("", null),
    registrationNumber: Joi.string().allow("", null),
    gstNumber: Joi.string().pattern(gstPattern).allow("", null),
    panNumber: Joi.string().pattern(panPattern).allow("", null),
    aadhaarNumber: Joi.string().pattern(aadhaarPattern).allow("", null),
    dateOfBirth: Joi.date().iso().allow("", null),
    businessWebsite: Joi.string().uri().allow("", null),
    primaryContactName: Joi.string().max(120).allow("", null),
    bankDetails: Joi.object({
      accountHolderName: Joi.string().allow("", null),
      accountNumber: Joi.string().allow("", null),
      ifscCode: Joi.string().allow("", null),
      bankName: Joi.string().allow("", null),
      branchName: Joi.string().allow("", null),
    }).default({}),
    businessAddress: Joi.object({
      line1: Joi.string().allow("", null),
      line2: Joi.string().allow("", null),
      city: Joi.string().allow("", null),
      state: Joi.string().allow("", null),
      country: Joi.string().default("India"),
      postalCode: Joi.string().min(5).max(10).allow("", null),
    }).default({}),
    pickupAddress: Joi.object({
      line1: Joi.string().required(),
      line2: Joi.string().allow("", null),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().default("India"),
      postalCode: Joi.string().min(5).max(10).required(),
    }).required(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateSellerSettingsSchema = Joi.object({
  body: Joi.object({
    autoAcceptOrders: Joi.boolean(),
    handlingTimeHours: Joi.number().integer().min(1).max(168),
    returnWindowDays: Joi.number().integer().min(1).max(60),
    ndrResponseHours: Joi.number().integer().min(1).max(72),
    shippingModes: Joi.array().items(Joi.string().valid("standard", "express", "same_day", "hyperlocal")),
    payoutSchedule: Joi.string().valid("daily", "weekly", "biweekly", "monthly"),
  })
    .min(1)
    .required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateSellerAddressSchema = Joi.object({
  body: Joi.object({
    line1: Joi.string().required(),
    line2: Joi.string().allow("", null),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().default("India"),
    postalCode: Joi.string().min(5).max(10).required(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateSellerBankSchema = Joi.object({
  body: Joi.object({
    accountHolderName: Joi.string().required(),
    accountNumber: Joi.string().required(),
    ifscCode: Joi.string().required(),
    bankName: Joi.string().required(),
    branchName: Joi.string().allow("", null),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateSellerMoreInfoSchema = Joi.object({
  body: Joi.object({
    description: Joi.string().max(2000).allow("", null),
    businessWebsite: Joi.string().uri().allow("", null),
    primaryContactName: Joi.string().max(120).allow("", null),
    registrationNumber: Joi.string().allow("", null),
    supportEmail: Joi.string().email(),
    supportPhone: Joi.string().min(10).max(15),
  })
    .min(1)
    .required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const sellerDashboardSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
  }).required(),
  params: Joi.object({}).required(),
});

const sellerWebStatusSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const sellerTrackingSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({
    status: Joi.string().valid(...Object.values(ORDER_STATUS)),
    deliveryStatus: Joi.string().valid(...Object.values(DELIVERY_STATUS), "not_created"),
    fromDate: Joi.date().iso(),
    toDate: Joi.date().iso(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }).required(),
  params: Joi.object({}).required(),
});

const sellerTrackingOrderSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    orderId: Joi.string().required(),
  }).required(),
});

const createSellerSubAdminSchema = Joi.object({
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

const listSellerSubAdminsSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateSellerSubAdminModulesSchema = Joi.object({
  body: Joi.object({
    allowedModules: Joi.array().items(Joi.string()).min(1).required(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    userId: Joi.string().required(),
  }).required(),
});

module.exports = {
  submitKycSchema,
  reviewSellerKycSchema,
  updateSellerProfileSchema,
  updateSellerSettingsSchema,
  updateSellerAddressSchema,
  updateSellerBankSchema,
  updateSellerMoreInfoSchema,
  sellerDashboardSchema,
  sellerWebStatusSchema,
  sellerTrackingSchema,
  sellerTrackingOrderSchema,
  createSellerSubAdminSchema,
  listSellerSubAdminsSchema,
  updateSellerSubAdminModulesSchema,
};
