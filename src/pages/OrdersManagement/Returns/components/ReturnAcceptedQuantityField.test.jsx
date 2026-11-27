import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { useFormik } from 'formik';
import ReturnAcceptedQuantityField from './ReturnAcceptedQuantityField';
import { returnDoorstepQualityControlValidationSchema } from '../../../../_helpers/validationSchemas';

global.IS_REACT_ACT_ENVIRONMENT = true;

function Form({ submitted }) {
  const formik = useFormik({
    initialValues: { returnReason: 'defective', itemActions: [{ quantity: 1, approvedQuantity: 1, acceptedQuantity: '', result: 'rejected',
      checks: { identity: 'fail', serialNumber: 'fail', accessories: 'pass', packaging: 'pass', condition: 'pass' },
      notes: 'Wrong item and serial number', photos: 'https://example.com/qc.jpg' }] },
    validationSchema: returnDoorstepQualityControlValidationSchema,
    onSubmit: submitted,
  });
  return <form onSubmit={formik.handleSubmit} noValidate>
    <ReturnAcceptedQuantityField formik={formik} index={0} maximum={1} />
    <button type="submit">Continue</button>
  </form>;
}

test('zero clears a previous required error and submits as zero after typing and blur', async () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); const submitted = jest.fn();
  try {
    await act(async () => { root.render(<Form submitted={submitted} />); });
    await act(async () => { Simulate.submit(container.querySelector('form')); });
    expect(container.textContent).toContain('Accepted quantity is required');
    const input = container.querySelector('input');
    await act(async () => { Simulate.change(input, { target: { name: input.name, value: '0', type: 'number' } }); });
    await act(async () => { Simulate.blur(input, { target: { name: input.name } }); });
    expect(input.value).toBe('0');
    expect(container.textContent).not.toContain('Accepted quantity is required');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    await act(async () => { Simulate.submit(container.querySelector('form')); });
    expect(submitted).toHaveBeenCalledWith(expect.objectContaining({ itemActions: [expect.objectContaining({ acceptedQuantity: 0 })] }), expect.anything());
    await act(async () => { Simulate.change(input, { target: { name: input.name, value: '', type: 'number' } }); });
    expect(container.textContent).toContain('Accepted quantity is required');
  } finally {
    await act(async () => { root.unmount(); }); container.remove();
  }
});
