import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import PermissionNotAllowed from "../Atoms/PermissionsNotAllowed/PermissionNotAllowed";
import ComingSoonPage from "../Shared/ComingSoonPage";
import { socketConnection } from "../../_helpers/socket";
import { hasModuleAccess } from "../../_helpers/authStorage";
import { useSessionHeartbeat } from "../../_helpers/useSessionHeartbeat";
import {
  getRouteModuleCandidates,
  isSelfServiceRoute,
} from "../../_helpers/rbacRoutes";
import ProductOptionValue from "../../pages/ProductManagement/ProductOptions/ProductOptionValue";

import Tax from "../../pages/Tax/Tax";
import TaxCompliance from "../../pages/Tax/TaxCompliance";
import SubTax from "../../pages/Tax/SubTax";
import TaxRule from "../../pages/Tax/TaxRule/TaxRule";
import BarcodePage from "../../pages/Admin/Barcode/Barcode";
import HsnCode from "../../pages/Admin/HsnCode/HsnCode";
import { PageSkeletonLoader } from "../Loader/SkeletonLoader";

const valueFieldSelector =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]), select, textarea';

 

 

const syncPrefilledFieldState = (root) => {
  if (!root) return;

  root.querySelectorAll(valueFieldSelector).forEach((field) => {
    const hasValue = String(field.value || "").trim() !== "";
    if (hasValue) {
      field.dataset.hasValue = "true";
    } else {
      delete field.dataset.hasValue;
    }
  });
};

const Dashboard = React.lazy(() => import("../../pages/dashboard/Dashboard"));
const AdminUsers = React.lazy(
  () => import("../../pages/UserManagement/Adminusers/AdminUsers"),
);
const Users = React.lazy(
  () => import("../../pages/UserManagement/Users/Users"),
);
const UserDetails = React.lazy(
  () => import("../../pages/UserManagement/UserDetails/UserDetails"),
);
const UsersTransactions = React.lazy(
  () =>
    import("../../pages/UserManagement/UsersTransactions/UsersTransactions"),
);
const ViewTransaction = React.lazy(
  () => import("../../pages/UserManagement/UsersTransactions/ViewTransaction"),
);

const ProductCatalog = React.lazy(
  () => import("../../pages/ProductManagement/ProductCatalog/ProductCatalog"),
);
const SellerProductInventories = React.lazy(
  () =>
    import("../../pages/ProductManagement/SellerProductInventories/SellerProductInventories"),
);
const Store = React.lazy(
  () => import("../../pages/ProductManagement/Store/Store"),
);
const Brands = React.lazy(
  () => import("../../pages/ProductManagement/Brands/Brands"),
);
const ProductOptions = React.lazy(
  () => import("../../pages/ProductManagement/ProductOptions/ProductOptions"),
);
const ProductTags = React.lazy(
  () => import("../../pages/ProductManagement/ProductTags/ProductTags"),
);
const ThresholdProducts = React.lazy(
  () =>
    import("../../pages/ProductManagement/ThresholdProducts/ThresholdProducts"),
);
const InventoryAudit = React.lazy(
  () =>
    import("../../pages/ProductManagement/InventoryAudit/InventoryAudit"),
);
const Orders = React.lazy(
  () => import("../../pages/OrdersManagement/Orders/Orders"),
);
const Carts = React.lazy(
  () => import("../../pages/OrdersManagement/Carts/Carts"),
);
const CheckoutQuote = React.lazy(
  () => import("../../pages/OrdersManagement/CheckoutQuote/CheckoutQuote"),
);
const Payments = React.lazy(
  () => import("../../pages/OrdersManagement/Payments/Payments"),
);
const Returns = React.lazy(
  () => import("../../pages/OrdersManagement/Returns/Returns"),
);
const SellerFinance = React.lazy(
  () => import("../../pages/OrdersManagement/SellerFinance/SellerFinance"),
);
const CommissionRules = React.lazy(
  () => import("../../pages/OrdersManagement/CommissionRules/CommissionRules"),
);
const PlatformFeeConfig = React.lazy(
  () => import("../../pages/OrdersManagement/PlatformFeeConfig/PlatformFeeConfig"),
);
const CommerceSettings = React.lazy(
  () => import("../../pages/OrdersManagement/CommerceSettings/CommerceSettings"),
);
const OrderStatus = React.lazy(
  () => import("../../pages/OrdersManagement/OrderStatus/OrderStatus"),
);
const ProductReviews = React.lazy(
  () => import("../../pages/OrdersManagement/ProductReviews/ProductReviews"),
);
const SpecialPrice = React.lazy(
  () => import("../../pages/Promotions/SpecialPrice/SpecialPrice"),
);
const VolumeDiscount = React.lazy(
  () => import("../../pages/Promotions/VolumeDiscount/VolumeDiscount"),
);
const SimilarProducts = React.lazy(
  () => import("../../pages/Promotions/SimilarProducts/SimilarProducts"),
);
const FrequentlyBoughtTogether = React.lazy(
  () =>
    import("../../pages/Promotions/FrequentlyBoughtTogether/FrequentlyBoughtTogether"),
);
const PPCPromotionsManagement = React.lazy(
  () =>
    import("../../pages/Promotions/PPCPromotionsManagement/PPCPromotionsManagement"),
);
const RewardOnPurchase = React.lazy(
  () => import("../../pages/Promotions/RewardOnPurchase/RewardOnPurchase"),
);
const ProductEventWeightages = React.lazy(
  () =>
    import("../../pages/Promotions/ProductEventWeightages/ProductEventWeightages"),
);
const RecommendedProductTagWeightages = React.lazy(
  () =>
    import("../../pages/Promotions/RecommendedProductTagWeightages/RecommendedProductTagWeightages"),
);
const DiscountCoupons = React.lazy(
  () => import("../../pages/Promotions/DiscountCoupons/DiscountCoupons"),
);
const ReferralCommerce = React.lazy(
  () => import("../../pages/ReferralCommerce/ReferralCommerce"),
);

