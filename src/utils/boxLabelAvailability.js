export function boxLabelUnavailableReason(order = {}, shipment = {}) {
  if (!(shipment.id || shipment._id || shipment.shipment_id || shipment.shipmentId)) return "Shipment details are not available yet. Refresh the order.";
  if (String(shipment.direction || "forward").toLowerCase() === "reverse") return "Return shipment: use its return shipping documents. Outgoing box labels are not available.";
  if (["cancelled", "canceled"].includes(String(shipment.status || "").toLowerCase())) return "Box labels are not available for cancelled shipments.";
  const status = String(order.status || order.order_status || "").toLowerCase();
  if (["cancelled", "canceled"].includes(status)) return "Box labels are not available for cancelled orders.";
  if (!status || ["pending_payment", "payment_failed"].includes(status)) return "Box label becomes available after order confirmation or COD acceptance.";
  return "";
}
