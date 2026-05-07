// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { Navigate, useNavigate } from "react-router-dom";
// import { toast } from "sonner";
// import { ChevronDown, UploadCloud, Edit2 } from "lucide-react";
// import { FaCalendarAlt } from "react-icons/fa";
// import { AiOutlineShoppingCart } from "react-icons/ai";
// import { RiEditBoxFill } from "react-icons/ri";
// import {
//   clearSellerOnboarding,
//   fetchAuthStatus,
//   submitSellerKyc,
//   updateSellerOnboardingProfile,
// } from "../../Redux/seller-slice";
// import { useKYC } from "../../context/KycContext";

// const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
// const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/;
// const AADHAAR_REGEX = /^[0-9]{12}$/;

// const ERROR_CLASS = "mt-1 text-xs text-red-600";
// const STEP_ONE_INPUT_CLASS =
//   "h-[35px] w-full rounded-md border border-[#e5e5e5] bg-[#f5f1eb] px-4 text-[13px] text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-100";
// const DATE_FIELD_CLASS =
//   "h-[35px] w-full rounded-md border border-[#e5e5e5] bg-[#f5f1eb] pl-4 pr-3 text-[13px] outline-none transition hover:border-[#d8d8d8] focus:border-[#c99528] focus:ring-2 focus:ring-amber-100";
// const STEP_ONE_REQUIRED = <span className="text-[#c99528]">*</span>;
// const SECONDARY_BUTTON_CLASS =
//   "h-8 min-w-[106px] rounded-full bg-[#e5e5e5] px-7 text-sm font-semibold text-gray-600 transition hover:bg-[#d2d2d2] flex items-center justify-center leading-none";
// const PRIMARY_BUTTON_CLASS =
//   "h-8 min-w-[120px] rounded-full bg-[#b27a25] px-7 text-sm font-semibold text-white transition hover:bg-[#9f6c1f] disabled:cursor-not-allowed disabled:bg-[#d6b678] flex items-center justify-center leading-none";
// const REVIEW_CARD_CLASS =
//   "rounded-md border border-[#e5e5e5] bg-[#faf8f6] px-6 py-4";
// const DISPLAY_FIELD_CLASS =
//   "h-[35px] w-full rounded-md border border-[#e5e5e5] bg-[#f5f1eb] px-4 text-[13px] text-gray-800 flex items-center";

// const parseApiError = (error, fallbackMessage) => {
//   if (!error) return { message: fallbackMessage, details: [] };
//   if (typeof error === "string") return { message: error, details: [] };
//   return {
//     message: error.message || fallbackMessage,
//     details: Array.isArray(error.details) ? error.details : [],
//   };
// };

// const formatDateForDisplay = (value) => {
//   if (!value) return "";
//   const [year, month, day] = value.split("-");
//   if (!year || !month || !day) return value;
//   return `${day}/${month}/${year}`;
// };

// const SellerOnboarding = () => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const { setStep, step } = useKYC();
//   const { seller } = useSelector((state) => state);
//   const onboardingToken =
//     seller?.onboardingToken || localStorage.getItem("sellerOnboardingToken");
//   const loading = seller?.loading;
//   const flowState = seller?.flowState;

//   const [kycSubmittedApi, setKycSubmittedApi] = useState(false);
//   const [kycErrors, setKycErrors] = useState({});
//   const [profileErrors, setProfileErrors] = useState({});
//   const dateOfBirthRef = useRef(null);

//   const [kycForm, setKycForm] = useState({
//     panNumber: "",
//     gstNumber: "",
//     aadhaarNumber: "",
//     legalName: "",
//     businessType: "individual",
//     dateOfBirth: "",
//     city: "",
//     zipCode: "",
//     panCardFile: null,
//   });

//   const [profileForm, setProfileForm] = useState({
//     businessType: "",
//     businessName: "",
//     gstNumber: "",
//     gstCertificateFile: null,
//     displayName: "",
//     legalBusinessName: "",
//     supportEmail: "",
//     supportPhone: "",
//   });
//   const [bankForm, setBankForm] = useState({
//     accountHolderName: "",
//     accountNumber: "",
//     ifscCode: "",
//     bankName: "",
//     branchName: "",
//   });

//   const canAccess = useMemo(() => !!onboardingToken, [onboardingToken]);

//   useEffect(() => {
//     dispatch(fetchAuthStatus({ token: onboardingToken }));
//   }, [dispatch, onboardingToken]);

//   useEffect(() => {
//     if (!flowState) return;
//     const profileCompleted =
//       !!flowState?.checklist?.profileCompleted ||
//       !!flowState?.requirements?.profile?.completed;
//     const bankLinked =
//       !!flowState?.checklist?.bankLinked ||
//       !!flowState?.requirements?.bankDetails?.completed;
//     const kycSubmitted =
//       !!flowState?.checklist?.kycSubmitted ||
//       ["submitted", "under_review", "verified"].includes(flowState?.kycStatus);
//     const statusMeansReview =
//       flowState?.kycStatus === "submitted" ||
//       flowState?.kycStatus === "under_review" ||
//       flowState?.onboardingStatus === "under_review";

//     if (
//       flowState?.accountStatus === "active" &&
//       !flowState?.requiresOnboarding
//     ) {
//       navigate("/app/home");
//       return;
//     }
//     if (flowState?.kycStatus === "rejected") {
//       setStep(1);
//       return;
//     }
//     if (statusMeansReview && profileCompleted && bankLinked) {
//       setStep(5);
//       return;
//     }
//     if (profileCompleted && kycSubmitted && bankLinked) {
//       setStep(5);
//       return;
//     }
//     if (profileCompleted && kycSubmitted) {
//       setStep(3);
//       return;
//     }
//     if (kycSubmitted) {
//       setStep(2);
//       return;
//     }

//     setStep(1);
//   }, [flowState, navigate, setStep]);

//   if (!canAccess) return <Navigate to="/login" />;

//   const setBackendFieldErrors = (details, setErrors) => {
//     const nextErrors = {};
//     details.forEach((detail) => {
//       const path = detail?.path || [];
//       const field = path[path.length - 1];
//       if (field) nextErrors[field] = detail.message;
//     });
//     setErrors(nextErrors);
//   };

//   const onKycChange = (event) => {
//     const { name, value } = event.target;
//     const normalized =
//       name === "panNumber" || name === "gstNumber"
//         ? value.toUpperCase()
//         : value;
//     setKycForm((prev) => ({ ...prev, [name]: normalized }));
//     setKycErrors((prev) => ({ ...prev, [name]: null }));
//   };

//   const onPanCardFileChange = (event) => {
//     const file = event.target.files?.[0] || null;
//     setKycForm((prev) => ({ ...prev, panCardFile: file }));
//     setKycErrors((prev) => ({ ...prev, panCardFile: null }));
//   };

//   const onPanCardDrop = (event) => {
//     event.preventDefault();
//     const file = event.dataTransfer.files?.[0] || null;
//     if (!file) return;
//     setKycForm((prev) => ({ ...prev, panCardFile: file }));
//     setKycErrors((prev) => ({ ...prev, panCardFile: null }));
//   };

//   const onGstCertificateFileChange = (event) => {
//     const file = event.target.files?.[0] || null;
//     setProfileForm((prev) => ({ ...prev, gstCertificateFile: file }));
//     setProfileErrors((prev) => ({ ...prev, gstCertificateFile: null }));
//   };

//   const onGstCertificateDrop = (event) => {
//     event.preventDefault();
//     const file = event.dataTransfer.files?.[0] || null;
//     if (!file) return;
//     setProfileForm((prev) => ({ ...prev, gstCertificateFile: file }));
//     setProfileErrors((prev) => ({ ...prev, gstCertificateFile: null }));
//   };

//   const onProfileChange = (event) => {
//     const { name, value } = event.target;
//     const normalized = name === "gstNumber" ? value.toUpperCase() : value;
//     setProfileForm((prev) => ({ ...prev, [name]: normalized }));
//     setProfileErrors((prev) => ({ ...prev, [name]: null }));
//   };
//   const onBankChange = (event) => {
//     const { name, value } = event.target;
//     const normalized = name === "ifscCode" ? value.toUpperCase() : value;
//     setBankForm((prev) => ({ ...prev, [name]: normalized }));
//     setProfileErrors((prev) => ({ ...prev, [name]: null }));
//   };

