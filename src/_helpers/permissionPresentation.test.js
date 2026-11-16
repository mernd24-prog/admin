import { visiblePermissionRows, configuredModuleActions } from './permissionPresentation';

test('unlinked marketing rows are excluded from referral choices', () => {
  const rows = [
    { id: 'pricing', module: 'Pricing', tab: 'Marketing', linked: false, permissions: ['view'] },
    { id: 'referral-bonus-history', module: 'Bonus History', tab: 'Referral Commerce / MLM', linked: true, permissions: ['view'] },
    { id: 'orders', module: 'Orders', tab: 'Orders', linked: true, permissions: ['none'] },
  ];
  expect(visiblePermissionRows(rows, 'MLM').map(row => row.id)).toEqual(['referral-bonus-history']);
  expect(visiblePermissionRows(rows).map(row => row.id)).toEqual(['referral-bonus-history', 'orders']);
  // The backing assignment state survives display filtering and another edit.
  const changed = rows.map(row => row.id === 'orders' ? { ...row, permissions: ['view'] } : row);
  expect(changed.find(row => row.id === 'pricing').permissions).toEqual(['view']);
  expect(rows).toHaveLength(3);
});
test('empty modules do not invent a View permission', () => {
  expect(configuredModuleActions({ permissions: [] }, ['view', 'update'], value => value)).toEqual([]);
});
test('only real active permission records offer supported actions', () => {
  const module = { permissions: [{ action: 'view' }, { id: 'edit', action: 'update' }, { id: 'removed', action: 'delete', active: false }, { id: 'invalid', action: 'custom' }] };
  expect(configuredModuleActions(module, ['view', 'update', 'delete'], value => value)).toEqual(['update']);
});
