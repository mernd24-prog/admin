<<<<<<< HEAD
# Scalable E-commerce Backend

Production-grade modular monolith for a Flipkart/Amazon-style backend using Node.js, Express, MongoDB, PostgreSQL, Redis, BullMQ, and Elasticsearch.

## Architecture

- Modular monolith with microservice-ready boundaries.
- DDD-lite module shape for every domain:
  - `controllers`
  - `services`
  - `repositories`
  - `routes`
  - `validation`
  - `models`
- Multi-database strategy:
  - MongoDB: users, products, carts, notifications, analytics
  - PostgreSQL: orders, order items, payments, seller KYC
  - Redis: caching and queues
- Service-layer communication only. No module reaches into another module's database directly.

## Modules

- Auth: JWT access/refresh tokens, refresh session rotation, and Google/Firebase social login verification
- User: profile retrieval, updates, user KYC workflows, and referral identity
- Product: catalog management, Elasticsearch indexing, and reservation-aware stock fields
- Cart: cart and wishlist persistence
- Order: PostgreSQL-backed order creation with server-side pricing and lifecycle transitions
- Payment: Razorpay order creation, signature verification, and webhook handling
- Seller: seller onboarding plus KYC submission/review
- Notification: email/SMS/push-ready notification persistence and queueing
- Analytics: event capture and aggregation-ready event log
- Inventory: reservation, release, commit, and restock flows
- Pricing: coupon engine and centralized total calculation
- Wallet: balance ledger, held credits, capture/release flow, and referral rewards
- Platform: HSN codes, categories, product families, variants, geography, and CMS management
- Warranty: warranty registration, claims, and lifecycle management
- Tax: invoice generation and tax reporting

## Advanced E-commerce Features

### Product Management
- **Variants & Attributes**: Support for product variants with colors, sizes, dimensions, and custom attributes
- **HSN Integration**: HSN code-based tax calculation with GST rates, cess, and exemptions
- **Geography Support**: Country/state/city management for shipping and tax rules
- **Categories & Families**: Hierarchical category trees and product family definitions

### Warranty System
- **Warranty Registration**: Automatic warranty creation on order confirmation
- **Claim Management**: Customer warranty claims with admin approval workflow
- **Warranty Lookup**: Public API for checking product warranties

### Tax & Compliance
- **Invoice Generation**: Automated tax invoice creation for orders
- **Tax Reports**: Admin tax reporting with ledger entries
- **HSN Caching**: Redis-cached HSN tax rules for performance
- **Export/Import Support**: Zero-rated tax for international shipping

### Platform Management
- **Admin Endpoints**: Full CRUD for platform data (categories, HSN, geography, CMS)
- **Content Management**: CMS pages for terms, policies, and marketing content
- **Platform Fees**: Configurable platform fees per category

## API Endpoints

### Platform Management (Admin)
```
POST   /admin/platform/categories
GET    /admin/platform/categories
PATCH  /admin/platform/categories/:categoryKey
DELETE /admin/platform/categories/:categoryKey

POST   /admin/platform/product-families
GET    /admin/platform/product-families
PATCH  /admin/platform/product-families/:familyCode
DELETE /admin/platform/product-families/:familyCode

POST   /admin/platform/product-variants
GET    /admin/platform/product-variants
PATCH  /admin/platform/product-variants/:variantId
DELETE /admin/platform/product-variants/:variantId

POST   /admin/platform/hsn-codes
GET    /admin/platform/hsn-codes
PATCH  /admin/platform/hsn-codes/:hsnCode
DELETE /admin/platform/hsn-codes/:hsnCode

POST   /admin/platform/geography
GET    /admin/platform/geography
PATCH  /admin/platform/geography/:countryCode
DELETE /admin/platform/geography/:countryCode

POST   /admin/platform/content-pages
GET    /admin/platform/content-pages
PATCH  /admin/platform/content-pages/:slug
DELETE /admin/platform/content-pages/:slug
```

### Warranty Management
```
GET    /warranty/products/:productId/warranty
POST   /warranty/register
GET    /warranty/:warrantyId
GET    /warranty/orders/:orderId
GET    /warranty/customers/:customerId
POST   /warranty/:warrantyId/claims
PATCH  /warranty/:warrantyId/claims/:claimId/status (Admin)
```

### Tax & Invoices
```
POST   /tax/orders/:orderId/invoice
GET    /tax/reports
```

