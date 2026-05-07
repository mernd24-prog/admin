# Customer React Web App Prompt With API Slices

Use this prompt to generate a production-ready React customer web app for this ecommerce backend. It is based on the mounted API routes in `src/api/register-routes.js`, the route files in `src/modules/**/routes`, and the Joi validation files in `src/modules/**/validation`.

Important source notes:

- API prefix is `/api/v1`.
- Health route is `/health`.
- Meta route is `/api/v1/meta/routes`.
- `src/shared/routes/search.routes.js` exists but is not mounted in `src/api/register-routes.js`; do not call it until backend mounts it.
- Some Postman examples are older than the Joi validation. Use the validation payloads below as the frontend source of truth.
- Customer web should not expose admin, RBAC, system, payout, tax-management, webhook-management, fraud-review, or seller action screens.
- Seller has a dedicated admin panel for all business actions. The customer web may only let seller users log in and view read-only seller status and tracking pages.

## Master Prompt

You are a senior React ecommerce frontend engineer.

Build a complete, advanced, customer-facing ecommerce web app in React for the backend described below. Use Redux Toolkit slices and async thunks or RTK Query endpoints grouped by domain. Do not hardcode API URLs inside components. Do not use fake API paths. Every documented API must be represented in `src/api/endpoints.ts` or `src/api/endpoints.js`, and every API must be assigned to a domain slice even if the UI does not expose it in the customer navigation.

Use:

- React
- React Router
- Redux Toolkit
- Axios with interceptors
- React Hook Form
- Yup or Zod validation
- Toast notifications
- Skeleton loaders
- Responsive mobile-first layout
- Accessible components
- SEO metadata for public product, category, CMS, and search pages
- Optional PWA support

Create this frontend structure:

```text
src/
  api/
    client.js
    endpoints.js
    normalizeApiError.js
  app/
    store.js
  features/
    auth/authSlice.js
    user/userSlice.js
    catalog/catalogSlice.js
    product/productSlice.js
    cart/cartSlice.js
    checkout/checkoutSlice.js
    order/orderSlice.js
    payment/paymentSlice.js
    delivery/deliverySlice.js
    returns/returnsSlice.js
    wallet/walletSlice.js
    subscription/subscriptionSlice.js
    notification/notificationSlice.js
    loyalty/loyaltySlice.js
    warranty/warrantySlice.js
    recommendation/recommendationSlice.js
    analytics/analyticsSlice.js
    cms/cmsSlice.js
    meta/metaSlice.js
    seller/sellerSlice.js
    sellerCommission/sellerCommissionSlice.js
    pricing/pricingSlice.js
    dynamicPricing/dynamicPricingSlice.js
    admin/adminSlice.js
    rbac/rbacSlice.js
    tax/taxSlice.js
    fraud/fraudSlice.js
  layouts/
  pages/
  components/
  hooks/
  utils/
```

Global API behavior:

- Base URL: `import.meta.env.VITE_API_BASE_URL || ""`.
- API prefix: `/api/v1`.
- Store `accessToken` and `refreshToken` securely.
- Send `Authorization: Bearer <accessToken>` for protected routes.
- On 401, call `POST /api/v1/auth/refresh` once, replay the original request, and logout only if refresh fails.
- Normalize response data from:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 20
  }
}
```

- Normalize errors in this order:
  1. `response.data.message`
  2. `response.data.error`
  3. first message from `response.data.details`
  4. generic fallback

Use this state shape for every slice:

```js
const initialState = {
  entities: {},
  list: [],
  current: null,
  meta: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
};
```

Every screen must include loading, empty, success, validation-error, API-error, and retry states.

## Customer Routes To Build

```text
/
/login
/register
/register/otp
/verify-registration
/verify-otp
/forgot-password
/reset-password
/account
/account/profile
/account/addresses
/account/security
/account/kyc
/products
/products/search
/products/:productId
/categories/:categoryKey
/cart
/checkout
/payment/success
/payment/failed
/orders
/orders/:orderId
/orders/:orderId/track
/returns
/returns/request/:orderId
/wallet
/subscriptions
/loyalty
/warranty
/warranty/:warrantyId
/notifications
/notification-preferences
/cms/:slug
/seller/status
/seller/tracking
/seller/tracking/:orderId
```

Admin and seller action APIs must be present in endpoint constants and slices, but should be hidden from customer navigation. Seller web navigation may show only seller status and tracking pages.

## Customer Web And Seller Web Boundary

Build two role-aware web experiences:

- Buyer/customer web: browsing, account, cart, checkout, payments, orders, returns, wallet, subscriptions, notifications, loyalty, warranty, recommendations, and CMS.
- Seller web: login plus read-only status and tracking only. All actions remain in the dedicated seller admin panel.

When a logged-in user has role `seller` or `seller-sub-admin`, show only:

- `/seller/status`
- `/seller/tracking`
- `/seller/tracking/:orderId`

Do not expose seller action screens in this web app:

- Product create/update/delete.
- Seller profile/address/bank/settings update.
- Seller sub-admin management.
- Order status update.
- E-way bill creation/status update.
- Commission calculation or payout processing.

Use the seller action endpoints only in generated endpoint constants and slices for future seller-panel reuse, not in customer/seller-web navigation.

## Endpoint To Slice Map

### System And Meta

| Method | Path | Slice | UI |
| --- | --- | --- | --- |
| GET | `/health` | `metaSlice` | diagnostics only |
| GET | `/api/v1/meta/routes` | `metaSlice` | diagnostics/API capability discovery |

### Auth APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | `authSlice` | `RegisterPayload` |
| POST | `/api/v1/auth/register-otp` | `authSlice` | `RegisterPayload` |
| POST | `/api/v1/auth/verify-registration` | `authSlice` | `VerifyRegistrationPayload` |
| POST | `/api/v1/auth/login` | `authSlice` | `LoginPayload` |
| POST | `/api/v1/auth/social` | `authSlice` | `SocialLoginPayload` |
| POST | `/api/v1/auth/refresh` | `authSlice` | `RefreshPayload` |
| POST | `/api/v1/auth/send-otp` | `authSlice` | `OtpPayload` |
| POST | `/api/v1/auth/verify-otp` | `authSlice` | `VerifyOtpPayload` |
| POST | `/api/v1/auth/resend-otp` | `authSlice` | `OtpPayload` |
| POST | `/api/v1/auth/forgot-password` | `authSlice` | `ForgotPasswordPayload` |
| POST | `/api/v1/auth/reset-password` | `authSlice` | `ResetPasswordPayload` |
| POST | `/api/v1/auth/change-password` | `authSlice` | `ChangePasswordPayload` |
| GET | `/api/v1/auth/status` | `authSlice` | auth required |

Auth payloads:

```json
{
  "RegisterPayload": {
    "email": "buyer@example.com",
    "phone": "+919876543210",
    "password": "Password123!",
    "role": "buyer",
    "profile": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "referralCode": "REF123"
  },
  "VerifyRegistrationPayload": {
    "email": "buyer@example.com",
    "otp": "123456"
  },
  "LoginPayload": {
    "email": "buyer@example.com",
    "password": "Password123!"
  },
  "SocialLoginPayload": {
    "provider": "google",
    "idToken": "firebase_or_google_id_token",
    "role": "buyer",
    "referralCode": "REF123"
  },
  "RefreshPayload": {
    "refreshToken": "refresh_token"
  },
  "OtpPayload": {
    "email": "buyer@example.com",
    "purpose": "login"
  },
  "VerifyOtpPayload": {
    "email": "buyer@example.com",
    "otp": "123456",
    "purpose": "login"
  },
  "ForgotPasswordPayload": {
    "email": "buyer@example.com"
  },
  "ResetPasswordPayload": {
    "email": "buyer@example.com",
    "otp": "123456",
    "newPassword": "NewPassword123!"
  },
  "ChangePasswordPayload": {
    "currentPassword": "Password123!",
    "newPassword": "NewPassword456!"
  }
}
```

Allowed roles from backend constants: `admin`, `sub-admin`, `seller`, `seller-sub-admin`, `buyer`, `super-admin`.

### User APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/users/me` | `userSlice` | auth required |
| PATCH | `/api/v1/users/me` | `userSlice` | `UpdateProfilePayload` |
| POST | `/api/v1/users/me/addresses` | `userSlice` | `AddressPayload` |
| PATCH | `/api/v1/users/me/addresses/:addressId` | `userSlice` | `PartialAddressPayload` |
| DELETE | `/api/v1/users/me/addresses/:addressId` | `userSlice` | params |
| POST | `/api/v1/users/me/kyc` | `userSlice` | `UserKycPayload` |
| PATCH | `/api/v1/users/:userId/kyc/review` | `adminSlice` | `ReviewKycPayload`, admin only |

