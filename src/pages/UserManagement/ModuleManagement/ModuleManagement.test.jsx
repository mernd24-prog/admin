import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ModuleManagement from './ModuleManagement';
import { updateRbacModule, createRbacPermission, updateRbacModuleStatus, updateRbacPermission } from '../../../Redux/adminCoreSlice';
let mockState;
let mockActions;
const mockDispatch = jest.fn();
jest.mock('../../../_helpers/axiosProvider', () => ({ axiosPrivate: { get: jest.fn() } }));
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch, useSelector: selector => selector(mockState) }));
jest.mock('../../../_helpers/usePermission', () => ({ ACTIONS: { UPDATE: 'update', CREATE: 'create', STATUS_CHANGE: 'status_change' }, usePermission: () => ({ can: (_module, action) => mockActions.includes(action) }) }));
jest.mock('../../../Redux/adminCoreSlice', () => ({ getRbacModules: params => ({ type: 'modules/list', params }), updateRbacModule: jest.fn(params => ({ type: 'modules/update', params })), createRbacPermission: jest.fn(params => ({ type: 'permissions/create', params })), updateRbacPermission: jest.fn(params => ({ type: 'permissions/update', params })), updateRbacModuleStatus: jest.fn(params => ({ type: 'modules/status', params })) }));
jest.mock('../../../components/Shared', () => ({
  PageHeader: ({ title, subtitle, actions }) => <header>{title}{subtitle}{actions}</header>,
  FilterBar: ({ filters, onChange }) => <div>{filters.map(filter => <select aria-label={filter.label} key={filter.key} onChange={event => onChange(filter.key, event.target.value)}><option value="">All</option>{filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>)}</div>,
  StatusBadge: ({ status }) => <span>{status}</span>,
  DataTable: ({ columns, data, rowActions, filterBar }) => <div>{filterBar}{columns.map(column => <span key={column.key}>{column.label}</span>)}{data.map(row => <div key={row.id || row.moduleSlug}>{row.moduleName}{rowActions(row).map(action => <button key={action.label} onClick={action.onClick}>{action.label}</button>)}</div>)}</div>,
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
let container, root;
const entry = { id: 'nav-id', moduleName: 'Products', moduleSlug: 'sidebar-products', configured: true, panel: 'platform', active: true, isVisibleInSidebar: true, order: 20 };
const row = { id: 'module-id', moduleName: 'Product catalog', moduleSlug: 'products', configured: true, panel: 'both', status: 'active', navigationEntries: [entry] };
// eslint-disable-next-line testing-library/no-unnecessary-act -- Raw ReactDOM requires act.
const mount = async () => { await act(async () => root.render(<ModuleManagement />)); };
const click = async label => { const button = [...container.querySelectorAll('button')].find(item => item.textContent.trim() === label); if (!button) throw new Error(`Missing ${label}`); await act(async () => button.click()); };
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks(); mockActions = ['update'];
  mockDispatch.mockImplementation(() => ({ unwrap: () => Promise.resolve() }));
  mockState = { adminCore: { rbacModulesData: { data: { data: [row] } } } };
  require('../../../_helpers/axiosProvider').axiosPrivate.get.mockResolvedValue({ data: { data: [{ id: 'admin-role', slug: 'admin', name: 'Regional Administrator', type: 'system' }] } });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

test('one module inventory requests linked sidebar data without a listing mode or technical columns', async () => {
  await mount();
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'modules/list', params: { scope: 'backend', includeNavigation: true, includeInactive: true, limit: 1000 } });
  expect(container.querySelector('[aria-label="Module listing"]')).toBeNull();
  for (const label of ['Add Module', 'Supported actions', 'Normalize Order', 'Archive Module']) expect(container.textContent).not.toContain(label);
  expect(container.textContent).toContain('Edit Sidebar');
});

test('sidebar editor submits only presentation fields against the navigation entry', async () => {
  await mount(); await click('Edit Sidebar');
  for (const label of ['Module Key', 'Module Slug', 'Route Path', 'Module Type']) expect(container.querySelector('[role="dialog"]').textContent).not.toContain(label);
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(updateRbacModule).toHaveBeenCalledWith({ id: 'nav-id', moduleName: 'Products', order: 20, isVisibleInSidebar: true, allowedRoles: [] });
});

test('sidebar filter separates modules without menus and hidden menus', async () => {
  mockState.adminCore.rbacModulesData.data.data = [row, { ...row, id: 'api', moduleSlug: 'api', moduleName: 'API only', navigationEntries: [] }, { ...row, id: 'hidden', moduleSlug: 'hidden', moduleName: 'Hidden module', navigationEntries: [{ ...entry, isVisibleInSidebar: false }] }];
  await mount();
  await act(async () => { const select = container.querySelector('[aria-label="Sidebar"]'); select.value = 'none'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(container.textContent).toContain('API only'); expect(container.textContent).not.toContain('Product catalog'); expect(container.textContent).not.toContain('Hidden module');
});

test('read-only actors cannot edit sidebar entries', async () => {
  mockActions = []; await mount(); expect(container.textContent).not.toContain('Edit Sidebar');
});

test('unlinked catalog modules are omitted and linked feature groups are filterable', async () => {
  mockState.adminCore.rbacModulesData.data.data = [
    { ...row, presentation: { linked: true, group: 'Referral Commerce / MLM', links: [] } },
    { ...row, id: 'unused', moduleSlug: 'pricing', moduleName: 'Unused pricing', presentation: { linked: false, group: 'Marketing', links: [] } },
    { ...row, id: 'orders', moduleSlug: 'orders', moduleName: 'Order controls', presentation: { linked: true, group: 'Orders', links: [] } },
  ];
  await mount();
  expect(container.textContent).not.toContain('Unused pricing');
  await act(async () => { const select = container.querySelector('[aria-label="Feature"]'); select.value = 'Referral Commerce / MLM'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(container.textContent).toContain('Product catalog');
  expect(container.textContent).not.toContain('Order controls');
});

test('editor exposes saved role choices and explains the actual required permission', async () => {
  await mount(); await click('Edit Sidebar');
  expect(container.textContent).toContain('Regional Administrator');
  expect(container.textContent).toContain('Required access:');
  expect(container.textContent).toContain('Assign Permissions');
  const label = [...container.querySelectorAll('label')].find(item => item.textContent.includes('Regional Administrator'));
  await act(async () => label.querySelector('input').click());
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(updateRbacModule).toHaveBeenCalledWith(expect.objectContaining({ allowedRoles: ['admin'] }));
});

test('missing View permission is configured explicitly against the saved module, without granting it to users', async () => {
  mockActions = ['create', 'update'];
  const { axiosPrivate } = require('../../../_helpers/axiosProvider');
  axiosPrivate.get.mockImplementation(url => Promise.resolve({ data: { data: url === '/rbac/modules/module-id' ? { slug: 'saved-products', moduleName: 'Saved product label' } : [] } }));
  await mount(); await click('Edit Sidebar');
  expect(container.textContent).toContain('No active View permission is saved');
  await click('Configure View Permission');
  expect(createRbacPermission).toHaveBeenCalledWith({ moduleId: 'module-id', name: 'View Saved product label', slug: 'saved-products:view', action: 'view' });
});
test('inactive menu has an explicit activation control for authorized admins', async () => {
  mockActions = ['update', 'status_change'];
  mockState.adminCore.rbacModulesData.data.data = [{ ...row, navigationEntries: [{ ...entry, active: false, status: 'inactive' }] }];
  await mount(); await click('Edit Sidebar'); await click('Activate Menu');
  expect(updateRbacModuleStatus).toHaveBeenCalledWith({ id: 'nav-id', status: 'active' });
});

test('configuring an existing inactive View permission reuses its record', async () => {
  mockActions = ['create', 'update'];
  const { axiosPrivate } = require('../../../_helpers/axiosProvider');
  axiosPrivate.get.mockImplementation(url => Promise.resolve({ data: { data: url === '/rbac/modules/module-id' ? { slug: 'saved-products', permissions: [{ id: 'view-id', action: 'view', active: false }] } : [] } }));
  await mount(); await click('Edit Sidebar'); await click('Configure View Permission');
  expect(updateRbacPermission).toHaveBeenCalledWith({ id: 'view-id', active: true });
  expect(createRbacPermission).not.toHaveBeenCalled();
});
