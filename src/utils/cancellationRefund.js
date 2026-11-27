export const cancellationRefundBreakdown = (record = {}) => {
  let metadata = record.metadata || {};
  if (typeof metadata === "string") {
    try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
  }
  const amount = (value) => value == null ? null : Number(value);
  const items = Array.isArray(record.items) ? record.items : [];
  const itemAmounts = items.map(item => amount(item.refundAmount ?? item.refund_amount));
  return {
    total: amount(record.refundAmount ?? record.refund_amount),
    items: items.length && itemAmounts.every(value => value !== null)
      ? Number(itemAmounts.reduce((sum, value) => sum + value, 0).toFixed(2)) : null,
    shipping: amount(metadata.shippingRefundAmount),
    platformFee: amount(metadata.platformFeeRefundAmount),
    wallet: amount(record.walletRefundAmount ?? record.wallet_refund_amount),
    provider: amount(record.providerRefundAmount ?? record.provider_refund_amount),
  };
};
