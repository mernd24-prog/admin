import React, { useEffect, useState } from "react";
import { BsCamera, BsSave } from "react-icons/bs";
import { FiDownload, FiEdit3, FiEye, FiFileText } from "react-icons/fi";
import { PiX } from "react-icons/pi";
import { useDispatch } from "react-redux";
import { getProfile, updateProfile } from "../../Redux/userSlice";
import { toast } from "sonner";
import { apiRequest } from "../../_helpers/apiConfig";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { uploadFile } from "../../_helpers/globalFunctions";
import Loader from "../../components/Loader/Loader";
import { PageHeader } from "../../components/Shared";
import {
  formatDate as formatDateOnly,
  formatDateTime12Hour,
} from "../../utils/formatters";

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

const SELLER_ROLES = new Set(["seller", "seller-admin", "seller-sub-admin"]);

const parseDocumentMap = (value = {}) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const isPdfDocument = (url = "") =>
  /\.pdf(\?.*)?$/i.test(String(url || "")) ||
  String(url || "").toLowerCase().includes("application/pdf");

const isImageDocument = (url = "") =>
  /\.(png|jpe?g|webp|gif|bmp|avif)(\?.*)?$/i.test(String(url || ""));

const unwrapSellerProfileResponse = (response = {}) => {
  const root = response?.data?.data || response?.data || response || {};
  return {
    sellerProfile: root.profile || {},
    sellerSettings: root.settings || {},
    sellerKyc: root.kyc || null,
    sellerOrganization: root.organization || null,
  };
};

const mergeSellerProfileData = (user = {}, sellerResponse = {}) => {
  const sellerData = unwrapSellerProfileResponse(sellerResponse);
  const documents = {
    ...parseDocumentMap(sellerData.sellerProfile.documents),
    ...parseDocumentMap(sellerData.sellerProfile.kycDocuments),
    ...parseDocumentMap(sellerData.sellerKyc?.documents),
    ...parseDocumentMap(sellerData.sellerOrganization?.documents),
  };

  return {
    ...user,
    ...sellerData,
    sellerProfile: {
      ...(user.sellerProfile || {}),
      ...(sellerData.sellerProfile || {}),
      documents,
    },
  };
};

