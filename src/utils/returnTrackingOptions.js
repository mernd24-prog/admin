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
  if (returnRequest.collectionQc?.sellerResponsibilityCompletedAt || returnRequest.collectionQc?.exchangeCompletedAt) return [];
  const shipmentStatus = String(
    returnRequest?.reverseShipment?.status || "",
  ).toLowerCase();
  if (["delivered", "received", "cancelled", "rto", "lost", "damaged"].includes(shipmentStatus)) return [];
  if (isDoorstepReturn(returnRequest)) {
    if (!returnRequest.collectionQc?.collectedAt) {
      if (["qc_failed", "qc_failure_upheld", "closed", "rejected"].includes(returnRequest.status)) return [];
      return [{ value: "pickup_failed", label: "Pickup failed" }];
    }
    // Continue the booked return parcel, even when the refund is already complete.
    return shipmentStatus === "in_transit" || shipmentStatus === "out_for_delivery"
      ? [{ value: "delivered", label: "Received at warehouse" }]
      : [{ value: "in_transit", label: "Returning to seller / warehouse" }, { value: "delivered", label: "Received at warehouse" }];
  }
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
  const sameVisit = isDoorstepExchange(request) && (request.collectionQc?.sameVisitExchange ||
    (request.reverseShipment?.trackingNumber && request.reverseShipment.trackingNumber === request.replacement?.trackingNumber));
  if (sameVisit && returnId) return [{ id: returnId, label: 'View Exchange Booking',
    path: `/app/shipment-tracking?shipmentId=${encodeURIComponent(returnId)}` }];
  return [
    { id: replacementId, label: "View Replacement Shipment" },
    { id: returnId, label: request.collectionQc?.sellerResponsibilityCompletedAt ? "View Completed Return" : request.collectionQc?.collectedAt && !["replacement", "exchange"].includes(request.resolution) ? "Track Return to Warehouse" : ["qc_failed", "qc_failure_upheld"].includes(request.status) && !request.collectionQc?.collectedAt ? "Return Shipment History" : "Manage Return Shipment" },
  ].filter(link => link.id).map(link => ({
    ...link, path: `/app/shipment-tracking?shipmentId=${encodeURIComponent(link.id)}`,
  }));
};

export const isDoorstepReturn = (request = {}) => request.collectionQc?.required === true &&
  request.reverseShipment?.provider !== "customer_manual";
export const doorstepReturnActions = (request = {}) => {
  if (!isDoorstepReturn(request)) return [];
  const replacement = ["replacement", "exchange"].includes(request.resolution);
  const beforeVisit = ["approved", "reverse_pickup_scheduled", "pickup_failed"].includes(request.status);
  const actions = [];
  if (replacement && beforeVisit && (
    ["approved", "pickup_failed"].includes(request.status) ||
    (!request.replacementShipmentId && !request.replacement?.shipmentId)
  )) actions.push("exchange");
  if (["reverse_pickup_scheduled", "pickup_failed"].includes(request.status) && !request.collectionQc?.collectedAt) {
    if (request.status === "reverse_pickup_scheduled") actions.push(request.collectionQc?.visitStartedAt ? "qc" : "visit");
  }
  if (replacement && request.collectionQc?.collectedAt && request.collectionQc?.allAccepted &&
    request.status === "replacement_shipped") actions.push("replacement_deliver");
  return actions;
};

export const filterDoorstepShipmentOptions = (shipment = {}, options = []) => {
  if (shipment.returnWorkflow?.sameVisitExchange || shipment.returnWorkflow?.exchangeCompletedAt) return [];
  if (shipment.direction === "reverse" && shipment.returnWorkflow?.sellerResponsibilityCompletedAt) return [];
  if (!shipment.returnWorkflow?.doorstepQcRequired) return options;
  if (shipment.direction === "reverse" && !shipment.returnWorkflow.collected &&
    ["qc_failed", "qc_failure_upheld", "rejected", "closed"].includes(shipment.returnWorkflow.returnStatus)) return [];
  if (shipment.direction === "reverse" && !shipment.returnWorkflow.collected) {
    return options.filter(option => ["failed", "pickup_failed", "initiated", "manifested", "pickup_scheduled"].includes(option.value));
  }
  if (shipment.direction === "reverse" && shipment.returnWorkflow.collected) {
    return options.filter(option => ['in_transit', 'out_for_delivery', 'delivered', 'received', 'lost', 'damaged'].includes(option.value))
      .map(option => ({ ...option, label: ({ in_transit: 'Returning to seller / warehouse', out_for_delivery: 'Arriving at seller / warehouse', delivered: 'Return received at seller / warehouse', received: 'Return received at seller / warehouse' })[option.value] || option.label }));
  }
  if (shipment.shipment_type === "replacement" && (!shipment.returnWorkflow.collected || !shipment.returnWorkflow.allAccepted)) {
    return options.filter(option => option.value !== "delivered");
  }
  return options;
};

export const isDoorstepExchange = request => isDoorstepReturn(request) &&
  ["replacement", "exchange"].includes(request?.resolution);

