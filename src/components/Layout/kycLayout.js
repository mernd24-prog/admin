import React from "react";
import { useSelector } from "react-redux";
import { Check } from "lucide-react";
import BrandLogo from "../BrandLogo";
import NeedHelpCard from "../Shared/NeedHelpCard";

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

const KYCStatusLayout = ({
  children,
  currentSection = "status",
  logo = "/logo.png",
}) => {
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
  const headerInitials = getInitials(headerName);

  const menuItems = [
    { id: "personal", label: "Personal / Owner Details" },
    { id: "business", label: "Business Details" },
    { id: "bank", label: "Bank Details" },
    { id: "review", label: "Review Details" },
    { id: "status", label: "Status Status" },
  ];
  const currentIndex = menuItems.findIndex(
    (item) => item.id === currentSection,
  );

  return (
    <div className="min-h-screen bg-[#f6f3ef] font-inter text-[#17213a] lg:grid lg:grid-cols-[350px_minmax(0,1fr)]">
      <aside className="w-full bg-[#FEFEFE] shadow-[2px_2px_50px_0px_#0000001A] lg:min-h-screen">
        <div className="flex h-full flex-col">
          <div className="border border-[#f8e0c1] bg-[#F4F1ED] pb-5 shadow-[2px_2px_50px_0px_#0000001A] sm:pb-7 lg:pb-10">
            <div className="flex h-[118px] items-center justify-center px-4 sm:h-[140px] lg:h-[165px]">
              <BrandLogo
                src={logo}
                className="m-0 h-[82px] w-[108px] bg-white p-[8px] shadow-[0_8px_18px_rgba(78,53,23,0.18)] sm:h-[96px] sm:w-[126px] lg:h-[112px] lg:w-[146px] lg:p-[10px]"
                imageClassName="p-[6px] lg:p-[9px]"
              />
            </div>

            <div className="flex min-h-[54px] w-full items-center justify-center border-y border-[#012B6B1F] bg-[#F3E9D9] px-4 py-3 sm:min-h-[60px] lg:h-[65px] lg:justify-start lg:px-7 lg:py-0">
              <h2 className="text-center text-[16px] font-bold capitalize leading-[18px] tracking-[1.4px] text-[#042586] sm:text-[18px] sm:tracking-[1.8px] lg:text-left lg:text-[20px] lg:leading-[15px] lg:tracking-[2.2px]">
                Verification Steps
              </h2>
            </div>

            <div className="px-4 pt-4 sm:px-6 sm:pt-5 lg:px-[31px] lg:pt-[22px]">
              <nav className="relative flex gap-3 overflow-x-auto pb-3 lg:flex lg:flex-col lg:gap-[34px] lg:overflow-visible lg:pb-0">
                <span className="absolute left-[25px] top-[20px] hidden h-[310px] w-[2.5px] rounded-full bg-[#E49E1C] lg:block" />
                {menuItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="relative z-10 min-w-[205px] sm:min-w-[225px] lg:min-w-0"
                  >
                    <div
                      className={`relative flex items-center gap-[10px] transition ${item.id === currentSection
                        ? "h-[46px] rounded-l-[4px] rounded-r-[12px] border-l-[4px] border-[#E49E1C] bg-[#042586] px-[8px] text-white shadow-[0_8px_16px_rgba(8,47,145,0.18)] lg:h-[50px]"
                        : "h-[42px] bg-transparent pl-[11px] pr-[2px] text-[#042586]"
                        }`}
                    >
                      <span
                        className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${index < currentIndex
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
                          className={`block h-[17px] w-[78px] whitespace-nowrap font-[Inter] text-[13px] font-semibold uppercase leading-[16.5px] tracking-[0.28px] ${item.id === currentSection
                            ? "text-white"
                            : "text-[#042586]"
                            }`}
                        >
                          Step {String(index + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`mt-[2px] block max-w-[170px] truncate text-[11px] font-semibold leading-[12px] ${item.id === currentSection
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
                className="mx-auto mt-5 max-w-[285px] sm:mt-6 lg:mt-8 lg:max-w-none"
              />
            </div>
          </div></div>
      </aside>

      <main className="min-w-0 bg-[#f8f6f3]">
        <header className="flex min-h-[64px] items-center justify-between gap-[10px] bg-[#042586] px-4 py-4 text-white sm:px-6 lg:h-[75px] lg:px-[48px] lg:pb-[17px] lg:pt-[18px]">
          <div className="flex min-w-0 items-center gap-2 text-[12px] font-medium leading-[16px] text-white sm:text-[14px] lg:text-[16px]">
            <span>Onboarding</span>
            <span className="mx-1 sm:mx-[10px]">›</span>
            <span className="truncate">
              {menuItems[currentIndex]?.label || "Status Status"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* <Bell size={16} className="text-white/90" /> */}
            <div className="hidden text-right sm:block">
              <p className="max-w-[95px] truncate text-right text-[14px] font-bold leading-[20px] text-white">
                {headerName}
              </p>
              <p className="mt-1 max-w-[83px] truncate text-right text-[10px] font-medium leading-[15px] text-[#FFFFFF99]">
                {headerSubtitle}
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#082f91]">
              {headerInitials}
            </span>
          </div>
        </header>

        <div className="hide-scrollbar min-h-[calc(100vh-64px)] overflow-y-auto px-4 py-6 sm:px-8 lg:h-[calc(100vh-75px)] lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default KYCStatusLayout;
