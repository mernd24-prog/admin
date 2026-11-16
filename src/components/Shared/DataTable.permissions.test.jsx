import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import DataTable from './DataTable';
let container, root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const render = rowActions => act(() => root.render(<DataTable columns={[{ key: 'name', label: 'Name' }]} data={[{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }]} rowActions={rowActions} />));
const actionHeader = () => Array.from(container.querySelectorAll('th')).some(th => th.textContent.trim().toLowerCase() === 'actions');
test('read-only tables have no empty action column or menu', () => {
  render(() => [{ label: 'Edit', hidden: true, onClick: jest.fn() }]);
  expect(actionHeader()).toBe(false);
  expect(container.querySelector('[aria-haspopup="menu"]')).toBeNull();
});
test('mixed access preserves permitted row menus and hides empty ones', () => {
  render(row => row.id === 'a' ? [{ label: 'Edit', onClick: jest.fn() }] : []);
  expect(actionHeader()).toBe(true);
  expect(container.querySelectorAll('[aria-haspopup="menu"]')).toHaveLength(1);
});
test('revoking row actions removes their column on the next render', () => {
  render(() => [{ label: 'Delete', onClick: jest.fn() }]); expect(actionHeader()).toBe(true);
  render(() => []); expect(actionHeader()).toBe(false);
});
