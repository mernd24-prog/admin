import { Bell, Check } from "lucide-react";

const KYCStatusLayout = ({
  children,
  currentSection = "status",
  logo = "/logo.png",
}) => {
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
    <div className="min-h-screen bg-[#f6f3ef] font-inter text-[#17213a] lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="border-r border-[#e8dfd1] bg-[#f4eee4] shadow-[8px_0_24px_rgba(35,31,27,0.06)]">
        <div className="flex h-full flex-col">
          <div className="flex justify-center border-b border-[#e4d7c5] px-6 py-7">
            <div className="flex h-[88px] w-[118px] items-center justify-center rounded-[8px] border border-[#ead9bf] bg-white shadow-[0_8px_22px_rgba(35,31,27,0.08)]">
              <img
                src={logo}
                alt="Sam Global"
                className="max-h-[62px] max-w-[92px] object-contain"
              />
            </div>
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
          </div>
        </div>
      </aside>

      <main className="min-w-0 ">
        <header className="flex h-[58px] items-center justify-between bg-[#082f91] px-4 text-white shadow-[0_8px_24px_rgba(8,47,145,0.16)] sm:px-8">
          <div className="flex items-center gap-2 text-[12px] font-medium">
            <span>Onboarding</span>
            <span className="text-white/50">›</span>
            <span className="text-white/90">
              {menuItems[currentIndex]?.label || "Status Status"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Bell size={16} className="text-white/90" />
            <div className="hidden text-right sm:block">
              <p className="text-[12px] font-bold leading-none">
                Seller Account
              </p>
              <p className="mt-1 text-[9px] text-white/70">Vendor Applicant</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#082f91]">
              SG
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
