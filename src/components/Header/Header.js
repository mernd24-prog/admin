import React, { useCallback, useEffect, useRef, useState } from "react";
import { forceLogout } from "../../_helpers/authSession";
import { IoLogOutOutline } from "react-icons/io5";
import {
  MdOutlineMenu,
  MdSearch,
  MdOutlineNotificationsNone,
  MdInfoOutline,
} from "react-icons/md";
import { FiKey, FiUser } from "react-icons/fi";
import { FcNext } from "react-icons/fc";
import { useDispatch, useSelector } from "react-redux";
import { getProfile, logout } from "../../Redux/userSlice";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../../_helpers/apiConfig";
import { ENDPOINTS } from "../../_helpers/endpoints";
import {
  getMyNotifications,
  isNotificationUnread,
  setNotificationsSeenAt,
} from "../../Redux/notificationsSlice";
import { AUTH_ROUTES } from "../../pages/auth/authRoutes";
import {
  getSelectedSellerOrganizationId,
  setSelectedSellerOrganizationId,
} from "../../_helpers/sellerOrganizationContext";
import Tooltip from "../Atoms/tooltip/Tooltip";

const SELLER_ROLES = new Set(["seller", "seller-admin", "seller-sub-admin"]);
const REVIEW_LOCKED_APPROVAL_STATUSES = new Set([
  "pending_review",
  "resubmitted",
]);
const REVIEW_LOCKED_KYC_STATUSES = new Set(["submitted", "under_review"]);
const REVIEW_LOCKED_BANK_STATUSES = new Set(["submitted"]);

const hasCompleteReviewDetails = (item = {}) => {
  const documents = item.documents || {};
  const bankDetails = item.bankDetails || {};
  const pickupAddress = item.pickupAddress || {};
  const billingAddress = item.billingAddress || item.businessAddress || {};
  const hasText = (value) => String(value || "").trim().length > 0;

  return (
    hasText(item.legalBusinessName) &&
    hasText(item.businessType) &&
    hasText(item.supportEmail) &&
    hasText(item.supportPhone) &&
    hasText(item.gstin) &&
    hasText(item.pan) &&
    hasText(item.aadhaarNumber) &&
    hasText(pickupAddress.line1) &&
    hasText(pickupAddress.city) &&
    hasText(pickupAddress.state) &&
    hasText(pickupAddress.postalCode) &&
    hasText(billingAddress.line1 || pickupAddress.line1) &&
    hasText(billingAddress.city || pickupAddress.city) &&
    hasText(billingAddress.state || pickupAddress.state) &&
    hasText(billingAddress.postalCode || pickupAddress.postalCode) &&
    hasText(bankDetails.accountHolderName) &&
    hasText(bankDetails.accountNumber) &&
    hasText(bankDetails.ifscCode) &&
    hasText(bankDetails.bankName) &&
    hasText(documents.panDocumentUrl) &&
    hasText(documents.gstCertificateUrl) &&
    hasText(documents.aadhaarFrontUrl) &&
    hasText(documents.aadhaarBackUrl) &&
    hasText(documents.addressProofUrl) &&
    hasText(documents.bankProofUrl)
  );
};

const isOrganizationUnderReview = (item = {}) =>
  hasCompleteReviewDetails(item) &&
  (REVIEW_LOCKED_APPROVAL_STATUSES.has(String(item.approvalStatus || "")) ||
    REVIEW_LOCKED_KYC_STATUSES.has(String(item.kycStatus || "")) ||
    REVIEW_LOCKED_BANK_STATUSES.has(String(item.bankVerificationStatus || "")));

