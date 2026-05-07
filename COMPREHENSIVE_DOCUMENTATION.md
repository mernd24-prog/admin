# **Comprehensive E-Commerce Application Documentation**

## **1. SYSTEM ARCHITECTURE OVERVIEW**

### **Architecture Type**
- **Pattern**: Modular Monolith with Microservice-Ready Boundaries
- **Scalability**: Domain-driven design approach with service layer boundaries to enable future microservice extraction
- **Deployment Model**: Containerized (Docker) with orchestration ready (K8s file present)

### **Technology Stack**

#### **Runtime & Framework**
- **Node.js**: v20.0.0+
- **Framework**: Express.js 4.19.2
- **Language**: JavaScript (CommonJS)

#### **Core Dependencies**
```json
{
  "HTTP & API": "express, cors, helmet",
  "Authentication": "jsonwebtoken, bcryptjs, firebase-admin, google-auth-library",
  "Databases": "mongoose (MongoDB), pg (PostgreSQL), ioredis (Redis)",
  "Search": "@elastic/elasticsearch",
  "Payment": "razorpay",
  "Queue System": "bullmq",
  "Email": "nodemailer",
  "File Storage": "cloudinary",
  "Real-time": "socket.io",
  "Validation": "joi, zod",
  "Logging": "pino, pino-http",
  "Rate Limiting": "express-rate-limit",
  "Utilities": "slugify, uuid"
}
```

### **Infrastructure Components**

```
┌─────────────────────────────────────────────────┐
│         Node.js Express Application              │
│              (Port 4000)                         │
└────────┬──────────────┬──────────────┬───────────┘
         │              │              │
    ┌────▼──────┐  ┌───▼──────┐  ┌───▼──────┐
    │ MongoDB   │  │PostgreSQL│  │  Redis   │
    │ 27017     │  │  5432    │  │  6379    │
    └───────────┘  └──────────┘  └──────────┘
         │              │              │
    ┌────▼─────────────▼──────────────▼────┐
    │   Elasticsearch    │    Socket.IO     │
    │      9200          │   (Realtime)     │
    └────────────────────┬──────────────────┘
                         │
    ┌────────────────────▼──────────────────┐
    │  External Services                    │
    │  - Razorpay (Payments)               │
    │  - Firebase/Google OAuth             │
    │  - Cloudinary (File Storage)         │
    │  - Nodemailer (Email)                │
    └─────────────────────────────────────┘
```

---

## **2. DATABASE DESIGN**

### **MongoDB Collections** (NoSQL - Products, Users, Cart, Notifications, Analytics)

#### **Users Collection**
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  phone: String (indexed),
  passwordHash: String,
  role: String (admin|seller|buyer, indexed),
  profile: {
    firstName: String,
    lastName: String,
    avatarUrl: String
  },
  sellerProfile: {
    displayName: String,
    legalBusinessName: String,
    description: String,
    supportEmail: String,
    supportPhone: String,
    pickupAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    },
    onboardingStatus: String (initiated|in_progress|ready_for_go_live),
    onboardingChecklist: {
      profileCompleted: Boolean,
      kycSubmitted: Boolean,
      gstVerified: Boolean,
      bankLinked: Boolean,
      firstProductPublished: Boolean
    }
  },
  sellerSettings: {
    autoAcceptOrders: Boolean,
    handlingTimeHours: Number,
    returnWindowDays: Number,
    ndrResponseHours: Number,
    shippingModes: [String],
    payoutSchedule: String (daily|weekly|biweekly|monthly)
  },
  referralCode: String (unique, sparse, indexed),
  referredByUserId: String (indexed),
  emailVerified: Boolean,
  accountStatus: String (active|suspended, indexed),
  authProviders: [{
    provider: String,
    providerUserId: String,
    linkedAt: Date
  }],
  refreshSessions: [{
    sessionId: String,
    tokenHash: String,
    provider: String,
    ipAddress: String,
    userAgent: String,
    platform: String,
    createdAt: Date,
    lastUsedAt: Date
  }],
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### **Products Collection**
```javascript
{
  _id: ObjectId,
  sellerId: String (indexed),
  title: String (indexed),
  slug: String (unique),
  description: String,
  price: Number (indexed),
  mrp: Number,
  gstRate: Number (default: 18),
  currency: String (default: INR),
  category: String (indexed),
  attributes: Object,
  stock: Number,
  reservedStock: Number,
  images: [String],
  rating: Number,
  status: String (draft|pending_approval|active|inactive|rejected, indexed),
  moderation: {
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: String,
    rejectionReason: String,
    checklist: {
      titleVerified: Boolean,
      categoryVerified: Boolean,
      complianceVerified: Boolean,
      mediaVerified: Boolean
    }
  },
  createdAt: Date,
  updatedAt: Date,

  // Indexes
  textIndex: {title: "text", description: "text", category: 1}
}
```

#### **Carts Collection**
```javascript
{
  _id: ObjectId,
  userId: String (unique, indexed),
  items: [{
    productId: String,
    quantity: Number (min: 1),
    price: Number
  }],
  wishlist: [String],
  createdAt: Date,
  updatedAt: Date
}
```

#### **Notifications Collection**
```javascript
{
  _id: ObjectId,
  userId: String (indexed),
  channel: String (email|sms|push),
  template: String,
  subject: String,
  payload: Object,
  status: String (queued|sent|failed, indexed),
  createdAt: Date,
  updatedAt: Date
}
```

#### **Analytics Collection**
```javascript
{
  _id: ObjectId,
  eventName: String (indexed),
  actorId: String (indexed),
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

#### **Coupons Collection**
```javascript
{
  _id: ObjectId,
  code: String (unique, indexed),
  type: String (percentage|fixed),
  value: Number,
  minOrderAmount: Number,
  maxDiscountAmount: Number,
  active: Boolean (indexed),
  usageLimit: Number,
  usedCount: Number,
  startsAt: Date,
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### **Referrals Collection**
```javascript
{
  _id: ObjectId,
  referrerUserId: String (indexed),
  refereeUserId: String (unique, indexed),
  referralCode: String (indexed),
  referrerRewardAmount: Number,
  refereeRewardAmount: Number,
  status: String (rewarded),
  createdAt: Date,
  updatedAt: Date
}
```

#### **Inventory Reservations Collection**
```javascript
{
  _id: ObjectId,
  orderId: String (unique),
  buyerId: String,
  items: [{
    productId: String,
    quantity: Number
  }],
  status: String (reserved|committed|released),
  createdAt: Date,
  updatedAt: Date
}
```

### **PostgreSQL Tables** (RDBMS - Orders, Payments, KYC, Wallet, Outbox)

#### **orders Table**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  buyer_id VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  currency VARCHAR(8) DEFAULT 'INR',
  subtotal_amount NUMERIC(12, 2),
  discount_amount NUMERIC(12, 2) DEFAULT 0,
  wallet_discount_amount NUMERIC(12, 2) DEFAULT 0,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2),
  payable_amount NUMERIC(12, 2) DEFAULT 0,
  coupon_code VARCHAR(64),
  tax_breakup JSONB DEFAULT '{}',
  shipping_address JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_status ON orders(status);
```

#### **order_items Table**
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL,
  seller_id VARCHAR(64) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12, 2),
  line_total NUMERIC(12, 2)
);

-- Indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_seller_id ON order_items(seller_id);
```

