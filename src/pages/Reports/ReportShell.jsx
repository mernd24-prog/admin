import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MdAccountBalanceWallet,
  MdAssignmentReturn,
  MdCalendarToday,
  MdCurrencyRupee,
  MdFileDownload,
  MdInbox,
  MdInventory,
  MdLocalShipping,
  MdPayments,
  MdRefresh,
  MdShoppingCart,
  MdStorefront,
  MdTrendingUp,
  MdWarehouse,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader, SummaryCard } from "../../components/Shared";
import { axiosPrivate } from "../../_helpers/axiosProvider";
import { downloadApiFile } from "../../_helpers/downloadApi";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { isSellerPanel } from "../../_helpers/panelConfig";

const CHART_GRID_COLOR = "#e9dfc9";
const REPORT_GOLD = "#d6a323";
const REPORT_GOLD_DARK = "#b98514";
const SELLER_REPORT_CRUMB = "My Reports";
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
});

const STAT_ICON_BY_LABEL = {
  "Total Revenue": MdCurrencyRupee,
  "Total Orders": MdShoppingCart,
  "Delivered Orders": MdLocalShipping,
  "Refund Amount": MdAssignmentReturn,
  "Return Requests": MdAssignmentReturn,
  "Pending Payouts": MdPayments,
  "Total Products": MdInventory,
  "Top Product Purchases": MdShoppingCart,
  "Top Product Revenue": MdCurrencyRupee,
  "Product Views": MdTrendingUp,
  "Cart Adds": MdShoppingCart,
  "Out of Stock": MdWarehouse,
  "Total Stock": MdWarehouse,
  "Reserved Stock": MdInventory,
  "Low Stock Items": MdWarehouse,
  "Top Seller GMV": MdStorefront,
  "Platform Revenue": MdTrendingUp,
  "Seller Payable": MdAccountBalanceWallet,
};

