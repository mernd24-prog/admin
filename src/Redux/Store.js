import { configureStore } from '@reduxjs/toolkit'
import authReducer from "./auth-Slice"
import alertReducer from "./alertSlice"
import adminReducer from "./adminSlice"
import countryReducer from './CountrySlice'
import productReducer from './productSlice'
import stateReducer from './stateSlice'
import cityReducer from './citySlice'
import zipCodeReducer from './zipCodeSlice'
import userReducer from './userManagementSlice'
import patternReducer from './patternSlice'
import storeReducer from './StoreSlice'
import badgeReducer from './badgeSlice'
import cmsReducer from './cmsSlice'
import promotionsReducer from './promotionsSlice'
import orderReducer from './orderSlice'
import sellerReducer from './seller-slice'
import adminCoreReducer from './adminCoreSlice'
import sellerDashboardReducer from './sellerDashboardSlice'
import sellerTrackingReducer from './sellerTrackingSlice'
import sellerOnboardingReducer from './sellerOnboardingSlice'
import sellerProfileReducer from './sellerProfileSlice'
import sellerSubAdminsReducer from './sellerSubAdminsSlice'
import sellerProductsReducer from './sellerProductsSlice'
import sellerOrdersReducer from './sellerOrdersSlice'
import sellerCommissionsReducer from './sellerCommissionsSlice'
import deliveryReducer from './deliverySlice'
import notificationsReducer from './notificationsSlice'
import sellerReturnsReducer from './sellerReturnsSlice'
import sellerAnalyticsReducer from './sellerAnalyticsSlice'
import referralCommerceReducer from './referralCommerceSlice'
import inventoryReducer from "./inventorySlice";

export const store = configureStore({
  reducer: {
    authSlice: authReducer,
    alert: alertReducer,
    country: countryReducer,
    product: productReducer,
    state: stateReducer,
    city: cityReducer,
    zipCode: zipCodeReducer,
    user: userReducer,
    pattern: patternReducer,
    store: storeReducer,
    badge: badgeReducer,
    cms: cmsReducer,
    promotions: promotionsReducer,
    order: orderReducer
    ,
    seller: sellerReducer,
    adminCore: adminCoreReducer,
    sellerDashboard: sellerDashboardReducer,
    sellerTracking: sellerTrackingReducer,
    sellerOnboarding: sellerOnboardingReducer,
    sellerProfile: sellerProfileReducer,
    sellerSubAdmins: sellerSubAdminsReducer,
    sellerProducts: sellerProductsReducer,
    sellerOrders: sellerOrdersReducer,
    sellerCommissions: sellerCommissionsReducer,
    delivery: deliveryReducer,
    notifications: notificationsReducer,
    sellerReturns: sellerReturnsReducer,
    sellerAnalytics: sellerAnalyticsReducer,
    referralCommerce: referralCommerceReducer,
    admin: adminReducer,
    inventory: inventoryReducer,
  },
})
