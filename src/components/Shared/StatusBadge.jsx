import React from "react";
import { formatLabel } from "../../utils/formatters";

// Color map: status key → Tailwind classes
const VARIANTS = {
  // ── Generic ──────────────────────────────────────────────────────────────
  active: "bg-green-50 text-green-700 border-green-100",
  inactive: "bg-gray-50 text-gray-500 border-gray-100",
  enabled: "bg-green-100 text-green-700",
  disabled: "bg-gray-100 text-gray-500",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-100",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-100",
  partially_live: "bg-cyan-50 text-cyan-700 border-cyan-100",
  partially_verified: "bg-cyan-50 text-cyan-700 border-cyan-100",
  partially_approved: "bg-cyan-50 text-cyan-700 border-cyan-100",
  approval_pending: "bg-yellow-50 text-yellow-700 border-yellow-100",
  not_created: "bg-gray-50 text-gray-500 border-gray-100",
  on_hold: "bg-amber-100 text-amber-700",
  approved: "bg-green-50 text-green-700 border-green-100",
  rejected: "bg-red-50 text-red-700 border-red-100",
  resubmitted: "bg-cyan-50 text-cyan-700 border-cyan-100",
  draft: "bg-blue-50 text-blue-600 border-blue-100",
  published: "bg-green-100 text-green-700",
  unpublished: "bg-gray-100 text-gray-500",
  archived: "bg-gray-100 text-gray-500",
  suspended: "bg-orange-100 text-orange-700",
  blocked: "bg-red-100 text-red-800",
  banned: "bg-red-100 text-red-800",
  verified: "bg-emerald-100 text-emerald-700",
  unverified: "bg-yellow-100 text-yellow-700",
  seen: "bg-green-50 text-green-700 border-green-100",
  unseen: "bg-blue-50 text-blue-700 border-blue-100",
  // ── KYC / Bank ───────────────────────────────────────────────────────────
  under_review: "bg-yellow-100 text-yellow-700",
  submitted: "bg-blue-100 text-blue-700",
  // ── Orders ───────────────────────────────────────────────────────────────
  placed: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  processing: "bg-indigo-100 text-indigo-700",
  packed: "bg-purple-100 text-purple-600",
  ready_to_ship: "bg-purple-100 text-purple-700",
  shipped: "bg-purple-100 text-purple-700",
  out_for_delivery: "bg-violet-100 text-violet-700",
  partially_delivered: "bg-sky-100 text-sky-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  return_requested: "bg-yellow-100 text-yellow-700",
  partially_returned: "bg-orange-100 text-orange-700",
  returned: "bg-orange-100 text-orange-700",
  failed_delivery: "bg-red-100 text-red-700",
  payment_failed: "bg-red-100 text-red-700",
  pending_payment: "bg-yellow-100 text-yellow-700",
  partially_refunded: "bg-cyan-100 text-cyan-700",
  refunded: "bg-teal-100 text-teal-700",
  failed: "bg-red-100 text-red-600",
  // ── Returns ──────────────────────────────────────────────────────────────
  requested: "bg-yellow-100 text-yellow-700",
  picked_up: "bg-blue-100 text-blue-700",
  closed: "bg-gray-100 text-gray-500",
  // ── Inventory ────────────────────────────────────────────────────────────
  in_stock: "bg-green-100 text-green-700",
  low_stock: "bg-red-100 text-red-700",
  out_of_stock: "bg-red-100 text-red-700",
  backorder: "bg-orange-100 text-orange-700",
  discontinued: "bg-gray-100 text-gray-500",
  // ── Shipments ────────────────────────────────────────────────────────────
  in_transit: "bg-blue-100 text-blue-700",
  // ── Subscriptions ────────────────────────────────────────────────────────
  paused: "bg-yellow-100 text-yellow-700",
  expired: "bg-red-100 text-red-600",
  // ── Payments ─────────────────────────────────────────────────────────────
  completed: "bg-green-100 text-green-700",
  held: "bg-yellow-100 text-yellow-700",
  released: "bg-blue-100 text-blue-700",
  // ── Fraud ────────────────────────────────────────────────────────────────
  open: "bg-red-100 text-red-700",
  investigating: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-500",
  // ── Misc ─────────────────────────────────────────────────────────────────
  yes: "bg-green-100 text-green-700",
  no: "bg-gray-100 text-gray-500",
  true: "bg-green-100 text-green-700",
  false: "bg-gray-100 text-gray-500",
  1: "bg-green-100 text-green-700",
  0: "bg-gray-100 text-gray-500",
};

