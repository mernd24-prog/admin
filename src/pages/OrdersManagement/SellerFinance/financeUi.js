import React from "react";
import { NavLink } from "react-router-dom";
import {
  MdAccountBalanceWallet,
  MdChevronRight,
  MdPayments,
  MdReceiptLong,
  MdTrendingUp,
  MdTune,
} from "react-icons/md";
import StatusBadge from "../../../components/Shared/StatusBadge";
import { formatCurrency, formatDate } from "../../../utils/formatters";

export const unwrapFinance = (payload = {}) => payload?.data?.data || payload?.data || {};
export const financeList = (payload = {}) => {
  const root = unwrapFinance(payload);
  return Array.isArray(root) ? root : root.items || root.list || root.rows || [];
};
export const financeValue = (row = {}, ...keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
  }
  return 0;
};
export const financeMetadata = (row = {}) => {
  if (row.metadata && typeof row.metadata === "object") return row.metadata;
  try { return JSON.parse(row.metadata || "{}"); } catch { return {}; }
};
export const financeBreakdown = (row = {}) => financeMetadata(row).financialBreakdown || financeMetadata(row);

export const financeMoney = (value, currency = "INR") => {
  const number = Number(value || 0);
  const normalized = Object.is(number, -0) || Math.abs(number) < 0.005 ? 0 : number;
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: currency || "INR", minimumFractionDigits: 2, maximumFractionDigits: 2,
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
    day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
};

export const sellerFinanceStatus = (rowOrStatus = {}) => {
  const row = typeof rowOrStatus === "object" ? rowOrStatus : { status: rowOrStatus };
  const raw = String(row.lifecycleStatus || row.releaseStatus || row.payoutStatus || row.status || "pending").toLowerCase();
  const reason = String(row.releaseReason || row.release_reason || row.payoutHoldReason || "").toLowerCase();
  if (["failed", "reversed"].includes(raw)) return { key: "failed", label: "Failed", detail: row.failureReason || row.failure_reason || "Transfer unsuccessful" };
  if (["cancelled", "canceled"].includes(raw)) return { key: "cancelled", label: "Cancelled", detail: "This transfer was cancelled." };
  if (["completed", "processed", "paid", "released", "settled"].includes(raw)) return { key: "paid", label: "Paid", detail: "Successfully transferred." };
  if (["processing", "approved", "in_process"].includes(raw)) return { key: "processing", label: "Processing", detail: "Included in a payout being processed." };
  if (["held", "blocked", "on_hold"].includes(raw) || reason.includes("return") || reason.includes("refund") || reason.includes("dispute")) return { key: "held", label: "On hold", detail: reason.includes("return") ? "Return in progress" : "Temporarily unavailable." };
  if (["eligible", "available"].includes(raw)) return { key: "available", label: "Available", detail: "Ready for payout." };
  if (["reversed", "adjusted", "refunded"].includes(raw)) return { key: "adjusted", label: "Adjusted", detail: "Affected by an adjustment." };
  return { key: "waiting", label: "Waiting", detail: row.eligibleAt || row.returnWindowEndsAt ? `Available after ${financeDateTime(row.eligibleAt || row.returnWindowEndsAt)}` : "Waiting for release conditions." };
};

export const earningAmounts = (row = {}) => {
  const metadata = financeMetadata(row);
  const breakdown = financeBreakdown(row);
  const products = Array.isArray(metadata.products) ? metadata.products : [];
  const productSum = (key) => products.reduce((sum, product) => sum + Number(product?.[key] || 0), 0);
  const shippingCredit = Number(breakdown.shippingReimbursementAmount ?? metadata.shippingReimbursementAmount ?? 0);
  const shippingDeduction = Number(breakdown.shippingDeductionAmount ?? metadata.shippingDeductionAmount ?? 0);
  return {
    product: Number(financeValue(row, "amount", "gross_amount", "grossAmount", "total_amount", "totalAmount")),
    marketplacePromotion: productSum("marketplaceFundedDiscountAmount") || Number(metadata.marketplaceContributionAmount || 0),
    sellerPromotion: productSum("sellerFundedDiscountAmount"),
    partnerPromotion: productSum("paymentPartnerFundedDiscountAmount"),
    commission: Number(financeValue(row, "commission_amount", "commissionAmount")),
    commissionGst: Number(financeValue(row, "tax_amount", "taxAmount")),
    gstTcs: Number(breakdown.gstTcsAmount || 0),
    incomeTaxTds: Number(breakdown.incomeTaxTdsAmount || 0),
    shippingCredit,
    shippingDeduction,
    shippingNet: shippingCredit - shippingDeduction,
    refund: Number(financeValue(row, "refund_amount", "refundAmount")),
    adjustment: Number(financeValue(row, "adjustment_amount", "adjustmentAmount")),
    net: Number(financeValue(row, "net_amount", "netAmount")),
  };
};

