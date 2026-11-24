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


export const getAllowedReturnResolutions = (returnRequest = {}) => {
  const allowed = (policy = {}) => {
    if (policy.returnable === false || policy.eligible === false || policy.type === "non_returnable") return [];
    if (policy.type === "replacement_only" || policy.resolution === "replacement") return ["replacement"];
    if (policy.resolution === "refund") return ["refund"];
    return policy.allowedResolutions || ["refund", "replacement"];
  };
  const policies = returnRequest.items?.length
    ? returnRequest.items.map(item => ({ ...(returnRequest.policySnapshot || {}), ...(item.policySnapshot || {}) }))
    : [returnRequest.policySnapshot || {}];
  return ["refund", "replacement"].filter(resolution => policies.every(policy => allowed(policy).includes(resolution)));
};


export const getReturnShipmentLinks = (request = {}) => {
  const replacementId = request.replacementShipmentId || request.replacement?.shipmentId || request.replacement?.shipment?.id;
  const returnId = request.reverseShipment?.shipmentId || request.reverseShipment?.shipment?.id;
  return [
    { id: replacementId, label: "View Replacement Shipment" },
    { id: returnId, label: "View Return Shipment" },
  ].filter(link => link.id).map(link => ({
    ...link, path: `/app/shipment-tracking?shipmentId=${encodeURIComponent(link.id)}`,
  }));
};
