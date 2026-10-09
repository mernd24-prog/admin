import React, { useEffect } from "react";

const LogoutConfirmModal = ({ isOpen, onCancel, onConfirm }) => {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        className="w-full max-w-[420px] rounded-xl bg-white px-6 py-10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:px-8"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2
          id="logout-confirm-title"
          className="text-center text-[15px] font-semibold text-[#1F1B5F]"
        >
          Are you sure you want to logout
        </h2>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-w-[88px] rounded-xl border border-[#D6A323] bg-white px-5 py-1.5 text-[13px] font-medium text-[#1F1B5F] transition-colors hover:bg-[#FFF7EA] focus:outline-none focus:ring-2 focus:ring-[#D6A323]/30"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="min-w-[100px] rounded-xl bg-[#D6A323] px-5 py-1.5 text-[13px] font-medium text-[#1F1B5F] transition-colors hover:bg-[#C4971F] focus:outline-none focus:ring-2 focus:ring-[#D6A323]/40"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
