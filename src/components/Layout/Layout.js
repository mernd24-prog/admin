import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Route, Routes } from "react-router-dom";
import { useSelector } from 'react-redux';
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import { SUPPORTED_ADMIN_ROUTES } from "../Sidebar/Sidebar";
import PermissionNotAllowed from "../Atoms/PermissionsNotAllowed/PermissionNotAllowed";
import { socketConnection } from "../../_helpers/socket";
import { hasModuleAccess } from "../../_helpers/authStorage";
import {
  getRouteModuleCandidates,
  isSelfServiceRoute,
} from "../../_helpers/rbacRoutes";
import ProductOptionValue from "../../pages/ProductManagement/ProductOptions/ProductOptionValue";
import Badge from "../../pages/Admin/Badge/Badge";
import QtyHead from "../../pages/Admin/QTY/QtyHead";
import Batch from "../../pages/ProductManagement/Batch/Batch";
import FAQ from "../../pages/CMS/FAQ/FAQ";
import FAQList from "../../pages/CMS/FAQ/FAQList";
import ReturnPolicy from "../../pages/CMS/ReturnPolicy/ReturnPolicy";
import ReturnPolicyList from "../../pages/CMS/ReturnPolicy/ReturnPolicyList";
import Holidays from "../../pages/CMS/Holidays/Holidays";
import HolidaysList from "../../pages/CMS/Holidays/HolidaysList";
import PaymentPolicy from "../../pages/CMS/PaymentPolicy/PaymentPolicy";
import PaymentPolicyList from "../../pages/CMS/PaymentPolicy/PaymentPolicyList";
import PrivacyPolicyCategory from "../../pages/CMS/PrivacyPolicy/PrivacyPolicy";
import PrivacyPolicyList from "../../pages/CMS/PrivacyPolicy/PrivacyPolicyList";
import Tax from "../../pages/Tax/Tax";
import SubTax from "../../pages/Tax/SubTax";
import TaxRule from "../../pages/Tax/TaxRule/TaxRule";
import ShippingDurations from "../../pages/ShippingPickup/ShippingDurations/ShippingDurations";
import TermsConditionsList from "../../pages/CMS/Terms&Conditions/Terms&ConditionsList";
import TermsConditions from "../../pages/CMS/Terms&Conditions/Terms&Conditions";
import PromotionsBanner from "../../pages/Admin/PromotionsBanner/PromotionsBanner";
import BarcodePage from "../../pages/Admin/Barcode/Barcode";
import HsnCode from "../../pages/Admin/HsnCode/HsnCode";
import Settings from "../../pages/Setting/Setting";
import BulkUploadProduct from "../../pages/ProductManagement/BulkUploadProduct";
import HelpAndSupport from '../../pages/CMS/Help&Support/HelpAndSupport.js';
import HelpSupportList from '../../pages/CMS/Help&Support/HelpSupportList.js';
import DeliveryStaff from '../../pages/UserManagement/DeliveryStaff/DeliveryStaff.js';
import CircularMenu from '../../pages/Admin/Orbit/Orbit.js';

const UnavailableRoute = () => (
  <div className="m-6 bg-white p-6 text-sm text-gray-600">
    This module is not available in the current admin build.
  </div>
);

const MaterialStatus = UnavailableRoute;
const Reconciliation = UnavailableRoute;
const ReturnNote = UnavailableRoute;
const ReturnNotePreview = UnavailableRoute;
const StorePage = UnavailableRoute;
const Product = UnavailableRoute;
const CategoryPage = UnavailableRoute;
const SubCategoryPage = UnavailableRoute;
const ProductStorePage = UnavailableRoute;
const ProductSupplierPage = UnavailableRoute;
const WarningPage = UnavailableRoute;
const BrandPage = UnavailableRoute;
const QtyheadPage = UnavailableRoute;
const WarrantyPage = UnavailableRoute;
const HsnCodePage = UnavailableRoute;
const BarCodePage = UnavailableRoute;
const AddNewProduct = UnavailableRoute;
const Purchase = UnavailableRoute;
const AddNewPurchase = UnavailableRoute;
const PurchaseOrderPreview = UnavailableRoute;
const PurchaseDetails = UnavailableRoute;
const GoodsReceivedDetails = UnavailableRoute;
const SalePage = UnavailableRoute;
const AddNewSale = UnavailableRoute;
const SalesInvoicePage = UnavailableRoute;
const SaleDetailPage = UnavailableRoute;
const Ledger = UnavailableRoute;
const VenderLedger = UnavailableRoute;
const MaterialReceived = UnavailableRoute;
const ReturnNoteLedger = UnavailableRoute;
const SupplierViewPage = UnavailableRoute;
const CreateInventory = UnavailableRoute;
const Inventory = UnavailableRoute;
const ViewInventory = UnavailableRoute;
const Stocks = UnavailableRoute;
const ReceiveOrderDetails = UnavailableRoute;
const Dashboard = React.lazy(() => import("../../pages/dashboard/Dashboard"));
const AdminUsers = React.lazy(() =>
  import("../../pages/UserManagement/Adminusers/AdminUsers")
);
const Users = React.lazy(() =>
  import("../../pages/UserManagement/Users/Users")
);
const UserDetails = React.lazy(() =>
  import("../../pages/UserManagement/UserDetails/UserDetails")
);
const UsersTransactions = React.lazy(() =>
  import("../../pages/UserManagement/UsersTransactions/UsersTransactions")
);
const UsersAddresses = React.lazy(() =>
  import("../../pages/UserManagement/UsersAddresses/UsersAddresses")
);
const UserMessages = React.lazy(() =>
  import("../../pages/UserManagement/UserMessages/UserMessages")
);
const ProductCatalog = React.lazy(() =>
  import("../../pages/ProductManagement/ProductCatalog/ProductCatalog")
);
const SellerProductInventories = React.lazy(() =>
  import(
    "../../pages/ProductManagement/SellerProductInventories/SellerProductInventories"
  )
);
const Store = React.lazy(() =>
  import("../../pages/ProductManagement/Store/Store")
);
const Brands = React.lazy(() =>
  import("../../pages/ProductManagement/Brands/Brands")
);
const ProductOptions = React.lazy(() =>
  import("../../pages/ProductManagement/ProductOptions/ProductOptions")
);
const ProductTags = React.lazy(() =>
  import("../../pages/ProductManagement/ProductTags/ProductTags")
);
const ThresholdProducts = React.lazy(() =>
  import("../../pages/ProductManagement/ThresholdProducts/ThresholdProducts")
);
const Orders = React.lazy(() =>
  import("../../pages/OrdersManagement/Orders/Orders")
);
const OrderStatus = React.lazy(() =>
  import("../../pages/OrdersManagement/OrderStatus/OrderStatus")
);
const ProductReviews = React.lazy(() =>
  import("../../pages/OrdersManagement/ProductReviews/ProductReviews")
);
const SpecialPrice = React.lazy(() =>
  import("../../pages/Promotions/SpecialPrice/SpecialPrice")
);
const VolumeDiscount = React.lazy(() =>
  import("../../pages/Promotions/VolumeDiscount/VolumeDiscount")
);
const SimilarProducts = React.lazy(() =>
  import("../../pages/Promotions/SimilarProducts/SimilarProducts")
);
const FrequentlyBoughtTogether = React.lazy(() =>
  import(
    "../../pages/Promotions/FrequentlyBoughtTogether/FrequentlyBoughtTogether"
  )
);
const PPCPromotionsManagement = React.lazy(() =>
  import(
    "../../pages/Promotions/PPCPromotionsManagement/PPCPromotionsManagement"
  )
);
const RewardOnPurchase = React.lazy(() =>
  import("../../pages/Promotions/RewardOnPurchase/RewardOnPurchase")
);
const ProductEventWeightages = React.lazy(() =>
  import("../../pages/Promotions/ProductEventWeightages/ProductEventWeightages")
);
const RecommendedProductTagWeightages = React.lazy(() =>
  import(
    "../../pages/Promotions/RecommendedProductTagWeightages/RecommendedProductTagWeightages"
  )
);
const DiscountCoupons = React.lazy(() =>
  import("../../pages/Promotions/DiscountCoupons/DiscountCoupons")
);
const ReferralCommerce = React.lazy(() =>
  import("../../pages/ReferralCommerce/ReferralCommerce")
);
const Ribbons = React.lazy(() =>
  import("../../pages/Promotions/Ribbons/Ribbons")
);
const ShippingCompanyUsers = React.lazy(() =>
  import("../../pages/ShippingPickup/ShippingCompanyUsers/ShippingCompanyUsers")
);
const ShippingPackages = React.lazy(() =>
  import("../../pages/ShippingPickup/ShippingPackages/ShippingPackages")
);
const ShippingProfiles = React.lazy(() =>
  import("../../pages/ShippingPickup/ShippingProfiles/ShippingProfiles")
);
const PickupAddresses = React.lazy(() =>
  import("../../pages/ShippingPickup/PickupAddresses/PickupAddresses")
);
const AddEditProductPopup = React.lazy(() =>
  import(
    "../../pages/ProductManagement/ProductCatalog/components/AddEditProduct"
  )
);
const ProductAdminDetails = React.lazy(() =>
  import(
    "../../pages/ProductManagement/ProductCatalog/components/ProductAdminDetails"
  )
);
const ProductCategories = React.lazy(() =>
  import("../../pages/ProductManagement/ProductCategories/ProductCategories")
);
const CategoryAttributes = React.lazy(() =>
  import("../../pages/ProductManagement/ProductCategories/CategoryAttributes")
);
const OrderSummary = React.lazy(() =>
  import("../../pages/OrdersManagement/Orders/components/ViewOrders")
);
const SubscriptionOrders = React.lazy(() =>
  import("../../pages/OrdersManagement/SubscriptionOrders/SubscriptionOrders")
);
const ViewSubscriptionOrders = React.lazy(() =>
  import(
    "../../pages/OrdersManagement/SubscriptionOrders/components/ViewSubscriptionOrders"
  )
);
const ManageCountry = React.lazy(() =>
  import("../../pages/UserManagement/ManageCountry/ManageCountry")
);
const ManageState = React.lazy(() =>
  import("../../pages/UserManagement/ManageState/ManageState")
);
const ManageCity = React.lazy(() =>
  import("../../pages/UserManagement/ManageCity/ManageCity")
);
const HomepageSlides = React.lazy(() =>
  import("../../pages/CMS/HomepageSlides/HomepageSlides")
);
const BannerLocations = React.lazy(() =>
  import("../../pages/CMS/BannerLocations/BannerLocations")
);
const ContentPages = React.lazy(() =>
  import("../../pages/CMS/ContentPages/ContentPages")
);
const Banners = React.lazy(() =>
  import("../../pages/CMS/BannerLocations/components/Banners")
);
const GiftCardOrder = React.lazy(() =>
  import("../../pages/OrdersManagement/GiftCardOrder/GiftCardOrder")
);
const OrderCancellationReasons = React.lazy(() =>
  import(
    "../../pages/OrdersManagement/Order Cancellation Reasons/OrderCancellationReasons"
  )
);
const OrderReturn = React.lazy(() =>
  import("../../pages/OrdersManagement/Order Return Reason/OrderReturn")
);
const Profile = React.lazy(() => import("../../pages/My Profile/Profile"));
const ChangePassword = React.lazy(() =>
  import("../../pages/Change Password/ChangePassword")
);
const Setting = React.lazy(() => import("../../pages/Setting/Setting"));
const ManageZipcode = React.lazy(() =>
  import("../../pages/UserManagement/ManageZipCode/ManageZipCode")
);
const TaxStructure = React.lazy(() =>
  import("../../pages/Admin/Tax/TaxStructure")
);
const TaxCategory = React.lazy(() =>
  import("../../pages/Admin/Tax/TaxCategory")
);
const TaxRules = React.lazy(() => import("../../pages/Admin/Tax/TaxRules"));
const Collections = React.lazy(() =>
  import("../../pages/Admin/Collection/Collections")
);
const ProductVariants = React.lazy(() =>
  import("../../pages/ProductManagement/ProductVariants/ProductVariants")
);
const ProductFamilies = React.lazy(() =>
  import("../../pages/ProductManagement/ProductFamilies/ProductFamilies")
);
const ProductFlow = React.lazy(() =>
  import("../../pages/ProductManagement/ProductFlow/ProductFlow")
);
const ProductDimensions = React.lazy(() =>
  import("../../pages/ProductManagement/ProductDimensions/ProductDimensions")
);
const Pattern = React.lazy(() => import("../../pages/Admin/Pattern/Pattern"));
const FinishProducts = React.lazy(() =>
  import("../../pages/ProductManagement/FinishProduct/FinishProduct")
);
const ColorManagement = React.lazy(() =>
  import("../../pages/Admin/Colors/ColorManagement")
);
const PrivacyPolicy = React.lazy(() =>
  import("../../pages/Setting/Components/PrivacyPolicy")
);
const ProductWarranty = React.lazy(() =>
  import("../../pages/ProductManagement/ProductWarranty/ProductWarranty")
);
const Sellers = React.lazy(() =>
  import("../../pages/UserManagement/Sellers/Seller")
);
const UserPermissions = React.lazy(() =>
  import("../../pages/UserManagement/Adminusers/UserPermissions")
);
const Supplier = UnavailableRoute;
const AddSupplier = UnavailableRoute;
const MedPharama = UnavailableRoute;