#### **payments Table**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id VARCHAR(64) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  amount NUMERIC(12, 2),
  currency VARCHAR(8) DEFAULT 'INR',
  transaction_reference VARCHAR(128),
  provider_order_id VARCHAR(128),
  provider_payment_id VARCHAR(128),
  verification_method VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  verified_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_buyer_id ON payments(buyer_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
```

#### **seller_kyc & user_kyc Tables**
```sql
CREATE TABLE seller_kyc (
  id UUID PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL UNIQUE,
  pan_number VARCHAR(16) NOT NULL,
  gst_number VARCHAR(32),
  aadhaar_number VARCHAR(16),
  legal_name VARCHAR(120) NOT NULL,
  business_type VARCHAR(64),
  verification_status VARCHAR(64) NOT NULL,
  documents JSONB DEFAULT '{}',
  reviewed_by VARCHAR(64),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seller_kyc_status ON seller_kyc(verification_status);

-- Similar structure for user_kyc
```

#### **wallets & wallet_transactions Tables**
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE,
  available_balance NUMERIC(12, 2) DEFAULT 0,
  locked_balance NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL, -- credit|debit
  status VARCHAR(32) NOT NULL, -- held|completed|released
  amount NUMERIC(12, 2),
  reference_type VARCHAR(64),
  reference_id VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id, created_at DESC);
```

#### **Advanced Finance & Compliance Tables**
```sql
CREATE TABLE tax_invoices (
  id UUID PRIMARY KEY,
  invoice_number VARCHAR(64) UNIQUE NOT NULL,
  order_id UUID NOT NULL,
  buyer_id VARCHAR(64) NOT NULL,
  taxable_amount NUMERIC(12, 2) DEFAULT 0,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  cgst_amount NUMERIC(12, 2) DEFAULT 0,
  sgst_amount NUMERIC(12, 2) DEFAULT 0,
  igst_amount NUMERIC(12, 2) DEFAULT 0,
  tcs_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  currency VARCHAR(8) DEFAULT 'INR',
  tax_mode VARCHAR(32) NOT NULL,
  gstin_marketplace VARCHAR(32),
  gstin_seller VARCHAR(32),
  place_of_supply VARCHAR(64),
  issued_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tax_ledger_entries (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  invoice_id UUID,
  entry_type VARCHAR(32) NOT NULL,
  tax_component VARCHAR(16) NOT NULL, -- cgst|sgst|igst|tcs
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(8) DEFAULT 'INR',
  reference_type VARCHAR(32) NOT NULL,
  reference_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_payouts (
  id UUID PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  gross_amount NUMERIC(12, 2) NOT NULL,
  commission_amount NUMERIC(12, 2) DEFAULT 0,
  processing_fee_amount NUMERIC(12, 2) DEFAULT 0,
  tax_withheld_amount NUMERIC(12, 2) DEFAULT 0,
  net_payout_amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(8) DEFAULT 'INR',
  status VARCHAR(32) DEFAULT 'scheduled', -- scheduled|processing|paid|failed
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL,
  key_name VARCHAR(120) NOT NULL,
  key_prefix VARCHAR(32) NOT NULL,
  key_hash TEXT NOT NULL,
  scopes JSONB DEFAULT '[]',
  status VARCHAR(16) DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL,
  endpoint_url TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  event_types JSONB DEFAULT '[]',
  status VARCHAR(16) DEFAULT 'active',
  retry_policy JSONB DEFAULT '{"maxRetries":5}',
  last_delivery_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feature_flag_rollouts (
  id UUID PRIMARY KEY,
  flag_key VARCHAR(120) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0,
  target_rules JSONB DEFAULT '{}',
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **outbox_events Table** (Transactional Outbox Pattern)
```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  event_name VARCHAR(128) NOT NULL,
  aggregate_id VARCHAR(64),
  version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) DEFAULT 'pending', -- pending|published|failed
  processed_at TIMESTAMPTZ,
  last_error TEXT
);

CREATE INDEX idx_outbox_events_status_occurred_at ON outbox_events(status, occurred_at);
```

#### **Enterprise Ops Additions (Migration `003-enterprise-ops-and-logistics`)**
```sql
-- Idempotency and duplicate protection
idempotency_keys(scope, idempotency_key, request_hash, resource_id, response_body, expires_at)

-- Logistics and serviceability
shipping_zones(zone_code, zone_name, states, active)
shipping_rates(zone_code, shipping_mode, weight_min_grams, weight_max_grams, base_fee, per_kg_fee, cod_fee)
pincode_serviceability(pincode, city, state, zone_code, serviceable, cod_available)
delivery_exclusions(pincode, reason_code, active)
e_way_bill_details(order_id, e_way_bill_number, status, valid_from, valid_until)

-- Gifting
gift_wrap_options(product_id, seller_id, wrap_name, wrap_fee, active)
gift_messages(order_id, buyer_id, recipient_name, message, status)

-- Communication operations telemetry
bulk_email_campaigns(campaign_name, segment_filter, subject, template_key, status, scheduled_at)
email_opens_clicks(campaign_id, recipient_email, event_type, message_id, occurred_at)
push_notification_tokens(user_id, device_id, platform, token, active)
sms_logs(provider, message_type, recipient_phone, provider_message_id, delivery_status, cost_amount)
```

#### **Subscription & Platform Fee Additions (Migration `004-subscriptions-and-platform-fees`)**
```sql
platform_subscription_plans(plan_code, target_roles, feature_flags, monthly_price, yearly_price, active)
platform_subscriptions(user_id, user_role, plan_id, billing_cycle, status, starts_at, ends_at)
platform_subscription_transactions(subscription_id, amount, provider, transaction_status, paid_at)

-- Orders now persist platform fee details computed during checkout
orders.platform_fee_amount NUMERIC(12,2) DEFAULT 0
orders.platform_fee_breakup JSONB DEFAULT '{}'
```

#### **MongoDB Enterprise Collection Additions (Phase-1)**
```javascript
// Added models and seed data
categorytrees         // hierarchical category metadata with schema hints
productfamilies       // parent grouping for multi-variant products
productvariants       // SKU-level variant inventory + attributes
productreviews        // review feed with helpful vote counters
```

---

## **3. API ENDPOINTS AND FLOWS**

### **API Base URL**: `/api/v1`

### **Authentication Endpoints**

#### `POST /auth/register`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePass123",
    "phone": "+919876543210",
    "role": "buyer|seller",
    "profile": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "referralCode": "REFERRER123" // optional
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "data": {
      "user": {...},
      "accessToken": "jwt_token",
      "refreshToken": "jwt_refresh_token",
      "expiresIn": "15m"
    }
  }
  ```
- **Flow**:
  1. Validate referral code (if provided)
  2. Hash password with bcryptjs
  3. Create user in MongoDB
  4. Create wallet in PostgreSQL
  5. Apply referral rewards
  6. Publish `AUTH_USER_REGISTERED_V1` event
  7. Return JWT tokens

#### `POST /auth/login`
- **Request**: `{ "email": "user@example.com", "password": "securePass123" }`
- **Response**: `200 OK` with tokens
- **Rate Limited**: Yes (auth-specific rate limit)

#### `POST /auth/social`
- **Request**:
  ```json
  {
    "provider": "google|firebase",
    "idToken": "verified_id_token",
    "role": "buyer|seller",
    "referralCode": "REFERRER123" // optional
  }
  ```
- **Flow**:
  1. Verify token with Google/Firebase
  2. Check/create user account
  3. Link provider to account
  4. Publish domain event
  5. Return tokens

#### `POST /auth/refresh`
- **Request**: `{ "refreshToken": "jwt_refresh_token" }`
- **Response**: `200 OK` with new access token

### **User Endpoints**

#### `GET /users/me`
- **Authentication**: Required (JWT)
- **Authorization**: Any authenticated user
- **Response**: `200 OK` User profile object

#### `PATCH /users/me`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "profile": {
      "firstName": "Jane",
      "lastName": "Smith",
      "avatarUrl": "https://..."
    }
  }
  ```
- **Response**: `200 OK` Updated user

#### `POST /users/me/kyc`
- **Authentication**: Required
- **Authorization Capability**: `USER_KYC_SUBMIT`
- **Request Body**:
  ```json
  {
    "legalName": "John Doe",
    "panNumber": "ABCDE1234F",
    "aadhaarNumber": "123456789012",
    "documents": {...}
  }
  ```
- **Response**: `201 Created` KYC record
- **Event**: `USER_KYC_SUBMITTED_V1`

#### `PATCH /users/:userId/kyc/review`
- **Authentication**: Required
- **Authorization Capability**: `KYC_REVIEW`
- **Request Body**:
  ```json
  {
    "status": "verified|rejected",
    "rejectionReason": "Optional reason"
  }
  ```
- **Response**: `200 OK`
- **Event**: `KYC_STATUS_UPDATED_V1`

### **Product Endpoints**

#### `GET /products`
- **Query Parameters**: `{ "page": 1, "limit": 20, "category": "electronics", "status": "active" }`
- **Default Visibility**: Returns only `active` products if `status` is not explicitly passed
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "product_id",
        "title": "iPhone 15",
        "price": 79999,
        "mrp": 89999,
        "gstRate": 18,
        "stock": 50,
        "reservedStock": 5,
        "rating": 4.5,
        ...
      }
    ],
    "pagination": {...}
  }
  ```
- **Caching**: 60 seconds (Redis)

#### `GET /products/search`
- **Query**: `{ "q": "iphone", "category": "electronics" }`
- **Search Engine**: Elasticsearch
- **Response**: Array of matching products

#### `GET /products/:productId`
- **Response**: `200 OK` Single product details

#### `POST /products`
- **Authentication**: Required
- **Authorization Capability**: `CATALOG_MANAGE`
- **Request Body**:
  ```json
  {
    "title": "New Product",
    "description": "Product description",
    "price": 9999,
    "mrp": 12999,
    "gstRate": 18,
    "category": "electronics",
    "stock": 100,
    "images": ["url1", "url2"],
    "attributes": {...}
  }
  ```
- **Response**: `201 Created`
- **Seller Workflow**: Seller-created products are saved as `pending_approval`
- **Action**: Indexes product in Elasticsearch only when status is `active`

#### `PATCH /products/:productId/review`
- **Authentication**: Required
- **Authorization Capability**: `CATALOG_REVIEW` (admin via wildcard capability)
- **Request Body**:
  ```json
  {
    "status": "active|inactive|rejected",
    "rejectionReason": "Optional reason",
    "checklist": {
      "titleVerified": true,
      "categoryVerified": true,
      "complianceVerified": true,
      "mediaVerified": true
    }
  }
  ```
- **Response**: `200 OK`
- **Action**:
  - Activates and indexes approved products
  - Removes rejected/inactive products from Elasticsearch index

