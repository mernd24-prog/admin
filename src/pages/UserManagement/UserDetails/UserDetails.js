import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useParams } from 'react-router-dom';
import { MdAccountBalance, MdAssignmentTurnedIn, MdCheck, MdClose, MdCloudUpload, MdDeleteOutline, MdSettings, MdStorefront } from 'react-icons/md';
import Loader from '../../../components/Loader/Loader';
import FormInput from '../../../components/Atoms/FormInput/FormInput';
import {
  getAdminUserDetails,
  reviewSellerKyc,
  updateSeller,
  updateSellerBankStatus,
  updateSellerGoLive,
} from '../../../Redux/userManagementSlice';
import { getAdminUser as getAdminCoreUser, getPlatformSubAdmins } from '../../../Redux/adminCoreSlice';
import { toast } from 'sonner';
import VerificationDecisionModal from '../../../components/Seller/VerificationDecisionModal';
import OnboardingChecklist from '../../../components/Seller/OnboardingChecklist';
import { uploadFile } from '../../../_helpers/globalFunctions';
import { apiRequest } from '../../../_helpers/apiConfig';
import { ENDPOINTS } from '../../../_helpers/endpoints';
import useDropdownOptions from '../../../hooks/useDropdownOptions';
import { formatLabel } from '../../../utils/formatters';

// ─── small display helpers ────────────────────────────────────────────────────

const Row = ({ label, value }) => (
  <div className="border-b border-gray-100 py-3">
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className="text-sm text-gray-900 break-words">{value || '—'}</p>
  </div>
);

const CopyableReferenceRow = ({ label, value, onCopy }) => (
  <div className="rounded-md border border-gray-200 bg-white p-3">
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <div className="mt-1 flex items-center gap-2">
      <p className="min-w-0 flex-1 break-all font-mono text-sm text-gray-900">{value || '—'}</p>
      {value && (
        <button
          type="button"
          className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => onCopy(value)}
        >
          Copy
        </button>
      )}
    </div>
  </div>
);

const DetailPill = ({ label, value }) => (
  <div className="rounded-md border border-gray-200 bg-white p-3">
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className="mt-1 break-words text-sm font-medium text-gray-900">{value || '—'}</p>
  </div>
);

const formatBooleanValue = (value) => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return value || '';
};

const getVerificationSnapshot = (entry = {}) => {
  const latestResponse = entry.latestResponse || entry.latestVerificationResponse || entry.response || {};
  const raw = latestResponse.raw || latestResponse.response || {};
  const rawData = raw.data || {};
  return {
    entry,
    latestResponse,
    raw,
    data: {
      ...rawData,
      ...(latestResponse.data || {}),
    },
  };
};

const buildVerificationDetails = ({ service, source = {}, fallback = {} }) => {
  const snapshot = getVerificationSnapshot(source);
  const merged = {
    ...snapshot.entry,
    ...snapshot.latestResponse,
    ...snapshot.raw,
    ...snapshot.data,
    ...fallback,
  };
  const referenceId = getVerificationReferenceValue(source) || getVerificationReferenceValue(fallback);
  const base = [
    { label: 'Provider', value: merged.provider || source.provider || 'apitxt' },
    { label: 'Reference ID', value: referenceId, copyable: true },
    { label: 'Verified', value: formatBooleanValue(merged.latestVerified ?? merged.verified) },
    { label: 'Message', value: merged.latestMessage || merged.message },
  ];

  if (service === 'gst') {
    return [
      ...base,
      { label: 'GSTIN', value: merged.gstin || fallback.gstin },
      { label: 'GST Status', value: merged.status },
      { label: 'Legal Name', value: merged.legal_name || merged.legalName },
      { label: 'Trade Name', value: merged.trade_name || merged.tradeName },
      { label: 'Business Type', value: merged.business_type || merged.businessType },
      { label: 'Registration Date', value: merged.registration_date || merged.registrationDate },
      { label: 'State', value: merged.state },
      { label: 'District', value: merged.district },
      { label: 'Pincode', value: merged.pincode },
      { label: 'Registered Address', value: merged.address || merged.registeredAddress },
      { label: 'Credits Charged', value: merged.credits_charged || merged.creditsCharged },
    ];
  }

  if (service === 'pan') {
    return [
      ...base,
      { label: 'PAN', value: merged.pan || fallback.panNumber },
      { label: 'PAN Status', value: merged.status },
      { label: 'Category', value: merged.category },
      { label: 'Full Name', value: merged.full_name || merged.fullName },
      { label: 'Name Match', value: formatBooleanValue(merged.name_match ?? merged.nameMatch) },
      { label: 'DOB Match', value: formatBooleanValue(merged.dob_match ?? merged.dobMatch) },
      { label: 'Aadhaar Seeding', value: merged.aadhaar_seeding_status || merged.aadhaarSeedingStatus },
    ];
  }

  return [
    ...base,
    { label: 'Aadhaar Reference', value: merged.reference_id || merged.referenceId || referenceId, copyable: true },
    { label: 'Masked Aadhaar', value: merged.masked_aadhaar || merged.latestMaskedAadhaar },
    { label: 'Name', value: merged.name },
    { label: 'Date of Birth', value: merged.date_of_birth || merged.dateOfBirth },
    { label: 'Gender', value: merged.gender },
    { label: 'Care Of', value: merged.care_of || merged.careOf },
    { label: 'Address', value: merged.full_address || merged.address },
    { label: 'Has Photo', value: formatBooleanValue(merged.has_photo ?? merged.hasPhoto) },
    { label: 'Mode', value: merged.verificationMode || merged.mode },
  ];
};

const VerificationDetailsCard = ({ title, details = [], onCopy }) => {
  const visibleDetails = details.filter((item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== '');
  if (!visibleDetails.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleDetails.map((item) =>
          item.copyable ? (
            <CopyableReferenceRow
              key={`${title}-${item.label}`}
              label={item.label}
              value={item.value}
              onCopy={onCopy}
            />
          ) : (
            <DetailPill key={`${title}-${item.label}`} label={item.label} value={item.value} />
          ),
        )}
      </div>
    </div>
  );
};

const getPayload = (sliceData) =>
  sliceData?.data?.data ||
  sliceData?.data?.normalized?.data ||
  sliceData?.normalized?.data ||
  sliceData?.data ||
  {};

const getListItems = (sliceData) => {
  const payload = getPayload(sliceData);
  if (Array.isArray(payload)) return payload;
  return payload?.list || payload?.items || payload?.results || [];
};

function getVerificationReferenceValue(entry = {}) {
  const latestResponse = entry.latestResponse || entry.latestVerificationResponse || {};
  const raw = latestResponse.raw || latestResponse.response || {};
  const data = raw.data || latestResponse.data || {};
  return (
    entry.referenceId ||
    entry.providerReferenceId ||
    entry.latestReferenceId ||
    entry.requestId ||
    entry.latestRequestId ||
    latestResponse.providerReferenceId ||
    latestResponse.referenceId ||
    latestResponse.reference_id ||
    raw.request_id ||
    raw.requestId ||
    data.request_id ||
    data.requestId ||
    ''
  );
}

const isSameId = (record, id) =>
  String(record?._id || record?.id || record?.userId || '') === String(id || '');

const getDisplayName = (user = {}) => {
  const profile = user.profile || {};
  return (
    user.full_name ||
    user.fullName ||
    user.userName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
    user.email ||
    ''
  );
};

const getLastLoginValue = (user = {}) =>
  user.lastLoginAt || user.last_login_at || user.lastLogin || user.last_login || '';

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const ACTION_LABELS = {
  view: 'View',
  add: 'Add',
  create: 'Add',
  update: 'Update',
  edit: 'Update',
  delete: 'Delete',
  status_change: 'Status Change',
  action: 'Status Change',
  approve: 'Approve',
  approval: 'Approve',
  reject: 'Reject',
  assign: 'Assign',
  export: 'Export',
  import: 'Import',
  restore: 'Restore',
  bulk_action: 'Bulk Action',
  adjust: 'Adjust',
};

