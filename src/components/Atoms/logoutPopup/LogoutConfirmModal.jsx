export default function LogoutConfirmModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000000]/20 px-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel?.();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        className="relative w-full max-w-[450px] rounded-lg bg-white p-6  py-6 shadow-[0_12px_30px_rgba(17,24,39,0.12)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-[#1B1D60]/25 bg-white text-[20px] font-medium leading-none text-[#1B1D60] transition-colors hover:bg-[#f5f7ff]"
        >
          ×
        </button>

        <div className="pr-10">
          <h2
            id="logout-confirm-title"
            className="text-[19px] font-bold leading-[1.2] text-[#1B1D60]"
          >
            Sign Out
          </h2>

          <p className="mt-3 text-[15px] leading-[1.5] text-[#1B1D60]">
            Are you sure you want to sign out of your account?
          </p>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="h-[40px] min-w-[96px] rounded-lg border border-[#1B1D60] bg-white px-4 text-[15px] font-semibold text-[#1B1D60] transition-colors hover:bg-[#f4f6ff]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="h-[40px] min-w-[96px] rounded-lg border border-[#D93C3C] bg-[#D93C3C] px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#c52f2f]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
