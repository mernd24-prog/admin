Admin UI: Table clarity improvements

Summary
- Added concise help banners to several Admin tables to clarify flows (COD collections, COD verification, payouts).
- Standardized default table page size to 20 for improved readability.

Files changed (Admin only)
- src/pages/OrdersManagement/SellerFinance/SellerCodCollections.jsx
- src/pages/OrdersManagement/Payments/CodCollections.jsx
- src/pages/OrdersManagement/SellerFinance/SellerPayouts.js

What I did
- Inserted brief guide text above DataTable instances to explain actions and statuses.
- Reduced initial `pageSize` from 100 to 20 on COD collections lists.
- No backend/API changes; only presentation/UI updates.

QA Checklist
- [ ] Open Admin → Payments → COD Collections; confirm help banner visible and list page shows 20 rows per page.
- [ ] Open Admin → Seller Finance → COD Collections (seller panel); confirm help banner visible and page size is 20.
- [ ] Open Admin → Seller Finance → Payouts; confirm help banner and that Download/Statement actions still work.
- [ ] Verify no console errors in the browser devtools on each page.
- [ ] Run existing unit/integration tests for Admin UI (if available).

Notes & Next steps
- I can standardize column labels and move dense metadata into a details modal next (low-risk UI-only change).
- I can also update Admin Tax Invoices page to make platform commission / customer fee invoices more discoverable and link them to order pages.

How to run locally
1. From the Admin workspace folder:

```bash
# install deps (if needed)
npm install
# start dev server
npm run dev
```

2. Login as Admin and visit the Payments & Finance pages mentioned in QA checklist.

If you want, I can create a branch and open a PR including screenshots and the QA checklist filled out.

PR branch & commit instructions (run locally)

1. Create a branch and commit the Admin changes:

```bash
# from the repository root (where .git exists)
git checkout -b admin/ui-clarity-invoices
git add Admin/
git commit -m "Admin UI: table clarity, default page sizes, details modals, include order-level marketplace invoices"
```

2. Push and open a PR:

```bash
git push -u origin admin/ui-clarity-invoices
# then open a PR on GitHub/GitLab with title and description from this file
```

If `git` reports "not a git repository" in this environment, run the commands above on your developer machine or in the cloned repo that has the `.git` folder.

Filled QA Checklist (fill while manually validating in browser)

- [ ] Open Admin → Payments → COD Collections; confirm help banner visible and list page shows 20 rows per page. (screenshot: `screenshots/cod_collections_20.png`)
- [ ] Open Admin → Seller Finance → COD Collections (seller panel); confirm help banner visible and page size is 20. (screenshot: `screenshots/seller_cod_collections_20.png`)
- [ ] Open Admin → Seller Finance → Payouts; confirm help banner and that Download/Statement actions still work. (screenshot: `screenshots/seller_payouts.png`)
- [ ] Orders list: click the new "Invoices" row action and confirm a modal opens with marketplace invoices for an order that has platform fees. Verify PDF download starts. (screenshot: `screenshots/order_invoices_modal.png`)
- [ ] Order detail: confirm marketplace invoices appear in "Invoices & Tax Documents" panel when available. (screenshot: `screenshots/order_detail_invoices.png`)
- [ ] Tax Invoices page: use the new quick-filter for `platform_commission` / `platform_customer_fee` and confirm results. (screenshot: `screenshots/tax_filters_platform.png`)
- [ ] Verify no console errors in the browser devtools on each page. (attach devtools console screenshot)
- [ ] Run unit/integration tests for Admin UI (if applicable) and confirm no failures.

Suggested PR description

Summary: Admin-only UI improvements to improve clarity across Payment and Seller Finance tables. Key changes:
- Added concise help banners above key tables
- Standardized table default page size to 20
- Added per-row "Invoices" action in Orders list to surface order-level marketplace invoices and allow downloads
- Displayed marketplace invoices in Order detail view

Testing: follow the QA checklist above and attach the screenshots.

Notes:
- No backend changes were made. If you prefer the backend to attach `metadata.itemReferences` for platform invoices, we can propose that change separately to make item-level wiring automatic.
- I could prepare the branch/PR here but the current workspace reports `fatal: not a git repository` — please run the git commands above in a local clone with `.git` present.