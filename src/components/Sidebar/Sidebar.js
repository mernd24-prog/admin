import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  MdChevronRight, MdOutlineDashboard, MdInventory, MdWarehouse,
  MdShoppingCart, MdPeople, MdCampaign, MdAccountBalance,
  MdBarChart, MdSettings, MdStorefront, MdSecurity,
} from 'react-icons/md';
import { CiSettings } from 'react-icons/ci';
import { getMyModulePermission } from '../../Redux/userManagementSlice';
import { getStoredRole, getStoredUser, hasModuleAccess } from '../../_helpers/authStorage';
import { IoIosMenu } from 'react-icons/io';
import { RxCross2 } from 'react-icons/rx';
import { isSellerPanel } from '../../_helpers/panelConfig';
import { getModuleRoute } from '../../_helpers/rbacRoutes';
import { CONTENT_SIDEBAR_ROUTES } from '../../pages/CMS/ContentManagement/contentTypes';

// ─── Route allowlist ──────────────────────────────────────────────────────────
export const SUPPORTED_ADMIN_ROUTES = new Set([
  // Core
  'home',
  // Catalog Management
  'product-catalog', 'add-product', 'draft-products', 'pending-products', 'rejected-products',
  'categories', 'category-attributes',
  'brands',
  'product-options', 'product-option-value', 'product-option-values',
  'product-families',
  'product-reviews',
  'seo-media',
  // Inventory Management
  'inventory-overview', 'variant-inventory', 'inventory-adjustment', 'warehouse', 'low-stock-alerts',
  // Orders Management
  'orders', 'order-return-reasons', 'refunds', 'transactions', 'shipment-tracking',
  'order-status', 'gift-card-orders', 'subscription-orders',
  'order-cancellation-reasons', 'view-orders', 'view-subscription-orders',
  // Users & Access
  'users', 'seller', 'admin-users', 'seller-staff', 'roles-permissions', 'activity-logs',
  'user-permissions',
  // Marketing
  'discount-coupons', 'campaigns', 'promotions-banners', 'messages',
  'special-price', 'volume-discounts', 'similar-products', 'frequently-bought-together',
  'PPC-promotions-management', 'reward-on-purchase',
  'product-event-weightages', 'recommended-product-tag-weightages',
  'referral-commerce', 'badges', 'ribbons',
  // Tax & Compliance
  'hsn-code', 'tax', 'subTax', 'tax-rule', 'shipping-packages',
  'shipping-profile', 'pickup-addresses', 'shipping-company-users', 'shipping-duration',
  'warranty', 'tax-structure', 'tax-category', 'tax-category-rules',
  // Reports
  'reports-sales', 'reports-products', 'reports-inventory', 'reports-sellers',
  // Settings
  'settings', 'setting', 'payment-settings', 'seo-settings',
  // Self-service
  'profile', 'changePassword',
  // Misc (keep backward-compat)
  'batch', 'finish', 'product-variants', 'product-dimensions', 'product-tags',
  'threshold-products', 'hsn-code', 'bar-code', 'qty-head', 'colors',
  'country', 'state', 'city', 'zipcode',
]);

// ─── Tab groupings (module slug → sidebar section label) ─────────────────────
const getTabName = (slug) => {
  const map = {
    // Dashboard
    admin:    'Dashboard',
    // Catalog Management
    products: 'Catalog Management',
    platform: 'Catalog Management',
    warranty: 'Tax & Compliance',
    // Inventory
    inventory: 'Inventory Management',
    // Orders
    orders:    'Orders Management',
    returns:   'Orders Management',
    carts:     'Orders Management',
    payments:  'Orders Management',
    wallets:   'Orders Management',
    subscriptions: 'Orders Management',
    // Users & Access
    users:     'Users & Access',
    sellers:   'Users & Access',
    rbac:      'Users & Access',
    // Marketing
    pricing:         'Marketing',
    'dynamic-pricing':'Marketing',
    referral:        'Marketing',
    loyalty:         'Marketing',
    recommendations: 'Marketing',
    notifications:   'Marketing',
    // Tax & Compliance
    tax:      'Tax & Compliance',
    delivery: 'Tax & Compliance',
    // Reports & Analytics
    analytics: 'Reports & Analytics',
    // Settings
    fraud: 'Settings',
    cms:   'Settings',
  };
  return map[slug] || 'Settings';
};

