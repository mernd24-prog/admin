import React from "react";
import StatusBadge from "../Shared/StatusBadge";

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
  none: { label: "No Pending Change", color: "bg-gray-100 text-gray-600" },
  revision_pending: {
    label: "Review Pending",
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
  const colorStatus =
    effectiveStatus === "pending" ? "pending_approval" : effectiveStatus;

  return (
    <StatusBadge
      status={colorStatus}
      label={cfg.label}
      dot
      appearance="order"
    />
  );
};

export default ProductStatusBadge;