const formatModuleName = (value = '') =>
  String(value || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const MODULE_TABS = {
  rbac: 'Users & Access',
  admin: 'Dashboard',
  users: 'Users & Access',
  sellers: 'Users & Access',
  seller_kyc: 'Users & Access',
  seller_bank: 'Users & Access',
  'seller-management': 'Users & Access',
  'sellers/commissions': 'Orders Management',
  products: 'Catalog Management',
  categories: 'Catalog Management',
  sub_categories: 'Catalog Management',
  sub_sub_categories: 'Catalog Management',
  brands: 'Catalog Management',
  option_masters: 'Catalog Management',
  option_values: 'Catalog Management',
  platform: 'Catalog Management',
  cms: 'Settings',
  cms_pages: 'Settings',
  warranty: 'Catalog Management',
  reviews: 'Catalog Management',
  carts: 'Orders Management',
  orders: 'Orders Management',
  returns: 'Returns & Cancellations',
  delivery: 'Shipping & Fulfilment',
  payments: 'Payments & Finance',
  wallets: 'Payments & Finance',
  tax: 'Invoices & Taxation',
  locations: 'Location Management',
  countries: 'Location Management',
  states: 'Location Management',
  cities: 'Location Management',
  zip_codes: 'Location Management',
  subscriptions: 'Orders Management',
  pricing: 'Marketing',
  'dynamic-pricing': 'Marketing',
  loyalty: 'Marketing',
  referral: 'Marketing',
  recommendations: 'Marketing',
  coupons: 'Marketing',
  banners: 'Marketing',
  notifications: 'Marketing',
  analytics: 'Reports & Analytics',
  reports: 'Reports & Analytics',
  fraud: 'Payments & Finance',
};

const TAB_ORDER = [
  'Dashboard',
  'Catalog Management',
  'Inventory Management',
  'Orders Management',
  'Payments & Finance',
  'Shipping & Fulfilment',
  'Returns & Cancellations',
  'Invoices & Taxation',
  'Seller Finance & Payouts',
  'Commerce Settings',
  'Users & Access',
  'Marketing',
  'Reports & Analytics',
  'Location Management',
  'Settings',
  'Assigned',
  'Access',
];

const getModuleTab = (module = {}) =>
  module.tab || module.metadata?.tab || MODULE_TABS[module.slug || module.id] || 'Access';

const groupModulesByTab = (modules = []) => {
  const groups = modules.reduce((acc, module) => {
    const tabName = module.tab || 'Access';
    if (!acc[tabName]) acc[tabName] = [];
    acc[tabName].push(module);
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([tabName, items]) => ({
      tabName,
      items: [...items].sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id))),
    }))
    .sort((a, b) => {
      const indexA = TAB_ORDER.indexOf(a.tabName);
      const indexB = TAB_ORDER.indexOf(b.tabName);
      const safeA = indexA === -1 ? TAB_ORDER.length : indexA;
      const safeB = indexB === -1 ? TAB_ORDER.length : indexB;
      if (safeA !== safeB) return safeA - safeB;
      return a.tabName.localeCompare(b.tabName);
    });
};

const getAssignedModulePermissions = (module = {}) =>
  (module.permissions || [])
    .filter((permission) => permission?.assigned)
    .map((permission) => ACTION_LABELS[permission.action] || formatModuleName(permission.action))
    .filter(Boolean);

const moduleHasAccess = (module = {}) =>
  module.assigned || (module.permissions || []).some((permission) => permission?.assigned);

const STATUS_COLORS = {
  active:              'bg-green-100 text-green-700',
  approved:            'bg-green-100 text-green-700',
  live:                'bg-green-100 text-green-700',
  verified:            'bg-green-100 text-green-700',
  ready:               'bg-emerald-100 text-emerald-700',
  partially_live:      'bg-cyan-100 text-cyan-700',
  partially_verified:  'bg-cyan-100 text-cyan-700',
  partially_approved:  'bg-cyan-100 text-cyan-700',
  approval_pending:    'bg-yellow-100 text-yellow-700',
  ready_for_go_live:   'bg-emerald-100 text-emerald-700',
  under_review:        'bg-yellow-100 text-yellow-700',
  in_progress:         'bg-blue-100 text-blue-700',
  submitted:           'bg-blue-100 text-blue-700',
  rejected:            'bg-red-100 text-red-700',
  suspended:           'bg-red-100 text-red-700',
  pending:             'bg-gray-100 text-gray-600',
  initiated:           'bg-gray-100 text-gray-600',
  not_created:         'bg-gray-100 text-gray-400',
  not_submitted:       'bg-gray-100 text-gray-400',
  pending_approval:    'bg-yellow-100 text-yellow-700',
};

const formatStatusText = (value) =>
  String(value || 'N/A')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const StatusBadge = ({ value, status }) => {
  const lookupValue = String(status || value || '').toLowerCase().replace(/^(kyc|bank|go live)\s+/, '').replace(/[\s-]+/g, '_');
  const colorClass = STATUS_COLORS[lookupValue] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}>
      {formatStatusText(value)}
    </span>
  );
};

const isStageComplete = (status) =>
  ['active', 'approved', 'live', 'verified', 'ready', 'ready_for_go_live'].includes(
    String(status || '').toLowerCase(),
  );

const isStageRejected = (status) =>
  ['rejected', 'blocked', 'suspended'].includes(String(status || '').toLowerCase());

