import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  MdAdd,
  MdCheckCircle,
  MdClose,
  MdEdit,
  MdRefresh,
  MdOutlineSwapHoriz,
  MdInfoOutline,
  MdBusiness,
  MdWarningAmber,
} from "react-icons/md";
import { PageHeader, StatusBadge } from "../../components/Shared";
import { apiRequest } from "../../_helpers/apiConfig";
import { ENDPOINTS } from "../../_helpers/endpoints";
import {
  setSelectedSellerOrganizationId,
  getSelectedSellerOrganizationId,
} from "../../_helpers/sellerOrganizationContext";

// ─── Validation constants ─────────────────────────────────────────────────────

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const BANK_ACCT_REGEX = /^[0-9]{9,18}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10,15}$/;
const MAX_DOC_BYTES = 5 * 1024 * 1024;

const BUSINESS_TYPES = [
  "individual", "proprietorship", "partnership",
  "private_limited", "llp", "public_limited",
];
const PAYOUT_SCHEDULES = ["daily", "weekly", "biweekly", "monthly"];
const TAX_REGISTRATION_TYPES = ["regular", "composition", "unregistered"];
const ORGANIZATION_DOCUMENTS = [
  ["panDocumentUrl", "PAN Document"],
  ["gstCertificateUrl", "GST Certificate"],
  ["aadhaarFrontUrl", "Aadhaar Front"],
  ["aadhaarBackUrl", "Aadhaar Back"],
  ["bankProofUrl", "Cancelled Cheque / Bank Proof"],
  ["addressProofUrl", "Business Address Proof"],
  ["udyogAadhaarDocumentUrl", "Udhyog Aadhaar Document"],
];

// ─── Form defaults ────────────────────────────────────────────────────────────

const emptyAddress = { line1: "", line2: "", city: "", state: "", country: "India", postalCode: "" };
const emptyBankDetails = { accountHolderName: "", accountNumber: "", ifscCode: "", bankName: "", branchName: "" };

const createEmptyForm = () => ({
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

// ─── Theme tokens (matching existing admin theme) ─────────────────────────────

const inputCls = "admin-input min-h-[38px] px-3 text-sm disabled:bg-[var(--admin-surface-soft)] disabled:text-[var(--admin-soft-text)]";
const inputErrCls = "min-h-[38px] rounded-md border border-red-400 bg-red-50/30 px-3 text-sm outline-none transition focus:border-red-500 disabled:bg-[#f8faff]";
const ic = (err) => (err ? inputErrCls : inputCls);

// ─── Utilities ─────────────────────────────────────────────────────────────

const cleanString = (v) => String(v || "").trim();
const labelize = (v = "") => String(v || "-").replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const formatAddress = (a = {}) => [a.line1, a.city, a.state, a.postalCode].filter(Boolean).join(", ") || "—";
const orgLabel = (o = {}) => o.storeDisplayName || o.legalBusinessName || o.id || o.organizationId || "Unnamed";
const orgId = (o = {}) => o.id || o.organizationId || "";
const canOperateOrganization = (org = {}) =>
  org.canOperate === true ||
  org.canSell === true ||
  (
    ["approved", "active"].includes(org.approvalStatus) &&
    org.kycStatus === "verified" &&
    org.bankVerificationStatus === "verified" &&
    !["blocked", "rejected"].includes(String(org.goLiveStatus || ""))
  );

const readDocument = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUri: reader.result, fileName: file.name, mimeType: file.type });
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });

// ─── Validation ──────────────────────────────────────────────────────────────

