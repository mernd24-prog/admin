import React from "react";

/**
 * Reusable Date Range Picker Modal Container Component
 */
export const DateRangePickerModal = ({
  open,
  onClose,
  title = "Select Date Range",
  subtitle = "Filter data will update after apply.",
  loading = false,
  children,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[380px] rounded-lg border border-[var(--admin-gold)] bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--admin-ink)]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="rounded border border-transparent px-2 py-1 text-lg leading-none text-slate-400 hover:border-slate-200 hover:text-slate-700 disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
            aria-label="Close date range picker"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

export default DateRangePickerModal;
