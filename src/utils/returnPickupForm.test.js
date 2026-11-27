import { returnPickupInitialValues } from './returnPickupForm';
import { scheduleReturnValidationSchema } from '../_helpers/validationSchemas';

test('existing values initialize the same form values used for validation', async () => {
  const values = returnPickupInitialValues({ status: 'approved', reverseShipment: { courierName: 'Express Metro', trackingNumber: '111111' } });
  expect(values.courierName).toBe('Express Metro');
  expect(values.trackingNumber).toBe('111111');
  await expect(scheduleReturnValidationSchema.validate(values)).resolves.toBeTruthy();
});

test('a pickup retry keeps the courier but clears previous tracking, dates and notes', async () => {
  const values = returnPickupInitialValues({ status: 'pickup_failed', trackingNumber: 'OLD-123',
    reverseShipment: { courierName: 'Express Metro', trackingNumber: 'OLD-123', pickupScheduledAt: '2020-01-01T10:00' },
  });
  expect(values.courierName).toBe('Express Metro');
  expect(values.trackingNumber).toBe('');
  expect(values.pickupScheduledAt).toBe('');
  expect(values.expectedDeliveryAt).toBe('');
  expect(values.note).toBe('');
  await expect(scheduleReturnValidationSchema.validate({ ...values, trackingNumber: 'NEW-111111' })).resolves.toBeTruthy();
});

test('hydrated saved pickup details also prefill correctly', () => {
  const values = returnPickupInitialValues({ reverseShipment: { shipment: { courier_name: 'Local Same Day', tracking_number: 'TRACK-A' } } });
  expect(values.courierName).toBe('Local Same Day');
  expect(values.trackingNumber).toBe('TRACK-A');
});

test('retry can switch to manual ship-back without requiring courier tracking', async () => {
  const values = { ...returnPickupInitialValues({ status: 'pickup_failed' }), mode: 'manual_ship_back' };
  await expect(scheduleReturnValidationSchema.validate(values)).resolves.toBeTruthy();
});
