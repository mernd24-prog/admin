import { Route, Navigate, Routes } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Layout from "./Layout/Layout";
import NetworkDetector from "../components/Hoc/NetworkDetector";
import Login from "../pages/login/Login";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import VerifyOtpPage from "../pages/auth/VerifyOtpPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import RegisterPage from "../pages/auth/RegisterPage";
import RegisterVerifyOtpPage from "../pages/auth/RegisterVerifyOtpPage";
import VerificationCompletePage from "../pages/auth/VerificationCompletePage";
import SellerStatusPage from "../pages/SellerStatus/SellerStatusPage";
import { useLoader } from "../context/LoaderContext";
import Loader from "./Loader/Loader";
import AuthLayout from "./Layout/authLayout";
import {
  AuthLayoutProvider,
  AUTH_FORM_TYPES,
} from "../context/AuthLayoutContext";
import { AUTH_ROUTES, LEGACY_AUTH_REDIRECTS } from "../pages/auth/authRoutes";
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
import {
  isSellerFlowPath,
} from "./Seller/sellerVerificationStatus";
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
              result.payload?.message ||
                "Your session is no longer valid. Please login again.",
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
          !isSellerFlowPath(window.location.pathname)
        ) {
          window.location.replace(AUTH_ROUTES.ONBOARDING);
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
        <Route path="/" element={<Navigate to={AUTH_ROUTES.LOGIN} />} />
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
        {Object.entries(LEGACY_AUTH_REDIRECTS).map(([legacyPath, target]) => (
          <Route
            key={legacyPath}
            path={legacyPath}
            element={<LegacyAuthRedirect to={target} />}
          />
        ))}
        <Route
          path={AUTH_ROUTES.LOGIN}
          element={
            <PublicAuthRoute
              component={Login}
              flowState={seller?.flowState}
              formType={AUTH_FORM_TYPES.LOGIN}
            />
          }
        />
        <Route
          path={AUTH_ROUTES.FORGOT_PASSWORD}
          element={
            <PublicAuthRoute
              component={ForgotPasswordPage}
              flowState={seller?.flowState}
              formType={AUTH_FORM_TYPES.FORGOT_PASSWORD}
              sellerOnly
            />
          }
        />
        <Route
          path={AUTH_ROUTES.VERIFY_OTP}
          element={
            <PublicAuthRoute
              component={VerifyOtpPage}
              flowState={seller?.flowState}
              formType={AUTH_FORM_TYPES.VERIFICATION_CODE}
              sellerOnly
            />
          }
        />
        <Route
          path={AUTH_ROUTES.RESET_PASSWORD}
          element={
            <PublicAuthRoute
              component={ResetPasswordPage}
              flowState={seller?.flowState}
              formType={AUTH_FORM_TYPES.RESET_PASSWORD}
              sellerOnly
            />
          }
        />
        <Route
          path={AUTH_ROUTES.REGISTER}
          element={
            <PublicAuthRoute
              component={RegisterPage}
              flowState={seller?.flowState}
              formType={AUTH_FORM_TYPES.REGISTER}
              sellerOnly
            />
          }
        />
        <Route
          path={AUTH_ROUTES.REGISTER_VERIFY_OTP}
          element={
            <PublicAuthRoute
              component={RegisterVerifyOtpPage}
              flowState={seller?.flowState}
              formType={AUTH_FORM_TYPES.REGISTER_VERIFICATION}
              sellerOnly
            />
          }
        />
        <Route
          path={AUTH_ROUTES.VERIFICATION_COMPLETE}
          element={
            <PublicAuthRoute
              component={VerificationCompletePage}
              flowState={seller?.flowState}
              formType={AUTH_FORM_TYPES.VERIFICATION_COMPLETE}
              sellerOnly
              allowOnboardingToken
            />
          }
        />
        <Route
          path={AUTH_ROUTES.ONBOARDING_COMPLETE}
          element={
            <SellerStatusRoute
              component={SellerStatusPage}
              flowState={seller?.flowState}
              statusOverride="complete"
            />
          }
        />
        <Route
          path={AUTH_ROUTES.SELLER_STATUS}
          element={
            <SellerStatusRoute
              component={SellerStatusPage}
              flowState={seller?.flowState}
            />
          }
        />

        <Route
          path={AUTH_ROUTES.ONBOARDING}
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

    </>
  );
};

