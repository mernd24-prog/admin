const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
};

const statusOf = (value) => String(value || "").trim().toLowerCase();
const amountOf = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
};

const returnLifecycleOf = (row = {}) => {
  const metadata = normalizeJson(row.metadata, {});
  return normalizeJson(metadata.returnLifecycle, {});
};

const refundAmountsOf = (row = {}) => {
  const lifecycle = returnLifecycleOf(row);
  const payments = asArray(row.relations?.payments);
  const latestPayment = payments[0] || {};
  const paymentMetadata = normalizeJson(latestPayment.metadata, {});
  const returnRefund = normalizeJson(paymentMetadata.returnRefund, {});

  const refundedAmount = amountOf(
    lifecycle.refundedAmount ??
      returnRefund.refundedAmount ??
      row.refundedAmount,
  );
  const paidAmount = amountOf(
    latestPayment.amount ??
      row.payable_amount ??
      row.payableAmount ??
      row.total_amount ??
      row.totalAmount,
  );

  return {
    refundedAmount,
    paidAmount,
    retainedAmount: Math.max(Number((paidAmount - refundedAmount).toFixed(2)), 0),
  };
};

const allItemsHavePayoutStatus = (items, statuses) =>
  items.length > 0 &&
  items.every((item) =>
    statuses.has(statusOf(item.payout_status || item.payoutStatus)),
  );

/**
 * Keeps the provider payment status accurate while making a complete product
 * return understandable when a separate customer charge was retained.
 */
export const paymentPresentationOf = (row = {}) => {
  const status = statusOf(row.payment_status || row.paymentStatus);
  const lifecycle = returnLifecycleOf(row);
  const metadata = normalizeJson(row.metadata, {});
  const pricingSummary = normalizeJson(metadata.pricingSummary, {});
  const items = asArray(row.items);
  const merchandiseFullyRefunded =
    lifecycle.fullQuantityReturned === true ||
    allItemsHavePayoutStatus(items, new Set(["refunded"]));
  const amounts = refundAmountsOf(row);

  if (status === "partially_refunded" && merchandiseFullyRefunded) {
    const retainedCharge = amountOf(pricingSummary.customerPlatformFeeAmount) >=
      amounts.retainedAmount - 0.01
      ? "platform fee"
      : "other charges";

    return {
      status: "refunded",
      label: "Product Refunded",
      detail: amounts.retainedAmount > 0
        ? `₹${amounts.refundedAmount.toFixed(2)} refunded; ₹${amounts.retainedAmount.toFixed(2)} ${retainedCharge} retained`
        : "All returned products were refunded",
      ...amounts,
    };
  }

  return { status, label: null, detail: null, ...amounts };
};

export const payoutWindowOf = (row = {}, now = Date.now()) => {
  const items = asArray(row.items);
  const commissions = asArray(row.relations?.sellerCommissions);
  const payouts = asArray(row.relations?.sellerPayouts);
  const orderStatus = statusOf(row.status);

  const payableItems = items.filter((item) =>
    !new Set(["refunded", "cancelled"]).has(statusOf(item.payout_status || item.payoutStatus)),
  );
  const deadlineOf = (item) => item.payout_eligible_at || item.payoutEligibleAt ||
    item.return_eligible_until || item.returnEligibleUntil;
  const deadlines = payableItems
    .map(
      (item) =>
        item.payout_eligible_at ||
        item.payoutEligibleAt ||
        item.return_eligible_until ||
        item.returnEligibleUntil,
    )
    .filter((value) => value && Number.isFinite(new Date(value).getTime()));
  const latestDeadline = deadlines.length
    ? deadlines.reduce((latest, value) =>
        new Date(value).getTime() > new Date(latest).getTime() ? value : latest,
      )
    : null;

  const completedPayout = payouts.some((payout) =>
    new Set(["paid", "completed", "processed", "success"]).has(statusOf(payout.status)),
  );
  const commissionsPaid =
    commissions.length > 0 &&
    commissions.every((commission) => statusOf(commission.status) === "paid");
  const paid = completedPayout || commissionsPaid;

  const commissionsFullyRefunded =
    commissions.length > 0 &&
    commissions.every((commission) =>
      statusOf(commission.status) === "refunded" ||
      (amountOf(commission.net_amount ?? commission.netAmount) <= 0 &&
        amountOf(commission.refund_amount ?? commission.refundAmount) > 0),
    );
  const itemsFullyRefunded = allItemsHavePayoutStatus(items, new Set(["refunded"]));
  const terminalWithoutPayout = new Set([
    "cancelled",
    "payment_failed",
    "failed",
    "rejected",
  ]).has(orderStatus);
  const noPayout = !paid &&
    (commissionsFullyRefunded || itemsFullyRefunded || terminalWithoutPayout);

  const held = !noPayout && (
    payableItems.some((item) => statusOf(item.payout_status || item.payoutStatus) === "held") ||
    commissions.some((commission) => new Set(["held", "on_hold"]).has(statusOf(commission.status)))
  );
  // Resolve each remaining item separately: a refunded item's later deadline
  // must not delay earnings on delivered items that the customer kept.
  const eligible = !noPayout && !held && !paid && (payableItems.length
    ? payableItems.every((item) => {
        const status = statusOf(item.payout_status || item.payoutStatus);
        if (new Set(["eligible", "paid"]).has(status)) return true;
        if (status && status !== "pending") return false;
        const deadline = new Date(deadlineOf(item)).getTime();
        const delivered = Boolean(item.delivered_at || item.deliveredAt) ||
          new Set(["delivered", "fulfilled"]).has(orderStatus);
        return delivered && Number.isFinite(deadline) && deadline <= now;
      })
    : orderStatus === "fulfilled");
  const fulfilled = eligible;

  return {
    latestDeadline,
    held,
    paid,
    noPayout,
    noPayoutReason: commissionsFullyRefunded || itemsFullyRefunded
      ? "Seller amount fully reversed"
      : terminalWithoutPayout
        ? "Order closed without a payout"
        : null,
    fulfilled,
    eligible,
  };
};

