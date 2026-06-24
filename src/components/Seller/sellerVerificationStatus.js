import { AUTH_ROUTES } from "../../pages/auth/authRoutes";

export const VERIFICATION_REJECTED_CASES = [
  "kyc_rejected",
  "bank_rejected",
  "both_rejected",
];

export const VERIFICATION_PENDING_CASES = [
  "pending",
  "kyc_approved_bank_pending",
  "bank_approved_kyc_pending",
];

export const VERIFICATION_APPROVED_CASES = [
  "both_approved",
  "already_approved",
];

export const getVerificationCase = (flowState) => {
  if (!flowState) return null;

  const approvedOrganizations = Array.isArray(flowState.approvedOrganizations)
    ? flowState.approvedOrganizations
    : [];
  if (
    flowState.hasApprovedOrganization === true ||
    approvedOrganizations.length > 0
  ) {
    return flowState.approvalModalSeen ||
      localStorage.getItem("sellerApprovalModalSeen") === "true"
      ? "already_approved"
      : "both_approved";
  }

  const organizations = Array.isArray(flowState.organizations)
    ? flowState.organizations
    : [];
  const selectedOrganization =
    organizations.find(
      (organization) =>
        String(organization.id || organization.organizationId) ===
        String(flowState.selectedOrganizationId || ""),
    ) ||
    flowState.organization ||
    organizations.find((organization) => organization.isDefault) ||
    organizations[0];
  if (selectedOrganization) {
    const organizationRejected =
      selectedOrganization.approvalStatus === "rejected" ||
      selectedOrganization.kycStatus === "rejected" ||
      selectedOrganization.bankVerificationStatus === "rejected" ||
      selectedOrganization.goLiveStatus === "rejected";
    if (organizationRejected) return "kyc_rejected";
  }

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
  const bankDetailsCompleted =
    flowState.requirements?.bankDetails?.completed === true ||
    Boolean(flowState.sellerProfile?.bankDetails);
  const kycPending = ["pending", "submitted", "under_review"].includes(
    kycStatus,
  );
  const bankPending =
    ["pending", "submitted", "under_review"].includes(bankStatus) ||
    (bankStatus === "not_submitted" && bankDetailsCompleted);

  const isFullyApproved = kycApproved && bankApproved;

  if (isFullyApproved && approvalModalSeen) return "already_approved";
  if (isFullyApproved) return "both_approved";
  if (kycRejected && bankRejected) return "both_rejected";
  if (kycRejected) return "kyc_rejected";
  if (bankRejected) return "bank_rejected";
  if (kycApproved && bankPending) return "kyc_approved_bank_pending";
  if (bankApproved && kycPending) return "bank_approved_kyc_pending";
  return "pending";
};

export const getSellerStatusRoute = (
  flowState,
  fallback = AUTH_ROUTES.SELLER_STATUS_PENDING,
) => {
  const verificationCase = getVerificationCase(flowState);

  if (VERIFICATION_APPROVED_CASES.includes(verificationCase)) {
    return AUTH_ROUTES.SELLER_STATUS_APPROVED;
  }

  if (VERIFICATION_REJECTED_CASES.includes(verificationCase)) {
    return AUTH_ROUTES.SELLER_STATUS_REJECTED;
  }

  return fallback;
};

export const isSellerFlowPath = (pathname = "") =>
  pathname.startsWith(AUTH_ROUTES.ONBOARDING) ||
  pathname.startsWith(AUTH_ROUTES.SELLER_STATUS_BASE) ||
  pathname === AUTH_ROUTES.VERIFICATION_COMPLETE;
