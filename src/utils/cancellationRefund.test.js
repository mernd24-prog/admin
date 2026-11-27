import { cancellationRefundBreakdown } from './cancellationRefund';

test('shows recorded total, fee including GST, and refund destinations separately', () => {
  expect(cancellationRefundBreakdown({
    refund_amount: '165100', wallet_refund_amount: '100', provider_refund_amount: '165000',
    items: [{ refund_amount: '165000' }],
    metadata: { shippingRefundAmount: 0, platformFeeRefundAmount: 100 },
  })).toEqual({ total: 165100, items: 165000, shipping: 0, platformFee: 100, wallet: 100, provider: 165000 });
});

test('does not infer missing fees or change a historical total', () => {
  const result = cancellationRefundBreakdown({ refundAmount: 165000 });
  expect(result.total).toBe(165000);
  expect(result.platformFee).toBeNull();
  expect(result.items).toBeNull();
});

test('accepts serialized metadata and preserves an explicitly excluded fee', () => {
  expect(cancellationRefundBreakdown({ metadata: '{"platformFeeRefundAmount":0}' }).platformFee).toBe(0);
  expect(cancellationRefundBreakdown({ metadata: 'invalid' }).platformFee).toBeNull();
});
