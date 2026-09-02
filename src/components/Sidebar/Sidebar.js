import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
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
import { getMyModulePermission } from "../../Redux/userManagementSlice";
import { getRbacSidebarModules } from "../../Redux/adminCoreSlice";
import {
  getAccessToken,
  getStoredRole,
  getStoredUser,
} from "../../_helpers/authStorage";
import { RxCross2 } from "react-icons/rx";
import { isSellerPanel } from "../../_helpers/panelConfig";
import BrandLogo from "../BrandLogo/BrandLogo";
import NeedHelpCard from "../Shared/NeedHelpCard";

// ─── Section icon map ─────────────────────────────────────────────────────────
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

const getIconForTab = (tabName) =>
  SECTION_ICONS[String(tabName || "").toLowerCase()] || MdOutlineDashboard;

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

const getSidebarIcon = (iconName, fallbackLabel) =>
  ICON_BY_NAME[String(iconName || "").trim()] || getIconForTab(fallbackLabel);

const toRouteCode = (routePath = "") =>
  String(routePath || "")
    .replace(/^\/app\/?/, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

const flattenSidebarChildren = (items = [], prefix = "", includeParent = true) =>
  items.flatMap((item) => {
    const label = includeParent && prefix
      ? `${prefix} / ${item.moduleName || item.name}`
      : item.moduleName || item.name;
    const route = toRouteCode(item.routePath);
    const children = flattenSidebarChildren(
      item.children || [],
      label,
      includeParent,
    );
    const self =
      route
        ? [
            {
              name: label,
              label,
              module_code: route,
              module:
                item.metadata?.requiredModule || item.moduleKey || item.slug,
            },
          ]
        : [];
    return [...self, ...children];
  });

const firstArray = (...values) =>
  values.find((value) => Array.isArray(value)) || [];

const mergeSidebarModuleTrees = (...sources) => {
  const byKey = new Map();
  const mergeChildren = (current = [], next = []) =>
    mergeSidebarModuleTrees(current, next);

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
        children: mergeChildren(existing.children || [], item.children || []),
      });
    });

  return Array.from(byKey.values()).sort(
    (left, right) =>
      Number(left.order ?? left.sortOrder ?? 0) -
        Number(right.order ?? right.sortOrder ?? 0) ||
      String(left.moduleName || left.name || "").localeCompare(
        String(right.moduleName || right.name || ""),
      ),
  );
};

const buildDynamicSidebarData = (modules = [], options = {}) =>
  modules
    .map((item) => {
      const subItems = flattenSidebarChildren(
        item.children || [],
        "",
        options.sellerPanel,
      );
      const route = toRouteCode(item.routePath);
      const isSingleItem =
        Boolean(route) &&
        subItems.length === 0;
      return {
        label: item.moduleName || item.name,
        icon: getSidebarIcon(item.icon, item.moduleName || item.name),
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

// ─── Sidebar state helpers ────────────────────────────────────────────────────
const getStoredSidebarState = () => {
  try {
    const exp = sessionStorage.getItem("sidebarExpandedState");
    const perm = sessionStorage.getItem("sidebarPermanentState");
    return Boolean(JSON.parse(exp ?? perm ?? "false"));
  } catch {
    return false;
  }
};

const getSessionUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("EcomAdmin") || "null");
  } catch {
    return null;
  }
};

const getCurrentSidebarUser = () => {
  const s = getSessionUser() || {};
  const u = getStoredUser() || {};
  const role =
    s.role || s.roleSlug || s.roleId || getStoredRole() || u.role || u.roleId;
  const userId =
    s.userId ||
    s.user_id ||
    s.id ||
    s._id ||
    u.userId ||
    u.user_id ||
    u.id ||
    u._id;
  if (!userId && !role) return null;
  return { ...u, ...s, userId, role };
};

