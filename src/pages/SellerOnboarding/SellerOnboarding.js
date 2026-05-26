import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, FileText, UploadCloud } from "lucide-react";
import { FaCalendarAlt } from "react-icons/fa";
import { BiSolidEdit } from "react-icons/bi";
import { LuClipboardList } from "react-icons/lu";
import {
  fetchAuthStatus,
  submitSellerKyc,
  updateSellerOnboardingProfile,
  markApprovalModalSeen,
} from "../../Redux/seller-slice";
import SellerVerificationModal, {
  getVerificationCase,
} from "../../components/Seller/SellerVerificationModal";
import { useKYC } from "../../context/KycContext";
import { apiRequest } from "../../_helpers/apiConfig";
import { ENDPOINTS } from "../../_helpers/endpoints";
import SellerStatusScreen from "../../components/StatusScreen/SellerStatusScreen";
import useDropdownOptions, { withSelectedOption } from "../../hooks/useDropdownOptions";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const BANK_ACCOUNT_REGEX = /^[0-9]{9,18}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/i;
const KYC_DOCUMENT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const KYC_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const MIN_SELLER_AGE = 18;

const ERROR_CLASS = "mt-1 text-xs text-red-600";
const STEP_ONE_INPUT_CLASS =
  "admin-input h-[46px] text-[14px] placeholder:text-[#8f8aa3]";
const DATE_FIELD_CLASS =
  "admin-input h-[46px] text-[14px] placeholder:text-[#8f8aa3]";
const STEP_ONE_REQUIRED = <span className="text-[#082f91]">*</span>;
const SECONDARY_BUTTON_CLASS =
  "admin-btn-secondary w-full min-w-[220px] text-[14px] sm:w-auto";
const PRIMARY_BUTTON_CLASS =
  "admin-btn-primary w-full text-[14px]";
const ONBOARDING_CARD_CLASS =
  "admin-card w-full px-5 py-4 sm:px-8 md:px-10";
const REVIEW_INPUT_CLASS =
  "admin-input h-[35px] text-[13px] placeholder:text-[13px] truncate";
const REVIEW_SECONDARY_BUTTON_CLASS =
  "admin-btn-secondary w-full text-[14px] sm:w-[260px]";
const REVIEW_PRIMARY_BUTTON_CLASS =
  "admin-btn-primary w-full text-[14px]";
