const keys = ['identity', 'serialNumber', 'accessories', 'packaging', 'condition'];
export function checklistState(checks = {}) {
  if (keys.some(key => checks[key] === 'fail')) return 'failed';
  return keys.every(key => ['identity', 'condition'].includes(key)
    ? checks[key] === 'pass' : ['pass', 'not_applicable'].includes(checks[key])) ? 'passed' : 'incomplete';
}

// Apply only to this product line. Other products keep their own decisions.
export function updateDoorstepChecklist(item, key, value) {
  const checks = { ...item.checks, [key]: value };
  const state = checklistState(checks);
  if (state === 'failed') return { ...item, checks, acceptedQuantity: 0, result: item.result === 'missing' ? 'missing' : 'rejected' };
  if (state === 'incomplete') return { ...item, checks, acceptedQuantity: '', result: '' };
  const maximum = Number(item.approvedQuantity || 0);
  const previous = Number(item.acceptedQuantity);
  const acceptedQuantity = checklistState(item.checks) === 'passed' && Number.isInteger(previous) && previous > 0 && previous <= maximum
    ? previous : maximum;
  return { ...item, checks, acceptedQuantity, result: item.result === 'damaged' ? 'damaged' : 'sellable' };
}
