import { reverseTrackingOptions, getAllowedReturnResolutions, getReturnShipmentLinks, doorstepReturnActions, filterDoorstepShipmentOptions, doorstepExchangeStage, isDoorstepExchange, canConfirmDoorstepCollection, doorstepCollectionStatusLabel } from './returnTrackingOptions';
const options = (shipmentStatus, status = 'reverse_pickup_scheduled') => reverseTrackingOptions({ status, reverseShipment: { status: shipmentStatus } }).map(option => option.value);
test('scheduled pickup permits tracking progress and warehouse receipt', () => {
  expect(options('initiated')).toEqual(['picked_up', 'in_transit', 'pickup_failed', 'delivered']);
});
test('delivered and terminal packages never offer another pickup or transit action, even with a stale return', () => {
  for (const status of ['delivered', 'received', 'cancelled', 'rto', 'lost', 'damaged']) expect(options(status)).toEqual([]);
});
test('in-transit and picked-up packages offer only the remaining logistics steps', () => {
  expect(options('picked_up')).toEqual(['in_transit', 'pickup_failed', 'delivered']);
  expect(options('in_transit')).toEqual(['delivered', 'pickup_failed']);
});
test('failed pickup permits retry and receipt', () => {
  expect(options('failed', 'pickup_failed')).toEqual(['picked_up', 'in_transit', 'delivered']);
});


test.each([
  [{ resolution: "refund" }, ["refund"]],
  [{ resolution: "replacement" }, ["replacement"]],
  [{ resolution: "refund_or_replacement" }, ["refund", "replacement"]],
  [{ type: "replacement_only" }, ["replacement"]],
  [{ returnable: false }, []],
  [{ type: "non_returnable" }, []],
  [{}, ["refund", "replacement"]],
])("return actions follow the purchased policy %j", (policySnapshot, expected) => {
  expect(getAllowedReturnResolutions({ policySnapshot })).toEqual(expected);
});

test("mixed return policies expose only resolutions allowed for every item", () => {
  expect(getAllowedReturnResolutions({ items: [
    { policySnapshot: { resolution: "refund" } },
    { policySnapshot: { resolution: "refund_or_replacement" } },
  ] })).toEqual(["refund"]);
});


test("return and replacement shipment actions open their own packages", () => {
  const links = getReturnShipmentLinks({ reverseShipment: { shipmentId: "old-return" }, replacement: { shipmentId: "new-replacement" } });
  expect(links.map(link => [link.label, link.path])).toEqual([
    ["View Replacement Shipment", "/app/shipment-tracking?shipmentId=new-replacement"],
    ["Manage Return Shipment", "/app/shipment-tracking?shipmentId=old-return"],
  ]);
});

test("approval without a replacement package does not link to the old parcel as a replacement", () => {
  expect(getReturnShipmentLinks({ replacementOrderId: "replacement-order", reverseShipment: { shipmentId: "old-return" } })
    .map(link => link.label)).toEqual(["Manage Return Shipment"]);
  expect(getReturnShipmentLinks({})).toEqual([]);
});

test("top-level and hydrated replacement shipment IDs are supported", () => {
  expect(getReturnShipmentLinks({ replacementShipmentId: "package/a" })[0].path)
    .toBe("/app/shipment-tracking?shipmentId=package%2Fa");
  expect(getReturnShipmentLinks({ replacement: { shipment: { id: "new" } } })[0].label)
    .toBe("View Replacement Shipment");
});


test.each([
  "reverse_pickup_scheduled", "pickup_failed", "in_reverse_transit",
  "received", "qc_passed", "refunded", "replaced", "closed",
])("%s keeps one return shipment destination for management or history", (status) => {
  const links = getReturnShipmentLinks({ status, reverseShipment: { shipmentId: "reverse-a" } });
  expect(links).toEqual([{
    id: "reverse-a", label: "Manage Return Shipment",
    path: "/app/shipment-tracking?shipmentId=reverse-a",
  }]);
});