// Dot colors (optional indicator dot)
const DOT_COLORS = {
  active: "bg-green-500",
  enabled: "bg-green-500",
  verified: "bg-emerald-500",
  seen: "bg-green-500",
  unseen: "bg-blue-500",
  approved: "bg-green-500",
  published: "bg-green-500",
  completed: "bg-green-500",
  delivered: "bg-green-500",
  partially_delivered: "bg-sky-500",
  partially_returned: "bg-orange-500",
  partially_refunded: "bg-cyan-500",
  in_stock: "bg-green-500",
  pending: "bg-yellow-400",
  ready: "bg-emerald-500",
  partially_live: "bg-cyan-500",
  partially_verified: "bg-cyan-500",
  partially_approved: "bg-cyan-500",
  approval_pending: "bg-yellow-400",
  on_hold: "bg-amber-500",
  under_review: "bg-yellow-400",
  low_stock: "bg-red-500",
  paused: "bg-yellow-400",
  processing: "bg-indigo-400",
  held: "bg-yellow-400",
  released: "bg-blue-500",
  packed: "bg-purple-400",
  ready_to_ship: "bg-purple-500",
  shipped: "bg-purple-500",
  out_for_delivery: "bg-violet-500",
  in_transit: "bg-blue-500",
  rejected: "bg-red-500",
  resubmitted: "bg-cyan-500",
  cancelled: "bg-red-500",
  failed: "bg-red-500",
  failed_delivery: "bg-red-500",
  payment_failed: "bg-red-500",
  pending_payment: "bg-yellow-400",
  suspended: "bg-orange-500",
  blocked: "bg-red-700",
  banned: "bg-red-700",
  out_of_stock: "bg-red-500",
  inactive: "bg-gray-400",
  archived: "bg-gray-400",
  closed: "bg-gray-400",
};

// Human-readable display labels override for underscore keys
const DISPLAY_LABELS = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  out_for_delivery: "Out for Delivery",
  ready_to_ship: "Ready to Ship",
  failed_delivery: "Failed Delivery",
  payment_failed: "Payment Failed",
  pending_payment: "Pending Payment",
  partially_delivered: "Partially Delivered",
  return_requested: "Return Requested",
  partially_returned: "Partially Returned",
  partially_refunded: "Partially Refunded",
  on_hold: "On Hold",
  under_review: "Under Review",
  pending_review: "Pending Review",
  partially_live: "Partially Live",
  partially_verified: "Partially Verified",
  partially_approved: "Partially Approved",
  approval_pending: "Approval Pending",
  not_created: "Not Created",
  resubmitted: "Resubmitted",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  seller_kyc: "KYC",
};

/**
 * StatusBadge
 *
 * Props:
 *   status  {string}         — status key (e.g. "active", "shipped")
 *   label   {string}         — override display text
 *   dot     {boolean}        — show a leading colored dot
 *   size    {"xs"|"sm"|"md"} — badge size
 *   pill    {boolean}        — rounder shape (default true)
 */
const StatusBadge = ({
  status = "",
  label,
  dot = false,
  size = "md",
  pill = true,
}) => {
  const key = String(status)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const colorClass = VARIANTS[key] || "bg-gray-100 text-gray-600";
  const dotColor = DOT_COLORS[key] || "bg-gray-400";
  const displayText = formatLabel(
    label ?? DISPLAY_LABELS[key] ?? status,
    "Not Available",
  );

  const sizeClass =
    size === "xs"
      ? "text-[9px] px-1.5 py-0.5"
      : size === "sm"
        ? "text-[10px] px-1.5 py-0.5"
        : "text-xs px-2.5 py-1";

  const shapeClass = pill ? "rounded-full" : "rounded-md";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border font-medium ${colorClass} ${sizeClass} ${shapeClass}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`}
        />
      )}
      {displayText}
    </span>
  );
};

export default StatusBadge;
