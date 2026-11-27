import { returnDoorstepQualityControlValidationSchema as doorstep, returnQualityControlValidationSchema as warehouse } from './validationSchemas';

const item = () => ({ quantity: 1, approvedQuantity: 1, receivedQuantity: 0, acceptedQuantity: 1, result: 'sellable',
  checks: { identity: 'pass', serialNumber: 'pass', accessories: 'pass', packaging: 'not_applicable', condition: 'pass' },
  condition: 'Good condition', notes: 'Identity and condition inspected', photos: 'https://example.com/qc.jpg' });
const validate = items => doorstep.validate({ returnReason: 'defective', itemActions: items }, { abortEarly: false });

test.each(['notes', 'photos'])('doorstep %s is mandatory on every item including passing QC', async field => {
  for (const value of ['', '   ']) {
    const first = item(); const second = { ...item(), [field]: value };
    await expect(validate([first, second])).rejects.toMatchObject({ inner: expect.arrayContaining([expect.objectContaining({ path: `itemActions[1].${field}` })]) });
  }
});

test('separators alone do not count as uploaded photos', async () => {
  await expect(validate([{ ...item(), photos: ', ,\n' }])).rejects.toMatchObject({ inner: expect.arrayContaining([expect.objectContaining({ path: 'itemActions[0].photos' })]) });
});

test.each(['identity', 'serialNumber', 'accessories', 'packaging', 'condition'])('%s checklist errors point to the exact field', async key => {
  const current = item(); delete current.checks[key];
  await expect(validate([current])).rejects.toMatchObject({ inner: expect.arrayContaining([expect.objectContaining({ path: `itemActions[0].checks.${key}` })]) });
});

test.each(['', -1, 1.5, 2])('invalid accepted quantity %s cannot pass the form', async acceptedQuantity => {
  await expect(validate([{ ...item(), acceptedQuantity }])).rejects.toMatchObject({ inner: expect.arrayContaining([expect.objectContaining({ path: 'itemActions[0].acceptedQuantity' })]) });
});

test('passing units with failed checks are blocked before submission', async () => {
  const current = item(); current.checks.identity = 'fail';
  await expect(validate([current])).rejects.toThrow('Accepted units must pass');
});

test('completed passing and rejected inspections both accept notes and photos', async () => {
  await expect(validate([item()])).resolves.toBeTruthy();
  const failed = item(); failed.acceptedQuantity = 0; failed.result = 'rejected'; failed.checks.condition = 'fail';
  await expect(validate([failed])).resolves.toBeTruthy();
});

test('warehouse rejected and missing items require evidence; passing warehouse flow stays optional', async () => {
  for (const result of ['missing', 'rejected']) {
    await expect(warehouse.validate({ itemActions: [{ ...item(), result, notes: '', photos: '' }] }, { abortEarly: false })).rejects.toMatchObject({ inner: expect.arrayContaining([
      expect.objectContaining({ path: 'itemActions[0].notes' }), expect.objectContaining({ path: 'itemActions[0].photos' }),
    ]) });
  }
  await expect(warehouse.validate({ itemActions: [{ ...item(), notes: '', photos: '' }] })).resolves.toBeTruthy();
});

test('reported damage and unreported damage follow the backend eligibility rule', async () => {
  await expect(validate([{ ...item(), result: 'damaged' }])).resolves.toBeTruthy();
  await expect(doorstep.validate({ returnReason: 'changed_mind', itemActions: [{ ...item(), result: 'damaged' }] })).rejects.toThrow('Unreported damage');
});

test('all passing checks cannot reject every unit by entering zero', async () => {
  await expect(validate([{ ...item(), acceptedQuantity: 0, result: 'rejected' }])).rejects.toThrow('All checks pass');
});
test('failed zero-quantity inspection cannot use an eligible disposition', async () => {
  const current = item(); current.acceptedQuantity = 0; current.checks.condition = 'fail';
  await expect(validate([current])).rejects.toThrow('No units qualify');
});
test('multiple units can be partially accepted with passing checks and rejection evidence', async () => {
  await expect(validate([{ ...item(), quantity: 3, approvedQuantity: 3, acceptedQuantity: 2, notes: 'Two units pass. Third unit is damaged and rejected.' }])).resolves.toBeTruthy();
});