User payloads:

```json
{
  "UpdateProfilePayload": {
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  },
  "AddressPayload": {
    "label": "home",
    "fullName": "John Doe",
    "phone": "+919876543210",
    "line1": "221B Baker Street",
    "line2": "Near Main Road",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "postalCode": "560001",
    "isDefault": true
  },
  "UserKycPayload": {
    "legalName": "John Doe",
    "panNumber": "ABCDE1234F",
    "aadhaarNumber": "123456789012",
    "documents": {
      "panDocumentUrl": "https://example.com/pan.pdf",
      "aadhaarFrontUrl": "https://example.com/aadhaar-front.jpg",
      "aadhaarBackUrl": "https://example.com/aadhaar-back.jpg",
      "selfieUrl": "https://example.com/selfie.jpg"
    }
  },
  "ReviewKycPayload": {
    "verificationStatus": "verified",
    "rejectionReason": ""
  }
}
```

KYC status values: `draft`, `submitted`, `under_review`, `verified`, `rejected`.

### Product APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/products` | `productSlice` | `ListProductsQuery` |
| GET | `/api/v1/products/search` | `productSlice` | `SearchProductsQuery` |
| GET | `/api/v1/products/seller/me` | `productSlice` | seller only, `ListProductsQuery` |
| GET | `/api/v1/products/:productId` | `productSlice` | public |
| POST | `/api/v1/products` | `productSlice` | `CreateProductPayload`, seller/admin only |
| PATCH | `/api/v1/products/:productId` | `productSlice` | `UpdateProductPayload`, seller/admin only |
| DELETE | `/api/v1/products/:productId` | `productSlice` | seller/admin only |
| PATCH | `/api/v1/products/:productId/review` | `adminSlice` | `ReviewProductPayload`, admin only |

Product query and payload refs:

```json
{
  "ListProductsQuery": {
    "page": 1,
    "limit": 20,
    "category": "electronics",
    "status": "active",
    "hsnCode": "8517",
    "color": "black",
    "country": "India",
    "state": "Karnataka",
    "city": "Bengaluru",
    "productFamilyCode": "PHONE_FAMILY",
    "sku": "SKU-001"
  },
  "SearchProductsQuery": {
    "q": "phone"
  },
  "CreateProductPayload": {
    "title": "Smartphone Pro X",
    "description": "Flagship smartphone with advanced camera and battery.",
    "price": 49999,
    "mrp": 59999,
    "category": "electronics",
    "productFamilyCode": "PHONE_FAMILY",
    "sku": "SPX-001",
    "color": "black",
    "attributes": {
      "ram": "8GB",
      "storage": "256GB"
    },
    "options": [
      {
        "name": "Storage",
        "values": ["128GB", "256GB"],
        "required": true,
        "displayType": "dropdown"
      }
    ],
    "dimensions": {
      "length": 15,
      "width": 7,
      "height": 0.8,
      "unit": "cm",
      "weight": 0.2,
      "weightUnit": "kg"
    },
    "hsnCode": "8517",
    "origin": {
      "country": "India",
      "state": "Karnataka",
      "city": "Bengaluru"
    },
    "warranty": {
      "period": 12,
      "periodUnit": "months",
      "type": "manufacturer",
      "provider": "Brand",
      "terms": "Standard warranty terms",
      "returnPolicy": {
        "eligible": true,
        "days": 7,
        "type": "standard",
        "restockingFee": 0
      },
      "serviceableCountries": ["India"]
    },
    "metadata": {},
    "stock": 100,
    "images": ["https://example.com/product.jpg"],
    "status": "draft"
  },
  "UpdateProductPayload": {
    "title": "Smartphone Pro X Updated",
    "price": 47999,
    "stock": 150,
    "status": "pending_approval"
  },
  "ReviewProductPayload": {
    "status": "active",
    "rejectionReason": "",
    "checklist": {
      "titleVerified": true,
      "categoryVerified": true,
      "complianceVerified": true,
      "mediaVerified": true
    }
  }
}
```

Product status values: `draft`, `pending_approval`, `active`, `inactive`, `rejected`.

### Cart APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/carts/me` | `cartSlice` | auth required |
| PUT | `/api/v1/carts/me` | `cartSlice` | `UpsertCartPayload` |

Cart payload:

```json
{
  "UpsertCartPayload": {
    "items": [
      {
        "productId": "product_id",
        "quantity": 2,
        "price": 49999
      }
    ],
    "wishlist": ["product_id_2"]
  }
}
```

Frontend must implement:

- Add to cart
- Update quantity
- Remove item by sending updated cart items
- Wishlist using the `wishlist` array in the cart payload
- Move wishlist item to cart
- Cart stock mismatch UI
- Cart price mismatch UI

### Order APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/orders/me` | `orderSlice` | auth required |
| GET | `/api/v1/orders/seller/me` | `orderSlice` | seller only |
| POST | `/api/v1/orders` | `checkoutSlice` and `orderSlice` | `CreateOrderPayload` |
| GET | `/api/v1/orders/:orderId` | `orderSlice` | auth required |
| POST | `/api/v1/orders/:orderId/cancel` | `orderSlice` | `CancelOrderPayload` |
| PATCH | `/api/v1/orders/:orderId/status` | `orderSlice` | `UpdateOrderStatusPayload`, admin/seller only |

Order payloads:

```json
{
  "CreateOrderPayload": {
    "currency": "INR",
    "couponCode": "SAVE10",
    "walletAmount": 0,
    "shippingAddress": {
      "line1": "221B Baker Street",
      "line2": "",
      "city": "Bengaluru",
      "state": "Karnataka",
      "postalCode": "560001",
      "country": "India"
    },
    "items": [
      {
        "productId": "product_id",
        "quantity": 1
      }
    ]
  },
  "CancelOrderPayload": {
    "reason": "Ordered by mistake"
  },
  "UpdateOrderStatusPayload": {
    "status": "shipped"
  }
}
```

Customer statuses to display: `pending_payment`, `payment_failed`, `confirmed`, `packed`, `shipped`, `delivered`, `return_requested`, `returned`, `cancelled`, `fulfilled`.

### Payment APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| POST | `/api/v1/payments/webhooks/razorpay` | backend-only | never call from browser |
| GET | `/api/v1/payments/me` | `paymentSlice` | auth required |
| POST | `/api/v1/payments/initiate` | `paymentSlice` and `checkoutSlice` | `InitiatePaymentPayload` |
| POST | `/api/v1/payments/verify` | `paymentSlice` and `checkoutSlice` | `VerifyRazorpayPayload` |

Payment payloads:

```json
{
  "InitiatePaymentPayload": {
    "orderId": "order_id",
    "provider": "razorpay",
    "amount": 49999,
    "currency": "INR",
    "notes": {
      "source": "web_checkout"
    }
  },
  "VerifyRazorpayPayload": {
    "provider": "razorpay",
    "orderId": "order_id",
    "razorpayOrderId": "order_razorpay",
    "razorpayPaymentId": "pay_razorpay",
    "razorpaySignature": "signature"
  }
}
```

Payment providers: `razorpay`, `stripe`, `cod`. Verification currently validates Razorpay only.

### Delivery APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/delivery/serviceability?pincode=560001` | `deliverySlice` | public |
| GET | `/api/v1/delivery/orders/:orderId/eway-bill` | `deliverySlice` | admin/seller |
| POST | `/api/v1/delivery/orders/:orderId/eway-bill` | `deliverySlice` | `CreateEWayBillPayload`, admin/seller |
| PATCH | `/api/v1/delivery/eway-bills/:ewayBillId/status` | `deliverySlice` | `UpdateEWayBillStatusPayload`, admin/seller |

Delivery payloads:

