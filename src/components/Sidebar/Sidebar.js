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
import {
  getAccessModules,
  getRbacSidebarModules,
} from "../../Redux/adminCoreSlice";
import {
  getAccessToken,
  getStoredSidebarModules,
  getStoredRole,
  getStoredUser,
  normalizeRole,
} from "../../_helpers/authStorage";
import { RxCross2 } from "react-icons/rx";
import { isSellerPanel } from "../../_helpers/panelConfig";
import {
  MODULE_TAB_ORDER,
  getAccessModuleRouteEntries,
  isSellerBlockedModule,
  isSellerBlockedRoute,
} from "../../_helpers/rbacRoutes";
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

const HIDDEN_SIDEBAR_ROUTE_CODES = new Set([
  "seller-organizations",
  "warehouse",
  "threshold-products",
  "category-attributes",
  "seller-kyc",
  "seller-bank",
  "seller-onboarding",
  "seller-status",
  "shipping-packages",
  "pickup-addresses",
  "shipping-company-users",
]);

const normalizeModuleCode = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");

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
      route && !HIDDEN_SIDEBAR_ROUTE_CODES.has(route)
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

const filterSellerSidebarItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => {
      const route = toRouteCode(item.routePath);
      const moduleCode =
        item.metadata?.requiredModule ||
        item.requiredModule ||
        item.moduleKey ||
        item.slug;
      const children = filterSellerSidebarItems(item.children || []);
      const blocked =
        isSellerBlockedRoute(route) || isSellerBlockedModule(moduleCode);
      if (blocked && !children.length) return null;
      return { ...item, children };
    })
    .filter(Boolean);

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

const filterSidebarTreeByAccess = (items = [], options = {}) => {
  if (options.trustBackend) return items;

  return items
    .map((item) => {
      const requiredModule = normalizeModuleCode(
        item.metadata?.requiredModule ||
          item.requiredModule ||
          item.moduleKey ||
          item.slug,
      );
      const children = filterSidebarTreeByAccess(item.children || [], options);
      const allowedModules = options.allowedModules || new Set();
      const selfAllowed =
        options.superAdmin ||
        allowedModules.has(requiredModule) ||
        allowedModules.has(normalizeModuleCode(item.moduleKey)) ||
        allowedModules.has(normalizeModuleCode(item.slug)) ||
        !requiredModule;
      if (!selfAllowed && !children.length) return null;
      return { ...item, children };
    })
    .filter(Boolean);
};

