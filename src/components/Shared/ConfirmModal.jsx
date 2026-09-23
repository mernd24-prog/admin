import React, { useEffect } from "react";
import { MdWarning, MdError, MdInfo, MdCheckCircle } from "react-icons/md";
import { RxCross2 } from "react-icons/rx";

const ICON_MAP = {
  warning: {
    Icon: MdWarning,
    bg: "bg-amber-50",
    color: "text-amber-500",
    ring: "ring-amber-100",
  },
  danger: {
    Icon: MdError,
    bg: "bg-red-50",
    color: "text-red-500",
    ring: "ring-red-100",
  },
  info: {
    Icon: MdInfo,
    bg: "bg-blue-50",
    color: "text-blue-500",
    ring: "ring-blue-100",
  },
  success: {
    Icon: MdCheckCircle,
    bg: "bg-green-50",
    color: "text-green-500",
    ring: "ring-green-100",
  },
};

const BTN_VARIANTS = {
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md",
  warning:
    "bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md",
  primary:
    "bg-[var(--admin-gold)] hover:bg-[var(--admin-gold-dark)] text-[var(--admin-navy)] shadow-sm hover:shadow-md",
  success:
    "bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md",
};

/**
 * ConfirmModal
 *
 * Props:
 *   open         {boolean}
 *   onClose      {() => void}
 *   onConfirm    {() => void}
 *   title        {string}
 *   message      {string | React.ReactNode}
 *   variant      {"warning"|"danger"|"info"|"success"}
 *   confirmLabel {string}
 *   cancelLabel  {string}
 *   loading      {boolean}
 */
const ConfirmModal = ({
  open,
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = "Are you sure?",
  message,
  description,
  variant = "warning",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  children,
}) => {
  const visible = open ?? isOpen;
  const handleClose = onClose || onCancel;
  const body = message ?? description;

  useEffect(() => {
    if (!visible || loading) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        handleClose?.();
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [handleClose, loading, visible]);

  if (!visible) return null;

  const { Icon, bg, color, ring } = ICON_MAP[variant] || ICON_MAP.warning;

  const btnClass = BTN_VARIANTS[variant] || BTN_VARIANTS.primary;

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(31,27,95,0.38)] backdrop-blur-[3px]"
        onClick={!loading ? handleClose : undefined}
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="
          admin-card
          relative
          w-full
          max-w-[440px]
          overflow-hidden
          rounded-2xl
          border
          border-gray-200
          bg-white
          shadow-[0_20px_60px_rgba(31,27,95,0.18)]
          animate-fade-in
        "
      >
        {/* Top subtle accent */}

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          aria-label="Close"
          className="
            absolute
            right-4
            top-4
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-lg
            text-gray-400
            transition-all
            hover:bg-gray-100
            hover:text-gray-700
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <RxCross2 size={18} />
        </button>

        {/* Content */}
        <div className="px-6 pb-5 pt-6 sm:px-7">
          {/* Icon + Heading */}
          <div className="flex items-start gap-4 pr-8">
            <div
              className={`
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-xl
                ${bg}
                ring-4
                ${ring}
              `}
            >
              <Icon size={24} className={color} />
            </div>

            <div className="min-w-0 pt-0.5">
              <h3 className="text-[17px] font-bold leading-6 text-[var(--admin-ink)]">
                {title}
              </h3>

              {body && (
                <div className="mt-1.5 text-sm leading-5 text-[var(--admin-muted)]">
                  {body}
                </div>
              )}
            </div>
          </div>

          {/* Custom Content */}
          {children && (
            <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
              {children}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 bg-gray-50/60 px-6 py-4 sm:px-7">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="
              inline-flex
              min-h-9
              items-center
              justify-center
              rounded-lg
              border
              border-gray-200
              bg-white
              px-4
              py-2
              text-sm
              font-semibold
              text-gray-600
              transition-all
              hover:border-gray-300
              hover:bg-gray-50
              hover:text-gray-800
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`
              inline-flex
              min-h-9
              items-center
              justify-center
              rounded-lg
              px-4
              py-2
              text-sm
              font-semibold
              transition-all
              disabled:cursor-not-allowed
              disabled:opacity-60
              ${btnClass}
            `}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                <span>Loading...</span>
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
