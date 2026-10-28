import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import SellerStatusScreen from "../../components/StatusScreen/SellerStatusScreen";
import {
  VERIFICATION_REJECTED_CASES,
  getSellerStatusRoute,
  getVerificationCase,
} from "../../components/Seller/sellerVerificationStatus";
import { fetchAuthStatus, markApprovalModalSeen } from "../../Redux/seller-slice";
import { AUTH_ROUTES } from "../auth/authRoutes";

const STATUS_KEYS = ["pending", "rejected", "approved", "complete"];

const cleanText = (value) => String(value || "").trim();

const getOrganizationReason = (organization, statusField) => {
  if (!organization || organization[statusField] !== "rejected") return "";
  const requiredChanges = Array.isArray(organization.requiredChanges)
    ? organization.requiredChanges.map(cleanText).filter(Boolean).join(" ")
    : "";
  return cleanText(organization.rejectionReason) || requiredChanges;
};

const getRejectedOrganizationReason = (flowState, statusField) => {
  const selectedReason = getOrganizationReason(flowState?.organization, statusField);
  if (selectedReason) return selectedReason;

  const organizations = Array.isArray(flowState?.organizations)
    ? flowState.organizations
    : [];
  const rejectedOrganization = organizations.find(
    (organization) => organization?.[statusField] === "rejected",
  );
  return getOrganizationReason(rejectedOrganization, statusField);
};