test("hydrated reverse packages use the same management destination with encoded IDs", () => {
  expect(getReturnShipmentLinks({ reverseShipment: { shipment: { id: "reverse/a" } } })[0])
    .toEqual({ id: "reverse/a", label: "Manage Return Shipment", path: "/app/shipment-tracking?shipmentId=reverse%2Fa" });
});

test.each(["requested", "approved", "manual_ship_back"])("%s without a package has no shipment action", status => {
  expect(getReturnShipmentLinks({ status })).toEqual([]);
});

const doorstepRequest = extra => ({
  status: "approved", resolution: "replacement", collectionQc: { required: true, visitStartedAt: "now" }, ...extra,
});


test("doorstep exchange actions follow preparation, dispatch, inspection, collection and handover", () => {
  expect(doorstepReturnActions(doorstepRequest())).toEqual(["exchange"]);
  expect(doorstepReturnActions(doorstepRequest({ replacementOrderId: "rep-a" }))).toEqual(["exchange"]);
  expect(doorstepReturnActions(doorstepRequest({ status: "reverse_pickup_scheduled", replacementOrderId: "rep-a", replacementShipmentId: "forward-a" }))).toEqual(["qc"]);
  expect(doorstepReturnActions(doorstepRequest({ status: "replacement_shipped", collectionQc: { required: true, collectedAt: "now", allAccepted: true } }))).toEqual(["replacement_deliver"]);
});

test.each(["qc_failed", "qc_failure_upheld", "refunded", "replaced", "closed"])("%s cannot offer another doorstep collection or exchange", status => {
  expect(doorstepReturnActions(doorstepRequest({ status }))).toEqual([]);
});

test("refunds offer inspection but no replacement preparation", () => {
  expect(doorstepReturnActions(doorstepRequest({ resolution: "refund" }))).toEqual([]);
  expect(doorstepReturnActions(doorstepRequest({ resolution: "refund", status: "reverse_pickup_scheduled" }))).toEqual(["qc"]);
});

test("manual ship-back and existing warehouse returns keep their established actions", () => {
  expect(doorstepReturnActions({ status: "approved", resolution: "replacement" })).toEqual([]);
  expect(doorstepReturnActions(doorstepRequest({ reverseShipment: { provider: "customer_manual" } }))).toEqual([]);
});

test("shipment screen hides pickup and replacement delivery until collection is confirmed", () => {
  const options = ["failed", "picked_up", "in_transit", "delivered"].map(value => ({ value }));
  expect(filterDoorstepShipmentOptions({ direction: "reverse", returnWorkflow: { doorstepQcRequired: true, collected: false } }, options)).toEqual([{ value: "failed" }]);
  expect(filterDoorstepShipmentOptions({ shipment_type: "replacement", returnWorkflow: { doorstepQcRequired: true, collected: false } }, options).map(option => option.value)).toEqual(["failed", "picked_up", "in_transit"]);
  expect(filterDoorstepShipmentOptions({ direction: "reverse", returnWorkflow: { doorstepQcRequired: true, collected: true } }, options).map(option => option.value)).toEqual(["in_transit", "delivered"]);
  expect(filterDoorstepShipmentOptions({}, options)).toEqual(options);
});


test.each([
  ["requested", {}, "approve"], ["approved", {}, "exchange"],
  ["pickup_failed", {}, "exchange"], ["reverse_pickup_scheduled", {}, "exchange"],
  ["reverse_pickup_scheduled", { replacementShipmentId: "forward-a" }, "qc"],
  ["reverse_pickup_scheduled", { replacementShipmentId: "forward-a", collectionQc: { required: true, status: "passed", visitStartedAt: "now" } }, "qc"],
  ["qc_failed", {}, "qc_decision"],
  ["replacement_shipped", { collectionQc: { required: true, collectedAt: "now", allAccepted: true } }, "replacement_deliver"],
  ["replacement_delivered", {}, "replacement_complete"], ["replaced", {}, undefined],
  ["closed", {}, undefined], ["rejected", {}, undefined], ["qc_failure_upheld", {}, undefined],
])("exchange hub offers the correct next action for %s", (status, extra, action) => {
  const request = doorstepRequest({ status, ...extra });
  expect(isDoorstepExchange(request)).toBe(true);
  expect(doorstepExchangeStage(request).action).toBe(action);
});

