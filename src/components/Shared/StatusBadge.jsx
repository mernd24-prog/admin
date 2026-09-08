import React from "react";
import { formatLabel } from "../../utils/formatters";

// Color map: status key → Tailwind classes
const VARIANTS = {
  // ── Generic ──────────────────────────────────────────────────────────────
  active: "bg-green-50 text-green-700 border-green-200",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
  enabled: "bg-green-50 text-green-700 border-green-200",
  disabled: "bg-gray-50 text-gray-500 border-gray-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partially_live: "bg-cyan-50 text-cyan-700 border-cyan-200",
  partially_verified: "bg-cyan-50 text-cyan-700 border-cyan-200",
  partially_approved: "bg-cyan-50 text-cyan-700 border-cyan-200",
  approval_pending: "bg-amber-50 text-amber-700 border-amber-200",
  not_created: "bg-gray-50 text-gray-500 border-gray-200",
  on_hold: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  resubmitted: "bg-cyan-50 text-cyan-700 border-cyan-200",
  draft: "bg-blue-50 text-blue-600 border-blue-200",
  published: "bg-green-50 text-green-700 border-green-200",
  unpublished: "bg-gray-50 text-gray-500 border-gray-200",
  archived: "bg-gray-50 text-gray-500 border-gray-200",
  suspended: "bg-orange-50 text-orange-700 border-orange-200",
  blocked: "bg-red-50 text-red-800 border-red-200",
  banned: "bg-red-50 text-red-800 border-red-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  unverified: "bg-amber-50 text-amber-700 border-amber-200",
  seen: "bg-green-50 text-green-700 border-green-200",
  unseen: "bg-blue-50 text-blue-700 border-blue-200",
  // ── Onboarding, KYC & Go Live ─────────────────────────────────────────────
  live: "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold",
  ready_for_go_live: "bg-teal-50 text-teal-700 border-teal-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  initiated: "bg-indigo-50 text-indigo-700 border-indigo-200",
  not_submitted: "bg-slate-50 text-slate-500 border-slate-200",
  under_review: "bg-amber-50 text-amber-700 border-amber-200",
  pending_review: "bg-amber-50 text-amber-700 border-amber-200",
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  // ── Orders ───────────────────────────────────────────────────────────────
  placed: "bg-blue-50 text-blue-700 border-blue-200",
  confirmed: "bg-indigo-50 text-indigo-700 border-indigo-200",
  processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  packed: "bg-purple-50 text-purple-600 border-purple-200",
  ready_to_ship: "bg-purple-50 text-purple-700 border-purple-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  out_for_delivery: "bg-violet-50 text-violet-700 border-violet-200",
  partially_delivered: "bg-sky-50 text-sky-700 border-sky-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  return_requested: "bg-amber-50 text-amber-700 border-amber-200",
  partially_returned: "bg-orange-50 text-orange-700 border-orange-200",
  returned: "bg-orange-50 text-orange-700 border-orange-200",
  failed_delivery: "bg-red-50 text-red-700 border-red-200",
  payment_failed: "bg-red-50 text-red-700 border-red-200",
  pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
  partially_refunded: "bg-cyan-50 text-cyan-700 border-cyan-200",
  refunded: "bg-teal-50 text-teal-700 border-teal-200",
  failed: "bg-red-50 text-red-600 border-red-200",
  // ── Returns ──────────────────────────────────────────────────────────────
  requested: "bg-amber-50 text-amber-700 border-amber-200",
  picked_up: "bg-blue-50 text-blue-700 border-blue-200",
  closed: "bg-gray-50 text-gray-500 border-gray-200",
  // ── Inventory ────────────────────────────────────────────────────────────
  in_stock: "bg-green-50 text-green-700 border-green-200",
  low_stock: "bg-red-50 text-red-700 border-red-200",
  out_of_stock: "bg-red-50 text-red-700 border-red-200",
  backorder: "bg-orange-50 text-orange-700 border-orange-200",
  discontinued: "bg-gray-50 text-gray-500 border-gray-200",
  // ── Shipments ────────────────────────────────────────────────────────────
  in_transit: "bg-blue-50 text-blue-700 border-blue-200",
  // ── Subscriptions ────────────────────────────────────────────────────────
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  expired: "bg-red-50 text-red-600 border-red-200",
  // ── Payments ─────────────────────────────────────────────────────────────
  completed: "bg-green-50 text-green-700 border-green-200",
  held: "bg-amber-50 text-amber-700 border-amber-200",
  released: "bg-blue-50 text-blue-700 border-blue-200",
  // ── Fraud ────────────────────────────────────────────────────────────────
  open: "bg-red-50 text-red-700 border-red-200",
  investigating: "bg-orange-50 text-orange-700 border-orange-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  dismissed: "bg-gray-50 text-gray-500 border-gray-200",
  // ── Misc ─────────────────────────────────────────────────────────────────
  yes: "bg-green-50 text-green-700 border-green-200",
  no: "bg-gray-50 text-gray-500 border-gray-200",
  true: "bg-green-50 text-green-700 border-green-200",
  false: "bg-gray-50 text-gray-500 border-gray-200",
  1: "bg-green-50 text-green-700 border-green-200",
  0: "bg-gray-50 text-gray-500 border-gray-200",
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
  pending: "bg-amber-500",
  ready: "bg-emerald-500",
  partially_live: "bg-cyan-500",
  partially_verified: "bg-cyan-500",
  partially_approved: "bg-cyan-500",
  approval_pending: "bg-amber-500",
  on_hold: "bg-amber-500",
  under_review: "bg-amber-500",
  pending_review: "bg-amber-500",
  low_stock: "bg-red-500",
  paused: "bg-amber-500",
  processing: "bg-indigo-400",
  held: "bg-amber-500",
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
  pending_payment: "bg-amber-500",
  suspended: "bg-orange-500",
  blocked: "bg-red-700",
  banned: "bg-red-700",
  out_of_stock: "bg-red-500",
  inactive: "bg-gray-400",
  archived: "bg-gray-400",
  closed: "bg-gray-400",
  live: "bg-emerald-500",
  ready_for_go_live: "bg-teal-500",
  in_progress: "bg-blue-500",
  initiated: "bg-indigo-500",
  not_submitted: "bg-slate-400",
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
  live: "Live",
  ready_for_go_live: "Ready For Go Live",
  in_progress: "In Progress",
  not_submitted: "Not Submitted",
  initiated: "Initiated",
};

/**
 * StatusBadge
 *
 * Props:
 *   status     {string}         — status key (e.g. "active", "shipped")
 *   label      {string}         — override display text
 *   dot        {boolean}        — show a leading colored dot
 *   size       {"xs"|"sm"|"md"} — badge size
 *   pill       {boolean}        — rounder shape (default true)
 *   className  {string}         — custom additional classes
 */
const StatusBadge = ({
  status = "",
  label,
  dot = false,
  size = "md",
  pill = true,
  className = "",
}) => {
  const key = String(status)
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const colorClass = VARIANTS[key] || "bg-gray-50 text-gray-600 border-gray-200";
  const dotColor = DOT_COLORS[key] || "bg-gray-400";
  const displayText = formatLabel(
    label ?? DISPLAY_LABELS[key] ?? status,
    "Not Available",
  );

  const sizeClass =
    size === "xs"
      ? "text-[10px] px-2 py-0.5 leading-tight"
      : size === "sm"
        ? "text-[11px] px-2.5 py-0.5 leading-normal"
        : "text-xs px-3 py-1 leading-normal";

  const shapeClass = pill ? "rounded-full" : "rounded-md";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border font-medium transition-colors ${colorClass} ${sizeClass} ${shapeClass} ${className}`}
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
