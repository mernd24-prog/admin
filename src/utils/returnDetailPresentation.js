import { isDoorstepReturn, doorstepExchangeStage } from './returnTrackingOptions';

export const returnDetailPresentation = (request = {}) => {
  const replacement = ['replacement', 'exchange'].includes(request.resolution);
  const doorstep = isDoorstepReturn(request);
  const status = String(request.status || 'requested');
  const qc = request.collectionQc || {};
  const refunded = request.refund?.status === 'completed' || status === 'refunded';
  const approved = request.refund?.approvedAmount ?? request.refundAmount;
  const amount = refunded ? request.refund?.refundedAmount ?? request.refundAmount ?? 0
    : status === 'requested' ? request.refund?.requestedAmount ?? request.refundAmount ?? request.refundBreakup?.totalRefundAmount ?? 0
    : approved ?? request.refundBreakup?.totalRefundAmount ?? 0;
  let next = {
    requested: ['Review the return request', 'Check the customer’s reason, evidence and requested quantities before accepting.'],
    approved: ['Arrange pickup', doorstep ? 'Schedule collection. The courier must inspect the item before collecting it.' : 'Arrange reverse pickup or provide manual ship-back instructions.'],
    pickup_failed: ['Reschedule pickup', 'The previous visit failed. Arrange another pickup; a failed visit does not mean failed QC.'],
    reverse_pickup_scheduled: ['Record doorstep inspection', 'Check the item, save the QC results and confirm physical collection. Refund processing follows accepted QC and collection.'],
    manual_ship_back: ['Wait for the customer’s shipment', 'The customer ships the item back. Inspection takes place after warehouse receipt.'],
    shipped_back: ['Confirm warehouse receipt', 'Confirm the quantities physically received before recording warehouse QC.'],
    in_reverse_transit: ['Track the returned item', 'Wait for warehouse receipt. Do not mark the item received before it arrives.'],
    received: ['Record warehouse QC', 'Inspect the received quantities and save the results and evidence.'],
    qc_passed: ['Await refund processing', 'Accepted QC is recorded. Platform finance handles the customer refund.'],
    qc_completed: ['Review the accepted quantities', 'Only accepted quantities qualify for refund. Platform finance handles processing.'],
    qc_failed: ['Review failed QC', 'Review the inspection reason and evidence. Do not issue a refund while the failed check is unresolved.'],
    qc_failure_upheld: ['QC rejection confirmed', qc.collectedAt || !doorstep ? 'Review whether the rejected item needs shipping back to the customer.' : 'The item remains with the customer. No collection or refund is approved.'],
    refund_pending: ['Refund processing', 'Wait for payment confirmation. The customer has not yet been marked refunded.'],
    refund_failed: ['Refund needs attention', 'Platform finance must review and retry or record the customer refund.'],
    partially_refunded: ['Partial refund recorded', 'Review the refunded amount and any outstanding balance.'],
    refunded: ['Refund completed', 'The customer refund is recorded. Shipment history remains available.'],
    rejected: ['Return request rejected', 'Review the recorded rejection reason. No return collection or refund is approved.'],
    closed: ['Return closed', 'Review the recorded final outcome and history. Closure alone does not confirm a refund.'],
  }[status] || ['Review current status', 'Review the recorded history before taking further action.'];
  if (doorstep && status === 'reverse_pickup_scheduled' && !qc.visitStartedAt) next = ['Confirm courier arrival', 'Pickup is booked. Confirm the courier is physically at the customer’s address before recording inspection results.'];
  if (doorstep && status === 'reverse_pickup_scheduled' && ['passed', 'partially_passed'].includes(qc.status) && qc.items?.length && !qc.collectedAt)
    next = ['Confirm collection', 'Inspection is already saved. Confirm only after the courier physically collects the accepted units; rejected units stay with the customer.'];
  if (doorstep && !replacement && qc.collectedAt && ['qc_passed', 'qc_completed', 'refund_pending'].includes(status))
    next = ['Collected — refund pending', 'The courier has collected the accepted items. Platform finance can process the refund without waiting for warehouse receipt. Track the same pickup shipment back to the warehouse; do not create another shipment.'];
  if (doorstep && !replacement && qc.sellerResponsibilityCompletedAt)
    next = [refunded ? 'Refund completed' : 'Return completed — refund pending', 'Doorstep QC and collection are complete. No further shipment update is required. The seller is responsible for onward transport. Refund payment is recorded separately.'];
  if (!doorstep && status === 'reverse_pickup_scheduled') next = ['Wait for pickup', 'Track the return shipment. Warehouse QC follows physical receipt.'];
  if (replacement && doorstep) {
    const stage = doorstepExchangeStage(request, true);
    next = [stage.title, stage.description];
  } else if (replacement) {
    if (['qc_passed', 'qc_completed', 'replacement_requested', 'replacement_pending'].includes(status)) next = ['Prepare the replacement', 'Use the approved replacement workflow. A customer refund is not scheduled.'];
    if (status === 'replacement_created') next = ['Dispatch the replacement', 'Book delivery for the approved replacement item.'];
    if (status === 'replacement_shipped') next = ['Track replacement delivery', 'Confirm delivery only after the customer receives the replacement.'];
    if (['replacement_delivered', 'replaced'].includes(status)) next = ['Replacement delivered', 'The recorded resolution is replacement; no customer refund is scheduled.'];
  }
  return {
    replacement, doorstep, next,
    title: replacement ? 'Replacement Details' : 'Return & Refund Details',
    resolution: replacement ? 'Return & Replacement' : 'Return & Refund',
    amount: Number(amount),
    amountLabel: replacement ? 'Recorded item value' : refunded ? 'Refunded amount' : status === 'requested' ? 'Requested refund amount' : 'Approved refund amount',
    moneyDescription: replacement ? 'Replacement resolution selected. This value is for reference; no customer refund is scheduled.'
      : refunded ? 'The recorded refund is completed.'
      : status === 'requested' ? 'This is the requested amount, subject to accepted quantities, QC and collection. It has not been refunded.'
      : ['rejected', 'qc_failure_upheld', 'closed'].includes(status) ? 'Review the final decision and refund status below. This amount does not indicate a completed refund.'
      : doorstep ? 'Refund processing requires accepted doorstep QC and confirmed collection. Platform finance handles payment.'
      : 'Refund processing follows warehouse receipt and accepted QC. Platform finance handles payment.',
  };
};

