import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, ChevronDown, LogOut, X } from "lucide-react";
import BrandLogo from "../BrandLogo";
import NeedHelpCard from "../Shared/NeedHelpCard";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { clearStoredAuth } from "../../_helpers/authStorage";
import { AUTH_ROUTES } from "../../pages/auth/authRoutes";
import { logout as logoutAuth } from "../../Redux/auth-Slice";
import { clearSellerOnboarding } from "../../Redux/seller-slice";

const readStoredJson = (key) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const formatLabel = (value = "") =>
  String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getSellerHeaderName = (...sources) => {
  for (const source of sources) {
    const profile = source?.sellerProfile || {};
    const profileName =
      profile.displayName ||
      profile.legalBusinessName ||
      profile.businessName ||
      profile.primaryContactName;
    const userName =
      source?.fullName ||
      source?.full_name ||
      source?.name ||
      source?.userName ||
      source?.legalName ||
      source?.email?.split("@")?.[0];
    const name = profileName || userName;
    if (name) return name;
  }
  return "Seller Account";
};

const getSellerHeaderSubtitle = (...sources) => {
  for (const source of sources) {
    const profile = source?.sellerProfile || {};
    const subtitle =
      profile.businessType ||
      source?.role ||
      source?.roleName ||
      source?.onboardingStatus;
    if (subtitle) return formatLabel(subtitle);
  }
  return "Vendor Applicant";
};

const getSellerHeaderEmail = (...sources) => {
  for (const source of sources) {
    const email =
      source?.email ||
      source?.userEmail ||
      source?.primaryEmail ||
      source?.sellerProfile?.email ||
      source?.sellerProfile?.primaryEmail ||
      source?.contactEmail;
    if (email) return email;
  }
  return "";
};

