import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  MdChevronRight, MdOutlineDashboard, MdInventory, MdWarehouse,
  MdShoppingCart, MdPeople, MdCampaign, MdAccountBalance,
  MdBarChart, MdLocationOn,
} from 'react-icons/md';
import { CiSettings } from 'react-icons/ci';
import { getMyModulePermission } from '../../Redux/userManagementSlice';
import { getRbacSidebarModules } from '../../Redux/adminCoreSlice';
import { getAccessToken, getStoredRole, getStoredUser, hasModuleAccess, normalizeRole } from '../../_helpers/authStorage';
import { IoIosMenu } from 'react-icons/io';
import { RxCross2 } from 'react-icons/rx';
import { isSellerPanel } from '../../_helpers/panelConfig';

// ─── Seller panel sections ────────────────────────────────────────────────────
const SELLER_SIDEBAR_SECTIONS = [
  { module: 'analytics',          tab: 'Dashboard',          label: 'Dashboard',      route: 'home'              },
  { module: 'products',           tab: 'Catalog Management', label: 'Products',       route: 'product-catalog'   },
  { module: 'orders',             tab: 'Orders Management',  label: 'Orders',         route: 'orders'            },
  { module: 'pricing',            tab: 'Marketing',          label: 'Coupons',        route: 'discount-coupons'  },
  { module: 'delivery',           tab: 'Tax & Compliance',   label: 'Delivery',       route: 'shipping-packages' },
  { module: 'returns',            tab: 'Orders Management',  label: 'Returns',        route: 'order-return-reasons' },
  { module: 'sellers',            tab: 'Users & Access',     label: 'Profile',        route: 'profile'           },
  { module: 'sellers/commissions',tab: 'Orders Management',  label: 'Commissions',    route: 'transactions'      },
  { module: 'notifications',      tab: 'Marketing',          label: 'Notifications',  route: 'messages'          },
];

// ─── Section icon map ─────────────────────────────────────────────────────────
const SECTION_ICONS = {
  'dashboard':           MdOutlineDashboard,
  'catalog management':  MdInventory,
  'inventory management':MdWarehouse,
  'orders management':   MdShoppingCart,
  'users & access':      MdPeople,
  'marketing':           MdCampaign,
  'tax & compliance':    MdAccountBalance,
  'reports & analytics': MdBarChart,
  'settings':            CiSettings,
  'location management': MdLocationOn,
};

const getIconForTab = (tabName) =>
  SECTION_ICONS[String(tabName || '').toLowerCase()] || MdOutlineDashboard;

