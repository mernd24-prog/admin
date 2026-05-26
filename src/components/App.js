import { Route, Navigate, Routes } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Layout from "./Layout/Layout";
import NetworkDetector from "../components/Hoc/NetworkDetector";
import Login from "../pages/login/Login";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ForgetPassword from "../pages/ForgotPassword/ForgotPassword";
import VerifyOtp from "../pages/verifyOtp/VerifyOtp";
import ResetPassword from "../pages/ResetPassword/ResetPassword";
import { useLoader } from "../context/LoaderContext";
import Loader from "./Loader/Loader";
import AuthLayout from "./Layout/authLayout";
import {
  AuthLayoutProvider,
  AUTH_FORM_TYPES,
} from "../context/AuthLayoutContext";
import SellerOnboarding from "../pages/SellerOnboarding/SellerOnboarding";
import { fetchAuthStatus } from "../Redux/seller-slice";
import KYCStatusLayout from "./Layout/kycLayout";
import { useKYC } from "../context/KycContext";
import {
  getStoredRole,
  isAllowedRoleForCurrentPanel,
} from "../_helpers/authStorage";
import { forceLogout } from "../_helpers/authSession";
import { isSellerPanel } from "../_helpers/panelConfig";
import { clearSellerOnboarding } from "../Redux/seller-slice";
const App = () => {
  const dispatch = useDispatch();
  const { currentSection } = useKYC();
  const { seller } = useSelector((state) => state);
  const [bootstrapped, setBootstrapped] = useState(false);
  const hasAnyToken = useMemo(
    () =>
      !!localStorage.getItem("sellerOnboardingToken") ||
      !!localStorage.getItem("accessToken"),
    [],
  );

  useEffect(() => {
    const bootstrap = async () => {
      if (hasAnyToken) {
        const result = await dispatch(fetchAuthStatus());
        if (fetchAuthStatus.rejected.match(result)) {
          const hasAccessToken = !!localStorage.getItem("accessToken");
          if (hasAccessToken) {
            // Regular session expired or invalidated — force logout with message
            forceLogout(
              result.payload?.code || "SESSION_INVALID",
              result.payload?.message || "Your session is no longer valid. Please login again.",
            );
          } else {
            // Onboarding token expired/invalid — clear silently and let user re-login
            dispatch(clearSellerOnboarding());
          }
          return;
        }

        // After a successful status fetch, redirect sellers who still need onboarding
        const flowState = result.payload;
        if (
          flowState?.requiresOnboarding &&
          isSellerPanel() &&
          !window.location.pathname.startsWith("/seller/onboarding")
        ) {
          window.location.replace("/seller/onboarding");
          return;
        }
      }
      setBootstrapped(true);
    };
    bootstrap();
  }, [dispatch, hasAnyToken]);

  if (!bootstrapped) {
    return <LoaderWrapper />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route
          path="/product-option-value/:id"
          element={<Navigate to={`/app${window.location.pathname}`} replace />}
        />
        <Route
          path="/product-option-values"
          element={<Navigate to="/app/product-option-values" replace />}
        />
        <Route
          path="/product-options"
          element={<Navigate to="/app/product-options" replace />}
        />
        <Route
          path="/app/*"
          element={
            <>
              <LoaderWrapper />
              <PrivateRoute component={Layout} flowState={seller?.flowState} />
            </>
          }
        />
        <Route
          path="/login"
          element={
            <>
              <LoaderWrapper />
              <PublicRoute component={Login} flowState={seller?.flowState} />
            </>
          }
        />
        <Route
          path="/forgotPassword"
          element={
            <>
              <LoaderWrapper />
              <AuthLayoutProvider
                initialFormType={AUTH_FORM_TYPES.FORGOT_PASSWORD}
                sellerPanel={isSellerPanel()}
              >
                <AuthLayout>
                  <ForgetPassword />
                </AuthLayout>
              </AuthLayoutProvider>
            </>
          }
        />
        <Route
          path="/verifyOtp"
          element={
            <>
              <LoaderWrapper />
              <AuthLayoutProvider
                initialFormType={AUTH_FORM_TYPES.VERIFICATION_CODE}
                sellerPanel={isSellerPanel()}
              >
                <AuthLayout>
                  <VerifyOtp />
                </AuthLayout>
              </AuthLayoutProvider>
            </>
          }
        />
        <Route
          path="/ResetPassword"
          element={
            <>
              <LoaderWrapper />
              <AuthLayoutProvider
                initialFormType={AUTH_FORM_TYPES.RESET_PASSWORD}
                sellerPanel={isSellerPanel()}
              >
                <AuthLayout>
                  <ResetPassword />
                </AuthLayout>
              </AuthLayoutProvider>
            </>
          }
        />

        <Route
          path="/seller/onboarding"
          element={
            isSellerPanel() ? (
              <KYCStatusLayout currentSection={currentSection}>
                <SellerOnboarding />
              </KYCStatusLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>

      <ToastContainer />
    </>
  );
};

const PrivateRoute = ({ component: Component, flowState, ...rest }) => {
  const isAuthenticated = localStorage.getItem("accessToken");
  const role = getStoredRole() || flowState?.role;

  if (isAuthenticated && role && !isAllowedRoleForCurrentPanel(role)) {
    forceLogout("ROLE_CHANGED", "This account cannot access this panel. Please login with the correct account.");
    return <Navigate to="/login" />;
  }

  // Block seller panel dashboard access unless KYC, bank, and account are all fully approved
  if (isSellerPanel() && isAuthenticated && flowState) {
    const kycStatus = flowState.kycStatus;
    const bankStatus =
      flowState.bankStatus ||
      flowState.bankVerificationStatus ||
      flowState.sellerProfile?.bankVerificationStatus;
    const kycApproved = kycStatus === "approved" || kycStatus === "verified";
    const bankApproved = bankStatus === "approved" || bankStatus === "verified";
    const accountActive = flowState.accountStatus === "active";

    if (!(kycApproved && bankApproved && accountActive)) {
      return <Navigate to="/seller/onboarding" replace />;
    }
  }

  return isAuthenticated ? <Component {...rest} /> : <Navigate to="/login" />;
};

const PublicRoute = ({ component: Component, flowState, ...rest }) => {
  const isAuthenticated = localStorage.getItem("accessToken");
  const hasOnboardingToken = !!localStorage.getItem("sellerOnboardingToken");
  const role = getStoredRole() || flowState?.role;
  const sellerPanel = isSellerPanel();

  // Seller with active onboarding session — go to onboarding instead of login
  if (sellerPanel && hasOnboardingToken && flowState?.requiresOnboarding) {
    return <Navigate to="/seller/onboarding" replace />;
  }

  if (isAuthenticated && role && !isAllowedRoleForCurrentPanel(role)) {
    forceLogout("ROLE_CHANGED", "This account cannot access this panel. Please login with the correct account.");
  } else if (
    isAuthenticated &&
    (!flowState || flowState?.accountStatus === "active")
  ) {
    return <Navigate to="/app/home" />;
  }
  return (
    <AuthLayoutProvider
      initialFormType={AUTH_FORM_TYPES.LOGIN}
      sellerPanel={sellerPanel}
    >
      <AuthLayout>
        <Component {...rest} />
      </AuthLayout>
    </AuthLayoutProvider>
  );
};

const LoaderWrapper = () => {
  const { loading } = useLoader();
  return <Loader loading={loading} />;
};

export default NetworkDetector(App);