const PrivateRoute = ({ component: Component, flowState, ...rest }) => {
  const isAuthenticated = localStorage.getItem("accessToken");
  const role = getStoredRole() || flowState?.role;

  if (isAuthenticated && role && !isAllowedRoleForCurrentPanel(role)) {
    forceLogout(
      "ROLE_CHANGED",
      "This account cannot access this panel. Please login with the correct account.",
    );
    return <Navigate to="/login" />;
  }

  // Seller account login is separate from organization approval. The dashboard is
  // allowed when at least one organization is approved for business operations.
  if (isSellerPanel() && isAuthenticated && flowState) {
    const hasApprovedOrganization =
      flowState.hasApprovedOrganization === true ||
      flowState.organizationSummary?.hasApprovedOrganization === true ||
      flowState.onboarding?.organizationSummary?.hasApprovedOrganization === true;

    if (flowState.requiresOnboarding && !hasApprovedOrganization) {
      return <Navigate to={AUTH_ROUTES.ONBOARDING} replace />;
    }
  }

  return isAuthenticated ? <Component {...rest} /> : <Navigate to="/login" />;
};

const SellerStatusRoute = ({ component: Component, flowState, ...rest }) => {
  const hasAccessToken = !!localStorage.getItem("accessToken");
  const hasOnboardingToken = !!localStorage.getItem("sellerOnboardingToken");
  const hasStoredStatus = !!flowState;

  if (!isSellerPanel()) {
    return <Navigate to={AUTH_ROUTES.LOGIN} replace />;
  }

  if (!hasAccessToken && !hasOnboardingToken && !hasStoredStatus) {
    return <Navigate to={AUTH_ROUTES.LOGIN} replace />;
  }

  return (
    <>
      <LoaderWrapper />
      <KYCStatusLayout currentSection="status">
        <Component flowState={flowState} {...rest} />
      </KYCStatusLayout>
    </>
  );
};

const LegacyAuthRedirect = ({ to }) => {
  if (!isSellerPanel()) {
    return <Navigate to={AUTH_ROUTES.LOGIN} replace />;
  }
  return <Navigate to={to} replace />;
};

const PublicAuthRoute = ({
  component: Component,
  flowState,
  formType,
  sellerOnly = false,
  allowOnboardingToken = false,
  ...rest
}) => {
  const isAuthenticated = localStorage.getItem("accessToken");
  const hasOnboardingToken = !!localStorage.getItem("sellerOnboardingToken");
  const role = getStoredRole() || flowState?.role;
  const sellerPanel = isSellerPanel();

  if (sellerOnly && !sellerPanel) {
    return <Navigate to={AUTH_ROUTES.LOGIN} replace />;
  }

  // Seller with active onboarding session — go to onboarding instead of login
  if (
    sellerPanel &&
    hasOnboardingToken &&
    flowState?.requiresOnboarding &&
    !allowOnboardingToken
  ) {
    if (formType === AUTH_FORM_TYPES.REGISTER_VERIFICATION) {
      return <Navigate to={AUTH_ROUTES.VERIFICATION_COMPLETE} replace />;
    }
    return <Navigate to={AUTH_ROUTES.ONBOARDING} replace />;
  }

  if (isAuthenticated && role && !isAllowedRoleForCurrentPanel(role)) {
    forceLogout(
      "ROLE_CHANGED",
      "This account cannot access this panel. Please login with the correct account.",
    );
  } else if (
    isAuthenticated &&
    formType !== AUTH_FORM_TYPES.VERIFICATION_COMPLETE &&
    (!flowState || flowState?.accountStatus === "active")
  ) {
    return <Navigate to="/app/home" />;
  }
  return (
    <>
      <LoaderWrapper />
      <AuthLayoutProvider
        initialFormType={formType || AUTH_FORM_TYPES.LOGIN}
        sellerPanel={sellerPanel}
      >
        <AuthLayout>
          <Component {...rest} />
        </AuthLayout>
      </AuthLayoutProvider>
    </>
  );
};

const LoaderWrapper = () => {
  const { loading } = useLoader();
  return <Loader loading={loading} />;
};

export default NetworkDetector(App);
