/**
 * Centralized status enums for the Admin panel.
 * Import from here instead of redefining locally in each page.
 *
 * Usage:
 *   import { ORDER_STATUSES, statusOptions } from "../../../constants/statusConstants";
 *   options={statusOptions(ORDER_STATUSES)}
 */

import { statusOptions } from "../utils/formatters";

// ── Orders ────────────────────────────────────────────────────────────────────

export const ORDER_STATUSES = [
  "pending_payment",
  "payment_failed",
  "confirmed",
  "processing",
  "packed",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
  "failed_delivery",
  "fulfilled",
  "return_requested",
  "partially_returned",
  "returned",
  "refunded",
  "on_hold",
  "cancelled",
];

export const ORDER_STATUS_OPTIONS = statusOptions(ORDER_STATUSES);

// ── Payments ──────────────────────────────────────────────────────────────────

export const PAYMENT_STATUSES = [
  "initiated",
  "authorized",
  "captured",
  "failed",
  "partially_refunded",
  "refunded",
  "cancelled",
];

export const PAYMENT_STATUS_OPTIONS = statusOptions(PAYMENT_STATUSES);

export const PAYMENT_PROVIDERS = [
  "razorpay",
  "stripe",
  "cod",
  "manual_bank_transfer",
  "manual_upi",
  "wallet_only",
];

export const PAYMENT_PROVIDER_OPTIONS = statusOptions(PAYMENT_PROVIDERS);

// ── Delivery ──────────────────────────────────────────────────────────────────

export const DELIVERY_STATUSES = [
  "initiated",
  "manifested",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "partially_delivered",
  "delivered",
  "delivered_verified",
  "failed",
  "cancelled",
  "rto",
  "lost",
  "damaged",
];

export const DELIVERY_STATUS_OPTIONS = statusOptions(DELIVERY_STATUSES);

// ── Returns ───────────────────────────────────────────────────────────────────

export const RETURN_STATUSES = [
  "requested",
  "approved",
  "rejected",
  "reverse_pickup_scheduled",
  "pickup_failed",
  "manual_ship_back",
  "shipped_back",
  "in_reverse_transit",
  "received",
  "qc_passed",
  "qc_failed",
  "qc_completed",
  "refund_pending",
  "refund_failed",
  "partially_refunded",
  "refunded",
  "replacement_pending",
  "replaced",
  "closed",
];

export const RETURN_STATUS_OPTIONS = statusOptions(RETURN_STATUSES);

export const RETURN_REASONS = [
  "defective",
  "damaged_in_transit",
  "wrong_item",
  "missing_parts",
  "size_issue",
  "quality_issue",
  "not_as_described",
  "changed_mind",
  "other",
];

export const RETURN_REASON_OPTIONS = statusOptions(RETURN_REASONS);

export const REFUND_STATUSES = [
  "not_started",
  "pending",
  "provider_pending",
  "completed",
  "failed",
  "manual_review",
];

export const REFUND_STATUS_OPTIONS = statusOptions(REFUND_STATUSES);

// ── Cancellations ─────────────────────────────────────────────────────────────

export const CANCELLATION_STATUSES = [
  "processing",
  "refund_pending",
  "manual_review",
  "completed",
  "failed",
];

export const CANCELLATION_STATUS_OPTIONS = statusOptions(CANCELLATION_STATUSES);

export const CANCEL_REASON_CODES = [
  "changed_mind",
  "ordered_by_mistake",
  "address_issue",
  "payment_issue",
  "seller_unavailable",
  "inventory_unavailable",
  "delivery_delay",
  "pricing_issue",
  "other",
];

export const CANCEL_REASON_OPTIONS = statusOptions(CANCEL_REASON_CODES);

// ── Users / Accounts ──────────────────────────────────────────────────────────

export const USER_STATUS_OPTIONS = [
  { value: "false", label: "Active" },
  { value: "true", label: "Disabled" },
];

export const EMAIL_VERIFIED_OPTIONS = [
  { value: "true", label: "Verified" },
  { value: "false", label: "Unverified" },
];

// ── KYC ───────────────────────────────────────────────────────────────────────

export const KYC_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "verified",
  "rejected",
];

export const KYC_STATUS_OPTIONS = statusOptions(KYC_STATUSES);

// ── Inventory ─────────────────────────────────────────────────────────────────

export const INVENTORY_STATUSES = [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "backorder",
  "discontinued",
];

export const INVENTORY_STATUS_OPTIONS = statusOptions(INVENTORY_STATUSES);

// ── Products ──────────────────────────────────────────────────────────────────

export const PRODUCT_STATUSES = [
  "draft",
  "published",
  "unpublished",
  "archived",
];

export const PRODUCT_STATUS_OPTIONS = statusOptions(PRODUCT_STATUSES);

// ── Sellers ───────────────────────────────────────────────────────────────────

export const SELLER_STATUSES = [
  "pending",
  "active",
  "suspended",
  "rejected",
  "banned",
];

export const SELLER_STATUS_OPTIONS = statusOptions(SELLER_STATUSES);

// ── Sort directions ───────────────────────────────────────────────────────────

export const SORT_DIR_OPTIONS = [
  { value: "desc", label: "Newest First" },
  { value: "asc", label: "Oldest First" },
];

// Re-export helper so callers only need one import
export { statusOptions } from "../utils/formatters";
