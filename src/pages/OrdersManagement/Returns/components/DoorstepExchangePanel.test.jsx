import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DoorstepExchangePanel from './DoorstepExchangePanel';

jest.mock('../../../../components/Atoms/buttons/button', () => ({ children, onClick, requiredModule, requiredAction, ...props }) => <button {...props}>{children}</button>);
jest.mock('../../../../components/Atoms/FormSection/FormSection', () => ({ title, description, children }) => <section><h2>{title}</h2><p>{description}</p>{children}</section>);
jest.mock('../../../../components/Shared', () => ({ StatusBadge: ({ status }) => <span>{status}</span> }));

const render = (extra = {}, props = {}) => renderToStaticMarkup(<DoorstepExchangePanel
  request={{ status: 'reverse_pickup_scheduled', resolution: 'replacement', collectionQc: { required: true, visitStartedAt: 'now' },
    replacementShipmentId: 'forward-a', replacement: { trackingNumber: 'NEW-123', status: 'shipped' },
    reverseShipment: { shipmentId: 'reverse-a', trackingNumber: 'RETURN-123', status: 'initiated' }, ...extra }}
  canViewShipments isSeller={false} onAction={() => {}} onShipment={() => {}} onDetails={() => {}} {...props} />);

test('one next step and both parcel histories inside expandable details', () => {
  const html = render();
  expect(html).toContain('Record Exchange Inspection');
  expect(html).not.toContain('Arrange Exchange');
  expect(html).not.toContain('Confirm Replacement Handover');
  expect(html).toContain('>Shipment Details</summary>');
  expect(html).toContain('NEW-123');
  expect(html).toContain('RETURN-123');
  expect(html).toContain('Replacement Delivery History');
  expect(html).toContain('Return Pickup History');
});

test('failed inspection prevents collection and handover, while preserving review', () => {
  const html = render({ status: 'qc_failed', collectionQc: { required: true, status: 'failed' } });
  expect(html).toContain('Review Failed QC');
  expect(html).toContain('Not collected');
  expect(html).not.toContain('Record Exchange Inspection');
  expect(html).not.toContain('Confirm Replacement Handover');
});

test('completed exchanges retain recorded information for restricted roles', () => {
  const html = render({ status: 'replaced' }, { canViewShipments: false, isSeller: true });
  expect(html).toContain('Exchange completed');
  expect(html).toContain('RETURN-123');
  expect(html).not.toContain('Return Pickup History');
  expect(html).not.toContain('Other Actions');
  expect(html).not.toContain('Confirm Collection');
});

test('failed exchange shows the reason and reschedule action without the old inspection buttons', () => {
  const html = render({ status: 'pickup_failed', collectionQc: { required: true, sameVisitExchange: true,
    exchangeFailure: { reason: 'Customer refused damaged replacement', at: '2026-11-27T10:00:00Z' } } });
  expect(html).toContain('Exchange failed');
  expect(html).toContain('Customer refused damaged replacement');
  expect(html).toContain('Reschedule Exchange');
  expect(html).not.toMatch(/<button[^>]*>Record Exchange Failure<\/button>/);
  expect(html).not.toContain('Record Exchange Inspection');
  expect(html).not.toContain('Confirm Exchange Completed');
});
