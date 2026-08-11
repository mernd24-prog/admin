import React from "react";
import { Link } from "react-router-dom";

const shortOrderId = (value) => String(value || "").slice(-8);

export default function OrderLink({
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
