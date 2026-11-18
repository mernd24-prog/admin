import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  MdAccountBalanceWallet,
  MdArrowForward,
  MdCheckCircle,
  MdHourglassEmpty,
  MdPauseCircle,
  MdPayments,
  MdWarningAmber,
} from "react-icons/md";
import Cards from "../../../components/Cards/Cards";
import { toast } from "sonner";
import PageHeader from "../../../components/Shared/PageHeader";
import Pagination from "../../../components/Pagination/Pagination";
import Loader from "../../../components/Loader/Loader";
import { getMySellerWalletSummary } from "../../../Redux/sellerCommissionsSlice";
import {
  FinanceDateRangeFilter,
  FinanceStatusBadge,
  MoneyEquation,
  financeDateTime,
  financeAmounts,
  financeMoney,
  sellerFinanceStatus,
  unwrapFinance,
  useFinanceDateRange,
} from "./financeUi";
import { RefreshButton } from "../../../components/Atoms/buttons/exportImport";

import CollapsibleSection from "../../../components/Shared/FormSection";
import ContentPanel from "../../../components/Shared/ContentPanel";
import SummaryCard from "../../../components/Shared/SummaryCard";
import TransparentButton from "../../../components/Atoms/buttons/TransParentButton";

const sectionClass = "admin-card overflow-hidden";
const sectionHeaderClass =
  "flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-line)] px-5 py-4";
const mutedTextClass = "text-xs text-[var(--admin-muted)]";
const interactiveClass =
  "transition-colors duration-200 hover:bg-[var(--admin-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-gold)] focus-visible:ring-inset";

