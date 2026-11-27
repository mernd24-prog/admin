import { returnDetailPresentation, returnDetailStages, returnDecisionDetails } from './returnDetailPresentation';

const refund = extra => ({ status: 'requested', resolution: 'refund', reason: 'size_issue', collectionQc: { required: true }, refundAmount: 165000, refund: { requestedAmount: 165000, approvedAmount: 0, status: 'not_started' }, ...extra });

test('refund requests stay refund-specific even when policy allows replacement', () => {
  const result = returnDetailPresentation(refund({ policySnapshot: { allowedResolutions: ['refund', 'replacement'] } }));
  expect(result.resolution).toBe('Return & Refund');
  expect(result.amountLabel).toBe('Requested refund amount');
  expect(result.amount).toBe(165000);
  expect(result.next.join(' ')).not.toMatch(/replacement|handover/i);
});

test('refund pickup guidance never asks for a replacement handover', () => {
  const result = returnDetailPresentation(refund({ status: 'reverse_pickup_scheduled', collectionQc: { required: true, visitStartedAt: 'now' } }));
  expect(result.next.join(' ')).toMatch(/collection/);
  expect(result.next.join(' ')).not.toMatch(/replacement|handover/i);
});

test('zero approved refund is preserved after rejection rather than replaced by requested money', () => {
  const result = returnDetailPresentation(refund({ status: 'qc_failure_upheld', refundAmount: 0 }));
  expect(result.amount).toBe(0);
  expect(result.moneyDescription).not.toBe('The recorded refund is completed.');
});

test('completed refund displays actual refunded amount', () => {
  const result = returnDetailPresentation(refund({ status: 'refunded', refund: { status: 'completed', refundedAmount: 1000 } }));
  expect(result.amountLabel).toBe('Refunded amount');
  expect(result.amount).toBe(1000);
});

test('replacement details describe replacement instead of implying a customer refund', () => {
  const result = returnDetailPresentation(refund({ resolution: 'replacement', status: 'approved' }));
  expect(result.title).toBe('Replacement Details');
  expect(result.amountLabel).toBe('Recorded item value');
  expect(result.moneyDescription).toMatch(/no customer refund/);
});

test('warehouse returns keep warehouse guidance and progress', () => {
  const request = refund({ status: 'received', reverseShipment: { provider: 'customer_manual' }, receivedAt: 'now' });
  expect(returnDetailPresentation(request).next[0]).toBe('Record warehouse QC');
  expect(returnDetailStages(request).map(step => step.label)).toContain('Warehouse received');
});

test.each(['requested', 'qc_failed', 'qc_failure_upheld', 'rejected', 'closed', 'refund_pending'])('%s never fabricates refund completion', status => {
  const stages = returnDetailStages(refund({ status }));
  expect(stages.at(-1).complete).toBe(false);
});

test('replacement completion and refund completion are separate outcomes', () => {
  const replacement = refund({ resolution: 'replacement', status: 'replacement_shipped', refund: { status: 'completed' } });
  expect(returnDetailStages(replacement).at(-1)).toEqual({ label: 'Replacement delivered', complete: false });
  expect(returnDetailStages({ ...replacement, status: 'replaced' }).at(-1).complete).toBe(true);
});


test('decision and failure reasons stay separate from the original customer reason', () => {
  const details = returnDecisionDetails({ reason: 'size_issue', status: 'refund_failed',
    refund: { failureReason: 'Payment provider rejected the refund' },
    qcReview: { decisionReason: 'Evidence verified', customerDispute: { reason: 'Inspection photo is incorrect' } },
    timeline: [{ status: 'closed', reason: 'Resolved by support' }],
  });
  expect(details.map(entry => entry.value)).toEqual(['Evidence verified', 'Inspection photo is incorrect', 'Payment provider rejected the refund', 'Resolved by support']);
  expect(returnDecisionDetails({ reason: 'size_issue' })).toEqual([]);
});


test('scheduled refund returns require courier arrival before inspection guidance', () => {
  const result = returnDetailPresentation(refund({ status: 'reverse_pickup_scheduled' }));
  expect(result.next[0]).toBe('Confirm courier arrival');
});
