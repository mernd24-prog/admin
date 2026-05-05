# Admin And Seller API Implementation Doc

Use this document as the frontend source of truth for the admin panel and seller panel APIs.

Source files used:

<!--  -->

- `src/api/register-routes.js`
- `src/modules/admin/routes/admin.routes.js`
- `src/modules/admin/validation/admin.validation.js`
- `src/modules/seller/routes/seller.routes.js`
- `src/modules/seller/validation/seller.validation.js`
- `src/modules/seller/routes/commission.routes.js`
- `src/modules/platform/validation/platform.validation.js`

## Global API Rules

Base prefix:

```text
/api/v1
```

Auth header for protected APIs:

```text
Authorization: Bearer <access_token>
```

Standard success response from most controller-based APIs:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Some commission routes return:

```json
{
  "success": true,
  "message": "Commission calculated",
  "data": {}
}
```

Frontend error normalization order:

1. `response.data.error.message`
2. `response.data.message`
3. first validation message from `response.data.error.details`
4. first validation message from `response.data.details`
5. generic fallback

Validation uses Joi with `allowUnknown: false`, so do not send extra fields.

## Common Enums

```js
export const USER_ROLES = [
  "admin",
  "sub-admin",
  "seller",
  "seller-sub-admin",
  "buyer",
  "super-admin",
];

export const ACCOUNT_STATUSES = ["active", "suspended", "pending_approval"];

export const SELLER_ONBOARDING_STATUSES = [
  "initiated",
  "in_progress",
  "under_review",
  "ready_for_go_live",
  "rejected",
];

export const PRODUCT_STATUSES = [
  "draft",
  "pending_approval",
  "active",
  "inactive",
  "rejected",
];

export const ORDER_STATUSES = [
  "pending_payment",
  "payment_failed",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "return_requested",
  "returned",
  "cancelled",
  "fulfilled",
];

export const PAYMENT_STATUSES = [
  "initiated",
  "authorized",
  "captured",
  "failed",
  "refunded",
];

export const DELIVERY_STATUSES = [
  "not_created",
  "initiated",
  "manifested",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "cancelled",
];

export const KYC_REVIEW_STATUSES = ["under_review", "verified", "rejected"];

export const PLATFORM_MODULES = [
  "users",
  "products",
  "carts",
  "orders",
  "payments",
  "platform",
  "sellers",
  "notifications",
  "analytics",
  "pricing",
  "wallets",
  "tax",
  "subscriptions",
  "rbac",
  "warranty",
  "loyalty",
  "recommendations",
  "returns",
  "fraud",
  "dynamic-pricing",
  "delivery",
  "admin",
];

export const SELLER_MODULES = [
  "products",
  "orders",
  "pricing",
  "notifications",
  "analytics",
  "sellers",
  "sellers/commissions",
  "returns",
  "delivery",
];
```

## Suggested Frontend Slices

```text
src/api/client.js
src/api/endpoints.js
src/api/normalizeApiError.js
src/features/adminAccess/adminAccessSlice.js
src/features/adminDashboard/adminDashboardSlice.js
src/features/adminUsers/adminUsersSlice.js
src/features/adminVendors/adminVendorsSlice.js
src/features/adminProducts/adminProductsSlice.js
src/features/adminOrders/adminOrdersSlice.js
src/features/adminPayments/adminPaymentsSlice.js
src/features/adminPayouts/adminPayoutsSlice.js
src/features/adminTax/adminTaxSlice.js
src/features/adminPlatform/adminPlatformSlice.js
src/features/adminAnalytics/adminAnalyticsSlice.js
src/features/adminSystem/adminSystemSlice.js
src/features/adminSubscriptions/adminSubscriptionsSlice.js
src/features/seller/sellerSlice.js
src/features/sellerDashboard/sellerDashboardSlice.js
src/features/sellerTracking/sellerTrackingSlice.js
src/features/sellerSubAdmins/sellerSubAdminsSlice.js
src/features/sellerCommissions/sellerCommissionsSlice.js
```

Recommended reusable slice state:

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

## Admin API Map

Base path:

```text
/api/v1/admin
```

All routes require `authenticate` and admin authorization. `/access/admins` also requires `super-admin`.

