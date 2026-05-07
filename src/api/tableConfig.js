const EMPTY_VALUE = "-";

const getPath = (record, path) =>
  String(path || "")
    .split(".")
    .reduce((value, key) => value?.[key], record);

const firstPresent = (record, paths = []) => {
  for (const path of paths) {
    const value = typeof path === "function" ? path(record) : getPath(record, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return EMPTY_VALUE;
};

const formatDate = (value) => {
  if (!value) return EMPTY_VALUE;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const formatAmount = (record, amountPaths = ["amount"], currencyPaths = ["currency"]) => {
  const amount = firstPresent(record, amountPaths);
  if (amount === EMPTY_VALUE) return EMPTY_VALUE;
  const currency = firstPresent(record, currencyPaths);
  return `${currency === EMPTY_VALUE ? "" : `${currency} `}${amount}`;
};

const text = (label, paths) => ({ label, accessor: (row) => firstPresent(row, paths) });
const date = (label, paths) => ({ label, accessor: (row) => formatDate(firstPresent(row, paths)) });
const amount = (label, amountPaths, currencyPaths) => ({
  label,
  accessor: (row) => formatAmount(row, amountPaths, currencyPaths),
});

export const adminTableColumns = {
  accessModules: [
    text("Module", ["module", "moduleKey", "moduleCode", "code", "name"]),
    text("Title", ["title", "label", "name"]),
    text("Role", ["role", "roleSlug", "role.name"]),
    text("Active", [(row) => row?.active === false ? "No" : "Yes"]),
  ],
  admins: [
    text("Name", ["profile.displayName", "full_name", "fullName", "profile.firstName", "email"]),
    text("Email", ["email"]),
    text("Phone", ["phone", "mobile"]),
    text("Role", ["role", "role.slug", "role.name"]),
    text("Status", ["accountStatus", "status"]),
  ],
  subAdmins: [
    text("Name", ["profile.displayName", "full_name", "fullName", "profile.firstName", "email"]),
    text("Email", ["email"]),
    text("Phone", ["phone", "mobile"]),
    text("Modules", [(row) => row?.allowedModules?.join?.(", ")]),
    text("Status", ["accountStatus", "status"]),
  ],
  users: [
    text("Name", ["profile.displayName", "full_name", "fullName", "profile.firstName", "email"]),
    text("Email", ["email"]),
    text("Phone", ["phone", "mobile"]),
    text("Role", ["role", "role.slug", "role.name"]),
    text("Status", ["accountStatus", "status"]),
    date("Created", ["createdAt", "created_at"]),
  ],
  vendors: [
    text("Seller", ["sellerProfile.displayName", "displayName", "legalBusinessName", "email"]),
    text("Email", ["email", "user.email"]),
    text("Phone", ["phone", "supportPhone"]),
    text("Account Status", ["accountStatus", "status"]),
    text("Onboarding", ["onboardingStatus", "sellerProfile.onboardingStatus"]),
    text("KYC", ["kycStatus", "verificationStatus", "sellerProfile.kycStatus"]),
  ],
  moderationQueue: [
    text("Product", ["title", "name", "productName"]),
    text("SKU", ["sku", "variants.0.sku"]),
    text("Seller", ["sellerName", "seller.displayName", "seller.email"]),
    text("Category", ["category", "categoryKey"]),
    text("Status", ["status"]),
    date("Submitted", ["submittedAt", "updatedAt", "createdAt"]),
  ],
  orders: [
    text("Order ID", ["orderId", "order_no", "_id", "id"]),
    text("Buyer", ["buyer.profile.firstName", "buyerName", "customerName", "user.email"]),
    text("Status", ["status", "orderStatus"]),
    text("Payment", ["paymentStatus", "payment.status"]),
    amount("Total", ["totalAmount", "grandTotal", "amount"], ["currency"]),
    date("Placed", ["createdAt", "orderedAt"]),
  ],
  payments: [
    text("Payment ID", ["paymentId", "_id", "id"]),
    text("Order ID", ["orderId", "order._id", "order.id"]),
    text("Provider", ["provider", "gateway"]),
    text("Status", ["status", "paymentStatus"]),
    amount("Amount", ["amount", "capturedAmount"], ["currency"]),
    date("Created", ["createdAt"]),
  ],
  payouts: [
    text("Payout ID", ["payoutId", "_id", "id"]),
    text("Seller", ["sellerId", "seller.displayName", "seller.email"]),
    text("Status", ["status"]),
    amount("Gross", ["grossAmount"], ["currency"]),
    amount("Net", ["netPayoutAmount"], ["currency"]),
    date("Scheduled", ["scheduledAt"]),
  ],
  taxReports: [
    text("Order ID", ["orderId", "order._id"]),
    text("Tax Component", ["taxComponent", "component"]),
    amount("Taxable", ["taxableAmount"], ["currency"]),
    amount("Tax", ["taxAmount"], ["currency"]),
    date("Date", ["createdAt", "invoiceDate"]),
  ],
  apiKeys: [
    text("Key Name", ["keyName", "name"]),
    text("Owner", ["ownerId", "owner.email"]),
    text("Scopes", [(row) => row?.scopes?.join?.(", ")]),
    text("Status", ["status"]),
    date("Expires", ["expiresAt"]),
  ],
  webhooks: [
    text("Endpoint", ["endpointUrl", "url"]),
    text("Owner", ["ownerId", "owner.email"]),
    text("Events", [(row) => row?.eventTypes?.join?.(", ")]),
    text("Status", ["status"]),
  ],
  featureFlags: [
    text("Flag", ["flagKey", "key"]),
    text("Description", ["description"]),
    text("Enabled", [(row) => row?.enabled ? "Yes" : "No"]),
    text("Rollout", [(row) => `${row?.rolloutPercentage ?? 0}%`]),
  ],
  chargebacks: [
    text("Chargeback ID", ["chargebackId", "_id", "id"]),
    text("Payment", ["paymentId", "payment._id"]),
    text("Status", ["status"]),
    amount("Amount", ["amount"], ["currency"]),
    date("Created", ["createdAt"]),
  ],
  queues: [
    text("Queue", ["queueName", "name"]),
    text("Status", ["status"]),
    text("Waiting", ["waiting", "counts.waiting"]),
    text("Active", ["active", "counts.active"]),
    text("Failed", ["failed", "counts.failed"]),
  ],
  deadLetter: [
    text("Event ID", ["eventId", "_id", "id"]),
    text("Type", ["eventType", "type"]),
    text("Status", ["status"]),
    text("Error", ["error.message", "error", "reason"]),
    date("Created", ["createdAt"]),
  ],
  subscriptionPlans: [
    text("Plan", ["title", "planCode"]),
    text("Code", ["planCode"]),
    text("Roles", [(row) => row?.targetRoles?.join?.(", ")]),
    amount("Monthly", ["monthlyPrice"], ["currency"]),
    amount("Yearly", ["yearlyPrice"], ["currency"]),
    text("Active", [(row) => row?.active ? "Yes" : "No"]),
  ],
  platformSubscriptions: [
    text("Subscription", ["subscriptionId", "_id", "id"]),
    text("User", ["user.email", "userId"]),
    text("Role", ["userRole", "role"]),
    text("Status", ["status"]),
    date("Started", ["startedAt", "createdAt"]),
    date("Expires", ["expiresAt"]),
  ],
  feeConfig: [
    text("Category", ["category"]),
    text("Commission", [(row) => `${row?.commissionPercent ?? 0}%`]),
    amount("Fixed Fee", ["fixedFeeAmount"], ["currency"]),
    amount("Closing Fee", ["closingFeeAmount"], ["currency"]),
    text("Active", [(row) => row?.active ? "Yes" : "No"]),
  ],
  categories: [
    text("Key", ["categoryKey", "key"]),
    text("Title", ["title", "name"]),
    text("Parent", ["parentKey"]),
    text("Level", ["level"]),
    text("Active", [(row) => row?.active ? "Yes" : "No"]),
  ],
  productFamilies: [
    text("Family Code", ["familyCode", "code"]),
    text("Title", ["title"]),
    text("Category", ["category"]),
    text("Seller", ["sellerId", "seller.email"]),
    text("Status", ["status"]),
  ],
  productVariants: [
    text("SKU", ["sku"]),
    text("Family", ["familyCode"]),
    text("Product", ["productId", "product.title"]),
    text("Stock", ["stock"]),
    text("Reserved", ["reservedStock"]),
    text("Status", ["status"]),
  ],
  hsnCodes: [
    text("HSN", ["code", "hsnCode"]),
    text("Description", ["description"]),
    text("GST", [(row) => `${row?.gstRate ?? 0}%`]),
    text("CESS", [(row) => `${row?.cessRate ?? 0}%`]),
    text("Active", [(row) => row?.active ? "Yes" : "No"]),
  ],
  geographies: [
    text("Country Code", ["countryCode"]),
    text("Country", ["countryName", "name"]),
    text("States", [(row) => row?.states?.length ?? 0]),
    text("Active", [(row) => row?.active ? "Yes" : "No"]),
  ],
  contentPages: [
    text("Slug", ["slug"]),
    text("Title", ["title"]),
    text("Type", ["pageType"]),
    text("Language", ["language"]),
    text("Published", [(row) => row?.published ? "Yes" : "No"]),
    date("Published At", ["publishedAt"]),
  ],
};

export const sellerTableColumns = {
  statusChecklist: [
    text("Step", ["title", "label", "name"]),
    text("Status", ["status"]),
    text("Required", [(row) => row?.required === false ? "No" : "Yes"]),
  ],
  tracking: [
    text("Order ID", ["orderId", "order_no", "_id", "id"]),
    text("Status", ["status", "orderStatus"]),
    text("Delivery", ["deliveryStatus", "delivery.status"]),
    text("Buyer", ["buyerName", "buyer.profile.firstName", "customerName"]),
    amount("Total", ["totalAmount", "grandTotal", "amount"], ["currency"]),
    date("Updated", ["updatedAt", "createdAt"]),
  ],
  dashboardTopProducts: [
    text("Product", ["title", "name", "productName"]),
    text("SKU", ["sku"]),
    text("Orders", ["orders", "orderCount"]),
    amount("Revenue", ["revenue", "sales"], ["currency"]),
  ],
  subAdmins: [
    text("Name", ["profile.displayName", "full_name", "profile.firstName", "email"]),
    text("Email", ["email"]),
    text("Phone", ["phone"]),
    text("Modules", [(row) => row?.allowedModules?.join?.(", ")]),
    text("Status", ["accountStatus", "status"]),
  ],
};

export const sellerCommissionTableColumns = {
  myCommissions: [
    text("Order ID", ["orderId", "order._id"]),
    amount("Order Amount", ["orderAmount", "grossAmount"], ["currency"]),
    amount("Commission", ["commissionAmount"], ["currency"]),
    text("Rate", [(row) => row?.commissionPercent ? `${row.commissionPercent}%` : EMPTY_VALUE]),
    date("Created", ["createdAt"]),
  ],
  myPayouts: [
    text("Payout ID", ["payoutId", "_id", "id"]),
    text("Status", ["status"]),
    amount("Gross", ["grossAmount"], ["currency"]),
    amount("Net", ["netPayoutAmount"], ["currency"]),
    date("Scheduled", ["scheduledAt"]),
    date("Paid", ["paidAt"]),
  ],
  settlements: [
    text("Settlement ID", ["settlementId", "_id", "id"]),
    text("Seller", ["sellerId", "seller.email"]),
    text("Status", ["status"]),
    amount("Net", ["netPayoutAmount", "amount"], ["currency"]),
    date("Created", ["createdAt"]),
  ],
};

export const getTableHeaders = (columns = []) => columns.map((column) => column.label);

export const getTableData = (rows = [], columns = []) =>
  (Array.isArray(rows) ? rows : []).map((row) =>
    columns.map((column) =>
      typeof column.accessor === "function"
        ? column.accessor(row)
        : firstPresent(row, [column.key])
    )
  );

export const getTableConfig = (scope, key) => {
  const groups = {
    admin: adminTableColumns,
    seller: sellerTableColumns,
    sellerCommissions: sellerCommissionTableColumns,
  };
  const columns = groups?.[scope]?.[key] || [];

  return {
    columns,
    headers: getTableHeaders(columns),
    data: (rows) => getTableData(rows, columns),
  };
};
