import React, { useCallback, useEffect, useState } from "react";
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
const PAYOUT_SCHEDULES = ["daily", "weekly", "biweekly", "monthly"];

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
  gstin: "",
  pan: "",
  bankDetails: { ...emptyBankDetails },
  billingAddress: { ...emptyAddress },
  pickupAddress: { ...emptyAddress },
  taxState: "",
  invoicePrefix: "INV",
  invoiceSeries: "",
  payoutSchedule: "weekly",
});

const inputCls =
  "min-h-[38px] rounded-md border border-[#E6E6E6] px-3 text-sm outline-none focus:border-[#2f6fed] disabled:bg-[#f8faff] disabled:text-[#8a93a5]";

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

const buildPayload = (form = {}) => {
  const billingState = cleanString(form.billingAddress?.state);
  const pickupState = cleanString(form.pickupAddress?.state);
  const taxState = cleanString(form.taxState) || billingState || pickupState;

  return {
    legalBusinessName: cleanString(form.legalBusinessName),
    storeDisplayName: cleanString(form.storeDisplayName),
    businessType: cleanString(form.businessType) || null,
    gstin: cleanString(form.gstin) || null,
    pan: cleanString(form.pan),
    bankDetails: {
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
    taxSettings: {
      state: taxState,
      gstin: cleanString(form.gstin) || null,
      pan: cleanString(form.pan),
    },
    invoiceSettings: {
      invoicePrefix: cleanString(form.invoicePrefix) || "INV",
      invoiceSeries: cleanString(form.invoiceSeries),
      state: taxState,
    },
    payoutSettings: {
      payoutSchedule: cleanString(form.payoutSchedule) || "weekly",
    },
  };
};

const validateForm = (form = {}) => {
  const required = [
    [form.legalBusinessName, "Legal business name is required"],
    [form.storeDisplayName, "Store / display name is required"],
    [form.pan, "PAN is required"],
    [form.bankDetails?.accountNumber, "Bank account number is required"],
    [form.bankDetails?.ifscCode, "IFSC code is required"],
    [form.billingAddress?.line1, "Billing address line 1 is required"],
    [form.billingAddress?.city, "Billing city is required"],
    [form.billingAddress?.state, "Billing state is required"],
    [form.billingAddress?.postalCode, "Billing pincode is required"],
    [form.pickupAddress?.line1, "Pickup address line 1 is required"],
    [form.pickupAddress?.state, "Pickup state is required"],
  ];
  const missing = required.find(([val]) => !cleanString(val));
  return missing?.[1] || "";
};

const normalizeForEdit = (org = {}) => {
  const invoiceSettings = org.invoiceSettings || {};
  const taxSettings = org.taxSettings || {};
  const payoutSettings = org.payoutSettings || {};
  return {
    legalBusinessName: org.legalBusinessName || "",
    storeDisplayName: org.storeDisplayName || "",
    businessType: org.businessType || "proprietorship",
    gstin: org.gstin || "",
    pan: org.pan || "",
    bankDetails: { ...emptyBankDetails, ...(org.bankDetails || {}) },
    billingAddress: { ...emptyAddress, ...(org.billingAddress || {}) },
    pickupAddress: { ...emptyAddress, ...(org.pickupAddress || {}) },
    taxState: taxSettings.state || org.billingAddress?.state || "",
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
    <label className="text-xs font-medium text-[#65718b]">
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

// ─── Organization Form Modal ──────────────────────────────────────────────────

const OrgFormModal = ({ open, mode, form, submitting, onClose, onSubmit, onChange, onNestedChange }) => {
  if (!open) return null;
  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-lg border border-[#E6E6E6] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E6E6E6] px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-[#202337]">
              {isEdit ? "Edit Organization" : "Add New Organization"}
            </h3>
            {!isEdit && (
              <p className="mt-0.5 text-xs text-[#65718b]">
                After saving, your organization will be submitted for admin review.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#65718b] hover:bg-[#f3f6ff]"
            aria-label="Close"
            disabled={submitting}
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {/* Business identity */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#65718b]">
              Business Identity
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldRow label="Legal Business Name" required>
                <input
                  className={inputCls}
                  value={form.legalBusinessName}
                  onChange={(e) => onChange("legalBusinessName", e.target.value)}
                  placeholder="As on PAN / GST certificate"
                />
              </FieldRow>
              <FieldRow label="Store / Display Name" required>
                <input
                  className={inputCls}
                  value={form.storeDisplayName}
                  onChange={(e) => onChange("storeDisplayName", e.target.value)}
                  placeholder="Visible to customers"
                />
              </FieldRow>
              <FieldRow label="Business Type">
                <select
                  className={inputCls}
                  value={form.businessType}
                  onChange={(e) => onChange("businessType", e.target.value)}
                >
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>{labelize(t)}</option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="GSTIN">
                <input
                  className={inputCls}
                  value={form.gstin}
                  onChange={(e) => onChange("gstin", e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </FieldRow>
              <FieldRow label="PAN" required>
                <input
                  className={inputCls}
                  value={form.pan}
                  onChange={(e) => onChange("pan", e.target.value.toUpperCase())}
                  placeholder="AAAAA0000A"
                  maxLength={10}
                />
              </FieldRow>
            </div>
          </section>

          {/* Bank details */}
          <section className="rounded-lg border border-[#E6E6E6] p-4">
            <h4 className="mb-3 text-sm font-semibold text-[#202337]">Bank Details</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldRow label="Account Holder Name">
                <input
                  className={inputCls}
                  value={form.bankDetails.accountHolderName}
                  onChange={(e) => onNestedChange("bankDetails", "accountHolderName", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="Account Number" required>
                <input
                  className={inputCls}
                  value={form.bankDetails.accountNumber}
                  onChange={(e) => onNestedChange("bankDetails", "accountNumber", e.target.value)}
                />
              </FieldRow>
              <FieldRow label="IFSC Code" required>
                <input
                  className={inputCls}
                  value={form.bankDetails.ifscCode}
                  onChange={(e) => onNestedChange("bankDetails", "ifscCode", e.target.value.toUpperCase())}
                  maxLength={11}
                />
              </FieldRow>
              <FieldRow label="Bank Name">
                <input
                  className={inputCls}
                  value={form.bankDetails.bankName}
                  onChange={(e) => onNestedChange("bankDetails", "bankName", e.target.value)}
                />
              </FieldRow>
            </div>
          </section>

          {/* Addresses */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[#202337]">Billing Address</h4>
              <div className="grid gap-3">
                <FieldRow label="Line 1" required>
                  <input className={inputCls} value={form.billingAddress.line1} onChange={(e) => onNestedChange("billingAddress", "line1", e.target.value)} />
                </FieldRow>
                <FieldRow label="Line 2">
                  <input className={inputCls} value={form.billingAddress.line2} onChange={(e) => onNestedChange("billingAddress", "line2", e.target.value)} />
                </FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="City" required>
                    <input className={inputCls} value={form.billingAddress.city} onChange={(e) => onNestedChange("billingAddress", "city", e.target.value)} />
                  </FieldRow>
                  <FieldRow label="State" required>
                    <input className={inputCls} value={form.billingAddress.state} onChange={(e) => onNestedChange("billingAddress", "state", e.target.value)} />
                  </FieldRow>
                </div>
                <FieldRow label="Pincode" required>
                  <input className={inputCls} value={form.billingAddress.postalCode} onChange={(e) => onNestedChange("billingAddress", "postalCode", e.target.value)} maxLength={6} />
                </FieldRow>
              </div>
            </section>

            <section className="rounded-lg border border-[#E6E6E6] p-4">
              <h4 className="mb-3 text-sm font-semibold text-[#202337]">Pickup Address</h4>
              <div className="grid gap-3">
                <FieldRow label="Line 1" required>
                  <input className={inputCls} value={form.pickupAddress.line1} onChange={(e) => onNestedChange("pickupAddress", "line1", e.target.value)} />
                </FieldRow>
                <FieldRow label="Line 2">
                  <input className={inputCls} value={form.pickupAddress.line2} onChange={(e) => onNestedChange("pickupAddress", "line2", e.target.value)} />
                </FieldRow>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="City">
                    <input className={inputCls} value={form.pickupAddress.city} onChange={(e) => onNestedChange("pickupAddress", "city", e.target.value)} />
                  </FieldRow>
                  <FieldRow label="State" required>
                    <input className={inputCls} value={form.pickupAddress.state} onChange={(e) => onNestedChange("pickupAddress", "state", e.target.value)} />
                  </FieldRow>
                </div>
                <FieldRow label="Pincode">
                  <input className={inputCls} value={form.pickupAddress.postalCode} onChange={(e) => onNestedChange("pickupAddress", "postalCode", e.target.value)} maxLength={6} />
                </FieldRow>
                <button
                  type="button"
                  className="mt-1 text-xs text-[#2f6fed] hover:underline text-left"
                  onClick={() => {
                    onNestedChange("pickupAddress", "line1", form.billingAddress.line1);
                    onNestedChange("pickupAddress", "line2", form.billingAddress.line2);
                    onNestedChange("pickupAddress", "city", form.billingAddress.city);
                    onNestedChange("pickupAddress", "state", form.billingAddress.state);
                    onNestedChange("pickupAddress", "postalCode", form.billingAddress.postalCode);
                    onNestedChange("pickupAddress", "country", form.billingAddress.country);
                  }}
                >
                  Same as billing address
                </button>
              </div>
            </section>
          </div>

          {/* Invoice & payout settings */}
          <section>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#65718b]">
              Invoice &amp; Payout Settings
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FieldRow label="Tax State">
                <input
                  className={inputCls}
                  value={form.taxState}
                  onChange={(e) => onChange("taxState", e.target.value)}
                  placeholder="Auto-filled from billing state"
                />
              </FieldRow>
              <FieldRow label="Invoice Prefix">
                <input
                  className={inputCls}
                  value={form.invoicePrefix}
                  onChange={(e) => onChange("invoicePrefix", e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </FieldRow>
              <FieldRow label="Payout Schedule">
                <select
                  className={inputCls}
                  value={form.payoutSchedule}
                  onChange={(e) => onChange("payoutSchedule", e.target.value)}
                >
                  {PAYOUT_SCHEDULES.map((s) => (
                    <option key={s} value={s}>{labelize(s)}</option>
                  ))}
                </select>
              </FieldRow>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[#E6E6E6] px-5 py-3">
          <PrimaryButton variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </PrimaryButton>
          <PrimaryButton onClick={onSubmit} disabled={submitting} icon={<MdCheckCircle size={18} />}>
            {submitting ? "Saving..." : isEdit ? "Save Changes" : "Submit for Review"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

// ─── Organization Card ────────────────────────────────────────────────────────

const OrgCard = ({ org, isActive, onEdit, onSetDefault, submitting }) => {
  const id = orgId(org);
  const status = org.approvalStatus || "draft";
  const isApproved = status === "approved" || status === "active";

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
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const MyOrganizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: "create", org: null });
  const [form, setForm] = useState(createEmptyForm());
  const activeOrgId = getSelectedSellerOrganizationId();

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

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const openCreate = () => {
    setForm(createEmptyForm());
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
        const id = orgId(modal.org);
        await apiRequest("PATCH", ENDPOINTS.sellers.myOrganization(id), payload);
        toast.success("Organization updated successfully");
      } else {
        await apiRequest("POST", ENDPOINTS.sellers.myOrganizations, payload);
        toast.success("Organization submitted for review");
      }
      closeModal();
      await loadOrganizations();
    } catch (error) {
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

  const approvedCount = organizations.filter(
    (o) => o.approvalStatus === "approved" || o.approvalStatus === "active",
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
            Use the dropdown in the top header to switch between organizations. All product
            listings, orders, commissions, and reports will filter to the selected organization.
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
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onChange={updateForm}
        onNestedChange={updateNestedForm}
      />
    </div>
  );
};

export default MyOrganizations;
