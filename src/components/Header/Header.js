import React, { useCallback, useEffect, useRef, useState } from "react";
import { logoutFunction } from "../../_helpers";
import { IoLogOutOutline } from "react-icons/io5";
import { MdOutlineMenu } from 'react-icons/md';
import { FiUser, FiKey } from 'react-icons/fi';
import { useDispatch } from "react-redux";
import { getProfile, logout } from '../../Redux/userSlice';
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

const getAvatarUrl = (user = {}) =>
  user.user_image ||
  user.avatarUrl ||
  user.profile?.avatarUrl ||
  user.sellerProfile?.avatarUrl ||
  "/Img/user.png";

const getHeaderDescription = (path = "") => {
  if (path.includes("/country")) {
    return "View and manage countries used across platform dropdowns, tax setup, and addresses.";
  }
  if (path.includes("/state")) {
    return "View and manage states linked to active countries across the platform.";
  }
  if (path.includes("/city")) {
    return "View and manage cities linked to active states across the platform.";
  }
  if (path.includes("/store")) {
    return "View and manage all the seller's registered shops (stores) on the platform.";
  }
  if (path.includes("/subTax")) {
    return "View and manage sub tax components linked to tax groups.";
  }
  if (path.includes("/order-status")) {
    return "View and manage the order status workflow shown across order management.";
  }
  if (path.includes("/tax")) {
    return "View and manage tax groups, countries, and tax rules.";
  }
  if (path.includes("/product-reviews")) {
    return "View and moderate customer reviews submitted for products.";
  }
  if (path.includes("/discount-coupons")) {
    return "View and manage coupon codes, discount values, limits, validity, and status.";
  }
  return "View and manage platform records from this section.";
};

export default function Header({ handleNavbar, moduleName, hasPermanentOpen }) {
  const [openModel, setOpenModel] = useState(false);
  const dispatch = useDispatch();
  const dropDownRef = useRef(null);
  const location = useLocation();
  const currentPath = location.pathname;
  const [headerTitle, setHeaderTitle] = useState('');
  const [userData, setUserData] = useState({})


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
    fetchUserData()
    const formatPathName = (path) => {
      const parts = path.replace(/^\/|\/$/g, '').split('/');

      const lastPart = parts[parts.length - 1];
      const isId = /^[a-fA-F0-9]{24}$/.test(lastPart);

      const targetPart = isId ? parts[parts.length - 2] : lastPart;

      return targetPart
        .replace(/[^a-zA-Z]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())
        .trim();
    };

    if (currentPath) {
      const fallbackTitle = formatPathName(currentPath);
      setHeaderTitle(fallbackTitle);
    } else {
      setHeaderTitle(moduleName);
    }
  }, [fetchUserData, moduleName, currentPath]);

  const handleLogout = () => {
    logoutFunction();
    dispatch(logout());
  }

  const toggleLogoutModal = () => {
    setOpenModel(!openModel);
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropDownRef.current && !dropDownRef.current.contains(event.target)) {
        setOpenModel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

    window.addEventListener('profile:updated', handleProfileUpdated);
    return () => {
      window.removeEventListener('profile:updated', handleProfileUpdated);
    };
  }, [fetchUserData]);



  return (
    <div className={`${hasPermanentOpen ? "bg-white text-black flex flex-shrink-0 h-16 " : "fixed top-0 left-0 right-0 flex flex-shrink-0 h-16 bg-white bg-opacity-40 backdrop-blur-sm"}  z-20  `}>
      <div className="flex items-center justify-between flex-1 px-6 w-full">

        <div className={`flex items-center  ${hasPermanentOpen ? "lg:ps-0" : "lg:ps-10 space-x-4"}  ps-0`}>
          <button
            className="p-2 text-gray-700 rounded-md focus:outline-none md:hidden"
            onClick={handleNavbar}
          >
            <MdOutlineMenu className="w-6 h-6" />
          </button>

          <div>
            <h1 className="text-xl font-semibold text-gray-900 capitalize">{headerTitle}</h1>
            <p className="text-xs text-gray-500 md:block hidden">{getHeaderDescription(currentPath)}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">

          <div className="relative">
            <div className="flex gap-2">
              <div>
                <img
                  className="object-contain w-10 h-10 rounded-full cursor-pointer transition-transform hover:scale-105"
                  src={getAvatarUrl(userData)}
                  alt="Profile"
                  onClick={toggleLogoutModal}
                />
              </div>
            </div>
            <div
              className={`absolute right-0 w-64 mt-2 bg-white border border-gray-200 shadow-lg rounded-md transition-all duration-300 ease-in-out ${openModel ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
              ref={dropDownRef}
            >
              {openModel && (
                <>
                  <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center gap-3">
                    <img
                      className="object-contain w-12 h-12 rounded cursor-pointer transition-transform hover:scale-105"
                      src={getAvatarUrl(userData)}

                      alt="Profile"
                      onClick={toggleLogoutModal}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Hi, {getDisplayName(userData)}</p>
                      <p className="text-xs text-gray-500 truncate text-wrap">{userData?.email}</p>
                    </div>
                  </div>
                  {userData?.role_id !== 9 && (
                    <div className="py-1 text-xs px-4">
                      <Link to="/app/profile" className="flex items-center flex-wrap px-3.5 py-2 no-underline text-[rgba(0,0,0,0.85)] rounded font-semibold hover:bg-gray-100 hover:text-blue-600 ">
                        <FiUser className="mr-3" />
                        My Profile
                      </Link>
                      <Link to={`/app/changePassword`} className="flex items-center flex-wrap px-3.5 py-2 no-underline text-[rgba(0,0,0,0.85)] rounded font-medium hover:bg-gray-100 hover:text-blue-600">
                        <FiKey className="mr-3" />
                        Change Password
                      </Link>
                    </div>
                  )}


                  <div className="py-1 border-t border-gray-100 text-xs px-4">
                    <p className="flex items-center flex-wrap px-3.5 py-2 no-underline text-[rgba(0,0,0,0.85)] rounded font-medium hover:bg-gray-100 hover:text-blue-600" onClick={handleLogout}>
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