const getIncompleteOrganizationRoute = (item = {}) => {
  if (isOrganizationUnderReview(item)) return AUTH_ROUTES.SELLER_STATUS_PENDING;
  const organizationId = item.id || item.organizationId || "";
  return `${AUTH_ROUTES.ONBOARDING}${organizationId ? `?organizationId=${organizationId}` : ""}`;
};

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
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const isNotificationsPage =
    currentPath === "/app/notifications" ||
    currentPath.startsWith("/app/notifications/");
  const [suppressNotificationBadge, setSuppressNotificationBadge] = useState(
    isNotificationsPage,
  );
  const [headerTitle, setHeaderTitle] = useState("");
  const [userData, setUserData] = useState({});
  const [, setOrganizations] = useState([]);
  const [, setIncompleteOrgs] = useState([]);
  const [showIncompletePopup, setShowIncompletePopup] = useState(false);
  const [pendingIncompleteOrg] = useState(null);
  const [, setSelectedOrganizationIdState] = useState(
    getSelectedSellerOrganizationId(),
  );
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUrl = getAvatarUrl(userData);
  const notificationsSelector = useSelector(
    (state) => state.notifications || {},
  );
  const notificationsPayload = notificationsSelector.notificationsData || {};
  const notificationsList =
    notificationsPayload?.data?.list ||
    notificationsPayload?.normalized?.data?.list ||
    notificationsPayload?.normalized?.list ||
    notificationsPayload?.data?.notifications ||
    [];

  const notificationsSeenAt = useSelector(
    (state) => state.notifications.notificationsSeenAt,
  );
  const readNotificationIds = useSelector(
    (state) => state.notifications.readNotificationIds || [],
  );

  useEffect(() => {
    const loadNotifications = () =>
      dispatch(getMyNotifications({ page: 1, limit: 20 })).catch(() => {});
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 15_000);
    return () => window.clearInterval(intervalId);
  }, [dispatch]);

  const unreadCount = (() => {
    try {
      if (!Array.isArray(notificationsList)) return 0;

      return notificationsList.filter((notification) =>
        isNotificationUnread(
          notification,
          readNotificationIds,
          notificationsSeenAt,
        )
      ).length;
    } catch (err) {
      return 0;
    }
  })();

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
    setSuppressNotificationBadge(isNotificationsPage);
  }, [isNotificationsPage]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleOrganizationChanged = (event) => {
      setSelectedOrganizationIdState(
        event?.detail?.organizationId || getSelectedSellerOrganizationId(),
      );
    };
    window.addEventListener(
      "seller:organizationChanged",
      handleOrganizationChanged,
    );
    return () => {
      window.removeEventListener(
        "seller:organizationChanged",
        handleOrganizationChanged,
      );
    };
  }, []);

  useEffect(() => {
    if (!SELLER_ROLES.has(userData?.role)) {
      setOrganizations([]);
      setIncompleteOrgs([]);
      return;
    }

    let active = true;
    apiRequest("GET", ENDPOINTS.sellers.myOrganizations, { limit: 100 })
      .then((response) => {
        if (!active) return;
        const data =
          response?.data?.data ||
          response?.normalized?.data ||
          response?.data ||
          {};
        const allOrgs = data.organizations || data.items || data.list || [];
        const isApprovedOrg = (item) =>
          item.canSell === true ||
          (["approved", "active"].includes(item.approvalStatus) &&
            item.kycStatus === "verified" &&
            item.bankVerificationStatus === "verified" &&
            !["blocked", "rejected"].includes(String(item.goLiveStatus || "")));
        const approvedOrgs = allOrgs.filter(isApprovedOrg);
        const incomplete = allOrgs.filter((item) => !isApprovedOrg(item));
        setOrganizations(approvedOrgs);
        setIncompleteOrgs(incomplete);

        // Redirect when no organization is approved; submitted orgs stay on status.
        if (approvedOrgs.length === 0 && incomplete.length > 0) {
          if (!currentPath.startsWith("/seller/")) {
            navigate(getIncompleteOrganizationRoute(incomplete[0]), {
              replace: true,
            });
          }
          return;
        }

        const stored = getSelectedSellerOrganizationId();
        const existing = approvedOrgs.some(
          (item) => String(item.id || item.organizationId) === stored,
        );
        const fallback =
          approvedOrgs.find((item) => item.isDefault) || approvedOrgs[0];
        const nextId = existing
          ? stored
          : String(fallback?.id || fallback?.organizationId || "");
        setSelectedOrganizationIdState(nextId);
        if (nextId !== stored) setSelectedSellerOrganizationId(nextId);
      })
      .catch(() => {
        if (active) {
          setOrganizations([]);
          setIncompleteOrgs([]);
        }
      });

    return () => {
      active = false;
    };
  }, [userData?.role, currentPath, navigate]);

  const handleLogout = () => {
    forceLogout("Logged out");
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
    <>
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
              className={`h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#eadcc3] bg-white text-[var(--admin-blue)] transition hover:border-[var(--admin-blue)] hover:bg-white focus:outline-none ${isSidebarExpanded ? "flex" : "flex lg:hidden"}`}
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
            <Tooltip text="Notifications" position="bottom">
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => {
                  setSuppressNotificationBadge(true);
                  dispatch(setNotificationsSeenAt(Date.now()));
                  navigate("/app/notifications");
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--admin-line)] bg-white text-[var(--admin-blue)] transition hover:border-[var(--admin-blue)] hover:bg-[var(--admin-blue-soft)]"
              >
                <MdOutlineNotificationsNone size={18} />
                {!isNotificationsPage &&
                  !suppressNotificationBadge &&
                  unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-medium leading-none text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </Tooltip>
            {/* {SELLER_ROLES.has(userData?.role) && (organizations.length > 0 || incompleteOrgs.length > 0) && (
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
                {incompleteOrgs.length > 0 && (
                  <optgroup label="── Incomplete Setup ──">
                    {incompleteOrgs.map((organization) => (
                      <option key={organization.id || organization.organizationId} value={organization.id || organization.organizationId}>
                        {organization.storeDisplayName || organization.legalBusinessName || organization.id || organization.organizationId} [Setup Pending]
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            )} */}
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

      {/* Incomplete org setup popup */}
      {showIncompletePopup && pendingIncompleteOrg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowIncompletePopup(false)}
        >
          <div
            className="w-[360px] max-w-[90vw] rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center gap-2 text-amber-500">
              <MdInfoOutline className="text-xl" />
              <h3 className="text-sm font-bold text-[var(--admin-ink)]">
                Setup Incomplete
              </h3>
            </div>
            <p className="mt-2 text-xs text-[var(--admin-muted)]">
              <strong className="font-semibold text-[var(--admin-ink)]">
                {pendingIncompleteOrg.storeDisplayName ||
                  pendingIncompleteOrg.legalBusinessName ||
                  "This organization"}
              </strong>{" "}
              has pending setup. Complete the onboarding to activate this
              organization.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-md bg-[var(--admin-blue)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--admin-navy)] focus:outline-none"
                onClick={() => {
                  setShowIncompletePopup(false);
                  navigate(
                    getIncompleteOrganizationRoute(pendingIncompleteOrg),
                  );
                }}
              >
                {isOrganizationUnderReview(pendingIncompleteOrg)
                  ? "View Status"
                  : "Complete Setup"}
              </button>
              <button
                type="button"
                className="flex-1 rounded-md border border-[var(--admin-line)] px-4 py-2 text-xs font-semibold text-[var(--admin-ink)] hover:bg-[var(--admin-shell)] focus:outline-none"
                onClick={() => setShowIncompletePopup(false)}
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