```json
{
  "CreateEWayBillPayload": {
    "invoiceId": "invoice_id",
    "eWayBillNumber": "EWB123",
    "status": "initiated",
    "validFrom": "2026-05-04T00:00:00.000Z",
    "validUntil": "2026-05-10T00:00:00.000Z",
    "transporterName": "Delhivery",
    "vehicleNumber": "KA01AB1234",
    "distanceKm": 50,
    "payloadSnapshot": {}
  },
  "UpdateEWayBillStatusPayload": {
    "status": "shipped",
    "transporterName": "Delhivery",
    "vehicleNumber": "KA01AB1234"
  }
}
```

### Returns APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| POST | `/api/v1/returns` | `returnsSlice` | `RequestReturnPayload` |
| GET | `/api/v1/returns/my-returns` | `returnsSlice` | auth required |
| GET | `/api/v1/returns/order/:orderId` | `returnsSlice` | auth required |
| POST | `/api/v1/returns/:returnId/approve` | `adminSlice` | `ApproveReturnPayload`, admin only |
| POST | `/api/v1/returns/:returnId/refund` | `adminSlice` | admin only |

Returns payloads:

```json
{
  "RequestReturnPayload": {
    "orderId": "order_id",
    "items": [
      {
        "productId": "product_id",
        "quantity": 1,
        "unitPrice": 49999
      }
    ],
    "reason": "defective",
    "description": "Product is damaged"
  },
  "ApproveReturnPayload": {
    "refundAmount": 49999
  }
}
```

Return reason values: `defective`, `not_as_described`, `changed_mind`, `other`.

### Platform Catalog And CMS APIs

Public reads belong in `catalogSlice` and `cmsSlice`. Protected writes belong in `adminSlice` or `catalogSlice` only for admin/seller shells.

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/platform/categories` | `catalogSlice` | `PaginationQuery + parentKey, active, categoryKey` |
| GET | `/api/v1/platform/categories/:categoryKey` | `catalogSlice` | public |
| POST | `/api/v1/platform/categories` | `adminSlice` | `CreateCategoryPayload` |
| PATCH | `/api/v1/platform/categories/:categoryKey` | `adminSlice` | `UpdateCategoryPayload` |
| DELETE | `/api/v1/platform/categories/:categoryKey` | `adminSlice` | admin/seller |
| GET | `/api/v1/platform/families` | `catalogSlice` | `PaginationQuery + category, sellerId, status` |
| GET | `/api/v1/platform/families/:familyCode` | `catalogSlice` | public |
| POST | `/api/v1/platform/families` | `adminSlice` | `CreateFamilyPayload` |
| PATCH | `/api/v1/platform/families/:familyCode` | `adminSlice` | `UpdateFamilyPayload` |
| DELETE | `/api/v1/platform/families/:familyCode` | `adminSlice` | admin/seller |
| GET | `/api/v1/platform/variants` | `catalogSlice` | `PaginationQuery + productId, familyCode, sellerId, status` |
| GET | `/api/v1/platform/variants/:variantId` | `catalogSlice` | public |
| POST | `/api/v1/platform/variants` | `adminSlice` | `CreateVariantPayload` |
| PATCH | `/api/v1/platform/variants/:variantId` | `adminSlice` | `UpdateVariantPayload` |
| DELETE | `/api/v1/platform/variants/:variantId` | `adminSlice` | admin/seller |
| GET | `/api/v1/platform/hsn-codes` | `catalogSlice` | `PaginationQuery + category, active` |
| GET | `/api/v1/platform/hsn-codes/:hsnCode` | `catalogSlice` | public |
| POST | `/api/v1/platform/hsn-codes` | `adminSlice` | `CreateHsnPayload` |
| PATCH | `/api/v1/platform/hsn-codes/:hsnCode` | `adminSlice` | `UpdateHsnPayload` |
| DELETE | `/api/v1/platform/hsn-codes/:hsnCode` | `adminSlice` | admin/seller |
| GET | `/api/v1/platform/geographies` | `catalogSlice` | `PaginationQuery + active` |
| GET | `/api/v1/platform/geographies/:countryCode` | `catalogSlice` | public |
| POST | `/api/v1/platform/geographies` | `adminSlice` | `CreateGeographyPayload` |
| PATCH | `/api/v1/platform/geographies/:countryCode` | `adminSlice` | `UpdateGeographyPayload` |
| DELETE | `/api/v1/platform/geographies/:countryCode` | `adminSlice` | admin/seller |
| GET | `/api/v1/platform/cms` | `cmsSlice` | `PaginationQuery + pageType, language, published` |
| GET | `/api/v1/platform/cms/:slug` | `cmsSlice` | public |
| POST | `/api/v1/platform/cms` | `adminSlice` | `CreateContentPagePayload` |
| PATCH | `/api/v1/platform/cms/:slug` | `adminSlice` | `UpdateContentPagePayload` |
| DELETE | `/api/v1/platform/cms/:slug` | `adminSlice` | admin/seller |

Platform payloads:

```json
{
  "CreateCategoryPayload": {
    "categoryKey": "electronics",
    "title": "Electronics",
    "parentKey": "",
    "level": 0,
    "attributesSchema": {},
    "active": true,
    "sortOrder": 1
  },
  "CreateFamilyPayload": {
    "familyCode": "PHONE_FAMILY",
    "sellerId": "seller_id",
    "title": "Smartphones",
    "category": "electronics",
    "baseAttributes": {},
    "variantAxes": ["color", "storage"],
    "status": "active"
  },
  "CreateVariantPayload": {
    "familyCode": "PHONE_FAMILY",
    "productId": "product_id",
    "sellerId": "seller_id",
    "sku": "SPX-001-BLK",
    "attributes": {
      "color": "black",
      "storage": "256GB"
    },
    "stock": 100,
    "reservedStock": 0,
    "status": "active"
  },
  "CreateHsnPayload": {
    "code": "8517",
    "description": "Telephone sets and smartphones",
    "gstRate": 18,
    "cessRate": 0,
    "taxType": "gst",
    "exempt": false,
    "category": "electronics",
    "active": true
  },
  "CreateGeographyPayload": {
    "countryCode": "IN",
    "countryName": "India",
    "active": true,
    "states": [
      {
        "stateCode": "KA",
        "stateName": "Karnataka",
        "cities": ["Bengaluru", "Mysuru"]
      }
    ]
  },
  "CreateContentPagePayload": {
    "slug": "return-policy",
    "title": "Return Policy",
    "pageType": "policy",
    "body": "<p>Return policy content</p>",
    "language": "en",
    "published": true,
    "publishedAt": "2026-05-04T00:00:00.000Z",
    "metadata": {
      "seoTitle": "Return Policy"
    }
  }
}
```

### Pricing And Coupon APIs

These APIs are admin-protected in the backend. For customer checkout, show coupon input UI but mark coupon validation/apply API as a backend gap unless order creation handles coupon validation through `couponCode`.

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/pricing/coupons` | `pricingSlice` | admin only |
| POST | `/api/v1/pricing/coupons` | `pricingSlice` | `CreateCouponPayload`, admin only |
| GET | `/api/v1/pricing/coupons/:couponId` | `pricingSlice` | admin only |
| PATCH | `/api/v1/pricing/coupons/:couponId` | `pricingSlice` | `UpdateCouponPayload`, admin only |
| DELETE | `/api/v1/pricing/coupons/:couponId` | `pricingSlice` | admin only |

Coupon payload:

```json
{
  "CreateCouponPayload": {
    "code": "SAVE10",
    "type": "percentage",
    "value": 10,
    "minOrderAmount": 1000,
    "maxDiscountAmount": 500,
    "usageLimit": 100,
    "startsAt": "2026-05-04T00:00:00.000Z",
    "expiresAt": "2026-06-04T00:00:00.000Z",
    "active": true
  }
}
```

Coupon type values: `percentage`, `fixed`.

### Dynamic Pricing APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/dynamic-pricing/price?productId=:id&quantity=1` | `dynamicPricingSlice` | customer auth required |
| POST | `/api/v1/dynamic-pricing/adjust` | `dynamicPricingSlice` | `AdjustPricePayload`, admin only |

Dynamic pricing payload:

