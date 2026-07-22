/**
 * Shared formatting utilities for the Admin panel.
 * All functions return a safe string — never null, undefined, or raw DB keys.
 */

// ── Date / Time ───────────────────────────────────────────────────────────────

/**
 * Format a date value to "DD MMM YYYY" (e.g. "23 Jun 2026").
 * Returns "Not available" when the value is falsy or invalid.
 */
export function formatDate(value, fallback = "Not available") {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a date-time value to "DD MMM YYYY, HH:MM" (24-hour).
 * Returns "Not available" when the value is falsy or invalid.
 */
export function formatDateTime(value, fallback = "Not available") {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format a date value to a relative label if recent ("Today", "Yesterday"),
 * otherwise falls back to formatDate.
 */
export function formatRelativeDate(value, fallback = "Not available") {
  if (!value) return fallback;
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return formatDate(value, fallback);
}

// ── Text / Labels ─────────────────────────────────────────────────────────────

/**
 * Convert a raw DB key or enum value to a readable title-cased label.
 * Examples:
 *   "order_status"       → "Order Status"
 *   "pending_payment"    → "Pending Payment"
 *   "cod-config"         → "Cod-Config"
 *   "seller_kyc_PENDING" → "Seller Kyc Pending"
 *   ""                   → "Not available"
 */
// export function formatLabel(value, fallback = "Not available") {
//   if (value === null || value === undefined || value === "") return fallback;
//   return String(value)
//     .replace(/([a-z])([A-Z])/g, "$1 $2")
//     .replace(/_+/g, " ")
//     .replace(/\s+/g, " ")
//     .trim()
//     .replace(/\b\w/g, (char) => char.toUpperCase()) || fallback;
// }
export function formatLabel(value, fallback = "Not available") {
  if (
    value == null ||
    (typeof value === "string" &&
      ["", "NA", "N/A"].includes(value.trim().toUpperCase()))
  ) {
    return fallback;
  }

  const text = String(value).trim();

  // Preserve emails and URLs
  if (/@/.test(text) || /^https?:\/\//i.test(text) || /^www\./i.test(text)) {
    return text;
  }

  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
/**
 * Convert an array of raw status strings into select option objects
 * with properly formatted labels.
 *   ["pending_payment", "confirmed"] →
 *   [{ value: "pending_payment", label: "Pending Payment" }, ...]
 */
export function statusOptions(statuses = []) {
  return statuses.map((s) => ({ value: s, label: formatLabel(s) }));
}

// ── Currency / Numbers ────────────────────────────────────────────────────────

/**
 * Format a number as Indian Rupee currency.
 * Returns "Not available" for falsy/NaN values unless a fallback is provided.
 */
export function formatCurrency(value, fallback = "Not available") {
  const n = Number(value);
  if (value === null || value === undefined || isNaN(n)) return fallback;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
}

/**
 * Format a number with Indian locale commas (no currency symbol).
 */
export function formatNumber(value, fallback = "0") {
  const n = Number(value);
  if (value === null || value === undefined || isNaN(n)) return fallback;
  return new Intl.NumberFormat("en-IN").format(n);
}

// ── Phone ─────────────────────────────────────────────────────────────────────

/**
 * Format a phone number string for display.
 * Adds +91 prefix for 10-digit Indian numbers.
 */
export function formatPhone(value, fallback = "Not available") {
  if (!value) return fallback;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith("91"))
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return value;
}

// ── Address ───────────────────────────────────────────────────────────────────

/**
 * Format an address object into a single readable string.
 * Accepts any shape with line1/line2/city/state/postalCode/country keys
 * or their snake_case equivalents.
 */
export function formatAddress(addr, fallback = "Not available") {
  if (!addr || typeof addr !== "object") return fallback;
  const parts = [
    addr.line1 || addr.address_line1,
    addr.line2 || addr.address_line2,
    addr.city,
    addr.state,
    addr.postalCode || addr.postal_code || addr.pincode || addr.zip,
    addr.country,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : fallback;
}

// ── Name ──────────────────────────────────────────────────────────────────────

/**
 * Combine first + last name from a profile/user object.
 * Falls back to email, username, or the provided fallback.
 */
export function formatName(user, fallback = "Not available") {
  if (!user) return fallback;
  const first = user.profile?.firstName || user.firstName || "";
  const last = user.profile?.lastName || user.lastName || "";
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || user.full_name || user.fullName || user.name || user.email || user.userName || fallback;
}

// ── File size ─────────────────────────────────────────────────────────────────

export function formatFileSize(bytes, fallback = "Unknown size") {
  if (!bytes || isNaN(bytes)) return fallback;
  const units = ["B", "KB", "MB", "GB"];
  let size = Number(bytes);
  let i = 0;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