const buildDynamicSidebarData = (modules = [], options = {}) =>
  filterSidebarTreeByAccess(
    options.sellerPanel ? filterSellerSidebarItems(modules) : modules,
    options,
  )
    .map((item) => {
      const subItems = flattenSidebarChildren(
        item.children || [],
        "",
        options.sellerPanel,
      );
      const route = toRouteCode(item.routePath);
      const isSingleItem =
        Boolean(route) &&
        !HIDDEN_SIDEBAR_ROUTE_CODES.has(route) &&
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

const hasAssignedView = (module = {}) =>
  module.assigned === true ||
  (Array.isArray(module.permissions) &&
    module.permissions.some(
      (permission) =>
        String(permission.action || "").toLowerCase() === "view" &&
        permission.assigned === true,
    ));

const tabOrderIndex = (tab) => {
  const index = MODULE_TAB_ORDER.indexOf(tab);
  return index === -1 ? MODULE_TAB_ORDER.length : index;
};

const SELLER_SECTION_ORDER = [
  "seller dashboard",
  "dashboard",
  "seller catalog",
  "catalog",
  "seller inventory",
  "inventory",
  "seller invoices",
  "invoices",
  "seller tax",
  "seller marketing",
  "marketing",
  "seller orders",
  "orders",
  "seller shipping",
  "shipping",
  "seller access",
  "my finance & payouts",
  "seller finance",
  "my reports",
  "seller reports",
  "help & support",
];

const sellerSectionOrderIndex = (label = "") => {
  const normalized = String(label || "")
    .trim()
    .toLowerCase();
  const index = SELLER_SECTION_ORDER.indexOf(normalized);
  return index === -1 ? SELLER_SECTION_ORDER.length : index;
};

const sortSidebarGroups = (groups = [], sellerPanel = false) =>
  [...groups].sort((left, right) => {
    const leftOrder = sellerPanel
      ? sellerSectionOrderIndex(left.label)
      : tabOrderIndex(left.label);
    const rightOrder = sellerPanel
      ? sellerSectionOrderIndex(right.label)
      : tabOrderIndex(right.label);
    return (
      leftOrder - rightOrder ||
      String(left.label).localeCompare(String(right.label))
    );
  });

const buildAccessModuleSidebarData = (modules = [], options = {}) => {
  const seenRoutes = new Set();
  const entries = (Array.isArray(modules) ? modules : [])
    .filter((module) => {
      const slug = normalizeModuleCode(
        module.slug ||
          module.moduleKey ||
          module.moduleSlug ||
          module.metadata?.requiredModule,
      );
      return (
        options.superAdmin ||
        hasAssignedView(module) ||
        options.allowedModules?.has(slug)
      );
    })
    .flatMap((module) => getAccessModuleRouteEntries(module, options))
    .filter((entry) => {
      if (!entry.route || HIDDEN_SIDEBAR_ROUTE_CODES.has(entry.route)) {
        return false;
      }
      if (
        options.sellerPanel &&
        (isSellerBlockedRoute(entry.route) ||
          isSellerBlockedModule(entry.module))
      ) {
        return false;
      }
      if (seenRoutes.has(entry.route)) return false;
      seenRoutes.add(entry.route);
      return true;
    });

  const grouped = entries.reduce((acc, entry) => {
    const tab = entry.tab || "Settings";
    if (!acc[tab]) acc[tab] = [];
    acc[tab].push({
      name: entry.label,
      label: entry.label,
      module_code: entry.route,
      module: entry.module,
      order: entry.order,
    });
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(
      ([left], [right]) =>
        tabOrderIndex(left) - tabOrderIndex(right) || left.localeCompare(right),
    )
    .map(([tab, subItems]) => {
      const sortedItems = subItems.sort(
        (left, right) =>
          Number(left.order || 0) - Number(right.order || 0) ||
          String(left.label).localeCompare(String(right.label)),
      );
      return {
        label: tab,
        icon: getIconForTab(tab),
        subItems: sortedItems,
        isSingleItem:
          tab.toLowerCase() === "dashboard" && sortedItems.length === 1,
      };
    })
    .filter((item) => item.subItems.length > 0);
};

// Festivals are intentionally not part of either panel navigation. Filter the
// module as well as an empty Festivals group so stale RBAC/sidebar data stored
// in a session or returned by an older backend cannot make it reappear.
const removeFestivalSidebarItems = (groups = []) =>
  groups
    .map((group) => ({
      ...group,
      subItems: (group.subItems || []).filter((item) => {
        const moduleCode = String(
          item.module_code || item.moduleCode || item.module || item.route || "",
        ).toLowerCase();
        const label = String(item.label || item.name || "").toLowerCase();
        return moduleCode !== "festivals" && label !== "festivals";
      }),
    }))
    .filter(
      (group) =>
        group.subItems.length > 0 &&
        String(group.label || "").toLowerCase() !== "festivals",
    );

// Seller finance was previously exposed as several disconnected accounting
// pages. Normalize old RBAC rows and cached login payloads to the current
// seller-facing money flow so existing accounts do not need to be re-seeded or
// sign out before the corrected navigation appears.
const normalizeSellerFinanceNavigation = (groups = []) => {
  const canonicalItems = [
    { name: "Finance Overview", label: "Finance Overview", module_code: "finance-overview", module: "sellers/commissions", order: 91 },
    { name: "Earnings", label: "Earnings", module_code: "finance-earnings", module: "sellers/commissions", order: 92 },
    { name: "Adjustments", label: "Adjustments", module_code: "finance-adjustments", module: "sellers/commissions", order: 93 },
    { name: "Payouts", label: "Payouts", module_code: "seller-payouts", module: "sellers/commissions", order: 94 },
    { name: "Statements", label: "Statements", module_code: "finance-statements", module: "sellers/commissions", order: 95 },
  ];
  return groups.map((group) => {
    const label = String(group.label || "").trim().toLowerCase();
    const isFinanceGroup = ["my finance & payouts", "seller finance", "seller finance & payouts"].includes(label);
    if (!isFinanceGroup) return group;
    return { ...group, label: "My Finance & Payouts", subItems: canonicalItems, isSingleItem: false };
  });
};

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
  const userSelector = useSelector((state) => state.user);
  const adminCoreSelector = useSelector((state) => state.adminCore);
  const [userData, setUserData] = useState(null);
  const dynamicSidebarModules = useMemo(() => {
    const sd = adminCoreSelector?.rbacSidebarModulesData;
    return mergeSidebarModuleTrees(
      sd?.data?.normalized?.data,
      sd?.normalized?.normalized?.data,
      sd?.normalized?.data,
      sd?.data?.data?.list,
      sd?.data?.list,
      sd?.data?.data,
      sd?.data,
      userData?.sidebarModules,
      userData?.rbacSidebarModules,
      getStoredUser()?.sidebarModules,
      getStoredSidebarModules(),
    );
  }, [adminCoreSelector?.rbacSidebarModulesData, userData]);
  const accessModules = useMemo(() => {
    const sd = adminCoreSelector?.accessModulesData;
    const payload =
      sd?.data?.data ||
      sd?.normalized?.data ||
      sd?.data?.normalized?.data ||
      sd?.data ||
      {};
    return firstArray(payload?.modules, payload?.list, payload?.items, payload);
  }, [adminCoreSelector?.accessModulesData]);
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
  const currentRole = normalizeRole(userData?.role || getStoredRole());
  const isSuperAdmin = currentRole === "super-admin";
  const permissionModules =
    userSelector?.getMyModulePermissionData?.data?.data?.modules;
  const assignedSidebarModules = useMemo(() => {
    const modules = Array.isArray(permissionModules) ? permissionModules : [];
    return new Set(
      modules
        .filter(
          (module) =>
            (module.permissions || []).some(
              (permission) =>
                String(permission.action || "").toLowerCase() === "view" &&
                permission.assigned === true,
            ) ||
            (!Array.isArray(module.permissions) && module.assigned !== false),
        )
        .flatMap((module) => [
          module.slug,
          module.moduleKey,
          module.moduleSlug,
          module.metadata?.routeKey,
          module.metadata?.requiredModule,
        ])
        .filter(Boolean)
        .map(normalizeModuleCode),
    );
  }, [permissionModules]);

  // ── Build sidebar data ───────────────────────────────────────────────────
  const sidebarData = useMemo(() => {
    // The seller navigation intentionally keeps its access-module fallback.
    // Admin navigation is owned by the backend sidebar tree so stale frontend
    // mappings cannot create duplicate or non-routable menu entries.
    const accessSidebar =
      sellerPanel && Array.isArray(accessModules) && accessModules.length
        ? buildAccessModuleSidebarData(accessModules, {
            sellerPanel,
            superAdmin: isSuperAdmin,
            allowedModules: assignedSidebarModules,
          })
        : [];

    if (Array.isArray(dynamicSidebarModules) && dynamicSidebarModules.length) {
      const sidebarTree = buildDynamicSidebarData(dynamicSidebarModules, {
        superAdmin: isSuperAdmin,
        allowedModules: assignedSidebarModules,
        sellerPanel,
        trustBackend: true,
      });
      if (sellerPanel && sidebarTree.length)
        return normalizeSellerFinanceNavigation(
          removeFestivalSidebarItems(sortSidebarGroups(sidebarTree, sellerPanel)),
        );
      if (sidebarTree.length)
        return removeFestivalSidebarItems(sortSidebarGroups(sidebarTree, sellerPanel));
    }

    if (accessSidebar.length)
      return sellerPanel
        ? normalizeSellerFinanceNavigation(
            removeFestivalSidebarItems(sortSidebarGroups(accessSidebar, sellerPanel)),
          )
        : removeFestivalSidebarItems(sortSidebarGroups(accessSidebar, sellerPanel));

    return [];
  }, [
    sellerPanel,
    accessModules,
    dynamicSidebarModules,
    isSuperAdmin,
    assignedSidebarModules,
  ]);

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
    if (getAccessToken() && (userData?.role || getStoredRole())) {
      const role = userData?.role || getStoredRole();
      const userId = userData?.userId;
      dispatch(
        getAccessModules({
          role,
          includePermissions: true,
          ...(!["seller", "admin", "super-admin"].includes(
            normalizeRole(role),
          ) && userId
            ? { userId }
            : {}),
        }),
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
