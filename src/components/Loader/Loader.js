import React from "react";
import { createPortal } from "react-dom";

export const InlineLoader = ({ label = "Loading" }) => (
  <span
    className="inline-flex items-center gap-2 text-sm text-gray-500"
    role="status"
  >
    <span className="admin-button-spinner" aria-hidden="true" /> {label}
  </span>
);

export const ButtonLoader = () => (
  <span className="admin-button-spinner" aria-hidden="true" />
);

const Loader = ({ loading = true, fullScreen = true, label }) => {
  if (!loading) return null;

  const loader = (
    <div
      className={`${fullScreen ? "fixed inset-0 z-[11000] bg-black/40 backdrop-blur-[2px]" : "min-h-32"} flex items-center justify-center`}
      role="status"
      aria-label={label || "Loading"}
    >
      <div className="flex flex-col items-center gap-3 px-6 py-5">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#e8eefc] border-t-[#082f91]" />
        {label && <span className="text-sm font-medium text-[#202337]">{label}</span>}
      </div>
    </div>
  );

  if (fullScreen && typeof document !== "undefined") {
    return createPortal(loader, document.body);
  }

  return loader;
};

export default React.memo(Loader);
