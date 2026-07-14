import React, { useEffect, useState } from "react";
import { BsCamera, BsCheck, BsSave } from "react-icons/bs";
import { FiEdit3 } from "react-icons/fi";
import { PiX } from "react-icons/pi";
import { useDispatch } from "react-redux";
import { getProfile, updateProfile } from "../../Redux/userSlice";
import { toast } from "sonner";
import { uploadFile } from "../../_helpers/globalFunctions";
import Loader from "../../components/Loader/Loader";
import { PageHeader } from "../../components/Shared";

const profileToForm = (user = {}) => {
  const profile = user.profile || {};
  const fullName =
    user.full_name ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ");

  return {
    ...user,
    userName: user.userName || user.email?.split("@")?.[0] || "",
    email: user.email || "",
    full_name: fullName || "",
    user_image: user.user_image || profile.avatarUrl || null,
  };
};

const formatDate = (value, withTime = true) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString(
    "en-IN",
    withTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" },
  );
};

const formatValue = (value) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return value === undefined || value === null || value === ""
    ? "-"
    : String(value);
};

const getProfileInitials = (user = {}) => {
  const profile = user.profile || {};
  const firstName = profile.firstName || user.firstName || "";
  const lastName = profile.lastName || user.lastName || "";

  if (firstName || lastName) {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  }

  const name =
    user.full_name ||
    user.fullName ||
    user.userName ||
    user.email?.split("@")?.[0] ||
    "User";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const firstInitial = parts[0]?.[0] || "U";
  const lastInitial = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";

  return `${firstInitial}${lastInitial}`.toUpperCase();
};

const hasValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object")
    return Object.values(value).some(hasValue);
  return value !== undefined && value !== null && value !== "";
};

const hasAddressValue = (address = {}) =>
  Boolean(
    address.line1 ||
    address.line2 ||
    address.addressLine1 ||
    address.addressLine2 ||
    address.address ||
    address.city ||
    address.state ||
    address.postalCode ||
    address.zipCode ||
    address.pincode ||
    address.country,
  );

const getAddressValue = (address = {}, key) =>
  address[key] ||
  (key === "line1" ? address.addressLine1 || address.address : "") ||
  (key === "line2" ? address.addressLine2 : "") ||
  (key === "postalCode" ? address.zipCode || address.pincode : "");

const DetailField = ({ label, value, className = "" }) => (
  <div className={className}>
    <label className="admin-label">{label}</label>
    <input className="admin-input" value={formatValue(value)} readOnly />
  </div>
);

const EditableField = ({
  label,
  name,
  value,
  onChange,
  disabled,
  className = "",
}) => (
  <div className={className}>
    <label className="admin-label">{label}</label>
    <input
      className="admin-input"
      name={name}
      value={value || ""}
      onChange={onChange}
      disabled={disabled}
    />
  </div>
);

const ProfileSection = ({ number, title, children }) => (
  <section className="mt-9 first:mt-0">
    <h3 className="admin-section-title">
      <span className="flex h-6 w-6  items-center justify-center rounded-full bg-[#e49e1c] text-[10px] text-white">
        {number}
      </span>
      {title}
    </h3>
    <div className="mt-5 space-y-5">{children}</div>
  </section>
);

const FieldGrid = ({ children }) => (
  <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-12">
    {children}
  </div>
);

const AddressBlock = ({ title, address }) => (
  <div className="rounded-lg border border-[var(--admin-line)] bg-white p-4">
    <p className="mb-4 text-xs font-semibold text-[var(--admin-navy)]">
      {title}
    </p>
    <FieldGrid>
      <DetailField
        label="Address Line 1"
        value={getAddressValue(address, "line1")}
        className="md:col-span-6"
      />
      <DetailField
        label="Address Line 2"
        value={getAddressValue(address, "line2")}
        className="md:col-span-6"
      />
      <DetailField
        label="City"
        value={address.city}
        className="md:col-span-6"
      />
      <DetailField
        label="State"
        value={address.state}
        className="md:col-span-3"
      />
      <DetailField
        label="Zip Code"
        value={getAddressValue(address, "postalCode")}
        className="md:col-span-3"
      />
      <DetailField
        label="Country"
        value={address.country}
        className="md:col-span-6"
      />
    </FieldGrid>
  </div>
);

