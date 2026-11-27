import React from 'react';
import FormSelectGroup from '../../../../components/Atoms/FormSelectGroup/FormSelectGroup';

export default function ReturnQcDecisionField({ doorstep, value, onChange }) {
  const options = doorstep ? [
    { value: 'uphold', label: 'Confirm ineligibility — item stays with customer' },
    { value: 'override', label: 'Allow another doorstep inspection' },
    { value: 'request_evidence', label: 'Request more inspection evidence' },
  ] : [
    { value: 'uphold', label: 'Uphold seller QC failure' },
    { value: 'override', label: 'Override QC failure — approve eligible resolution' },
    { value: 'partial', label: 'Partially approve eligible resolution' },
    { value: 'request_evidence', label: 'Request more seller evidence' },
  ];
  return <FormSelectGroup wrapSingleValue label="Decision" required
    options={options} value={options.find(option => option.value === value) || null}
    onChange={option => onChange(option?.value || '')} placeholder="Select QC decision" />;
}