## Shared Platform Capabilities

- Express middleware for security, rate limiting, validation, auth, and errors
- Auth-specific rate limiting and security event logging for sign-in/refresh flows
- Redis-backed BullMQ queue factory
- Cloudinary-based abstract storage layer
- Nodemailer mailer abstraction
- In-memory event bus abstraction for easy migration to Kafka later
- Versioned domain event contracts in `src/contracts/events`
- PostgreSQL outbox pattern for transactional modules like orders and payments
- Socket.IO realtime updates for order, payment, notification, and KYC state changes
- Domain event log persistence for traceable business events
- Inventory reservations to reduce overselling during checkout/payment windows
- Coupon management and server-owned order total calculation
- Wallet ledger for stored credits and hybrid wallet+gateway checkout
- Referral rewards for referrer and referee onboarding incentives
- GST tax breakup support for CGST/SGST vs IGST calculation
- Cron registration for order cleanup, payment retries, and analytics aggregation
- Pino logging and request logging
- Mongo-backed audit log capture for API requests

## Run Locally

1. Copy `.env.example` to `.env`
2. Install dependencies:

```bash
npm install
```

3. Start infrastructure:

```bash
docker-compose up -d mongo postgres redis elasticsearch mailhog
```

4. Start the app:

```bash
npm run dev
```

5. Seed realistic test data (core + advanced commerce modules):

```bash
npm run db:seed
```

Seeded login users:
- `admin@gmail.com` / `Password@123`
- `seller@gmail.com` / `Password@123`
- `buyer@gmail.com` / `Password@123`

## API Surface

Route discovery endpoint (advanced reusable integration support):
- `GET /api/v1/meta/routes` returns active module prefixes and documentation pointers.

### Auth
- `POST /api/v1/auth/register` - Direct registration
- `POST /api/v1/auth/register-otp` - Register with OTP verification
- `POST /api/v1/auth/verify-registration` - Verify registration OTP
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/social`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/send-otp` - Send OTP for registration/forgot password
- `POST /api/v1/auth/verify-otp` - Verify OTP
- `POST /api/v1/auth/resend-otp` - Resend OTP
- `POST /api/v1/auth/forgot-password` - Send OTP for password reset
- `POST /api/v1/auth/reset-password` - Reset password with OTP
- `POST /api/v1/auth/change-password` - Change password (authenticated)

### User & Profile
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `GET /api/v1/products`
- `GET /api/v1/products/:productId`
- `GET /api/v1/products/search?q=iphone`
- `POST /api/v1/products`
- `GET /api/v1/carts/me`
- `PUT /api/v1/carts/me`
- `GET /api/v1/orders/me`
- `POST /api/v1/orders`
- `PATCH /api/v1/orders/:orderId/status`
- `GET /api/v1/payments/me`
- `POST /api/v1/payments/initiate`
- `POST /api/v1/payments/verify`
- `POST /api/v1/payments/webhooks/razorpay`
- `GET /api/v1/pricing/coupons`
- `POST /api/v1/pricing/coupons`
- `GET /api/v1/wallets/me`
- `POST /api/v1/sellers/kyc`
- `PATCH /api/v1/sellers/:sellerId/kyc/review`
- `POST /api/v1/users/me/kyc`
- `PATCH /api/v1/users/:userId/kyc/review`
- `GET /api/v1/notifications/me`
- `POST /api/v1/notifications`
- `GET /api/v1/analytics`
- `POST /api/v1/analytics/events`

### Advanced Commerce APIs (Now Wired)
- `GET /api/v1/notifications/preferences`
- `PUT /api/v1/notifications/preferences`
- `GET /api/v1/loyalty/profile`
- `GET /api/v1/loyalty/benefits`
- `POST /api/v1/loyalty/redeem`
- `GET /api/v1/recommendations`
- `POST /api/v1/recommendations/:productId/interact`
- `GET /api/v1/recommendations/trending`
- `GET /api/v1/dynamic-pricing/price`
- `POST /api/v1/dynamic-pricing/adjust`
- `POST /api/v1/returns`
- `GET /api/v1/returns/my-returns`
- `POST /api/v1/returns/:returnId/approve`
- `POST /api/v1/returns/:returnId/refund`
- `POST /api/v1/fraud/:fraudId/review`
- `GET /api/v1/sellers/commissions/my-commissions`
- `GET /api/v1/sellers/commissions/my-payouts`
- `POST /api/v1/sellers/commissions/calculate/:orderId`
- `POST /api/v1/sellers/commissions/process-payouts`
- `GET /api/v1/sellers/commissions/settlements`
- `POST /api/v1/loyalty/points`
- `GET /api/v1/loyalty/history`
- `GET /api/v1/returns/order/:orderId`

