import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  MdAccountBalanceWallet,
  MdCheck,
  MdChevronRight,
  MdPayments,
  MdReceiptLong,
  MdTipsAndUpdates,
  MdTrendingUp,
  MdTune,
} from "react-icons/md";
import StatusBadge from "../../../components/Shared/StatusBadge";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import { DateRangePickerModal } from "../../../components/Shared";
import { GoldDateRangeCalendar } from "../../../components/Shared/FilterBar";
import {
  formatCurrency,
  formatDate,
  formatLabel,
} from "../../../utils/formatters";

export const unwrapFinance = (payload = {}) =>
  payload?.data?.data || payload?.data || {};
export const financeList = (payload = {}) => {
  const root = unwrapFinance(payload);
  return Array.isArray(root)
    ? root
    : root.items || root.list || root.rows || [];
};
export const financeValue = (row = {}, ...keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "")
      return row[key];
  }
  return 0;
};
export const financeMetadata = (row = {}) => {
  if (row.metadata && typeof row.metadata === "object") return row.metadata;
  try {
    return JSON.parse(row.metadata || "{}");
  } catch {
    return {};
  }
};
export const financePresentation = (row = {}) => row.finance || {};
export const financeAmounts = (row = {}) => {
  const presentation = financePresentation(row);
  return {
    ...(presentation.transaction || {}),
    ...(presentation.earnings || {}),
    ...(presentation.recovery || {}),
    ...(presentation.payout || {}),
  };
};

export const financeBreakdown = (row = {}) =>
  financeMetadata(row).financialBreakdown || financeMetadata(row);

export const financeMoney = (value, currency = "INR") => {
  const number = Number(value || 0);
  const normalized =
    Object.is(number, -0) || Math.abs(number) < 0.005 ? 0 : number;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized);
};
export const signedFinanceMoney = (value, currency = "INR") => {
  const number = Number(value || 0);
  if (Math.abs(number) < 0.005) return financeMoney(0, currency);
  return `${number > 0 ? "+" : "-"}${financeMoney(Math.abs(number), currency)}`;
};
export const financeDateTime = (value, fallback = "—") => {
  if (!value || Number.isNaN(new Date(value).getTime())) return fallback;
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const FINANCE_RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Custom Range", value: "custom" },
];

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getFinanceRangeDates = (range) => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  if (range === "this_week") start.setDate(today.getDate() + mondayOffset);
  if (range === "this_month") start.setDate(1);
  if (range === "last_month") {
    start.setMonth(today.getMonth() - 1, 1);
    end.setMonth(today.getMonth(), 0);
  }

  return { fromDate: toInputDate(start), toDate: toInputDate(end) };
};

const parseFinanceInputDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

export const formatFinanceRangeLabel = ({ fromDate, toDate } = {}) => {
  if (!fromDate || !toDate) return "Custom Range";
  const format = (value) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  return `${format(fromDate)} - ${format(toDate)}`;
};

