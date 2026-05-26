import React from "react";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

// Determines which of the 8 verification cases applies based on flowState
export const getVerificationCase = (flowState) => {
  if (!flowState) return null;

  const kycStatus = flowState.kycStatus || "not_started";
  const bankStatus =
    flowState.bankStatus ||
    flowState.bankVerificationStatus ||
    flowState.sellerProfile?.bankVerificationStatus ||
    "not_started";

  const approvalModalSeen =
    flowState.approvalModalSeen ||
    localStorage.getItem("sellerApprovalModalSeen") === "true";

  const kycRejected =
    kycStatus === "rejected" || kycStatus === "resubmit_required";
  const bankRejected =
    bankStatus === "rejected" || bankStatus === "resubmit_required";
  const kycApproved =
    kycStatus === "approved" || kycStatus === "verified";
  const bankApproved =
    bankStatus === "approved" || bankStatus === "verified";
  const kycPending = ["pending", "submitted", "under_review"].includes(kycStatus);
  const bankPending = ["pending", "submitted", "under_review"].includes(bankStatus);

  const isFullyApproved =
    kycApproved &&
    bankApproved &&
    (flowState.accountStatus === "active" || flowState.overallStatus === "approved");

  if (isFullyApproved && approvalModalSeen) return "already_approved";
  if (isFullyApproved) return "both_approved";
  if (kycRejected && bankRejected) return "both_rejected";
  if (kycRejected) return "kyc_rejected";
  if (bankRejected) return "bank_rejected";
  if (kycApproved && bankPending) return "kyc_approved_bank_pending";
  if (bankApproved && kycPending) return "bank_approved_kyc_pending";
  return "pending";
};

const ICON_CONFIG = {
  rejected: { bg: "bg-red-100", color: "text-red-600", Icon: XCircle },
  approved: { bg: "bg-green-100", color: "text-green-600", Icon: CheckCircle2 },
  pending: { bg: "bg-yellow-100", color: "text-yellow-600", Icon: Clock },
  warning: { bg: "bg-orange-100", color: "text-orange-600", Icon: AlertTriangle },
};

