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

const getRejectionReason = (flowState, verificationCase) => {
  const kycReason =
    flowState?.kycRejectionReason ||
    flowState?.sellerProfile?.kycRejectionReason ||
    "";
  const bankReason =
    flowState?.bankRejectionReason ||
    flowState?.sellerProfile?.bankRejectionReason ||
    "";

  if (verificationCase === "both_rejected") {
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
  const statusKey = statusOverride || status || "pending";
  const hasAnyToken =
    !!localStorage.getItem("sellerOnboardingToken") ||
    !!localStorage.getItem("accessToken") ||
    !!flowState;

  const verificationCase = useMemo(
    () => getVerificationCase(flowState),
    [flowState],
  );

  const refreshStatus = useCallback(
    async ({ notify = false } = {}) => {
      if (
        !localStorage.getItem("sellerOnboardingToken") &&
        !localStorage.getItem("accessToken")
      ) {
        return;
      }
      setRefreshing(true);
      const result = await dispatch(fetchAuthStatus());
      setRefreshing(false);

      if (fetchAuthStatus.fulfilled.match(result)) {
        const nextRoute = getSellerStatusRoute(result.payload);
        if (
          statusKey !== "complete" &&
          nextRoute &&
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
  }, [refreshStatus]);

  if (!hasAnyToken) {
    return <Navigate to={AUTH_ROUTES.LOGIN} replace />;
  }

  if (!STATUS_KEYS.includes(statusKey)) {
    return <Navigate to={AUTH_ROUTES.SELLER_STATUS_PENDING} replace />;
  }

  const expectedRoute = flowState ? getSellerStatusRoute(flowState) : null;
  if (
    statusKey !== "complete" &&
    expectedRoute &&
    expectedRoute !== location.pathname
  ) {
    return <Navigate to={expectedRoute} replace />;
  }

  if (statusKey === "complete") {
    return (
      <SellerStatusScreen
        variant="underReview"
        title="Onboarding Complete"
        subtitleTitle="Submitted For Review"
        description="Your seller onboarding details have been submitted. Our team will verify them within 24 - 48 hours."
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
        buttonLabel={
          VERIFICATION_REJECTED_CASES.includes(verificationCase)
            ? "Update Details"
            : "Back To Onboarding"
        }
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