const formatDate = (value, withTime = true) => {
  if (withTime) return formatDateTime12Hour(value, "-");
  return formatDateOnly(value, "-");
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

const DocumentCard = ({ title, hint = "JPG, PNG or PDF", url, tone = "blue", onView }) => {
  const toneClass = {
    purple: "border-[#d7c4ff] bg-[#f5efff] text-[#7c3aed]",
    red: "border-[#ffd8ca] bg-[#fff4ed] text-[#ef4444]",
    green: "border-[#b9e9c6] bg-[#effcf3] text-[#15803d]",
    blue: "border-[#b9cdfd] bg-[#eff5ff] text-[#2563eb]",
  }[tone] || "border-[#b9cdfd] bg-[#eff5ff] text-[#2563eb]";

  return (
    <button
      type="button"
      onClick={() => url && onView?.({ label: title, url })}
      disabled={!url}
      className="group flex min-h-[150px] flex-col items-center justify-center rounded-lg border border-[#efd7a6] bg-white px-4 py-5 text-center transition hover:border-[#d9a33c] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className={`flex h-[54px] w-[64px] items-center justify-center rounded-md border ${toneClass}`}>
        <FiFileText className="h-7 w-7" />
      </span>
      <span className="mt-3 text-sm font-bold text-[#3b344a]">{title}</span>
      <span className="mt-1 text-[11px] text-[#5f6070]">{hint}</span>
      <span className="mt-3 inline-flex min-h-[26px] items-center gap-1 rounded-md border border-[#3b73ff] px-3 py-1 text-[11px] font-semibold text-[#1d5cff] transition group-hover:bg-[#eef4ff]">
        <FiEye className="h-3.5 w-3.5" />
        {url ? "View Document" : "Not Uploaded"}
      </span>
    </button>
  );
};

const DocumentPreviewModal = ({ document, onClose }) => {
  if (!document?.url) return null;
  const canShowAsImage = isImageDocument(document.url);
  const canShowAsPdf = isPdfDocument(document.url);

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[var(--admin-navy)]">
              {document.label}
            </p>
            <p className="truncate text-xs text-[var(--admin-muted)]">
              {document.url}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={document.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn-secondary min-h-[34px] px-3 text-xs"
            >
              <FiDownload />
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
              aria-label="Close document preview"
            >
              <PiX className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="min-h-[55vh] overflow-auto bg-[#f5f6fa] p-4">
          {canShowAsImage ? (
            <img
              src={document.url}
              alt={document.label}
              className="mx-auto max-h-[72vh] max-w-full rounded-md bg-white object-contain shadow-sm"
            />
          ) : canShowAsPdf ? (
            <iframe
              title={document.label}
              src={document.url}
              className="h-[72vh] w-full rounded-md border border-[var(--admin-line)] bg-white"
            />
          ) : (
            <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-md bg-white p-6 text-center">
              <FiFileText className="h-10 w-10 text-[var(--admin-muted)]" />
              <p className="mt-3 text-sm font-semibold text-[var(--admin-navy)]">
                Preview is not available for this file type.
              </p>
              <a
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 admin-btn-primary"
              >
                <FiEye />
                Open Document
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
  <div className="r">
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
  const [previewDocument, setPreviewDocument] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await dispatch(getProfile()).unwrap();
        if (res) {
          const userProfile = profileToForm(res?.data);
          if (SELLER_ROLES.has(userProfile.role)) {
            try {
              const sellerResponse = await apiRequest(
                "GET",
                ENDPOINTS.sellers.profile,
              );
              setFormData(
                profileToForm(mergeSellerProfileData(userProfile, sellerResponse)),
              );
            } catch (sellerError) {
              console.error("Seller profile fetch failed:", sellerError);
              setFormData(userProfile);
              toast.error(
                sellerError?.message || "Unable to load seller profile details",
              );
            }
          } else {
            setFormData(userProfile);
          }
        }
      } catch (error) {
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
    const apiPayload = {
      user_image: formData?.user_image,
      full_name: formData?.full_name,
    };
    const res = await dispatch(updateProfile(apiPayload)).unwrap();
    if (res?.data) {
      setFormData(profileToForm(res.data));
      window.dispatchEvent(
        new CustomEvent("profile:updated", { detail: res.data })
      );

      setIsEditing(false);
      toast.success("Profile updated successfully!");
    }
  } catch (error) {
    console.error(error);
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
  const sellerKyc = formData.sellerKyc || {};
  const sellerDocuments = {
    ...parseDocumentMap(sellerProfile.documents),
    ...parseDocumentMap(sellerProfile.kycDocuments),
    ...parseDocumentMap(sellerKyc.documents),
    ...parseDocumentMap(formData.sellerOrganization?.documents),
  };
  const bankDetails = sellerProfile.bankDetails || {};
  const businessAddress = sellerProfile.businessAddress || {};
  const pickupAddress = sellerProfile.pickupAddress || {};
  // const addresses = Array.isArray(formData.addresses) ? formData.addresses : [];
  const isSeller = SELLER_ROLES.has(formData.role);
  const hasSellerProfile = isSeller && Object.keys(sellerProfile).length > 0;
  const hasSellerAddresses =
    isSeller &&
    (hasAddressValue(businessAddress) || hasAddressValue(pickupAddress));
  const documentCards = [
    {
      key: "panDocumentUrl",
      title: "PAN Card",
      url: sellerDocuments.panDocumentUrl,
      tone: "purple",
    },
    {
      key: "aadhaarFrontUrl",
      title: "Aadhaar Front",
      url: sellerDocuments.aadhaarFrontUrl,
      tone: "red",
    },
    {
      key: "aadhaarBackUrl",
      title: "Aadhaar Back",
      url: sellerDocuments.aadhaarBackUrl,
      tone: "red",
    },
    {
      key: "gstCertificateUrl",
      title: "GST Certificate",
      url: sellerDocuments.gstCertificateUrl,
      tone: "blue",
    },
    {
      key: "bankProofUrl",
      title: "Cancel Cheque Copy",
      url: sellerDocuments.bankProofUrl,
      tone: "green",
    },
    {
      key: "addressProofUrl",
      title: "Address Proof",
      url: sellerDocuments.addressProofUrl,
      tone: "blue",
    },
  ];
  let currentSection = 0;
  const nextSectionNumber = () => String(++currentSection).padStart(2, "0");

  return (
    <div className="admin-page">
      <Loader loading={loading} />
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
              {/* <DetailField
                label="Primary Contact Name"
                value={sellerProfile.primaryContactName}
                className="md:col-span-6"
              /> */}
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
               <DetailField
                label="Referral Code"
                value={formData.referralCode}
                className="md:col-span-6"
              />
            </FieldGrid>
          </ProfileSection>

         
      

  
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
                {/* <DetailField
                  label="Bank Rejection Reason"
                  value={sellerProfile.bankRejectionReason}
                  className="md:col-span-12"
                /> */}
              </FieldGrid>
            </ProfileSection>
          )}

          {hasSellerProfile && (
            <ProfileSection
            number={nextSectionNumber()}
            title="Documents"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
              {documentCards.map((item) => (
                <DocumentCard
                  key={item.key}
                  title={item.title}
                  url={item.url}
                  tone={item.tone}
                  onView={setPreviewDocument}
                />
              ))}
            </div>
          </ProfileSection>
          )}


         

     



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
      <DocumentPreviewModal
        document={previewDocument}
        onClose={() => setPreviewDocument(null)}
      />
    </div>
  );
};

export default Profile;
