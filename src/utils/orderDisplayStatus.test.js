import { itemDisplayStatus, orderDisplayStatus } from './orderDisplayStatus';

test('a received return updates the item and order display without changing stored workflow state', () => {
  const a = { ...item('a', 'seller-a'), effective_status: 'received' };
  const order = { status: 'return_approved', display_status: 'return_approved', items: [a] };
  expect(itemDisplayStatus(a, order)).toBe('return_received');
  expect(orderDisplayStatus(order)).toBe('return_received');
  expect(order.status).toBe('return_approved');
});

test('a return on only one item remains an in-progress aggregate, and API aggregates retain seller scope', () => {
  const a = { ...item('a', 'seller-a'), effective_status: 'return_received' };
  const b = { ...item('b', 'seller-b'), effective_status: 'delivered' };
  expect(orderDisplayStatus({ status: 'return_approved', items: [a, b] })).toBe('return_in_progress');
  expect(orderDisplayStatus({ status: 'return_approved', display_status: 'return_in_progress', items: [a] })).toBe('return_in_progress');
});

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

test('creating an initiated package does not pack a confirmed order', () => {
  const a = item('a', 'seller-a');
  const order = { status: 'confirmed', items: [a], relations: { shipments: [shipment('seller-a', 'initiated')] } };
  expect(itemDisplayStatus(a, order)).toBe('confirmed');
  expect(orderDisplayStatus(order)).toBe('confirmed');
});
test('the API aggregate is retained when a seller sees only their delivered item', () => {
  const a = { ...item('a', 'seller-a'), effective_status: 'delivered' };
  expect(orderDisplayStatus({ status: 'shipped', display_status: 'partially_delivered', items: [a] })).toBe('partially_delivered');
});
test('explicitly packed and ready packages retain their real fulfillment stages', () => {
  const a = item('a', 'seller-a');
  expect(itemDisplayStatus(a, { status: 'packed', relations: { shipments: [shipment('seller-a', 'initiated')] } })).toBe('packed');
  expect(itemDisplayStatus(a, { status: 'confirmed', relations: { shipments: [shipment('seller-a', 'manifested')] } })).toBe('ready_to_ship');
});
