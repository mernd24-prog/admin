const CONTROL = 'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), [role="combobox"], [contenteditable="true"], button:not(:disabled), [tabindex]';
const ERRORS = '[aria-invalid="true"], .admin-input-error, [data-validation-error="true"], .admin-field-error, [data-validation-summary], p.text-red-500, p.text-red-600, p.text-red-700';

export const isVisibleField = (element) => Boolean(element &&
  element.getClientRects().length && !element.closest('[hidden], [aria-hidden="true"], [inert]'));

export function focusValidationTarget(element) {
  if (!isVisibleField(element)) return false;
  const group = element.closest('.admin-field, [data-error-field]') ||
    (element.matches('p, [role="alert"]') ? element.parentElement : element);
  const focusable = (element.matches(CONTROL) && !element.matches(':disabled') ? element : null) ||
    Array.from(group.querySelectorAll(CONTROL)).find((node) => isVisibleField(node) &&
      !node.matches(':disabled, [tabindex="-1"]'));
  const target = focusable || group;
  if (!focusable && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  group.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
  return true;
}

export function focusFirstError(root, includeNative = false) {
  const selector = includeNative ? `${ERRORS}, input:invalid, select:invalid, textarea:invalid` : ERRORS;
  const error = Array.from(root.querySelectorAll(selector)).find(isVisibleField);
  return error ? focusValidationTarget(error) : false;
}

export function installErrorFocus(documentRoot = document) {
  let observer;
  let timer;
  let frame;
  const stop = () => {
    observer?.disconnect();
    clearTimeout(timer);
    cancelAnimationFrame(frame);
  };
  const begin = (origin, native = false) => {
    if (!(origin instanceof Element) || origin.closest('[data-error-focus-managed]')) return;
    stop();
    const scope = origin.closest('form') || origin.closest('[role="dialog"], [aria-modal="true"]') ||
      origin.closest('main') || documentRoot.getElementById('root') || documentRoot.body;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!scope.isConnected) return stop();
        if (focusFirstError(scope, native)) stop();
      });
    };
    observer = new MutationObserver(check);
    observer.observe(scope, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['aria-invalid', 'class', 'hidden', 'aria-hidden', 'data-validation-error'] });
    timer = setTimeout(stop, 10000);
    check();
  };
  const submit = (event) => begin(event.target);
  const invalid = (event) => {
    if (event.target.closest('[data-error-focus-managed]')) return;
    event.preventDefault();
    begin(event.target, true);
  };
  const click = (event) => {
    const button = event.target.closest?.('button, input[type="submit"], [data-submit-validation]');
    if (!button || button.disabled) return;
    if (button.type === 'submit' || button.hasAttribute('data-submit-validation') ||
      /^(save|submit|create|update|next|continue)\b/i.test(button.textContent.trim())) begin(button);
  };
  documentRoot.addEventListener('submit', submit, true);
  documentRoot.addEventListener('invalid', invalid, true);
  documentRoot.addEventListener('click', click, true);
  documentRoot.addEventListener('input', stop, true);
  return () => {
    stop();
    documentRoot.removeEventListener('submit', submit, true);
    documentRoot.removeEventListener('invalid', invalid, true);
    documentRoot.removeEventListener('click', click, true);
    documentRoot.removeEventListener('input', stop, true);
  };
}
