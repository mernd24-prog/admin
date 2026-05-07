import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  clearSellerOnboarding,
  fetchAuthStatus,
  submitSellerKyc,
  updateSellerOnboardingProfile,
} from "../../Redux/seller-slice";
import { useKYC } from "../../context/KycContext";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const ERROR_CLASS = "mt-1 text-xs text-red-600";

const parseApiError = (error, fallbackMessage) => {
  if (!error) return { message: fallbackMessage, details: [] };
  if (typeof error === "string") return { message: error, details: [] };
  return {
    message: error.message || fallbackMessage,
    details: Array.isArray(error.details) ? error.details : [],
  };
};

const SellerOnboarding = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {setStep,step} = useKYC();
  const { seller } = useSelector((state) => state);
  const onboardingToken = seller?.onboardingToken || localStorage.getItem("sellerOnboardingToken");
  const loading = seller?.loading;
  const flowState = seller?.flowState;

  const [kycSubmittedApi, setKycSubmittedApi] = useState(false);
  const [kycErrors, setKycErrors] = useState({});
  const [profileErrors, setProfileErrors] = useState({});

  const [kycForm, setKycForm] = useState({
    panNumber: "",
    gstNumber: "",
    aadhaarNumber: "",
    legalName: "",
    businessType: "individual",
    dateOfBirth: "",
  });

  const [profileForm, setProfileForm] = useState({
    displayName: "",
    legalBusinessName: "",
    supportEmail: "",
    supportPhone: "",
    pickupLine1: "",
    pickupCity: "",
    pickupState: "",
    pickupPostalCode: "",
  });
  const [bankForm, setBankForm] = useState({
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    branchName: "",
  });

  const canAccess = useMemo(() => !!onboardingToken, [onboardingToken]);

  useEffect(() => {
    dispatch(fetchAuthStatus({ token: onboardingToken }));
  }, [dispatch, onboardingToken]);

  useEffect(() => {
    if (!flowState) return;
    const profileCompleted =
      !!flowState?.checklist?.profileCompleted ||
      !!flowState?.requirements?.profile?.completed;
    const bankLinked =
      !!flowState?.checklist?.bankLinked ||
      !!flowState?.requirements?.bankDetails?.completed;
    const kycSubmitted =
      !!flowState?.checklist?.kycSubmitted ||
      ["submitted", "under_review", "verified"].includes(flowState?.kycStatus);
    const statusMeansReview =
      flowState?.kycStatus === "submitted" ||
      flowState?.kycStatus === "under_review" ||
      flowState?.onboardingStatus === "under_review";

    if (flowState?.accountStatus === "active" && !flowState?.requiresOnboarding) {
      navigate("/app/home");
      return;
    }
    if (flowState?.kycStatus === "rejected") {
      setStep(1);
      return;
    }
    if (statusMeansReview && profileCompleted && bankLinked) {
      setStep(5);
      return;
    }
    if (profileCompleted && kycSubmitted && bankLinked) {
      setStep(5);
      return;
    }
    if (profileCompleted && kycSubmitted) {
      setStep(3);
      return;
    }
    if (kycSubmitted) {
      setStep(2);
      return;
    }

    setStep(1);
  }, [flowState, navigate, setStep]);

  if (!canAccess) return <Navigate to="/login" />;

  const setBackendFieldErrors = (details, setErrors) => {
    const nextErrors = {};
    details.forEach((detail) => {
      const path = detail?.path || [];
      const field = path[path.length - 1];
      if (field) nextErrors[field] = detail.message;
    });
    setErrors(nextErrors);
  };

  const onKycChange = (event) => {
    const { name, value } = event.target;
    const normalized =
      name === "panNumber" || name === "gstNumber" ? value.toUpperCase() : value;
    setKycForm((prev) => ({ ...prev, [name]: normalized }));
    setKycErrors((prev) => ({ ...prev, [name]: null }));
  };

  const onProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
    setProfileErrors((prev) => ({ ...prev, [name]: null }));
  };
  const onBankChange = (event) => {
    const { name, value } = event.target;
    const normalized = name === "ifscCode" ? value.toUpperCase() : value;
    setBankForm((prev) => ({ ...prev, [name]: normalized }));
    setProfileErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validateKyc = () => {
    const errors = {};
    if (!kycForm.legalName.trim()) errors.legalName = "Legal name is required";
    if (!PAN_REGEX.test(kycForm.panNumber.trim())) errors.panNumber = "PAN format should be like ABCDE1234F";
    if (kycForm.gstNumber.trim() && !GST_REGEX.test(kycForm.gstNumber.trim())) {
      errors.gstNumber = "GST format is invalid";
    }
    if (kycForm.aadhaarNumber.trim() && !AADHAAR_REGEX.test(kycForm.aadhaarNumber.trim())) {
      errors.aadhaarNumber = "Aadhaar must be 12 digits";
    }
    setKycErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateProfile = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!profileForm.displayName.trim()) errors.displayName = "Display name is required";
    if (!profileForm.legalBusinessName.trim()) errors.legalBusinessName = "Legal business name is required";
    if (!emailRegex.test(profileForm.supportEmail.trim())) errors.supportEmail = "Valid support email is required";
    if (!profileForm.supportPhone.trim() || profileForm.supportPhone.trim().length < 10) {
      errors.supportPhone = "Support phone must be at least 10 digits";
    }
    if (!profileForm.pickupLine1.trim()) errors.pickupLine1 = "Pickup address line 1 is required";
    if (!profileForm.pickupCity.trim()) errors.pickupCity = "Pickup city is required";
    if (!profileForm.pickupState.trim()) errors.pickupState = "Pickup state is required";
    if (!profileForm.pickupPostalCode.trim()) errors.pickupPostalCode = "Pickup postal code is required";
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitKycStep = async (event) => {
    event.preventDefault();
    if (!validateKyc()) return;
    try {
      await dispatch(submitSellerKyc(kycForm)).unwrap();
      setKycSubmittedApi(true);
      await dispatch(fetchAuthStatus({ token: onboardingToken })).unwrap();
      setStep(2);
    } catch (error) {
      const parsed = parseApiError(error, "Unable to submit KYC");
      setBackendFieldErrors(parsed.details, setKycErrors);
      toast.error(parsed.message);
    }
  };

  const submitBusinessStep = async (event) => {
    event.preventDefault();
    if (!validateProfile()) return;
    setStep(3);
  };

  const submitBankStep = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!bankForm.accountHolderName.trim()) errors.accountHolderName = "Account holder name is required";
    if (!bankForm.accountNumber.trim()) errors.accountNumber = "Account number is required";
    if (!bankForm.ifscCode.trim()) errors.ifscCode = "IFSC code is required";
    if (!bankForm.bankName.trim()) errors.bankName = "Bank name is required";
    if (!bankForm.branchName.trim()) errors.branchName = "Branch name is required";
    if (Object.keys(errors).length > 0) {
      setProfileErrors((prev) => ({ ...prev, ...errors }));
      return;
    }
    setStep(4);
  };

  const submitFinalOnboarding = async () => {
    if (!validateProfile()) return;
    try {
      if (!kycSubmittedApi) {
        await dispatch(submitSellerKyc(kycForm)).unwrap();
      }
      const payload = {
        displayName: profileForm.displayName,
        legalBusinessName: profileForm.legalBusinessName,
        supportEmail: profileForm.supportEmail,
        supportPhone: profileForm.supportPhone,
        pickupAddress: {
          line1: profileForm.pickupLine1,
          city: profileForm.pickupCity,
          state: profileForm.pickupState,
          postalCode: profileForm.pickupPostalCode,
        },
        bankDetails: {
          accountHolderName: bankForm.accountHolderName,
          accountNumber: bankForm.accountNumber,
          ifscCode: bankForm.ifscCode,
          bankName: bankForm.bankName,
          branchName: bankForm.branchName,
        },
      };
      await dispatch(updateSellerOnboardingProfile(payload)).unwrap();
      await dispatch(fetchAuthStatus({ token: onboardingToken })).unwrap();
      setStep(5);
      toast.success("Onboarding submitted for approval");
    } catch (error) {
      const parsed = parseApiError(error, "Unable to submit business profile");
      const detailKeys = (parsed.details || []).map((d) => d?.path?.[d?.path?.length - 1]);
      const isKycError = detailKeys.some((key) => ["panNumber", "gstNumber", "aadhaarNumber", "legalName"].includes(key));
      setBackendFieldErrors(parsed.details, isKycError ? setKycErrors : setProfileErrors);
      toast.error(parsed.message);
    }
  };

  if (step === 5) {
    return (
      <div className="min-h-screen flex items-center justify-center   ">
        <div className="max-w-lg text-center bg-white      ">
          <h2 className="text-2xl font-semibold mb-2">
            {flowState?.kycStatus === "rejected" ? "KYC Rejected" : "Verification In Progress"}
          </h2>
          {flowState?.kycStatus === "rejected" ? (
            <p className="text-gray-600 mb-6">
              {flowState?.kycRejectionReason || "Your KYC was rejected. Please update details and submit again."}
            </p>
          ) : (
            <p className="text-gray-600 mb-6">
              Your verification is in progress. KYC status: {flowState?.kycStatus || "under_review"}.
            </p>
          )}
          <button
            type="button"
            className="px-4 py-2 rounded bg-blue-600 text-white"
            onClick={() => {
              dispatch(clearSellerOnboarding());
              navigate("/login");
            }}
          >
            Back To Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen   flex items-center justify-center px-4 py-8">
      <div className="w-full   l overflow-hidden  ">
        <div className="grid grid-cols-1  ">
         
          <div className="p-8 md:p-10">
            {step === 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Mobile/Email Verification Complete</h2>
                <p className="text-gray-600 mb-6">
                  Next, submit KYC and business details. After that, your account goes under review.
                </p>
                <button type="button" className="px-4 py-2 rounded bg-blue-600 text-white" onClick={() => setStep(1)}>
                  Start KYC Verification
                </button>
              </div>
            )}

            {step === 1 && (
              <form onSubmit={submitKycStep} className="space-y-3">
                <h2 className="text-xl font-semibold mb-2">KYC Verification</h2>
                <div>
                  <input name="legalName" placeholder="Legal Name" className={INPUT_CLASS} value={kycForm.legalName} onChange={onKycChange} />
                  {kycErrors.legalName && <p className={ERROR_CLASS}>{kycErrors.legalName}</p>}
                </div>
                <div>
                  <input name="panNumber" placeholder="PAN Number" className={INPUT_CLASS} value={kycForm.panNumber} onChange={onKycChange} />
                  {kycErrors.panNumber && <p className={ERROR_CLASS}>{kycErrors.panNumber}</p>}
                </div>
                <div>
                  <input name="gstNumber" placeholder="GST Number (optional)" className={INPUT_CLASS} value={kycForm.gstNumber} onChange={onKycChange} />
                  {kycErrors.gstNumber && <p className={ERROR_CLASS}>{kycErrors.gstNumber}</p>}
                </div>
                <div>
                  <input name="aadhaarNumber" placeholder="Aadhaar Number (optional)" className={INPUT_CLASS} value={kycForm.aadhaarNumber} onChange={onKycChange} />
                  {kycErrors.aadhaarNumber && <p className={ERROR_CLASS}>{kycErrors.aadhaarNumber}</p>}
                </div>
                <input name="dateOfBirth" type="date" className={INPUT_CLASS} value={kycForm.dateOfBirth} onChange={onKycChange} />
                <select name="businessType" className={INPUT_CLASS} value={kycForm.businessType} onChange={onKycChange}>
                  <option value="individual">Individual</option>
                  <option value="proprietorship">Proprietorship</option>
                  <option value="partnership">Partnership</option>
                  <option value="private_limited">Private Limited</option>
                </select>
                <button disabled={loading} className="w-full px-4 py-2 rounded bg-blue-600 text-white" type="submit">
                  {loading ? "Submitting..." : "Continue"}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={submitBusinessStep} className="space-y-3">
                <h2 className="text-xl font-semibold mb-2">Business Profile</h2>
                <div>
                  <input name="displayName" placeholder="Display Name" className={INPUT_CLASS} value={profileForm.displayName} onChange={onProfileChange} />
                  {profileErrors.displayName && <p className={ERROR_CLASS}>{profileErrors.displayName}</p>}
                </div>
                <div>
                  <input name="legalBusinessName" placeholder="Legal Business Name" className={INPUT_CLASS} value={profileForm.legalBusinessName} onChange={onProfileChange} />
                  {profileErrors.legalBusinessName && <p className={ERROR_CLASS}>{profileErrors.legalBusinessName}</p>}
                </div>
                <div>
                  <input name="supportEmail" placeholder="Support Email" type="email" className={INPUT_CLASS} value={profileForm.supportEmail} onChange={onProfileChange} />
                  {profileErrors.supportEmail && <p className={ERROR_CLASS}>{profileErrors.supportEmail}</p>}
                </div>
                <div>
                  <input name="supportPhone" placeholder="Support Phone" className={INPUT_CLASS} value={profileForm.supportPhone} onChange={onProfileChange} />
                  {profileErrors.supportPhone && <p className={ERROR_CLASS}>{profileErrors.supportPhone}</p>}
                </div>
                <div>
                  <input name="pickupLine1" placeholder="Pickup Address Line 1" className={INPUT_CLASS} value={profileForm.pickupLine1} onChange={onProfileChange} />
                  {profileErrors.pickupLine1 && <p className={ERROR_CLASS}>{profileErrors.pickupLine1}</p>}
                </div>
                <div>
                  <input name="pickupCity" placeholder="Pickup City" className={INPUT_CLASS} value={profileForm.pickupCity} onChange={onProfileChange} />
                  {profileErrors.pickupCity && <p className={ERROR_CLASS}>{profileErrors.pickupCity}</p>}
                </div>
                <div>
                  <input name="pickupState" placeholder="Pickup State" className={INPUT_CLASS} value={profileForm.pickupState} onChange={onProfileChange} />
                  {profileErrors.pickupState && <p className={ERROR_CLASS}>{profileErrors.pickupState}</p>}
                </div>
                <div>
                  <input name="pickupPostalCode" placeholder="Pickup Postal Code" className={INPUT_CLASS} value={profileForm.pickupPostalCode} onChange={onProfileChange} />
                  {profileErrors.pickupPostalCode && <p className={ERROR_CLASS}>{profileErrors.pickupPostalCode}</p>}
                </div>
                <button disabled={loading} className="w-full px-4 py-2 rounded bg-blue-600 text-white" type="submit">
                  Continue
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={submitBankStep} className="space-y-3">
                <h2 className="text-xl font-semibold mb-2">Bank Details</h2>
                <div>
                  <input name="accountHolderName" placeholder="Account Holder Name" className={INPUT_CLASS} value={bankForm.accountHolderName} onChange={onBankChange} />
                  {profileErrors.accountHolderName && <p className={ERROR_CLASS}>{profileErrors.accountHolderName}</p>}
                </div>
                <div>
                  <input name="accountNumber" placeholder="Account Number" className={INPUT_CLASS} value={bankForm.accountNumber} onChange={onBankChange} />
                  {profileErrors.accountNumber && <p className={ERROR_CLASS}>{profileErrors.accountNumber}</p>}
                </div>
                <div>
                  <input name="ifscCode" placeholder="IFSC Code" className={INPUT_CLASS} value={bankForm.ifscCode} onChange={onBankChange} />
                  {profileErrors.ifscCode && <p className={ERROR_CLASS}>{profileErrors.ifscCode}</p>}
                </div>
                <div>
                  <input name="bankName" placeholder="Bank Name" className={INPUT_CLASS} value={bankForm.bankName} onChange={onBankChange} />
                  {profileErrors.bankName && <p className={ERROR_CLASS}>{profileErrors.bankName}</p>}
                </div>
                <div>
                  <input name="branchName" placeholder="Branch Name" className={INPUT_CLASS} value={bankForm.branchName} onChange={onBankChange} />
                  {profileErrors.branchName && <p className={ERROR_CLASS}>{profileErrors.branchName}</p>}
                </div>
                <button disabled={loading} className="w-full px-4 py-2 rounded bg-blue-600 text-white" type="submit">
                  Continue
                </button>
              </form>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Review All Details</h2>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">KYC Details</h3>
                    <button className="text-blue-600 text-sm" type="button" onClick={() => setStep(1)}>Edit</button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Legal Name: {kycForm.legalName}</p>
                  <p className="text-sm text-gray-600">PAN: {kycForm.panNumber}</p>
                  <p className="text-sm text-gray-600">GST: {kycForm.gstNumber || "-"}</p>
                  <p className="text-sm text-gray-600">Aadhaar: {kycForm.aadhaarNumber || "-"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Business Details</h3>
                    <button className="text-blue-600 text-sm" type="button" onClick={() => setStep(2)}>Edit</button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Display Name: {profileForm.displayName}</p>
                  <p className="text-sm text-gray-600">Support Email: {profileForm.supportEmail}</p>
                  <p className="text-sm text-gray-600">Support Phone: {profileForm.supportPhone}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Bank Details</h3>
                    <button className="text-blue-600 text-sm" type="button" onClick={() => setStep(3)}>Edit</button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Account Holder: {bankForm.accountHolderName}</p>
                  <p className="text-sm text-gray-600">Account Number: {bankForm.accountNumber}</p>
                  <p className="text-sm text-gray-600">IFSC: {bankForm.ifscCode}</p>
                  <p className="text-sm text-gray-600">Bank: {bankForm.bankName}</p>
                  <p className="text-sm text-gray-600">Branch: {bankForm.branchName}</p>
                </div>
                <button disabled={loading} className="w-full px-4 py-2 rounded bg-blue-600 text-white" type="button" onClick={submitFinalOnboarding}>
                  {loading ? "Submitting..." : "Submit For Approval"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerOnboarding;
