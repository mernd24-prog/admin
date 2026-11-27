import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ReturnQcDecisionField from './ReturnQcDecisionField';
global.IS_REACT_ACT_ENVIRONMENT = true;
test.each([
  [true, 'uphold', 'Confirm ineligibility'],
  [true, 'override', 'Allow another doorstep inspection'],
  [true, 'request_evidence', 'Request more inspection evidence'],
  [false, 'uphold', 'Uphold seller QC failure'],
  [false, 'override', 'Override QC failure'],
  [false, 'partial', 'Partially approve'],
  [false, 'request_evidence', 'Request more seller evidence'],
])('shows the saved or selected decision for doorstep=%s value=%s', async (doorstep, value, label) => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<ReturnQcDecisionField doorstep={doorstep} value="" onChange={() => {}} />));
    expect(container.textContent).toContain('Select QC decision');
    await act(async () => root.render(<ReturnQcDecisionField doorstep={doorstep} value={value} onChange={() => {}} />));
    expect(container.textContent).toContain(label);
    expect(container.textContent).not.toContain('Select QC decision');
  } finally {
    await act(async () => root.unmount()); container.remove();
  }
});
