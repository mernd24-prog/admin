import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
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
import { toast } from 'sonner';
import VerificationDecisionModal from '../../../components/Seller/VerificationDecisionModal';
import OnboardingChecklist from '../../../components/Seller/OnboardingChecklist';
import SellerKycCard from '../../../components/Seller/SellerKycCard';

// ─── small display helpers ────────────────────────────────────────────────────

const Row = ({ label, value }) => (
  <div className="border-b border-gray-100 py-3">
    <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
    <p className="text-sm text-gray-900 break-words">{value || '—'}</p>
  </div>
);

const STATUS_COLORS = {
  active:              'bg-green-100 text-green-700',
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
  const colorClass = STATUS_COLORS[String(value || '').toLowerCase()] || 'bg-gray-100 text-gray-600';
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

// ─── KYC decision options ─────────────────────────────────────────────────────

const KYC_OPTIONS = [
  { value: 'verified',     label: 'Approve (Verified)' },
  { value: 'under_review', label: 'Mark Under Review' },
  { value: 'rejected',     label: 'Reject' },
];

const BANK_OPTIONS = [
  { value: 'verified',  label: 'Verify' },
  { value: 'submitted', label: 'Mark Submitted' },
  { value: 'rejected',  label: 'Reject' },
];

// ─── main component ───────────────────────────────────────────────────────────

const UserDetails = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const selector = useSelector((state) => state.user);

  const user     = selector?.getAdminUserDetailsData?.data?.data || {};
  const profile  = user.profile || {};
  const sellerProfile = user.sellerProfile || {};
  const onboarding    = user.onboarding || {};
  const [bankReviewOverride, setBankReviewOverride] = useState(null);
  const bankDetails = normalizeBankDetails(sellerProfile.bankDetails || user.bankDetails || {});
  const bankRejectionReason =
    bankReviewOverride?.bankRejectionReason ?? sellerProfile.bankRejectionReason;
  const bankStatus =
    bankReviewOverride?.bankVerificationStatus ||
    (bankRejectionReason
      ? 'rejected'
      : sellerProfile.bankVerificationStatus &&
        sellerProfile.bankVerificationStatus !== 'not_submitted'
        ? sellerProfile.bankVerificationStatus
        : hasCompleteBankDetails(bankDetails)
          ? 'submitted'
          : 'not_submitted');
  const goLiveStatus =
    sellerProfile.goLiveStatus ||
    (user.accountStatus === 'active' && (onboarding.status || sellerProfile.onboardingStatus) === 'ready_for_go_live'
      ? 'live'
      : 'pending');

  // KYC lazy-load state
  const [kycData, setKycData]       = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const sellerKyc = kycData || user.kyc || {};

  // modal state
  const [kycModal, setKycModal]   = useState({ open: false, defaultDecision: 'verified' });
  const [bankModal, setBankModal] = useState({ open: false, defaultDecision: 'verified' });

  // edit form state
  const [editSeller, setEditSeller] = useState({
    displayName: '',
    legalBusinessName: '',
    supportEmail: '',
    supportPhone: '',
    businessType: '',
  });

  const isSeller = user.role === 'seller';

  useEffect(() => {
    if (id) dispatch(getAdminUserDetails({ _id: id }));
  }, [dispatch, id]);

  useEffect(() => {
    setEditSeller({
      displayName:       sellerProfile.displayName       || '',
      legalBusinessName: sellerProfile.legalBusinessName || '',
      supportEmail:      sellerProfile.supportEmail      || user.email || '',
      supportPhone:      sellerProfile.supportPhone      || user.phone || '',
      businessType:      sellerProfile.businessType      || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerProfile.displayName, sellerProfile.legalBusinessName, user.email, user.phone]);

  const refresh = useCallback(() => dispatch(getAdminUserDetails({ _id: id })), [dispatch, id]);

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

  // ── Profile save ──────────────────────────────────────────────────────────
  const handleSaveSellerProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await dispatch(
        updateSeller({ _id: id, sellerProfile: { ...editSeller } }),
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
        options={KYC_OPTIONS}
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
        options={BANK_OPTIONS}
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
          <StatusBadge value={user.accountStatus} />
        </div>

        {/* ── Account & Access ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="bg-white border border-gray-200 rounded-lg p-5 lg:col-span-2">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Account</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <Row label="Full Name" value={[profile.firstName, profile.lastName].filter(Boolean).join(' ')} />
              <Row label="Email"     value={user.email} />
              <Row label="Phone"     value={user.phone} />
              <Row label="Role"      value={user.role} />
              <Row label="Created At"  value={user.createdAt  ? new Date(user.createdAt).toLocaleString()  : ''} />
              <Row label="Last Login"  value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : ''} />
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Access</h2>
            <Row label="Allowed Modules" value={(user.allowedModules || []).join(', ')} />
            <Row label="Owner Admin"  value={user.ownerAdminId} />
            <Row label="Owner Seller" value={user.ownerSellerId} />
          </section>
        </div>

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
                  <button type="submit" className="px-4 py-2 rounded-md bg-[#3E4094] text-white text-sm hover:bg-[#2e3074]">
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
