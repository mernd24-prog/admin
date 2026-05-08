import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import Loader from '../../../components/Loader/Loader';
import FormInput from '../../../components/Atoms/FormInput/FormInput';
import { getAdminUserDetails, reviewSellerKyc, updateSeller } from '../../../Redux/userManagementSlice';
import { toast } from 'sonner';

const Row = ({ label, value }) => (
  <div className="border-b border-gray-100 py-3">
    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-sm text-gray-900 break-words">{value || 'N/A'}</p>
  </div>
);

const StatusBadge = ({ value }) => (
  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
    value === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
  }`}>
    {value || 'N/A'}
  </span>
);

const UserDetails = () => {
  const dispatch = useDispatch();
  const { id } = useParams();
  const selector = useSelector(state => state.user);
  const user = selector?.getAdminUserDetailsData?.data?.data || {};
  const profile = user.profile || {};
  const sellerProfile = user.sellerProfile || {};
  const onboarding = user.onboarding || {};
  const [editSeller, setEditSeller] = useState({
    displayName: '',
    legalBusinessName: '',
    supportEmail: '',
    supportPhone: '',
    businessType: '',
  });

  useEffect(() => {
    if (id) dispatch(getAdminUserDetails({ _id: id }));
  }, [dispatch, id]);

  useEffect(() => {
    setEditSeller({
      displayName: sellerProfile.displayName || '',
      legalBusinessName: sellerProfile.legalBusinessName || '',
      supportEmail: sellerProfile.supportEmail || user.email || '',
      supportPhone: sellerProfile.supportPhone || user.phone || '',
      businessType: sellerProfile.businessType || '',
    });
  }, [sellerProfile.displayName, sellerProfile.legalBusinessName, sellerProfile.supportEmail, sellerProfile.supportPhone, sellerProfile.businessType, user.email, user.phone]);

  const refresh = () => dispatch(getAdminUserDetails({ _id: id }));

  const handleKycDecision = async (verificationStatus) => {
    try {
      const payload = { sellerId: id, verificationStatus };
      if (verificationStatus === 'rejected') {
        payload.rejectionReason = 'Rejected by admin review';
      }
      const res = await dispatch(reviewSellerKyc(payload)).unwrap();
      toast.success(res?.message || 'KYC updated');
      refresh();
    } catch (error) {
      toast.error(error?.message || error || 'Failed to update KYC');
    }
  };

  const handleGoLive = async () => {
    try {
      const res = await dispatch(updateSeller({ _id: id, accountStatus: 'active' })).unwrap();
      toast.success(res?.message || 'Seller marked active');
      refresh();
    } catch (error) {
      toast.error(error?.details?.onboardingStatus
        ? `Not ready for go-live (${error.details.onboardingStatus})`
        : (error?.message || error || 'Failed to activate seller'));
    }
  };

  const handleSaveSellerProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await dispatch(updateSeller({
        _id: id,
        sellerProfile: { ...editSeller },
      })).unwrap();
      toast.success(res?.message || 'Seller details updated');
      refresh();
    } catch (error) {
      toast.error(error?.message || error || 'Failed to update seller details');
    }
  };

  return (
    <>
      <Loader loading={selector.loading} />
      <div className="max-w-5xl mx-auto py-6">
        <div className="mb-4 flex items-center justify-between">
          <h3><Link to="/app/home" className="cursor-pointer">Home</Link> / <b>User Details</b></h3>
          <StatusBadge value={user.accountStatus} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="bg-white border border-[#E6E6E6] rounded-lg p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-3">Account</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <Row label="Full Name" value={[profile.firstName, profile.lastName].filter(Boolean).join(' ')} />
              <Row label="Email" value={user.email} />
              <Row label="Phone" value={user.phone} />
              <Row label="Role" value={user.role} />
              <Row label="Created At" value={user.createdAt ? new Date(user.createdAt).toLocaleString() : ''} />
              <Row label="Last Login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : ''} />
            </div>
          </section>
          <section className="bg-white border border-[#E6E6E6] rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-3">Access</h2>
            <Row label="Allowed Modules" value={(user.allowedModules || []).join(', ')} />
            <Row label="Owner Admin" value={user.ownerAdminId} />
            <Row label="Owner Seller" value={user.ownerSellerId} />
          </section>
          {user.role === 'seller' && (
            <section className="bg-white border border-[#E6E6E6] rounded-lg p-5 lg:col-span-3">
              <h2 className="text-lg font-semibold mb-3">Seller</h2>
              <div className="mb-4 flex flex-wrap gap-2">
                <button className="px-3 py-1 text-xs rounded bg-green-50 text-green-700" onClick={() => handleKycDecision('verified')}>Approve KYC</button>
                <button className="px-3 py-1 text-xs rounded bg-red-50 text-red-700" onClick={() => handleKycDecision('rejected')}>Reject KYC</button>
                <button className="px-3 py-1 text-xs rounded bg-blue-50 text-blue-700" onClick={handleGoLive}>Ready To Explore Panel</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                <Row label="Display Name" value={sellerProfile.displayName} />
                <Row label="Legal Business" value={sellerProfile.legalBusinessName} />
                <Row label="Onboarding" value={onboarding.status || sellerProfile.onboardingStatus} />
                <Row label="KYC Status" value={onboarding.kycStatus} />
                <Row label="GST Number" value={sellerProfile.gstNumber} />
                <Row label="PAN Number" value={sellerProfile.panNumber} />
              </div>
              <form className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSaveSellerProfile}>
                <FormInput label="Display Name" name="displayName" value={editSeller.displayName} onChange={(e) => setEditSeller((prev) => ({ ...prev, displayName: e.target.value }))} />
                <FormInput label="Legal Business Name" name="legalBusinessName" value={editSeller.legalBusinessName} onChange={(e) => setEditSeller((prev) => ({ ...prev, legalBusinessName: e.target.value }))} />
                <FormInput label="Support Email" name="supportEmail" value={editSeller.supportEmail} onChange={(e) => setEditSeller((prev) => ({ ...prev, supportEmail: e.target.value }))} />
                <FormInput label="Support Phone" name="supportPhone" value={editSeller.supportPhone} onChange={(e) => setEditSeller((prev) => ({ ...prev, supportPhone: e.target.value }))} />
                <FormInput label="Business Type" name="businessType" value={editSeller.businessType} onChange={(e) => setEditSeller((prev) => ({ ...prev, businessType: e.target.value }))} />
                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" className="px-4 py-2 rounded bg-[#3E4094] text-white text-sm">Save Seller Details</button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default UserDetails;