```json
{
  "GetDynamicPriceQuery": {
    "productId": "product_id",
    "quantity": 1
  },
  "AdjustPricePayload": {
    "productId": "product_id",
    "newPrice": 44999,
    "reason": "Sale campaign"
  }
}
```

### Wallet APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/wallets/me` | `walletSlice` | auth and `wallet:self` capability |

Customer UI:

- Wallet balance
- Ledger
- Wallet amount selection in checkout using `walletAmount` in `CreateOrderPayload`

### Subscription APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/subscriptions/plans` | `subscriptionSlice` | public |
| POST | `/api/v1/subscriptions/purchase` | `subscriptionSlice` | `PurchasePlanPayload` |
| GET | `/api/v1/subscriptions/me` | `subscriptionSlice` | auth required |
| PUT | `/api/v1/subscriptions/:subscriptionId/pause` | `subscriptionSlice` | auth required |
| PUT | `/api/v1/subscriptions/:subscriptionId/resume` | `subscriptionSlice` | auth required |
| PUT | `/api/v1/subscriptions/:subscriptionId/cancel` | `subscriptionSlice` | auth required |
| POST | `/api/v1/subscriptions/admin/plans` | `subscriptionSlice` | `CreatePlanPayload`, admin only |
| GET | `/api/v1/subscriptions/admin/plans` | `subscriptionSlice` | admin only |
| GET | `/api/v1/subscriptions/admin/plans/:planId` | `subscriptionSlice` | admin only |
| PATCH | `/api/v1/subscriptions/admin/plans/:planId` | `subscriptionSlice` | `UpdatePlanPayload`, admin only |
| DELETE | `/api/v1/subscriptions/admin/plans/:planId` | `subscriptionSlice` | admin only |
| GET | `/api/v1/subscriptions/admin/subscriptions` | `subscriptionSlice` | admin only |
| PATCH | `/api/v1/subscriptions/admin/subscriptions/:subscriptionId/status` | `subscriptionSlice` | `UpdateSubscriptionStatusPayload`, admin only |
| POST | `/api/v1/subscriptions/admin/platform-fee-config` | `subscriptionSlice` | `CreatePlatformFeeConfigPayload`, admin only |
| GET | `/api/v1/subscriptions/admin/platform-fee-config` | `subscriptionSlice` | admin only |
| GET | `/api/v1/subscriptions/admin/platform-fee-config/:configId` | `subscriptionSlice` | admin only |
| PATCH | `/api/v1/subscriptions/admin/platform-fee-config/:configId` | `subscriptionSlice` | `UpdatePlatformFeeConfigPayload`, admin only |
| DELETE | `/api/v1/subscriptions/admin/platform-fee-config/:configId` | `subscriptionSlice` | admin only |

Subscription payloads:

```json
{
  "PurchasePlanPayload": {
    "planId": "uuid-v4-plan-id",
    "billingCycle": "monthly",
    "metadata": {}
  },
  "CreatePlanPayload": {
    "planCode": "BUYER_PRO",
    "title": "Buyer Pro",
    "description": "Premium buyer benefits",
    "targetRoles": ["buyer"],
    "featureFlags": ["free_shipping"],
    "monthlyPrice": 199,
    "yearlyPrice": 1999,
    "currency": "INR",
    "active": true,
    "metadata": {}
  },
  "UpdateSubscriptionStatusPayload": {
    "status": "active"
  },
  "CreatePlatformFeeConfigPayload": {
    "category": "electronics",
    "commissionPercent": 10,
    "fixedFeeAmount": 0,
    "closingFeeAmount": 0,
    "active": true,
    "effectiveFrom": "2026-05-04T00:00:00.000Z",
    "effectiveTo": null
  }
}
```

Subscription status values: `active`, `paused`, `cancelled`, `expired`.

### Notification APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/notifications/me` | `notificationSlice` | auth required |
| POST | `/api/v1/notifications` | `notificationSlice` | `CreateNotificationPayload`, admin/system |
| GET | `/api/v1/notifications/preferences` | `notificationSlice` | auth required |
| PUT | `/api/v1/notifications/preferences` | `notificationSlice` | `UpdateNotificationPreferencesPayload` |

Notification payloads:

```json
{
  "CreateNotificationPayload": {
    "userId": "user_id",
    "channel": "email",
    "template": "order_confirmed",
    "subject": "Order confirmed",
    "payload": {},
    "email": "buyer@example.com"
  },
  "UpdateNotificationPreferencesPayload": {
    "channels": {
      "email": true,
      "sms": true,
      "push": true,
      "inApp": true
    },
    "eventTypes": {
      "order": true,
      "payment": true,
      "shipping": true,
      "promo": true,
      "referral": true,
      "newProduct": true
    },
    "frequency": "real_time",
    "doNotDisturbStart": "22:00",
    "doNotDisturbEnd": "07:00",
    "timezone": "Asia/Kolkata"
  }
}
```

### Analytics APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/analytics` | `analyticsSlice` | admin/capability only |
| POST | `/api/v1/analytics/events` | `analyticsSlice` | `TrackEventPayload`, capability protected |

Analytics payload:

```json
{
  "TrackEventPayload": {
    "eventName": "product_view",
    "actorId": "user_id",
    "metadata": {
      "productId": "product_id",
      "source": "product_detail"
    }
  }
}
```

Track these customer events when capability allows it: `product_view`, `search`, `add_to_cart`, `remove_from_cart`, `wishlist_add`, `checkout_started`, `payment_success`, `payment_failed`, `order_placed`, `recommendation_click`, `return_requested`.

### Warranty APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/warranty/products/:productId/warranty` | `warrantySlice` | public |
| POST | `/api/v1/warranty/register` | `warrantySlice` | `RegisterWarrantyPayload` |
| GET | `/api/v1/warranty/:warrantyId` | `warrantySlice` | auth required |
| GET | `/api/v1/warranty/orders/:orderId` | `warrantySlice` | auth required |
| GET | `/api/v1/warranty/customers/:customerId` | `warrantySlice` | admin/customer-specific use |
| POST | `/api/v1/warranty/:warrantyId/claims` | `warrantySlice` | `ClaimWarrantyPayload` |
| PATCH | `/api/v1/warranty/:warrantyId/claims/:claimId/status` | `adminSlice` | `UpdateClaimStatusPayload`, admin only |

Warranty payloads:

```json
{
  "RegisterWarrantyPayload": {
    "orderId": "order_id",
    "productId": "product_id",
    "variantId": "variant_id"
  },
  "ClaimWarrantyPayload": {
    "reason": "Device not powering on",
    "description": "Issue started after two weeks"
  },
  "UpdateClaimStatusPayload": {
    "status": "approved",
    "notes": "Claim approved"
  }
}
```

Claim status values: `pending`, `approved`, `rejected`, `completed`.

### Loyalty APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/loyalty/profile` | `loyaltySlice` | auth required |
| GET | `/api/v1/loyalty/benefits` | `loyaltySlice` | auth required |
| POST | `/api/v1/loyalty/points` | `loyaltySlice` | `AddLoyaltyPointsPayload` |
| GET | `/api/v1/loyalty/history?limit=50&offset=0` | `loyaltySlice` | auth required |
| POST | `/api/v1/loyalty/redeem` | `loyaltySlice` | `RedeemPointsPayload` |

Loyalty payloads:

```json
{
  "AddLoyaltyPointsPayload": {
    "points": 100,
    "reason": "purchase",
    "expiresAt": "2027-05-04T00:00:00.000Z",
    "transactionId": "txn_id"
  },
  "RedeemPointsPayload": {
    "points": 50
  }
}
```

Loyalty reasons: `purchase`, `referral`, `birthday`, `tier_upgrade`.

### Recommendation APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/recommendations?limit=10` | `recommendationSlice` | auth required |
| POST | `/api/v1/recommendations/:productId/interact` | `recommendationSlice` | `RecommendationInteractionPayload` |
| GET | `/api/v1/recommendations/trending?category=electronics&period=week` | `recommendationSlice` | public |

Recommendation payload:

```json
{
  "RecommendationInteractionPayload": {
    "interactionType": "viewed"
  }
}
```

Interaction values: `clicked`, `purchased`, `viewed`. Trending period values: `today`, `week`, `month`.

### Seller APIs

