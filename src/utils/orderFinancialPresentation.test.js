import {
  paymentPresentationOf,
  payoutWindowOf,
} from "./orderFinancialPresentation";

const refundedCodOrder = {
  status: "returned",
  payment_status: "partially_refunded",
  payable_amount: 590,
  metadata: {
    pricingSummary: { customerPlatformFeeAmount: 100 },
    returnLifecycle: {
      fullQuantityReturned: true,
      refundedAmount: 490,
    },
  },
  items: [{ payout_status: "refunded", payout_eligible_at: "2026-11-20T10:20:00Z" }],
  relations: {
    payments: [{ amount: 590 }],
    sellerCommissions: [{ status: "refunded", net_amount: 0, refund_amount: 477.71 }],
    sellerPayouts: [],
  },
};

test("explains a complete product refund with a retained separate charge", () => {
  expect(paymentPresentationOf(refundedCodOrder)).toMatchObject({
    status: "refunded",
    label: "Product Refunded",
    refundedAmount: 490,
    retainedAmount: 100,
    detail: "₹490.00 refunded; ₹100.00 platform fee retained",
  });
});

test("marks a fully reversed seller amount as no payout", () => {
  expect(payoutWindowOf(refundedCodOrder)).toMatchObject({
    paid: false,
    noPayout: true,
    noPayoutReason: "Seller amount fully reversed",
  });
});

test("keeps a genuine multi-item partial refund partial", () => {
  const row = {
    ...refundedCodOrder,
    status: "partially_returned",
    metadata: { returnLifecycle: { fullQuantityReturned: false, refundedAmount: 490 } },
    items: [{ payout_status: "refunded" }, { payout_status: "pending" }],
    relations: {
      ...refundedCodOrder.relations,
      sellerCommissions: [{ status: "pending", net_amount: 400, refund_amount: 100 }],
    },
  };

  expect(paymentPresentationOf(row).status).toBe("partially_refunded");
  expect(payoutWindowOf(row).noPayout).toBe(false);
});

test("does not erase a payout that completed before the refund", () => {
  const row = {
    ...refundedCodOrder,
    relations: {
      ...refundedCodOrder.relations,
      sellerPayouts: [{ status: "paid" }],
    },
  };

  expect(payoutWindowOf(row)).toMatchObject({ paid: true, noPayout: false });
});

test("marks cancelled and failed orders as closed without payout", () => {
  for (const status of ["cancelled", "payment_failed"]) {
    const payout = payoutWindowOf({ status, items: [], relations: {} });
    expect(payout).toMatchObject({ noPayout: true, paid: false });
  }
});