test("seller evidence and platform review remain separate responsibilities", () => {
  expect(doorstepExchangeStage(doorstepRequest({ status: "qc_failed", qcReview: { status: "evidence_requested" } }), true).action).toBe("qc_evidence");
  expect(doorstepExchangeStage(doorstepRequest({ status: "qc_failed" }), true).action).toBeNull();
  expect(doorstepExchangeStage(doorstepRequest({ status: "replacement_delivered" }), true).action).toBeNull();
});

test("saved passing QC advances the label to collection without claiming physical pickup", () => {
  expect(doorstepExchangeStage(doorstepRequest({ status: "reverse_pickup_scheduled", replacementShipmentId: "forward-a", collectionQc: { required: true, status: "passed", visitStartedAt: "now" } })).label).toBe("Confirm Exchange Completed");
});

test("the exchange hub excludes refund, legacy and manual ship-back workflows", () => {
  expect(isDoorstepExchange(doorstepRequest({ resolution: "refund" }))).toBe(false);
  expect(isDoorstepExchange({ resolution: "replacement" })).toBe(false);
  expect(isDoorstepExchange(doorstepRequest({ reverseShipment: { provider: "customer_manual" } }))).toBe(false);
});


test.each(["failed", "rto", "lost", "damaged", "cancelled"])("a %s replacement cannot offer collection or handover as its next step", status => {
  for (const collected of [false, true]) {
    const request = doorstepRequest({ status: collected ? "replacement_shipped" : "reverse_pickup_scheduled", replacementShipmentId: "forward-a",
      replacement: { shipment: { status } }, collectionQc: { required: true, ...(collected ? { collectedAt: "now", allAccepted: true } : {}) } });
    expect(doorstepExchangeStage(request).action).toBeUndefined();
    expect(doorstepExchangeStage(request).title).toBe("Replacement delivery needs attention");
  }
});

test('failed doorstep QC keeps reverse shipment read-only and labels it as history', () => {
  const links = getReturnShipmentLinks({ status: 'qc_failed', collectionQc: { required: true }, reverseShipment: { shipmentId: 'reverse-a' } });
  expect(links[0].label).toBe('Return Shipment History');
  expect(filterDoorstepShipmentOptions({ direction: 'reverse', returnWorkflow: { doorstepQcRequired: true, collected: false, returnStatus: 'qc_failed' } }, [{ value: 'failed' }])).toEqual([]);
});


test("a booked exchange offers arrival confirmation rather than premature QC", () => {
  const request = doorstepRequest({ status: "reverse_pickup_scheduled", replacementShipmentId: "forward-a", collectionQc: { required: true } });
  expect(doorstepExchangeStage(request).action).toBe("visit");
  expect(doorstepReturnActions(request)).toEqual(["visit"]);
});


test('saved QC visibly advances to collection while incomplete or failed QC does not', () => {
  const request = { status: 'reverse_pickup_scheduled', resolution: 'refund', collectionQc: { required: true, status: 'passed', items: [{ orderItemId: 'item-a' }] } };
  expect(canConfirmDoorstepCollection(request)).toBe(true);
  expect(doorstepCollectionStatusLabel(request)).toBe('QC passed — awaiting collection');
  expect(canConfirmDoorstepCollection({ ...request, collectionQc: { required: true, status: 'pending' } })).toBe(false);
  expect(canConfirmDoorstepCollection({ ...request, status: 'qc_failed' })).toBe(false);
  expect(canConfirmDoorstepCollection({ ...request, collectionQc: { ...request.collectionQc, collectedAt: 'now' } })).toBe(false);
});