Seller has a dedicated admin panel for all actions. In this customer web app, seller users can log in, then view only read-only status and tracking screens. Action endpoints below must be generated in endpoint constants and slices for panel reuse, but hidden from web navigation.

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| POST | `/api/v1/sellers/onboarding/kyc` | `sellerSlice` | `SellerKycPayload`, onboarding token |
| PATCH | `/api/v1/sellers/onboarding/profile` | `sellerSlice` | `SellerProfilePayload`, onboarding token |
| PATCH | `/api/v1/sellers/:sellerId/kyc/review` | `adminSlice` | `ReviewKycPayload`, admin only |
| GET | `/api/v1/sellers/me/status` | `sellerSlice` | seller web read-only |
| GET | `/api/v1/sellers/me/tracking?status=&deliveryStatus=&fromDate=&toDate=&limit=20&offset=0` | `sellerSlice` | seller web read-only |
| GET | `/api/v1/sellers/me/tracking/:orderId` | `sellerSlice` | seller web read-only |
| GET | `/api/v1/sellers/me/profile` | `sellerSlice` | seller auth |
| PATCH | `/api/v1/sellers/me/profile` | `sellerSlice` | `SellerProfilePayload` |
| PATCH | `/api/v1/sellers/me/business-address` | `sellerSlice` | `SellerAddressPayload` |
| PATCH | `/api/v1/sellers/me/pickup-address` | `sellerSlice` | `SellerAddressPayload` |
| PATCH | `/api/v1/sellers/me/bank-details` | `sellerSlice` | `SellerBankPayload` |
| PATCH | `/api/v1/sellers/me/more-info` | `sellerSlice` | `SellerMoreInfoPayload` |
| PATCH | `/api/v1/sellers/me/settings` | `sellerSlice` | `SellerSettingsPayload` |
| GET | `/api/v1/sellers/me/dashboard?fromDate=&toDate=` | `sellerSlice` | seller auth |
| POST | `/api/v1/sellers/me/sub-admins` | `sellerSlice` | `CreateSellerSubAdminPayload` |
| GET | `/api/v1/sellers/me/sub-admins` | `sellerSlice` | seller auth |
| PATCH | `/api/v1/sellers/me/sub-admins/:userId/modules` | `sellerSlice` | `UpdateAllowedModulesPayload` |

Seller web read-only response expectations:

```json
{
  "SellerWebStatusResponse": {
    "sellerId": "seller_id",
    "accountStatus": "pending_approval",
    "role": "seller",
    "email": "seller@example.com",
    "phone": "+919876543210",
    "profile": {
      "displayName": "Acme Store",
      "legalBusinessName": "Acme Traders",
      "businessType": "proprietorship",
      "supportEmail": "support@example.com",
      "supportPhone": "+918888888888",
      "businessWebsite": "https://example.com",
      "primaryContactName": "Asha Patel"
    },
    "onboarding": {
      "status": "under_review",
      "complete": false,
      "kycStatus": "submitted",
      "checklist": {
        "profileCompleted": true,
        "kycSubmitted": true,
        "gstVerified": false,
        "bankLinked": true,
        "firstProductPublished": false
      },
      "nextSteps": ["Wait for KYC verification"]
    },
    "kyc": {
      "status": "submitted",
      "legalName": "Acme Traders",
      "businessType": "proprietorship",
      "rejectionReason": null,
      "submittedAt": "2026-05-04T00:00:00.000Z",
      "reviewedAt": null
    },
    "webAccess": {
      "mode": "read_only_status_tracking",
      "actionsLiveIn": "dedicated_seller_admin_panel",
      "allowedModules": []
    }
  },
  "SellerTrackingListResponse": {
    "filters": {
      "status": "shipped",
      "deliveryStatus": "in_transit",
      "fromDate": "2026-05-01",
      "toDate": "2026-05-31",
      "limit": 20,
      "offset": 0
    },
    "summary": {
      "orderStatuses": [{ "status": "shipped", "total": 5 }],
      "deliveryStatuses": [{ "status": "in_transit", "total": 3 }]
    },
    "orders": [
      {
        "orderId": "order_id",
        "buyerId": "buyer_id",
        "orderStatus": "shipped",
        "currency": "INR",
        "amounts": {
          "payableAmount": 49999,
          "totalAmount": 49999,
          "sellerOrderTotal": 49999
        },
        "sellerItems": {
          "count": 1,
          "units": 1
        },
        "delivery": {
          "status": "in_transit",
          "eWayBillId": "eway_id",
          "eWayBillNumber": "EWB123",
          "transporterName": "Delhivery",
          "vehicleNumber": "KA01AB1234",
          "updatedAt": "2026-05-04T00:00:00.000Z"
        },
        "createdAt": "2026-05-04T00:00:00.000Z",
        "updatedAt": "2026-05-04T00:00:00.000Z"
      }
    ],
    "meta": {
      "count": 1,
      "limit": 20,
      "offset": 0
    }
  }
}
```

Seller tracking filters:

- `status`: order status, one of `pending_payment`, `payment_failed`, `confirmed`, `packed`, `shipped`, `delivered`, `return_requested`, `returned`, `cancelled`, `fulfilled`.
- `deliveryStatus`: one of `not_created`, `initiated`, `manifested`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `failed`, `cancelled`.
- `fromDate`, `toDate`: ISO date strings.
- `limit`: 1 to 100.
- `offset`: 0 or higher.

Seller payloads:

```json
{
  "SellerKycPayload": {
    "panNumber": "ABCDE1234F",
    "gstNumber": "27AABCU1234F1Z5",
    "aadhaarNumber": "123456789012",
    "legalName": "Acme Traders",
    "businessType": "proprietorship",
    "dateOfBirth": "1990-01-15",
    "documents": {
      "panDocumentUrl": "https://example.com/pan.pdf",
      "gstCertificateUrl": "https://example.com/gst.pdf",
      "aadhaarFrontUrl": "https://example.com/aadhaar-front.jpg",
      "aadhaarBackUrl": "https://example.com/aadhaar-back.jpg",
      "bankProofUrl": "https://example.com/bank.pdf"
    },
    "bankDetails": {
      "accountHolderName": "Acme Traders",
      "accountNumber": "1234567890",
      "ifscCode": "ICIC0001234",
      "bankName": "ICICI Bank",
      "branchName": "MG Road"
    }
  },
  "SellerProfilePayload": {
    "displayName": "Acme Seller Store",
    "legalBusinessName": "Acme Traders LLP",
    "description": "Quality consumer electronics.",
    "supportEmail": "support@example.com",
    "supportPhone": "+918888888888",
    "businessType": "proprietorship",
    "registrationNumber": "REG123",
    "gstNumber": "27AABCU1234F1Z5",
    "panNumber": "ABCDE1234F",
    "aadhaarNumber": "123456789012",
    "dateOfBirth": "1990-01-15",
    "businessWebsite": "https://example.com",
    "primaryContactName": "Asha Patel",
    "bankDetails": {},
    "businessAddress": {},
    "pickupAddress": {
      "line1": "Warehouse Road",
      "line2": "",
      "city": "Bengaluru",
      "state": "Karnataka",
      "country": "India",
      "postalCode": "560002"
    }
  },
  "SellerAddressPayload": {
    "line1": "Warehouse Road",
    "line2": "",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "postalCode": "560002"
  },
  "SellerBankPayload": {
    "accountHolderName": "Acme Traders",
    "accountNumber": "1234567890",
    "ifscCode": "ICIC0001234",
    "bankName": "ICICI Bank",
    "branchName": "MG Road"
  },
  "SellerSettingsPayload": {
    "autoAcceptOrders": true,
    "handlingTimeHours": 24,
    "returnWindowDays": 7,
    "ndrResponseHours": 24,
    "shippingModes": ["standard", "express"],
    "payoutSchedule": "weekly"
  },
  "CreateSellerSubAdminPayload": {
    "email": "seller-sub@example.com",
    "phone": "+919876543211",
    "password": "Password123!",
    "profile": {
      "firstName": "Sub",
      "lastName": "Admin"
    },
    "allowedModules": ["orders", "products"]
  },
  "UpdateAllowedModulesPayload": {
    "allowedModules": ["orders", "products"]
  }
}
```