### **Cart Endpoints**

#### `GET /carts/me`
- **Authentication**: Required
- **Response**: `200 OK`
  ```json
  {
    "userId": "user_id",
    "items": [
      {
        "productId": "prod_id",
        "quantity": 2,
        "price": 9999
      }
    ],
    "wishlist": ["prod_id1", "prod_id2"]
  }
  ```

#### `PUT /carts/me`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "items": [
      { "productId": "prod_id", "quantity": 2, "price": 9999 }
    ],
    "wishlist": ["prod_id1"]
  }
  ```
- **Response**: `200 OK` Updated cart

### **Order Endpoints**

#### `GET /orders/me`
- **Authentication**: Required
- **Authorization Capability**: `ORDER_SELF`
- **Response**: `200 OK` User's orders

#### `POST /orders`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "items": [
      {
        "productId": "prod_id",
        "quantity": 2,
        "sellerId": "seller_id"
      }
    ],
    "couponCode": "SAVE50", // optional
    "walletAmount": 500, // optional
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Bangalore",
      "state": "KARNATAKA",
      "zipcode": "560001"
    },
    "currency": "INR"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "orderId": "order_id",
    "status": "pending_payment|confirmed",
    "subtotalAmount": 19998,
    "discountAmount": 1000,
    "taxAmount": 3600,
    "walletDiscountAmount": 500,
    "platformFeeAmount": 180.00,
    "totalAmount": 23598,
    "payableAmount": 23098,
    "taxBreakup": {...}
  }
  ```
- **Flow**:
  1. Validate & price items (PricingService)
  2. Calculate tax (CGST/SGST or IGST based on state)
  3. Reserve inventory (InventoryService)
  4. Hold wallet amount (WalletService)
  5. Create order in PostgreSQL with outbox event
  6. Publish `ORDER_CREATED_V1` event
  7. If payable_amount ≤ 0, auto-confirm order

**Order Status Transitions**:
```
pending_payment → payment_failed → cancelled
pending_payment → confirmed → packed → shipped → delivered
confirmed → return_requested → returned
Any order can be cancelled if in (pending_payment, payment_failed)
Seller/Admin can update fulfillment states (packed, shipped, fulfilled)
```

#### `PATCH /orders/:orderId/status`
- **Authentication**: Required
- **Request Body**: `{ "status": "packed|shipped|delivered|cancelled|return_requested|returned" }`
- **Authorization**: Based on status transition rules
- **Response**: `200 OK` Updated order
- **Event**: `ORDER_STATUS_UPDATED_V1`

### **Payment Endpoints**

#### `POST /payments/initiate`
- **Authentication**: Required
- **Authorization Capability**: `PAYMENT_SELF`
- **Request Body**:
  ```json
  {
    "orderId": "order_id",
    "provider": "razorpay",
    "currency": "INR",
    "notes": {...}
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "paymentId": "payment_id",
    "status": "initiated",
    "provider": "razorpay",
    "checkout": {
      "orderId": "razorpay_order_id",
      "key": "razorpay_key_id"
    }
  }
  ```
- **Flow**:
  1. Verify order exists and requires payment
  2. Call Razorpay API to create order
  3. Store payment record in PostgreSQL with outbox event
  4. Return checkout details
  5. Client completes payment in Razorpay modal
  6. Razorpay calls webhook with payment result

