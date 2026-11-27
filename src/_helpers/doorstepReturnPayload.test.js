import { qcReturn, replaceReturn, startReturnCollectionVisit } from '../Redux/adminCoreSlice';
import { axiosPrivate } from './axiosProvider';

jest.mock('./axiosProvider', () => ({ axiosPrivate: jest.fn(), axiosPublic: jest.fn(), axiosImage: jest.fn() }));

const submit = async (thunk, payload) => {
  axiosPrivate.mockResolvedValue({ data: { success: true } });
  const result = await thunk({ returnId: 'return-a', ...payload })(jest.fn(), () => ({}), undefined);
  expect(result.meta.requestStatus).toBe('fulfilled');
  return axiosPrivate.mock.calls.at(-1)[0].data;
};

test('doorstep QC transmits checklist, accepted quantity and collection confirmation', async () => {
  const payload = {
    inspectionMode: 'doorstep', collectionConfirmed: true, replacementReady: true,
    notes: 'Inspected during exchange visit',
    items: [{ orderItemId: 'item-a', quantity: 1, acceptedQuantity: 1, result: 'sellable',
      checks: { identity: 'pass', serialNumber: 'pass', accessories: 'pass', packaging: 'pass', condition: 'pass' },
      notes: 'All checks passed', photos: ['https://example.com/photo.jpg'] }],
  };
  expect(await submit(qcReturn, payload)).toEqual(payload);
});

test('saving inspection only never turns collection into true', async () => {
  expect(await submit(qcReturn, { inspectionMode: 'doorstep', collectionConfirmed: false, items: [] }))
    .toEqual({ inspectionMode: 'doorstep', collectionConfirmed: false, items: [] });
});

test('replacement preparation and handover flags survive API filtering', async () => {
  expect(await submit(replaceReturn, { action: 'approve', advanceExchange: true }))
    .toEqual({ action: 'approve', advanceExchange: true });
  expect(await submit(replaceReturn, { action: 'deliver', handoverConfirmed: true }))
    .toEqual({ action: 'deliver', handoverConfirmed: true });
});

test('legacy warehouse QC retains its original payload', async () => {
  const payload = { passed: true, condition: 'sellable', notes: 'Warehouse inspection' };
  expect(await submit(qcReturn, payload)).toEqual(payload);
});

test('combined exchange sends separate parcel tracking and the shared visit schedule', async () => {
  const payload = { action: 'arrange_exchange', courierName: 'Courier', pickupTrackingNumber: 'OLD-AWB',
    replacementTrackingNumber: 'NEW-AWB', pickupScheduledAt: '2027-01-01T10:00:00Z' };
  expect(await submit(replaceReturn, payload)).toEqual(payload);
});


test('courier arrival is a separate confirmation endpoint, not QC or collection', async () => {
  expect(await submit(startReturnCollectionVisit, { courierAtDoorstep: true, note: 'Courier present with customer' }))
    .toEqual({ courierAtDoorstep: true, note: 'Courier present with customer' });
  expect(axiosPrivate.mock.calls.at(-1)[0].url).toContain('/returns/return-a/collection-visit');
});


test('collection confirmation sends its intent without requiring another inspection payload', async () => {
  const payload = { inspectionMode: 'doorstep', confirmCollectionOnly: true, collectionConfirmed: true };
  expect(await submit(qcReturn, payload)).toEqual(payload);
});

test('same visit exchange sends one reference and all physical confirmation flags', async () => {
  const booking = { action: 'arrange_exchange', exchangeReference: 'EXCHANGE-123', courierName: 'Seller delivery' };
  expect(await submit(replaceReturn, booking)).toEqual(booking);
  const confirmation = { inspectionMode: 'doorstep', confirmCollectionOnly: true, collectionConfirmed: true,
    exchangeCompleted: true, replacementReady: true, replacementInspected: true, customerAccepted: true, handoverConfirmed: true };
  expect(await submit(qcReturn, confirmation)).toEqual(confirmation);
  expect(await submit(replaceReturn, { action: 'exchange_failure', note: 'Customer rejected damaged replacement' }))
    .toEqual({ action: 'exchange_failure', note: 'Customer rejected damaged replacement' });
});
