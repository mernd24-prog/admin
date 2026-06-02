import React from 'react';
import { MdClose } from 'react-icons/md';
import PermissionGuard from '../Atoms/PermissionGuard/PermissionGuard';

/**
 * BulkActionBar
 *
 * Appears above a DataTable when one or more rows are selected.
 * Hides completely when nothing is selected.
 *
 * Props:
 *   selectedCount  {number}                     — number of selected rows
 *   totalCount     {number}                     — total records in the current page
 *   onClear        {() => void}                 — deselect all
 *   onSelectAll    {() => void}                 — select all on current page
 *   module         {string}                     — RBAC module slug for permission guards
 *   actions        {BulkAction[]}               — list of action buttons to render
 *   loading        {boolean}                    — disable buttons while processing
 *
 * BulkAction shape:
 *   {
 *     label:     string,
 *     icon?:     React.ReactNode,
 *     action:    string,               — RBAC action slug (e.g. "delete", "status_change")
 *     onClick:   () => void,
 *     variant?:  "danger" | "warning" | "primary" | "default",
 *     disabled?: boolean,
 *   }
 */

const VARIANT_CLASSES = {
  danger:   'text-red-600   hover:bg-red-50   border-red-200',
  warning:  'text-yellow-600 hover:bg-yellow-50 border-yellow-200',
  primary:  'text-[var(--admin-blue)] hover:bg-[var(--admin-blue-soft)] border-[var(--admin-blue)]/30',
  default:  'text-[var(--admin-muted)] hover:bg-white border-[var(--admin-line)]',
};

const BulkActionBar = ({
  selectedCount = 0,
  totalCount = 0,
  onClear,
  onSelectAll,
  module: moduleSlug,
  actions = [],
  loading = false,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-[var(--admin-gold-soft)] border border-[var(--admin-line)] rounded-lg mb-2 animate-fade-in">
      {/* Count + clear */}
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--admin-navy)] flex-shrink-0">
        <span className="inline-flex items-center justify-center w-5 h-5 bg-[var(--admin-gold)] text-[var(--admin-navy)] text-[10px] font-bold rounded-full">
          {selectedCount}
        </span>
        <span>{selectedCount} selected</span>
        {totalCount > 0 && selectedCount < totalCount && onSelectAll && (
          <button
            type="button"
            onClick={onSelectAll}
            className="ml-1 text-xs text-[var(--admin-blue)] hover:text-[var(--admin-navy)] underline underline-offset-2"
          >
            Select all {totalCount}
          </button>
        )}
      </div>

      {/* Divider */}
      <span className="hidden sm:block w-px h-4 bg-[var(--admin-line-strong)]" />

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action, idx) => {
          const variantClass = VARIANT_CLASSES[action.variant || 'default'];
          const btn = (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={loading || action.disabled}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClass}`}
            >
              {action.icon && <span className="text-[14px]">{action.icon}</span>}
              {action.label}
            </button>
          );

          if (moduleSlug && action.action) {
            return (
              <PermissionGuard key={idx} module={moduleSlug} action={action.action} hide>
                {btn}
              </PermissionGuard>
            );
          }
          return React.cloneElement(btn, { key: idx });
        })}
      </div>

      {/* Clear selection */}
      <button
        type="button"
        onClick={onClear}
        disabled={loading}
        className="ml-auto flex items-center gap-1 text-xs text-[var(--admin-muted)] hover:text-[var(--admin-navy)] disabled:opacity-50"
        aria-label="Clear selection"
      >
        <MdClose size={14} />
        Clear
      </button>
    </div>
  );
};

export default BulkActionBar;
