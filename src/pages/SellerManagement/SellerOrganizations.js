import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MdBlock,
  MdCheckCircle,
  MdClose,
  MdEdit,
  MdRefresh,
  MdVerifiedUser,
  MdAccountBalance,
  MdRocketLaunch,
  MdSearch,
  MdVisibility,
} from "react-icons/md";
import { PageHeader, StatusBadge } from "../../components/Shared";
import { apiRequest } from "../../_helpers/apiConfig";
import { dropdownApi } from "../../_helpers/dropdownApi";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { getStoredRole, normalizeRole } from "../../_helpers/authStorage";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const BANK_ACCOUNT_REGEX = /^[0-9]{9,18}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10,15}$/;

const APPROVAL_STATUSES = ["draft", "pending_review", "resubmitted", "approved", "rejected", "suspended", "blocked", "active"];
const KYC_STATUSES = ["not_submitted", "submitted", "under_review", "verified", "rejected"];
const BANK_STATUSES = ["not_submitted", "submitted", "verified", "rejected"];
const GO_LIVE_STATUSES = ["pending", "ready", "live", "blocked", "rejected"];
const BUSINESS_TYPES = ["individual", "proprietorship", "partnership", "private_limited", "llp", "public_limited"];
const PAYOUT_SCHEDULES = ["daily", "weekly", "biweekly", "monthly"];
const ORGANIZATION_DOCUMENTS = [
  ["panDocumentUrl", "PAN"],
  ["gstCertificateUrl", "GST Certificate"],
  ["aadhaarFrontUrl", "Aadhaar Front"],
  ["aadhaarBackUrl", "Aadhaar Back"],
  ["bankProofUrl", "Bank Proof"],
  ["addressProofUrl", "Address Proof"],
  ["udyogAadhaarDocumentUrl", "Udhyog Aadhaar"],
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

const createEmptyForm = (sellerId = "") => ({
  sellerId,
  legalBusinessName: "",
  storeDisplayName: "",
  businessType: "proprietorship",
  description: "",
  supportEmail: "",
  supportPhone: "",
  udyogAadhaarNumber: "",
  gstin: "",
  pan: "",
  aadhaarNumber: "",
  dateOfBirth: "",
  businessWebsite: "",
  primaryContactName: "",
  documents: {},
  existingDocuments: {},
  kycStatus: "submitted",
  bankVerificationStatus: "submitted",
  approvalStatus: "pending_review",
  goLiveStatus: "pending",
  rejectionReason: "",
  requiredChanges: [],
  isDefault: false,
  bankDetails: { ...emptyBankDetails },
  billingAddress: { ...emptyAddress },
  pickupAddress: { ...emptyAddress },
  returnAddress: { ...emptyAddress },
  taxSettings: {},
  invoiceSettings: {},
  payoutSettings: {},
  taxState: "",
  invoicePrefix: "INV",
  invoiceSeries: "",
  payoutSchedule: "weekly",
});

const inputCls =
  "min-h-[38px] rounded-md border border-[#E6E6E6] px-3 text-sm outline-none focus:border-[#2f6fed] disabled:bg-[#f8faff] disabled:text-[#8a93a5]";
const inputErrCls =
  "min-h-[38px] rounded-md border border-red-400 bg-red-50/30 px-3 text-sm outline-none focus:border-red-500 disabled:bg-[#f8faff] disabled:text-[#8a93a5]";
const inputClass = (error) => (error ? inputErrCls : inputCls);

const unwrapList = (response = {}) => {
  const data = response?.data;
  if (Array.isArray(data)) {
    return { items: data, total: Number(response?.meta?.total ?? data.length) };
  }
  const root = data?.data || data || response || {};
  const items = root.items || root.list || root.rows || [];
  return {
    items: Array.isArray(items) ? items : [],
    total: Number(root.total ?? response?.meta?.total ?? items.length ?? 0),
  };
};

const shortId = (value = "") => {
  const text = String(value || "");
  return text.length > 14 ? `${text.slice(0, 8)}...${text.slice(-4)}` : text || "-";
};

const labelize = (value = "") =>
  String(value || "-")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getSellerLabel = (sellerId, sellers = []) =>
  sellers.find((seller) => String(seller.value) === String(sellerId))?.label || shortId(sellerId);

const getOrganizationSellerLabel = (organization = {}, sellers = []) =>
  organization.seller?.displayName ||
  organization.seller?.email ||
  getSellerLabel(organization.sellerId, sellers);

const formatAddress = (address = {}) =>
  [address.line1, address.city, address.state, address.postalCode].filter(Boolean).join(", ") || "-";

const organizationLabel = (organization = {}) =>
  organization.storeDisplayName || organization.legalBusinessName || shortId(organization.id || organization.organizationId);

const canOperateOrganization = (organization = {}) =>
  organization.canOperate === true ||
  organization.canSell === true ||
  (
    ["approved", "active"].includes(organization.approvalStatus) &&
    organization.kycStatus === "verified" &&
    organization.bankVerificationStatus === "verified" &&
    !["blocked", "rejected"].includes(String(organization.goLiveStatus || ""))
  );

const REQUIRED_FIELD_CHECKS = [
  ["legalBusinessName", (organization) => organization.legalBusinessName],
  ["storeDisplayName", (organization) => organization.storeDisplayName],
  ["businessType", (organization) => organization.businessType],
  ["supportEmail", (organization) => organization.supportEmail],
  ["supportPhone", (organization) => organization.supportPhone],
  ["primaryContactName", (organization) => organization.primaryContactName],
  ["gstin", (organization) => organization.gstin],
  ["pan", (organization) => organization.pan],
  ["aadhaarNumber", (organization) => organization.aadhaarNumber],
  ["dateOfBirth", (organization) => organization.dateOfBirth],
  ["billingAddress.line1", (organization) => organization.billingAddress?.line1],
  ["billingAddress.city", (organization) => organization.billingAddress?.city],
  ["billingAddress.state", (organization) => organization.billingAddress?.state],
  ["billingAddress.postalCode", (organization) => organization.billingAddress?.postalCode],
  ["pickupAddress.line1", (organization) => organization.pickupAddress?.line1],
  ["pickupAddress.city", (organization) => organization.pickupAddress?.city],
  ["pickupAddress.state", (organization) => organization.pickupAddress?.state],
  ["pickupAddress.postalCode", (organization) => organization.pickupAddress?.postalCode],
  ["bankDetails.accountHolderName", (organization) => organization.bankDetails?.accountHolderName],
  ["bankDetails.accountNumber", (organization) => organization.bankDetails?.accountNumber],
  ["bankDetails.ifscCode", (organization) => organization.bankDetails?.ifscCode],
  ["bankDetails.bankName", (organization) => organization.bankDetails?.bankName],
  ...ORGANIZATION_DOCUMENTS
    .filter(([key]) => key !== "udyogAadhaarDocumentUrl")
    .map(([key]) => [`documents.${key}`, (organization) => organization.documents?.[key]]),
];

const getMissingRequiredFields = (organization = {}) => {
  if (Array.isArray(organization.missingRequiredFields)) return organization.missingRequiredFields;
  return REQUIRED_FIELD_CHECKS
    .filter(([, getter]) => !cleanString(getter(organization)))
    .map(([field]) => field);
};

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

const detectDocumentMimeType = (bytes) => {
  if (!bytes?.length) return "";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return "";
};

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return window.btoa(binary);
};

