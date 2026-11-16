import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RbacAuditLog from './RbacAuditLog';
import { axiosPrivate } from '../../../_helpers/axiosProvider';
let mockTableProps, mockFields;
jest.mock('../../../_helpers/axiosProvider', () => ({ axiosPrivate: { get: jest.fn() } }));
jest.mock('../../../_helpers/dropdownApi', () => ({ dropdownApi: { getUsers: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('../../../components/Shared', () => ({
  PageHeader: ({ title }) => <h1>{title}</h1>,
  DataTable: props => { mockTableProps = props; return <div>{props.filterBar}</div>; },
  FilterBar: ({ fields }) => { mockFields = fields; return null; },
}));
let container, root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks();
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  axiosPrivate.get.mockResolvedValue({ data: { data: { items: [], total: 0, actions: ['role_defaults_updated'] } } });
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
// eslint-disable-next-line testing-library/no-unnecessary-act -- ReactDOM createRoot requires act; no Testing Library is used.
const mount = async () => { await act(async () => root.render(<RbacAuditLog />)); };
test('audit action filters come from server-visible recorded actions', async () => {
  await mount();
  expect(mockFields.find(field => field.key === 'action').options).toEqual([{ value: 'role_defaults_updated', label: 'role defaults updated' }]);
});
test('the unsupported free-text search is absent and refresh performs a real request', async () => {
  await mount(); expect(mockTableProps.onSearch).toBeUndefined();
  expect(axiosPrivate.get).toHaveBeenCalledWith('/rbac/audit-logs', { params: { page: 1, limit: 50 } });
  await act(async () => mockTableProps.onRefresh()); expect(axiosPrivate.get).toHaveBeenCalledTimes(2);
});
test('failed log requests show an error rather than a fabricated empty result', async () => {
  axiosPrivate.get.mockRejectedValueOnce(new Error('offline')); await mount();
  expect(mockTableProps.error).toContain('Unable to load audit logs');
});