const toRouteCode = (routePath = "") =>
  String(routePath || "")
    .replace(/^\/app\/?/, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

const normalizeModuleCode = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");

const flattenSidebarChildren = (items = [], prefix = "") =>
  items.flatMap((item) => {
    const label = prefix ? `${prefix} / ${item.moduleName || item.name}` : (item.moduleName || item.name);
    const route = toRouteCode(item.routePath);
    const children = flattenSidebarChildren(item.children || [], label);
    const self = route
      ? [{
          name: label,
          label,
          module_code: route,
          module: item.metadata?.requiredModule || item.moduleKey || item.slug,
        }]
      : [];
    return [...self, ...children];
  });

const filterSidebarTreeByAccess = (items = [], options = {}) =>
  items
    .map((item) => {
      const requiredModule = normalizeModuleCode(item.metadata?.requiredModule || item.requiredModule || item.moduleKey || item.slug);
      const children = filterSidebarTreeByAccess(item.children || [], options);
      const allowedModules = options.allowedModules || new Set();
      const selfAllowed =
        options.superAdmin ||
        allowedModules.has(requiredModule) ||
        allowedModules.has(normalizeModuleCode(item.moduleKey)) ||
        allowedModules.has(normalizeModuleCode(item.slug)) ||
        !requiredModule ||
        hasModuleAccess(requiredModule) ||
        hasModuleAccess(item.moduleKey) ||
        hasModuleAccess(item.slug);
      if (!selfAllowed && !children.length) return null;
      return { ...item, children };
    })
    .filter(Boolean);

const buildDynamicSidebarData = (modules = [], options = {}) =>
  filterSidebarTreeByAccess(modules, options).map((item) => {
    const subItems = flattenSidebarChildren(item.children || []);
    const route = toRouteCode(item.routePath);
    const isSingleItem = Boolean(route) && subItems.length === 0;
    return {
      label: item.moduleName || item.name,
      icon: getIconForTab(item.moduleName || item.name),
      subItems: isSingleItem ? [{ name: item.moduleName || item.name, label: item.moduleName || item.name, module_code: route }] : subItems,
      isSingleItem,
    };
  }).filter((item) => item.subItems.length > 0);

// ─── Sidebar state helpers ────────────────────────────────────────────────────
const getStoredSidebarState = () => {
  try {
    const exp = sessionStorage.getItem('sidebarExpandedState');
    const perm = sessionStorage.getItem('sidebarPermanentState');
    return Boolean(JSON.parse(exp ?? perm ?? 'false'));
  } catch { return false; }
};

const getSessionUser = () => {
  try { return JSON.parse(sessionStorage.getItem('EcomAdmin') || 'null'); }
  catch { return null; }
};

const getCurrentSidebarUser = () => {
  const s = getSessionUser() || {};
  const u = getStoredUser() || {};
  const role = s.role || s.roleSlug || getStoredRole() || u.role;
  const userId = s.userId || s.id || s._id || u.userId || u.id || u._id;
  if (!userId && !role) return null;
  return { ...u, ...s, userId, role };
};

// ─── Component ───────────────────────────────────────────────────────────────
const Sidebar = ({
  navbarOpen, setNavbarOpen, setModuleName, setIsExpanded, isExpanded, isRefreshConfig, setHasPermanentOpen,
}) => {
  const dispatch = useDispatch();
  const userSelector = useSelector((state) => state.user);
  const adminCoreSelector = useSelector((state) => state.adminCore);
  const dynamicSidebarModules = useMemo(() => {
    const sd = adminCoreSelector?.rbacSidebarModulesData;
    // After asLegacyData: data.normalized.data is the original server array
    if (Array.isArray(sd?.data?.normalized?.data)) return sd.data.normalized.data;
    // Legacy list format
    if (Array.isArray(sd?.data?.data?.list)) return sd.data.data.list;
    // Direct array (some response shapes)
    if (Array.isArray(sd?.data?.data)) return sd.data.data;
    if (Array.isArray(sd?.normalized?.normalized?.data)) return sd.normalized.normalized.data;
    return [];
  }, [adminCoreSelector?.rbacSidebarModulesData]);
  const sellerPanel = isSellerPanel();

  const [activeTab, setActiveTab]   = useState(null);
  const [userData, setUserData]     = useState(null);
  const [isPermanentlyOpen, setIsPermanentlyOpen] = useState(getStoredSidebarState);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [heights, setHeights]         = useState({});
  const [visibleSubItems, setVisibleSubItems] = useState({});

  const location = useLocation();
  const sidebarRef = useRef(null);
  const currentRole = normalizeRole(userData?.role || getStoredRole());
  const isSuperAdmin = currentRole === 'super-admin';
  const permissionModules = userSelector?.getMyModulePermissionData?.data?.data?.modules;
  const assignedSidebarModules = useMemo(() => {
    const modules = Array.isArray(permissionModules) ? permissionModules : [];
    return new Set(
      modules
        .filter((module) =>
          module.assigned !== false ||
          (module.permissions || []).some((permission) => permission.assigned),
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
    if (sellerPanel) {
      const items = SELLER_SIDEBAR_SECTIONS.filter((e) => hasModuleAccess(e.module));
      const grouped = items.reduce((acc, curr) => {
        if (!acc[curr.tab]) acc[curr.tab] = [];
        acc[curr.tab].push({ name: curr.label, label: curr.label, module_code: curr.route });
        return acc;
      }, {});
      return Object.entries(grouped).map(([tab, mods]) => ({
        label: tab,
        icon: getIconForTab(tab),
        subItems: mods,
        isSingleItem: tab.toLowerCase() === 'dashboard' && mods.length === 1,
      }));
    }

    return Array.isArray(dynamicSidebarModules) && dynamicSidebarModules.length
      ? buildDynamicSidebarData(dynamicSidebarModules, {
          superAdmin: isSuperAdmin,
          allowedModules: assignedSidebarModules,
        })
      : [];
  }, [sellerPanel, dynamicSidebarModules, isSuperAdmin, assignedSidebarModules]);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => setUserData(getCurrentSidebarUser());
    sync();
    window.addEventListener('auth:changed', sync);
    window.addEventListener('focus', sync);
    return () => { window.removeEventListener('auth:changed', sync); window.removeEventListener('focus', sync); };
  }, []);

  useEffect(() => {
    if (!sellerPanel && getAccessToken()) {
      if (userData?.userId || userData?.role) {
        dispatch(
          getMyModulePermission({ _id: userData.userId, role: userData.role }),
        );
      }
      dispatch(getRbacSidebarModules());
    }
  }, [userData, dispatch, isRefreshConfig, sellerPanel]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth < 1300 && !isPermanentlyOpen) setNavbarOpen(false);
  }, [isPermanentlyOpen, windowWidth, setNavbarOpen]);

  useEffect(() => {
    const cur = location.pathname.split('/')[2];
    if (!cur) return;
    const match = sidebarData.find((tab) => tab.subItems.some((i) => i.module_code === cur));
    if (match) setActiveTab(match.label);
  }, [location.pathname, sidebarData]);

  useEffect(() => {
    const next = {};
    sidebarData.forEach((item) => { if (!item.isSingleItem) next[item.label] = item.subItems.length * 40; });
    setHeights(next);
  }, [sidebarData]);

  useEffect(() => {
    if (!activeTab || !isExpanded) return;
    setVisibleSubItems((prev) => ({ ...prev, [activeTab]: 0 }));
    const count = sidebarData.find((i) => i.label === activeTab)?.subItems.length || 0;
    const ids = Array.from({ length: count }, (_, i) =>
      setTimeout(() => setVisibleSubItems((p) => ({ ...p, [activeTab]: Math.max(p[activeTab] || 0, i + 1) })), i * 80)
    );
    return () => ids.forEach(clearTimeout);
  }, [activeTab, isExpanded, sidebarData]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleMenuClick = () => {
    const next = !isPermanentlyOpen;
    setHasPermanentOpen(next);
    setIsPermanentlyOpen(next);
    setIsExpanded(next);
    if (next) setNavbarOpen(true);
    sessionStorage.setItem('sidebarPermanentState', JSON.stringify(next));
    sessionStorage.setItem('sidebarExpandedState', JSON.stringify(next));
  };

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
  const sidebarWidth = isExpanded ? 'w-[270px]' : 'w-16';

  return (
    <div
      ref={sidebarRef}
      className={`fixed lg:static inset-y-0 bg-[#faf8f5] ${sidebarWidth} h-full z-[9999] xl:flex flex-col border-r border-[#e8e2db] transition-all duration-300 ease-in-out ${navbarOpen ? '' : 'hidden lg:flex'} shadow-[3px_0_18px_rgba(8,47,145,0.05)]`}
    >
      {/* Logo / toggle */}
      <div className="sticky top-0 z-10 flex items-center justify-center h-[102px] px-3 bg-[#faf8f5] w-full mb-2">
        {isExpanded ? (
          <div className="flex justify-center items-center gap-8">
            <div className="rounded-md border border-[#e8d6b7] bg-white p-2 shadow-sm">
              <img src="/logo.png" alt="logo" className="w-auto h-[62px]" />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <IoIosMenu className="text-2xl cursor-pointer text-[#082f91]" onClick={handleMenuClick} />
          </div>
        )}
        {isExpanded && (
          <button className="text-gray-500 focus:outline-none lg:hidden" onClick={() => setNavbarOpen(false)}>
            <RxCross2 size={24} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto sidebar-scrollbar">
        <nav
          className={`w-full bg-[#faf8f5] ${isExpanded ? "px-4 pb-4" : "p-2"} overflow-hidden overflow-y-auto sidebar-scrollbar`}
        >
          <ul>
            {sidebarData.map((item, index) => {
              const Icon = item.icon;
              const isTabActive = activeTab === item.label;
              const hasActiveChild = item.subItems.some((s) => {
                const path = `/app/${s.module_code}`;
                return location.pathname === path || location.pathname.startsWith(`${path}/`);
              });

              if (item.isSingleItem) {
                const sub = item.subItems[0];
                const path = `/app/${sub.module_code}`;
                const isActive = location.pathname === path || location.pathname.startsWith(`${path}/`);
                return (
                  <li
                    key={index}
                    className={`flex flex-col border-b border-[#ece6e0] py-1 uppercase text-[14px] ${isExpanded ? "" : "items-center"}`}
                  >
                    <Link
                      className={`flex items-center ${isExpanded ? 'gap-3' : 'justify-center'} p-2 rounded-md transition-colors duration-200 ${isActive ? 'bg-[#082f91] text-white' : 'text-[#082f91] hover:bg-[#eef2ff]'}`}
                      to={`/app/${sub.module_code}`}
                      onClick={() => handleNavClick(sub.module_code)}
                      title={!isExpanded ? item.label : ''}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#082f91] bg-white text-[#082f91] shadow-[0_2px_5px_rgba(8,47,145,0.12)]">
                        <Icon size={18} />
                      </span>
                      {isExpanded && <span className="text-[11px] font-semibold">{item.label}</span>}
                    </Link>
                  </li>
                );
              }

              return (
                <li key={index} className={`flex flex-col border-b border-[#ece6e0] py-1 uppercase text-[14px] ${isExpanded ? '' : 'items-center'}`}>
                  {/* Section header */}
                  <div
                    className={`flex items-center ${isExpanded ? "gap-3" : "justify-center"} cursor-pointer p-2 rounded-md transition-colors duration-200 ${hasActiveChild ? "bg-[#082f91] text-white" : "text-[#082f91] hover:bg-[#eef2ff]"}`}
                    onClick={() => toggleTab(item.label)}
                    title={!isExpanded ? item.label : ""}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#082f91] bg-white text-[#082f91] shadow-[0_2px_5px_rgba(8,47,145,0.12)]">
                      <Icon size={18} />
                    </span>
                    {isExpanded && (
                      <>
                        <span className="text-[11px] font-semibold">{item.label}</span>
                        <MdChevronRight className={`ml-auto transition-transform duration-200 ${hasActiveChild ? 'text-white' : 'text-[#082f91]'} ${isTabActive ? 'rotate-90' : ''}`} />
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
                      transform: `translateY(${isTabActive && isExpanded ? '0' : '-10px'})`,
                    }}
                  >
                    {isExpanded && (
                      <ul className="mt-1 ml-6 space-y-1">
                        {item.subItems.map((sub, si) => {
                          const path = `/app/${sub.module_code}`;
                          const isSubActive = location.pathname === path || location.pathname.startsWith(`${path}/`);
                          const isVisible = (visibleSubItems[item.label] || 0) > si;
                          return (
                            <li
                              key={si}
                              className="flex items-center gap-3 mt-2"
                              style={{
                                opacity: isVisible ? 1 : 0,
                                transform: `translateY(${isVisible ? '0' : '-10px'})`,
                                transition: `opacity 200ms ease-out ${si * 80}ms, transform 200ms ease-out ${si * 80}ms`,
                              }}
                            >
                              <Link
                                className={`flex items-center gap-3 p-2 text-sm transition-all duration-200 ease-in-out rounded ${isSubActive ? 'font-medium bg-[#eef2ff] text-[#082f91]' : 'text-gray-600 hover:text-[#082f91] hover:bg-[#eef2ff]'}`}
                                to={`/app/${sub.module_code}`}
                                onClick={() => handleNavClick(sub.module_code)}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#082f91] flex-shrink-0" />
                                <span className="text-xs capitalize">{sub.label}</span>
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
      {isExpanded && (
        <div className="m-4 rounded-lg border border-[#ead9bf] bg-[#fff5df] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#082f91]">Need Help?</p>
          <p className="mt-2 text-[10px] leading-4 text-[#43506a]">
            Our support team is available to help with your account.
          </p>
          <button type="button" className="mt-3 h-8 w-full rounded bg-[#082f91] text-[10px] font-semibold text-white hover:bg-[#062779]">
            Contact Support
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
