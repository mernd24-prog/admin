import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import {
  MdChevronRight,
  MdOutlineDashboard,
  MdInventory,
  MdWarehouse,
  MdShoppingCart,
  MdLocalShipping,
  MdPeople,
  MdGroup,
  MdCampaign,
  MdAccountBalance,
  MdAccountBalanceWallet,
  MdBarChart,
  MdLocationOn,
  MdSupportAgent,
  MdReceiptLong,
  MdSettings,
  MdLocalOffer,
  MdAdminPanelSettings,
  MdReviews,
  MdTrendingUp,
  MdTune,
} from "react-icons/md";

import { CiSettings } from "react-icons/ci";
import { RxCross2 } from "react-icons/rx";

import {
  getMyModulePermission,
} from "../../Redux/userManagementSlice";

import {
  getRbacSidebarModules,
} from "../../Redux/adminCoreSlice";

import {
  getAccessToken,
  getStoredRole,
  getStoredUser,
} from "../../_helpers/authStorage";

import {
  isSellerPanel,
} from "../../_helpers/panelConfig";

import BrandLogo from "../BrandLogo/BrandLogo";
import NeedHelpCard from "../Shared/NeedHelpCard";
import {
  SidebarSkeletonLoader,
} from "../Loader/SkeletonLoader";

// ─────────────────────────────────────────────────────────────
// Section icon map
// ─────────────────────────────────────────────────────────────

const SECTION_ICONS = {
  dashboard: MdOutlineDashboard,
  "catalog management": MdInventory,
  "inventory management": MdWarehouse,
  "inventory operations": MdWarehouse,
  "orders management": MdShoppingCart,
  "delivery & shipping": MdLocalShipping,
  "payments & finance": MdAccountBalance,
  "shipping & fulfilment": MdLocalShipping,
  "returns & cancellations": MdShoppingCart,
  "invoices & taxation": MdAccountBalance,
  "seller finance & payouts": MdAccountBalance,
  "commerce settings": CiSettings,
  "users & access": MdPeople,
  marketing: MdCampaign,
  "tax & compliance": MdAccountBalance,
  "reports & analytics": MdBarChart,
  settings: CiSettings,
  "location management": MdLocationOn,
  support: MdSupportAgent,
};

const getIconForTab = (tabName) => {
  return (
    SECTION_ICONS[String(tabName || "").toLowerCase()] ||
    MdOutlineDashboard
  );
};

// ─────────────────────────────────────────────────────────────
// Icon map
// ─────────────────────────────────────────────────────────────

const ICON_BY_NAME = {
  MdOutlineDashboard,
  MdInventory,
  MdWarehouse,
  MdShoppingCart,
  MdLocalShipping,
  MdPeople,
  MdGroup,
  MdCampaign,
  MdAccountBalance,
  MdAccountBalanceWallet,
  MdBarChart,
  MdLocationOn,
  MdSupportAgent,
  MdReceiptLong,
  MdSettings,
  MdLocalOffer,
  MdAdminPanelSettings,
  MdReviews,
  MdTrendingUp,
  MdTune,
  CiSettings,
};

const getSidebarIcon = (iconName, fallbackLabel) => {
  return (
    ICON_BY_NAME[String(iconName || "").trim()] ||
    getIconForTab(fallbackLabel)
  );
};

// ─────────────────────────────────────────────────────────────
// Route helpers
// ─────────────────────────────────────────────────────────────