// ─── Sub-route expansions per module ─────────────────────────────────────────
const MODULE_ROUTE_EXPANSIONS = {
  // Catalog — products module
  products: [
    { label: 'All Products',      route: 'product-catalog'    },
    { label: 'Add Product',       route: 'add-product'        },
    { label: 'Draft Products',    route: 'draft-products'     },
    { label: 'Pending Approval',  route: 'pending-products'   },
    { label: 'Rejected Products', route: 'rejected-products'  },
  ],
  // Catalog — platform module (categories, brands, options)
  platform: [
    { label: 'Category Tree',       route: 'categories'           },
    { label: 'Category Attributes', route: 'category-attributes'  },
    { label: 'Brands',              route: 'brands'               },
    { label: 'Option Masters',      route: 'product-options'      },
    { label: 'Option Values',       route: 'product-option-values'},
    { label: 'Product Families',    route: 'product-families'     },
    { label: 'Product Reviews',     route: 'product-reviews'      },
  ],
  // Inventory
  inventory: [
    { label: 'Stock Overview',       route: 'inventory-overview'   },
    { label: 'Variant Inventory',    route: 'variant-inventory'    },
    { label: 'Inventory Adjustment', route: 'inventory-adjustment' },
    { label: 'Warehouse Management', route: 'warehouse'            },
    { label: 'Low Stock Alerts',     route: 'low-stock-alerts'     },
  ],
  // Orders
  orders: [
    { label: 'Orders',            route: 'orders'               },
    { label: 'Returns',           route: 'order-return-reasons' },
    { label: 'Refunds',           route: 'refunds'              },
    { label: 'Transactions',      route: 'transactions'         },
    { label: 'Shipment Tracking', route: 'shipment-tracking'    },
  ],
  // Users
  users: [
    { label: 'Customers', route: 'users' },
  ],
  sellers: [
    { label: 'Sellers',      route: 'seller'      },
    { label: 'Seller Staff', route: 'seller-staff'},
  ],
  rbac: [
    { label: 'Admin Users',        route: 'admin-users'       },
    { label: 'Roles & Permissions',route: 'roles-permissions' },
    { label: 'Activity Logs',      route: 'activity-logs'     },
  ],
  // Marketing
  pricing: [
    { label: 'Coupons',          route: 'discount-coupons'    },
    { label: 'Special Price',    route: 'special-price'       },
    { label: 'Volume Discounts', route: 'volume-discounts'    },
    { label: 'Campaigns',        route: 'campaigns'           },
  ],
  referral: [
    { label: 'Referral Commerce', route: 'referral-commerce' },
  ],
  notifications: [
    { label: 'Notifications', route: 'messages' },
  ],
  cms: [
    { label: 'Banners',        route: 'promotions-banners' },
    { label: 'Content Pages',  route: 'content-management' },
  ],
  // Tax & Compliance
  tax: [
    { label: 'HSN Codes',  route: 'hsn-code'  },
    { label: 'Taxes',      route: 'tax'       },
    { label: 'Tax Rules',  route: 'tax-rule'  },
  ],
  delivery: [
    { label: 'Shipping Rules',   route: 'shipping-packages'  },
    { label: 'Pickup Addresses', route: 'pickup-addresses'   },
  ],
  warranty: [
    { label: 'Warranty Templates', route: 'warranty' },
  ],
  // Analytics
  analytics: [
    { label: 'Sales Reports',       route: 'reports-sales'     },
    { label: 'Product Analytics',   route: 'reports-products'  },
    { label: 'Inventory Analytics', route: 'reports-inventory' },
    { label: 'Seller Analytics',    route: 'reports-sellers'   },
  ],
  // Content (legacy alias)
  content: CONTENT_SIDEBAR_ROUTES,
};

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
};

const getIconForTab = (tabName) =>
  SECTION_ICONS[String(tabName || '').toLowerCase()] || MdOutlineDashboard;

const isSupportedRoute = (route) => {
  const r = String(route || "").trim();
  return (
    SUPPORTED_ADMIN_ROUTES.has(r) ||
    r === "content-management" ||
    r.startsWith("content-management/")
  );
};