### Seller Commission APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| GET | `/api/v1/sellers/commissions/my-commissions` | `sellerCommissionSlice` | seller auth |
| GET | `/api/v1/sellers/commissions/my-payouts` | `sellerCommissionSlice` | seller auth |
| POST | `/api/v1/sellers/commissions/calculate/:orderId` | `sellerCommissionSlice` | admin only |
| POST | `/api/v1/sellers/commissions/process-payouts` | `sellerCommissionSlice` | `{ "sellerId": "seller_id" }`, admin only |
| GET | `/api/v1/sellers/commissions/settlements` | `sellerCommissionSlice` | admin only |

### Tax APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| POST | `/api/v1/tax/orders/:orderId/invoice` | `taxSlice` | admin only |
| GET | `/api/v1/tax/reports?fromDate=&toDate=&taxComponent=&limit=&offset=` | `taxSlice` | admin only |

### Fraud APIs

| Method | Path | Slice | Body or Query Ref |
| --- | --- | --- | --- |
| POST | `/api/v1/fraud/:fraudId/review` | `fraudSlice` | `FraudReviewPayload`, admin only |

Fraud payload:

```json
{
  "FraudReviewPayload": {
    "decision": "approved",
    "notes": "Looks valid"
  }
}
```

Decision values: `approved`, `rejected`.

### RBAC APIs

These APIs are admin-only or permission-managed. Include endpoint constants and `rbacSlice`.

| Method | Path | Body or Query Ref |
| --- | --- | --- |
| GET | `/api/v1/rbac/permission-management/modules?roleId=&roleSlug=&active=true` | permission setup |
| GET | `/api/v1/rbac/modules?active=&limit=100&offset=0` | list |
| GET | `/api/v1/rbac/modules/:moduleId` | detail |
| POST | `/api/v1/rbac/modules` | `CreateRbacModulePayload` |
| PATCH | `/api/v1/rbac/modules/:moduleId` | `UpdateRbacModulePayload` |
| DELETE | `/api/v1/rbac/modules/:moduleId` | delete |
| GET | `/api/v1/rbac/permissions?moduleId=&active=&limit=100&offset=0` | list |
| GET | `/api/v1/rbac/permissions/:permissionId` | detail |
| POST | `/api/v1/rbac/permissions` | `CreatePermissionPayload` |
| PATCH | `/api/v1/rbac/permissions/:permissionId` | `UpdatePermissionPayload` |
| GET | `/api/v1/rbac/roles?active=&limit=100&offset=0` | list |
| GET | `/api/v1/rbac/roles/:roleId` | detail |
| POST | `/api/v1/rbac/roles` | `CreateRolePayload` |
| PATCH | `/api/v1/rbac/roles/:roleId` | `UpdateRolePayload` |
| GET | `/api/v1/rbac/roles/:roleId/permissions` | list role permissions |
| POST | `/api/v1/rbac/roles/:roleId/permissions` | `{ "permissionId": "uuid" }` |
| DELETE | `/api/v1/rbac/roles/:roleId/permissions` | `{ "permissionId": "uuid" }` |
| POST | `/api/v1/rbac/roles/:roleId/permissions/bulk` | `{ "permissionIds": ["uuid"] }` |
| GET | `/api/v1/rbac/users/:userId/permissions` | list user permissions |
| GET | `/api/v1/rbac/users/:userId/permissions/effective` | list effective permissions |
| GET | `/api/v1/rbac/users/:userId/permissions/check?permissionSlug=` | check |
| POST | `/api/v1/rbac/users/:userId/permissions` | `{ "permissionId": "uuid" }` |
| DELETE | `/api/v1/rbac/users/:userId/permissions` | `{ "permissionId": "uuid" }` |
| POST | `/api/v1/rbac/users/:userId/permissions/bulk` | `{ "permissionIds": ["uuid"] }` |
| GET | `/api/v1/rbac/users/:userId/roles` | list |
| GET | `/api/v1/rbac/users/:userId/roles/check?roleSlug=` | check |
| POST | `/api/v1/rbac/users/:userId/roles` | `{ "roleId": "uuid" }` |
| DELETE | `/api/v1/rbac/users/:userId/roles` | `{ "roleId": "uuid" }` |
| POST | `/api/v1/rbac/users/:userId/roles/bulk` | `{ "roleIds": ["uuid"] }` |

RBAC payloads:

```json
{
  "CreateRbacModulePayload": {
    "name": "Catalog",
    "slug": "catalog",
    "description": "Catalog management",
    "icon": "boxes",
    "order": 1,
    "active": true,
    "metadata": {}
  },
  "CreatePermissionPayload": {
    "moduleId": "uuid",
    "name": "Catalog Manage",
    "slug": "catalog:manage",
    "description": "Manage catalog",
    "action": "manage",
    "active": true,
    "metadata": {}
  },
  "CreateRolePayload": {
    "name": "Seller",
    "slug": "seller",
    "description": "Seller role",
    "type": "system",
    "isSuperAdmin": false,
    "active": true,
    "metadata": {}
  }
}
```

### Admin APIs

These APIs must be hidden from customer navigation. Include in `adminSlice`.

| Method | Path | Body or Query Ref |
| --- | --- | --- |
| GET | `/api/v1/admin/access/modules?role=&roleId=&roleSlug=&active=true&includePermissions=true` | admin |
| POST | `/api/v1/admin/access/admins` | `CreateAdminPayload`, super-admin |
| GET | `/api/v1/admin/access/admins?q=&accountStatus=&page=&limit=` | super-admin |
| POST | `/api/v1/admin/access/sub-admins` | `CreateSubAdminPayload` |
| GET | `/api/v1/admin/access/sub-admins?ownerAdminId=` | admin |
| PATCH | `/api/v1/admin/access/sub-admins/:userId/modules` | `{ "allowedModules": ["orders"] }` |
| GET | `/api/v1/admin/dashboard/overview` | admin |
| GET | `/api/v1/admin/users?q=&role=&accountStatus=&page=&limit=` | admin |
| GET | `/api/v1/admin/users/:userId` | admin |
| PATCH | `/api/v1/admin/users/:userId` | `UpdateAdminUserPayload` |
| DELETE | `/api/v1/admin/users/:userId` | `{ "reason": "Policy violation" }` |
| GET | `/api/v1/admin/vendors?q=&status=&onboardingStatus=&page=&limit=` | admin |
| PATCH | `/api/v1/admin/vendors/:sellerId/status` | `{ "accountStatus": "active" }` |
| GET | `/api/v1/admin/products/moderation-queue?status=&category=&page=&limit=` | admin |
| PATCH | `/api/v1/admin/products/:productId/moderate` | `ReviewProductPayload` |
| GET | `/api/v1/admin/orders?status=&fromDate=&toDate=&limit=&offset=` | admin |
| GET | `/api/v1/admin/payments?status=&provider=&fromDate=&toDate=&limit=&offset=` | admin |
| POST | `/api/v1/admin/payouts` | `CreatePayoutPayload` |
| GET | `/api/v1/admin/payouts?sellerId=&status=&fromDate=&toDate=&limit=&offset=` | admin |
| GET | `/api/v1/admin/tax/reports?fromDate=&toDate=&taxComponent=&limit=&offset=` | admin |
| POST | `/api/v1/admin/tax/orders/:orderId/invoice` | admin |
| POST | `/api/v1/admin/platform/api-keys` | `CreateApiKeyPayload` |
| GET | `/api/v1/admin/platform/api-keys?ownerId=&status=&limit=&offset=` | admin |
| POST | `/api/v1/admin/platform/webhooks` | `CreateWebhookPayload` |
| GET | `/api/v1/admin/platform/webhooks?ownerId=&status=&limit=&offset=` | admin |
| PUT | `/api/v1/admin/platform/feature-flags` | `UpsertFeatureFlagPayload` |
| GET | `/api/v1/admin/platform/feature-flags?enabled=&limit=&offset=` | admin |
| GET | `/api/v1/admin/analytics/realtime?hours=24` | admin |
| GET | `/api/v1/admin/returns/analytics?fromDate=&toDate=` | admin |
| GET | `/api/v1/admin/chargebacks?status=&fromDate=&toDate=&limit=&offset=` | admin |
| GET | `/api/v1/admin/system/health` | admin |
| GET | `/api/v1/admin/system/queues` | admin |
| POST | `/api/v1/admin/system/queues/:queueName/pause` | queueName: `notifications` |
| POST | `/api/v1/admin/system/queues/:queueName/resume` | queueName: `notifications` |
| GET | `/api/v1/admin/system/dead-letter?status=&eventType=&limit=&offset=` | admin |
| POST | `/api/v1/admin/system/dead-letter/:eventId/retry` | `{ "reason": "Manual retry" }` |
| POST | `/api/v1/admin/system/dead-letter/:eventId/discard` | `{ "reason": "Invalid event" }` |
| POST | `/api/v1/admin/platform/subscription-plans` | `CreatePlanPayload` |
| GET | `/api/v1/admin/platform/subscription-plans?active=&limit=&offset=` | admin |
| GET | `/api/v1/admin/platform/subscription-plans/:planId` | admin |
| PATCH | `/api/v1/admin/platform/subscription-plans/:planId` | `UpdatePlanPayload` |
| DELETE | `/api/v1/admin/platform/subscription-plans/:planId` | admin |
| GET | `/api/v1/admin/platform/subscriptions?status=&userRole=&limit=&offset=` | admin |
| PATCH | `/api/v1/admin/platform/subscriptions/:subscriptionId/status` | `{ "status": "active" }` |
| POST | `/api/v1/admin/platform/fee-config` | `CreatePlatformFeeConfigPayload` |
| GET | `/api/v1/admin/platform/fee-config?active=&category=&limit=&offset=` | admin |
| GET | `/api/v1/admin/platform/fee-config/:configId` | admin |
| PATCH | `/api/v1/admin/platform/fee-config/:configId` | `UpdatePlatformFeeConfigPayload` |
| DELETE | `/api/v1/admin/platform/fee-config/:configId` | admin |

