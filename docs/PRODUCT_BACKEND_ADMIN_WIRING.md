# Product Backend Admin Wiring

Date: 2026-06-03
Scope: Admin UI wiring for completed backend product lifecycle, revision, visibility, and compliance phases.

## 1. What Was Wired

- Product Catalog can now open normal product review or pending revision review.
- Product Detail can now show and review a pending seller revision.
- Product Detail now displays revision status, version, compliance snapshot, pending revision diff, and status history.
- Product Catalog has a Change Pending route and sidebar entry.
- Product Catalog route presets now load Draft, Pending Approval, Change Pending, and Rejected product queues.
- Product status badges now show `change_pending` and `scheduled`.
- Admin Redux now calls product revision list and revision review backend endpoints.
- Product create/update payloads no longer send raw `gstRate`; backend derives GST from active HSN master data.
- Inline HSN creation in product form is now guarded by `tax:create`.
- HSN page actions are now guarded by `tax`, not `products`.
- Inline HSN creation now creates an active HSN record so it can be selected immediately after creation.

## 2. Files Changed

- `src/_helpers/endpoints.js`
- `src/Redux/productSlice.js`
- `src/components/Product/ProductStatusBadge.js`
- `src/components/Product/ProductReviewModal.js`
- `src/components/Sidebar/Sidebar.js` renders the dynamic RBAC sidebar returned by the backend.
- `src/components/Layout/Layout.js`
- `src/_helpers/rbacRoutes.js`
- `src/pages/ProductManagement/ProductCatalog/ProductCatalog.js`
- `src/pages/ProductManagement/ProductCatalog/components/ProductAdminDetails.js`
- `src/pages/ProductManagement/ProductCatalog/components/AddEditProduct.js`
- `src/pages/ProductManagement/ProductCatalog/components/BasicDetailsTab.js`
- `src/pages/Admin/HsnCode/HsnCode.js`

## 3. Admin Flow After Wiring

### 3.1 Initial Product Approval

1. Seller submits a new product.
2. Backend keeps it in `pending_approval`.
3. Admin opens Product Catalog or Pending Approval sidebar.
4. Admin clicks Review.
5. Admin approves, rejects with reason, or deactivates through the existing product review endpoint.
6. Catalog refreshes and shows the new status.

### 3.2 Active Product Revision Approval

1. Seller edits an already active product.
2. Backend keeps the live product active and creates a pending revision.
3. Admin opens Change Pending from sidebar or sees `Change Pending` badge in Product Catalog.
4. Admin clicks Review Revision.
5. Admin sees current versus proposed field changes.
6. Admin approves the revision to publish changed fields, or rejects it with a reason.
7. Product Detail refreshes revision history and status history.

### 3.3 Compliance And HSN Flow

1. Product form requires/selects HSN from master data.
2. Product save/update sends `hsnCode`, not direct `gstRate`.
3. Backend validates active HSN and derives GST/compliance snapshot.
4. HSN creation and HSN page actions require `tax` permissions.
5. Admin can inspect compliance snapshot on Product Detail.

## 4. Use Cases Covered

- Admin reviews pending seller product.
- Admin rejects product with required reason.
- Admin reviews active product seller revision.
- Admin approves revision while live product remains controlled by backend.
- Admin rejects revision without publishing seller changes.
- Admin filters/list-routes Draft, Pending Approval, Change Pending, Rejected, Scheduled, and Archived products.
- Admin sees product revision status in list/detail.
- Admin sees product compliance snapshot from backend.
- Admin sees status history and changed fields for audits.
- Seller/product form cannot submit raw GST override through Admin Redux payload.
- HSN write actions are hidden unless user has tax permissions.

## 5. Validation Commands

Run from `/home/user/Projects/Ecommerce/Admin`:

```bash
npm run build
git diff --check
```
