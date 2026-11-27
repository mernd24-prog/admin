import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import FormSelectGroup from './FormSelectGroup';

global.IS_REACT_ACT_ENVIRONMENT = true;
const options = [{ value: 'heavy', label: 'Prepaid Heavy and High Value Delivery Service' }];
let container, root;
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test('return dropdown placeholders wrap inside an expanding control instead of clipping', async () => {
  await act(async () => root.render(<FormSelectGroup label="Courier" name="courier" options={options} wrapSingleValue placeholder="Select courier or delivery service" />));
  const control = container.querySelector('.admin-filter-select__control');
  const placeholder = container.querySelector('.admin-filter-select__placeholder');
  expect(getComputedStyle(control).height).toBe('auto');
  expect(getComputedStyle(control).maxHeight).toBe('none');
  expect(getComputedStyle(placeholder).whiteSpace).toBe('normal');
  expect(getComputedStyle(placeholder).position).toBe('relative');
});

test('long selected values can wrap and required labels target the real input', async () => {
  const onBlur = jest.fn();
  await act(async () => root.render(<FormSelectGroup label="Courier" name="courier" options={options} value={options[0]} wrapSingleValue required onBlur={onBlur} />));
  const selected = container.querySelector('.admin-filter-select__single-value');
  expect(selected.textContent).toBe(options[0].label);
  expect(getComputedStyle(selected).whiteSpace).toBe('normal');
  const input = container.querySelector('input[role="combobox"]');
  expect(container.querySelector('label').htmlFor).toBe(input.id);
  expect(input.getAttribute('aria-required')).toBe('true');
  await act(async () => Simulate.blur(input));
  expect(onBlur).toHaveBeenCalled();
});

test('other forms retain the default fixed-height control without opting in', async () => {
  await act(async () => root.render(<FormSelectGroup label="Status" options={options} />));
  expect(getComputedStyle(container.querySelector('.admin-filter-select__control')).height).toBe('36px');
});