export const returnDetailStages = (request = {}) => {
  const { replacement, doorstep } = returnDetailPresentation(request);
  const status = request.status || 'requested';
  const qc = request.collectionQc || {};
  const events = request.timeline || [];
  const recorded = states => events.some(event => states.includes(event.status));
  const afterReceipt = ['received', 'qc_passed', 'qc_completed', 'refund_pending', 'refund_failed', 'refunded', 'replacement_requested', 'replacement_created', 'replacement_shipped', 'replacement_delivered', 'replaced'].includes(status);
  const approval = !!request.approvedAt || recorded(['approved']) || (!['requested', 'rejected', 'closed'].includes(status));
  const inspected = doorstep ? ['passed', 'partially_passed'].includes(qc.status) && !['qc_failed', 'qc_failure_upheld'].includes(status)
    : !!request.qcAt && !['qc_failed', 'qc_failure_upheld'].includes(status);
  return [
    { label: 'Request submitted', complete: true },
    { label: 'Request accepted', complete: approval },
    { label: doorstep ? 'Pickup scheduled' : 'Return shipment', complete: !!request.reverseShipment?.pickupScheduledAt || recorded(['reverse_pickup_scheduled', 'manual_ship_back', 'shipped_back']) || afterReceipt },
    ...(doorstep ? [
      { label: 'Doorstep QC passed', complete: inspected },
      { label: replacement ? 'Old item collected' : 'Return item collected', complete: !!qc.collectedAt },
    ] : [
      { label: 'Warehouse received', complete: !!request.receivedAt || afterReceipt },
      { label: 'Warehouse QC passed', complete: inspected || ['qc_passed', 'qc_completed', 'refund_pending', 'refund_failed', 'refunded', 'replacement_requested', 'replacement_created', 'replacement_shipped', 'replacement_delivered', 'replaced'].includes(status) },
    ]),
    { label: replacement ? 'Replacement delivered' : 'Refund completed', complete: replacement
      ? ['replacement_delivered', 'replaced'].includes(status) || ['delivered', 'completed'].includes(request.replacement?.status)
      : status === 'refunded' || request.refund?.status === 'completed' },
  ];
};

export const returnDecisionDetails = (request = {}) => {
  const latest = status => [...(request.timeline || [])].reverse().find(event => event.status === status);
  return [
    ...(['replacement', 'exchange'].includes(request.resolution) && request.collectionQc?.exchangeFailure ? [{ label: 'Exchange failure reason', value: request.collectionQc.exchangeFailure.reason }] : []),
    { label: 'Request rejection reason', value: request.rejectionReason || request.rejection_reason || request.metadata?.rejectionReason || latest('rejected')?.reason },
    { label: 'QC review decision reason', value: request.qcReview?.decisionReason },
    { label: 'Additional evidence requested', value: request.qcReview?.evidenceRequestReason },
    { label: 'Customer’s QC dispute reason', value: request.qcReview?.customerDispute?.reason },
    { label: 'Pickup failure details', value: request.status === 'pickup_failed' ? latest('pickup_failed')?.reason || latest('pickup_failed')?.note : null },
    { label: 'Refund failure details', value: request.refund?.failureReason || (request.status === 'refund_failed' ? request.lastError : null) },
    { label: 'Closure reason', value: latest('closed')?.reason || latest('closed')?.note },
  ].filter(entry => typeof entry.value === 'string' && entry.value.trim());
};