| Feature                             | Method | Path                                             | Slice                     | Query                            | Body                                      |
| ----------------------------------- | ------ | ------------------------------------------------ | ------------------------- | -------------------------------- | ----------------------------------------- |
| Access modules                      | GET    | `/access/modules`                                | `adminAccessSlice`        | `ListAccessModulesQuery`         | none                                      |
| Create admin                        | POST   | `/access/admins`                                 | `adminAccessSlice`        | none                             | `CreateAdminPayload`                      |
| List admins                         | GET    | `/access/admins`                                 | `adminAccessSlice`        | `ListAdminsQuery`                | none                                      |
| Create platform sub-admin           | POST   | `/access/sub-admins`                             | `adminAccessSlice`        | none                             | `CreatePlatformSubAdminPayload`           |
| List platform sub-admins            | GET    | `/access/sub-admins`                             | `adminAccessSlice`        | `ListPlatformSubAdminsQuery`     | none                                      |
| Update platform sub-admin modules   | PATCH  | `/access/sub-admins/:userId/modules`             | `adminAccessSlice`        | none                             | `UpdateAllowedModulesPayload`             |
| Dashboard overview                  | GET    | `/dashboard/overview`                            | `adminDashboardSlice`     | none                             | none                                      |
| List users                          | GET    | `/users`                                         | `adminUsersSlice`         | `ListUsersQuery`                 | none                                      |
| Get user detail                     | GET    | `/users/:userId`                                 | `adminUsersSlice`         | none                             | none                                      |
| Update user                         | PATCH  | `/users/:userId`                                 | `adminUsersSlice`         | none                             | `UpdateUserPayload`                       |
| Deactivate user                     | DELETE | `/users/:userId`                                 | `adminUsersSlice`         | none                             | `DeactivateUserPayload`                   |
| List vendors/sellers                | GET    | `/vendors`                                       | `adminVendorsSlice`       | `ListVendorsQuery`               | none                                      |
| Update vendor status                | PATCH  | `/vendors/:sellerId/status`                      | `adminVendorsSlice`       | none                             | `UpdateVendorStatusPayload`               |
| Product moderation queue            | GET    | `/products/moderation-queue`                     | `adminProductsSlice`      | `ModerationQueueQuery`           | none                                      |
| Moderate product                    | PATCH  | `/products/:productId/moderate`                  | `adminProductsSlice`      | none                             | `ModerateProductPayload`                  |
| List orders                         | GET    | `/orders`                                        | `adminOrdersSlice`        | `ListOrdersQuery`                | none                                      |
| List payments                       | GET    | `/payments`                                      | `adminPaymentsSlice`      | `ListPaymentsQuery`              | none                                      |
| Create payout                       | POST   | `/payouts`                                       | `adminPayoutsSlice`       | none                             | `CreatePayoutPayload`                     |
| List payouts                        | GET    | `/payouts`                                       | `adminPayoutsSlice`       | `ListPayoutsQuery`               | none                                      |
| Tax reports                         | GET    | `/tax/reports`                                   | `adminTaxSlice`           | `TaxReportQuery`                 | none                                      |
| Generate invoice                    | POST   | `/tax/orders/:orderId/invoice`                   | `adminTaxSlice`           | none                             | none                                      |
| Create API key                      | POST   | `/platform/api-keys`                             | `adminPlatformSlice`      | none                             | `CreateApiKeyPayload`                     |
| List API keys                       | GET    | `/platform/api-keys`                             | `adminPlatformSlice`      | `ListApiKeysQuery`               | none                                      |
| Create webhook                      | POST   | `/platform/webhooks`                             | `adminPlatformSlice`      | none                             | `CreateWebhookSubscriptionPayload`        |
| List webhooks                       | GET    | `/platform/webhooks`                             | `adminPlatformSlice`      | `ListWebhookSubscriptionsQuery`  | none                                      |
| Upsert feature flag                 | PUT    | `/platform/feature-flags`                        | `adminPlatformSlice`      | none                             | `UpsertFeatureFlagPayload`                |
| List feature flags                  | GET    | `/platform/feature-flags`                        | `adminPlatformSlice`      | `ListFeatureFlagsQuery`          | none                                      |
| Realtime analytics                  | GET    | `/analytics/realtime`                            | `adminAnalyticsSlice`     | `RealtimeAnalyticsQuery`         | none                                      |
| Returns analytics                   | GET    | `/returns/analytics`                             | `adminAnalyticsSlice`     | `ReturnsAnalyticsQuery`          | none                                      |
| List chargebacks                    | GET    | `/chargebacks`                                   | `adminPaymentsSlice`      | `ListChargebacksQuery`           | none                                      |
| System health                       | GET    | `/system/health`                                 | `adminSystemSlice`        | none                             | none                                      |
| Queue status                        | GET    | `/system/queues`                                 | `adminSystemSlice`        | none                             | none                                      |
| Pause queue                         | POST   | `/system/queues/:queueName/pause`                | `adminSystemSlice`        | none                             | none                                      |
| Resume queue                        | POST   | `/system/queues/:queueName/resume`               | `adminSystemSlice`        | none                             | none                                      |
| List dead-letter events             | GET    | `/system/dead-letter`                            | `adminSystemSlice`        | `ListDeadLetterQuery`            | none                                      |
| Retry dead-letter event             | POST   | `/system/dead-letter/:eventId/retry`             | `adminSystemSlice`        | none                             | `DeadLetterActionPayload`                 |
| Discard dead-letter event           | POST   | `/system/dead-letter/:eventId/discard`           | `adminSystemSlice`        | none                             | `DeadLetterActionPayload`                 |
| Create subscription plan            | POST   | `/platform/subscription-plans`                   | `adminSubscriptionsSlice` | none                             | `CreateSubscriptionPlanPayload`           |
| List subscription plans             | GET    | `/platform/subscription-plans`                   | `adminSubscriptionsSlice` | `ListSubscriptionPlanQuery`      | none                                      |
| Get subscription plan               | GET    | `/platform/subscription-plans/:planId`           | `adminSubscriptionsSlice` | none                             | none                                      |
| Update subscription plan            | PATCH  | `/platform/subscription-plans/:planId`           | `adminSubscriptionsSlice` | none                             | `UpdateSubscriptionPlanPayload`           |
| Delete subscription plan            | DELETE | `/platform/subscription-plans/:planId`           | `adminSubscriptionsSlice` | none                             | none                                      |
| List platform subscriptions         | GET    | `/platform/subscriptions`                        | `adminSubscriptionsSlice` | `ListPlatformSubscriptionsQuery` | none                                      |
| Update platform subscription status | PATCH  | `/platform/subscriptions/:subscriptionId/status` | `adminSubscriptionsSlice` | none                             | `UpdatePlatformSubscriptionStatusPayload` |
| Create platform fee config          | POST   | `/platform/fee-config`                           | `adminSubscriptionsSlice` | none                             | `CreatePlatformFeeConfigPayload`          |
| List platform fee configs           | GET    | `/platform/fee-config`                           | `adminSubscriptionsSlice` | `ListPlatformFeeConfigQuery`     | none                                      |
| Get platform fee config             | GET    | `/platform/fee-config/:configId`                 | `adminSubscriptionsSlice` | none                             | none                                      |
| Update platform fee config          | PATCH  | `/platform/fee-config/:configId`                 | `adminSubscriptionsSlice` | none                             | `UpdatePlatformFeeConfigPayload`          |
| Delete platform fee config          | DELETE | `/platform/fee-config/:configId`                 | `adminSubscriptionsSlice` | none                             | none                                      |
| Create category                     | POST   | `/platform/categories`                           | `adminPlatformSlice`      | none                             | `CreateCategoryPayload`                   |
| List categories                     | GET    | `/platform/categories`                           | `adminPlatformSlice`      | `ListCategoriesQuery`            | none                                      |
| Get category                        | GET    | `/platform/categories/:categoryKey`              | `adminPlatformSlice`      | none                             | none                                      |
| Update category                     | PATCH  | `/platform/categories/:categoryKey`              | `adminPlatformSlice`      | none                             | `UpdateCategoryPayload`                   |
| Delete category                     | DELETE | `/platform/categories/:categoryKey`              | `adminPlatformSlice`      | none                             | none                                      |
| Create product family               | POST   | `/platform/product-families`                     | `adminPlatformSlice`      | none                             | `CreateProductFamilyPayload`              |
| List product families               | GET    | `/platform/product-families`                     | `adminPlatformSlice`      | `ListProductFamiliesQuery`       | none                                      |
| Get product family                  | GET    | `/platform/product-families/:familyCode`         | `adminPlatformSlice`      | none                             | none                                      |
| Update product family               | PATCH  | `/platform/product-families/:familyCode`         | `adminPlatformSlice`      | none                             | `UpdateProductFamilyPayload`              |
| Delete product family               | DELETE | `/platform/product-families/:familyCode`         | `adminPlatformSlice`      | none                             | none                                      |
| Create product variant              | POST   | `/platform/product-variants`                     | `adminPlatformSlice`      | none                             | `CreateProductVariantPayload`             |
| List product variants               | GET    | `/platform/product-variants`                     | `adminPlatformSlice`      | `ListProductVariantsQuery`       | none                                      |
| Get product variant                 | GET    | `/platform/product-variants/:variantId`          | `adminPlatformSlice`      | none                             | none                                      |
| Update product variant              | PATCH  | `/platform/product-variants/:variantId`          | `adminPlatformSlice`      | none                             | `UpdateProductVariantPayload`             |
| Delete product variant              | DELETE | `/platform/product-variants/:variantId`          | `adminPlatformSlice`      | none                             | none                                      |
| Create HSN code                     | POST   | `/platform/hsn-codes`                            | `adminPlatformSlice`      | none                             | `CreateHsnCodePayload`                    |
| List HSN codes                      | GET    | `/platform/hsn-codes`                            | `adminPlatformSlice`      | `ListHsnCodesQuery`              | none                                      |
| Get HSN code                        | GET    | `/platform/hsn-codes/:hsnCode`                   | `adminPlatformSlice`      | none                             | none                                      |
| Update HSN code                     | PATCH  | `/platform/hsn-codes/:hsnCode`                   | `adminPlatformSlice`      | none                             | `UpdateHsnCodePayload`                    |
| Delete HSN code                     | DELETE | `/platform/hsn-codes/:hsnCode`                   | `adminPlatformSlice`      | none                             | none                                      |
| Create geography                    | POST   | `/platform/geography`                            | `adminPlatformSlice`      | none                             | `CreateGeographyPayload`                  |
| List geography                      | GET    | `/platform/geography`                            | `adminPlatformSlice`      | `ListGeographiesQuery`           | none                                      |
| Get geography                       | GET    | `/platform/geography/:countryCode`               | `adminPlatformSlice`      | none                             | none                                      |
| Update geography                    | PATCH  | `/platform/geography/:countryCode`               | `adminPlatformSlice`      | none                             | `UpdateGeographyPayload`                  |
| Delete geography                    | DELETE | `/platform/geography/:countryCode`               | `adminPlatformSlice`      | none                             | none                                      |
| Create content page                 | POST   | `/platform/content-pages`                        | `adminPlatformSlice`      | none                             | `CreateContentPagePayload`                |
| List content pages                  | GET    | `/platform/content-pages`                        | `adminPlatformSlice`      | `ListContentPagesQuery`          | none                                      |
| Get content page                    | GET    | `/platform/content-pages/:slug`                  | `adminPlatformSlice`      | none                             | none                                      |
| Update content page                 | PATCH  | `/platform/content-pages/:slug`                  | `adminPlatformSlice`      | none                             | `UpdateContentPagePayload`                |
| Delete content page                 | DELETE | `/platform/content-pages/:slug`                  | `adminPlatformSlice`      | none                             | none                                      |

