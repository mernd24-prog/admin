/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { MdChevronRight, MdOutlineDashboard, MdRequestPage } from 'react-icons/md';
import { getAllModulePermission } from '../../Redux/userManagementSlice';
import { hasModuleAccess } from '../../_helpers/authStorage';
import { IoIosMenu } from 'react-icons/io';
import { RxCross2 } from 'react-icons/rx';
import { FaBlog, FaProductHunt, FaUserGear } from 'react-icons/fa6';
import { GrOrderedList } from 'react-icons/gr';
import {  PiBroomThin } from 'react-icons/pi';
import { BsTruckFlatbed } from 'react-icons/bs';
import { RiChatSmile2Fill } from 'react-icons/ri';
import { CiSettings } from 'react-icons/ci';
import { HiOutlineReceiptTax } from "react-icons/hi";
import { isSellerPanel } from '../../_helpers/panelConfig';
import { getModuleRoute } from '../../_helpers/rbacRoutes';

const getTabName = (slug) => {
  const tabMap = {
    'admin': 'Home',
    'users': 'Users',
    'products': 'Product Management',
    'orders': 'Orders',
    'sellers': 'Seller Management',
    'analytics': 'Analytics',
    'pricing': 'Promotions',
    'referral': 'Promotions',
    'tax': 'Tax',
    'rbac': 'Settings',
    'carts': 'Orders',
    'payments': 'Orders',
    'platform': 'Settings',
    'notifications': 'Settings',
    'wallets': 'Orders',
    'subscriptions': 'Settings',
    'warranty': 'Product Management',
    'loyalty': 'Promotions',
    'recommendations': 'Product Management',
    'returns': 'Orders',
    'fraud': 'Settings',
    'dynamic-pricing': 'Promotions',
    'delivery': 'Shipping/Pickup',
  };
  return tabMap[slug] || 'Settings';
};

const SELLER_SIDEBAR_SECTIONS = [
  { module: "analytics", tab: "Home", label: "Dashboard", route: "home" },
  { module: "products", tab: "Product Management", label: "Products", route: "product-catalog" },
  { module: "orders", tab: "Orders", label: "Orders", route: "orders" },
  { module: "pricing", tab: "Promotions", label: "Coupons", route: "discount-coupons" },
  { module: "delivery", tab: "Shipping/Pickup", label: "Delivery", route: "shipping-packages" },
  { module: "returns", tab: "Orders", label: "Returns", route: "order-return-reasons" },
  { module: "sellers", tab: "Settings", label: "Profile", route: "profile" },
  { module: "sellers/commissions", tab: "Users", label: "Commissions", route: "transactions" },
  { module: "notifications", tab: "Settings", label: "Notifications", route: "messages" },
];

