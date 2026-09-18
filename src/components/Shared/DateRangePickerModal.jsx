import React from "react";
import { createPortal } from "react-dom";

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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] overflow-hidden rounded-2xl  bg-[#FFF7EA] shadow-[0_20px_50px_rgba(31,27,95,0.25)] transition-all"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between  px-5 py-4 bg-darkInk">
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>

            {subtitle && (
              <p className="mt-1 text-xs text-white/70">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 text-xl leading-none text-white/80 transition-all hover:border-[#D6A323] hover:bg-white hover:text-[#1F1B5F] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
            aria-label="Close date range picker"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="bg-[#FFF7EA] p-5">{children}</div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : content;
};

export default DateRangePickerModal;
