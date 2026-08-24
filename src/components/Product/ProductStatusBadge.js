import React from "react";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  pending_approval: {
    label: "Pending Approval",
    color: "bg-yellow-100 text-yellow-700",
  },
  pending: {
    label: "Pending Approval",
    color: "bg-yellow-100 text-yellow-700",
  },
  approved: { label: "Approved", color: "bg-green-100 text-green-700" },
  active: { label: "Active", color: "bg-green-100 text-green-700" },
  inactive: { label: "Inactive", color: "bg-orange-100 text-orange-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700" },
  change_pending: {
    label: "Change Pending",
    color: "bg-purple-100 text-purple-700",
  },
};

const ProductStatusBadge = ({ status, revisionStatus }) => {
  const effectiveStatus =
    revisionStatus === "change_pending" ? "change_pending" : status;
  const cfg = STATUS_CONFIG[effectiveStatus] || {
    label: effectiveStatus || "Unknown",
    color: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-2  text-sm rounded-lg transition-colors px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
};

export default ProductStatusBadge;
