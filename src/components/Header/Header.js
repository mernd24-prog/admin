import React, { useCallback, useEffect, useRef, useState } from "react";
import { forceLogout } from "../../_helpers/authSession";
import { IoLogOutOutline } from "react-icons/io5";
import {
  MdOutlineMenu,
  MdSearch,
  MdOutlineNotificationsNone,
} from "react-icons/md";
import { FiKey, FiUser } from "react-icons/fi";
import { FcNext } from "react-icons/fc";
import { useDispatch } from "react-redux";
import { getProfile, logout } from "../../Redux/userSlice";
import { Link, useLocation } from "react-router-dom";
import { apiRequest } from "../../_helpers/apiConfig";
import { ENDPOINTS } from "../../_helpers/endpoints";
import {
  getSelectedSellerOrganizationId,
  setSelectedSellerOrganizationId,
} from "../../_helpers/sellerOrganizationContext";

const SELLER_ROLES = new Set(["seller", "seller-admin", "seller-sub-admin"]);

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
  const firstName = profile.firstName || user.firstName || "";
  const lastName = profile.lastName || user.lastName || "";

  if (firstName || lastName) {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  }

  const parts = String(getDisplayName(user) || "U")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstInitial = parts[0]?.[0] || "U";
  const lastInitial = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";

  return `${firstInitial}${lastInitial}`.toUpperCase();
};

const getAvatarUrl = (user = {}) =>
  user.profile?.avatarUrl ||
  user.avatarUrl ||
  user.user_image ||
  user.sellerProfile?.avatarUrl ||
  "";

const HEADER_ROUTE_TITLES = {
  home: "Dashboard",
  orders: "Orders",
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
  if (routeKey) return formatRouteLabel(routeKey);
  return fallback || "Dashboard";
};