const readDocument = async (file) => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const mimeType = detectDocumentMimeType(bytes) || String(file.type || "").toLowerCase();
  const base64 = arrayBufferToBase64(buffer);
  return {
    dataUri: `data:${mimeType};base64,${base64}`,
    fileName: file.name,
    mimeType,
  };
};

const normalizeForEdit = (organization = {}) => {
  const invoiceSettings = organization.invoiceSettings || {};
  const taxSettings = organization.taxSettings || {};
  const payoutSettings = organization.payoutSettings || {};

  return {
    ...createEmptyForm(organization.sellerId || ""),
    legalBusinessName: organization.legalBusinessName || "",
    storeDisplayName: organization.storeDisplayName || "",
    businessType: organization.businessType || "proprietorship",
    description: organization.description || "",
    supportEmail: organization.supportEmail || "",
    supportPhone: organization.supportPhone || "",
    udyogAadhaarNumber: organization.metadata?.udyogAadhaarNumber || organization.udyogAadhaarNumber || "",
    gstin: organization.gstin || "",
    pan: organization.pan || "",
    aadhaarNumber: organization.aadhaarNumber || "",
    dateOfBirth: organization.dateOfBirth ? String(organization.dateOfBirth).slice(0, 10) : "",
    businessWebsite: organization.businessWebsite || "",
    primaryContactName: organization.primaryContactName || "",
    documents: {},
    existingDocuments: { ...(organization.documents || organization.kycDocuments || {}) },
    kycStatus: organization.kycStatus || "submitted",
    bankVerificationStatus: organization.bankVerificationStatus || "submitted",
    approvalStatus: organization.approvalStatus || "pending_review",
    goLiveStatus: organization.goLiveStatus || "pending",
    rejectionReason: organization.rejectionReason || organization.metadata?.lastVerificationEvent?.rejectionReason || "",
    requiredChanges: organization.requiredChanges || [],
    isDefault: Boolean(organization.isDefault),
    bankDetails: { ...emptyBankDetails, ...(organization.bankDetails || {}) },
    billingAddress: { ...emptyAddress, ...(organization.billingAddress || {}) },
    pickupAddress: { ...emptyAddress, ...(organization.pickupAddress || {}) },
    returnAddress: { ...emptyAddress, ...(organization.returnAddress || {}) },
    taxSettings,
    invoiceSettings,
    payoutSettings,
    taxState: taxSettings.state || organization.billingAddress?.state || "",
    invoicePrefix: invoiceSettings.invoicePrefix || "INV",
    invoiceSeries: invoiceSettings.invoiceSeries || "",
    payoutSchedule: payoutSettings.payoutSchedule || "weekly",
  };
};

const cleanString = (value) => {
  const text = String(value || "").trim();
  return text || "";
};

const getBackendFieldErrors = (error = {}) => {
  const details = [
    error?.details,
    error?.error?.details?.fields,
    error?.error?.details,
    error?.fields,
  ].find(Array.isArray) || [];
  return details.reduce((result, detail) => {
    const path = Array.isArray(detail?.path) ? detail.path : [];
    const field = detail?.field || path[path.length - 1];
    if (field && detail?.message) result[field] = detail.message;
    return result;
  }, {});
};

const buildPayload = (form = {}) => {
  const billingState = cleanString(form.billingAddress?.state);
  const pickupState = cleanString(form.pickupAddress?.state);
  const taxState = cleanString(form.taxState) || billingState || pickupState;

  return {
    legalBusinessName: cleanString(form.legalBusinessName),
    storeDisplayName: cleanString(form.storeDisplayName),
    businessType: cleanString(form.businessType) || null,
    description: cleanString(form.description) || null,
    supportEmail: cleanString(form.supportEmail),
    supportPhone: cleanString(form.supportPhone),
    gstin: cleanString(form.gstin) || null,
    pan: cleanString(form.pan),
    aadhaarNumber: cleanString(form.aadhaarNumber),
    dateOfBirth: form.dateOfBirth || null,
    businessWebsite: cleanString(form.businessWebsite) || null,
    primaryContactName: cleanString(form.primaryContactName),
    documents: form.documents || {},
    metadata: {
      ...(form.metadata || {}),
      udyogAadhaarNumber: cleanString(form.udyogAadhaarNumber) || null,
    },
    kycStatus: form.kycStatus,
    bankVerificationStatus: form.bankVerificationStatus,
    approvalStatus: form.approvalStatus,
    goLiveStatus: form.goLiveStatus,
    rejectionReason: cleanString(form.rejectionReason) || null,
    requiredChanges: Array.isArray(form.requiredChanges) ? form.requiredChanges : [],
    isDefault: Boolean(form.isDefault),
    bankDetails: {
      ...form.bankDetails,
      accountHolderName: cleanString(form.bankDetails?.accountHolderName),
      accountNumber: cleanString(form.bankDetails?.accountNumber),
      ifscCode: cleanString(form.bankDetails?.ifscCode).toUpperCase(),
      bankName: cleanString(form.bankDetails?.bankName),
      branchName: cleanString(form.bankDetails?.branchName),
    },
    billingAddress: {
      ...emptyAddress,
      ...(form.billingAddress || {}),
      line1: cleanString(form.billingAddress?.line1),
      line2: cleanString(form.billingAddress?.line2),
      city: cleanString(form.billingAddress?.city),
      state: billingState,
      postalCode: cleanString(form.billingAddress?.postalCode),
      country: cleanString(form.billingAddress?.country) || "India",
    },
    pickupAddress: {
      ...emptyAddress,
      ...(form.pickupAddress || {}),
      line1: cleanString(form.pickupAddress?.line1),
      line2: cleanString(form.pickupAddress?.line2),
      city: cleanString(form.pickupAddress?.city),
      state: pickupState,
      postalCode: cleanString(form.pickupAddress?.postalCode),
      country: cleanString(form.pickupAddress?.country) || "India",
    },
    returnAddress: {
      ...emptyAddress,
      ...(form.returnAddress || {}),
      line1: cleanString(form.returnAddress?.line1),
      line2: cleanString(form.returnAddress?.line2),
      city: cleanString(form.returnAddress?.city),
      state: cleanString(form.returnAddress?.state),
      postalCode: cleanString(form.returnAddress?.postalCode),
      country: cleanString(form.returnAddress?.country) || "India",
    },
    taxSettings: {
      ...(form.taxSettings || {}),
      state: taxState,
      gstin: cleanString(form.gstin) || null,
      pan: cleanString(form.pan),
    },
    invoiceSettings: {
      ...(form.invoiceSettings || {}),
      invoicePrefix: cleanString(form.invoicePrefix) || "INV",
      invoiceSeries: cleanString(form.invoiceSeries),
      state: taxState,
    },
    payoutSettings: {
      ...(form.payoutSettings || {}),
      payoutSchedule: cleanString(form.payoutSchedule) || "weekly",
    },
  };
};

