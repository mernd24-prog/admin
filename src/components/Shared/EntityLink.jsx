import React from "react";
import { Link } from "react-router-dom";

const shortOrderId = (value) => String(value || "").slice(-8);

// Order Link
export function OrderLink({
  orderId,
  orderNumber,
  prefix = "#",
  className = "",
  children,
}) {
  if (!orderId) return <span className="text-gray-400">—</span>;

  const label =
    children ||
    (orderNumber
      ? `${prefix}${orderNumber}`
      : `${prefix}${shortOrderId(orderId)}`);

  return (
    <Link
      to={`/app/orders/view/${encodeURIComponent(String(orderId))}`}
      className={`font-mono text-xs font-medium text-[var(--admin-navy)] hover:underline ${className}`}
      title={`Open order ${orderNumber || orderId}`}
    >
      {label}
    </Link>
  );
}


// User Link
export function UserLink({
  userId,
  userName,
  className = "",
  children,
}) {
  if (!userId) {
    return <span className="text-gray-400">{userName || "N/A"}</span>;
  }

  const label = children || userName || "N/A";

  return (
    <Link
      to={`/app/users/view/${encodeURIComponent(String(userId))}`}
      className={`font-medium text-[var(--admin-navy)] hover:underline ${className}`}
      title={`Open user ${userName || userId}`}
    >
      {label}
    </Link>
  );
}

// Seller Link
export function SellerLink({
  sellerId,
  sellerName,
  className = "",
  children,
}) {
  if (!sellerId) {
    return <span className="text-gray-400">{sellerName || "N/A"}</span>;
  }

  const label = children || sellerName || "N/A";

  return (
    <Link
      to={`/app/sellers/view/${encodeURIComponent(String(sellerId))}`}
      className={`font-medium text-[var(--admin-navy)] hover:underline ${className}`}
      title={`Open seller ${sellerName || sellerId}`}
    >
      {label}
    </Link>
  );
}