// ─── Component ───────────────────────────────────────────────────────────────
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
  const adminCoreSelector = useSelector((state) => state.adminCore);
  const [userData, setUserData] = useState(null);
  const dynamicSidebarModules = useMemo(() => {
    const sd = adminCoreSelector?.rbacSidebarModulesData;
    const backendModules = firstArray(
      sd?.data?.normalized?.data,
      sd?.normalized?.normalized?.data,
      sd?.normalized?.data,
      sd?.data?.data?.list,
      sd?.data?.list,
      sd?.data?.data,
      sd?.data,
    );
    return mergeSidebarModuleTrees(backendModules);
  }, [adminCoreSelector?.rbacSidebarModulesData]);
  const sellerPanel = isSellerPanel();

  const [activeTab, setActiveTab] = useState(null);
  const [isPermanentlyOpen, setIsPermanentlyOpen] = useState(
    getStoredSidebarState,
  );
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [heights, setHeights] = useState({});
  const [visibleSubItems, setVisibleSubItems] = useState({});

  const location = useLocation();
  const sidebarRef = useRef(null);
  // ── Build sidebar data ───────────────────────────────────────────────────
  const sidebarData = useMemo(() => {
    if (!dynamicSidebarModules.length) return [];
    return buildDynamicSidebarData(dynamicSidebarModules, { sellerPanel });
  }, [sellerPanel, dynamicSidebarModules]);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => setUserData(getCurrentSidebarUser());
    sync();
    window.addEventListener("auth:changed", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("auth:changed", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    if (getAccessToken() && (userData?.userId || userData?.role)) {
      dispatch(
        getMyModulePermission({ _id: userData.userId, role: userData.role }),
      );
    }
    if (getAccessToken()) {
      dispatch(getRbacSidebarModules());
    }
  }, [userData, dispatch, isRefreshConfig, sellerPanel]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth < 1300 && !isPermanentlyOpen) setNavbarOpen(false);
  }, [isPermanentlyOpen, windowWidth, setNavbarOpen]);

  useEffect(() => {
    setIsPermanentlyOpen(Boolean(isExpanded));
  }, [isExpanded]);

  useEffect(() => {
    const cur = location.pathname.split("/")[2];
    if (!cur) return;
    const match = sidebarData.find((tab) =>
      tab.subItems.some((i) => i.module_code === cur),
    );
    if (match) setActiveTab(match.label);
  }, [location.pathname, sidebarData]);

  useEffect(() => {
    const next = {};
    sidebarData.forEach((item) => {
      if (!item.isSingleItem) next[item.label] = item.subItems.length * 64;
    });
    setHeights(next);
  }, [sidebarData]);

  useEffect(() => {
    if (!activeTab || !isExpanded) return;
    setVisibleSubItems((prev) => ({ ...prev, [activeTab]: 0 }));
    const count =
      sidebarData.find((i) => i.label === activeTab)?.subItems.length || 0;
    const ids = Array.from({ length: count }, (_, i) =>
      setTimeout(
        () =>
          setVisibleSubItems((p) => ({
            ...p,
            [activeTab]: Math.max(p[activeTab] || 0, i + 1),
          })),
        i * 80,
      ),
    );
    return () => ids.forEach(clearTimeout);
  }, [activeTab, isExpanded, sidebarData]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleNavClick = (code) => {
    setModuleName(code);
    if (!isPermanentlyOpen) setNavbarOpen(false);
  };

  const toggleTab = (name) => {
    if (activeTab === name) {
      setVisibleSubItems((p) => ({ ...p, [name]: 0 }));
      setActiveTab(null);
    } else {
      setActiveTab(name);
      setVisibleSubItems((p) => ({ ...p, [name]: 0 }));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const sidebarWidth = isExpanded
    ? "w-full max-w-[260px] lg:w-[260px]"
    : "w-16";

  const handleNeedHelpClick = () => {
    const supportRoute = isSellerPanel() ? "/app/help-support" : "/app/queries";

    const supportKey = isSellerPanel() ? "help-support" : "queries";

    navigate(supportRoute);
    handleNavClick(supportKey);
  };

  return (
    <div
      ref={sidebarRef}
      // onMouseEnter={() => {
      //   if (!isPermanentlyOpen) {
      //     setNavbarOpen(true);
      //     setIsExpanded(true);
      //   }
      // }}
      // onMouseLeave={() => {
      //   if (!isPermanentlyOpen) {
      //     setNavbarOpen(false);
      //     setIsExpanded(false);
      //   }
      // }}
      className={`fixed lg:static  inset-y-0 bg-[#FCF5E8] ${sidebarWidth} h-full z-[9999] xl:flex flex-col transition-[width,max-width,transform] duration-300 ease-in-out ${
        navbarOpen ? "flex" : "hidden lg:flex"
      }`}
    >
      {/* Logo / toggle */}
      <div
        className={`sticky top-0 z-10 flex w-full items-start justify-center bg-[var(--admin-shell)] px-4 pt-3 ${isExpanded ? "h-[120px]" : "h-[70px]"} sm:pt-4`}
      >
        {isExpanded ? (
          <div className="flex  items-center justify-center">
            <a href={"/app/dashboard"}>
              <BrandLogo
                className="mb-0  h-[90px] w-[210px] rounded-[6px] border border-[var(--admin-gold)] bg-[var(--admin-shell)] p-[6px] shadow-[0_3px_8px_rgba(31,27,95,0.08)]"
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

              // Permanent pin
              setIsPermanentlyOpen(true);
              setHasPermanentOpen(true);

              sessionStorage.setItem("sidebarExpandedState", "true");
              sessionStorage.setItem("sidebarPermanentState", "true");
            }}
          >
            <MdChevronRight size={20} />
          </button>
        )}

        {isExpanded && (
          <button
            type="button"
            aria-label="Close sidebar"
            className= " absolute right-0 top-0 flex h-8 w-8 items-center justify-center text-[var(--admin-muted)] transition hover:text-[var(--admin-navy)] focus:outline-none sm:right-3 lg:hidden"
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

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto sidebar-scrollbar">
        <nav
          className={`w-full bg-[var(--admin-shell)]  ${isExpanded ? "px-3 pb-4" : "p-2"} overflow-visible`}
        >
          <ul>
            {sidebarData.map((item, index) => {
              const Icon = item.icon;
              const isTabActive = activeTab === item.label;
              const hasActiveChild = item.subItems.some((s) => {
                const path = `/app/${s.module_code}`;
                return (
                  location.pathname === path ||
                  location.pathname.startsWith(`${path}/`)
                );
              });
              if (item.isSingleItem) {
                const sub = item.subItems[0];
                const path = `/app/${sub.module_code}`;
                const isActive =
                  location.pathname === path ||
                  location.pathname.startsWith(`${path}/`);
                return (
                  <li
                    key={index}
                    className={`flex flex-col py-[4px] text-[13px] ${isExpanded ? "" : "items-center"}`}
                  >
                    <Link
                      className={`relative flex items-center ${isExpanded ? "gap-2.5" : "justify-center"} overflow-hidden rounded-[6px] px-2.5 py-2 outline-none transition-colors duration-200 focus:outline-none focus-visible:outline-none ${isActive ? "bg-[var(--admin-navy)] text-white shadow-[0_6px_14px_rgba(31,27,95,0.16)] before:absolute before:left-0 before:top-1/2 before:h-[22px] before:w-[4px] before:-translate-y-1/2 before:rounded-r before:bg-[var(--admin-gold)]" : "text-[var(--admin-ink)] hover:bg-white hover:text-[var(--admin-navy)]"}`}
                      to={`/app/${sub.module_code}`}
                      onClick={() => handleNavClick(sub.module_code)}
                      title={!isExpanded ? item.label : ""}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${isActive ? "text-white" : "text-[var(--admin-blue)]"}`}
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

              return (
                <li
                  key={index}
                  className={`flex flex-col py-[4px] text-[13px] ${isExpanded ? "" : "items-center"}`}
                >
                  {/* Section header */}
                  <div
                    className={`relative flex w-full min-w-0 items-center ${isExpanded ? "gap-2.5" : "justify-center"} cursor-pointer overflow-hidden rounded-[6px] px-2.5 py-2 transition-colors duration-200 ${hasActiveChild ? "bg-[var(--admin-navy)] text-white shadow-[0_6px_14px_rgba(31,27,95,0.16)] before:absolute before:left-0 before:top-1/2 before:h-[22px] before:w-[4px] before:-translate-y-1/2 before:rounded-r before:bg-[var(--admin-gold)]" : "text-[var(--admin-ink)] hover:bg-white hover:text-[var(--admin-navy)]"}`}
                    onClick={() => {
                      if (!isExpanded) {
                        setNavbarOpen(true);
                        setIsExpanded(true);
                        setIsPermanentlyOpen(true);
                        setHasPermanentOpen(true);

                        sessionStorage.setItem("sidebarExpandedState", "true");
                        sessionStorage.setItem("sidebarPermanentState", "true");
                      }

                      toggleTab(item.label);
                    }}
                    title={!isExpanded ? item.label : ""}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${hasActiveChild ? "text-white" : "text-[var(--admin-blue)]"}`}
                    >
                      <Icon size={18} />
                    </span>
                    {isExpanded && (
                      <>
                        <span className="min-w-0 truncate text-[13px] font-semibold">
                          {item.label}
                        </span>
                        <MdChevronRight
                          className={`ml-auto transition-transform duration-200 ${hasActiveChild ? "text-white/80" : "text-[var(--admin-muted)]"} ${isTabActive ? "rotate-90" : ""}`}
                        />
                      </>
                    )}
                  </div>

                  {/* Sub-items */}
                  <div
                    className="transition-all duration-300 ease-in-out overflow-hidden"
                    style={{
                      maxHeight:
                        isTabActive && isExpanded
                          ? `${heights[item.label] || 0}px`
                          : "0px",
                      opacity: isTabActive && isExpanded ? 1 : 0,
                      transform: `translateY(${isTabActive && isExpanded ? "0" : "-10px"})`,
                    }}
                  >
                    {isExpanded && (
                      <ul className="mt-1 ml-7 space-y-1.5 pr-1">
                        {item.subItems.map((sub, si) => {
                          const path = `/app/${sub.module_code}`;
                          const isSubActive =
                            location.pathname === path ||
                            location.pathname.startsWith(`${path}/`);
                          const isVisible =
                            (visibleSubItems[item.label] || 0) > si;
                          return (
                            <li
                              key={si}
                              className="flex items-start gap-2"
                              style={{
                                opacity: isVisible ? 1 : 0,
                                transform: `translateY(${isVisible ? "0" : "-10px"})`,
                                transition: `opacity 200ms ease-out ${si * 80}ms, transform 200ms ease-out ${si * 80}ms`,
                              }}
                            >
                              <Link
                                className={`flex w-full items-start gap-2 rounded-[6px] px-2.5 py-2 text-sm leading-5 outline-none transition-all duration-200 ease-in-out focus:outline-none focus-visible:outline-none ${isSubActive ? "font-semibold bg-white text-[var(--admin-navy)] shadow-[0_1px_6px_rgba(31,27,95,0.07)]" : "text-[var(--admin-muted)] hover:bg-white hover:text-[var(--admin-navy)]"}`}
                                to={`/app/${sub.module_code}`}
                                onClick={() => handleNavClick(sub.module_code)}
                              >
                                <span
                                  className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${isSubActive ? "bg-[var(--admin-gold)]" : "bg-[var(--admin-line-strong)]"}`}
                                />
                                <span className="min-w-0 whitespace-normal break-words text-[13px] capitalize leading-5">
                                  {sub.label}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
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