## Admin Query Types

```ts
export type ListAccessModulesQuery = {
  role?:
    | "admin"
    | "sub-admin"
    | "seller"
    | "seller-sub-admin"
    | "buyer"
    | "super-admin";
  roleId?: string;
  roleSlug?: string;
  active?: boolean;
  includePermissions?: boolean;
};

export type ListAdminsQuery = {
  q?: string;
  accountStatus?: "active" | "suspended";
  page?: number;
  limit?: number;
};

export type ListPlatformSubAdminsQuery = {
  ownerAdminId?: string;
};

export type ListUsersQuery = {
  q?: string;
  role?:
    | "admin"
    | "sub-admin"
    | "seller"
    | "seller-sub-admin"
    | "buyer"
    | "super-admin";
  accountStatus?: "active" | "suspended" | "pending_approval";
  page?: number;
  limit?: number;
};

export type ListVendorsQuery = {
  q?: string;
  status?: "active" | "suspended" | "pending_approval";
  onboardingStatus?:
    | "initiated"
    | "in_progress"
    | "under_review"
    | "ready_for_go_live"
    | "rejected";
  page?: number;
  limit?: number;
};

export type ModerationQueueQuery = {
  status?: "pending_approval" | "draft" | "rejected" | "active" | "inactive";
  category?: string;
  page?: number;
  limit?: number;
};

export type ListOrdersQuery = {
  status?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
};

export type ListPaymentsQuery = {
  status?: "initiated" | "authorized" | "captured" | "failed" | "refunded";
  provider?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
};

export type ListPayoutsQuery = {
  sellerId?: string;
  status?: "scheduled" | "processing" | "paid" | "failed";
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
};

export type TaxReportQuery = {
  fromDate?: string;
  toDate?: string;
  taxComponent?: "cgst" | "sgst" | "igst" | "tcs";
  limit?: number;
  offset?: number;
};

export type ListApiKeysQuery = {
  ownerId?: string;
  status?: "active" | "revoked" | "expired";
  limit?: number;
  offset?: number;
};

export type ListWebhookSubscriptionsQuery = {
  ownerId?: string;
  status?: "active" | "paused" | "disabled";
  limit?: number;
  offset?: number;
};

export type ListFeatureFlagsQuery = {
  enabled?: boolean;
  limit?: number;
  offset?: number;
};

export type RealtimeAnalyticsQuery = {
  hours?: number;
};

export type ReturnsAnalyticsQuery = {
  fromDate?: string;
  toDate?: string;
};

export type ListChargebacksQuery = {
  status?: "pending" | "accepted" | "rejected" | "won" | "lost";
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
};

export type ListDeadLetterQuery = {
  status?: "failed" | "retry_scheduled" | "discarded";
  eventType?: string;
  limit?: number;
  offset?: number;
};

export type ListSubscriptionPlanQuery = {
  active?: boolean;
  limit?: number;
  offset?: number;
};

export type ListPlatformSubscriptionsQuery = {
  status?: "active" | "paused" | "cancelled" | "expired";
  userRole?: "buyer" | "seller" | "admin";
  limit?: number;
  offset?: number;
};

export type ListPlatformFeeConfigQuery = {
  active?: boolean;
  category?: string;
  limit?: number;
  offset?: number;
};

export type ListCategoriesQuery = {
  page?: number;
  limit?: number;
  parentKey?: string;
  active?: boolean;
  categoryKey?: string;
};

export type ListProductFamiliesQuery = {
  page?: number;
  limit?: number;
  category?: string;
  sellerId?: string;
  status?: string;
};

export type ListProductVariantsQuery = {
  page?: number;
  limit?: number;
  productId?: string;
  familyCode?: string;
  sellerId?: string;
  status?: string;
};

export type ListHsnCodesQuery = {
  page?: number;
  limit?: number;
  category?: string;
  active?: boolean;
};

export type ListGeographiesQuery = {
  page?: number;
  limit?: number;
  active?: boolean;
};

export type ListContentPagesQuery = {
  page?: number;
  limit?: number;
  pageType?: string;
  language?: string;
  published?: boolean;
};
```