export const useFinanceDateRange = (initialRange = "this_month") => {
  const [range, setRange] = useState(initialRange);
  const [dateFilters, setDateFilters] = useState(() =>
    getFinanceRangeDates(initialRange),
  );
  const [customDates, setCustomDates] = useState(() =>
    getFinanceRangeDates(initialRange),
  );
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [customCalendarViewDate, setCustomCalendarViewDate] = useState(
    () => new Date(),
  );

  const handleRangeChange = (nextRange) => {
    if (nextRange === "custom") {
      setCustomDates(dateFilters);
      setCustomCalendarViewDate(new Date());
      setCustomPickerOpen(true);
      return;
    }
    const nextDates = getFinanceRangeDates(nextRange);
    setRange(nextRange);
    setDateFilters(nextDates);
    setCustomDates(nextDates);
  };

  const handleCustomDateSelect = (value) => {
    const selectedDate = parseFinanceInputDate(value);
    if (!selectedDate || value > toInputDate(new Date())) return;
    setCustomCalendarViewDate(selectedDate);
    setCustomDates((current) => {
      if (!current.fromDate || current.toDate) {
        return { fromDate: value, toDate: "" };
      }
      return value < current.fromDate
        ? { fromDate: value, toDate: current.fromDate }
        : { ...current, toDate: value };
    });
  };

  const applyCustomDateRange = () => {
    if (!customDates.fromDate || !customDates.toDate) return false;
    setRange("custom");
    setDateFilters(customDates);
    setCustomPickerOpen(false);
    return true;
  };

  return {
    range,
    dateFilters,
    customDates,
    customPickerOpen,
    customCalendarViewDate,
    selectedRangeOption:
      range === "custom"
        ? { label: formatFinanceRangeLabel(dateFilters), value: "custom" }
        : FINANCE_RANGE_OPTIONS.find((option) => option.value === range),
    handleRangeChange,
    handleCustomDateSelect,
    applyCustomDateRange,
    closeCustomPicker: () => setCustomPickerOpen(false),
    setCustomDates,
    setCustomCalendarViewDate,
  };
};

export const FinanceDateRangeFilter = ({ dateRange, loading = false }) => (
  <>
    <div className="w-full sm:w-[190px]">
      <FilterSelect
        options={FINANCE_RANGE_OPTIONS}
        value={dateRange.selectedRangeOption}
        onChange={(option) =>
          option && dateRange.handleRangeChange(option.value)
        }
        placeholder="Select date range"
        isSearchable={false}
        isClearable={false}
      />
    </div>
    <DateRangePickerModal
      open={dateRange.customPickerOpen}
      onClose={dateRange.closeCustomPicker}
      title="Select Finance Date Range"
      subtitle="Finance data will update after applying the range."
      loading={loading}
    >
      <GoldDateRangeCalendar
        dates={dateRange.customDates}
        viewDate={dateRange.customCalendarViewDate}
        onViewDateChange={dateRange.setCustomCalendarViewDate}
        onSelectDate={dateRange.handleCustomDateSelect}
        onApply={dateRange.applyCustomDateRange}
        onCancel={dateRange.closeCustomPicker}
        onClear={() => dateRange.setCustomDates({ fromDate: "", toDate: "" })}
        loading={loading}
        className="shadow-none"
      />
    </DateRangePickerModal>
  </>
);

