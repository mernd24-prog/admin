const Joi = require("joi");
const { panPattern, aadhaarPattern } = require("../../../shared/validation/kyc");
const { KYC_STATUS } = require("../../../shared/domain/commerce-constants");

const updateProfileSchema = Joi.object({
  body: Joi.object({
    profile: Joi.object({
      firstName: Joi.string().min(2).max(50).required(),
      lastName: Joi.string().min(2).max(50).required(),
      avatarUrl: Joi.string().uri().allow("", null),
    }).required(),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const submitUserKycSchema = Joi.object({
  body: Joi.object({
    legalName: Joi.string().min(2).max(120).required(),
    panNumber: Joi.string().pattern(panPattern).allow("", null),
    aadhaarNumber: Joi.string().pattern(aadhaarPattern).allow("", null),
    documents: Joi.object({
      panDocumentUrl: Joi.string().uri().allow("", null),
      aadhaarFrontUrl: Joi.string().uri().allow("", null),
      aadhaarBackUrl: Joi.string().uri().allow("", null),
      selfieUrl: Joi.string().uri().allow("", null),
    }).default({}),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const reviewUserKycSchema = Joi.object({
  body: Joi.object({
    verificationStatus: Joi.string()
      .valid(KYC_STATUS.UNDER_REVIEW, KYC_STATUS.VERIFIED, KYC_STATUS.REJECTED)
      .required(),
    rejectionReason: Joi.string().allow("", null),
  }).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    userId: Joi.string().required(),
  }).required(),
});

const addressBodySchema = Joi.object({
  label: Joi.string().valid("home", "work", "other").default("home"),
  fullName: Joi.string().required(),
  phone: Joi.string().min(10).max(15).required(),
  line1: Joi.string().required(),
  line2: Joi.string().allow("", null),
  city: Joi.string().required(),
  state: Joi.string().required(),
  country: Joi.string().default("India"),
  postalCode: Joi.string().min(5).max(10).required(),
  isDefault: Joi.boolean().default(false),
});

const addAddressSchema = Joi.object({
  body: addressBodySchema.required(),
  query: Joi.object({}).required(),
  params: Joi.object({}).required(),
});

const updateAddressSchema = Joi.object({
  body: addressBodySchema.fork(
    ["fullName", "phone", "line1", "city", "state", "postalCode"],
    (schema) => schema.optional(),
  ).min(1).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    addressId: Joi.string().required(),
  }).required(),
});

const addressParamSchema = Joi.object({
  body: Joi.object({}).required(),
  query: Joi.object({}).required(),
  params: Joi.object({
    addressId: Joi.string().required(),
  }).required(),
});

module.exports = {
  updateProfileSchema,
  submitUserKycSchema,
  reviewUserKycSchema,
  addAddressSchema,
  updateAddressSchema,
  addressParamSchema,
};
