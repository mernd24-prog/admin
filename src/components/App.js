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
  clearStoredAuth,
  getStoredRole,
  isAllowedRoleForCurrentPanel,
} from "../_helpers/authStorage";
import { isSellerPanel } from "../_helpers/panelConfig";
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
        await dispatch(fetchAuthStatus());
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
  const hasOnboardingToken = localStorage.getItem("sellerOnboardingToken");
  const role = getStoredRole() || flowState?.role;
  // if (
  //   isSellerPanel() &&
  //   (flowState?.requiresOnboarding || hasOnboardingToken)
  // ) {
  //   return <Navigate to="/seller/onboarding" />;
  // }
  if (isAuthenticated && role && !isAllowedRoleForCurrentPanel(role)) {
    clearStoredAuth();
    return <Navigate to="/login" />;
  }
  return isAuthenticated ? <Component {...rest} /> : <Navigate to="/login" />;
};

const PublicRoute = ({ component: Component, flowState, ...rest }) => {
  const { currentSection } = useKYC();

  const isAuthenticated = localStorage.getItem("accessToken");
  const hasOnboardingToken = localStorage.getItem("sellerOnboardingToken");
  const role = getStoredRole() || flowState?.role;
  const sellerPanel = isSellerPanel();
  // if (sellerPanel && (flowState?.requiresOnboarding || hasOnboardingToken)) {
  //   return <Navigate to="/seller/onboarding" />;
  // }
  if (isAuthenticated && role && !isAllowedRoleForCurrentPanel(role)) {
    clearStoredAuth();
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