// const DISPLAY_FIELD_CLASS =
//   "h-[35px] w-full rounded-md border border-[#e5e5e5] bg-[#f5f1eb] px-4 text-[13px] text-gray-800 flex items-center";

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
      >
        <option value="">{loading ? "Loading..." : placeholder || `Select ${label}`}</option>
        {withSelectedOption(options, value).map((option) => (
          <option key={`${name}-${option.id || option.value}`} value={option.value}>
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
    <div className="mx-auto w-full max-w-[1350px]">
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
    <label className="admin-label font-inter">
      {label}
    </label>
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
  return {
    message: error.message || fallbackMessage,
    details: Array.isArray(error.details) ? error.details : [],
  };
};

const formatDateForDisplay = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const getIsoDateYearsAgo = (years) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().slice(0, 10);
};

const MAX_DOB_FOR_SELLER = getIsoDateYearsAgo(MIN_SELLER_AGE);
const SELLER_ONBOARDING_DRAFT_KEY = "sellerOnboardingDraft";

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
    if (!contact.emailAddress) contact.emailAddress = String(user?.email || "").trim();
    if (!contact.mobileNumber) contact.mobileNumber = String(user?.phone || "").trim();
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

const getSellerOnboardingDraftKey = (token) =>
  `${SELLER_ONBOARDING_DRAFT_KEY}:${token || "guest"}`;

const isRepeatedSingleWordName = (value = "") => {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase();
};

const stripFileFieldsFromDraft = (draft = {}) => ({
  ...draft,
  kycForm: draft.kycForm
    ? {
        ...draft.kycForm,
        panDocumentFile: null,
        aadhaarFrontFile: null,
        aadhaarBackFile: null,
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
  const buffer = await file.arrayBuffer();
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
    <div>
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
        />
      </div>
      {error && <p className={ERROR_CLASS}>{error}</p>}
    </div>
  );
};

const SellerOnboarding = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { setStep, step } = useKYC();
  const { seller } = useSelector((state) => state);
  const onboardingToken =
    seller?.onboardingToken || localStorage.getItem("sellerOnboardingToken");
  const loading = seller?.loading;
  const flowState = seller?.flowState;
  const accessToken =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const [kycSubmittedApi, setKycSubmittedApi] = useState(false);
  const [requiresKycRefresh, setRequiresKycRefresh] = useState(false);
  const [kycErrors, setKycErrors] = useState({});
  const [profileErrors, setProfileErrors] = useState({});
  const [verificationModalDismissed, setVerificationModalDismissed] = useState(false);
  const [goingToDashboard, setGoingToDashboard] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const dateOfBirthRef = useRef(null);
  // Tracks previous rejection state so the modal only re-shows on a NEW rejection event
  const prevRejectionRef = useRef({ kyc: false, bank: false });

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
  });
  const [documentUrls, setDocumentUrls] = useState({
    panDocumentUrl: "",
    gstCertificateUrl: "",
    aadhaarFrontUrl: "",
    aadhaarBackUrl: "",
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
    registrationNumber: "",
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
  const businessTypes = useDropdownOptions("business-types");
  const countries = useDropdownOptions("countries", { limit: 250 });
  const optionIdByValue = (options, value) =>
    options.find((option) => String(option.value) === String(value))?.id || "";
  const pickupCountryId = optionIdByValue(countries.options, profileForm.pickupCountry);
  const pickupStates = useDropdownOptions("states", { parentId: pickupCountryId, limit: 250 }, { enabled: Boolean(pickupCountryId) });
  const pickupStateId = optionIdByValue(pickupStates.options, profileForm.pickupState);
  const pickupCities = useDropdownOptions("cities", { parentId: pickupStateId, limit: 250 }, { enabled: Boolean(pickupStateId) });
  const pickupCityId = optionIdByValue(pickupCities.options, profileForm.pickupCity);
  const pickupPincodes = useDropdownOptions("pincodes", { parentId: pickupCityId, limit: 250 }, { enabled: Boolean(pickupCityId) });
  const businessCountryId = optionIdByValue(countries.options, profileForm.businessAddressCountry);
  const businessStates = useDropdownOptions("states", { parentId: businessCountryId, limit: 250 }, { enabled: Boolean(businessCountryId) });
  const businessStateId = optionIdByValue(businessStates.options, profileForm.businessAddressState);
  const businessCities = useDropdownOptions("cities", { parentId: businessStateId, limit: 250 }, { enabled: Boolean(businessStateId) });
  const businessCityId = optionIdByValue(businessCities.options, profileForm.businessAddressCity);
  const businessPincodes = useDropdownOptions("pincodes", { parentId: businessCityId, limit: 250 }, { enabled: Boolean(businessCityId) });
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
  const draftKey = useMemo(
    () => getSellerOnboardingDraftKey(onboardingToken || accessToken),
    [accessToken, onboardingToken],
  );

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (!savedDraft) {
        setDraftLoaded(true);
        return;
      }

      const draft = stripFileFieldsFromDraft(JSON.parse(savedDraft));
      if (draft.kycForm) {
        setKycForm((prev) => ({ ...prev, ...draft.kycForm }));
      }
      if (draft.profileForm) {
        setProfileForm((prev) => ({ ...prev, ...draft.profileForm }));
      }
      if (draft.bankForm) {
        setBankForm((prev) => ({ ...prev, ...draft.bankForm }));
      }
      if (draft.documentUrls) {
        setDocumentUrls((prev) => ({ ...prev, ...draft.documentUrls }));
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
      documentUrls,
      step,
    });
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [bankForm, documentUrls, draftKey, draftLoaded, kycForm, profileForm, step]);

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
        const response = await apiRequest("GET", ENDPOINTS.auth.me);
        if (!isMounted) return;

        const user = response?.data || response || {};
        const sellerProfile = user?.sellerProfile || {};
        const kyc = user?.kyc || {};
        const bankDetails = sellerProfile?.bankDetails || {};
        const businessAddress = sellerProfile?.businessAddress || {};
        const pickupAddress = sellerProfile?.pickupAddress || {};
        const registrationContact = getRegistrationContact(user);
        const onboarding = user?.onboarding || {};
        const kycStatus =
          onboarding?.kycStatus ||
          kyc?.verificationStatus ||
          sellerProfile?.kycStatus;
        const kycDocuments = kyc?.documents || {};
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
          dateOfBirth: prev.dateOfBirth || sellerProfile?.dateOfBirth || "",
        }));
        setProfileForm((prev) => ({
          ...prev,
          businessType:
            sellerProfile?.businessName?.trim() && sellerProfile?.businessType
              ? sellerProfile.businessType
              : clearAutoFilledBusinessName(
                    prev.businessName,
                    registrationContact,
                  )?.trim()
                ? prev.businessType
                : "",
          businessName:
            sellerProfile?.businessName ||
            clearAutoFilledBusinessName(prev.businessName, registrationContact) ||
            "",
          gstNumber:
            prev.gstNumber || sellerProfile?.gstNumber || kyc?.gstNumber || "",
          displayName:
            prev.displayName ||
            (sellerProfile?.businessName ? sellerProfile?.displayName : "") ||
            "",
          legalBusinessName:
            prev.legalBusinessName || sellerProfile?.legalBusinessName || "",
          supportEmail:
            prev.supportEmail ||
            sellerProfile?.supportEmail ||
            user?.email ||
            "",
          supportPhone:
            prev.supportPhone ||
            sellerProfile?.supportPhone ||
            user?.phone ||
            "",
          description: prev.description || sellerProfile?.description || "",
          businessWebsite:
            prev.businessWebsite || sellerProfile?.businessWebsite || "",
          registrationNumber:
            prev.registrationNumber || sellerProfile?.registrationNumber || "",
          primaryContactName:
            prev.primaryContactName || sellerProfile?.primaryContactName || "",
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
        setBankForm((prev) => ({
          ...prev,
          accountHolderName:
            prev.accountHolderName || bankDetails?.accountHolderName || "",
          accountNumber: prev.accountNumber || bankDetails?.accountNumber || "",
          ifscCode: prev.ifscCode || bankDetails?.ifscCode || "",
          bankName: prev.bankName || bankDetails?.bankName || "",
          branchName: prev.branchName || bankDetails?.branchName || "",
        }));
      } catch (error) {
        toast.error(error?.message || "Unable to load seller account details");
      }
    };

    hydrateSellerOnboarding();
    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!flowState?.sellerProfile && !flowState?.kyc) return;

    const sellerProfile = flowState?.sellerProfile || {};
    const kyc = flowState?.kyc || {};
    const registrationContact = getRegistrationContact(flowState, seller?.onboardingUser);
    const bankDetails = sellerProfile?.bankDetails || {};
    const businessAddress = sellerProfile?.businessAddress || {};
    const pickupAddress = sellerProfile?.pickupAddress || {};
    const kycStatus =
      flowState?.kycStatus ||
      kyc?.verificationStatus ||
      sellerProfile?.kycStatus;
    const kycDocuments = kyc?.documents || {};
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
      dateOfBirth: prev.dateOfBirth || sellerProfile?.dateOfBirth || "",
    }));
    setProfileForm((prev) => ({
      ...prev,
      businessType:
        sellerProfile?.businessName?.trim() && sellerProfile?.businessType
          ? sellerProfile.businessType
          : clearAutoFilledBusinessName(
                prev.businessName,
                registrationContact,
              )?.trim()
            ? prev.businessType
            : "",
      businessName:
        sellerProfile?.businessName ||
        clearAutoFilledBusinessName(prev.businessName, registrationContact) ||
        "",
      gstNumber:
        prev.gstNumber || sellerProfile?.gstNumber || kyc?.gstNumber || "",
      displayName:
        prev.displayName ||
        (sellerProfile?.businessName ? sellerProfile?.displayName : "") ||
        "",
      legalBusinessName:
        prev.legalBusinessName || sellerProfile?.legalBusinessName || "",
      supportEmail: prev.supportEmail || sellerProfile?.supportEmail || "",
      supportPhone: prev.supportPhone || sellerProfile?.supportPhone || "",
      description: prev.description || sellerProfile?.description || "",
      businessWebsite:
        prev.businessWebsite || sellerProfile?.businessWebsite || "",
      registrationNumber:
        prev.registrationNumber || sellerProfile?.registrationNumber || "",
      primaryContactName:
        prev.primaryContactName || sellerProfile?.primaryContactName || "",
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
    setBankForm((prev) => ({
      ...prev,
      accountHolderName:
        prev.accountHolderName || bankDetails?.accountHolderName || "",
      accountNumber: prev.accountNumber || bankDetails?.accountNumber || "",
      ifscCode: prev.ifscCode || bankDetails?.ifscCode || "",
      bankName: prev.bankName || bankDetails?.bankName || "",
      branchName: prev.branchName || bankDetails?.branchName || "",
    }));
  }, [flowState, seller?.onboardingUser]);

  useEffect(() => {
    if (!flowState) return;
    const sellerProfile = flowState?.sellerProfile || {};
    const pickupAddress = sellerProfile?.pickupAddress || {};
    const hasStoredBusinessProfile =
      Boolean(
        (
          sellerProfile?.businessName ||
          sellerProfile?.displayName ||
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
      flowState?.accountStatus === "active" &&
      !flowState?.requiresOnboarding
    ) {
      setStep(5);
      return;
    }
    if (flowState?.kycStatus === "rejected") {
      // Show rejection modal on step 5 — seller clicks "Update KYC" to proceed
      setStep(5);
      return;
    }
    if (requiresKycRefresh) {
      // KYC documents are incomplete (not rejected) — go directly to KYC form
      setStep(1);
      return;
    }
    if (bankRejected && profileCompleted && kycSubmitted) {
      // Show rejection modal on step 5 — seller clicks "Update Bank Details" to proceed
      setStep(5);
      return;
    }
    if (statusMeansReview && profileCompleted && bankLinked) {
      setStep(5);
      return;
    }
    if (profileCompleted && kycSubmitted && bankLinked) {
      setStep(5);
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
  }, [flowState, navigate, requiresKycRefresh, setStep]);

  // Re-show modal only when a NEW rejection arrives from the backend.
  // After the seller takes action and resubmits, the modal stays dismissed
  // until admin reviews and sends a new rejection.
  useEffect(() => {
    if (!flowState) return;
    const kycRejected = flowState.kycStatus === "rejected";
    const bankStatus =
      flowState.bankVerificationStatus ||
      flowState.sellerProfile?.bankVerificationStatus;
    const bankRejected = bankStatus === "rejected";
    const wasKycRejected = prevRejectionRef.current.kyc;
    const wasBankRejected = prevRejectionRef.current.bank;

    if ((kycRejected && !wasKycRejected) || (bankRejected && !wasBankRejected)) {
      setVerificationModalDismissed(false);
    }
    prevRejectionRef.current = { kyc: kycRejected, bank: bankRejected };
  }, [flowState]);

  // Case 8: already approved and modal seen — redirect directly to dashboard
  useEffect(() => {
    if (step !== 5 || !flowState) return;
    if (getVerificationCase(flowState) === "already_approved") {
      navigate("/app/home");
    }
  }, [step, flowState, navigate]);

  if (!canAccess) return <Navigate to="/login" />;

  const setBackendFieldErrors = (details, setErrors) => {
    const nextErrors = {};
    details.forEach((detail) => {
      const path = detail?.path || [];
      const field = path[path.length - 1];
      if (field) nextErrors[field] = detail.message;
    });
    setErrors(nextErrors);
  };

  const onKycChange = (event) => {
    const { name, value } = event.target;
    let normalized =
      name === "panNumber" || name === "gstNumber"
        ? value.toUpperCase()
        : value;
    if (name === "gstNumber") normalized = normalized.slice(0, 15);
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
      event.target.value = "";
      return;
    }
    setKycForm((prev) => ({ ...prev, [fieldName]: file }));
    const urlFieldMap = {
      panDocumentFile: "panDocumentUrl",
      aadhaarFrontFile: "aadhaarFrontUrl",
      aadhaarBackFile: "aadhaarBackUrl",
    };
    if (file && urlFieldMap[fieldName]) {
      setDocumentUrls((prev) => ({ ...prev, [urlFieldMap[fieldName]]: "" }));
    }
    setKycErrors((prev) => ({ ...prev, [fieldName]: null }));
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
      return;
    }
    setKycForm((prev) => ({ ...prev, [fieldName]: file }));
    const urlFieldMap = {
      panDocumentFile: "panDocumentUrl",
      aadhaarFrontFile: "aadhaarFrontUrl",
      aadhaarBackFile: "aadhaarBackUrl",
    };
    if (urlFieldMap[fieldName]) {
      setDocumentUrls((prev) => ({ ...prev, [urlFieldMap[fieldName]]: "" }));
    }
    setKycErrors((prev) => ({ ...prev, [fieldName]: null }));
  };

  const onGstCertificateFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (isDocumentTooLarge(file)) {
      setProfileForm((prev) => ({ ...prev, gstCertificateFile: null }));
      setProfileErrors((prev) => ({
        ...prev,
        gstCertificateFile: "Document file must be 5 MB or smaller",
      }));
      setKycErrors((prev) => ({ ...prev, gstCertificateFile: null }));
      event.target.value = "";
      return;
    }
    setProfileForm((prev) => ({ ...prev, gstCertificateFile: file }));
    if (file) {
      setDocumentUrls((prev) => ({ ...prev, gstCertificateUrl: "" }));
    }
    setProfileErrors((prev) => ({ ...prev, gstCertificateFile: null }));
    setKycErrors((prev) => ({ ...prev, gstCertificateFile: null }));
    event.target.value = "";
  };

  const onGstCertificateDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] || null;
    if (!file) return;
    if (isDocumentTooLarge(file)) {
      setProfileForm((prev) => ({ ...prev, gstCertificateFile: null }));
      setProfileErrors((prev) => ({
        ...prev,
        gstCertificateFile: "Document file must be 5 MB or smaller",
      }));
      setKycErrors((prev) => ({ ...prev, gstCertificateFile: null }));
      return;
    }
    setProfileForm((prev) => ({ ...prev, gstCertificateFile: file }));
    setDocumentUrls((prev) => ({ ...prev, gstCertificateUrl: "" }));
    setProfileErrors((prev) => ({ ...prev, gstCertificateFile: null }));
    setKycErrors((prev) => ({ ...prev, gstCertificateFile: null }));
  };

  const onProfileChange = (event) => {
    const { name, value } = event.target;
    const upperCaseFields = [
      "gstNumber",
      "pickupPostalCode",
      "businessAddressPostalCode",
    ];
    const normalized = upperCaseFields.includes(name)
      ? value.toUpperCase()
      : value;
    setProfileForm((prev) => ({
      ...prev,
      [name]:
        name === "gstNumber"
          ? normalized.slice(0, 15)
          : name === "supportPhone"
            ? normalized.replace(/\D/g, "").slice(0, 15)
            : upperCaseFields.includes(name)
              ? normalized.slice(0, 6)
              : normalized,
    }));
    setProfileErrors((prev) => ({ ...prev, [name]: null }));
  };
  const onAddressSelectChange = (field, resetFields = []) => (event) => {
    const { value } = event.target;
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
      ...resetFields.reduce((result, childField) => ({ ...result, [childField]: "" }), {}),
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
      normalized = normalized.replace(/[^A-Z0-9]/g, "").slice(0, 11);
    }
    if (name === "accountNumber") {
      normalized = normalized.replace(/\D/g, "").slice(0, 18);
    }
    setBankForm((prev) => ({ ...prev, [name]: normalized }));
    setProfileErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validateKyc = () => {
    const errors = {};
    if (!kycForm.legalName.trim()) errors.legalName = "Legal name is required";
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
    if (!kycForm.dateOfBirth.trim()) {
      errors.dateOfBirth = "Date of birth is required";
    } else if (kycForm.dateOfBirth > MAX_DOB_FOR_SELLER) {
      errors.dateOfBirth = "Seller must be at least 18 years old";
    }
    if (!PAN_REGEX.test(kycForm.panNumber.trim()))
      errors.panNumber = "PAN format should be like ABCDE1234F";
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
    setKycErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getDocumentUploadValue = async (file, existingUrl) =>
    file ? readFileAsUploadPayload(file) : existingUrl || null;

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
    dateOfBirth: kycForm.dateOfBirth,
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
    },
  });

  const buildProfilePayload = ({ includeBankDetails = false } = {}) => {
    const payload = {
      displayName:
        profileForm.displayName.trim() || profileForm.businessName.trim(),
      legalBusinessName:
        profileForm.legalBusinessName.trim() || profileForm.businessName.trim(),
      description: profileForm.description.trim(),
      supportEmail: profileForm.supportEmail.trim(),
      supportPhone: profileForm.supportPhone.trim(),
      businessType: profileForm.businessType,
      registrationNumber: profileForm.registrationNumber.trim(),
      gstNumber: profileForm.gstNumber.trim(),
      businessWebsite: profileForm.businessWebsite.trim(),
      primaryContactName:
        profileForm.primaryContactName.trim() || kycForm.legalName.trim(),
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
    };

    if (kycForm.panNumber.trim()) payload.panNumber = kycForm.panNumber.trim();
    if (kycForm.aadhaarNumber.trim()) {
      payload.aadhaarNumber = kycForm.aadhaarNumber.trim();
    }
    if (kycForm.dateOfBirth) payload.dateOfBirth = kycForm.dateOfBirth;
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

  const validateProfile = () => {
    const errors = {};
    if (!profileForm.businessType.trim())
      errors.businessType = "Business type is required";
    if (!profileForm.businessName.trim())
      errors.businessName = "Business name is required";
    if (!GST_REGEX.test(profileForm.gstNumber.trim()))
      errors.gstNumber = "Please enter a valid GST Number (e.g. 27ABCDE1234F1Z5)";
    if (!profileForm.gstCertificateFile && !documentUrls.gstCertificateUrl)
      errors.gstCertificateFile = "GST certificate is required";
    if (!profileForm.supportEmail.trim())
      errors.supportEmail = "Support email is required";
    else if (!EMAIL_REGEX.test(profileForm.supportEmail.trim()))
      errors.supportEmail = "Support email is invalid";
    if (!profileForm.supportPhone.trim())
      errors.supportPhone = "Support phone is required";
    else if (!/^[0-9]{10,15}$/.test(profileForm.supportPhone.trim()))
      errors.supportPhone = "Support phone must be 10 to 15 digits";
    if (
      profileForm.businessWebsite.trim() &&
      !URL_REGEX.test(profileForm.businessWebsite.trim())
    )
      errors.businessWebsite = "Website must start with http:// or https://";
    if (!profileForm.pickupLine1.trim())
      errors.pickupLine1 = "Pickup address line 1 is required";
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
    if (
      profileForm.businessAddressPostalCode.trim() &&
      (profileForm.businessAddressPostalCode.trim().length < 5 ||
        profileForm.businessAddressPostalCode.trim().length > 10)
    )
      errors.businessAddressPostalCode =
        "Business postal code must be 5 to 10 characters";
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitKycStep = async (event) => {
    event.preventDefault();
    if (!validateKyc()) return;
    try {
      const kycPayload = await buildKycPayload();
      await dispatch(submitSellerKyc(kycPayload)).unwrap();
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
    }
  };

  const submitBusinessStep = async (event) => {
    event.preventDefault();
    if (!validateProfile()) {
      setStep(2);
      return;
    }
    try {
      const kycPayload = await buildKycPayload({
        includeGstCertificate: true,
        includeBusinessType: true,
      });
      await dispatch(submitSellerKyc(kycPayload)).unwrap();
      setKycSubmittedApi(true);
      setRequiresKycRefresh(false);
      await dispatch(updateSellerOnboardingProfile(buildProfilePayload())).unwrap();
      await dispatch(fetchAuthStatus({ token: onboardingToken })).unwrap();
      setStep(3);
    } catch (error) {
      const parsed = parseApiError(error, "Unable to save business details");
      const detailKeys = (parsed.details || []).map(
        (detail) => detail?.path?.[detail?.path?.length - 1],
      );
      const isKycError = detailKeys.some((key) =>
        ["panNumber", "gstNumber", "aadhaarNumber", "legalName"].includes(key),
      );
      setBackendFieldErrors(
        parsed.details,
        isKycError ? setKycErrors : setProfileErrors,
      );
      toast.error(parsed.message);
    }
  };

  const validateBankDetails = () => {
    const errors = {};
    if (!bankForm.accountHolderName.trim())
      errors.accountHolderName = "Account holder name is required";
    if (!bankForm.accountNumber.trim()) {
      errors.accountNumber = "Account number is required";
    } else if (!BANK_ACCOUNT_REGEX.test(bankForm.accountNumber.trim())) {
      errors.accountNumber = "Account number must be 9 to 18 digits";
    }
    if (!bankForm.ifscCode.trim()) {
      errors.ifscCode = "IFSC code is required";
    } else if (!IFSC_REGEX.test(bankForm.ifscCode.trim())) {
      errors.ifscCode = "IFSC format should be like ABCD0123456";
    }
    if (!bankForm.bankName.trim()) errors.bankName = "Bank name is required";
    if (!bankForm.branchName.trim())
      errors.branchName = "Branch name is required";
    if (Object.keys(errors).length > 0) {
      setProfileErrors((prev) => ({ ...prev, ...errors }));
      return false;
    }
    return true;
  };

  const submitBankStep = async (event) => {
    event.preventDefault();
    if (!validateBankDetails()) return;
    const bankRejected =
      flowState?.bankVerificationStatus === "rejected" ||
      flowState?.sellerProfile?.bankVerificationStatus === "rejected" ||
      Boolean(
        flowState?.bankRejectionReason ||
        flowState?.sellerProfile?.bankRejectionReason,
      );
    if (bankRejected) {
      await submitFinalOnboarding();
      return;
    }
    setStep(4);
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
      !kycSubmittedApi || Boolean(profileForm.gstCertificateFile);
    try {
      if (shouldSubmitKyc) {
        const kycPayload = await buildKycPayload({
          includeGstCertificate: true,
        });
        await dispatch(submitSellerKyc(kycPayload)).unwrap();
        setKycSubmittedApi(true);
        setRequiresKycRefresh(false);
      }
      const payload = buildProfilePayload({ includeBankDetails: true });
      await dispatch(updateSellerOnboardingProfile(payload)).unwrap();
      await dispatch(fetchAuthStatus({ token: onboardingToken })).unwrap();
      localStorage.removeItem(draftKey);
      setStep(5);
      toast.success("Onboarding submitted for approval");
    } catch (error) {
      const parsed = parseApiError(error, "Unable to submit business profile");
      const detailKeys = (parsed.details || []).map(
        (d) => d?.path?.[d?.path?.length - 1],
      );
      const isKycError = detailKeys.some((key) =>
        ["panNumber", "gstNumber", "aadhaarNumber", "legalName"].includes(key),
      );
      setBackendFieldErrors(
        parsed.details,
        isKycError ? setKycErrors : setProfileErrors,
      );
      toast.error(parsed.message);
    }
  };

  const handleGoToDashboard = async () => {
    setGoingToDashboard(true);
    // Persist approval modal seen locally immediately as fallback
    localStorage.setItem("sellerApprovalModalSeen", "true");
    try {
      await dispatch(markApprovalModalSeen());
    } catch {
      // localStorage already set — backend sync failure is non-blocking
    }
    navigate("/app/home");
  };

  if (step === 5) {
    const verificationCase = getVerificationCase(flowState);
    const isAnyRejected = ["kyc_rejected", "bank_rejected", "both_rejected"].includes(verificationCase);
    const isFullyApproved = verificationCase === "both_approved" || verificationCase === "already_approved";
    const isPendingCase = ["pending", "kyc_approved_bank_pending", "bank_approved_kyc_pending"].includes(verificationCase);

    // Modal shows for all cases except when pending and already dismissed
    const showModal = !verificationModalDismissed;

    const statusMeta = isFullyApproved
      ? {
          badge: "STATUS",
          title: "Application Approved",
          subtitle:
            "Your seller application has been approved. You can access your dashboard.",
        }
      : isAnyRejected && !verificationModalDismissed
        ? {
            badge: "STATUS",
            title: "Verification Requires Updates",
            subtitle: "Please review the feedback below and update your details.",
          }
        : {
            badge: "STATUS",
            title: "Under Review",
            subtitle:
              "Your account is under review. Our team will verify your details within 24–48 hours.",
          };

    // After the seller has acknowledged a rejection and resubmitted (modal dismissed),
    // show "underReview" so they know their details are being processed.
    const bgStatusVariant = isFullyApproved
      ? "approved"
      : isAnyRejected && !verificationModalDismissed
        ? "rejected"
        : "underReview";

    return (
      <OnboardingScreen step={step} metaOverride={statusMeta}>
        <div className="w-full">
          {showModal && (
            <SellerVerificationModal
              flowState={flowState}
              onNavigateToKyc={() => {
                setVerificationModalDismissed(true);
                setStep(1);
              }}
              onNavigateToBank={() => {
                setVerificationModalDismissed(true);
                setStep(3);
              }}
              onGoToDashboard={handleGoToDashboard}
              onDismiss={() => setVerificationModalDismissed(true)}
              loading={goingToDashboard}
            />
          )}
          {/* Background status screen — visible when pending modal is dismissed */}
          <SellerStatusScreen
            variant={bgStatusVariant}
            description={
              isAnyRejected && !showModal
                ? (flowState?.kycRejectionReason ||
                    flowState?.bankRejectionReason ||
                    flowState?.sellerProfile?.bankRejectionReason ||
                    "Please update your details and resubmit.")
                : undefined
            }
            disabled={showModal}
            onButtonClick={() => {
              if (showModal) return;
              if (isPendingCase) return;
              if (isAnyRejected) {
                setVerificationModalDismissed(false);
                return;
              }
              if (isFullyApproved) {
                handleGoToDashboard();
              }
            }}
          />
        </div>
      </OnboardingScreen>
    );
  }

  return (
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
        <form onSubmit={submitKycStep} className={ONBOARDING_CARD_CLASS}>
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
                    className={`${DATE_FIELD_CLASS} flex items-center justify-between gap-3 ${
                      kycForm.dateOfBirth ? "text-gray-800" : "text-gray-400"
                    }`}
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
                    value={kycForm.dateOfBirth}
                    max={MAX_DOB_FOR_SELLER}
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
                  maxLength="10"
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
                  maxLength="12"
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
                className={SECONDARY_BUTTON_CLASS}
                type="button"
                onClick={() => setStep(0)}
              >
                Back
              </button>
              <button
                disabled={loading}
                className={PRIMARY_BUTTON_CLASS}
                type="submit"
              >
                {loading ? "Submitting..." : "Continue to Business Details"}
              </button>
            </div>
          </OnboardingActions>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submitBusinessStep} className={ONBOARDING_CARD_CLASS}>
          <OnboardingSection number="01" title="Business Information">
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
                  Business Name {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="businessName"
                  placeholder="Business Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessName}
                  onChange={onProfileChange}
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
                  name="gstNumber"
                  placeholder="GST Number"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.gstNumber}
                  onChange={onProfileChange}
                  maxLength={15}
                />
                {profileErrors.gstNumber && (
                  <p className={ERROR_CLASS}>{profileErrors.gstNumber}</p>
                )}
              </div>

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

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Support Email {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="supportEmail"
                  placeholder="Support Email"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.supportEmail}
                  onChange={onProfileChange}
                />
                {profileErrors.supportEmail && (
                  <p className={ERROR_CLASS}>{profileErrors.supportEmail}</p>
                )}
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Support Phone {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="supportPhone"
                  placeholder="Support Phone"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.supportPhone}
                  onChange={onProfileChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                />
                {profileErrors.supportPhone && (
                  <p className={ERROR_CLASS}>{profileErrors.supportPhone}</p>
                )}
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Display Name
                </label>
                <input
                  name="displayName"
                  placeholder="Display Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.displayName}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Legal Business Name
                </label>
                <input
                  name="legalBusinessName"
                  placeholder="Legal Business Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.legalBusinessName}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Registration Number
                </label>
                <input
                  name="registrationNumber"
                  placeholder="Registration Number"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.registrationNumber}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Primary Contact Name
                </label>
                <input
                  name="primaryContactName"
                  placeholder="Primary Contact Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.primaryContactName}
                  onChange={onProfileChange}
                />
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
                  Description
                </label>
                <input
                  name="description"
                  placeholder="Business Description"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.description}
                  onChange={onProfileChange}
                />
              </div>

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
                <OnboardingSelect
                  name="pickupCity"
                  label="Pickup City"
                  value={profileForm.pickupCity}
                  options={pickupCities.options}
                  onChange={onAddressSelectChange("pickupCity", [
                    "pickupPostalCode",
                  ])}
                  loading={pickupCities.loading}
                  error={pickupCities.error}
                  disabled={!pickupStateId}
                  required
                />
                {profileErrors.pickupCity && (
                  <p className={ERROR_CLASS}>{profileErrors.pickupCity}</p>
                )}
              </div>

              <div>
                <OnboardingSelect
                  name="pickupPostalCode"
                  label="Pickup Postal Code"
                  value={profileForm.pickupPostalCode}
                  options={pickupPincodes.options}
                  onChange={onAddressSelectChange("pickupPostalCode")}
                  loading={pickupPincodes.loading}
                  error={pickupPincodes.error}
                  disabled={!pickupCityId}
                  required
                />
                {profileErrors.pickupPostalCode && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.pickupPostalCode}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]">
                  Business Address Line 1
                </label>
                <input
                  name="businessAddressLine1"
                  placeholder="Business Address Line 1"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessAddressLine1}
                  onChange={onProfileChange}
                />
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
              />

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
              />

              <OnboardingSelect
                name="businessAddressCity"
                label="Business City"
                value={profileForm.businessAddressCity}
                options={businessCities.options}
                onChange={onAddressSelectChange("businessAddressCity", [
                  "businessAddressPostalCode",
                ])}
                loading={businessCities.loading}
                error={businessCities.error}
                disabled={!businessStateId}
              />

              <div>
                <OnboardingSelect
                  name="businessAddressPostalCode"
                  label="Business Postal Code"
                  value={profileForm.businessAddressPostalCode}
                  options={businessPincodes.options}
                  onChange={onAddressSelectChange("businessAddressPostalCode")}
                  loading={businessPincodes.loading}
                  error={businessPincodes.error}
                  disabled={!businessCityId}
                />
                {profileErrors.businessAddressPostalCode && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.businessAddressPostalCode}
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
              disabled={loading}
              className={PRIMARY_BUTTON_CLASS}
              type="submit"
            >
              Continue
            </button>
          </OnboardingActions>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={submitBankStep} className={ONBOARDING_CARD_CLASS}>
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
              disabled={loading}
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
                  label="Aadhaar Card Softcopy"
                  value={
                    kycForm.aadhaarFrontFile?.name ||
                    getFileNameFromUrl(documentUrls.aadhaarFrontUrl, "-")
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
                <ReviewInput
                  label="Business Type"
                  value={businessTypeLabel}
                />
                <ReviewInput
                  label="Business Name"
                  value={profileForm.businessName}
                />
                <ReviewInput
                  label="Business PAN Number"
                  value={kycForm.panNumber}
                />
                <ReviewInput
                  label="Udyog Aadhaar Number"
                  value={kycForm.aadhaarNumber}
                />
                <ReviewInput
                  label="Business Address"
                  value={[
                    profileForm.businessAddressLine1 || profileForm.pickupLine1,
                    profileForm.businessAddressCity || profileForm.pickupCity,
                    profileForm.businessAddressState || profileForm.pickupState,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
                <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                  <ReviewInput
                    label="Business Contact"
                    value={profileForm.primaryContactName || kycForm.legalName}
                  />
                  <ReviewInput
                    label="Contact Number"
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
              </div>
            </ReviewSection>

            <ReviewSection
              number="03"
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
              disabled={loading}
              className={REVIEW_PRIMARY_BUTTON_CLASS}
              type="button"
              onClick={submitFinalOnboarding}
            >
              {loading ? "Submitting..." : "Submit For Verification"}
            </button>
          </OnboardingActions>
        </div>
      )}
    </OnboardingScreen>
  );
};

export default SellerOnboarding;