## Admin Payloads

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
  "CreatePlatformSubAdminPayload": {
    "email": "subadmin@example.com",
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
  },
  "UpdateUserPayload": {
    "role": "buyer",
    "accountStatus": "active",
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  },
  "DeactivateUserPayload": {
    "reason": "Policy violation"
  },
  "UpdateVendorStatusPayload": {
    "accountStatus": "active"
  },
  "ModerateProductPayload": {
    "status": "active",
    "rejectionReason": "",
    "checklist": {
      "titleVerified": true,
      "categoryVerified": true,
      "complianceVerified": true,
      "mediaVerified": true
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
  "CreateWebhookSubscriptionPayload": {
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
  },
  "DeadLetterActionPayload": {
    "reason": "Manual action from admin panel"
  },
  "CreateSubscriptionPlanPayload": {
    "planCode": "SELLER_PRO",
    "title": "Seller Pro",
    "description": "Advanced seller tools",
    "targetRoles": ["seller"],
    "featureFlags": ["catalog_boost"],
    "monthlyPrice": 999,
    "yearlyPrice": 9999,
    "currency": "INR",
    "active": true,
    "metadata": {}
  },
  "UpdateSubscriptionPlanPayload": {
    "title": "Seller Pro Plus",
    "description": "Updated plan",
    "targetRoles": ["seller"],
    "featureFlags": ["catalog_boost", "priority_support"],
    "monthlyPrice": 1299,
    "yearlyPrice": 12999,
    "currency": "INR",
    "active": true,
    "metadata": {}
  },
  "UpdatePlatformSubscriptionStatusPayload": {
    "status": "active"
  },
  "CreatePlatformFeeConfigPayload": {
    "category": "electronics",
    "commissionPercent": 8.5,
    "fixedFeeAmount": 10,
    "closingFeeAmount": 20,
    "active": true,
    "effectiveFrom": "2026-05-01T00:00:00.000Z",
    "effectiveTo": null
  },
  "UpdatePlatformFeeConfigPayload": {
    "category": "electronics",
    "commissionPercent": 9,
    "fixedFeeAmount": 10,
    "closingFeeAmount": 20,
    "active": true,
    "effectiveFrom": "2026-05-01T00:00:00.000Z",
    "effectiveTo": null
  }
}
```

## Admin Platform Payloads

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
  "UpdateCategoryPayload": {
    "title": "Consumer Electronics",
    "parentKey": "",
    "level": 0,
    "attributesSchema": {},
    "active": true,
    "sortOrder": 1
  },
  "CreateProductFamilyPayload": {
    "familyCode": "IPHONE_16",
    "sellerId": "seller_id",
    "title": "iPhone 16",
    "category": "electronics",
    "baseAttributes": {
      "brand": "Apple"
    },
    "variantAxes": ["color", "storage"],
    "status": "active"
  },
  "UpdateProductFamilyPayload": {
    "title": "iPhone 16 Series",
    "category": "electronics",
    "baseAttributes": {
      "brand": "Apple"
    },
    "variantAxes": ["color", "storage"],
    "status": "active"
  },
  "CreateProductVariantPayload": {
    "familyCode": "IPHONE_16",
    "productId": "product_id",
    "sellerId": "seller_id",
    "sku": "IPHONE16-BLK-128",
    "attributes": {
      "color": "Black",
      "storage": "128GB"
    },
    "stock": 100,
    "reservedStock": 0,
    "status": "active"
  },
  "UpdateProductVariantPayload": {
    "familyCode": "IPHONE_16",
    "productId": "product_id",
    "sellerId": "seller_id",
    "sku": "IPHONE16-BLK-128",
    "attributes": {
      "color": "Black",
      "storage": "128GB"
    },
    "stock": 80,
    "reservedStock": 5,
    "status": "active"
  },
  "CreateHsnCodePayload": {
    "code": "851712",
    "description": "Mobile phones",
    "gstRate": 18,
    "cessRate": 0,
    "taxType": "gst",
    "exempt": false,
    "category": "electronics",
    "active": true
  },
  "UpdateHsnCodePayload": {
    "description": "Mobile phones and smartphones",
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
  "UpdateGeographyPayload": {
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
    "slug": "seller-policy",
    "title": "Seller Policy",
    "pageType": "policy",
    "body": "<p>Policy content</p>",
    "language": "en",
    "published": true,
    "publishedAt": "2026-05-04T00:00:00.000Z",
    "metadata": {}
  },
  "UpdateContentPagePayload": {
    "title": "Seller Policy Updated",
    "pageType": "policy",
    "body": "<p>Updated content</p>",
    "language": "en",
    "published": true,
    "publishedAt": "2026-05-04T00:00:00.000Z",
    "metadata": {}
  }
}
```

## Seller API Map

Base path:

```text
/api/v1/sellers
```

| Feature                         | Method | Path                             | Slice                  | Auth/permission                    | Query                  | Body                          |
| ------------------------------- | ------ | -------------------------------- | ---------------------- | ---------------------------------- | ---------------------- | ----------------------------- |
| Submit onboarding KYC           | POST   | `/onboarding/kyc`                | `sellerSlice`          | onboarding seller token            | none                   | `SellerKycPayload`            |
| Update onboarding profile       | PATCH  | `/onboarding/profile`            | `sellerSlice`          | onboarding seller token            | none                   | `SellerProfilePayload`        |
| Review seller KYC               | PATCH  | `/:sellerId/kyc/review`          | `adminVendorsSlice`    | `kyc:review` capability            | none                   | `ReviewSellerKycPayload`      |
| Seller web status               | GET    | `/me/status`                     | `sellerSlice`          | seller or seller-sub-admin         | none                   | none                          |
| Seller tracking list            | GET    | `/me/tracking`                   | `sellerTrackingSlice`  | seller or seller-sub-admin         | `SellerTrackingQuery`  | none                          |
| Seller tracking detail          | GET    | `/me/tracking/:orderId`          | `sellerTrackingSlice`  | seller or seller-sub-admin         | none                   | none                          |
| Get seller profile              | GET    | `/me/profile`                    | `sellerSlice`          | `seller:profile:manage` capability | none                   | none                          |
| Update seller profile           | PATCH  | `/me/profile`                    | `sellerSlice`          | `seller:profile:manage` capability | none                   | `SellerProfilePayload`        |
| Update business address         | PATCH  | `/me/business-address`           | `sellerSlice`          | `seller:profile:manage` capability | none                   | `SellerAddressPayload`        |
| Update pickup address           | PATCH  | `/me/pickup-address`             | `sellerSlice`          | `seller:profile:manage` capability | none                   | `SellerAddressPayload`        |
| Update bank details             | PATCH  | `/me/bank-details`               | `sellerSlice`          | `seller:profile:manage` capability | none                   | `SellerBankPayload`           |
| Update more info                | PATCH  | `/me/more-info`                  | `sellerSlice`          | `seller:profile:manage` capability | none                   | `SellerMoreInfoPayload`       |
| Update settings                 | PATCH  | `/me/settings`                   | `sellerSlice`          | `seller:profile:manage` capability | none                   | `SellerSettingsPayload`       |
| Seller dashboard                | GET    | `/me/dashboard`                  | `sellerDashboardSlice` | `seller:dashboard:view` capability | `SellerDashboardQuery` | none                          |
| Create seller sub-admin         | POST   | `/me/sub-admins`                 | `sellerSubAdminsSlice` | `seller:profile:manage` capability | none                   | `CreateSellerSubAdminPayload` |
| List seller sub-admins          | GET    | `/me/sub-admins`                 | `sellerSubAdminsSlice` | `seller:profile:manage` capability | none                   | none                          |
| Update seller sub-admin modules | PATCH  | `/me/sub-admins/:userId/modules` | `sellerSubAdminsSlice` | `seller:profile:manage` capability | none                   | `UpdateAllowedModulesPayload` |

## Seller Query Types

```ts
export type SellerTrackingQuery = {
  status?:
    | "pending_payment"
    | "payment_failed"
    | "confirmed"
    | "packed"
    | "shipped"
    | "delivered"
    | "return_requested"
    | "returned"
    | "cancelled"
    | "fulfilled";
  deliveryStatus?:
    | "not_created"
    | "initiated"
    | "manifested"
    | "picked_up"
    | "in_transit"
    | "out_for_delivery"
    | "delivered"
    | "failed"
    | "cancelled";
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
};

export type SellerDashboardQuery = {
  fromDate?: string;
  toDate?: string;
};
```

## Seller Payloads

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
    "bankDetails": {
      "accountHolderName": "Acme Traders",
      "accountNumber": "1234567890",
      "ifscCode": "ICIC0001234",
      "bankName": "ICICI Bank",
      "branchName": "MG Road"
    },
    "businessAddress": {
      "line1": "Office Road",
      "line2": "",
      "city": "Bengaluru",
      "state": "Karnataka",
      "country": "India",
      "postalCode": "560001"
    },
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
  "SellerMoreInfoPayload": {
    "description": "Quality consumer electronics.",
    "businessWebsite": "https://example.com",
    "primaryContactName": "Asha Patel",
    "registrationNumber": "REG123",
    "supportEmail": "support@example.com",
    "supportPhone": "+918888888888"
  },
  "SellerSettingsPayload": {
    "autoAcceptOrders": true,
    "handlingTimeHours": 24,
    "returnWindowDays": 7,
    "ndrResponseHours": 24,
    "shippingModes": ["standard", "express"],
    "payoutSchedule": "weekly"
  },
  "ReviewSellerKycPayload": {
    "verificationStatus": "verified",
    "rejectionReason": ""
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
  }
}
```

## Seller Commission API Map

Base path:

```text
/api/v1/sellers/commissions
```

| Feature                    | Method | Path                  | Slice                    | Auth/role    | Query | Body                    |
| -------------------------- | ------ | --------------------- | ------------------------ | ------------ | ----- | ----------------------- |
| My commissions             | GET    | `/my-commissions`     | `sellerCommissionsSlice` | seller token | none  | none                    |
| My payouts                 | GET    | `/my-payouts`         | `sellerCommissionsSlice` | seller token | none  | none                    |
| Calculate order commission | POST   | `/calculate/:orderId` | `sellerCommissionsSlice` | admin role   | none  | none                    |
| Process batch payouts      | POST   | `/process-payouts`    | `sellerCommissionsSlice` | admin role   | none  | `ProcessPayoutsPayload` |
| View settlements           | GET    | `/settlements`        | `sellerCommissionsSlice` | admin role   | none  | none                    |

```json
{
  "ProcessPayoutsPayload": {
    "sellerId": "seller_id"
  }
}
```

## Endpoint Constants

```js
export const API_PREFIX = "/api/v1";

