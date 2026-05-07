import React from 'react';
import { Check } from 'lucide-react';

const KYCStatusLayout = ({ children, currentSection = 'status', backgroundImage = "/Rectangle 401.png", logo = "/logo.png",
  illustration = "/Img/auth-img/auth-illustration.png", }) => {
  const menuItems = [
    { id: 'personal', label: 'Personal / Owner Details', active: false },
    { id: 'business', label: 'Business Details', active: false },
    { id: 'bank', label: 'Bank Details', active: false },
    { id: 'review', label: 'Review Details', active: false },
    { id: 'status', label: 'Status States', active: true }
  ];
  const currentIndex = menuItems.findIndex(
    (item) => item.id === currentSection
  );
  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center">
      <div className="w-full h-full bg-white shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-screen">

          <div
            className="w-1/2 lg:col-span-1  flex flex-col items-center justify-evenly bg-cover bg-center bg-no-repeat ml-0 sm:ml-6 md:ml-10 lg:ml-16"
            style={{
              backgroundImage: `url('${backgroundImage}')`,
            }}
          >

            {/* Logo Section */}
            <div className="mb-8 pb-6 border-b border-amber-200">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                <img
                  src={logo}
                  alt="Logo"
                  className="w-28 sm:w-36 md:w-44 lg:w-52 h-auto mb-4 object-contain"
                />
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-2 w-full">
              {menuItems.map((item, index) => (
                <p
                  key={item.id}
                  className={`w-full text-left px-4 py-3   transition-all ${item.id === currentSection
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-white hover:shadow-md'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.label}</span>

                    {/* ✅ Show check only for completed steps */}
                    {index < currentIndex && (
                      <Check size={16} className="text-green-600" />
                    )}
                  </div>
                </p>
              ))}
            </nav>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-white/60 rounded-xl border border-amber-200">
              <p className="text-xs text-gray-600">
                <strong className="text-indigo-800">Need Help?</strong>
                <br />
                Contact our support team for assistance with your KYC verification.
              </p>
            </div>
          </div>

          {/* Right Panel - Form Container */}
          <div className="lg:col-span-2 bg-white flex items-center justify-center px-6 sm:px-8 md:px-10 lg:px-16">
            {/* Child perfectly centered */}
            <div className="w-full max-w-4xl flex items-center justify-center">
              {children}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default KYCStatusLayout;

