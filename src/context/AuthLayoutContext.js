import { createContext, useContext, useMemo, useState } from "react";

export const AUTH_FORM_TYPES = {
  LOGIN: "login",
  FORGOT_PASSWORD: "forgotPassword",
  VERIFICATION_CODE: "verificationCode",
  RESET_PASSWORD: "resetPassword",
  REGISTER: "register",
  REGISTER_VERIFICATION: "registerVerification",
  VERIFICATION_COMPLETE: "verificationComplete",
};

const AUTH_LAYOUT_CONFIG = {
  [AUTH_FORM_TYPES.LOGIN]: {
    adminTitle: "Admin Portal",
    sellerTitle: "Welcome Back, Seller",
    adminSubtitle: "Login to manage platform operations",
    sellerSubtitle: "Login to manage onboarding, products, and orders",
    backgroundImg: "/Img/auth-img/backgroundImg.png",
  },
  [AUTH_FORM_TYPES.FORGOT_PASSWORD]: {
    backgroundImg: "/Img/auth-img/forgotPasswordBg.png",
  },
  [AUTH_FORM_TYPES.VERIFICATION_CODE]: {
    backgroundImg: "/Img/auth-img/verficationCodeBg.png",
  },
  [AUTH_FORM_TYPES.RESET_PASSWORD]: {
    backgroundImg: "/Img/auth-img/resetPasswordBg.png",
  },
  [AUTH_FORM_TYPES.REGISTER]: {
    backgroundImg: "/Img/auth-img/registerBg.png",
  },
  [AUTH_FORM_TYPES.REGISTER_VERIFICATION]: {
    backgroundImg: "/Img/auth-img/verficationCodeBg.png",
  },
  [AUTH_FORM_TYPES.VERIFICATION_COMPLETE]: {
    backgroundImg: "/Img/auth-img/verificationCompleteBg.png",
  },
};

const AuthLayoutContext = createContext();

export const AuthLayoutProvider = ({
  children,
  initialFormType = AUTH_FORM_TYPES.LOGIN,
  sellerPanel = false,
}) => {
  const [formType, setFormType] = useState(initialFormType);

  const value = useMemo(() => {
    const config =
      AUTH_LAYOUT_CONFIG[formType] || AUTH_LAYOUT_CONFIG[AUTH_FORM_TYPES.LOGIN];

    return {
      formType,
      setFormType,
      layoutConfig: {
        ...config,
        title:
          config.title ||
          (sellerPanel ? config.sellerTitle : config.adminTitle),
        subtitle:
          config.subtitle ||
          (sellerPanel ? config.sellerSubtitle : config.adminSubtitle),
        overlayImg: config.overlayImg || "/Img/auth-img/overlayImg.png",
      },
    };
  }, [formType, sellerPanel]);

  return (
    <AuthLayoutContext.Provider value={value}>
      {children}
    </AuthLayoutContext.Provider>
  );
};

export const useAuthLayout = () => {
  const context = useContext(AuthLayoutContext);

  if (!context) {
    return {
      formType: AUTH_FORM_TYPES.LOGIN,
      setFormType: () => {},
      layoutConfig: {
        ...AUTH_LAYOUT_CONFIG[AUTH_FORM_TYPES.LOGIN],
        title: AUTH_LAYOUT_CONFIG[AUTH_FORM_TYPES.LOGIN].adminTitle,
        subtitle: AUTH_LAYOUT_CONFIG[AUTH_FORM_TYPES.LOGIN].adminSubtitle,
        overlayImg: "/Img/auth-img/overlayImg.png",
      },
    };
  }

  return context;
};
