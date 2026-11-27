import { updateDoorstepChecklist } from './doorstepQcDecision';
const checks = { identity: 'pass', serialNumber: 'pass', accessories: 'pass', packaging: 'not_applicable', condition: '' };
const item = (quantity = 1) => ({ approvedQuantity: quantity, acceptedQuantity: '', result: '', checks });
test('final passing check fills quantity and decision', () => {
  expect(updateDoorstepChecklist(item(), 'condition', 'pass')).toMatchObject({ acceptedQuantity: 1, result: 'sellable' });
});
test('failed check fills zero and rejects; correcting it restores accepted quantity', () => {
  const failed = updateDoorstepChecklist(item(4), 'condition', 'fail');
  expect(failed).toMatchObject({ acceptedQuantity: 0, result: 'rejected' });
  expect(updateDoorstepChecklist(failed, 'condition', 'pass')).toMatchObject({ acceptedQuantity: 4, result: 'sellable' });
});
test('clearing a check removes stale accepted decision', () => {
  const passed = updateDoorstepChecklist(item(), 'condition', 'pass');
  expect(updateDoorstepChecklist(passed, 'identity', '')).toMatchObject({ acceptedQuantity: '', result: '' });
});
test('partial quantities and reported damage are preserved when checks remain passing', () => {
  const passed = { ...updateDoorstepChecklist(item(4), 'condition', 'pass'), acceptedQuantity: 2, result: 'damaged' };
  expect(updateDoorstepChecklist(passed, 'packaging', 'pass')).toMatchObject({ acceptedQuantity: 2, result: 'damaged' });
});
test('multiple product lines are independent and original values are not mutated', () => {
  const items = [item(3), item(2)];
  const updated = items.map((row, index) => index === 0 ? updateDoorstepChecklist(row, 'condition', 'pass') : row);
  expect(updated[0].acceptedQuantity).toBe(3);
  expect(updated[1]).toBe(items[1]);
  expect(items[0].acceptedQuantity).toBe('');
});
