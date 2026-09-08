import React, { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  MdAccountBalanceWallet,
  MdArrowForward,
  MdHourglassEmpty,
  MdPauseCircle,
  MdPayments,
  MdRefresh,
  MdWarningAmber,
} from "react-icons/md";
import Cards from "../../../components/Cards/Cards";
import { toast } from "sonner";
import PageHeader from "../../../components/Shared/PageHeader";
import Loader from "../../../components/Loader/Loader";
import { getMySellerWalletSummary } from "../../../Redux/sellerCommissionsSlice";
import {
  FinanceDateRangeFilter,
  FinanceNav,
  FinancePageGuide,
  FinanceStatusBadge,
  MoneyEquation,
  financeDateTime,
  financeMoney,
  sellerFinanceStatus,
  unwrapFinance,
  useFinanceDateRange,
} from "./financeUi";

export default function FinanceOverview() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const state = useSelector(
    (store) => store.sellerCommissions?.walletSummaryData || {},
  );
  const wallet = unwrapFinance(state);
  const balances = wallet.balances || {};
  const counts = wallet.counts || {};
  const currency = wallet.currency || "INR";
  const items = Array.isArray(wallet.items) ? wallet.items : [];
  const payouts = wallet.payouts || {};
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
          limit: 8,
          offset: 0,
        }),
      ).unwrap();
    } catch (error) {
      toast.error(error?.message || error || "Unable to load finance overview");
    }
  }, [dateFilters, dispatch]);
  useEffect(() => {
    load();
  }, [load]);

  const financeSummary = wallet.summary || wallet.earningsSummary || {};
  const previousSummary =
    wallet.previousPeriod || financeSummary.previousPeriod || {};
  const comparison = wallet.comparison || financeSummary.comparison || {};
  const sumItems = (keys) =>
    items.reduce((total, item) => {
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
  const deductions = Number(
    financeSummary.deductions ??
      financeSummary.adjustments ??
      wallet.deductions ??
      wallet.adjustments ??
      Math.max(0, grossEarnings - netEarnings),
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
      wallet.deliveredAmount || balances.deliveredBalance,
      counts.delivered || 0,
      "Order items delivered",
      "",
    ],
    [
      "Waiting",
      balances.pendingBalance,
      counts.pending || 0,
      "Waiting for the return period to close",
      "waiting",
    ],
    [
      "Available",
      balances.availableBalance,
      counts.available || counts.eligible || 0,
      "Ready before current deductions",
      "available",
    ],
    [
      "Processing",
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
  return (
    <div className="space-y-5">
      <Loader loading={Boolean(state.loading)} />
      <PageHeader
        title="Finance"
        subtitle="See what you've earned, what's waiting, what needs attention, and what can be paid to you now."
        breadcrumbs={[{ label: "My Finance & Payouts" }, { label: "Overview" }]}
        actions={
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <FinanceDateRangeFilter
              dateRange={dateRange}
              loading={Boolean(state.loading)}
            />
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={load}
              disabled={Boolean(state.loading)}
            >
              <MdRefresh className={state.loading ? "animate-spin" : ""} />
              {state.loading ? "Refreshing" : "Refresh"}
            </button>
          </div>
        }
      />
      {/* <FinanceNav /> */}
      <FinancePageGuide
        step="1"
        title="Start with your current balance"
        description="This is the simplest view of your money. Check what is payable now, then follow anything waiting or needing attention."
        points={[
          "Payable now is ready for transfer",
          "Waiting moves after release conditions",
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_2fr]">
        <Cards
          label="Payable now"
          value={financeMoney(balances.effectiveAvailablePayout, currency)}
          description="Available to be transferred to your selected payout account."
          icon={<MdAccountBalanceWallet size={18} />}
          iconBg="#cce8c9"
          iconColor="#1d9b50"
          onClick={() => navigate("/app/seller-payouts")}
        />
        <MoneyEquation
          available={balances.availableBalance}
          owed={owed}
          payable={balances.effectiveAvailablePayout}
          currency={currency}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Cards
          label="Waiting"
          value={financeMoney(balances.pendingBalance, currency)}
          description="Earnings still inside the return or release period."
          icon={<MdHourglassEmpty size={18} />}
          iconBg="#ffe5b5"
          iconColor="#f5a300"
          onClick={() => navigate("/app/finance-earnings?status=waiting")}
        />
        <Cards
          label="On hold"
          value={financeMoney(balances.blockedBalance, currency)}
          description="Temporarily unavailable because of a return, refund, dispute, or another hold."
          icon={<MdPauseCircle size={18} />}
          iconBg="#ffd4d2"
          iconColor="#ff4b55"
          onClick={() => navigate("/app/finance-earnings?status=held")}
        />
        <Cards
          label="Paid"
          value={financeMoney(balances.paidBalance, currency)}
          description="Successfully transferred to your payout destination."
          icon={<MdPayments size={18} />}
          iconBg="#cce8c9"
          iconColor="#1d9b50"
          onClick={() => navigate("/app/seller-payouts?status=paid")}
        />
      </div>
      <section className="admin-card p-5">
        <div className="mb-4 border-b border-[var(--admin-line)] pb-3">
          <h2 className="font-semibold text-xl">Earnings Summary</h2>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            Earnings and deductions for the selected date range.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <span className="text-xs text-[var(--admin-muted)]">
              Net Earnings
            </span>
            <strong className="mt-1 block text-lg text-emerald-700">
              {financeMoney(netEarnings, currency)}
            </strong>
          </div>
          <div>
            <span className="text-xs text-[var(--admin-muted)]">
              Gross Earnings
            </span>
            <strong className="mt-1 block text-lg text-[var(--admin-navy)]">
              {financeMoney(grossEarnings, currency)}
            </strong>
          </div>
          <div>
            <span className="text-xs text-[var(--admin-muted)]">
              Deductions / Adjustments
            </span>
            <strong className="mt-1 block text-lg text-amber-700">
              {financeMoney(deductions, currency)}
            </strong>
          </div>
          <div>
            <span className="text-xs text-[var(--admin-muted)]">
              Change vs Previous Period
            </span>
            <strong
              className={`mt-1 block text-lg ${calculatedPercentageChange === null ? "text-[var(--admin-muted)]" : calculatedPercentageChange >= 0 ? "text-emerald-700" : "text-red-700"}`}
            >
              {calculatedPercentageChange === null
                ? "N/A"
                : `${calculatedPercentageChange >= 0 ? "+" : ""}${calculatedPercentageChange.toFixed(1)}%`}
            </strong>
          </div>
        </div>
      </section>
      <section className="admin-card overflow-hidden">
        <div className="border-b border-[var(--admin-line)] px-5 py-4">
          <h2 className="font-semibold text-xl">Money journey</h2>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            Follow earnings from delivery to your payout destination.
          </p>
        </div>
        <div className="grid divide-y divide-[var(--admin-line)] md:grid-cols-5 md:divide-x md:divide-y-0">
          {journey.map(([label, amount, count, detail, filter]) => (
            <button
              key={label}
              type="button"
              className="p-4 text-left hover:bg-[var(--admin-soft)]"
              onClick={() =>
                navigate(
                  filter === "paid" || filter === "processing"
                    ? `/app/seller-payouts?status=${filter}`
                    : `/app/finance-earnings${filter ? `?status=${filter}` : ""}`,
                )
              }
            >
              <span className="text-xs font-semibold text-[var(--admin-muted)]">
                {label}
              </span>
              <strong className="mt-1 block text-lg">
                {financeMoney(amount, currency)}
              </strong>
              <span className="mt-1 block text-xs text-[var(--admin-muted)]">
                {count}{" "}
                {label === "Processing" || label === "Paid"
                  ? "payouts"
                  : "earnings"}
              </span>
              <span className="mt-2 block text-xs">{detail}</span>
            </button>
          ))}
        </div>
      </section>
      {(owed > 0 || Number(balances.blockedBalance || 0) > 0) && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Needs your attention</h2>
          {owed > 0 && (
            <button
              type="button"
              onClick={() => navigate("/app/finance-adjustments?type=cod")}
              className="admin-card flex w-full items-center gap-3 p-4 text-left"
            >
              <MdWarningAmber className="text-red-600" size={22} />
              <div className="flex-1">
                <strong>
                  {financeMoney(owed, currency)} COD amount needs to be
                  recovered
                </strong>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  You collected this from customers. It will be deducted from
                  available or future earnings.
                </p>
              </div>
              <MdArrowForward />
            </button>
          )}
          {Number(balances.blockedBalance || 0) > 0 && (
            <button
              type="button"
              onClick={() => navigate("/app/finance-earnings?status=held")}
              className="admin-card flex w-full items-center gap-3 p-4 text-left"
            >
              <MdWarningAmber className="text-amber-600" size={22} />
              <div className="flex-1">
                <strong>
                  {financeMoney(balances.blockedBalance, currency)} temporarily
                  on hold
                </strong>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  One or more orders has an active return, refund, dispute, or
                  hold.
                </p>
              </div>
              <MdArrowForward />
            </button>
          )}
        </section>
      )}
      <section className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
          <div>
            <h2 className="font-semibold text-xl">Recent money activity</h2>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              The latest changes to your earnings.
            </p>
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-blue-700"
            onClick={() => navigate("/app/finance-earnings")}
          >
            View all activity
          </button>
        </div>
        {items.length ? (
          <div className="divide-y divide-[var(--admin-line)]">
            {items.slice(0, 6).map((item) => {
              const status = sellerFinanceStatus(item);
              return (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/app/finance-earnings?earning=${item.id || item.commissionId || ""}`,
                    )
                  }
                  key={item.id || item.commissionId || item.orderId}
                  className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-[var(--admin-soft)]"
                >
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate">
                      Order #
                      {item.orderNumber ||
                        String(item.orderId || "").slice(0, 12)}
                    </strong>
                    <span className="text-xs text-[var(--admin-muted)]">
                      {status.detail}
                    </span>
                  </div>
                  <strong>
                    {financeMoney(
                      item.netAmount ?? item.net_amount,
                      item.currency || currency,
                    )}
                  </strong>
                  <FinanceStatusBadge row={item} />
                  {(item.eligibleAt || item.updatedAt) && (
                    <span className="w-full text-xs text-[var(--admin-muted)] sm:w-auto">
                      {financeDateTime(item.eligibleAt || item.updatedAt)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-[var(--admin-muted)]">
            No money activity yet.
          </div>
        )}
      </section>
    </div>
  );
}