//   const validateKyc = () => {
//     const errors = {};
//     if (!kycForm.legalName.trim()) errors.legalName = "Legal name is required";
//     if (!kycForm.dateOfBirth.trim())
//       errors.dateOfBirth = "Date of birth is required";
//     if (!kycForm.city.trim()) errors.city = "City is required";
//     if (!kycForm.zipCode.trim()) errors.zipCode = "Zip code is required";
//     if (!PAN_REGEX.test(kycForm.panNumber.trim()))
//       errors.panNumber = "PAN format should be like ABCDE1234F";
//     if (!kycForm.panCardFile) errors.panCardFile = "PAN card file is required";
//     if (kycForm.gstNumber.trim() && !GST_REGEX.test(kycForm.gstNumber.trim())) {
//       errors.gstNumber = "GST format is invalid";
//     }
//     if (
//       kycForm.aadhaarNumber.trim() &&
//       !AADHAAR_REGEX.test(kycForm.aadhaarNumber.trim())
//     ) {
//       errors.aadhaarNumber = "Aadhaar must be 12 digits";
//     }
//     setKycErrors(errors);
//     return Object.keys(errors).length === 0;
//   };

//   const validateProfile = () => {
//     const errors = {};
//     if (!profileForm.businessType.trim())
//       errors.businessType = "Business type is required";
//     if (!profileForm.businessName.trim())
//       errors.businessName = "Business name is required";
//     if (!GST_REGEX.test(profileForm.gstNumber.trim()))
//       errors.gstNumber = "GST format is invalid";
//     if (!profileForm.gstCertificateFile)
//       errors.gstCertificateFile = "GST certificate is required";
//     setProfileErrors(errors);
//     return Object.keys(errors).length === 0;
//   };

//   const submitKycStep = async (event) => {
//     event.preventDefault();
//     if (!validateKyc()) return;
//     try {
//       const kycPayload = {
//         panNumber: kycForm.panNumber,
//         gstNumber: kycForm.gstNumber,
//         aadhaarNumber: kycForm.aadhaarNumber,
//         legalName: kycForm.legalName,
//         businessType: kycForm.businessType,
//         dateOfBirth: kycForm.dateOfBirth,
//       };
//       await dispatch(submitSellerKyc(kycPayload)).unwrap();
//       setKycSubmittedApi(true);
//       await dispatch(fetchAuthStatus({ token: onboardingToken })).unwrap();
//       setStep(2);
//     } catch (error) {
//       const parsed = parseApiError(error, "Unable to submit KYC");
//       setBackendFieldErrors(parsed.details, setKycErrors);
//       toast.error(parsed.message);
//     }
//   };

//   const submitBusinessStep = async (event) => {
//     event.preventDefault();
//     if (!validateProfile()) return;
//     setStep(3);
//   };

//   const submitBankStep = async (event) => {
//     event.preventDefault();
//     const errors = {};
//     if (!bankForm.accountHolderName.trim())
//       errors.accountHolderName = "Account holder name is required";
//     if (!bankForm.accountNumber.trim())
//       errors.accountNumber = "Account number is required";
//     if (!bankForm.ifscCode.trim()) errors.ifscCode = "IFSC code is required";
//     if (!bankForm.bankName.trim()) errors.bankName = "Bank name is required";
//     if (!bankForm.branchName.trim())
//       errors.branchName = "Branch name is required";
//     if (Object.keys(errors).length > 0) {
//       setProfileErrors((prev) => ({ ...prev, ...errors }));
//       return;
//     }
//     setStep(4);
//   };

//   const submitFinalOnboarding = async () => {
//     if (!validateProfile()) return;
//     try {
//       if (!kycSubmittedApi) {
//         const kycPayload = {
//           panNumber: kycForm.panNumber,
//           gstNumber: kycForm.gstNumber,
//           aadhaarNumber: kycForm.aadhaarNumber,
//           legalName: kycForm.legalName,
//           businessType: kycForm.businessType,
//           dateOfBirth: kycForm.dateOfBirth,
//         };
//         await dispatch(submitSellerKyc(kycPayload)).unwrap();
//       }
//       const payload = {
//         displayName: profileForm.businessName,
//         legalBusinessName: profileForm.businessName,
//         supportEmail: profileForm.supportEmail,
//         supportPhone: profileForm.supportPhone,
//         pickupAddress: {
//           line1: profileForm.pickupLine1,
//           city: profileForm.pickupCity,
//           state: profileForm.pickupState,
//           postalCode: profileForm.pickupPostalCode,
//         },
//         bankDetails: {
//           accountHolderName: bankForm.accountHolderName,
//           accountNumber: bankForm.accountNumber,
//           ifscCode: bankForm.ifscCode,
//           bankName: bankForm.bankName,
//           branchName: bankForm.branchName,
//         },
//       };
//       await dispatch(updateSellerOnboardingProfile(payload)).unwrap();
//       await dispatch(fetchAuthStatus({ token: onboardingToken })).unwrap();
//       setStep(5);
//       toast.success("Onboarding submitted for approval");
//     } catch (error) {
//       const parsed = parseApiError(error, "Unable to submit business profile");
//       const detailKeys = (parsed.details || []).map(
//         (d) => d?.path?.[d?.path?.length - 1]
//       );
//       const isKycError = detailKeys.some((key) =>
//         ["panNumber", "gstNumber", "aadhaarNumber", "legalName"].includes(key)
//       );
//       setBackendFieldErrors(
//         parsed.details,
//         isKycError ? setKycErrors : setProfileErrors
//       );
//       toast.error(parsed.message);
//     }
//   };

//   if (step === 5) {
//     return (
//       <div className="w-full min-h-screen bg-white p-6">
//         <div className="max-w-4xl mx-auto">
//           <h1 className="text-2xl font-semibold text-[#2d2d2d] mb-8">
//             Personal / Owner Details
//           </h1>

//           {/* KYC Details Section */}
//           <div className="mb-8">
//             <div className={`${REVIEW_CARD_CLASS} relative mb-6`}>
//               <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e5e5e5]">
//                 <h3 className="text-lg font-semibold text-[#2d2d2d]">
//                   Personal / Owner Details
//                 </h3>
//                 <button type="button" onClick={() => setStep(1)} title="Edit">
//                   <RiEditBoxFill size={20} className="text-[#CE9F2D]" />
//                 </button>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-2">
//                     Full Name
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>{kycForm.legalName}</div>
//                 </div>
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-2">
//                     Date of Birth
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>
//                     {formatDateForDisplay(kycForm.dateOfBirth)}
//                   </div>
//                 </div>
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-2">
//                     City
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>{kycForm.city}</div>
//                 </div>
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-2">
//                     Zip Code
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>{kycForm.zipCode}</div>
//                 </div>
//                 <div className="md:col-span-2">
//                   <label className="block text-xs text-gray-500 mb-2">
//                     PAN Number
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>{kycForm.panNumber}</div>
//                 </div>

//                 {kycForm.gstNumber && (
//                   <div className="md:col-span-2">
//                     <label className="block text-xs text-gray-500 mb-2">
//                       GST Number
//                     </label>
//                     <div className={DISPLAY_FIELD_CLASS}>
//                       {kycForm.gstNumber}
//                     </div>
//                   </div>
//                 )}

//                 {kycForm.aadhaarNumber && (
//                   <div className="md:col-span-2">
//                     <label className="block text-xs text-gray-500 mb-2">
//                       Aadhaar Number
//                     </label>
//                     <div className={DISPLAY_FIELD_CLASS}>
//                       {kycForm.aadhaarNumber}
//                     </div>
//                   </div>
//                 )}

//                 {kycForm.panCardFile && (
//                   <div className="md:col-span-2">
//                     <label className="block text-xs text-gray-500 mb-2">
//                       PAN Card File
//                     </label>
//                     <div className="flex items-center gap-2 text-sm text-gray-600">
//                       <svg
//                         className="w-4 h-4"
//                         fill="currentColor"
//                         viewBox="0 0 20 20"
//                       >
//                         <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
//                         <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
//                       </svg>
//                       {kycForm.panCardFile.name}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Business Details Section */}
//           <div className="mb-8">
//             <h2 className="text-xl font-semibold text-[#2d2d2d] mb-4">
//               Business Details
//             </h2>
//             <div className={`${REVIEW_CARD_CLASS} relative mb-6`}>
//               <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e5e5e5]">
//                 <h3 className="text-lg font-semibold text-[#2d2d2d]">
//                   Business Details
//                 </h3>
//                 <button type="button" onClick={() => setStep(2)} title="Edit">
//                   <Edit2 size={18} className="text-[#b27a25]" />
//                 </button>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-2">
//                     Business Type
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>
//                     {profileForm.businessType || "-"}
//                   </div>
//                 </div>
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-2">
//                     Business Name
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>
//                     {profileForm.businessName || "-"}
//                   </div>
//                 </div>
//                 <div className="md:col-span-2">
//                   <label className="block text-xs text-gray-500 mb-2">
//                     GST Number
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>
//                     {profileForm.gstNumber || "-"}
//                   </div>
//                 </div>

