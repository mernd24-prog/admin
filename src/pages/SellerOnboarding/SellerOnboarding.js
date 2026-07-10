import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, FileText, UploadCloud, X } from "lucide-react";
import { LuView } from "react-icons/lu";
import { FaCalendarAlt } from "react-icons/fa";
import { BiSolidEdit } from "react-icons/bi";
import { LuClipboardList } from "react-icons/lu";
import Image from "../../assets/cheque.png";
import {
  fetchAuthStatus,
  submitSellerKyc,
  updateSellerOnboardingProfile,
} from "../../Redux/seller-slice";
import { getSellerStatusRoute } from "../../components/Seller/sellerVerificationStatus";
import { useKYC } from "../../context/KycContext";
import { apiRequest } from "../../_helpers/apiConfig";
import { ENDPOINTS } from "../../_helpers/endpoints";
import useDropdownOptions, {
  withSelectedOption,
} from "../../hooks/useDropdownOptions";
import { AUTH_ROUTES } from "../auth/authRoutes";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]{3}$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const BANK_ACCOUNT_REGEX = /^[0-9]{9,18}$/;
const IFSC_REGEX = /^[A-Z0-9]{11}$/;
const PERSON_NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,119}$/;
const BANK_NAME_REGEX = /^[A-Za-z][A-Za-z .&'-]{1,119}$/;
const BRANCH_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9 .,&'/-]{1,119}$/;
const BUSINESS_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9 .,&'()/-]{1,179}$/;
const UDYOG_AADHAAR_REGEX = /^UDYAM-[A-Z0-9-]{1,14}$/;
const PERSON_NAME_MAX_LENGTH = 30;
const BUSINESS_NAME_MAX_LENGTH = 30;
const BANK_NAME_MIN_LENGTH = 2;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/i;
const KYC_DOCUMENT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const KYC_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const MIN_SELLER_AGE = 18;

const ERROR_CLASS = "mt-1 text-xs text-red-600";
const STEP_ONE_INPUT_CLASS =
  "admin-input h-[46px] text-[14px] font-medium text-[#111827] placeholder:font-normal placeholder:text-[#9a96a6]";
const DATE_FIELD_CLASS =
  "admin-input h-[46px] text-[14px] font-medium text-[#111827] placeholder:font-normal placeholder:text-[#9a96a6]";
const STEP_ONE_REQUIRED = <span className="text-[var(--admin-danger)]">*</span>;
const SECONDARY_BUTTON_CLASS =
  "admin-btn-secondary w-full min-w-[220px] text-[14px] sm:w-auto";
const PRIMARY_BUTTON_CLASS = "admin-btn-primary w-full text-[14px]";
const ONBOARDING_CARD_CLASS = "admin-card w-full px-5 py-4 sm:px-8 md:px-10";
const REVIEW_INPUT_CLASS =
  "admin-input h-[35px] text-[13px] placeholder:text-[13px] truncate";
const REVIEW_SECONDARY_BUTTON_CLASS =
  "admin-btn-secondary w-full text-[14px] sm:w-[260px]";
const REVIEW_PRIMARY_BUTTON_CLASS = "admin-btn-primary w-full text-[14px]";

const ONBOARDING_STEP_META = {
  0: {
    badge: "KYC VERIFICATION",
    title: "Mobile/Email Verification Complete",
    subtitle:
      "Next, submit KYC and business details. After that, your account goes under review.",
  },
  1: {
    badge: "KYC VERIFICATION",
    title: "Personal / Owner Details",
    subtitle:
      "Complete your basic identity details to continue your vendor verification.",
  },
  2: {
    badge: "BUSINESS VERIFICATION",
    title: "Business Details",
    subtitle:
      "Complete your basic identity details to continue your vendor verification.",
  },
  3: {
    badge: "BANK VERIFICATION",
    title: "Bank Details",
    subtitle:
      "Complete your basic identity details to continue your vendor verification.",
  },
  4: {
    badge: "REVIEW",
    title: "Review Details",
    subtitle:
      "Complete your basic identity details to continue your vendor verification.",
  },
  5: {
    badge: "STATUS",
    title: "Under Review",
    subtitle:
      "Your account is under review. Our team will verify your details within 24–48 hours.",
  },
};

const getOnboardingStepMeta = (step) =>
  ONBOARDING_STEP_META[step] || ONBOARDING_STEP_META[1];

const OnboardingSelect = ({
  name,
  label,
  value,
  options,
  onChange,
  loading,
  error,
  required = false,
  disabled = false,
  placeholder,
}) => (
  <div>
    <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
      {label} {required && STEP_ONE_REQUIRED}
    </label>
    <div className="relative">
      <select
        name={name}
        className={`${STEP_ONE_INPUT_CLASS} appearance-none pr-10`}
        value={value}
        onChange={onChange}
        disabled={disabled || loading}
        required={required}
        aria-required={required}
      >
        <option value="">
          {loading ? "Loading..." : placeholder || `Select ${label}`}
        </option>
        {withSelectedOption(options, value).map((option) => (
          <option
            key={`${name}-${option.id || option.value}`}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-[#082f91] text-white">
        <ChevronDown size={12} />
      </span>
    </div>
    {error && <p className={ERROR_CLASS}>{error}</p>}
  </div>
);

const OnboardingScreen = ({ step, children, metaOverride = {} }) => {
  const meta = { ...getOnboardingStepMeta(step), ...metaOverride };
  const progress = Math.min(Math.max(step, 1), 5) * 20;

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex rounded-[4px] font-inter bg-[#FBEBD7] px-3 py-2 text-[12px]  font-bold uppercase tracking-[0.08em] text-[#DB971A]">
            <LuClipboardList className="my-auto mx-2 text-lg" />
            {meta.badge}
          </span>
          <h1 className="mt-3 text-[24px]  font-inter font-bold  text-[#082f91] sm:text-[30px]">
            {meta.title}
          </h1>
          <p className="mt-1 max-w-2xl text-[14px] font-medium font-inter  text-[#182D50B2]/70">
            {meta.subtitle}
          </p>
        </div>
        <div className="min-w-[150px]">
          <p className="mb-2 text-[10px] text-end font-bold uppercase tracking-[0.18em] text-[#182D5066]/40 font-inter">
            Progress
          </p>
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap font-inter text-[16px] font-bold text-[#182D50]">
              Step {Math.min(Math.max(step, 1), 5)} / 5
            </span>
            <div className="h-[6px] w-28 overflow-hidden rounded-full bg-[#d7d4cf]">
              <span
                className="block h-full rounded-full bg-[#f2a900]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

const OnboardingSection = ({ number, title, children }) => (
  <section className="space-y-5">
    <div className="flex items-center gap-3 my-6">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E49E1C] text-[12px] font-bold text-white">
        {number}
      </span>
      <h2 className="whitespace-nowrap font-inter text-[18px] my-auto font-semibold text-[#042586]">
        {title}
      </h2>
      <span className="h-px flex-1 max-w-lg bg-[#E49E1C]" />
    </div>
    {children}
  </section>
);

const OnboardingGridDivider = ({ number, title }) => (
  <div className="md:col-span-2">
    <div className="flex items-center gap-3 my-6">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E49E1C] text-[12px] font-bold text-white">
        {number}
      </span>
      <h2 className="whitespace-nowrap font-inter text-[18px] my-auto font-semibold text-[#042586]">
        {title}
      </h2>
      <span className="h-px flex-1 max-w-lg bg-[#E49E1C]" />
    </div>
  </div>
);

const OnboardingActions = ({ children }) => (
  <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#eee7dd] pt-6 sm:flex-row sm:justify-end">
    {children}
  </div>
);

const ReviewSection = ({ number, title, onEdit, children }) => (
  <section className="space-y-4">
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E49E1C] text-[10px] font-bold text-white">
        {number}
      </span>
      <h2 className="whitespace-nowrap font-inter text-[16px] my-auto font-semibold text-[#042586]">
        {title}
      </h2>
      <span className="h-px flex-1 bg-[#E49E1C]" />
      <button
        type="button"
        onClick={onEdit}
        title="Edit"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#082f91] transition hover:bg-[#eef2ff]"
      >
        <BiSolidEdit size={20} />
      </button>
    </div>
    {children}
  </section>
);

const ReviewInput = ({ label, value, className = "" }) => (
  <div className={className}>
    <label className="admin-label font-inter">{label}</label>
    <input className={REVIEW_INPUT_CLASS} value={value || "-"} readOnly />
  </div>
);

const ReviewFileInput = ({ label, value, className = "" }) => (
  <div className={className}>
    <label className="mb-[6px] block text-[12px] font-medium leading-[16px] text-[#484555]">
      {label}
    </label>
    <div
      className={`${REVIEW_INPUT_CLASS} flex items-center gap-2`}
      title={value || "-"}
    >
      <FileText size={16} className="shrink-0 text-[#484555]" />
      <span className="min-w-0 truncate">{value || "-"}</span>
    </div>
  </div>
);

const parseApiError = (error, fallbackMessage) => {
  if (!error) return { message: fallbackMessage, details: [] };
  if (typeof error === "string") return { message: error, details: [] };
  const details = [
    error?.details,
    error?.error?.details?.fields,
    error?.error?.details,
    error?.fields,
  ].find(Array.isArray) || [];
  return {
    message: error.message || fallbackMessage,
    details,
  };
};

const getBackendDetailField = (detail = {}) => {
  const path = Array.isArray(detail.path) ? detail.path : [];
  const rawField = detail.field || path[path.length - 1] || "";
  const field = rawField.replace(/^body\./, "");
  return {
    gstin: "gstNumber",
    gstNumber: "gstNumber",
    pan: "panNumber",
  }[field] || field;
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const matchedDate = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return matchedDate
    ? `${matchedDate[1]}-${matchedDate[2]}-${matchedDate[3]}`
    : "";
};

const formatDateForDisplay = (value) => {
  const dateValue = toDateInputValue(value);
  if (!dateValue) return "";
  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year}`;
};

const getIsoDateYearsAgo = (years) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
};

const MAX_DOB_FOR_SELLER = getIsoDateYearsAgo(MIN_SELLER_AGE);
const SELLER_ONBOARDING_DRAFT_KEY = "sellerOnboardingDraft";
const REVIEW_LOCKED_APPROVAL_STATUSES = new Set(["pending_review", "resubmitted"]);
const REVIEW_LOCKED_KYC_STATUSES = new Set(["submitted", "under_review"]);
const REVIEW_LOCKED_BANK_STATUSES = new Set(["submitted", "under_review"]);
const REVIEW_LOCKED_ONBOARDING_STATUSES = new Set(["submitted", "under_review", "pending_review"]);

const MAX_DOB = new Date();
MAX_DOB.setFullYear(MAX_DOB.getFullYear() - 18);

const MAX_DOB_DATE = MAX_DOB.toISOString().split("T")[0];

const composeRegistrationName = (firstName = "", lastName = "") => {
  const first = String(firstName || "").trim();
  const last = String(lastName || "").trim();
  if (!last) return first;
  if (!first) return last;

  const firstParts = first.toLowerCase().split(/\s+/);
  const lastParts = last.toLowerCase().split(/\s+/);
  const firstAlreadyIncludesLast =
    lastParts.length <= firstParts.length &&
    lastParts.every(
      (part, index) =>
        firstParts[firstParts.length - lastParts.length + index] === part,
    );

  return firstAlreadyIncludesLast ? first : `${first} ${last}`;
};

const getRegistrationContact = (...sources) => {
  const contact = {
    fullName: "",
    rawFullName: "",
    emailAddress: "",
    mobileNumber: "",
  };

  sources.filter(Boolean).forEach((source) => {
    const user = source?.user || source;
    const profile = user?.profile || {};
    const rawFullName = [profile.firstName, profile.lastName]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ");
    const fullName = composeRegistrationName(
      profile.firstName,
      profile.lastName,
    );

    if (!contact.fullName) contact.fullName = fullName;
    if (!contact.rawFullName) contact.rawFullName = rawFullName;
    if (!contact.emailAddress)
      contact.emailAddress = String(user?.email || "").trim();
    if (!contact.mobileNumber)
      contact.mobileNumber = String(user?.phone || "").trim();
  });

  return contact;
};

const clearAutoFilledBusinessName = (value = "", registeredContact = {}) => {
  const currentValue = String(value || "").trim();
  const generatedNames = [
    registeredContact.fullName,
    registeredContact.rawFullName,
  ].filter(Boolean);

  return generatedNames.includes(currentValue) ? "" : value;
};

const clearRegisteredContactValue = (value = "", registeredValue = "") => {
  const currentValue = String(value || "").trim().toLowerCase();
  const registered = String(registeredValue || "").trim().toLowerCase();
  return currentValue && currentValue === registered ? "" : value;
};

const getSellerOnboardingDraftKey = (token) =>
  `${SELLER_ONBOARDING_DRAFT_KEY}:${token || "guest"}`;

const getOrganizationId = (organization = {}) =>
  organization.id || organization.organizationId || "";

const parseDocumentMap = (value = {}) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const hasCompleteReviewDetails = (state = {}) => {
  if (!state) return false;
  const organization = state.organization || state;
  const sellerProfile = state.sellerProfile || {};
  const documents = parseDocumentMap(
    organization.documents || state.documents || state.kyc?.documents || {},
  );
  const bankDetails = organization.bankDetails || sellerProfile.bankDetails || {};
  const pickupAddress =
    organization.pickupAddress ||
    sellerProfile.pickupAddress ||
    state.pickupAddress ||
    {};
  const billingAddress =
    organization.billingAddress ||
    organization.businessAddress ||
    sellerProfile.businessAddress ||
    state.billingAddress ||
    {};
  const hasText = (value) => String(value || "").trim().length > 0;

  return (
    hasText(organization.legalBusinessName || sellerProfile.legalBusinessName || sellerProfile.businessName) &&
    hasText(organization.businessType || sellerProfile.businessType) &&
    hasText(organization.supportEmail || sellerProfile.supportEmail) &&
    hasText(organization.supportPhone || sellerProfile.supportPhone) &&
    hasText(organization.gstin || sellerProfile.gstNumber || state.kyc?.gstNumber) &&
    hasText(organization.pan || state.kyc?.panNumber || sellerProfile.panNumber) &&
    hasText(organization.aadhaarNumber || state.kyc?.aadhaarNumber || sellerProfile.aadhaarNumber) &&
    hasText(pickupAddress.line1) &&
    hasText(pickupAddress.city) &&
    hasText(pickupAddress.state) &&
    hasText(pickupAddress.postalCode) &&
    hasText(billingAddress.line1 || pickupAddress.line1) &&
    hasText(billingAddress.city || pickupAddress.city) &&
    hasText(billingAddress.state || pickupAddress.state) &&
    hasText(billingAddress.postalCode || pickupAddress.postalCode) &&
    hasText(bankDetails.accountHolderName) &&
    hasText(bankDetails.accountNumber) &&
    hasText(bankDetails.ifscCode) &&
    hasText(bankDetails.bankName) &&
    hasText(documents.panDocumentUrl) &&
    hasText(documents.gstCertificateUrl) &&
    hasText(documents.aadhaarFrontUrl) &&
    hasText(documents.aadhaarBackUrl) &&
    hasText(documents.addressProofUrl) &&
    hasText(documents.bankProofUrl)
  );
};

const isSellerReviewLocked = (state = {}) => {
  if (!state) return false;
  if (!hasCompleteReviewDetails(state)) return false;
  const organization = state.organization || {};
  const sellerProfile = state.sellerProfile || {};
  const approvalStatus =
    state.organizationApprovalStatus ||
    state.approvalStatus ||
    organization.approvalStatus;
  const kycStatus =
    state.kycStatus ||
    state.kyc?.verificationStatus ||
    sellerProfile.kycStatus ||
    organization.kycStatus;
  const bankStatus =
    state.bankVerificationStatus ||
    sellerProfile.bankVerificationStatus ||
    organization.bankVerificationStatus;
  const onboardingStatus = state.onboardingStatus || state.status;

  if (
    [approvalStatus, kycStatus, bankStatus, onboardingStatus].some((status) =>
      ["rejected", "blocked", "suspended"].includes(String(status || "")),
    )
  ) {
    return false;
  }

  return (
    REVIEW_LOCKED_APPROVAL_STATUSES.has(String(approvalStatus || "")) ||
    REVIEW_LOCKED_KYC_STATUSES.has(String(kycStatus || "")) ||
    REVIEW_LOCKED_BANK_STATUSES.has(String(bankStatus || "")) ||
    REVIEW_LOCKED_ONBOARDING_STATUSES.has(String(onboardingStatus || ""))
  );
};

const unwrapOrganizationList = (response = {}) => {
  const root = response?.data?.data || response?.normalized?.data || response?.data || response || {};
  const items = root.organizations || root.items || root.list || root.rows || [];
  return Array.isArray(items) ? items : [];
};

const isOrganizationApprovedForBusiness = (organization = {}) =>
  organization.canSell === true ||
  (
    ["approved", "active"].includes(organization.approvalStatus) &&
    organization.kycStatus === "verified" &&
    organization.bankVerificationStatus === "verified" &&
    !["blocked", "rejected"].includes(String(organization.goLiveStatus || ""))
  );

const pickOnboardingOrganization = (organizations = [], preferredId = "") => {
  const preferred = preferredId
    ? organizations.find((item) => String(getOrganizationId(item)) === String(preferredId))
    : null;
  if (preferred) return preferred;
  return (
    organizations.find((item) => !isOrganizationApprovedForBusiness(item) && item.isDefault) ||
    organizations.find((item) => ["rejected", "blocked"].includes(item.approvalStatus)) ||
    organizations.find((item) => !isOrganizationApprovedForBusiness(item)) ||
    organizations.find((item) => item.isDefault) ||
    organizations[0] ||
    null
  );
};

const isRepeatedSingleWordName = (value = "") => {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (
    parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()
  );
};

const stripFileFieldsFromDraft = (draft = {}) => ({
  ...draft,
  kycForm: draft.kycForm
    ? {
      ...draft.kycForm,
      panDocumentFile: null,
      aadhaarFrontFile: null,
      aadhaarBackFile: null,
      addressProofFile: null,
      bankProofFile: null,
    }
    : undefined,
  profileForm: draft.profileForm
    ? {
      ...draft.profileForm,
      businessName: isRepeatedSingleWordName(draft.profileForm.businessName)
        ? ""
        : draft.profileForm.businessName,
      displayName: isRepeatedSingleWordName(draft.profileForm.displayName)
        ? ""
        : draft.profileForm.displayName,
      gstCertificateFile: null,
    }
    : undefined,
});

const detectDocumentMimeType = (bytes) => {
  if (!bytes?.length) return "";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return "";
};

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
};

const readFileAsUploadPayload = async (file) => {
  const buffer = await (
    typeof file.arrayBuffer === "function"
      ? file.arrayBuffer()
      : new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsArrayBuffer(file);
      })
  );
  const bytes = new Uint8Array(buffer);
  const mimeType =
    detectDocumentMimeType(bytes) || String(file.type || "").toLowerCase();

  return {
    contentBase64: arrayBufferToBase64(buffer),
    mimeType,
    fileName: file.name,
  };
};

const isPreviewableImage = (file) =>
  file?.type && file.type.startsWith("image/");

const isPreviewableImageUrl = (url = "") =>
  /\.(png|jpe?g|webp|gif|bmp|avif)(\?.*)?$/i.test(String(url || ""));

const isDocumentTooLarge = (file) => file?.size > MAX_DOCUMENT_BYTES;

const onlyDigits = (value = "", limit = 255) =>
  String(value || "").replace(/\D/g, "").slice(0, limit);

const onlyAlphaNumericUpper = (value = "", limit = 255) =>
  String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, limit);

const onlyNameCharacters = (value = "", limit = 255) =>
  String(value || "").replace(/[^A-Za-z .'-]/g, "").slice(0, limit);

const onlyBankNameCharacters = (value = "", limit = 255) =>
  String(value || "").replace(/[^A-Za-z .&'-]/g, "").slice(0, limit);

const onlyBranchCharacters = (value = "", limit = 255) =>
  String(value || "").replace(/[^A-Za-z0-9 .,&'/-]/g, "").slice(0, limit);

const onlyBusinessCharacters = (value = "", limit = 255) =>
  String(value || "").replace(/[^A-Za-z0-9 .,&'()/-]/g, "").slice(0, limit);

const sanitizeEmailInput = (value = "", limit = 180) => {
  const text = String(value || "")
    .replace(/\s/g, "")
    .replace(/[^A-Za-z0-9@._%+-]/g, "")
    .slice(0, limit);
  const [localPart, ...domainParts] = text.split("@");
  return domainParts.length
    ? `${localPart}@${domainParts.join("")}`
    : localPart;
};

const onlyUdyogAadhaarCharacters = (value = "") => {
  const text = String(value || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!text) return "";
  const withoutPrefix = text.startsWith("UDYAM-")
    ? text.slice(6)
    : text.replace(/^UDYAM-?/, "");
  return `UDYAM-${withoutPrefix}`.slice(0, 19);
};

const isBlankUdyogAadhaarNumber = (value = "") => {
  const text = String(value || "").trim().toUpperCase();
  return !text || text === "UDYAM" || text === "UDYAM-";
};

const getUdyogAadhaarPayloadValue = (value = "") =>
  isBlankUdyogAadhaarNumber(value)
    ? null
    : String(value || "").trim().toUpperCase();

const getFileNameFromUrl = (url = "", fallback = "Uploaded document") => {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").filter(Boolean).pop();
    return name ? decodeURIComponent(name) : fallback;
  } catch {
    const name = String(url || "")
      .split("/")
      .filter(Boolean)
      .pop();
    return name || fallback;
  }
};

const unwrapKycDocuments = (response = {}) => {
  const root = response?.data?.data || response?.data || response || {};
  return parseDocumentMap(root.documents || root.kycDocuments || root.kyc?.documents || {});
};

const DocumentUploadField = ({
  id,
  label,
  required = false,
  file,
  existingUrl = "",
  error,
  accept,
  onChange,
  onDrop,
  emptyText,
  helpAction = null,
}) => {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    let isActive = true;
    if (!isPreviewableImage(file)) {
      setPreviewUrl("");
      return undefined;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (isActive) setPreviewUrl(reader.result || "");
    };
    reader.onerror = () => {
      if (isActive) setPreviewUrl("");
    };
    reader.readAsDataURL(file);

    return () => {
      isActive = false;
    };
  }, [file]);

  return (
    <div data-onboarding-field={id}>
      <label className="mb-[6px]   block text-[13px] font-medium leading-[17px] text-[#484555]">
        {label} {required && STEP_ONE_REQUIRED}
      </label>
      <div
        className="flex min-h-[200px]  flex-col items-center justify-center rounded-[8px] border-2 border-dashed border-[#f2b84b]  bg-[#F4F1ED] px-4 py-3 transition "
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        {file || existingUrl ? (
          <div className="flex w-full flex-col items-center gap-3">
            {previewUrl || isPreviewableImageUrl(existingUrl) ? (
              <img
                src={previewUrl || existingUrl}
                alt={label}
                className="h-24 max-w-full  rounded-md border border-[#F4F1ED] bg-white object-contain"
              />
            ) : (
              <div className="flex max-w-full items-center gap-2 text-sm text-gray-700">
                <FileText size={18} className="shrink-0 text-[#082f91]" />
                <span className="truncate ">
                  {file?.name || getFileNameFromUrl(existingUrl, label)}
                </span>
              </div>
            )}
            <div className="flex max-w-full items-center gap-3">
              <span className="max-w-[220px] truncate text-xs text-gray-600">
                {file?.name || getFileNameFromUrl(existingUrl, label)}
              </span>
              <label
                htmlFor={id}
                className="shrink-0  cursor-pointer rounded-[7px] bg-[#082f91] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#062779]"
              >
                Change
              </label>
            </div>
          </div>
        ) : (
          <>
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#ead9bf] bg-white text-[#f2a900]">
              <UploadCloud size={24} />
            </span>
            <p className="mb-1 text-[14px] font-inter text-[#182D50]">
              {emptyText}
            </p>
            <p className="mb-3 text-[10px] text-[#182D5066]/40">
              PNG, JPG or PDF • Max 5 MB
            </p>
            <label
              htmlFor={id}
              className="cursor-pointer rounded-[7px] bg-[#082f91] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#062779]"
            >
              Browse
            </label>
          </>
        )}
        <input
          id={id}
          name={id}
          type="file"
          className="hidden"
          accept={accept}
          onChange={onChange}
          aria-required={required}
        />
      </div>
      {helpAction}
      {error && <p className={ERROR_CLASS}>{error}</p>}
    </div>
  );
};

const BankProofGuidanceModal = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-[10px] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[16px] font-bold text-[#082f91]">
              Bank proof upload suggestions
            </p>
            <p className="mt-1 text-sm text-[#5f6678]">
              Upload a clear cancelled cheque.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#5f6678] transition hover:bg-[#f1f4fb]"
            aria-label="Close bank proof suggestions"
          >
            <X size={18} />
          </button>
        </div>
       <div className="mt-4 space-y-3 text-sm text-[#30384d]">
  <p>Make sure these details are visible:</p>

  <ul className="list-disc space-y-2 pl-5">
    <li>Account holder name</li>
    <li>Account number</li>
    <li>IFSC code</li>
    <li>Bank name or branch name</li>
  </ul>

  {/* Example Image */}
  <div className="flex justify-center">
    <img
      src={Image}
      alt="Sample Bank Document"
      className="w-full max-w-md rounded-lg border border-gray-200 shadow-sm"
    />
  </div>

  <p className="rounded-md bg-[#fff8e6] px-3 py-2 text-xs text-[#7a5610]">
    Do not upload cropped, password-protected, or unclear documents.
  </p>
</div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-[7px] bg-[#082f91] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#062779]"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

const OnboardingPageLoader = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 top-[64px] z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px] lg:left-[350px] lg:top-[75px]">
      <div className="flex flex-col items-center gap-3   ">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#eadfcb] border-t-[#082f91]" />
      </div>
    </div>
  );
};

const SellerOnboarding = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { setStep, step } = useKYC();
  const { seller } = useSelector((state) => state);
  const onboardingToken =
    seller?.onboardingToken || localStorage.getItem("sellerOnboardingToken");
  const loading = Boolean(seller?.loading);
  const flowState = seller?.flowState;
  const accessToken =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const [pageLoading, setPageLoading] = useState(false);
  const [kycSubmittedApi, setKycSubmittedApi] = useState(false);
  const [requiresKycRefresh, setRequiresKycRefresh] = useState(false);
  const [kycErrors, setKycErrors] = useState({});
  const [profileErrors, setProfileErrors] = useState({});
  const [showBankProofGuidance, setShowBankProofGuidance] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const dateOfBirthRef = useRef(null);
  const gstNumberRef = useRef(null);
  const editSection = useMemo(
    () => new URLSearchParams(location.search).get("edit"),
    [location.search],
  );
  const organizationIdParam = useMemo(
    () => new URLSearchParams(location.search).get("organizationId") || "",
    [location.search],
  );
  const isOnboardingLoading = loading || pageLoading;

  const [kycForm, setKycForm] = useState({
    panNumber: "",
    gstNumber: "",
    aadhaarNumber: "",
    legalName: "",
    mobileNumber: "",
    emailAddress: "",
    dateOfBirth: "",
    panDocumentFile: null,
    aadhaarFrontFile: null,
    aadhaarBackFile: null,
    addressProofFile: null,
    bankProofFile: null,
  });
  const [documentUrls, setDocumentUrls] = useState({
    panDocumentUrl: "",
    gstCertificateUrl: "",
    aadhaarFrontUrl: "",
    aadhaarBackUrl: "",
    addressProofUrl: "",
    bankProofUrl: "",
    udyogAadhaarDocumentUrl: "",
  });

  const [profileForm, setProfileForm] = useState({
    businessType: "",
    businessName: "",
    gstNumber: "",
    gstCertificateFile: null,
    displayName: "",
    legalBusinessName: "",
    supportEmail: "",
    supportPhone: "",
    description: "",
    businessWebsite: "",
    udyogAadhaarNumber: "",
    udyogAadhaarDocumentFile: null,
    primaryContactName: "",
    businessAddressLine1: "",
    businessAddressLine2: "",
    businessAddressCity: "",
    businessAddressState: "",
    businessAddressCountry: "India",
    businessAddressPostalCode: "",
    pickupLine1: "",
    pickupLine2: "",
    pickupCity: "",
    pickupState: "",
    pickupCountry: "India",
    pickupPostalCode: "",
  });
  const [bankForm, setBankForm] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    branchName: "",
  });
  const [targetOrganization, setTargetOrganization] = useState(null);
  const businessTypes = useDropdownOptions("business-types");
  const countries = useDropdownOptions("countries", { limit: 250 });
  const optionIdByValue = (options, value) =>
    options.find((option) => String(option.value) === String(value))?.id || "";
  const pickupCountryId = optionIdByValue(
    countries.options,
    profileForm.pickupCountry,
  );
  const pickupStates = useDropdownOptions(
    "states",
    { parentId: pickupCountryId, limit: 250 },
    { enabled: Boolean(pickupCountryId) },
  );
  const businessCountryId = optionIdByValue(
    countries.options,
    profileForm.businessAddressCountry,
  );
  const businessStates = useDropdownOptions(
    "states",
    { parentId: businessCountryId, limit: 250 },
    { enabled: Boolean(businessCountryId) },
  );
  const registeredContact = useMemo(
    () => getRegistrationContact(seller?.onboardingUser, flowState),
    [flowState, seller?.onboardingUser],
  );
  const businessTypeLabel =
    withSelectedOption(businessTypes.options, profileForm.businessType).find(
      (option) => String(option.value) === String(profileForm.businessType),
    )?.label || profileForm.businessType;

  const canAccess = useMemo(
    () => !!onboardingToken || !!accessToken,
    [accessToken, onboardingToken],
  );
  const reviewLockedStatusRoute = useMemo(() => {
    if (isSellerReviewLocked(flowState)) return getSellerStatusRoute(flowState);
    if (isSellerReviewLocked(targetOrganization)) return AUTH_ROUTES.SELLER_STATUS_PENDING;
    return null;
  }, [flowState, targetOrganization]);
  const draftKey = useMemo(
    () => getSellerOnboardingDraftKey(onboardingToken || accessToken),
    [accessToken, onboardingToken],
  );

  const applyOrganizationToForms = (organization = {}) => {
    if (!organization?.id && !organization?.organizationId) return;
    const billingAddress = organization.billingAddress || organization.businessAddress || {};
    const pickupAddress = organization.pickupAddress || {};
    const bankDetails = organization.bankDetails || {};
    const organizationDocuments = parseDocumentMap(
      organization.documents || organization.kycDocuments || {},
    );

    setTargetOrganization(organization);
    setDocumentUrls((prev) => ({
      ...prev,
      panDocumentUrl: prev.panDocumentUrl || organizationDocuments.panDocumentUrl || "",
      gstCertificateUrl:
        prev.gstCertificateUrl || organizationDocuments.gstCertificateUrl || "",
      aadhaarFrontUrl: prev.aadhaarFrontUrl || organizationDocuments.aadhaarFrontUrl || "",
      aadhaarBackUrl: prev.aadhaarBackUrl || organizationDocuments.aadhaarBackUrl || "",
      addressProofUrl: prev.addressProofUrl || organizationDocuments.addressProofUrl || "",
      udyogAadhaarDocumentUrl:
        prev.udyogAadhaarDocumentUrl ||
        organizationDocuments.udyogAadhaarDocumentUrl ||
        "",
      bankProofUrl: prev.bankProofUrl || organizationDocuments.bankProofUrl || "",
    }));
    setKycForm((prev) => ({
      ...prev,
      panNumber: prev.panNumber || organization.pan || "",
      gstNumber: prev.gstNumber || organization.gstin || "",
      aadhaarNumber: prev.aadhaarNumber || organization.aadhaarNumber || "",
      legalName: prev.legalName || organization.primaryContactName || organization.legalBusinessName || "",
      dateOfBirth: toDateInputValue(prev.dateOfBirth || organization.dateOfBirth),
    }));
    setProfileForm((prev) => ({
      ...prev,
      businessType: prev.businessType || organization.businessType || "",
      businessName:
        clearAutoFilledBusinessName(prev.businessName, registeredContact) ||
        clearAutoFilledBusinessName(organization.legalBusinessName, registeredContact) ||
        "",
      gstNumber: prev.gstNumber || organization.gstin || "",
      displayName: "",
      legalBusinessName: prev.legalBusinessName || organization.legalBusinessName || "",
      supportEmail:
        prev.supportEmail ||
        clearRegisteredContactValue(organization.supportEmail, registeredContact.emailAddress) ||
        "",
      supportPhone:
        prev.supportPhone ||
        clearRegisteredContactValue(organization.supportPhone, registeredContact.mobileNumber) ||
        "",
      description: prev.description || organization.description || "",
      businessWebsite: prev.businessWebsite || organization.businessWebsite || "",
      udyogAadhaarNumber:
        prev.udyogAadhaarNumber ||
        organization.metadata?.udyogAadhaarNumber ||
        organization.udyogAadhaarNumber ||
        "",
      primaryContactName: "",
      businessAddressLine1: prev.businessAddressLine1 || billingAddress.line1 || "",
      businessAddressLine2: prev.businessAddressLine2 || billingAddress.line2 || "",
      businessAddressCity: prev.businessAddressCity || billingAddress.city || "",
      businessAddressState: prev.businessAddressState || billingAddress.state || "",
      businessAddressCountry: prev.businessAddressCountry || billingAddress.country || "India",
      businessAddressPostalCode: prev.businessAddressPostalCode || billingAddress.postalCode || "",
      pickupLine1: prev.pickupLine1 || pickupAddress.line1 || "",
      pickupLine2: prev.pickupLine2 || pickupAddress.line2 || "",
      pickupCity: prev.pickupCity || pickupAddress.city || "",
      pickupState: prev.pickupState || pickupAddress.state || "",
      pickupCountry: prev.pickupCountry || pickupAddress.country || "India",
      pickupPostalCode: prev.pickupPostalCode || pickupAddress.postalCode || "",
    }));
    setBankForm((prev) => ({
      ...prev,
      accountHolderName: prev.accountHolderName || bankDetails.accountHolderName || "",
      accountNumber: prev.accountNumber || bankDetails.accountNumber || "",
      ifscCode: prev.ifscCode || bankDetails.ifscCode || "",
      bankName: prev.bankName || bankDetails.bankName || "",
      branchName: prev.branchName || bankDetails.branchName || "",
    }));
  };

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (!savedDraft) {
        setDraftLoaded(true);
        return;
      }

      const draft = stripFileFieldsFromDraft(JSON.parse(savedDraft));
      if (draft.kycForm) {
        setKycForm((prev) => ({
          ...prev,
          ...draft.kycForm,
          dateOfBirth: toDateInputValue(draft.kycForm.dateOfBirth),
        }));
      }
      if (draft.profileForm) {
        setProfileForm((prev) => ({ ...prev, ...draft.profileForm }));
      }
      if (draft.bankForm) {
        setBankForm((prev) => ({ ...prev, ...draft.bankForm }));
      }
      if (draft.step && draft.step >= 1 && draft.step <= 4) {
        setStep(draft.step);
      }
    } catch {
      localStorage.removeItem(draftKey);
    } finally {
      setDraftLoaded(true);
    }
  }, [draftKey, setStep]);

  useEffect(() => {
    if (!draftLoaded) return;
    if (step >= 5) {
      localStorage.removeItem(draftKey);
      return;
    }

    const draft = stripFileFieldsFromDraft({
      kycForm,
      profileForm,
      bankForm,
      step,
    });
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [
    bankForm,
    draftKey,
    draftLoaded,
    kycForm,
    profileForm,
    step,
  ]);

  useEffect(() => {
    dispatch(fetchAuthStatus({ token: onboardingToken }));
  }, [dispatch, onboardingToken]);

  useEffect(() => {
    if (
      !registeredContact.fullName &&
      !registeredContact.emailAddress &&
      !registeredContact.mobileNumber
    ) {
      return;
    }

    setKycForm((prev) => ({
      ...prev,
      legalName:
        !prev.legalName ||
          (registeredContact.rawFullName !== registeredContact.fullName &&
            prev.legalName === registeredContact.rawFullName)
          ? registeredContact.fullName
          : prev.legalName,
      emailAddress: registeredContact.emailAddress || prev.emailAddress,
      mobileNumber: registeredContact.mobileNumber || prev.mobileNumber,
    }));
    setProfileForm((prev) => ({
      ...prev,
      businessName: clearAutoFilledBusinessName(
        prev.businessName,
        registeredContact,
      ),
    }));
  }, [registeredContact]);

  useEffect(() => {
    if (!accessToken) return;

    let isMounted = true;
    const hydrateSellerOnboarding = async () => {
      try {
        setPageLoading(true);
        const response = await apiRequest("GET", ENDPOINTS.auth.me);
        if (!isMounted) return;

        const user = response?.data || response || {};
        const sellerProfile = user?.sellerProfile || {};
        const kyc = user?.kyc || {};
        const businessAddress = sellerProfile?.businessAddress || {};
        const pickupAddress = sellerProfile?.pickupAddress || {};
        const registrationContact = getRegistrationContact(user);
        const onboarding = user?.onboarding || {};
        const isBankRejected =
          user?.bankVerificationStatus === "rejected" ||
          onboarding?.bankVerificationStatus === "rejected" ||
          sellerProfile?.bankVerificationStatus === "rejected";
        const bankDetails = isBankRejected
          ? {}
          : sellerProfile?.bankDetails || {};
        const kycStatus =
          onboarding?.kycStatus ||
          kyc?.verificationStatus ||
          sellerProfile?.kycStatus;
        const kycDocuments = parseDocumentMap(kyc?.documents || {});
        const hasSubmittedKyc =
          onboarding?.checklist?.kycSubmitted ||
          ["submitted", "under_review", "verified"].includes(kycStatus);
        const hasCompleteStoredKyc =
          !!kyc?.panNumber &&
          !!kyc?.aadhaarNumber &&
          !!kycDocuments?.panDocumentUrl &&
          !!kycDocuments?.aadhaarFrontUrl &&
          !!kycDocuments?.aadhaarBackUrl;
        const shouldRefreshKyc =
          Boolean(hasSubmittedKyc) &&
          kycStatus !== "rejected" &&
          !hasCompleteStoredKyc;

        setRequiresKycRefresh(shouldRefreshKyc);
        setKycSubmittedApi(
          Boolean(
            hasSubmittedKyc && kycStatus !== "rejected" && !shouldRefreshKyc,
          ),
        );
        setDocumentUrls((prev) => ({
          ...prev,
          panDocumentUrl:
            prev.panDocumentUrl || kycDocuments?.panDocumentUrl || "",
          gstCertificateUrl:
            prev.gstCertificateUrl || kycDocuments?.gstCertificateUrl || "",
          aadhaarFrontUrl:
            prev.aadhaarFrontUrl || kycDocuments?.aadhaarFrontUrl || "",
          aadhaarBackUrl:
            prev.aadhaarBackUrl || kycDocuments?.aadhaarBackUrl || "",
          addressProofUrl:
            prev.addressProofUrl || kycDocuments?.addressProofUrl || "",
          udyogAadhaarDocumentUrl:
            prev.udyogAadhaarDocumentUrl ||
            kycDocuments?.udyogAadhaarDocumentUrl ||
            "",
          bankProofUrl:
            prev.bankProofUrl || kycDocuments?.bankProofUrl || "",
        }));
        setKycForm((prev) => ({
          ...prev,
          panNumber:
            prev.panNumber || kyc?.panNumber || sellerProfile?.panNumber || "",
          gstNumber:
            prev.gstNumber || kyc?.gstNumber || sellerProfile?.gstNumber || "",
          aadhaarNumber:
            prev.aadhaarNumber ||
            kyc?.aadhaarNumber ||
            sellerProfile?.aadhaarNumber ||
            "",
          legalName:
            kyc?.legalName ||
            prev.legalName ||
            registrationContact.fullName ||
            sellerProfile?.legalBusinessName ||
            sellerProfile?.displayName ||
            "",
          emailAddress:
            registrationContact.emailAddress ||
            prev.emailAddress ||
            sellerProfile?.supportEmail ||
            "",
          mobileNumber:
            registrationContact.mobileNumber ||
            prev.mobileNumber ||
            sellerProfile?.supportPhone ||
            "",
          dateOfBirth: toDateInputValue(
            prev.dateOfBirth || sellerProfile?.dateOfBirth,
          ),
        }));
        const storedBusinessName =
          sellerProfile?.businessName ||
          sellerProfile?.legalBusinessName ||
          "";
        const storedBusinessType =
          sellerProfile?.businessType || kyc?.businessType || kyc?.business_type || "";
        setProfileForm((prev) => ({
          ...prev,
          businessType:
            storedBusinessName?.trim() && storedBusinessType
              ? storedBusinessType
              : clearAutoFilledBusinessName(
                prev.businessName,
                registrationContact,
              )?.trim()
                ? prev.businessType
                : "",
          businessName:
            clearAutoFilledBusinessName(storedBusinessName, registrationContact) ||
            clearAutoFilledBusinessName(prev.businessName, registrationContact) ||
            "",
          gstNumber:
            prev.gstNumber || sellerProfile?.gstNumber || kyc?.gstNumber || "",
          displayName:
            "",
          legalBusinessName:
            prev.legalBusinessName || sellerProfile?.legalBusinessName || "",
          supportEmail:
            prev.supportEmail ||
            clearRegisteredContactValue(sellerProfile?.supportEmail, registrationContact.emailAddress) ||
            "",
          supportPhone:
            prev.supportPhone ||
            clearRegisteredContactValue(sellerProfile?.supportPhone, registrationContact.mobileNumber) ||
            "",
          description: prev.description || sellerProfile?.description || "",
          businessWebsite:
            prev.businessWebsite || sellerProfile?.businessWebsite || "",
          udyogAadhaarNumber:
            prev.udyogAadhaarNumber ||
            sellerProfile?.metadata?.udyogAadhaarNumber ||
            sellerProfile?.udyogAadhaarNumber ||
            "",
          primaryContactName:
            "",
          businessAddressLine1:
            prev.businessAddressLine1 || businessAddress?.line1 || "",
          businessAddressLine2:
            prev.businessAddressLine2 || businessAddress?.line2 || "",
          businessAddressCity:
            prev.businessAddressCity || businessAddress?.city || "",
          businessAddressState:
            prev.businessAddressState || businessAddress?.state || "",
          businessAddressCountry:
            prev.businessAddressCountry || businessAddress?.country || "India",
          businessAddressPostalCode:
            prev.businessAddressPostalCode || businessAddress?.postalCode || "",
          pickupLine1: prev.pickupLine1 || pickupAddress?.line1 || "",
          pickupLine2: prev.pickupLine2 || pickupAddress?.line2 || "",
          pickupCity: prev.pickupCity || pickupAddress?.city || "",
          pickupState: prev.pickupState || pickupAddress?.state || "",
          pickupCountry:
            prev.pickupCountry || pickupAddress?.country || "India",
          pickupPostalCode:
            prev.pickupPostalCode || pickupAddress?.postalCode || "",
        }));
        setBankForm((prev) =>
          isBankRejected
            ? {
              ...prev,
              accountHolderName: "",
              accountNumber: "",
              ifscCode: "",
              bankName: "",
              branchName: "",
            }
            : {
              ...prev,
              accountHolderName:
                prev.accountHolderName ||
                bankDetails?.accountHolderName ||
                "",
              accountNumber:
                prev.accountNumber || bankDetails?.accountNumber || "",
              ifscCode: prev.ifscCode || bankDetails?.ifscCode || "",
              bankName: prev.bankName || bankDetails?.bankName || "",
              branchName: prev.branchName || bankDetails?.branchName || "",
            },
        );

        const organizationResponse = await apiRequest(
          "GET",
          ENDPOINTS.sellers.myOrganizations,
          { limit: 100 },
        ).catch(() => null);
        if (!isMounted) return;
        const onboardingOrganization = pickOnboardingOrganization(
          unwrapOrganizationList(organizationResponse),
          organizationIdParam ||
          onboarding?.onboardingTargetOrganizationId ||
          user?.onboardingTargetOrganizationId ||
          user?.organization?.id ||
          user?.organization?.organizationId ||
          "",
        );
        if (onboardingOrganization) {
          applyOrganizationToForms(onboardingOrganization);
        }
      } catch (error) {
        toast.error(error?.message || "Unable to load seller account details");
      } finally {
        if (isMounted) {
          setPageLoading(false);
        }
      }
    };

    hydrateSellerOnboarding();
    return () => {
      isMounted = false;
    };
  }, [accessToken, organizationIdParam]);

  useEffect(() => {
    if (!flowState?.sellerProfile && !flowState?.kyc) return;

    const sellerProfile = flowState?.sellerProfile || {};
    const kyc = flowState?.kyc || {};
    const registrationContact = getRegistrationContact(
      flowState,
      seller?.onboardingUser,
    );
    const isBankRejected =
      flowState?.bankVerificationStatus === "rejected" ||
      sellerProfile?.bankVerificationStatus === "rejected";
    const bankDetails = isBankRejected ? {} : sellerProfile?.bankDetails || {};
    const businessAddress = sellerProfile?.businessAddress || {};
    const pickupAddress = sellerProfile?.pickupAddress || {};
    const kycStatus =
      flowState?.kycStatus ||
      kyc?.verificationStatus ||
      sellerProfile?.kycStatus;
    const kycDocuments = parseDocumentMap(kyc?.documents || {});
    const hasSubmittedKyc =
      flowState?.checklist?.kycSubmitted ||
      ["submitted", "under_review", "verified"].includes(kycStatus);
    const hasCompleteStoredKyc =
      !!kyc?.panNumber &&
      !!kyc?.aadhaarNumber &&
      !!kycDocuments?.panDocumentUrl &&
      !!kycDocuments?.aadhaarFrontUrl &&
      !!kycDocuments?.aadhaarBackUrl;
    const shouldRefreshKyc =
      Boolean(hasSubmittedKyc) &&
      kycStatus !== "rejected" &&
      !hasCompleteStoredKyc;

    setRequiresKycRefresh(shouldRefreshKyc);
    setKycSubmittedApi(
      Boolean(hasSubmittedKyc && kycStatus !== "rejected" && !shouldRefreshKyc),
    );
    setDocumentUrls((prev) => ({
      ...prev,
      panDocumentUrl: prev.panDocumentUrl || kycDocuments?.panDocumentUrl || "",
      gstCertificateUrl:
        prev.gstCertificateUrl || kycDocuments?.gstCertificateUrl || "",
      aadhaarFrontUrl:
        prev.aadhaarFrontUrl || kycDocuments?.aadhaarFrontUrl || "",
      aadhaarBackUrl: prev.aadhaarBackUrl || kycDocuments?.aadhaarBackUrl || "",
      addressProofUrl:
        prev.addressProofUrl || kycDocuments?.addressProofUrl || "",
      udyogAadhaarDocumentUrl:
        prev.udyogAadhaarDocumentUrl ||
        kycDocuments?.udyogAadhaarDocumentUrl ||
        "",
      bankProofUrl: prev.bankProofUrl || kycDocuments?.bankProofUrl || "",
    }));
    setKycForm((prev) => ({
      ...prev,
      panNumber:
        prev.panNumber || kyc?.panNumber || sellerProfile?.panNumber || "",
      gstNumber:
        prev.gstNumber || kyc?.gstNumber || sellerProfile?.gstNumber || "",
      aadhaarNumber:
        prev.aadhaarNumber ||
        kyc?.aadhaarNumber ||
        sellerProfile?.aadhaarNumber ||
        "",
      legalName:
        kyc?.legalName ||
        prev.legalName ||
        registrationContact.fullName ||
        sellerProfile?.legalBusinessName ||
        sellerProfile?.displayName ||
        "",
      emailAddress:
        registrationContact.emailAddress ||
        prev.emailAddress ||
        sellerProfile?.supportEmail ||
        "",
      mobileNumber:
        registrationContact.mobileNumber ||
        prev.mobileNumber ||
        sellerProfile?.supportPhone ||
        "",
      dateOfBirth: toDateInputValue(
        prev.dateOfBirth || sellerProfile?.dateOfBirth,
      ),
    }));
    const storedBusinessName =
      sellerProfile?.businessName ||
      sellerProfile?.legalBusinessName ||
      "";
    const storedBusinessType =
      sellerProfile?.businessType || kyc?.businessType || kyc?.business_type || "";
    setProfileForm((prev) => ({
      ...prev,
      businessType:
        storedBusinessName?.trim() && storedBusinessType
          ? storedBusinessType
          : clearAutoFilledBusinessName(
            prev.businessName,
            registrationContact,
          )?.trim()
            ? prev.businessType
            : "",
      businessName:
        clearAutoFilledBusinessName(storedBusinessName, registrationContact) ||
        clearAutoFilledBusinessName(prev.businessName, registrationContact) ||
        "",
      gstNumber:
        prev.gstNumber || sellerProfile?.gstNumber || kyc?.gstNumber || "",
      displayName:
        "",
      legalBusinessName:
        prev.legalBusinessName || sellerProfile?.legalBusinessName || "",
      supportEmail:
        prev.supportEmail ||
        clearRegisteredContactValue(sellerProfile?.supportEmail, registrationContact.emailAddress) ||
        "",
      supportPhone:
        prev.supportPhone ||
        clearRegisteredContactValue(sellerProfile?.supportPhone, registrationContact.mobileNumber) ||
        "",
      description: prev.description || sellerProfile?.description || "",
      businessWebsite:
        prev.businessWebsite || sellerProfile?.businessWebsite || "",
      udyogAadhaarNumber:
        prev.udyogAadhaarNumber ||
        sellerProfile?.metadata?.udyogAadhaarNumber ||
        sellerProfile?.udyogAadhaarNumber ||
        "",
      primaryContactName:
        "",
      businessAddressLine1:
        prev.businessAddressLine1 || businessAddress?.line1 || "",
      businessAddressLine2:
        prev.businessAddressLine2 || businessAddress?.line2 || "",
      businessAddressCity:
        prev.businessAddressCity || businessAddress?.city || "",
      businessAddressState:
        prev.businessAddressState || businessAddress?.state || "",
      businessAddressCountry:
        prev.businessAddressCountry || businessAddress?.country || "India",
      businessAddressPostalCode:
        prev.businessAddressPostalCode || businessAddress?.postalCode || "",
      pickupLine1: prev.pickupLine1 || pickupAddress?.line1 || "",
      pickupLine2: prev.pickupLine2 || pickupAddress?.line2 || "",
      pickupCity: prev.pickupCity || pickupAddress?.city || "",
      pickupState: prev.pickupState || pickupAddress?.state || "",
      pickupCountry: prev.pickupCountry || pickupAddress?.country || "India",
      pickupPostalCode:
        prev.pickupPostalCode || pickupAddress?.postalCode || "",
    }));
    setBankForm((prev) =>
      isBankRejected
        ? {
          ...prev,
          accountHolderName: "",
          accountNumber: "",
          ifscCode: "",
          bankName: "",
          branchName: "",
        }
        : {
          ...prev,
          accountHolderName:
            prev.accountHolderName || bankDetails?.accountHolderName || "",
          accountNumber:
            prev.accountNumber || bankDetails?.accountNumber || "",
          ifscCode: prev.ifscCode || bankDetails?.ifscCode || "",
          bankName: prev.bankName || bankDetails?.bankName || "",
          branchName: prev.branchName || bankDetails?.branchName || "",
        },
    );
  }, [flowState, seller?.onboardingUser]);

  useEffect(() => {
    if (!flowState) return;
    const sellerProfile = flowState?.sellerProfile || {};
    const pickupAddress = sellerProfile?.pickupAddress || {};
    const hasStoredBusinessProfile =
      Boolean(
        (
          sellerProfile?.businessName ||
          sellerProfile?.legalBusinessName
        )?.trim(),
      ) &&
      Boolean(sellerProfile?.businessType?.trim()) &&
      Boolean(sellerProfile?.gstNumber?.trim()) &&
      Boolean(sellerProfile?.supportEmail?.trim()) &&
      Boolean(sellerProfile?.supportPhone?.trim()) &&
      Boolean(pickupAddress?.line1?.trim()) &&
      Boolean(pickupAddress?.city?.trim()) &&
      Boolean(pickupAddress?.state?.trim()) &&
      Boolean(pickupAddress?.postalCode?.trim());
    const profileCompleted =
      hasStoredBusinessProfile &&
      (!!flowState?.checklist?.profileCompleted ||
        !!flowState?.requirements?.profile?.completed);
    const bankRejected =
      flowState?.bankVerificationStatus === "rejected" ||
      flowState?.sellerProfile?.bankVerificationStatus === "rejected";
    const bankLinked =
      !bankRejected &&
      (!!flowState?.checklist?.bankLinked ||
        !!flowState?.requirements?.bankDetails?.completed);
    const kycSubmitted =
      !requiresKycRefresh &&
      (!!flowState?.checklist?.kycSubmitted ||
        ["submitted", "under_review", "verified"].includes(
          flowState?.kycStatus,
        ));
    const statusMeansReview =
      flowState?.kycStatus === "submitted" ||
      flowState?.kycStatus === "under_review" ||
      flowState?.onboardingStatus === "under_review";

    setKycSubmittedApi(
      Boolean(kycSubmitted && flowState?.kycStatus !== "rejected"),
    );

    if (
      !organizationIdParam &&
      flowState?.requiresOnboarding === false
    ) {
      setStep(5);
      return;
    }
    if (flowState?.kycStatus === "rejected") {
      setStep(1);
      return;
    }
    if (requiresKycRefresh) {
      // KYC documents are incomplete (not rejected) - go directly to KYC form
      setStep(1);
      return;
    }
    if (statusMeansReview && profileCompleted && kycSubmitted && bankLinked) {
      setStep(5);
      return;
    }
    if (bankRejected && profileCompleted && kycSubmitted) {
      setStep(3);
      return;
    }
    if (profileCompleted && kycSubmitted && bankLinked) {
      setStep(4);
      return;
    }
    if (profileCompleted && kycSubmitted) {
      setStep(3);
      return;
    }
    if (kycSubmitted) {
      setStep(2);
      return;
    }

    setStep(1);
  }, [editSection, flowState, organizationIdParam, requiresKycRefresh, setStep]);

  if (!canAccess) return <Navigate to="/login" />;

  if (reviewLockedStatusRoute) {
    return <Navigate to={reviewLockedStatusRoute} replace />;
  }

  const setBackendFieldErrors = (details, setErrors) => {
    const nextErrors = {};
    details.forEach((detail) => {
      const field = getBackendDetailField(detail);
      if (field) nextErrors[field] = detail.message;
    });
    setErrors(nextErrors);
  };

  const onKycChange = (event) => {
    const { name, value } = event.target;
    let normalized = value;
    if (name === "panNumber") normalized = onlyAlphaNumericUpper(value, 10);
    if (name === "gstNumber") normalized = onlyAlphaNumericUpper(value, 15);
    if (name === "aadhaarNumber") normalized = onlyDigits(value, 12);
    if (name === "legalName") {
      normalized = onlyNameCharacters(value, PERSON_NAME_MAX_LENGTH);
    }
    setKycForm((prev) => ({ ...prev, [name]: normalized }));
    setKycErrors((prev) => ({ ...prev, [name]: null }));
  };

  const openDatePicker = () => {
    const input = dateOfBirthRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  const onKycDocumentFileChange = (fieldName) => (event) => {
    const file = event.target.files?.[0] || null;
    if (isDocumentTooLarge(file)) {
      setKycForm((prev) => ({ ...prev, [fieldName]: null }));
      setKycErrors((prev) => ({
        ...prev,
        [fieldName]: "Document file must be 5 MB or smaller",
      }));
      setProfileErrors((prev) => ({
        ...prev,
        [fieldName]: "Document file must be 5 MB or smaller",
      }));
      event.target.value = "";
      return;
    }
    setKycForm((prev) => ({ ...prev, [fieldName]: file }));
    const urlFieldMap = {
      panDocumentFile: "panDocumentUrl",
      aadhaarFrontFile: "aadhaarFrontUrl",
      aadhaarBackFile: "aadhaarBackUrl",
      addressProofFile: "addressProofUrl",
      bankProofFile: "bankProofUrl",
    };
    if (file && urlFieldMap[fieldName]) {
      setDocumentUrls((prev) => ({ ...prev, [urlFieldMap[fieldName]]: "" }));
    }
    setKycErrors((prev) => ({ ...prev, [fieldName]: null }));
    setProfileErrors((prev) => ({ ...prev, [fieldName]: null }));
    event.target.value = "";
  };

  const onKycDocumentDrop = (fieldName) => (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] || null;
    if (!file) return;
    if (isDocumentTooLarge(file)) {
      setKycForm((prev) => ({ ...prev, [fieldName]: null }));
      setKycErrors((prev) => ({
        ...prev,
        [fieldName]: "Document file must be 5 MB or smaller",
      }));
      setProfileErrors((prev) => ({
        ...prev,
        [fieldName]: "Document file must be 5 MB or smaller",
      }));
      return;
    }
    setKycForm((prev) => ({ ...prev, [fieldName]: file }));
    const urlFieldMap = {
      panDocumentFile: "panDocumentUrl",
      aadhaarFrontFile: "aadhaarFrontUrl",
      aadhaarBackFile: "aadhaarBackUrl",
      addressProofFile: "addressProofUrl",
      bankProofFile: "bankProofUrl",
    };
    if (urlFieldMap[fieldName]) {
      setDocumentUrls((prev) => ({ ...prev, [urlFieldMap[fieldName]]: "" }));
    }
    setKycErrors((prev) => ({ ...prev, [fieldName]: null }));
    setProfileErrors((prev) => ({ ...prev, [fieldName]: null }));
  };

  const onProfileDocumentFileChange = (fieldName, urlFieldName) => (event) => {
    const file = event.target.files?.[0] || null;
    if (isDocumentTooLarge(file)) {
      setProfileForm((prev) => ({ ...prev, [fieldName]: null }));
      setProfileErrors((prev) => ({
        ...prev,
        [fieldName]: "Document file must be 5 MB or smaller",
      }));
      setKycErrors((prev) => ({ ...prev, [fieldName]: null }));
      event.target.value = "";
      return;
    }
    setProfileForm((prev) => ({ ...prev, [fieldName]: file }));
    if (file) {
      setDocumentUrls((prev) => ({ ...prev, [urlFieldName]: "" }));
    }
    setProfileErrors((prev) => ({ ...prev, [fieldName]: null }));
    setKycErrors((prev) => ({ ...prev, [fieldName]: null }));
    event.target.value = "";
  };

  const onProfileDocumentDrop = (fieldName, urlFieldName) => (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] || null;
    if (!file) return;
    if (isDocumentTooLarge(file)) {
      setProfileForm((prev) => ({ ...prev, [fieldName]: null }));
      setProfileErrors((prev) => ({
        ...prev,
        [fieldName]: "Document file must be 5 MB or smaller",
      }));
      setKycErrors((prev) => ({ ...prev, [fieldName]: null }));
      return;
    }
    setProfileForm((prev) => ({ ...prev, [fieldName]: file }));
    setDocumentUrls((prev) => ({ ...prev, [urlFieldName]: "" }));
    setProfileErrors((prev) => ({ ...prev, [fieldName]: null }));
    setKycErrors((prev) => ({ ...prev, [fieldName]: null }));
  };

  const onGstCertificateFileChange = onProfileDocumentFileChange("gstCertificateFile", "gstCertificateUrl");
  const onGstCertificateDrop = onProfileDocumentDrop("gstCertificateFile", "gstCertificateUrl");
  const onUdyogAadhaarDocumentFileChange = onProfileDocumentFileChange("udyogAadhaarDocumentFile", "udyogAadhaarDocumentUrl");
  const onUdyogAadhaarDocumentDrop = onProfileDocumentDrop("udyogAadhaarDocumentFile", "udyogAadhaarDocumentUrl");

  const onProfileChange = (event) => {
    const { name, value } = event.target;
    const upperCaseFields = [
      "gstNumber",
      "udyogAadhaarNumber",
      "pickupPostalCode",
      "businessAddressPostalCode",
    ];
    const normalized = upperCaseFields.includes(name)
      ? value.toUpperCase()
      : value;
    let nextValue = normalized;
    if (name === "businessName" || name === "displayName" || name === "legalBusinessName") {
      nextValue = onlyBusinessCharacters(value, BUSINESS_NAME_MAX_LENGTH);
    } else if (name === "primaryContactName") {
      nextValue = onlyNameCharacters(value, PERSON_NAME_MAX_LENGTH);
    } else if (name === "supportEmail") {
      nextValue = sanitizeEmailInput(value);
    } else if (name === "businessWebsite") {
      nextValue = String(value || "").replace(/\s/g, "").slice(0, 255);
    } else if (name === "gstNumber") {
      nextValue = onlyAlphaNumericUpper(value, 15);
    } else if (name === "udyogAadhaarNumber") {
      nextValue = onlyUdyogAadhaarCharacters(value);
    } else if (name === "supportPhone") {
      nextValue = onlyDigits(value, 15);
    } else if (name === "pickupPostalCode" || name === "businessAddressPostalCode") {
      nextValue = onlyAlphaNumericUpper(value, 10);
    }
    setProfileForm((prev) => {
      const nextForm = {
        ...prev,
        [name]:
        name === "gstNumber"
          ? nextValue
          : name === "udyogAadhaarNumber"
            ? nextValue
            : name === "supportPhone"
              ? nextValue
              : upperCaseFields.includes(name)
                ? nextValue
                : nextValue,
      };
      if (name === "businessName") {
        nextForm.legalBusinessName = nextValue;
        nextForm.displayName = nextValue;
      }
      return nextForm;
    });
    setProfileErrors((prev) => ({ ...prev, [name]: null }));
  };
  const onAddressSelectChange =
    (field, resetFields = []) =>
      (event) => {
        const { value } = event.target;
        setProfileForm((prev) => ({
          ...prev,
          [field]: value,
          ...resetFields.reduce(
            (result, childField) => ({ ...result, [childField]: "" }),
            {},
          ),
        }));
        setProfileErrors((prev) => ({
          ...prev,
          [field]: null,
          ...resetFields.reduce(
            (result, childField) => ({ ...result, [childField]: null }),
            {},
          ),
        }));
      };
  const onBankChange = (event) => {
    const { name, value } = event.target;
    let normalized = name === "ifscCode" ? value.toUpperCase() : value;
    if (name === "ifscCode") {
      normalized = onlyAlphaNumericUpper(value, 11);
    }
    if (name === "accountNumber") {
      normalized = onlyDigits(value, 18);
    }
    if (name === "accountHolderName") {
      normalized = onlyNameCharacters(value, PERSON_NAME_MAX_LENGTH);
    }
    if (name === "bankName") {
      normalized = onlyBankNameCharacters(value, 120);
    }
    if (name === "branchName") {
      normalized = onlyBranchCharacters(value, 120);
    }
    setBankForm((prev) => ({ ...prev, [name]: normalized }));
    setProfileErrors((prev) => ({ ...prev, [name]: null }));
  };

  const scrollToFirstValidationError = (errors) => {
    const firstField = Object.keys(errors || {})[0];
    if (!firstField || typeof document === "undefined") return;

    // Wait for React to render the error message before measuring the field.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const field =
          document.querySelector(`[data-onboarding-field="${firstField}"]`) ||
          document.querySelector(`[name="${firstField}"]`) ||
          document.getElementById(firstField);
        if (!field) return;

        field.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusTarget = field.matches?.("input, select, textarea")
          ? field
          : field.querySelector?.("input:not([type='hidden']), select, textarea");
        if (focusTarget && focusTarget.type !== "file") {
          focusTarget.focus({ preventScroll: true });
        }
      });
    });
  };

  const validateKyc = (fieldName) => {
    const errors = {};
    const dateOfBirth = toDateInputValue(kycForm.dateOfBirth);
    if (!kycForm.legalName.trim()) errors.legalName = "Legal name is required";
    else if (kycForm.legalName.trim().length > PERSON_NAME_MAX_LENGTH)
      errors.legalName = `Full name cannot be more than ${PERSON_NAME_MAX_LENGTH} characters`;
    else if (!PERSON_NAME_REGEX.test(kycForm.legalName.trim()))
      errors.legalName = "Legal name can contain only letters, spaces, dot, apostrophe, or hyphen";
    if (!kycForm.mobileNumber.trim()) {
      errors.mobileNumber = "Mobile number is required";
    } else if (!/^[0-9]{10,15}$/.test(kycForm.mobileNumber.trim())) {
      errors.mobileNumber = "Mobile number must be 10 to 15 digits";
    }
    if (!kycForm.emailAddress.trim()) {
      errors.emailAddress = "Email address is required";
    } else if (!EMAIL_REGEX.test(kycForm.emailAddress.trim())) {
      errors.emailAddress = "Email address is invalid";
    }
    if (!dateOfBirth) {
      errors.dateOfBirth = "Date of birth is required";
    } else if (dateOfBirth > MAX_DOB_FOR_SELLER) {
      errors.dateOfBirth = "Seller must be at least 18 years old";
    }
    if (!kycForm.panNumber.trim()) {
      errors.panNumber = "PAN number is required";
    } else if (!/^[A-Z0-9]{10}$/.test(kycForm.panNumber.trim())) {
      errors.panNumber = "PAN must be 10 letters/numbers without spaces";
    } else if (!PAN_REGEX.test(kycForm.panNumber.trim())) {
      errors.panNumber = "PAN format should be like ABCDE1234F";
    }
    if (!kycForm.panDocumentFile && !documentUrls.panDocumentUrl)
      errors.panDocumentFile = "PAN document is required";
    if (!kycForm.aadhaarNumber.trim()) {
      errors.aadhaarNumber = "Aadhaar number is required";
    } else if (!AADHAAR_REGEX.test(kycForm.aadhaarNumber.trim())) {
      errors.aadhaarNumber = "Aadhaar must be 12 digits (12341048002615)";
    }
    if (!kycForm.aadhaarFrontFile && !documentUrls.aadhaarFrontUrl)
      errors.aadhaarFrontFile = "Aadhaar front image is required";
    if (!kycForm.aadhaarBackFile && !documentUrls.aadhaarBackUrl)
      errors.aadhaarBackFile = "Aadhaar back image is required";
    if (fieldName) {
      setKycErrors((prev) => ({
        ...prev,
        [fieldName]: errors[fieldName] || null,
      }));
      return !errors[fieldName];
    }
    setKycErrors(errors);
    if (Object.keys(errors).length > 0) {
      scrollToFirstValidationError(errors);
    }
    return Object.keys(errors).length === 0;
  };

  const getDocumentUploadValue = async (file, existingUrl) =>
    file instanceof File || file instanceof Blob
      ? readFileAsUploadPayload(file)
      : existingUrl || null;

  const buildKycPayload = async ({
    includeGstCertificate = false,
    includeBusinessType = false,
  } = {}) => ({
    panNumber: kycForm.panNumber.trim(),
    aadhaarNumber: kycForm.aadhaarNumber.trim(),
    legalName: kycForm.legalName.trim(),
    ...(includeBusinessType && profileForm.businessType
      ? { businessType: profileForm.businessType }
      : {}),
    dateOfBirth: toDateInputValue(kycForm.dateOfBirth),
    documents: {
      panDocumentUrl: await getDocumentUploadValue(
        kycForm.panDocumentFile,
        documentUrls.panDocumentUrl,
      ),
      ...(includeGstCertificate
        ? {
          gstCertificateUrl: await getDocumentUploadValue(
            profileForm.gstCertificateFile,
            documentUrls.gstCertificateUrl,
          ),
        }
        : {}),
      aadhaarFrontUrl: await getDocumentUploadValue(
        kycForm.aadhaarFrontFile,
        documentUrls.aadhaarFrontUrl,
      ),
      aadhaarBackUrl: await getDocumentUploadValue(
        kycForm.aadhaarBackFile,
        documentUrls.aadhaarBackUrl,
      ),
      addressProofUrl: await getDocumentUploadValue(
        kycForm.addressProofFile,
        documentUrls.addressProofUrl,
      ),
      udyogAadhaarDocumentUrl: await getDocumentUploadValue(
        profileForm.udyogAadhaarDocumentFile,
        documentUrls.udyogAadhaarDocumentUrl,
      ),
      bankProofUrl: await getDocumentUploadValue(
        kycForm.bankProofFile,
        documentUrls.bankProofUrl,
      ),
    },
  });

  const buildProfilePayload = ({ includeBankDetails = false } = {}) => {
    const legalBusinessName = profileForm.businessName.trim();
    const payload = {
      businessName: legalBusinessName,
      displayName: legalBusinessName,
      legalBusinessName,
      description: profileForm.description.trim(),
      supportEmail: profileForm.supportEmail.trim(),
      supportPhone: profileForm.supportPhone.trim(),
      businessType: profileForm.businessType,
      gstNumber: profileForm.gstNumber.trim(),
      businessWebsite: profileForm.businessWebsite.trim(),
      metadata: {
        udyogAadhaarNumber: getUdyogAadhaarPayloadValue(profileForm.udyogAadhaarNumber),
      },
      businessAddress: {
        line1: profileForm.businessAddressLine1.trim(),
        line2: profileForm.businessAddressLine2.trim(),
        city: profileForm.businessAddressCity.trim(),
        state: profileForm.businessAddressState.trim(),
        country: profileForm.businessAddressCountry.trim() || "India",
        postalCode: profileForm.businessAddressPostalCode.trim(),
      },
      pickupAddress: {
        line1: profileForm.pickupLine1.trim(),
        line2: profileForm.pickupLine2.trim(),
        city: profileForm.pickupCity.trim(),
        state: profileForm.pickupState.trim(),
        country: profileForm.pickupCountry.trim() || "India",
        postalCode: profileForm.pickupPostalCode.trim(),
      },
      // billingAddress: use business address when filled, otherwise fall back to pickup address
      billingAddress: {
        line1: (profileForm.businessAddressLine1 || profileForm.pickupLine1).trim(),
        line2: (profileForm.businessAddressLine2 || profileForm.pickupLine2).trim(),
        city: (profileForm.businessAddressCity || profileForm.pickupCity).trim(),
        state: (profileForm.businessAddressState || profileForm.pickupState).trim(),
        country: (profileForm.businessAddressCountry || profileForm.pickupCountry || "India").trim(),
        postalCode: (profileForm.businessAddressPostalCode || profileForm.pickupPostalCode).trim(),
      },
    };

    if (kycForm.panNumber.trim()) payload.panNumber = kycForm.panNumber.trim();
    if (kycForm.aadhaarNumber.trim()) {
      payload.aadhaarNumber = kycForm.aadhaarNumber.trim();
    }
    if (toDateInputValue(kycForm.dateOfBirth)) {
      payload.dateOfBirth = toDateInputValue(kycForm.dateOfBirth);
    }
    if (includeBankDetails) {
      payload.bankDetails = {
        accountHolderName: bankForm.accountHolderName.trim(),
        accountNumber: bankForm.accountNumber.trim(),
        ifscCode: bankForm.ifscCode.trim(),
        bankName: bankForm.bankName.trim(),
        branchName: bankForm.branchName.trim(),
      };
    }

    return payload;
  };

  const buildOrganizationPayload = async () => {
    const legalBusinessName = profileForm.businessName.trim();
    const billingAddress = {
      line1: (profileForm.businessAddressLine1 || profileForm.pickupLine1).trim(),
      line2: (profileForm.businessAddressLine2 || profileForm.pickupLine2).trim(),
      city: (profileForm.businessAddressCity || profileForm.pickupCity).trim(),
      state: (profileForm.businessAddressState || profileForm.pickupState).trim(),
      country: (profileForm.businessAddressCountry || profileForm.pickupCountry || "India").trim(),
      postalCode: (profileForm.businessAddressPostalCode || profileForm.pickupPostalCode).trim(),
    };
    const pickupAddress = {
      line1: profileForm.pickupLine1.trim(),
      line2: profileForm.pickupLine2.trim(),
      city: profileForm.pickupCity.trim(),
      state: profileForm.pickupState.trim(),
      country: profileForm.pickupCountry.trim() || "India",
      postalCode: profileForm.pickupPostalCode.trim(),
    };

    return {
      legalBusinessName,
      storeDisplayName: legalBusinessName,
      businessType: profileForm.businessType,
      description: profileForm.description.trim() || null,
      supportEmail: profileForm.supportEmail.trim(),
      supportPhone: profileForm.supportPhone.trim(),
      gstin: profileForm.gstNumber.trim(),
      pan: kycForm.panNumber.trim(),
      aadhaarNumber: kycForm.aadhaarNumber.trim(),
      dateOfBirth: toDateInputValue(kycForm.dateOfBirth),
      businessWebsite: profileForm.businessWebsite.trim() || null,
      documents: {
        panDocumentUrl: await getDocumentUploadValue(
          kycForm.panDocumentFile,
          documentUrls.panDocumentUrl,
        ),
        gstCertificateUrl: await getDocumentUploadValue(
          profileForm.gstCertificateFile,
          documentUrls.gstCertificateUrl,
        ),
        aadhaarFrontUrl: await getDocumentUploadValue(
          kycForm.aadhaarFrontFile,
          documentUrls.aadhaarFrontUrl,
        ),
        aadhaarBackUrl: await getDocumentUploadValue(
          kycForm.aadhaarBackFile,
          documentUrls.aadhaarBackUrl,
        ),
        addressProofUrl: await getDocumentUploadValue(
          kycForm.addressProofFile,
          documentUrls.addressProofUrl,
        ),
        udyogAadhaarDocumentUrl: await getDocumentUploadValue(
          profileForm.udyogAadhaarDocumentFile,
          documentUrls.udyogAadhaarDocumentUrl,
        ),
        bankProofUrl: await getDocumentUploadValue(
          kycForm.bankProofFile,
          documentUrls.bankProofUrl,
        ),
      },
      metadata: {
        udyogAadhaarNumber: getUdyogAadhaarPayloadValue(profileForm.udyogAadhaarNumber),
      },
      bankDetails: {
        accountHolderName: bankForm.accountHolderName.trim(),
        accountNumber: bankForm.accountNumber.trim(),
        ifscCode: bankForm.ifscCode.trim().toUpperCase(),
        bankName: bankForm.bankName.trim(),
        branchName: bankForm.branchName.trim(),
      },
      billingAddress,
      businessAddress: billingAddress,
      pickupAddress,
      returnAddress: pickupAddress,
      taxSettings: {
        gstin: profileForm.gstNumber.trim(),
        pan: kycForm.panNumber.trim(),
        state: billingAddress.state || pickupAddress.state,
      },
      invoiceSettings: {
        invoicePrefix: "INV",
        state: billingAddress.state || pickupAddress.state,
      },
      payoutSettings: {
        payoutSchedule: "weekly",
      },
    };
  };

  const saveOrganizationFromOnboarding = async () => {
    if (!accessToken) return null;
    const payload = await buildOrganizationPayload();
    let organizationId =
      getOrganizationId(targetOrganization) ||
      organizationIdParam ||
      flowState?.onboardingTargetOrganizationId ||
      flowState?.organization?.id ||
      flowState?.organization?.organizationId ||
      "";

    if (!organizationId) {
      const organizationResponse = await apiRequest(
        "GET",
        ENDPOINTS.sellers.myOrganizations,
        { limit: 100 },
      ).catch(() => null);
      const onboardingOrganization = pickOnboardingOrganization(
        unwrapOrganizationList(organizationResponse),
        organizationIdParam,
      );
      organizationId = getOrganizationId(onboardingOrganization);
    }

    const response = organizationId
      ? await apiRequest(
        "PATCH",
        ENDPOINTS.sellers.myOrganization(organizationId),
        payload,
      )
      : await apiRequest("POST", ENDPOINTS.sellers.myOrganizations, payload);
    const organization = response?.data?.data || response?.data || response;
    if (organization?.id || organization?.organizationId) {
      setTargetOrganization(organization);
    }
    return organization;
  };

  const validateProfile = (fieldName) => {
    const errors = {};
    if (!profileForm.businessType.trim())
      errors.businessType = "Business type is required";
    if (!profileForm.businessName.trim())
      errors.businessName = "Legal business name is required";
    else if (profileForm.businessName.trim().length > BUSINESS_NAME_MAX_LENGTH)
      errors.businessName = `Legal business name cannot be more than ${BUSINESS_NAME_MAX_LENGTH} characters`;
    else if (!BUSINESS_NAME_REGEX.test(profileForm.businessName.trim()))
      errors.businessName = "Legal business name contains invalid characters";
if (!profileForm.description.trim()) {
  errors.description = "Description is required";
} else if (profileForm.description.trim().length < 10) {
  errors.description = "Description must be at least 10 characters long";
}
    if (!profileForm.gstNumber.trim())
      errors.gstNumber = "GST number is required";
    else if (!GST_REGEX.test(profileForm.gstNumber.trim()))
      errors.gstNumber = "GST number format should be like 27ABCDE1234F1Z2";
    if (!profileForm.gstCertificateFile && !documentUrls.gstCertificateUrl)
      errors.gstCertificateFile = "GST certificate is required";

    if (!kycForm.addressProofFile && !documentUrls.addressProofUrl)
      errors.addressProofFile = "Address proof document is required";
    if (!profileForm.supportEmail.trim())
      errors.supportEmail = "Business official email is required";
    else if (!EMAIL_REGEX.test(profileForm.supportEmail.trim()))
      errors.supportEmail = "Business official email is invalid";
    if (!profileForm.supportPhone.trim())
      errors.supportPhone = "Business phone number is required";
    else if (!/^[0-9]{10,15}$/.test(profileForm.supportPhone.trim()))
      errors.supportPhone = "Business phone number must be 10 digits";
    if (
      !isBlankUdyogAadhaarNumber(profileForm.udyogAadhaarNumber) &&
      !UDYOG_AADHAAR_REGEX.test(profileForm.udyogAadhaarNumber.trim())
    )
      errors.udyogAadhaarNumber =
        "Udhyog Aadhaar number should start with UDYAM-";
    if (
      profileForm.businessWebsite.trim() &&
      !URL_REGEX.test(profileForm.businessWebsite.trim())
    )
      errors.businessWebsite = "Website must start with http:// or https://";
    if (!profileForm.pickupLine1.trim())
      errors.pickupLine1 = "Pickup address line 1 is required";
    else if (profileForm.pickupLine1.trim().length < 5)
      errors.pickupLine1 = "Pickup address line 1 must be at least 5 characters";

    if (!profileForm.pickupCountry.trim())
      errors.pickupCountry = "Pickup country is required";
    if (!profileForm.pickupCity.trim())
      errors.pickupCity = "Pickup city is required";
    if (!profileForm.pickupState.trim())
      errors.pickupState = "Pickup state is required";
    if (!profileForm.pickupPostalCode.trim())
      errors.pickupPostalCode = "Pickup postal code is required";
    else if (
      profileForm.pickupPostalCode.trim().length < 5 ||
      profileForm.pickupPostalCode.trim().length > 10
    )
      errors.pickupPostalCode = "Pickup postal code must be 5 to 10 characters";
    if (!profileForm.businessAddressLine1.trim())
      errors.businessAddressLine1 = "Business address line 1 is required";
    else if (profileForm.businessAddressLine1.trim().length < 5)
      errors.businessAddressLine1 = "Business address line 1 must be at least 5 characters";

    if (!profileForm.businessAddressCountry.trim())
      errors.businessAddressCountry = "Business country is required";
    if (!profileForm.businessAddressState.trim())
      errors.businessAddressState = "Business state is required";
    if (!profileForm.businessAddressCity.trim())
      errors.businessAddressCity = "Business city is required";
    if (!profileForm.businessAddressPostalCode.trim()) {
      errors.businessAddressPostalCode = "Business postal code is required";
    } else if (
      profileForm.businessAddressPostalCode.trim().length < 5 ||
      profileForm.businessAddressPostalCode.trim().length > 10
    ) {
      errors.businessAddressPostalCode =
        "Business postal code must be 5 to 10 characters";
    }
    if (fieldName) {
      setProfileErrors((prev) => ({
        ...prev,
        [fieldName]: errors[fieldName] || null,
      }));
      return !errors[fieldName];
    }
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) {
      scrollToFirstValidationError(errors);
    }
    return Object.keys(errors).length === 0;
  };

  const submitKycStep = async (event) => {
    event.preventDefault();
    if (!validateKyc()) return;
    try {
      setPageLoading(true);
      const kycPayload = await buildKycPayload();
      const kycResponse = await dispatch(submitSellerKyc(kycPayload)).unwrap();
      const uploadedDocuments = unwrapKycDocuments(kycResponse);
      if (Object.keys(uploadedDocuments).length) {
        setDocumentUrls((prev) => ({ ...prev, ...uploadedDocuments }));
      }
      setKycSubmittedApi(true);
      setRequiresKycRefresh(false);
      setProfileForm((prev) => ({
        ...prev,
        gstNumber: prev.gstNumber || kycForm.gstNumber,
      }));
      await dispatch(fetchAuthStatus({ token: onboardingToken })).unwrap();
      setStep(2);
    } catch (error) {
      const parsed = parseApiError(error, "Unable to submit KYC details");
      setBackendFieldErrors(parsed.details, setKycErrors);
      toast.error(parsed.message);
    } finally {
      setPageLoading(false);
    }
  };

  const submitBusinessStep = async (event) => {
    event.preventDefault();
    if (!validateProfile()) {
      setStep(2);
      return;
    }
    try {
      setPageLoading(true);
      const kycPayload = await buildKycPayload({
        includeGstCertificate: true,
        includeBusinessType: true,
      });
      const kycResponse = await dispatch(submitSellerKyc(kycPayload)).unwrap();
      const uploadedDocuments = unwrapKycDocuments(kycResponse);
      if (Object.keys(uploadedDocuments).length) {
        setDocumentUrls((prev) => ({ ...prev, ...uploadedDocuments }));
      }
      setKycSubmittedApi(true);
      setRequiresKycRefresh(false);
      await dispatch(
        updateSellerOnboardingProfile(buildProfilePayload()),
      ).unwrap();
      await dispatch(fetchAuthStatus({ token: onboardingToken })).unwrap();
      setStep(3);
    } catch (error) {
      const parsed = parseApiError(error, "Unable to save business details");
      const kycDetails = (parsed.details || []).filter((detail) =>
        ["panNumber", "aadhaarNumber", "legalName"].includes(getBackendDetailField(detail)),
      );
      const profileDetails = (parsed.details || []).filter((detail) =>
        !["panNumber", "aadhaarNumber", "legalName"].includes(getBackendDetailField(detail)),
      );
      if (kycDetails.length) setBackendFieldErrors(kycDetails, setKycErrors);
      if (profileDetails.length) setBackendFieldErrors(profileDetails, setProfileErrors);
      setStep(profileDetails.length ? 2 : 1);
      toast.error(parsed.message);
    } finally {
      setPageLoading(false);
    }
  };

  const validateBankDetails = (fieldName) => {
    const errors = {};
    if (!bankForm.accountHolderName.trim())
      errors.accountHolderName = "Account holder name is required";
    else if (bankForm.accountHolderName.trim().length > PERSON_NAME_MAX_LENGTH)
      errors.accountHolderName = `Account holder name cannot be more than ${PERSON_NAME_MAX_LENGTH} characters`;
    else if (!PERSON_NAME_REGEX.test(bankForm.accountHolderName.trim()))
      errors.accountHolderName = "Account holder name can contain only letters and spaces";
    if (!bankForm.accountNumber.trim()) {
      errors.accountNumber = "Account number is required";
    } else if (!BANK_ACCOUNT_REGEX.test(bankForm.accountNumber.trim())) {
      errors.accountNumber = "Account number must be 9 to 18 digits";
    }
    if (!bankForm.ifscCode.trim()) {
      errors.ifscCode = "IFSC code is required";
    } else if (!IFSC_REGEX.test(bankForm.ifscCode.trim())) {
      errors.ifscCode = "IFSC code must be 11 letters or digits";
    }
    if (!bankForm.bankName.trim()) {
      errors.bankName = "Bank name is required";
    } else if (bankForm.bankName.trim().length < BANK_NAME_MIN_LENGTH) {
      errors.bankName = `Bank name must be at least ${BANK_NAME_MIN_LENGTH} characters`;
    } else if (!BANK_NAME_REGEX.test(bankForm.bankName.trim())) {
      errors.bankName = "Bank name can contain only letters and spaces";
    }
    if (!bankForm.branchName.trim())
      errors.branchName = "Branch name is required";
    else if (!BRANCH_NAME_REGEX.test(bankForm.branchName.trim()))
      errors.branchName = "Branch name can contain only letters, numbers, spaces, and basic punctuation";
    if (!kycForm.bankProofFile && !documentUrls.bankProofUrl)
      errors.bankProofFile = "Bank proof document is required";
    if (fieldName) {
      setProfileErrors((prev) => ({
        ...prev,
        [fieldName]: errors[fieldName] || null,
      }));
      return !errors[fieldName];
    }
    if (Object.keys(errors).length > 0) {
      setProfileErrors((prev) => ({ ...prev, ...errors }));
      scrollToFirstValidationError(errors);
      return false;
    }
    return true;
  };

  const submitBankStep = async (event) => {
    event.preventDefault();
    if (!validateBankDetails()) return;
    try {
      setPageLoading(true);
      const payload = buildProfilePayload({ includeBankDetails: true });
      await dispatch(updateSellerOnboardingProfile(payload)).unwrap();
      await dispatch(fetchAuthStatus({ token: onboardingToken })).unwrap();
      setStep(4);
    } catch (error) {
      const parsed = parseApiError(error, "Unable to save bank details");
      setBackendFieldErrors(parsed.details, setProfileErrors);

      const hasGstFieldError = (parsed.details || []).some(
        (d) => getBackendDetailField(d) === "gstNumber",
      );
      const isGstinConflictMessage =
        !parsed.details?.length &&
        /gstin|gst/i.test(parsed.message) &&
        /linked|already|duplicate/i.test(parsed.message);

      if (hasGstFieldError || isGstinConflictMessage) {
        if (isGstinConflictMessage) {
          setProfileErrors((prev) => ({ ...prev, gstNumber: parsed.message }));
        }
        setStep(2);
        setTimeout(() => {
          gstNumberRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          gstNumberRef.current?.focus();
        }, 150);
      }

      toast.error(parsed.message);
    } finally {
      setPageLoading(false);
    }
  };

  const submitFinalOnboarding = async () => {
    if (!kycSubmittedApi && !validateKyc()) {
      setStep(1);
      return;
    }
    if (!validateProfile()) {
      setStep(2);
      return;
    }
    if (!validateBankDetails()) {
      setStep(3);
      return;
    }
    const shouldSubmitKyc =
      !kycSubmittedApi ||
      Boolean(profileForm.gstCertificateFile) ||
      Boolean(profileForm.udyogAadhaarDocumentFile) ||
      Boolean(kycForm.bankProofFile) ||
      Boolean(kycForm.addressProofFile);
    try {
      setPageLoading(true);
      if (shouldSubmitKyc) {
        const kycPayload = await buildKycPayload({
          includeGstCertificate: true,
        });
        const kycResponse = await dispatch(submitSellerKyc(kycPayload)).unwrap();
        const uploadedDocuments = unwrapKycDocuments(kycResponse);
        if (Object.keys(uploadedDocuments).length) {
          setDocumentUrls((prev) => ({ ...prev, ...uploadedDocuments }));
        }
        setKycSubmittedApi(true);
        setRequiresKycRefresh(false);
      }
      const payload = buildProfilePayload({ includeBankDetails: true });
      await dispatch(updateSellerOnboardingProfile(payload)).unwrap();
      await saveOrganizationFromOnboarding();
      await dispatch(fetchAuthStatus({ token: onboardingToken })).unwrap();
      localStorage.removeItem(draftKey);
      setStep(5);
      toast.success("Onboarding submitted for approval");
      navigate(AUTH_ROUTES.ONBOARDING_COMPLETE, { replace: true });
    } catch (error) {
      const parsed = parseApiError(error, "Unable to submit business profile");
      const kycDetails = (parsed.details || []).filter((detail) =>
        ["panNumber", "aadhaarNumber", "legalName"].includes(getBackendDetailField(detail)),
      );
      const profileDetails = (parsed.details || []).filter((detail) =>
        !["panNumber", "aadhaarNumber", "legalName"].includes(getBackendDetailField(detail)),
      );
      if (kycDetails.length) setBackendFieldErrors(kycDetails, setKycErrors);
      if (profileDetails.length) setBackendFieldErrors(profileDetails, setProfileErrors);

      const hasGstFieldError = profileDetails.some(
        (d) => getBackendDetailField(d) === "gstNumber",
      );
      const isGstinConflictMessage =
        !parsed.details?.length &&
        /gstin|gst/i.test(parsed.message) &&
        /linked|already|duplicate|exist/i.test(parsed.message);

      if (isGstinConflictMessage) {
        setProfileErrors((prev) => ({ ...prev, gstNumber: parsed.message }));
      }

      const shouldGoToBusinessStep =
        profileDetails.length > 0 || hasGstFieldError || isGstinConflictMessage;
      setStep(shouldGoToBusinessStep ? 2 : 1);

      if (hasGstFieldError || isGstinConflictMessage) {
        setTimeout(() => {
          gstNumberRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          gstNumberRef.current?.focus();
        }, 150);
      }

      toast.error(parsed.message);
    } finally {
      setPageLoading(false);
    }
  };

  if (step === 5) {
    return <Navigate to={getSellerStatusRoute(flowState)} replace />;
  }

  return (
    <>
      <BankProofGuidanceModal
        open={showBankProofGuidance}
        onClose={() => setShowBankProofGuidance(false)}
      />
      <div className="relative min-h-[calc(100vh-96px)]">
        <OnboardingPageLoader visible={isOnboardingLoading} />
        <OnboardingScreen step={step}>
      {step === 0 && (
        <div className={ONBOARDING_CARD_CLASS}>
          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            onClick={() => setStep(1)}
          >
            Start KYC Verification
          </button>
        </div>
      )}

      {step === 1 && (
        <form
          onSubmit={submitKycStep}
          onBlurCapture={(event) => {
            if (event.target.name) validateKyc(event.target.name);
          }}
          className={ONBOARDING_CARD_CLASS}
        >
          <OnboardingSection number="01" title="Personal Information">
            <div className="grid w-full grid-cols-1 gap-x-5 gap-y-6   md:grid-cols-2">
              {/* Full Name */}
              <div>
                <label className="text-[#484555] font-medium font-inter text-base">
                  Full Name
                </label>
                <input
                  id="legalName"
                  name="legalName"
                  placeholder="e.g. John Doe"
                  className={STEP_ONE_INPUT_CLASS}
                  value={kycForm.legalName}
                  onChange={onKycChange}
                  maxLength={PERSON_NAME_MAX_LENGTH}
                  data-has-value={Boolean(kycForm.legalName)}
                />
                {kycErrors.legalName && (
                  <p className={ERROR_CLASS}>{kycErrors.legalName}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <div className="relative">
                  <label className="text-[#484555] font-medium font-inter text-base">
                    Date of Birth
                  </label>
                  <div
                    className={`${DATE_FIELD_CLASS} flex items-center justify-between gap-3 ${kycForm.dateOfBirth ? "text-[#111827]" : "text-[#9a96a6]"
                      }`}
                    data-has-value={Boolean(kycForm.dateOfBirth)}
                    onClick={openDatePicker}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDatePicker();
                      }
                    }}
                  >
                    <span>
                      {kycForm.dateOfBirth
                        ? formatDateForDisplay(kycForm.dateOfBirth)
                        : "mm/dd/yyyy"}
                    </span>
                    <button
                      type="button"
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[#082f91] transition hover:bg-[#eef2ff]"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDatePicker();
                      }}
                      aria-label="Open date picker"
                    >
                      <FaCalendarAlt className="shrink-0 text-[18px]" />
                    </button>
                  </div>
                  <input
                    ref={dateOfBirthRef}
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    className="pointer-events-none absolute inset-0 h-[40px] w-full opacity-0"
                    value={toDateInputValue(kycForm.dateOfBirth)}
                    max={MAX_DOB_DATE}
                    onChange={onKycChange}
                    aria-label="Date of Birth"
                  />
                </div>
                {kycErrors.dateOfBirth && (
                  <p className={ERROR_CLASS}>{kycErrors.dateOfBirth}</p>
                )}
              </div>

              <div>
                <label className="text-[#484555] font-medium font-inter text-base">
                  Mobile Number
                </label>
                <input
                  id="mobileNumber"
                  name="mobileNumber"
                  type="tel"
                  className={`${STEP_ONE_INPUT_CLASS} bg-[#f5f1eb]`}
                  value={kycForm.mobileNumber}
                  readOnly
                  aria-readonly="true"
                  data-has-value={Boolean(kycForm.mobileNumber)}
                />
                {kycErrors.mobileNumber && (
                  <p className={ERROR_CLASS}>{kycErrors.mobileNumber}</p>
                )}
              </div>

              <div>
                <label className="text-[#484555] font-medium font-inter text-base">
                  Email Address
                </label>
                <input
                  id="emailAddress"
                  name="emailAddress"
                  type="email"
                  className={`${STEP_ONE_INPUT_CLASS} bg-[#f5f1eb]`}
                  value={kycForm.emailAddress}
                  readOnly
                  aria-readonly="true"
                  data-has-value={Boolean(kycForm.emailAddress)}
                />
                {kycErrors.emailAddress && (
                  <p className={ERROR_CLASS}>{kycErrors.emailAddress}</p>
                )}
              </div>
            </div>
          </OnboardingSection>

          <OnboardingSection number="02" title="Identity Number">
            <div className="mt-8 grid w-full grid-cols-1 gap-x-5 gap-y-6 md:grid-cols-2">
              {/* PAN Number */}
              <div>
                <label className="text-[#484555] font-medium font-inter text-base">
                  PAN Number
                </label>
                <input
                  id="panNumber"
                  name="panNumber"
                  placeholder="ABCDE1122F"
                  className={STEP_ONE_INPUT_CLASS}
                  value={kycForm.panNumber}
                  onChange={onKycChange}
                  maxLength={10}
                  pattern="[A-Za-z0-9]{10}"
                  data-has-value={Boolean(kycForm.panNumber)}
                />
                {kycErrors.panNumber && (
                  <p className={ERROR_CLASS}>{kycErrors.panNumber}</p>
                )}
              </div>

              {/* Aadhaar Number */}
              <div>
                <label className="text-[#484555] font-medium font-inter text-base">
                  Aadhaar Number
                </label>
                <input
                  id="aadhaarNumber"
                  name="aadhaarNumber"
                  placeholder="1234 4567 8910"
                  className={STEP_ONE_INPUT_CLASS}
                  value={kycForm.aadhaarNumber}
                  onChange={onKycChange}
                  inputMode="numeric"
                  pattern="[0-9]{12}"
                  maxLength={12}
                  data-has-value={Boolean(kycForm.aadhaarNumber)}
                />
                {kycErrors.aadhaarNumber && (
                  <p className={ERROR_CLASS}>{kycErrors.aadhaarNumber}</p>
                )}
              </div>
            </div>
          </OnboardingSection>

          <OnboardingSection number="03" title="Identity Documents">
            <div className="mt-8 grid w-full grid-cols-1 gap-x-5 gap-y-6 md:grid-cols-2">
              <DocumentUploadField
                id="aadhaarFrontFile"
                label="Upload Aadhaar Front Image"
                required
                file={kycForm.aadhaarFrontFile}
                existingUrl={documentUrls.aadhaarFrontUrl}
                error={kycErrors.aadhaarFrontFile}
                accept={KYC_IMAGE_ACCEPT}
                onDrop={onKycDocumentDrop("aadhaarFrontFile")}
                onChange={onKycDocumentFileChange("aadhaarFrontFile")}
                emptyText="Drag Aadhaar front image here"
              />

              <DocumentUploadField
                id="aadhaarBackFile"
                label="Upload Aadhaar Back Image"
                required
                file={kycForm.aadhaarBackFile}
                existingUrl={documentUrls.aadhaarBackUrl}
                error={kycErrors.aadhaarBackFile}
                accept={KYC_IMAGE_ACCEPT}
                onDrop={onKycDocumentDrop("aadhaarBackFile")}
                onChange={onKycDocumentFileChange("aadhaarBackFile")}
                emptyText="Drag Aadhaar back image here"
              />

              <div className="md:col-span-2">
                <DocumentUploadField
                  id="panDocumentFile"
                  label="Upload PAN Document"
                  required
                  file={kycForm.panDocumentFile}
                  existingUrl={documentUrls.panDocumentUrl}
                  error={kycErrors.panDocumentFile}
                  accept={KYC_DOCUMENT_ACCEPT}
                  onDrop={onKycDocumentDrop("panDocumentFile")}
                  onChange={onKycDocumentFileChange("panDocumentFile")}
                  emptyText="Drag PAN file here"
                />
              </div>
            </div>
          </OnboardingSection>

          <OnboardingActions>
            <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-start sm:gap-4">
              <button
                disabled={isOnboardingLoading}
                className={PRIMARY_BUTTON_CLASS}
                type="submit"
              >
                {isOnboardingLoading ? "Submitting..." : "Continue to Business Details"}
              </button>
            </div>
          </OnboardingActions>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={submitBusinessStep}
          noValidate
          onBlurCapture={(event) => {
            if (event.target.name) validateProfile(event.target.name);
          }}
          className={ONBOARDING_CARD_CLASS}
        >
          <OnboardingSection number="01" title="Business Details">
            <div className="grid w-full grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <div>
                <OnboardingSelect
                  name="businessType"
                  label="Business Type"
                  value={profileForm.businessType}
                  options={businessTypes.options}
                  onChange={onProfileChange}
                  loading={businessTypes.loading}
                  error={businessTypes.error}
                  required
                />
                {profileErrors.businessType && (
                  <p className={ERROR_CLASS}>{profileErrors.businessType}</p>
                )}
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Legal Business Name {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="businessName"
                  placeholder="Legal Business Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessName}
                  onChange={onProfileChange}
                  maxLength={BUSINESS_NAME_MAX_LENGTH}
                  required
                />
                {profileErrors.businessName && (
                  <p className={ERROR_CLASS}>{profileErrors.businessName}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  GST Number {STEP_ONE_REQUIRED}
                </label>
                <input
                  ref={gstNumberRef}
                  name="gstNumber"
                  placeholder="GST Number"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.gstNumber}
                  onChange={onProfileChange}
                  maxLength={15}
                  required
                />
                {profileErrors.gstNumber && (
                  <p className={ERROR_CLASS}>{profileErrors.gstNumber}</p>
                )}
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Business Official Email {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="supportEmail"
                  placeholder="Business official email"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.supportEmail}
                  onChange={onProfileChange}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={180}
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                  required
                />
                <p className="mt-1 text-[11px] text-[#8a93a5]">Used for organization support, invoices, and business communication. Login still uses your seller account email.</p>
                {profileErrors.supportEmail && (
                  <p className={ERROR_CLASS}>{profileErrors.supportEmail}</p>
                )}
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Business Phone Number {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="supportPhone"
                  placeholder="Business phone number"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.supportPhone}
                  onChange={onProfileChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  required
                />
                {profileErrors.supportPhone && (
                  <p className={ERROR_CLASS}>{profileErrors.supportPhone}</p>
                )}
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Udhyog Aadhaar Number
                </label>
                <input
                  name="udyogAadhaarNumber"
                  placeholder="UDYAM-XX-00-0000000"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.udyogAadhaarNumber}
                  onChange={onProfileChange}
                  maxLength={32}
                />
                {profileErrors.udyogAadhaarNumber && (
                  <p className={ERROR_CLASS}>{profileErrors.udyogAadhaarNumber}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Business Website (Optional)
                </label>
                <input
                  name="businessWebsite"
                  placeholder="https://example.com"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessWebsite}
                  onChange={onProfileChange}
                />
                {profileErrors.businessWebsite && (
                  <p className={ERROR_CLASS}>{profileErrors.businessWebsite}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Description {STEP_ONE_REQUIRED}
                </label>
                <textarea
                  name="description"
                  placeholder="Business Description"
                  className={`${STEP_ONE_INPUT_CLASS} mt-2 !h-auto !min-h-[96px] resize-y !pt-4 !pb-3 leading-5`}
                  value={profileForm.description}
                  onChange={onProfileChange}
                  required
                />
                {profileErrors.description && (
                  <p className={ERROR_CLASS}>{profileErrors.description}</p>
                )}
              </div>

              <OnboardingGridDivider number="02" title="Business Documents" />

              <div className="md:col-span-2">
                <DocumentUploadField
                  id="gstCertificateFile"
                  label="Upload GST Certificate"
                  required
                  file={profileForm.gstCertificateFile}
                  existingUrl={documentUrls.gstCertificateUrl}
                  error={profileErrors.gstCertificateFile}
                  accept={KYC_DOCUMENT_ACCEPT}
                  onDrop={onGstCertificateDrop}
                  onChange={onGstCertificateFileChange}
                  emptyText="Drag GST certificate here"
                />
              </div>

              <div className="md:col-span-2">
                <DocumentUploadField
                  id="addressProofFile"
                  label="Upload Address Proof"
                  required
                  file={kycForm.addressProofFile}
                  existingUrl={documentUrls.addressProofUrl}
                  error={profileErrors.addressProofFile}
                  accept={KYC_DOCUMENT_ACCEPT}
                  onDrop={onKycDocumentDrop("addressProofFile")}
                  onChange={onKycDocumentFileChange("addressProofFile")}
                  emptyText="Drag address proof here (utility bill, bank statement, etc.)"
                />
              </div>

              <div className="md:col-span-2">
                <DocumentUploadField
                  id="udyogAadhaarDocumentFile"
                  label="Upload Udhyog Aadhaar Document"
                  file={profileForm.udyogAadhaarDocumentFile}
                  existingUrl={documentUrls.udyogAadhaarDocumentUrl}
                  error={profileErrors.udyogAadhaarDocumentFile}
                  accept={KYC_DOCUMENT_ACCEPT}
                  onDrop={onUdyogAadhaarDocumentDrop}
                  onChange={onUdyogAadhaarDocumentFileChange}
                  emptyText="Drag Udhyog Aadhaar document here"
                />
              </div>

              <OnboardingGridDivider number="03" title="Business Address" />
              <div className="md:col-span-2">
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Business Address Line 1 {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="businessAddressLine1"
                  placeholder="Business Address Line 1"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessAddressLine1}
                  onChange={onProfileChange}
                  required
                />
                {profileErrors.businessAddressLine1 && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.businessAddressLine1}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Business Address Line 2
                </label>
                <input
                  name="businessAddressLine2"
                  placeholder="Business Address Line 2"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessAddressLine2}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <OnboardingSelect
                  name="businessAddressCountry"
                  label="Business Country"
                  value={profileForm.businessAddressCountry}
                  options={countries.options}
                  onChange={onAddressSelectChange("businessAddressCountry", [
                    "businessAddressState",
                    "businessAddressCity",
                    "businessAddressPostalCode",
                  ])}
                  loading={countries.loading}
                  error={countries.error}
                  disabled
                  required
                />
                {profileErrors.businessAddressCountry && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.businessAddressCountry}
                  </p>
                )}
              </div>

              <div>
                <OnboardingSelect
                  name="businessAddressState"
                  label="Business State"
                  value={profileForm.businessAddressState}
                  options={businessStates.options}
                  onChange={onAddressSelectChange("businessAddressState", [
                    "businessAddressCity",
                    "businessAddressPostalCode",
                  ])}
                  loading={businessStates.loading}
                  error={businessStates.error}
                  disabled={!businessCountryId}
                  required
                />
                {profileErrors.businessAddressState && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.businessAddressState}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Business City {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="businessAddressCity"
                  placeholder="Business City"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessAddressCity}
                  onChange={onProfileChange}
                  required
                />
                {profileErrors.businessAddressCity && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.businessAddressCity}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Business Postal Code {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="businessAddressPostalCode"
                  placeholder="Business Postal Code"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessAddressPostalCode}
                  onChange={onProfileChange}
                  maxLength={10}
                  required
                />
                {profileErrors.businessAddressPostalCode && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.businessAddressPostalCode}
                  </p>
                )}
              </div>

              <OnboardingGridDivider number="04" title="Pickup Address" />

              <div className="md:col-span-2">
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Pickup Address Line 1 {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="pickupLine1"
                  placeholder="Pickup Address Line 1"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.pickupLine1}
                  onChange={onProfileChange}
                  required
                />
                {profileErrors.pickupLine1 && (
                  <p className={ERROR_CLASS}>{profileErrors.pickupLine1}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Pickup Address Line 2
                </label>
                <input
                  name="pickupLine2"
                  placeholder="Pickup Address Line 2"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.pickupLine2}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <OnboardingSelect
                  name="pickupCountry"
                  label="Pickup Country"
                  value={profileForm.pickupCountry}
                  options={countries.options}
                  onChange={onAddressSelectChange("pickupCountry", [
                    "pickupState",
                    "pickupCity",
                    "pickupPostalCode",
                  ])}
                  loading={countries.loading}
                  error={countries.error}
                  disabled
                  required
                />
                {profileErrors.pickupCountry && (
                  <p className={ERROR_CLASS}>{profileErrors.pickupCountry}</p>
                )}
              </div>

              <div>
                <OnboardingSelect
                  name="pickupState"
                  label="Pickup State"
                  value={profileForm.pickupState}
                  options={pickupStates.options}
                  onChange={onAddressSelectChange("pickupState", [
                    "pickupCity",
                    "pickupPostalCode",
                  ])}
                  loading={pickupStates.loading}
                  error={pickupStates.error}
                  disabled={!pickupCountryId}
                  required
                />
                {profileErrors.pickupState && (
                  <p className={ERROR_CLASS}>{profileErrors.pickupState}</p>
                )}
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Pickup City {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="pickupCity"
                  placeholder="Pickup City"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.pickupCity}
                  onChange={onProfileChange}
                  required
                />
                {profileErrors.pickupCity && (
                  <p className={ERROR_CLASS}>{profileErrors.pickupCity}</p>
                )}
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Pickup Postal Code {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="pickupPostalCode"
                  placeholder="Pickup Postal Code"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.pickupPostalCode}
                  onChange={onProfileChange}
                  maxLength={10}
                  required
                />
                {profileErrors.pickupPostalCode && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.pickupPostalCode}
                  </p>
                )}
              </div>
            </div>
          </OnboardingSection>

          <OnboardingActions>
            <button
              className={SECONDARY_BUTTON_CLASS}
              type="button"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              disabled={isOnboardingLoading}
              className={PRIMARY_BUTTON_CLASS}
              type="submit"
            >
              Continue
            </button>
          </OnboardingActions>
        </form>
      )}

      {step === 3 && (
        <form
          onSubmit={submitBankStep}
          onBlurCapture={(event) => {
            if (event.target.name) validateBankDetails(event.target.name);
          }}
          className={ONBOARDING_CARD_CLASS}
        >
          <OnboardingSection number="01" title="Bank Information">
            {(flowState?.bankVerificationStatus === "rejected" ||
              flowState?.sellerProfile?.bankVerificationStatus ===
              "rejected") &&
              (flowState?.bankRejectionReason ||
                flowState?.sellerProfile?.bankRejectionReason) && (
                <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-semibold text-red-700">
                    Bank Rejection Reason
                  </p>
                  <p className="mt-1 text-sm text-red-600">
                    {flowState.bankRejectionReason ||
                      flowState.sellerProfile.bankRejectionReason}
                  </p>
                  <p className="mt-2 text-xs font-medium text-red-700">
                    Please update your bank details and submit again for review.
                  </p>
                </div>
              )}

            <div className="grid w-full grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Account Holder Name {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="accountHolderName"
                  placeholder="Account Holder Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={bankForm.accountHolderName}
                  onChange={onBankChange}
                  maxLength={PERSON_NAME_MAX_LENGTH}
                />
                {profileErrors.accountHolderName && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.accountHolderName}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Bank Name {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="bankName"
                  placeholder="Bank Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={bankForm.bankName}
                  onChange={onBankChange}
                  minLength={BANK_NAME_MIN_LENGTH}
                />
                {profileErrors.bankName && (
                  <p className={ERROR_CLASS}>{profileErrors.bankName}</p>
                )}
              </div>
              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Account Number {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="accountNumber"
                  placeholder="Account Number"
                  className={STEP_ONE_INPUT_CLASS}
                  value={bankForm.accountNumber}
                  onChange={onBankChange}
                />
                {profileErrors.accountNumber && (
                  <p className={ERROR_CLASS}>{profileErrors.accountNumber}</p>
                )}
              </div>
              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  IFSC Code {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="ifscCode"
                  placeholder="IFSC Code"
                  className={STEP_ONE_INPUT_CLASS}
                  value={bankForm.ifscCode}
                  onChange={onBankChange}
                />
                {profileErrors.ifscCode && (
                  <p className={ERROR_CLASS}>{profileErrors.ifscCode}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Branch Name {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="branchName"
                  placeholder="Branch Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={bankForm.branchName}
                  onChange={onBankChange}
                />
                {profileErrors.branchName && (
                  <p className={ERROR_CLASS}>{profileErrors.branchName}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <DocumentUploadField
                  id="bankProofFile"
                  label="Upload Bank Proof"
                  required
                  file={kycForm.bankProofFile}
                  existingUrl={documentUrls.bankProofUrl}
                  error={profileErrors.bankProofFile}
                  accept={KYC_DOCUMENT_ACCEPT}
                  onDrop={onKycDocumentDrop("bankProofFile")}
                  onChange={onKycDocumentFileChange("bankProofFile")}
                  emptyText="Drag bank statement or cancelled cheque here"
                  helpAction={
                    <button
                      type="button"
                      onClick={() => setShowBankProofGuidance(true)}
                      className="mt-3 inline-flex items-center gap-2 rounded-[6px] border border-[#e3d2ad] bg-[#fff8e6] px-3 py-2 text-xs font-semibold text-[#8a640f] transition hover:bg-[#fff1c7]"
                    >
                      <LuView size={14} />
                      Preview Cancelled Cheque
                    </button>
                  }
                />
              </div>
            </div>
          </OnboardingSection>

          <OnboardingActions>
            <button
              className={SECONDARY_BUTTON_CLASS}
              type="button"
              onClick={() => setStep(2)}
            >
              Back
            </button>
            <button
              disabled={isOnboardingLoading}
              className={PRIMARY_BUTTON_CLASS}
              type="submit"
            >
              Continue
            </button>
          </OnboardingActions>
        </form>
      )}

      {step === 4 && (
        <div className={ONBOARDING_CARD_CLASS}>
          <div className="space-y-8">
            <ReviewSection
              number="01"
              title="Personal / Owner Details"
              onEdit={() => setStep(1)}
            >
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                <ReviewInput label="Full Name" value={kycForm.legalName} />
                <ReviewInput
                  label="Email Address"
                  value={kycForm.emailAddress}
                />
                <ReviewInput
                  label="Mobile Number"
                  value={kycForm.mobileNumber}
                />
                <ReviewInput
                  label="Date of Birth"
                  value={formatDateForDisplay(kycForm.dateOfBirth)}
                />
                <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                  <ReviewInput
                    label="City"
                    value={
                      profileForm.businessAddressCity || profileForm.pickupCity
                    }
                  />
                  <ReviewInput
                    label="Zip Code"
                    value={
                      profileForm.businessAddressPostalCode ||
                      profileForm.pickupPostalCode
                    }
                  />
                </div>
                <ReviewFileInput
                  label="PAN Card Softcopy"
                  value={
                    kycForm.panDocumentFile?.name ||
                    getFileNameFromUrl(documentUrls.panDocumentUrl, "-")
                  }
                />
                <ReviewFileInput
                  label="Aadhaar Front Softcopy"
                  value={
                    kycForm.aadhaarFrontFile?.name ||
                    getFileNameFromUrl(documentUrls.aadhaarFrontUrl, "-")
                  }
                />
                <ReviewFileInput
                  label="Aadhaar Back Softcopy"
                  value={
                    kycForm.aadhaarBackFile?.name ||
                    getFileNameFromUrl(documentUrls.aadhaarBackUrl, "-")
                  }
                />
              </div>
            </ReviewSection>

            <ReviewSection
              number="02"
              title="Business Information"
              onEdit={() => setStep(2)}
            >
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                <ReviewInput label="Business Type" value={businessTypeLabel} />
                <ReviewInput
                  label="Legal Business Name"
                  value={profileForm.businessName}
                />
                <ReviewInput
                  label="Business PAN Number"
                  value={kycForm.panNumber}
                />
                <ReviewInput
                  label="Udyog Aadhaar Number"
                  value={profileForm.udyogAadhaarNumber}
                />
                <ReviewInput
                  label="Business Address"
                  value={[
                    profileForm.businessAddressLine1 || profileForm.pickupLine1,
                    profileForm.businessAddressLine2 || profileForm.pickupLine2,
                    profileForm.businessAddressCity || profileForm.pickupCity,
                    profileForm.businessAddressState || profileForm.pickupState,
                    profileForm.businessAddressPostalCode || profileForm.pickupPostalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
                <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                  <ReviewInput
                    label="Business Official Email"
                    value={profileForm.supportEmail}
                  />
                  <ReviewInput
                    label="Business Phone Number"
                    value={profileForm.supportPhone}
                  />
                </div>
                <ReviewInput
                  label="GST Number"
                  value={profileForm.gstNumber || kycForm.gstNumber}
                />
                <ReviewInput
                  label="Corporate Address"
                  value={[
                    profileForm.businessAddressLine1,
                    profileForm.businessAddressLine2,
                    profileForm.businessAddressCity,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
                <ReviewFileInput
                  label="PAN Card Softcopy"
                  value={
                    kycForm.panDocumentFile?.name ||
                    getFileNameFromUrl(documentUrls.panDocumentUrl, "-")
                  }
                />
                <ReviewFileInput
                  label="GST Certificate Softcopy"
                  value={
                    profileForm.gstCertificateFile?.name ||
                    getFileNameFromUrl(documentUrls.gstCertificateUrl, "-")
                  }
                />
                {(profileForm.udyogAadhaarDocumentFile?.name ||
                  documentUrls.udyogAadhaarDocumentUrl) && (
                  <ReviewFileInput
                    label="Udhyog Aadhaar Document"
                    value={
                      profileForm.udyogAadhaarDocumentFile?.name ||
                      getFileNameFromUrl(documentUrls.udyogAadhaarDocumentUrl, "-")
                    }
                  />
                )}
              </div>
            </ReviewSection>

            <ReviewSection
              number="03"
              title="Pickup Address"
              onEdit={() => setStep(2)}
            >
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                <ReviewInput
                  label="Pickup Address Line 1"
                  value={profileForm.pickupLine1}
                />
                <ReviewInput
                  label="Pickup Address Line 2"
                  value={profileForm.pickupLine2}
                />
                <ReviewInput label="Pickup City" value={profileForm.pickupCity} />
                <ReviewInput label="Pickup State" value={profileForm.pickupState} />
                <ReviewInput
                  label="Pickup Postal Code"
                  value={profileForm.pickupPostalCode}
                />
                <ReviewInput
                  label="Pickup Full Address"
                  value={[
                    profileForm.pickupLine1,
                    profileForm.pickupLine2,
                    profileForm.pickupCity,
                    profileForm.pickupState,
                    profileForm.pickupPostalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
              </div>
            </ReviewSection>

            <ReviewSection
              number="04"
              title="Bank Details"
              onEdit={() => setStep(3)}
            >
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                <ReviewInput
                  label="Account Holder Name"
                  value={bankForm.accountHolderName}
                />
                <ReviewInput label="Bank Name" value={bankForm.bankName} />
                <ReviewInput
                  label="Account Number"
                  value={bankForm.accountNumber}
                />
                <ReviewInput label="IFSC Code" value={bankForm.ifscCode} />
                <ReviewInput
                  label="Branch Name"
                  value={bankForm.branchName}
                  className="md:col-span-2"
                />
                <ReviewFileInput
                  label="Bank Proof / Cancelled Cheque"
                  value={
                    kycForm.bankProofFile?.name ||
                    getFileNameFromUrl(documentUrls.bankProofUrl, "-")
                  }
                  className="md:col-span-2"
                />
              </div>
            </ReviewSection>
          </div>

          <OnboardingActions>
            <button
              className={REVIEW_SECONDARY_BUTTON_CLASS}
              type="button"
              onClick={() => setStep(3)}
            >
              Back
            </button>
            <button
              disabled={isOnboardingLoading}
              className={REVIEW_PRIMARY_BUTTON_CLASS}
              type="button"
              onClick={submitFinalOnboarding}
            >
              {isOnboardingLoading ? "Submitting..." : "Submit For Verification"}
            </button>
          </OnboardingActions>
        </div>
      )}
        </OnboardingScreen>
      </div>
    </>
  );
};

export default SellerOnboarding;