const getInitials = (name = "") => {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "SG";
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const ONBOARDING_SUPPORT_CATEGORY = "ONBOARDING_ISSUE";

const OnboardingSupportModal = ({
  open,
  message,
  submitting,
  onChange,
  onClose,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-[10px] bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[17px] font-bold text-[#082f91]">
              Onboarding Issue.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#5f6678] transition hover:bg-[#f1f4fb]"
            aria-label="Close support popup"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mt-5 block text-sm font-semibold text-[#30384d]">
          Message
          <textarea
            className="mt-2 min-h-[150px] w-full resize-y rounded-md border border-[#E6E6E6] px-3 py-2 text-sm outline-none transition focus:border-[#082f91] focus:ring-2 focus:ring-[#082f91]/10"
            value={message}
            onChange={(event) => onChange(event.target.value)}
            maxLength={5000}
            placeholder="Tell us what is blocking your onboarding."
            autoFocus
          />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="admin-btn-secondary min-w-[120px]"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="admin-btn-primary min-w-[150px]"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

const KYCStatusLayout = ({
  children,
  currentSection = "status",
  logo = "/logo.png",
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const stepsNavRef = useRef(null);
  const activeStepRef = useRef(null);
  const contentRef = useRef(null);
  const userMenuRef = useRef(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { seller, authSlice } = useSelector((state) => state || {});
  const storedUser = readStoredJson("currentUser");
  const storedOnboardingUser = readStoredJson("sellerOnboardingUser");
  const storedFlowState = readStoredJson("authFlowState");
  const flowState = seller?.flowState || storedFlowState || {};
  const headerName = getSellerHeaderName(
    authSlice?.user,
    seller?.onboardingUser,
    flowState,
    storedUser,
    storedOnboardingUser,
  );
  const headerSubtitle = getSellerHeaderSubtitle(
    authSlice?.user,
    seller?.onboardingUser,
    flowState,
    storedUser,
    storedOnboardingUser,
  );
  const headerEmail = getSellerHeaderEmail(
    authSlice?.user,
    seller?.onboardingUser,
    flowState,
    storedUser,
    storedOnboardingUser,
  );
  const headerInitials = getInitials(headerName);

  const menuItems = [
    { id: "personal", label: "Personal / Owner Details" },
    { id: "business", label: "Business Details" },
    { id: "bank", label: "Bank Details" },
    { id: "review", label: "Review Details" },
    { id: "status", label: "Status" },
  ];
  const currentIndex = menuItems.findIndex(
    (item) => item.id === currentSection,
  );

  useEffect(() => {
    if (!userMenuOpen) return undefined;

    const closeMenuOnOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenuOnOutsideClick);
    return () => {
      document.removeEventListener("mousedown", closeMenuOnOutsideClick);
    };
  }, [userMenuOpen]);

  const closeSupportModal = () => {
    if (supportSubmitting) return;
    setSupportOpen(false);
    setSupportMessage("");
  };

  const handleLogout = () => {
    clearStoredAuth();
    dispatch(clearSellerOnboarding());
    dispatch(logoutAuth());
    setUserMenuOpen(false);
    toast.success("Logged out");
    navigate(AUTH_ROUTES.LOGIN, { replace: true });
  };

  const submitOnboardingSupport = async (event) => {
    event.preventDefault();
    const message = supportMessage.trim();
    if (message.length < 10) {
      toast.error("Message must be at least 10 characters.");
      return;
    }

    const token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("sellerOnboardingToken");
    if (!token) {
      toast.error("Please login again to submit support request.");
      return;
    }

    try {
      setSupportSubmitting(true);
      await axiosProvider.post(
        ENDPOINTS.support.create,
        {
          category: ONBOARDING_SUPPORT_CATEGORY,
          subject: "Onboarding issue",
          message,
          metadata: {
            source: "seller_onboarding_need_help",
            onboardingStep: currentSection,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      toast.success("Support request submitted");
      setSupportOpen(false);
      setSupportMessage("");
    } catch (requestError) {
      toast.error(requestError?.message || "Failed to submit support request");
    } finally {
      setSupportSubmitting(false);
    }
  };

  const scrollContentToTop = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    const startTop = content.scrollTop;
    if (startTop <= 0) return;

    const duration = 280;
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);

      content.scrollTop = startTop * (1 - eased);

      if (elapsed < 1) {
        window.requestAnimationFrame(animate);
      }
    };

    window.requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const nav = stepsNavRef.current;
    const activeStep = activeStepRef.current;
    if (
      !nav ||
      !activeStep ||
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      return;
    }

    nav.scrollTo({
      left:
        activeStep.offsetLeft - (nav.clientWidth - activeStep.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [currentSection]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      scrollContentToTop();

      if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    });
  }, [currentSection, scrollContentToTop]);

  return (
    <div className="min-h-screen  bg-[#f6f3ef]   font-inter text-[#17213a] lg:grid lg:grid-cols-[350px_minmax(0,1fr)]">
      <OnboardingSupportModal
        open={supportOpen}
        message={supportMessage}
        submitting={supportSubmitting}
        onChange={setSupportMessage}
        onClose={closeSupportModal}
        onSubmit={submitOnboardingSupport}
      />
      <aside className="sidebar-scrollbar w-full   lg:sticky lg:top-0 lg:h-screen lg:self-start lg:overflow-y-auto">
        <div className="flex h-full flex-col">
          <div className=" bg-[#FCF5E8]  pb-5  sm:pb-7 lg:pb-10">
            <div className="flex h-[118px] items-center justify-center px-4 sm:h-[140px] lg:h-[165px]">
              <BrandLogo
                src={logo}
                className="m-0 h-[96px] w-[240px] rounded-[10px] border border-[#DB971A] bg-white p-[9px] shadow-[0_8px_18px_rgba(78,53,23,0.16)] sm:h-[112px] sm:w-[276px] lg:h-[124px] lg:w-[306px] lg:p-[10px]"
                imageClassName="rounded-[7px] border border-[#DB971A]/70 object-contain p-[10px] lg:p-[12px]"
              />
            </div>

            {/* <div className="flex min-h-[54px] w-full items-center justify-center border-y border-[#012B6B1F] bg-[#F3E9D9] px-4 py-3 sm:min-h-[60px] lg:h-[65px] lg:justify-start lg:px-7 lg:py-0">
              <h2 className="text-center text-[16px] font-bold capitalize leading-[18px] tracking-[1.4px] text-[#042586] sm:text-[18px] sm:tracking-[1.8px] lg:text-left lg:text-[20px] lg:leading-[15px] lg:tracking-[2.2px]">
                Verification Steps
              </h2>
            </div> */}

            <div className="px-4 pt-4 sm:px-6 sm:pt-5 lg:px-[31px] lg:pt-[22px]">
              <nav
                ref={stepsNavRef}
                className="sidebar-scrollbar relative flex gap-3 overflow-x-auto pb-3 lg:flex lg:flex-col lg:gap-[34px] lg:overflow-visible lg:pb-0"
              >
                <span className="absolute left-[25px] top-[20px] hidden h-[310px] w-[2.5px] rounded-full bg-[#E49E1C] lg:block" />
                {menuItems.map((item, index) => (
                  <div
                    key={item.id}
                    ref={item.id === currentSection ? activeStepRef : null}
                    className="relative z-10 min-w-[205px] sm:min-w-[225px] lg:min-w-0"
                  >
                    <div
                      className={`relative flex items-center gap-[10px] transition ${
                        item.id === currentSection
                          ? "h-[46px] rounded-l-[4px] rounded-r-[12px] border-l-[4px] border-[#E49E1C] bg-[#042586] px-[8px] text-white shadow-[0_8px_16px_rgba(8,47,145,0.18)] lg:h-[50px]"
                          : "h-[42px] bg-transparent pl-[11px] pr-[2px] text-[#042586]"
                      }`}
                    >
                      <span
                        className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                          index < currentIndex
                            ? "border-[#042586] bg-white text-[#042586]"
                            : item.id === currentSection
                              ? "border-[#E49E1C] bg-[#E49E1C] text-white"
                              : "border-[#042586] bg-white text-[#042586]"
                        }`}
                      >
                        {index < currentIndex ? (
                          <Check size={14} />
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col justify-center">
                        <span
                          className={`block h-[17px] w-[78px] whitespace-nowrap font-[Inter] text-[13px] font-semibold uppercase leading-[16.5px] tracking-[0.28px] ${
                            item.id === currentSection
                              ? "text-white"
                              : "text-[#042586]"
                          }`}
                        >
                          Step {String(index + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`mt-[2px] block max-w-[170px] truncate text-[11px] font-semibold leading-[12px] ${
                            item.id === currentSection
                              ? "text-white"
                              : "text-[#000000]"
                          }`}
                        >
                          {item.label}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </nav>

              <NeedHelpCard
                title="Need Help?"
                description="Our verification team is available 24/7 to help you complete KYC."
                buttonText="Contact Support"
                onClick={() => setSupportOpen(true)}
                className="mx-auto mt-5 hidden max-w-[285px] lg:mt-8 lg:block lg:max-w-none"
              />
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 bg-[#FCF5E8]">
        <header className="sticky top-0 z-30 flex min-h-[64px] items-center justify-between gap-[10px] bg-[#FCF5E8] px-4 py-4 text-[#111827] sm:px-6 lg:h-[75px] lg:px-[48px] lg:pb-[17px] lg:pt-[18px]">
          <div className="flex min-w-0 items-center gap-2 text-[12px] font-semibold leading-[16px] text-[#111827] sm:text-[14px] lg:text-[16px]">
            <span>Onboarding</span>
            <span className="mx-1 sm:mx-[10px]">›</span>
            <span className="truncate">
              {menuItems[currentIndex]?.label || "Status"}
            </span>
          </div>

          <div ref={userMenuRef} className="relative flex items-center gap-4">
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-3 rounded-[8px] px-2 py-1.5 text-left transition hover:bg-white/60"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E49E1C] bg-white text-[11px] font-bold text-[#082f91]">
                {headerInitials}
              </span>

              <span className="hidden text-left sm:block">
                <span className="block max-w-[130px] truncate text-left text-[14px] font-bold leading-[20px] text-[#111827]">
                  {headerName}
                </span>

                <span className="mt-1 block max-w-[130px] truncate text-left text-[10px] font-medium leading-[15px] text-[#5f6575]">
                  {headerEmail || headerSubtitle}
                </span>
              </span>

              <ChevronDown
                size={16}
                className={`text-[#082f91] transition ${
                  userMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] z-50 w-[210px] rounded-[8px] border border-[#eadfcb] bg-white py-2 shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-[#b42318] transition hover:bg-[#fff4f3]"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="kyc-content-wrapper">
          <div
            ref={contentRef}
            className="kyc-content-scroll bg-[#F7F8FC] px-4 py-6 sm:px-8 lg:px-10"
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default KYCStatusLayout;