export const buildAdminSidebarData = (permissions = []) => {
  const grouped = (Array.isArray(permissions) ? permissions : []).reduce((acc, curr) => {
    const hasAny = (curr.permissions || []).some((p) => p.assigned) || curr.assigned;
    if (!hasAny) return acc;

    const tabName = curr.tab || curr.metadata?.tab || getTabName(curr.slug);
    if (!acc[tabName]) acc[tabName] = [];

    const expanded = MODULE_ROUTE_EXPANSIONS[curr.slug];
    if (Array.isArray(expanded) && expanded.length) {
      expanded.forEach((item) => {
        if (!isSupportedRoute(item.route)) return;
        acc[tabName].push({
          name: item.label,
          label: item.label,
          module_code: item.route,
          module: curr.slug,
        });
      });
    } else {
      const moduleCode = getModuleRoute(curr.slug);
      if (!isSupportedRoute(moduleCode)) return acc;
      acc[tabName].push({
        name: curr.name,
        label: curr.name,
        module_code: moduleCode,
        module: curr.slug,
      });
    }
    return acc;
  }, {});

  return Object.entries(grouped).map(([tab, mods]) => {
    const unique = Array.from(new Map(mods.map((m) => [m.module_code, m])).values());
    return {
      label: tab,
      icon: getIconForTab(tab),
      subItems: unique,
      isSingleItem: tab.toLowerCase() === 'dashboard' && unique.length === 1,
    };
  }).filter((t) => t.subItems.length > 0);
};

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
  const selector  = useSelector((state) => state.user);
  const permissions = selector?.getMyModulePermissionData?.data?.data?.modules;
  const sellerPanel = isSellerPanel();

  const [activeTab, setActiveTab]   = useState(null);
  const [userData, setUserData]     = useState(null);
  const [isPermanentlyOpen, setIsPermanentlyOpen] = useState(getStoredSidebarState);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [heights, setHeights]         = useState({});
  const [visibleSubItems, setVisibleSubItems] = useState({});

  const location = useLocation();
  const sidebarRef = useRef(null);

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

    if (!permissions) return [];

    return buildAdminSidebarData(permissions);
  }, [permissions, sellerPanel]);

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const sync = () => setUserData(getCurrentSidebarUser());
    sync();
    window.addEventListener('auth:changed', sync);
    window.addEventListener('focus', sync);
    return () => { window.removeEventListener('auth:changed', sync); window.removeEventListener('focus', sync); };
  }, []);

  useEffect(() => {
    if (!sellerPanel && (userData?.userId || userData?.role)) {
      dispatch(
        getMyModulePermission({ _id: userData.userId, role: userData.role }),
      );
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
  const sidebarWidth = isExpanded ? 'w-64' : 'w-16';

  return (
    <div
      ref={sidebarRef}
      className={`fixed lg:static inset-y-0 bg-white ${sidebarWidth} h-full z-[9999] xl:flex flex-col transition-all duration-300 ease-in-out ${navbarOpen ? '' : 'hidden lg:flex'} shadow-lg`}
    >
      {/* Logo / toggle */}
      <div className="sticky top-0 z-10 flex items-center justify-center h-20 px-2 bg-white w-full mt-3 mb-3">
        {isExpanded ? (
          <div className="flex justify-center items-center gap-8">
            <img src="/logo.png" alt="logo" className="w-auto h-20" />
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
          className={`w-full bg-white ${isExpanded ? "p-4" : "p-2"} overflow-hidden overflow-y-auto sidebar-scrollbar`}
        >
          <ul>
            {sidebarData.map((item, index) => {
              const Icon = item.icon;
              const isTabActive = activeTab === item.label;
              const hasActiveChild = item.subItems.some((s) => location.pathname === `/app/${s.module_code}`);

              if (item.isSingleItem) {
                const sub = item.subItems[0];
                const isActive = location.pathname === `/app/${sub.module_code}`;
                return (
                  <li
                    key={index}
                    className={`flex flex-col mt-2 uppercase text-[14px] ${isExpanded ? "" : "items-center"}`}
                  >
                    <Link
                      className={`flex items-center ${isExpanded ? 'gap-3' : 'justify-center'} p-2 rounded transition-colors duration-200 ${isActive ? 'text-black bg-[#F0F0F3]' : 'text-black hover:bg-[#F0F0F3]'}`}
                      to={`/app/${sub.module_code}`}
                      onClick={() => handleNavClick(sub.module_code)}
                      title={!isExpanded ? item.label : ''}
                    >
                      <Icon size={isExpanded ? 22 : 18} className="text-[#082f91]" />
                      {isExpanded && <span className="text-xs">{item.label}</span>}
                    </Link>
                  </li>
                );
              }

              return (
                <li key={index} className={`flex flex-col mt-2 uppercase text-[14px] ${isExpanded ? '' : 'items-center'}`}>
                  {/* Section header */}
                  <div
                    className={`flex items-center ${isExpanded ? "gap-3" : "justify-center"} cursor-pointer p-2 rounded transition-colors duration-200 ${hasActiveChild ? "text-black" : "text-black hover:bg-[#F0F0F3]"}`}
                    onClick={() => toggleTab(item.label)}
                    title={!isExpanded ? item.label : ""}
                  >
                    <Icon size={isExpanded ? 22 : 18} className="text-[#082f91]" />
                    {isExpanded && (
                      <>
                        <span className="text-xs">{item.label}</span>
                        <MdChevronRight className={`ml-auto transition-transform duration-200 text-[#082f91] ${isTabActive ? 'rotate-90' : ''}`} />
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
                          const isSubActive = location.pathname === `/app/${sub.module_code}`;
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
                                className={`flex items-center gap-3 p-2 text-sm transition-all duration-200 ease-in-out rounded ${isSubActive ? 'text-black font-medium bg-[#F0F0F3]' : 'text-gray-600 hover:text-black hover:bg-[#F8F8FA]'}`}
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
    </div>
  );
};

export default Sidebar;
