import React, { useEffect, useState } from "react";
import { IoStarSharp } from "react-icons/io5";
import { userDetails } from "../../data/userDetail";

const AuthLayout = ({
  children,
  backgroundImg = "/Img/auth-img/backgroundImg.png",
  overlayImg = "/Img/auth-img/overlayImg.png",
  userData = userDetails,
}) => {
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const activeUser = userData[currentUserIndex] || userDetails[0];

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
        <div className="grid grid-cols-1 lg:h-screen lg:grid-cols-2">
          {/* Left Panel - Dynamic Welcome Section */}
          <div className="relative h-[460px] overflow-hidden sm:h-[560px] md:h-[640px] lg:h-auto lg:min-h-0">
            <img
              src={backgroundImg}
              alt="Background"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0  flex flex-col items-center justify-evenly bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url('${overlayImg}')`,
              }}
            ></div>
            <div className="absolute inset-x-4 bottom-4 z-50 mx-auto flex w-auto max-w-[35rem] flex-col items-center text-center sm:bottom-6 md:bottom-8 lg:bottom-[6rem]">
              <div className="h-12 w-12 sm:h-14 sm:w-14">
                <img
                  src={activeUser.profileImg}
                  alt={activeUser.name}
                  className="w-full h-full rounded-full object-cover border-2 border-white"
                />
              </div>
              <h4 className="mt-2 max-w-full truncate font-inter text-lg font-bold sm:text-xl">
                {activeUser.name}
              </h4>
              <div className="mt-2 flex flex-row justify-center gap-1.5 md:mt-0 md:gap-2">
                {Array.from({ length: Math.round(activeUser.rating) }).map(
                  (_, index) => (
                    <IoStarSharp
                      key={`star-${index}`}
                      className="h-4 w-4 text-primary xl:h-6 xl:w-6"
                    />
                  ),
                )}
              </div>
              <p className="mt-2 max-w-sm px-3 py-2 text-center font-inter text-xs leading-relaxed text-black sm:px-4 md:text-sm xl:mt-5 xl:max-w-lg xl:text-base">
                "{activeUser.description}"
              </p>

              {/* ratings */}
              <div className="mt-3 sm:mt-5 md:mt-6">
                <p className="text-sm font-medium sm:text-base">
                  500+ 5 star reviews
                </p>
                <div>
                  <img
                    src="/Img/auth-img/rating.png"
                    alt="rating"
                    className="mx-auto h-auto max-w-[150px] sm:max-w-none"
                  />
                </div>
              </div>

              {/* bottom multiple users */}
              <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:mt-6 xl:mt-4 xl:flex-row xl:gap-3">
                <div className="flex flex-row items-center justify-center">
                  {userData.map((ele, index) => (
                    <div
                      key={`${ele.name}-${index}`}
                      className={index === 0 ? "" : "-ml-3"}
                    >
                      <img
                        src={ele.profileImg}
                        alt={ele.name}
                        className="h-8 w-8 rounded-full object-cover xl:h-10 xl:w-10"
                      />
                    </div>
                  ))}
                </div>
                <p className=" text-sm  sm:text-base">
                  Supporting over <span className="font-bold">3,000,000</span>{" "}
                  users worldwide
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Form Container */}
          <div className="flex justify-center bg-white p-6 sm:p-8 md:p-10 lg:items-center lg:overflow-hidden lg:p-12">
            <div className="w-full max-w-md">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
