import { itemDisplayStatus, orderDisplayStatus } from './orderDisplayStatus';

const item = (id, seller, org = seller) => ({ id, seller_id: seller, organization_id: org, quantity: 1 });
const shipment = (seller, status, org = seller) => ({ seller_id: seller, organization_id: org, status, direction: 'forward' });

test('delivered and cancelled packages do not inherit the overall shipped status', () => {
  const items = [item('a', 'seller-a'), item('b', 'seller-b')];
  const order = { status: 'shipped', items, relations: { shipments: [shipment('seller-a', 'delivered'), shipment('seller-b', 'cancelled')] } };
  expect(itemDisplayStatus(items[0], order)).toBe('delivered');
  expect(itemDisplayStatus(items[1], order)).toBe('shipment_cancelled');
  expect(orderDisplayStatus(order)).toBe('partially_delivered');
});

test('a fully cancelled item is cancelled even when its package was shipped', () => {
  const a = { ...item('a', 'seller-a'), cancelled_quantity: 1 };
  const order = { status: 'shipped', items: [a], relations: { shipments: [shipment('seller-a', 'shipped')] } };
  expect(itemDisplayStatus(a, order)).toBe('cancelled');
  expect(orderDisplayStatus(order)).toBe('cancelled');
});

test('a replacement shipment supersedes a cancelled shipment', () => {
  const a = item('a', 'seller-a');
  const order = { status: 'shipped', items: [a], relations: { shipments: [shipment('seller-a', 'cancelled'), shipment('seller-a', 'in_transit')] } };
  expect(itemDisplayStatus(a, order)).toBe('shipped');
});

test('store ownership and reverse shipments cannot override the item package', () => {
  const a = item('a', 'seller-a', 'store-a');
  const order = { status: 'shipped', items: [a], relations: { shipments: [shipment('seller-a', 'delivered', 'store-b'), { ...shipment('seller-a', 'delivered', 'store-a'), direction: 'reverse' }, shipment('seller-a', 'in_transit', 'store-a')] } };
  expect(itemDisplayStatus(a, order)).toBe('shipped');
});

test('explicit package item references distinguish items within the same store', () => {
  const a = item('a', 'seller-a'), b = item('b', 'seller-a');
  const order = { status: 'shipped', items: [a, b], relations: { shipments: [
    { ...shipment('seller-a', 'delivered'), package_snapshot: { items: [{ orderItemId: 'a', quantity: 1 }] } },
    { ...shipment('seller-a', 'in_transit'), package_snapshot: { items: [{ orderItemId: 'b', quantity: 1 }] } },
  ] } };
  expect(itemDisplayStatus(a, order)).toBe('delivered');
  expect(itemDisplayStatus(b, order)).toBe('shipped');
  expect(orderDisplayStatus(order)).toBe('partially_delivered');
});

test('a rejected cancellation does not cancel an active order', () => {
  const a = item('a', 'seller-a');
  const order = { status: 'shipped', items: [a], relations: { cancellations: [{ status: 'rejected' }] } };
  expect(orderDisplayStatus(order)).toBe('shipped');
});

test('all remaining items delivered and empty orders have stable summaries', () => {
  const a = { ...item('a', 'seller-a'), delivered_at: '2026-11-10' };
  const b = { ...item('b', 'seller-b'), cancelled_quantity: 1 };
  expect(orderDisplayStatus({ status: 'shipped', items: [a, b] })).toBe('delivered');
  expect(orderDisplayStatus({ status: 'confirmed' })).toBe('confirmed');
});
