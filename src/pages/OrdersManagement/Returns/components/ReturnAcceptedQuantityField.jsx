import React from 'react';
import { checklistState } from '../../../../utils/doorstepQcDecision';
import { getIn } from 'formik';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';

export default function ReturnAcceptedQuantityField({ formik, index, maximum, automatic = false }) {
  const name = `itemActions[${index}].acceptedQuantity`;
  const state = checklistState(getIn(formik.values, `itemActions[${index}].checks`));
  const readOnly = automatic && (Number(maximum) === 1 || state !== "passed");
  return <FormInput label="Accepted quantity" name={name} type="number" min="0" max={maximum} step="1" readOnly={readOnly}
    value={getIn(formik.values, name) ?? ''}
    onChange={formik.handleChange}
    onBlur={formik.handleBlur}
    error={formik.submitCount > 0 || getIn(formik.touched, name) ? getIn(formik.errors, name) || '' : ''}
    helperText={automatic ? state === 'failed' ? 'A check is marked Fail, so the quantity is set to 0. The item will stay with the customer.'
      : state === 'incomplete' ? 'Complete the checklist above. We will fill this quantity for you.'
      : Number(maximum) === 1 ? 'All checks pass. This item is accepted automatically.'
      : `All ${maximum} units are accepted by default. If only some pass, enter that number and explain the rejected units in the notes. The checks above must describe the accepted units.`
      : `Enter a whole number from 0 to ${maximum}. Explain rejected units in notes.`}
    required />;
}
