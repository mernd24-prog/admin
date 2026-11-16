import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import useRealtimeRefresh from '../useRealtimeRefresh';
import { subscribeRealtime, joinOrderRoom } from '../../_helpers/socket';
jest.mock('../../_helpers/socket', () => ({ subscribeRealtime: jest.fn(), joinOrderRoom: jest.fn() }));
global.IS_REACT_ACT_ENVIRONMENT = true;
let container, root, listener, unsubscribe;
function Harness() { const revision = useRealtimeRefresh(['order', 'shipment'], { orderId: 'order-a', debounceMs: 0 }); return <output>{revision}</output>; }
beforeEach(() => {
  jest.useFakeTimers();
  unsubscribe = jest.fn();
  subscribeRealtime.mockImplementation(callback => { listener = callback; return unsubscribe; });
  joinOrderRoom.mockReturnValue(jest.fn());
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  // ReactDOM createRoot requires act; no Testing Library render helpers are used.
  // eslint-disable-next-line testing-library/no-unnecessary-act, testing-library/no-render-in-setup
  act(() => root.render(<Harness />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); jest.useRealTimers(); });
test('returning to the window refreshes data even if a shipment notification was missed', () => {
  expect(container.textContent).toBe('0');
  act(() => window.dispatchEvent(new Event('focus')));
  expect(container.textContent).toBe('1');
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(container.textContent).toBe('2');
});
test('hidden pages and notifications for other orders do not trigger a refresh', () => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  act(() => window.dispatchEvent(new Event('focus')));
  act(() => { listener({ eventName: 'shipment.updated', payload: { orderId: 'another-order' } }); jest.runAllTimers(); });
  expect(container.textContent).toBe('0');
  act(() => { listener({ eventName: 'shipment.updated', payload: { orderId: 'order-a' } }); jest.runAllTimers(); });
  expect(container.textContent).toBe('1');
});
