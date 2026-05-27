import React, { useCallback, useEffect, useRef, useState } from "react";
import { logoutFunction } from "../../_helpers";
import { IoLogOutOutline } from "react-icons/io5";
import { MdOutlineMenu } from "react-icons/md";
import { FiKey, FiUser } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { getProfile, logout } from "../../Redux/userSlice";
import { Link, useLocation } from "react-router-dom";

const getDisplayName = (user = {}) => {
  const profile = user.profile || {};
  return (
    user.full_name ||
    user.fullName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    user.userName ||
    user.email?.split("@")?.[0] ||
    "User"
  );
};

const getUserInitial = (user = {}) => {
  const profile = user.profile || {};
  const name =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    getDisplayName(user) ||
    "U";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  return (
    parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.[0] || "U"
  ).toUpperCase();
};

const getAvatarUrl = (user = {}) =>
  user.profile?.avatarUrl ||
  user.avatarUrl ||
  user.user_image ||
  user.sellerProfile?.avatarUrl ||
  "";

const HEADER_ROUTE_TITLES = {
  home: "Dashboard / Default",
  orders: "Dashboard / Order > Order List",
};

const formatRouteLabel = (value = "") =>
  String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();

const getHeaderTitle = (path = "", fallback = "") => {
  const parts = path
    .replace(/^\/|\/$/g, "")
    .split("/")
    .filter(Boolean);
  const routeParts = parts[0] === "app" ? parts.slice(1) : parts;
  const lastPart = routeParts[routeParts.length - 1] || "";
  const isId = /^[a-fA-F0-9]{24}$/.test(lastPart);
  const routeKey = isId ? routeParts[routeParts.length - 2] : lastPart;

  if (HEADER_ROUTE_TITLES[routeKey]) return HEADER_ROUTE_TITLES[routeKey];
  if (routeKey) return `Dashboard / ${formatRouteLabel(routeKey)}`;
  return fallback || "Dashboard";
};

export default function Header({ handleNavbar, moduleName, hasPermanentOpen }) {
  const [openModel, setOpenModel] = useState(false);
  const dispatch = useDispatch();
  const dropDownRef = useRef(null);
  const location = useLocation();
  const currentPath = location.pathname;
  const [headerTitle, setHeaderTitle] = useState("");
  const [userData, setUserData] = useState({});
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUrl = getAvatarUrl(userData);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await dispatch(getProfile()).unwrap();
      setUserData(res?.data);
    } catch (error) {
      // Handle error here
      console.error("Failed to fetch profile:", error);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchUserData();
    setHeaderTitle(getHeaderTitle(currentPath, moduleName));
  }, [fetchUserData, moduleName, currentPath]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  const handleLogout = () => {
    logoutFunction();
    dispatch(logout());
  };

  const toggleLogoutModal = () => {
    setOpenModel(!openModel);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropDownRef.current && !dropDownRef.current.contains(event.target)) {
        setOpenModel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleProfileUpdated = (event) => {
      if (event.detail) {
        setUserData(event.detail);
      } else {
        fetchUserData();
      }
    };

    window.addEventListener("profile:updated", handleProfileUpdated);
    return () => {
      window.removeEventListener("profile:updated", handleProfileUpdated);
    };
  }, [fetchUserData]);

  return (
    <div
      className={`${hasPermanentOpen ? "flex flex-shrink-0" : "fixed top-0 left-0 right-0 flex flex-shrink-0"} z-20 h-16 bg-[#082f91] text-white shadow-[0_2px_10px_rgba(8,47,145,0.22)]`}
    >
      <div className="flex items-center justify-between flex-1 px-5 md:px-7 w-full">
        <div
          className={`flex items-center ${hasPermanentOpen ? "lg:ps-0" : "lg:ps-10 space-x-3"} ps-0`}
        >
          <button
            type="button"
            aria-label="Toggle sidebar"
            className="p-2 text-white rounded-md focus:outline-none hover:bg-white/10 lg:hidden"
            onClick={handleNavbar}
          >
            <MdOutlineMenu className="w-6 h-6" />
          </button>

          <div className="leading-tight">
            <h1 className="text-lg font-semibold px-8 capitalize font-inter  text-white">
              {headerTitle || moduleName || "Dashboard"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <div className="hidden md:block text-right leading-tight">
                <p className="max-w-32  text-[14px] font-bold font-inter text-white">
                  {getDisplayName(userData)}
                </p>
                <p className="max-w-32 truncate text-[10px] font-inter mt-[2px] font-medium capitalize text-white/60">
                  {userData?.role || "Admin"}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleLogoutModal}
                className="flex h-9 w-9 overflow-hidden items-center justify-center rounded-full border border-white/25  bg-white text-sm font-bold text-[#082f91] transition-transform hover:scale-105"
                aria-label="Open profile menu"
              >
                {avatarUrl && !avatarFailed ? (
                  <img
                    className="h-full w-full object-cover"
                    src={avatarUrl}
                    alt={getDisplayName(userData)}
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  getUserInitial(userData)
                )}
              </button>
            </div>
            <div
              className={`absolute right-0 w-64 mt-3 bg-white text-gray-900 border border-gray-100 shadow-xl rounded-lg overflow-hidden transition-all duration-300 ease-in-out ${openModel ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
              ref={dropDownRef}
            >
              {openModel && (
                <>
                  <div className="px-4 py-3 bg-[#082f91]/[0.04] border-b border-gray-100 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={toggleLogoutModal}
                      className="flex h-11 w-11 flex-shrink-0 overflow-hidden items-center justify-center rounded-full bg-[#082f91] text-base font-bold text-white transition-transform hover:scale-105"
                      aria-label="Close profile menu"
                    >
                      {avatarUrl && !avatarFailed ? (
                        <img
                          className="h-full w-full object-cover"
                          src={avatarUrl}
                          alt={getDisplayName(userData)}
                          onError={() => setAvatarFailed(true)}
                        />
                      ) : (
                        getUserInitial(userData)
                      )}
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Hi, {getDisplayName(userData)}
                      </p>
                      <p className="text-xs text-gray-500 truncate text-wrap">
                        {userData?.email}
                      </p>
                    </div>
                  </div>
                  {userData?.role_id !== 9 && (
                    <div className="py-1 text-xs px-4">
                      <Link
                        to="/app/profile"
                        className="flex items-center flex-wrap px-3.5 py-2 no-underline text-[rgba(0,0,0,0.85)] rounded font-semibold hover:bg-gray-100 hover:text-blue-600 "
                      >
                        <FiUser className="mr-3" />
                        My Profile
                      </Link>
                      <Link
                        to={`/app/changePassword`}
                        className="flex items-center flex-wrap px-3.5 py-2 no-underline text-[rgba(0,0,0,0.85)] rounded font-medium hover:bg-gray-100 hover:text-blue-600"
                      >
                        <FiKey className="mr-3" />
                        Change Password
                      </Link>
                    </div>
                  )}

                  <div className="py-1 border-t border-gray-100 text-xs px-4">
                    <p
                      className="flex items-center flex-wrap px-3.5 py-2 no-underline text-[rgba(0,0,0,0.85)] rounded font-medium hover:bg-gray-100 hover:text-blue-600"
                      onClick={handleLogout}
                    >
                      <IoLogOutOutline className="mr-3" />
                      Logout
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