const Profile = () => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    full_name: "",
    user_image: null,
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
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpg", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG/PNG files are allowed");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size should not exceed 2MB");
      return;
    }

    try {
      setLoading(true);
      const uploadedImage = await uploadFile(file, "PROFILES");
      const res = await dispatch(
        updateProfile({
          user_image: uploadedImage,
          full_name: formData?.full_name,
        }),
      ).unwrap();
      const nextProfile = res?.data
        ? profileToForm(res.data)
        : {
            ...formData,
            user_image: uploadedImage,
          };
      setFormData((prev) => ({
        ...prev,
        ...nextProfile,
      }));
      window.dispatchEvent(
        new CustomEvent("profile:updated", {
          detail: res?.data || nextProfile,
        }),
      );
      toast.success("Profile picture updated successfully!");
    } catch (error) {
      console.error("File upload failed:", error);
      toast.error("File upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageRemove = async () => {
    if (!formData.user_image) return;

    try {
      setLoading(true);
      const res = await dispatch(
        updateProfile({
          user_image: null,
          full_name: formData?.full_name,
        }),
      ).unwrap();
      const nextProfile = res?.data
        ? profileToForm(res.data)
        : {
            ...formData,
            user_image: null,
            profile: {
              ...(formData.profile || {}),
              avatarUrl: null,
            },
          };

      setFormData((prev) => ({
        ...prev,
        ...nextProfile,
        user_image: null,
        profile: {
          ...(nextProfile.profile || prev.profile || {}),
          avatarUrl: null,
        },
      }));
      window.dispatchEvent(
        new CustomEvent("profile:updated", {
          detail: {
            ...(res?.data || nextProfile),
            user_image: null,
            profile: {
              ...((res?.data || nextProfile)?.profile || {}),
              avatarUrl: null,
            },
          },
        }),
      );
      toast.success("Profile picture removed successfully!");
    } catch (error) {
      console.error("Image remove failed:", error);
      toast.error(error?.message || "Failed to remove profile picture");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      let apiPayload = {
        user_image: formData?.user_image,
        full_name: formData?.full_name,
      };
      const res = await dispatch(updateProfile(apiPayload)).unwrap();
      if (res?.data) {
        setFormData(profileToForm(res.data));
        window.dispatchEvent(
          new CustomEvent("profile:updated", { detail: res.data }),
        );
      }
      setShowSuccess(true);
      setIsEditing(false);
      toast.success("Profile Update Successfully");
    } catch (error) {
      console.log(error);
      toast.error(error?.message || "Error updating profile");
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
  const bankDetails = sellerProfile.bankDetails || {};
  const businessAddress = sellerProfile.businessAddress || {};
  const pickupAddress = sellerProfile.pickupAddress || {};
  const onboardingChecklist = sellerProfile.onboardingChecklist || {};
  const allowedModules = Array.isArray(formData.allowedModules)
    ? formData.allowedModules
    : [];
  const addresses = Array.isArray(formData.addresses) ? formData.addresses : [];
  const authProviders = Array.isArray(formData.authProviders)
    ? formData.authProviders
    : [];
  const refreshSessions = Array.isArray(formData.refreshSessions)
    ? formData.refreshSessions
    : [];
  const latestSession = refreshSessions[refreshSessions.length - 1] || {};
  const isSeller = formData.role === "seller";
  const hasSellerProfile = isSeller && Object.keys(sellerProfile).length > 0;
  const hasSellerAddresses =
    isSeller &&
    (hasAddressValue(businessAddress) || hasAddressValue(pickupAddress));
  let currentSection = 0;
  const nextSectionNumber = () => String(++currentSection).padStart(2, "0");

  return (
    <div className="admin-page">
      <Loader loading={loading} />
      {showSuccess && (
        <div className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm text-white shadow-lg">
          <BsCheck className="h-4 w-4" />
          <span>Profile updated successfully!</span>
        </div>
      )}

      <div className="mb-7">
        <PageHeader
          title={isSeller ? "Seller Profile" : "My Profile"}
          subtitle="Manage your personal and account details"
          breadcrumbs={[
            { label: isSeller ? "Seller Profile" : "My Profile" },
            { label: "Edit" },
          ]}
        />

        <div className="admin-card px-5 py-6 sm:px-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-5">
              <div className="relative">
                <label className="group  relative block h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-white bg-[var(--admin-surface-soft)] shadow-md">
                  {formData.user_image ? (
                    <img
                      src={formData.user_image}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <span className="text-xl font-bold text-[var(--admin-navy)]">
                        {getProfileInitials(formData)}
                      </span>
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                    <BsCamera className="h-5 w-5 text-white" />
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
                {formData.user_image && (
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    disabled={loading}
                    className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-red-100 bg-white text-red-500 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Remove profile picture"
                    title="Remove profile picture"
                  >
                    <PiX className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {formData.full_name || "Your Profile"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">{formData.email}</p>
                <span className="mt-2 inline-flex rounded-full border border-[#ead9bf] bg-[#fff5df] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#a06a00]">
                  {formData.role || "Account"}
                </span>
              </div>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="admin-btn-secondary"
              >
                <FiEdit3 />
                Edit Profile
              </button>
            )}
          </div>

          <ProfileSection
            number={nextSectionNumber()}
            title="Personal / Owner Details"
          >
            <FieldGrid>
              <EditableField
                label="Full Name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                disabled={!isEditing}
                className="md:col-span-6"
              />
              <DetailField
                label="Email Address"
                value={formData.email}
                className="md:col-span-6"
              />
              {isSeller && (
                <>
                  <DetailField
                    label="Date of Birth"
                    value={formatDate(sellerProfile.dateOfBirth, false)}
                    className="md:col-span-6"
                  />
                  <DetailField
                    label="City"
                    value={pickupAddress.city || businessAddress.city}
                    className="md:col-span-3"
                  />
                  <DetailField
                    label="Zip Code"
                    value={
                      pickupAddress.postalCode || businessAddress.postalCode
                    }
                    className="md:col-span-3"
                  />
                </>
              )}
              <DetailField
                label="Phone Number"
                value={formData.phone}
                className="md:col-span-6"
              />
              <DetailField
                label="Primary Contact Name"
                value={sellerProfile.primaryContactName}
                className="md:col-span-6"
              />
              <DetailField
                label="First Name"
                value={profile.firstName}
                className="md:col-span-3"
              />
              <DetailField
                label="Last Name"
                value={profile.lastName}
                className="md:col-span-3"
              />
              <DetailField
                label="Username"
                value={formData.userName}
                className="md:col-span-6"
              />
            </FieldGrid>
          </ProfileSection>

          <ProfileSection
            number={nextSectionNumber()}
            title="Account Information"
          >
            <FieldGrid>
              <DetailField
                label="User ID"
                value={formData._id || formData.id}
                className="md:col-span-6"
              />
              <DetailField
                label="Role"
                value={formData.role}
                className="md:col-span-3"
              />
              <DetailField
                label="Account Status"
                value={formData.accountStatus}
                className="md:col-span-3"
              />
              <DetailField
                label="Referral Code"
                value={formData.referralCode}
                className="md:col-span-6"
              />
              <DetailField
                label="Hierarchy Level"
                value={formData.hierarchyLevel}
                className="md:col-span-3"
              />
              <DetailField
                label="Email Verified"
                value={formData.emailVerified}
                className="md:col-span-3"
              />
              <DetailField
                label="Created At"
                value={formatDate(formData.createdAt)}
                className="md:col-span-6"
              />
              <DetailField
                label="Updated At"
                value={formatDate(formData.updatedAt)}
                className="md:col-span-3"
              />
              <DetailField
                label="Last Login At"
                value={formatDate(formData.lastLoginAt)}
                className="md:col-span-3"
              />
            </FieldGrid>
          </ProfileSection>

          <ProfileSection
            number={nextSectionNumber()}
            title="Access & Sessions"
          >
            <FieldGrid>
              <DetailField
                label="Authentication Providers"
                value={
                  authProviders
                    .map((provider) => provider.provider || provider)
                    .join(", ") || "Password"
                }
                className="md:col-span-6"
              />
              <DetailField
                label="Allowed Modules Count"
                value={allowedModules.length}
                className="md:col-span-3"
              />
              <DetailField
                label="Active Sessions"
                value={refreshSessions.length}
                className="md:col-span-3"
              />
              <DetailField
                label="Latest Session Provider"
                value={latestSession.provider}
                className="md:col-span-6"
              />
              <DetailField
                label="Latest Platform"
                value={latestSession.platform}
                className="md:col-span-3"
              />
              <DetailField
                label="Latest IP Address"
                value={latestSession.ipAddress}
                className="md:col-span-3"
              />
              <DetailField
                label="Latest Used At"
                value={formatDate(latestSession.lastUsedAt)}
                className="md:col-span-6"
              />
              <DetailField
                label="Latest Created At"
                value={formatDate(latestSession.createdAt)}
                className="md:col-span-6"
              />
            </FieldGrid>

            <div>
              <label className="admin-label">Allowed Modules</label>
              <div className="min-h-[40px] rounded-[6px] border border-[#dad7ea] bg-[#faf8ff]/70 px-3 py-2">
                {allowedModules.length ? (
                  <div className="flex flex-wrap gap-2">
                    {allowedModules.map((module) => (
                      <span
                        key={module}
                        className="rounded-full border border-[#d9e1f8] bg-[var(--admin-surface-soft)] px-3 py-1 text-xs font-medium capitalize text-[var(--admin-navy)]"
                      >
                        {String(module).replace(/[-_]/g, " ")}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-slate-500">
                    No modules assigned
                  </span>
                )}
              </div>
            </div>
          </ProfileSection>

          {isSeller && (
            <ProfileSection
              number={nextSectionNumber()}
              title="Seller Settings"
            >
              <FieldGrid>
                <DetailField
                  label="Auto Accept Orders"
                  value={sellerSettings.autoAcceptOrders}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Handling Time (Hours)"
                  value={sellerSettings.handlingTimeHours}
                  className="md:col-span-3"
                />
                <DetailField
                  label="Payout Schedule"
                  value={sellerSettings.payoutSchedule}
                  className="md:col-span-6"
                />
                <DetailField
                  label="NDR Response (Hours)"
                  value={sellerSettings.ndrResponseHours}
                  className="md:col-span-3"
                />
                <DetailField
                  label="Shipping Modes"
                  value={sellerSettings.shippingModes}
                  className="md:col-span-3"
                />
              </FieldGrid>
            </ProfileSection>
          )}

          {hasSellerProfile && (
            <ProfileSection
              number={nextSectionNumber()}
              title="Business & KYC Details"
            >
              <FieldGrid>
                <DetailField
                  label="Display Name"
                  value={sellerProfile.displayName}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Legal Business Name"
                  value={sellerProfile.legalBusinessName}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Business Type"
                  value={sellerProfile.businessType}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Registration Number"
                  value={sellerProfile.registrationNumber}
                  className="md:col-span-3"
                />
                <DetailField
                  label="Business Website"
                  value={sellerProfile.businessWebsite}
                  className="md:col-span-3"
                />
                <DetailField
                  label="GST Number"
                  value={sellerProfile.gstNumber}
                  className="md:col-span-6"
                />
                <DetailField
                  label="PAN Number"
                  value={sellerProfile.panNumber}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Aadhaar Number"
                  value={sellerProfile.aadhaarNumber}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Support Email"
                  value={sellerProfile.supportEmail}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Support Phone"
                  value={sellerProfile.supportPhone}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Description"
                  value={sellerProfile.description}
                  className="md:col-span-6"
                />
                <DetailField
                  label="KYC Status"
                  value={sellerProfile.kycStatus}
                  className="md:col-span-3"
                />
                <DetailField
                  label="Bank Verification Status"
                  value={sellerProfile.bankVerificationStatus}
                  className="md:col-span-3"
                />
                <DetailField
                  label="Go Live Status"
                  value={sellerProfile.goLiveStatus}
                  className="md:col-span-3"
                />
                <DetailField
                  label="Onboarding Status"
                  value={sellerProfile.onboardingStatus}
                  className="md:col-span-3"
                />
                <DetailField
                  label="Profile Completed"
                  value={sellerProfile.profileCompleted}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Rejection Reason"
                  value={sellerProfile.rejectionReason}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Verified By"
                  value={sellerProfile.verifiedBy}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Verified At"
                  value={formatDate(sellerProfile.verifiedAt)}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Go Live Approved By"
                  value={sellerProfile.goLiveApprovedBy}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Go Live Approved At"
                  value={formatDate(sellerProfile.goLiveApprovedAt)}
                  className="md:col-span-6"
                />
              </FieldGrid>
            </ProfileSection>
          )}

          {hasSellerProfile && (
            <ProfileSection
              number={nextSectionNumber()}
              title="Onboarding Checklist"
            >
              <FieldGrid>
                <DetailField
                  label="Profile Completed"
                  value={onboardingChecklist.profileCompleted}
                  className="md:col-span-6"
                />
                <DetailField
                  label="KYC Submitted"
                  value={onboardingChecklist.kycSubmitted}
                  className="md:col-span-3"
                />
                <DetailField
                  label="GST Verified"
                  value={onboardingChecklist.gstVerified}
                  className="md:col-span-3"
                />
                <DetailField
                  label="Bank Linked"
                  value={onboardingChecklist.bankLinked}
                  className="md:col-span-6"
                />
                <DetailField
                  label="First Product Published"
                  value={onboardingChecklist.firstProductPublished}
                  className="md:col-span-6"
                />
              </FieldGrid>
            </ProfileSection>
          )}

          {isSeller && hasValue(bankDetails) && (
            <ProfileSection number={nextSectionNumber()} title="Bank Details">
              <FieldGrid>
                <DetailField
                  label="Account Holder Name"
                  value={bankDetails.accountHolderName}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Account Number"
                  value={bankDetails.accountNumber}
                  className="md:col-span-6"
                />
                <DetailField
                  label="IFSC Code"
                  value={bankDetails.ifscCode}
                  className="md:col-span-6"
                />
                <DetailField
                  label="Bank Name"
                  value={bankDetails.bankName}
                  className="md:col-span-3"
                />
                <DetailField
                  label="Branch Name"
                  value={bankDetails.branchName}
                  className="md:col-span-3"
                />
                <DetailField
                  label="Bank Rejection Reason"
                  value={sellerProfile.bankRejectionReason}
                  className="md:col-span-12"
                />
              </FieldGrid>
            </ProfileSection>
          )}

          {hasSellerAddresses && (
            <ProfileSection
              number={nextSectionNumber()}
              title="Seller Addresses"
            >
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {hasAddressValue(businessAddress) && (
                  <AddressBlock
                    title="Business Address"
                    address={businessAddress}
                  />
                )}
                {hasAddressValue(pickupAddress) && (
                  <AddressBlock
                    title="Pickup Address"
                    address={pickupAddress}
                  />
                )}
              </div>
            </ProfileSection>
          )}

          <ProfileSection number={nextSectionNumber()} title="Saved Addresses">
            {addresses.length ? (
              <div className="space-y-4">
                {addresses.map((address, index) => (
                  <AddressBlock
                    key={address._id || index}
                    title={`Address ${index + 1}${address.isDefault ? " (Default)" : ""}`}
                    address={address}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[6px] border border-[#dad7ea] bg-[#faf8ff]/70 px-4 py-3 text-sm text-slate-500">
                No addresses saved.
              </div>
            )}
          </ProfileSection>

          {isEditing && (
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--admin-line)] pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="admin-btn-secondary sm:min-w-[150px]"
              >
                <PiX />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdate}
                disabled={updating}
                className="admin-btn-primary sm:min-w-[220px]"
              >
                <BsSave />
                {updating ? "Updating..." : "Update Profile"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