//                 {profileForm.gstCertificateFile && (
//                   <div className="md:col-span-2">
//                     <label className="block text-xs text-gray-500 mb-2">
//                       GST Certificate
//                     </label>
//                     <div className="flex items-center gap-2 text-sm text-gray-600">
//                       <AiOutlineShoppingCart
//                         size={18}
//                         className="text-[#c99528]"
//                       />
//                       {profileForm.gstCertificateFile.name}
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Bank Details Section */}
//           <div className="mb-8">
//             <h2 className="text-xl font-semibold text-[#2d2d2d] mb-4">
//               Bank Details
//             </h2>
//             <div className={`${REVIEW_CARD_CLASS} relative mb-6`}>
//               <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e5e5e5]">
//                 <h3 className="text-lg font-semibold text-[#2d2d2d]">
//                   Bank Details
//                 </h3>
//                 <button type="button" onClick={() => setStep(3)} title="Edit">
//                   <Edit2 size={18} className="text-[#b27a25]" />
//                 </button>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-2">
//                     Account Holder Name
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>
//                     {bankForm.accountHolderName}
//                   </div>
//                 </div>
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-2">
//                     Bank Name
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>{bankForm.bankName}</div>
//                 </div>
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-2">
//                     Account Number
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>
//                     {bankForm.accountNumber}
//                   </div>
//                 </div>
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-2">
//                     IFSC Code
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>{bankForm.ifscCode}</div>
//                 </div>
//                 <div className="md:col-span-2">
//                   <label className="block text-xs text-gray-500 mb-2">
//                     Branch Name
//                   </label>
//                   <div className={DISPLAY_FIELD_CLASS}>
//                     {bankForm.branchName}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Submission Status or Submit Button */}
//           {flowState?.kycStatus === "rejected" ? (
//             <div className="bg-red-50 border border-red-200 rounded-md p-6 mb-8">
//               <h3 className="text-red-800 font-semibold mb-2">KYC Rejected</h3>
//               <p className="text-red-700 text-sm mb-4">
//                 {flowState?.kycRejectionReason ||
//                   "Your KYC was rejected. Please update details and submit again."}
//               </p>
//               <button
//                 type="button"
//                 className={SECONDARY_BUTTON_CLASS}
//                 onClick={() => setStep(1)}
//               >
//                 Update Details
//               </button>
//             </div>
//           ) : (
//             <div className="bg-blue-50 border border-blue-200 rounded-md p-6 mb-8">
//               <h3 className="text-blue-800 font-semibold mb-2">
//                 Verification In Progress
//               </h3>
//               <p className="text-blue-700 text-sm">
//                 Your verification is in progress. KYC status:{" "}
//                 <strong>
//                   {flowState?.kycStatus === "submitted"
//                     ? "Submitted"
//                     : flowState?.kycStatus === "under_review"
//                     ? "Under Review"
//                     : flowState?.kycStatus || "Under Review"}
//                 </strong>
//                 . We'll notify you once the verification is complete.
//               </p>
//             </div>
//           )}

//           {/* Action Buttons */}
//           <div className="flex justify-end gap-3 pt-6 border-t border-[#e5e5e5]">
//             <button
//               type="button"
//               className={SECONDARY_BUTTON_CLASS}
//               onClick={() => {
//                 dispatch(clearSellerOnboarding());
//                 navigate("/login");
//               }}
//             >
//               Back To Login
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="w-full bg-white min-h-screen flex items-center justify-center p-6">
//       <div className="max-w-4xl w-full">
//         {step === 0 && (
//           <div>
//             <h2 className="text-2xl font-semibold text-[#2d2d2d] mb-4">
//               Mobile/Email Verification Complete
//             </h2>
//             <p className="text-gray-600 mb-6">
//               Next, submit KYC and business details. After that, your account
//               goes under review.
//             </p>
//             <button
//               type="button"
//               className={PRIMARY_BUTTON_CLASS}
//               onClick={() => setStep(1)}
//             >
//               Start KYC Verification
//             </button>
//           </div>
//         )}

//         {step === 1 && (
//           <form onSubmit={submitKycStep} className="w-full">
//             <h2 className="mb-8 text-lg font-semibold text-[#2d2d2d]">
//               KYC Verification
//             </h2>

//             <div className="grid w-full grid-cols-1 gap-x-5 gap-y-6 md:grid-cols-2">
//               {/* Full Name */}
//               <div>
//                 <input
//                   id="legalName"
//                   name="legalName"
//                   placeholder="Full Name*"
//                   className={STEP_ONE_INPUT_CLASS}
//                   value={kycForm.legalName}
//                   onChange={onKycChange}
//                 />
//                 {kycErrors.legalName && (
//                   <p className={ERROR_CLASS}>{kycErrors.legalName}</p>
//                 )}
//               </div>

//               {/* Date of Birth */}
//               <div>
//                 <div className="relative">
//                   <div
//                     className={`${DATE_FIELD_CLASS} pointer-events-none flex items-center justify-between gap-3 ${
//                       kycForm.dateOfBirth ? "text-gray-800" : "text-gray-400"
//                     }`}
//                   >
//                     <span>
//                       {kycForm.dateOfBirth
//                         ? formatDateForDisplay(kycForm.dateOfBirth)
//                         : "Date of Birth*"}
//                     </span>
//                     <FaCalendarAlt className="shrink-0 text-[18px] text-[#c99528]" />
//                   </div>
//                   <input
//                     ref={dateOfBirthRef}
//                     id="dateOfBirth"
//                     name="dateOfBirth"
//                     type="date"
//                     className="absolute inset-0 h-[35px] w-full cursor-pointer opacity-0"
//                     value={kycForm.dateOfBirth}
//                     onChange={onKycChange}
//                     aria-label="Date of Birth"
//                   />
//                 </div>
//                 {kycErrors.dateOfBirth && (
//                   <p className={ERROR_CLASS}>{kycErrors.dateOfBirth}</p>
//                 )}
//               </div>

//               {/* City */}
//               <div>
//                 <div className="relative">
//                   <select
//                     id="city"
//                     name="city"
//                     className={`${STEP_ONE_INPUT_CLASS} appearance-none pr-10`}
//                     value={kycForm.city}
//                     onChange={onKycChange}
//                   >
//                     <option value="">City*</option>
//                     <option value="Ahmedabad">Ahmedabad</option>
//                     <option value="Bengaluru">Bengaluru</option>
//                     <option value="Delhi">Delhi</option>
//                     <option value="Hyderabad">Hyderabad</option>
//                     <option value="Mumbai">Mumbai</option>
//                     <option value="Pune">Pune</option>
//                     <option value="Jaipur">Jaipur</option>
//                     <option value="Kolkata">Kolkata</option>
//                   </select>
//                   <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-[#c99528] text-white">
//                     <ChevronDown size={12} />
//                   </span>
//                 </div>
//                 {kycErrors.city && (
//                   <p className={ERROR_CLASS}>{kycErrors.city}</p>
//                 )}
//               </div>

//               {/* Zip Code */}
//               <div>
//                 <input
//                   id="zipCode"
//                   name="zipCode"
//                   placeholder="Zip Code*"
//                   className={STEP_ONE_INPUT_CLASS}
//                   value={kycForm.zipCode}
//                   onChange={onKycChange}
//                 />
//                 {kycErrors.zipCode && (
//                   <p className={ERROR_CLASS}>{kycErrors.zipCode}</p>
//                 )}
//               </div>

//               {/* PAN Number */}
//               <div className="md:col-span-2">
//                 <input
//                   id="panNumber"
//                   name="panNumber"
//                   placeholder="PAN Number*"
//                   className={STEP_ONE_INPUT_CLASS}
//                   value={kycForm.panNumber}
//                   onChange={onKycChange}
//                   maxLength="10"
//                 />
//                 {kycErrors.panNumber && (
//                   <p className={ERROR_CLASS}>{kycErrors.panNumber}</p>
//                 )}
//               </div>

