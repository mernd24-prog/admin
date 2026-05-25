import React from "react";
import { useSelector } from "react-redux";
import { Bell, Check } from "lucide-react";
import BrandLogo from "../BrandLogo";

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
      <aside className=" bg-[#FEFEFE] shadow-[2px_2px_50px_0px_#0000001A]">
        <div className="flex h-full flex-col">
          <div className="pb-10 bg-h-auto border border-[#f8e0c1] bg-[#F4F1ED] shadow-[2px_2px_50px_0px_#0000001A]">
            <div className="flex h-[165px] items-center justify-center px-0 ">
              <BrandLogo
                src={logo}
                className="m-0 h-[112px] w-[146px] bg-white p-[10px] shadow-[0_8px_18px_rgba(78,53,23,0.18)]"
                imageClassName="p-[9px]"
              />
            </div>

            <div className=" h-[65px] w-full border-y border-[#012B6B1F] bg-[#F3E9D9] px-7 flex items-center">
              <h2 className="text-[20px] font-bold leading-[15px] tracking-[2.2px] text-[#042586] capitalize">
                Verification Steps
              </h2>
            </div>

            <div className="flex-1 px-[31px] pt-[22px]">
              <nav className="relative flex gap-3 overflow-x-auto pb-3 lg:flex lg:flex-col lg:gap-[34px] lg:overflow-visible lg:pb-0">
                <span className="absolute left-[25px] top-[20px] hidden h-[310px] w-[2.5px] rounded-full bg-[#E49E1C] lg:block" />
                {menuItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="relative z-10 min-w-[238px] lg:min-w-0"
                  >
                    <div
                      className={`relative flex items-center gap-[10px] transition ${
                        item.id === currentSection
                          ? "h-[50px] rounded-r-[12px] rounded-l-[4px] border-l-[4px] border-[#E49E1C] bg-[#042586] px-[8px] text-white shadow-[0_8px_16px_rgba(8,47,145,0.18)]"
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

              <div className="mt-8 rounded-[8px] border-[#ead9bf] bg-[#fff5df] p-4 border border-[#0425861F] bg-[#E49E1C1A]">
                <p className="text-[14px] font-bold uppercase leading-[15px] tracking-[1px] text-[#042586]">
                  Need Help?
                </p>
                <p className="mt-2 text-[12px] font-normal leading-[19.5px] text-[#042586]">
                  Our verification team is available 24/7 to help you complete
                  KYC.
                </p>
                <button
                  type="button"
                  className="mt-4 h-[32px] w-full rounded-[4px] bg-[#042586] text-[11px] font-bold text-white transition hover:bg-[#062779]"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 ">
        <header className="flex h-[75px] items-center justify-between gap-[10px] bg-[#042586] px-[48px] pt-[18px] pb-[17px] text-white">
          <div className="flex items-center gap-2 text-[16px] font-medium leading-[16px] text-white">
            <span>Onboarding</span>
            <span className="mx-[10px]">›</span>
            <span>{menuItems[currentIndex]?.label || "Status Status"}</span>
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

        <div className="hide-scrollbar h-[calc(100vh-58px)] overflow-y-auto px-4 py-6 sm:px-8 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default KYCStatusLayout;
