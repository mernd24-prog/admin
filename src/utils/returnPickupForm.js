export const returnPickupInitialValues = (request = {}) => ({
  mode: 'reverse_pickup',
  courierName: request.reverseShipment?.courierName || request.reverseShipment?.shipment?.courier_name || '',
  trackingNumber: request.status === 'pickup_failed' ? ''
    : request.reverseShipment?.trackingNumber || request.reverseShipment?.shipment?.tracking_number || request.trackingNumber || '',
  shippingMode: 'standard',
  pickupScheduledAt: '',
  expectedDeliveryAt: '',
  note: '',
});