//               {/* Upload PAN Card */}
//               <div className="md:col-span-2">
//                 <p className="mb-3 text-[13px] text-gray-600">
//                   Upload PAN Card*
//                 </p>
//                 <div
//                   className="min-h-[120px] rounded-md border border-[#e5e5e5] bg-[#f5f1eb] px-4 py-3 flex flex-col items-center justify-center"
//                   onDragOver={(event) => event.preventDefault()}
//                   onDrop={onPanCardDrop}
//                 >
//                   {kycForm.panCardFile ? (
//                     <div className="flex items-center gap-2 text-sm text-gray-700">
//                       <AiOutlineShoppingCart
//                         size={18}
//                         className="text-[#c99528]"
//                       />
//                       {kycForm.panCardFile.name}
//                     </div>
//                   ) : (
//                     <>
//                       <UploadCloud size={20} className="mb-2 text-[#3b3b3b]" />
//                       <p className="text-[13px] text-gray-600 mb-2">
//                         {kycForm.panCardFile?.name || "Drag Your File Here"}
//                       </p>
//                       <p className="text-[11px] text-gray-400 mb-2 uppercase">
//                         OR
//                       </p>
//                       <label
//                         htmlFor="panCardFile"
//                         className="px-4 py-1.5 rounded-full bg-[#d9d9d9] text-gray-600 text-xs font-medium cursor-pointer hover:bg-[#cccccc] transition inline-flex items-center h-[23px]"
//                       >
//                         Browser
//                       </label>
//                     </>
//                   )}
//                   <input
//                     id="panCardFile"
//                     name="panCardFile"
//                     type="file"
//                     className="hidden"
//                     accept=".jpg,.jpeg,.png,.pdf"
//                     onChange={onPanCardFileChange}
//                   />
//                 </div>
//                 {kycErrors.panCardFile && (
//                   <p className={ERROR_CLASS}>{kycErrors.panCardFile}</p>
//                 )}
//               </div>
//             </div>

//             <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
//               <button
//                 className={SECONDARY_BUTTON_CLASS}
//                 type="button"
//                 onClick={() => setStep(0)}
//               >
//                 Back
//               </button>
//               <button
//                 disabled={loading}
//                 className={PRIMARY_BUTTON_CLASS}
//                 type="submit"
//               >
//                 {loading ? "Submitting..." : "Continue"}
//               </button>
//             </div>
//           </form>
//         )}

//         {step === 2 && (
//           <form onSubmit={submitBusinessStep} className="w-full">
//             <h2 className="mb-8 text-2xl font-semibold text-[#2d2d2d]">
//               Business Details
//             </h2>

//             <div className="grid w-full grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
//               <div className="relative">
//                 <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
//                   Business Type {STEP_ONE_REQUIRED}
//                 </label>
//                 <div className="relative">
//                   <select
//                     name="businessType"
//                     className={`${STEP_ONE_INPUT_CLASS} appearance-none pr-10`}
//                     value={profileForm.businessType}
//                     onChange={onProfileChange}
//                   >
//                     <option value="">Select Business Type</option>
//                     <option value="individual">Individual</option>
//                     <option value="proprietorship">Proprietorship</option>
//                     <option value="partnership">Partnership</option>
//                     <option value="private_limited">Private Limited</option>
//                   </select>
//                   <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-[#c99528] text-white">
//                     <ChevronDown size={12} />
//                   </span>
//                 </div>
//                 {profileErrors.businessType && (
//                   <p className={ERROR_CLASS}>{profileErrors.businessType}</p>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
//                   Business Name {STEP_ONE_REQUIRED}
//                 </label>
//                 <input
//                   name="businessName"
//                   placeholder="Business Name"
//                   className={STEP_ONE_INPUT_CLASS}
//                   value={profileForm.businessName}
//                   onChange={onProfileChange}
//                 />
//                 {profileErrors.businessName && (
//                   <p className={ERROR_CLASS}>{profileErrors.businessName}</p>
//                 )}
//               </div>

//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
//                   GST Number {STEP_ONE_REQUIRED}
//                 </label>
//                 <input
//                   name="gstNumber"
//                   placeholder="GST Number"
//                   className={STEP_ONE_INPUT_CLASS}
//                   value={profileForm.gstNumber}
//                   onChange={onProfileChange}
//                 />
//                 {profileErrors.gstNumber && (
//                   <p className={ERROR_CLASS}>{profileErrors.gstNumber}</p>
//                 )}
//               </div>

//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
//                   Upload GST Certificate {STEP_ONE_REQUIRED}
//                 </label>
//                 <div
//                   className="min-h-[122px] rounded-md border border-[#e5e5e5] bg-[#f5f1eb] px-4 py-3 flex flex-col items-center justify-center"
//                   onDragOver={(event) => event.preventDefault()}
//                   onDrop={onGstCertificateDrop}
//                 >
//                   {profileForm.gstCertificateFile ? (
//                     <div className="flex items-center gap-2 text-sm text-gray-700">
//                       <AiOutlineShoppingCart
//                         size={18}
//                         className="text-[#c99528]"
//                       />
//                       {profileForm.gstCertificateFile.name}
//                     </div>
//                   ) : (
//                     <>
//                       <UploadCloud size={24} className="mb-2 text-[#c99528]" />
//                       <p className="text-sm text-gray-600 mb-2">
//                         Drag Your File Here
//                       </p>
//                       <p className="text-xs text-gray-400 mb-2">OR</p>
//                       <label
//                         htmlFor="gstCertificateFile"
//                         className="px-4 py-2 rounded-full bg-[#c99528] text-white text-xs font-medium cursor-pointer hover:bg-[#b27a25] transition"
//                       >
//                         Browse
//                       </label>
//                     </>
//                   )}
//                   <input
//                     id="gstCertificateFile"
//                     name="gstCertificateFile"
//                     type="file"
//                     className="hidden"
//                     accept=".jpg,.jpeg,.png,.pdf"
//                     onChange={onGstCertificateFileChange}
//                   />
//                 </div>
//                 {profileErrors.gstCertificateFile && (
//                   <p className={ERROR_CLASS}>
//                     {profileErrors.gstCertificateFile}
//                   </p>
//                 )}
//               </div>
//             </div>

//             <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
//               <button
//                 className={SECONDARY_BUTTON_CLASS}
//                 type="button"
//                 onClick={() => setStep(1)}
//               >
//                 Back
//               </button>
//               <button
//                 disabled={loading}
//                 className={PRIMARY_BUTTON_CLASS}
//                 type="submit"
//               >
//                 Continue
//               </button>
//             </div>
//           </form>
//         )}

//         {step === 3 && (
//           <form onSubmit={submitBankStep} className="w-full">
//             <h2 className="mb-8 text-2xl font-semibold text-[#2d2d2d]">
//               Bank Details
//             </h2>

//             <div className="grid w-full grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
//               <div>
//                 <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
//                   Account Holder Name {STEP_ONE_REQUIRED}
//                 </label>
//                 <input
//                   name="accountHolderName"
//                   placeholder="Account Holder Name"
//                   className={STEP_ONE_INPUT_CLASS}
//                   value={bankForm.accountHolderName}
//                   onChange={onBankChange}
//                 />
//                 {profileErrors.accountHolderName && (
//                   <p className={ERROR_CLASS}>
//                     {profileErrors.accountHolderName}
//                   </p>
//                 )}
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
//                   Bank Name {STEP_ONE_REQUIRED}
//                 </label>
//                 <input
//                   name="bankName"
//                   placeholder="Bank Name"
//                   className={STEP_ONE_INPUT_CLASS}
//                   value={bankForm.bankName}
//                   onChange={onBankChange}
//                 />
//                 {profileErrors.bankName && (
//                   <p className={ERROR_CLASS}>{profileErrors.bankName}</p>
//                 )}
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
//                   Account Number {STEP_ONE_REQUIRED}
//                 </label>
//                 <input
//                   name="accountNumber"
//                   placeholder="Account Number"
//                   className={STEP_ONE_INPUT_CLASS}
//                   value={bankForm.accountNumber}
//                   onChange={onBankChange}
//                 />
//                 {profileErrors.accountNumber && (
//                   <p className={ERROR_CLASS}>{profileErrors.accountNumber}</p>
//                 )}
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
//                   IFSC Code {STEP_ONE_REQUIRED}
//                 </label>
//                 <input
//                   name="ifscCode"
//                   placeholder="IFSC Code"
//                   className={STEP_ONE_INPUT_CLASS}
//                   value={bankForm.ifscCode}
//                   onChange={onBankChange}
//                 />
//                 {profileErrors.ifscCode && (
//                   <p className={ERROR_CLASS}>{profileErrors.ifscCode}</p>
//                 )}
//               </div>
//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
//                   Branch Name {STEP_ONE_REQUIRED}
//                 </label>
//                 <input
//                   name="branchName"
//                   placeholder="Branch Name"
//                   className={STEP_ONE_INPUT_CLASS}
//                   value={bankForm.branchName}
//                   onChange={onBankChange}
//                 />
//                 {profileErrors.branchName && (
//                   <p className={ERROR_CLASS}>{profileErrors.branchName}</p>
//                 )}
//               </div>
//             </div>

