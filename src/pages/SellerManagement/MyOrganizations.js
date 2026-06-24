import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  MdAdd,
  MdCheckCircle,
  MdClose,
  MdDeleteOutline,
  MdEdit,
  MdRefresh,
  MdOutlineSwapHoriz,
  MdInfoOutline,
  MdBusiness,
} from "react-icons/md";
import { PageHeader, StatusBadge } from "../../components/Shared";
import { apiRequest } from "../../_helpers/apiConfig";
import { ENDPOINTS } from "../../_helpers/endpoints";
import {
  setSelectedSellerOrganizationId,
  getSelectedSellerOrganizationId,
} from "../../_helpers/sellerOrganizationContext";

const BUSINESS_TYPES = [
  "individual",
  "proprietorship",
  "partnership",
  "private_limited",
  "llp",
  "public_limited",
];
const ORGANIZATION_DOCUMENTS = [
  ["panDocumentUrl", "PAN Document"],
  ["gstCertificateUrl", "GST Certificate"],
  ["aadhaarFrontUrl", "Aadhaar Front"],
  ["aadhaarBackUrl", "Aadhaar Back"],
];

const emptyAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
};

const emptyBankDetails = {
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  bankName: "",
  branchName: "",
};

const createEmptyForm = () => ({
  legalBusinessName: "",
  storeDisplayName: "",
  businessType: "proprietorship",
  description: "",
  supportEmail: "",
  supportPhone: "",
  registrationNumber: "",
  gstin: "",
  pan: "",
  aadhaarNumber: "",
  dateOfBirth: "",
  businessWebsite: "",
  primaryContactName: "",
  documents: {},
  bankDetails: { ...emptyBankDetails },
  billingAddress: { ...emptyAddress },
  pickupAddress: { ...emptyAddress },
  returnAddress: { ...emptyAddress },
  taxState: "",
  taxRegistrationType: "regular",
  invoicePrefix: "INV",
  invoiceSeries: "",
  payoutSchedule: "weekly",
});

const onboardingInputCls =
  "admin-input h-[46px] text-[14px] font-medium text-[#111827] placeholder:font-normal placeholder:text-[#9a96a6]";
const onboardingLabelCls =
  "mb-[6px] block text-[13px] font-medium leading-[17px] text-[#484555]";

const cleanString = (value) => String(value || "").trim();

const labelize = (value = "") =>
  String(value || "-")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatAddress = (address = {}) =>
  [address.line1, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(", ") || "-";

const orgLabel = (org = {}) =>
  org.storeDisplayName || org.legalBusinessName || org.id || org.organizationId || "Unnamed";

const orgId = (org = {}) => org.id || org.organizationId || "";

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

const readDocument = (file) =>
  new Promise(async (resolve, reject) => {
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const mimeType = detectDocumentMimeType(bytes) || String(file.type || "").toLowerCase();
      const contentBase64 = arrayBufferToBase64(buffer);
      
      resolve({
        contentBase64,
        fileName: file.name,
        mimeType,
      });
    } catch (error) {
      reject(new Error(`Unable to read ${file.name}: ${error.message}`));
    }
  });

const normalizeDocumentValue = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const { contentBase64, mimeType, fileName } = value;
    if (!contentBase64 || !mimeType) return null;
    return { contentBase64, mimeType, fileName };
  }
  return null;
};

const normalizeDocuments = (documents = {}) =>
  Object.entries(documents).reduce((normalized, [key, value]) => {
    const next = normalizeDocumentValue(value);
    if (next !== null) normalized[key] = next;
    return normalized;
  }, {});

const isOrganizationLive = (org = {}) =>
  ["approved", "active"].includes(org.approvalStatus) &&
  org.kycStatus === "verified" &&
  org.bankVerificationStatus === "verified" &&
  org.goLiveStatus === "live";

const firstValue = (...values) =>
  values.find((value) => cleanString(value)) || "";

const pickAddress = (...addresses) =>
  addresses.find((address) =>
    address &&
    ["line1", "city", "state", "postalCode", "pincode"].some((key) =>
      cleanString(address[key]),
    ),
  ) || {};

const mergeAddress = (primary = {}, fallback = {}) => ({
  ...emptyAddress,
  ...(fallback || {}),
  ...(primary || {}),
  line1: firstValue(primary?.line1, fallback?.line1),
  line2: firstValue(primary?.line2, fallback?.line2),
  city: firstValue(primary?.city, fallback?.city),
  state: firstValue(primary?.state, fallback?.state),
  country: firstValue(primary?.country, fallback?.country, "India"),
  postalCode: firstValue(primary?.postalCode, primary?.pincode, fallback?.postalCode, fallback?.pincode),
});

const extractSellerDefaults = (raw = {}) => {
  const root = raw?.data?.data || raw?.data || raw || {};
  const flowState = root.flowState || root.onboardingState || {};
  const user = root.user || root.seller || root.onboardingUser || flowState.user || root;
  const sellerProfile =
    root.sellerProfile ||
    flowState.sellerProfile ||
    user.sellerProfile ||
    {};
  const onboarding = root.onboarding || flowState.onboarding || user.onboarding || {};
  const kyc = root.kyc || flowState.kyc || user.kyc || {};
  const registration =
    root.registration ||
    root.onboardingUser ||
    flowState.onboardingUser ||
    user.registration ||
    {};
  const profile = user.profile || {};
  const fullName = firstValue(
    user.fullName,
    user.full_name,
    registration.fullName,
    [profile.firstName, profile.lastName].filter(Boolean).join(" "),
    kyc.legalName,
    sellerProfile.primaryContactName,
  );
  const email = firstValue(
    user.email,
    registration.email,
    onboarding.email,
    sellerProfile.supportEmail,
  );
  const phone = firstValue(
    user.phone,
    user.mobileNumber,
    registration.mobileNumber,
    onboarding.mobileNumber,
    sellerProfile.supportPhone,
  );
  const businessAddress = pickAddress(
    sellerProfile.businessAddress,
    sellerProfile.billingAddress,
  );
  const pickupAddress = pickAddress(sellerProfile.pickupAddress, businessAddress);

  return {
    legalBusinessName: firstValue(
      sellerProfile.legalBusinessName,
      sellerProfile.businessName,
      kyc.legalName,
      fullName,
    ),
    storeDisplayName: firstValue(
      sellerProfile.displayName,
      sellerProfile.businessName,
      sellerProfile.legalBusinessName,
    ),
    businessType: firstValue(sellerProfile.businessType, kyc.businessType),
    supportEmail: email,
    supportPhone: phone,
    primaryContactName: firstValue(sellerProfile.primaryContactName, fullName),
    gstin: firstValue(sellerProfile.gstNumber, sellerProfile.gstin, kyc.gstNumber),
    pan: firstValue(sellerProfile.panNumber, sellerProfile.pan, kyc.panNumber),
    aadhaarNumber: firstValue(
      sellerProfile.aadhaarNumber,
      kyc.aadhaarNumber,
    ),
    dateOfBirth: firstValue(sellerProfile.dateOfBirth, kyc.dateOfBirth)
      ? String(firstValue(sellerProfile.dateOfBirth, kyc.dateOfBirth)).slice(0, 10)
      : "",
    businessWebsite: firstValue(sellerProfile.businessWebsite),
    registrationNumber: firstValue(sellerProfile.registrationNumber),
    description: firstValue(sellerProfile.description),
    documents: {
      ...(kyc.documents || {}),
      ...(sellerProfile.documents || sellerProfile.kycDocuments || {}),
    },
    bankDetails: sellerProfile.bankDetails || {},
    billingAddress: businessAddress,
    pickupAddress,
    returnAddress: pickAddress(sellerProfile.returnAddress, pickupAddress),
  };
};