const ShippingCompanyUsers = React.lazy(
  () =>
    import("../../pages/ShippingPickup/ShippingCompanyUsers/ShippingCompanyUsers"),
);
const ShippingPackages = React.lazy(
  () => import("../../pages/ShippingPickup/ShippingPackages/ShippingPackages"),
);
const ShippingProfiles = React.lazy(
  () => import("../../pages/ShippingPickup/ShippingProfiles/ShippingProfiles"),
);
const PickupAddresses = React.lazy(
  () => import("../../pages/ShippingPickup/PickupAddresses/PickupAddresses"),
);
const ShipmentTracking = React.lazy(
  () => import("../../pages/ShippingPickup/ShipmentTracking/ShipmentTracking"),
);

const AddEditProductPopup = React.lazy(
  () =>
    import("../../pages/ProductManagement/ProductCatalog/components/AddEditProduct"),
);
const ProductAdminDetails = React.lazy(
  () =>
    import("../../pages/ProductManagement/ProductCatalog/components/ProductAdminDetails"),
);
const ProductCategories = React.lazy(
  () =>
    import("../../pages/ProductManagement/ProductCategories/ProductCategories"),
);
const CategoryAttributes = React.lazy(
  () =>
    import("../../pages/ProductManagement/ProductCategories/CategoryAttributes"),
);
const OrderSummary = React.lazy(
  () => import("../../pages/OrdersManagement/Orders/components/ViewOrders"),
);
const SubscriptionOrders = React.lazy(
  () =>
    import("../../pages/OrdersManagement/SubscriptionOrders/SubscriptionOrders"),
);
const ViewSubscriptionOrders = React.lazy(
  () =>
    import("../../pages/OrdersManagement/SubscriptionOrders/components/ViewSubscriptionOrders"),
);
const ManageCountry = React.lazy(
  () => import("../../pages/UserManagement/ManageCountry/ManageCountry"),
);
const ManageState = React.lazy(
  () => import("../../pages/UserManagement/ManageState/ManageState"),
);
const ManageCity = React.lazy(
  () => import("../../pages/UserManagement/ManageCity/ManageCity"),
);
const ManageZipCode = React.lazy(
  () => import("../../pages/UserManagement/ManageZipCode/ManageZipCode"),
);
const ContentManagement = React.lazy(
  () => import("../../pages/CMS/ContentManagement/ContentManagement"),
);
const GiftCardOrder = React.lazy(
  () => import("../../pages/OrdersManagement/GiftCardOrder/GiftCardOrder"),
);
const OrderCancellationReasons = React.lazy(
  () =>
    import("../../pages/OrdersManagement/Order Cancellation Reasons/OrderCancellationReasons"),
);
const OrderReturn = React.lazy(
  () => import("../../pages/OrdersManagement/Order Return Reason/OrderReturn"),
);
const Profile = React.lazy(() => import("../../pages/My Profile/Profile"));
const ChangePassword = React.lazy(
  () => import("../../pages/Change Password/ChangePassword"),
);

const TaxStructure = React.lazy(
  () => import("../../pages/Admin/Tax/TaxStructure"),
);
const TaxCategory = React.lazy(
  () => import("../../pages/Admin/Tax/TaxCategory"),
);
const TaxRules = React.lazy(() => import("../../pages/Admin/Tax/TaxRules"));

const ProductVariants = React.lazy(
  () => import("../../pages/ProductManagement/ProductVariants/ProductVariants"),
);
const ProductFamilies = React.lazy(
  () => import("../../pages/ProductManagement/ProductFamilies/ProductFamilies"),
);
const ProductFlow = React.lazy(
  () => import("../../pages/ProductManagement/ProductFlow/ProductFlow"),
);
const ProductDimensions = React.lazy(
  () =>
    import("../../pages/ProductManagement/ProductDimensions/ProductDimensions"),
);
const FinishProducts = React.lazy(
  () => import("../../pages/ProductManagement/FinishProduct/FinishProduct"),
);

const ProductWarranty = React.lazy(
  () => import("../../pages/ProductManagement/ProductWarranty/ProductWarranty"),
);
const Sellers = React.lazy(
  () => import("../../pages/UserManagement/Sellers/Seller"),
);
const UserPermissions = React.lazy(
  () => import("../../pages/UserManagement/Adminusers/UserPermissions"),
);
const SellerUsers = React.lazy(
  () => import("../../pages/SellerManagement/SellerUsers"),
);

// ── Inventory Management ────────────────────────────────────────────────────
const InventoryOverview = React.lazy(
  () => import("../../pages/Inventory/InventoryOverview"),
);
const VariantInventory = React.lazy(
  () => import("../../pages/Inventory/VariantInventory"),
);
const InventoryAdjustment = React.lazy(
  () => import("../../pages/Inventory/InventoryAdjustment"),
);
const InventoryTransactions = React.lazy(
  () => import("../../pages/Inventory/InventoryTransactions"),
);
const WarehouseManagement = React.lazy(
  () => import("../../pages/Inventory/WarehouseManagement"),
);
const LowStockAlerts = React.lazy(
  () => import("../../pages/Inventory/LowStockAlerts"),
);