//             <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
//               <button
//                 className={SECONDARY_BUTTON_CLASS}
//                 type="button"
//                 onClick={() => setStep(2)}
//               >
//                 Back
//               </button>
//               <button
//                 disabled={loading}
//                 className={PRIMARY_BUTTON_CLASS}
//                 type="submit"
//               >
//                 Continue
//               </button>
//             </div>
//           </form>
//         )}

//         {step === 4 && (
//           <div className="w-full">
//             <h2 className="mb-8 text-2xl font-semibold text-[#2d2d2d]">
//               Review All Details
//             </h2>

//             <div className="space-y-6">
//               {/* KYC Details */}
//               <div className={REVIEW_CARD_CLASS}>
//                 <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e5e5e5]">
//                   <h3 className="text-lg font-semibold text-[#2d2d2d]">
//                     Personal / Owner Details
//                   </h3>
//                   <button type="button" onClick={() => setStep(1)} title="Edit">
//                     <RiEditBoxFill size={20} className="text-[#CE9F2D]" />
//                   </button>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <p className="text-xs text-gray-500 mb-1">Full Name</p>
//                     <p className="text-sm text-gray-800">{kycForm.legalName}</p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
//                     <p className="text-sm text-gray-800">
//                       {formatDateForDisplay(kycForm.dateOfBirth)}
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-gray-500 mb-1">City</p>
//                     <p className="text-sm text-gray-800">{kycForm.city}</p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-gray-500 mb-1">Zip Code</p>
//                     <p className="text-sm text-gray-800">{kycForm.zipCode}</p>
//                   </div>
//                   <div className="md:col-span-2">
//                     <p className="text-xs text-gray-500 mb-1">PAN Number</p>
//                     <p className="text-sm text-gray-800">{kycForm.panNumber}</p>
//                   </div>
//                   {kycForm.gstNumber && (
//                     <div className="md:col-span-2">
//                       <p className="text-xs text-gray-500 mb-1">GST Number</p>
//                       <p className="text-sm text-gray-800">
//                         {kycForm.gstNumber}
//                       </p>
//                     </div>
//                   )}
//                   {kycForm.panCardFile && (
//                     <div className="md:col-span-2">
//                       <p className="text-xs text-gray-500 mb-1">
//                         PAN Card File
//                       </p>
//                       <div className="flex items-center gap-2 text-sm text-gray-600">
//                         <AiOutlineShoppingCart
//                           size={18}
//                           className="text-[#c99528]"
//                         />
//                         {kycForm.panCardFile.name}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Business Details */}
//               <div className={REVIEW_CARD_CLASS}>
//                 <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e5e5e5]">
//                   <h3 className="text-lg font-semibold text-[#2d2d2d]">
//                     Business Details
//                   </h3>
//                   <button type="button" onClick={() => setStep(2)} title="Edit">
//                     <RiEditBoxFill size={20} className="text-[#CE9F2D]" />
//                   </button>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <p className="text-xs text-gray-500 mb-1">Business Type</p>
//                     <p className="text-sm text-gray-800">
//                       {profileForm.businessType || "-"}
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-gray-500 mb-1">Business Name</p>
//                     <p className="text-sm text-gray-800">
//                       {profileForm.businessName || "-"}
//                     </p>
//                   </div>
//                   <div className="md:col-span-2">
//                     <p className="text-xs text-gray-500 mb-1">GST Number</p>
//                     <p className="text-sm text-gray-800">
//                       {profileForm.gstNumber || "-"}
//                     </p>
//                   </div>
//                   {profileForm.gstCertificateFile && (
//                     <div className="md:col-span-2">
//                       <p className="text-xs text-gray-500 mb-1">
//                         GST Certificate
//                       </p>
//                       <div className="flex items-center gap-2 text-sm text-gray-600">
//                         <AiOutlineShoppingCart
//                           size={18}
//                           className="text-[#c99528]"
//                         />
//                         {profileForm.gstCertificateFile.name}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Bank Details */}
//               <div className={REVIEW_CARD_CLASS}>
//                 <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e5e5e5]">
//                   <h3 className="text-lg font-semibold text-[#2d2d2d]">
//                     Bank Details
//                   </h3>
//                   <button type="button" onClick={() => setStep(3)} title="Edit">
//                     <RiEditBoxFill size={20} className="text-[#CE9F2D]" />
//                   </button>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <p className="text-xs text-gray-500 mb-1">Account Holder</p>
//                     <p className="text-sm text-gray-800">
//                       {bankForm.accountHolderName}
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-gray-500 mb-1">Bank Name</p>
//                     <p className="text-sm text-gray-800">{bankForm.bankName}</p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-gray-500 mb-1">Account Number</p>
//                     <p className="text-sm text-gray-800">
//                       {bankForm.accountNumber}
//                     </p>
//                   </div>
//                   <div>
//                     <p className="text-xs text-gray-500 mb-1">IFSC Code</p>
//                     <p className="text-sm text-gray-800">{bankForm.ifscCode}</p>
//                   </div>
//                   <div className="md:col-span-2">
//                     <p className="text-xs text-gray-500 mb-1">Branch Name</p>
//                     <p className="text-sm text-gray-800">
//                       {bankForm.branchName}
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end border-t border-[#e5e5e5] pt-6">
//               <button
//                 className={SECONDARY_BUTTON_CLASS}
//                 type="button"
//                 onClick={() => setStep(3)}
//               >
//                 Back
//               </button>
//               <button
//                 disabled={loading}
//                 className={PRIMARY_BUTTON_CLASS}
//                 type="button"
//                 onClick={submitFinalOnboarding}
//               >
//                 {loading ? "Submitting..." : "Submit For Verification"}
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default SellerOnboarding;
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, UploadCloud } from "lucide-react";
import { FaCalendarAlt } from "react-icons/fa";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { RiEditBoxFill } from "react-icons/ri";
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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/i;

const ERROR_CLASS = "mt-1 text-xs text-red-600";
const STEP_ONE_INPUT_CLASS =
  "h-[35px] w-full rounded-md border border-[#e5e5e5] bg-[#f5f1eb] px-4 text-[13px] text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-amber-600 focus:ring-2 focus:ring-amber-100";
const DATE_FIELD_CLASS =
  "h-[35px] w-full rounded-md border border-[#e5e5e5] bg-[#f5f1eb] pl-4 pr-3 text-[13px] outline-none transition hover:border-[#d8d8d8] focus:border-[#c99528] focus:ring-2 focus:ring-amber-100";
const STEP_ONE_REQUIRED = <span className="text-[#c99528]">*</span>;
const SECONDARY_BUTTON_CLASS =
  "h-8 min-w-[106px] rounded-full bg-[#e5e5e5] px-7 text-sm font-semibold text-gray-600 transition hover:bg-[#d2d2d2] flex items-center justify-center leading-none";
const PRIMARY_BUTTON_CLASS =
  "h-8 min-w-[120px] rounded-full bg-[#b27a25] px-7 text-sm font-semibold text-white transition hover:bg-[#9f6c1f] disabled:cursor-not-allowed disabled:bg-[#d6b678] flex items-center justify-center leading-none";
const REVIEW_CARD_CLASS =
  "rounded-md border border-[#e5e5e5] bg-[#faf8f6] px-6 py-4";
// const DISPLAY_FIELD_CLASS =
//   "h-[35px] w-full rounded-md border border-[#e5e5e5] bg-[#f5f1eb] px-4 text-[13px] text-gray-800 flex items-center";

const parseApiError = (error, fallbackMessage) => {
  if (!error) return { message: fallbackMessage, details: [] };
  if (typeof error === "string") return { message: error, details: [] };
  return {
    message: error.message || fallbackMessage,
    details: Array.isArray(error.details) ? error.details : [],
  };
};