const applyDefaultsToForm = (defaults = {}) => ({
  ...createEmptyForm(),
  legalBusinessName: defaults.legalBusinessName || "",
  storeDisplayName: defaults.storeDisplayName || "",
  businessType: defaults.businessType || "proprietorship",
  description: defaults.description || "",
  supportEmail: defaults.supportEmail || "",
  supportPhone: defaults.supportPhone || "",
  registrationNumber: defaults.registrationNumber || "",
  gstin: defaults.gstin || "",
  pan: defaults.pan || "",
  aadhaarNumber: defaults.aadhaarNumber || "",
  dateOfBirth: defaults.dateOfBirth || "",
  businessWebsite: defaults.businessWebsite || "",
  primaryContactName: defaults.primaryContactName || "",
  documents: { ...(defaults.documents || {}) },
  bankDetails: { ...emptyBankDetails, ...(defaults.bankDetails || {}) },
  billingAddress: mergeAddress(defaults.billingAddress, defaults.pickupAddress),
  pickupAddress: mergeAddress(defaults.pickupAddress, defaults.billingAddress),
  returnAddress: mergeAddress(defaults.returnAddress, defaults.pickupAddress || defaults.billingAddress),
  taxState: defaults.billingAddress?.state || defaults.pickupAddress?.state || "",
});

const buildPayload = (form = {}) => {
  const billingAddress = mergeAddress(form.billingAddress, form.pickupAddress);
  const pickupAddress = mergeAddress(form.pickupAddress, billingAddress);
  const billingState = cleanString(billingAddress?.state);
  const pickupState = cleanString(pickupAddress?.state);
  const taxState = cleanString(form.taxState) || billingState || pickupState;

  return {
    legalBusinessName: cleanString(form.legalBusinessName),
    storeDisplayName: cleanString(form.storeDisplayName),
    businessType: cleanString(form.businessType) || null,
    description: cleanString(form.description) || null,
    supportEmail: cleanString(form.supportEmail),
    supportPhone: cleanString(form.supportPhone),
    registrationNumber: cleanString(form.registrationNumber) || null,
    gstin: cleanString(form.gstin) || null,
    pan: cleanString(form.pan),
    aadhaarNumber: cleanString(form.aadhaarNumber),
    dateOfBirth: form.dateOfBirth || null,
    businessWebsite: cleanString(form.businessWebsite) || null,
    primaryContactName: cleanString(form.primaryContactName),
    documents: normalizeDocuments(form.documents || {}),
    bankDetails: {
      accountHolderName: cleanString(form.bankDetails?.accountHolderName),
      accountNumber: cleanString(form.bankDetails?.accountNumber),
      ifscCode: cleanString(form.bankDetails?.ifscCode).toUpperCase(),
      bankName: cleanString(form.bankDetails?.bankName),
      branchName: cleanString(form.bankDetails?.branchName),
    },
    billingAddress: {
      ...emptyAddress,
      ...billingAddress,
      line1: cleanString(billingAddress?.line1),
      line2: cleanString(billingAddress?.line2),
      city: cleanString(billingAddress?.city),
      state: billingState,
      postalCode: cleanString(billingAddress?.postalCode),
      country: cleanString(billingAddress?.country) || "India",
    },
    businessAddress: {
      ...emptyAddress,
      ...billingAddress,
      line1: cleanString(billingAddress?.line1),
      line2: cleanString(billingAddress?.line2),
      city: cleanString(billingAddress?.city),
      state: billingState,
      postalCode: cleanString(billingAddress?.postalCode),
      country: cleanString(billingAddress?.country) || "India",
    },
    pickupAddress: {
      ...emptyAddress,
      ...pickupAddress,
      line1: cleanString(pickupAddress?.line1),
      line2: cleanString(pickupAddress?.line2),
      city: cleanString(pickupAddress?.city),
      state: pickupState,
      postalCode: cleanString(pickupAddress?.postalCode),
      country: cleanString(pickupAddress?.country) || "India",
    },
    returnAddress: {
      ...emptyAddress,
      ...(form.returnAddress || form.pickupAddress || {}),
      line1: cleanString(form.returnAddress?.line1 || form.pickupAddress?.line1),
      line2: cleanString(form.returnAddress?.line2 || form.pickupAddress?.line2),
      city: cleanString(form.returnAddress?.city || form.pickupAddress?.city),
      state: cleanString(form.returnAddress?.state || form.pickupAddress?.state),
      postalCode: cleanString(form.returnAddress?.postalCode || form.pickupAddress?.postalCode),
      country: cleanString(form.returnAddress?.country || form.pickupAddress?.country) || "India",
    },
    taxSettings: {
      state: taxState,
      gstin: cleanString(form.gstin) || null,
      pan: cleanString(form.pan),
      registrationType: cleanString(form.taxRegistrationType) || "regular",
    },
    invoiceSettings: {
      invoicePrefix: cleanString(form.invoicePrefix) || "INV",
      invoiceSeries: cleanString(form.invoiceSeries),
      state: taxState,
    },
    payoutSettings: {
      payoutSchedule: cleanString(form.payoutSchedule) || "weekly",
    },
    complianceSettings: {
      gstRegistered: cleanString(form.taxRegistrationType) !== "unregistered",
      taxRegistrationType: cleanString(form.taxRegistrationType) || "regular",
      taxRegion: taxState,
    },
  };
};