Admin platform-management duplicate routes also exist and must be included:

```text
POST   /api/v1/admin/platform/categories
GET    /api/v1/admin/platform/categories
GET    /api/v1/admin/platform/categories/:categoryKey
PATCH  /api/v1/admin/platform/categories/:categoryKey
DELETE /api/v1/admin/platform/categories/:categoryKey
POST   /api/v1/admin/platform/product-families
GET    /api/v1/admin/platform/product-families
GET    /api/v1/admin/platform/product-families/:familyCode
PATCH  /api/v1/admin/platform/product-families/:familyCode
DELETE /api/v1/admin/platform/product-families/:familyCode
POST   /api/v1/admin/platform/product-variants
GET    /api/v1/admin/platform/product-variants
GET    /api/v1/admin/platform/product-variants/:variantId
PATCH  /api/v1/admin/platform/product-variants/:variantId
DELETE /api/v1/admin/platform/product-variants/:variantId
POST   /api/v1/admin/platform/hsn-codes
GET    /api/v1/admin/platform/hsn-codes
GET    /api/v1/admin/platform/hsn-codes/:hsnCode
PATCH  /api/v1/admin/platform/hsn-codes/:hsnCode
DELETE /api/v1/admin/platform/hsn-codes/:hsnCode
POST   /api/v1/admin/platform/geography
GET    /api/v1/admin/platform/geography
GET    /api/v1/admin/platform/geography/:countryCode
PATCH  /api/v1/admin/platform/geography/:countryCode
DELETE /api/v1/admin/platform/geography/:countryCode
POST   /api/v1/admin/platform/content-pages
GET    /api/v1/admin/platform/content-pages
GET    /api/v1/admin/platform/content-pages/:slug
PATCH  /api/v1/admin/platform/content-pages/:slug
DELETE /api/v1/admin/platform/content-pages/:slug
```

Admin payloads:

```json
{
  "CreateAdminPayload": {
    "email": "admin@example.com",
    "phone": "+919876543210",
    "password": "Password123!",
    "profile": {
      "firstName": "Admin",
      "lastName": "User"
    }
  },
  "CreateSubAdminPayload": {
    "email": "subadmin@example.com",
    "phone": "+919876543211",
    "password": "Password123!",
    "profile": {
      "firstName": "Sub",
      "lastName": "Admin"
    },
    "allowedModules": ["orders", "products"]
  },
  "UpdateAdminUserPayload": {
    "role": "buyer",
    "accountStatus": "active",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  },
  "CreatePayoutPayload": {
    "sellerId": "seller_id",
    "periodStart": "2026-05-01T00:00:00.000Z",
    "periodEnd": "2026-05-31T00:00:00.000Z",
    "grossAmount": 100000,
    "commissionAmount": 10000,
    "processingFeeAmount": 500,
    "taxWithheldAmount": 1000,
    "netPayoutAmount": 88500,
    "currency": "INR",
    "status": "scheduled",
    "scheduledAt": "2026-06-01T00:00:00.000Z",
    "metadata": {}
  },
  "CreateApiKeyPayload": {
    "ownerId": "owner_id",
    "keyName": "Integration Key",
    "scopes": ["orders:read"],
    "expiresAt": null
  },
  "CreateWebhookPayload": {
    "ownerId": "owner_id",
    "endpointUrl": "https://example.com/webhook",
    "secret": "webhook-secret",
    "eventTypes": ["order.created"],
    "retryPolicy": {
      "maxRetries": 5,
      "backoffMs": 1000
    }
  },
  "UpsertFeatureFlagPayload": {
    "flagKey": "new_checkout",
    "description": "Enable new checkout",
    "enabled": true,
    "rolloutPercentage": 50,
    "targetRules": {}
  }
}
```

## Required Customer Features

Build all of these customer features:

- Public homepage with categories, trending products, recommended products, CMS banners if available, recently viewed products, and SEO metadata.
- Authentication: register, OTP register, verify registration, login, social login, forgot password, reset password, change password, status check, logout, token refresh.
- Product discovery: category pages, product listing, product search, filters from platform categories/families/variants, sort UI, pagination, empty search state.
- Product detail: image gallery, variant/options selector, delivery pincode checker, dynamic price check, warranty info, related/recommended products, wishlist button using cart wishlist.
- Cart: add/update/remove items, wishlist array support, move to cart, clear cart, stock/price mismatch handling.
- Checkout: address selection, delivery serviceability, coupon field using `couponCode` in order payload, wallet amount, order creation, payment initiation, Razorpay verification, success/failure/retry.
- Orders: list, detail, status timeline, cancel order, reorder, track order UI, return eligibility.
- Returns: request return, my returns, return by order, refund status display when returned by API.
- Payments: payment history, status, retry failed payment.
- Wallet: balance, ledger, use wallet amount in checkout.
- Subscription: plans, purchase, my subscriptions, pause/resume/cancel.
- Notifications: notification center and preferences.
- Loyalty: profile, benefits, history, redeem points.
- Warranty: product warranty, register warranty from order, warranty detail, claim warranty.
- Recommendations: trending, personalized recommendations, interaction tracking.
- CMS: privacy policy, terms, return policy, shipping policy, FAQ, about, contact using `/platform/cms`.
- Analytics: track important customer interactions only when API permission/session allows it.
- Seller web: after seller login, show read-only seller account status, onboarding/KYC checklist, next steps, order tracking summary, and tracking detail. Show clear UI copy that seller actions are available only in the dedicated seller admin panel.

## Advanced Features To Implement With Current Backend

- Wishlist using `PUT /api/v1/carts/me` and the `wishlist` array.
- Recently viewed products in local storage plus optional analytics event.
- Personalized homepage using `/api/v1/recommendations`.
- Trending products using `/api/v1/recommendations/trending`.
- Dynamic pricing display using `/api/v1/dynamic-pricing/price`.
- Loyalty-aware pricing display if returned by dynamic pricing.
- Wallet payment contribution using `walletAmount` in order payload.
- Coupon entry using `couponCode` in order payload.
- Subscription benefits page using `/api/v1/subscriptions/plans` and `/api/v1/loyalty/benefits`.
- Warranty registration from order detail.
- Return request from order detail.
- Notification channel and event preference toggles.
- Pincode serviceability on product detail and checkout.
- Seller read-only status/tracking using `/api/v1/sellers/me/status`, `/api/v1/sellers/me/tracking`, and `/api/v1/sellers/me/tracking/:orderId`.
- SEO metadata for product, category, search, and CMS pages.
- PWA offline shell for public browsing.
- Local compare list for product comparison if no backend compare API exists.

