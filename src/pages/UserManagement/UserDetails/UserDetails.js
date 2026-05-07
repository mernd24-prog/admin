import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import Loader from '../../../components/Loader/Loader';
import { getAdminUserDetails } from '../../../Redux/userManagementSlice';

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

  useEffect(() => {
    if (id) dispatch(getAdminUserDetails({ _id: id }));
  }, [dispatch, id]);

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                <Row label="Display Name" value={sellerProfile.displayName} />
                <Row label="Legal Business" value={sellerProfile.legalBusinessName} />
                <Row label="Onboarding" value={onboarding.status || sellerProfile.onboardingStatus} />
                <Row label="KYC Status" value={onboarding.kycStatus} />
                <Row label="GST Number" value={sellerProfile.gstNumber} />
                <Row label="PAN Number" value={sellerProfile.panNumber} />
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default UserDetails;
