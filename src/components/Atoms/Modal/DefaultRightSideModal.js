import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { RxCross2 } from "react-icons/rx";
import TransparentButton from "../buttons/TransParentButton";
import Button from "../buttons/button";

const DefaultModal = ({
  isOpen,
  onClose,
  onSubmit,
  children,
  isButtonView = true,
  submitButtonText = "Submit",
  closeButtonText = "Reset",
  title,
  titleClassName = "",
  width = "600px",
  loading = false,
  closeOnOutsideClick = true,
}) => {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || loading) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && onClose?.();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, loading, onClose]);

  const modal = (
    <>
      <div
        className={`fixed inset-0 z-[10000] transition-all duration-300 ease-in-out 
                    ${isOpen ? "bg-[rgba(31,27,95,0.32)] backdrop-blur-sm" : "bg-transparent backdrop-blur-0 pointer-events-none"}
                `}
        onClick={!loading && closeOnOutsideClick ? onClose : undefined}
      />
      <div
        className={`
        fixed bottom-0 right-0 top-0 flex h-screen w-full flex-col overflow-hidden md:w-[var(--modal-width)] bg-white shadow-[var(--admin-shadow-strong)] z-[10001] text-sm
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "translate-x-full"}
                `}
        style={{
          "--modal-width": width,
          ...(!isOpen ? { pointerEvents: "none" } : {}),
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="admin-card-header flex shrink-0 items-center justify-between bg-white px-4 sm:px-6 py-3 sm:py-4">
          <h2
            className={`text-lg font-semibold text-[var(--admin-ink)] ${titleClassName}`}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 transition-colors duration-150 p-1"
            aria-label="Close modal"
          >
            <RxCross2 size={20} className="sm:w-5 sm:h-5 w-4 h-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>

        {isButtonView && (
          <div className="shrink-0 bg-[var(--admin-surface-soft)] py-3 px-6 flex justify-between items-center border-t border-[var(--admin-line)] gap-2">
            <TransparentButton
              onClick={onClose}
              label={closeButtonText}
              isDisable={loading}
              className="flex-1 sm:flex-none"
            />
            <Button
              onClick={onSubmit}
              loading={loading}
              isDisable={loading}
              className="flex-1 sm:flex-none button-primary"
            >
              {submitButtonText}
            </Button>
          </div>
        )}
      </div>
    </>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
};

export default DefaultModal;
