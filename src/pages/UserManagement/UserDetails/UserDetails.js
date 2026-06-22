import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useParams } from 'react-router-dom';
import Loader from '../../../components/Loader/Loader';
import FormInput from '../../../components/Atoms/FormInput/FormInput';
import {
  getAdminUserDetails,
  getSellerKyc,
  reviewSellerKyc,
  updateSeller,
  updateSellerBankStatus,
  updateSellerGoLive,
} from '../../../Redux/userManagementSlice';
import { getAdminUser as getAdminCoreUser, getPlatformSubAdmins } from '../../../Redux/adminCoreSlice';
import { toast } from 'sonner';
import VerificationDecisionModal from '../../../components/Seller/VerificationDecisionModal';
import OnboardingChecklist from '../../../components/Seller/OnboardingChecklist';
import SellerKycCard from '../../../components/Seller/SellerKycCard';
import { uploadFile } from '../../../_helpers/globalFunctions';
import { apiRequest } from '../../../_helpers/apiConfig';
import { ENDPOINTS } from '../../../_helpers/endpoints';
import useDropdownOptions from '../../../hooks/useDropdownOptions';

// ─── small display helpers ────────────────────────────────────────────────────

const Row = ({ label, value }) => (
  <div className="border-b border-gray-100 py-3">
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className="text-sm text-gray-900 break-words">{value || '—'}</p>
  </div>
);

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
  ready_for_go_live:   'bg-emerald-100 text-emerald-700',
  under_review:        'bg-yellow-100 text-yellow-700',
  in_progress:         'bg-blue-100 text-blue-700',
  submitted:           'bg-blue-100 text-blue-700',
  rejected:            'bg-red-100 text-red-700',
  suspended:           'bg-red-100 text-red-700',
  pending:             'bg-gray-100 text-gray-600',
  initiated:           'bg-gray-100 text-gray-600',
  not_submitted:       'bg-gray-100 text-gray-400',
  pending_approval:    'bg-yellow-100 text-yellow-700',
};

const StatusBadge = ({ value }) => {
  const lookupValue = String(value || '').toLowerCase().replace(/^(kyc|bank)\s+/, '');
  const colorClass = STATUS_COLORS[lookupValue] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}>
      {value || 'N/A'}
    </span>
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

