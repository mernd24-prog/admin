import { toManagedUserCreateBody, toSubAdminCreateBody, toUserUpdateBody } from './adminApi';

test('explicitly unassigned admin creation never falls back to platform modules', () => {
  const body = toManagedUserCreateBody({ fullName: 'New Admin', email: 'new@example.test', allowedModules: [], modulePermissions: [] }, { allowedModules: ['products', 'orders'] });
  expect(body.allowedModules).toEqual([]);
  expect(body.modulePermissions).toEqual([]);
});
test('explicitly unassigned sub-admin creation never receives a default module', () => {
  expect(toSubAdminCreateBody({ allowedModules: [], modulePermissions: [] }).allowedModules).toEqual([]);
});
test('legacy callers with omitted assignments keep their existing defaults', () => {
  expect(toSubAdminCreateBody({}).allowedModules).toEqual(['admin']);
});
test('identity-only edit does not send permission or scope changes', () => {
  const body = toUserUpdateBody({ fullName: 'Renamed User', phone: '12345' });
  expect(body).not.toHaveProperty('allowedModules');
  expect(body).not.toHaveProperty('modulePermissions');
});

test('optional parent selection reaches the sub-admin create request', () => {
  const body = toSubAdminCreateBody({ parentAdminId: 'selected-admin', allowedModules: [], modulePermissions: [] });
  expect(body.parentAdminId).toBe('selected-admin');
  expect(body.allowedModules).toEqual([]);
});
