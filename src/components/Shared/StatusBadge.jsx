import React from 'react';

const VARIANTS = {
  // Generic states
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  draft:    'bg-blue-100 text-blue-600',
  published:'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
  // Order states
  placed:       'bg-blue-100 text-blue-700',
  confirmed:    'bg-indigo-100 text-indigo-700',
  shipped:      'bg-purple-100 text-purple-700',
  delivered:    'bg-green-100 text-green-700',
  cancelled:    'bg-red-100 text-red-700',
  returned:     'bg-orange-100 text-orange-700',
  refunded:     'bg-teal-100 text-teal-700',
  // Inventory
  in_stock:     'bg-green-100 text-green-700',
  low_stock:    'bg-yellow-100 text-yellow-700',
  out_of_stock: 'bg-red-100 text-red-700',
  backorder:    'bg-orange-100 text-orange-700',
  // Approval / moderation
  under_review: 'bg-yellow-100 text-yellow-700',
  // Misc
  yes: 'bg-green-100 text-green-700',
  no:  'bg-gray-100 text-gray-500',
  true:  'bg-green-100 text-green-700',
  false: 'bg-gray-100 text-gray-500',
};

const DOT_COLORS = {
  active: 'bg-green-500', pending: 'bg-yellow-400', rejected: 'bg-red-500',
  approved: 'bg-green-500', draft: 'bg-blue-400', inactive: 'bg-gray-400',
  published: 'bg-green-500', shipped: 'bg-purple-500', delivered: 'bg-green-500',
  cancelled: 'bg-red-500', in_stock: 'bg-green-500', low_stock: 'bg-yellow-400',
  out_of_stock: 'bg-red-500',
};

/**
 * StatusBadge
 *
 * Props:
 *   status  {string}  — status key (e.g. "active", "pending", "shipped")
 *   label   {string}  — override display text (defaults to formatted status)
 *   dot     {boolean} — show a leading colored dot
 *   size    {"sm"|"md"} — badge size
 */
const StatusBadge = ({ status = '', label, dot = false, size = 'md' }) => {
  const key = String(status).toLowerCase().replace(/\s+/g, '_');
  const colorClass = VARIANTS[key] || 'bg-gray-100 text-gray-600';
  const dotColor   = DOT_COLORS[key] || 'bg-gray-400';
  const displayText = label ?? String(status).replace(/_/g, ' ');
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${colorClass} ${sizeClass}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />}
      {displayText}
    </span>
  );
};

export default StatusBadge;
