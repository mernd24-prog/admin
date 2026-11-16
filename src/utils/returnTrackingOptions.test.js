import { reverseTrackingOptions } from './returnTrackingOptions';
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
