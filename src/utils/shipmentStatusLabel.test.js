import { shipmentStatusLabel } from './shipmentStatusLabel';

describe('shipment status presentation', () => {
  test.each([
    [{ direction: 'reverse' }, 'delivered', 'Returned to seller'],
    [{ shipmentType: 'return' }, 'delivered', 'Returned to seller'],
    [{ direction: 'reverse', shipment_type: 'replacement' }, 'delivered', 'Returned to seller'],
    [{ shipment_type: 'replacement' }, 'delivered', 'Replacement delivered'],
    [{ direction: 'forward' }, 'delivered', 'delivered'],
    [{ direction: 'reverse' }, 'initiated', 'Pickup booked'],
    [{ direction: 'reverse' }, 'picked_up', 'Return collected'],
    [{ direction: 'reverse' }, 'in_transit', 'Return in transit'],
    [{ direction: 'reverse' }, 'failed', 'Pickup failed'],
    [{ shipment_type: 'replacement' }, 'in_transit', 'Replacement in transit'],
    [{ shipment_type: 'replacement' }, 'cancelled', 'cancelled'],
  ])('%j %s', (shipment, status, expected) => {
    expect(shipmentStatusLabel(shipment, status)).toBe(expected);
    expect(shipment.status).toBeUndefined();
  });
});

test('completed seller responsibility labels the parcel without rewriting old booking events', () => {
  const shipment = { direction: 'reverse', status: 'initiated', returnWorkflow: { sellerResponsibilityCompletedAt: 'now' } };
  expect(shipmentStatusLabel(shipment)).toBe('Return completed — seller responsibility');
  expect(shipmentStatusLabel(shipment, 'initiated')).toBe('Pickup booked');
});

test('exchange booking has one shared state and completes automatically from exchange confirmation', () => {
  const row = { direction: 'reverse', status: 'initiated', returnWorkflow: { sameVisitExchange: true, returnStatus: 'reverse_pickup_scheduled' } };
  expect(shipmentStatusLabel(row)).toBe('Exchange visit scheduled');
  row.returnWorkflow.returnStatus = 'replaced';
  row.returnWorkflow.exchangeCompletedAt = 'now';
  expect(shipmentStatusLabel(row)).toBe('Exchange completed');
});
