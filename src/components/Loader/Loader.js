import React from "react";

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

  return (
    <div
      className={`${fullScreen ? "fixed inset-0 z-[9999] bg-black/40 backdrop-blur-[2px]" : "min-h-32"} flex items-center justify-center`}
      role="status"
      aria-label={label || "Loading"}
    >
      <div className="flex flex-col items-center gap-3 rounded-lg bg-white px-6 py-5 shadow-xl">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#e8eefc] border-t-[#082f91]" />
        {label && <span className="text-sm font-medium text-[#202337]">{label}</span>}
      </div>
    </div>
  );
};

export default React.memo(Loader);