const StatusIcon = ({ type }) => {
  const { bg, color, Icon } = ICON_CONFIG[type] || ICON_CONFIG.pending;
  return (
    <div
      className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${bg}`}
    >
      <Icon className={`h-8 w-8 ${color}`} />
    </div>
  );
};

const RejectionBox = ({ label, reason }) => (
  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left">
    {label && (
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-red-700">
        {label}
      </p>
    )}
    <p className="text-[14px] leading-relaxed text-red-700">{reason}</p>
  </div>
);

const ActionButton = ({ label, onClick, disabled, variant = "primary" }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`h-[46px] w-full rounded-[8px] px-6 font-inter text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
      variant === "primary"
        ? "bg-[#082f91] text-white shadow-[0_4px_12px_rgba(8,47,145,0.24)] hover:bg-[#062779]"
        : "border border-[#082f91] bg-white text-[#082f91] hover:bg-[#eef2ff]"
    }`}
  >
    {label}
  </button>
);

/**
 * SellerVerificationModal
 *
 * Shows the appropriate status modal overlay based on KYC/bank verification state.
 * Handles all 8 cases:
 *   1. kyc_rejected       – KYC rejected by admin
 *   2. bank_rejected      – Bank details rejected by admin
 *   3. both_rejected      – Both KYC and bank rejected
 *   4. pending            – Both/one under review
 *   5. kyc_approved_bank_pending – KYC approved, bank still pending
 *   6. bank_approved_kyc_pending – Bank approved, KYC still pending
 *   7. both_approved      – Fully approved, first visit (show approval modal)
 *   8. already_approved   – Fully approved, modal already seen (caller should redirect)
 *
 * Returns null for cases 8 and unknown.
 */
const SellerVerificationModal = ({
  flowState,
  onNavigateToKyc,
  onNavigateToBank,
  onGoToDashboard,
  onDismiss,
  loading = false,
}) => {
  const verificationCase = getVerificationCase(flowState);

  if (!verificationCase || verificationCase === "already_approved") {
    return null;
  }

  const kycRejectionReason =
    flowState?.kycRejectionReason ||
    flowState?.sellerProfile?.kycRejectionReason ||
    "";
  const bankRejectionReason =
    flowState?.bankRejectionReason ||
    flowState?.sellerProfile?.bankRejectionReason ||
    "";

  const MODAL_CONTENT = {
    kyc_rejected: {
      iconType: "rejected",
      title: "KYC Verification Rejected",
      message:
        "Your KYC verification was rejected. Please review the reason below and update your KYC details.",
      rejections: kycRejectionReason
        ? [{ label: "Rejection Reason", reason: kycRejectionReason }]
        : [],
      buttons: [
        { label: "Update KYC Details", onClick: onNavigateToKyc, variant: "primary" },
      ],
    },
    bank_rejected: {
      iconType: "rejected",
      title: "Bank Verification Rejected",
      message:
        "Your bank details were rejected. Please review the reason below and update your bank information.",
      rejections: bankRejectionReason
        ? [{ label: "Rejection Reason", reason: bankRejectionReason }]
        : [],
      buttons: [
        { label: "Update Bank Details", onClick: onNavigateToBank, variant: "primary" },
      ],
    },
    both_rejected: {
      iconType: "warning",
      title: "Verification Requires Updates",
      message:
        "Your KYC and bank details need correction before your seller account can be approved.",
      rejections: [
        kycRejectionReason && { label: "KYC Rejection Reason", reason: kycRejectionReason },
        bankRejectionReason && { label: "Bank Rejection Reason", reason: bankRejectionReason },
      ].filter(Boolean),
      buttons: [
        { label: "Update KYC", onClick: onNavigateToKyc, variant: "secondary" },
        { label: "Update Bank Details", onClick: onNavigateToBank, variant: "primary" },
      ],
    },
    pending: {
      iconType: "pending",
      title: "Verification Under Review",
      message:
        "Your submitted details are under review. You will be notified once the verification is completed.",
      rejections: [],
      buttons: [{ label: "Okay", onClick: onDismiss, variant: "primary" }],
    },
    kyc_approved_bank_pending: {
      iconType: "pending",
      title: "Bank Verification Pending",
      message:
        "Your KYC is approved, but your bank verification is still under review.",
      rejections: [],
      buttons: [{ label: "Okay", onClick: onDismiss, variant: "primary" }],
    },
    bank_approved_kyc_pending: {
      iconType: "pending",
      title: "KYC Verification Pending",
      message:
        "Your bank details are approved, but your KYC verification is still under review.",
      rejections: [],
      buttons: [{ label: "Okay", onClick: onDismiss, variant: "primary" }],
    },
    both_approved: {
      iconType: "approved",
      title: "Application Approved",
      message:
        "Congratulations! Your seller application has been approved. You can now access your seller dashboard and start managing your store.",
      rejections: [],
      buttons: [
        {
          label: loading ? "Please wait..." : "Go to Dashboard",
          onClick: onGoToDashboard,
          variant: "primary",
        },
      ],
    },
  };

  const content = MODAL_CONTENT[verificationCase];
  if (!content) return null;

  const isPendingCase = ["pending", "kyc_approved_bank_pending", "bank_approved_kyc_pending"].includes(
    verificationCase
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
      <div className="w-full max-w-[520px] rounded-2xl bg-white p-8 shadow-2xl">
        <StatusIcon type={content.iconType} />

        <h2 className="mb-3 text-center font-inter text-[22px] font-extrabold leading-snug text-[#082f91]">
          {content.title}
        </h2>

        <p className="text-center font-inter text-[15px] leading-relaxed text-[#484555]">
          {content.message}
        </p>

        {content.rejections.map((item, index) => (
          <RejectionBox key={index} label={item.label} reason={item.reason} />
        ))}

        <div
          className={`mt-7 flex flex-col gap-3 ${
            content.buttons.length > 1 ? "sm:flex-row" : ""
          }`}
        >
          {content.buttons.map((btn, index) => (
            <ActionButton
              key={index}
              label={btn.label}
              onClick={btn.onClick}
              variant={btn.variant}
              disabled={loading && !isPendingCase && index === content.buttons.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SellerVerificationModal;
