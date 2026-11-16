import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AdminUsers from './AdminUsers';
import { createAdmin, createPlatformSubAdmin, updateAdminUser } from '../../../Redux/adminCoreSlice';
const mockDispatch = jest.fn(() => ({ unwrap: () => Promise.resolve() }));
const mockNavigate = jest.fn();
let mockRole = 'super-admin';
let mockState;
jest.mock('react-redux', () => ({ useDispatch: () => mockDispatch, useSelector: selector => selector(mockState) }));
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, Link: ({ children }) => <span>{children}</span> }));
jest.mock('../../../_helpers/usePermission', () => ({ usePermission: () => ({ canAny: () => true }) }));
jest.mock('../../../_helpers/authStorage', () => ({ getStoredRole: () => mockRole, normalizeRole: value => value }));
jest.mock('../../../_helpers/axiosProvider', () => ({ axiosPrivate: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../../../Redux/adminCoreSlice', () => ({ getAdmins: params => ({ type: 'admins/list', params }), getPlatformSubAdmins: params => ({ type: 'subadmins/list', params }), createAdmin: jest.fn(params => ({ type: 'admins/create', params })), createPlatformSubAdmin: jest.fn(), updateAdminUser: jest.fn(params => ({ type: 'admins/update', params })), deactivateAdminUser: jest.fn() }));
jest.mock('../../../components/Atoms/TableData/TableData', () => ({ data }) => <div>{data.map((row, index) => <div key={index}>{row}</div>)}</div>);
jest.mock('../../../components/Atoms/New Table/NewTable', () => () => null);
jest.mock('../../../components/Loader/Loader', () => () => null);
jest.mock('../../../components/Pagination/Pagination', () => () => null);
jest.mock('../../../components/Atoms/ToggleButton/ToggleButton', () => () => null);
jest.mock('../../../components/Atoms/PopupData/StatusPopup', () => () => null);
jest.mock('../../../components/Atoms/buttons/AddButton', () => ({ onClick, children }) => <button onClick={onClick}>{children}</button>);
jest.mock('../../../components/Atoms/TableActionButton/TableActionButton', () => ({ ActionButtons: ({ onEdit, showEditButton, onViewClick, onDelete, onPermissionClick }) => <>{showEditButton !== false && <button onClick={onEdit}>Edit account</button>}<button onClick={onViewClick}>View account</button><button onClick={onDelete}>Delete account</button><button onClick={onPermissionClick}>Permissions</button></> }));
jest.mock('../../../components/Atoms/Modal/DefaultRightSideModal', () => ({ isOpen, children, onSubmit, title }) => isOpen ? <form aria-label={title} onSubmit={onSubmit}>{children}<button type="submit">Save account</button></form> : null);
jest.mock('../../../components/Atoms/FormInput/FormInput', () => ({ label, name, value, onChange, type }) => <label>{label}<input name={name} value={value} onChange={onChange} type={type || 'text'} /></label>);
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
let container, root;
// eslint-disable-next-line testing-library/no-unnecessary-act -- Raw ReactDOM requires act.
const mount = async () => { await act(async () => root.render(<AdminUsers />)); };
const click = async label => { const button = [...container.querySelectorAll('button')].find(item => item.textContent.trim() === label); if (!button) throw new Error(`Missing ${label}`); await act(async () => button.click()); };
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks(); mockRole = 'super-admin';
  mockDispatch.mockImplementation(() => ({ unwrap: () => Promise.resolve() }));
  updateAdminUser.mockImplementation(params => ({ type: "admins/update", params }));
  createPlatformSubAdmin.mockImplementation(params => ({ type: "subadmins/create", params }));
  mockState = { adminCore: { adminsData: { data: { data: [{ id: 'existing', role: 'admin', email: 'admin@example.test', profile: { firstName: 'Existing' }, allowedModules: ['products'], modulePermissions: [{ module: 'products', actions: ['view', 'update'] }] }] } } } };
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
test('create account drawer contains identity fields without module or action selectors', async () => {
  await mount(); await click('+ Add Admin');
  const form = container.querySelector('form');
  expect(form.querySelector('[name="fullName"]')).not.toBeNull();
  expect(form.querySelector('[name="password"]')).not.toBeNull();
  expect(form.textContent).not.toContain('Assign Modules');
  expect(form.textContent).not.toContain('Configure actions');
  expect(createAdmin).not.toHaveBeenCalled();
});
test('row actions contain view, delete and permissions without the removed workflows', async () => {
  await mount();
  expect(container.textContent).not.toContain('Edit account');
  for (const title of ['Copy permissions from another user', 'Apply permission template', 'Force logout', 'View effective permissions']) expect(container.querySelector(`[title="${title}"]`)).toBeNull();
  await click('View account');
  expect(container.querySelector('[aria-label="Account Details"]')).not.toBeNull();
  expect(container.textContent).toContain('Change Password');
  expect(updateAdminUser).not.toHaveBeenCalled();
  await click('Permissions'); expect(mockNavigate).toHaveBeenCalledWith('/app/user-permissions/existing');
});
test('sub-admin creation offers an optional parent and explains inheritance', async () => {
  const { axiosPrivate } = require('../../../_helpers/axiosProvider');
  axiosPrivate.get.mockResolvedValue({ data: { data: [{ id: 'parent', role: 'admin', email: 'parent@example.test', accountStatus: 'active', profile: { firstName: 'Parent' } }], meta: { total: 1 } } });
  await mount(); await click('Sub-Admins'); await click('+ Add Sub-Admin');
  const select = container.querySelector('[aria-label="Parent Admin (optional)"]');
  expect(select).not.toBeNull(); expect(select.value).toBe('');
  expect(select.textContent).toContain('Parent');
  expect(container.textContent).toContain('inherits only that admin');
});
test('non-admin viewers do not receive a password control', async () => {
  mockRole = 'sub-admin';
  mockState.adminCore.platformSubAdminsData = mockState.adminCore.adminsData;
  mockState.adminCore.platformSubAdminsData.data.data[0].role = 'sub-admin';
  await mount(); await click('View account');
  expect(container.textContent).not.toContain('Change Password');
});

const input = async (name, value) => {
  await act(async () => {
    const field = container.querySelector(`input[name="${name}"]`);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
test('creating a sub-admin submits the selected parent without assigning extra modules', async () => {
  const { axiosPrivate } = require('../../../_helpers/axiosProvider');
  axiosPrivate.get.mockResolvedValue({ data: { data: [{ id: 'parent', role: 'admin', email: 'parent@example.test', accountStatus: 'active' }] } });
  await mount(); await click('Sub-Admins'); await click('+ Add Sub-Admin');
  await act(async () => { const select = container.querySelector('[aria-label="Parent Admin (optional)"]'); select.value = 'parent'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  for (const [name, value] of Object.entries({ fullName: 'Child', email: 'child@example.test', password: 'password123', confirmPassword: 'password123' })) await input(name, value);
  await act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(createPlatformSubAdmin).toHaveBeenCalledWith(expect.objectContaining({ parentAdminId: 'parent', allowedModules: [], modulePermissions: [] }));
});
test('admin password control sends only the password update for the viewed account', async () => {
  await mount(); await click('View account');
  await input('newPassword', 'newpassword123'); await input('confirmPassword', 'newpassword123');
  await click('Change Password');
  expect(updateAdminUser).toHaveBeenCalledWith({ userId: 'existing', password: 'newpassword123' });
});
