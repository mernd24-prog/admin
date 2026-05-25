import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import PermissionNotAllowed from "../Atoms/PermissionsNotAllowed/PermissionNotAllowed";
import { socketConnection } from "../../_helpers/socket";
import { hasModuleAccess } from "../../_helpers/authStorage";
import {
  getRouteModuleCandidates,
  isSelfServiceRoute,
} from "../../_helpers/rbacRoutes";
import ProductOptionValue from "../../pages/ProductManagement/ProductOptions/ProductOptionValue";

import Tax from "../../pages/Tax/Tax";
import SubTax from "../../pages/Tax/SubTax";
import TaxRule from "../../pages/Tax/TaxRule/TaxRule";
import BarcodePage from "../../pages/Admin/Barcode/Barcode";
import HsnCode from "../../pages/Admin/HsnCode/HsnCode";

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
const Orders = React.lazy(
  () => import("../../pages/OrdersManagement/Orders/Orders"),
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
const SellerSubAdminManagement = React.lazy(
  () => import("../../pages/SellerManagement/SellerSubAdminManagement"),
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
  const [navbarOpen, setNavbarOpen] = useState(getStoredSidebarState);
  const [moduleName, setModuleName] = useState("");
  const [isExpanded, setIsExpanded] = useState(getStoredSidebarState);
  const [isRefreshConfig, setIsRefreshConfig] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isPermissionShow, setIsPermissionShow] = useState(false);
  const selector = useSelector((state) => state.user);
  const permissions = selector?.getMyModulePermissionData?.data?.data;
  const [hasPermanentOpen, setHasPermanentOpen] = useState(
    getStoredSidebarState,
  );

  useEffect(() => {
    setSocket(socketConnection());
  }, []);

  const modulePermissions = useMemo(() => {
    const permMap = {};
    const modules = Array.isArray(permissions?.modules)
      ? permissions.modules
      : Array.isArray(permissions)
        ? permissions
        : [];

    if (modules.length) {
      modules.forEach((module) => {
        const moduleCode =
          module.slug ||
          module.module ||
          module.module_code?.module_code ||
          module.module_code;

        if (!moduleCode) return;

        const viewPermission = Array.isArray(module.permissions)
          ? module.permissions.find(
              (permission) => permission.action === "view",
            )
          : null;
        const hasAssignedView = viewPermission
          ? viewPermission.assigned !== false
          : module.assigned !== false;

        permMap[moduleCode] = module.assigned !== false && hasAssignedView;
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
      if (modulePermissions[moduleCode] === true) return true;
      if (modulePermissions[moduleCode] === false) return false;
      return hasModuleAccess(moduleCode);
    });
  };

  const renderRoute = (path, element) => {
    return hasPermission(path) ? (
      element
    ) : (
      <PermissionNotAllowed loading={isPermissionShow} />
    );
  };

  const renderSupportedRoute = (path, element) => {
    return renderRoute(path, element);
  };

  return (
    <div className="relative flex h-screen overflow-hidden">
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
        className={`flex flex-col flex-1 overflow-hidden ${
          navbarOpen ? "" : "lg:ml-0"
        }`}
      >
        <Header
          handleNavbar={() => setNavbarOpen((prev) => !prev)}
          moduleName={moduleName}
          hasPermanentOpen={hasPermanentOpen}
        />

        <main className="flex-1 bg-[#f1edf0] overflow-y-auto pt-16 sidebar-scrollbar">
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route
                path="/home"
                element={renderRoute("/home", <Dashboard />)}
              />
              <Route
                path="/admin-users"
                element={renderRoute("/admin-users", <AdminUsers />)}
              />
              <Route
                path="/seller-management"
                element={renderRoute(
                  "/seller-management",
                  <SellerSubAdminManagement />,
                )}
              />
              <Route path="/users" element={renderRoute("/users", <Users />)} />
              <Route
                path="/users/view/:id"
                element={renderRoute("/users", <UserDetails />)}
              />
              <Route
                path="/admin-users/view/:id"
                element={renderRoute("/admin-users", <UserDetails />)}
              />
              <Route
                path="/seller/view/:id"
                element={renderRoute("/seller", <UserDetails />)}
              />
              <Route
                path="/transactions"
                element={renderRoute("/transactions", <UsersTransactions />)}
              />

              <Route
                path="/product-flow"
                element={renderRoute("/product-flow", <ProductFlow />)}
              />
              <Route
                path="/product-catalog"
                element={renderRoute("/product-catalog", <ProductCatalog />)}
              />
              <Route
                path="/seller-Product-Inventory"
                element={renderRoute(
                  "/seller-Product-Inventory",
                  <SellerProductInventories />,
                )}
              />
              <Route path="/store" element={renderRoute("/store", <Store />)} />
              <Route
                path="/brands"
                element={renderRoute("/brands", <Brands />)}
              />
              <Route
                path="/product-options"
                element={renderRoute("/product-options", <ProductOptions />)}
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
                path="/orders"
                element={renderRoute("/orders", <Orders />)}
              />
              <Route
                path="/order-status"
                element={renderRoute("/order-status", <OrderStatus />)}
              />
              <Route
                path="/gift-card-orders"
                element={renderRoute("/gift-card-orders", <GiftCardOrder />)}
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
                element={renderRoute("/order-return-reasons", <OrderReturn />)}
              />
              <Route
                path="/product-reviews"
                element={renderRoute("/product-reviews", <ProductReviews />)}
              />
              <Route
                path="/special-price"
                element={renderRoute("/special-price", <SpecialPrice />)}
              />
              <Route
                path="/volume-discounts"
                element={renderRoute("/volume-discounts", <VolumeDiscount />)}
              />
              <Route
                path="/similar-products"
                element={renderRoute("/similar-products", <SimilarProducts />)}
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
                element={renderRoute("/discount-coupons", <DiscountCoupons />)}
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
                element={renderRoute("/shipping-profile", <ShippingProfiles />)}
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
                element={renderRoute("/product-variants", <ProductVariants />)}
              />
              <Route
                path="/product-families"
                element={renderRoute("/product-families", <ProductFamilies />)}
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
                element={renderRoute("/discount-coupons", <DiscountCoupons />)}
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
                element={renderRoute("/pending-products", <ProductCatalog />)}
              />
              <Route
                path="/rejected-products"
                element={renderRoute("/rejected-products", <ProductCatalog />)}
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
                path="/warehouse"
                element={renderRoute("/warehouse", <WarehouseManagement />)}
              />
              <Route
                path="/low-stock-alerts"
                element={renderRoute("/low-stock-alerts", <LowStockAlerts />)}
              />

              {/* ── Orders Management — new routes ──────────────────────── */}
              <Route
                path="/refunds"
                element={renderRoute("/refunds", <UsersTransactions />)}
              />

              {/* ── Users & Access — new routes ─────────────────────────── */}
              <Route
                path="/seller-staff"
                element={renderRoute("/seller-staff", <Sellers />)}
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

              {/* ── Marketing — new routes ──────────────────────────────── */}

              {/* ── Reports & Analytics ─────────────────────────────────── */}
              <Route
                path="/reports-sales"
                element={renderRoute("/reports-sales", <SalesReport />)}
              />
              <Route
                path="/reports-products"
                element={renderRoute("/reports-products", <ProductAnalytics />)}
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
                element={renderRoute("/reports-sellers", <SellerAnalytics />)}
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default Layout;