const hasAnyBankDetails = (bankDetails = {}) =>
  Object.values(bankDetails).some((value) => String(value || '').trim().length > 0);

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
  const goLiveStatus =
    user.accountStatus === 'active' || sellerProfile.goLiveStatus === 'live'
      ? 'live'
      : onboarding.goLiveStatus || sellerProfile.goLiveStatus || 'pending';
  const accountStatus = user.accountStatus || (user.isDisable ? 'suspended' : user._id || user.id ? 'active' : '');

  // KYC lazy-load state
  const [kycData, setKycData]       = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const sellerKyc = kycData || user.kyc || {};

  // modal state
  const [kycModal, setKycModal]   = useState({ open: false, defaultDecision: 'verified' });
  const [bankModal, setBankModal] = useState({ open: false, defaultDecision: 'verified' });
  const [accessModules, setAccessModules] = useState([]);
  const [accessModulesLoading, setAccessModulesLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);

  // edit form state
  const [editSeller, setEditSeller] = useState({
    displayName: '',
    legalBusinessName: '',
    supportEmail: '',
    supportPhone: '',
    businessType: '',
    avatarUrl: '',
  });

  const isSeller = user.role === 'seller';
  const shouldShowAdminAccess = !isSellerRoute && !isSeller;
  const ownerAdminId = user.ownerAdminId || user.owner_admin_id || '';
  const ownerAdminDisplayName = getDisplayName(ownerAdmin || user.ownerAdmin || user.ownerAdminUser || {});
  const ownerAdminDisplay = ownerAdminDisplayName || ownerAdmin?.email || ownerAdminId;
  const lastLoginDisplay = formatDateTime(getLastLoginValue(user));
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
      supportEmail:      sellerProfile.supportEmail      || user.email || '',
      supportPhone:      sellerProfile.supportPhone      || user.phone || '',
      businessType:      sellerProfile.businessType      || '',
      avatarUrl:         profile.avatarUrl || user.user_image || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerProfile.displayName, sellerProfile.legalBusinessName, user.email, user.phone, profile.avatarUrl]);

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

  // ── KYC lazy load when card is expanded ──────────────────────────────────
  const handleLoadKyc = useCallback(async () => {
    if (kycData || kycLoading) return;
    setKycLoading(true);
    try {
      const res = await dispatch(getSellerKyc({ sellerId: id })).unwrap();
      setKycData(res?.data?.kyc || res?.kyc || null);
    } catch {
      setKycData(null);
    } finally {
      setKycLoading(false);
    }
  }, [dispatch, id, kycData, kycLoading]);

  // ── KYC review ────────────────────────────────────────────────────────────
  const handleKycSubmit = async (decision, rejectionReason) => {
    const res = await dispatch(
      reviewSellerKyc({ sellerId: id, verificationStatus: decision, rejectionReason }),
    ).unwrap();
    toast.success(res?.message || 'KYC status updated');
    setKycData(null); // invalidate cached KYC so it reloads on next expand
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

  const handleOrganizationReview = async (organization, payload) => {
    const organizationId = organization?.id || organization?.organizationId;
    if (!organizationId) return;
    const nextStatus = payload.approvalStatus || payload.status;
    let nextPayload = payload;
    if (nextStatus === 'rejected') {
      const reason = window.prompt('Rejection reason / required changes');
      if (reason === null) return;
      if (!reason.trim()) {
        toast.error('Rejection reason is required');
        return;
      }
      nextPayload = {
        ...payload,
        rejectionReason: reason.trim(),
        requiredChanges: [reason.trim()],
      };
    }
    try {
      const response = await apiRequest(
        'PATCH',
        ENDPOINTS.sellers.organizationStatus(id, organizationId),
        nextPayload,
      );
      toast.success(response?.message || 'Organization updated');
      await loadSellerOrganizations();
      refresh();
    } catch (error) {
      toast.error(error?.message || 'Failed to update organization');
    }
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
            supportEmail: editSeller.supportEmail,
            supportPhone: editSeller.supportPhone,
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

      <div className="max-w-5xl mx-auto py-6 space-y-4">
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
              <Row label="Role"      value={user.role} />
              <Row label="Status"    value={accountStatus} />
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
              <h2 className="text-base font-semibold text-gray-800 mb-4">Verification Status</h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Onboarding',  value: onboarding.status || sellerProfile.onboardingStatus },
                  { label: 'KYC',         value: kycStatus },
                  { label: 'Bank',        value: bankStatus },
                  { label: 'Go Live',     value: goLiveStatus },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center bg-gray-50 rounded-lg p-3 gap-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                    <StatusBadge value={value} />
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
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
                <div className="w-px bg-gray-200 mx-1 self-stretch" />
                <button
                  className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleGoLive}
                >
                  Approve Go Live
                </button>
              </div>

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

            {/* KYC Details (lazy loaded) */}
            <SellerKycCard
              kyc={kycData}
              loading={kycLoading}
              onLoad={handleLoadKyc}
            />

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
                return (
                  <div key={organizationId} className="mb-4 rounded-md border border-gray-200 p-4 last:mb-0">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{organization.storeDisplayName || organization.legalBusinessName || organizationId}</h3>
                          {organization.isDefault && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">Default</span>}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{organization.legalBusinessName || '—'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge value={organization.approvalStatus} />
                        <StatusBadge value={`KYC ${organization.kycStatus || 'not_submitted'}`} />
                        <StatusBadge value={`Bank ${organization.bankVerificationStatus || 'not_submitted'}`} />
                        <StatusBadge value={`Go Live ${organization.goLiveStatus || 'pending'}`} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
                      <Row label="GSTIN" value={organization.gstin} />
                      <Row label="PAN" value={organization.pan} />
                      <Row label="Business Type" value={organization.businessType} />
                      <Row label="Bank Account" value={bank.accountNumber} />
                      <Row label="IFSC" value={bank.ifscCode} />
                      <Row label="Billing State" value={organization.billingAddress?.state} />
                      <Row label="Billing Address" value={formatAddress(organization.billingAddress)} />
                      <Row label="Pickup Address" value={formatAddress(organization.pickupAddress)} />
                      <Row label="Invoice Prefix" value={organization.invoiceSettings?.invoicePrefix || organization.invoiceSettings?.invoiceSeries} />
                    </div>

                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">KYC Documents</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(documents).length ? Object.entries(documents).map(([key, value]) => (
                          value ? (
                            <a key={key} href={value} target="_blank" rel="noopener noreferrer" className="rounded-md border border-gray-200 px-2 py-1 text-xs text-[var(--admin-blue)] hover:bg-gray-50">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </a>
                          ) : null
                        )) : <span className="text-xs text-gray-400">No documents uploaded</span>}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 hover:bg-green-100"
                        onClick={() => handleOrganizationReview(organization, {
                          kycStatus: 'verified',
                        })}
                        disabled={organization.kycStatus === 'verified'}
                      >
                        Approve KYC
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 hover:bg-green-100 disabled:opacity-40"
                        onClick={() => handleOrganizationReview(organization, {
                          bankVerificationStatus: 'verified',
                        })}
                        disabled={organization.kycStatus !== 'verified' || organization.bankVerificationStatus === 'verified'}
                      >
                        Verify Bank
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                        onClick={() => handleOrganizationReview(organization, {
                          approvalStatus: 'approved',
                        })}
                        disabled={
                          organization.kycStatus !== 'verified' ||
                          organization.bankVerificationStatus !== 'verified' ||
                          ['approved', 'active'].includes(organization.approvalStatus)
                        }
                      >
                        Approve Organization
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                        onClick={() => handleOrganizationReview(organization, {
                          goLiveStatus: 'live',
                        })}
                        disabled={
                          organization.kycStatus !== 'verified' ||
                          organization.bankVerificationStatus !== 'verified' ||
                          !['approved', 'active'].includes(organization.approvalStatus) ||
                          organization.goLiveStatus === 'live'
                        }
                      >
                        Approve Go Live
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs text-yellow-700 hover:bg-yellow-100"
                        onClick={() => handleOrganizationReview(organization, {
                          approvalStatus: 'pending_review',
                          kycStatus: 'under_review',
                          bankVerificationStatus: organization.bankVerificationStatus || 'submitted',
                        })}
                      >
                        Mark Under Review
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100"
                        onClick={() => handleOrganizationReview(organization, {
                          approvalStatus: 'rejected',
                          kycStatus: 'rejected',
                        })}
                      >
                        Reject Organization
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                        onClick={() => handleOrganizationReview(organization, {
                          approvalStatus: 'blocked',
                          goLiveStatus: 'blocked',
                        })}
                      >
                        Block
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Seller Profile Info */}
            <section className="bg-white border border-gray-200 rounded-lg p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-3">Business Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                <Row label="Display Name"    value={sellerProfile.displayName} />
                <Row label="Legal Business"  value={sellerProfile.legalBusinessName} />
                <Row label="Business Type"   value={sellerProfile.businessType} />
                <Row label="GST Number"      value={sellerProfile.gstNumber || sellerKyc.gstNumber} />
                <Row label="PAN Number"      value={sellerProfile.panNumber || sellerKyc.panNumber} />
                <Row label="Aadhaar Number"  value={sellerProfile.aadhaarNumber || sellerKyc.aadhaarNumber} />
                <Row label="Support Email"   value={sellerProfile.supportEmail} />
                <Row label="Support Phone"   value={sellerProfile.supportPhone} />
                <Row label="Website"         value={sellerProfile.businessWebsite} />
              </div>

              {/* Bank Details */}
              {hasAnyBankDetails(bankDetails) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="mb-2 flex items-center gap-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank Details</p>
                    <StatusBadge value={bankStatus} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                    <Row label="Account Holder" value={bankDetails.accountHolderName} />
                    <Row label="Account Number" value={bankDetails.accountNumber} />
                    <Row label="IFSC Code"       value={bankDetails.ifscCode} />
                    <Row label="Bank Name"        value={bankDetails.bankName} />
                    <Row label="Branch Name"      value={bankDetails.branchName} />
                  </div>
                </div>
              )}
              {!hasAnyBankDetails(bankDetails) && (
                <div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wide">Bank Details</p>
                    <StatusBadge value={bankStatus} />
                  </div>
                  <p className="mt-1 text-sm text-yellow-700">
                    Bank details are not submitted by seller yet. Seller must complete the Bank Details step before admin can verify bank.
                  </p>
                </div>
              )}

              {/* Addresses */}
              {(sellerProfile.businessAddress || sellerProfile.pickupAddress) && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sellerProfile.businessAddress && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Business Address</p>
                      {['line1','line2','city','state','pincode','country'].map((f) => (
                        sellerProfile.businessAddress[f]
                          ? <Row key={f} label={f} value={sellerProfile.businessAddress[f]} />
                          : null
                      ))}
                    </div>
                  )}
                  {sellerProfile.pickupAddress && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pickup Address</p>
                      {['line1','line2','city','state','pincode','country'].map((f) => (
                        sellerProfile.pickupAddress[f]
                          ? <Row key={f} label={f} value={sellerProfile.pickupAddress[f]} />
                          : null
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Editable Fields */}
              <form className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSaveSellerProfile}>
                <p className="md:col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide -mb-2">Edit Core Fields</p>
                <div className="md:col-span-2 flex items-center gap-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                  <img
                    src={editSeller.avatarUrl || '/Img/user.png'}
                    alt="Seller"
                    className="h-16 w-16 rounded-full border border-gray-200 bg-white object-cover"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer rounded-md bg-[var(--admin-blue)] px-4 py-2 text-sm text-white hover:bg-[#2e3074]">
                      Upload Seller Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleSellerAvatarUpload}
                      />
                    </label>
                    {editSeller.avatarUrl && (
                      <button
                        type="button"
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-white"
                        onClick={() => setEditSeller((prev) => ({ ...prev, avatarUrl: '' }))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
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
                  label="Support Email"
                  name="supportEmail"
                  value={editSeller.supportEmail}
                  onChange={(e) => setEditSeller((p) => ({ ...p, supportEmail: e.target.value }))}
                />
                <FormInput
                  label="Support Phone"
                  name="supportPhone"
                  value={editSeller.supportPhone}
                  onChange={(e) => setEditSeller((p) => ({ ...p, supportPhone: e.target.value }))}
                />
                <FormInput
                  label="Business Type"
                  name="businessType"
                  value={editSeller.businessType}
                  onChange={(e) => setEditSeller((p) => ({ ...p, businessType: e.target.value }))}
                />
                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" className="px-4 py-2 rounded-md bg-[var(--admin-blue)] text-white text-sm hover:bg-[#2e3074]">
                    Save Seller Details
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