const validateForm = (form = {}) => {
  const errs = {};
  const set = (k, m) => { if (!errs[k]) errs[k] = m; };
  const v = (val) => cleanString(val);

  if (!v(form.legalBusinessName)) set("legalBusinessName", "Legal business name is required");
  if (!v(form.storeDisplayName)) set("storeDisplayName", "Store / display name is required");
  if (!v(form.businessType)) set("businessType", "Business type is required");
  if (!v(form.primaryContactName)) set("primaryContactName", "Primary contact name is required");

  const email = v(form.supportEmail);
  if (!email) set("supportEmail", "Support email is required");
  else if (!EMAIL_REGEX.test(email)) set("supportEmail", "Enter a valid email (e.g. seller@example.com)");

  const phone = v(form.supportPhone);
  if (!phone) set("supportPhone", "Support phone is required");
  else if (!PHONE_REGEX.test(phone)) set("supportPhone", "Phone must be 10–15 digits");

  const gstin = v(form.gstin);
  if (!gstin) set("gstin", "GSTIN is required");
  else if (!GST_REGEX.test(gstin)) set("gstin", "Invalid GSTIN (e.g. 22AAAAA0000A1Z5)");

  const pan = v(form.pan);
  if (!pan) set("pan", "PAN is required");
  else if (!PAN_REGEX.test(pan)) set("pan", "Invalid PAN (e.g. AAAAA0000A)");

  const aadhaar = v(form.aadhaarNumber);
  if (!aadhaar) set("aadhaarNumber", "Aadhaar number is required");
  else if (!AADHAAR_REGEX.test(aadhaar)) set("aadhaarNumber", "Aadhaar must be exactly 12 digits");

  if (!form.dateOfBirth) set("dateOfBirth", "Date of birth is required");

  if (!v(form.bankDetails?.accountHolderName)) set("bank.accountHolderName", "Account holder name is required");

  const acct = v(form.bankDetails?.accountNumber);
  if (!acct) set("bank.accountNumber", "Bank account number is required");
  else if (!BANK_ACCT_REGEX.test(acct)) set("bank.accountNumber", "Account number must be 9–18 digits");

  const ifsc = v(form.bankDetails?.ifscCode);
  if (!ifsc) set("bank.ifscCode", "IFSC code is required");
  else if (!IFSC_REGEX.test(ifsc)) set("bank.ifscCode", "Invalid IFSC (e.g. SBIN0001234)");

  if (!v(form.bankDetails?.bankName)) set("bank.bankName", "Bank name is required");

  if (!v(form.billingAddress?.line1)) set("billing.line1", "Billing address line 1 is required");
  if (!v(form.billingAddress?.city)) set("billing.city", "Billing city is required");
  if (!v(form.billingAddress?.state)) set("billing.state", "Billing state is required");
  const bPin = v(form.billingAddress?.postalCode);
  if (!bPin) set("billing.postalCode", "Billing pincode is required");
  else if (bPin.length < 4 || bPin.length > 10) set("billing.postalCode", "Pincode must be 4–10 digits");

  if (!v(form.pickupAddress?.line1)) set("pickup.line1", "Pickup address line 1 is required");
  if (!v(form.pickupAddress?.city)) set("pickup.city", "Pickup city is required");
  if (!v(form.pickupAddress?.state)) set("pickup.state", "Pickup state is required");
  const pPin = v(form.pickupAddress?.postalCode);
  if (!pPin) set("pickup.postalCode", "Pickup pincode is required");
  else if (pPin.length < 4 || pPin.length > 10) set("pickup.postalCode", "Pincode must be 4–10 digits");

  ORGANIZATION_DOCUMENTS.forEach(([key, label]) => {
    if (key === "udyogAadhaarDocumentUrl") return;
    if (!form.documents?.[key] && !form.existingDocuments?.[key]) set(`doc.${key}`, `${label} is required`);
  });

  return errs;
};

// ─── Payload builder ──────────────────────────────────────────────────────────

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
    bankDetails: {
      accountHolderName: cleanString(form.bankDetails?.accountHolderName),
      accountNumber: cleanString(form.bankDetails?.accountNumber),
      ifscCode: cleanString(form.bankDetails?.ifscCode).toUpperCase(),
      bankName: cleanString(form.bankDetails?.bankName),
      branchName: cleanString(form.bankDetails?.branchName),
    },
    billingAddress: { ...emptyAddress, ...(form.billingAddress || {}), state: billingState, country: cleanString(form.billingAddress?.country) || "India" },
    pickupAddress: { ...emptyAddress, ...(form.pickupAddress || {}), state: pickupState, country: cleanString(form.pickupAddress?.country) || "India" },
    returnAddress: { ...emptyAddress, ...(form.returnAddress || {}), state: cleanString(form.returnAddress?.state), country: cleanString(form.returnAddress?.country) || "India" },
    taxSettings: {
      state: taxState, gstin: cleanString(form.gstin) || null, pan: cleanString(form.pan),
      registrationType: cleanString(form.taxRegistrationType) || "regular",
    },
    invoiceSettings: {
      invoicePrefix: cleanString(form.invoicePrefix) || "INV",
      invoiceSeries: cleanString(form.invoiceSeries),
      state: taxState,
    },
    payoutSettings: { payoutSchedule: cleanString(form.payoutSchedule) || "weekly" },
    complianceSettings: {
      gstRegistered: cleanString(form.taxRegistrationType) !== "unregistered",
      taxRegistrationType: cleanString(form.taxRegistrationType) || "regular",
      taxRegion: taxState,
    },
  };
};

// ─── Edit normalizer ──────────────────────────────────────────────────────────

const normalizeForEdit = (org = {}) => {
  const inv = org.invoiceSettings || {};
  const tax = org.taxSettings || {};
  const pay = org.payoutSettings || {};
  return {
    ...createEmptyForm(),
    legalBusinessName: org.legalBusinessName || "",
    storeDisplayName: org.storeDisplayName || "",
    businessType: org.businessType || "proprietorship",
    description: org.description || "",
    supportEmail: org.supportEmail || "",
    supportPhone: org.supportPhone || "",
    udyogAadhaarNumber: org.metadata?.udyogAadhaarNumber || org.udyogAadhaarNumber || "",
    gstin: org.gstin || "",
    pan: org.pan || "",
    aadhaarNumber: org.aadhaarNumber || "",
    dateOfBirth: org.dateOfBirth ? String(org.dateOfBirth).slice(0, 10) : "",
    businessWebsite: org.businessWebsite || "",
    primaryContactName: org.primaryContactName || "",
    documents: {},
    existingDocuments: { ...(org.documents || org.kycDocuments || {}) },
    bankDetails: { ...emptyBankDetails, ...(org.bankDetails || {}) },
    billingAddress: { ...emptyAddress, ...(org.billingAddress || {}) },
    pickupAddress: { ...emptyAddress, ...(org.pickupAddress || {}) },
    returnAddress: { ...emptyAddress, ...(org.returnAddress || {}) },
    taxState: tax.state || org.billingAddress?.state || "",
    taxRegistrationType: org.complianceSettings?.taxRegistrationType || tax.registrationType || "regular",
    invoicePrefix: inv.invoicePrefix || "INV",
    invoiceSeries: inv.invoiceSeries || "",
    payoutSchedule: pay.payoutSchedule || "weekly",
  };
};

