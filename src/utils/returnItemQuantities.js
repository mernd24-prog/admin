export const returnItemQuantities = (item = {}, actionType = '') => {
  const requested = Number(item.requestedQuantity ?? item.quantity ?? 0);
  const approved = Number(item.approvedQuantity ?? 0);
  const received = Number(item.receivedQuantity ?? 0);
  const collected = Number(item.collectedQuantity ?? 0);
  return {
    requestedQuantity: requested,
    recordedApprovedQuantity: approved,
    recordedReceivedQuantity: received,
    recordedCollectedQuantity: collected,
    approvedQuantity: actionType === 'approve' ? requested : approved,
    receivedQuantity: actionType === 'receive' ? (received > 0 ? received : approved) : received,
  };
};

export const validateReturnApprovalQuantities = (items = []) => {
  if (!items.length) return 'Return items are missing';
  for (const item of items) {
    const quantity = Number(item.approvedQuantity);
    if (item.approvedQuantity === '' || !Number.isInteger(quantity) || quantity < 0 || quantity > Number(item.requestedQuantity))
      return `Quantity to accept must be a whole number from 0 to ${item.requestedQuantity} for ${item.label || 'each item'}`;
  }
  if (!items.some(item => Number(item.approvedQuantity) > 0)) return 'Accept at least one item quantity';
  return '';
};

export const limitReturnAcceptanceQuantity = (value, maximum) => {
  if (value === '') return '';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '';
  return Math.min(Math.max(Math.trunc(Number(maximum) || 0), 0), Math.max(Math.trunc(parsed), 0));
};