const toRouteCode = (routePath = "") => {
  return String(routePath || "")
    .replace(/^\/?app\/?/, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
};

// ─────────────────────────────────────────────────────────────
// Sidebar tree helpers
// ─────────────────────────────────────────────────────────────

const flattenSidebarChildren = (
  items = [],
  prefix = "",
  includeParent = true,
) => {
  return items.flatMap((item) => {
    const currentName = item.moduleName || item.name;

    const label =
      includeParent && prefix
        ? `${prefix} / ${currentName}`
        : currentName;

    const route = toRouteCode(item.routePath);

    const children = flattenSidebarChildren(
      item.children || [],
      label,
      includeParent,
    );

    const self = route
      ? [
          {
            name: label,
            label,
            module_code: route,
            module:
              item.metadata?.requiredModule ||
              item.moduleKey ||
              item.slug,
          },
        ]
      : [];

    return [...self, ...children];
  });
};

const firstArray = (...values) => {
  return values.find((value) => Array.isArray(value)) || [];
};

const mergeSidebarModuleTrees = (...sources) => {
  const byKey = new Map();

  const mergeChildren = (current = [], next = []) => {
    return mergeSidebarModuleTrees(current, next);
  };

  sources
    .filter(Array.isArray)
    .flat()
    .forEach((item = {}) => {
      const key =
        item.id ||
        item.moduleKey ||
        item.moduleSlug ||
        item.slug ||
        item.metadata?.routeKey ||
        item.routePath;

      if (!key) return;

      const existing = byKey.get(key) || {};

      byKey.set(key, {
        ...existing,
        ...item,
        children: mergeChildren(
          existing.children || [],
          item.children || [],
        ),
      });
    });

  return Array.from(byKey.values()).sort(
    (left, right) => {
      return (
        Number(left.order ?? left.sortOrder ?? 0) -
          Number(right.order ?? right.sortOrder ?? 0) ||
        String(left.moduleName || left.name || "").localeCompare(
          String(right.moduleName || right.name || ""),
        )
      );
    },
  );
};

const buildDynamicSidebarData = (
  modules = [],
  options = {},
) => {
  return modules
    .map((item) => {
      const subItems = flattenSidebarChildren(
        item.children || [],
        "",
        options.sellerPanel,
      );

      const route = toRouteCode(item.routePath);

      const isSingleItem =
        Boolean(route) && subItems.length === 0;

      return {
        label: item.moduleName || item.name,

        icon: getSidebarIcon(
          item.icon,
          item.moduleName || item.name,
        ),

        subItems: isSingleItem
          ? [
              {
                name: item.moduleName || item.name,
                label: item.moduleName || item.name,
                module_code: route,
              },
            ]
          : subItems,

        isSingleItem,
      };
    })
    .filter((item) => item.subItems.length > 0);
};

// ─────────────────────────────────────────────────────────────
// Sidebar state helpers
// ─────────────────────────────────────────────────────────────

const getStoredSidebarState = () => {
  try {
    const expandedState = sessionStorage.getItem(
      "sidebarExpandedState",
    );

    const permanentState = sessionStorage.getItem(
      "sidebarPermanentState",
    );

    return Boolean(
      JSON.parse(
        expandedState ?? permanentState ?? "false",
      ),
    );
  } catch {
    return false;
  }
};

const getSessionUser = () => {
  try {
    return JSON.parse(
      sessionStorage.getItem("EcomAdmin") || "null",
    );
  } catch {
    return null;
  }
};

const getCurrentSidebarUser = () => {
  const sessionUser = getSessionUser() || {};
  const storedUser = getStoredUser() || {};

  const role =
    sessionUser.role ||
    sessionUser.roleSlug ||
    sessionUser.roleId ||
    getStoredRole() ||
    storedUser.role ||
    storedUser.roleId;

  const userId =
    sessionUser.userId ||
    sessionUser.user_id ||
    sessionUser.id ||
    sessionUser._id ||
    storedUser.userId ||
    storedUser.user_id ||
    storedUser.id ||
    storedUser._id;

  if (!userId && !role) {
    return null;
  }

  return {
    ...storedUser,
    ...sessionUser,
    userId,
    role,
  };
};

// ─────────────────────────────────────────────────────────────
// Sidebar component
// ─────────────────────────────────────────────────────────────

const Sidebar = ({
  navbarOpen,
  setNavbarOpen,
  setModuleName,
  setIsExpanded,
  isExpanded,
  isRefreshConfig,
  setHasPermanentOpen,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);

  const adminCoreSelector = useSelector(
    (state) => state.adminCore,
  );

  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState(null);

  const [isPermanentlyOpen, setIsPermanentlyOpen] =
    useState(getStoredSidebarState);

  const [windowWidth, setWindowWidth] = useState(
    window.innerWidth,
  );

  const [heights, setHeights] = useState({});
  const [visibleSubItems, setVisibleSubItems] = useState({});

  const sellerPanel = isSellerPanel();

  // ───────────────────────────────────────────────────────────
  // Sidebar API data
  // ───────────────────────────────────────────────────────────

  const sidebarModulesData =
    adminCoreSelector?.rbacSidebarModulesData;

  // Only use loading states related to sidebar API
  const isSidebarLoading =
    adminCoreSelector?.rbacSidebarModulesLoading === true ||
    sidebarModulesData?.loading === true ||
    sidebarModulesData?.isLoading === true;

  // ───────────────────────────────────────────────────────────
  // Prepare backend sidebar modules
  // ───────────────────────────────────────────────────────────

  const dynamicSidebarModules = useMemo(() => {
    const sidebarResponse =
      adminCoreSelector?.rbacSidebarModulesData;

    const backendModules = firstArray(
      sidebarResponse?.data?.normalized?.data,
      sidebarResponse?.normalized?.normalized?.data,
      sidebarResponse?.normalized?.data,
      sidebarResponse?.data?.data?.list,
      sidebarResponse?.data?.list,
      sidebarResponse?.data?.data,
      sidebarResponse?.data,
    );

    return mergeSidebarModuleTrees(backendModules);
  }, [
    adminCoreSelector?.rbacSidebarModulesData,
  ]);

  // ───────────────────────────────────────────────────────────
  // Build sidebar data
  // ───────────────────────────────────────────────────────────

  const sidebarData = useMemo(() => {
    if (!dynamicSidebarModules.length) {
      return [];
    }

    return buildDynamicSidebarData(
      dynamicSidebarModules,
      {
        sellerPanel,
      },
    );
  }, [
    dynamicSidebarModules,
    sellerPanel,
  ]);

  // ───────────────────────────────────────────────────────────
  // Get current user
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    const syncUser = () => {
      setUserData(getCurrentSidebarUser());
    };

    syncUser();

    window.addEventListener(
      "auth:changed",
      syncUser,
    );

    window.addEventListener(
      "focus",
      syncUser,
    );

    return () => {
      window.removeEventListener(
        "auth:changed",
        syncUser,
      );

      window.removeEventListener(
        "focus",
        syncUser,
      );
    };
  }, []);

  // ───────────────────────────────────────────────────────────
  // Fetch permissions and sidebar modules
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      getAccessToken() &&
      (userData?.userId || userData?.role)
    ) {
      dispatch(
        getMyModulePermission({
          _id: userData.userId,
          role: userData.role,
        }),
      );
    }

    if (getAccessToken()) {
      dispatch(getRbacSidebarModules());
    }
  }, [
    userData,
    dispatch,
    isRefreshConfig,
    sellerPanel,
  ]);

  // ───────────────────────────────────────────────────────────
  // Window resize
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );
    };
  }, []);

  // ───────────────────────────────────────────────────────────
  // Responsive sidebar
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      windowWidth < 1300 &&
      !isPermanentlyOpen
    ) {
      setNavbarOpen(false);
    }
  }, [
    isPermanentlyOpen,
    windowWidth,
    setNavbarOpen,
  ]);

  useEffect(() => {
    setIsPermanentlyOpen(Boolean(isExpanded));
  }, [
    isExpanded,
  ]);

  // ───────────────────────────────────────────────────────────
  // Set active sidebar tab
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    const currentRoute =
      location.pathname.split("/")[2];

    if (!currentRoute) {
      return;
    }

    const match = sidebarData.find((tab) =>
      tab.subItems.some(
        (item) =>
          item.module_code === currentRoute,
      ),
    );

    if (match) {
      setActiveTab(match.label);
    }
  }, [
    location.pathname,
    sidebarData,
  ]);

  // ───────────────────────────────────────────────────────────
  // Calculate submenu heights
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    const nextHeights = {};

    sidebarData.forEach((item) => {
      if (!item.isSingleItem) {
        nextHeights[item.label] =
          item.subItems.length * 64;
      }
    });

    setHeights(nextHeights);
  }, [
    sidebarData,
  ]);

  // ───────────────────────────────────────────────────────────
  // Animate submenu items
  // ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeTab || !isExpanded) {
      return;
    }

    setVisibleSubItems((previous) => ({
      ...previous,
      [activeTab]: 0,
    }));

    const count =
      sidebarData.find(
        (item) => item.label === activeTab,
      )?.subItems.length || 0;

    const timeoutIds = Array.from(
      { length: count },
      (_, index) =>
        setTimeout(() => {
          setVisibleSubItems((previous) => ({
            ...previous,
            [activeTab]: Math.max(
              previous[activeTab] || 0,
              index + 1,
            ),
          }));
        }, index * 80),
    );

    return () => {
      timeoutIds.forEach(clearTimeout);
    };
  }, [
    activeTab,
    isExpanded,
    sidebarData,
  ]);

  // ───────────────────────────────────────────────────────────
  // Handlers
  // ───────────────────────────────────────────────────────────

  const handleNavClick = (code) => {
    setModuleName(code);

    if (!isPermanentlyOpen) {
      setNavbarOpen(false);
    }
  };

  const toggleTab = (name) => {
    if (activeTab === name) {
      setVisibleSubItems((previous) => ({
        ...previous,
        [name]: 0,
      }));

      setActiveTab(null);
    } else {
      setActiveTab(name);

      setVisibleSubItems((previous) => ({
        ...previous,
        [name]: 0,
      }));
    }
  };

  const handleNeedHelpClick = () => {
    const supportRoute = sellerPanel
      ? "/app/help-support"
      : "/app/queries";

    const supportKey = sellerPanel
      ? "help-support"
      : "queries";

    navigate(supportRoute);
    handleNavClick(supportKey);
  };

  // ───────────────────────────────────────────────────────────
  // Sidebar dimensions
  // ───────────────────────────────────────────────────────────

  const sidebarWidth = isExpanded
    ? "w-full max-w-[260px] lg:w-[260px]"
    : "w-16";

  // ───────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────

  return (
    <div
      ref={sidebarRef}
      className={`fixed lg:static inset-y-0 bg-[#FCF5E8] ${sidebarWidth} h-full z-[9999] xl:flex flex-col transition-[width,max-width,transform] duration-300 ease-in-out ${
        navbarOpen
          ? "flex"
          : "hidden lg:flex"
      }`}
    >
      {/* Logo / toggle */}
      <div
        className={`sticky top-0 z-10 flex w-full items-start justify-center bg-[var(--admin-shell)] px-4 pt-3 ${
          isExpanded
            ? "h-[120px]"
            : "h-[70px]"
        } sm:pt-4`}
      >
        {isExpanded ? (
          <div className="flex items-center justify-center">
            <a href="/app/dashboard">
              <BrandLogo
                className="mb-0 h-[90px] w-[210px] rounded-[6px] border border-[var(--admin-gold)] bg-[var(--admin-shell)] p-[6px] shadow-[0_3px_8px_rgba(31,27,95,0.08)]"
                imageClassName="!h-full w-full rounded-[5px] border border-[var(--admin-gold)] bg-white p-[8px]"
              />
            </a>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Open sidebar"
            className="hidden h-9 w-9 min-w-9 flex-none aspect-square items-center justify-center rounded-full border border-[#eadcc3] bg-white p-0 text-[var(--admin-blue)] transition hover:border-[var(--admin-blue)] lg:flex"
            onClick={() => {
              setNavbarOpen(true);
              setIsExpanded(true);
              setIsPermanentlyOpen(true);
              setHasPermanentOpen(true);

              sessionStorage.setItem(
                "sidebarExpandedState",
                "true",
              );

              sessionStorage.setItem(
                "sidebarPermanentState",
                "true",
              );
            }}
          >
            <MdChevronRight size={20} />
          </button>
        )}

        {isExpanded && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center text-[var(--admin-muted)] transition hover:text-[var(--admin-navy)] focus:outline-none sm:right-3 lg:hidden"
            onClick={() => {
              setNavbarOpen(false);
              setIsExpanded(false);
              setHasPermanentOpen(false);
            }}
          >
            <RxCross2 size={22} />
          </button>
        )}
      </div>

      {/* Navigation */}
      {isSidebarLoading ? (
        <SidebarSkeletonLoader
          isExpanded={isExpanded}
        />
      ) : (
        <div className="flex-1 overflow-y-auto sidebar-scrollbar">
          <nav
            className={`w-full bg-[var(--admin-shell)] ${
              isExpanded
                ? "px-3 pb-4"
                : "p-2"
            } overflow-visible`}
          >
            <ul>
              {sidebarData.map((item, index) => {
                const Icon = item.icon;
                const isTabActive =
                  activeTab === item.label;

                const hasActiveChild =
                  item.subItems.some((subItem) => {
                    const path =
                      `/app/${subItem.module_code}`;

                    return (
                      location.pathname === path ||
                      location.pathname.startsWith(
                        `${path}/`,
                      )
                    );
                  });

                // Single menu item
                if (item.isSingleItem) {
                  const sub = item.subItems[0];
                  const path =
                    `/app/${sub.module_code}`;

                  const isActive =
                    location.pathname === path ||
                    location.pathname.startsWith(
                      `${path}/`,
                    );

                  return (
                    <li
                      key={index}
                      className={`flex flex-col py-[4px] text-[13px] ${
                        isExpanded
                          ? ""
                          : "items-center"
                      }`}
                    >
                      <Link
                        className={`relative flex items-center ${
                          isExpanded
                            ? "gap-2.5"
                            : "justify-center"
                        } overflow-hidden rounded-[6px] px-2.5 py-2 outline-none transition-colors duration-200 ${
                          isActive
                            ? "bg-[var(--admin-navy)] text-white shadow-[0_6px_14px_rgba(31,27,95,0.16)] before:absolute before:left-0 before:top-1/2 before:h-[22px] before:w-[4px] before:-translate-y-1/2 before:rounded-r before:bg-[var(--admin-gold)]"
                            : "text-[var(--admin-ink)] hover:bg-white hover:text-[var(--admin-navy)]"
                        }`}
                        to={`/app/${sub.module_code}`}
                        onClick={() =>
                          handleNavClick(
                            sub.module_code,
                          )
                        }
                        title={
                          !isExpanded
                            ? item.label
                            : ""
                        }
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                            isActive
                              ? "text-white"
                              : "text-[var(--admin-blue)]"
                          }`}
                        >
                          <Icon size={15} />
                        </span>

                        {isExpanded && (
                          <span className="min-w-0 truncate text-[13px] font-semibold">
                            {item.label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                }

                // Section with submenu
                return (
                  <li
                    key={index}
                    className={`flex flex-col py-[4px] text-[13px] ${
                      isExpanded
                        ? ""
                        : "items-center"
                    }`}
                  >
                    <div
                      className={`relative flex w-full min-w-0 items-center ${
                        isExpanded
                          ? "gap-2.5"
                          : "justify-center"
                      } cursor-pointer overflow-hidden rounded-[6px] px-2.5 py-2 transition-colors duration-200 ${
                        hasActiveChild
                          ? "bg-[var(--admin-navy)] text-white shadow-[0_6px_14px_rgba(31,27,95,0.16)] before:absolute before:left-0 before:top-1/2 before:h-[22px] before:w-[4px] before:-translate-y-1/2 before:rounded-r before:bg-[var(--admin-gold)]"
                          : "text-[var(--admin-ink)] hover:bg-white hover:text-[var(--admin-navy)]"
                      }`}
                      onClick={() => {
                        if (!isExpanded) {
                          setNavbarOpen(true);
                          setIsExpanded(true);
                          setIsPermanentlyOpen(true);
                          setHasPermanentOpen(true);

                          sessionStorage.setItem(
                            "sidebarExpandedState",
                            "true",
                          );

                          sessionStorage.setItem(
                            "sidebarPermanentState",
                            "true",
                          );
                        }

                        toggleTab(item.label);
                      }}
                      title={
                        !isExpanded
                          ? item.label
                          : ""
                      }
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${
                          hasActiveChild
                            ? "text-white"
                            : "text-[var(--admin-blue)]"
                        }`}
                      >
                        <Icon size={18} />
                      </span>

                      {isExpanded && (
                        <>
                          <span className="min-w-0 truncate text-[13px] font-semibold">
                            {item.label}
                          </span>

                          <MdChevronRight
                            className={`ml-auto transition-transform duration-200 ${
                              hasActiveChild
                                ? "text-white/80"
                                : "text-[var(--admin-muted)]"
                            } ${
                              isTabActive
                                ? "rotate-90"
                                : ""
                            }`}
                          />
                        </>
                      )}
                    </div>

                    {/* Sub-items */}
                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{
                        maxHeight:
                          isTabActive && isExpanded
                            ? `${heights[item.label] || 0}px`
                            : "0px",

                        opacity:
                          isTabActive && isExpanded
                            ? 1
                            : 0,

                        transform: `translateY(${
                          isTabActive && isExpanded
                            ? "0"
                            : "-10px"
                        })`,
                      }}
                    >
                      {isExpanded && (
                        <ul className="mt-1 ml-7 space-y-1.5 pr-1">
                          {item.subItems.map(
                            (sub, subIndex) => {
                              const path =
                                `/app/${sub.module_code}`;

                              const isSubActive =
                                location.pathname === path ||
                                location.pathname.startsWith(
                                  `${path}/`,
                                );

                              const isVisible =
                                (visibleSubItems[
                                  item.label
                                ] || 0) > subIndex;

                              return (
                                <li
                                  key={subIndex}
                                  className="flex items-start gap-2"
                                  style={{
                                    opacity: isVisible
                                      ? 1
                                      : 0,

                                    transform: `translateY(${
                                      isVisible
                                        ? "0"
                                        : "-10px"
                                    })`,

                                    transition: `opacity 200ms ease-out ${
                                      subIndex * 80
                                    }ms, transform 200ms ease-out ${
                                      subIndex * 80
                                    }ms`,
                                  }}
                                >
                                  <Link
                                    className={`flex w-full items-start gap-2 rounded-[6px] px-2.5 py-2 text-sm leading-5 outline-none transition-all duration-200 ${
                                      isSubActive
                                        ? "bg-white font-semibold text-[var(--admin-navy)] shadow-[0_1px_6px_rgba(31,27,95,0.07)]"
                                        : "text-[var(--admin-muted)] hover:bg-white hover:text-[var(--admin-navy)]"
                                    }`}
                                    to={`/app/${sub.module_code}`}
                                    onClick={() =>
                                      handleNavClick(
                                        sub.module_code,
                                      )
                                    }
                                  >
                                    <span
                                      className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                                        isSubActive
                                          ? "bg-[var(--admin-gold)]"
                                          : "bg-[var(--admin-line-strong)]"
                                      }`}
                                    />

                                    <span className="min-w-0 whitespace-normal break-words text-[13px] capitalize leading-5">
                                      {sub.label}
                                    </span>
                                  </Link>
                                </li>
                              );
                            },
                          )}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}

      {/* Need Help section */}
      {isExpanded ? (
        <NeedHelpCard
          title="Need Help?"
          onClick={handleNeedHelpClick}
          description="Our verification team is available 24/7 to help you complete KYC."
          buttonText="Contact Support"
          className="mx-4 mb-5 mt-5 border-[var(--admin-line)] bg-[var(--admin-gold-soft)]"
          titleClassName="text-[11px] tracking-[0.04em] text-[var(--admin-navy)]"
          descriptionClassName="text-[11px] leading-4 text-[var(--admin-ink)]"
          buttonClassName="mt-3 h-8 rounded-[5px] bg-[var(--admin-gold)] text-[10px] font-semibold text-[var(--admin-navy)] hover:bg-[var(--admin-gold-dark)]"
        />
      ) : (
        <div className="mb-5 mt-3 flex justify-center">
          <button
            type="button"
            onClick={handleNeedHelpClick}
            title="Need Help?"
            aria-label="Need Help?"
            className="flex h-10 w-10 items-center justify-center rounded-[6px] text-[var(--admin-blue)] transition-colors duration-200 hover:bg-white hover:text-[var(--admin-navy)]"
          >
            <MdSupportAgent size={19} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;