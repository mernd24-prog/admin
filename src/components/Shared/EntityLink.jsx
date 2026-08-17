import React from "react";
import { Link } from "react-router-dom";
import { getStoredRole, isAllowedSellerRole } from "../../_helpers/authStorage";

const shortOrderId = (value) => String(value || "").slice(-8);

const entityLabel = (label, className = "") => (
  <span className={`font-medium text-gray-700 ${className}`}>{label}</span>
);

const sellerUserIsLoggedIn = () => isAllowedSellerRole(getStoredRole());

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
      // title={`Open order ${orderNumber || orderId}`}
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
  onClick,
}) {
  if (!userId) {
    return <span className="text-gray-400">{userName || "N/A"}</span>;
  }

  const label = children || userName || "N/A";

  if (sellerUserIsLoggedIn()) return entityLabel(label, className);

  return (
    <Link
      to={`/app/users/view/${encodeURIComponent(String(userId))}`}
      className={`font-medium text-[var(--admin-navy)] hover:underline ${className}`}
      // title={`Open user ${userName || userId}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
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
  onClick,
}) {
  if (!sellerId) {
    return <span className="text-gray-400">{sellerName || "N/A"}</span>;
  }

  const label = children || sellerName || "N/A";

  if (sellerUserIsLoggedIn()) return entityLabel(label, className);

  return (
    <Link
      to={`/app/users/view/${encodeURIComponent(String(sellerId))}`}
      className={`font-medium text-[var(--admin-navy)] hover:underline ${className}`}
      // title={`Open seller ${sellerName || sellerId}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
    >
      {label}
    </Link>
  );
}
