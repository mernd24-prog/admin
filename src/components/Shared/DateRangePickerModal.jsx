import React from "react";

const MODAL_OVERLAY =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4";

const MODAL_CONTAINER =
  "w-full max-w-[390px] rounded-xl border border-[var(--admin-gold)] bg-white shadow-2xl";

const MODAL_HEADER =
  "flex items-center justify-between border-b border-slate-100 px-5 py-4";

const MODAL_TITLE =
  "text-base font-medium text-[var(--admin-ink)]";

const MODAL_SUBTITLE =
  "mt-1 text-xs font-normal text-[var(--admin-muted)]";

const CLOSE_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-md text-lg font-normal text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50";

const MODAL_CONTENT =
  "px-5 py-5";

/**
 * Reusable Date Range Picker Modal Container Component
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

  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div
        className={MODAL_CONTAINER}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={MODAL_HEADER}>
          <div>
            <h2 className={MODAL_TITLE}>{title}</h2>
            {/* {subtitle && <p className={MODAL_SUBTITLE}>{subtitle}</p>} */}
          </div>

          <button
            type="button"
            className={CLOSE_BUTTON}
            onClick={onClose}
            disabled={loading}
            aria-label="Close date range picker"
          >
            ×
          </button>
        </div>

        <div className={MODAL_CONTENT}>{children}</div>
      </div>
    </div>
  );
};

export default DateRangePickerModal;