export const doorstepExchangeStage = (request = {}, isSeller = false) => {
  const status = request.status;
  const qc = request.collectionQc || {};
  const stage = (title, description, action, label) => ({ title, description, action, label });
  if (status === "requested") return stage("Awaiting approval", "Review the requested item and quantity before arranging the exchange.", "approve", "Approve Replacement");
  if (status === "approved") return stage("Arrange the exchange", "Prepare the replacement and arrange collection in one courier visit.", "exchange", "Schedule Doorstep Exchange");
  if (status === "pickup_failed") return stage(qc.exchangeFailure ? "Exchange failed" : "Visit needs rescheduling", qc.exchangeFailure ? "The exchange was not completed. The old item remains with the customer. Resolve the recorded issue, then reschedule the exchange." : "The old item has not been collected. Arrange another visit using the existing replacement parcel where possible.", "exchange", "Reschedule Exchange");
  if (status === "qc_failed") {
    if (isSeller && request.qcReview?.status === "evidence_requested") return stage("More inspection evidence needed", "The item remains with the customer. Submit the requested evidence for review.", "qc_evidence", "Submit Inspection Evidence");
    return stage("Doorstep QC failed", "Leave the old item with the customer and do not hand over the replacement. Review the inspection evidence before another visit.", isSeller ? null : "qc_decision", "Review Failed QC");
  }
  const parcelStatus = request.replacement?.shipment?.status;
  if (["failed", "rto", "lost", "damaged", "cancelled"].includes(parcelStatus) &&
    ["reverse_pickup_scheduled", "replacement_shipped"].includes(status)) {
    return stage("Replacement delivery needs attention", qc.collectedAt
      ? "The old item has been collected, but the replacement parcel needs delivery or recovery. Open its shipment history below; do not confirm handover until it reaches the customer."
      : "Resolve the replacement parcel's delivery or recovery in Shipment Details before collecting the old item.");
  }
  if (status === "reverse_pickup_scheduled") {
    if (!request.replacementShipmentId && !request.replacement?.shipmentId) return stage("Finish exchange arrangement", "Collection is scheduled. Finish preparing the replacement for the same visit.", "exchange", "Finish Arrangement");
    if (!qc.visitStartedAt) return stage("Awaiting courier arrival", "Pickup is booked but inspection has not started. Confirm arrival only when the courier is physically at the customer’s address.", "visit", "Confirm Courier Arrival");
    if (["passed", "partially_passed"].includes(qc.status) && !qc.collectedAt) return stage("Complete the exchange", "Check the replacement with the customer. Collect the old item and hand over the accepted replacement together.", "qc", "Confirm Exchange Completed");
    return stage("Inspect at the doorstep", "Check the old item and record photos before collection or replacement handover.", "qc", "Record Exchange Inspection");
  }
  if (status === "replacement_shipped" && qc.collectedAt) return stage(qc.exchangeCompletionConfirmed ? "Finish exchange completion" : "Confirm replacement handover", "The old item has been collected. Confirm only after the replacement is physically handed to the customer.", qc.exchangeCompletionConfirmed ? "qc" : "replacement_deliver", qc.exchangeCompletionConfirmed ? "Confirm Exchange Completed" : "Confirm Replacement Handover");
  if (status === "replacement_delivered") return stage("Replacement handed over", "Collection and replacement delivery are recorded. Platform review can now complete the exchange.", isSeller ? null : "replacement_complete", "Complete Exchange");
  if (status === "replaced") return stage("Exchange completed", "The old item was collected and the replacement was delivered. Shipment and inspection history remain available.");
  if (status === "qc_failure_upheld") return stage("Return not eligible", "The rejection was confirmed. The old item remains with the customer; any dispatched replacement must be recovered before closure.");
  if (["closed", "rejected"].includes(status)) return stage(status === "closed" ? "Exchange closed" : "Exchange rejected", "No further exchange actions are available. Review the recorded details and shipment history below.");
  return stage("Review exchange status", "Review the recorded details and shipment history before taking further action.");
};

export const canConfirmDoorstepCollection = (request = {}) => isDoorstepReturn(request) &&
  request.status === 'reverse_pickup_scheduled' && !request.collectionQc?.collectedAt &&
  ['passed', 'partially_passed'].includes(request.collectionQc?.status) && !!request.collectionQc?.items?.length;

export const doorstepCollectionStatusLabel = (request = {}) => {
  if (isDoorstepExchange(request)) {
    if (request.status === 'pickup_failed' && request.collectionQc?.exchangeFailure) return 'Exchange failed';
    if (request.status === 'reverse_pickup_scheduled') return 'Exchange visit scheduled';
    if (request.status === 'qc_failed') return 'Exchange inspection failed';
    if (request.status === 'replaced') return 'Exchange completed';
  }
  if (isDoorstepReturn(request) && !["replacement", "exchange"].includes(request.resolution) && request.collectionQc?.collectedAt) {
    if (request.status === 'refunded' || request.refund?.status === 'completed') return 'Refund completed';
    if (request.status === 'refund_failed' || request.refund?.status === 'failed') return 'Collected — refund needs attention';
    if (['qc_passed', 'qc_completed', 'refund_pending'].includes(request.status)) return 'Collected — refund pending';
  }
  return canConfirmDoorstepCollection(request)
  ? request.collectionQc.status === 'partially_passed' ? 'QC partially passed — awaiting collection' : 'QC passed — awaiting collection'
  : undefined;
};