const FINANCE_JOURNEY = [
  { to: "/app/finance-overview", label: "Overview", helper: "Your money at a glance", icon: MdAccountBalanceWallet },
  { to: "/app/finance-earnings", label: "Order earnings", helper: "See income by order", icon: MdTrendingUp },
  { to: "/app/finance-adjustments", label: "Adjustments", helper: "Credits and deductions", icon: MdTune },
  { to: "/app/seller-payouts", label: "Payouts", helper: "Track bank transfers", icon: MdPayments },
  { to: "/app/finance-statements", label: "Statements", helper: "Download your records", icon: MdReceiptLong },
];

export const FinanceNav = () => (
  <section className="mb-5 rounded-xl border border-[var(--admin-line)] bg-[var(--admin-shell)] p-3 shadow-[0_2px_10px_rgba(31,27,95,0.04)]">
    <div className="mb-3 px-1">
      <h2 className="text-sm font-semibold text-[var(--admin-navy)]">Your money journey</h2>
      <p className="mt-0.5 text-xs text-[var(--admin-muted)]">Move from earnings to completed payout records.</p>
    </div>
    <nav className="flex items-stretch gap-1 overflow-x-auto pb-1" aria-label="Finance journey">
      {FINANCE_JOURNEY.map(({ to, label, helper, icon: Icon }, index) => (
        <React.Fragment key={to}>
          <NavLink
            to={to}
            className={({ isActive }) => `group relative flex min-h-[72px] min-w-[190px] flex-1 items-center gap-3 rounded-lg border px-3 py-2.5 transition-all xl:min-w-0 ${isActive ? "border-[var(--admin-gold)] bg-[var(--admin-navy)] text-white shadow-[0_5px_12px_rgba(31,27,95,0.14)]" : "border-[var(--admin-line)] bg-white text-[var(--admin-ink)] hover:border-[var(--admin-gold)] hover:shadow-sm"}`}
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-white/10 text-[var(--admin-gold)]" : "bg-[var(--admin-gold-soft)] text-[var(--admin-blue)]"}`}>
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className={`block text-[10px] font-bold uppercase tracking-wide ${isActive ? "text-white/65" : "text-[var(--admin-muted)]"}`}>Step {index + 1}</span>
                  <span className="block truncate text-sm font-semibold">{label}</span>
                  <span className={`block truncate text-[10px] font-normal ${isActive ? "text-white/70" : "text-[var(--admin-muted)]"}`}>{helper}</span>
                </span>
              </>
            )}
          </NavLink>
          {index < FINANCE_JOURNEY.length - 1 && <span className="hidden shrink-0 items-center text-[var(--admin-gold-dark)] xl:flex" aria-hidden="true"><MdChevronRight size={18} /></span>}
        </React.Fragment>
      ))}
    </nav>
  </section>
);

export const FinanceChoiceFilters = ({ label = "Show", options = [], value = "", onChange }) => (
  <section className="rounded-xl border border-[var(--admin-line)] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(31,27,95,0.03)]" aria-label={label}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="shrink-0">
        <span className="block text-xs font-bold uppercase tracking-wide text-[var(--admin-navy)]">{label}</span>
        <span className="mt-0.5 block text-[10px] text-[var(--admin-muted)]">Choose what you want to review</span>
      </div>
      <div className="flex gap-2 overflow-x-auto lg:border-l lg:border-[var(--admin-line)] lg:pl-4">
        {options.map(([key, optionLabel, count]) => (
          <button key={optionLabel} type="button" onClick={() => onChange(key)} className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${value === key ? "border-[var(--admin-navy)] bg-[var(--admin-navy)] text-white shadow-sm" : "border-[var(--admin-line)] bg-[var(--admin-shell)] text-[var(--admin-muted)] hover:border-[var(--admin-gold)] hover:bg-white hover:text-[var(--admin-navy)]"}`}>
            {optionLabel}{count !== undefined && <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${value === key ? "bg-white/15" : "bg-white"}`}>{count}</span>}
          </button>
        ))}
      </div>
    </div>
  </section>
);

export const FinanceStatusBadge = ({ row, status }) => {
  const mapped = sellerFinanceStatus(row || status);
  return <StatusBadge status={mapped.key} label={mapped.label} dot />;
};

export const FinanceEmptyState = ({ title, description }) => (
  <div className="rounded-xl border border-dashed border-[var(--admin-line-strong)] bg-white px-5 py-12 text-center">
    <h3 className="text-base font-semibold text-[var(--admin-ink)]">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm text-[var(--admin-muted)]">{description}</p>
  </div>
);

export const FinancePageGuide = ({ step, title, description, points = [], icon: Icon = MdAccountBalanceWallet }) => (
  <section className="relative overflow-hidden rounded-xl border border-[var(--admin-gold)] bg-gradient-to-r from-[var(--admin-gold-soft)] via-white to-white px-5 py-4 shadow-[0_3px_12px_rgba(31,27,95,0.05)]">
    <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[var(--admin-gold)]/10" aria-hidden="true" />
    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-navy)] text-[var(--admin-gold)] shadow-sm"><Icon size={22} /></span>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--admin-blue)]">Step {step} of 5</span>
          <h2 className="mt-0.5 text-base font-bold text-[var(--admin-navy)]">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-[var(--admin-muted)]">{description}</p>
        </div>
      </div>
      {points.length > 0 && <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
        {points.map((point) => <div key={point} className="flex items-center gap-2 rounded-lg border border-[var(--admin-line)] bg-white/90 px-3 py-2 text-xs font-medium text-[var(--admin-ink)]"><span className="h-2 w-2 shrink-0 rounded-full bg-[var(--admin-gold)]" />{point}</div>)}
      </div>}
    </div>
  </section>
);