const unwrapList = (response = {}) => {
  const data = response?.data;
  if (Array.isArray(data)) return data;
  const root = data?.data || data || response || {};
  const items = root.organizations || root.items || root.list || root.rows || [];
  return Array.isArray(items) ? items : [];
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

// ─── Shared sub-components (matching admin theme) ─────────────────────────────

const FieldRow = ({ label, required, error, hint, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-[var(--admin-muted)]">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-[11px] font-medium text-red-500">{error}</p>}
    {!error && hint && <p className="text-[11px] text-[var(--admin-soft-text)]">{hint}</p>}
  </div>
);

const PrimaryButton = ({ children, icon, onClick, disabled = false, variant = "primary" }) => {
  const cls =
    variant === "ghost"
      ? "admin-btn-secondary"
      : "button-primary my-organizations-primary-btn";
  return (
    <button
      type="button"
      className={`inline-flex min-h-[38px] items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${cls}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {children}
    </button>
  );
};

// ─── Rejection / approval banner ───────────────────────────────────────────────

const STATUS_BANNERS = {
  draft: { cls: "border-[#d0d5dd] bg-[#f8f9fb]", icon: "text-[#65718b]", title: "Draft — Not Yet Submitted", body: "This organization has not been submitted for review. Edit and save to submit." },
  pending_review: { cls: "border-[#fde68a] bg-[#fffbeb]", icon: "text-[#b45309]", title: "Under Review", body: "Your details are being reviewed. This typically takes 1–2 business days." },
  resubmitted: { cls: "border-[#a5f3fc] bg-[#ecfeff]", icon: "text-[#0e7490]", title: "Resubmitted — Under Review", body: "Your corrected details have been resubmitted for admin review." },
  rejected: { cls: "border-red-200 bg-red-50", icon: "text-red-500", title: "Rejected", body: "This organization was rejected. Please correct your details and resubmit." },
  suspended: { cls: "border-orange-200 bg-orange-50", icon: "text-orange-500", title: "Suspended", body: "This organization is suspended. Contact support to resolve the issue." },
  blocked: { cls: "border-red-200 bg-red-50", icon: "text-red-600", title: "Blocked", body: "This organization is blocked. Contact support to resolve the issue." },
};

const ApprovalBanner = ({ org }) => {
  const status = org.approvalStatus || "draft";
  const meta = STATUS_BANNERS[status];
  if (!meta) return null;
  const reason = org.rejectionReason || org.metadata?.rejectionReason || org.metadata?.lastVerificationEvent?.rejectionReason;
  return (
    <div className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-xs ${meta.cls}`}>
      <MdInfoOutline size={14} className={`mt-0.5 shrink-0 ${meta.icon}`} />
      <div>
        <p className="font-semibold text-[var(--admin-ink)]">{meta.title}</p>
        <p className="mt-0.5 text-[var(--admin-muted)]">{meta.body}</p>
        {reason && <p className="mt-1 font-medium text-red-600">Reason: {reason}</p>}
        {Array.isArray(org.requiredChanges) && org.requiredChanges.length > 0 && (
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-red-600">
            {org.requiredChanges.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
};

// ─── Error summary ────────────────────────────────────────────────────────────

const ErrorSummary = ({ errors }) => {
  const msgs = Object.values(errors);
  if (!msgs.length) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
      <MdWarningAmber size={14} className="mt-0.5 shrink-0 text-red-500" />
      <div>
        <p className="text-xs font-semibold text-red-700">
          {msgs.length} issue{msgs.length > 1 ? "s" : ""} to fix before submitting
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-red-600">
          {msgs.slice(0, 4).map((m, i) => <li key={i}>{m}</li>)}
          {msgs.length > 4 && <li>…and {msgs.length - 4} more</li>}
        </ul>
      </div>
    </div>
  );
};

// ─── Document field ───────────────────────────────────────────────────────────

const DocField = ({ docKey, label, value, error, onChange }) => {
  const isUrl = typeof value === "string" && value.length > 0;
  const isFile = value && typeof value === "object" && value.fileName;
  return (
    <FieldRow label={label} required error={error}>
      <div className={`rounded-md border px-3 py-2 ${error ? "border-red-400 bg-red-50/30" : "border-[#E6E6E6]"}`}>
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="w-full text-xs text-[#65718b] file:mr-3 file:rounded file:border-0 file:bg-[#f3f6ff] file:px-2 file:py-1 file:text-xs file:font-medium file:text-[#2f6fed] hover:file:bg-[#dce8ff]"
          onChange={(e) => onChange(docKey, e.target.files?.[0])}
        />
        {(isUrl || isFile) && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px]">
            <MdCheckCircle size={12} className="shrink-0 text-green-600" />
            {isUrl ? (
              <a href={value} target="_blank" rel="noreferrer" className="text-[#2f6fed] hover:underline">View current document</a>
            ) : (
              <span className="text-[#65718b]">{value.fileName}</span>
            )}
          </div>
        )}
      </div>
    </FieldRow>
  );
};

// ─── Organization Form Modal ──────────────────────────────────────────────────

const OrgFormModal = ({ open, mode, form, errors, submitting, sellerLoginEmail, onClose, onSubmit, onChange, onNestedChange, onDocumentChange }) => {
  const bodyRef = useRef(null);
  if (!open) return null;
  const isEdit = mode === "edit";
  const hasErrors = Object.keys(errors).length > 0;

  const copyBillingToPickup = () =>
    Object.entries(form.billingAddress).forEach(([k, v]) => onNestedChange("pickupAddress", k, v));
  const copyPickupToReturn = () =>
    Object.entries(form.pickupAddress).forEach(([k, v]) => onNestedChange("returnAddress", k, v));
  const MAX_DOB = new Date();
MAX_DOB.setFullYear(MAX_DOB.getFullYear() - 18);

const MAX_DOB_DATE = MAX_DOB.toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-lg border border-[#E6E6E6] bg-white shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6E6E6] px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-[#202337]">
              {isEdit ? "Edit Organization" : "Add New Organization"}
            </h3>
            <p className="mt-0.5 text-xs text-[#65718b]">
              {isEdit
                ? "Saving will resubmit for admin review."
                : "After saving, your organization will be submitted for admin review."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#65718b] hover:bg-[#f3f6ff]" aria-label="Close" disabled={submitting}>
            <MdClose size={18} />
          </button>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="overflow-y-auto px-5 py-4 space-y-4">

          {hasErrors && <ErrorSummary errors={errors} />}

          {/* Business Identity */}
          <section className="rounded-lg border border-[#E6E6E6] p-4">
            <h4 className="mb-3 text-sm font-semibold text-[#202337]">Business Identity</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldRow label="Legal Business Name" required error={errors.legalBusinessName} hint="As registered on PAN / GST certificate">
                <input className={ic(errors.legalBusinessName)} value={form.legalBusinessName}
                  onChange={(e) => onChange("legalBusinessName", e.target.value)} placeholder="As on GST / PAN certificate" />
              </FieldRow>
              <FieldRow label="Store / Display Name" required error={errors.storeDisplayName} hint="Shown to customers on the storefront">
                <input className={ic(errors.storeDisplayName)} value={form.storeDisplayName}
                  onChange={(e) => onChange("storeDisplayName", e.target.value)} placeholder="Visible to customers" />
              </FieldRow>
              <FieldRow label="Business Type" required error={errors.businessType}>
                <select className={ic(errors.businessType)} value={form.businessType} onChange={(e) => onChange("businessType", e.target.value)}>
                  {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Primary Contact Name" required error={errors.primaryContactName}>
                <input className={ic(errors.primaryContactName)} value={form.primaryContactName}
                  onChange={(e) => onChange("primaryContactName", e.target.value)} placeholder="Owner / authorized signatory" />
              </FieldRow>
              {sellerLoginEmail && (
                <FieldRow label="Seller Account Email (Login Email)" hint="Your login email — cannot be changed here">
                  <input
                    type="email"
                    className="min-h-[38px] rounded-md border border-[#E6E6E6] bg-[#f8faff] px-3 text-sm text-[#65718b] outline-none cursor-not-allowed"
                    value={sellerLoginEmail}
                    readOnly
                    disabled
                  />
                </FieldRow>
              )}
              <FieldRow label="Organization Official Email" required error={errors.supportEmail}
                hint="Used for org support, invoices, and business communication. Login still uses your seller account email.">
                <input type="email" className={ic(errors.supportEmail)} value={form.supportEmail}
                  onChange={(e) => onChange("supportEmail", e.target.value)} placeholder="org-support@example.com" />
              </FieldRow>
              <FieldRow label="Support Phone" required error={errors.supportPhone} hint="10–15 digits only">
                <input className={ic(errors.supportPhone)} value={form.supportPhone}
                  onChange={(e) => onChange("supportPhone", e.target.value.replace(/\D/g, ""))} maxLength={15} placeholder="9876543210" />
              </FieldRow>
              <FieldRow label="GSTIN" required error={errors.gstin} hint="15-character GST Identification Number">
                <input className={ic(errors.gstin)} value={form.gstin}
                  onChange={(e) => onChange("gstin", e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
              </FieldRow>
              <FieldRow label="PAN" required error={errors.pan} hint="10-character Permanent Account Number">
                <input className={ic(errors.pan)} value={form.pan}
                  onChange={(e) => onChange("pan", e.target.value.toUpperCase())} placeholder="AAAAA0000A" maxLength={10} />
              </FieldRow>
              <FieldRow label="Aadhaar Number" required error={errors.aadhaarNumber} hint="12 digits">
                <input className={ic(errors.aadhaarNumber)} value={form.aadhaarNumber}
                  onChange={(e) => onChange("aadhaarNumber", e.target.value.replace(/\D/g, ""))} maxLength={12} placeholder="123412341234" />
              </FieldRow>
              <FieldRow label="Date of Birth" required error={errors.dateOfBirth}>
                <input type="date" className={ic(errors.dateOfBirth)} value={form.dateOfBirth}
                  onChange={(e) => onChange("dateOfBirth", e.target.value)} />
              </FieldRow>
              <FieldRow label="Udhyog Aadhaar Number" error={errors.udyogAadhaarNumber}>
                <input className={ic(errors.udyogAadhaarNumber)} value={form.udyogAadhaarNumber}
                  onChange={(e) => onChange("udyogAadhaarNumber", e.target.value.toUpperCase())} placeholder="UDYAM-XX-00-0000000" />
              </FieldRow>
              <FieldRow label="Business Website" error={errors.businessWebsite}>
                <input type="url" className={ic(errors.businessWebsite)} value={form.businessWebsite}
                  onChange={(e) => onChange("businessWebsite", e.target.value)} placeholder="https://example.com" />
              </FieldRow>
              <div className="md:col-span-2">
                <FieldRow label="Business Description" error={errors.description}>
                  <textarea className={`${ic(errors.description)} min-h-[68px] py-2`} value={form.description}
                    onChange={(e) => onChange("description", e.target.value)} rows={3} placeholder="Brief description (optional)" />
                </FieldRow>
              </div>
            </div>
          </section>

          {/* Bank Details */}
          <section className="rounded-lg border border-[#E6E6E6] p-4">
            <h4 className="mb-1 text-sm font-semibold text-[#202337]">Bank Details</h4>
            <p className="mb-3 text-xs text-[#65718b]">Must match your cancelled cheque. Used for payouts.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldRow label="Account Holder Name" required error={errors["bank.accountHolderName"]} hint="Exactly as on your bank account">
                <input className={ic(errors["bank.accountHolderName"])} value={form.bankDetails.accountHolderName}
                  onChange={(e) => onNestedChange("bankDetails", "accountHolderName", e.target.value)} />
              </FieldRow>
              <FieldRow label="Bank Account Number" required error={errors["bank.accountNumber"]} hint="9–18 digits">
                <input className={ic(errors["bank.accountNumber"])} value={form.bankDetails.accountNumber}
                  onChange={(e) => onNestedChange("bankDetails", "accountNumber", e.target.value.replace(/\D/g, ""))} maxLength={18} />
              </FieldRow>
              <FieldRow label="IFSC Code" required error={errors["bank.ifscCode"]} hint="11 characters (e.g. SBIN0001234)">
                <input className={ic(errors["bank.ifscCode"])} value={form.bankDetails.ifscCode}
                  onChange={(e) => onNestedChange("bankDetails", "ifscCode", e.target.value.toUpperCase())} maxLength={11} placeholder="SBIN0001234" />
              </FieldRow>
              <FieldRow label="Bank Name" required error={errors["bank.bankName"]}>
                <input className={ic(errors["bank.bankName"])} value={form.bankDetails.bankName}
                  onChange={(e) => onNestedChange("bankDetails", "bankName", e.target.value)} />
              </FieldRow>
              <FieldRow label="Branch Name" error={errors["bank.branchName"]}>
                <input className={ic(errors["bank.branchName"])} value={form.bankDetails.branchName}
                  onChange={(e) => onNestedChange("bankDetails", "branchName", e.target.value)} placeholder="Optional" />
              </FieldRow>
            </div>
          </section>

          {/* KYC Documents */}
          <section className="rounded-lg border border-[#E6E6E6] p-4">
            <h4 className="mb-1 text-sm font-semibold text-[#202337]">KYC & Compliance Documents</h4>
            <p className="mb-3 text-xs text-[#65718b]">PDF, JPG, PNG or WebP — max 5 MB each. Udhyog Aadhaar is optional.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {ORGANIZATION_DOCUMENTS.map(([key, label]) => (
                <DocField key={key} docKey={key} label={label}
                  value={form.documents?.[key]} error={errors[`doc.${key}`]} onChange={onDocumentChange} />
              ))}
            </div>
          </section>

          {/* Addresses */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[#202337]">Billing Address</h4>
              <div className="grid gap-3">
                <FieldRow label="Line 1" required error={errors["billing.line1"]}>
                  <input className={ic(errors["billing.line1"])} value={form.billingAddress.line1}
                    onChange={(e) => onNestedChange("billingAddress", "line1", e.target.value)} />
                </FieldRow>
                <FieldRow label="Line 2" error={errors["billing.line2"]}>
                  <input className={ic(errors["billing.line2"])} value={form.billingAddress.line2}
                    onChange={(e) => onNestedChange("billingAddress", "line2", e.target.value)} />
                </FieldRow>
                <FieldRow label="City" required error={errors["billing.city"]}>
                  <input className={ic(errors["billing.city"])} value={form.billingAddress.city}
                    onChange={(e) => onNestedChange("billingAddress", "city", e.target.value)} />
                </FieldRow>
                <FieldRow label="State" required error={errors["billing.state"]}>
                  <input className={ic(errors["billing.state"])} value={form.billingAddress.state}
                    onChange={(e) => onNestedChange("billingAddress", "state", e.target.value)} />
                </FieldRow>
                <FieldRow label="Pincode" required error={errors["billing.postalCode"]}>
                  <input className={ic(errors["billing.postalCode"])} value={form.billingAddress.postalCode}
                    onChange={(e) => onNestedChange("billingAddress", "postalCode", e.target.value.replace(/\D/g, ""))} maxLength={6} />
                </FieldRow>
              </div>
            </section>

            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#202337]">Pickup Address</h4>
                <button type="button" onClick={copyBillingToPickup} className="text-[11px] text-[#2f6fed] hover:underline">Same as billing</button>
              </div>
              <div className="grid gap-3">
                <FieldRow label="Line 1" required error={errors["pickup.line1"]}>
                  <input className={ic(errors["pickup.line1"])} value={form.pickupAddress.line1}
                    onChange={(e) => onNestedChange("pickupAddress", "line1", e.target.value)} />
                </FieldRow>
                <FieldRow label="Line 2" error={errors["pickup.line2"]}>
                  <input className={ic(errors["pickup.line2"])} value={form.pickupAddress.line2}
                    onChange={(e) => onNestedChange("pickupAddress", "line2", e.target.value)} />
                </FieldRow>
                <FieldRow label="City" required error={errors["pickup.city"]}>
                  <input className={ic(errors["pickup.city"])} value={form.pickupAddress.city}
                    onChange={(e) => onNestedChange("pickupAddress", "city", e.target.value)} />
                </FieldRow>
                <FieldRow label="State" required error={errors["pickup.state"]}>
                  <input className={ic(errors["pickup.state"])} value={form.pickupAddress.state}
                    onChange={(e) => onNestedChange("pickupAddress", "state", e.target.value)} />
                </FieldRow>
                <FieldRow label="Pincode" required error={errors["pickup.postalCode"]}>
                  <input className={ic(errors["pickup.postalCode"])} value={form.pickupAddress.postalCode}
                    onChange={(e) => onNestedChange("pickupAddress", "postalCode", e.target.value.replace(/\D/g, ""))} maxLength={6} />
                </FieldRow>
              </div>
            </section>

            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#202337]">
                  Return Address <span className="text-xs font-normal text-[#8a93a5]">(optional)</span>
                </h4>
                <button type="button" onClick={copyPickupToReturn} className="text-[11px] text-[#2f6fed] hover:underline">Same as pickup</button>
              </div>
              <div className="grid gap-3">
                <FieldRow label="Line 1" error={errors["return.line1"]}>
                  <input className={ic(errors["return.line1"])} value={form.returnAddress.line1}
                    onChange={(e) => onNestedChange("returnAddress", "line1", e.target.value)} />
                </FieldRow>
                <FieldRow label="City" error={errors["return.city"]}>
                  <input className={ic(errors["return.city"])} value={form.returnAddress.city}
                    onChange={(e) => onNestedChange("returnAddress", "city", e.target.value)} />
                </FieldRow>
                <FieldRow label="State" error={errors["return.state"]}>
                  <input className={ic(errors["return.state"])} value={form.returnAddress.state}
                    onChange={(e) => onNestedChange("returnAddress", "state", e.target.value)} />
                </FieldRow>
                <FieldRow label="Pincode" error={errors["return.postalCode"]}>
                  <input className={ic(errors["return.postalCode"])} value={form.returnAddress.postalCode}
                    onChange={(e) => onNestedChange("returnAddress", "postalCode", e.target.value.replace(/\D/g, ""))} maxLength={6} />
                </FieldRow>
              </div>
            </section>
          </div>

          {/* Invoice & Payout */}
          <section className="rounded-lg border border-[#E6E6E6] p-4">
            <h4 className="mb-3 text-sm font-semibold text-[#202337]">Invoice & Payout Settings</h4>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <FieldRow label="Tax State" error={errors.taxState} hint="Auto-filled from billing state">
                <input className={ic(errors.taxState)} value={form.taxState}
                  onChange={(e) => onChange("taxState", e.target.value)} placeholder="e.g. Maharashtra" />
              </FieldRow>
              <FieldRow label="Tax Registration" error={errors.taxRegistrationType}>
                <select className={ic(errors.taxRegistrationType)} value={form.taxRegistrationType}
                  onChange={(e) => onChange("taxRegistrationType", e.target.value)}>
                  {TAX_REGISTRATION_TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Invoice Prefix" error={errors.invoicePrefix} hint="Up to 6 characters">
                <input className={ic(errors.invoicePrefix)} value={form.invoicePrefix}
                  onChange={(e) => onChange("invoicePrefix", e.target.value.toUpperCase())} maxLength={6} />
              </FieldRow>
              <FieldRow label="Payout Schedule" error={errors.payoutSchedule}>
                <select className={ic(errors.payoutSchedule)} value={form.payoutSchedule}
                  onChange={(e) => onChange("payoutSchedule", e.target.value)}>
                  {PAYOUT_SCHEDULES.map((s) => <option key={s} value={s}>{labelize(s)}</option>)}
                </select>
              </FieldRow>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-[#E6E6E6] px-5 py-3">
          {hasErrors ? (
            <p className="text-xs font-medium text-red-500">
              {Object.keys(errors).length} issue{Object.keys(errors).length > 1 ? "s" : ""} — scroll up to review
            </p>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <PrimaryButton variant="ghost" onClick={onClose} disabled={submitting}>Cancel</PrimaryButton>
            <PrimaryButton onClick={onSubmit} disabled={submitting} icon={<MdCheckCircle size={18} />}>
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Submit for Review"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Organization Card ────────────────────────────────────────────────────────

const OrgCard = ({ org, isActive, onEdit, onSetDefault, submitting }) => {
  const id = orgId(org);
  const status = org.approvalStatus || "draft";
  const approved = status === "approved" || status === "active";
  const canOperate = canOperateOrganization(org);
  const canEdit = !approved;

  return (
    <div className={`flex flex-col rounded-lg border bg-white shadow-[var(--admin-shadow)] transition ${isActive ? "border-[var(--admin-gold)] ring-2 ring-[var(--admin-gold-soft)]" : "border-[var(--admin-line)] hover:border-[var(--admin-line-strong)]"
      }`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--admin-gold-soft)]">
          <MdBusiness size={18} className="text-[var(--admin-gold-dark)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-[var(--admin-navy)]">{orgLabel(org)}</p>
            {org.isDefault && (
              <span className="rounded-full bg-[var(--admin-gold-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--admin-gold-dark)]">Default</span>
            )}
            {isActive && (
              <span className="rounded-full bg-[#effbf4] px-2 py-0.5 text-[10px] font-semibold text-green-700">Active</span>
            )}
          </div>
          {org.legalBusinessName && org.legalBusinessName !== org.storeDisplayName && (
            <p className="truncate text-xs text-[var(--admin-muted)]">{org.legalBusinessName}</p>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        <StatusBadge status={status} dot size="sm" />
        {org.kycStatus && <StatusBadge status={org.kycStatus} label={`KYC: ${labelize(org.kycStatus)}`} size="xs" />}
        {org.bankVerificationStatus && <StatusBadge status={org.bankVerificationStatus} label={`Bank: ${labelize(org.bankVerificationStatus)}`} size="xs" />}
        {org.goLiveStatus && <StatusBadge status={org.goLiveStatus} label={`Go Live: ${labelize(org.goLiveStatus)}`} size="xs" />}
      </div>

      {/* Approval banner */}
      {!canOperate && (
        <div className="px-4 pb-3">
          <ApprovalBanner org={org} />
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 pb-3 text-xs">
        <div>
          <p className="text-[#8a93a5]">GSTIN</p>
          <p className="font-medium text-[#202337] break-all">{org.gstin || "—"}</p>
        </div>
        <div>
          <p className="text-[#8a93a5]">PAN</p>
          <p className="font-medium text-[#202337]">{org.pan || "—"}</p>
        </div>
        <div>
          <p className="text-[#8a93a5]">Business Type</p>
          <p className="font-medium text-[#202337]">{labelize(org.businessType || "—")}</p>
        </div>
        <div>
          <p className="text-[#8a93a5]">Payout</p>
          <p className="font-medium text-[#202337]">{labelize(org.payoutSettings?.payoutSchedule || "Weekly")}</p>
        </div>
        {org.bankDetails?.bankName && (
          <div className="col-span-2">
            <p className="text-[#8a93a5]">Bank</p>
            <p className="font-medium text-[#202337]">
              {org.bankDetails.bankName}
              {org.bankDetails.accountNumber ? ` · A/C ${org.bankDetails.accountNumber}` : ""}
            </p>
          </div>
        )}
        {org.billingAddress?.city && (
          <div className="col-span-2">
            <p className="text-[#8a93a5]">Billing Address</p>
            <p className="font-medium text-[#202337]">{formatAddress(org.billingAddress)}</p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-4 py-3">
        {canEdit ? (
          <button
            type="button"
            onClick={() => onEdit(org)}
            disabled={submitting}
            className="admin-btn-secondary inline-flex min-h-8 items-center gap-1.5 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdEdit size={13} />
            {status === "rejected" || status === "blocked" ? "Correct & Resubmit" : "Edit"}
          </button>
        ) : (
          <span className="rounded-md border border-[var(--admin-line)] bg-white px-3 py-1.5 text-xs text-[var(--admin-soft-text)]">
            Legal details locked after approval
          </span>
        )}
        {!org.isDefault && canOperate && (
          <button
            type="button"
            onClick={() => onSetDefault(id)}
            disabled={submitting}
            className="admin-btn-secondary inline-flex min-h-8 items-center gap-1.5 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdOutlineSwapHoriz size={13} />
            Set as Default
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const MyOrganizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: "create", org: null });
  const [form, setForm] = useState(createEmptyForm());
  const [errors, setErrors] = useState({});
  const [sellerLoginEmail, setSellerLoginEmail] = useState("");
  const activeOrgId = getSelectedSellerOrganizationId();

  useEffect(() => {
    apiRequest("GET", ENDPOINTS.auth.me)
      .then((response) => {
        const email = response?.data?.email || response?.email || "";
        if (email) setSellerLoginEmail(email);
      })
      .catch(() => { });
  }, []);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", ENDPOINTS.sellers.myOrganizations, { limit: 50 });
      setOrganizations(unwrapList(response));
    } catch (error) {
      toast.error(error?.message || "Failed to load your organizations");
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrganizations(); }, [loadOrganizations]);

  const openCreate = () => {
    setForm(createEmptyForm());
    setErrors({});
    setModal({ open: true, mode: "create", org: null });
  };

  const openEdit = (org) => {
    setForm(normalizeForEdit(org));
    setErrors({});
    setModal({ open: true, mode: "edit", org });
  };

  const closeModal = () => {
    if (submitting) return;
    setModal({ open: false, mode: "create", org: null });
    setErrors({});
  };

  const clearError = (key) => setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  };

  const updateNestedForm = (section, key, value) => {
    setForm((prev) => ({ ...prev, [section]: { ...(prev[section] || {}), [key]: value } }));
    const sectionMap = { bankDetails: "bank", billingAddress: "billing", pickupAddress: "pickup", returnAddress: "return" };
    const prefix = sectionMap[section];
    if (prefix) clearError(`${prefix}.${key}`);
  };

  const handleDocumentChange = async (key, file) => {
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) {
      toast.error(`File too large — maximum 5 MB (${file.name})`);
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Invalid file type — please upload PDF, JPG, PNG or WebP");
      return;
    }
    try {
      const document = await readDocument(file);
      setForm((prev) => ({ ...prev, documents: { ...(prev.documents || {}), [key]: document } }));
      clearError(`doc.${key}`);
    } catch (error) {
      toast.error(error?.message || "Failed to read document");
    }
  };

  const handleSubmit = async () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error(Object.values(errs)[0]);
      return;
    }
    setErrors({});
    try {
      setSubmitting(true);
      const payload = buildPayload(form);
      if (modal.mode === "edit") {
        await apiRequest("PATCH", ENDPOINTS.sellers.myOrganization(orgId(modal.org)), payload);
        toast.success("Organization updated and resubmitted for review");
      } else {
        await apiRequest("POST", ENDPOINTS.sellers.myOrganizations, payload);
        toast.success("Organization submitted for review");
      }
      setModal({ open: false, mode: "create", org: null });
      await loadOrganizations();
    } catch (error) {
      const backendErrors = getBackendFieldErrors(error);
      if (Object.keys(backendErrors).length) setErrors(backendErrors);
      toast.error(error?.message || "Failed to save organization");
    } finally {
      setSubmitting(false);
    }
  };

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

  const approvedCount = organizations.filter(canOperateOrganization).length;
  const pendingCount = organizations.filter((o) => ["pending_review", "resubmitted"].includes(o.approvalStatus)).length;
  const rejectedCount = organizations.filter((o) => ["rejected", "blocked"].includes(o.approvalStatus)).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Store"
        subtitle=""
        count={organizations.length}
        breadcrumbs={[{ label: "Seller Dashboard" }, { label: "My Store" }]}
        actions={(
          <>
            <PrimaryButton onClick={loadOrganizations} disabled={loading} icon={<MdRefresh size={18} />}>
              Refresh
            </PrimaryButton>
            {/* <PrimaryButton onClick={openCreate} icon={<MdAdd size={18} />}>
              Add Organization
            </PrimaryButton> */}
          </>
        )}
      />

      {/* Summary chips */}
      {organizations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 rounded-md border border-[var(--admin-line)] bg-white px-3 py-2 text-xs shadow-sm">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-semibold text-[var(--admin-ink)]">{approvedCount}</span>
            <span className="text-[var(--admin-muted)]">Approved & Usable</span>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="font-semibold text-[var(--admin-ink)]">{pendingCount}</span>
              <span className="text-[var(--admin-muted)]">Pending Review</span>
            </div>
          )}
          {rejectedCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="font-semibold text-[var(--admin-ink)]">{rejectedCount}</span>
              <span className="text-[var(--admin-muted)]">Needs Action</span>
            </div>
          )}
        </div>
      )}

      {/* Switcher info — only shown when multiple orgs */}
      {organizations.length > 1 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-[var(--admin-line-strong)] bg-white px-4 py-3">
          <MdOutlineSwapHoriz size={16} className="mt-0.5 shrink-0 text-[var(--admin-gold-dark)]" />
          <div>
            <p className="text-xs font-semibold text-[var(--admin-navy)]">Organization Switcher</p>
            <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
              Use the dropdown in the top header to switch between organizations. Products, orders, and reports will filter to the selected organization.
              {activeOrgId && (
                <> Currently active: <strong>{orgLabel(organizations.find((o) => orgId(o) === activeOrgId) || {})}</strong></>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Cards / Empty state */}
      {loading ? (
        <div className="admin-card px-4 py-12 text-center text-sm text-[var(--admin-muted)]">
          Loading your organizations…
        </div>
      ) : organizations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--admin-line-strong)] bg-white px-6 py-14 text-center shadow-[var(--admin-shadow)]">
          <MdBusiness size={36} className="mx-auto mb-3 text-[var(--admin-gold)]" />
          <p className="font-semibold text-[var(--admin-navy)]">No organizations yet</p>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Add your first organization to start selling. Your details will be reviewed by our team before approval.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="button-primary my-organizations-primary-btn mt-5 inline-flex items-center gap-2 text-sm"
          >
            <MdAdd size={16} /> Add Your First Organization
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
              onSetDefault={handleSetDefault}
              submitting={submitting}
            />
          ))}
        </div>
      )}

      <OrgFormModal
        open={modal.open}
        mode={modal.mode}
        form={form}
        errors={errors}
        submitting={submitting}
        sellerLoginEmail={sellerLoginEmail}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onChange={updateForm}
        onNestedChange={updateNestedForm}
        onDocumentChange={handleDocumentChange}
      />
    </div>
  );
};

export default MyOrganizations;
