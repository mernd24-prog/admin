import React, { useEffect } from "react";
import { MdWarning, MdError, MdInfo, MdCheckCircle } from "react-icons/md";
import { RxCross2 } from "react-icons/rx";

const ICON_MAP = {
  warning: { Icon: MdWarning, bg: "bg-yellow-100", color: "text-yellow-600" },
  danger: { Icon: MdError, bg: "bg-red-100", color: "text-red-600" },
  info: { Icon: MdInfo, bg: "bg-blue-100", color: "text-blue-600" },
  success: { Icon: MdCheckCircle, bg: "bg-green-100", color: "text-green-600" },
};

const BTN_VARIANTS = {
  danger: "bg-red-600 hover:bg-red-700 text-white",
  warning: "bg-yellow-500 hover:bg-yellow-600 text-white",
  primary:
    "bg-[var(--admin-gold)] hover:bg-[var(--admin-gold-dark)] text-[var(--admin-navy)]",
  success: "bg-green-600 hover:bg-green-700 text-white",
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
    const closeOnEscape = (event) => event.key === "Escape" && handleClose?.();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [handleClose, loading, visible]);

  if (!visible) return null;

  const { Icon, bg, color } = ICON_MAP[variant] || ICON_MAP.warning;
  const btnClass = BTN_VARIANTS[variant] || BTN_VARIANTS.primary;

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(31,27,95,0.35)] backdrop-blur-[2px]"
        onClick={!loading ? handleClose : undefined}
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="admin-card relative w-full max-w-md mx-4 p-6 animate-fade-in"
      >
        {/* Close */}
        <button
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          <RxCross2 size={20} />
        </button>

        {/* Icon + title */}
        <div className="flex items-start gap-4 mb-4">
          <span
            className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${bg}`}
          >
            <Icon size={22} className={color} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-[var(--admin-ink)]">
              {title}
            </h3>
            {body && (
              <div className="text-sm text-[var(--admin-muted)] mt-1">
                {body}
              </div>
            )}
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={loading}
            className="admin-btn-secondary !min-h-9 px-4 py-2 text-sm disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${btnClass}`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Loading…
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