const integerFormatter = new Intl.NumberFormat("en-IN");
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value) => integerFormatter.format(asNumber(value));
const formatCurrency = (value) => currencyFormatter.format(asNumber(value));
const truncateLabel = (value = "", length = 32) => {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length - 1)}...` : text;
};
const formatDayLabel = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Selected";
  return date.toLocaleDateString("en-IN", { weekday: "short" });
};
const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseInputDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const addMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount, 1);
  return next;
};

const buildCalendarDays = (viewDate) => {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      value: toIsoDate(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === viewDate.getMonth(),
    };
  });
};

const isBetweenDates = (value, start, end) =>
  Boolean(start && end && value >= start && value <= end);

const formatDateLabel = (value) => {
  const date = parseInputDate(value);
  if (!date || Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const rangeToDates = (range) => {
  const to = new Date();
  const from = new Date();
  if (range === "Today") {
    return { fromDate: toIsoDate(to), toDate: toIsoDate(to) };
  }
  if (range === "Last 7 days") from.setDate(to.getDate() - 7);
  else if (range === "Last 90 days") from.setDate(to.getDate() - 90);
  else from.setDate(to.getDate() - 30);
  return { fromDate: toIsoDate(from), toDate: toIsoDate(to) };
};

const queryDateRange = () => {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const fromDate = params.get("fromDate");
  const toDate = params.get("toDate");

  if (!parseInputDate(fromDate) || !parseInputDate(toDate)) return null;

  return fromDate <= toDate
    ? { fromDate, toDate }
    : { fromDate: toDate, toDate: fromDate };
};

const unwrapData = (response) => response?.data?.data ?? response?.data ?? response ?? {};
const listFrom = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.list)) return value.list;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.entries)) return value.entries;
  if (Array.isArray(value?.products)) return value.products;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const fetchJson = async (endpoint, params = {}) => unwrapData(await axiosPrivate.get(endpoint, { params }));

const useReportFilters = (defaultRange = "Last 30 days") => {
  const [initial] = useState(() => {
    const datesFromQuery = queryDateRange();
    return datesFromQuery
      ? { range: "Custom", ...datesFromQuery }
      : { range: defaultRange, ...rangeToDates(defaultRange) };
  });
  const [range, setRange] = useState(initial.range);
  const [fromDate, setFromDate] = useState(initial.fromDate);
  const [toDate, setToDate] = useState(initial.toDate);

  const setPresetRange = (nextRange) => {
    setRange(nextRange);
    const dates = rangeToDates(nextRange);
    setFromDate(dates.fromDate);
    setToDate(dates.toDate);
  };

  const setCustomFromDate = (value) => {
    setRange("Custom");
    setFromDate(value);
  };

  const setCustomToDate = (value) => {
    setRange("Custom");
    setToDate(value);
  };

  const setCustomDateRange = (nextFromDate, nextToDate) => {
    setRange("Custom");
    setFromDate(nextFromDate);
    setToDate(nextToDate);
  };

  return {
    range,
    fromDate,
    toDate,
    setRange: setPresetRange,
    setFromDate: setCustomFromDate,
    setToDate: setCustomToDate,
    setDateRange: setCustomDateRange,
  };
};

const useApiReport = (loadData, filters) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setData(await loadData({ fromDate: filters.fromDate, toDate: filters.toDate }));
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Failed to load report";
      setError(message);
      toast.error(message, { id: "report-load-error" });
    } finally {
      setLoading(false);
    }
  }, [filters.fromDate, filters.toDate, loadData]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
};

const EmptyPanel = ({
  title = "No data found",
  text = "No data returned for this period.",
}) => (
  <div className="flex min-h-[190px] items-center justify-center rounded-lg border border-dashed border-[var(--admin-line-strong)] bg-[var(--admin-surface-soft)] p-5 text-center">
    <div className="max-w-sm">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--admin-gold-dark)] shadow-sm">
        <MdInbox size={21} />
      </span>
      <h4 className="mt-3 text-[13px] font-bold text-[var(--admin-navy)]">{title}</h4>
      <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">{text}</p>
    </div>
  </div>
);

const ReportLoadingContext = createContext(false);

const PanelSkeleton = ({ rows = 6 }) => (
  <div className="min-h-[190px] animate-pulse space-y-3 rounded-lg bg-white py-2">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center gap-3">
        <div className="h-4 w-1/4 rounded bg-[var(--admin-gold-soft)]" />
        <div
          className="h-4 rounded bg-[var(--admin-gold-soft)]"
          style={{ width: `${70 - (index % 3) * 12}%` }}
        />
      </div>
    ))}
  </div>
);

const ReportTable = ({ title, columns = [], rows = [], getRowLink, emptyTitle, emptyText }) => {
  const loading = useContext(ReportLoadingContext);
  const navigate = useNavigate();
  return (
    <div className="admin-card overflow-hidden border-[var(--admin-line)] shadow-[0_10px_28px_rgba(31,27,95,0.06)]">
    <div className="flex items-center gap-3 border-b border-[var(--admin-line)] bg-white px-4 py-3.5">
      <span className="h-6 w-1 rounded-full bg-[var(--admin-gold)]" />
      <h3 className="text-[14px] font-bold text-[var(--admin-navy)]">{title}</h3>
    </div>
    {loading ? (
      <div className="p-5"><PanelSkeleton /></div>
    ) : rows.length ? (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="admin-table-head">
            <tr>
              <th className="w-16 px-4 py-2.5 text-left text-[11px] font-bold uppercase text-[var(--admin-navy)]">
                S.No
              </th>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase text-[var(--admin-navy)]">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-line)]">
            {rows.map((row, index) => (
              <tr
                key={row.id || row.sellerId || row.sku || index}
                onClick={() => {
                  const link = getRowLink?.(row);
                  if (link) navigate(link);
                }}
                className={getRowLink?.(row) ? "cursor-pointer transition hover:bg-[var(--admin-surface-soft)]" : ""}
              >
                <td className="w-16 px-4 py-2.5 text-xs font-medium text-[var(--admin-muted)]">
                  {index + 1}.
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-2.5 text-xs font-medium text-[var(--admin-ink)]">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="p-4">
        <EmptyPanel
          title={emptyTitle || "No rows found"}
          text={emptyText || "No rows returned for this report."}
        />
      </div>
    )}
    </div>
  );
};

const ReportDateRangeModal = ({ open, filters, loading, onClose }) => {
  const [draftDates, setDraftDates] = useState({
    fromDate: filters?.fromDate || "",
    toDate: filters?.toDate || "",
  });
  const [viewDate, setViewDate] = useState(() =>
    parseInputDate(filters?.fromDate || filters?.toDate) || new Date(),
  );
  const days = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const today = toIsoDate(new Date());
  const hasCompleteRange = Boolean(draftDates.fromDate && draftDates.toDate);

  useEffect(() => {
    if (!open) return;
    setDraftDates({ fromDate: filters?.fromDate || "", toDate: filters?.toDate || "" });
    setViewDate(parseInputDate(filters?.fromDate || filters?.toDate) || new Date());
  }, [filters?.fromDate, filters?.toDate, open]);

  if (!open) return null;

  const selectDate = (value) => {
    const selectedDate = parseInputDate(value);
    if (!selectedDate) return;
    setViewDate(selectedDate);
    setDraftDates((current) => {
      if (!current.fromDate || current.toDate) return { fromDate: value, toDate: "" };
      if (value < current.fromDate) return { fromDate: value, toDate: current.fromDate };
      return { ...current, toDate: value };
    });
  };

  const applyRange = () => {
    if (!hasCompleteRange) return;
    const nextDates = draftDates.fromDate <= draftDates.toDate
      ? draftDates
      : { fromDate: draftDates.toDate, toDate: draftDates.fromDate };
    filters.setDateRange(nextDates.fromDate, nextDates.toDate);
    onClose();
  };

  const selectToday = () => {
    setDraftDates({ fromDate: today, toDate: today });
    setViewDate(new Date());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4" onClick={onClose}>
      <div
        className="w-full max-w-[390px] rounded-lg bg-white p-4 shadow-[0_22px_70px_rgba(31,27,95,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--admin-ink)]">Select Date Range</h2>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">Report data will update after apply.</p>
          </div>
          <button
            type="button"
            className="rounded border border-transparent px-2 py-1 text-lg leading-none text-slate-400 hover:border-slate-200 hover:text-slate-700"
            onClick={onClose}
            disabled={loading}
            aria-label="Close date range picker"
          >
            x
          </button>
        </div>

        <div className="rounded-lg border border-[var(--admin-gold)] bg-white p-3 shadow-none">
          <div className="mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded border border-[var(--admin-gold)] bg-[var(--admin-gold-soft)] text-sm font-bold text-[var(--admin-gold-dark)] hover:bg-[#ffe8a8]"
              onClick={() => setViewDate(addMonths(viewDate, -1))}
              disabled={loading}
              aria-label="Previous month"
            >
              {"<"}
            </button>
            <div className="text-center">
              <h3 className="text-sm font-bold text-[var(--admin-ink)]">{monthFormatter.format(viewDate)}</h3>
              <p className="text-[11px] font-medium text-[var(--admin-muted)]">Select start and end date</p>
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded border border-[var(--admin-gold)] bg-[var(--admin-gold-soft)] text-sm font-bold text-[var(--admin-gold-dark)] hover:bg-[#ffe8a8]"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              disabled={loading}
              aria-label="Next month"
            >
              {">"}
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[var(--admin-muted)]">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isStart = day.value === draftDates.fromDate;
              const isEnd = day.value === draftDates.toDate;
              const isSelected = isStart || isEnd;
              const isInRange = isBetweenDates(day.value, draftDates.fromDate, draftDates.toDate);
              const isDisabled = day.value > today;
              return (
                <button
                  key={day.value}
                  type="button"
                  className={`flex h-9 items-center justify-center rounded text-xs font-semibold transition ${
                    isSelected
                      ? "bg-[var(--admin-gold)] text-white shadow-sm"
                      : isInRange
                        ? "bg-[var(--admin-gold-soft)] text-[var(--admin-gold-dark)]"
                        : day.isCurrentMonth
                          ? "text-[var(--admin-ink)] hover:bg-[var(--admin-gold-soft)] hover:text-[var(--admin-gold-dark)]"
                          : "text-slate-300 hover:bg-slate-50"
                  } disabled:cursor-not-allowed disabled:bg-transparent disabled:text-slate-200 disabled:shadow-none`}
                  onClick={() => selectDate(day.value)}
                  disabled={loading || isDisabled}
                >
                  {day.day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 rounded border border-[#ead8a9] bg-[var(--admin-gold-soft)] px-3 py-2 text-[11px] font-semibold text-[var(--admin-gold-dark)]">
            {draftDates.fromDate ? formatDateLabel(draftDates.fromDate) : "Start date"} - {draftDates.toDate ? formatDateLabel(draftDates.toDate) : "End date"}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex min-h-8 items-center justify-center rounded border border-[var(--admin-gold)] bg-[var(--admin-gold-soft)] px-3 text-xs font-semibold text-[var(--admin-gold-dark)] transition hover:bg-[#ffe8a8] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={selectToday}
                disabled={loading}
              >
                Today
              </button>
              <button
                type="button"
                className="inline-flex min-h-8 items-center justify-center rounded border border-red-100 bg-white px-3 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setDraftDates({ fromDate: "", toDate: "" })}
                disabled={loading || (!draftDates.fromDate && !draftDates.toDate)}
              >
                Clear
              </button>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="inline-flex min-h-8 items-center justify-center rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex min-h-8 min-w-[86px] items-center justify-center rounded border border-[var(--admin-gold)] bg-[var(--admin-gold-soft)] px-3 text-xs font-semibold text-[var(--admin-gold-dark)] transition hover:bg-[#ffe8a8] focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={!hasCompleteRange || loading}
                onClick={applyRange}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReportShell = ({
  title,
  subtitle,
  breadcrumbs,
  stats = [],
  children,
  loading = false,
  filters,
  onRefresh,
  exportEndpoint,
  exportFilename,
  showFilters = true,
}) => {
  const [exporting, setExporting] = useState(false);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const dateRangeLabel = filters?.fromDate && filters?.toDate
    ? `${formatDateLabel(filters.fromDate)} - ${formatDateLabel(filters.toDate)}`
    : "Select date range";

  const handleExport = async () => {
    if (!exportEndpoint) return;
    try {
      setExporting(true);
      await downloadApiFile(
        exportEndpoint,
        { fromDate: filters.fromDate, toDate: filters.toDate, format: "csv" },
        { filename: exportFilename || "report.csv", format: "csv" },
      );
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Export failed";
      toast.error(message, { id: "report-export-error" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={
          exportEndpoint && (
            <button type="button" onClick={handleExport} disabled={exporting}>
              <MdFileDownload size={16} /> {exporting ? "Exporting" : "Export CSV"}
            </button>
          )
        }
      />

      <ReportDateRangeModal
        open={dateModalOpen}
        filters={filters}
        loading={loading}
        onClose={() => setDateModalOpen(false)}
      />

      <section className="mb-4 rounded-lg border border-[var(--admin-line)] bg-white p-3.5 shadow-[0_10px_28px_rgba(31,27,95,0.05)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {showFilters ? (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold uppercase text-[var(--admin-muted)]">Filter</span>
              <button
                type="button"
                onClick={() => setDateModalOpen(true)}
                className="inline-flex min-h-9 max-w-full items-center justify-center gap-2 rounded border border-[var(--admin-gold)] bg-[var(--admin-gold)] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--admin-gold-dark)]"
              >
                <MdCalendarToday size={15} />
                <span className="truncate">{dateRangeLabel}</span>
              </button>
            </div>
          ) : (
            <p className="text-xs font-medium text-[var(--admin-muted)]">Showing current report data.</p>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="admin-btn-secondary w-full justify-center sm:w-auto xl:min-w-[112px]"
          >
            <MdRefresh className={loading ? "animate-spin" : ""} size={16} />
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </section>

      <div className="mb-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = STAT_ICON_BY_LABEL[stat.label] || MdTrendingUp;

          return (
            <SummaryCard
              key={stat.label}
              title={stat.label}
              value={stat.value}
              description={stat.sub}
              icon={<Icon size={18} />}
              loading={loading}
            />
          );
        })}
      </div>

      <ReportLoadingContext.Provider value={loading}>
        {children}
      </ReportLoadingContext.Provider>
    </div>
  );
};

const useMarketplaceAnalytics = () => {
  const filters = useReportFilters();
  const loadData = useCallback(
    ({ fromDate, toDate }) => fetchJson(
      isSellerPanel() ? ENDPOINTS.analytics.sellerDashboard : ENDPOINTS.analytics.adminDashboard,
      { fromDate, toDate },
    ),
    [],
  );
  const report = useApiReport(loadData, filters);
  return { filters, ...report };
};

const getOrderRevenue = (order = {}) =>
  asNumber(
    order.sellerAmount ??
      order.seller_amount ??
      order.sellerOrderTotal ??
      order.seller_order_total ??
      order.totalAmount ??
      order.total_amount ??
      order.payableAmount ??
      order.payable_amount ??
      order.amount ??
      order.total,
  );

const normalizePerformanceSource = (source = []) =>
  listFrom(source)
    .map((item, index) => {
      const orders = asNumber(
        item.orders ??
          item.orderCount ??
          item.totalOrders ??
          item.value ??
          item.count ??
          item.total,
      );
      const revenue = asNumber(
        item.revenue ??
          item.gmv ??
          item.gmvAmount ??
          item.totalRevenue ??
          item.totalSalesAmount ??
          item.amount,
      );
      return {
        label: item.label || item.name || item.date || item.day || `Point ${index + 1}`,
        orders,
        revenue,
        averageOrderValue: asNumber(item.averageOrderValue ?? item.aov ?? (orders ? revenue / orders : 0)),
      };
    })
    .filter((row) => row.orders > 0 || row.revenue > 0);

const productRowsFromAnalytics = (products = []) =>
  listFrom(products).map((product, index) => ({
    id: product._id || product.id,
    title: product.title || product.name || "Untitled",
    label: truncateLabel(product.title || product.name || `Product ${index + 1}`, 18),
    purchases: asNumber(product.analytics?.purchases ?? product.purchases ?? product.unitsSold),
    revenue: asNumber(product.analytics?.revenue ?? product.revenue),
    orderCount: asNumber(product.analytics?.orderCount ?? product.orderCount),
    views: asNumber(product.analytics?.views ?? product.views),
    uniqueViews: asNumber(product.analytics?.uniqueViews ?? product.uniqueViews),
    impressions: asNumber(product.analytics?.impressions ?? product.impressions),
    cartAdds: asNumber(product.analytics?.cartAdds ?? product.cartAdds),
    wishlistAdds: asNumber(product.analytics?.wishlistAdds ?? product.wishlistAdds),
    conversionRate: asNumber(product.analytics?.conversionRate ?? product.conversionRate),
  }));

const productTotalsFromRows = (rows = []) => ({
  purchases: rows.reduce((sum, row) => sum + asNumber(row.purchases), 0),
  revenue: rows.reduce((sum, row) => sum + asNumber(row.revenue), 0),
  orderCount: rows.reduce((sum, row) => sum + asNumber(row.orderCount), 0),
  views: rows.reduce((sum, row) => sum + asNumber(row.views), 0),
  uniqueViews: rows.reduce((sum, row) => sum + asNumber(row.uniqueViews), 0),
  impressions: rows.reduce((sum, row) => sum + asNumber(row.impressions), 0),
  cartAdds: rows.reduce((sum, row) => sum + asNumber(row.cartAdds), 0),
  wishlistAdds: rows.reduce((sum, row) => sum + asNumber(row.wishlistAdds), 0),
  productCount: rows.length,
});

const hasProductActivity = (rows = []) =>
  rows.some((row) =>
    asNumber(row.revenue) > 0 ||
    asNumber(row.purchases) > 0 ||
    asNumber(row.orderCount) > 0 ||
    asNumber(row.views) > 0 ||
    asNumber(row.uniqueViews) > 0 ||
    asNumber(row.impressions) > 0 ||
    asNumber(row.cartAdds) > 0 ||
    asNumber(row.wishlistAdds) > 0,
  );

const analyticsSnapshotRows = ({ orders = {}, returns = {}, payouts = {}, productTotals = {} }) => {
  const orderRevenue = asNumber(orders.gmvAmount ?? orders.totalSalesAmount);
  const orderCount = asNumber(orders.orderCount);
  const productRevenue = asNumber(productTotals.revenue);
  const productPurchases = asNumber(productTotals.purchases);
  const pendingPayout = asNumber(payouts.byStatus?.pending?.netAmount);
  const pendingPayoutCount = asNumber(payouts.byStatus?.pending?.count);

  return [
    {
      label: "Product Revenue",
      amount: productRevenue,
      count: productPurchases,
    },
    {
      label: "Orders",
      amount: orderRevenue,
      count: orderCount,
    },
    {
      label: "Returns",
      amount: asNumber(returns.refundAmount),
      count: asNumber(returns.returnCount),
    },
    {
      label: "Pending Payouts",
      amount: pendingPayout,
      count: pendingPayoutCount,
    },
  ];
};

const performanceRowsFromAnalytics = ({ recentOrders = [], orders = {}, performance = [] }) => {
  const performanceRows = normalizePerformanceSource(performance);
  if (performanceRows.length) return performanceRows;

  const grouped = listFrom(recentOrders).reduce((lookup, order) => {
    const key = formatDayLabel(order.createdAt ?? order.created_at ?? order.date);
    const current = lookup[key] || { label: key, orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += getOrderRevenue(order);
    lookup[key] = current;
    return lookup;
  }, {});

  const rows = Object.values(grouped).map((row) => ({
    ...row,
    averageOrderValue: row.orders ? Math.round(row.revenue / row.orders) : 0,
  }));

  if (rows.length) return rows.reverse();

  const orderCount = asNumber(orders.orderCount);
  const revenue = asNumber(
    orders.gmvAmount ??
      orders.totalSalesAmount ??
      orders.totalRevenue ??
      orders.revenue ??
      orders.payableAmount,
  );
  if (!orderCount && !revenue) return [];

  return [{
    label: "Selected",
    orders: orderCount,
    revenue,
    averageOrderValue: orderCount ? Math.round(revenue / orderCount) : 0,
  }];
};

const PerformanceOverview = ({
  title = "Sales Trend",
  rows = [],
  barKey = "revenue",
  lineKey = "orders",
  barLabel = "Revenue",
  lineLabel = "Orders",
  barFormatter = formatCurrency,
  lineFormatter = formatNumber,
  includeZeroRows = false,
}) => {
  const loading = useContext(ReportLoadingContext);
  const chartRows = includeZeroRows
    ? rows
    : rows.filter((row) => asNumber(row[barKey]) > 0 || asNumber(row[lineKey]) > 0);
  const composedRows = chartRows.map((row) => ({
    ...row,
    barValue: asNumber(row[barKey]),
    lineValue: asNumber(row[lineKey]),
  }));
  const barSize = composedRows.length <= 4 ? 24 : 30;

  return (
    <div className="admin-card overflow-hidden border-[var(--admin-line)] bg-white p-4 shadow-[0_12px_34px_rgba(31,27,95,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--admin-line)] pb-3.5">
        <div>
          <h3 className="text-[17px] font-extrabold leading-tight text-[var(--admin-navy)] sm:text-[20px]">{title}</h3>
          <span className="mt-2.5 block h-0.5 w-12 rounded-full bg-[var(--admin-gold)]" />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-[var(--admin-muted)]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--admin-gold)]" />
            {barLabel}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--admin-navy)]" />
            {lineLabel}
          </span>
        </div>
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="min-h-[300px] animate-pulse">
            <div className="mb-4 grid h-[255px] grid-cols-8 items-end gap-4 border-b border-l border-[var(--admin-line)] px-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex h-full items-end">
                  <div
                    className="w-full rounded-t bg-[var(--admin-gold-soft)]"
                    style={{ height: `${32 + (index % 5) * 12}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mx-auto h-4 w-44 rounded bg-[var(--admin-gold-soft)]" />
          </div>
        ) : composedRows.length ? (
          <div className="w-full">
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={composedRows} margin={{ left: 4, right: 8, top: 18, bottom: 0 }}>
                <defs>
                  <linearGradient id="reportRevenueBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={REPORT_GOLD} stopOpacity={0.96} />
                    <stop offset="100%" stopColor={REPORT_GOLD_DARK} stopOpacity={0.96} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="0" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tick={{ fontSize: 11, fill: "var(--admin-muted)" }}
                  axisLine={{ stroke: "#e9dfc9" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "var(--admin-muted)" }}
                  tickFormatter={barFormatter}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "var(--admin-muted)" }}
                  tickFormatter={lineFormatter}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  cursor={{ fill: "rgba(214, 163, 35, 0.08)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-md border border-[var(--admin-line)] bg-white px-3 py-2 shadow-[var(--admin-shadow-strong)]">
                        <p className="text-[12px] font-bold text-[var(--admin-navy)]">{label}</p>
                        <div className="mt-2 space-y-1">
                          {payload.map((item) => {
                            const isBar = item.dataKey === "barValue";
                            return (
                              <p key={item.dataKey} className="text-[12px] font-semibold text-[var(--admin-muted)]">
                                {isBar ? barLabel : lineLabel}:{" "}
                                <span className="text-[var(--admin-ink)]">
                                  {isBar ? barFormatter(item.value) : lineFormatter(item.value)}
                                </span>
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="barValue"
                  stackId="growth"
                  fill="url(#reportRevenueBar)"
                  radius={[5, 5, 0, 0]}
                  barSize={barSize}
                  minPointSize={includeZeroRows ? 4 : 0}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="lineValue"
                  stroke="var(--admin-navy)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "white", stroke: "var(--admin-navy)", strokeWidth: 3 }}
                  activeDot={{ r: 6, fill: "white", stroke: "var(--admin-navy)", strokeWidth: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyPanel title="No chart data" text="There is no performance data for the selected date range." />
        )}
      </div>
    </div>
  );
};

const SummaryColumnChart = ({ title, items = [] }) => {
  const loading = useContext(ReportLoadingContext);
  const chartOrder = [
    "Delivered",
    "Refunds",
    "Returns",
    "Return Requests",
    "Pending Payouts",
    "Orders",
    "Purchases",
    "Revenue",
  ];
  const orderedItems = [...items].sort((a, b) => {
    const aIndex = chartOrder.indexOf(a.label);
    const bIndex = chartOrder.indexOf(b.label);
    const safeAIndex = aIndex === -1 ? chartOrder.length : aIndex;
    const safeBIndex = bIndex === -1 ? chartOrder.length : bIndex;
    return safeAIndex - safeBIndex;
  });
  const maxValue = Math.max(...orderedItems.map((item) => asNumber(item.value)), 0);
  const chartRows = orderedItems.map((item) => {
    const value = asNumber(item.value);
    return {
      ...item,
      rawValue: value,
      chartValue: value > 0 && maxValue ? Math.max(18, Math.round((value / maxValue) * 100)) : 0,
    };
  });

  return (
    <div className="admin-card overflow-hidden border-[var(--admin-line)] bg-white p-4 shadow-[0_12px_34px_rgba(31,27,95,0.06)]">
      <div className="border-b border-[var(--admin-line)] pb-3.5">
        <h3 className="text-[17px] font-extrabold leading-tight text-[var(--admin-navy)] sm:text-[20px]">{title}</h3>
        <span className="mt-2.5 block h-0.5 w-12 rounded-full bg-[var(--admin-gold)]" />
      </div>

      {loading ? (
        <div className="mt-4 min-h-[260px] animate-pulse rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-4">
          <div className="grid h-[220px] grid-cols-4 items-end gap-8 border-b border-l border-[var(--admin-line)] px-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex h-full flex-col items-center justify-end gap-3">
                <div className="h-4 w-24 rounded bg-[var(--admin-gold-soft)]" />
                <div className="w-8 rounded-t bg-[var(--admin-gold-soft)]" style={{ height: `${70 + index * 28}px` }} />
              </div>
            ))}
          </div>
        </div>
      ) : chartRows.length ? (
        <div className="mt-4 min-h-[260px] rounded-lg border border-[var(--admin-line)] bg-white p-3">
          <div className="h-[255px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartRows} margin={{ left: 8, right: 8, top: 18, bottom: 4 }}>
                <defs>
                  <linearGradient id="summaryReportBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={REPORT_GOLD} stopOpacity={0.98} />
                    <stop offset="100%" stopColor={REPORT_GOLD_DARK} stopOpacity={0.98} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tick={{ fontSize: 11, fontWeight: 700, fill: "var(--admin-muted)" }}
                  axisLine={{ stroke: "#e9dfc9" }}
                  tickLine={false}
                />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  cursor={{ fill: "rgba(214, 163, 35, 0.08)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload;
                    return (
                      <div className="rounded-md border border-[var(--admin-line)] bg-white px-3 py-2 shadow-[var(--admin-shadow-strong)]">
                        <p className="text-[12px] font-bold text-[var(--admin-navy)]">{label}</p>
                        <p className="mt-1 text-[13px] font-extrabold text-[var(--admin-ink)]">{row?.displayValue}</p>
                        {row?.sub && <p className="mt-1 text-[11px] font-semibold text-[var(--admin-muted)]">{row.sub}</p>}
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="chartValue"
                  fill="url(#summaryReportBar)"
                  radius={[5, 5, 0, 0]}
                  barSize={28}
                />
                <Line
                  type="monotone"
                  dataKey="chartValue"
                  stroke="var(--admin-navy)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "white", stroke: "var(--admin-navy)", strokeWidth: 3 }}
                  activeDot={{ r: 6, fill: "white", stroke: "var(--admin-navy)", strokeWidth: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <EmptyPanel title="No chart data" text="There is no report data for the selected date range." />
        </div>
      )}
    </div>
  );
};

export const SalesReport = () => {
  const sellerView = isSellerPanel();
  const filters = useReportFilters();
  const loadData = useCallback(async ({ fromDate, toDate }) => {
    const analyticsDashboard = await fetchJson(
      sellerView ? ENDPOINTS.analytics.sellerDashboard : ENDPOINTS.analytics.adminDashboard,
      { fromDate, toDate },
    );
    if (!sellerView) return analyticsDashboard;

    const [dashboardOverview, topProducts] = await Promise.all([
      fetchJson(ENDPOINTS.dashboard.overview, { fromDate, toDate }),
      fetchJson(ENDPOINTS.products.analyticsTop, {
        limit: 10,
        metric: "purchases",
        fromDate,
        toDate,
      }),
    ]);

    return {
      ...analyticsDashboard,
      dashboardOverview,
      topProducts: listFrom(topProducts),
    };
  }, [sellerView]);
  const { data, loading, error, refresh } = useApiReport(loadData, filters);
  const dashboardOverview = data.dashboardOverview || {};
  const dashboardMetrics = dashboardOverview.metrics || {};
  const dashboardCommerce = dashboardOverview.commerce || {};
  const orders = data.orders || {};
  const returns = data.returns || dashboardOverview.returns || {};
  const fallbackProductRows = productRowsFromAnalytics(data.topProducts);
  const fallbackProductTotals = productTotalsFromRows(fallbackProductRows);
  const totalRevenue = asNumber(
    dashboardMetrics.gmv ??
      dashboardCommerce.gmv ??
      orders.gmvAmount ??
      orders.totalSalesAmount ??
      fallbackProductTotals.revenue,
  );
  const totalOrders = asNumber(
    dashboardMetrics.totalOrders ??
      dashboardCommerce.totalOrders ??
      orders.orderCount,
  );
  const totalProductViews = asNumber(fallbackProductTotals.views || fallbackProductTotals.impressions);
  const refundAmount = asNumber(returns.refundAmount);
  const deliveredOrders = asNumber(
    dashboardMetrics.deliveredOrders ??
      dashboardCommerce.deliveredOrders ??
      orders.deliveredOrders,
  );
  const salesSummaryItems = [
    { label: "Revenue", value: totalRevenue, displayValue: formatCurrency(totalRevenue), sub: "Selected range" },
    { label: "Orders", value: totalOrders, displayValue: formatNumber(totalOrders), sub: "All statuses" },
    sellerView
      ? { label: "Views", value: totalProductViews, displayValue: formatNumber(totalProductViews), sub: "Product activity" }
      : { label: "Delivered", value: deliveredOrders, displayValue: formatNumber(deliveredOrders), sub: "Completed orders" },
    { label: "Refunds", value: refundAmount, displayValue: formatCurrency(refundAmount), sub: "Return refunds" },
  ];

  const stats = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue), sub: "GMV in selected range" },
    { label: "Total Orders", value: formatNumber(totalOrders), sub: "All order statuses" },
    { label: sellerView ? "Product Views" : "Delivered Orders", value: formatNumber(sellerView ? totalProductViews : deliveredOrders), sub: sellerView ? "Tracked product views" : "Completed fulfilment" },
    { label: "Refund Amount", value: formatCurrency(refundAmount), sub: "Return refunds" },
  ];

  return (
    <ReportShell
      title={sellerView ? "Sales Report" : "Sales Reports"}
      subtitle={sellerView ? "Revenue and order status for your seller account." : "Revenue, order status, payments, and refunds from live marketplace analytics"}
      breadcrumbs={[{ label: sellerView ? SELLER_REPORT_CRUMB : "Reports & Analytics" }, { label: sellerView ? "Sales Report" : "Sales Reports" }]}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onRefresh={refresh}
      exportEndpoint={sellerView ? null : ENDPOINTS.operationsReports.orders}
      exportFilename={sellerView ? null : "sales-report.csv"}
    >
      <SummaryColumnChart title="Sales Report Summary" items={salesSummaryItems} />
    </ReportShell>
  );
};

export const ProductAnalytics = () => {
  const filters = useReportFilters();
  const sellerView = isSellerPanel();
  const loadData = useCallback(async ({ fromDate, toDate }) => {
    const [topProducts, inventoryStats, catalogProducts] = await Promise.all([
      fetchJson(ENDPOINTS.products.analyticsTop, { limit: 10, metric: sellerView ? "views" : "purchases", fromDate, toDate }),
      fetchJson(ENDPOINTS.products.inventoryStats),
      fetchJson(ENDPOINTS.products.listForPanel, { limit: 100, includeAllStatuses: true }).catch(() => []),
    ]);
    return { topProducts: listFrom(topProducts), inventoryStats, catalogProducts: listFrom(catalogProducts) };
  }, [sellerView]);
  const { data, loading, error, refresh } = useApiReport(loadData, filters);
  const products = listFrom(data.topProducts);
  const catalogProducts = listFrom(data.catalogProducts);
  const inventory = data.inventoryStats || {};
  const analyticsById = new Map(products.map((product) => [String(product._id || product.id || product.productId), product]));
  const displayProducts = catalogProducts.length ? catalogProducts.map((product) => {
    const analyticsProduct = analyticsById.get(String(product._id || product.id || product.productId)) || product;
    return { ...product, analytics: analyticsProduct.analytics || product.analytics || {} };
  }) : products;

  const baseRows = displayProducts.map((product) => ({
    id: product._id || product.id || product.productId,
    title: product.title || product.name || "Untitled",
    label: truncateLabel(product.title || product.name || "Untitled", 18),
    chartLabel: truncateLabel(product.title || product.name || "Untitled", 26),
    sku: product.sku || product.skuCode || "-",
    price: formatCurrency(product.price || product.sellingPrice || product.salePrice),
    purchases: asNumber(product.analytics?.purchases),
    revenue: asNumber(product.analytics?.revenue),
    views: asNumber(product.analytics?.views),
    uniqueViews: asNumber(product.analytics?.uniqueViews),
    cartAdds: asNumber(product.analytics?.cartAdds),
    wishlistAdds: asNumber(product.analytics?.wishlistAdds),
    orderCount: asNumber(product.analytics?.orderCount),
    conversionRate: asNumber(product.analytics?.conversionRate),
  }));
  const totalProductsCount = asNumber(inventory.totalProducts);
  const rows = totalProductsCount > baseRows.length
    ? [
      ...baseRows,
      ...Array.from({ length: totalProductsCount - baseRows.length }, (_, index) => ({
        id: `missing-product-${index + 1}`,
        title: `Product ${baseRows.length + index + 1}`,
        label: `Product ${baseRows.length + index + 1}`,
        chartLabel: `Product ${baseRows.length + index + 1}`,
        sku: "-",
        price: formatCurrency(0),
        purchases: 0,
        revenue: 0,
        views: 0,
      })),
    ]
    : baseRows;
  const purchaseTotal = rows.reduce((sum, product) => sum + asNumber(product.purchases), 0);
  const revenueTotal = rows.reduce((sum, product) => sum + asNumber(product.revenue), 0);
  const viewsTotal = rows.reduce((sum, product) => sum + asNumber(product.views), 0);
  const cartAddTotal = rows.reduce((sum, product) => sum + asNumber(product.cartAdds), 0);

  const stats = [
    { label: "Total Products", value: formatNumber(inventory.totalProducts), sub: "Current catalog" },
    { label: sellerView ? "Product Views" : "Top Product Purchases", value: formatNumber(sellerView ? viewsTotal : purchaseTotal), sub: sellerView ? "Filtered product activity" : "Top 10 products" },
    { label: sellerView ? "Cart Adds" : "Top Product Revenue", value: sellerView ? formatNumber(cartAddTotal) : formatCurrency(revenueTotal), sub: sellerView ? "Tracked product analytics" : "Tracked product analytics" },
    { label: "Out of Stock", value: formatNumber(inventory.outOfStockCount), sub: "Current inventory" },
  ];

  return (
    <ReportShell
      title={sellerView ? "Product Report" : "Product Analytics"}
      subtitle={sellerView ? "Top-selling products and catalog health for your seller account." : "Top-selling products and current catalog health from product analytics APIs"}
      breadcrumbs={[{ label: sellerView ? SELLER_REPORT_CRUMB : "Reports & Analytics" }, { label: sellerView ? "Product Report" : "Product Analytics" }]}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onRefresh={refresh}
      exportEndpoint={sellerView ? null : ENDPOINTS.operationsReports.products}
      exportFilename={sellerView ? null : "product-analytics.csv"}
    >
      <div className="space-y-4">
        <PerformanceOverview
          title="Top Product Growth"
          rows={rows}
          barKey="revenue"
          lineKey={sellerView ? "views" : "purchases"}
          barLabel="Revenue"
          lineLabel={sellerView ? "Views" : "Purchases"}
          barFormatter={formatCurrency}
          lineFormatter={formatNumber}
          includeZeroRows
        />
        <ReportTable
          title="Top Product Details"
          rows={rows}
          columns={[
            {
              key: "title",
              label: "Product",
              render: (value) => <span className="font-semibold text-[var(--admin-navy)] hover:text-[var(--admin-gold-dark)]">{value}</span>,
            },
            { key: "sku", label: "SKU" },
            { key: "price", label: "Price" },
            { key: "purchases", label: "Purchases", render: (value) => formatNumber(value) },
            { key: "revenue", label: "Revenue", render: (value) => formatCurrency(value) },
            { key: "views", label: "Views", render: (value) => formatNumber(value) },
            ...(sellerView ? [
              { key: "cartAdds", label: "Cart Adds", render: (value) => formatNumber(value) },
              { key: "wishlistAdds", label: "Wishlist", render: (value) => formatNumber(value) },
            ] : []),
          ]}
          getRowLink={(row) => row.id ? `/app/product-catalog/view/${row.id}` : null}
        />
      </div>
    </ReportShell>
  );
};

export const InventoryAnalytics = () => {
  const filters = useReportFilters();
  const sellerView = isSellerPanel();
  const loadData = useCallback(async () => {
    if (isSellerPanel()) {
      const [stats, products] = await Promise.all([
        fetchJson(ENDPOINTS.products.inventoryStats),
        fetchJson(ENDPOINTS.products.listForPanel, { limit: 10, page: 1, sortBy: "stock", sortDir: "asc" }),
      ]);
      return { stats, lowStock: listFrom(products) };
    }
    const [stats, lowStock] = await Promise.all([
      fetchJson(ENDPOINTS.inventory.stats),
      fetchJson(ENDPOINTS.inventory.lowStock, { limit: 10, page: 1 }),
    ]);
    return { stats, lowStock: listFrom(lowStock) };
  }, []);
  const { data, loading, error, refresh } = useApiReport(loadData, filters);
  const statsData = data.stats || {};
  const lowStockRows = listFrom(data.lowStock).map((product) => ({
    id: product._id || product.id,
    title: product.title || product.name || "Untitled",
    label: truncateLabel(product.title || product.name || "Untitled", 18),
    sku: product.sku || "-",
    stock: asNumber(product.stock),
    reservedStock: asNumber(product.reservedStock),
    availableStock: Math.max(0, asNumber(product.stock) - asNumber(product.reservedStock)),
  }));

  const stats = [
    { label: "Total Products", value: formatNumber(statsData.totalProducts), sub: "Inventory-tracked products" },
    { label: "Total Stock", value: formatNumber(statsData.totalStock), sub: "Units on hand" },
    { label: "Reserved Stock", value: formatNumber(statsData.totalReserved), sub: "Allocated to orders" },
    { label: "Low Stock Items", value: formatNumber(statsData.lowStockCount), sub: "At or below threshold" },
  ];

  return (
    <ReportShell
      title={sellerView ? "Inventory Report" : "Inventory Analytics"}
      subtitle={sellerView ? "Current stock health and low-stock products for your seller account." : "Current stock health and low-stock products from inventory APIs"}
      breadcrumbs={[{ label: sellerView ? SELLER_REPORT_CRUMB : "Reports & Analytics" }, { label: sellerView ? "Inventory Report" : "Inventory Analytics" }]}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onRefresh={refresh}
      exportEndpoint={sellerView ? null : ENDPOINTS.operationsReports.inventory}
      exportFilename={sellerView ? null : "inventory-report.csv"}
      showFilters={false}
    >
      <div className="space-y-4">
        <PerformanceOverview
          title="Inventory Stock Growth"
          rows={lowStockRows}
          barKey="stock"
          lineKey="availableStock"
          barLabel="Stock"
          lineLabel="Available"
          barFormatter={formatNumber}
          lineFormatter={formatNumber}
        />
        <ReportTable
          title={sellerView ? "Inventory Products" : "Low Stock Products"}
          rows={lowStockRows}
          emptyTitle={sellerView ? "No inventory products" : "No low-stock products"}
          emptyText={sellerView ? "No products are available in your inventory yet." : "Your inventory is healthy for the selected range. Products will appear here when available stock reaches the low-stock threshold."}
          columns={[
            {
              key: "title",
              label: "Product",
              render: (value) => <span className="font-semibold text-[var(--admin-navy)] hover:text-[var(--admin-gold-dark)]">{value}</span>,
            },
            { key: "sku", label: "SKU" },
            { key: "stock", label: "Stock", render: (value) => formatNumber(value) },
            { key: "reservedStock", label: "Reserved", render: (value) => formatNumber(value) },
            { key: "availableStock", label: "Available", render: (value) => formatNumber(value) },
          ]}
          getRowLink={(row) => row.id ? `/app/product-catalog/view/${row.id}` : null}
        />
      </div>
    </ReportShell>
  );
};

export const SellerAnalytics = () => {
  const { filters, data, loading, error, refresh } = useMarketplaceAnalytics();
  const sellers = listFrom(data.sellerPerformance);
  const finance = data.finance || {};
  const payouts = data.payouts || {};
  const rows = sellers.map((seller) => ({
    sellerId: seller.sellerId,
    sellerName: seller.sellerName || seller.sellerId,
    label: truncateLabel(seller.sellerName || seller.sellerId, 18),
    chartLabel: truncateLabel(seller.sellerName || seller.sellerId, 26),
    orderCount: asNumber(seller.orderCount),
    deliveredOrders: asNumber(seller.deliveredOrders),
    gmvAmount: asNumber(seller.gmvAmount),
    commissionAmount: asNumber(seller.commissionAmount),
    deliveryRate: asNumber(seller.deliveryRate),
  }));
  const gmvTotal = rows.reduce((sum, row) => sum + row.gmvAmount, 0);

  const stats = [
    { label: "Top Seller GMV", value: formatCurrency(gmvTotal), sub: "Visible seller rows" },
    { label: "Platform Revenue", value: formatCurrency(finance.platformRevenueTotalAmount), sub: "Commission plus tax" },
    { label: "Seller Payable", value: formatCurrency(finance.sellerPayableAmount), sub: "Net seller revenue" },
    { label: "Pending Payouts", value: formatCurrency(payouts.byStatus?.pending?.netAmount), sub: "Current payout queue" },
  ];

  return (
    <ReportShell
      title="Seller Analytics"
      subtitle="Seller GMV, fulfilment, commissions, and payout exposure"
      breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Seller Analytics" }]}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onRefresh={refresh}
      exportEndpoint={ENDPOINTS.operationsReports.sellerScorecards}
      exportFilename="seller-analytics.csv"
    >
      <div className="space-y-4">
        <PerformanceOverview
          title="Top Sellers by GMV"
          rows={rows}
          barKey="gmvAmount"
          lineKey="orderCount"
          barLabel="GMV"
          lineLabel="Orders"
          barFormatter={formatCurrency}
          lineFormatter={formatNumber}
        />
        <ReportTable
          title="Seller Scorecard"
          rows={rows}
          columns={[
            { key: "sellerName", label: "Seller" },
            { key: "orderCount", label: "Orders", render: (value) => formatNumber(value) },
            { key: "deliveredOrders", label: "Delivered", render: (value) => formatNumber(value) },
            { key: "gmvAmount", label: "GMV", render: (value) => formatCurrency(value) },
            { key: "commissionAmount", label: "Commission", render: (value) => formatCurrency(value) },
            { key: "deliveryRate", label: "Delivery Rate", render: (value) => `${asNumber(value)}%` },
          ]}
        />
      </div>
    </ReportShell>
  );
};

export const AnalyticsDashboard = () => {
  const filters = useReportFilters();
  const loadData = useCallback(async ({ fromDate, toDate }) => {
    if (isSellerPanel()) {
      const [sellerDashboard, topProducts] = await Promise.all([
        fetchJson(ENDPOINTS.analytics.sellerDashboard, { fromDate, toDate }),
        fetchJson(ENDPOINTS.products.analyticsTop, { limit: 5, metric: "purchases", fromDate, toDate }),
      ]);
      return { marketplace: sellerDashboard, topProducts: listFrom(topProducts) };
    }
    const [marketplace, topProducts] = await Promise.all([
      fetchJson(ENDPOINTS.analytics.adminDashboard, { fromDate, toDate }),
      fetchJson(ENDPOINTS.products.analyticsTop, { limit: 5, metric: "purchases", fromDate, toDate }),
    ]);
    return { marketplace, topProducts: listFrom(topProducts) };
  }, []);
  const { data, loading, error, refresh } = useApiReport(loadData, filters);
  const sellerView = isSellerPanel();
  const marketplace = data.marketplace || {};
  const orders = marketplace.orders || {};
  const returns = marketplace.returns || {};
  const payouts = marketplace.payouts || {};
  const performanceRows = performanceRowsFromAnalytics({
    recentOrders: marketplace.recentOrders,
    orders,
    performance: marketplace.orderPerformance || marketplace.ordersPerformance || marketplace.salesTrend,
  });
  const fallbackProductRows = productRowsFromAnalytics(data.topProducts);
  const fallbackProductTotals = productTotalsFromRows(fallbackProductRows);
  const useProductFallback = sellerView && !performanceRows.length && hasProductActivity(fallbackProductRows);
  const totalRevenue = asNumber((orders.gmvAmount ?? orders.totalSalesAmount) || fallbackProductTotals.revenue);
  const totalOrders = asNumber(orders.orderCount || fallbackProductTotals.orderCount || fallbackProductTotals.purchases);
  const totalProductViews = asNumber(fallbackProductTotals.views || fallbackProductTotals.impressions);
  const returnCount = asNumber(returns.returnCount);
  const pendingPayout = asNumber(payouts.byStatus?.pending?.netAmount);
  const snapshotRows = analyticsSnapshotRows({
    orders,
    returns,
    payouts,
    productTotals: useProductFallback ? fallbackProductTotals : {},
  });
  const analyticsSummaryItems = [
    {
      label: "Revenue",
      value: totalRevenue,
      displayValue: formatCurrency(totalRevenue),
      sub: useProductFallback ? "Product analytics" : "Seller sales",
    },
    {
      label: useProductFallback ? "Views" : "Orders",
      value: useProductFallback && !totalOrders ? totalProductViews : totalOrders,
      displayValue: formatNumber(useProductFallback && !totalOrders ? totalProductViews : totalOrders),
      sub: useProductFallback && !totalOrders ? "Product activity" : useProductFallback ? "Product purchases" : "All statuses",
    },
    {
      label: "Returns",
      value: returnCount,
      displayValue: formatNumber(returnCount),
      sub: "Return requests",
    },
    {
      label: "Pending Payouts",
      value: pendingPayout,
      displayValue: formatCurrency(pendingPayout),
      sub: "Seller settlements",
    },
  ];
  const stats = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue), sub: useProductFallback ? "Product analytics revenue" : "GMV in selected range" },
    { label: "Total Orders", value: formatNumber(totalOrders), sub: useProductFallback ? "Product purchases" : "All order statuses" },
    { label: useProductFallback ? "Product Views" : "Return Requests", value: formatNumber(useProductFallback ? totalProductViews : returnCount), sub: useProductFallback ? "Tracked product views" : "Return workflow" },
    { label: "Pending Payouts", value: formatCurrency(pendingPayout), sub: "Seller settlements" },
  ];

  return (
    <ReportShell
      title="Analytics Dashboard"
      subtitle={sellerView ? "Live seller metrics for orders, returns, products, inventory, and wallet activity." : "Live marketplace metrics for orders, returns, payouts, sellers, products, and inventory"}
      breadcrumbs={[{ label: sellerView ? SELLER_REPORT_CRUMB : "Reports & Analytics" }, { label: "Analytics Dashboard" }]}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onRefresh={refresh}
    >
      <SummaryColumnChart
        title={sellerView ? "Seller Analytics Snapshot" : "Marketplace Analytics Snapshot"}
        items={analyticsSummaryItems.length ? analyticsSummaryItems : snapshotRows.map((row) => ({
          label: row.label,
          value: row.amount || row.count,
          displayValue: row.amount ? formatCurrency(row.amount) : formatNumber(row.count),
          sub: row.amount ? "Amount" : "Count",
        }))}
      />
    </ReportShell>
  );
};
