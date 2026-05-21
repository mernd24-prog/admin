import React from "react";
import { FaStar } from "react-icons/fa";

const AuthLayout = ({
  children,
  illustration = "/Img/auth-img/auth-illustration.png",
  backgroundImage = "/Rectangle 401.png",
}) => {
  return (
    <div className="h-screen overflow-hidden bg-white">
      <div className="grid h-full grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-[#fff8f0] lg:block">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('${backgroundImage}')`,
            }}
          />

          <div className="relative z-10 flex h-full flex-col items-center justify-center px-10">
            <div className="relative flex w-full max-w-[470px] flex-col items-center">
              <img
                src={illustration}
                alt="Sam Global growth illustration"
                className="mb-[-18px] w-full max-w-[430px] object-contain"
              />

              <div className="relative z-20 flex flex-col items-center text-center">
                <div className="mb-2 h-9 w-9 overflow-hidden rounded-full border-2 border-white shadow-[0_5px_14px_rgba(25,25,25,0.16)]">
                  <img
                    src="/Img/1.jpeg"
                    alt="Samantha Green"
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-[12px] font-semibold leading-none text-[#0f172a]">
                  Samantha Green
                </p>
                <div className="mt-2 flex items-center gap-[2px] text-[#f5b521]">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <FaStar key={star} size={12} />
                  ))}
                </div>
                <p className="mt-4 max-w-[330px] text-center text-[13px] leading-[19px] text-[#4f5565]">
                  Sam Global truly exceeded my expectations. I started by
                  exploring a few products, and soon I found myself shopping
                  across multiple categories with ease. The platform feels
                  smooth, reliable, and convenient, and it's great knowing that
                  Sam Global connects buyers with quality products and trusted
                  sellers in one place.
                </p>
                <div className="mt-4 rounded-md bg-white px-3 py-1 shadow-[0_8px_20px_rgba(25,25,25,0.08)]">
                  <span className="text-[10px] font-semibold text-[#4285f4]">
                    G
                  </span>
                  <span className="ml-1 text-[9px] font-medium text-[#555]">
                    Google rating
                  </span>
                </div>
                <p className="mt-7 text-[11px] font-medium text-[#111827]">
                  Supporting over 3,000,000 users worldwide
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-full items-center justify-center overflow-hidden bg-[#f3f0ec]">
          <div className="h-full w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
