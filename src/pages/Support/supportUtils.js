export const CUSTOMER_QUERY_CATEGORIES = [
  { value: "DELIVERY_ISSUE", label: "Delivery Issue" },
  { value: "ORDER_ISSUE", label: "Order Issue" },
  { value: "PAYMENT_ISSUE", label: "Payment Issue" },
  { value: "REFUND_RETURN_ISSUE", label: "Refund/Return Issue" },
  { value: "PRODUCT_ISSUE", label: "Product Issue" },
  { value: "ACCOUNT_ISSUE", label: "Account Issue" },
  { value: "OTHER", label: "Other" },
];

export const SELLER_QUERY_CATEGORIES = [
  { value: "ORDER_ISSUE", label: "Order Issue" },
  { value: "PRODUCT_LISTING_ISSUE", label: "Product Listing Issue" },
  { value: "PAYMENT_SETTLEMENT_ISSUE", label: "Payment/Settlement Issue" },
  { value: "COMMISSION_FEE_ISSUE", label: "Commission/Fee Issue" },
  { value: "STORE_KYC_ISSUE", label: "Store/KYC Issue" },
  { value: "DELIVERY_SHIPPING_ISSUE", label: "Delivery/Shipping Issue" },
  { value: "OTHER", label: "Other" },
];

export const SUPPORT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const categoryLabel = (value) => {
  const match = [...CUSTOMER_QUERY_CATEGORIES, ...SELLER_QUERY_CATEGORIES]
    .find((item) => item.value === value);
  return match?.label || String(value || "N/A").replace(/_/g, " ");
};

export const statusLabel = (value) =>
  SUPPORT_STATUSES.find((item) => item.value === value)?.label ||
  String(value || "N/A").replace(/_/g, " ");

export const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getPaginationTotal = (payload, fallback = 0) =>
  Number(
    payload?.pagination?.total ??
    payload?.meta?.total ??
    payload?.data?.total ??
    fallback,
  );