// ── Reports & Analytics ─────────────────────────────────────────────────────
const SalesReport = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.SalesReport,
  })),
);
const ProductAnalytics = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.ProductAnalytics,
  })),
);
const InventoryAnalytics = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.InventoryAnalytics,
  })),
);
const SellerAnalytics = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.SellerAnalytics,
  })),
);
const OrdersReport = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.OrdersReport,
  })),
);
const PaymentsReport = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.PaymentsReport,
  })),
);
const ReturnsReport = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.ReturnsReport,
  })),
);
const CancellationReport = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.CancellationReport,
  })),
);
const DeliveryReport = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.DeliveryReport,
  })),
);
const CommissionReport = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.CommissionReport,
  })),
);
const UserReport = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.UserReport,
  })),
);
const AnalyticsDashboard = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.AnalyticsDashboard,
  })),
);
const DynamicPricingReport = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.DynamicPricingReport,
  })),
);
const NotificationsOverview = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.NotificationsOverview,
  })),
);
const SubscriptionsOverview = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.SubscriptionsOverview,
  })),
);

const UserMessages = React.lazy(
  () => import("../../pages/UserManagement/UserMessages/UserMessages"),
);

// ── New feature pages ────────────────────────────────────────────────────────
const DealManagement = React.lazy(
  () => import("../../pages/Promotions/DealManagement/DealManagement"),
);
const DealPayouts = React.lazy(
  () => import("../../pages/Promotions/DealManagement/DealPayouts"),
);
const DealSponsorships = React.lazy(
  () => import("../../pages/Promotions/DealManagement/DealSponsorships"),
);
const Cancellations = React.lazy(
  () => import("../../pages/OrdersManagement/Cancellations/Cancellations"),
);
const TaxInvoices = React.lazy(
  () => import("../../pages/Tax/TaxInvoices"),
);
const CreditNotes = React.lazy(
  () => import("../../pages/Tax/CreditNotes"),
);
const SubscriptionPlans = React.lazy(
  () => import("../../pages/OrdersManagement/SubscriptionOrders/SubscriptionPlans"),
);
const Chargebacks = React.lazy(
  () => import("../../pages/OrdersManagement/Payments/Chargebacks"),
);
const FraudCases = React.lazy(
  () => import("../../pages/OrdersManagement/Payments/FraudCases"),
);
const CodConfig = React.lazy(
  () => import("../../pages/OrdersManagement/Payments/CodConfig"),
);
const SellerPayouts = React.lazy(
  () => import("../../pages/OrdersManagement/SellerFinance/SellerPayouts"),
);
const NotificationTemplates = React.lazy(
  () => import("../../pages/UserManagement/NotificationAdmin/NotificationTemplates"),
);
const InfluencerManagement = React.lazy(
  () => import("../../pages/ReferralCommerce/InfluencerManagement/InfluencerManagement"),
);
const CollectionsPage = React.lazy(
  () => import("../../pages/Admin/Collection/Collections"),
);
const BadgesPage = React.lazy(
  () => import("../../pages/Admin/Badge/Badges"),
);
const AnalyticsEvents = React.lazy(
  () => import("../../pages/Reports/AnalyticsEvents"),
);
// ── System Admin pages ───────────────────────────────────────────────────────
const SystemHealth = React.lazy(
  () => import("../../pages/Admin/SystemAdmin/SystemHealth"),
);
const QueueManagement = React.lazy(
  () => import("../../pages/Admin/SystemAdmin/QueueManagement"),
);
const DeadLetterQueue = React.lazy(
  () => import("../../pages/Admin/SystemAdmin/DeadLetterQueue"),
);
const ApiKeys = React.lazy(
  () => import("../../pages/Admin/SystemAdmin/ApiKeys"),
);
const FeatureFlags = React.lazy(
  () => import("../../pages/Admin/SystemAdmin/FeatureFlags"),
);
const Webhooks = React.lazy(
  () => import("../../pages/Admin/SystemAdmin/Webhooks"),
);

// ── Seller Management ────────────────────────────────────────────────────────
const SellerOnboarding = React.lazy(
  () => import("../../pages/SellerOnboarding/SellerOnboarding"),
);
const SellerStatusPage = React.lazy(
  () => import("../../pages/SellerStatus/SellerStatusPage"),
);
const SellerSubAdminManagement = React.lazy(
  () => import("../../pages/SellerManagement/SellerSubAdminManagement"),
);

// ── CMS & Content ────────────────────────────────────────────────────────────
const ContentPages = React.lazy(
  () => import("../../pages/CMS/ContentPages/ContentPages"),
);

// ── User Preferences ─────────────────────────────────────────────────────────
const Preferences = React.lazy(
  () => import("../../pages/UserManagement/preferences/Preferences"),
);

// ── RBAC Management Pages ───────────────────────────────────────────────────
const RolesPermissions = React.lazy(
  () => import("../../pages/UserManagement/RolesPermissions/RolesPermissions"),
);
const ModuleManagement = React.lazy(
  () => import("../../pages/UserManagement/ModuleManagement/ModuleManagement"),
);
const ActivityLogs = React.lazy(
  () => import("../../pages/UserManagement/ActivityLogs/ActivityLogs"),
);
const RbacAuditLog = React.lazy(
  () => import("../../pages/UserManagement/RbacAuditLog/RbacAuditLog"),
);
const PermissionTemplates = React.lazy(
  () =>
    import("../../pages/UserManagement/PermissionTemplates/PermissionTemplates"),
);

const getStoredSidebarState = () => {
  try {
    const expandedState = sessionStorage.getItem("sidebarExpandedState");
    const permanentState = sessionStorage.getItem("sidebarPermanentState");
    return Boolean(JSON.parse(expandedState ?? permanentState ?? "false"));
  } catch {
    return false;
  }
};

