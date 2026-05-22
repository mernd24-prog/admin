import React from "react";
import { Check } from "lucide-react";

const KYCStatusLayout = ({
  children,
  currentSection = "status",
  backgroundImage = "/Rectangle 401.png",
  logo = "/logo.png",
  illustration = "/Img/auth-img/auth-illustration.png",
}) => {
  const menuItems = [
    { id: "personal", label: "Personal / Owner Details", active: false },
    { id: "business", label: "Business Details", active: false },
    { id: "bank", label: "Bank Details", active: false },
    { id: "review", label: "Review Details", active: false },
    { id: "status", label: "Status States", active: true },
  ];
  const currentIndex = menuItems.findIndex(
    (item) => item.id === currentSection
  );
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 lg:flex lg:h-screen lg:items-center lg:justify-center lg:overflow-hidden">
      <div className="min-h-screen w-full bg-white shadow-2xl lg:h-full lg:min-h-0 lg:overflow-hidden">
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-3">
          <div
            className="w-full bg-cover bg-center bg-no-repeat px-4 py-4 sm:px-6 lg:col-span-1 lg:ml-16 lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-evenly lg:px-0 lg:py-0"
            style={{
              backgroundImage: `url('${backgroundImage}')`,
            }}
          >
            {/* Logo Section */}
            <div className="mb-4 border-b border-amber-200 pb-4 lg:mb-8 lg:pb-6">
              <div className="mb-0 flex items-center justify-center gap-3 lg:mb-2 lg:justify-start">
                <img
                  src={logo}
                  alt="Logo"
                  className="h-auto w-28 object-contain sm:w-36 md:w-44 lg:mb-4 lg:w-52"
                />
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex w-full gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
              {menuItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`min-w-[180px] px-3 py-2 text-left transition-all sm:min-w-[210px] lg:w-full lg:min-w-0 lg:px-4 lg:py-3 ${
                    item.id === currentSection
                      ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg"
                      : "bg-white text-gray-700 hover:bg-white hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium sm:text-sm">{item.label}</span>

                    {/* Show check only for completed steps */}
                    {index < currentIndex && (
                      <Check size={16} className="text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </nav>

            {/* Info Box */}
            <div className="mt-4 hidden rounded-xl border border-amber-200 bg-white/60 p-4 sm:block lg:mt-8">
              <p className="text-xs text-gray-600">
                <strong className="text-indigo-800">Need Help?</strong>
                <br />
                Contact our support team for assistance with your KYC
                verification.
              </p>
            </div>
          </div>

          {/* Right Panel - Form Container */}
          <div className="min-w-0 bg-white px-3 sm:px-4 lg:col-span-2 lg:-ml-16 lg:flex lg:h-screen lg:items-start lg:justify-start lg:overflow-hidden lg:px-2 xl:-ml-24">
            {/* Child perfectly centered */}
            <div className="hide-scrollbar flex w-full items-start justify-start lg:h-screen lg:max-w-6xl lg:overflow-y-auto lg:pr-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYCStatusLayout;