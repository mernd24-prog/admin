import { useNavigate } from "react-router-dom";
import SellerStatusScreen from "../../components/StatusScreen/SellerStatusScreen";
import { AUTH_FORM_TYPES } from "../../context/AuthLayoutContext";
import { AUTH_ROUTES } from "./authRoutes";
import { useAuthFlow } from "./useAuthFlow";
import { useAuthPageMeta } from "./useAuthPageMeta";

const VerificationCompletePage = () => {
  const navigate = useNavigate();
  useAuthFlow({
    currentFormType: AUTH_FORM_TYPES.VERIFICATION_COMPLETE,
  });
  useAuthPageMeta("Verification Complete", "Your seller account is verified.");

  return (
    <SellerStatusScreen
      variant="verificationComplete"
      onButtonClick={() => {
        navigate(AUTH_ROUTES.ONBOARDING);
      }}
    />
  );
};

export default VerificationCompletePage;