const formatDateForDisplay = (value) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const SellerOnboarding = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { setStep, step } = useKYC();
  const { seller } = useSelector((state) => state);
  const onboardingToken =
    seller?.onboardingToken || localStorage.getItem("sellerOnboardingToken");
  const loading = seller?.loading;
  const flowState = seller?.flowState;

  const [kycSubmittedApi, setKycSubmittedApi] = useState(false);
  const [kycErrors, setKycErrors] = useState({});
  const [profileErrors, setProfileErrors] = useState({});
  const dateOfBirthRef = useRef(null);

  const [kycForm, setKycForm] = useState({
    panNumber: "",
    gstNumber: "",
    aadhaarNumber: "",
    legalName: "",
    businessType: "individual",
    dateOfBirth: "",
  });

  const [profileForm, setProfileForm] = useState({
    businessType: "",
    businessName: "",
    gstNumber: "",
    gstCertificateFile: null,
    displayName: "",
    legalBusinessName: "",
    supportEmail: "",
    supportPhone: "",
    description: "",
    businessWebsite: "",
    registrationNumber: "",
    primaryContactName: "",
    businessAddressLine1: "",
    businessAddressLine2: "",
    businessAddressCity: "",
    businessAddressState: "",
    businessAddressCountry: "India",
    businessAddressPostalCode: "",
    pickupLine1: "",
    pickupLine2: "",
    pickupCity: "",
    pickupState: "",
    pickupCountry: "India",
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

    if (
      flowState?.accountStatus === "active" &&
      !flowState?.requiresOnboarding
    ) {
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
      name === "panNumber" || name === "gstNumber"
        ? value.toUpperCase()
        : value;
    setKycForm((prev) => ({ ...prev, [name]: normalized }));
    setKycErrors((prev) => ({ ...prev, [name]: null }));
  };

  const onGstCertificateFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setProfileForm((prev) => ({ ...prev, gstCertificateFile: file }));
    setProfileErrors((prev) => ({ ...prev, gstCertificateFile: null }));
  };

  const onGstCertificateDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] || null;
    if (!file) return;
    setProfileForm((prev) => ({ ...prev, gstCertificateFile: file }));
    setProfileErrors((prev) => ({ ...prev, gstCertificateFile: null }));
  };

  const onProfileChange = (event) => {
    const { name, value } = event.target;
    const upperCaseFields = [
      "gstNumber",
      "pickupPostalCode",
      "businessAddressPostalCode",
    ];
    const normalized = upperCaseFields.includes(name)
      ? value.toUpperCase()
      : value;
    setProfileForm((prev) => ({ ...prev, [name]: normalized }));
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
    if (!kycForm.dateOfBirth.trim())
      errors.dateOfBirth = "Date of birth is required";
    if (!kycForm.businessType.trim())
      errors.businessType = "Business type is required";
    if (!PAN_REGEX.test(kycForm.panNumber.trim()))
      errors.panNumber = "PAN format should be like ABCDE1234F";
    if (kycForm.gstNumber.trim() && !GST_REGEX.test(kycForm.gstNumber.trim())) {
      errors.gstNumber = "GST format is invalid";
    }
    if (
      kycForm.aadhaarNumber.trim() &&
      !AADHAAR_REGEX.test(kycForm.aadhaarNumber.trim())
    ) {
      errors.aadhaarNumber = "Aadhaar must be 12 digits";
    }
    setKycErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateProfile = () => {
    const errors = {};
    if (!profileForm.businessType.trim())
      errors.businessType = "Business type is required";
    if (!profileForm.businessName.trim())
      errors.businessName = "Business name is required";
    if (!GST_REGEX.test(profileForm.gstNumber.trim()))
      errors.gstNumber = "GST format is invalid";
    if (!profileForm.gstCertificateFile)
      errors.gstCertificateFile = "GST certificate is required";
    if (!profileForm.supportEmail.trim())
      errors.supportEmail = "Support email is required";
    else if (!EMAIL_REGEX.test(profileForm.supportEmail.trim()))
      errors.supportEmail = "Support email is invalid";
    if (!profileForm.supportPhone.trim())
      errors.supportPhone = "Support phone is required";
    else if (
      profileForm.supportPhone.trim().length < 10 ||
      profileForm.supportPhone.trim().length > 15
    )
      errors.supportPhone = "Support phone must be 10 to 15 digits";
    if (
      profileForm.businessWebsite.trim() &&
      !URL_REGEX.test(profileForm.businessWebsite.trim())
    )
      errors.businessWebsite = "Website must start with http:// or https://";
    if (!profileForm.pickupLine1.trim())
      errors.pickupLine1 = "Pickup address line 1 is required";
    if (!profileForm.pickupCity.trim())
      errors.pickupCity = "Pickup city is required";
    if (!profileForm.pickupState.trim())
      errors.pickupState = "Pickup state is required";
    if (!profileForm.pickupPostalCode.trim())
      errors.pickupPostalCode = "Pickup postal code is required";
    else if (
      profileForm.pickupPostalCode.trim().length < 5 ||
      profileForm.pickupPostalCode.trim().length > 10
    )
      errors.pickupPostalCode = "Pickup postal code must be 5 to 10 characters";
    if (
      profileForm.businessAddressPostalCode.trim() &&
      (profileForm.businessAddressPostalCode.trim().length < 5 ||
        profileForm.businessAddressPostalCode.trim().length > 10)
    )
      errors.businessAddressPostalCode =
        "Business postal code must be 5 to 10 characters";
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitKycStep = async (event) => {
    event.preventDefault();
    if (!validateKyc()) return;
    try {
      const kycPayload = {
        panNumber: kycForm.panNumber.trim(),
        gstNumber: kycForm.gstNumber.trim(),
        aadhaarNumber: kycForm.aadhaarNumber.trim(),
        legalName: kycForm.legalName.trim(),
        businessType: kycForm.businessType,
        dateOfBirth: kycForm.dateOfBirth,
      };
      await dispatch(submitSellerKyc(kycPayload)).unwrap();
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
    if (!bankForm.accountHolderName.trim())
      errors.accountHolderName = "Account holder name is required";
    if (!bankForm.accountNumber.trim())
      errors.accountNumber = "Account number is required";
    if (!bankForm.ifscCode.trim()) errors.ifscCode = "IFSC code is required";
    if (!bankForm.bankName.trim()) errors.bankName = "Bank name is required";
    if (!bankForm.branchName.trim())
      errors.branchName = "Branch name is required";
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
        const kycPayload = {
          panNumber: kycForm.panNumber.trim(),
          gstNumber: kycForm.gstNumber.trim(),
          aadhaarNumber: kycForm.aadhaarNumber.trim(),
          legalName: kycForm.legalName.trim(),
          businessType: kycForm.businessType,
          dateOfBirth: kycForm.dateOfBirth,
        };
        await dispatch(submitSellerKyc(kycPayload)).unwrap();
      }
      const payload = {
        displayName: profileForm.displayName || profileForm.businessName,
        legalBusinessName:
          profileForm.legalBusinessName || profileForm.businessName,
        description: profileForm.description,
        supportEmail: profileForm.supportEmail,
        supportPhone: profileForm.supportPhone,
        businessType: profileForm.businessType,
        registrationNumber: profileForm.registrationNumber,
        gstNumber: profileForm.gstNumber,
        panNumber: kycForm.panNumber,
        aadhaarNumber: kycForm.aadhaarNumber,
        dateOfBirth: kycForm.dateOfBirth,
        businessWebsite: profileForm.businessWebsite,
        primaryContactName: profileForm.primaryContactName || kycForm.legalName,
        businessAddress: {
          line1: profileForm.businessAddressLine1,
          line2: profileForm.businessAddressLine2,
          city: profileForm.businessAddressCity,
          state: profileForm.businessAddressState,
          country: profileForm.businessAddressCountry || "India",
          postalCode: profileForm.businessAddressPostalCode,
        },
        pickupAddress: {
          line1: profileForm.pickupLine1,
          line2: profileForm.pickupLine2,
          city: profileForm.pickupCity,
          state: profileForm.pickupState,
          country: profileForm.pickupCountry || "India",
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
      const detailKeys = (parsed.details || []).map(
        (d) => d?.path?.[d?.path?.length - 1]
      );
      const isKycError = detailKeys.some((key) =>
        ["panNumber", "gstNumber", "aadhaarNumber", "legalName"].includes(key)
      );
      setBackendFieldErrors(
        parsed.details,
        isKycError ? setKycErrors : setProfileErrors
      );
      toast.error(parsed.message);
    }
  };

  if (step === 5) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center  px-4">
        <div className="w-full max-w-lg text-center p-8">
          <h2 className="text-2xl font-semibold mb-2">
            {flowState?.kycStatus === "rejected"
              ? "KYC Rejected"
              : "Verification In Progress"}
          </h2>

          {flowState?.kycStatus === "rejected" ? (
            <p className="text-gray-600 mb-6">
              {flowState?.kycRejectionReason ||
                "Your KYC was rejected. Please update details and submit again."}
            </p>
          ) : (
            <p className="text-gray-600 mb-6">
              Your verification is in progress. KYC status:{" "}
              {flowState?.kycStatus || "under_review"}.
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
    <div className="w-full bg-white min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-[#2d2d2d] mb-4">
              Mobile/Email Verification Complete
            </h2>
            <p className="text-gray-600 mb-6">
              Next, submit KYC and business details. After that, your account
              goes under review.
            </p>
            <button
              type="button"
              className={PRIMARY_BUTTON_CLASS}
              onClick={() => setStep(1)}
            >
              Start KYC Verification
            </button>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={submitKycStep} className="w-full">
            <h2 className="mb-8 text-lg font-semibold text-[#2d2d2d]">
              KYC Verification
            </h2>

            <div className="grid w-full grid-cols-1 gap-x-5 gap-y-6 md:grid-cols-2">
              {/* Full Name */}
              <div>
                <input
                  id="legalName"
                  name="legalName"
                  placeholder="Full Name*"
                  className={STEP_ONE_INPUT_CLASS}
                  value={kycForm.legalName}
                  onChange={onKycChange}
                />
                {kycErrors.legalName && (
                  <p className={ERROR_CLASS}>{kycErrors.legalName}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <div className="relative">
                  <div
                    className={`${DATE_FIELD_CLASS} pointer-events-none flex items-center justify-between gap-3 ${
                      kycForm.dateOfBirth ? "text-gray-800" : "text-gray-400"
                    }`}
                  >
                    <span>
                      {kycForm.dateOfBirth
                        ? formatDateForDisplay(kycForm.dateOfBirth)
                        : "Date of Birth*"}
                    </span>
                    <FaCalendarAlt className="shrink-0 text-[18px] text-[#c99528]" />
                  </div>
                  <input
                    ref={dateOfBirthRef}
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    className="absolute inset-0 h-[35px] w-full cursor-pointer opacity-0"
                    value={kycForm.dateOfBirth}
                    onChange={onKycChange}
                    aria-label="Date of Birth"
                  />
                </div>
                {kycErrors.dateOfBirth && (
                  <p className={ERROR_CLASS}>{kycErrors.dateOfBirth}</p>
                )}
              </div>

              {/* Business Type */}
              <div>
                <div className="relative">
                  <select
                    id="businessType"
                    name="businessType"
                    className={`${STEP_ONE_INPUT_CLASS} appearance-none pr-10`}
                    value={kycForm.businessType}
                    onChange={onKycChange}
                  >
                    <option value="">Business Type*</option>
                    <option value="individual">Individual</option>
                    <option value="proprietorship">Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="private_limited">Private Limited</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-[#c99528] text-white">
                    <ChevronDown size={12} />
                  </span>
                </div>
                {kycErrors.businessType && (
                  <p className={ERROR_CLASS}>{kycErrors.businessType}</p>
                )}
              </div>

              {/* GST Number */}
              <div>
                <input
                  id="gstNumber"
                  name="gstNumber"
                  placeholder="GST Number"
                  className={STEP_ONE_INPUT_CLASS}
                  value={kycForm.gstNumber}
                  onChange={onKycChange}
                />
                {kycErrors.gstNumber && (
                  <p className={ERROR_CLASS}>{kycErrors.gstNumber}</p>
                )}
              </div>

              {/* PAN Number */}
              <div className="md:col-span-2">
                <input
                  id="panNumber"
                  name="panNumber"
                  placeholder="PAN Number*"
                  className={STEP_ONE_INPUT_CLASS}
                  value={kycForm.panNumber}
                  onChange={onKycChange}
                  maxLength="10"
                />
                {kycErrors.panNumber && (
                  <p className={ERROR_CLASS}>{kycErrors.panNumber}</p>
                )}
              </div>

              {/* Aadhaar Number */}
              <div className="md:col-span-2">
                <input
                  id="aadhaarNumber"
                  name="aadhaarNumber"
                  placeholder="Aadhaar Number"
                  className={STEP_ONE_INPUT_CLASS}
                  value={kycForm.aadhaarNumber}
                  onChange={onKycChange}
                  maxLength="12"
                />
                {kycErrors.aadhaarNumber && (
                  <p className={ERROR_CLASS}>{kycErrors.aadhaarNumber}</p>
                )}
              </div>
            </div>

            <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className={SECONDARY_BUTTON_CLASS}
                type="button"
                onClick={() => setStep(0)}
              >
                Back
              </button>
              <button
                disabled={loading}
                className={PRIMARY_BUTTON_CLASS}
                type="submit"
              >
                {loading ? "Submitting..." : "Continue"}
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitBusinessStep} className="w-full">
            <h2 className="mb-8 text-2xl font-semibold text-[#2d2d2d]">
              Business Details
            </h2>

            <div className="grid w-full grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <div className="relative">
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Business Type {STEP_ONE_REQUIRED}
                </label>
                <div className="relative">
                  <select
                    name="businessType"
                    className={`${STEP_ONE_INPUT_CLASS} appearance-none pr-10`}
                    value={profileForm.businessType}
                    onChange={onProfileChange}
                  >
                    <option value="">Select Business Type</option>
                    <option value="individual">Individual</option>
                    <option value="proprietorship">Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="private_limited">Private Limited</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-[#c99528] text-white">
                    <ChevronDown size={12} />
                  </span>
                </div>
                {profileErrors.businessType && (
                  <p className={ERROR_CLASS}>{profileErrors.businessType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Business Name {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="businessName"
                  placeholder="Business Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessName}
                  onChange={onProfileChange}
                />
                {profileErrors.businessName && (
                  <p className={ERROR_CLASS}>{profileErrors.businessName}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  GST Number {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="gstNumber"
                  placeholder="GST Number"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.gstNumber}
                  onChange={onProfileChange}
                />
                {profileErrors.gstNumber && (
                  <p className={ERROR_CLASS}>{profileErrors.gstNumber}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Upload GST Certificate {STEP_ONE_REQUIRED}
                </label>
                <div
                  className="min-h-[122px] rounded-md border border-[#e5e5e5] bg-[#f5f1eb] px-4 py-3 flex flex-col items-center justify-center"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={onGstCertificateDrop}
                >
                  {profileForm.gstCertificateFile ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <AiOutlineShoppingCart
                        size={18}
                        className="text-[#c99528]"
                      />
                      {profileForm.gstCertificateFile.name}
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={24} className="mb-2 text-[#c99528]" />
                      <p className="text-sm text-gray-600 mb-2">
                        Drag Your File Here
                      </p>
                      <p className="text-xs text-gray-400 mb-2">OR</p>
                      <label
                        htmlFor="gstCertificateFile"
                        className="px-4 py-2 rounded-full bg-[#c99528] text-white text-xs font-medium cursor-pointer hover:bg-[#b27a25] transition"
                      >
                        Browse
                      </label>
                    </>
                  )}
                  <input
                    id="gstCertificateFile"
                    name="gstCertificateFile"
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={onGstCertificateFileChange}
                  />
                </div>
                {profileErrors.gstCertificateFile && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.gstCertificateFile}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Support Email {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="supportEmail"
                  placeholder="Support Email"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.supportEmail}
                  onChange={onProfileChange}
                />
                {profileErrors.supportEmail && (
                  <p className={ERROR_CLASS}>{profileErrors.supportEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Support Phone {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="supportPhone"
                  placeholder="Support Phone"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.supportPhone}
                  onChange={onProfileChange}
                />
                {profileErrors.supportPhone && (
                  <p className={ERROR_CLASS}>{profileErrors.supportPhone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Display Name
                </label>
                <input
                  name="displayName"
                  placeholder="Display Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.displayName}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Legal Business Name
                </label>
                <input
                  name="legalBusinessName"
                  placeholder="Legal Business Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.legalBusinessName}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Registration Number
                </label>
                <input
                  name="registrationNumber"
                  placeholder="Registration Number"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.registrationNumber}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Primary Contact Name
                </label>
                <input
                  name="primaryContactName"
                  placeholder="Primary Contact Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.primaryContactName}
                  onChange={onProfileChange}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Business Website
                </label>
                <input
                  name="businessWebsite"
                  placeholder="https://example.com"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessWebsite}
                  onChange={onProfileChange}
                />
                {profileErrors.businessWebsite && (
                  <p className={ERROR_CLASS}>{profileErrors.businessWebsite}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Description
                </label>
                <input
                  name="description"
                  placeholder="Business Description"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.description}
                  onChange={onProfileChange}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Pickup Address Line 1 {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="pickupLine1"
                  placeholder="Pickup Address Line 1"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.pickupLine1}
                  onChange={onProfileChange}
                />
                {profileErrors.pickupLine1 && (
                  <p className={ERROR_CLASS}>{profileErrors.pickupLine1}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Pickup Address Line 2
                </label>
                <input
                  name="pickupLine2"
                  placeholder="Pickup Address Line 2"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.pickupLine2}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Pickup City {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="pickupCity"
                  placeholder="Pickup City"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.pickupCity}
                  onChange={onProfileChange}
                />
                {profileErrors.pickupCity && (
                  <p className={ERROR_CLASS}>{profileErrors.pickupCity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Pickup State {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="pickupState"
                  placeholder="Pickup State"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.pickupState}
                  onChange={onProfileChange}
                />
                {profileErrors.pickupState && (
                  <p className={ERROR_CLASS}>{profileErrors.pickupState}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Pickup Country
                </label>
                <input
                  name="pickupCountry"
                  placeholder="Pickup Country"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.pickupCountry}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Pickup Postal Code {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="pickupPostalCode"
                  placeholder="Pickup Postal Code"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.pickupPostalCode}
                  onChange={onProfileChange}
                />
                {profileErrors.pickupPostalCode && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.pickupPostalCode}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Business Address Line 1
                </label>
                <input
                  name="businessAddressLine1"
                  placeholder="Business Address Line 1"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessAddressLine1}
                  onChange={onProfileChange}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Business Address Line 2
                </label>
                <input
                  name="businessAddressLine2"
                  placeholder="Business Address Line 2"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessAddressLine2}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Business City
                </label>
                <input
                  name="businessAddressCity"
                  placeholder="Business City"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessAddressCity}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Business State
                </label>
                <input
                  name="businessAddressState"
                  placeholder="Business State"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessAddressState}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Business Country
                </label>
                <input
                  name="businessAddressCountry"
                  placeholder="Business Country"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessAddressCountry}
                  onChange={onProfileChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Business Postal Code
                </label>
                <input
                  name="businessAddressPostalCode"
                  placeholder="Business Postal Code"
                  className={STEP_ONE_INPUT_CLASS}
                  value={profileForm.businessAddressPostalCode}
                  onChange={onProfileChange}
                />
                {profileErrors.businessAddressPostalCode && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.businessAddressPostalCode}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className={SECONDARY_BUTTON_CLASS}
                type="button"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                disabled={loading}
                className={PRIMARY_BUTTON_CLASS}
                type="submit"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={submitBankStep} className="w-full">
            <h2 className="mb-8 text-2xl font-semibold text-[#2d2d2d]">
              Bank Details
            </h2>

            <div className="grid w-full grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Account Holder Name {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="accountHolderName"
                  placeholder="Account Holder Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={bankForm.accountHolderName}
                  onChange={onBankChange}
                />
                {profileErrors.accountHolderName && (
                  <p className={ERROR_CLASS}>
                    {profileErrors.accountHolderName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Bank Name {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="bankName"
                  placeholder="Bank Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={bankForm.bankName}
                  onChange={onBankChange}
                />
                {profileErrors.bankName && (
                  <p className={ERROR_CLASS}>{profileErrors.bankName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Account Number {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="accountNumber"
                  placeholder="Account Number"
                  className={STEP_ONE_INPUT_CLASS}
                  value={bankForm.accountNumber}
                  onChange={onBankChange}
                />
                {profileErrors.accountNumber && (
                  <p className={ERROR_CLASS}>{profileErrors.accountNumber}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  IFSC Code {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="ifscCode"
                  placeholder="IFSC Code"
                  className={STEP_ONE_INPUT_CLASS}
                  value={bankForm.ifscCode}
                  onChange={onBankChange}
                />
                {profileErrors.ifscCode && (
                  <p className={ERROR_CLASS}>{profileErrors.ifscCode}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">
                  Branch Name {STEP_ONE_REQUIRED}
                </label>
                <input
                  name="branchName"
                  placeholder="Branch Name"
                  className={STEP_ONE_INPUT_CLASS}
                  value={bankForm.branchName}
                  onChange={onBankChange}
                />
                {profileErrors.branchName && (
                  <p className={ERROR_CLASS}>{profileErrors.branchName}</p>
                )}
              </div>
            </div>

            <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className={SECONDARY_BUTTON_CLASS}
                type="button"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                disabled={loading}
                className={PRIMARY_BUTTON_CLASS}
                type="submit"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="w-full">
            <h2 className="mb-8 text-2xl font-semibold text-[#2d2d2d]">
              Review All Details
            </h2>

            <div className="space-y-6">
              {/* KYC Details */}
              <div className={REVIEW_CARD_CLASS}>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e5e5e5]">
                  <h3 className="text-lg font-semibold text-[#2d2d2d]">
                    Personal / Owner Details
                  </h3>
                  <button type="button" onClick={() => setStep(1)} title="Edit">
                    <RiEditBoxFill size={20} className="text-[#CE9F2D]" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Full Name</p>
                    <p className="text-sm text-gray-800">{kycForm.legalName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
                    <p className="text-sm text-gray-800">
                      {formatDateForDisplay(kycForm.dateOfBirth)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Business Type</p>
                    <p className="text-sm text-gray-800">{kycForm.businessType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Aadhaar Number</p>
                    <p className="text-sm text-gray-800">
                      {kycForm.aadhaarNumber || "-"}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">PAN Number</p>
                    <p className="text-sm text-gray-800">{kycForm.panNumber}</p>
                  </div>
                  {kycForm.gstNumber && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-500 mb-1">GST Number</p>
                      <p className="text-sm text-gray-800">
                        {kycForm.gstNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Details */}
              <div className={REVIEW_CARD_CLASS}>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e5e5e5]">
                  <h3 className="text-lg font-semibold text-[#2d2d2d]">
                    Business Details
                  </h3>
                  <button type="button" onClick={() => setStep(2)} title="Edit">
                    <RiEditBoxFill size={20} className="text-[#CE9F2D]" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Business Type</p>
                    <p className="text-sm text-gray-800">
                      {profileForm.businessType || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Business Name</p>
                    <p className="text-sm text-gray-800">
                      {profileForm.businessName || "-"}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">GST Number</p>
                    <p className="text-sm text-gray-800">
                      {profileForm.gstNumber || "-"}
                    </p>
                  </div>
                  {profileForm.gstCertificateFile && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-500 mb-1">
                        GST Certificate
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <AiOutlineShoppingCart
                          size={18}
                          className="text-[#c99528]"
                        />
                        {profileForm.gstCertificateFile.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank Details */}
              <div className={REVIEW_CARD_CLASS}>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e5e5e5]">
                  <h3 className="text-lg font-semibold text-[#2d2d2d]">
                    Bank Details
                  </h3>
                  <button type="button" onClick={() => setStep(3)} title="Edit">
                    <RiEditBoxFill size={20} className="text-[#CE9F2D]" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Account Holder</p>
                    <p className="text-sm text-gray-800">
                      {bankForm.accountHolderName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Bank Name</p>
                    <p className="text-sm text-gray-800">{bankForm.bankName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Account Number</p>
                    <p className="text-sm text-gray-800">
                      {bankForm.accountNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">IFSC Code</p>
                    <p className="text-sm text-gray-800">{bankForm.ifscCode}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Branch Name</p>
                    <p className="text-sm text-gray-800">
                      {bankForm.branchName}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end border-t border-[#e5e5e5] pt-6">
              <button
                className={SECONDARY_BUTTON_CLASS}
                type="button"
                onClick={() => setStep(3)}
              >
                Back
              </button>
              <button
                disabled={loading}
                className={PRIMARY_BUTTON_CLASS}
                type="button"
                onClick={submitFinalOnboarding}
              >
                {loading ? "Submitting..." : "Submit For Verification"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerOnboarding;