function Layout() {
  useSessionHeartbeat();

  const location = useLocation();
  const [navbarOpen, setNavbarOpen] = useState(getStoredSidebarState);
  const [moduleName, setModuleName] = useState("");
  const [isExpanded, setIsExpanded] = useState(getStoredSidebarState);
  const [isRefreshConfig, setIsRefreshConfig] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isPermissionShow, setIsPermissionShow] = useState(false);
  const selector = useSelector((state) => state.user);
  const permissions = selector?.getMyModulePermissionData?.data?.data;
  const [hasPermanentOpen, setHasPermanentOpen] = useState(() => {
    if (typeof window === "undefined") return getStoredSidebarState();
    return window.matchMedia("(min-width: 1024px)").matches
      ? true
      : getStoredSidebarState();
  });

  useEffect(() => {
    setSocket(socketConnection());
  }, []);

  useEffect(() => {
    const root = document.querySelector(".admin-shell");
    if (!root) return undefined;

    const syncField = (event) => {
      if (event.target?.matches?.(valueFieldSelector)) {
        syncPrefilledFieldState(root);
      }
    };

    syncPrefilledFieldState(root);

    const observer = new MutationObserver(() => syncPrefilledFieldState(root));
    observer.observe(root, { childList: true, subtree: true });

    const intervalId = window.setInterval(
      () => syncPrefilledFieldState(root),
      500,
    );

    root.addEventListener("input", syncField, true);
    root.addEventListener("change", syncField, true);

    return () => {
      observer.disconnect();
      window.clearInterval(intervalId);
      root.removeEventListener("input", syncField, true);
      root.removeEventListener("change", syncField, true);
    };
  }, []);

  const modulePermissions = useMemo(() => {
    const permMap = {};
    const normalizeModule = (value = "") =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/_/g, "-");
    const modules = Array.isArray(permissions?.modules)
      ? permissions.modules
      : Array.isArray(permissions)
        ? permissions
        : [];

    if (modules.length) {
      modules.forEach((module) => {
        const moduleCode = normalizeModule(
          module.slug ||
          module.moduleKey ||
          module.moduleSlug ||
          module.module ||
          module.module_code?.module_code ||
          module.module_code ||
          module.metadata?.requiredModule,
        );

        if (!moduleCode) return;

        const hasViewAction = Array.isArray(module.permissions)
          ? module.permissions.some(
            (permission) =>
              String(permission.action || "").toLowerCase() === "view" &&
              permission.assigned === true,
          )
          : module.assigned !== false;
        const isAssigned = module.assigned !== false && hasViewAction;

        [
          moduleCode,
          normalizeModule(module.slug),
          normalizeModule(module.moduleKey),
          normalizeModule(module.moduleSlug),
          normalizeModule(module.metadata?.requiredModule),
        ]
          .filter(Boolean)
          .forEach((code) => {
            permMap[code] = isAssigned;
          });
      });
    }
    return permMap;
  }, [permissions]);

  useEffect(() => {
    socket?.on("refreshed-configurations", (data) => {
      setIsPermissionShow(true);
      setIsRefreshConfig((value) => !value);
    });

    return () => {
      socket?.off("refreshed-configurations");
    };
  }, [socket]);

  const hasPermission = (path) => {
    if (isSelfServiceRoute(path)) return true;

    const moduleCandidates = getRouteModuleCandidates(path);
    if (!moduleCandidates.length) return true;

    return moduleCandidates.some((moduleCode) => {
      const normalizedModuleCode = String(moduleCode || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/_/g, "-");
      if (modulePermissions[normalizedModuleCode] === true) return true;
      if (modulePermissions[normalizedModuleCode] === false) return false;
      return hasModuleAccess(moduleCode);
    });
  };

  const renderRoute = (path, element) => {
    if (!hasPermission(path)) {
      return <PermissionNotAllowed loading={isPermissionShow} />;
    }

 

    return element;
  };

  const renderSupportedRoute = (path, element) => {
    return renderRoute(path, element);
  };

  const handleSidebarToggle = useCallback(() => {
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const nextOpen = isDesktop ? !isExpanded : !navbarOpen;

    setNavbarOpen(isDesktop ? true : nextOpen);
    setIsExpanded(nextOpen);
    setHasPermanentOpen(isDesktop ? true : false);

    sessionStorage.setItem("sidebarExpandedState", JSON.stringify(nextOpen));
    sessionStorage.setItem(
      "sidebarPermanentState",
      JSON.stringify(isDesktop ? true : false),
    );
  }, [isExpanded, navbarOpen]);

  return (
    <div className="admin-shell relative flex h-screen overflow-hidden  bg-[var(--admin-shell)]">
      <div className={`z-50`}>
        <Sidebar
          navbarOpen={navbarOpen}
          setNavbarOpen={setNavbarOpen}
          setModuleName={setModuleName}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          isRefreshConfig={isRefreshConfig}
          setHasPermanentOpen={setHasPermanentOpen}
        />
      </div>

      <div
        className={`relative flex flex-col flex-1 overflow-hidden !bg-[var(--admin-shell)] ${navbarOpen ? "" : "lg:ml-0"
          }`}
      >
        <Header
          handleNavbar={handleSidebarToggle}
          moduleName={moduleName}
          hasPermanentOpen={hasPermanentOpen}
          isSidebarExpanded={isExpanded}
        />

        <main className="flex-1  overflow-y-auto rounded-tl-[28px] bg-[var(--admin-canvas)] sidebar-scrollbar">
          <Suspense fallback={<PageSkeletonLoader />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                className="admin-page-transition"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <Routes location={location}>
                  <Route
                    path="/home"
                    element={renderRoute("/home", <Dashboard />)}
                  />
                  <Route
                    path="/admin-users"
                    element={renderRoute("/admin-users", <AdminUsers />)}
                  />
                  <Route
                    path="/admin-users/view/:id"
                    element={renderRoute(
                      "/admin-users",
                      <UserPermissions setModuleName={setModuleName} />,
                    )}
                  />
                  <Route
                    path="/seller-management"
                    element={renderRoute("/seller-users", <SellerUsers />)}
                  />
                  <Route
                    path="/seller-users"
                    element={renderRoute("/seller-users", <SellerUsers />)}
                  />
                  <Route
                    path="/users"
                    element={renderRoute("/users", <Users />)}
                  />
                  <Route
                    path="/users/view/:id"
                    element={renderRoute("/users", <UserDetails />)}
                  />
                  <Route
                    path="/seller/view/:id"
                    element={renderRoute("/seller", <UserDetails />)}
                  />
                  <Route
                    path="/transactions"
                    element={renderRoute(
                      "/transactions",
                      <UsersTransactions />,
                    )}
                  />
                  <Route
                    path="/transactions/view/:id"
                    element={renderRoute("/transactions", <ViewTransaction />)}
                  />

                  <Route
                    path="/product-flow"
                    element={renderRoute("/product-flow", <ProductFlow />)}
                  />
                  <Route
                    path="/product-catalog"
                    element={renderRoute(
                      "/product-catalog",
                      <ProductCatalog />,
                    )}
                  />
                  <Route
                    path="/seller-Product-Inventory"
                    element={renderRoute(
                      "/seller-Product-Inventory",
                      <SellerProductInventories />,
                    )}
                  />
                  <Route
                    path="/seller-product-inventory"
                    element={renderRoute(
                      "/seller-product-inventory",
                      <SellerProductInventories />,
                    )}
                  />
                  <Route
                    path="/store"
                    element={renderRoute("/store", <Store />)}
                  />
                  <Route
                    path="/brands"
                    element={renderRoute("/brands", <Brands />)}
                  />
                  <Route
                    path="/product-options"
                    element={renderRoute(
                      "/product-options",
                      <ProductOptions />,
                    )}
                  />
                  <Route
                    path="/product-tags"
                    element={renderRoute("/product-tags", <ProductTags />)}
                  />
                  <Route
                    path="/threshold-products"
                    element={renderRoute(
                      "/threshold-products",
                      <ThresholdProducts />,
                    )}
                  />
                  <Route
                    path="/inventory-audit"
                    element={renderRoute(
                      "/inventory-audit",
                      <InventoryAudit />,
                    )}
                  />
                  <Route
                    path="/orders"
                    element={renderRoute("/orders", <Orders />)}
                  />
                  <Route
                    path="/carts"
                    element={renderRoute("/carts", <Carts />)}
                  />
                  <Route
                    path="/checkout-quote"
                    element={renderRoute("/checkout-quote", <CheckoutQuote />)}
                  />
                  <Route
                    path="/payments"
                    element={renderRoute("/payments", <Payments />)}
                  />
                  <Route
                    path="/seller-finance"
                    element={renderRoute("/seller-finance", <SellerFinance />)}
                  />
                  <Route
                    path="/commission-rules"
                    element={renderRoute("/commission-rules", <CommissionRules />)}
                  />
                  <Route
                    path="/platform-fee-config"
                    element={renderRoute("/platform-fee-config", <PlatformFeeConfig />)}
                  />
                  <Route
                    path="/commerce-settings"
                    element={renderRoute("/commerce-settings", <CommerceSettings />)}
                  />
                  <Route
                    path="/returns"
                    element={renderRoute("/returns", <Returns />)}
                  />
                  <Route
                    path="/refunds"
                    element={renderRoute("/refunds", <Returns />)}
                  />
                  <Route
                    path="/order-status"
                    element={renderRoute("/order-status", <OrderStatus />)}
                  />
                  <Route
                    path="/gift-card-orders"
                    element={renderRoute(
                      "/gift-card-orders",
                      <GiftCardOrder />,
                    )}
                  />
                  <Route
                    path="/order-cancellation-reasons"
                    element={renderRoute(
                      "/order-cancellation-reasons",
                      <OrderCancellationReasons />,
                    )}
                  />
                  <Route
                    path="/order-return-reasons"
                    element={renderRoute(
                      "/order-return-reasons",
                      <OrderReturn />,
                    )}
                  />
                  <Route
                    path="/product-reviews"
                    element={renderRoute(
                      "/product-reviews",
                      <ProductReviews />,
                    )}
                  />
                  <Route
                    path="/special-price"
                    element={renderRoute("/special-price", <SpecialPrice />)}
                  />
                  <Route
                    path="/volume-discounts"
                    element={renderRoute(
                      "/volume-discounts",
                      <VolumeDiscount />,
                    )}
                  />
                  <Route
                    path="/similar-products"
                    element={renderRoute(
                      "/similar-products",
                      <SimilarProducts />,
                    )}
                  />
                  <Route
                    path="/frequently-bought-together"
                    element={renderRoute(
                      "/frequently-bought-together",
                      <FrequentlyBoughtTogether />,
                    )}
                  />
                  <Route
                    path="/PPC-promotions-management"
                    element={renderRoute(
                      "/PPC-promotions-management",
                      <PPCPromotionsManagement />,
                    )}
                  />
                  <Route
                    path="/reward-on-purchase"
                    element={renderRoute(
                      "/reward-on-purchase",
                      <RewardOnPurchase />,
                    )}
                  />
                  <Route
                    path="/product-event-weightages"
                    element={renderRoute(
                      "/product-event-weightages",
                      <ProductEventWeightages />,
                    )}
                  />
                  <Route
                    path="/recommended-product-tag-weightages"
                    element={renderRoute(
                      "/recommended-product-tag-weightages",
                      <RecommendedProductTagWeightages />,
                    )}
                  />
                  <Route
                    path="/discount-coupons"
                    element={renderRoute(
                      "/discount-coupons",
                      <DiscountCoupons />,
                    )}
                  />
                  <Route
                    path="/referral-commerce"
                    element={renderRoute(
                      "/referral-commerce",
                      <ReferralCommerce />,
                    )}
                  />

                  <Route
                    path="/shipping-company-users"
                    element={renderRoute(
                      "/shipping-company-users",
                      <ShippingCompanyUsers />,
                    )}
                  />
                  <Route
                    path="/shipping-packages"
                    element={renderRoute(
                      "/shipping-packages",
                      <ShippingPackages />,
                    )}
                  />
                  <Route
                    path="/shipping-profile"
                    element={renderRoute(
                      "/shipping-profile",
                      <ShippingProfiles />,
                    )}
                  />
                  <Route
                    path="/pickup-addresses"
                    element={renderRoute(
                      "/pickup-addresses",
                      <PickupAddresses />,
                    )}
                  />
                  <Route
                    path="/shipment-tracking"
                    element={renderRoute(
                      "/shipment-tracking",
                      <ShipmentTracking />,
                    )}
                  />

                  <Route
                    path="/categories"
                    element={renderRoute("/categories", <ProductCategories />)}
                  />
                  <Route
                    path="/category-attributes"
                    element={renderRoute(
                      "/category-attributes",
                      <CategoryAttributes />,
                    )}
                  />
                  <Route
                    path="/subscription-orders"
                    element={renderRoute(
                      "/subscription-orders",
                      <SubscriptionOrders />,
                    )}
                  />
                  <Route
                    path="/content-management"
                    element={renderRoute(
                      "/content-management",
                      <ContentManagement />,
                    )}
                  />
                  <Route
                    path="/content-management/:type"
                    element={renderRoute(
                      "/content-management",
                      <ContentManagement />,
                    )}
                  />
                  <Route
                    path="/view-orders"
                    element={renderRoute("/view-orders", <OrderSummary />)}
                  />
                  <Route
                    path="/product-catalog/form/:id?"
                    element={renderRoute(
                      "/product-catalog/form",
                      <AddEditProductPopup />,
                    )}
                  />
                  <Route
                    path="/product-catalog/view/:id"
                    element={renderRoute(
                      "/product-catalog",
                      <ProductAdminDetails />,
                    )}
                  />
                  <Route
                    path="/view-subscription-orders"
                    element={renderRoute(
                      "/view-subscription-orders",
                      <ViewSubscriptionOrders />,
                    )}
                  />
                  <Route
                    path="/profile"
                    element={renderRoute("/profile", <Profile />)}
                  />
                  <Route
                    path="/changePassword"
                    element={renderRoute("/changePassword", <ChangePassword />)}
                  />
                  <Route
                    path="/state"
                    element={renderRoute("/state", <ManageState />)}
                  />
                  <Route
                    path="/city"
                    element={renderRoute("/city", <ManageCity />)}
                  />
                  <Route
                    path="/country"
                    element={renderRoute("/country", <ManageCountry />)}
                  />
                  <Route
                    path="/zip-codes"
                    element={renderRoute("/zip-codes", <ManageZipCode />)}
                  />

                  <Route
                    path="/tax-structure"
                    element={renderRoute("/tax-structure", <TaxStructure />)}
                  />
                  <Route
                    path="/tax-category"
                    element={renderRoute("/tax-category", <TaxCategory />)}
                  />
                  <Route
                    path="/tax-category-rules"
                    element={renderRoute("/tax-category-rules", <TaxRules />)}
                  />

                  <Route
                    path="/product-variants"
                    element={renderRoute(
                      "/product-variants",
                      <ProductVariants />,
                    )}
                  />
                  <Route
                    path="/product-families"
                    element={renderRoute(
                      "/product-families",
                      <ProductFamilies />,
                    )}
                  />
                  <Route
                    path="/product-dimensions"
                    element={renderRoute(
                      "/product-dimensions",
                      <ProductDimensions />,
                    )}
                  />

                  <Route
                    path="/finish"
                    element={renderRoute("/finish", <FinishProducts />)}
                  />

                  <Route
                    path="/user-permissions/:id"
                    element={renderSupportedRoute(
                      "/user-permissions",
                      <UserPermissions setModuleName={setModuleName} />,
                    )}
                  />
                  <Route
                    path="/seller"
                    element={renderRoute("/seller", <Sellers />)}
                  />
                  <Route
                    path="/seller-kyc"
                    element={renderRoute("/seller-kyc", <Sellers />)}
                  />
                  <Route
                    path="/seller-bank"
                    element={renderRoute("/seller-bank", <Sellers />)}
                  />
                  <Route
                    path="/seller-kyc-detail/:id"
                    element={renderRoute("/seller-kyc-detail", <UserDetails />)}
                  />
                  <Route
                    path="/seller-bank-detail/:id"
                    element={renderRoute(
                      "/seller-bank-detail",
                      <UserDetails />,
                    )}
                  />

                  <Route
                    path="/product-option-value/:id"
                    element={renderSupportedRoute(
                      "/product-options",
                      <ProductOptionValue setModuleName={setModuleName} />,
                    )}
                  />

                  <Route
                    path="/warranty"
                    element={renderRoute("/warranty", <ProductWarranty />)}
                  />
                  <Route path="/tax" element={renderRoute("/tax", <Tax />)} />
                  <Route
                    path="/tax-documents"
                    element={renderRoute("/tax-documents", <TaxCompliance />)}
                  />
                  <Route
                    path="/subTax"
                    element={renderSupportedRoute(
                      "/subTax",
                      <SubTax setModuleName={setModuleName} />,
                    )}
                  />
                  <Route
                    path="/subTax/:id"
                    element={renderSupportedRoute(
                      "/subTax",
                      <SubTax setModuleName={setModuleName} />,
                    )}
                  />
                  <Route
                    path="/tax-rule"
                    element={renderSupportedRoute(
                      "/tax-rule",
                      <TaxRule setModuleName={setModuleName} />,
                    )}
                  />
                  <Route
                    path="/discount-coupons"
                    element={renderRoute(
                      "/discount-coupons",
                      <DiscountCoupons />,
                    )}
                  />

                  <Route
                    path="/bar-code"
                    element={renderRoute("/barcode", <BarcodePage />)}
                  />
                  <Route
                    path="/hsn-code"
                    element={renderRoute("/hsn-code", <HsnCode />)}
                  />
                  <Route
                    path="/orders/view/:id"
                    element={renderRoute("/orders/view", <OrderSummary />)}
                  />

                  {/* ── Catalog Management — filtered product views ─────────── */}
                  <Route
                    path="/add-product"
                    element={renderRoute("/add-product", <ProductCatalog />)}
                  />
                  <Route
                    path="/draft-products"
                    element={renderRoute("/draft-products", <ProductCatalog />)}
                  />
                  <Route
                    path="/pending-products"
                    element={renderRoute(
                      "/pending-products",
                      <ProductCatalog />,
                    )}
                  />
                  <Route
                    path="/change-pending-products"
                    element={renderRoute(
                      "/change-pending-products",
                      <ProductCatalog />,
                    )}
                  />
                  <Route
                    path="/rejected-products"
                    element={renderRoute(
                      "/rejected-products",
                      <ProductCatalog />,
                    )}
                  />
                  <Route
                    path="/product-option-values"
                    element={renderRoute(
                      "/product-option-values",
                      <ProductOptionValue setModuleName={setModuleName} />,
                    )}
                  />

                  {/* ── Inventory Management ────────────────────────────────── */}
                  <Route
                    path="/inventory-overview"
                    element={renderRoute(
                      "/inventory-overview",
                      <InventoryOverview />,
                    )}
                  />
                  <Route
                    path="/variant-inventory"
                    element={renderRoute(
                      "/variant-inventory",
                      <VariantInventory />,
                    )}
                  />
                  <Route
                    path="/inventory-adjustment"
                    element={renderRoute(
                      "/inventory-adjustment",
                      <InventoryAdjustment />,
                    )}
                  />
                  <Route
                    path="/inventory-transactions"
                    element={renderRoute(
                      "/inventory-transactions",
                      <InventoryTransactions />,
                    )}
                  />
                  <Route
                    path="/warehouse"
                    element={renderRoute("/warehouse", <WarehouseManagement />)}
                  />
                  <Route
                    path="/low-stock-alerts"
                    element={renderRoute(
                      "/low-stock-alerts",
                      <LowStockAlerts />,
                    )}
                  />

                  {/* ── Orders Management — new routes ──────────────────────── */}
                  <Route
                    path="/refunds"
                    element={renderRoute("/refunds", <UsersTransactions />)}
                  />

                  {/* ── Users & Access — new routes ─────────────────────────── */}
                  <Route
                    path="/seller-staff"
                    element={renderRoute("/seller-users", <SellerUsers />)}
                  />
                  <Route
                    path="/roles-permissions"
                    element={renderRoute(
                      "/roles-permissions",
                      <RolesPermissions />,
                    )}
                  />
                  <Route
                    path="/module-management"
                    element={renderRoute(
                      "/module-management",
                      <ModuleManagement />,
                    )}
                  />
                  <Route
                    path="/activity-logs"
                    element={renderRoute("/activity-logs", <ActivityLogs />)}
                  />
                  <Route
                    path="/rbac-audit-log"
                    element={renderRoute("/rbac-audit-log", <RbacAuditLog />)}
                  />
                  <Route
                    path="/permission-templates"
                    element={renderRoute(
                      "/permission-templates",
                      <PermissionTemplates />,
                    )}
                  />

                  {/* ── Marketing — new routes ──────────────────────────────── */}

                  {/* ── Seller Management — additional pages ────────────────── */}
                  <Route
                    path="/seller-onboarding"
                    element={renderRoute(
                      "/seller-onboarding",
                      <SellerOnboarding />,
                    )}
                  />
                  <Route
                    path="/seller-status"
                    element={renderRoute("/seller-status", <SellerStatusPage />)}
                  />
                  <Route
                    path="/seller-sub-admins"
                    element={renderRoute(
                      "/seller-sub-admins",
                      <SellerSubAdminManagement />,
                    )}
                  />

                  {/* ── CMS & Content ───────────────────────────────────────── */}
                  <Route
                    path="/content-pages"
                    element={renderRoute("/content-pages", <ContentPages />)}
                  />

                  {/* ── Users & Access — additional ─────────────────────────── */}
                  <Route
                    path="/users-addresses"
                    element={renderRoute("/users-addresses", <Users />)}
                  />
                  <Route
                    path="/preferences"
                    element={renderSupportedRoute("/preferences", <Preferences />)}
                  />

                  {/* ── Deals Management ────────────────────────────────────── */}
                  <Route
                    path="/deal-management"
                    element={renderRoute("/deal-management", <DealManagement />)}
                  />

                  {/* ── Fraud Management ────────────────────────────────────── */}
                  <Route
                    path="/fraud-cases"
                    element={renderRoute("/fraud-cases", <FraudCases />)}
                  />

                  {/* ── Wallet Management ───────────────────────────────────── */}
                  <Route
                    path="/wallet-management"
                    element={renderRoute(
                      "/wallet-management",
                      <UsersTransactions />,
                    )}
                  />

                  {/* ── Notification Templates ──────────────────────────────── */}
                  <Route
                    path="/notification-templates"
                    element={renderRoute(
                      "/notification-templates",
                      <NotificationTemplates />,
                    )}
                  />

                  {/* ── Cancellations ───────────────────────────────────────── */}
                  <Route
                    path="/cancellations"
                    element={renderRoute("/cancellations", <Cancellations />)}
                  />

                  {/* ── Platform Catalog — collections / badges ─────────────── */}
                  <Route
                    path="/collections"
                    element={renderRoute("/collections", <CollectionsPage />)}
                  />
                  <Route
                    path="/badges"
                    element={renderRoute("/badges", <BadgesPage />)}
                  />

                  {/* ── Tax & Finance — invoices / credit notes ──────────────── */}
                  <Route
                    path="/tax-invoices"
                    element={renderRoute("/tax-invoices", <TaxInvoices />)}
                  />
                  <Route
                    path="/credit-notes"
                    element={renderRoute("/credit-notes", <CreditNotes />)}
                  />

                  {/* ── Subscription Plans Management ────────────────────────── */}
                  <Route
                    path="/subscription-plans"
                    element={renderRoute(
                      "/subscription-plans",
                      <SubscriptionPlans />,
                    )}
                  />

                  {/* ── Payment Config & Chargebacks ─────────────────────────── */}
                  <Route
                    path="/cod-config"
                    element={renderRoute("/cod-config", <CodConfig />)}
                  />
                  <Route
                    path="/chargebacks"
                    element={renderRoute("/chargebacks", <Chargebacks />)}
                  />

                  {/* ── Seller Payouts ───────────────────────────────────────── */}
                  <Route
                    path="/seller-payouts"
                    element={renderRoute("/seller-payouts", <SellerPayouts />)}
                  />

                  {/* ── Deal Sub-sections ────────────────────────────────────── */}
                  <Route
                    path="/deal-payouts"
                    element={renderRoute("/deal-payouts", <DealPayouts />)}
                  />
                  <Route
                    path="/deal-sponsorships"
                    element={renderRoute(
                      "/deal-sponsorships",
                      <DealSponsorships />,
                    )}
                  />

                  {/* ── Referral — Influencers ───────────────────────────────── */}
                  <Route
                    path="/influencer-management"
                    element={renderRoute(
                      "/influencer-management",
                      <InfluencerManagement />,
                    )}
                  />

                  {/* ── Analytics Events ─────────────────────────────────────── */}
                  <Route
                    path="/analytics-events"
                    element={renderRoute(
                      "/analytics-events",
                      <AnalyticsEvents />,
                    )}
                  />

                  {/* ── Platform Settings ────────────────────────────────────── */}
                  <Route
                    path="/api-keys"
                    element={renderRoute("/api-keys", <ApiKeys />)}
                  />
                  <Route
                    path="/feature-flags"
                    element={renderRoute("/feature-flags", <FeatureFlags />)}
                  />
                  <Route
                    path="/webhooks"
                    element={renderRoute("/webhooks", <Webhooks />)}
                  />

                  {/* ── System Management ────────────────────────────────────── */}
                  <Route
                    path="/system-health"
                    element={renderRoute("/system-health", <SystemHealth />)}
                  />
                  <Route
                    path="/queue-management"
                    element={renderRoute(
                      "/queue-management",
                      <QueueManagement />,
                    )}
                  />
                  <Route
                    path="/dead-letter-queue"
                    element={renderRoute(
                      "/dead-letter-queue",
                      <DeadLetterQueue />,
                    )}
                  />

                  {/* ── Analytics & Dynamic Pricing ─────────────────────────── */}
                  <Route
                    path="/analytics"
                    element={renderRoute("/analytics", <AnalyticsDashboard />)}
                  />
                  <Route
                    path="/dynamic-pricing"
                    element={renderRoute("/dynamic-pricing", <DynamicPricingReport />)}
                  />

                  {/* ── Notifications ────────────────────────────────────────── */}
                  <Route
                    path="/notifications"
                    element={renderRoute("/notifications", <NotificationsOverview />)}
                  />

                  {/* ── Subscriptions Overview ───────────────────────────────── */}
                  <Route
                    path="/subscriptions"
                    element={renderRoute("/subscriptions", <SubscriptionsOverview />)}
                  />

                  {/* ── Reports & Analytics ─────────────────────────────────── */}
                  <Route
                    path="/reports-sales"
                    element={renderRoute("/reports-sales", <SalesReport />)}
                  />
                  <Route
                    path="/reports-products"
                    element={renderRoute(
                      "/reports-products",
                      <ProductAnalytics />,
                    )}
                  />
                  <Route
                    path="/reports-inventory"
                    element={renderRoute(
                      "/reports-inventory",
                      <InventoryAnalytics />,
                    )}
                  />
                  <Route
                    path="/reports-sellers"
                    element={renderRoute(
                      "/reports-sellers",
                      <SellerAnalytics />,
                    )}
                  />
                  <Route
                    path="/reports-orders"
                    element={renderRoute("/reports-orders", <OrdersReport />)}
                  />
                  <Route
                    path="/reports-payments"
                    element={renderRoute(
                      "/reports-payments",
                      <PaymentsReport />,
                    )}
                  />
                  <Route
                    path="/reports-returns"
                    element={renderRoute("/reports-returns", <ReturnsReport />)}
                  />
                  <Route
                    path="/reports-cancellations"
                    element={renderRoute(
                      "/reports-cancellations",
                      <CancellationReport />,
                    )}
                  />
                  <Route
                    path="/reports-delivery"
                    element={renderRoute(
                      "/reports-delivery",
                      <DeliveryReport />,
                    )}
                  />
                  <Route
                    path="/reports-commissions"
                    element={renderRoute(
                      "/reports-commissions",
                      <CommissionReport />,
                    )}
                  />
                  <Route
                    path="/reports-users"
                    element={renderRoute("/reports-users", <UserReport />)}
                  />
                  <Route
                    path="/messages"
                    element={renderRoute("/messages", <UserMessages />)}
                  />
                  <Route path="*" element={<ComingSoonPage />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default Layout;
