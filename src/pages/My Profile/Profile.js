import React, { useEffect, useState } from 'react';
import { BsCamera, BsCheck, BsSave } from 'react-icons/bs';
import { FaUser } from 'react-icons/fa';
import { FiEdit3 } from 'react-icons/fi';
import { PiX } from 'react-icons/pi';
import { useDispatch } from 'react-redux';
import { getProfile, updateProfile } from '../../Redux/userSlice';
import { toast } from 'sonner';
import { uploadFile } from '../../_helpers/globalFunctions';
import Loader from '../../components/Loader/Loader';

const profileToForm = (user = {}) => {
    const profile = user.profile || {};
    const fullName = user.full_name || [profile.firstName, profile.lastName].filter(Boolean).join(" ");

    return {
        ...user,
        userName: user.userName || user.email?.split("@")?.[0] || "",
        email: user.email || "",
        full_name: fullName || "",
        user_image: user.user_image || profile.avatarUrl || null,
    };
};

const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatValue = (value) => {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return value === undefined || value === null || value === '' ? '-' : String(value);
};

const DetailField = ({ label, value, className = '' }) => (
    <div className={className}>
        <label className="admin-label">{label}</label>
        <input className="admin-input" value={formatValue(value)} readOnly />
    </div>
);

const ProfileSection = ({ number, title, children }) => (
    <section className="mt-8 first:mt-0">
        <h3 className="admin-section-title">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e49e1c] text-[10px] text-white">
                {number}
            </span>
            {title}
        </h3>
        <div className="mt-5">{children}</div>
    </section>
);

