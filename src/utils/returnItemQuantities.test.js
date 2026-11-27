import { returnItemQuantities, validateReturnApprovalQuantities, limitReturnAcceptanceQuantity } from './returnItemQuantities';

test('accepting defaults the draft quantity without inventing approval or receipt', () => {
  expect(returnItemQuantities({ requestedQuantity: 1, approvedQuantity: 0, receivedQuantity: 0 }, 'approve')).toEqual({
    requestedQuantity: 1, recordedApprovedQuantity: 0, recordedReceivedQuantity: 0, recordedCollectedQuantity: 0,
    approvedQuantity: 1, receivedQuantity: 0,
  });
});

test('missing recorded quantities display zero instead of the requested quantity', () => {
  const result = returnItemQuantities({ quantity: 3 }, 'approve');
  expect(result.requestedQuantity).toBe(3);
  expect(result.approvedQuantity).toBe(3);
  expect(result.recordedApprovedQuantity).toBe(0);
  expect(result.recordedReceivedQuantity).toBe(0);
  expect(result.receivedQuantity).toBe(0);
});

test('the manual receipt draft is distinct from actual warehouse receipt', () => {
  const result = returnItemQuantities({ quantity: 3, requestedQuantity: 2, approvedQuantity: 1, receivedQuantity: 0 }, 'receive');
  expect(result.receivedQuantity).toBe(1);
  expect(result.recordedReceivedQuantity).toBe(0);
  expect(result.recordedApprovedQuantity).toBe(1);
});

test('QC preserves zero approved, collected and received quantities', () => {
  const result = returnItemQuantities({ quantity: 2, approvedQuantity: 0, receivedQuantity: 0, collectedQuantity: 0 }, 'qc');
  expect(result.approvedQuantity).toBe(0);
  expect(result.receivedQuantity).toBe(0);
  expect(result.recordedCollectedQuantity).toBe(0);
});

test.each(['', -1, 1.5, 3, 'abc'])('invalid acceptance quantity %s is rejected', approvedQuantity => {
  expect(validateReturnApprovalQuantities([{ requestedQuantity: 2, approvedQuantity, label: 'Phone' }])).toMatch(/whole number/);
});

test('partial approval is allowed but accepting no items is rejected', () => {
  expect(validateReturnApprovalQuantities([{ requestedQuantity: 2, approvedQuantity: 1 }, { requestedQuantity: 1, approvedQuantity: 0 }])).toBe('');
  expect(validateReturnApprovalQuantities([{ requestedQuantity: 2, approvedQuantity: 0 }])).toMatch(/at least one/);
});


test.each([
  ['2', 1, 1], ['999', 1, 1], ['2', 3, 2], ['-1', 2, 0],
  ['1.5', 2, 1], ['', 1, ''], ['0', 1, 0], ['abc', 1, ''],
])('typing or pasting %s stays within the requested quantity %s', (value, max, expected) => {
  expect(limitReturnAcceptanceQuantity(value, max)).toBe(expected);
});


test('acceptance always prefills the customer request without changing recorded quantities', () => {
  const result = returnItemQuantities({ requestedQuantity: 2, approvedQuantity: 1, receivedQuantity: 0 }, 'approve');
  expect(result.approvedQuantity).toBe(2);
  expect(result.recordedApprovedQuantity).toBe(1);
  expect(result.recordedReceivedQuantity).toBe(0);
});
