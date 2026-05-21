// 

import React from "react";

const FormLayout = ({
  title,
  subTitle,
  children,
  sideImage,
  sideContent,
}) => {
  return (
    <div className="min-h-screen flex bg-[#F8F6F2]">
      
      {/* LEFT SECTION */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center bg-gradient-to-br from-[#F5E6D3] to-[#F9F7F3] overflow-hidden">
        
        {/* Background Decorative Shapes */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/40 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#E8D4BC]/40 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-md text-center px-8">
          
          {/* Illustration */}
          {sideImage && (
            <img
              src={sideImage}
              alt="Auth Visual"
              className="w-full max-w-[340px] mx-auto object-contain"
            />
          )}

          {/* Optional Content */}
          {sideContent && (
            <div className="mt-8">
              {sideContent}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        
        {/* CARD */}
        <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-6 sm:p-10">
          
          {/* LOGO */}
          <div className="flex justify-center mb-6">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-12 object-contain"
            />
          </div>

          {/* HEADING */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#0A1B52]">
              {title}
            </h2>

            <p className="text-sm text-[#6B7280] mt-3 leading-6">
              {subTitle}
            </p>
          </div>

          {/* FORM */}
          <form className="space-y-5">
            {children}
          </form>

          {/* FOOTER */}
          <div className="mt-8 text-center text-sm text-[#6B7280]">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              className="text-[#C89B5E] font-semibold hover:underline"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormLayout;