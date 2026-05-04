import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Route, Routes } from "react-router-dom";
import { useSelector } from 'react-redux';
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import PermissionNotAllowed from "../Atoms/PermissionsNotAllowed/PermissionNotAllowed";
import { socketConnection } from "../../_helpers/socket";
import { hasModuleAccess } from "../../_helpers/authStorage";
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
import MaterialStatus from "../../ERP/Stoks/components/MaterialStatus";
import Reconciliation from "../../ERP/Stoks/Reconciliation";
import ReturnNote from "../../ERP/Stoks/ReturnNote";
import ReturnNotePreview from "../../ERP/Stoks/components/ReturnNotePreview";
import StorePage from "../../ERP/Store/StorePage";
import Product from "../../ERP/Product/Product";
// import BatchPage from "../../ERP/Product/Batch";
import CategoryPage from "../../ERP/Product/Category";
import SubCategoryPage from "../../ERP/Product/SubCategory";
import ProductStorePage from "../../ERP/Product/Store";
import ProductSupplierPage from "../../ERP/Product/Supplier";
import WarningPage from "../../ERP/Product/Warning";
import BrandPage from "../../ERP/Product/Brand";
import QtyheadPage from "../../ERP/Product/QtyHead";
import WarrantyPage from "../../ERP/Product/Warranty";
import HsnCodePage from "../../ERP/Product/HsnCode";
import BarCodePage from "../../ERP/Product/Barcode";
import AddNewProduct from "../../ERP/Product/components/AddNewProduct";
import Purchase from "../../ERP/Purchase/Purchase";
import AddNewPurchase from "../../ERP/Purchase/components/AddNewPurchase";
import PurchaseOrderPreview from "../../ERP/Purchase/components/PurchaseOrderPreview";
import PurchaseDetails from "../../ERP/Purchase/components/PurchaseDetails";
import GoodsReceivedDetails from '../../ERP/Purchase/components/goodRecieveDetails.js';
import SalePage from "../../ERP/Purchase/SalePage";
import AddNewSale from "../../ERP/Purchase/components/AddNewSale";
import SalesInvoicePage from "../../ERP/Purchase/components/SalesInvoice";
import SaleDetailPage from "../../ERP/Purchase/components/SaleDetailPage";
import Ledger from "../../ERP/Ledger/Ledger";
import VenderLedger from "../../ERP/Ledger/VenderLedger";
import MaterialReceived from "../../ERP/Ledger/MaterialReceived";
import ReturnNoteLedger from "../../ERP/Ledger/ReturnNoteLedger";
import Settings from "../../pages/Setting/Setting";
import BulkUploadProduct from "../../pages/ProductManagement/BulkUploadProduct";
import SupplierViewPage from "../../ERP/Suplier/components/SupplierViewPage";
import CreateInventory from "../../ERP/Enventory/components/CreateInventory";
import Inventory from "../../ERP/Enventory/Inventory";
import ViewInventory from "../../ERP/Enventory/components/ViewInventory";
import Stocks from '../../ERP/Stoks/Stoks';
import HelpAndSupport from '../../pages/CMS/Help&Support/HelpAndSupport.js';
import HelpSupportList from '../../pages/CMS/Help&Support/HelpSupportList.js';
import ReceiveOrderDetails from '../../ERP/Purchase/ReceiveOrderDetails.js';
import DeliveryStaff from '../../pages/UserManagement/DeliveryStaff/DeliveryStaff.js';
import CircularMenu from '../../pages/Admin/Orbit/Orbit.js';
const Dashboard = React.lazy(() => import("../../pages/dashboard/Dashboard"));
const AdminUsers = React.lazy(() =>
  import("../../pages/UserManagement/Adminusers/AdminUsers")
);
const Users = React.lazy(() =>
  import("../../pages/UserManagement/Users/Users")
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
const ProductCategories = React.lazy(() =>
  import("../../pages/ProductManagement/ProductCategories/ProductCategories")
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
const Supplier = React.lazy(() => import("../../../src/ERP/Suplier/Supplier"));
const AddSupplier = React.lazy(() =>
  import("../../../src/ERP/Suplier/components/AddSupplier")
);
const MedPharama = React.lazy(() =>
  import("../../../src/ERP/Suplier/MedPharma")
);
// const GoodsReceived = React.lazy(() =>
//   import("../../../src/ERP/Stoks/Stoks.js")
// );

function Layout() {
  const [navbarOpen, setNavbarOpen] = useState(false);
  const [moduleName, setModuleName] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshConfig, setIsRefreshConfig] = useState(false);
  const socket = socketConnection();
  const [isPermissionShow, setIsPermissionShow] = useState(false);
  const selector = useSelector((state) => state.user);
  const permissions = selector?.getAllModulePermissionData?.data?.data;
  const [hasPermanentOpen, setHasPermanentOpen] = useState(false);

  const modulePermissions = useMemo(() => {
    const permMap = {};
    if (permissions && permissions.length) {
      permissions?.forEach((perm) => {
        if (perm.module_code && perm.module_code.module_code) {
          permMap[perm.module_code.module_code] = perm.view;
        }
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
    const basePath = path.replace(/\/:.*$/, "");

    const routeToModuleMap = {
      "/home": "home",
      "/admin-users": "admin_users",
      "/users": "users",
      "/transactions": "transactions",
      "/users-addresses": "users-addresses",
      "/messages": "messages",
      "/product-catalog": "product-catalog",
      "/seller-Product-Inventory": "seller-product-inventory",
      "/store": "store",
      "/brands": "brands",
      "/product-options": "product-options",
      "/product-tags": "product-tags",
      "/threshold-products": "threshold-products",
      "/orders": "orders",
      "/order-status": "order_status",
      "/gift-card-orders": "gift-card-orders",
      "/order-cancellation-reasons": "order-cancellation-reasons",
      "/order-return-reasons": "order_return_reasons",
      "/product-reviews": "product_reviews",
      "/special-price": "special_price",
      "/volume-discounts": "volume_discounts",
      "/similar-products": "similar_products",
      "/frequently-bought-together": "frequently_bought_together",
      "/PPC-promotions-management": "ppc_promotions_management",
      "/reward-on-purchase": "reward_on_purchase",
      "/product-event-weightages": "product_event_weightages",
      "/recommended-product-tag-weightages":
        "recommended_product_tag_weightages",
      "/discount-coupons": "discount_coupons",
      "/badges": "badges",
      "/ribbons": "ribbons",
      "/shipping-company-users": "shipping_company_users",
      "/shipping-packages": "shipping_packages",
      "/shipping-profile": "shipping_profile",
      "/pickup-addresses": "pickup_addresses",
      "/categories": "categories",
      "/subscription-orders": "subscription_orders",
      "/interest-management": "interest_management",
      "/homepage-slides": "homepage_slides",
      "/banners": "banners",
      "/content-pages": "content_pages",
      "/view-orders": "view_orders",
      "/add-product": "add_product",
      "/view-subscription-orders": "view_subscription_orders",
      "/inner-banners": "inner_banners",
      "/profile": "profile",
      "/changePassword": "change-password",
      "/settings": "settings",
      "/state": "state",
      "/city": "city",
      "/country": "country",
      "/zipcode": "zipcode",
      "/tax-structure": "tax-structure",
      "/tax-category": "tax-category",
      "/tax-category-rules": "tax-category-rules",
      "/collections": "collections",
      "/product-variants": "product-variants",
      "/product-dimensions": "product-dimensions",
      "/pattern": "pattern",
      "/finish": "finish",
      "/colors": "colors",
      "/privacy-policy": "privacy-policy",
      "/user-permissions": "user-permissions",
      "/warranty": "warranty",
      "/seller": "seller",
      "/batch": "batch",

      "/supplier": "supplier",
      "/supplier/form": "add-supplier",
      "/supplier/med-pharma": "med-pharma",

      "/goods-receive": "goods-receive",
      "/stoks/material-receipt": "material-receipt",
      "/stoks/reconciliation": "reconciliation",
      "/stoks/return-note": "return-note",
      "/stoks/return-note/preview": "return-note-preview",

      "/store/store-page": "store-page",

      "/product": "product",
      "/product/form": "add-product",
      "/product/batch-page": "batch-page",
      "/product/category-page": "category-page",
      "/product/sub-category-page": "sub-category-page",
      "/product/store-page": "store-page",
      "/product/supplier-page": "supplier-page",
      "/product/warning-page": "warning-page",
      "/product/brand-page": "brand-page",
      "/product/qtyhead-page": "qtyhead-page",
      "/product/warranty-page": "warranty-page",
      "/product/hsn-code-page": "hsn-code-page",
      "/product/barcode-page": "barcode-page",


      "/purchase": "purchase-page",
      "/purchase/form": "add-purchase-page",
      "/purchase/purchase-preview": "purchase-preview-page",
      "/purchase/purchase-details": "purchase-details-page",
      "/sale": "sale-page",
      "/sale/form": "add-sale-page",
      "/purchase/sale/invoice-preview": "invoice-preview-page",
      "/purchase/sale/sale-detail": "sale-detail-page",


      "/ledger": "ledger-page",
      "/ledger/vender-ledger": "vender-ledger-page",
      "/ledger/return-note": "return-note-page",
      "/ledger/material-received": "material-received-page",
    };

    const matchedRouteKey =
      routeToModuleMap[basePath]
        ? basePath
        : Object.keys(routeToModuleMap).find((key) => path.startsWith(key));

    const moduleCode = matchedRouteKey ? routeToModuleMap[matchedRouteKey] : undefined;

    const moduleAliases = {
      "admin_users": ["admin_users", "admins", "rbac"],
      "users": ["users"],
      "seller": ["seller", "sellers", "vendors"],
      "seller-product-inventory": ["seller-product-inventory", "products", "sellers"],
      "product-catalog": ["product-catalog", "products"],
      "products": ["products"],
      "orders": ["orders"],
      "gift-card-orders": ["gift-card-orders", "orders"],
      "order_status": ["order_status", "orders"],
      "subscription_orders": ["subscription_orders", "orders"],
      "discount_coupons": ["discount_coupons", "coupons", "pricing"],
      "shipping_packages": ["shipping_packages", "delivery"],
      "shipping_profile": ["shipping_profile", "delivery"],
      "pickup_addresses": ["pickup_addresses", "delivery", "sellers"],
      "delivery-staff": ["delivery-staff", "delivery"],
      "tax": ["tax"],
      "settings": ["settings", "system"],
      "home": ["home", "dashboard"],
    };

    if (moduleCode && !hasModuleAccess(moduleAliases[moduleCode] || moduleCode)) {
      return false;
    }

    return modulePermissions[moduleCode] !== false;
  };

  const renderRoute = (path, element) => {
    return hasPermission(path) ? (
      element
    ) : (
      <PermissionNotAllowed loading={isPermissionShow} />
    );
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
              {/* <Route path="/badges" element={renderRoute('/badges', <Badges />)} /> */}
              <Route path="/ribbons" element={renderRoute('/ribbons', <Ribbons />)} />
              <Route path="/shipping-company-users" element={renderRoute('/shipping-company-users', <ShippingCompanyUsers />)} />
              <Route path="/shipping-packages" element={renderRoute('/shipping-packages', <ShippingPackages />)} />
              <Route path="/shipping-profile" element={renderRoute('/shipping-profile', <ShippingProfiles />)} />
              <Route path="/pickup-addresses" element={renderRoute('/pickup-addresses', <PickupAddresses />)} />
              <Route path="/categories" element={renderRoute('/categories', <ProductCategories />)} />
              <Route path="/subscription-orders" element={renderRoute('/subscription-orders', <SubscriptionOrders />)} />
              <Route path="/homepage-slides" element={renderRoute('/homepage-slides', <HomepageSlides />)} />
              <Route path="/banners" element={renderRoute('/banners', <BannerLocations />)} />
              <Route path="/content-pages" element={renderRoute('/content-pages', <ContentPages />)} />
              <Route path="/view-orders" element={renderRoute('/view-orders', <OrderSummary />)} />
              <Route path="/product-catalog/form/:id?" element={renderRoute('/product-catalog/form', <AddEditProductPopup />)} />
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
              <Route path="/zipcode" element={renderRoute('/zipcode', <ManageZipcode />)} />
              <Route path="/tax-structure" element={renderRoute('/tax-structure', <TaxStructure />)} />
              <Route path="/tax-category" element={renderRoute('/tax-category', <TaxCategory />)} />
              <Route path="/tax-category-rules" element={renderRoute('/tax-category-rules', <TaxRules />)} />
              <Route path="/collections" element={renderRoute('/collections', <Collections />)} />
              <Route path="/product-variants" element={renderRoute('/product-variants', <ProductVariants />)} />
              <Route path='/product-dimensions' element={renderRoute('/product-dimensions', <ProductDimensions />)} />
              <Route path="/pattern" element={renderRoute('/pattern', <Pattern />)} />
              <Route path='/finish' element={renderRoute('/finish', <FinishProducts />)} />
              <Route path='/colors' element={renderRoute('/colors', <ColorManagement />)} />
              <Route path='/privacy-policy' element={renderRoute('/privacy-policy', <PrivacyPolicy />)} />
              <Route path='/user-permissions/:id' element={<UserPermissions setModuleName={setModuleName} />} />
              <Route path='/warranty' element={renderRoute('/warranty', <ProductWarranty />)} />
              <Route path='/seller' element={renderRoute('/seller', <Sellers />)} />
              <Route path='/batch' element={renderRoute('/seller', <Batch />)} />
              <Route path='/product-option-value/:id' element={<ProductOptionValue setModuleName={setModuleName} />} />
              {/* <Route path="/interests" element={renderRoute('/interests', <InterestManagement />)} /> */}
              {/* <Route path="/preferences" element={renderRoute('/preferences', <Preferences />)} /> */}
              <Route path="/badges" element={renderRoute('/badge', <Badge />)} />
              <Route path="/qty-head" element={renderRoute('/qty-head', <QtyHead />)} />
              <Route path='/warranty' element={renderRoute('/warranty', <ProductWarranty />)} />
              <Route path='/faqs' element={renderRoute('/faqs', <FAQ />)} />
              <Route path="/faqsList/:id" element={renderRoute('/faqs', <FAQList />)} />
              <Route path='/product-option-value/:id' element={<ProductOptionValue setModuleName={setModuleName} />} />
              <Route path='/return-policy' element={renderRoute('/return-policy', <ReturnPolicy />)} />
              <Route path='/return-policy-list/:id' element={<ReturnPolicyList setModuleName={setModuleName} />} />
              <Route path='/holidays' element={renderRoute('/holidays', <Holidays />)} />
              <Route path='/holidays-list/:id' element={<HolidaysList setModuleName={setModuleName} />} />
              <Route path='/payment-policy' element={renderRoute('/payment-policy', <PaymentPolicy />)} />
              <Route path='/payment-policy-list/:id' element={<PaymentPolicyList setModuleName={setModuleName} />} />
              <Route path='/privacy-policies' element={renderRoute('/privacy-policies', <PrivacyPolicyCategory />)} />
              <Route path='/privacy-policies-list/:id' element={<PrivacyPolicyList setModuleName={setModuleName} />} />
              <Route path="/tax" element={renderRoute('/tax', <Tax />)} />
              <Route path='/subTax/:id' element={<SubTax setModuleName={setModuleName} />} />
              <Route path='/tax-rule' element={<TaxRule setModuleName={setModuleName} />} />
              <Route path="/shipping-duration" element={renderRoute('/shipping-duration', <ShippingDurations />)} />
              <Route path="/discount-coupons" element={renderRoute('/discount-coupons', <DiscountCoupons />)} />
              <Route path="/terms-and-conditions" element={renderRoute('/terms-and-conditions', <TermsConditions />)} />
              <Route path='/terms-and-conditions/:id' element={<TermsConditionsList setModuleName={setModuleName} />} />
              <Route path='/help-and-support/:id' element={<HelpSupportList setModuleName={setModuleName} />} />

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
