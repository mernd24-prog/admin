// Display only: transport states remain unchanged for API updates and filtering.
export function shipmentStatusLabel(shipment = {}, status = shipment.status) {
  const key = String(status || "").toLowerCase();
  const type = String(shipment.shipment_type || shipment.shipmentType || "").toLowerCase();
  const reverse = String(shipment.direction || "").toLowerCase() === "reverse" || ["return", "reverse"].includes(type);
  if (shipment.returnWorkflow?.sameVisitExchange && arguments.length < 2) {
    if (shipment.returnWorkflow.exchangeCompletedAt || shipment.returnWorkflow.returnStatus === 'replaced') return 'Exchange completed';
    if (shipment.returnWorkflow.returnStatus === 'pickup_failed') return 'Exchange visit failed';
    if (shipment.returnWorkflow.returnStatus === 'qc_failed') return 'Exchange inspection failed';
    if (shipment.returnWorkflow.collected) return 'Exchange completion pending';
    return 'Exchange visit scheduled';
  }
  if (reverse) {
    if (shipment.returnWorkflow?.sellerResponsibilityCompletedAt && arguments.length < 2) return "Return completed — seller responsibility";
    const labels = { initiated: "Pickup booked", manifested: "Pickup booked", pickup_scheduled: "Pickup scheduled", picked_up: "Return collected", in_transit: "Return in transit", out_for_delivery: "Return arriving at seller", delivered: "Returned to seller", received: "Returned to seller", failed: "Pickup failed", pickup_failed: "Pickup failed" };
    if (labels[key]) return labels[key];
  } else if (type === "replacement") {
    const labels = { initiated: "Replacement shipment booked", manifested: "Replacement ready to ship", picked_up: "Replacement dispatched", in_transit: "Replacement in transit", out_for_delivery: "Replacement out for delivery", delivered: "Replacement delivered", failed: "Replacement delivery failed" };
    if (labels[key]) return labels[key];
  }
  return key === "rto" ? "RTO" : String(status || "Not created").replace(/_/g, " ");
}