const VerificationProgress = ({ stages = [] }) => {
  const completeCount = stages.filter((stage) => isStageComplete(stage.status || stage.value)).length;
  const progress = stages.length > 1 ? Math.round((completeCount / stages.length) * 100) : 0;
  const icons = [MdSettings, MdAssignmentTurnedIn, MdAccountBalance, MdStorefront];

  return (
    <div className="rounded-lg border border-[#ead7b7] bg-[#fffdf8] px-4 py-4">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9A7A3E]">Seller verification progress</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{completeCount}/{stages.length} checks complete</p>
        </div>
        <span className="rounded-full border border-[#ead7b7] bg-white px-3 py-1 text-xs font-semibold text-[#8A5A1F] shadow-sm">
          {progress}%
        </span>
      </div>

      <div className="relative overflow-x-auto px-1 pb-1 pt-1">
        <div className="relative grid min-w-[620px] grid-cols-4 sm:min-w-0">
          {stages.map((stage, index) => {
            const status = stage.status || stage.value;
            const complete = isStageComplete(status);
            const rejected = isStageRejected(status);
            const Icon = icons[index] || MdSettings;
            const nextComplete = isStageComplete(stages[index + 1]?.status || stages[index + 1]?.value);
            const badgeClass = complete
              ? 'border-[var(--admin-gold)] bg-[#fff8e6] text-[var(--admin-gold-dark)]'
              : rejected
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-gray-200 bg-gray-50 text-gray-500';
            return (
              <div key={stage.label} className="relative flex flex-col items-center text-center">
                {index < stages.length - 1 && (
                  <>
                    <span className="absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-[18px] hidden h-0.5 rounded-full bg-gray-200 sm:block" />
                    {complete && nextComplete && (
                      <span className="absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-[18px] hidden h-0.5 rounded-full bg-[var(--admin-gold)] sm:block" />
                    )}
                  </>
                )}
                <div
                  className={`relative z-10 grid h-9 w-9 place-items-center rounded-full p-[3px] text-sm shadow-[0_3px_8px_rgba(138,90,31,0.28)] ring-4 ring-[#fffdf8] ${
                    complete
                      ? 'bg-[var(--admin-gold-dark)] text-white'
                      : rejected
                        ? 'bg-red-700 text-white'
                        : 'bg-gray-500 text-white'
                  }`}
                >
                  <span
                    className={`grid h-full w-full place-items-center rounded-full ${
                      complete
                        ? 'bg-[var(--admin-gold)]'
                        : rejected
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                    }`}
                  >
                    {complete ? <MdCheck /> : rejected ? <MdClose /> : <Icon />}
                  </span>
                </div>
                <p className={`mt-3 text-[10px] font-semibold tracking-wide ${complete ? 'text-[var(--admin-gold-dark)]' : 'text-gray-500'}`}>
                  {stage.label}
                </p>
                <div className="mt-1 flex justify-center">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold leading-none ${badgeClass}`}>
                    {formatLabel(stage.value) || 'N/A'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const hasCompleteBankDetails = (bankDetails = {}) =>
  Boolean(
    bankDetails?.accountHolderName &&
      bankDetails?.accountNumber &&
      bankDetails?.ifscCode &&
      bankDetails?.bankName
  );

const formatAddress = (address = {}) =>
  [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode || address.pincode,
    address.country,
  ].filter(Boolean).join(', ');

const firstValue = (...values) =>
  values.find((value) => String(value || '').trim().length > 0) || '';

const normalizeBankDetails = (bankDetails = {}) => ({
  accountHolderName: firstValue(
    bankDetails.accountHolderName,
    bankDetails.holderName,
    bankDetails.accountName,
    bankDetails.beneficiaryName,
  ),
  accountNumber: firstValue(
    bankDetails.accountNumber,
    bankDetails.bankAccountNumber,
    bankDetails.accountNo,
    bankDetails.bankAccountNo,
  ),
  ifscCode: firstValue(bankDetails.ifscCode, bankDetails.ifsc, bankDetails.ifsc_code),
  bankName: firstValue(bankDetails.bankName, bankDetails.bank),
  branchName: firstValue(bankDetails.branchName, bankDetails.branch),
});

const getPrimaryOrganization = (organizations = []) =>
  organizations.find((organization) => organization?.isDefault) || organizations[0] || null;

const countBy = (items = [], predicate) => items.filter(predicate).length;
const isOrganizationApprovedForSelling = (organization = {}) =>
  ['approved', 'active'].includes(String(organization.approvalStatus || '').toLowerCase());

const isOrganizationLiveForSelling = (organization = {}) =>
  isOrganizationApprovedForSelling(organization) &&
  organization.kycStatus === 'verified' &&
  organization.bankVerificationStatus === 'verified' &&
  organization.goLiveStatus === 'live';

const getOrganizationGoLiveStatus = (organization = {}) => {
  if (isOrganizationLiveForSelling(organization)) return 'live';
  if (organization.goLiveStatus === 'blocked' || organization.approvalStatus === 'blocked') return 'blocked';
  if (
    organization.goLiveStatus === 'rejected' ||
    organization.approvalStatus === 'rejected' ||
    organization.kycStatus === 'rejected' ||
    organization.bankVerificationStatus === 'rejected'
  ) {
    return 'rejected';
  }
  if (organization.goLiveStatus === 'live' && !isOrganizationApprovedForSelling(organization)) {
    return 'approval_pending';
  }
  if (
    organization.goLiveStatus === 'ready' ||
    isOrganizationApprovedForSelling(organization) ||
    (organization.kycStatus === 'verified' && organization.bankVerificationStatus === 'verified')
  ) {
    return 'ready';
  }
  return organization.goLiveStatus || 'pending';
};

const getOrganizationGoLiveLabel = (organization = {}) => {
  const status = getOrganizationGoLiveStatus(organization);
  if (status === 'approval_pending') return 'Approval pending';
  return organization.goLiveStatus || status;
};

const getCountStatus = (total, count, completeStatus, partialStatus, emptyStatus = 'pending') => {
  if (!total) return 'not_created';
  if (count === total) return completeStatus;
  if (count > 0) return partialStatus;
  return emptyStatus;
};

const summarizeOrganizations = (organizations = [], fallback = {}, primaryOrganization = null) => {
  const hasLoadedOrganizations = Array.isArray(organizations) && organizations.length > 0;
  if (!hasLoadedOrganizations && fallback?.total !== undefined) {
    return {
      total: Number(fallback.total || 0),
      approvedCount: Number(fallback.approvedCount || 0),
      kycVerifiedCount: Number(fallback.kycVerifiedCount || 0),
      bankVerifiedCount: Number(fallback.bankVerifiedCount || 0),
      liveCount: Number(fallback.liveCount || 0),
      rawGoLiveCount: Number(fallback.rawGoLiveCount || fallback.liveCount || 0),
      approvalPendingCount: Number(fallback.approvalPendingCount || 0),
      goLiveStatus: fallback.goLiveStatus || 'not_created',
      goLiveLabel:
        fallback.goLiveLabel ||
        (fallback.goLiveStatus === 'approval_pending' ? 'Approval pending' : fallback.goLiveStatus) ||
        'not_created',
      kycStatus: fallback.kycStatus || getCountStatus(Number(fallback.total || 0), Number(fallback.kycVerifiedCount || 0), 'verified', 'partially_verified'),
      kycLabel: fallback.kycLabel || 'not_submitted',
      bankStatus: fallback.bankStatus || getCountStatus(Number(fallback.total || 0), Number(fallback.bankVerifiedCount || 0), 'verified', 'partially_verified'),
      bankLabel: fallback.bankLabel || 'not_submitted',
      approvalStatus: fallback.approvalStatus || getCountStatus(Number(fallback.total || 0), Number(fallback.approvedCount || 0), 'approved', 'partially_approved'),
      approvedLabel: fallback.approvedLabel || 'not_created',
      requiresPerOrganizationReview: Boolean(fallback.requiresPerOrganizationReview),
    };
  }

  const items = hasLoadedOrganizations
    ? organizations.filter(Boolean)
    : primaryOrganization?.id || primaryOrganization?.organizationId
      ? [primaryOrganization]
      : [];

  const total = items.length;
  const approvedCount = countBy(items, (organization) => ['approved', 'active'].includes(organization.approvalStatus));
  const kycVerifiedCount = countBy(items, (organization) => organization.kycStatus === 'verified');
  const bankVerifiedCount = countBy(items, (organization) => organization.bankVerificationStatus === 'verified');
  const liveCount = countBy(items, isOrganizationLiveForSelling);
  const rawGoLiveCount = countBy(items, (organization) => organization.goLiveStatus === 'live');
  const approvalPendingCount = countBy(items, (organization) => getOrganizationGoLiveStatus(organization) === 'approval_pending');
  const readyCount = countBy(items, (organization) => organization.goLiveStatus === 'ready');
  const blockedCount = countBy(items, (organization) => organization.goLiveStatus === 'blocked' || organization.approvalStatus === 'blocked');
  const rejectedCount = countBy(items, (organization) =>
    organization.goLiveStatus === 'rejected' ||
    organization.approvalStatus === 'rejected' ||
    organization.kycStatus === 'rejected' ||
    organization.bankVerificationStatus === 'rejected',
  );
  const goLiveStatus =
    total === 0
      ? 'not_created'
      : liveCount === total
        ? 'live'
        : liveCount > 0
          ? 'partially_live'
            : blockedCount === total
              ? 'blocked'
              : rejectedCount === total
                ? 'rejected'
                : approvalPendingCount > 0
                  ? 'approval_pending'
                : readyCount > 0 || approvedCount > 0
                  ? 'ready'
                  : 'pending';

  return {
    total,
    approvedCount,
    kycVerifiedCount,
    bankVerifiedCount,
    liveCount,
    rawGoLiveCount,
    approvalPendingCount,
    goLiveStatus,
    goLiveLabel: total > 1 ? `${liveCount}/${total} live` : getOrganizationGoLiveLabel(items[0] || {}),
    kycStatus: getCountStatus(total, kycVerifiedCount, 'verified', 'partially_verified', 'submitted'),
    kycLabel: total > 1 ? `${kycVerifiedCount}/${total} verified` : (items[0]?.kycStatus || 'not_submitted'),
    bankStatus: getCountStatus(total, bankVerifiedCount, 'verified', 'partially_verified', 'submitted'),
    bankLabel: total > 1 ? `${bankVerifiedCount}/${total} verified` : (items[0]?.bankVerificationStatus || 'not_submitted'),
    approvalStatus: getCountStatus(total, approvedCount, 'approved', 'partially_approved', 'pending'),
    approvedLabel: total > 1 ? `${approvedCount}/${total} approved` : (items[0]?.approvalStatus || 'not_created'),
    requiresPerOrganizationReview: total > 1,
    primaryOrganization: getPrimaryOrganization(items),
  };
};

const ORG_ACTION_CLS = {
  green:  'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
  blue:   'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
  yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
  red:    'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  orange: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
  gray:   'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
};

const getOrgContextActions = (organization) => {
  const { kycStatus, bankVerificationStatus, approvalStatus, goLiveStatus } = organization;
  const normalizedKycStatus = kycStatus || 'not_submitted';
  const normalizedBankStatus = bankVerificationStatus || 'not_submitted';
  const kycOk     = normalizedKycStatus === 'verified';
  const bankOk    = normalizedBankStatus === 'verified';
  const canRejectKyc = !['not_submitted', 'rejected', 'resubmit_required'].includes(normalizedKycStatus);
  const canRejectBank = !['not_submitted', 'rejected', 'resubmit_required'].includes(normalizedBankStatus);
  const approved  = ['approved', 'active'].includes(approvalStatus);
  const blocked   = approvalStatus === 'blocked';
  const rejected  = approvalStatus === 'rejected';
  const live      = goLiveStatus === 'live';
  const acts      = [];

  if (!kycOk) {
    acts.push({ id: 'kyc_approve', label: 'Approve KYC', cls: 'green', payload: { kycStatus: 'verified' } });
    if (normalizedKycStatus !== 'under_review') {
      acts.push({ id: 'kyc_review', label: 'Mark KYC Under Review', cls: 'yellow', payload: { kycStatus: 'under_review', approvalStatus: 'pending_review' } });
    }
  }
  if (canRejectKyc) {
    acts.push({ id: 'kyc_reject', label: 'Reject KYC', cls: 'red', payload: { kycStatus: 'rejected' }, needsReason: true });
  }

  if (kycOk && !bankOk) {
    acts.push({ id: 'bank_verify', label: 'Verify Bank', cls: 'green', payload: { bankVerificationStatus: 'verified' } });
  }
  if (canRejectBank) {
    acts.push({ id: 'bank_reject', label: 'Reject Bank', cls: 'red', payload: { bankVerificationStatus: 'rejected' }, needsReason: true });
  }

  if (kycOk && bankOk && !approved && !blocked) {
    acts.push({ id: 'org_approve', label: 'Approve Store', cls: 'blue', payload: { approvalStatus: 'approved' } });
  }
  if (approved && !live) {
    acts.push({ id: 'golive_approve', label: 'Approve Go Live', cls: 'blue', payload: { goLiveStatus: 'live' } });
  }
  if (live) {
    acts.push({ id: 'golive_revoke', label: 'Revoke Go Live', cls: 'orange', payload: { goLiveStatus: 'rejected' }, needsReason: true });
  }

  if (blocked || rejected) {
    acts.push({ id: 'reopen', label: 'Reopen for Review', cls: 'yellow', payload: { approvalStatus: 'pending_review' } });
  } else {
    acts.push({ id: 'pending_review', label: 'Mark Under Review', cls: 'yellow', payload: { approvalStatus: 'pending_review' } });
    acts.push({ id: 'org_reject', label: 'Reject Store', cls: 'red', payload: { approvalStatus: 'rejected' }, needsReason: true });
  }
  if (!blocked) {
    acts.push({ id: 'org_block', label: 'Block Store', cls: 'gray', payload: { approvalStatus: 'blocked', goLiveStatus: 'blocked' } });
  }

  return acts;
};

// ─── main component ───────────────────────────────────────────────────────────

const UserDetails = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const location = useLocation();
  const selector = useSelector((state) => state.user);
  const adminSelector = useSelector((state) => state.adminCore);
  const isSellerRoute = location.pathname.includes('/seller/');
  const kycOptions = useDropdownOptions('kyc-review-statuses');
  const bankOptions = useDropdownOptions('bank-review-statuses');

  const detailUser = getPayload(selector?.getAdminUserDetailsData);
  const adminCoreUser = getPayload(adminSelector?.adminUserData);
  const listFallback = [
    ...getListItems(adminSelector?.platformSubAdminsData),
    ...getListItems(adminSelector?.adminUsersData),
  ].find((item) => isSameId(item, id));
  const user = isSameId(detailUser, id)
    ? detailUser
    : isSameId(adminCoreUser, id)
      ? adminCoreUser
      : listFallback || {};
  const profile  = user.profile || {};
  const sellerProfile = user.sellerProfile || {};
  const onboarding    = user.onboarding || {};
  const [bankReviewOverride, setBankReviewOverride] = useState(null);
  const [ownerAdmin, setOwnerAdmin] = useState(null);
  const bankDetails = normalizeBankDetails(sellerProfile.bankDetails || user.bankDetails || {});
  const bankRejectionReason =
    bankReviewOverride?.bankRejectionReason ?? sellerProfile.bankRejectionReason;
  const bankStatus =
    bankReviewOverride?.bankVerificationStatus ||
    onboarding.bankVerificationStatus ||
    (bankRejectionReason
      ? 'rejected'
      : sellerProfile.bankVerificationStatus &&
        sellerProfile.bankVerificationStatus !== 'not_submitted'
        ? sellerProfile.bankVerificationStatus
        : hasCompleteBankDetails(bankDetails)
          ? 'submitted'
          : 'not_submitted');
  const accountStatus = user.accountStatus || (user.isDisable ? 'suspended' : user._id || user.id ? 'active' : '');

  const sellerKyc = user.kyc || {};

  // modal state
  const [kycModal, setKycModal]   = useState({ open: false, defaultDecision: 'verified' });
  const [bankModal, setBankModal] = useState({ open: false, defaultDecision: 'verified' });
  const [accessModules, setAccessModules] = useState([]);
  const [accessModulesLoading, setAccessModulesLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [reviewingOrgId, setReviewingOrgId] = useState(null);
  const [orgDecisionModal, setOrgDecisionModal] = useState({
    open: false,
    organization: null,
    action: null,
  });
  const organizationSummary = useMemo(
    () => summarizeOrganizations(
      organizations,
      user.organizationSummary || onboarding.organizationSummary,
      user.organization,
    ),
    [organizations, user.organizationSummary, onboarding.organizationSummary, user.organization],
  );
  const goLiveStatus =
    organizationSummary.goLiveStatus ||
    onboarding.goLiveStatus ||
    sellerProfile.goLiveStatus ||
    (user.accountStatus === 'active' ? 'live' : 'pending');
  const goLiveLabel = organizationSummary.goLiveLabel || goLiveStatus;
  const primaryOrganization = organizationSummary.primaryOrganization || getPrimaryOrganization(organizations) || user.organization || {};
  const verificationMetadata = useMemo(
    () => ({
      ...(sellerProfile.metadata || {}),
      ...(primaryOrganization.metadata || {}),
    }),
    [sellerProfile.metadata, primaryOrganization.metadata],
  );
  const verificationReferenceRows = useMemo(() => {
    const references = sellerKyc.verificationReferences || {};
    return [
      {
        label: 'GST APITXT Reference ID',
        value:
          getVerificationReferenceValue(references.gst) ||
          getVerificationReferenceValue(verificationMetadata.gstVerification),
      },
      {
        label: 'PAN APITXT Reference ID',
        value:
          getVerificationReferenceValue(references.pan) ||
          getVerificationReferenceValue(verificationMetadata.panVerification),
      },
      {
        label: 'Aadhaar APITXT Reference ID',
        value:
          getVerificationReferenceValue(references.aadhaar) ||
          getVerificationReferenceValue(verificationMetadata.aadhaarVerification),
      },
    ].filter((item) => item.value);
  }, [sellerKyc.verificationReferences, verificationMetadata]);
  const verificationDetailCards = useMemo(() => {
    const references = sellerKyc.verificationReferences || {};
    const cards = [
      {
        key: 'gst',
        title: 'GST APITXT Details',
        details: buildVerificationDetails({
          service: 'gst',
          source: verificationMetadata.gstVerification || references.gst || {},
          fallback: {
            ...references.gst,
            gstin: sellerKyc.gstNumber || sellerProfile.gstNumber || primaryOrganization.gstin,
          },
        }),
      },
      {
        key: 'pan',
        title: 'PAN APITXT Details',
        details: buildVerificationDetails({
          service: 'pan',
          source: verificationMetadata.panVerification || references.pan || {},
          fallback: {
            ...references.pan,
            panNumber: sellerKyc.panNumber || sellerProfile.panNumber || primaryOrganization.pan,
          },
        }),
      },
      {
        key: 'aadhaar',
        title: 'Aadhaar APITXT Details',
        details: buildVerificationDetails({
          service: 'aadhaar',
          source: verificationMetadata.aadhaarVerification || references.aadhaar || {},
          fallback: references.aadhaar || {},
        }),
      },
    ];

    return cards.filter((card) =>
      card.details.some((item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== ''),
    );
  }, [
    sellerKyc.verificationReferences,
    sellerKyc.gstNumber,
    sellerKyc.panNumber,
    sellerProfile.gstNumber,
    sellerProfile.panNumber,
    primaryOrganization.gstin,
    primaryOrganization.pan,
    verificationMetadata,
  ]);

  // edit form state
  const [editSeller, setEditSeller] = useState({
    displayName: '',
    legalBusinessName: '',
    businessType: '',
    avatarUrl: '',
  });

  const isSeller = user.role === 'seller';
  const shouldShowAdminAccess = !isSellerRoute && !isSeller;
  const ownerAdminId = user.ownerAdminId || user.owner_admin_id || '';
  const ownerAdminDisplayName = getDisplayName(ownerAdmin || user.ownerAdmin || user.ownerAdminUser || {});
  const ownerAdminDisplay = ownerAdminDisplayName || ownerAdmin?.email || ownerAdminId;
  const lastLoginDisplay = formatDateTime(getLastLoginValue(user));
  const handleCopyReference = useCallback(async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Reference ID copied');
    } catch {
      toast.error('Unable to copy reference ID');
    }
  }, []);
  const assignedModuleCards = useMemo(() => {
    if (!shouldShowAdminAccess) return [];

    const modulesFromApi = (Array.isArray(accessModules) ? accessModules : [])
      .filter(moduleHasAccess)
      .map((module) => ({
        id: module.slug,
        name: module.name || formatModuleName(module.slug),
        tab: getModuleTab(module),
        permissions: getAssignedModulePermissions(module),
      }));

    if (modulesFromApi.length) return modulesFromApi;

    return (user.allowedModules || []).map((moduleSlug) => ({
      id: moduleSlug,
      name: formatModuleName(moduleSlug),
      tab: MODULE_TABS[moduleSlug] || 'Assigned',
      permissions: ['View'],
    }));
  }, [accessModules, shouldShowAdminAccess, user.allowedModules]);
  const assignedModuleGroups = useMemo(
    () => groupModulesByTab(assignedModuleCards),
    [assignedModuleCards],
  );

  useEffect(() => {
    if (id) {
      dispatch(getAdminUserDetails({ _id: id }));
      if (isSellerRoute) {
        return;
      } else {
        dispatch(getAdminCoreUser({ userId: id }));
        dispatch(getPlatformSubAdmins({ limit: 100 }));
      }
    }
  }, [dispatch, id, isSellerRoute]);

  useEffect(() => {
    if (!shouldShowAdminAccess) {
      setAccessModules([]);
      setAccessModulesLoading(false);
      return;
    }
    if (!id || !user.role) return;

    let isMounted = true;
    setAccessModulesLoading(true);
    apiRequest('GET', ENDPOINTS.adminAccess.modules, {
      userId: id,
      role: user.role,
      includePermissions: true,
    })
      .then((response) => {
        if (!isMounted) return;
        const payload = response?.data?.data || response?.normalized?.data || response?.data || {};
        setAccessModules(Array.isArray(payload?.modules) ? payload.modules : []);
      })
      .catch(() => {
        if (!isMounted) return;
        setAccessModules([]);
      })
      .finally(() => {
        if (isMounted) setAccessModulesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, shouldShowAdminAccess, user.role]);

  useEffect(() => {
    setEditSeller({
      displayName:       sellerProfile.displayName       || '',
      legalBusinessName: sellerProfile.legalBusinessName || '',
      businessType:      sellerProfile.businessType      || '',
      avatarUrl:         profile.avatarUrl || user.user_image || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerProfile.displayName, sellerProfile.legalBusinessName, sellerProfile.businessType, profile.avatarUrl]);

  const refresh = useCallback(() => {
    dispatch(getAdminUserDetails({ _id: id }));
    if (!isSellerRoute) {
      dispatch(getAdminCoreUser({ userId: id }));
    }
  }, [dispatch, id, isSellerRoute]);

  const loadSellerOrganizations = useCallback(async () => {
    if (!id || !isSeller) return;
    setOrganizationsLoading(true);
    try {
      const response = await apiRequest('GET', ENDPOINTS.sellers.organizations(id), { limit: 100 });
      const payload = getPayload(response);
      setOrganizations(payload.organizations || payload.items || payload.list || []);
    } catch (error) {
      setOrganizations([]);
      toast.error(error?.message || 'Failed to load seller organizations');
    } finally {
      setOrganizationsLoading(false);
    }
  }, [id, isSeller]);

  useEffect(() => {
    loadSellerOrganizations();
  }, [loadSellerOrganizations]);

  useEffect(() => {
    if (!shouldShowAdminAccess || !ownerAdminId) {
      setOwnerAdmin(null);
      return;
    }

    const embeddedOwner = user.ownerAdmin || user.ownerAdminUser;
    if (embeddedOwner) {
      setOwnerAdmin(embeddedOwner);
      return;
    }

    let isMounted = true;
    apiRequest('GET', ENDPOINTS.users.adminUser(ownerAdminId))
      .then((response) => {
        if (!isMounted) return;
        setOwnerAdmin(getPayload(response));
      })
      .catch(() => {
        if (isMounted) setOwnerAdmin(null);
      });

    return () => {
      isMounted = false;
    };
  }, [ownerAdminId, shouldShowAdminAccess, user.ownerAdmin, user.ownerAdminUser]);

  // ── KYC review ────────────────────────────────────────────────────────────
  const handleKycSubmit = async (decision, rejectionReason) => {
    const res = await dispatch(
      reviewSellerKyc({ sellerId: id, verificationStatus: decision, rejectionReason }),
    ).unwrap();
    toast.success(res?.message || 'KYC status updated');
    refresh();
  };

  // ── Bank review ───────────────────────────────────────────────────────────
  const handleBankSubmit = async (decision, rejectionReason) => {
    try {
      const res = await dispatch(
        updateSellerBankStatus({ sellerId: id, bankVerificationStatus: decision, bankRejectionReason: rejectionReason }),
      ).unwrap();
      setBankReviewOverride({
        bankVerificationStatus: decision,
        bankRejectionReason: decision === 'rejected' ? rejectionReason : null,
      });
      toast.success(res?.message || 'Bank status updated');
      await refresh();
    } catch (error) {
      const missingFields = error?.details?.missingFields || [];
      toast.error(
        missingFields.length
          ? `Bank details missing: ${missingFields.join(', ')}`
          : (error?.message || 'Failed to update bank status'),
      );
    }
  };

  // ── Go Live ───────────────────────────────────────────────────────────────
  const handleGoLive = async () => {
    try {
      const res = await dispatch(updateSellerGoLive({ sellerId: id, goLiveStatus: 'live' })).unwrap();
      toast.success(res?.message || 'Seller moved live');
      refresh();
    } catch (error) {
      const details = error?.details || {};
      const missing = [
        details.kycStatus && !['verified', 'approved'].includes(details.kycStatus)
          ? `KYC: ${details.kycStatus}`
          : null,
        details.bankVerificationStatus && details.bankVerificationStatus !== 'verified'
          ? `Bank: ${details.bankVerificationStatus}`
          : null,
        details.profileCompleted === false ? 'Profile incomplete' : null,
      ].filter(Boolean);
      toast.error(
        missing.length
          ? `Not ready for go-live: ${missing.join(', ')}`
          : (error?.message || 'Failed to activate seller'),
      );
    }
  };

  const submitOrganizationAction = async (organization, action, rejectionReason = null) => {
    const organizationId = organization?.id || organization?.organizationId;
    if (!organizationId) return;

    let payload = { ...action.payload };

    if (action.needsReason) {
      const reason = String(rejectionReason || '').trim();
      if (!reason) {
        toast.error('Rejection reason is required');
        return;
      }
      payload.rejectionReason = reason;
      if (!payload.requiredChanges) payload.requiredChanges = [reason];
    }

    setReviewingOrgId(organizationId);
    try {
      const response = await apiRequest(
        'PATCH',
        ENDPOINTS.sellers.organizationStatus(id, organizationId),
        payload,
      );
      toast.success(response?.message || 'Organization updated');
      await loadSellerOrganizations();
    } catch (error) {
      toast.error(error?.message || 'Failed to update organization');
    } finally {
      setReviewingOrgId(null);
    }
  };

  const handleOrganizationAction = (organization, action) => {
    if (action.needsReason) {
      setOrgDecisionModal({ open: true, organization, action });
      return;
    }
    submitOrganizationAction(organization, action);
  };

  const handleOrganizationDecisionSubmit = async (_decision, rejectionReason) => {
    const { organization, action } = orgDecisionModal;
    await submitOrganizationAction(organization, action, rejectionReason);
  };

  // ── Profile save ──────────────────────────────────────────────────────────
  const handleSellerAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      toast.error('Please upload a valid image');
      return;
    }

    try {
      const imageUrl = await uploadFile(file, 'PROFILES');
      setEditSeller((prev) => ({ ...prev, avatarUrl: imageUrl }));
      toast.success('Seller image uploaded');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload seller image');
    }
  };

  const handleSaveSellerProfile = async (e) => {
    e.preventDefault();
    try {
      const firstName = profile.firstName || editSeller.displayName?.split(/\s+/)?.[0] || 'Seller';
      const lastName =
        profile.lastName ||
        editSeller.displayName?.split(/\s+/)?.slice(1).join(' ') ||
        'User';
      const res = await dispatch(
        updateSeller({
          _id: id,
          profile: {
            firstName,
            lastName,
            avatarUrl: editSeller.avatarUrl || '',
          },
          sellerProfile: {
            displayName: editSeller.displayName,
            legalBusinessName: editSeller.legalBusinessName,
            businessType: editSeller.businessType,
          },
        }),
      ).unwrap();
      toast.success(res?.message || 'Seller details updated');
      refresh();
    } catch (error) {
      toast.error(error?.message || 'Failed to update seller details');
    }
  };

  const checklist = onboarding.checklist || sellerProfile.onboardingChecklist || {};
  const kycStatus = onboarding.kycStatus || sellerKyc.verificationStatus || sellerProfile.kycStatus || 'not_submitted';

  return (
    <>
      <Loader loading={selector.loading} />

      {/* KYC Decision Modal */}
      <VerificationDecisionModal
        isOpen={kycModal.open}
        onClose={() => setKycModal((s) => ({ ...s, open: false }))}
        onSubmit={handleKycSubmit}
        title="Review Seller KYC"
        decisionLabel="KYC Decision"
        options={kycOptions.options}
        defaultDecision={kycModal.defaultDecision}
        rejectionValue="rejected"
        rejectionLabel="KYC Rejection Reason"
        submitText="Update KYC"
      />

      {/* Bank Decision Modal */}
      <VerificationDecisionModal
        isOpen={bankModal.open}
        onClose={() => setBankModal((s) => ({ ...s, open: false }))}
        onSubmit={handleBankSubmit}
        title="Review Seller Bank Details"
        decisionLabel="Bank Decision"
        options={bankOptions.options}
        defaultDecision={bankModal.defaultDecision}
        rejectionValue="rejected"
        rejectionLabel="Bank Rejection Reason"
        submitText="Update Bank"
      />

      <VerificationDecisionModal
        isOpen={orgDecisionModal.open}
        onClose={() => setOrgDecisionModal((s) => ({ ...s, open: false }))}
        onSubmit={handleOrganizationDecisionSubmit}
        title={orgDecisionModal.action?.label || 'Review Organization'}
        decisionLabel="Organization Decision"
        options={[
          {
            value: 'rejected',
            label: orgDecisionModal.action?.label || 'Reject',
          },
        ]}
        defaultDecision="rejected"
        rejectionValue="rejected"
        rejectionLabel={
          orgDecisionModal.action?.id === 'bank_reject'
            ? 'Bank Rejection Reason'
            : orgDecisionModal.action?.id === 'kyc_reject'
              ? 'KYC Rejection Reason'
              : 'Rejection Reason'
        }
        submitText={orgDecisionModal.action?.label || 'Submit'}
      />

      <div className="space-y-4">
        {/* Breadcrumb + Account Status */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm text-gray-500">
            <Link to="/app/home" className="hover:underline">Home</Link> / <b className="text-gray-800">User Details</b>
          </h3>
          <StatusBadge value={accountStatus} />
        </div>

        {/* ── Account & Access ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className={`bg-white border border-gray-200 rounded-lg p-5 ${shouldShowAdminAccess ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Account</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <Row label="User ID" value={user._id || user.id || user.userId} />
              <Row label="Full Name" value={getDisplayName(user)} />
              <Row label="Email"     value={user.email} />
              <Row label="Phone"     value={user.phone} />
              <Row label="Role"      value={formatLabel(user.role)} />
              <Row label="Status"    value={formatLabel(accountStatus)} />
              <Row label="Created At"  value={formatDateTime(user.createdAt)} />
              <Row label="Last Login"  value={lastLoginDisplay || 'N/A'} />
            </div>
          </section>

          {shouldShowAdminAccess && (
            <section className="bg-white border border-gray-200 rounded-lg p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-3">Access</h2>
              <Row label="Assigned Groups" value={assignedModuleGroups.map((group) => group.tabName).join(', ')} />
              <Row label="Module Count" value={assignedModuleCards.length ? `${assignedModuleCards.length}` : ''} />
              <Row label="Owner Admin"  value={ownerAdminDisplay} />
              {user.ownerSellerId && <Row label="Owner Seller" value={user.ownerSellerId} />}
            </section>
          )}
        </div>

        {shouldShowAdminAccess && (
          <section className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-800">Module Access List</h2>
            {accessModulesLoading && <span className="text-xs text-gray-400">Loading access...</span>}
          </div>
          {assignedModuleGroups.length ? (
            <div className="space-y-4">
              {assignedModuleGroups.map((group) => (
                <div key={group.tabName} className="rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{group.tabName}</h3>
                      <p className="text-xs text-gray-400">
                        {group.items.length} sub-module{group.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                      Active
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.items.map((module) => (
                      <div key={module.id} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[minmax(180px,260px),1fr]">
                        <div>
                          <p className="font-medium text-gray-900">{module.name}</p>
                          <p className="text-xs text-gray-400">{module.id}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(module.permissions.length ? module.permissions : ['View']).map((permission) => (
                            <span
                              key={`${module.id}-${permission}`}
                              className="inline-flex items-center rounded-md border border-[var(--admin-gold)]/40 bg-[var(--admin-gold)]/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#8A5A1F]"
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No assigned modules found for this user.</p>
          )}
          </section>
        )}

        {/* ── Seller Section ───────────────────────────────────────────────── */}
        {isSeller && (
          <>
            {/* Verification Status Overview */}
            <section className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-gray-800">Verification Status</h2>
                <p className="mt-1 text-xs text-gray-500">Track seller readiness from onboarding through go-live approval.</p>
              </div>

              <VerificationProgress
                stages={[
                  { label: 'Onboarding',  value: onboarding.status || sellerProfile.onboardingStatus },
                  {
                    label: organizationSummary.total > 1 ? 'Org KYC' : 'KYC',
                    value: organizationSummary.total > 1 ? organizationSummary.kycLabel : kycStatus,
                    status: organizationSummary.total > 1 ? organizationSummary.kycStatus : kycStatus,
                  },
                  {
                    label: organizationSummary.total > 1 ? 'Org Bank' : 'Bank',
                    value: organizationSummary.total > 1 ? organizationSummary.bankLabel : bankStatus,
                    status: organizationSummary.total > 1 ? organizationSummary.bankStatus : bankStatus,
                  },
                  { label: 'Go Live', value: goLiveLabel, status: goLiveStatus },
                ]}
              />

              {/* Action Buttons — shown only for legacy sellers without organizations */}
              {organizationSummary.total === 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-3 py-1.5 text-xs rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                  onClick={() => setKycModal({ open: true, defaultDecision: 'verified' })}
                >
                  Approve KYC
                </button>
                <button
                  className="px-3 py-1.5 text-xs rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                  onClick={() => setKycModal({ open: true, defaultDecision: 'rejected' })}
                >
                  Reject KYC
                </button>
                <button
                  className="px-3 py-1.5 text-xs rounded-md bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100"
                  onClick={() => setKycModal({ open: true, defaultDecision: 'under_review' })}
                >
                  Mark KYC Under Review
                </button>
                <>
                  <div className="w-px bg-gray-200 mx-1 self-stretch" />
                  <button
                    className="px-3 py-1.5 text-xs rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    onClick={() => setBankModal({ open: true, defaultDecision: 'verified' })}
                  >
                    Verify Bank
                  </button>
                  <button
                    className="px-3 py-1.5 text-xs rounded-md bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
                    onClick={() => setBankModal({ open: true, defaultDecision: 'rejected' })}
                  >
                    Reject Bank
                  </button>
                </>
                <>
                  <div className="w-px bg-gray-200 mx-1 self-stretch" />
                  <button
                    className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleGoLive}
                    disabled={goLiveStatus === 'live'}
                  >
                    Approve Go Live
                  </button>
                </>
              </div>
              )}

              {/* KYC rejection reason alert (live on profile) */}
              {onboarding.kycRejectionReason && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-xs font-semibold text-red-700">KYC Rejection Reason</p>
                  <p className="text-sm text-red-600 mt-0.5">{onboarding.kycRejectionReason}</p>
                </div>
              )}

              {/* Bank rejection reason alert */}
              {bankRejectionReason && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-md p-3">
                  <p className="text-xs font-semibold text-orange-700">Bank Rejection Reason</p>
                  <p className="text-sm text-orange-600 mt-0.5">{bankRejectionReason}</p>
                </div>
              )}
            </section>

            {/* Onboarding Checklist */}
            <OnboardingChecklist checklist={checklist} />

            {verificationReferenceRows.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-gray-800">APITXT Verification References</h2>
                  <p className="mt-1 text-xs text-gray-500">Provider reference IDs received during seller KYC verification.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {verificationReferenceRows.map((item) => (
                    <CopyableReferenceRow
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      onCopy={handleCopyReference}
                    />
                  ))}
                </div>
              </section>
            )}

            {verificationDetailCards.length > 0 && (
              <section className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="mb-4">
                  <h2 className="text-base font-semibold text-gray-800">APITXT Verification Details</h2>
                  <p className="mt-1 text-xs text-gray-500">Admin-only provider details captured during seller KYC checks.</p>
                </div>
                <div className="space-y-4">
                  {verificationDetailCards.map((card) => (
                    <VerificationDetailsCard
                      key={card.key}
                      title={card.title}
                      details={card.details}
                      onCopy={handleCopyReference}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Seller Organizations</h2>
                  <p className="mt-1 text-xs text-gray-500">Legal entities used for GST, invoices, products, orders, and payouts.</p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  onClick={loadSellerOrganizations}
                  disabled={organizationsLoading}
                >
                  Refresh
                </button>
              </div>

              {organizationsLoading && <p className="py-4 text-center text-sm text-gray-400">Loading organizations…</p>}
              {!organizationsLoading && !organizations.length && (
                <p className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                  No organization is available for this seller yet.
                </p>
              )}
              {!organizationsLoading && organizations.map((organization) => {
                const organizationId = organization.id || organization.organizationId;
                const bank = organization.bankDetails || {};
                const documents = organization.documents || {};
                const isReviewing = reviewingOrgId === organizationId;
                const anyReviewing = reviewingOrgId !== null;
                const hasAddresses = organization.billingAddress || organization.pickupAddress || organization.returnAddress;
                return (
                  <div key={organizationId} className="mb-4 rounded-lg border border-gray-200 last:mb-0 overflow-hidden">

                    {/* ── Header ─────────────────────────────────────────── */}
                    <div className="flex flex-wrap items-start justify-between gap-3 bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{organization.storeDisplayName || organization.legalBusinessName || organizationId}</h3>
                          {organization.isDefault && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">Default</span>}
                        </div>
                        {organization.storeDisplayName && organization.legalBusinessName && organization.storeDisplayName !== organization.legalBusinessName && (
                          <p className="mt-0.5 text-xs text-gray-500">Legal: {organization.legalBusinessName}</p>
                        )}
                        <p className="mt-0.5 text-[11px] text-gray-400">{organizationId}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge value={organization.approvalStatus} />
                        <StatusBadge value={`KYC ${organization.kycStatus || 'not_submitted'}`} status={organization.kycStatus} />
                        <StatusBadge value={`Bank ${organization.bankVerificationStatus || 'not_submitted'}`} status={organization.bankVerificationStatus} />
                        <StatusBadge value={`Go Live ${getOrganizationGoLiveLabel(organization)}`} status={getOrganizationGoLiveStatus(organization)} />
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100 px-4">

                      {/* ── Business Identity ──────────────────────────── */}
                      <div className="py-4">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Business Identity</p>
                        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
                          <Row label="GSTIN"           value={organization.gstin} />
                          <Row label="PAN"             value={organization.pan} />
                          <Row label="Business Type"   value={organization.businessType} />
                          <Row label="Primary Contact" value={organization.primaryContactName} />
                          {organization.registrationNumber && <Row label="Registration No." value={organization.registrationNumber} />}
                         {organization.businessWebsite && (
  <Row
    label="Website"
    value={
      <a
        href={
          organization.businessWebsite.startsWith("http")
            ? organization.businessWebsite
            : `https://${organization.businessWebsite}`
        }
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {organization.businessWebsite}
      </a>
    }
  />
)}
                          {organization.aadhaarNumber && <Row label="Aadhaar" value={organization.aadhaarNumber} />}
                          {organization.dateOfBirth && <Row label="Date of Birth" value={formatDateTime(organization.dateOfBirth)} />}
                        </div>
                      </div>

                      {/* ── Contact (clearly separated from login email) ── */}
                      <div className="py-4">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Contact</p>
                        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
                          <div className="border-b border-gray-100 py-3">
                            <p className="text-xs uppercase tracking-wide text-gray-400">Seller Account Email</p>
                            <p className="text-sm text-gray-900 break-words">{user.email || '—'}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Login email — not org-specific</p>
                          </div>
                          <Row label="Organization Official Email" value={organization.supportEmail} />
                          <Row label="Organization Phone" value={organization.supportPhone} />
                        </div>
                      </div>

                      {/* ── Bank Details ───────────────────────────────── */}
                      <div className="py-4">
                        <div className="mb-3 flex items-center gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Bank Details</p>
                          <StatusBadge value={organization.bankVerificationStatus || 'not_submitted'} status={organization.bankVerificationStatus} />
                        </div>
                        {hasCompleteBankDetails(bank) ? (
                          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
                            <Row label="Account Holder" value={bank.accountHolderName} />
                            <Row label="Account Number" value={bank.accountNumber} />
                            <Row label="Bank Name"      value={bank.bankName} />
                            <Row label="IFSC Code"      value={bank.ifscCode} />
                            {bank.branchName && <Row label="Branch" value={bank.branchName} />}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Bank details not submitted.</p>
                        )}
                      </div>

                      {/* ── Addresses ──────────────────────────────────── */}
                      {hasAddresses && (
                        <div className="py-4">
                          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Addresses</p>
                          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            {organization.billingAddress && (
                              <div>
                                <p className="mb-1.5 text-xs font-medium text-gray-500">Billing / Business</p>
                                <p className="text-sm text-gray-800 leading-relaxed">{formatAddress(organization.billingAddress) || '—'}</p>
                              </div>
                            )}
                            {organization.pickupAddress && (
                              <div>
                                <p className="mb-1.5 text-xs font-medium text-gray-500">Pickup</p>
                                <p className="text-sm text-gray-800 leading-relaxed">{formatAddress(organization.pickupAddress) || '—'}</p>
                              </div>
                            )}
                            {organization.returnAddress && (
                              <div>
                                <p className="mb-1.5 text-xs font-medium text-gray-500">Return</p>
                                <p className="text-sm text-gray-800 leading-relaxed">{formatAddress(organization.returnAddress) || '—'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── Tax / Invoice / Payout ─────────────────────── */}
                      <div className="py-4">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tax, Invoice & Payout</p>
                        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
                          <Row label="Tax State"        value={organization.taxSettings?.state} />
                          <Row label="Invoice Prefix"   value={organization.invoiceSettings?.invoicePrefix} />
                          <Row label="Invoice State"    value={organization.invoiceSettings?.state} />
                          <Row label="Payout Schedule"  value={organization.payoutSettings?.payoutSchedule} />
                          <Row label="Approved At"      value={formatDateTime(organization.approvedAt)} />
                          <Row label="Go Live At"       value={formatDateTime(organization.goLiveApprovedAt)} />
                        </div>
                      </div>

                      {/* ── Notes / Rejection ──────────────────────────── */}
                      {Boolean(organization.description || organization.rejectionReason || organization.requiredChanges?.length) && (
                        <div className="py-4">
                          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Notes</p>
                          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
                            {organization.description && <Row label="Description" value={organization.description} />}
                            {organization.rejectionReason && (
                              <div className="border-b border-gray-100 py-3">
                                <p className="text-xs uppercase tracking-wide text-gray-400">Rejection Reason</p>
                                <p className="mt-0.5 text-sm text-red-600 break-words">{organization.rejectionReason}</p>
                              </div>
                            )}
                            {organization.requiredChanges?.length > 0 && (
                              <div className="border-b border-gray-100 py-3">
                                <p className="text-xs uppercase tracking-wide text-gray-400">Required Changes</p>
                                <ul className="mt-0.5 list-disc list-inside space-y-0.5">
                                  {organization.requiredChanges.map((change, i) => (
                                    <li key={i} className="text-sm text-orange-700">{change}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* ── KYC Documents ──────────────────────────────── */}
                      <div className="py-4">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">KYC Documents</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(documents).filter(([, v]) => v).length ? (
                            Object.entries(documents).filter(([, v]) => v).map(([key, value]) => (
                              <a key={key} href={value} target="_blank" rel="noopener noreferrer"
                                className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-[var(--admin-blue)] hover:bg-gray-50">
                                {key.replace(/Url$/, '').replace(/([A-Z])/g, ' $1').trim()}
                              </a>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">No documents uploaded</span>
                          )}
                        </div>
                      </div>

                      {/* ── Admin Actions ──────────────────────────────── */}
                      <div className="py-4">
                        <div className="flex flex-wrap gap-2">
                          {getOrgContextActions(organization).map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${ORG_ACTION_CLS[action.cls] || ORG_ACTION_CLS.gray}`}
                              onClick={() => handleOrganizationAction(organization, action)}
                              disabled={anyReviewing}
                            >
                              {isReviewing ? '…' : action.label}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </section>

            {/* Seller Account & Profile Edit */}
            <section className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Seller Account Profile</h2>
                  <p className="mt-1 text-xs text-gray-500">Seller login identity and storefront branding.</p>
                </div>
                <StatusBadge value={onboarding.status || sellerProfile.onboardingStatus || accountStatus} />
              </div>

              {/* Seller Account Identity (read-only) */}
              <div className="mb-5 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Seller Account (Login Identity)</p>
                <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
                  <Row label="Seller Login Email" value={user.email} />
                  <Row label="Seller Phone"       value={user.phone} />
                  <Row
                    label="Onboarding Status"
                    value={formatLabel(onboarding.status || sellerProfile.onboardingStatus)}
                  />
                </div>
              </div>

              {/* Organization-based snapshot */}
              <div className="mb-5 rounded-lg border border-[var(--admin-gold)]/30 bg-[#fffaf0] px-4 py-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A5A1F]">Primary Organization Data</p>
                    <p className="mt-1 text-xs text-gray-500">Organization-level details shown separately from the seller login profile.</p>
                  </div>
                  {primaryOrganization?.id || primaryOrganization?.organizationId ? (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-500">
                      {primaryOrganization.isDefault ? 'Default organization' : 'Organization'}
                    </span>
                  ) : null}
                </div>
                {primaryOrganization?.id || primaryOrganization?.organizationId ? (
                  <>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {primaryOrganization.storeDisplayName || primaryOrganization.legalBusinessName || primaryOrganization.id || primaryOrganization.organizationId}
                      </h3>
                      <StatusBadge value={primaryOrganization.approvalStatus || 'not_created'} status={primaryOrganization.approvalStatus} />
                      <StatusBadge value={`KYC ${primaryOrganization.kycStatus || 'not_submitted'}`} status={primaryOrganization.kycStatus} />
                      <StatusBadge value={`Bank ${primaryOrganization.bankVerificationStatus || 'not_submitted'}`} status={primaryOrganization.bankVerificationStatus} />
                    </div>
                    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
                      <Row label="Official Email" value={primaryOrganization.supportEmail} />
                      <Row label="Official Phone" value={primaryOrganization.supportPhone} />
                      <Row label="GSTIN" value={primaryOrganization.gstin} />
                      <Row label="PAN" value={primaryOrganization.pan} />
                      <Row label="Business Type" value={primaryOrganization.businessType} />
                      <Row
                        label="Bank Account"
                        value={
                          hasCompleteBankDetails(normalizeBankDetails(primaryOrganization.bankDetails || {}))
                            ? normalizeBankDetails(primaryOrganization.bankDetails || {}).accountNumber
                            : ''
                        }
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                      {[
                        ['Billing Address', primaryOrganization.billingAddress],
                        ['Pickup Address', primaryOrganization.pickupAddress],
                        ['Return Address', primaryOrganization.returnAddress],
                      ].map(([label, address]) => (
                        <div key={label} className="rounded-md border border-[#ead7b7] bg-white p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
                          <p className="mt-1 text-sm leading-relaxed text-gray-800">{formatAddress(address) || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
                    No organization data is available for this seller yet.
                  </p>
                )}
              </div>

              {/* Display / branding fields */}
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Display & Branding</p>
                <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
                  <Row label="Display Name"      value={sellerProfile.displayName} />
                  <Row label="Legal Business"    value={sellerProfile.legalBusinessName} />
                  <Row label="Business Type"     value={sellerProfile.businessType} />
                  {sellerProfile.description && <Row label="Description" value={sellerProfile.description} />}
                </div>
              </div>

              {/* Editable Fields */}
              <form className="rounded-lg border border-gray-200 bg-white" onSubmit={handleSaveSellerProfile}>
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Edit Profile</p>
                  <p className="mt-1 text-xs text-gray-400">Update seller image and business display details.</p>
                </div>

                <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[220px,1fr]">
                  {/* Seller image */}
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex flex-col items-center text-center">
                      <img
                        src={editSeller.avatarUrl || '/Img/user.png'}
                        alt="Seller"
                        className="h-24 w-24 rounded-full border border-gray-200 bg-white object-cover shadow-sm"
                      />
                      <p className="mt-3 text-sm font-semibold text-gray-800">{editSeller.displayName || sellerProfile.displayName || 'Seller'}</p>
                      <p className="mt-1 max-w-full truncate text-xs text-gray-400">{user.email || 'Login email unavailable'}</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <label className="inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[var(--admin-gold)] px-2.5 py-2 text-center text-xs font-semibold text-[var(--admin-navy)] transition-colors hover:bg-[var(--admin-gold-dark)]">
                        <MdCloudUpload size={16} />
                        <span>Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleSellerAvatarUpload} />
                      </label>
                      {editSeller.avatarUrl && (
                        <button
                          type="button"
                          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--admin-gold)] bg-[#fff8e6] px-2.5 py-2 text-xs font-semibold text-[var(--admin-gold-dark)] transition-colors hover:bg-[#fff3cc]"
                          onClick={() => setEditSeller((prev) => ({ ...prev, avatarUrl: '' }))}
                        >
                          <MdDeleteOutline size={16} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-gray-500">Seller Login Email</label>
                        <input
                          readOnly
                          value={user.email || ''}
                          className="min-h-[38px] rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400 outline-none cursor-not-allowed"
                        />
                        <p className="text-[11px] text-gray-400">Login email cannot be changed here.</p>
                      </div>

                      <FormInput
                        label="Display Name"
                        name="displayName"
                        value={editSeller.displayName}
                        onChange={(e) => setEditSeller((p) => ({ ...p, displayName: e.target.value }))}
                      />
                      <FormInput
                        label="Legal Business Name"
                        name="legalBusinessName"
                        value={editSeller.legalBusinessName}
                        onChange={(e) => setEditSeller((p) => ({ ...p, legalBusinessName: e.target.value }))}
                      />
                      <FormInput
                        label="Business Type"
                        name="businessType"
                        value={editSeller.businessType}
                        onChange={(e) => setEditSeller((p) => ({ ...p, businessType: e.target.value }))}
                      />
                    </div>

                    {/* <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                      Organization-level fields such as official email, phone, bank details, addresses, GSTIN, and PAN are managed in <strong>Seller Organizations</strong>.
                    </div> */}
                  </div>
                </div>

                <div className="flex justify-end border-t border-gray-100 px-4 py-3">
                  <button type="submit" className="rounded-md bg-[var(--admin-gold)] px-4 py-2 text-sm font-semibold text-[var(--admin-navy)] transition-colors hover:bg-[var(--admin-gold-dark)]">
                    Save Profile
                  </button>
                </div>
              </form>
            </section>
          </>
        )}
      </div>
    </>
  );
};

export default UserDetails;