const Sidebar = ({ navbarOpen, setNavbarOpen, setModuleName, setIsExpanded, isExpanded, isRefreshConfig, setHasPermanentOpen }) => {
  const dispatch = useDispatch();
  const selector = useSelector(state => state.user);
  const permissions = selector?.getAllModulePermissionData?.data?.data?.modules;
  const sellerPanel = isSellerPanel();
  const [activeTab, setActiveTab] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isPermanentlyOpen, setIsPermanentlyOpen] = useState(() => {
    return JSON.parse(sessionStorage.getItem('sidebarPermanentState')) || false;
  });
  const location = useLocation();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const sidebarRef = useRef(null);
  const [heights, setHeights] = useState({});
  const [visibleSubItems, setVisibleSubItems] = useState({});

  useEffect(() => {
    const userDataString = sessionStorage.getItem('EcomAdmin');
    if (userDataString) {
      try {
        const parsedData = JSON.parse(userDataString);
        setUserData(parsedData);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!sellerPanel && userData?.userId) {
      dispatch(getAllModulePermission({ _id: userData.userId, role: userData.role }));
    }
  }, [userData, dispatch, isRefreshConfig, sellerPanel]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth < 1300) {
      setNavbarOpen(false);
    }
  }, [windowWidth, setNavbarOpen]);

  useEffect(() => {
    const currentPath = location.pathname.split('/')[2];
    if (currentPath) {
      const matchingTab = getSidebarData().find(tab =>
        tab.subItems.some(item => item.module_code === currentPath)
      );
      if (matchingTab) {
        setActiveTab(matchingTab.label);
      }
    }
  }, [location.pathname, permissions, sellerPanel]);

  useEffect(() => {
    const data = getSidebarData();
    const newHeights = {};
    data.forEach(item => {
      if (!item.isSingleItem) {
        newHeights[item.label] = item.subItems.length * 40;
      }
    });
    setHeights(newHeights);
  }, [permissions, sellerPanel]);

  useEffect(() => {
    if (activeTab && isExpanded) {
      setVisibleSubItems(prev => ({ ...prev, [activeTab]: 0 }));
      
      const subItemsCount = getSidebarData().find(item => item.label === activeTab)?.subItems.length || 0;
      const delays = Array.from({ length: subItemsCount }, (_, i) => i * 100);
      
      delays.forEach((delay, index) => {
        setTimeout(() => {
          setVisibleSubItems(prev => ({ 
            ...prev, 
            [activeTab]: Math.max(prev[activeTab] || 0, index + 1) 
          }));
        }, delay);
      });
    }
  }, [activeTab, isExpanded]);

  const handleMouseEnter = () => {
    if (!isPermanentlyOpen) setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!isPermanentlyOpen) {
      setIsExpanded(false);
      setVisibleSubItems({});
    }
  };
  

  const handleMenuClick = () => {
    const newState = !isPermanentlyOpen;
    setHasPermanentOpen(newState);
    setIsPermanentlyOpen(newState);
    setIsExpanded(newState);
    sessionStorage.setItem('sidebarPermanentState', JSON.stringify(newState));
  };

  const handleNavClick = (moduleCode, shouldCloseNavbar = true) => {
    setModuleName(moduleCode);
    if (shouldCloseNavbar) {
      setNavbarOpen(false);
    }
  };

  const toggleTab = (tabName) => {
    if (activeTab === tabName) {
      setVisibleSubItems(prev => ({ ...prev, [tabName]: 0 }));
      setActiveTab(null);
    } else {
      setActiveTab(tabName);
      setVisibleSubItems(prev => ({ ...prev, [tabName]: 0 }));
    }
  };

  const getSidebarData = () => {
    if (sellerPanel) {
      const sellerItems = SELLER_SIDEBAR_SECTIONS.filter((entry) => hasModuleAccess(entry.module));
      const groupedByTab = sellerItems.reduce((acc, curr) => {
        if (!acc[curr.tab]) acc[curr.tab] = [];
        acc[curr.tab].push({
          name: curr.label,
          label: curr.label,
          module_code: curr.route,
        });
        return acc;
      }, {});

      return Object.entries(groupedByTab).map(([tabName, modules]) => ({
        label: tabName,
        icon: getIconForTab(tabName.toLowerCase()),
        subItems: modules,
        isSingleItem: tabName.toLowerCase() === "home" && modules.length === 1,
      }));
    }

    if (!permissions) return [];

    const groupedByTab = permissions?.reduce((acc, curr) => {
      const hasAssignedPermission = (curr.permissions || []).some(p => p.assigned);
      if (!curr.assigned && !hasAssignedPermission) return acc;
      const moduleCode = getModuleRoute(curr.slug);
      const tabName = curr.tab || curr.metadata?.tab || getTabName(curr.slug);
      if (!acc[tabName]) {
        acc[tabName] = [];
      }

      acc[tabName].push({
        name: curr.name,
        label: curr.name,
        module_code: moduleCode,
      });
      return acc;
    }, {});

    return Object.entries(groupedByTab).map(([tabName, modules]) => {
      if (tabName.toLowerCase() !== 'home') {
        return {
          label: tabName,
          icon: getIconForTab(tabName),
          subItems: modules,
          isSingleItem: false
        };
      } else {
        return {
          label: tabName,
          icon: getIconForTab(tabName),
          subItems: modules,
          isSingleItem: modules.length === 1
        };
      }
    });
  };

  const getIconForTab = (tabName) => {
    const normalizedTabName = String(tabName || "").toLowerCase();
    const iconMap = {
      'home': MdOutlineDashboard,
      'product management': FaProductHunt,
      'requests': MdRequestPage,
      'users': FaUserGear,
      'orders': GrOrderedList,
      'promotions': PiBroomThin,
      'marketing': PiBroomThin,
      'blog': FaBlog,
      'shipping/pickup': BsTruckFlatbed,
      'cms': RiChatSmile2Fill,
      'settings': CiSettings,
      "tax":HiOutlineReceiptTax
    };
    return iconMap[normalizedTabName] || MdOutlineDashboard;
  };

  const sidebarWidth = isExpanded ? 'w-64' : 'w-16';
  const sidebarTransition = 'transition-all duration-300 ease-in-out';

  return (
    <div
      ref={sidebarRef}
      className={`fixed lg:static inset-y-0 bg-white ${sidebarWidth} h-full z-[9999] xl:flex flex-col ${sidebarTransition} ${navbarOpen ? "" : "hidden lg:flex"} shadow-lg`}
      // onMouseEnter={handleMouseEnter}
      // onMouseLeave={handleMouseLeave}
    >
      <div className='sticky top-0 z-10 flex items-center justify-center h-20 px-2 bg-white text-black w-full mt-3 mb-3'>
        {isExpanded ? (
          <div className='flex justify-center place-items-center gap-8'>
           
              <img src='/logo.png' alt='logo' className='w-auto h-20 ' />
               
           
           
            {/* <IoIosMenu
              className='text-2xl text-black cursor-pointer'
              onClick={handleMenuClick}
            /> */}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <IoIosMenu
              className='text-2xl cursor-pointer bg-white text-[#989AFF]'
               
              onClick={handleMenuClick}
            />
          </div>
        )}
        {isExpanded && (
          <button className='text-gray-500 focus:outline-none lg:hidden' onClick={() => setNavbarOpen(false)}>
            <RxCross2 size={24} />
          </button>
        )}
      </div>

      <div className='flex-1 overflow-y-auto  '>
        <nav className={`w-full bg-white ${isExpanded ? 'p-4' : 'p-2'} overflow-hidden overflow-y-auto`}>
          <ul>
            {getSidebarData().map((item, index) => {
              const IconComponent = item.icon;
              const isTabActive = activeTab === item.label;
              const hasActiveChild = item.subItems.some(
                subItem => location.pathname === `/app/${subItem.module_code}`
              );

              if (item.isSingleItem) {
                const subItem = item.subItems[0];
                const isActive = location.pathname === `/app/${subItem.module_code}`;

                return (
                  <li key={index} className={`flex flex-col mt-2 uppercase text-[14px] ${isExpanded ? '' : 'items-center'}`}>
                    <Link
                      className={`flex items-center ${isExpanded ? 'gap-3' : 'justify-center'} p-2 rounded transition-colors duration-200 ${isActive ? 'text-black bg-[#F0F0F3]' : 'text-black hover:bg-[#F0F0F3]'}`}
                      to={`/app/${subItem.module_code}`}
                      onClick={() => handleNavClick(subItem.module_code)}
                      title={!isExpanded ? item.label : ''}
                    >
                      <IconComponent size={isExpanded ? 22 : 18} className="bg-white text-[#989AFF]"/>
                      {isExpanded && (
                        <span className='text-xs'>{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              }

              return (
                <li key={index} className={`flex flex-col mt-2 uppercase text-[14px] ${isExpanded ? '' : 'items-center'}`}>
                  <div
                    className={`flex items-center ${isExpanded ? 'gap-3' : 'justify-center'} cursor-pointer p-2 rounded transition-colors duration-200 ${hasActiveChild ? 'text-black' : 'text-black hover:bg-[#F0F0F3]'}`}
                    onClick={() => toggleTab(item.label)}
                    title={!isExpanded ? item.label : ''}
                  >
                    <IconComponent size={isExpanded ? 22 : 18} className="bg-white text-[#989AFF]" />
                    {isExpanded && (
                      <>
                        <span className='text-xs'>{item.label}</span>
                        <MdChevronRight
                          className={`ml-auto transition-transform duration-200 ${isTabActive ? 'rotate-90' : ''}`}
                        />
                      </>
                    )}
                  </div>
                  
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden`}
                    style={{
                      maxHeight: isTabActive && isExpanded ? `${heights[item.label] || 0}px` : '0px',
                      opacity: isTabActive && isExpanded ? 1 : 0,
                      transform: `translateY(${isTabActive && isExpanded ? '0' : '-10px'})`
                    }}
                  >
                    {isExpanded && (
                      <ul className="mt-1 ml-6 space-y-1">
                        {item?.subItems?.map((subItem, subIndex) => {
                          const isSubActive = location.pathname === `/app/${subItem.module_code}`;
                          const isVisible = (visibleSubItems[item.label] || 0) > subIndex;

                          return (
                            <li 
                              key={subIndex} 
                              className="flex items-center gap-3 mt-2"
                              style={{
                                opacity: isVisible ? 1 : 0,
                                transform: `translateY(${isVisible ? '0' : '-10px'})`,
                                transition: `opacity 200ms ease-out ${subIndex * 100}ms, transform 200ms ease-out ${subIndex * 100}ms`
                              }}
                            >
                              <Link
                                className={`flex items-center gap-3 p-2 text-sm transition-all duration-200 ease-in-out rounded ${isSubActive
                                  ? 'text-black font-medium'
                                  : 'text-black hover:text-black'
                                  }`}
                                to={`/app/${subItem.module_code}`}
                                onClick={() => handleNavClick(subItem.module_code)}
                              >
                                <span className="w-1 h-1 rounded-full bg-white text-black"></span>
                                <span className='text-xs capitalize'>{subItem.label}</span>
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