export const FinanceMetricCard = ({ label, value, description, tone = "neutral", featured = false, action }) => {
  const toneClass = { green: "text-emerald-700", red: "text-red-700", amber: "text-amber-700", blue: "text-[var(--admin-blue)]", neutral: "text-[var(--admin-navy)]" }[tone];
  const accentClass = { green: "bg-emerald-500", red: "bg-red-500", amber: "bg-amber-500", blue: "bg-[var(--admin-blue)]", neutral: "bg-[var(--admin-gold)]" }[tone];
  return <div className={`admin-card relative overflow-hidden p-5 ${featured ? "border-[var(--admin-gold)] bg-gradient-to-br from-[var(--admin-gold-soft)] to-white" : "bg-white"}`}>
    <span className={`absolute inset-y-0 left-0 w-1 ${accentClass}`} />
    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">{label}</div>
    <div className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</div>
    {description && <p className="mt-2 text-xs leading-5 text-[var(--admin-muted)]">{description}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>;
};

export const MoneyEquation = ({ available, owed, payable, currency = "INR" }) => (
  <div className="admin-card grid items-center gap-3 p-5 text-center sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
    <div><span className="text-xs text-[var(--admin-muted)]">Available earnings</span><strong className="mt-1 block text-xl">{financeMoney(available, currency)}</strong></div>
    <span className="text-xl text-[var(--admin-muted)]">−</span>
    <div><span className="text-xs text-[var(--admin-muted)]">Amount you owe</span><strong className="mt-1 block text-xl text-red-700">{financeMoney(owed, currency)}</strong></div>
    <span className="text-xl text-[var(--admin-muted)]">=</span>
    <div><span className="text-xs text-[var(--admin-muted)]">Payable now</span><strong className="mt-1 block text-xl text-emerald-700">{financeMoney(payable, currency)}</strong></div>
  </div>
);

export const CalculationRows = ({ row }) => {
  const amounts = earningAmounts(row);
  const currency = row.currency || "INR";
  const lines = [
    ["Order earning before deductions", amounts.product, "neutral"],
    ["Shipping collected / reimbursed", amounts.shippingNet, amounts.shippingNet >= 0 ? "positive" : "negative"],
    ["Commission", -amounts.commission, "negative"],
    ["GST on commission", -amounts.commissionGst, "negative"],
    ["GST TCS", -amounts.gstTcs, "negative"],
    ["Income-tax TDS", -amounts.incomeTaxTds, "negative"],
    ["Refund / return adjustment", -amounts.refund, "negative"],
    ["Other adjustment", amounts.adjustment, amounts.adjustment >= 0 ? "positive" : "negative"],
  ];
  return <div className="space-y-2">
    {amounts.marketplacePromotion > 0 && <div className="flex justify-between gap-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800"><span>Marketplace funded promotion</span><span>{financeMoney(amounts.marketplacePromotion, currency)} included</span></div>}
    {lines.filter(([, amount], index) => index === 0 || Math.abs(amount) >= 0.005).map(([label, amount, tone]) => <div key={label} className="flex justify-between gap-4 text-sm"><span className="text-[var(--admin-muted)]">{label}</span><span className={tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : ""}>{tone === "neutral" ? financeMoney(amount, currency) : signedFinanceMoney(amount, currency)}</span></div>)}
    <div className="flex justify-between border-t border-[var(--admin-line)] pt-3 text-base font-bold"><span>Your earning</span><span className="text-emerald-700">{financeMoney(amounts.net, currency)}</span></div>
    <p className="rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">Shipping is shown from the backend settlement snapshot. A reimbursement is added to your earning; only an actual shipping deduction is subtracted.</p>
    <details className="rounded-lg border border-[var(--admin-line)] p-3 text-xs"><summary className="cursor-pointer font-semibold">View tax & technical details</summary><div className="mt-3 grid gap-2 text-[var(--admin-muted)] sm:grid-cols-2"><span>Settlement row: {row.id || "—"}</span><span>Seller-funded promotion: {financeMoney(amounts.sellerPromotion, currency)}</span><span>Payment-partner contribution: {financeMoney(amounts.partnerPromotion, currency)}</span><span>Shipping credit: {financeMoney(amounts.shippingCredit, currency)}</span><span>Shipping deduction: {financeMoney(amounts.shippingDeduction, currency)}</span><span>Created: {financeDateTime(row.created_at || row.createdAt)}</span></div></details>
  </div>;
};

export const shortReference = (value, prefix = "") => value ? `${prefix}${String(value).slice(0, 12)}` : "—";
export const financeDate = formatDate;
export const legacyFormatCurrency = formatCurrency;