const validateForm = (form = {}) => {
  if (!cleanString(form.sellerId)) return "Seller is required";
  if (!cleanString(form.legalBusinessName)) return "Legal business name is required";
  if (!cleanString(form.storeDisplayName)) return "Store/display name is required";
  if (!cleanString(form.businessType)) return "Business type is required";
  if (!cleanString(form.primaryContactName)) return "Primary contact is required";

  const email = cleanString(form.supportEmail);
  if (!email) return "Support email is required";
  if (!EMAIL_REGEX.test(email)) return "Support email is invalid (e.g. seller@company.com)";

  const phone = cleanString(form.supportPhone);
  if (!phone) return "Support phone is required";
  if (!PHONE_REGEX.test(phone)) return "Support phone must be 10–15 digits";

  const gstin = cleanString(form.gstin);
  if (!gstin) return "GSTIN is required";
  if (!GST_REGEX.test(gstin)) return "GSTIN format invalid (e.g. 27ABCDE1234F1Z5)";

  const pan = cleanString(form.pan);
  if (!pan) return "PAN is required";
  if (!PAN_REGEX.test(pan)) return "PAN format invalid (e.g. ABCDE1234F)";

  const aadhaar = cleanString(form.aadhaarNumber);
  if (!aadhaar) return "Aadhaar number is required";
  if (!AADHAAR_REGEX.test(aadhaar)) return "Aadhaar must be exactly 12 digits";

  if (!cleanString(form.dateOfBirth)) return "Date of birth is required";

  const accountNumber = cleanString(form.bankDetails?.accountNumber);
  if (!cleanString(form.bankDetails?.accountHolderName)) return "Account holder name is required";
  if (!accountNumber) return "Bank account number is required";
  if (!BANK_ACCOUNT_REGEX.test(accountNumber)) return "Bank account number must be 9–18 digits";

  const ifsc = cleanString(form.bankDetails?.ifscCode);
  if (!ifsc) return "IFSC code is required";
  if (!IFSC_REGEX.test(ifsc)) return "IFSC format invalid (e.g. ABCD0123456)";

  if (!cleanString(form.bankDetails?.bankName)) return "Bank name is required";

  if (!cleanString(form.billingAddress?.line1)) return "Billing address line 1 is required";
  if (!cleanString(form.billingAddress?.city)) return "Billing city is required";
  if (!cleanString(form.billingAddress?.state)) return "Billing state is required";
  const billingPin = cleanString(form.billingAddress?.postalCode);
  if (!billingPin) return "Billing pincode is required";
  if (billingPin.length < 5 || billingPin.length > 10) return "Billing pincode must be 5–10 characters";

  if (!cleanString(form.pickupAddress?.line1)) return "Pickup address line 1 is required";
  if (!cleanString(form.pickupAddress?.city)) return "Pickup city is required";
  if (!cleanString(form.pickupAddress?.state)) return "Pickup state is required";
  const pickupPin = cleanString(form.pickupAddress?.postalCode);
  if (!pickupPin) return "Pickup pincode is required";
  if (pickupPin.length < 5 || pickupPin.length > 10) return "Pickup pincode must be 5–10 characters";

  const missingDocument = ORGANIZATION_DOCUMENTS.find(
    ([key]) => key !== "udyogAadhaarDocumentUrl" && !form.documents?.[key] && !form.existingDocuments?.[key],
  );
  return missingDocument ? `${missingDocument[1]} document is required` : "";
};