export const adminEndpoints = {
  accessModules: `${API_PREFIX}/admin/access/modules`,
  admins: `${API_PREFIX}/admin/access/admins`,
  subAdmins: `${API_PREFIX}/admin/access/sub-admins`,
  subAdminModules: (userId) =>
    `${API_PREFIX}/admin/access/sub-admins/${userId}/modules`,
  dashboardOverview: `${API_PREFIX}/admin/dashboard/overview`,
  users: `${API_PREFIX}/admin/users`,
  userById: (userId) => `${API_PREFIX}/admin/users/${userId}`,
  vendors: `${API_PREFIX}/admin/vendors`,
  vendorStatus: (sellerId) => `${API_PREFIX}/admin/vendors/${sellerId}/status`,
  moderationQueue: `${API_PREFIX}/admin/products/moderation-queue`,
  moderateProduct: (productId) =>
    `${API_PREFIX}/admin/products/${productId}/moderate`,
  orders: `${API_PREFIX}/admin/orders`,
  payments: `${API_PREFIX}/admin/payments`,
  payouts: `${API_PREFIX}/admin/payouts`,
  taxReports: `${API_PREFIX}/admin/tax/reports`,
  invoice: (orderId) => `${API_PREFIX}/admin/tax/orders/${orderId}/invoice`,
  apiKeys: `${API_PREFIX}/admin/platform/api-keys`,
  webhooks: `${API_PREFIX}/admin/platform/webhooks`,
  featureFlags: `${API_PREFIX}/admin/platform/feature-flags`,
  realtimeAnalytics: `${API_PREFIX}/admin/analytics/realtime`,
  returnsAnalytics: `${API_PREFIX}/admin/returns/analytics`,
  chargebacks: `${API_PREFIX}/admin/chargebacks`,
  systemHealth: `${API_PREFIX}/admin/system/health`,
  queues: `${API_PREFIX}/admin/system/queues`,
  pauseQueue: (queueName) =>
    `${API_PREFIX}/admin/system/queues/${queueName}/pause`,
  resumeQueue: (queueName) =>
    `${API_PREFIX}/admin/system/queues/${queueName}/resume`,
  deadLetter: `${API_PREFIX}/admin/system/dead-letter`,
  retryDeadLetter: (eventId) =>
    `${API_PREFIX}/admin/system/dead-letter/${eventId}/retry`,
  discardDeadLetter: (eventId) =>
    `${API_PREFIX}/admin/system/dead-letter/${eventId}/discard`,
  subscriptionPlans: `${API_PREFIX}/admin/platform/subscription-plans`,
  subscriptionPlanById: (planId) =>
    `${API_PREFIX}/admin/platform/subscription-plans/${planId}`,
  platformSubscriptions: `${API_PREFIX}/admin/platform/subscriptions`,
  platformSubscriptionStatus: (subscriptionId) =>
    `${API_PREFIX}/admin/platform/subscriptions/${subscriptionId}/status`,
  feeConfig: `${API_PREFIX}/admin/platform/fee-config`,
  feeConfigById: (configId) =>
    `${API_PREFIX}/admin/platform/fee-config/${configId}`,
  categories: `${API_PREFIX}/admin/platform/categories`,
  categoryByKey: (categoryKey) =>
    `${API_PREFIX}/admin/platform/categories/${categoryKey}`,
  productFamilies: `${API_PREFIX}/admin/platform/product-families`,
  productFamilyByCode: (familyCode) =>
    `${API_PREFIX}/admin/platform/product-families/${familyCode}`,
  productVariants: `${API_PREFIX}/admin/platform/product-variants`,
  productVariantById: (variantId) =>
    `${API_PREFIX}/admin/platform/product-variants/${variantId}`,
  hsnCodes: `${API_PREFIX}/admin/platform/hsn-codes`,
  hsnCodeByCode: (hsnCode) =>
    `${API_PREFIX}/admin/platform/hsn-codes/${hsnCode}`,
  geography: `${API_PREFIX}/admin/platform/geography`,
  geographyByCode: (countryCode) =>
    `${API_PREFIX}/admin/platform/geography/${countryCode}`,
  contentPages: `${API_PREFIX}/admin/platform/content-pages`,
  contentPageBySlug: (slug) =>
    `${API_PREFIX}/admin/platform/content-pages/${slug}`,
};

