import React, { useEffect, useState } from "react";
import { IoStarSharp } from "react-icons/io5";
import { userDetails } from "../../data/userDetail";
import { useAuthLayout } from "../../context/AuthLayoutContext";
import { axiosPublic } from "../../_helpers/axiosProvider";

const AUTH_TESTIMONIAL_PAGE_TYPE = "auth_testimonial";

const normalizeTarget = (formType = "") =>
  String(formType || "").toLowerCase().includes("register") ? "register" : "login";

const normalizeTestimonials = (pages = [], formType = "login") => {
  const target = normalizeTarget(formType);
  return (Array.isArray(pages) ? pages : [])
    .map((page = {}) => {
      const meta = page.metadata?.data || page.metadata || {};
      const pageTarget = meta.pageTarget || "all";
      if (pageTarget !== "all" && pageTarget !== target) return null;
      return {
        profileImg: page.author?.avatar || page.image?.url || meta.avatarUrl || "/Img/auth-img/user1.jpeg",
        name: page.title || page.author?.name || meta.name || "Sam Global Customer",
        rating: Number(meta.rating || 5),
        description: page.description || page.body || meta.reviewText || "",
        googleRating: Number(meta.googleRating || 4.7),
        googleReviewCount: meta.googleReviewCount || "",
        googlePlaceUrl: meta.googlePlaceUrl || "",
      };
    })
    .filter((item) => item && item.description);
};

const AuthLayout = ({ children, backgroundImg, userData = userDetails }) => {
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [dynamicUsers, setDynamicUsers] = useState([]);
  const { formType, layoutConfig } = useAuthLayout();
  const displayUsers = dynamicUsers.length ? dynamicUsers : userData;
  const activeUser = displayUsers[currentUserIndex] || userDetails[0];

  const authBackgroundImg =
    backgroundImg ||
    layoutConfig.backgroundImg ||
    "/Img/auth-img/backgroundImg.png";

  useEffect(() => {
    if (displayUsers.length <= 1) return undefined;

    const intervalId = setInterval(() => {
      setCurrentUserIndex((prevIndex) => (prevIndex + 1) % displayUsers.length);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [displayUsers.length]);

  useEffect(() => {
    let mounted = true;
    axiosPublic
      .get("/cms", {
        params: {
          pageType: AUTH_TESTIMONIAL_PAGE_TYPE,
          published: true,
          limit: 20,
        },
      })
      .then((response) => {
        if (!mounted) return;
        const pages = response?.data?.data || [];
        setDynamicUsers(normalizeTestimonials(pages, formType));
        setCurrentUserIndex(0);
      })
      .catch(() => {
        if (mounted) setDynamicUsers([]);
      });
    return () => {
      mounted = false;
    };
  }, [formType]);

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
                {activeUser.googlePlaceUrl ? (
                  <a href={activeUser.googlePlaceUrl} target="_blank" rel="noreferrer" className="inline-flex">
                    <img
                      src="/Img/auth-img/rating.png"
                      alt={`Google average rating ${activeUser.googleRating || 4.7}`}
                      className="mx-auto h-auto max-w-[150px] sm:max-w-none"
                    />
                  </a>
                ) : (
                  <img
                    src="/Img/auth-img/rating.png"
                    alt={`Google average rating ${activeUser.googleRating || 4.7}`}
                    className="mx-auto h-auto max-w-[150px] sm:max-w-none"
                  />
                )}
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
