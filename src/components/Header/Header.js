import React, { useCallback, useEffect, useRef, useState } from "react";
import { forceLogout } from "../../_helpers/authSession";
import { IoLogOutOutline } from "react-icons/io5";
import {
  MdOutlineMenu,
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
import { usePermission } from "../../_helpers/usePermission";

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
  if (isOrganizationUnderReview(item)) {
    return AUTH_ROUTES.SELLER_STATUS_PENDING;
  }

  const organizationId = item.id || item.organizationId || "";

  return `${AUTH_ROUTES.ONBOARDING}${
    organizationId ? `?organizationId=${organizationId}` : ""
  }`;
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
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);

  const routeParts = parts[0] === "app" ? parts.slice(1) : parts;
  const lastPart = routeParts[routeParts.length - 1] || "";
  const isId = /^[a-fA-F0-9]{24}$/.test(lastPart);
  const routeKey = isId ? routeParts[routeParts.length - 2] : lastPart;

  if (HEADER_ROUTE_TITLES[routeKey]) {
    return HEADER_ROUTE_TITLES[routeKey];
  }

  if (routeKey) {
    return formatRouteLabel(routeKey);
  }

  return fallback || "Dashboard";
};

export default function Header({
  handleNavbar,
  moduleName,
  hasPermanentOpen,
  isSidebarExpanded,
}) {
  const { canRoute } = usePermission();

  const [openModel, setOpenModel] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const dispatch = useDispatch();
  const dropDownRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const isNotificationsPage =
    currentPath === "/app/notifications" ||
    currentPath.startsWith("/app/notifications/");

  const [suppressNotificationBadge, setSuppressNotificationBadge] =
    useState(isNotificationsPage);

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

  // Fetch notifications and refresh them periodically.
  useEffect(() => {
    const loadNotifications = () =>
      dispatch(getMyNotifications({ page: 1, limit: 20 })).catch(() => {});

    loadNotifications();

    const intervalId = window.setInterval(loadNotifications, 15000);

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
        ),
      ).length;
    } catch (error) {
      return 0;
    }
  })();

  const fetchUserData = useCallback(async () => {
    try {
      const res = await dispatch(getProfile()).unwrap();
      setUserData(res?.data || {});
    } catch (error) {
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

  // Listen for seller organization changes.
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

  // Validate seller organizations and redirect incomplete sellers when required.
  useEffect(() => {
    if (!SELLER_ROLES.has(userData?.role)) {
      setOrganizations([]);
      setIncompleteOrgs([]);
      return undefined;
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

        if (nextId !== stored) {
          setSelectedSellerOrganizationId(nextId);
        }
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
    setOpenModel((previous) => !previous);
  };

  const openLogoutConfirmation = () => {
    setOpenModel(false);
    setShowLogoutConfirm(true);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    handleLogout();
  };

  // Close profile dropdown when clicking outside it.
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

  // Update the header profile after profile changes.
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

  // Allow closing the logout confirmation with Escape.
  useEffect(() => {
    if (!showLogoutConfirm) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        cancelLogout();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showLogoutConfirm]);

  return (
    <>
      {/* Header */}
      <div
        className={`${
          hasPermanentOpen
            ? "flex flex-shrink-0"
            : "fixed top-0 left-0 right-0 flex flex-shrink-0"
        } z-20 h-[58px] bg-[var(--admin-shell)] text-[var(--admin-ink)]`}
      >
        <div className="flex w-full flex-1 items-center justify-between gap-4 px-4 md:px-5">
          {/* Left: menu toggle and title */}
          <div
            className={`flex min-w-0 items-center gap-3 ${
              hasPermanentOpen ? "" : "lg:pl-1"
            }`}
          >
            <button
              type="button"
              aria-label={isSidebarExpanded ? "Sidebar open" : "Sidebar closed"}
              className={`h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#eadcc3] bg-white text-[var(--admin-blue)] transition hover:border-[var(--admin-blue)] hover:bg-white focus:outline-none ${
                isSidebarExpanded ? "flex" : "flex lg:hidden"
              }`}
              onClick={handleNavbar}
            >
              {isSidebarExpanded ? (
                <MdOutlineMenu aria-hidden="true" className="h-5 w-5" />
              ) : (
                <FcNext aria-hidden="true" className="h-5 w-5" />
              )}
            </button>

            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-[13px] font-semibold capitalize text-[var(--admin-ink)]">
                {headerTitle || moduleName || "Dashboard"}
              </h1>
            </div>
          </div>

          {/* Right: notifications and user profile */}
          <div className="flex flex-shrink-0 items-center gap-3">
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
                <MdOutlineNotificationsNone aria-hidden="true" size={18} />

                {!isNotificationsPage &&
                  !suppressNotificationBadge &&
                  unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-medium leading-none text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
              </button>
            </Tooltip>

            <div className="relative">
              <div className="flex items-center gap-2.5">
                <div className="hidden text-right leading-tight md:block">
                  <p className="max-w-44 truncate text-[12px] font-bold text-[var(--admin-ink)]">
                    {getDisplayName(userData)}
                  </p>

                  <p className="mt-[1px] truncate text-[10px] font-medium text-[var(--admin-muted)]">
                    {userData?.email || userData?.role || "Admin"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleLogoutModal}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[var(--admin-line)] bg-[var(--admin-blue-soft)] text-sm font-bold text-[var(--admin-navy)] transition hover:border-[var(--admin-gold)]"
                  aria-label="Open profile menu"
                  aria-expanded={openModel}
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

              {/* Profile dropdown */}
              <div
                className={`absolute right-0 z-30 mt-3 w-64 overflow-hidden rounded-lg border border-[var(--admin-line)] bg-white text-gray-900 shadow-xl transition-all duration-200 ease-in-out ${
                  openModel
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none -translate-y-2 opacity-0"
                }`}
                ref={dropDownRef}
              >
                <div className="flex items-center gap-3 border-b border-[var(--admin-line)] bg-[var(--admin-shell)] px-4 py-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--admin-blue-soft)] text-base font-bold text-[var(--admin-navy)]">
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
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Hi, {getDisplayName(userData)}
                    </p>

                    <p className="truncate text-xs text-gray-500">
                      {userData?.email}
                    </p>
                  </div>
                </div>

                {(canRoute("/app/profile") ||
                  canRoute("/app/changePassword")) && (
                  <div className="px-4 py-1 text-xs">
                    {canRoute("/app/profile") && (
                      <Link
                        to="/app/profile"
                        onClick={() => setOpenModel(false)}
                        className="flex flex-wrap items-center rounded px-3.5 py-2 font-semibold text-gray-700 no-underline hover:bg-gray-50 hover:text-[var(--admin-gold)]"
                      >
                        <FiUser className="mr-3" aria-hidden="true" />
                        Profile
                      </Link>
                    )}

                    {canRoute("/app/changePassword") && (
                      <Link
                        to="/app/changePassword"
                        onClick={() => setOpenModel(false)}
                        className="flex flex-wrap items-center rounded px-3.5 py-2 font-medium text-gray-700 no-underline hover:bg-gray-50 hover:text-[var(--admin-gold)]"
                      >
                        <FiKey className="mr-3" aria-hidden="true" />
                        Change Password
                      </Link>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-100 px-4 py-1 text-xs">
                  <button
                    type="button"
                    className="flex w-full items-center rounded px-3.5 py-2 text-left font-medium text-gray-700 transition hover:bg-[#fff7ea] hover:text-[var(--admin-gold)]"
                    onClick={openLogoutConfirmation}
                  >
                    <IoLogOutOutline
                      className="mr-3"
                      size={17}
                      aria-hidden="true"
                    />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact custom logout confirmation popup */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelLogout();
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            aria-describedby="logout-confirm-description"
            className="w-full max-w-[420px] rounded-xl bg-white px-6 py-10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:px-8"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2
              id="logout-confirm-title"
              className="text-center text-[15px] font-semibold text-[#1F1B5F]"
            >
              Are you sure you want to logout
            </h2>

            {/* <p
              id="logout-confirm-description"
              className="mt-2 text-center text-[12px] text-[#77758A]"
            >
              You will be signed out of your account.
            </p> */}

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={cancelLogout}
                className="min-w-[88px] rounded-xl border border-[#D6A323] bg-white px-5 py-1.5 text-[13px] font-medium text-[#1F1B5F] transition-colors hover:bg-[#FFF7EA] focus:outline-none focus:ring-2 focus:ring-[#D6A323]/30"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmLogout}
                className="min-w-[100px] rounded-xl bg-[#D6A323] px-5 py-1.5 text-[13px] font-medium text-[#1F1B5F] transition-colors hover:bg-[#C4971F] focus:outline-none focus:ring-2 focus:ring-[#D6A323]/40"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incomplete organization setup popup */}
      {showIncompletePopup && pendingIncompleteOrg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowIncompletePopup(false)}
        >
          <div
            className="w-[360px] max-w-[90vw] rounded-xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-1 flex items-center gap-2 text-amber-500">
              <MdInfoOutline className="text-xl" aria-hidden="true" />

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
