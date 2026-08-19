import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import PermissionNotAllowed from "../Atoms/PermissionsNotAllowed/PermissionNotAllowed";
import { socketConnection } from "../../_helpers/socket";
import { useSessionHeartbeat } from "../../_helpers/useSessionHeartbeat";
import {
  getRouteModuleCandidates,
  isSelfServiceRoute,
  isSellerBlockedModule,
  isSellerBlockedRoute,
  routeCodeFromPath,
} from "../../_helpers/rbacRoutes";
import { isSellerPanel } from "../../_helpers/panelConfig";
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
const Store = React.lazy(
  () => import("../../pages/ProductManagement/Store/Store"),
);
const Brands = React.lazy(
  () => import("../../pages/ProductManagement/Brands/Brands"),
);
const ProductOptions = React.lazy(
  () => import("../../pages/ProductManagement/ProductOptions/ProductOptions"),
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
const CodCollections = React.lazy(
  () => import("../../pages/OrdersManagement/Payments/CodCollections"),
);
const Returns = React.lazy(
  () => import("../../pages/OrdersManagement/Returns/Returns"),
);
const SellerFinance = React.lazy(
  () => import("../../pages/OrdersManagement/SellerFinance/SellerFinance"),
);
const PromotionFundingLedger = React.lazy(
  () =>
    import("../../pages/OrdersManagement/SellerFinance/PromotionFundingLedger"),
);
const SellerCodCollections = React.lazy(
  () =>
    import("../../pages/OrdersManagement/SellerFinance/SellerCodCollections"),
);
const CommerceSettings = React.lazy(
  () =>
    import("../../pages/OrdersManagement/CommerceSettings/CommerceSettings"),
);
const ProductReviews = React.lazy(
  () => import("../../pages/OrdersManagement/ProductReviews/ProductReviews"),
);
const DiscountCoupons = React.lazy(
  () => import("../../pages/Promotions/DiscountCoupons/DiscountCoupons"),
);
const ReferralCommerce = React.lazy(
  () => import("../../pages/ReferralCommerce/ReferralCommerce"),
);

const ShipmentTracking = React.lazy(
  () => import("../../pages/ShippingPickup/ShipmentTracking/ShipmentTracking"),
);
const ShippingProfiles = React.lazy(
  () => import("../../pages/ShippingPickup/ShippingProfiles/ShippingProfiles"),
);

const AddEditProductPopup = React.lazy(
  () =>
    import("../../pages/ProductManagement/ProductCatalog/components/AddEditProduct"),
);
const ProductAdminDetails = React.lazy(
  () =>
    import("../../pages/ProductManagement/ProductCatalog/components/ProductAdminDetails"),
);
const SellerSpecialPriceManager = React.lazy(
  () =>
    import("../../pages/ProductManagement/ProductCatalog/components/SellerSpecialPriceManager"),
);
const ProductCategories = React.lazy(
  () =>
    import("../../pages/ProductManagement/ProductCategories/ProductCategories"),
);
const OrderSummary = React.lazy(
  () => import("../../pages/OrdersManagement/Orders/components/ViewOrders"),
);
const SubscriptionOrders = React.lazy(
  () =>
    import("../../pages/OrdersManagement/SubscriptionOrders/SubscriptionOrders"),
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

const Profile = React.lazy(() => import("../../pages/My Profile/Profile"));
const ChangePassword = React.lazy(
  () => import("../../pages/Change Password/ChangePassword"),
);

const ProductVariants = React.lazy(
  () => import("../../pages/ProductManagement/ProductVariants/ProductVariants"),
);
const ProductFamilies = React.lazy(
  () => import("../../pages/ProductManagement/ProductFamilies/ProductFamilies"),
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
const SellerOrganizations = React.lazy(
  () => import("../../pages/SellerManagement/SellerOrganizations"),
);
const MyOrganizations = React.lazy(
  () => import("../../pages/SellerManagement/MyOrganizations"),
);

// ── Inventory Management ────────────────────────────────────────────────────
const Inventory = React.lazy(() => import("../../pages/Inventory/Inventory"));

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
const AnalyticsDashboard = React.lazy(() =>
  import("../../pages/Reports/ReportShell").then((m) => ({
    default: m.AnalyticsDashboard,
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
const TaxInvoices = React.lazy(() => import("../../pages/Tax/TaxInvoices"));
const TaxInvoiceDetail = React.lazy(
  () => import("../../pages/Tax/TaxInvoiceDetail"),
);
const CreditNotes = React.lazy(() => import("../../pages/Tax/CreditNotes"));
const SubscriptionPlans = React.lazy(
  () =>
    import("../../pages/OrdersManagement/SubscriptionOrders/SubscriptionPlans"),
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
const SellerWallet = React.lazy(
  () => import("../../pages/OrdersManagement/SellerFinance/SellerWallet"),
);
const PayoutOpsQueue = React.lazy(
  () => import("../../pages/OrdersManagement/SellerFinance/PayoutOpsQueue"),
);
const NegativeBalances = React.lazy(
  () => import("../../pages/OrdersManagement/SellerFinance/NegativeBalances"),
);
const WalletTransactions = React.lazy(
  () =>
    import("../../pages/OrdersManagement/WalletTransactions/WalletTransactions"),
);
const ProductModerationQueue = React.lazy(
  () =>
    import("../../pages/ProductManagement/ProductModerationQueue/ProductModerationQueue"),
);
const NotificationTemplates = React.lazy(
  () =>
    import("../../pages/UserManagement/NotificationAdmin/NotificationTemplates"),
);

const BadgesPage = React.lazy(() => import("../../pages/Admin/Badge/Badges"));
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
const SellerSubAdminManagement = React.lazy(
  () => import("../../pages/SellerManagement/SellerSubAdminManagement"),
);

// ── CMS & Content ────────────────────────────────────────────────────────────
const ContentPages = React.lazy(
  () => import("../../pages/CMS/ContentPages/ContentPages"),
);
const AuthTestimonials = React.lazy(
  () => import("../../pages/CMS/AuthTestimonials/AuthTestimonials"),
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
const AdminQueries = React.lazy(
  () => import("../../pages/Support/AdminQueries"),
);
const SellerHelpSupport = React.lazy(
  () => import("../../pages/Support/SellerHelpSupport"),
);

const getInitialSidebarState = () => {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 1024px)").matches;
};

const normalizeRoutePattern = (routePath = "") => {
  const code = routeCodeFromPath(routePath);
  return code ? `/${code}` : "";
};

const collectBackendRoutePatterns = (items = []) => {
  const routes = new Set();

  const visit = (nodes = []) => {
    nodes.forEach((item = {}) => {
      [
        item.routePath,
        ...(Array.isArray(item.metadata?.supportedRoutes)
          ? item.metadata.supportedRoutes
          : []),
      ]
        .map(normalizeRoutePattern)
        .filter(Boolean)
        .forEach((route) => routes.add(route));
      visit(item.children || []);
    });
  };

  visit(items);
  return routes;
};

const getSidebarModulePayload = (sliceData = {}) => {
  const payload =
    sliceData?.data?.normalized?.data ||
    sliceData?.normalized?.normalized?.data ||
    sliceData?.normalized?.data ||
    sliceData?.data?.data?.list ||
    sliceData?.data?.list ||
    sliceData?.data?.data ||
    sliceData?.data ||
    [];
  return Array.isArray(payload) ? payload : [];
};

const flattenSidebarModules = (items = []) =>
  (Array.isArray(items) ? items : []).flatMap((item = {}) => [
    item,
    ...flattenSidebarModules(item.children || []),
  ]);

function Layout() {
  useSessionHeartbeat();

  const location = useLocation();
  const [navbarOpen, setNavbarOpen] = useState(getInitialSidebarState);
  const [moduleName, setModuleName] = useState("");
  const [isExpanded, setIsExpanded] = useState(getInitialSidebarState);
  const [isRefreshConfig, setIsRefreshConfig] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isPermissionShow, setIsPermissionShow] = useState(false);
  const selector = useSelector((state) => state.user);
  const adminCoreSelector = useSelector((state) => state.adminCore);
  const permissions = selector?.getMyModulePermissionData?.data?.data;
  const [hasPermanentOpen, setHasPermanentOpen] = useState(() => {
    if (typeof window === "undefined") return getInitialSidebarState();
    return window.matchMedia("(min-width: 1024px)").matches
      ? true
      : getInitialSidebarState();
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

  const accessModules = useMemo(() => {
    const sd = adminCoreSelector?.accessModulesData;
    const payload =
      sd?.data?.data ||
      sd?.normalized?.data ||
      sd?.data?.normalized?.data ||
      sd?.data ||
      {};
    const modules =
      payload?.modules ||
      payload?.list ||
      payload?.items ||
      (Array.isArray(payload) ? payload : []);
    return Array.isArray(modules) ? modules : [];
  }, [adminCoreSelector?.accessModulesData]);

  const sidebarModules = useMemo(
    () => getSidebarModulePayload(adminCoreSelector?.rbacSidebarModulesData),
    [adminCoreSelector?.rbacSidebarModulesData],
  );

  const backendRoutePatterns = useMemo(
    () => collectBackendRoutePatterns(sidebarModules),
    [sidebarModules],
  );

  const routePermissionModules = useMemo(
    () => [...accessModules, ...flattenSidebarModules(sidebarModules)],
    [accessModules, sidebarModules],
  );

  const routeRegistry = useMemo(
    () => [
      { path: "/home", render: () => <Dashboard /> },
      { path: "/admin-users", render: () => <AdminUsers /> },
      {
        path: "/admin-users/view/:id",
        render: () => <UserPermissions setModuleName={setModuleName} />,
      },
      { path: "/seller-management", render: () => <SellerUsers /> },
      { path: "/seller-users", render: () => <SellerUsers /> },
      { path: "/seller-organizations", render: () => <SellerOrganizations /> },
      { path: "/my-organizations", render: () => <MyOrganizations /> },
      { path: "/users", render: () => <Users /> },
      { path: "/users/view/:id", render: () => <UserDetails /> },
      { path: "/seller/view/:id", render: () => <UserDetails /> },
      { path: "/transactions", render: () => <UsersTransactions /> },
      { path: "/transactions/view/:id", render: () => <ViewTransaction /> },
      { path: "/product-catalog", render: () => <ProductCatalog /> },
      { path: "/product-catalog/archived", render: () => <ProductCatalog /> },
      { path: "/seller-Product-Inventory", redirectTo: "/app/inventory" },
      { path: "/seller-product-inventory", redirectTo: "/app/inventory" },
      {
        path: "/seller-special-price-manager",
        render: () => <SellerSpecialPriceManager />,
      },
      { path: "/store", render: () => <Store /> },
      { path: "/brands", render: () => <Brands /> },
      { path: "/product-options", render: () => <ProductOptions /> },
      { path: "/threshold-products", redirectTo: "/app/inventory" },
      { path: "/inventory-audit", redirectTo: "/app/inventory" },
      { path: "/orders", render: () => <Orders /> },
      { path: "/carts", render: () => <Carts /> },
      { path: "/checkout-quote", render: () => <CheckoutQuote /> },
      { path: "/payments", render: () => <Payments /> },
      { path: "/cod-collections", render: () => <CodCollections /> },
      { path: "/seller-finance", render: () => <SellerFinance /> },
      {
        path: "/promotion-funding-ledger",
        render: () => <PromotionFundingLedger />,
      },
      { path: "/seller-wallet", render: () => <SellerWallet /> },
      {
        path: "/seller-cod-collections",
        render: () => <SellerCodCollections />,
      },
      { path: "/commission-rules", redirectTo: "/app/platform-commission" },
      { path: "/platform-fee-config", redirectTo: "/app/platform-commission" },
      { path: "/commerce-settings", render: () => <CommerceSettings /> },
      {
        path: "/platform-commerce-settings",
        redirectTo: "/app/platform-commission",
      },
      { path: "/platform-commission", render: () => <CommerceSettings /> },
      {
        path: "/seller-commerce-config",
        redirectTo: "/app/platform-commission",
      },
      { path: "/commerce-templates", redirectTo: "/app/platform-commission" },
      { path: "/seller-tiers", redirectTo: "/app/platform-commission" },
      { path: "/returns", render: () => <Returns /> },
      { path: "/product-reviews", render: () => <ProductReviews /> },
      { path: "/discount-coupons", render: () => <DiscountCoupons /> },
      { path: "/referral-commerce", render: () => <ReferralCommerce /> },
      {
        path: "/referral-commerce/:section",
        render: () => <ReferralCommerce />,
      },
      { path: "/shipping-packages", redirectTo: "/app/shipment-tracking" },
      { path: "/pickup-addresses", redirectTo: "/app/shipment-tracking" },
      { path: "/shipment-tracking", render: () => <ShipmentTracking /> },
      { path: "/shipping-profiles", render: () => <ShippingProfiles /> },
      { path: "/categories", render: () => <ProductCategories /> },
      { path: "/category-attributes", redirectTo: "/app/categories" },
      { path: "/subscription-orders", render: () => <SubscriptionOrders /> },

      { path: "/view-orders", render: () => <OrderSummary /> },
      {
        path: "/product-catalog/form/:id?",
        render: () => <AddEditProductPopup />,
      },
      {
        path: "/product-catalog/view/:id",
        render: () => <ProductAdminDetails />,
      },
      { path: "/profile", render: () => <Profile />, always: true },
      {
        path: "/changePassword",
        render: () => <ChangePassword />,
        always: true,
      },
      { path: "/state", render: () => <ManageState /> },
      { path: "/city", render: () => <ManageCity /> },
      { path: "/country", render: () => <ManageCountry /> },
      { path: "/zip-codes", render: () => <ManageZipCode /> },
      { path: "/product-variants", render: () => <ProductVariants /> },
      { path: "/product-families", render: () => <ProductFamilies /> },
      {
        path: "/user-permissions/:id",
        render: () => <UserPermissions setModuleName={setModuleName} />,
      },
      { path: "/seller", render: () => <Sellers /> },
      { path: "/seller-kyc", redirectTo: "/app/seller" },
      { path: "/seller-bank", redirectTo: "/app/seller" },
      { path: "/seller-kyc-detail/:id", render: () => <UserDetails /> },
      { path: "/seller-bank-detail/:id", render: () => <UserDetails /> },
      {
        path: "/product-option-value/:id",
        permissionPath: "/product-options",
        render: () => <ProductOptionValue setModuleName={setModuleName} />,
      },
      { path: "/tax", render: () => <Tax /> },
      { path: "/tax-documents", render: () => <TaxCompliance /> },
      {
        path: "/subTax",
        render: () => <SubTax setModuleName={setModuleName} />,
      },
      {
        path: "/subTax/:id",
        permissionPath: "/subTax",
        render: () => <SubTax setModuleName={setModuleName} />,
      },
      {
        path: "/tax-rule",
        render: () => <TaxRule setModuleName={setModuleName} />,
      },
      { path: "/bar-code", render: () => <BarcodePage /> },
      { path: "/hsn-code", render: () => <HsnCode /> },
      { path: "/orders/view/:id", render: () => <OrderSummary /> },
      {
        path: "/product-option-values",
        render: () => <ProductOptionValue setModuleName={setModuleName} />,
      },
      { path: "/inventory", render: () => <Inventory /> },
      {
        path: "/inventory/:productId",
        permissionPath: "/inventory",
        render: () => <Inventory />,
      },
      { path: "/inventory-overview", redirectTo: "/app/inventory" },
      { path: "/variant-inventory", redirectTo: "/app/inventory" },
      { path: "/inventory-adjustment", redirectTo: "/app/inventory" },
      { path: "/inventory-transactions", redirectTo: "/app/inventory" },
      { path: "/warehouse", redirectTo: "/app/inventory" },
      { path: "/low-stock-alerts", redirectTo: "/app/inventory" },
      {
        path: "/seller-staff",
        permissionPath: "/seller-users",
        render: () => <SellerUsers />,
      },
      { path: "/roles-permissions", render: () => <RolesPermissions /> },
      { path: "/module-management", render: () => <ModuleManagement /> },
      { path: "/activity-logs", render: () => <ActivityLogs /> },
      { path: "/rbac-audit-log", render: () => <RbacAuditLog /> },
      { path: "/permission-templates", render: () => <PermissionTemplates /> },
      {
        path: "/queries",
        render: () =>
          isSellerPanel() ? (
            <Navigate to="/app/help-support" replace />
          ) : (
            <AdminQueries />
          ),
      },
      { path: "/help-support", render: () => <SellerHelpSupport /> },
      { path: "/seller-onboarding", redirectTo: "/app/seller" },
      { path: "/seller-status", redirectTo: "/app/seller" },
      {
        path: "/seller-sub-admins",
        render: () => <SellerSubAdminManagement />,
      },
      { path: "/content-pages", render: () => <ContentPages /> },
      { path: "/auth-testimonials", render: () => <AuthTestimonials /> },
      { path: "/users-addresses", render: () => <Users /> },
      { path: "/preferences", render: () => <Preferences /> },
      { path: "/deal-management", render: () => <DealManagement /> },
      { path: "/fraud-cases", render: () => <FraudCases /> },
      { path: "/wallet-management", render: () => <WalletTransactions /> },
      { path: "/wallet-transactions", render: () => <WalletTransactions /> },
      {
        path: "/notification-templates",
        render: () => <NotificationTemplates />,
      },
      { path: "/cancellations", render: () => <Cancellations /> },
      { path: "/badges", render: () => <BadgesPage /> },
      { path: "/tax-invoices", render: () => <TaxInvoices /> },
      {
        path: "/tax-invoices/:invoiceId",
        permissionPath: "/tax-invoices",
        render: () => <TaxInvoiceDetail />,
      },
      { path: "/credit-notes", render: () => <CreditNotes /> },
      { path: "/subscription-plans", render: () => <SubscriptionPlans /> },
      { path: "/cod-config", render: () => <CodConfig /> },
      { path: "/chargebacks", render: () => <Chargebacks /> },
      { path: "/seller-payouts", render: () => <SellerPayouts /> },
      { path: "/payout-ops-queue", render: () => <PayoutOpsQueue /> },
      { path: "/negative-balances", render: () => <NegativeBalances /> },
      { path: "/deal-payouts", render: () => <DealPayouts /> },
      { path: "/deal-sponsorships", render: () => <DealSponsorships /> },

      { path: "/analytics-events", render: () => <AnalyticsEvents /> },
      { path: "/api-keys", render: () => <ApiKeys /> },
      { path: "/feature-flags", render: () => <FeatureFlags /> },
      { path: "/webhooks", render: () => <Webhooks /> },
      { path: "/system-health", render: () => <SystemHealth /> },
      { path: "/queue-management", render: () => <QueueManagement /> },
      { path: "/dead-letter-queue", render: () => <DeadLetterQueue /> },
      {
        path: "/product-moderation-queue",
        render: () => <ProductModerationQueue />,
      },
      { path: "/analytics", render: () => <AnalyticsDashboard /> },
      { path: "/reports-sales", render: () => <SalesReport /> },
      { path: "/reports-products", render: () => <ProductAnalytics /> },
      { path: "/reports-inventory", render: () => <InventoryAnalytics /> },
      { path: "/reports-sellers", render: () => <SellerAnalytics /> },
      { path: "/messages", render: () => <UserMessages /> },
      { path: "/notifications", render: () => <UserMessages /> },
    ],
    [setModuleName],
  );

  // Keep every known client route registered. Sidebar metadata controls which
  // navigation items are visible, while renderRoute performs the actual RBAC
  // check. Removing detail/action routes here made valid seller links fall
  // through to the wildcard route and redirect to /app/home.
  const dynamicRoutes = routeRegistry;

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
    if (isSellerPanel() && isSellerBlockedRoute(path)) return false;

    const normalizedRoute = normalizeRoutePattern(path);
    if (backendRoutePatterns.has(normalizedRoute)) return true;

    const moduleCandidates = getRouteModuleCandidates(
      path,
      routePermissionModules,
      {
        sellerPanel: isSellerPanel(),
      },
    );
    if (!moduleCandidates.length) return true;
    if (!backendRoutePatterns.size && !Object.keys(modulePermissions).length) {
      return true;
    }

    return moduleCandidates.some((moduleCode) => {
      const normalizedModuleCode = String(moduleCode || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/_/g, "-");
      if (isSellerPanel() && isSellerBlockedModule(normalizedModuleCode)) {
        return false;
      }
      if (modulePermissions[normalizedModuleCode] === true) return true;
      return false;
    });
  };

  const renderRoute = (path, element) => {
    if (!hasPermission(path)) {
      return <PermissionNotAllowed loading={isPermissionShow} />;
    }

    return element;
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
  <div className="admin-shell relative flex h-screen overflow-hidden bg-[var(--admin-shell)]">
    <div className="z-50">
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
      className={`relative flex flex-col flex-1 overflow-hidden !bg-[var(--admin-shell)] ${
        navbarOpen ? "" : "lg:ml-0"
      }`}
    >
      {/* Inner corner notch — sidebar/header junction */}
      <div
        className="absolute left-0 top-0 h-5 w-5 z-40 pointer-events-none"
        style={{
          background: "var(--admin-canvas)",
          WebkitMaskImage:
            "radial-gradient(circle at 0 0, transparent 20px, black 20px)",
          maskImage:
            "radial-gradient(circle at 0 0, transparent 20px, black 20px)",
          boxShadow:
            "inset 6px 6px 8px -4px rgba(86, 78, 78, 0.25)",
        }}
      />

      <Header
        handleNavbar={handleSidebarToggle}
        moduleName={moduleName}
        hasPermanentOpen={hasPermanentOpen}
        isSidebarExpanded={isExpanded}
      />

      <main
        className={`flex-1 overflow-y-auto overflow-x-hidden bg-[var(--admin-canvas)] sidebar-scrollbar admin-inner-shadow rounded-tl-2xl ${
          hasPermanentOpen ? "" : "pt-[58px]"
        }`}
      >
        <Suspense fallback={<PageSkeletonLoader />}>
          <div className="admin-page-transition">
            <Routes location={location}>
              {dynamicRoutes.map((route) => {
                const routeElement = route.redirectTo ? (
                  <Navigate to={route.redirectTo} replace />
                ) : (
                  route.render()
                );

                const permissionPath =
                  route.permissionPath || route.path;

                return (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      route.redirectTo
                        ? routeElement
                        : renderRoute(
                            permissionPath,
                            routeElement
                          )
                    }
                  />
                );
              })}

              <Route
                path="*"
                element={<Navigate to="/app/home" replace />}
              />
            </Routes>
          </div>
        </Suspense>
      </main>
    </div>
  </div>
);
}

export default Layout;