## Backend Gaps To Mark As TODO In Frontend

Do not invent fake paths for these. Add TODO adapters or local-only behavior:

- Standalone wishlist API is missing; use cart `wishlist` array for now.
- Product review/rating route is missing, although `product-review.model.js` exists.
- Coupon validate/apply API is missing; order API accepts `couponCode`.
- File upload API is missing for avatar, KYC, return proof, and warranty claim evidence.
- Invoice download API is missing; admin invoice generation exists.
- Customer live carrier tracking API is missing; delivery serviceability, e-way bill APIs, and seller read-only tracking APIs exist.
- Referral routes are not mounted, although referral service/model exists.
- Public autocomplete route is not mounted, although `src/shared/routes/search.routes.js` exists.
- Product compare API is missing; implement local compare.
- Marketing banner API is missing; use CMS pages/metadata until backend adds banner routes.

## Endpoint Constants Requirement

Generate an `endpoints.js` object with every path above. Use functions for parameterized paths:

```js
export const API_PREFIX = "/api/v1";

export const endpoints = {
  health: "/health",
  meta: {
    routes: `${API_PREFIX}/meta/routes`,
  },
  auth: {
    register: `${API_PREFIX}/auth/register`,
    registerOtp: `${API_PREFIX}/auth/register-otp`,
    verifyRegistration: `${API_PREFIX}/auth/verify-registration`,
    login: `${API_PREFIX}/auth/login`,
    social: `${API_PREFIX}/auth/social`,
    refresh: `${API_PREFIX}/auth/refresh`,
    sendOtp: `${API_PREFIX}/auth/send-otp`,
    verifyOtp: `${API_PREFIX}/auth/verify-otp`,
    resendOtp: `${API_PREFIX}/auth/resend-otp`,
    forgotPassword: `${API_PREFIX}/auth/forgot-password`,
    resetPassword: `${API_PREFIX}/auth/reset-password`,
    changePassword: `${API_PREFIX}/auth/change-password`,
    status: `${API_PREFIX}/auth/status`,
  },
  users: {
    me: `${API_PREFIX}/users/me`,
    addresses: `${API_PREFIX}/users/me/addresses`,
    address: (addressId) => `${API_PREFIX}/users/me/addresses/${addressId}`,
    kyc: `${API_PREFIX}/users/me/kyc`,
    reviewKyc: (userId) => `${API_PREFIX}/users/${userId}/kyc/review`,
  },
  products: {
    list: `${API_PREFIX}/products`,
    search: `${API_PREFIX}/products/search`,
    sellerMe: `${API_PREFIX}/products/seller/me`,
    detail: (productId) => `${API_PREFIX}/products/${productId}`,
    review: (productId) => `${API_PREFIX}/products/${productId}/review`,
  },
  carts: {
    me: `${API_PREFIX}/carts/me`,
  },
  orders: {
    me: `${API_PREFIX}/orders/me`,
    sellerMe: `${API_PREFIX}/orders/seller/me`,
    create: `${API_PREFIX}/orders`,
    detail: (orderId) => `${API_PREFIX}/orders/${orderId}`,
    cancel: (orderId) => `${API_PREFIX}/orders/${orderId}/cancel`,
    status: (orderId) => `${API_PREFIX}/orders/${orderId}/status`,
  },
  payments: {
    razorpayWebhook: `${API_PREFIX}/payments/webhooks/razorpay`,
    me: `${API_PREFIX}/payments/me`,
    initiate: `${API_PREFIX}/payments/initiate`,
    verify: `${API_PREFIX}/payments/verify`,
  },
  delivery: {
    serviceability: `${API_PREFIX}/delivery/serviceability`,
    ewayBillByOrder: (orderId) => `${API_PREFIX}/delivery/orders/${orderId}/eway-bill`,
    ewayBillStatus: (ewayBillId) => `${API_PREFIX}/delivery/eway-bills/${ewayBillId}/status`,
  },
  returns: {
    create: `${API_PREFIX}/returns`,
    mine: `${API_PREFIX}/returns/my-returns`,
    byOrder: (orderId) => `${API_PREFIX}/returns/order/${orderId}`,
    approve: (returnId) => `${API_PREFIX}/returns/${returnId}/approve`,
    refund: (returnId) => `${API_PREFIX}/returns/${returnId}/refund`,
  },
  sellers: {
    onboardingKyc: `${API_PREFIX}/sellers/onboarding/kyc`,
    onboardingProfile: `${API_PREFIX}/sellers/onboarding/profile`,
    reviewKyc: (sellerId) => `${API_PREFIX}/sellers/${sellerId}/kyc/review`,
    webStatus: `${API_PREFIX}/sellers/me/status`,
    webTracking: `${API_PREFIX}/sellers/me/tracking`,
    webTrackingOrder: (orderId) => `${API_PREFIX}/sellers/me/tracking/${orderId}`,
    profile: `${API_PREFIX}/sellers/me/profile`,
    businessAddress: `${API_PREFIX}/sellers/me/business-address`,
    pickupAddress: `${API_PREFIX}/sellers/me/pickup-address`,
    bankDetails: `${API_PREFIX}/sellers/me/bank-details`,
    moreInfo: `${API_PREFIX}/sellers/me/more-info`,
    settings: `${API_PREFIX}/sellers/me/settings`,
    dashboard: `${API_PREFIX}/sellers/me/dashboard`,
    subAdmins: `${API_PREFIX}/sellers/me/sub-admins`,
    subAdminModules: (userId) => `${API_PREFIX}/sellers/me/sub-admins/${userId}/modules`,
  }
};
```

Continue this object for platform, pricing, dynamicPricing, wallets, subscriptions, notifications, analytics, warranty, loyalty, recommendations, sellers, sellerCommissions, tax, fraud, rbac, and admin using all paths in the tables above.

## Slice Thunks Requirement

Generate thunks named with clear domain verbs:

```js
registerUser
registerUserWithOtp
verifyRegistration
loginUser
socialLogin
refreshSession
sendOtp
verifyOtp
resendOtp
forgotPassword
resetPassword
changePassword
checkAuthStatus
fetchMe
updateMe
addAddress
updateAddress
deleteAddress
submitUserKyc
fetchProducts
searchProducts
fetchProductById
fetchCategories
fetchCategoryByKey
fetchCart
updateCart
createOrder
fetchMyOrders
fetchOrderById
cancelOrder
initiatePayment
verifyPayment
checkServiceability
requestReturn
fetchMyReturns
fetchReturnByOrder
fetchWallet
fetchSubscriptionPlans
purchaseSubscription
fetchMySubscriptions
pauseSubscription
resumeSubscription
cancelSubscription
fetchNotifications
fetchNotificationPreferences
updateNotificationPreferences
fetchLoyaltyProfile
fetchLoyaltyBenefits
fetchLoyaltyHistory
redeemLoyaltyPoints
fetchProductWarranty
registerWarranty
fetchWarrantyById
fetchOrderWarranties
claimWarranty
fetchRecommendations
trackRecommendationInteraction
fetchTrendingProducts
trackAnalyticsEvent
fetchCmsPages
fetchCmsPageBySlug
fetchMetaRoutes
fetchSellerWebStatus
fetchSellerWebTracking
fetchSellerWebTrackingOrder
```

Also generate admin/seller/RBAC thunks for every admin, seller, pricing, tax, fraud, platform-management, subscription-admin, and RBAC endpoint even if not used by the customer pages.

## Final Acceptance Checklist

- Every mounted API from `src/api/register-routes.js` is represented in endpoint constants.
- Every endpoint is assigned to a slice.
- Customer app uses only customer-safe APIs in visible navigation.
- Admin/seller-only APIs are hidden behind role/capability guards.
- Auth refresh and retry works.
- No component hardcodes `/api/v1`.
- No fake data is used where APIs exist.
- Loading, empty, success, and error states exist on every API screen.
- Customer checkout works from cart to order creation to payment verification.
- Return, warranty, wallet, subscription, loyalty, notification, and recommendation workflows are present.
- Seller web exposes only login, status, and tracking; all seller actions remain hidden and point to the dedicated seller admin panel.
- Backend gaps are clearly marked with TODO comments and no fake endpoint paths.