function Layout() {
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      return Boolean(JSON.parse(sessionStorage.getItem("sidebarPermanentState") || "false"));
    } catch {
      return false;
    }
  });
  const [isRefreshConfig, setIsRefreshConfig] = useState(false);
  const socket = socketConnection();
  const [isPermissionShow, setIsPermissionShow] = useState(false);
  const selector = useSelector((state) => state.user);
  const permissions = selector?.getMyModulePermissionData?.data?.data;
  const [hasPermanentOpen, setHasPermanentOpen] = useState(() => {
    try {
      return Boolean(JSON.parse(sessionStorage.getItem("sidebarPermanentState") || "false"));
    } catch {
      return false;
    }
  });

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
          ? module.permissions.find((permission) => permission.action === "view")
          : null;
        const hasAssignedView =
          viewPermission ? viewPermission.assigned !== false : module.assigned !== false;

        permMap[moduleCode] = module.assigned !== false && hasAssignedView;
      });
    }
    return permMap;
  }, [permissions]);

  useEffect(() => {
    socket?.on("refreshed-configurations", (data) => {
      setIsPermissionShow(true);
      setIsRefreshConfig(!isRefreshConfig);
    });

    return () => {
      socket?.off("refreshed-configurations");
    };
  }, [isRefreshConfig, socket]);

  const hasPermission = (path) => {
    if (isSelfServiceRoute(path)) return true;

    const moduleCandidates = getRouteModuleCandidates(path);
    if (!moduleCandidates.length) return true;

    return moduleCandidates.some((moduleCode) => {
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
    const normalizedPath = String(path || "").replace(/^\/+/, "");
    if (!SUPPORTED_ADMIN_ROUTES.has(normalizedPath)) {
      return <PermissionNotAllowed loading={isPermissionShow} />;
    }
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
        className={`flex flex-col flex-1 overflow-hidden ${navbarOpen ? "" : "lg:ml-0"
          }`}
      >
        <Header
          handleNavbar={() => setNavbarOpen((prev) => !prev)}
          moduleName={moduleName}
          hasPermanentOpen={hasPermanentOpen}
        />

        <main className="flex-1 bg-[#f1edf0] overflow-y-auto pt-16">
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
              <Route path="/users" element={renderRoute("/users", <Users />)} />
              <Route path="/users/view/:id" element={renderRoute("/users", <UserDetails />)} />
              <Route path="/admin-users/view/:id" element={renderRoute("/admin-users", <UserDetails />)} />
              <Route path="/seller/view/:id" element={renderRoute("/seller", <UserDetails />)} />
              <Route
                path="/transactions"
                element={renderRoute("/transactions", <UsersTransactions />)}
              />
              <Route
                path="/users-addresses"
                element={renderRoute("/users-addresses", <UsersAddresses />)}
              />
              <Route
                path="/messages"
                element={renderRoute("/messages", <UserMessages />)}
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
                  <SellerProductInventories />
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
                  <ThresholdProducts />
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
                  <OrderCancellationReasons />
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
                  <FrequentlyBoughtTogether />
                )}
              />
              <Route
                path="/PPC-promotions-management"
                element={renderRoute(
                  "/PPC-promotions-management",
                  <PPCPromotionsManagement />
                )}
              />
              <Route
                path="/reward-on-purchase"
                element={renderRoute(
                  "/reward-on-purchase",
                  <RewardOnPurchase />
                )}
              />
              <Route
                path="/product-event-weightages"
                element={renderRoute(
                  "/product-event-weightages",
                  <ProductEventWeightages />
                )}
              />
              <Route
                path="/recommended-product-tag-weightages"
                element={renderRoute(
                  "/recommended-product-tag-weightages",
                  <RecommendedProductTagWeightages />
                )}
              />
              <Route
                path="/discount-coupons"
                element={renderRoute("/discount-coupons", <DiscountCoupons />)}
              />
              <Route
                path="/referral-commerce"
                element={renderRoute("/referral-commerce", <ReferralCommerce />)}
              />
              {/* <Route path="/badges" element={renderRoute('/badges', <Badges />)} /> */}
              <Route path="/ribbons" element={renderSupportedRoute('/ribbons', <Ribbons />)} />
              <Route path="/shipping-company-users" element={renderRoute('/shipping-company-users', <ShippingCompanyUsers />)} />
              <Route path="/shipping-packages" element={renderRoute('/shipping-packages', <ShippingPackages />)} />
              <Route path="/shipping-profile" element={renderRoute('/shipping-profile', <ShippingProfiles />)} />
              <Route path="/pickup-addresses" element={renderRoute('/pickup-addresses', <PickupAddresses />)} />
              <Route path="/categories" element={renderRoute('/categories', <ProductCategories />)} />
              <Route path="/category-attributes" element={renderRoute('/category-attributes', <CategoryAttributes />)} />
              <Route path="/subscription-orders" element={renderRoute('/subscription-orders', <SubscriptionOrders />)} />
              <Route path="/homepage-slides" element={renderRoute('/homepage-slides', <HomepageSlides />)} />
              <Route path="/banners" element={renderRoute('/banners', <BannerLocations />)} />
              <Route path="/content-pages" element={renderRoute('/content-pages', <ContentPages />)} />
              <Route path="/view-orders" element={renderRoute('/view-orders', <OrderSummary />)} />
              <Route path="/product-catalog/form/:id?" element={renderRoute('/product-catalog/form', <AddEditProductPopup />)} />
              <Route path="/product-catalog/view/:id" element={renderRoute('/product-catalog', <ProductAdminDetails />)} />
              <Route path="/view-subscription-orders" element={renderRoute('/view-subscription-orders', <ViewSubscriptionOrders />)} />
              <Route path="/inner-banners" element={renderRoute('/inner-banners', <Banners />)} />
              <Route path="/profile" element={renderRoute('/profile', <Profile />)} />
              <Route path="/changePassword" element={renderRoute('/changePassword', <ChangePassword />)} />
              <Route path="/settings" element={renderRoute('/settings', <Setting />)} />
              <Route path="/state" element={renderRoute('/state', <ManageState />)} />
              <Route path="/city" element={renderRoute('/city', <ManageCity />)} />
              <Route path="/country" element={renderRoute('/country', <ManageCountry />)} />
              <Route path="/state" element={renderRoute('/state', <ManageState />)} />
              <Route path="/city" element={renderRoute('/city', <ManageCity />)} />
              <Route path="/zipcode" element={renderSupportedRoute('/zipcode', <ManageZipcode />)} />
              <Route path="/zipCode" element={renderSupportedRoute('/zipCode', <ManageZipcode />)} />
              <Route path="/tax-structure" element={renderRoute('/tax-structure', <TaxStructure />)} />
              <Route path="/tax-category" element={renderRoute('/tax-category', <TaxCategory />)} />
              <Route path="/tax-category-rules" element={renderRoute('/tax-category-rules', <TaxRules />)} />
              <Route path="/collections" element={renderSupportedRoute('/collections', <Collections />)} />
              <Route path="/product-variants" element={renderRoute('/product-variants', <ProductVariants />)} />
              <Route path="/product-families" element={renderRoute('/product-families', <ProductFamilies />)} />
              <Route path='/product-dimensions' element={renderRoute('/product-dimensions', <ProductDimensions />)} />
              <Route path="/pattern" element={renderSupportedRoute('/pattern', <Pattern />)} />
              <Route path='/finish' element={renderRoute('/finish', <FinishProducts />)} />
              <Route path='/colors' element={renderSupportedRoute('/colors', <ColorManagement />)} />
              <Route path='/privacy-policy' element={renderRoute('/privacy-policy', <PrivacyPolicy />)} />
              <Route
                path='/user-permissions/:id'
                element={renderSupportedRoute('/user-permissions', <UserPermissions setModuleName={setModuleName} />)}
              />
              <Route path='/seller' element={renderRoute('/seller', <Sellers />)} />
              <Route path='/batch' element={renderRoute('/batch', <Batch />)} />
              <Route
                path='/product-option-value/:id'
                element={renderSupportedRoute('/product-options', <ProductOptionValue setModuleName={setModuleName} />)}
              />
              {/* <Route path="/interests" element={renderRoute('/interests', <InterestManagement />)} /> */}
              {/* <Route path="/preferences" element={renderRoute('/preferences', <Preferences />)} /> */}
              <Route path="/badges" element={renderRoute('/badge', <Badge />)} />
              <Route path="/qty-head" element={renderRoute('/qty-head', <QtyHead />)} />
              <Route path='/warranty' element={renderRoute('/warranty', <ProductWarranty />)} />
              <Route path='/faqs' element={renderRoute('/faqs', <FAQ />)} />
              <Route path="/faqsList/:id" element={renderRoute('/faqs', <FAQList />)} />
              <Route path='/return-policy' element={renderRoute('/return-policy', <ReturnPolicy />)} />
              <Route
                path='/return-policy-list/:id'
                element={renderSupportedRoute('/return-policy', <ReturnPolicyList setModuleName={setModuleName} />)}
              />
              <Route path='/holidays' element={renderRoute('/holidays', <Holidays />)} />
              <Route
                path='/holidays-list/:id'
                element={renderSupportedRoute('/holidays', <HolidaysList setModuleName={setModuleName} />)}
              />
              <Route path='/payment-policy' element={renderRoute('/payment-policy', <PaymentPolicy />)} />
              <Route
                path='/payment-policy-list/:id'
                element={renderSupportedRoute('/payment-policy', <PaymentPolicyList setModuleName={setModuleName} />)}
              />
              <Route path='/privacy-policies' element={renderRoute('/privacy-policies', <PrivacyPolicyCategory />)} />
              <Route
                path='/privacy-policies-list/:id'
                element={renderSupportedRoute('/privacy-policies', <PrivacyPolicyList setModuleName={setModuleName} />)}
              />
              <Route path="/tax" element={renderRoute('/tax', <Tax />)} />
              <Route
                path='/subTax/:id'
                element={renderSupportedRoute('/subTax', <SubTax setModuleName={setModuleName} />)}
              />
              <Route
                path='/tax-rule'
                element={renderSupportedRoute('/tax-rule', <TaxRule setModuleName={setModuleName} />)}
              />
              <Route path="/shipping-duration" element={renderSupportedRoute('/shipping-duration', <ShippingDurations />)} />
              <Route path="/discount-coupons" element={renderRoute('/discount-coupons', <DiscountCoupons />)} />
              <Route path="/terms-and-conditions" element={renderRoute('/terms-and-conditions', <TermsConditions />)} />
              <Route
                path='/terms-and-conditions/:id'
                element={renderSupportedRoute('/terms-and-conditions', <TermsConditionsList setModuleName={setModuleName} />)}
              />
              <Route
                path='/help-and-support/:id'
                element={renderSupportedRoute('/help-and-support', <HelpSupportList setModuleName={setModuleName} />)}
              />

              <Route path="/promotions-banners" element={renderRoute('/promotions-banners', <PromotionsBanner />)} />
              <Route path="/bar-code" element={renderRoute('/barcode', <BarcodePage />)} />
              <Route path="/hsn-code" element={renderRoute('/hsn-code', <HsnCode />)} />
              <Route path="/setting" element={renderRoute('/setting', <Settings />)} />
              <Route path="/product-catalog/bulk-history" element={renderRoute('/product-catalog/bulk-history', <BulkUploadProduct />)} />
              <Route path="/orders/view/:id" element={renderRoute('/orders/view', <OrderSummary />)} />



              <Route path="/supplier" element={renderRoute("/supplier", <Supplier />)} />
              <Route path="/supplier/form/:id?" element={renderRoute("/supplier/form/:id?", <AddSupplier />)} />
              <Route path="/supplier/view/:id" element={renderRoute("/supplier/view/:id", <SupplierViewPage />)} />
              <Route path="/supplier/med-pharma/:id" element={renderRoute("/supplier/med-pharma/:id", <MedPharama />)} />

              <Route path="/goods-receive" element={renderRoute("/goods-receive/:id", <Stocks />)} />
              <Route path="/stoks/material-receipt" element={renderRoute("/stoks/material-receipt", <MaterialStatus />)} />
              <Route path="/stoks/reconciliation" element={renderRoute("/stoks/reconciliation", <Reconciliation />)} />
              <Route path="/stoks/return-note" element={renderRoute("/stoks/return-note", <ReturnNote />)} />
              <Route path="/stoks/return-note/preview" element={renderRoute("/stoks/return-note/preview", <ReturnNotePreview />)} />

              <Route path="/inventory" element={renderRoute("/inventory", <Inventory />)} />
              <Route path="/inventory/form/:id?" element={renderRoute("/inventory/form/:id?", <CreateInventory />)} />
              <Route path="/inventory/view/:id" element={renderRoute("/inventory/view/:id", <ViewInventory />)} />

              <Route path="/store/store-page" element={renderRoute("/store/store-page", <StorePage />)} />

              <Route path="/product" element={renderRoute("/product", <Product />)} />
              <Route path="/product/form/:id?" element={renderRoute("/product/form/:id?", <AddNewProduct />)} />
              {/* <Route path="/product/batch-page" element={renderRoute("/product/batch", <BatchPage />)} /> */}
              <Route path="/product/category-page" element={renderRoute("/product/category-page", <CategoryPage />)} />
              <Route path="/product/sub-category-page" element={renderRoute("/product/sub-category-page", <SubCategoryPage />)} />
              <Route path="/product/store-page" element={renderRoute("/product/store/page", <ProductStorePage />)} />
              <Route path="/product/supplier-page" element={renderRoute("/product/supplier-page", <ProductSupplierPage />)} />
              <Route path="/product/warning-page" element={renderRoute("/product/warning-page", <WarningPage />)} />
              <Route path="/product/brand-page" element={renderRoute("/product/brand-page", <BrandPage />)} />
              <Route path="/product/qtyhead-page" element={renderRoute("/product/qtyhead-page", <QtyheadPage />)} />
              <Route path="/product/warranty-page" element={renderRoute("/product/warranty-page", <WarrantyPage />)} />
              <Route path="/product/hsn-code-page" element={renderRoute("/product/hsn-code-page", <HsnCodePage />)} />
              <Route path="/product/barcode-page" element={renderRoute("/product/barcode-page", <BarCodePage />)} />

              <Route path="/purchase" element={renderRoute("/purchase", <Purchase />)} />
              <Route path="/purchase/form/:id?" element={renderRoute("/purchase/form/:id?", <AddNewPurchase />)} />
              <Route path="/purchase/purchase-preview/:id" element={renderRoute("/purchase/purchase-preview/:id", <PurchaseOrderPreview />)} />
              <Route path="/purchase/purchase-details/:id" element={renderRoute("/purchase/purchase-details/:id", <PurchaseDetails />)} />
              <Route path="/purchase/goodrecieve-details/:id" element={renderRoute("/purchase/goodrecieve-details/:id", <GoodsReceivedDetails />)} />
              <Route path="/sale" element={renderRoute("/sale", <SalePage />)} />
              <Route path="/sale/form" element={renderRoute("/sale/form", <AddNewSale />)} />
              <Route path="/sale/sale-preview/:id" element={renderRoute("/sale/sale-preview/:id", <SalesInvoicePage />)} />
              <Route path="/sale/view/:id" element={renderRoute("/sale/view/:id", <SaleDetailPage />)} />
              <Route path="/ledger" element={renderRoute("/ledger", <Ledger />)} />

              <Route path="/ledger/vender-ledger" element={renderRoute("/ledger/vender-ledger", <VenderLedger />)} />
              <Route path="/ledger/return-note" element={renderRoute("/ledger/return-note", <ReturnNoteLedger />)} />
              <Route path="/ledger/material-received" element={renderRoute("/ledger/material-received", <MaterialReceived />)} />

              <Route path="/purchase/receive-order-details" element={renderRoute("/purchase/receive-order-details", <ReceiveOrderDetails />)} />

              <Route path="/setting" element={renderRoute("/setting", <Settings />)} />
              <Route path="/upload-file" element={renderRoute("/upload-file", <BulkUploadProduct />)} />
              <Route path="/help-and-support" element={renderRoute("/help-and-support", <HelpAndSupport />)} />
              <Route path="/delivery-staff" element={renderRoute("/delivery-staff", <DeliveryStaff />)} />


              <Route path="/rotate" element={renderRoute("/rotate", <CircularMenu />)} />







            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default Layout;
