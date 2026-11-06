export function cancellationRequesterLabel(cancellation = {}) {
  let metadata = cancellation.metadata || {};
  if (typeof metadata === "string") {
    try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
  }
  const role = String(cancellation.requestedByRole || cancellation.requested_by_role || metadata.initiatedByRole || "").toLowerCase();
  if (["seller", "seller-admin", "seller-sub-admin"].includes(role)) return "Seller";
  if (["buyer", "customer"].includes(role)) return "Customer";
  if (["admin", "sub-admin", "super-admin"].includes(role)) return "Admin";
  if (["system", "service"].includes(role)) return "System";
  if (metadata.rtoSettlement || metadata.refundPolicyScenario === "rtoDeliveryFailed" || cancellation.reason_code === "shipment_rto") return "System (failed delivery / RTO)";
  if (metadata.refundPolicyScenario === "sellerCancellation") return "Seller";
  return "Not recorded";
}
