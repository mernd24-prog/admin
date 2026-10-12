import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const LogoutConfirmModal = ({ isOpen, onCancel, onConfirm }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") onCancel?.();
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000000]/20 px-4 backdrop-blur-[1px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel?.();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        className="relative w-full max-w-[700px] rounded-[16px] bg-white p-6 shadow-[0_12px_30px_rgba(17,24,39,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-[#1B1D60]/25 bg-white text-[22px] font-medium leading-none text-[#1B1D60] transition-transform hover:scale-105"
        >
          ×
        </button>

        <div className="pr-12">
          <h2
            id="logout-confirm-title"
            className="text-[28px] font-bold leading-[1.2] text-[#1B1D60]"
          >
            Sign Out
          </h2>

          <p className="mt-4 text-[18px] leading-[1.5] text-[#1B1D60]">
            Are you sure you want to sign out of your account?
          </p>

          <div className="mt-6 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="h-[52px] min-w-[116px] rounded-[12px] border-2 border-[#1B1D60] bg-white px-6 text-[18px] font-semibold text-[#1B1D60] transition-colors hover:bg-[#f4f6ff]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="h-[52px] min-w-[116px] rounded-[12px] border-2 border-[#D93C3C] bg-[#D93C3C] px-6 text-[18px] font-semibold text-white transition-colors hover:bg-[#c52f2f]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default LogoutConfirmModal;