const getRejectionReason = (flowState, verificationCase) => {
  const kycReason =
    flowState?.kycRejectionReason ||
    flowState?.sellerProfile?.kycRejectionReason ||
    getRejectedOrganizationReason(flowState, "kycStatus") ||
    flowState?.sellerProfile?.organizationRejectionReason ||
    "";
  const bankReason =
    flowState?.bankRejectionReason ||
    flowState?.sellerProfile?.bankRejectionReason ||
    getRejectedOrganizationReason(flowState, "bankVerificationStatus") ||
    flowState?.sellerProfile?.organizationRejectionReason ||
    "";

  if (verificationCase === "both_rejected") {
    if (kycReason && kycReason === bankReason) {
      return `KYC/Bank: ${kycReason}`;
    }
    return [
      kycReason && `KYC: ${kycReason}`,
      bankReason && `Bank: ${bankReason}`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (verificationCase === "bank_rejected") {
    return bankReason;
  }

  return kycReason;
};

const getPendingCopy = (verificationCase) => {
  if (verificationCase === "kyc_approved_bank_pending") {
    return {
      title: "Bank Verification Pending",
      subtitleTitle: "Your KYC Is Approved",
      description:
        "Your KYC details are approved. Your bank verification is still under review.",
    };
  }

  if (verificationCase === "bank_approved_kyc_pending") {
    return {
      title: "KYC Verification Pending",
      subtitleTitle: "Your Bank Details Are Approved",
      description:
        "Your bank details are approved. Your KYC verification is still under review.",
    };
  }

  return {
    title: "Your Account Is Under Review",
    subtitleTitle: "24 - 48 Hours",
    description:
      "Your submitted details are under review. You will be notified once verification is completed.",
  };
};

const SellerStatusPage = ({ statusOverride, flowState: routeFlowState }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status } = useParams();
  const { seller } = useSelector((state) => state);
  const flowState = seller?.flowState || routeFlowState;
  const [refreshing, setRefreshing] = useState(false);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const statusKey = statusOverride || status || "pending";
  const hasAnyToken =
    !!localStorage.getItem("sellerOnboardingToken") ||
    !!sessionStorage.getItem("accessToken") ||
    !!flowState;

  const verificationCase = useMemo(
    () => getVerificationCase(flowState),
    [flowState],
  );
  const isRejectedStatus =
    VERIFICATION_REJECTED_CASES.includes(verificationCase);

  const refreshStatus = useCallback(
    async ({ notify = false } = {}) => {
      if (
        !localStorage.getItem("sellerOnboardingToken") &&
        !sessionStorage.getItem("accessToken")
      ) {
        setStatusLoaded(true);
        return;
      }
      setRefreshing(true);
      const result = await dispatch(fetchAuthStatus());
      setRefreshing(false);
      setStatusLoaded(true);

      if (fetchAuthStatus.fulfilled.match(result)) {
        const nextRoute = getSellerStatusRoute(result.payload);
        if (
          statusKey !== "complete" &&
          nextRoute &&
          window.location.pathname === location.pathname &&
          nextRoute !== location.pathname
        ) {
          navigate(nextRoute, { replace: true });
          return;
        }
        if (notify) toast.success("Status refreshed");
        return;
      }

      if (notify) {
        toast.error(result.payload?.message || "Unable to refresh status");
      }
    },
    [dispatch, location.pathname, navigate, statusKey],
  );

  useEffect(() => {
    refreshStatus();
    // Refresh once on mount. The callback also changes after navigation/status
    // updates; re-running it would cause a redirect/refetch loop on this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (statusKey === "complete") return undefined;

    const intervalId = window.setInterval(() => {
      refreshStatus();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [refreshStatus, statusKey]);

  if (!hasAnyToken) {
    return <Navigate to={AUTH_ROUTES.LOGIN} replace />;
  }

  if (!STATUS_KEYS.includes(statusKey)) {
    return <Navigate to={AUTH_ROUTES.SELLER_STATUS_PENDING} replace />;
  }

  const expectedRoute = flowState ? getSellerStatusRoute(flowState) : null;
  if (
    statusLoaded &&
    statusKey !== "complete" &&
    expectedRoute &&
    expectedRoute !== location.pathname
  ) {
    return <Navigate to={expectedRoute} replace />;
  }

  if (statusKey === "complete") {
    if (isRejectedStatus) {
      const reason = getRejectionReason(flowState, verificationCase);
      const editTarget =
        verificationCase === "bank_rejected"
          ? `${AUTH_ROUTES.ONBOARDING}?edit=bank`
          : `${AUTH_ROUTES.ONBOARDING}?edit=kyc`;

      return (
        <SellerStatusScreen
          variant="rejected"
          title="Verification Requires Updates"
          subtitleTitle="Please Update Your Details"
          description={
            reason ||
            "Your submitted details need correction before your seller account can be approved."
          }
          progressTitle="Verification Requires Updates"
          progressDescription="Your application needs corrections before it can be approved. Update the requested details and submit them for review again."
          buttonLabel="Update Details"
          onButtonClick={() => navigate(editTarget)}
        />
      );
    }

    return (
      <SellerStatusScreen
        variant="underReview"
        title="We're Reviewing Your Account"
        subtitleTitle="24 - 48 Hours"
        description="Your application is currently under review. This usually takes 24–48 hours."
        buttonLabel="View Status"
        onButtonClick={() => navigate(AUTH_ROUTES.SELLER_STATUS_PENDING)}
      />
    );
  }

  if (statusKey === "approved") {
    return (
      <SellerStatusScreen
        variant="readyToSell"
        title="Application Approved"
        subtitleTitle=""
        description="Your seller account is verified. You can now access your dashboard and start managing your store."
        buttonLabel={refreshing ? "Please wait..." : "Go To Dashboard"}
        disabled={refreshing}
        onButtonClick={async () => {
          setRefreshing(true);
          localStorage.setItem("sellerApprovalModalSeen", "true");
          try {
            await dispatch(markApprovalModalSeen()).unwrap();
          } catch {
            // Local persistence is enough for navigation if the sync fails.
          } finally {
            setRefreshing(false);
          }
          navigate(AUTH_ROUTES.APP_HOME, { replace: true });
        }}
      />
    );
  }

  if (statusKey === "rejected") {
    const reason = getRejectionReason(flowState, verificationCase);
    const editTarget =
      verificationCase === "bank_rejected"
        ? `${AUTH_ROUTES.ONBOARDING}?edit=bank`
        : `${AUTH_ROUTES.ONBOARDING}?edit=kyc`;

    return (
      <SellerStatusScreen
        variant="rejected"
        title="Verification Requires Updates"
        subtitleTitle="Please Update Your Details"
        description={
          reason ||
          "Your submitted details need correction before your seller account can be approved."
        }
        progressTitle="Verification Requires Updates"
        progressDescription="Your application needs corrections before it can be approved. Update the requested details and submit them for review again."
        buttonLabel={
          VERIFICATION_REJECTED_CASES.includes(verificationCase)
            ? "Update Details"
            : "Back To Onboarding"
        }
        onButtonClick={() => navigate(editTarget)}
      />
    );
  }

  if (isRejectedStatus) {
    const reason = getRejectionReason(flowState, verificationCase);
    const editTarget =
      verificationCase === "bank_rejected"
        ? `${AUTH_ROUTES.ONBOARDING}?edit=bank`
        : `${AUTH_ROUTES.ONBOARDING}?edit=kyc`;

    return (
      <SellerStatusScreen
        variant="rejected"
        title="Verification Requires Updates"
        subtitleTitle="Please Update Your Details"
        description={
          reason ||
          "Your submitted details need correction before your seller account can be approved."
        }
        buttonLabel="Update Details"
        onButtonClick={() => navigate(editTarget)}
      />
    );
  }

  const pendingCopy = getPendingCopy(verificationCase);
  return (
    <SellerStatusScreen
      variant="underReview"
      title={pendingCopy.title}
      subtitleTitle={pendingCopy.subtitleTitle}
      description={pendingCopy.description}
      buttonLabel={refreshing ? "Refreshing..." : "Refresh Status"}
      disabled={refreshing}
      onButtonClick={() => refreshStatus({ notify: true })}
    />
  );
};

export default SellerStatusPage;
