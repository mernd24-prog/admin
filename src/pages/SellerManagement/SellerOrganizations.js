import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MdAdd,
  MdBlock,
  MdCheckCircle,
  MdClose,
  MdEdit,
  MdRefresh,
  MdSearch,
} from "react-icons/md";
import { PageHeader, StatusBadge } from "../../components/Shared";
import { apiRequest } from "../../_helpers/apiConfig";
import { dropdownApi } from "../../_helpers/dropdownApi";
import { ENDPOINTS } from "../../_helpers/endpoints";

const APPROVAL_STATUSES = ["draft", "pending_review", "resubmitted", "approved", "rejected", "suspended", "blocked", "active"];
const KYC_STATUSES = ["not_submitted", "submitted", "under_review", "verified", "rejected"];
const BANK_STATUSES = ["not_submitted", "submitted", "verified", "rejected"];
const BUSINESS_TYPES = ["individual", "proprietorship", "partnership", "private_limited", "llp", "public_limited"];
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

const createEmptyForm = (sellerId = "") => ({
  sellerId,
  legalBusinessName: "",
  storeDisplayName: "",
  businessType: "proprietorship",
  gstin: "",
  pan: "",
  kycStatus: "submitted",
  bankVerificationStatus: "submitted",
  approvalStatus: "pending_review",
  rejectionReason: "",
  requiredChanges: [],
  isDefault: false,
  bankDetails: { ...emptyBankDetails },
  billingAddress: { ...emptyAddress },
  pickupAddress: { ...emptyAddress },
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

const normalizeForEdit = (organization = {}) => {
  const invoiceSettings = organization.invoiceSettings || {};
  const taxSettings = organization.taxSettings || {};
  const payoutSettings = organization.payoutSettings || {};

  return {
    ...createEmptyForm(organization.sellerId || ""),
    legalBusinessName: organization.legalBusinessName || "",
    storeDisplayName: organization.storeDisplayName || "",
    businessType: organization.businessType || "proprietorship",
    gstin: organization.gstin || "",
    pan: organization.pan || "",
  kycStatus: organization.kycStatus || "submitted",
  bankVerificationStatus: organization.bankVerificationStatus || "submitted",
  approvalStatus: organization.approvalStatus || "pending_review",
  rejectionReason: organization.rejectionReason || organization.metadata?.lastVerificationEvent?.rejectionReason || "",
  requiredChanges: organization.requiredChanges || [],
  isDefault: Boolean(organization.isDefault),
    bankDetails: { ...emptyBankDetails, ...(organization.bankDetails || {}) },
    billingAddress: { ...emptyAddress, ...(organization.billingAddress || {}) },
    pickupAddress: { ...emptyAddress, ...(organization.pickupAddress || {}) },
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
    kycStatus: form.kycStatus,
    bankVerificationStatus: form.bankVerificationStatus,
    approvalStatus: form.approvalStatus,
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
  const required = [
    [form.sellerId, "Seller is required"],
    [form.legalBusinessName, "Legal business name is required"],
    [form.storeDisplayName, "Store/display name is required"],
    [form.pan, "PAN is required"],
    [form.bankDetails?.accountNumber, "Bank account number is required"],
    [form.bankDetails?.ifscCode, "IFSC code is required"],
    [form.billingAddress?.state, "Billing state is required"],
    [form.pickupAddress?.state, "Pickup state is required"],
  ];
  const missing = required.find(([value]) => !cleanString(value));
  return missing?.[1] || "";
};

const FieldRow = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-[#65718b]">{label}</label>
    {children}
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
  const cls = variant === "ghost"
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

const OrganizationModal = ({
  open,
  mode,
  form,
  sellerOptions,
  submitting,
  onClose,
  onSubmit,
  onChange,
  onNestedChange,
}) => {
  if (!open) return null;
  const isEdit = mode === "edit";

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
            <FieldRow label="Seller">
              <select
                className={inputCls}
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
            <FieldRow label="GSTIN">
              <input className={inputCls} value={form.gstin} onChange={(event) => onChange("gstin", event.target.value.toUpperCase())} />
            </FieldRow>
            <FieldRow label="PAN">
              <input className={inputCls} value={form.pan} onChange={(event) => onChange("pan", event.target.value.toUpperCase())} />
            </FieldRow>
            <FieldRow label="Approval Status">
              <select className={inputCls} value={form.approvalStatus} onChange={(event) => onChange("approvalStatus", event.target.value)}>
                {APPROVAL_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="KYC Status">
              <select className={inputCls} value={form.kycStatus} onChange={(event) => onChange("kycStatus", event.target.value)}>
                {KYC_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Bank Status">
              <select className={inputCls} value={form.bankVerificationStatus} onChange={(event) => onChange("bankVerificationStatus", event.target.value)}>
                {BANK_STATUSES.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Default Organization">
              <label className="flex min-h-[38px] items-center gap-2 rounded-md border border-[#E6E6E6] px-3 text-sm text-[#202337]">
                <input type="checkbox" checked={form.isDefault} onChange={(event) => onChange("isDefault", event.target.checked)} />
                Default for this seller
              </label>
            </FieldRow>
          </div>

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
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState({ open: false, mode: "create", organization: null });
  const [form, setForm] = useState(createEmptyForm());

  useEffect(() => {
    dropdownApi.getSellers({ limit: 200 })
      .then(setSellerOptions)
      .catch(() => setSellerOptions([]));
  }, []);

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

  const openCreate = () => {
    setForm(createEmptyForm(filters.sellerId));
    setModal({ open: true, mode: "create", organization: null });
  };

  const openEdit = (organization) => {
    setForm(normalizeForEdit(organization));
    setModal({ open: true, mode: "edit", organization });
  };

  const closeModal = () => {
    if (submitting) return;
    setModal({ open: false, mode: "create", organization: null });
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      closeModal();
      await loadOrganizations();
    } catch (error) {
      toast.error(error?.message || "Unable to save seller organization");
    } finally {
      setSubmitting(false);
    }
  };

  const applyStatus = async (organization, payload, successMessage) => {
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

  const approveOrganization = (organization) => {
    applyStatus(
      organization,
      {
        approvalStatus: "approved",
        kycStatus: "verified",
        bankVerificationStatus: "verified",
        notes: "Approved from seller organization admin table",
      },
      "Organization approved",
    );
  };

  const requestResubmission = (organization) => {
    const reason = window.prompt("Required changes / rejection reason");
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    applyStatus(
      organization,
      {
        approvalStatus: "rejected",
        rejectionReason: reason.trim(),
        requiredChanges: [reason.trim()],
        notes: "Requested resubmission from seller organization admin table",
      },
      "Organization sent back for resubmission",
    );
  };

  const rejectOrganization = (organization) => {
    const reason = window.prompt("Rejection reason");
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    applyStatus(
      organization,
      {
        approvalStatus: "rejected",
        kycStatus: "rejected",
        bankVerificationStatus: organization.bankVerificationStatus || "submitted",
        rejectionReason: reason.trim(),
      },
      "Organization rejected",
    );
  };

  const blockOrganization = (organization) => {
    if (!window.confirm("Block this organization?")) return;
    applyStatus(
      organization,
      {
        approvalStatus: "blocked",
        notes: "Blocked from seller organization admin table",
      },
      "Organization blocked",
    );
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
            <PrimaryButton onClick={openCreate} icon={<MdAdd size={18} />}>
              Add Organization
            </PrimaryButton>
          </>
        )}
      />

      <section className="rounded-lg border border-[#E6E6E6] bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
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
                value={filters.q}
                onChange={(event) => updateFilter("q", event.target.value)}
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
        </div>
      </section>

      <section className="rounded-lg border border-[#E6E6E6] bg-white">
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-[#EEF1F6] text-sm">
            <thead className="bg-[#f8faff] text-left text-xs font-semibold uppercase text-[#65718b]">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Organization</th>
                <th className="whitespace-nowrap px-4 py-3">Seller</th>
                <th className="whitespace-nowrap px-4 py-3">GST / PAN</th>
                <th className="whitespace-nowrap px-4 py-3">Bank</th>
                <th className="whitespace-nowrap px-4 py-3">Billing / Pickup</th>
                <th className="whitespace-nowrap px-4 py-3">Status / History</th>
                <th className="whitespace-nowrap px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F6] text-[#202337]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#65718b]">Loading organizations...</td>
                </tr>
              ) : organizations.length ? organizations.map((organization) => (
                <tr key={organization.id || organization.organizationId} className="align-top hover:bg-[#fbfcff]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{organizationLabel(organization)}</div>
                    <div className="mt-1 text-xs text-[#65718b]">{organization.legalBusinessName || "-"}</div>
                    <div className="mt-1 text-[11px] text-[#8a93a5]">{shortId(organization.id || organization.organizationId)}</div>
                    {organization.isDefault ? <div className="mt-2"><StatusBadge status="active" label="Default" size="xs" /></div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div>{getOrganizationSellerLabel(organization, sellerOptions)}</div>
                    {organization.seller?.email ? <div className="mt-1 text-xs text-[#65718b]">{organization.seller.email}</div> : null}
                    {organization.seller?.phone ? <div className="mt-1 text-xs text-[#65718b]">{organization.seller.phone}</div> : null}
                    <div className="mt-1 text-xs text-[#8a93a5]">{shortId(organization.sellerId)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-[#65718b]">GSTIN</div>
                    <div className="font-medium">{organization.gstin || "-"}</div>
                    <div className="mt-2 text-xs text-[#65718b]">PAN</div>
                    <div className="font-medium">{organization.pan || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{organization.bankDetails?.bankName || "-"}</div>
                    <div className="mt-1 text-xs text-[#65718b]">{organization.bankDetails?.accountNumber ? `A/C ${organization.bankDetails.accountNumber}` : "No account"}</div>
                    <div className="mt-1 text-xs text-[#65718b]">{organization.bankDetails?.ifscCode || "-"}</div>
                  </td>
                  <td className="min-w-[220px] px-4 py-3">
                    <div className="text-xs text-[#65718b]">Billing</div>
                    <div>{formatAddress(organization.billingAddress)}</div>
                    <div className="mt-2 text-xs text-[#65718b]">Pickup</div>
                    <div>{formatAddress(organization.pickupAddress)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-2">
                      <StatusBadge status={organization.approvalStatus || "draft"} dot size="sm" />
                      <StatusBadge status={organization.kycStatus || "not_submitted"} label={`KYC ${labelize(organization.kycStatus || "not_submitted")}`} size="xs" />
                      <StatusBadge status={organization.bankVerificationStatus || "not_submitted"} label={`Bank ${labelize(organization.bankVerificationStatus || "not_submitted")}`} size="xs" />
                      {organization.rejectionReason ? (
                        <div className="max-w-[220px] text-xs text-[#d92d20]">{organization.rejectionReason}</div>
                      ) : null}
                      {organization.verificationHistory?.length ? (
                        <div className="text-[11px] text-[#8a93a5]">
                          {organization.verificationHistory.length} history events
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <IconButton title="Edit" icon={<MdEdit size={18} />} onClick={() => openEdit(organization)} disabled={submitting} />
                      <IconButton title="Approve" icon={<MdCheckCircle size={18} />} tone="green" onClick={() => approveOrganization(organization)} disabled={submitting} />
                      <IconButton title="Request resubmission" icon={<MdRefresh size={18} />} tone="amber" onClick={() => requestResubmission(organization)} disabled={submitting} />
                      <IconButton title="Reject" icon={<MdClose size={18} />} tone="red" onClick={() => rejectOrganization(organization)} disabled={submitting} />
                      <IconButton title="Block" icon={<MdBlock size={18} />} tone="red" onClick={() => blockOrganization(organization)} disabled={submitting} />
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#65718b]">No seller organizations found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <OrganizationModal
        open={modal.open}
        mode={modal.mode}
        form={form}
        sellerOptions={sellerOptions}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onChange={updateForm}
        onNestedChange={updateNestedForm}
      />
    </div>
  );
};

export default SellerOrganizations;
