const { KYC_STATUS } = require("./commerce-constants");

const SELLER_ONBOARDING_STATUS = Object.freeze({
  INITIATED: "initiated",
  IN_PROGRESS: "in_progress",
  UNDER_REVIEW: "under_review",
  READY_FOR_GO_LIVE: "ready_for_go_live",
  REJECTED: "rejected",
});

const SELLER_PROFILE_REQUIRED_FIELDS = Object.freeze([
  "displayName",
  "legalBusinessName",
  "supportEmail",
  "supportPhone",
]);

const SELLER_BANK_REQUIRED_FIELDS = Object.freeze([
  "accountHolderName",
  "accountNumber",
  "ifscCode",
  "bankName",
]);

const DEFAULT_SELLER_CHECKLIST = Object.freeze({
  profileCompleted: false,
  kycSubmitted: false,
  gstVerified: false,
  bankLinked: false,
  firstProductPublished: false,
});

function normalizeText(value) {
  return String(value || "").trim();
}

function firstNonEmpty(...values) {
  return values.find((value) => normalizeText(value).length > 0) || "";
}

function buildNameFromUserProfile(userProfile = {}) {
  return [userProfile?.firstName, userProfile?.lastName].map(normalizeText).filter(Boolean).join(" ");
}

function getSellerProfileFieldValue(sellerProfile = {}, field, { user = {}, kyc = null } = {}) {
  const userProfile = user?.profile || {};

  const fallbackMap = {
    displayName: [
      sellerProfile.displayName,
      sellerProfile.storeName,
      sellerProfile.shopName,
      sellerProfile.businessName,
      sellerProfile.primaryContactName,
      buildNameFromUserProfile(userProfile),
    ],
    legalBusinessName: [
      sellerProfile.legalBusinessName,
      sellerProfile.businessName,
      sellerProfile.companyName,
      sellerProfile.legalName,
      kyc?.legal_name,
    ],
    supportEmail: [sellerProfile.supportEmail, sellerProfile.email, user?.email],
    supportPhone: [sellerProfile.supportPhone, sellerProfile.phone, user?.phone],
  };

  return firstNonEmpty(...(fallbackMap[field] || [sellerProfile?.[field]]));
}

function getSellerBankFieldValue(bankDetails = {}, field) {
  const fallbackMap = {
    accountHolderName: [
      bankDetails.accountHolderName,
      bankDetails.holderName,
      bankDetails.accountName,
      bankDetails.beneficiaryName,
    ],
    accountNumber: [
      bankDetails.accountNumber,
      bankDetails.bankAccountNumber,
      bankDetails.accountNo,
      bankDetails.bankAccountNo,
    ],
    ifscCode: [bankDetails.ifscCode, bankDetails.ifsc, bankDetails.ifsc_code],
    bankName: [bankDetails.bankName, bankDetails.bank],
  };

  return firstNonEmpty(...(fallbackMap[field] || [bankDetails?.[field]]));
}

function getMissingSellerProfileFields(sellerProfile = {}, context = {}) {
  return SELLER_PROFILE_REQUIRED_FIELDS.filter(
    (field) => !getSellerProfileFieldValue(sellerProfile, field, context),
  );
}

function getMissingSellerBankFields(bankDetails = {}) {
  return SELLER_BANK_REQUIRED_FIELDS.filter((field) => !getSellerBankFieldValue(bankDetails, field));
}

function hasCompleteSellerProfile(sellerProfile = {}, context = {}) {
  return getMissingSellerProfileFields(sellerProfile, context).length === 0;
}

function hasCompleteSellerBankDetails(bankDetails = {}) {
  return getMissingSellerBankFields(bankDetails).length === 0;
}

function hasStartedOnboarding(checklist = {}) {
  return Object.values(checklist).some((value) => value === true);
}

function buildSellerOnboardingChecklist({
  sellerProfile = {},
  user = {},
  kyc = null,
  existingChecklist = null,
} = {}) {
  const profile = sellerProfile || {};
  const storedChecklist = existingChecklist || profile.onboardingChecklist || {};

  return {
    ...DEFAULT_SELLER_CHECKLIST,
    profileCompleted: hasCompleteSellerProfile(profile, { user, kyc }),
    kycSubmitted: Boolean(kyc),
    gstVerified: kyc?.verification_status === KYC_STATUS.VERIFIED,
    bankLinked: hasCompleteSellerBankDetails(profile.bankDetails),
    firstProductPublished: storedChecklist.firstProductPublished === true,
  };
}

function buildSellerOnboardingRequirements({ sellerProfile = {}, user = {}, kyc = null } = {}) {
  const missingProfileFields = getMissingSellerProfileFields(sellerProfile, { user, kyc });
  const missingBankFields = getMissingSellerBankFields(sellerProfile?.bankDetails || {});

  return {
    profile: {
      requiredFields: SELLER_PROFILE_REQUIRED_FIELDS,
      missingFields: missingProfileFields,
      completed: missingProfileFields.length === 0,
    },
    bankDetails: {
      requiredFields: SELLER_BANK_REQUIRED_FIELDS,
      missingFields: missingBankFields,
      completed: missingBankFields.length === 0,
    },
  };
}

function getSellerKycStatus(kyc, checklist = {}) {
  if (kyc?.verification_status) {
    return kyc.verification_status;
  }

  return checklist.kycSubmitted === true ? KYC_STATUS.SUBMITTED : KYC_STATUS.DRAFT;
}

function resolveSellerOnboardingStatus(
  checklist = {},
  kycStatus = KYC_STATUS.DRAFT,
  currentStatus = SELLER_ONBOARDING_STATUS.INITIATED,
) {
  if (kycStatus === KYC_STATUS.REJECTED) {
    return SELLER_ONBOARDING_STATUS.REJECTED;
  }

  const baseComplete =
    checklist.profileCompleted === true &&
    checklist.kycSubmitted === true &&
    checklist.bankLinked === true;

  if (baseComplete && kycStatus === KYC_STATUS.VERIFIED) {
    return SELLER_ONBOARDING_STATUS.READY_FOR_GO_LIVE;
  }

  if (baseComplete && [KYC_STATUS.SUBMITTED, KYC_STATUS.UNDER_REVIEW].includes(kycStatus)) {
    return SELLER_ONBOARDING_STATUS.UNDER_REVIEW;
  }

  if (hasStartedOnboarding(checklist) || currentStatus !== SELLER_ONBOARDING_STATUS.INITIATED) {
    return SELLER_ONBOARDING_STATUS.IN_PROGRESS;
  }

  return SELLER_ONBOARDING_STATUS.INITIATED;
}

function buildSellerOnboardingState({ sellerProfile = {}, user = {}, kyc = null } = {}) {
  const checklist = buildSellerOnboardingChecklist({ sellerProfile, user, kyc });
  const kycStatus = getSellerKycStatus(kyc, checklist);
  const onboardingStatus = resolveSellerOnboardingStatus(
    checklist,
    kycStatus,
    sellerProfile?.onboardingStatus,
  );

  return {
    checklist,
    kycStatus,
    onboardingStatus,
    requirements: buildSellerOnboardingRequirements({ sellerProfile, user, kyc }),
  };
}

module.exports = {
  SELLER_ONBOARDING_STATUS,
  DEFAULT_SELLER_CHECKLIST,
  buildSellerOnboardingChecklist,
  buildSellerOnboardingRequirements,
  buildSellerOnboardingState,
  getSellerKycStatus,
  hasCompleteSellerBankDetails,
  hasCompleteSellerProfile,
  resolveSellerOnboardingStatus,
};
