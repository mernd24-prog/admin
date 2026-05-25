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
    { id: "status", label: "Status States" },
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

          <div className="border-b border-[#e4d7c5] px-7 py-5">
            <h2 className="text-[17px]  font-bold tracking-[0.08em] text-[#082f91]">
              Verification Steps
            </h2>
          </div>

          <div className="flex-1 px-6 py-6">
            <nav className="flex gap-3 overflow-x-auto pb-3 lg:block lg:space-y-5 lg:overflow-visible lg:pb-0">
              {menuItems.map((item, index) => (
                <div
                  key={item.id}
                  className="relative min-w-[190px] lg:min-w-0"
                >
                  {index < menuItems.length - 1 && (
                    <span className="absolute left-[15px] top-8 hidden h-8 w-px bg-[#9db2e4] lg:block" />
                  )}
                  <div
                    className={`relative flex items-center gap-3 rounded-[8px] px-3 py-3 transition ${
                      item.id === currentSection
                        ? "bg-[#082f91] text-white shadow-[0_8px_16px_rgba(8,47,145,0.18)]"
                        : "text-[#082f91] hover:bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                        index < currentIndex
                          ? "border-[#082f91] bg-white text-[#082f91]"
                          : item.id === currentSection
                            ? "border-[#f2b01e] bg-[#f2b01e] text-white"
                            : "border-[#082f91] bg-white text-[#082f91]"
                      }`}
                    >
                      {index < currentIndex ? (
                        <Check size={14} />
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-[0.08em]">
                        Step {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] font-semibold leading-tight">
                        {item.label}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-8 rounded-[8px] border border-[#ead9bf] bg-[#fff5df] p-4">
              <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-[#082f91]">
                Need Help?
              </p>
              <p className="mt-2 text-[11px] leading-5 text-[#43506a]">
                Our verification team is available 24/7 to help you complete
                KYC.
              </p>
              <button
                type="button"
                className="mt-4 h-[32px] w-full rounded-[4px] bg-[#082f91] text-[11px] font-bold text-white transition hover:bg-[#062779]"
              >
                Contact Support
              </button>
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
                      className={`relative flex items-center gap-[10px] transition ${item.id === currentSection
                        ? "h-[50px] rounded-r-[12px] rounded-l-[4px] border-l-[4px] border-[#E49E1C] bg-[#042586] px-[8px] text-white shadow-[0_8px_16px_rgba(8,47,145,0.18)]"
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

              <div className="mt-8 rounded-[8px] border-[#ead9bf] bg-[#fff5df] p-4 border border-[#0425861F] bg-[#E49E1C1A]" >
                <p className="text-[14px] font-bold uppercase leading-[15px] tracking-[1px] text-[#042586]">
                  Need Help?
                </p>
                <p className="mt-2 text-[12px] font-normal leading-[19.5px] text-[#042586]">
                  Our verification team is available 24/7 to help you complete KYC.
                </p>
                <button
                  type="button"
                  className="mt-4 h-[32px] w-full rounded-[4px] bg-[#042586] text-[11px] font-bold text-white transition hover:bg-[#062779]"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </div></div></div>
      </aside>

      <main className="min-w-0 ">
        <header className="flex h-[58px] items-center justify-between bg-[#082f91] px-4 text-white shadow-[0_8px_24px_rgba(8,47,145,0.16)] sm:px-8">
          <div className="flex items-center gap-2 text-[12px] font-medium">
            <span>Onboarding</span>
            <span className="mx-[10px]">›</span>
            <span>
              {menuItems[currentIndex]?.label || "Status Status"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* <Bell size={16} className="text-white/90" /> */}
            <div className="hidden text-right sm:block">
              <p className="text-[12px] font-bold leading-none">
                Seller Account
              </p>
              <p className="mt-1 text-[9px] text-white/70">Vendor Applicant</p>
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