const validateForm = (form = {}) => {
  const billingAddress = mergeAddress(form.billingAddress, form.pickupAddress);
  const pickupAddress = mergeAddress(form.pickupAddress, billingAddress);
  const required = [
    [form.legalBusinessName, "Legal business name is required"],
    [form.storeDisplayName, "Store / display name is required"],
    [form.businessType, "Business type is required"],
    [form.supportEmail, "Support email is required"],
    [form.supportPhone, "Support phone is required"],
    [form.primaryContactName, "Primary contact name is required"],
    [form.gstin, "GSTIN is required"],
    [form.pan, "PAN is required"],
    [form.aadhaarNumber, "Aadhaar number is required"],
    [form.dateOfBirth, "Date of birth is required"],
    [form.bankDetails?.accountHolderName, "Account holder name is required"],
    [form.bankDetails?.accountNumber, "Bank account number is required"],
    [form.bankDetails?.ifscCode, "IFSC code is required"],
    [form.bankDetails?.bankName, "Bank name is required"],
    [billingAddress?.line1, "Business / billing address line 1 is required"],
    [billingAddress?.city, "Business / billing city is required"],
    [billingAddress?.state, "Business / billing state is required"],
    [billingAddress?.postalCode, "Business / billing pincode is required"],
    [pickupAddress?.line1, "Pickup address line 1 is required"],
    [pickupAddress?.city, "Pickup city is required"],
    [pickupAddress?.state, "Pickup state is required"],
    [pickupAddress?.postalCode, "Pickup pincode is required"],
  ];
  const missing = required.find(([val]) => !cleanString(val));
  if (missing) return missing[1];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanString(form.supportEmail))) {
    return "Enter a valid support email";
  }
  if (!/^\d{10,15}$/.test(cleanString(form.supportPhone))) {
    return "Support phone must be 10 to 15 digits";
  }
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleanString(form.pan))) {
    return "Enter a valid PAN";
  }
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/.test(cleanString(form.gstin))) {
    return "Enter a valid GSTIN";
  }
  if (!/^[0-9]{12}$/.test(cleanString(form.aadhaarNumber))) {
    return "Aadhaar number must be 12 digits";
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanString(form.bankDetails?.ifscCode))) {
    return "Enter a valid IFSC code";
  }
  if (!/^[0-9]{9,18}$/.test(cleanString(form.bankDetails?.accountNumber))) {
    return "Bank account number must be 9 to 18 digits";
  }
  const missingDocument = ORGANIZATION_DOCUMENTS.find(
    ([key]) => !form.documents?.[key],
  );
  return missingDocument ? `${missingDocument[1]} is required` : "";
};

const normalizeForEdit = (org = {}) => {
  const invoiceSettings = org.invoiceSettings || {};
  const taxSettings = org.taxSettings || {};
  const payoutSettings = org.payoutSettings || {};
  const businessAddress = pickAddress(
    org.billingAddress,
    org.businessAddress,
    org.address,
  );
  const pickupAddress = pickAddress(org.pickupAddress, businessAddress);
  const documents = {
    ...(org.documents || {}),
    ...(org.kycDocuments || {}),
    ...(org.kyc?.documents || {}),
  };
  return {
    legalBusinessName: firstValue(org.legalBusinessName, org.legalName, org.businessName),
    storeDisplayName: firstValue(org.storeDisplayName, org.displayName, org.storeName, org.businessName),
    businessType: org.businessType || "proprietorship",
    description: org.description || "",
    supportEmail: firstValue(org.supportEmail, org.email),
    supportPhone: firstValue(org.supportPhone, org.phone, org.mobileNumber),
    registrationNumber: org.registrationNumber || "",
    gstin: firstValue(org.gstin, org.gstNumber),
    pan: firstValue(org.pan, org.panNumber),
    aadhaarNumber: firstValue(org.aadhaarNumber, org.kyc?.aadhaarNumber),
    dateOfBirth: org.dateOfBirth ? String(org.dateOfBirth).slice(0, 10) : "",
    businessWebsite: org.businessWebsite || "",
    primaryContactName: firstValue(org.primaryContactName, org.contactName, org.legalName),
    documents,
    bankDetails: { ...emptyBankDetails, ...(org.bankDetails || {}) },
    billingAddress: mergeAddress(businessAddress, pickupAddress),
    pickupAddress: mergeAddress(pickupAddress, businessAddress),
    returnAddress: mergeAddress(pickAddress(org.returnAddress, pickupAddress), pickupAddress),
    taxState: taxSettings.state || businessAddress?.state || pickupAddress?.state || "",
    taxRegistrationType:
      org.complianceSettings?.taxRegistrationType ||
      taxSettings.registrationType ||
      "regular",
    invoicePrefix: invoiceSettings.invoicePrefix || "INV",
    invoiceSeries: invoiceSettings.invoiceSeries || "",
    payoutSchedule: payoutSettings.payoutSchedule || "weekly",
  };
};

