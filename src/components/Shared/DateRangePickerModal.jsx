import React from "react";
import { createPortal } from "react-dom";

/**
 * Reusable Date Range Picker Modal Container Component
 * Uses React Portal to isolate from parent stacking contexts and table bleed-through.
 */
export const DateRangePickerModal = ({
  open,
  onClose,
  title = "Select Date Range",
  subtitle,
  loading = false,
  children,
}) => {
  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
            aria-label="Close date range picker"
          >
            ×
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : content;
};

export default DateRangePickerModal;