const Profile = () => {
    const dispatch = useDispatch();
    const [formData, setFormData] = useState({
        userName: '',
        email: '',
        full_name: '',
        user_image: null
    });

    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const res = await dispatch(getProfile()).unwrap();
                if (res) {
                    setFormData(profileToForm(res?.data));
                }
            } catch (error) {
                console.log(error)
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [dispatch]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only JPG/PNG files are allowed');
            return;
        }

        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('File size should not exceed 2MB');
            return;
        }

        try {
            setLoading(true);
            const uploadedImage = await uploadFile(file, "PROFILES");
            const res = await dispatch(updateProfile({
                user_image: uploadedImage,
                full_name: formData?.full_name,
            })).unwrap();
            const nextProfile = res?.data ? profileToForm(res.data) : {
                ...formData,
                user_image: uploadedImage,
            };
            setFormData(prev => ({
                ...prev,
                ...nextProfile,
            }));
            window.dispatchEvent(new CustomEvent('profile:updated', { detail: res?.data || nextProfile }));
            toast.success('Profile picture updated successfully!');
        } catch (error) {
            console.error('File upload failed:', error);
            toast.error('File upload failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        setUpdating(true);
        try {
            let apiPayload = {
                user_image: formData?.user_image,
                full_name: formData?.full_name
            }
            const res = await dispatch(updateProfile(apiPayload)).unwrap();
            if (res?.data) {
                setFormData(profileToForm(res.data));
                window.dispatchEvent(new CustomEvent('profile:updated', { detail: res.data }));
            }
            setShowSuccess(true);
            setIsEditing(false);
            toast.success("Profile Update Successfully")

        } catch (error) {
            console.log(error)
            toast.error(error?.message || 'Error updating profile');
        } finally {
            setUpdating(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    const profile = formData.profile || {};
    const sellerProfile = formData.sellerProfile || {};
    const sellerSettings = formData.sellerSettings || {};
    const allowedModules = Array.isArray(formData.allowedModules) ? formData.allowedModules : [];
    const addresses = Array.isArray(formData.addresses) ? formData.addresses : [];
    const authProviders = Array.isArray(formData.authProviders) ? formData.authProviders : [];
    const sessionCount = Array.isArray(formData.refreshSessions) ? formData.refreshSessions.length : 0;
    const hasSellerProfile = Object.keys(sellerProfile).length > 0;

    return (
        <div className="admin-page px-4 py-6 sm:px-8">
            <Loader loading={loading} />
            {showSuccess && (
                <div className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm text-white shadow-lg">
                    <BsCheck className="h-4 w-4" />
                    <span>Profile updated successfully!</span>
                </div>
            )}

            <div className="mx-auto max-w-[1040px]">
                <div className="mb-6">
                    <p className="text-[10px] font-semibold text-[#e49e1c]">Seller profile &gt; Edit</p>
                    <h1 className="mt-3 text-2xl font-bold text-[#082f91]">Seller Profile</h1>
                    <p className="mt-1 text-xs text-slate-500">Manage your personal and business details</p>
                </div>

                <div className="admin-card px-5 py-6 sm:px-10">
                    <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
                        <div className="flex items-center gap-5">
                            <label className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-white bg-[#eef2ff] shadow-md">
                                {formData.user_image ? (
                                    <img src={formData.user_image} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center">
                                        <FaUser className="h-8 w-8 text-[#082f91]/40" />
                                    </span>
                                )}
                                <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                                    <BsCamera className="h-5 w-5 text-white" />
                                </span>
                                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={loading} />
                            </label>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{formData.full_name || 'Your Profile'}</h2>
                                <p className="mt-1 text-xs text-slate-500">{formData.email}</p>
                                <span className="mt-2 inline-flex rounded-full border border-[#ead9bf] bg-[#fff5df] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#a06a00]">
                                    {formData.role || 'Account'}
                                </span>
                            </div>
                        </div>
                        {!isEditing && (
                            <button type="button" onClick={() => setIsEditing(true)} className="admin-btn-secondary">
                                <FiEdit3 />
                                Edit Profile
                            </button>
                        )}
                    </div>

                    <ProfileSection number="01" title="Personal / Owner Details">
                        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                            <div>
                                <label className="admin-label">Full Name</label>
                                <input className="admin-input" name="full_name" value={formData.full_name || ''} onChange={handleChange} disabled={!isEditing} />
                            </div>
                            <DetailField label="Email Address" value={formData.email} />
                            <DetailField label="First Name" value={profile.firstName} />
                            <DetailField label="Last Name" value={profile.lastName} />
                            <DetailField label="Username" value={formData.userName} />
                            <DetailField label="Phone Number" value={formData.phone} />
                        </div>
                    </ProfileSection>

                    <ProfileSection number="02" title="Account Information">
                        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                            <DetailField label="User ID" value={formData._id || formData.id} />
                            <DetailField label="Role" value={formData.role} />
                            <DetailField label="Account Status" value={formData.accountStatus} />
                            <DetailField label="Email Verified" value={formData.emailVerified} />
                            <DetailField label="Owner Admin ID" value={formData.ownerAdminId} />
                            <DetailField label="Owner Seller ID" value={formData.ownerSellerId} />
                            <DetailField label="Created At" value={formatDate(formData.createdAt)} />
                            <DetailField label="Updated At" value={formatDate(formData.updatedAt)} />
                            <DetailField label="Last Login At" value={formatDate(formData.lastLoginAt)} />
                            <DetailField label="Active Sessions" value={sessionCount} />
                        </div>
                    </ProfileSection>

                    <ProfileSection number="03" title="Access & Permissions">
                        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                            <DetailField
                                label="Authentication Providers"
                                value={authProviders.map((provider) => provider.provider).join(', ') || 'Password'}
                            />
                            <DetailField label="Allowed Modules Count" value={allowedModules.length} />
                        </div>
                        <div className="mt-4">
                            <label className="admin-label">Allowed Modules</label>
                            <div className="min-h-[40px] rounded-[6px] border border-[#dad7ea] bg-[#faf8ff]/70 px-3 py-2">
                                {allowedModules.length ? (
                                    <div className="flex flex-wrap gap-2">
                                        {allowedModules.map((module) => (
                                            <span key={module} className="rounded-full border border-[#d9e1f8] bg-[#eef2ff] px-3 py-1 text-xs font-medium capitalize text-[#082f91]">
                                                {String(module).replace(/[-_]/g, ' ')}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-500">No modules assigned</span>
                                )}
                            </div>
                        </div>
                    </ProfileSection>

                    <ProfileSection number="04" title="Seller Settings">
                        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
                            <DetailField label="Auto Accept Orders" value={sellerSettings.autoAcceptOrders} />
                            <DetailField label="Handling Time (Hours)" value={sellerSettings.handlingTimeHours} />
                            <DetailField label="Return Window (Days)" value={sellerSettings.returnWindowDays} />
                            <DetailField label="NDR Response (Hours)" value={sellerSettings.ndrResponseHours} />
                            <DetailField label="Payout Schedule" value={sellerSettings.payoutSchedule} />
                            <DetailField label="Shipping Modes" value={(sellerSettings.shippingModes || []).join(', ')} />
                        </div>
                    </ProfileSection>

                    {hasSellerProfile && (
                        <ProfileSection number="05" title="Business Information">
                            <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
                                <DetailField label="Display Name" value={sellerProfile.displayName} />
                                <DetailField label="Legal Business Name" value={sellerProfile.legalBusinessName} />
                                <DetailField label="Business Type" value={sellerProfile.businessType} />
                                <DetailField label="GST Number" value={sellerProfile.gstNumber} />
                                <DetailField label="PAN Number" value={sellerProfile.panNumber} />
                                <DetailField label="Support Email" value={sellerProfile.supportEmail} />
                                <DetailField label="Support Phone" value={sellerProfile.supportPhone} />
                                <DetailField label="Website" value={sellerProfile.businessWebsite} />
                                <DetailField label="KYC Status" value={sellerProfile.kycStatus} />
                                <DetailField label="Onboarding Status" value={sellerProfile.onboardingStatus} />
                            </div>
                        </ProfileSection>
                    )}

                    <ProfileSection number={hasSellerProfile ? '06' : '05'} title="Addresses">
                        {addresses.length ? (
                            <div className="space-y-4">
                                {addresses.map((address, index) => (
                                    <div key={address._id || index} className="rounded-lg border border-[#e8e2db] bg-[#fffdfa] p-4">
                                        <p className="mb-4 text-xs font-semibold text-[#082f91]">
                                            Address {index + 1}{address.isDefault ? ' (Default)' : ''}
                                        </p>
                                        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
                                            <DetailField label="Address Line" value={address.line1 || address.addressLine1 || address.address} />
                                            <DetailField label="City" value={address.city} />
                                            <DetailField label="State" value={address.state} />
                                            <DetailField label="Postal Code" value={address.postalCode || address.zipCode || address.pincode} />
                                            <DetailField label="Country" value={address.country} />
                                            <DetailField label="Type" value={address.type || address.addressType} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[6px] border border-[#dad7ea] bg-[#faf8ff]/70 px-4 py-3 text-sm text-slate-500">
                                No addresses saved.
                            </div>
                        )}
                    </ProfileSection>

                    {isEditing && (
                        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#e8e2db] pt-5 sm:flex-row sm:justify-end">
                            <button type="button" onClick={handleCancel} className="admin-btn-secondary sm:min-w-[150px]">
                                <PiX />
                                Cancel
                            </button>
                            <button type="button" onClick={handleUpdate} disabled={updating} className="admin-btn-primary sm:min-w-[220px]">
                                <BsSave />
                                {updating ? 'Updating...' : 'Update Profile'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