### Access Hierarchy APIs
- `POST /api/v1/admin/access/admins` (super-admin creates admin)
- `POST /api/v1/admin/access/sub-admins` (admin creates platform sub-admin with module access)
- `GET /api/v1/admin/access/sub-admins`
- `PATCH /api/v1/admin/access/sub-admins/:userId/modules`
- `POST /api/v1/sellers/me/sub-admins` (seller creates seller sub-admin with module access)
- `GET /api/v1/sellers/me/sub-admins`
- `PATCH /api/v1/sellers/me/sub-admins/:userId/modules`

## Migration Strategy

- Replace each module route group with an API gateway route when extracting services.
- Swap module-internal service invocations for async events or HTTP/gRPC contracts.
- Move the in-memory event bus to Kafka without changing controller contracts.
- Keep event names stable and versioned through `src/contracts/events`.
- Let PostgreSQL-backed modules publish through the outbox first, then replace the outbox consumer with a broker publisher.
- Split workers into standalone processes first, then extract the owning module.
- Preserve repository interfaces so data-layer rewrites stay inside the module.

## Social Login Notes

- Web clients should obtain a Google ID token from Google Sign-In and send it to `POST /api/v1/auth/social`.
- Mobile apps can send either a Google ID token or a Firebase ID token after authenticating with Firebase Auth.
- The backend verifies the identity token itself; clients are never trusted based on profile payload alone.
- Configure `GOOGLE_CLIENT_IDS` with all approved web/android/iOS client IDs.
- Configure Firebase server credentials with `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.

## Security Notes

- No backend is "unhackable"; the goal is layered defense and rapid detection.
- Refresh tokens are rotated and stored as hashed sessions instead of raw token strings.
- Auth endpoints are rate-limited.
- Security-sensitive auth events are stored in MongoDB for investigation and alerting.

## Razorpay Notes

- `POST /api/v1/payments/initiate` creates a provider order and returns checkout metadata for the client.
- `POST /api/v1/payments/verify` verifies the payment signature server-side after checkout success.
- `POST /api/v1/payments/webhooks/razorpay` handles trusted gateway webhooks for captured or failed payments.
- Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` before enabling the gateway.

## KYC Notes

- Seller KYC supports PAN, GST, Aadhaar, and document URLs with review states.
- User KYC supports PAN and Aadhaar for regulated payment/identity flows when needed.
- Admin review routes allow moving KYC records through `under_review`, `verified`, or `rejected`.
- This project stores KYC workflows and documents metadata; it does not yet call external government verification APIs.

## Realtime Notes

- Socket.IO is attached to the main server and authenticates with the access token.
- Connected users automatically join `user:<id>` and `role:<role>` rooms.
- Clients can subscribe to an order room using `join:order`.
- Current live events include:
  - `order:created`
  - `order:status`
  - `payment:initiated`
  - `payment:verified`
  - `payment:failed`
  - `payment:update`
  - `notification:new`
  - `kyc:submitted`
  - `kyc:status`
  - `admin:kyc:update`

## Commerce Logic Notes

- Orders no longer trust client-provided totals; pricing is calculated on the server from product data.
- Coupons are validated centrally and usage is tracked.
- Inventory is reserved when an order is created, committed on successful payment, and released on payment failure.
- Returns can restock previously committed inventory.
- Wallet credits can be held against an order and either captured on success or released on failure/cancel.
- Referral codes can reward both the referrer and the new user through wallet credits.
- Tax calculation now returns CGST/SGST for intra-state orders and IGST for inter-state orders based on `BUSINESS_STATE`.

## Scale Notes

- Add read replicas and partitioning for PostgreSQL payment/order workloads.
- Add Redis caching around hot product/category/search endpoints.
- Push search reads to Elasticsearch instead of MongoDB listing for large catalogs.
- Run app and workers independently behind autoscaling.
- Add distributed tracing and a central config service as the next enterprise step.
# Ecommerce-Backend
# admin
=======
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
# eyesion-admin-new
# backend
>>>>>>> daf81ad5752c219ee7482b0fdb4a2ddd59125ce3