export default function Header({
  handleNavbar,
  moduleName,
  hasPermanentOpen,
  isSidebarExpanded,
}) {
  const [openModel, setOpenModel] = useState(false);
  const dispatch = useDispatch();
  const dropDownRef = useRef(null);
  const location = useLocation();
  const currentPath = location.pathname;
  const [headerTitle, setHeaderTitle] = useState("");
  const [userData, setUserData] = useState({});
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState(getSelectedSellerOrganizationId());
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

  useEffect(() => {
    if (!SELLER_ROLES.has(userData?.role)) {
      setOrganizations([]);
      return;
    }

    let active = true;
    apiRequest("GET", ENDPOINTS.sellers.myOrganizations, { limit: 100 })
      .then((response) => {
        if (!active) return;
        const data = response?.data?.data || response?.normalized?.data || response?.data || {};
        const list = (data.organizations || data.items || data.list || []).filter(
          (item) =>
            ["approved", "active"].includes(item.approvalStatus) &&
            item.kycStatus === "verified" &&
            item.bankVerificationStatus === "verified" &&
            item.goLiveStatus === "live",
        );
        setOrganizations(list);
        const stored = getSelectedSellerOrganizationId();
        const existing = list.some((item) => String(item.id || item.organizationId) === stored);
        const fallback = list.find((item) => item.isDefault) || list[0];
        const nextId = existing
          ? stored
          : String(fallback?.id || fallback?.organizationId || "");
        setSelectedOrganizationIdState(nextId);
        if (nextId !== stored) setSelectedSellerOrganizationId(nextId);
      })
      .catch(() => {
        if (active) setOrganizations([]);
      });

    return () => { active = false; };
  }, [userData?.role]);

  const handleLogout = () => {
    forceLogout("Logged out");
    dispatch(logout());
  };

  const handleOrganizationChange = (event) => {
    const value = event.target.value;
    setSelectedOrganizationIdState(value);
    setSelectedSellerOrganizationId(value);
    window.setTimeout(() => window.location.reload(), 0);
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
      className={`${hasPermanentOpen ? "flex flex-shrink-0" : "fixed top-0 left-0 right-0 flex flex-shrink-0"} z-20 h-[58px] bg-[var(--admin-shell)] text-[var(--admin-ink)]`}
    >
      <div className="flex items-center justify-between flex-1 px-4 md:px-5 w-full gap-4">
        {/* Left: menu toggle + title */}
        <div
          className={`flex items-center gap-3 min-w-0 ${hasPermanentOpen ? "" : "lg:pl-1"}`}
        >
          <button
            type="button"
            aria-label={isSidebarExpanded ? "Sidebar open" : "Sidebar closed"}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#eadcc3] bg-white text-[var(--admin-blue)] transition hover:border-[var(--admin-blue)] hover:bg-white focus:outline-none"
            onClick={handleNavbar}
          >
            {isSidebarExpanded ? (
              <MdOutlineMenu className="h-5 w-5" />
            ) : (
              <FcNext className="h-5 w-5" />
            )}
          </button>

          <div className="leading-tight min-w-0 ">
            <h1 className="text-[13px] font-semibold capitalize font-inter text-[var(--admin-ink)] truncate">
              {headerTitle || moduleName || "Dashboard"}
            </h1>
          </div>
        </div>

        {/* Center: search bar */}
        <div className="hidden md:flex flex-1 max-w-[325px]">
          <div className="header-search-pill group relative w-full">
            <MdSearch
              size={14}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--admin-ink)] transition-colors group-hover:text-[var(--admin-blue)] group-focus-within:text-[var(--admin-blue)]"
            />
            <input
              type="text"
              placeholder="Search"
              className="admin-input admin-header-search-input"
            />
          </div>
        </div>

        {/* Right: user profile */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--admin-line)] bg-white text-[var(--admin-blue)] transition hover:border-[var(--admin-blue)] hover:bg-[var(--admin-blue-soft)]"
          >
            <MdOutlineNotificationsNone size={18} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--admin-danger)]" />
          </button>
          {SELLER_ROLES.has(userData?.role) && organizations.length > 0 && (
            <select
              className="hidden min-h-[36px] max-w-[220px] rounded-md border border-[var(--admin-line)] bg-white px-3 text-xs font-medium text-[var(--admin-ink)] outline-none focus:border-[var(--admin-blue)] md:block"
              value={selectedOrganizationId}
              onChange={handleOrganizationChange}
              title="Organization"
            >
              {organizations.map((organization) => (
                <option key={organization.id || organization.organizationId} value={organization.id || organization.organizationId}>
                  {organization.storeDisplayName || organization.legalBusinessName || organization.id || organization.organizationId}
                </option>
              ))}
            </select>
          )}
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <div className="hidden md:block text-right leading-tight">
                <p className="max-w-44 text-[12px] font-bold font-inter text-[var(--admin-ink)] truncate">
                  {getDisplayName(userData)}
                </p>
                <p className="truncate text-[10px] font-inter mt-[1px] font-medium text-[var(--admin-muted)]">
                  {userData?.email || userData?.role || "Admin"}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleLogoutModal}
                className="flex h-9 w-9 overflow-hidden items-center justify-center rounded-full border border-[var(--admin-line)] bg-[var(--admin-blue-soft)] text-sm font-bold text-[var(--admin-navy)] transition hover:border-[var(--admin-gold)]"
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
              className={`absolute right-0 w-64 mt-3 bg-white text-gray-900 border border-[var(--admin-line)] shadow-xl rounded-lg overflow-hidden transition-all duration-300 ease-in-out ${openModel ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
              ref={dropDownRef}
            >
              <div className="px-4 py-3 bg-[var(--admin-shell)] border-b border-[var(--admin-line)] flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleLogoutModal}
                  className="flex h-11 w-11 flex-shrink-0 overflow-hidden items-center justify-center rounded-full bg-[var(--admin-blue-soft)] text-base font-bold text-[var(--admin-navy)] transition hover:ring-2 hover:ring-[var(--admin-gold)]/30"
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
                    className="flex items-center flex-wrap px-3.5 py-2 no-underline text-gray-700 rounded font-semibold hover:bg-gray-50 hover:text-[var(--admin-gold)]"
                  >
                    <FiUser className="mr-3" />
                    Profile
                  </Link>
                  <Link
                    to={`/app/changePassword`}
                    className="flex items-center flex-wrap px-3.5 py-2 no-underline text-gray-700 rounded font-medium hover:bg-gray-50 hover:text-[var(--admin-gold)]"
                  >
                    <FiKey className="mr-3" />
                    Change Password
                  </Link>
                </div>
              )}

              <div className="py-1 border-t border-gray-100 text-xs px-4">
                <p
                  className="flex items-center flex-wrap px-3.5 py-2 no-underline text-gray-700 rounded font-medium hover:bg-gray-50 hover:text-red-500 cursor-pointer"
                  onClick={handleLogout}
                >
                  <IoLogOutOutline className="mr-3" />
                  Logout
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
