import React from 'react';

// Color map: status key → Tailwind classes
const VARIANTS = {
  // ── Generic ──────────────────────────────────────────────────────────────
  active:        'bg-green-50 text-green-700 border-green-100',
  inactive:      'bg-gray-50 text-gray-500 border-gray-100',
  enabled:       'bg-green-100 text-green-700',
  disabled:      'bg-gray-100 text-gray-500',
  pending:       'bg-yellow-50 text-yellow-700 border-yellow-100',
  approved:      'bg-green-50 text-green-700 border-green-100',
  rejected:      'bg-red-50 text-red-700 border-red-100',
  draft:         'bg-blue-50 text-blue-600 border-blue-100',
  published:     'bg-green-100 text-green-700',
  unpublished:   'bg-gray-100 text-gray-500',
  archived:      'bg-gray-100 text-gray-500',
  suspended:     'bg-orange-100 text-orange-700',
  banned:        'bg-red-100 text-red-800',
  verified:      'bg-emerald-100 text-emerald-700',
  unverified:    'bg-yellow-100 text-yellow-700',
  // ── KYC / Bank ───────────────────────────────────────────────────────────
  under_review:  'bg-yellow-100 text-yellow-700',
  submitted:     'bg-blue-100 text-blue-700',
  // ── Orders ───────────────────────────────────────────────────────────────
  placed:        'bg-blue-100 text-blue-700',
  confirmed:     'bg-indigo-100 text-indigo-700',
  processing:    'bg-indigo-100 text-indigo-700',
  packed:        'bg-purple-100 text-purple-600',
  shipped:       'bg-purple-100 text-purple-700',
  out_for_delivery: 'bg-violet-100 text-violet-700',
  delivered:     'bg-green-100 text-green-700',
  delivered_verified: 'bg-emerald-100 text-emerald-700',
  cancelled:     'bg-red-100 text-red-700',
  returned:      'bg-orange-100 text-orange-700',
  refunded:      'bg-teal-100 text-teal-700',
  failed:        'bg-red-100 text-red-600',
  // ── Returns ──────────────────────────────────────────────────────────────
  requested:     'bg-yellow-100 text-yellow-700',
  picked_up:     'bg-blue-100 text-blue-700',
  closed:        'bg-gray-100 text-gray-500',
  // ── Inventory ────────────────────────────────────────────────────────────
  in_stock:      'bg-green-100 text-green-700',
  low_stock:     'bg-red-100 text-red-700',
  out_of_stock:  'bg-red-100 text-red-700',
  backorder:     'bg-orange-100 text-orange-700',
  discontinued:  'bg-gray-100 text-gray-500',
  // ── Shipments ────────────────────────────────────────────────────────────
  in_transit:    'bg-blue-100 text-blue-700',
  // ── Subscriptions ────────────────────────────────────────────────────────
  paused:        'bg-yellow-100 text-yellow-700',
  expired:       'bg-red-100 text-red-600',
  // ── Payments ─────────────────────────────────────────────────────────────
  completed:     'bg-green-100 text-green-700',
  // ── Fraud ────────────────────────────────────────────────────────────────
  open:           'bg-red-100 text-red-700',
  investigating:  'bg-orange-100 text-orange-700',
  resolved:       'bg-green-100 text-green-700',
  dismissed:      'bg-gray-100 text-gray-500',
  // ── Misc ─────────────────────────────────────────────────────────────────
  yes:    'bg-green-100 text-green-700',
  no:     'bg-gray-100 text-gray-500',
  true:   'bg-green-100 text-green-700',
  false:  'bg-gray-100 text-gray-500',
  '1':    'bg-green-100 text-green-700',
  '0':    'bg-gray-100 text-gray-500',
};

// Dot colors (optional indicator dot)
const DOT_COLORS = {
  active:         'bg-green-500',
  enabled:        'bg-green-500',
  verified:       'bg-emerald-500',
  approved:       'bg-green-500',
  published:      'bg-green-500',
  completed:      'bg-green-500',
  delivered:      'bg-green-500',
  delivered_verified: 'bg-emerald-500',
  in_stock:       'bg-green-500',
  pending:        'bg-yellow-400',
  under_review:   'bg-yellow-400',
  low_stock:      'bg-red-500',
  paused:         'bg-yellow-400',
  processing:     'bg-indigo-400',
  packed:         'bg-purple-400',
  shipped:        'bg-purple-500',
  in_transit:     'bg-blue-500',
  rejected:       'bg-red-500',
  cancelled:      'bg-red-500',
  failed:         'bg-red-500',
  suspended:      'bg-orange-500',
  banned:         'bg-red-700',
  out_of_stock:   'bg-red-500',
  inactive:       'bg-gray-400',
  archived:       'bg-gray-400',
  closed:         'bg-gray-400',
};

// Human-readable display labels override for underscore keys
const DISPLAY_LABELS = {
  in_stock:         'In Stock',
  low_stock:        'Low Stock',
  out_of_stock:     'Out of Stock',
  out_for_delivery: 'Out for Delivery',
  delivered_verified: 'Delivered Verified',
  under_review:     'Under Review',
  picked_up:        'Picked Up',
  in_transit:       'In Transit',
  seller_kyc:       'KYC',
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
  status = '',
  label,
  dot = false,
  size = 'md',
  pill = true,
}) => {
  const key          = String(status).toLowerCase().replace(/[\s-]+/g, '_');
  const colorClass   = VARIANTS[key]   || 'bg-gray-100 text-gray-600';
  const dotColor     = DOT_COLORS[key] || 'bg-gray-400';
  const displayText  = label ?? (DISPLAY_LABELS[key] || String(status).replace(/_/g, ' '));

  const sizeClass =
    size === 'xs' ? 'text-[9px] px-1.5 py-0.5' :
    size === 'sm' ? 'text-[10px] px-1.5 py-0.5' :
                   'text-xs px-2.5 py-1';

  const shapeClass = pill ? 'rounded-full' : 'rounded-md';

  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-medium capitalize ${colorClass} ${sizeClass} ${shapeClass}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
      )}
      {displayText}
    </span>
  );
};

export default StatusBadge;
