import React, { useEffect, useState } from "react";
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
  submitDisabled = false,
  showCloseButton = false,
  closeOnOutsideClick = true,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame;
    let timer;

    if (isOpen) {
      setShouldRender(true);

      frame = requestAnimationFrame(() => {
        setVisible(true);
      });
    } else {
      setVisible(false);

      timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
    }

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRender) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldRender]);

  useEffect(() => {
    if (!isOpen || loading) return;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, loading, onClose]);

  if (!shouldRender || typeof document === "undefined") {
    return null;
  }

  const modal = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[10000] bg-[rgba(31,27,95,0.32)] backdrop-blur-sm"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 200ms ease-in-out",
          pointerEvents: visible ? "auto" : "none",
        }}
        onClick={
          visible && !loading && closeOnOutsideClick ? onClose : undefined
        }
      />

      {/* Drawer - no sliding animation */}
      <div
        className="fixed bottom-0 right-0 top-0 flex h-screen w-full flex-col overflow-hidden md:w-[var(--modal-width)] bg-white shadow-[var(--admin-shadow-strong)] z-[10001] text-sm"
        style={{
          "--modal-width": width,
          opacity: visible ? 1 : 0,
          transition: "opacity 200ms ease-in-out",
          pointerEvents: visible ? "auto" : "none",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="admin-card-header flex shrink-0 items-center justify-between bg-white px-4 sm:px-6 py-3 sm:py-4">
          <h2
            className={`text-lg font-semibold text-[var(--admin-ink)] ${titleClassName}`}
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 p-1"
            aria-label="Close modal"
          >
            <RxCross2 size={20} className="sm:w-5 sm:h-5 w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>

        {/* Footer */}
        {(isButtonView || showCloseButton) && (
          <div
            className={`shrink-0 bg-[var(--admin-surface-soft)] py-3 px-6 flex ${
              isButtonView ? "justify-between" : "justify-end"
            } items-center border-t border-[var(--admin-line)] gap-2`}
          >
            <TransparentButton
              onClick={onClose}
              label={closeButtonText}
              isDisable={loading}
              className="flex-1 sm:flex-none"
            />

            {isButtonView && (
              <Button
                onClick={onSubmit}
                loading={loading}
                isDisable={loading || submitDisabled}
                className="flex-1 sm:flex-none button-primary"
              >
                {submitButtonText}
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );

  return createPortal(modal, document.body);
};

export default DefaultModal;
