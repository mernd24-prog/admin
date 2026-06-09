import React, { useEffect, useState } from "react";
import { IoStarSharp } from "react-icons/io5";
import { userDetails } from "../../data/userDetail";
import { useAuthLayout } from "../../context/AuthLayoutContext";

const AuthLayout = ({ children, backgroundImg, userData = userDetails }) => {
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const activeUser = userData[currentUserIndex] || userDetails[0];
  const { formType, layoutConfig } = useAuthLayout();

  const authBackgroundImg =
    backgroundImg ||
    layoutConfig.backgroundImg ||
    "/Img/auth-img/backgroundImg.png";

  useEffect(() => {
    if (userData.length <= 1) return undefined;

    const intervalId = setInterval(() => {
      setCurrentUserIndex((prevIndex) => (prevIndex + 1) % userData.length);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [userData.length]);

  return (
    <div className="min-h-screen flex justify-center bg-white lg:items-center">
      <div className="w-full bg-white shadow-2xl lg:min-h-screen">
        <div className="grid grid-cols-1 lg:h-screen lg:grid-cols-[40%_60%]">
          {/* Left Panel - Dynamic Welcome Section */}
          <div className=" lg:block hidden relative h-[460px] overflow-hidden bg-white sm:h-[560px] md:h-[640px] lg:h-auto lg:min-h-0">
            <img
              src={authBackgroundImg}
              alt="Background"
              className="  z-0 h-full w-full object-cover "
            />

            <div className="absolute inset-x-4  z-20 mx-auto flex w-auto max-w-[45rem]  flex-col items-center text-center   bottom-4  3xl:bottom-[6.9rem]">
              <div className="h-12 w-12 sm:h-14 sm:w-14">
                <img
                  src={activeUser.profileImg}
                  alt={activeUser.name}
                  className="w-full h-full rounded-full object-cover border-2 border-white"
                />
              </div>
              <h4 className="mt-2 max-w-full text-[#1B1D60] truncate font-inter text-lg font-bold sm:text-xl">
                {activeUser.name}
              </h4>
              <div className="mt-2 flex flex-row justify-center   md:mt-0 gap-1">
                {Array.from({ length: Math.round(activeUser.rating) }).map(
                  (_, index) => (
                    <IoStarSharp
                      key={`star-${index}`}
                      className="h-6 w-6 text-[#FFBB00]  fill-current stroke-current"
                    />
                  ),
                )}
              </div>
              <p className="mt-2 w-full px-3 py-2 text-center font-inter   text-black sm:px-4 text-xs xl:mt-2  3xl:mt-6  xl:text-base  h-[7rem] xl:h-[9rem]">
                "{activeUser.description}"
              </p>

              {/* ratings */}

              <div className="mt-3">
                <img
                  src="/Img/auth-img/rating.png"
                  alt="rating"
                  className="mx-auto h-auto max-w-[150px] sm:max-w-none"
                />
              </div>
            </div>
          </div>

          {/* Right Panel - Form Container */}
          <div className="flex justify-center bg-[#F7F8FC]  p-6 sm:p-8 md:p-10 lg:items-center lg:overflow-hidden lg:p-12">
            <div
              className={
                formType === "verificationComplete" ||
                formType === "registerVerification" ||
                formType === "register"
                  ? "w-full max-w-[58rem]"
                  : "w-full max-w-[480px]"
              }
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