export const sellerEndpoints = {
  onboardingKyc: `${API_PREFIX}/sellers/onboarding/kyc`,
  onboardingProfile: `${API_PREFIX}/sellers/onboarding/profile`,
  reviewKyc: (sellerId) => `${API_PREFIX}/sellers/${sellerId}/kyc/review`,
  status: `${API_PREFIX}/sellers/me/status`,
  tracking: `${API_PREFIX}/sellers/me/tracking`,
  trackingOrder: (orderId) => `${API_PREFIX}/sellers/me/tracking/${orderId}`,
  profile: `${API_PREFIX}/sellers/me/profile`,
  businessAddress: `${API_PREFIX}/sellers/me/business-address`,
  pickupAddress: `${API_PREFIX}/sellers/me/pickup-address`,
  bankDetails: `${API_PREFIX}/sellers/me/bank-details`,
  moreInfo: `${API_PREFIX}/sellers/me/more-info`,
  settings: `${API_PREFIX}/sellers/me/settings`,
  dashboard: `${API_PREFIX}/sellers/me/dashboard`,
  subAdmins: `${API_PREFIX}/sellers/me/sub-admins`,
  subAdminModules: (userId) =>
    `${API_PREFIX}/sellers/me/sub-admins/${userId}/modules`,
};

export const sellerCommissionEndpoints = {
  myCommissions: `${API_PREFIX}/sellers/commissions/my-commissions`,
  myPayouts: `${API_PREFIX}/sellers/commissions/my-payouts`,
  calculate: (orderId) =>
    `${API_PREFIX}/sellers/commissions/calculate/${orderId}`,
  processPayouts: `${API_PREFIX}/sellers/commissions/process-payouts`,
  settlements: `${API_PREFIX}/sellers/commissions/settlements`,
};
```

## Admin Panel Features To Build

| Feature                  | Main APIs                                                                                                      | Components                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Access and roles         | `/access/modules`, `/access/admins`, `/access/sub-admins`                                                      | admin list, sub-admin list, create modal, module assignment form          |
| Dashboard                | `/dashboard/overview`, `/analytics/realtime`                                                                   | KPI cards, realtime metrics, order/payment summary                        |
| Users                    | `/users`, `/users/:userId`                                                                                     | user table, user detail drawer, edit status/profile form                  |
| Sellers/vendors          | `/vendors`, `/vendors/:sellerId/status`, `/sellers/:sellerId/kyc/review`                                       | seller table, onboarding checklist, KYC review form, status update action |
| Product moderation       | `/products/moderation-queue`, `/products/:productId/moderate`                                                  | moderation queue, review checklist, approve/reject action                 |
| Orders                   | `/orders`                                                                                                      | order table, filters, detail link if separate order detail API is added   |
| Payments and chargebacks | `/payments`, `/chargebacks`                                                                                    | payment table, provider/status filters, chargeback table                  |
| Payouts and commission   | `/payouts`, `/sellers/commissions/*`                                                                           | payout table, create payout form, commission calculation, settlements     |
| Tax                      | `/tax/reports`, `/tax/orders/:orderId/invoice`                                                                 | tax report table, invoice generation action                               |
| Platform setup           | `/platform/categories`, `/product-families`, `/product-variants`, `/hsn-codes`, `/geography`, `/content-pages` | CRUD tables and forms                                                     |
| Integrations             | `/platform/api-keys`, `/platform/webhooks`                                                                     | API key table/form, webhook table/form                                    |
| Feature flags            | `/platform/feature-flags`                                                                                      | flag table, rollout form                                                  |
| Subscriptions and fees   | `/platform/subscription-plans`, `/platform/subscriptions`, `/platform/fee-config`                              | plan CRUD, subscription table, fee config CRUD                            |
| System ops               | `/system/health`, `/system/queues`, `/system/dead-letter`                                                      | health cards, queue controls, dead-letter retry/discard                   |

## Seller Panel Features To Build

| Feature                 | Main APIs                                                                                                        | Components                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Onboarding              | `/onboarding/profile`, `/onboarding/kyc`                                                                         | profile form, KYC form, document URL inputs, bank info form   |
| Seller status           | `/me/status`                                                                                                     | onboarding checklist, KYC status, next steps                  |
| Dashboard               | `/me/dashboard`                                                                                                  | KPI cards, top products, recent orders                        |
| Tracking                | `/me/tracking`, `/me/tracking/:orderId`                                                                          | tracking table, status filters, order tracking detail         |
| Profile management      | `/me/profile`, `/me/business-address`, `/me/pickup-address`, `/me/bank-details`, `/me/more-info`, `/me/settings` | profile forms, address forms, bank form, seller settings form |
| Seller sub-admins       | `/me/sub-admins`, `/me/sub-admins/:userId/modules`                                                               | sub-admin table, create form, module assignment form          |
| Commissions and payouts | `/sellers/commissions/my-commissions`, `/sellers/commissions/my-payouts`                                         | commission report, payout history                             |

## Required UI States

Every API-backed screen should implement:

- loading state
- empty state
- validation error state
- API error state
- retry action for GET APIs
- optimistic or disabled-submit state for POST/PATCH/DELETE
- success toast after mutation
- role/capability guard before showing actions

## Important Implementation Notes

- Admin `/access/admins` create/list is super-admin only.
- Seller onboarding routes require an onboarding token, not the normal approved seller flow.
- Seller web status and tracking support seller and seller-sub-admin, but seller-sub-admin must have one of `sellers`, `orders`, or `delivery` modules.
- Seller profile management requires `seller:profile:manage`.
- Seller dashboard requires `seller:dashboard:view`.
- Seller KYC review requires `kyc:review`.
- Queue actions currently accept only `notifications` as `queueName`.
- UUID validation is used for subscription plan IDs, subscription IDs, fee config IDs, and dead-letter event IDs.
- `CreatePayoutPayload.netPayoutAmount` is optional at backend level; if not sent, backend computes it from gross minus commission, processing fee, and tax withheld.
- Boolean query values should be sent as `true` or `false`.
- Pagination differs by module: some admin endpoints use `page` and `limit`, while operational reports use `limit` and `offset`.
