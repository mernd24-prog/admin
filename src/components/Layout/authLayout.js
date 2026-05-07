import React from "react";

const AuthLayout = ({
  children,
  title = "Welcome Back, Seller",
  subtitle = "Login to manage your store and orders",
  logo = "/logo.png",
  illustration = "/Img/auth-img/auth-illustration.png",
  backgroundImage = "/Rectangle 401.png",
}) => {
  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center">
      <div className="w-full h-full bg-white shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 h-full">

          {/* Left Panel - Dynamic Welcome Section */}
          <div
            className="p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col items-center justify-evenly bg-cover bg-center bg-no-repeat ml-0 sm:ml-6 md:ml-10 lg:ml-16"
            style={{
              backgroundImage: `url('${backgroundImage}')`,
            }}
          >
            {/* Logo Section */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="flex items-center justify-center ">
                <img
                  src={logo}
                  alt="Logo"
                  className="w-28 sm:w-36 md:w-44 lg:w-52 h-auto mb-4 object-contain"
                />
              </div>
            {/* Dynamic Welcome Message */}
            <div className="text-center mb-6 sm:mb-8 px-2">
              <h3 className="text-lg sm:text-1xl md:text-2xl font-semibold text-gray-800 mb-3 mt-5">
                {title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                {subtitle}
              </p>
            </div>
            </div>


            {/* Dynamic Illustration */}
            <div className="w-full max-w-[280px] sm:max-w-sm md:max-w-md">
              <img
                src={illustration}
                alt="Authentication Illustration"
                className="w-full h-auto max-h-[350px] object-contain"
              />
            </div>
          </div>

          {/* Right Panel - Form Container */}
          <div className="bg-white p-6 sm:p-8 md:p-10 lg:p-12 flex items-center justify-center overflow-hidden">
            <div className="w-full max-w-md">
              {children}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AuthLayout;