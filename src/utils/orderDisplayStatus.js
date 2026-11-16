const key = (value) => String(value || "").toLowerCase().replace(/[\s-]+/g, "_");
const json = (value) => {
  if (value && typeof value === "object") return value;
  try { return JSON.parse(value || "{}"); } catch { return {}; }
};
const groupMatches = (entry, item) =>
  String(entry.seller_id || entry.sellerId || "platform") === String(item.seller_id || item.sellerId || "platform") &&
  String(entry.organization_id || entry.organizationId || json(entry.metadata).organizationId || "default") ===
    String(item.organization_id || item.organizationId || "default");
const linesFor = shipment => {
  const configured = json(shipment.metadata).fulfillmentItems;
  return configured?.length ? configured : json(shipment.package_snapshot || shipment.packageSnapshot).items || [];
};
const forward = (shipment) => key(shipment.direction || "forward") !== "reverse" &&
  !["reverse", "return", "rto"].includes(key(shipment.shipment_type || shipment.shipmentType));

export function itemDisplayStatus(item = {}, order = {}) {
  const quantity = Number(item.quantity || 0);
  const cancelled = Number(item.cancelled_quantity || item.cancelledQuantity || 0);
  if (quantity > 0 && cancelled >= quantity) return "cancelled";
  const lifecycle = key(item.return_status || item.returnStatus || item.effective_status || item.effectiveStatus);
  if (["return_requested", "return_approved", "returned", "partially_returned", "refunded", "partially_refunded", "refund_pending", "refund_failed"].includes(lifecycle)) return lifecycle;
  const itemId = String(item.id || item._id || "");
  const shipments = (order.relations?.shipments || []).filter((shipment) => {
    if (!forward(shipment) || !groupMatches(shipment, item)) return false;
    const lines = linesFor(shipment);
    if (lines.length) return lines.some(line => String(line.orderItemId || line.order_item_id || "") === itemId && Number(line.quantity || 0) > 0);
    const ids = [shipment.orderItemIds, shipment.order_item_ids, json(shipment.metadata).orderItemIds].find(value => Array.isArray(value) && value.length) || [];
    return !ids.length || ids.map(String).includes(itemId);
  });
  // A cancelled old shipment must not override its replacement.
  const active = shipments.filter((shipment) => key(shipment.status) !== "cancelled");
  const statuses = active.map((shipment) => key(shipment.status));
  const explicit = active.filter(shipment => linesFor(shipment).length);
  const deliveredQuantity = explicit.filter(shipment => shipment.status === "delivered").reduce((sum, shipment) => sum + linesFor(shipment)
    .filter(line => String(line.orderItemId || line.order_item_id || "") === itemId)
    .reduce((count, line) => count + Math.max(Number(line.quantity || 0), 0), 0), 0);
  if (statuses.length && statuses.every((status) => status === "delivered") && (!explicit.length || deliveredQuantity >= quantity - cancelled)) return "delivered";
  if (statuses.includes("delivered")) return "partially_delivered";
  if (!active.length && shipments.length) return "shipment_cancelled";
  const group = (order.relations?.sellerFulfillmentGroups || []).find((entry) => groupMatches(entry, item));
  const packageStatus = statuses.length ? null : key(group?.deliveryStatus || group?.shipmentStatus);
  if (packageStatus === "cancelled") return "shipment_cancelled";
  if (["delivered", "partially_delivered"].includes(packageStatus)) return packageStatus;
  if (cancelled > 0) return "partially_cancelled";
  const exception = ["failed", "failed_delivery", "rto", "lost", "damaged"].find((status) => statuses.includes(status) || packageStatus === status);
  if (exception) return exception;
  const priority = ["out_for_delivery", "in_transit", "picked_up", "manifested", "initiated"];
  const shipmentStatus = priority.find((status) => statuses.includes(status));
  if (shipmentStatus === "out_for_delivery") return "out_for_delivery";
  if (["in_transit", "picked_up"].includes(shipmentStatus)) return "shipped";
  // A newly created package is not evidence that the item was shipped.
  if (["initiated", "manifested"].includes(shipmentStatus)) return "packed";
  if (!shipments.length && (item.delivered_at || item.deliveredAt)) return "delivered";
  return key(item.effective_status || item.effectiveStatus || item.status || item.order_status || order.status) || "pending";
}

export function orderDisplayStatus(order = {}) {
  const stored = key(order.status || order.order_status);
  if (["cancelled", "refunded", "payment_failed", "pending_payment", "fulfilled", "on_hold", "return_requested", "return_approved", "returned", "partially_returned"].includes(stored)) return stored;
  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) return stored;
  const statuses = items.map((item) => itemDisplayStatus(item, order));
  const active = statuses.filter((status) => status !== "cancelled");
  if (!active.length) return "cancelled";
  if (active.every((status) => status === "delivered")) return stored === "fulfilled" ? "fulfilled" : "delivered";
  if (active.some((status) => ["delivered", "partially_delivered"].includes(status))) return "partially_delivered";
  if (statuses.includes("cancelled") || statuses.includes("partially_cancelled")) return "partially_cancelled";
  if (active.every((status) => status === "shipment_cancelled")) return "shipment_cancelled";
  if (active.every((status) => status === active[0])) return active[0];
  return stored;
}