test('collected refund tracks the same parcel after refund without offering another pickup', () => {
  const request = { resolution: 'refund', status: 'refunded', collectionQc: { required: true, collectedAt: '2026-11-26' }, reverseShipment: { shipmentId: 'original-pickup', status: 'in_transit' } };
  expect(getReturnShipmentLinks(request)[0]).toEqual({ id: 'original-pickup', label: 'Track Return to Warehouse', path: '/app/shipment-tracking?shipmentId=original-pickup' });
  expect(reverseTrackingOptions(request)).toEqual([{ value: 'delivered', label: 'Received at warehouse' }]);
  expect(doorstepReturnActions(request)).toEqual([]);
  expect(doorstepCollectionStatusLabel(request)).toBe('Refund completed');
});
test('collected refund pending is distinct from warehouse receipt and failed inspection', () => {
  const request = { resolution: 'refund', status: 'qc_passed', collectionQc: { required: true, collectedAt: '2026-11-26' } };
  expect(doorstepCollectionStatusLabel(request)).toBe('Collected — refund pending');
  expect(doorstepCollectionStatusLabel({ ...request, status: 'refund_failed' })).toBe('Collected — refund needs attention');
  expect(reverseTrackingOptions({ status: 'qc_failed', collectionQc: { required: true }, reverseShipment: { status: 'initiated' } })).toEqual([]);
});

test('collected return parcels cannot be picked up again or marked pickup failed', () => {
  const options = ['picked_up', 'failed', 'pickup_failed', 'initiated', 'in_transit', 'delivered'].map(value => ({ value, label: value }));
  const result = filterDoorstepShipmentOptions({ direction: 'reverse', returnWorkflow: { doorstepQcRequired: true, collected: true } }, options);
  expect(result.map(option => option.value)).toEqual(['in_transit', 'delivered']);
  expect(result[0].label).toBe('Returning to seller / warehouse');
});

test('seller responsibility completion requires no more manual shipment steps', () => {
  const request = { resolution: 'refund', status: 'qc_passed', collectionQc: { required: true, collectedAt: 'now', sellerResponsibilityCompletedAt: 'now' }, reverseShipment: { shipmentId: 'reverse-a', status: 'initiated' } };
  expect(reverseTrackingOptions(request)).toEqual([]);
  expect(getReturnShipmentLinks(request)[0].label).toBe('View Completed Return');
  expect(filterDoorstepShipmentOptions({ direction: 'reverse', returnWorkflow: { doorstepQcRequired: true, collected: true, sellerResponsibilityCompletedAt: 'now' } }, [{ value: 'in_transit' }])).toEqual([]);
});

test('same-visit exchanges are updated in Returns, without separate transit steps', () => {
  for (const collected of [false, true]) {
    expect(filterDoorstepShipmentOptions({ direction: 'reverse', returnWorkflow: { doorstepQcRequired: true, sameVisitExchange: true, collected } }, [{ value: 'in_transit' }, { value: 'delivered' }])).toEqual([]);
  }
});

test('one same-visit exchange links only to the original-order booking', () => {
  const result = getReturnShipmentLinks({ resolution: 'replacement', collectionQc: { required: true, sameVisitExchange: true },
    reverseShipment: { shipmentId: 'reverse-a', trackingNumber: 'EX123' }, replacement: { shipmentId: 'forward-a', trackingNumber: 'EX123' } });
  expect(result).toEqual([{ id: 'reverse-a', label: 'View Exchange Booking', path: '/app/shipment-tracking?shipmentId=reverse-a' }]);
});

test('failed exchange presents rescheduling instead of inspection or completion', () => {
  const request = { resolution: 'replacement', status: 'pickup_failed', replacementShipmentId: 'forward-a',
    collectionQc: { required: true, status: 'reinspection_required', visitStartedAt: 'before', exchangeFailure: { reason: 'Replacement damaged', at: 'now' } } };
  expect(doorstepCollectionStatusLabel(request)).toBe('Exchange failed');
  expect(doorstepExchangeStage(request)).toMatchObject({ title: 'Exchange failed', action: 'exchange', label: 'Reschedule Exchange' });
  expect(doorstepReturnActions(request)).toEqual(['exchange']);
});