export const sellerFinanceStatus = (rowOrStatus = {}) => {
  const row =
    typeof rowOrStatus === "object" ? rowOrStatus : { status: rowOrStatus };
  const payoutRaw = String(row.payoutStatus || "").toLowerCase();
  const terminalPayoutStatuses = [
    "processing",
    "in_process",
    "approved",
    "completed",
    "processed",
    "paid",
    "settled",
    "failed",
    "cancelled",
    "canceled",
  ];
  const raw = String(
    (terminalPayoutStatuses.includes(payoutRaw) && payoutRaw) ||
      row.releaseStatus ||
      row.lifecycleStatus ||
      row.status ||
      payoutRaw ||
      "pending",
  ).toLowerCase();
  const rawReason = String(
    row.releaseReason || row.release_reason || row.payoutHoldReason || "",
  );
  const reason = rawReason.toLowerCase();
  const isPayoutRecord = Boolean(
    row.payment_method !== undefined ||
    row.paymentMethod !== undefined ||
    row.payment_reference !== undefined ||
    row.paymentReference !== undefined,
  );
  if (["refunded", "reversed", "adjusted"].includes(raw))
    return {
      key: "adjusted",
      label: "Adjusted",
      detail:
        rawReason ||
        "The earning was changed by a refund, return, recovery, or another settlement adjustment.",
    };
  if (["failed"].includes(raw))
    return {
      key: "failed",
      label: "Failed",
      detail:
        row.failureReason ||
        row.failure_reason ||
        "The transfer failed; Admin must review the failure and retry or create a replacement payout.",
    };
  if (["cancelled", "canceled"].includes(raw))
    return {
      key: "cancelled",
      label: "Cancelled",
      detail:
        rawReason ||
        "Admin cancelled this transfer; it will not be sent unless a new payout is created.",
    };
  if (["completed", "processed", "paid", "released", "settled"].includes(raw))
    return {
      key: "paid",
      label: "Paid",
      detail: "Successfully transferred to the selected payout destination.",
    };
  if (["processing", "approved", "in_process"].includes(raw))
    return {
      key: "processing",
      label: raw === "approved" ? "Approved" : "Processing",
      detail:
        raw === "approved"
          ? "Admin approved this payout; it is waiting to be submitted using the selected payment method."
          : "Admin submitted this payout and the payment provider is processing it; it becomes Paid after confirmation.",
    };
  if (
    [
      "held",
      "blocked",
      "on_hold",
      "return_received",
      "return_in_transit",
      "qc_pending",
      "refund_pending",
      "disputed",
    ].includes(raw) ||
    reason.includes("return") ||
    reason.includes("refund") ||
    reason.includes("dispute")
  )
    return {
      key: "held",
      label: "On hold",
      detail:
        reason.includes("return") ||
        raw.includes("return") ||
        raw === "qc_pending"
          ? "Return or quality check in progress."
          : reason.includes("refund") || raw === "refund_pending"
            ? "Refund decision in progress."
            : reason.includes("dispute") || raw === "disputed"
              ? "Dispute review in progress."
              : rawReason ||
                (isPayoutRecord
                  ? "Admin placed this payout on hold; it will continue after the hold reason is resolved and Admin releases it."
                  : "This earning is temporarily unavailable; it becomes eligible after the hold is resolved."),
    };
  if (["eligible", "available"].includes(raw))
    return {
      key: "available",
      label: "Available",
      detail:
        "Release conditions are complete and this earning is ready for payout.",
    };
  return {
    key: "waiting",
    label: isPayoutRecord ? "Pending Admin Review" : "Waiting",
    detail: isPayoutRecord
      ? rawReason ||
        "The payout request is waiting for Admin review and approval. No transfer has started yet."
      : row.eligibleAt || row.returnWindowEndsAt
        ? `Available after ${financeDateTime(row.eligibleAt || row.returnWindowEndsAt)}`
        : rawReason ||
          "Waiting for delivery, return-window closure, or another release condition.",
  };
};

export const earningAmounts = (row = {}) => {
  const metadata = financeMetadata(row);
  const breakdown = financeBreakdown(row);
  const products = Array.isArray(metadata.products) ? metadata.products : [];
  const productSum = (key) =>
    products.reduce((sum, product) => sum + Number(product?.[key] || 0), 0);
  const shippingCredit = Number(
    breakdown.shippingReimbursementAmount ??
      metadata.shippingReimbursementAmount ??
      0,
  );
  const shippingDeduction = Number(
    breakdown.shippingDeductionAmount ?? metadata.shippingDeductionAmount ?? 0,
  );
  return {
    product: Number(
      financeValue(
        row,
        "amount",
        "gross_amount",
        "grossAmount",
        "total_amount",
        "totalAmount",
      ),
    ),
    marketplacePromotion:
      productSum("marketplaceFundedDiscountAmount") ||
      Number(metadata.marketplaceContributionAmount || 0),
    sellerPromotion: productSum("sellerFundedDiscountAmount"),
    partnerPromotion: productSum("paymentPartnerFundedDiscountAmount"),
    commission: Number(
      financeValue(row, "commission_amount", "commissionAmount"),
    ),
    commissionGst: Number(financeValue(row, "tax_amount", "taxAmount")),
    gstTcs: Number(breakdown.gstTcsAmount || 0),
    incomeTaxTds: Number(breakdown.incomeTaxTdsAmount || 0),
    shippingCredit,
    shippingDeduction,
    shippingNet: shippingCredit - shippingDeduction,
    refund: Number(financeValue(row, "refund_amount", "refundAmount")),
    adjustment: Number(
      financeValue(row, "adjustment_amount", "adjustmentAmount"),
    ),
    net: Number(financeValue(row, "net_amount", "netAmount")),
  };
};