export default function FinanceOverview() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);

  const state = useSelector(
    (store) => store.sellerCommissions?.walletSummaryData || {},
  );

  const wallet = unwrapFinance(state);
  const balances = wallet.balances || {};
  const counts = wallet.counts || {};
  const currency = wallet.currency || "INR";
  const items = Array.isArray(wallet.items) ? wallet.items : [];
  const payouts = wallet.payouts || {};
  const codReconciliation = wallet.codReconciliation || {};
  const codSummary = wallet.codSummary || {};

  const dateRange = useFinanceDateRange();
  const { dateFilters } = dateRange;

  const owed =
    Math.abs(Number(balances.codLiabilityBalance || 0)) +
    Math.abs(Number(balances.otherAdjustmentBalance || 0));

  const load = useCallback(async () => {
    try {
      await dispatch(
        getMySellerWalletSummary({
          fromDate: dateFilters.fromDate,
          toDate: dateFilters.toDate,
          limit: activityPageSize,
          offset: (activityPage - 1) * activityPageSize,
        }),
      ).unwrap();
    } catch (error) {
      toast.error(error?.message || error || "Unable to load finance overview");
    }
  }, [activityPage, activityPageSize, dateFilters, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setActivityPage(1);
  }, [dateFilters.fromDate, dateFilters.toDate]);

  const financeSummary = wallet.summary || wallet.earningsSummary || {};
  const previousSummary =
    wallet.previousPeriod || financeSummary.previousPeriod || {};
  const comparison = wallet.comparison || financeSummary.comparison || {};

  const sumItems = (keys) =>
    items.reduce((total, item) => {
      const canonical = financeAmounts(item);
      if (keys.includes("netAmount") || keys.includes("net_amount")) {
        const netValue =
          canonical.sellerEarning ??
          item?.netAmount ??
          item?.net_amount ??
          item?.payableAmount ??
          item?.payable_amount;
        return total + Number(netValue || 0);
      }
      const value = keys.find(
        (key) => item?.[key] !== undefined && item?.[key] !== null,
      );
      return total + Number(value ? item[value] : 0);
    }, 0);

  const grossEarnings = Number(
    financeSummary.grossEarnings ??
    wallet.grossEarnings ??
    balances.grossEarnings ??
    sumItems(["grossAmount", "gross_amount", "amount"]),
  );

  const netEarnings = Number(
    financeSummary.netEarnings ??
    wallet.netEarnings ??
    balances.netEarnings ??
    sumItems(["netAmount", "net_amount"]),
  );

  // Commission rows already contain the fee/tax amounts that produced the
  // seller earning.  Do not infer deductions from gross minus net alone:
  // shipping reimbursement is included in net earnings and would otherwise
  // make the deduction card read zero (or become negative).
  const itemDeductions =
    sumItems(["commissionAmount", "commission_amount"]) +
    sumItems(["taxAmount", "tax_amount"]) +
    Math.abs(sumItems(["refundAmount", "refund_amount"])) +
    Math.abs(sumItems(["adjustmentAmount", "adjustment_amount"]));

  const breakdown = {
    platformFee: sumItems(["commissionAmount", "commission_amount"]),
    gstOnPlatformFee: sumItems(["commissionGstAmount", "commission_gst_amount"]),
    tcs: sumItems(["tcsAmount", "gstTcsAmount", "gst_tcs_amount"]),
    tds: sumItems(["tdsAmount", "incomeTaxTdsAmount", "income_tax_tds_amount"]),
    shipping: sumItems(["shippingAmount", "shipping_amount"]),
    shippingDeduction: sumItems(["shippingDeduction", "shipping_deduction"]),
    promotion: sumItems(["promotionFundedAmount", "promotion_funded_amount"]),
    refund: Math.abs(sumItems(["refundAmount", "refund_amount"])),
    other: Math.abs(sumItems(["adjustmentAmount", "adjustment_amount"])),
  };

  const deductions = Number(
    financeSummary.deductions ??
    financeSummary.adjustments ??
    wallet.deductions ??
    wallet.adjustments ??
    (itemDeductions || Math.max(0, grossEarnings - netEarnings)),
  );

  const previousNetEarnings = Number(
    previousSummary.netEarnings ??
    previousSummary.net ??
    wallet.previousNetEarnings ??
    financeSummary.previousNetEarnings,
  );

  const percentageChangeValue =
    financeSummary.percentageChange ??
    financeSummary.changePercentage ??
    comparison.percentageChange ??
    comparison.changePercentage ??
    wallet.percentageChange ??
    wallet.changePercentage;

  const percentageChange = Number(percentageChangeValue);

  const calculatedPercentageChange = Number.isFinite(
    percentageChangeValue ? percentageChange : NaN,
  )
    ? percentageChange
    : previousNetEarnings
      ? ((netEarnings - previousNetEarnings) / Math.abs(previousNetEarnings)) *
      100
      : null;

  const journey = [
    [
      "Delivered",
      wallet.deliveredAmount ?? balances.deliveredBalance,
      counts.delivered || 0,
      "Order items delivered",
      "",
    ],
    [
      "Return window",
      balances.pendingBalance,
      counts.pending || 0,
      "Delivered earnings waiting for the return period to close",
      "waiting",
    ],
    [
      "Eligible",
      balances.availableBalance,
      counts.available || counts.eligible || 0,
      "Return window closed with no active hold",
      "available",
    ],
    [
      "Payout processing",
      balances.inProcessBalance,
      payouts.inProcessCount || 0,
      "Transfer is being processed",
      "processing",
    ],
    [
      "Paid",
      balances.paidBalance,
      payouts.paidCount || 0,
      "Successfully transferred",
      "paid",
    ],
  ];

  const EmptyPanel = ({
    title = "No data found",
    text = "No data returned for this period.",
  }) => (
    <div className="mx-4 my-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-4 py-8 text-center sm:py-10">
      <img
        src="/Img/noData.png"
        alt="No data"
        className="h-24 w-24 max-w-full object-contain sm:h-32 sm:w-32"
      />
      <h4 className="mt-2 text-sm font-semibold text-[var(--admin-navy)]">
        {title}
      </h4>
      {text && (
        <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--admin-muted)]">
          {text}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 pb-4">
      <Loader loading={Boolean(state.loading)} />

      <PageHeader
        title="Finance"
        subtitle="Track your earnings, pending settlements, deductions, and payouts in one place."
        breadcrumbs={[{ label: "My Finance & Payouts" }, { label: "Overview" }]}
        actions={
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <FinanceDateRangeFilter
              dateRange={dateRange}
              loading={Boolean(state.loading)}
            />
            <RefreshButton
              onClick={load}
              loading={Boolean(state.loading)}
              disabled={Boolean(state.loading)}
            />
          </div>
        }
      />

      {/* Payable balance — preserve original layout */}
      <div className="order-1 grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        <Cards
          label="Payable now"
          value={financeMoney(balances.effectiveAvailablePayout, currency)}
          description="Available to be transferred to your selected payout account."
          icon={<MdAccountBalanceWallet aria-hidden="true" size={18} />}
          iconBg="#cce8c9"
          iconColor="#1d9b50"
          onClick={() => navigate("/app/seller-payouts")}
        />
        <MoneyEquation available={balances.availableBalance} owed={owed} payable={balances.effectiveAvailablePayout} currency={currency} />
      </div>

      {(Number(codReconciliation.totalOrders || 0) > 0 ||
        Number(codSummary.collectedAmount || 0) > 0 ||
        Number(codSummary.outstandingAmount || 0) > 0) && (
          <div className="order-6">
            <ContentPanel title="COD collections"   bodyClassName="p-0">
              <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
                {[
                  ["Cash confirmed", codSummary.collectedAmount, "Physical customer cash retained by the seller.", "/app/seller-cod-collections"],
                  ["Recovered from payouts", codSummary.recoveredAmount, `${financeMoney(codSummary.reservedAmount, currency)} reserved in payouts.`, "/app/seller-payouts"],
                  ["COD still owed", codSummary.outstandingAmount, "Carried forward into future payouts.", "/app/seller-cod-collections"],
                ].map(([label, amount, detail, path]) => (
                  <SummaryCard key={label} title={label} value={financeMoney(amount, currency)} description={detail} onClick={() => navigate(path)} className="min-h-0 border-0 bg-none shadow-none" valueClassName="text-base" />
                ))}
              </div>
            </ContentPanel>
          </div>
        )}

      {/* COD reconciliation */}
      {Number(codReconciliation.totalOrders || 0) > 0 && (
        <section className={`order-5 ${sectionClass}`}>
          <div className={sectionHeaderClass}>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--admin-navy)]">
                COD Reconciliation
              </h2>
            </div>

            <button
              type="button"
              className="admin-btn-secondary inline-flex items-center justify-center gap-2"
              onClick={() => navigate("/app/seller-cod-collections")}
            >
              Review COD collections
              <MdArrowForward aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
            {[
              {
                label: "COD orders",
                value: codReconciliation.totalOrders,
                icon: <MdAccountBalanceWallet aria-hidden="true" size={18} />,
                iconBg: "#FFF7EA",
                iconColor: "#1F1B5F",
              },
              {
                label: "Delivered",
                value: codReconciliation.deliveredOrders,
                icon: <MdCheckCircle aria-hidden="true" size={18} />,
                iconBg: "#cce8c9",
                iconColor: "#1d9b50",
              },
              {
                label: "Awaiting delivery",
                value: codReconciliation.awaitingDeliveryOrders,
                icon: <MdHourglassEmpty aria-hidden="true" size={18} />,
                iconBg: "#ffe5b5",
                iconColor: "#f5a300",
              },
              {
                label: "Cash liabilities",
                value: codReconciliation.ordersWithLiability,
                icon: <MdPauseCircle aria-hidden="true" size={18} />,
                iconBg: "#ffd4d2",
                iconColor: "#ff4b55",
              },
            ].map((item) => (
              <Cards
                key={item.label}
                label={item.label}
                value={item.value || 0}
                icon={item.icon}
                iconBg={item.iconBg}
                iconColor={item.iconColor}
              />
            ))}
          </div>

          {Number(codReconciliation.missingCollectionOrders || 0) > 0 && (
            <div className="mx-4 mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 sm:mx-5">
              <MdWarningAmber
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-red-600"
                size={20}
              />
              <p className="text-xs leading-5 text-red-700">
                {codReconciliation.missingCollectionOrders} delivered COD
                order(s) have no collection record and require administrator
                review.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Earnings summary */}
      <section className={`order-2 ${sectionClass}`}>
        <div className={sectionHeaderClass}>
          <div>
            <h2 className="text-base font-semibold text-[var(--admin-navy)]">
              Earnings Summary
            </h2>
            <p className={`mt-1 ${mutedTextClass}`}>
              Earnings and deductions for the selected date range.
            </p>
          </div>
        </div>

        <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Gross Earnings",
              value: financeMoney(grossEarnings, currency),
              color: "text-[var(--admin-navy)]",
              marker: "bg-[var(--admin-gold)]",
            },
            {
              label: "Deductions / Adjustments",
              value: financeMoney(deductions, currency),
              color: "text-amber-700",
              marker: "bg-amber-500",
            },
            {
              label: "Net Earnings Before COD",
              value: financeMoney(netEarnings, currency),
              color: "text-emerald-700",
              marker: "bg-emerald-500",
            },
            {
              label: "Change vs Previous Period",
              value:
                calculatedPercentageChange === null
                  ? "N/A"
                  : `${calculatedPercentageChange >= 0 ? "+" : ""}${calculatedPercentageChange.toFixed(1)}%`,
              color:
                calculatedPercentageChange === null
                  ? "text-[var(--admin-muted)]"
                  : calculatedPercentageChange >= 0
                    ? "text-emerald-700"
                    : "text-red-700",
              marker:
                calculatedPercentageChange === null
                  ? "bg-[var(--admin-line)]"
                  : calculatedPercentageChange >= 0
                    ? "bg-emerald-500"
                    : "bg-red-500",
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="border-b border-[var(--admin-line)] p-4 last:border-b-0 sm:border-r sm:p-5 sm:nth-[2]:border-r-0 sm:nth-last-[2]:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${metric.marker}`}
                />
                <span className="text-xs font-medium text-[var(--admin-muted)]">
                  {metric.label}
                </span>
              </div>
              <strong
                className={`mt-3 block break-words text-xl font-semibold tabular-nums sm:text-2xl ${metric.color}`}
              >
                {metric.value}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <section className={`order-3 ${sectionClass}`}>
        <div className={sectionHeaderClass}>
          <div>
            <h2 className="text-base font-semibold text-[var(--admin-navy)]">Earnings breakdown</h2>
            <p className={`mt-1 ${mutedTextClass}`}>How gross sales become net earnings before COD recovery.</p>
          </div>
        </div>
        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Platform fee", breakdown.platformFee, "text-red-700"],
            ["GST on platform fee", breakdown.gstOnPlatformFee, "text-red-700"],
            ["TCS", breakdown.tcs, "text-red-700"],
            ["TDS", breakdown.tds, "text-red-700"],
            ["Shipping credited", breakdown.shipping, "text-emerald-700"],
            ["Shipping deduction", breakdown.shippingDeduction, "text-red-700"],
            ["Promotion funded", breakdown.promotion, "text-emerald-700"],
            ["Refund / other adjustment", breakdown.refund + breakdown.other, "text-red-700"],
          ].map(([label, value, color]) => (
            <div key={label} className="border-b border-[var(--admin-line)] p-4 last:border-b-0 sm:border-r lg:p-5">
              <span className="text-xs font-medium text-[var(--admin-muted)]">{label}</span>
              <strong className={`mt-2 block text-lg tabular-nums ${color}`}>{financeMoney(value, currency)}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* Money journey */}
      <section className={`order-4 ${sectionClass}`}>
        <div className={sectionHeaderClass}>
          <div>
            <h2 className="text-base font-semibold text-[var(--admin-navy)]">
              Money Journey
            </h2>
            <p className={`mt-1 ${mutedTextClass}`}>
              Follow earnings from delivery to your payout destination.
            </p>
          </div>
        </div>

        <div className="grid divide-y divide-[var(--admin-line)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(even)]:border-r-0 lg:grid-cols-3 lg:[&>*]:border-r lg:[&>*:nth-child(3n)]:border-r-0 xl:grid-cols-5 xl:[&>*]:border-r xl:[&>*:nth-child(3n)]:border-r xl:[&>*:nth-child(5n)]:border-r-0">
          {journey.map(([label, amount, count, detail, status]) => (
            <div key={label} className="relative flex min-h-[220px] min-w-0 flex-col p-4 sm:p-5">
              <span className="text-xs font-semibold text-[var(--admin-muted)]">
                {label}
              </span>

              <strong className="mt-3 block break-words text-xl font-semibold tabular-nums text-[var(--admin-navy)]">
                {financeMoney(amount, currency)}
              </strong>

              <span className="mt-2 inline-flex items-center rounded-md bg-[var(--admin-surface-soft)] px-2 py-1 text-xs font-medium text-[var(--admin-muted)]">
                {count}{" "}
                {label === "Payout processing" || label === "Paid"
                  ? "payouts"
                  : "earnings"}
              </span>

              <p className="mt-3 min-h-10 text-xs leading-5 text-[var(--admin-muted)]">
                {detail}
              </p>
              {status && <TransparentButton label={`View ${label.toLowerCase()}`} className="mt-auto self-start px-2 py-1 text-xs" onClick={() => navigate(["processing", "paid"].includes(status) ? `/app/seller-payouts?status=${status}` : `/app/finance-earnings?status=${status}`)} />}
            </div>
          ))}
        </div>
      </section>


      {/* Attention required */}
      {(owed > 0 || Number(balances.blockedBalance || 0) > 0) && (
        <section className="order-7 space-y-3 rounded-lg border border-golden/30 bg-white p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <MdWarningAmber aria-hidden="true" size={19} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--admin-navy)]">
                Needs Your Attention
              </h2>
              <p className={mutedTextClass}>
                Review outstanding amounts and temporary holds.
              </p>
            </div>
          </div>

          {owed > 0 && (
            <button
              type="button"
              onClick={() => navigate("/app/seller-cod-collections")}
              className={`group flex w-full items-start gap-3 rounded-xl border border-red-200 bg-[var(--admin-card)] p-4 text-left shadow-sm sm:items-center sm:p-5 ${interactiveClass}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <MdWarningAmber aria-hidden="true" size={22} />
              </span>

              <div className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold leading-6 text-[var(--admin-navy)]">
                  {financeMoney(owed, currency)} COD amount needs to be
                  recovered
                </strong>
                <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">
                  This was recorded automatically from delivered COD orders.
                  Confirm retained COD cash and track automatic payout recovery.
                  It reduces available or future earnings until fully recovered.
                </p>
              </div>

              <MdArrowForward
                aria-hidden="true"
                className="mt-2 shrink-0 text-[var(--admin-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--admin-navy)] sm:mt-0"
                size={20}
              />
            </button>
          )}

          {Number(balances.blockedBalance || 0) > 0 && (
            <button
              type="button"
              onClick={() => navigate("/app/finance-earnings?status=held")}
              className={`group flex w-full items-start gap-3 rounded-xl border border-amber-200 bg-[var(--admin-card)] p-4 text-left shadow-sm sm:items-center sm:p-5 ${interactiveClass}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <MdWarningAmber aria-hidden="true" size={22} />
              </span>

              <div className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold leading-6 text-[var(--admin-navy)]">
                  {financeMoney(balances.blockedBalance, currency)} temporarily
                  on hold
                </strong>
                <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">
                  One or more orders has an active return, refund, dispute, or
                  hold.
                </p>
              </div>

              <MdArrowForward
                aria-hidden="true"
                className="mt-2 shrink-0 text-[var(--admin-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--admin-navy)] sm:mt-0"
                size={20}
              />
            </button>
          )}
        </section>
      )}


    </div>
  );
}
