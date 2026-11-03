import { focusFirstError, installErrorFocus } from './errorFocus';

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Element.prototype, 'getClientRects').mockImplementation(function () {
    return this.closest('[hidden]') ? [] : [{ width: 100, height: 30 }];
  });
  Element.prototype.scrollIntoView = jest.fn();
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  document.body.innerHTML = '';
});

test('focuses the first visible invalid field in form order', () => {
  document.body.innerHTML = '<form><input hidden aria-invalid="true"><input id="first" aria-invalid="true"><input id="second" aria-invalid="true"></form>';
  expect(focusFirstError(document.querySelector('form'))).toBe(true);
  expect(document.activeElement.id).toBe('first');
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }));
});

test('focuses dropdown controls through their error wrapper', () => {
  document.body.innerHTML = '<form><div class="admin-field"><input id="select" role="combobox"><p class="admin-field-error">Choose an option</p></div></form>';
  focusFirstError(document.querySelector('form'));
  expect(document.activeElement.id).toBe('select');
});

test('disabled invalid fields receive a focusable error container', () => {
  document.body.innerHTML = '<form><div class="admin-field" id="group"><input disabled aria-invalid="true"></div></form>';
  focusFirstError(document.querySelector('form'));
  expect(document.activeElement.id).toBe('group');
});

test('submit scopes focus to the submitted form and cleans up listeners', () => {
  document.body.innerHTML = '<form><input id="other" aria-invalid="true"></form><form id="active"><input id="correct" aria-invalid="true"></form>';
  const cleanup = installErrorFocus();
  document.getElementById('active').dispatchEvent(new Event('submit', { bubbles: true }));
  jest.advanceTimersByTime(30);
  expect(document.activeElement.id).toBe('correct');
  cleanup();
});

test('typing alone never moves focus and managed forms keep custom navigation', () => {
  document.body.innerHTML = '<form data-error-focus-managed><input id="typing"><input aria-invalid="true"></form>';
  const cleanup = installErrorFocus();
  const typing = document.getElementById('typing');
  typing.focus();
  typing.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true }));
  jest.advanceTimersByTime(30);
  expect(document.activeElement).toBe(typing);
  cleanup();
});