const unwrapList = (response = {}) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  const root = data?.data || data || response || {};
  const items = root.organizations || root.items || root.list || root.rows || [];
  return Array.isArray(items) ? items : [];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const FieldRow = ({ label, required, children }) => (
  <div className="flex flex-col gap-1">
    <label className={onboardingLabelCls}>
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const PrimaryButton = ({ children, icon, onClick, disabled = false, variant = "primary" }) => {
  const cls =
    variant === "ghost"
      ? "border border-[#E6E6E6] bg-white text-[#202337] hover:bg-[#f8faff]"
      : "bg-[#2f6fed] text-white hover:bg-[#245ed5]";
  return (
    <button
      type="button"
      className={`inline-flex min-h-[38px] items-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${cls}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {children}
    </button>
  );
};

// ─── Approval Status Banner ───────────────────────────────────────────────────

const STATUS_BANNERS = {
  draft: {
    bg: "bg-[#f8f9fb]",
    border: "border-[#d0d5dd]",
    icon: "text-[#65718b]",
    title: "Draft — Not Yet Submitted",
    body: "This organization has not been submitted for review. Edit it and save to submit.",
  },
  pending_review: {
    bg: "bg-[#fffbeb]",
    border: "border-[#fde68a]",
    icon: "text-[#b45309]",
    title: "Under Review",
    body: "Your organization details are being reviewed by our team. This typically takes 1–2 business days.",
  },
  resubmitted: {
    bg: "bg-[#ecfeff]",
    border: "border-[#a5f3fc]",
    icon: "text-[#0e7490]",
    title: "Resubmitted",
    body: "Your corrected organization details have been resubmitted and are waiting for admin review.",
  },
  rejected: {
    bg: "bg-[#fff1f0]",
    border: "border-[#fca5a5]",
    icon: "text-[#d92d20]",
    title: "Rejected",
    body: "This organization was rejected. Please update your details and resubmit.",
  },
  suspended: {
    bg: "bg-[#fff7ed]",
    border: "border-[#fed7aa]",
    icon: "text-[#c2410c]",
    title: "Suspended",
    body: "This organization has been suspended. Contact support to resolve the issue.",
  },
  blocked: {
    bg: "bg-[#fff1f0]",
    border: "border-[#fca5a5]",
    icon: "text-[#b42318]",
    title: "Blocked",
    body: "This organization is blocked. Review the reason and contact support or submit corrections if requested.",
  },
};

const ApprovalBanner = ({ org }) => {
  const status = org.approvalStatus || "draft";
  const meta = STATUS_BANNERS[status];
  if (!meta) return null;
  const reason =
    org.rejectionReason ||
    org.metadata?.rejectionReason ||
    org.metadata?.lastVerificationEvent?.rejectionReason;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${meta.bg} ${meta.border}`}
    >
      <MdInfoOutline size={18} className={`mt-0.5 flex-shrink-0 ${meta.icon}`} />
      <div>
        <p className="font-semibold text-[#202337]">{meta.title}</p>
        <p className="mt-0.5 text-[#65718b]">{meta.body}</p>
        {reason && (
          <p className="mt-1 text-[#d92d20]">
            <span className="font-medium">Reason:</span> {reason}
          </p>
        )}
        {Array.isArray(org.requiredChanges) && org.requiredChanges.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[#d92d20]">
            {org.requiredChanges.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const ApprovalRequiredModal = ({ org, onClose, onEdit }) => {
  if (!org) return null;
  const status = org.approvalStatus || "draft";
  const canEdit = ["draft", "rejected", "blocked"].includes(status);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-[#E6E6E6] bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff7ed] text-[#c2410c]">
            <MdInfoOutline size={22} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-[#202337]">
              Admin approval required
            </h3>
            <p className="mt-1 text-sm text-[#65718b]">
              {orgLabel(org)} is currently <span className="font-semibold">{labelize(status)}</span>.
              You can switch only after admin approves KYC, bank verification, and go-live.
            </p>
          </div>
        </div>
        <div className="rounded-md bg-[#f8faff] px-3 py-2 text-xs text-[#65718b]">
          Current checks: KYC {labelize(org.kycStatus || "not submitted")}, Bank{" "}
          {labelize(org.bankVerificationStatus || "not submitted")}, Go Live{" "}
          {labelize(org.goLiveStatus || "pending")}.
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <PrimaryButton variant="ghost" onClick={onClose}>
            Close
          </PrimaryButton>
          {canEdit && (
            <PrimaryButton
              onClick={() => {
                onClose();
                onEdit(org);
              }}
              icon={<MdEdit size={16} />}
            >
              Correct Details
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
};

const FormStepPill = ({ number, label }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-[#dbeafe] bg-white px-3 py-1.5 text-xs font-semibold text-[#1e40af]">
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2f6fed] text-[10px] text-white">
      {number}
    </span>
    {label}
  </span>
);

const FormSectionCard = ({ number, title, subtitle, children }) => (
  <section className="rounded-2xl border border-[#e5eaf5] bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f2a900] text-xs font-bold text-white">
        {number}
      </span>
      <div>
        <h4 className="text-sm font-bold text-[#202337]">{title}</h4>
        {subtitle && <p className="mt-1 text-xs text-[#65718b]">{subtitle}</p>}
      </div>
    </div>
    {children}
  </section>
);

// ─── Organization Form Modal ──────────────────────────────────────────────────

const OrgFormModal = ({
  open,
  mode,
  form,
  submitting,
  onClose,
  onSubmit,
  onSaveDraft,
  onChange,
  onNestedChange,
  onDocumentChange,
}) => {
  if (!open) return null;
  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#E6E6E6] bg-[#f8faff] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#dbeafe] bg-gradient-to-r from-[#eff6ff] via-white to-[#fff7e8] px-6 py-5">
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2f6fed]">
              Seller Organization Onboarding
            </p>
            <h3 className="text-lg font-bold text-[#202337]">
              {isEdit ? "Edit Organization" : "Add New Organization"}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-[#65718b]">
              Add the legal, bank, document, and address details for this organization. Seller can use it only after admin approval and go-live.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <FormStepPill number="1" label="Details" />
              <FormStepPill number="2" label="Bank" />
              <FormStepPill number="3" label="Documents" />
              <FormStepPill number="4" label="Address" />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white p-2 text-[#65718b] shadow-sm hover:bg-[#f3f6ff]"
            aria-label="Close"
            disabled={submitting}
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 overflow-y-auto px-6 py-5">
          {/* Business identity */}
          <FormSectionCard
            number="1"
            title="Business Identity"
            subtitle="These details are shown to admin during organization approval."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldRow label="Legal Business Name" required>
                <input
                  className={onboardingInputCls}
                  value={form.legalBusinessName}
                  onChange={(e) => onChange("legalBusinessName", e.target.value)}
                  placeholder="As on PAN / GST certificate"
                />
              </FieldRow>
              <FieldRow label="Store / Display Name" required>
                <input
                  className={onboardingInputCls}
                  value={form.storeDisplayName}
                  onChange={(e) => onChange("storeDisplayName", e.target.value)}
                  placeholder="Visible to customers"
                />
              </FieldRow>
              <FieldRow label="Business Type">
                <select
                  className={onboardingInputCls}
                  value={form.businessType}
                  onChange={(e) => onChange("businessType", e.target.value)}
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>{labelize(t)}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="Primary Contact Name" required>
                <input
                  className={onboardingInputCls}
                  value={form.primaryContactName}
                  onChange={(e) => onChange("primaryContactName", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="Support Email" required>
                <input
                  type="email"
                  className={onboardingInputCls}
                  value={form.supportEmail}
                  onChange={(e) => onChange("supportEmail", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="Support Phone" required>
                <input
                  className={onboardingInputCls}
                  value={form.supportPhone}
                  onChange={(e) => onChange("supportPhone", e.target.value)}
                  maxLength={15}
                />
              </FieldRow>
              <FieldRow label="Registration Number">
                <input
                  className={onboardingInputCls}
                  value={form.registrationNumber}
                  onChange={(e) => onChange("registrationNumber", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="GSTIN" required>
                <input
                  className={onboardingInputCls}
                  value={form.gstin}
                  onChange={(e) => onChange("gstin", e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </FieldRow>
              <FieldRow label="PAN" required>
                <input
                  className={onboardingInputCls}
                  value={form.pan}
                  onChange={(e) => onChange("pan", e.target.value.toUpperCase())}
                  placeholder="AAAAA0000A"
                  maxLength={10}
                />
              </FieldRow>
              <FieldRow label="Aadhaar Number" required>
                <input
                  className={onboardingInputCls}
                  value={form.aadhaarNumber}
                  onChange={(e) => onChange("aadhaarNumber", e.target.value.replace(/\D/g, ""))}
                  maxLength={12}
                />
              </FieldRow>
              <FieldRow label="Date of Birth" required>
                <input
                  type="date"
                  className={onboardingInputCls}
                  value={form.dateOfBirth}
                  onChange={(e) => onChange("dateOfBirth", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="Business Website">
                <input
                  type="url"
                  className={onboardingInputCls}
                  value={form.businessWebsite}
                  onChange={(e) => onChange("businessWebsite", e.target.value)}
                  placeholder="https://example.com"
                />
              </FieldRow>
              <FieldRow label="Business Description">
                <textarea
                  className={`${onboardingInputCls} min-h-[76px] py-2 md:col-span-2`}
                  value={form.description}
                  onChange={(e) => onChange("description", e.target.value)}
                  rows={3}
                />
              </FieldRow>
            </div>
          </FormSectionCard>

          {/* Bank details */}
          <FormSectionCard
            number="2"
            title="Bank Details"
            subtitle="Payouts for this organization will use this bank account after verification."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldRow label="Account Holder Name" required>
                <input
                  className={onboardingInputCls}
                  value={form.bankDetails.accountHolderName}
                  onChange={(e) => onNestedChange("bankDetails", "accountHolderName", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="Account Number" required>
                <input
                  className={onboardingInputCls}
                  value={form.bankDetails.accountNumber}
                  onChange={(e) => onNestedChange("bankDetails", "accountNumber", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="IFSC Code" required>
                <input
                  className={onboardingInputCls}
                  value={form.bankDetails.ifscCode}
                  onChange={(e) => onNestedChange("bankDetails", "ifscCode", e.target.value.toUpperCase())}
                  maxLength={11}
                />
              </FieldRow>
              <FieldRow label="Bank Name" required>
                <input
                  className={onboardingInputCls}
                  value={form.bankDetails.bankName}
                  onChange={(e) => onNestedChange("bankDetails", "bankName", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="Branch Name">
                <input
                  className={onboardingInputCls}
                  value={form.bankDetails.branchName}
                  onChange={(e) => onNestedChange("bankDetails", "branchName", e.target.value)}
                />
              </FieldRow>
            </div>
          </FormSectionCard>

          <FormSectionCard
            number="3"
            title="KYC & Compliance Documents"
            subtitle="Upload PDF, JPG, PNG, or WebP files. Every organization is verified independently."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {ORGANIZATION_DOCUMENTS.map(([key, label]) => {
                const document = form.documents?.[key];
                const existingUrl = typeof document === "string" ? document : "";
                return (
                  <FieldRow key={key} label={label} required>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className={`${onboardingInputCls} py-2`}
                      onChange={(event) => onDocumentChange(key, event.target.files?.[0])}
                    />
                    {document && (
                      <span className="text-[11px] text-[#65718b]">
                        {existingUrl ? (
                          <a href={existingUrl} target="_blank" rel="noreferrer" className="text-[#2f6fed] hover:underline">
                            View uploaded document
                          </a>
                        ) : (
                          document.fileName || "Selected"
                        )}
                      </span>
                    )}
                  </FieldRow>
                );
              })}
            </div>
          </FormSectionCard>

          {/* Addresses */}
          <FormSectionCard
            number="4"
            title="Business & Pickup Address"
            subtitle="Business address is used for verification. Pickup address is used for shipment collection."
          >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#E6E6E6] bg-[#fcfdff] p-4">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-[#202337]">
                  Business / Billing Address
                </h4>
                <p className="mt-1 text-xs text-[#65718b]">
                  This is the main business address admin will verify for approval.
                </p>
              </div>
              <div className="grid gap-3">
                <FieldRow label="Line 1" required>
                  <input className={onboardingInputCls} value={form.billingAddress.line1} onChange={(e) => onNestedChange("billingAddress", "line1", e.target.value)} />
                </FieldRow>
                <FieldRow label="Line 2">
                  <input className={onboardingInputCls} value={form.billingAddress.line2} onChange={(e) => onNestedChange("billingAddress", "line2", e.target.value)} />
                </FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="City" required>
                    <input className={onboardingInputCls} value={form.billingAddress.city} onChange={(e) => onNestedChange("billingAddress", "city", e.target.value)} />
                  </FieldRow>
                  <FieldRow label="State" required>
                    <input className={onboardingInputCls} value={form.billingAddress.state} onChange={(e) => onNestedChange("billingAddress", "state", e.target.value)} />
                  </FieldRow>
                </div>
                <FieldRow label="Pincode" required>
                  <input className={onboardingInputCls} value={form.billingAddress.postalCode} onChange={(e) => onNestedChange("billingAddress", "postalCode", e.target.value)} maxLength={6} />
                </FieldRow>
              </div>
            </div>

            <div className="rounded-xl border border-[#E6E6E6] bg-[#fcfdff] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-[#202337]">Pickup Address</h4>
                  <p className="mt-1 text-xs text-[#65718b]">
                    Used for shipment pickup. You can copy from business address.
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-[#bfdbfe] bg-[#eff6ff] px-3 py-1.5 text-xs font-medium text-[#1e40af] hover:bg-[#dbeafe]"
                  onClick={() => {
                    onNestedChange("pickupAddress", "line1", form.billingAddress.line1);
                    onNestedChange("pickupAddress", "line2", form.billingAddress.line2);
                    onNestedChange("pickupAddress", "city", form.billingAddress.city);
                    onNestedChange("pickupAddress", "state", form.billingAddress.state);
                    onNestedChange("pickupAddress", "postalCode", form.billingAddress.postalCode);
                    onNestedChange("pickupAddress", "country", form.billingAddress.country);
                  }}
                >
                  Same as business
                </button>
              </div>
              <div className="grid gap-3">
                <FieldRow label="Line 1" required>
                  <input className={onboardingInputCls} value={form.pickupAddress.line1} onChange={(e) => onNestedChange("pickupAddress", "line1", e.target.value)} />
                </FieldRow>
                <FieldRow label="Line 2">
                  <input className={onboardingInputCls} value={form.pickupAddress.line2} onChange={(e) => onNestedChange("pickupAddress", "line2", e.target.value)} />
                </FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="City" required>
                    <input className={onboardingInputCls} value={form.pickupAddress.city} onChange={(e) => onNestedChange("pickupAddress", "city", e.target.value)} />
                  </FieldRow>
                  <FieldRow label="State" required>
                    <input className={onboardingInputCls} value={form.pickupAddress.state} onChange={(e) => onNestedChange("pickupAddress", "state", e.target.value)} />
                  </FieldRow>
                </div>
                <FieldRow label="Pincode" required>
                  <input className={onboardingInputCls} value={form.pickupAddress.postalCode} onChange={(e) => onNestedChange("pickupAddress", "postalCode", e.target.value)} maxLength={6} />
                </FieldRow>
              </div>
            </div>
          </div>
          </FormSectionCard>

          <p className="rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 text-xs text-[#1e40af]">
            Return address, invoice prefix, payout schedule, and tax settings will use safe defaults from your business/pickup details. You can manage extra settings after admin approval.
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-[#E6E6E6] bg-white px-6 py-4 sm:flex-row sm:justify-end">
          <PrimaryButton variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </PrimaryButton>
          <PrimaryButton variant="ghost" onClick={onSaveDraft} disabled={submitting}>
            {submitting ? "Saving..." : "Save Draft"}
          </PrimaryButton>
          <PrimaryButton onClick={onSubmit} disabled={submitting} icon={<MdCheckCircle size={18} />}>
            {submitting ? "Submitting..." : isEdit ? "Save & Submit" : "Submit for Review"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

// ─── Organization Card ────────────────────────────────────────────────────────

const OrgCard = ({ org, isActive, onEdit, onDelete, onSetDefault, onSwitch, submitting }) => {
  const id = orgId(org);
  const status = org.approvalStatus || "draft";
  const isApproved = isOrganizationLive(org);

  return (
    <div
      className={`rounded-lg border bg-white p-4 transition ${
        isActive
          ? "border-[#2f6fed] shadow-[0_0_0_2px_rgba(47,111,237,0.12)]"
          : "border-[#E6E6E6]"
      }`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#f3f6ff]">
            <MdBusiness size={20} className="text-[#2f6fed]" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[#202337]">{orgLabel(org)}</p>
            {org.legalBusinessName && org.legalBusinessName !== org.storeDisplayName && (
              <p className="truncate text-xs text-[#65718b]">{org.legalBusinessName}</p>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {org.isDefault && (
            <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-[10px] font-semibold text-[#2f6fed]">
              Default
            </span>
          )}
          {isActive && (
            <span className="rounded-full bg-[#effbf4] px-2 py-0.5 text-[10px] font-semibold text-[#208a3c]">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge status={status} dot size="sm" />
        {org.kycStatus && (
          <StatusBadge
            status={org.kycStatus}
            label={`KYC: ${labelize(org.kycStatus)}`}
            size="xs"
          />
        )}
        {org.bankVerificationStatus && (
          <StatusBadge
            status={org.bankVerificationStatus}
            label={`Bank: ${labelize(org.bankVerificationStatus)}`}
            size="xs"
          />
        )}
        {org.goLiveStatus && (
          <StatusBadge
            status={org.goLiveStatus}
            label={`Go Live: ${labelize(org.goLiveStatus)}`}
            size="xs"
          />
        )}
      </div>

      {/* Approval banner for non-approved */}
      {!isApproved && (
        <div className="mt-3">
          <ApprovalBanner org={org} />
        </div>
      )}

      {/* Details grid */}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-[#65718b]">GSTIN</p>
          <p className="font-medium text-[#202337]">{org.gstin || "—"}</p>
        </div>
        <div>
          <p className="text-[#65718b]">PAN</p>
          <p className="font-medium text-[#202337]">{org.pan || "—"}</p>
        </div>
        <div>
          <p className="text-[#65718b]">Business Type</p>
          <p className="font-medium text-[#202337]">{labelize(org.businessType || "—")}</p>
        </div>
        <div>
          <p className="text-[#65718b]">Payout Schedule</p>
          <p className="font-medium text-[#202337]">
            {labelize(org.payoutSettings?.payoutSchedule || "Weekly")}
          </p>
        </div>
        {org.bankDetails?.bankName && (
          <div className="col-span-2">
            <p className="text-[#65718b]">Bank</p>
            <p className="font-medium text-[#202337]">
              {org.bankDetails.bankName}
              {org.bankDetails.accountNumber
                ? ` · A/C ${org.bankDetails.accountNumber}`
                : ""}
            </p>
          </div>
        )}
        {org.billingAddress?.city && (
          <div className="col-span-2">
            <p className="text-[#65718b]">Billing</p>
            <p className="font-medium text-[#202337]">{formatAddress(org.billingAddress)}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#EEF1F6] pt-3">
        {!isApproved ? (
          <button
            type="button"
            onClick={() => onEdit(org)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E6E6E6] bg-white px-3 py-1.5 text-xs font-medium text-[#202337] transition hover:border-[#2f6fed] hover:text-[#2f6fed] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdEdit size={14} />
            {status === "rejected" || status === "blocked" ? "Correct & Resubmit" : "Edit"}
          </button>
        ) : (
          <span className="rounded-md border border-[#E6E6E6] px-3 py-1.5 text-xs font-medium text-[#65718b]">
            Legal details locked
          </span>
        )}
        {!org.isDefault && isApproved && (
          <button
            type="button"
            onClick={() => onSetDefault(id)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E6E6E6] bg-white px-3 py-1.5 text-xs font-medium text-[#202337] transition hover:border-[#2f6fed] hover:text-[#2f6fed] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdOutlineSwapHoriz size={14} />
            Set as Default
          </button>
        )}
        {status === "draft" && (
          <button
            type="button"
            onClick={() => onDelete(org)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#fecaca] bg-[#fff1f0] px-3 py-1.5 text-xs font-medium text-[#b42318] transition hover:bg-[#fee2e2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdDeleteOutline size={14} />
            Delete Draft
          </button>
        )}
        <button
          type="button"
          onClick={() => onSwitch(org)}
          disabled={submitting || (isApproved && isActive)}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
            isApproved
              ? "border border-[#2f6fed] bg-[#eff6ff] text-[#1e40af] hover:bg-[#dbeafe]"
              : "border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] hover:bg-[#ffedd5]"
          }`}
        >
          <MdOutlineSwapHoriz size={14} />
          {isApproved ? (isActive ? "Active Organization" : "Switch to this org") : "Waiting for approval"}
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const MyOrganizations = ({ onboardingMode = false }) => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: "create", org: null });
  const [approvalPopupOrg, setApprovalPopupOrg] = useState(null);
  const [activeOrgId, setActiveOrgId] = useState(getSelectedSellerOrganizationId());
  const [sellerDefaults, setSellerDefaults] = useState({});
  const [form, setForm] = useState(createEmptyForm());
  const onboardingToken = onboardingMode
    ? localStorage.getItem("sellerOnboardingToken")
    : null;
  const organizationsEndpoint = onboardingMode
    ? ENDPOINTS.sellers.onboardingOrganizations
    : ENDPOINTS.sellers.myOrganizations;
  const organizationEndpoint = (id) =>
    onboardingMode
      ? ENDPOINTS.sellers.onboardingOrganization(id)
      : ENDPOINTS.sellers.myOrganization(id);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest(
        "GET",
        organizationsEndpoint,
        { limit: 50 },
        "json",
        onboardingToken,
      );
      const list = unwrapList(response);
      setOrganizations(list);
      const stored = getSelectedSellerOrganizationId();
      const storedOrganization = list.find((organization) => String(orgId(organization)) === String(stored));
      if (stored && storedOrganization && !isOrganizationLive(storedOrganization)) {
        const fallback = list.find((organization) => organization.isDefault && isOrganizationLive(organization)) ||
          list.find(isOrganizationLive);
        const nextId = fallback ? orgId(fallback) : "";
        setSelectedSellerOrganizationId(nextId);
        setActiveOrgId(nextId);
      } else {
        setActiveOrgId(stored);
      }
    } catch (error) {
      toast.error(error?.message || "Failed to load your organizations");
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [onboardingToken, organizationsEndpoint]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    let active = true;
    const loadSellerDefaults = async () => {
      try {
        const response = await apiRequest(
          "GET",
          onboardingMode ? ENDPOINTS.auth.status : ENDPOINTS.auth.me,
          {},
          "json",
          onboardingToken,
        );
        if (active) setSellerDefaults(extractSellerDefaults(response));
      } catch {
        if (active) setSellerDefaults({});
      }
    };
    loadSellerDefaults();
    return () => {
      active = false;
    };
  }, [onboardingMode, onboardingToken]);

  useEffect(() => {
    if (!modal.open || modal.mode !== "create") return;
    const hasAnyValue = [
      form.legalBusinessName,
      form.storeDisplayName,
      form.supportEmail,
      form.supportPhone,
      form.primaryContactName,
      form.billingAddress?.line1,
      form.pickupAddress?.line1,
    ].some((value) => cleanString(value));
    if (!hasAnyValue && Object.keys(sellerDefaults || {}).length > 0) {
      setForm(applyDefaultsToForm(sellerDefaults));
    }
  }, [form, modal.mode, modal.open, sellerDefaults]);

  useEffect(() => {
    const handleOrganizationChanged = (event) => {
      setActiveOrgId(event.detail?.organizationId || getSelectedSellerOrganizationId());
    };
    window.addEventListener("seller:organizationChanged", handleOrganizationChanged);
    return () => {
      window.removeEventListener("seller:organizationChanged", handleOrganizationChanged);
    };
  }, []);

  const openCreate = () => {
    setForm(applyDefaultsToForm(sellerDefaults));
    setModal({ open: true, mode: "create", org: null });
  };

  const openEdit = (org) => {
    setForm(normalizeForEdit(org));
    setModal({ open: true, mode: "edit", org });
  };

  const closeModal = () => {
    if (submitting) return;
    setModal({ open: false, mode: "create", org: null });
  };

  const updateForm = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateNestedForm = (section, key, value) =>
    setForm((prev) => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [key]: value },
    }));

  const handleDocumentChange = async (key, file) => {
    if (!file) return;
    try {
      const document = await readDocument(file);
      updateNestedForm("documents", key, document);
    } catch (error) {
      toast.error(error?.message || "Failed to read document");
    }
  };

  const saveOrganization = async (submissionAction) => {
    if (submissionAction === "submit") {
      const error = validateForm(form);
      if (error) {
        toast.error(error);
        return;
      }
    }
    try {
      setSubmitting(true);
      const payload = {
        ...buildPayload(form),
        submissionAction,
      };
      if (modal.mode === "edit") {
        const id = orgId(modal.org);
        await apiRequest(
          "PATCH",
          organizationEndpoint(id),
          payload,
          "json",
          onboardingToken,
        );
        toast.success(
          submissionAction === "draft"
            ? "Organization draft saved"
            : "Organization submitted for review",
        );
      } else {
        await apiRequest(
          "POST",
          organizationsEndpoint,
          payload,
          "json",
          onboardingToken,
        );
        toast.success(
          submissionAction === "draft"
            ? "Organization draft saved"
            : "Organization submitted for review",
        );
      }
      setModal({ open: false, mode: "create", org: null });
      await loadOrganizations();
    } catch (error) {
      toast.error(error?.message || "Failed to save organization");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => saveOrganization("submit");
  const handleSaveDraft = () => saveOrganization("draft");

  const handleSetDefault = async (id) => {
    try {
      setSubmitting(true);
      await apiRequest("PATCH", ENDPOINTS.sellers.myOrganizationDefault(id), {});
      setSelectedSellerOrganizationId(id);
      toast.success("Default organization updated");
      await loadOrganizations();
    } catch (error) {
      toast.error(error?.message || "Failed to set default organization");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDraft = async (org) => {
    if ((org.approvalStatus || "draft") !== "draft") {
      toast.error("Only draft organizations can be deleted");
      return;
    }
    const name = orgLabel(org);
    if (!window.confirm(`Delete draft organization "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      setSubmitting(true);
      await apiRequest(
        "DELETE",
        organizationEndpoint(orgId(org)),
        {},
        "json",
        onboardingToken,
      );
      if (String(activeOrgId) === String(orgId(org))) {
        setSelectedSellerOrganizationId("");
        setActiveOrgId("");
      }
      toast.success("Draft organization deleted");
      await loadOrganizations();
    } catch (error) {
      toast.error(error?.message || "Failed to delete draft organization");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchOrganization = (org) => {
    if (!isOrganizationLive(org)) {
      setApprovalPopupOrg(org);
      return;
    }
    const id = orgId(org);
    setSelectedSellerOrganizationId(id);
    setActiveOrgId(id);
    toast.success(`${orgLabel(org)} is now active`);
    window.setTimeout(() => window.location.reload(), 0);
  };

  const approvedCount = organizations.filter(
    isOrganizationLive,
  ).length;
  const pendingCount = organizations.filter(
    (o) => o.approvalStatus === "pending_review" || o.approvalStatus === "resubmitted",
  ).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Organizations"
        subtitle="Manage your seller organizations. Each organization has its own GST, bank account, and approval."
        count={organizations.length}
        breadcrumbs={[{ label: "Users & Access" }, { label: "My Organizations" }]}
        actions={
          <>
            <PrimaryButton
              variant="ghost"
              onClick={loadOrganizations}
              disabled={loading}
              icon={<MdRefresh size={18} />}
            >
              Refresh
            </PrimaryButton>
            <PrimaryButton onClick={openCreate} icon={<MdAdd size={18} />}>
              Add Organization
            </PrimaryButton>
          </>
        }
      />

      {/* Summary chips */}
      {organizations.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#E6E6E6] bg-white px-4 py-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-[#208a3c]" />
            <span className="font-medium text-[#202337]">{approvedCount}</span>
            <span className="text-[#65718b]">Approved</span>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-4 py-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-[#b45309]" />
              <span className="font-medium text-[#202337]">{pendingCount}</span>
              <span className="text-[#65718b]">Pending Review</span>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-[#E6E6E6] bg-white px-4 py-2 text-sm">
            <span className="text-[#65718b]">Active switcher:</span>
            <span className="font-medium text-[#202337]">
              {activeOrgId
                ? (orgLabel(organizations.find((o) => orgId(o) === activeOrgId) || {}) || "Unknown")
                : "All Organizations"}
            </span>
          </div>
        </div>
      )}

      {/* Org switcher info */}
      <div className="flex items-start gap-3 rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 text-sm">
        <MdOutlineSwapHoriz size={18} className="mt-0.5 flex-shrink-0 text-[#2f6fed]" />
        <div>
          <p className="font-semibold text-[#1e40af]">Organization Switcher</p>
          <p className="mt-0.5 text-[#3b82f6]">
            {onboardingMode
              ? "Complete or correct an organization below. Dashboard access starts when at least one organization is approved and live."
              : "Use the dropdown in the top header to switch between organizations. All product listings, orders, commissions, and reports will filter to the selected organization."}
          </p>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="rounded-lg border border-[#E6E6E6] bg-white px-4 py-12 text-center text-sm text-[#65718b]">
          Loading your organizations...
        </div>
      ) : organizations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#d0d5dd] bg-white px-6 py-12 text-center">
          <MdBusiness size={36} className="mx-auto mb-3 text-[#d0d5dd]" />
          <p className="font-medium text-[#202337]">No organizations yet</p>
          <p className="mt-1 text-sm text-[#65718b]">
            Add your first organization to start selling. Your details will be reviewed by
            our team before approval.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#2f6fed] px-5 py-2 text-sm font-medium text-white hover:bg-[#245ed5]"
          >
            <MdAdd size={16} />
            Add Organization
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {organizations.map((org) => (
            <OrgCard
              key={orgId(org)}
              org={org}
              isActive={orgId(org) === activeOrgId}
              onEdit={openEdit}
              onDelete={handleDeleteDraft}
              onSetDefault={handleSetDefault}
              onSwitch={handleSwitchOrganization}
              submitting={submitting}
            />
          ))}
        </div>
      )}

      <OrgFormModal
        open={modal.open}
        mode={modal.mode}
        form={form}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        onChange={updateForm}
        onNestedChange={updateNestedForm}
        onDocumentChange={handleDocumentChange}
      />
      <ApprovalRequiredModal
        org={approvalPopupOrg}
        onClose={() => setApprovalPopupOrg(null)}
        onEdit={openEdit}
      />
    </div>
  );
};

export default MyOrganizations;