const FieldRow = ({ label, hint, error, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-[#65718b]">{label}</label>
    {children}
    {error ? <p className="text-[11px] font-medium text-red-500">{error}</p> : null}
    {!error && hint ? <p className="text-[11px] text-[#8a93a5]">{hint}</p> : null}
  </div>
);

const IconButton = ({ title, icon, onClick, disabled = false, tone = "blue" }) => {
  const tones = {
    blue: "text-[#2f6fed] hover:bg-[#f3f6ff]",
    green: "text-[#208a3c] hover:bg-[#effbf4]",
    amber: "text-[#a56300] hover:bg-[#fff7e8]",
    red: "text-[#d92d20] hover:bg-[#fff1f0]",
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${tones[tone] || tones.blue} disabled:cursor-not-allowed disabled:opacity-40`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
    </button>
  );
};

const PrimaryButton = ({ children, icon, onClick, disabled = false, variant = "primary" }) => {
  const cls = "flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors";
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

const DetailField = ({ label, value, mono = false }) => (
  <div className="min-w-0">
    <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8a93a5]">{label}</div>
    <div className={`mt-1 break-words text-sm text-[#202337] ${mono ? "font-mono text-xs" : ""}`}>
      {value || "-"}
    </div>
  </div>
);

const OrganizationDetailModal = ({ open, organization, sellers = [], onClose }) => {
  if (!open || !organization) return null;
  const documents = organization.documents || {};
  const udyogAadhaarNumber = organization.metadata?.udyogAadhaarNumber || organization.udyogAadhaarNumber || "";
  const missingFields = getMissingRequiredFields(organization);
  const canOperate = canOperateOrganization(organization);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E6E6E6] px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-[#202337]">
              {organizationLabel(organization)}
            </h3>
            <p className="mt-1 text-sm text-[#65718b]">
              {organization.legalBusinessName || "Seller organization details"}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#65718b] transition hover:bg-[#f3f6ff]"
            onClick={onClose}
            aria-label="Close details"
          >
            <MdClose size={20} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-78px)] overflow-y-auto p-5">
          <div className="mb-5 flex flex-wrap gap-2">
            <StatusBadge status={canOperate ? "approved" : "draft"} label={canOperate ? "Can sell" : "Not approved"} dot size="sm" />
            <StatusBadge status={organization.approvalStatus || "draft"} dot size="sm" />
            <StatusBadge status={organization.kycStatus || "not_submitted"} label={`KYC ${labelize(organization.kycStatus || "not_submitted")}`} size="xs" />
            <StatusBadge status={organization.bankVerificationStatus || "not_submitted"} label={`Bank ${labelize(organization.bankVerificationStatus || "not_submitted")}`} size="xs" />
            <StatusBadge status={organization.goLiveStatus || "pending"} label={`Go Live ${labelize(organization.goLiveStatus || "pending")}`} size="xs" />
            {organization.isDefault ? <StatusBadge status="active" label="Default" size="xs" /> : null}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[#202337]">Business</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailField label="Seller" value={getOrganizationSellerLabel(organization, sellers)} />
                <DetailField label="Seller ID" value={organization.sellerId} mono />
                <DetailField label="Organization ID" value={organization.id || organization.organizationId} mono />
                <DetailField label="Business Type" value={labelize(organization.businessType)} />
                <DetailField label="Primary Contact" value={organization.primaryContactName} />
                <DetailField label="Support Email" value={organization.supportEmail} />
                <DetailField label="Support Phone" value={organization.supportPhone} />
                <DetailField label="Website" value={organization.businessWebsite} />
              </div>
            </section>

            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[#202337]">Identity</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailField label="GSTIN" value={organization.gstin} mono />
                <DetailField label="PAN" value={organization.pan} mono />
                <DetailField label="Aadhaar" value={organization.aadhaarNumber} mono />
                <DetailField label="Date of Birth" value={organization.dateOfBirth ? String(organization.dateOfBirth).slice(0, 10) : ""} />
                <DetailField label="Udhyog Aadhaar No." value={udyogAadhaarNumber} mono />
              </div>
            </section>

            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[#202337]">Bank</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailField label="Bank Name" value={organization.bankDetails?.bankName} />
                <DetailField label="Account Holder" value={organization.bankDetails?.accountHolderName} />
                <DetailField label="Account Number" value={organization.bankDetails?.accountNumber} mono />
                <DetailField label="IFSC" value={organization.bankDetails?.ifscCode} mono />
                <DetailField label="Branch" value={organization.bankDetails?.branchName} />
              </div>
            </section>

            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[#202337]">Addresses</h4>
              <div className="space-y-3">
                <DetailField label="Billing" value={formatAddress(organization.billingAddress)} />
                <DetailField label="Pickup" value={formatAddress(organization.pickupAddress)} />
                <DetailField label="Return" value={formatAddress(organization.returnAddress)} />
              </div>
            </section>
          </div>

          <section className="mt-5 rounded-lg border border-[#E6E6E6] p-4">
            <h4 className="mb-3 text-sm font-semibold text-[#202337]">Documents & Notes</h4>
            <div className="flex flex-wrap gap-2">
              {ORGANIZATION_DOCUMENTS.map(([key, label]) =>
                documents?.[key] ? (
                  <a
                    key={key}
                    href={documents[key]}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-[#dbe7ff] bg-[#f8faff] px-2.5 py-1.5 text-xs font-medium text-[#2f6fed] hover:underline"
                  >
                    {label}
                  </a>
                ) : null,
              )}
              {!ORGANIZATION_DOCUMENTS.some(([key]) => documents?.[key]) ? (
                <span className="text-sm text-[#65718b]">No documents uploaded</span>
              ) : null}
            </div>
            {missingFields.length ? (
              <div className="mt-4 rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-sm text-[#92400e]">
                <span className="font-semibold">Missing fields: </span>
                {missingFields.join(", ")}
              </div>
            ) : null}
            {organization.rejectionReason ? (
              <div className="mt-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-[#d92d20]">
                {organization.rejectionReason}
              </div>
            ) : null}
            {organization.description ? (
              <p className="mt-4 text-sm leading-6 text-[#65718b]">{organization.description}</p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
};

const ReviewActionModal = ({
  open,
  action,
  organization,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
  submitting,
}) => {
  if (!open || !organization) return null;
  const config = {
    resubmit: {
      title: "Request Resubmission",
      description: "Tell the seller what needs to be corrected before this organization can be approved.",
      label: "Required changes",
      confirm: "Request Resubmission",
      tone: "amber",
      requiresReason: true,
    },
    reject: {
      title: "Reject Organization",
      description: "This will reject the organization review. Add a clear rejection reason for the seller.",
      label: "Rejection reason",
      confirm: "Reject Organization",
      tone: "red",
      requiresReason: true,
    },
    block: {
      title: "Block Organization",
      description: "This will block the organization from selling until it is reviewed again.",
      label: "Internal note",
      confirm: "Block Organization",
      tone: "red",
      requiresReason: false,
    },
  }[action] || {};
  const confirmCls = config.tone === "red"
    ? "bg-[#d92d20] hover:bg-[#b42318]"
    : "bg-[#c47a00] hover:bg-[#a56300]";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E6E6E6] px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#202337]">{config.title}</h3>
            <p className="mt-1 text-sm text-[#65718b]">{organizationLabel(organization)}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#65718b] transition hover:bg-[#f3f6ff]"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            <MdClose size={20} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm leading-6 text-[#65718b]">{config.description}</p>
          <FieldRow label={config.label}>
            <textarea
              className={`${inputCls} min-h-[110px] py-2`}
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder={config.requiresReason ? "Enter reason..." : "Optional note..."}
              disabled={submitting}
            />
          </FieldRow>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#E6E6E6] px-5 py-3">
          <PrimaryButton variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </PrimaryButton>
          <button
            type="button"
            className={`inline-flex min-h-[38px] items-center rounded-md px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmCls}`}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Saving..." : config.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

const OrganizationModal = ({
  open,
  mode,
  organization,
  form,
  errors = {},
  sellerOptions,
  submitting,
  onClose,
  onSubmit,
  onChange,
  onNestedChange,
  onDocumentChange,
}) => {
  if (!open) return null;
  const isEdit = mode === "edit";
  const sellerLoginEmail = organization?.seller?.email || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-lg border border-[#E6E6E6] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E6E6E6] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#202337]">
            {isEdit ? "Edit Seller Organization" : "Add Seller Organization"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#65718b] hover:bg-[#f3f6ff]"
            aria-label="Close"
          >
            <MdClose size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FieldRow label="Seller" error={errors.sellerId}>
              <select
                className={inputClass(errors.sellerId)}
                value={form.sellerId}
                onChange={(event) => onChange("sellerId", event.target.value)}
                disabled={isEdit}
              >
                <option value="">Select seller</option>
                {sellerOptions.map((seller) => (
                  <option key={seller.value} value={seller.value}>{seller.label}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Business Type">
              <select className={inputCls} value={form.businessType} onChange={(event) => onChange("businessType", event.target.value)}>
                {BUSINESS_TYPES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Legal Business Name">
              <input className={inputCls} value={form.legalBusinessName} onChange={(event) => onChange("legalBusinessName", event.target.value)} />
            </FieldRow>
            <FieldRow label="Store / Display Name">
              <input className={inputCls} value={form.storeDisplayName} onChange={(event) => onChange("storeDisplayName", event.target.value)} />
            </FieldRow>
            <FieldRow label="GSTIN" error={errors.gstin}>
              <input className={inputClass(errors.gstin)} value={form.gstin} onChange={(event) => onChange("gstin", event.target.value.toUpperCase())} />
            </FieldRow>
            <FieldRow label="PAN" error={errors.pan}>
              <input className={inputClass(errors.pan)} value={form.pan} onChange={(event) => onChange("pan", event.target.value.toUpperCase())} />
            </FieldRow>
            <FieldRow label="Primary Contact">
              <input className={inputCls} value={form.primaryContactName} onChange={(event) => onChange("primaryContactName", event.target.value)} />
            </FieldRow>
            {isEdit && sellerLoginEmail && (
              <FieldRow label="Seller Account Email" hint="Login email — read only, not editable here">
                <input
                  type="email"
                  className={`${inputCls} bg-[#f8faff] text-[#65718b] cursor-not-allowed`}
                  value={sellerLoginEmail}
                  readOnly
                  disabled
                />
              </FieldRow>
            )}
            <FieldRow label="Organization Official Email" hint="Used for org support, invoices, and business communication">
              <input type="email" className={inputCls} value={form.supportEmail} onChange={(event) => onChange("supportEmail", event.target.value)} />
            </FieldRow>
            <FieldRow label="Support Phone">
              <input className={inputCls} value={form.supportPhone} onChange={(event) => onChange("supportPhone", event.target.value)} />
            </FieldRow>
            <FieldRow label="Udhyog Aadhaar Number" error={errors.udyogAadhaarNumber}>
              <input className={inputClass(errors.udyogAadhaarNumber)} value={form.udyogAadhaarNumber} onChange={(event) => onChange("udyogAadhaarNumber", event.target.value.toUpperCase())} />
            </FieldRow>
            <FieldRow label="Aadhaar Number" error={errors.aadhaarNumber}>
              <input className={inputClass(errors.aadhaarNumber)} value={form.aadhaarNumber} maxLength={12} onChange={(event) => onChange("aadhaarNumber", event.target.value.replace(/\D/g, ""))} />
            </FieldRow>
            <FieldRow label="Date of Birth">
              <input type="date" className={inputCls} value={form.dateOfBirth} onChange={(event) => onChange("dateOfBirth", event.target.value)} />
            </FieldRow>
            <FieldRow label="Business Website">
              <input type="url" className={inputCls} value={form.businessWebsite} onChange={(event) => onChange("businessWebsite", event.target.value)} />
            </FieldRow>
            <FieldRow label="Description">
              <textarea className={`${inputCls} min-h-[70px] py-2`} value={form.description} onChange={(event) => onChange("description", event.target.value)} />
            </FieldRow>
            <FieldRow label="Approval Status">
              <input className={inputCls} value={labelize(form.approvalStatus)} disabled />
            </FieldRow>
            <FieldRow label="KYC Status">
              <input className={inputCls} value={labelize(form.kycStatus)} disabled />
            </FieldRow>
            <FieldRow label="Bank Status">
              <input className={inputCls} value={labelize(form.bankVerificationStatus)} disabled />
            </FieldRow>
            <FieldRow label="Go Live Status">
              <input className={inputCls} value={labelize(form.goLiveStatus)} disabled />
            </FieldRow>
            <FieldRow label="Default Organization">
              <label className="flex min-h-[38px] items-center gap-2 rounded-md border border-[#E6E6E6] px-3 text-sm text-[#202337]">
                <input type="checkbox" checked={form.isDefault} onChange={(event) => onChange("isDefault", event.target.checked)} />
                Default for this seller
              </label>
            </FieldRow>
          </div>

          <section className="mt-5 rounded-lg border border-[#E6E6E6] p-4">
            <h4 className="mb-3 text-sm font-semibold text-[#202337]">Compliance Documents</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {ORGANIZATION_DOCUMENTS.map(([key, label]) => {
                const document = form.documents?.[key];
                const existingUrl = typeof document === "string" ? document : "";
                return (
                  <FieldRow key={key} label={label}>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className={`${inputCls} py-1.5`}
                      onChange={(event) => onDocumentChange(key, event.target.files?.[0])}
                    />
                    {document ? (
                      existingUrl ? (
                        <a className="text-xs text-[#2f6fed] hover:underline" href={existingUrl} target="_blank" rel="noreferrer">View document</a>
                      ) : (
                        <span className="text-xs text-[#65718b]">{document.fileName || "Selected"}</span>
                      )
                    ) : null}
                  </FieldRow>
                );
              })}
            </div>
          </section>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[#202337]">Bank Details</h4>
              <div className="grid gap-3">
                <FieldRow label="Account Holder">
                  <input className={inputCls} value={form.bankDetails.accountHolderName} onChange={(event) => onNestedChange("bankDetails", "accountHolderName", event.target.value)} />
                </FieldRow>
                <FieldRow label="Account Number">
                  <input className={inputCls} value={form.bankDetails.accountNumber} onChange={(event) => onNestedChange("bankDetails", "accountNumber", event.target.value)} />
                </FieldRow>
                <FieldRow label="IFSC">
                  <input className={inputCls} value={form.bankDetails.ifscCode} onChange={(event) => onNestedChange("bankDetails", "ifscCode", event.target.value.toUpperCase())} />
                </FieldRow>
                <FieldRow label="Bank Name">
                  <input className={inputCls} value={form.bankDetails.bankName} onChange={(event) => onNestedChange("bankDetails", "bankName", event.target.value)} />
                </FieldRow>
              </div>
            </section>

            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[#202337]">Billing Address</h4>
              <div className="grid gap-3">
                <FieldRow label="Line 1">
                  <input className={inputCls} value={form.billingAddress.line1} onChange={(event) => onNestedChange("billingAddress", "line1", event.target.value)} />
                </FieldRow>
                <FieldRow label="City">
                  <input className={inputCls} value={form.billingAddress.city} onChange={(event) => onNestedChange("billingAddress", "city", event.target.value)} />
                </FieldRow>
                <FieldRow label="State">
                  <input className={inputCls} value={form.billingAddress.state} onChange={(event) => onNestedChange("billingAddress", "state", event.target.value)} />
                </FieldRow>
                <FieldRow label="Pincode">
                  <input className={inputCls} value={form.billingAddress.postalCode} onChange={(event) => onNestedChange("billingAddress", "postalCode", event.target.value)} />
                </FieldRow>
              </div>
            </section>

            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[#202337]">Pickup Address</h4>
              <div className="grid gap-3">
                <FieldRow label="Line 1">
                  <input className={inputCls} value={form.pickupAddress.line1} onChange={(event) => onNestedChange("pickupAddress", "line1", event.target.value)} />
                </FieldRow>
                <FieldRow label="City">
                  <input className={inputCls} value={form.pickupAddress.city} onChange={(event) => onNestedChange("pickupAddress", "city", event.target.value)} />
                </FieldRow>
                <FieldRow label="State">
                  <input className={inputCls} value={form.pickupAddress.state} onChange={(event) => onNestedChange("pickupAddress", "state", event.target.value)} />
                </FieldRow>
                <FieldRow label="Pincode">
                  <input className={inputCls} value={form.pickupAddress.postalCode} onChange={(event) => onNestedChange("pickupAddress", "postalCode", event.target.value)} />
                </FieldRow>
              </div>
            </section>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <FieldRow label="Tax State">
              <input className={inputCls} value={form.taxState} onChange={(event) => onChange("taxState", event.target.value)} />
            </FieldRow>
            <FieldRow label="Invoice Prefix">
              <input className={inputCls} value={form.invoicePrefix} onChange={(event) => onChange("invoicePrefix", event.target.value.toUpperCase())} />
            </FieldRow>
            <FieldRow label="Payout Schedule">
              <select className={inputCls} value={form.payoutSchedule} onChange={(event) => onChange("payoutSchedule", event.target.value)}>
                {PAYOUT_SCHEDULES.map((schedule) => <option key={schedule} value={schedule}>{labelize(schedule)}</option>)}
              </select>
            </FieldRow>
          </div>

          <section className="mt-5 rounded-lg border border-[#E6E6E6] p-4">
            <h4 className="mb-3 text-sm font-semibold text-[#202337]">Return Address</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <FieldRow label="Line 1">
                <input className={inputCls} value={form.returnAddress.line1} onChange={(event) => onNestedChange("returnAddress", "line1", event.target.value)} />
              </FieldRow>
              <FieldRow label="City">
                <input className={inputCls} value={form.returnAddress.city} onChange={(event) => onNestedChange("returnAddress", "city", event.target.value)} />
              </FieldRow>
              <FieldRow label="State">
                <input className={inputCls} value={form.returnAddress.state} onChange={(event) => onNestedChange("returnAddress", "state", event.target.value)} />
              </FieldRow>
              <FieldRow label="Pincode">
                <input className={inputCls} value={form.returnAddress.postalCode} onChange={(event) => onNestedChange("returnAddress", "postalCode", event.target.value)} />
              </FieldRow>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E6E6E6] px-5 py-3">
          <PrimaryButton variant="ghost" onClick={onClose} disabled={submitting}>Cancel</PrimaryButton>
          <PrimaryButton onClick={onSubmit} disabled={submitting} icon={<MdCheckCircle size={18} />}>
            {submitting ? "Saving..." : "Save Organization"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

const SellerOrganizations = () => {
  const storedRole = normalizeRole(getStoredRole());
  const isSellerRole = ["seller", "seller-admin", "seller-sub-admin"].includes(storedRole);
  const [organizations, setOrganizations] = useState([]);
  const [total, setTotal] = useState(0);
  const [sellerOptions, setSellerOptions] = useState([]);
  const [filters, setFilters] = useState({
    sellerId: "",
    organizationId: "",
    q: "",
    approvalStatus: "",
    kycStatus: "",
    bankVerificationStatus: "",
    goLiveStatus: "",
  });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: "create", organization: null });
  const [viewModal, setViewModal] = useState({ open: false, organization: null });
  const [reviewModal, setReviewModal] = useState({ open: false, action: "", organization: null, reason: "" });
  const [form, setForm] = useState(createEmptyForm());
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    dropdownApi.getSellers({ limit: 200 })
      .then(setSellerOptions)
      .catch(() => setSellerOptions([]));
  }, []);

  useEffect(() => {
    const delay = searchInput ? 400 : 0;
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, q: searchInput }));
    }, delay);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const params = Object.entries({ ...filters, limit: 200, offset: 0 }).reduce((result, [key, value]) => {
        if (value !== undefined && value !== null && value !== "") result[key] = value;
        return result;
      }, {});
      const response = await apiRequest("GET", ENDPOINTS.sellerOrganizations.list, params);
      const payload = unwrapList(response);
      setOrganizations(payload.items);
      setTotal(payload.total);
    } catch (error) {
      toast.error(error?.message || "Unable to load seller organizations");
      setOrganizations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const filteredOrganizationOptions = useMemo(
    () => organizations.map((item) => ({
      value: item.id || item.organizationId,
      label: `${organizationLabel(item)} - ${getOrganizationSellerLabel(item, sellerOptions)}`,
    })),
    [organizations, sellerOptions],
  );

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "sellerId" ? { organizationId: "" } : {}),
    }));
  };

  const openEdit = (organization) => {
    setForm(normalizeForEdit(organization));
    setFormErrors({});
    setModal({ open: true, mode: "edit", organization });
  };

  const openView = (organization) => {
    setViewModal({ open: true, organization });
  };

  const closeView = () => {
    setViewModal({ open: false, organization: null });
  };

  const openReviewAction = (action, organization) => {
    if (isSellerRole) {
      toast.error("Organization review actions are admin-only");
      return;
    }
    setReviewModal({ open: true, action, organization, reason: "" });
  };

  const closeReviewAction = () => {
    if (submitting) return;
    setReviewModal({ open: false, action: "", organization: null, reason: "" });
  };

  const updateReviewReason = (reason) => {
    setReviewModal((prev) => ({ ...prev, reason }));
  };

  const closeModal = () => {
    if (submitting) return;
    setFormErrors({});
    setModal({ open: false, mode: "create", organization: null });
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateNestedForm = (section, key, value) => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [key]: value,
      },
    }));
  };

  const handleDocumentChange = async (key, file) => {
    if (!file) return;
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error("Document must be 5 MB or smaller");
      return;
    }
    try {
      updateNestedForm("documents", key, await readDocument(file));
    } catch (error) {
      toast.error(error?.message || "Unable to read document");
    }
  };

  const handleSubmit = async () => {
    const error = validateForm(form);
    if (error) {
      toast.error(error);
      return;
    }

    try {
      setSubmitting(true);
      const payload = buildPayload(form);
      if (modal.mode === "edit") {
        const organization = modal.organization || {};
        if (payload.approvalStatus === organization.approvalStatus) delete payload.approvalStatus;
        if (payload.kycStatus === organization.kycStatus) delete payload.kycStatus;
        if (payload.bankVerificationStatus === organization.bankVerificationStatus) delete payload.bankVerificationStatus;
        if (payload.goLiveStatus === organization.goLiveStatus) delete payload.goLiveStatus;
        if ((payload.rejectionReason || "") === (organization.rejectionReason || "")) delete payload.rejectionReason;
        if (JSON.stringify(payload.requiredChanges || []) === JSON.stringify(organization.requiredChanges || [])) {
          delete payload.requiredChanges;
        }
        await apiRequest(
          "PATCH",
          ENDPOINTS.sellerOrganizations.update(organization.sellerId, organization.id || organization.organizationId),
          payload,
        );
        toast.success("Seller organization updated");
      } else {
        await apiRequest("POST", ENDPOINTS.sellerOrganizations.create(form.sellerId), payload);
        toast.success("Seller organization created");
      }
      setModal({ open: false, mode: "create", organization: null });
      await loadOrganizations();
    } catch (error) {
      const backendErrors = getBackendFieldErrors(error);
      if (Object.keys(backendErrors).length) setFormErrors(backendErrors);
      toast.error(error?.message || "Unable to save seller organization");
    } finally {
      setSubmitting(false);
    }
  };

  const applyStatus = async (organization, payload, successMessage) => {
    if (isSellerRole) {
      toast.error("Organization status actions are admin-only");
      return;
    }
    if (!organization?.sellerId || !(organization.id || organization.organizationId)) return;
    try {
      setSubmitting(true);
      await apiRequest(
        "PATCH",
        ENDPOINTS.sellerOrganizations.status(organization.sellerId, organization.id || organization.organizationId),
        payload,
      );
      toast.success(successMessage);
      await loadOrganizations();
    } catch (error) {
      toast.error(error?.message || "Unable to update organization status");
    } finally {
      setSubmitting(false);
    }
  };

  const approveKyc = (organization) => {
    applyStatus(
      organization,
      {
        kycStatus: "verified",
        notes: "KYC approved from organization management",
      },
      "Organization KYC approved",
    );
  };

  const approveBank = (organization) => {
    applyStatus(
      organization,
      {
        bankVerificationStatus: "verified",
        notes: "Bank approved from organization management",
      },
      "Organization bank account verified",
    );
  };

  const approveOrganization = (organization) => {
    applyStatus(
      organization,
      {
        kycStatus: "verified",
        bankVerificationStatus: "verified",
        approvalStatus: "approved",
        goLiveStatus: "live",
        notes: "Organization approved for selling from organization management",
      },
      "Organization approved for selling",
    );
  };

  const approveGoLive = (organization) => {
    applyStatus(
      organization,
      {
        goLiveStatus: "live",
        notes: "Go-live approved from organization management",
      },
      "Organization is now live",
    );
  };

  const confirmReviewAction = async () => {
    if (isSellerRole) {
      toast.error("Organization review actions are admin-only");
      return;
    }
    const { action, organization, reason } = reviewModal;
    const cleanReason = reason.trim();
    if (["resubmit", "reject"].includes(action) && !cleanReason) {
      toast.error("Rejection reason is required");
      return;
    }

    if (action === "resubmit") {
      await applyStatus(
        organization,
        {
          approvalStatus: "rejected",
          rejectionReason: cleanReason,
          requiredChanges: [cleanReason],
          notes: "Requested resubmission from seller organization admin table",
        },
        "Organization sent back for resubmission",
      );
    } else if (action === "reject") {
      await applyStatus(
        organization,
        {
          approvalStatus: "rejected",
          kycStatus: "rejected",
          rejectionReason: cleanReason,
        },
        "Organization rejected",
      );
    } else if (action === "block") {
      await applyStatus(
        organization,
        {
          approvalStatus: "blocked",
          goLiveStatus: "blocked",
          notes: cleanReason || "Blocked from seller organization admin table",
        },
        "Organization blocked",
      );
    }

    setReviewModal({ open: false, action: "", organization: null, reason: "" });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Organization Management"
        subtitle="Manage seller legal entities, GST/KYC, bank verification, invoice settings, and payout approval."
        count={total}
        breadcrumbs={[{ label: "Users & Access" }, { label: "Seller Organizations" }]}
        actions={(
          <>
            <PrimaryButton variant="ghost" onClick={loadOrganizations} disabled={loading} icon={<MdRefresh size={18} />}>
              Refresh
            </PrimaryButton>
            {/* <PrimaryButton onClick={openCreate} icon={<MdAdd size={18} />}>
              Add Organization
            </PrimaryButton> */}
          </>
        )}
      />

      <section className="rounded-lg border border-[#E6E6E6] bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
          <FieldRow label="Seller">
            <select className={inputCls} value={filters.sellerId} onChange={(event) => updateFilter("sellerId", event.target.value)}>
              <option value="">All sellers</option>
              {sellerOptions.map((seller) => (
                <option key={seller.value} value={seller.value}>{seller.label}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Organization">
            <select
              className={inputCls}
              value={filters.organizationId}
              onChange={(event) => updateFilter("organizationId", event.target.value)}
            >
              <option value="">All organizations</option>
              {filteredOrganizationOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Search">
            <div className="relative">
              <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a93a5]" size={18} />
              <input
                className={`${inputCls} w-full pl-9`}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Name, GSTIN, PAN, seller ID"
              />
            </div>
          </FieldRow>
          <FieldRow label="Approval">
            <select className={inputCls} value={filters.approvalStatus} onChange={(event) => updateFilter("approvalStatus", event.target.value)}>
              <option value="">All</option>
              {APPROVAL_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="KYC">
            <select className={inputCls} value={filters.kycStatus} onChange={(event) => updateFilter("kycStatus", event.target.value)}>
              <option value="">All</option>
              {KYC_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Bank">
            <select className={inputCls} value={filters.bankVerificationStatus} onChange={(event) => updateFilter("bankVerificationStatus", event.target.value)}>
              <option value="">All</option>
              {BANK_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Go Live">
            <select className={inputCls} value={filters.goLiveStatus} onChange={(event) => updateFilter("goLiveStatus", event.target.value)}>
              <option value="">All</option>
              {GO_LIVE_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
            </select>
          </FieldRow>
        </div>
      </section>

      <section className="rounded-lg border border-[#E6E6E6] bg-white">
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-[#EEF1F6] text-sm">
            <thead className="bg-[#f8faff] text-left text-xs font-semibold uppercase text-[#65718b]">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Organization</th>
                <th className="whitespace-nowrap px-4 py-3">Seller</th>
                <th className="whitespace-nowrap px-4 py-3">GSTIN</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-4 py-3">Readiness</th>
                <th className="whitespace-nowrap px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F6] text-[#202337]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#65718b]">Loading organizations...</td>
                </tr>
              ) : organizations.length ? organizations.map((organization) => {
                const canOperate = canOperateOrganization(organization);
                const missingFields = getMissingRequiredFields(organization);
                const businessStatus = organization.businessStatus || (canOperate ? "approved" : "not_approved");
                return (
                <tr key={organization.id || organization.organizationId} className="align-middle hover:bg-[#fbfcff]">
                  <td className="px-4 py-3">
                    <div className="max-w-[260px]">
                      <div className="truncate font-medium" title={organizationLabel(organization)}>
                        {organizationLabel(organization)}
                      </div>
                      <div className="mt-1 truncate text-xs text-[#65718b]" title={organization.legalBusinessName || ""}>
                        {organization.legalBusinessName || "-"}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[#8a93a5]">{shortId(organization.id || organization.organizationId)}</span>
                        {organization.isDefault ? <StatusBadge status="active" label="Default" size="xs" /> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[220px]">
                      <div className="truncate font-medium" title={getOrganizationSellerLabel(organization, sellerOptions)}>
                        {getOrganizationSellerLabel(organization, sellerOptions)}
                      </div>
                      <div className="mt-1 truncate text-xs text-[#65718b]" title={organization.seller?.email || organization.supportEmail || ""}>
                        {organization.seller?.email || organization.supportEmail || "-"}
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-[#8a93a5]">{shortId(organization.sellerId)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-medium">{organization.gstin || "-"}</div>
                    <div className="mt-1 text-[11px] text-[#65718b]">{organization.pan ? `PAN ${organization.pan}` : "PAN -"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[190px] flex-wrap items-center gap-1.5">
                      <StatusBadge
                        status={canOperate ? "approved" : "draft"}
                        label={canOperate ? "Can sell" : labelize(businessStatus)}
                        dot
                        size="sm"
                      />
                      <StatusBadge status={organization.approvalStatus || "draft"} dot size="sm" />
                      <StatusBadge status={organization.kycStatus || "not_submitted"} label={`KYC ${labelize(organization.kycStatus || "not_submitted")}`} size="xs" />
                      <StatusBadge status={organization.bankVerificationStatus || "not_submitted"} label={`Bank ${labelize(organization.bankVerificationStatus || "not_submitted")}`} size="xs" />
                      <StatusBadge status={organization.goLiveStatus || "pending"} label={`Go Live ${labelize(organization.goLiveStatus || "pending")}`} size="xs" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {missingFields.length ? (
                      <button
                        type="button"
                        className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-2 py-1.5 text-xs font-medium text-[#92400e] transition hover:bg-[#fff7d6]"
                        onClick={() => openView(organization)}
                      >
                        {missingFields.length} missing
                      </button>
                    ) : (
                      <StatusBadge status="approved" label="Complete" size="xs" />
                    )}
                    {organization.rejectionReason ? (
                      <div className="mt-2 max-w-[180px] truncate text-xs text-[#d92d20]" title={organization.rejectionReason}>
                        {organization.rejectionReason}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="admin-table-actions-nowrap">
                      <IconButton title="View details" icon={<MdVisibility size={18} />} onClick={() => openView(organization)} disabled={submitting} />
                      <IconButton title="Edit" icon={<MdEdit size={18} />} onClick={() => openEdit(organization)} disabled={submitting} />
	                      {!isSellerRole && (
	                        <>
	                          <button
	                            type="button"
	                            className="rounded-md bg-[#208a3c] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#176b2e] disabled:cursor-not-allowed disabled:opacity-50"
	                            onClick={() => approveOrganization(organization)}
	                            disabled={submitting || canOperate}
	                          >
	                            Approve
	                          </button>
	                          <IconButton
	                            title="Approve KYC"
	                            icon={<MdVerifiedUser size={18} />}
	                            tone="green"
	                            onClick={() => approveKyc(organization)}
	                            disabled={submitting || organization.kycStatus === "verified"}
	                          />
	                          <IconButton
	                            title="Verify Bank"
	                            icon={<MdAccountBalance size={18} />}
	                            tone="green"
	                            onClick={() => approveBank(organization)}
	                            disabled={submitting || organization.kycStatus !== "verified" || organization.bankVerificationStatus === "verified"}
	                          />
	                          <IconButton
	                            title="Approve Go Live"
	                            icon={<MdRocketLaunch size={18} />}
	                            tone="blue"
	                            onClick={() => approveGoLive(organization)}
	                            disabled={
	                              submitting ||
	                              organization.kycStatus !== "verified" ||
	                              organization.bankVerificationStatus !== "verified" ||
	                              !["approved", "active"].includes(organization.approvalStatus) ||
	                              organization.goLiveStatus === "live"
	                            }
	                          />
	                          <IconButton title="Request resubmission" icon={<MdRefresh size={18} />} tone="amber" onClick={() => openReviewAction("resubmit", organization)} disabled={submitting} />
	                          <IconButton title="Reject" icon={<MdClose size={18} />} tone="red" onClick={() => openReviewAction("reject", organization)} disabled={submitting} />
	                          <IconButton title="Block" icon={<MdBlock size={18} />} tone="red" onClick={() => openReviewAction("block", organization)} disabled={submitting} />
	                        </>
	                      )}
                    </div>
                  </td>
                </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#65718b]">No seller organizations found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <OrganizationModal
        open={modal.open}
        mode={modal.mode}
        organization={modal.organization}
        form={form}
        errors={formErrors}
        sellerOptions={sellerOptions}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onChange={updateForm}
        onNestedChange={updateNestedForm}
        onDocumentChange={handleDocumentChange}
      />
      <OrganizationDetailModal
        open={viewModal.open}
        organization={viewModal.organization}
        sellers={sellerOptions}
        onClose={closeView}
      />
      <ReviewActionModal
        open={reviewModal.open}
        action={reviewModal.action}
        organization={reviewModal.organization}
        reason={reviewModal.reason}
        onReasonChange={updateReviewReason}
        onClose={closeReviewAction}
        onConfirm={confirmReviewAction}
        submitting={submitting}
      />
    </div>
  );
};

export default SellerOrganizations;
