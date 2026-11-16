const REVERSE_TRACKING_OPTIONS = {
  scheduled: [
    { value: "picked_up", label: "Picked up" },
    { value: "in_transit", label: "In reverse transit" },
    { value: "pickup_failed", label: "Pickup failed" },
    { value: "delivered", label: "Received at warehouse" },
  ],
  picked_up: [
    { value: "in_transit", label: "In reverse transit" },
    { value: "pickup_failed", label: "Pickup failed" },
    { value: "delivered", label: "Received at warehouse" },
  ],
  in_transit: [
    { value: "delivered", label: "Received at warehouse" },
    { value: "pickup_failed", label: "Pickup failed" },
  ],
  pickup_failed: [
    { value: "picked_up", label: "Picked up" },
    { value: "in_transit", label: "In reverse transit" },
    { value: "delivered", label: "Received at warehouse" },
  ],
};

export const reverseTrackingOptions = (returnRequest = {}) => {
  const shipmentStatus = String(
    returnRequest?.reverseShipment?.status || "",
  ).toLowerCase();
  if (["delivered", "received", "cancelled", "rto", "lost", "damaged"].includes(shipmentStatus)) return [];
  if (["picked_up"].includes(shipmentStatus))
    return REVERSE_TRACKING_OPTIONS.picked_up;
  if (["in_transit", "out_for_delivery"].includes(shipmentStatus))
    return REVERSE_TRACKING_OPTIONS.in_transit;
  if (
    ["failed", "pickup_failed"].includes(shipmentStatus) ||
    returnRequest?.status === "pickup_failed"
  ) {
    return REVERSE_TRACKING_OPTIONS.pickup_failed;
  }
  return REVERSE_TRACKING_OPTIONS.scheduled;
};
