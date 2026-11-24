import { reverseTrackingOptions, getAllowedReturnResolutions, getReturnShipmentLinks } from './returnTrackingOptions';
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
    ["View Return Shipment", "/app/shipment-tracking?shipmentId=old-return"],
  ]);
});

test("approval without a replacement package does not link to the old parcel as a replacement", () => {
  expect(getReturnShipmentLinks({ replacementOrderId: "replacement-order", reverseShipment: { shipmentId: "old-return" } })
    .map(link => link.label)).toEqual(["View Return Shipment"]);
  expect(getReturnShipmentLinks({})).toEqual([]);
});

test("top-level and hydrated replacement shipment IDs are supported", () => {
  expect(getReturnShipmentLinks({ replacementShipmentId: "package/a" })[0].path)
    .toBe("/app/shipment-tracking?shipmentId=package%2Fa");
  expect(getReturnShipmentLinks({ replacement: { shipment: { id: "new" } } })[0].label)
    .toBe("View Replacement Shipment");
});
