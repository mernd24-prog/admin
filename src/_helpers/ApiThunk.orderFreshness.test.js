import { createAsyncThunk, createReducer } from '@reduxjs/toolkit';
import { createExtraReducersForThunk } from './ApiThunk';
jest.mock('./axiosProvider', () => ({ axiosPrivate: {}, axiosPublic: {}, axiosImage: {} }));
const fetchOrder = createAsyncThunk('freshness/order', async () => ({}));
const reducer = createReducer({}, builder => createExtraReducersForThunk(builder, fetchOrder, 'order', { latestOnly: true }));
const payload = status => ({ data: { id: 'order-a', status, display_status: status, shipment_status: 'initiated' } });
test('a slower old order response cannot replace the newer order status', () => {
  let state = reducer(undefined, fetchOrder.pending('old'));
  state = reducer(state, fetchOrder.pending('new'));
  state = reducer(state, fetchOrder.fulfilled(payload('packed'), 'new'));
  state = reducer(state, fetchOrder.fulfilled(payload('confirmed'), 'old'));
  expect(state.order.normalized.data.display_status).toBe('packed');
});
test('an older failure cannot clear loading or errors for the active request', () => {
  let state = reducer(undefined, fetchOrder.pending('old'));
  state = reducer(state, fetchOrder.pending('new'));
  state = reducer(state, fetchOrder.rejected(new Error('Old failed'), 'old'));
  expect(state.order.loading).toBe(true);
  expect(state.order.error).toBeNull();
  state = reducer(state, fetchOrder.fulfilled(payload('confirmed'), 'new'));
  expect(state.order.loading).toBe(false);
});