const FINANCE_JOURNEY = [
  {
    to: "/app/finance-overview",
    label: "Overview",
    helper: "Your money at a glance",
    icon: MdAccountBalanceWallet,
  },
  {
    to: "/app/finance-earnings",
    label: "Order earnings",
    helper: "See income by order",
    icon: MdTrendingUp,
  },
  {
    to: "/app/finance-adjustments",
    label: "Adjustments",
    helper: "Credits and deductions",
    icon: MdTune,
  },
  {
    to: "/app/seller-payouts",
    label: "Payouts",
    helper: "Track bank transfers",
    icon: MdPayments,
  },
  {
    to: "/app/finance-statements",
    label: "Statements",
    helper: "Download your records",
    icon: MdReceiptLong,
  },
];

export const FinanceChoiceFilters = ({
  label = "Show",
  options = [],
  value = "",
  onChange,
}) => (
  <section
    className="finance-filter  rounded-xl border border-[var(--admin-line)] bg-white px-4 py-3 shadow-[0_5px_16px_rgba(31,27,95,0.04)]"
    aria-label={label}
  >
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="shrink-0">
        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--admin-navy)]">
          {label}
        </span>
        <span className="mt-0.5 block text-[10px] text-[var(--admin-muted)]">
          Narrow your view
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto lg:border-l lg:border-[var(--admin-line)] lg:pl-4">
        {options.map(([key, optionLabel, count]) => (
          <button
            key={optionLabel}
            type="button"
            onClick={() => onChange(key)}
            className={`whitespace-nowrap rounded-md border px-3.5 py-2 text-xs font-semibold transition-all ${value === key ? "border-[var(--admin-navy)] bg-[var(--admin-navy)] text-white shadow-sm" : "border-transparent bg-[var(--admin-surface-soft)] text-[var(--admin-muted)] hover:border-[var(--admin-gold)] hover:bg-white hover:text-[var(--admin-navy)]"}`}
          >
            {optionLabel}
            {count !== undefined && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${value === key ? "bg-white/15" : "bg-white"}`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  </section>
);

export const FinanceStatusBadge = ({ row, status }) => {
  const mapped = sellerFinanceStatus(row || status);
  return (
    <span title={mapped.detail} className="inline-flex">
      <StatusBadge status={mapped.key} label={mapped.label} dot />
    </span>
  );
};

export const FinanceStatusCell = ({ row, status }) => {
  const mapped = sellerFinanceStatus(row || status);
  const detail =
    typeof mapped.detail === "string" && mapped.detail.includes("_")
      ? formatLabel(mapped.detail)
      : mapped.detail;
  return (
    <div className="min-w-[150px] max-w-[260px] whitespace-normal">
      <FinanceStatusBadge row={row} status={status} />
      <p className="mt-1 break-words text-xs leading-4 text-[var(--admin-muted)]">
        {detail}
      </p>
    </div>
  );
};

export const FinanceEmptyState = ({ title, description }) => (
  <div className="rounded-xl border border-dashed border-[var(--admin-line-strong)] bg-white px-5 py-12 text-center">
    <h3 className="text-base font-semibold text-[var(--admin-ink)]">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm text-[var(--admin-muted)]">
      {description}
    </p>
  </div>
);

export const MoneyEquation = ({
  available,
  applied,
  payable,
  currency = "INR",
}) => (
  <div className="finance-equation admin-card grid items-center gap-3 p-5 text-center sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
    <div>
      <span className="text-xs text-[var(--admin-muted)]">
        Eligible Earnings Before Recovery
      </span>
      <strong className="mt-1 block text-xl">
        {financeMoney(available, currency)}
      </strong>
    </div>
    <span className="text-xl text-[var(--admin-muted)]">−</span>
    <div>
      <span className="text-xs text-[var(--admin-muted)]">
        Recovery And Adjustments Applied Now
      </span>
      <strong className="mt-1 block text-xl text-red-700">
        {financeMoney(applied, currency)}
      </strong>
    </div>
    <span className="text-xl text-[var(--admin-muted)]">=</span>
    <div>
      <span className="text-xs text-[var(--admin-muted)]">Payable Now</span>
      <strong className="mt-1 block text-xl text-emerald-700">
        {financeMoney(payable, currency)}
      </strong>
    </div>
  </div>
);

export const CalculationRows = ({ row }) => {
  const amounts = earningAmounts(row);
  const currency = row.currency || "INR";
  const lines = [
    ["Order amount before seller deductions", amounts.product, "neutral"],
    [
      "Shipping Collected / Reimbursed",
      amounts.shippingNet,
      amounts.shippingNet >= 0 ? "positive" : "negative",
    ],
    ["Commission", -amounts.commission, "negative"],
    ["GST on commission", -amounts.commissionGst, "negative"],
    ["GST TCS", -amounts.gstTcs, "negative"],
    ["Income-tax TDS", -amounts.incomeTaxTds, "negative"],
    ["Refund / return adjustment", -amounts.refund, "negative"],
    [
      "Other adjustment",
      amounts.adjustment,
      amounts.adjustment >= 0 ? "positive" : "negative",
    ],
  ];
  return (
    <div className="space-y-2">
      {lines
        .filter(([, amount], index) => index === 0 || Math.abs(amount) >= 0.005)
        .map(([label, amount, tone]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <span className="text-[var(--admin-muted)]">{label}</span>
            <span
              className={
                tone === "positive"
                  ? "text-emerald-700"
                  : tone === "negative"
                    ? "text-red-700"
                    : ""
              }
            >
              {tone === "neutral"
                ? financeMoney(amount, currency)
                : signedFinanceMoney(amount, currency)}
            </span>
          </div>
        ))}
      <div className="flex justify-between border-t border-[var(--admin-line)] pt-3 text-base font-bold">
        <span>Your earning</span>
        <span className="text-emerald-700">
          {financeMoney(amounts.net, currency)}
        </span>
      </div>
      {/* <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">
        Shipping is shown from the backend settlement snapshot. A reimbursement
        is added to your earning; only an actual shipping deduction is
        subtracted.
      </p> */}
      <div className="pt-3">
        <details className="group  rounded-lg border border-[var(--admin-line)] p-3 text-xs">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
            <MdChevronRight
              aria-hidden="true"
              size={18}
              className="shrink-0 transition-transform group-open:rotate-90"
            />
            VIEW TAX &amp; TECHNICAL DETAILS
          </summary>
          <dl className="mt-3 divide-y divide-[var(--admin-line)] border-t border-[var(--admin-line)]">
            {[
              ["Settlement Row", row.id || "—"],
              [
                "Seller-funded Promotion",
                financeMoney(amounts.sellerPromotion, currency),
              ],
              [
                "Payment-partner Contribution",
                financeMoney(amounts.partnerPromotion, currency),
              ],
              [
                "Shipping Credit",
                financeMoney(amounts.shippingCredit, currency),
              ],
              [
                "Shipping Deduction",
                financeMoney(amounts.shippingDeduction, currency),
              ],
              ["Created", financeDateTime(row.created_at || row.createdAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-2 sm:gap-4"
              >
                <dt className="text-[var(--admin-muted)]">{label}</dt>
                <dd className="min-w-0 break-words font-medium tabular-nums text-[var(--admin-ink)] sm:text-right">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </div>
  );
};

export const shortReference = (value, prefix = "") =>
  value ? `${prefix}${String(value).slice(0, 12)}` : "—";
export const financeDate = formatDate;
export const legacyFormatCurrency = formatCurrency;