#### `POST /payments/verify`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "orderId": "order_id",
    "provider": "razorpay",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_order_id": "order_xxx",
    "razorpay_signature": "signature_xxx"
  }
  ```
- **Response**: `200 OK` Verified payment
- **Event**: `PAYMENT_VERIFIED_V1`
- **Handler Actions**:
  - Commit inventory reservation
  - Capture wallet amount
  - Update order status to confirmed

#### `POST /payments/webhooks/razorpay`
- **Authentication**: None
- **Signature Verification**: Razorpay webhook secret HMAC-SHA256
- **Webhook Events Handled**:
  - `payment.captured`: Update payment to CAPTURED, trigger inventory commit
  - `payment.failed`: Update payment to FAILED, release inventory & wallet
- **Response**: `200 OK` `{ "acknowledged": true }`

#### `GET /payments/me`
- **Authentication**: Required
- **Response**: `200 OK` User's payments

### **Pricing/Coupon Endpoints**

#### `GET /pricing/coupons`
- **Authentication**: Required
- **Authorization Capability**: `ORDER_MANAGE`
- **Response**: `200 OK` List of active coupons

#### `POST /pricing/coupons`
- **Authentication**: Required
- **Authorization Capability**: `ORDER_MANAGE`
- **Request Body**:
  ```json
  {
    "code": "SAVE50",
    "type": "percentage|fixed",
    "value": 50,
    "minOrderAmount": 100,
    "maxDiscountAmount": 500,
    "usageLimit": 1000,
    "startsAt": "2024-01-01T00:00:00Z",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
  ```
- **Response**: `201 Created`

### **Wallet Endpoints**

#### `GET /wallets/me`
- **Authentication**: Required
- **Authorization Capability**: `WALLET_SELF`
- **Response**: `200 OK`
  ```json
  {
    "wallet": {
      "availableBalance": 5000.00,
      "lockedBalance": 1000.00
    },
    "transactions": [
      {
        "id": "txn_id",
        "type": "credit|debit",
        "status": "held|completed|released",
        "amount": 500,
        "referenceType": "order|referral",
        "referenceId": "ref_id",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
  ```

### **Seller Endpoints**

#### `POST /sellers/kyc`
- **Authentication**: Required
- **Authorization Capability**: `SELLER_KYC_SUBMIT`
- **Request Body**:
  ```json
  {
    "panNumber": "ABCDE1234F",
    "gstNumber": "27AABCU1234F1Z5",
    "legalName": "Business Name",
    "businessType": "individual|partnership|company",
    "documents": {
      "panCertificate": "url",
      "gstCertificate": "url"
    }
  }
  ```
- **Response**: `201 Created` KYC record
- **Event**: `SELLER_KYC_SUBMITTED_V1`

#### `PATCH /sellers/:sellerId/kyc/review`
- **Authentication**: Required
- **Authorization Capability**: `KYC_REVIEW`
- **Request Body**: `{ "status": "verified|rejected", "rejectionReason": "..." }`
- **Response**: `200 OK`
- **Event**: `KYC_STATUS_UPDATED_V1`

#### `PATCH /sellers/me/profile`
- **Authentication**: Required
- **Authorization Capability**: `SELLER_PROFILE_MANAGE`
- **Request Body**: Seller store profile, support contacts, pickup address, onboarding checklist
- **Response**: `200 OK`
- **Behavior**: Auto-updates onboarding progression and GST verification marker from seller KYC

#### `PATCH /sellers/me/settings`
- **Authentication**: Required
- **Authorization Capability**: `SELLER_PROFILE_MANAGE`
- **Request Body**:
  ```json
  {
    "autoAcceptOrders": false,
    "handlingTimeHours": 24,
    "returnWindowDays": 7,
    "ndrResponseHours": 24,
    "shippingModes": ["standard", "express"],
    "payoutSchedule": "weekly"
  }
  ```
- **Response**: `200 OK`

#### `GET /sellers/me/dashboard`
- **Authentication**: Required
- **Authorization Capability**: `SELLER_DASHBOARD_VIEW`
- **Query**: `fromDate`, `toDate` (ISO, optional; defaults to last 30 days)
- **Response**: `200 OK`
- **Includes**: Onboarding status, KYC status, GMV, delivered revenue, cancellation/return counts, top products, recent orders

### **Admin Control Endpoints**

#### `GET /admin/dashboard/overview`
- **Authentication**: Required (admin)
- **Response**: Marketplace KPIs (users, sellers, catalog, orders, GMV, collections)

#### `GET /admin/vendors`
- **Authentication**: Required (admin)
- **Query**: `q`, `status`, `page`, `limit`
- **Response**: Seller onboarding/compliance list

#### `PATCH /admin/vendors/:sellerId/status`
- **Authentication**: Required (admin)
- **Request Body**: `{ "accountStatus": "active|suspended" }`
- **Response**: Updated seller account state

#### `GET /admin/products/moderation-queue`
- **Authentication**: Required (admin)
- **Query**: `status`, `category`, `page`, `limit`
- **Response**: Product moderation queue

#### `PATCH /admin/products/:productId/moderate`
- **Authentication**: Required (admin)
- **Request Body**: `{ "status": "active|inactive|rejected", "rejectionReason": "...", "checklist": {...} }`
- **Response**: Moderated product

#### `GET /admin/orders`
- **Authentication**: Required (admin)
- **Query**: `status`, `fromDate`, `toDate`, `limit`, `offset`

#### `GET /admin/payments`
- **Authentication**: Required (admin)
- **Query**: `status`, `provider`, `fromDate`, `toDate`, `limit`, `offset`

#### `POST /admin/payouts`
- **Authentication**: Required (admin)
- **Request Body**: Seller payout schedule payload with gross/commission/tax/net breakup
- **Response**: Created payout schedule

#### `GET /admin/payouts`
- **Authentication**: Required (admin)
- **Query**: `sellerId`, `status`, `fromDate`, `toDate`, `limit`, `offset`

#### `GET /admin/tax/reports`
- **Authentication**: Required (admin)
- **Query**: `fromDate`, `toDate`, `taxComponent`, `limit`, `offset`
- **Response**: GST component-wise ledger summary

#### `POST /admin/tax/orders/:orderId/invoice`
- **Authentication**: Required (admin)
- **Response**: Generated GST invoice + ledger entries

#### `POST /admin/platform/api-keys`
- **Authentication**: Required (admin)
- **Request Body**: `keyName`, `scopes`, optional `ownerId`, optional `expiresAt`
- **Response**: Created API key metadata + one-time raw key

#### `GET /admin/platform/api-keys`
- **Authentication**: Required (admin)
- **Query**: `ownerId`, `status`, `limit`, `offset`

#### `POST /admin/platform/webhooks`
- **Authentication**: Required (admin)
- **Request Body**: `endpointUrl`, `secret`, `eventTypes`, optional `retryPolicy`
- **Response**: Created webhook subscription

#### `GET /admin/platform/webhooks`
- **Authentication**: Required (admin)
- **Query**: `ownerId`, `status`, `limit`, `offset`

#### `PUT /admin/platform/feature-flags`
- **Authentication**: Required (admin)
- **Request Body**: `flagKey`, `enabled`, `rolloutPercentage`, optional `targetRules`
- **Response**: Upserted feature flag record

#### `GET /admin/platform/feature-flags`
- **Authentication**: Required (admin)
- **Query**: `enabled`, `limit`, `offset`

#### `POST /admin/platform/subscription-plans`
- **Authentication**: Required (admin)
- **Request Body**: `planCode`, `title`, `targetRoles`, `featureFlags`, `monthlyPrice`, `yearlyPrice`, `currency`
- **Response**: Created platform subscription plan

#### `GET /admin/platform/subscription-plans`
- **Authentication**: Required (admin)
- **Query**: `active`, `limit`, `offset`

#### `GET /admin/platform/subscription-plans/:planId`
- **Authentication**: Required (admin)
- **Response**: Single subscription plan

#### `PATCH /admin/platform/subscription-plans/:planId`
- **Authentication**: Required (admin)
- **Response**: Updated subscription plan

#### `DELETE /admin/platform/subscription-plans/:planId`
- **Authentication**: Required (admin)
- **Behavior**: Soft delete (`active=false`)

#### `GET /admin/platform/subscriptions`
- **Authentication**: Required (admin)
- **Query**: `status`, `userRole`, `limit`, `offset`
- **Response**: Purchased user/seller platform subscriptions

#### `PATCH /admin/platform/subscriptions/:subscriptionId/status`
- **Authentication**: Required (admin)
- **Request Body**: `{ \"status\": \"active|paused|cancelled\" }`
- **Response**: Updated subscription status

#### `POST /admin/platform/fee-config`
- **Authentication**: Required (admin)
- **Request Body**: `category`, `commissionPercent`, `fixedFeeAmount`, `closingFeeAmount`, `effectiveFrom`, `effectiveTo`
- **Response**: Created platform fee rule

#### `GET /admin/platform/fee-config`
- **Authentication**: Required (admin)
- **Query**: `active`, `category`, `limit`, `offset`

#### `GET /admin/platform/fee-config/:configId`
- **Authentication**: Required (admin)

#### `PATCH /admin/platform/fee-config/:configId`
- **Authentication**: Required (admin)
- **Response**: Updated platform fee rule

#### `DELETE /admin/platform/fee-config/:configId`
- **Authentication**: Required (admin)
- **Behavior**: Soft delete (`active=false`)

#### `GET /admin/analytics/realtime`
- **Authentication**: Required (admin)
- **Query**: `hours` (1-168, default 24)
- **Response**: Realtime KPIs (orders, GMV, captured payments, new users) for rolling window

#### `GET /admin/returns/analytics`
- **Authentication**: Required (admin)
- **Query**: optional `fromDate`, `toDate`
- **Response**: Return summary (requested/approved/rejected/refund totals) + reason breakdown

#### `GET /admin/chargebacks`
- **Authentication**: Required (admin)
- **Query**: `status`, `fromDate`, `toDate`, `limit`, `offset`
- **Response**: Chargeback list with representment lifecycle status

#### `GET /admin/system/health`
- **Authentication**: Required (admin)
- **Response**: Detailed dependency health checks (PostgreSQL, Redis, MongoDB)

#### `GET /admin/system/queues`
- **Authentication**: Required (admin)
- **Response**: Queue depth/status counters (`waiting`, `active`, `completed`, `failed`, `delayed`, `paused`)

#### `POST /admin/system/queues/:queueName/pause`
- **Authentication**: Required (admin)
- **Path Param**: `queueName` (`notifications`)
- **Response**: Queue paused confirmation

#### `POST /admin/system/queues/:queueName/resume`
- **Authentication**: Required (admin)
- **Path Param**: `queueName` (`notifications`)
- **Response**: Queue resumed confirmation

#### `GET /admin/system/dead-letter`
- **Authentication**: Required (admin)
- **Query**: `status`, `eventType`, `limit`, `offset`
- **Response**: Dead-letter event inventory

#### `POST /admin/system/dead-letter/:eventId/retry`
- **Authentication**: Required (admin)
- **Behavior**: Requeues dead-letter payload into `outbox_events` and marks event `retry_scheduled`

#### `POST /admin/system/dead-letter/:eventId/discard`
- **Authentication**: Required (admin)
- **Request Body**: optional `{ "reason": "..." }`
- **Behavior**: Marks dead-letter event as `discarded`

### **Tax Endpoints**

#### `POST /tax/orders/:orderId/invoice`
- **Authentication**: Required (admin)
- **Response**: GST-compliant invoice generation for order

#### `GET /tax/reports`
- **Authentication**: Required (admin)
- **Response**: Tax component summary report

### **Notification Endpoints**

#### `GET /notifications/me`
- **Authentication**: Required
- **Response**: `200 OK` User's notifications

#### `POST /notifications`
- **Authentication**: Required
- **Authorization Capability**: `NOTIFICATION_MANAGE`
- **Request Body**:
  ```json
  {
    "title": "Notification Title",
    "message": "Message",
    "userId": "user_id"
  }
  ```
- **Response**: `201 Created`

### **Analytics Endpoints**

#### `GET /analytics`
- **Authentication**: Required
- **Authorization Capability**: `ANALYTICS_VIEW`
- **Response**: `200 OK` Event logs

#### `POST /analytics/events`
- **Authentication**: Required
- **Authorization Capability**: `ANALYTICS_VIEW`
- **Request Body**:
  ```json
  {
    "event": "page_view",
    "data": {...}
  }
  ```
- **Response**: `201 Created`

### **Subscription Endpoints**

#### `GET /subscriptions/plans`
- **Authentication**: Optional
- **Response**: Active plans for buyer/seller platform subscriptions

#### `POST /subscriptions/purchase`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "planId": "uuid_plan_id",
    "billingCycle": "monthly|yearly",
    "metadata": {}
  }
  ```
- **Response**: `201 Created` subscription record

#### `GET /subscriptions/me`
- **Authentication**: Required
- **Response**: Logged-in user subscriptions with plan details

#### `PUT /subscriptions/:subscriptionId/pause`
- **Authentication**: Required

#### `PUT /subscriptions/:subscriptionId/resume`
- **Authentication**: Required

#### `PUT /subscriptions/:subscriptionId/cancel`
- **Authentication**: Required

#### Admin Mirror Endpoints under `/subscriptions/admin/*`
- **Authentication**: Required (admin role)
- **Purpose**: Feature-parity admin management via the subscription module namespace.
- **Routes**:
  - `POST /subscriptions/admin/plans`
  - `GET /subscriptions/admin/plans`
  - `GET /subscriptions/admin/plans/:planId`
  - `PATCH /subscriptions/admin/plans/:planId`
  - `DELETE /subscriptions/admin/plans/:planId`
  - `GET /subscriptions/admin/subscriptions`
  - `PATCH /subscriptions/admin/subscriptions/:subscriptionId/status`
  - `POST /subscriptions/admin/platform-fee-config`
  - `GET /subscriptions/admin/platform-fee-config`
  - `GET /subscriptions/admin/platform-fee-config/:configId`
  - `PATCH /subscriptions/admin/platform-fee-config/:configId`
  - `DELETE /subscriptions/admin/platform-fee-config/:configId`

### **Enterprise Phase-1 Planned Endpoints** (Documented for next implementation sprint)

#### Buyer
- `POST /orders/:orderId/return` - Initiate return request (`return_requests`)
- `GET /returns/:returnId/tracking` - Return status + refund linkage
- `POST /orders/:orderId/cancel-item` - Partial cancellation with reason code
- `GET /recommendations/trending` - Category-level trending product feed
- `POST /reviews` - Submit product review with media
- `GET /reviews/product/:productId` - Paginated product reviews

#### Seller
- `GET /sellers/me/inventory` - Inventory listing with variant awareness
- `POST /sellers/me/inventory/bulk-update` - Bulk stock/price updates
- `GET /sellers/me/inventory/low-stock` - Threshold-based stock alerts
- `GET /sellers/me/settlements` - Payout and settlement history view

#### Admin/System
- `GET /admin/analytics/funnel` - Conversion drop-off analysis by stage
- `GET /admin/analytics/cohorts` - Buyer retention and repeat behavior cohorts
- `GET /admin/fraud/detections` - Fraud queue with risk scoring and case state
- `POST /admin/fraud/review/:detectionId` - Fraud case decisioning workflow
- `GET /admin/audit-logs` - Privileged action timeline with export filters

#### Platform Developers
- `GET /platform/webhooks` / `POST /platform/webhooks` / `DELETE /platform/webhooks/:webhookId`
- `GET /platform/api-keys` / `POST /platform/api-keys` / `DELETE /platform/api-keys/:keyId`
- `GET /platform/rate-limits` - Rate and quota visibility

---

## **4. MODULES AND SERVICES**

### **Module Structure Template** (Every module follows this pattern)
```
module/
├── controllers/      # HTTP request handlers
├── services/        # Business logic
├── repositories/    # Data access layer
├── models/          # Data schemas (Mongoose or direct SQL)
├── dtos/            # Data transfer objects / responses
├── routes/          # Route definitions
└── validation/      # Input validation schemas (Joi/Zod)
```

### **Core Modules**

#### **1. AUTH Module**
- **Database**: MongoDB (users, refresh sessions)
- **Key Services**:
  - `register()`: Create user, initialize wallet, publish domain event
  - `login()`: Validate credentials, rotate refresh sessions
  - `socialLogin()`: Firebase/Google OAuth verification, auto-account creation
  - `refreshToken()`: Validate refresh token, issue new access token
- **Middleware**: `authRateLimit` (stricter for login/refresh)
- **Security Events**: Login success/failed, social login success/failed
- **Tokens**:
  - Access Token: JWT, 15 minutes (configurable)
  - Refresh Token: JWT, 7 days (configurable)
  - Session Rotation: Invalidates old refresh tokens on rotation

#### **2. USER Module**
- **Database**: MongoDB (user profiles), PostgreSQL (KYC, wallet references)
- **Key Services**:
  - `getMe()`: Fetch user profile
  - `updateMe()`: Update profile fields
  - `submitKyc()`: User KYC submission (PAN, Aadhaar, documents)
  - `reviewKyc()`: Admin KYC review and verification
- **KYC Statuses**: draft → submitted → under_review → verified/rejected
- **Events**: `USER_KYC_SUBMITTED_V1`, `KYC_STATUS_UPDATED_V1`

#### **3. PRODUCT Module**
- **Database**: MongoDB (products), Elasticsearch (search index)
- **Key Services**:
  - `createProduct()`: Create product with approval workflow
  - `listProducts()`: Paginated listing with caching (60s)
  - `getProduct()`: Single product details
  - `searchProducts()`: Full-text search on Elasticsearch
  - `reviewProduct()`: Admin moderation (activate/reject/inactivate)
- **Catalog Moderation**:
  - Seller-created listings are pushed to `pending_approval`
  - Only `active` listings are indexed and shown by default
- **Search Fields**: title^3 (boosted), category, description
- **GST Calculation**: Based on product GST rate
- **Stock Management**: `stock - reservedStock = availableStock`

#### **4. CART Module**
- **Database**: MongoDB
- **Key Services**:
  - `getMyCart()`: Retrieve user's cart
  - `upsertMyCart()`: Add/update/remove items and wishlist
- **Cart Structure**: Items array + wishlist array

#### **5. ORDER Module**
- **Database**: PostgreSQL (orders, order_items), MongoDB (references)
- **Key Services**:
  - `createOrder()`: Complex order creation with pricing, inventory, wallet
  - `listMyOrders()`: User's orders with filtering
  - `updateOrderStatus()`: Status transitions with authorization checks
- **Responsibilities**:
  - Server-side order pricing (prevents client-side manipulation)
  - Tax calculation (CGST/SGST vs IGST based on state)
  - Inventory reservation (20-minute window for payment)
  - Wallet hold (locked until payment confirmation)
  - Coupon application
  - Outbox event creation (transactional consistency)
- **Order Lifecycle**:
  ```
  pending_payment (payable > 0)
    ├─→ payment_failed (on payment failure)
    │   └─→ cancelled (by buyer)
    └─→ confirmed (on successful payment)
        ├─→ packed (by seller)
        ├─→ shipped (by seller)
        ├─→ delivered (by buyer/system)
        │   └─→ return_requested (by buyer)
        │       └─→ returned (confirmed return)
        └─→ fulfilled (all items delivered)

  confirmed (payable ≤ 0, auto-confirmed)
    ├─→ cancelled (within time window)
    └─→ packed → shipped → delivered
  ```

#### **6. PAYMENT Module**
- **Database**: PostgreSQL
- **Payment Provider**: Razorpay (extensible for Stripe, CoD)
- **Key Services**:
  - `initiatePayment()`: Create Razorpay order, store payment record
  - `verifyPayment()`: Verify signature, update payment, trigger inventory/wallet
  - `handleWebhook()`: Razorpay webhook processing
  - `listPayments()`: User's payments
- **Payment Statuses**: initiated → authorized → captured/failed → refunded
- **Transactional Outbox**: Ensures payment events propagate reliably

#### **7. INVENTORY Module**
- **Database**: MongoDB (reservation records)
- **Key Services**:
  - `reserveForOrder()`: Reserve items for 20-minute checkout window
  - `commitForOrder()`: Convert reservation to committed (post-payment)
  - `releaseForOrder()`: Release reservation on payment failure/cancellation
  - `restockForOrder()`: Restock items on return
- **States**: reserved → committed / released → restocked
- **Events**: `INVENTORY_RESERVED_V1`, `INVENTORY_COMMITTED_V1`, `INVENTORY_RELEASED_V1`

#### **8. WALLET Module**
- **Database**: PostgreSQL (wallets, transactions)
- **Key Services**:
  - `ensureWallet()`: Create wallet for new user
  - `getWalletSummary()`: Balance + transaction history
  - `credit()`: Add funds (referral rewards, refunds)
  - `hold()`: Lock funds for pending order
  - `capture()`: Convert held to debit (payment processed)
  - `release()`: Unlock held funds (order cancelled)
- **Wallet Structure**:
  - `availableBalance`: Ready to spend
  - `lockedBalance`: Held for pending orders
- **Transaction Types**: credit, debit
- **Transaction Statuses**: held, completed, released
- **Max Wallet Usage**: 30% of order value (configurable)
- **Events**: `WALLET_RESERVED_V1`, `WALLET_CAPTURED_V1`, `WALLET_RELEASED_V1`

#### **9. PRICING Module**
- **Database**: MongoDB (coupons), PostgreSQL (references)
- **Key Services**:
  - `priceOrder()`: Complex pricing calculation
    - Fetch products by ID
    - Calculate line totals
    - Apply coupon discount
    - Calculate tax (CGST/SGST for intra-state, IGST for inter-state)
    - Calculate wallet usage (max 30%)
    - Return itemized breakdown
  - `createCoupon()`: Create discount coupon
  - `listCoupons()`: Active coupons
  - `finalizeCouponUsage()`: Increment usage count
- **Tax Calculation**:
  ```javascript
  if (shippingState === businessState) {
    // Intra-state: CGST + SGST = 50% + 50% of GST
    taxAmount = taxableAmount * (gstRate / 100)
    cgst = taxAmount / 2
    sgst = taxAmount / 2
  } else {
    // Inter-state: Full IGST
    igst = taxableAmount * (gstRate / 100)
  }
  ```
- **Coupon Types**: percentage, fixed
- **Coupon Constraints**: minOrderAmount, maxDiscountAmount, usageLimit, expiry

#### **10. NOTIFICATION Module**
- **Database**: MongoDB (notifications)
- **Channels**: email, SMS, push (extensible)
- **Key Services**:
  - `createNotification()`: Create and enqueue notification
  - `listMyNotifications()`: User's notification history
- **Event Subscribers**:
  - `AUTH_USER_REGISTERED_V1` → Send welcome email
- **Queue System**: BullMQ (notifications queue)
- **Email Service**: Nodemailer templates
- **Events**: `NOTIFICATION_CREATED_V1`

#### **11. SELLER Module**
- **Database**: PostgreSQL (`seller_kyc`, order aggregation), MongoDB (`users.sellerProfile`, `users.sellerSettings`)
- **Key Services**:
  - `submitKyc()`: Seller KYC submission (PAN, GST, documents)
  - `reviewKyc()`: Admin verification
  - `updateProfile()`: Seller onboarding profile and pickup/support data
  - `updateSettings()`: Fulfillment/payout operations configuration
  - `getDashboard()`: Seller KPI dashboard and top-product analytics
- **KYC Fields**: PAN, GST Number, Aadhaar, Legal Name, Business Type, Documents
- **KYC Statuses**: draft → submitted → under_review → verified/rejected
- **Seller Analytics**: GMV, delivered revenue, cancellation and return counts, AOV, recent orders
- **Events**: `SELLER_KYC_SUBMITTED_V1`, `KYC_STATUS_UPDATED_V1`

#### **12. ANALYTICS Module**
- **Database**: MongoDB (analytics events)
- **Key Services**:
  - `trackEvent()`: Record business events
  - `listEvents()`: Retrieve event logs
- **Aggregation**: Ready for daily/monthly aggregation cron job
- **Event Tracking**: User actions, conversions, revenue metrics

#### **13. ADMIN Module**
- **Database**: MongoDB + PostgreSQL
- **Key Services**:
  - `getOverview()`: Marketplace KPI snapshot
  - `listVendors()` / `updateVendorStatus()`: Vendor lifecycle controls
  - `listProductModerationQueue()` / `moderateProduct()`: Catalog governance
  - `listOrders()` / `listPayments()`: Full operational oversight
  - `createPayout()` / `listPayouts()`: Settlement scheduling and tracking
  - `generateInvoice()` / `getTaxReport()`: Compliance operations

#### **14. TAX Module**
- **Database**: PostgreSQL (`tax_invoices`, `tax_ledger_entries`, `gst_filings`)
- **Key Services**:
  - `generateInvoice()`: GST invoice generation with CGST/SGST/IGST/TCS support
  - `getTaxReport()`: Component-wise tax ledger reporting
- **Tax Components**: CGST, SGST, IGST, TCS
- **Use Cases**: GSTR-8 preparation, audit trail, reconciliation

#### **15. PLATFORM OPERATIONS Module**
- **Database**: PostgreSQL (`api_keys`, `webhook_subscriptions`, `feature_flag_rollouts`, `config_change_history`)
- **Key Services**:
  - API key issuance and scope management
  - Webhook subscription management for ecosystem integrations
  - Feature flag rollouts with percentage targeting
  - Config change audit trail

#### **16. REFERRAL Module**
- **Database**: MongoDB (referral records)
- **Key Services**:
  - `resolveReferrer()`: Validate referral code
  - `rewardReferral()`: Issue rewards on signup
  - `rewardReferral()` (on purchase): Bonus rewards
- **Reward Structure**:
  - Referrer Bonus: ₹100 (configurable)
  - Referee Bonus: ₹50 (configurable)
  - Delivered via wallet credit
- **Events**: `REFERRAL_REWARDED_V1`

#### **17. SUBSCRIPTION & PLATFORM FEE Module**
- **Database**: PostgreSQL (`platform_subscription_plans`, `platform_subscriptions`, `platform_subscription_transactions`, `platform_fee_config`)
- **Key Services**:
  - `listPlans()` / `purchasePlan()`: buyer/seller plan discovery and purchase
  - `listMySubscriptions()`: self-service subscription visibility
  - `pauseSubscription()` / `resumeSubscription()` / `cancelSubscription()`
  - Admin CRUD: subscription plans, platform subscriptions, platform fee rules
- **Platform Fee Integration**:
  - Fee rules are fetched from `platform_fee_config` by product category (fallback `default`/`*`).
  - Checkout computes `platformFeeAmount` and persists:
    - `orders.platform_fee_amount`
    - `orders.platform_fee_breakup`
  - `totalAmount` and `payableAmount` include platform fee contribution.
- **Use Cases**:
  - Seller premium plans (ads credits, catalog boost, priority support)
  - Buyer premium plans (early access, loyalty multiplier, faster support)
  - Transaction-level marketplace fee governance per category

### **Enterprise Worker Backlog (Prioritized)**
- `settlement-calculator`: Weekly seller settlement computation.
- `payout-processor`: Scheduled payout execution with retry guardrails.
- `search-index-worker`: Reindex and repair Elasticsearch drift.
- `fraud-detection-worker`: Velocity/risk heuristics with alerting.
- `review-moderation-worker`: Review content scoring and moderation queue.
- `abandoned-cart-recovery`: Recovery nudges using campaign templates.
- `subscription-renewal-worker`: Generate subscription child orders.
- `coupon-expiry-worker`: Automatic coupon deactivation.
- `gift-card-expiry-worker`: Gift card expiry and notification handling.
- `analytics-aggregator`: Hourly and daily metrics rollups.
- `invoice-generator`: Background invoice and tax ledger generation.
- `e-way-bill-worker`: Automated E-way bill issuance and status updates.
- `backup-worker`: Automated backup orchestration and restore drills.
- `log-archiver`: Aging logs to cold storage for retention compliance.

### **Logistics Scope**
- Delivery execution is seller-managed by default in this platform version.
- Platform delivery orchestration (carrier assignment, zone rates, route control) is optional and can be enabled later.

---

## **5. INFRASTRUCTURE AND INTEGRATIONS**

### **5.1 MongoDB Client**
```javascript
- Connection: mongoose.connect(MONGO_URI)
- Collections: Users, Products, Carts, Notifications, Analytics, Coupons, Referrals, Inventory
- Connection Pooling: Automatic
- Indexes: Defined in schemas
```

### **5.2 PostgreSQL Client**
```javascript
- Connection Pool: pg.Pool (poolSize, idle timeout, etc.)
- Tables: Orders, Order Items, Payments, KYC records, Wallets, Transactions, Outbox
- Connection String: postgresql://user:pass@host:5432/db
- Transaction Support: ACID transactions for order creation
- Outbox Pattern: Ensures event delivery reliability
```

### **5.3 Redis Client** (`ioredis`)
```javascript
- Queue System: BullMQ workers (notifications, emails)
- Caching Layer: Product listings (60s TTL)
- Session Storage: Refresh token hashes
- Real-time Subscribers: Socket.IO room membership
```

### **5.4 Elasticsearch**
```javascript
- Index: "products"
- Fields Indexed: title, description, category
- Query Type: multi_match with field boosting
- Use Case: Product search functionality
- Initialization: On product creation
```

### **5.5 Socket.IO Real-time Updates**
```javascript
Authentication:
- JWT token verification on handshake
- Token from query or Authorization header

Rooms:
- user:{userId} - User-specific updates
- role:{role} - Role-based broadcasts (admin, seller)
- order:{orderId} - Order-specific updates

Emitted Events:
- order.status_updated → emitToOrder()
- payment.verified → emitToUser()
- notification.created → emitToUser()
- kyc.status_updated → emitToUser()

Client Example:
socket.on('connect')
socket.emit('join:order', orderId)
socket.on('order.status_updated', (data) => {...})
```

### **5.6 Razorpay Integration**
```javascript
Initialization:
- API Key ID & Secret from config
- Razorpay SDK v2.9.6

Order Creation:
- Amount in smallest unit (paise for INR)
- Receipt ID: unique identifier
- Notes: order metadata

Payment Verification:
- Signature verification: HMAC-SHA256(orderId|paymentId, secret)
- Multi-validation: amount, currency, status

Webhook Verification:
- Event: payment.captured, payment.failed
- Signature: HMAC-SHA256(body, webhookSecret)
- Payload: Entity with payment details

Error Handling:
- Retry on network failure
- Webhook resilience (idempotent processing)

Payment Statuses (Razorpay → App):
- created → initiated
- authorized/captured → captured
- failed → failed
- refunded → refunded
```

### **5.7 Firebase Authentication**
```javascript
Configuration:
- Project ID, Client Email, Private Key
- admin.initializeApp()

Token Verification:
- admin.auth().verifyIdToken(token)
- Validates signature, expiry
- Returns decoded token

Extracted Data:
- uid → providerUserId
- email, email_verified
- name (split into firstName, lastName)
- picture → avatarUrl
```

### **5.8 Google OAuth**
```javascript
Configuration:
- Multiple Google Client IDs (web, mobile, etc.)
- google-auth-library

Token Verification:
- oauth2Client.verifyIdToken({idToken, audience})
- Audience = Client ID
- Returns payload

Extracted Data:
- sub → providerUserId
- email, email_verified
- given_name, family_name
- picture → avatarUrl
```

### **5.9 Nodemailer (Email Service)**
```javascript
Configuration:
- SMTP host, port, secure flag
- Auth credentials (optional)
- Default from email

Transport:
- nodemailer.createTransport(smtpConfig)
- MailHog for development (port 1025)

Email Sending:
- sendMail({to, subject, html, text, from})
- Async operation
- Error handling & retry

Use Cases:
- Welcome email on registration
- Order confirmation
- Payment receipts
- Notification alerts
- KYC status updates
```

### **5.10 Cloudinary (File Storage)**
```javascript
Configuration:
- Cloud Name, API Key, API Secret
- cloudinary.config()

Upload:
- upload(filePath, options)
- Returns URL, public_id, secure_url
- Supports transformations & optimization

Use Cases:
- Product images
- User avatars
- KYC documents
- Receipt files

Abstract Storage Service:
- storageService.upload(filePath, options)
- Enables future migration to S3, GCS, etc.
```

### **5.11 BullMQ Queue System**
```javascript
Queue Creation:
- new Queue(name, { connection: redis })
- Default retry: 3 attempts
- Auto-cleanup: 1000 messages retained

Workers:
- new Worker(name, processor, { connection: redis })
- Concurrent processing
- Error handling & retry

Job Structure:
- Job ID
- Name (type identifier)
- Data (payload)
- State: waiting → active → completed/failed

Use Cases:
- Email notifications (welcome, order updates)
- Background processing
- Delayed jobs
- Job priorities

Queues:
- "notifications": Event-triggered email jobs
```

---

## **6. SECURITY AND MIDDLEWARE**

### **6.1 Authentication Middleware**
```javascript
authenticate(req, res, next)
- Extracts JWT from "Authorization: Bearer <token>"
- Verifies signature and expiry
- Attaches user to req.user
- Handles token refresh rotation
- Returns 401 on invalid/expired tokens
```

### **6.2 Authorization Middleware**
```javascript
authorizeCapability(capability)
- Checks if req.user.capabilities includes capability
- Supports role-based and capability-based access
- Returns 403 on insufficient permissions
```

### **6.3 Rate Limiting**
```javascript
Global Rate Limit:
- 300 requests per 15 minutes per IP
- Uses express-rate-limit with Redis store

Auth-Specific Rate Limit:
- 5 login attempts per 15 minutes per IP
- 10 refresh attempts per 15 minutes per IP
- Stricter limits for sensitive operations
```

### **6.4 Input Validation**
```javascript
Validation Libraries:
- Joi: Schema-based validation
- Zod: TypeScript-first validation (future migration)

Validation Middleware:
- validateRequest(schema)
- Sanitizes and validates request body/query/params
- Returns 400 with detailed error messages
- Prevents malicious input injection
```

### **6.5 Security Headers (Helmet)**
```javascript
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)
- Referrer-Policy: strict-origin-when-cross-origin
```

### **6.6 CORS Configuration**
```javascript
- Origin: Configurable (default: *)
- Methods: GET, POST, PUT, PATCH, DELETE
- Headers: Content-Type, Authorization
- Credentials: true (for cookies/auth headers)
```

### **6.7 Audit Logging**
```javascript
auditLog middleware:
- Logs all API requests
- Includes: method, url, userId, ip, userAgent, timestamp
- Stored in separate audit log file
- GDPR compliant (no sensitive data)
```

### **6.8 Additional Middleware Roadmap**
```javascript
idempotency       // de-duplicate order/payment/webhook retries via idempotency_keys
circuitBreaker    // graceful fallback for payment/SMS/email/search providers
requestId         // correlation IDs across logs, queues, and events
responseTime      // p95/p99 latency emission per endpoint
compression       // gzip/brotli for API payload efficiency
cacheControl      // explicit caching directives for read endpoints
etag              // conditional GET support for list/detail resources
pagination        // standardized pagination headers and metadata
userAgent         // parsed UA capture for analytics and risk scoring
geoIp             // inferred country/state/city for risk and tax hints
deviceFingerprint // optional fraud defense signal
csrf              // token enforcement where cookie-auth is used
xss/noSniff       // strengthened content and MIME protections
```

---

## **7. EVENT-DRIVEN ARCHITECTURE**

### **7.1 Domain Events**
```javascript
Event Structure:
{
  eventName: "DOMAIN_ENTITY_ACTION_V1",
  aggregateId: "entity_id",
  version: 1,
  payload: {...},
  occurredAt: "2024-01-15T10:30:00Z"
}
```

### **7.2 Event Bus (In-Memory)**
```javascript
- Simple pub/sub pattern
- Synchronous event handling
- Future: Replace with message queue (RabbitMQ, Kafka)
```

### **7.3 Outbox Pattern**
```javascript
- Events stored in PostgreSQL outbox_events table
- Transactional consistency with business data
- Background processor publishes events
- Reliable event delivery
- Idempotent processing
```

### **7.4 Event Handlers**
```javascript
Event Subscribers:
- AUTH_USER_REGISTERED_V1 → SendWelcomeEmailHandler
- ORDER_CREATED_V1 → ReserveInventoryHandler, HoldWalletHandler
- PAYMENT_VERIFIED_V1 → CommitInventoryHandler, CaptureWalletHandler
- ORDER_STATUS_UPDATED_V1 → SendOrderUpdateEmailHandler
- KYC_STATUS_UPDATED_V1 → SendKycStatusEmailHandler
```

---

## **8. DATA FLOWS**

### **8.1 User Registration Flow**
```
1. User submits registration form
2. Validate input (email uniqueness, password strength)
3. Hash password with bcryptjs
4. Create user document in MongoDB
5. Create wallet in PostgreSQL
6. Check referral code (if provided)
7. Credit referral rewards to wallets
8. Publish AUTH_USER_REGISTERED_V1 event
9. Send welcome email (async)
10. Return JWT tokens
```

### **8.2 Order Creation Flow**
```
1. User submits order request
2. Validate cart items and quantities
3. Fetch product details and prices
4. Calculate pricing (subtotal, discount, tax, wallet)
5. Reserve inventory (20-minute window)
6. Hold wallet amount (if used)
7. Create order in PostgreSQL (transaction)
8. Create outbox event for ORDER_CREATED_V1
9. If payable = 0, auto-confirm order
10. Return order details with payment requirement
```

### **8.3 Payment Flow**
```
1. User initiates payment for order
2. Create Razorpay order via API
3. Store payment record in PostgreSQL
4. Return checkout details to client
5. Client completes payment in Razorpay modal
6. Razorpay calls webhook with result
7. Verify webhook signature
8. Update payment status
9. If captured: commit inventory, capture wallet, update order to confirmed
10. If failed: release inventory, release wallet, update order to payment_failed
11. Publish PAYMENT_VERIFIED_V1 event
12. Send payment confirmation email
```

### **8.4 Referral Flow**
```
1. New user registers with referral code
2. Validate referral code exists and is active
3. Create user account
4. Credit referrer bonus (₹100) to referrer's wallet
5. Credit referee bonus (₹50) to new user's wallet
6. Create referral record
7. Publish REFERRAL_REWARDED_V1 event
8. Send referral reward notifications
```

---

## **9. DEPLOYMENT AND CONFIGURATION**

### **9.1 Environment Variables**
```bash
# Application
NODE_ENV=production
PORT=4000
APP_NAME=ecommerce
API_PREFIX=/api/v1

# Databases
MONGO_URI=mongodb://localhost:27017/ecommerce
POSTGRES_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_NODE=http://localhost:9200

# Authentication
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# OAuth
GOOGLE_CLIENT_IDS=client_id_1,client_id_2
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Payment
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=webhook_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
DEFAULT_FROM_EMAIL=noreply@yourapp.com

# File Storage
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_secret

# Business Config
BUSINESS_STATE=KARNATAKA
REFERRAL_REFERRER_BONUS=100
REFERRAL_REFEREE_BONUS=50
MAX_WALLET_USAGE_PER_ORDER_PERCENT=30
```

### **9.1.1 Enterprise Config Extensions**
```bash
# Idempotency / dedupe
IDEMPOTENCY_KEY_TTL=86400

# Currency / localization
DEFAULT_CURRENCY=INR
SUPPORTED_CURRENCIES=INR,USD,EUR,GBP
DEFAULT_LANGUAGE=en
SUPPORTED_LANGUAGES=en,hi,ta,te,bn,mr

# Tiered rate limits
RATE_LIMIT_PUBLIC=100
RATE_LIMIT_AUTHENTICATED=1000
RATE_LIMIT_ADMIN=5000

# Cache policies
CACHE_PRODUCT_TTL=300
CACHE_CATEGORY_TTL=600
CACHE_SEARCH_TTL=60
CACHE_USER_SESSION_TTL=900

# Queue concurrency
QUEUE_EMAIL_CONCURRENCY=5
QUEUE_NOTIFICATION_CONCURRENCY=10
QUEUE_IMAGE_PROCESSING_CONCURRENCY=3

# Fraud velocity controls
FRAUD_VELOCITY_ORDER_WINDOW=600
FRAUD_VELOCITY_ORDER_MAX=5
FRAUD_VELOCITY_PAYMENT_WINDOW=300
FRAUD_VELOCITY_PAYMENT_MAX=10

# Retention controls
RETENTION_AUDIT_LOGS_DAYS=365
RETENTION_ANALYTICS_DAYS=730
RETENTION_DELETED_USERS_DAYS=90
```

### **9.2 Docker Configuration**
```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 4000
CMD ["npm", "start"]
```

### **9.3 Docker Compose**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    depends_on:
      - mongo
      - postgres
      - redis
      - elasticsearch

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  elasticsearch:
    image: elasticsearch:8.11.0
    ports:
      - "9200:9200"
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - es_data:/usr/share/elasticsearch/data

volumes:
  mongo_data:
  postgres_data:
  es_data:
```

### **9.3.1 Optional Enterprise Docker Services**
```yaml
prometheus:
  image: prom/prometheus
  ports: ["9090:9090"]

grafana:
  image: grafana/grafana
  ports: ["3000:3000"]

rabbitmq:
  image: rabbitmq:3-management
  ports: ["5672:5672", "15672:15672"]

clickhouse:
  image: clickhouse/clickhouse-server
  ports: ["8123:8123", "9000:9000"]

minio:
  image: minio/minio
  ports: ["9001:9001", "9002:9002"]
  command: server /data --console-address ":9002"
```

### **9.4 Kubernetes Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ecommerce-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ecommerce
  template:
    metadata:
      labels:
        app: ecommerce
    spec:
      containers:
      - name: app
        image: your-registry/ecommerce:latest
        ports:
        - containerPort: 4000
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## **10. MONITORING AND LOGGING**

### **10.1 Logging Stack**
```javascript
- Pino HTTP Logger: Request/response logging
- Structured JSON logs
- Log levels: debug, info, warn, error
- Separate audit logs for security events
- Log aggregation ready (ELK stack)
```

### **10.2 Health Checks**
```javascript
GET /health
- Database connectivity checks
- External service health
- Queue processing status
- Returns 200 if all healthy, 503 if degraded
```

### **10.3 Error Handling**
```javascript
- Centralized error handler middleware
- Structured error responses
- Sensitive data sanitization
- Error logging with context
- Graceful degradation
```

---

## **11. DEVELOPMENT WORKFLOW**

### **11.1 Code Organization**
```
src/
├── app/                 # Application bootstrap
├── api/                 # Route registration
├── config/              # Configuration management
├── contracts/           # Domain events, event factory
├── infrastructure/      # External integrations
│   ├── auth/           # OAuth providers
│   ├── cron/           # Scheduled jobs
│   ├── events/         # Event bus, publishers, handlers
│   ├── mail/           # Email service
│   ├── mongo/          # MongoDB client
│   ├── payments/       # Payment providers
│   ├── postgres/       # PostgreSQL client
│   ├── realtime/       # Socket.IO setup
│   └── redis/          # Redis client
├── modules/             # Business modules
├── shared/              # Shared utilities
│   ├── auth/           # Auth utilities
│   ├── constants/      # App constants
│   ├── domain/         # Domain models
│   ├── errors/         # Custom errors
│   ├── http/           # HTTP utilities
│   ├── lib/            # Libraries
│   ├── logger/         # Logging setup
│   ├── middleware/     # Express middleware
│   ├── queues/         # Queue utilities
│   ├── search/         # Search utilities
│   ├── security/       # Security utilities
│   ├── storage/        # File storage
│   ├── utils/          # General utilities
│   └── validation/     # Validation utilities
├── workers/             # Background workers
└── server.js           # Server entry point
```

### **11.2 Testing Strategy**
```javascript
- Unit tests: Services, utilities, validation
- Integration tests: API endpoints, database operations
- E2E tests: Critical user flows
- Test databases: Separate instances for testing
- CI/CD: Automated testing on push/PR
```

### **11.3 API Versioning**
```javascript
- URL-based versioning: /api/v1/
- Backward compatibility maintained
- Deprecation notices for old versions
- Gradual migration path
```

---

---

## **12. DATA RETENTION POLICY**

### **12.1 Retention Windows**
- User profile and account lifecycle records: retained while account is active and up to 90 days post-deletion request hold.
- Financial and tax records (`orders`, `payments`, `tax_*`, `vendor_payouts`, `refund_transactions`, `chargebacks`): **7 years** minimum for GST/audit compliance.
- Security records (`user_login_history`, `rate_limit_violations`, `ip_reputation_scores`, `user_sessions`): 180 to 365 days based on risk classification.
- Communication telemetry (`sms_logs`, `email_opens_clicks`, `push_notification_tokens`): 180 days hot storage, optional cold archive afterward.

### **12.2 Erasure Workflow**
1. Receive verified user deletion request.
2. Freeze account and revoke active sessions.
3. Anonymize PII in operational collections/tables where legal retention still applies.
4. Cascade-delete non-financial personal data.
5. Emit auditable erasure completion event.

---

## **13. BUSINESS CONTINUITY PLAN**

### **13.1 Backup Strategy**
- PostgreSQL: daily full + hourly incremental backups (PITR-ready WAL archival).
- MongoDB: daily snapshot + oplog-based restore window.
- Redis: persistence snapshots for non-critical cache recovery only.

### **13.2 Recovery Objectives**
- **RTO Target**: 60 minutes for primary region failure.
- **RPO Target**: 15 minutes for transactional stores.

### **13.3 Disaster Recovery Runbook**
1. Detect incident and declare severity.
2. Promote standby infrastructure.
3. Restore latest consistent database checkpoints.
4. Replay outbox/dead-letter backlog.
5. Validate payment/order invariants before traffic cutover.

---

## **14. PERFORMANCE BENCHMARKS**

### **14.1 API Latency Targets**
- `GET /products`, `GET /products/search`: p95 < 250ms with warm cache.
- `POST /orders`, `POST /payments/initiate`: p95 < 600ms.
- `POST /payments/verify` and webhook ingestion: p95 < 500ms.

### **14.2 Capacity Targets**
- 1,000 authenticated RPS baseline with horizontal app scaling.
- 99% of product list reads served from cache or indexed search path.
- Queue consumer lag alert threshold: > 2 minutes sustained.

---

## **15. SLA DEFINITIONS**

### **15.1 Platform SLA**
- Monthly uptime objective: **99.9%** for buyer-facing APIs.
- Planned maintenance windows excluded with prior notice.

### **15.2 Support SLAs**
- Sev-1 (checkout/payment outage): acknowledge within 15 minutes.
- Sev-2 (major feature degradation): acknowledge within 1 hour.
- Sev-3 (minor defects): acknowledge within 1 business day.

### **15.3 Incident Communication**
- Incident channel + status page update cadence every 30 minutes for Sev-1/2.
- Post-incident RCA published within 3 business days.

---

## **16. COMPLIANCE CHECKLIST**

### **16.1 Payments and Data**
- PCI DSS scope minimization via tokenized provider integrations (no raw PAN storage).
- Signed webhook validation and replay-safe processing via idempotency keys.

### **16.2 Privacy**
- GDPR/DPDP readiness: consent logs, export workflow, right-to-erasure pipeline.
- Auditability: admin action logs, security event logs, and config change history.

### **16.3 Tax and Regulatory**
- GST invoice and ledger generation (`tax_invoices`, `tax_ledger_entries`).
- TCS/TDS and filing readiness (`tcs_credit_ledger`, `gst_filings`, `gst_filing_records`).
- E-way bill persistence (`e_way_bill_details`) for shipment compliance trails.

---

## **17. THIRD-PARTY INTEGRATION GUIDE**

### **17.1 Payment Provider Add-on**
1. Implement provider adapter in `src/infrastructure/payments/providers`.
2. Register in `provider-registry`.
3. Add verify/webhook signature strategy.
4. Add provider-specific Postman requests and contract tests.

### **17.2 Messaging Provider Add-on**
- SMS: plug provider client and persist delivery receipts in `sms_logs`.
- Email: map provider message IDs to `email_opens_clicks`.
- Push: map token lifecycle to `push_notification_tokens`.

### **17.3 Shipping/Carrier Add-on**
- Map carrier service zones to `shipping_zones`.
- Ingest shipping tariff matrix into `shipping_rates`.
- Enforce restricted pin codes with `delivery_exclusions`.

---

## **18. TROUBLESHOOTING GUIDE**

### **18.1 Common Operational Failures**
- Duplicate payment/webhook events: inspect `idempotency_keys` and `dead_letter_events`.
- Stuck event publishing: check outbox processor logs + `dead_letter_events`.
- Shipping quote anomalies: validate `pincode_serviceability` and `shipping_rates` mappings.
- Return/dispute inconsistencies: verify `return_requests`, `dispute_tickets`, and `refund_transactions`.

### **18.2 Infra Connectivity Checks**
- Mongo/Postgres/Redis health via `/health`.
- Elasticsearch index drift: run product reindex worker and verify index mappings.
- Razorpay signature mismatch: validate raw payload usage and webhook secret rotation.

---

## **19. SCALING PLAYBOOK**

### **19.1 Database Scale Thresholds**
- Add Postgres read replicas when admin/reporting queries impact checkout latency.
- Partition high-growth tables (`payments`, `tax_ledger_entries`, `sms_logs`) by month.
- Shard MongoDB when catalog + analytics writes exceed single-cluster capacity.

### **19.2 Event and Queue Scale**
- Move in-memory event bus to durable broker (RabbitMQ/Kafka) once cross-service fanout grows.
- Keep retry budgets finite and route poison events into `dead_letter_events`.

### **19.3 Service Decomposition Triggers**
- Extract payment service when payment/provider release cadence diverges.
- Extract search/recommendation when indexing/training workloads dominate app resources.
- Extract fulfillment/logistics if shipping orchestration is centralized platform-wide.

---

This comprehensive documentation covers every aspect of your E-Commerce application and now includes enterprise operations, compliance, reliability, and scale guidance aligned to the current codebase maturity.
