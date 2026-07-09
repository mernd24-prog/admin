import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MdAccountBalanceWallet,
  MdAssignmentReturn,
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
import { StatCardSkeletonLoader } from "../../components/Loader/SkeletonLoader";
import { PageHeader } from "../../components/Shared";
import { axiosPrivate } from "../../_helpers/axiosProvider";
import { downloadApiFile } from "../../_helpers/downloadApi";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { isSellerPanel } from "../../_helpers/panelConfig";

const RANGE_OPTIONS = ["Today", "Last 7 days", "Last 30 days", "Last 90 days"];
const CHART_COLORS = [
  "var(--admin-navy)",
  "var(--admin-gold)",
  "var(--admin-danger)",
  "var(--admin-navy-dark)",
  "var(--admin-gold-dark)",
  "var(--admin-line-strong)",
];
const CHART_GRID_COLOR = "var(--admin-line)";
const SELLER_REPORT_CRUMB = "My Reports";

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
const titleize = (value = "") =>
  String(value || "unknown")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toIsoDate = (date) => date.toISOString().slice(0, 10);

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

const unwrapData = (response) => response?.data?.data ?? response?.data ?? response ?? {};
const listFrom = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.list)) return value.list;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const statusRows = (bucket = {}) =>
  Object.entries(bucket?.byStatus || {}).map(([status, row]) => ({
    status: titleize(status),
    count: asNumber(row?.count),
    amount: asNumber(row?.netAmount ?? row?.grossAmount),
  }));

const fetchJson = async (endpoint, params = {}) => unwrapData(await axiosPrivate.get(endpoint, { params }));

const MetricTooltip = ({ active, payload, label, valueFormatter = formatNumber }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  const metric = payload[0];

  return (
    <div className="max-w-[280px] rounded-md border border-[var(--admin-line)] bg-white px-3 py-2 shadow-[var(--admin-shadow-strong)]">
      <p className="line-clamp-2 text-[12px] font-bold leading-5 text-[var(--admin-navy)]">
        {row.title || row.sellerName || label}
      </p>
      <p className="mt-1 text-[12px] font-semibold text-[var(--admin-muted)]">
        {titleize(metric.name)}: <span className="text-[var(--admin-ink)]">{valueFormatter(metric.value)}</span>
      </p>
    </div>
  );
};

const useReportFilters = (defaultRange = "Last 30 days") => {
  const initial = rangeToDates(defaultRange);
  const [range, setRange] = useState(defaultRange);
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

  return {
    range,
    fromDate,
    toDate,
    setRange: setPresetRange,
    setFromDate: setCustomFromDate,
    setToDate: setCustomToDate,
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

const StatCard = ({ label, value, sub, loading }) => {
  const Icon = STAT_ICON_BY_LABEL[label] || MdTrendingUp;

  return (
    <div className="h-full">
      {loading ? (
        <StatCardSkeletonLoader />
      ) : (
        <div className="group relative flex h-full min-h-[108px] overflow-hidden rounded-lg border border-[var(--admin-gold)] bg-white p-4 shadow-[var(--admin-shadow)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--admin-shadow-strong)]">
          <span className="absolute inset-y-0 left-0 w-1 bg-[var(--admin-gold)]" />
          <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--admin-line)] bg-[var(--admin-gold-soft)] text-[var(--admin-navy)] transition group-hover:border-[var(--admin-gold)] group-hover:bg-[var(--admin-gold)]">
            <Icon size={20} />
          </span>
          <div className="relative flex min-w-0 flex-col justify-between pr-12">
            <p className="text-[12px] font-semibold text-[var(--admin-ink)]">{label}</p>
            <p className="mt-2 truncate text-[24px] font-extrabold leading-7 text-[var(--admin-navy)]">{value}</p>
            {sub && <p className="mt-3 text-[11px] font-medium capitalize text-[var(--admin-muted)]">{sub}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyPanel = ({
  title = "No data found",
  text = "No data returned for this period.",
}) => (
  <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-[var(--admin-line-strong)] bg-[var(--admin-surface-soft)] p-6 text-center">
    <div className="max-w-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--admin-gold)] shadow-sm">
        <MdInbox size={24} />
      </span>
      <h4 className="mt-4 text-sm font-bold text-[var(--admin-navy)]">{title}</h4>
      <p className="mt-1 text-sm leading-6 text-[var(--admin-muted)]">{text}</p>
    </div>
  </div>
);

const ReportLoadingContext = createContext(false);

const PanelSkeleton = ({ rows = 6 }) => (
  <div className="min-h-[220px] animate-pulse space-y-4 rounded-lg bg-white py-2">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center gap-3">
        <div className="h-4 w-1/4 rounded bg-[var(--admin-surface-soft)]" />
        <div
          className="h-4 rounded bg-[var(--admin-surface-soft)]"
          style={{ width: `${70 - (index % 3) * 12}%` }}
        />
      </div>
    ))}
  </div>
);

const ChartPanel = ({ title, data = [], children }) => {
  const loading = useContext(ReportLoadingContext);
  return (
    <div className="admin-card overflow-hidden border-[var(--admin-line)] shadow-[var(--admin-shadow)]">
      <div className="flex items-center gap-3 border-b border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-5 py-4">
        <span className="h-8 w-1 rounded-full bg-[var(--admin-gold)]" />
        <h3 className="text-[15px] font-bold text-[var(--admin-navy)]">{title}</h3>
      </div>
      <div className="min-h-[280px] bg-white p-5">
        {loading ? <PanelSkeleton /> : data.length ? children : <EmptyPanel title="No chart data" text="There is no chart data for the selected date range." />}
      </div>
    </div>
  );
};

const ReportTable = ({ title, columns = [], rows = [], getRowLink, emptyTitle, emptyText }) => {
  const loading = useContext(ReportLoadingContext);
  const navigate = useNavigate();
  return (
    <div className="admin-card overflow-hidden shadow-[var(--admin-shadow)]">
    <div className="flex items-center gap-3 border-b border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-5 py-4">
      <span className="h-8 w-1 rounded-full bg-[var(--admin-gold)]" />
      <h3 className="text-[15px] font-bold text-[var(--admin-navy)]">{title}</h3>
    </div>
    {loading ? (
      <div className="p-5"><PanelSkeleton /></div>
    ) : rows.length ? (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="admin-table-head">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold text-[var(--admin-navy)]">
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
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm font-medium text-[var(--admin-ink)]">
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
}) => {
  const [exporting, setExporting] = useState(false);

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

      <section className="admin-card mb-5 p-4 shadow-[var(--admin-shadow)]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto] xl:items-end">
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--admin-muted)]">Date range</span>
            <select
              value={filters.range}
              onChange={(event) => filters.setRange(event.target.value)}
              className="admin-input w-full"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
              {filters.range === "Custom" && <option>Custom</option>}
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--admin-muted)]">From date</span>
            <input
              type="date"
              value={filters.fromDate}
              max={filters.toDate}
              onChange={(event) => filters.setFromDate(event.target.value)}
              className="admin-input w-full"
            />
          </label>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--admin-muted)]">To date</span>
            <input
              type="date"
              value={filters.toDate}
              min={filters.fromDate}
              onChange={(event) => filters.setToDate(event.target.value)}
              className="admin-input w-full"
            />
          </label>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="admin-btn-secondary w-full justify-center sm:w-auto xl:min-w-[112px] mb-1.5"
          >
            <MdRefresh className={loading ? "animate-spin" : ""} size={16} />
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </section>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} loading={loading} />
        ))}
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

const orderStatusRowsFromRecentOrders = (recentOrders = []) => {
  const buckets = listFrom(recentOrders).reduce((lookup, order) => {
    const status = titleize(order.status || "unknown");
    lookup[status] = (lookup[status] || 0) + 1;
    return lookup;
  }, {});
  return Object.entries(buckets).map(([status, count]) => ({ status, count }));
};

const performanceRowsFromAnalytics = ({ recentOrders = [], orders = {} }) => {
  const grouped = listFrom(recentOrders).reduce((lookup, order) => {
    const key = formatDayLabel(order.createdAt);
    const current = lookup[key] || { label: key, orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += asNumber(order.sellerAmount ?? order.totalAmount ?? order.amount);
    lookup[key] = current;
    return lookup;
  }, {});

  const rows = Object.values(grouped).map((row) => ({
    ...row,
    averageOrderValue: row.orders ? Math.round(row.revenue / row.orders) : 0,
  }));

  if (rows.length) return rows.reverse();

  const orderCount = asNumber(orders.orderCount);
  const revenue = asNumber(orders.gmvAmount ?? orders.totalSalesAmount);
  return [{
    label: "Selected",
    orders: orderCount,
    revenue,
    averageOrderValue: orderCount ? Math.round(revenue / orderCount) : 0,
  }];
};

const SummaryDonut = ({ title, rows = [], totalLabel = "Total" }) => {
  const total = rows.reduce((sum, row) => sum + asNumber(row.count), 0);
  const donutRows = rows.filter((row) => asNumber(row.count) > 0);

  return (
    <ChartPanel title={title} data={donutRows}>
      <div className="grid min-h-[240px] gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
        <div className="relative h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutRows}
                dataKey="count"
                nameKey="status"
                innerRadius={58}
                outerRadius={82}
                paddingAngle={2}
              >
                {donutRows.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatNumber(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-[var(--admin-navy)]">{formatNumber(total)}</span>
            <span className="text-xs font-medium text-[var(--admin-muted)]">{totalLabel}</span>
          </div>
        </div>
        <div className="space-y-3">
          {donutRows.map((row, index) => {
            const count = asNumber(row.count);
            const percentage = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={row.status} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-medium text-[var(--admin-muted)]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="truncate">{row.status}</span>
                </span>
                <span className="shrink-0 font-bold text-[var(--admin-ink)]">
                  {formatNumber(count)} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </ChartPanel>
  );
};

const PerformanceOverview = ({ rows = [] }) => {
  const loading = useContext(ReportLoadingContext);
  const chartRows = rows.filter(
    (row) => asNumber(row.orders) > 0 || asNumber(row.revenue) > 0 || asNumber(row.averageOrderValue) > 0,
  );
  const maxValue = Math.max(
    ...chartRows.flatMap((row) => [
      asNumber(row.orders),
      asNumber(row.revenue),
      asNumber(row.averageOrderValue),
    ]),
    0,
  );

  return (
    <div className="admin-card overflow-hidden border-[var(--admin-line)] bg-white p-5 shadow-[var(--admin-shadow)]">
      <h3 className="text-[18px] font-bold text-[var(--admin-ink)]">Performance Overview</h3>
      <div className="mt-5 border-t border-[var(--admin-line)] pt-5">
        {loading ? (
          <PanelSkeleton />
        ) : chartRows.length ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-6 text-[12px] font-medium text-[var(--admin-muted)]">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                Order
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--admin-gold)]" />
                Revenue
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--admin-navy)]" />
                Average Order Value
              </span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartRows} margin={{ left: 0, right: 12, top: 6, bottom: 0 }}>
                <defs>
                  <linearGradient id="performanceRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--admin-gold)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--admin-gold)" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="performanceAverage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--admin-navy)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--admin-navy)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "var(--admin-muted)" }}
                  axisLine={{ stroke: "var(--admin-line-strong)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, Math.max(1, maxValue)]}
                  tick={{ fontSize: 11, fill: "var(--admin-muted)" }}
                  tickFormatter={(value) => formatNumber(value)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => [
                    name === "revenue" || name === "averageOrderValue" ? formatCurrency(value) : formatNumber(value),
                    titleize(name),
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="var(--admin-success)"
                  fill="transparent"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--admin-gold)"
                  fill="url(#performanceRevenue)"
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="averageOrderValue"
                  stroke="var(--admin-navy)"
                  fill="url(#performanceAverage)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        ) : (
          <EmptyPanel title="No chart data" text="There is no performance data for the selected date range." />
        )}
      </div>
    </div>
  );
};

const HorizontalMetricChart = ({
  title,
  rows = [],
  dataKey,
  labelKey = "chartLabel",
  valueFormatter = formatNumber,
  barColor = "var(--admin-navy)",
}) => {
  const chartRows = rows
    .filter((row) => asNumber(row[dataKey]) > 0)
    .slice(0, 8);
  const maxValue = Math.max(...chartRows.map((row) => asNumber(row[dataKey])), 0);

  return (
    <ChartPanel title={title} data={chartRows}>
      <ResponsiveContainer width="100%" height={Math.max(260, chartRows.length * 54)}>
        <BarChart
          data={chartRows}
          layout="vertical"
          barCategoryGap={18}
          margin={{ left: 16, right: 48, top: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
          <XAxis
            type="number"
            allowDecimals={false}
            domain={[0, Math.max(1, maxValue)]}
            tickCount={Math.min(5, Math.max(2, maxValue + 1))}
            tick={{ fontSize: 11, fill: "var(--admin-muted)" }}
            axisLine={{ stroke: "var(--admin-line-strong)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey={labelKey}
            width={160}
            tick={{ fontSize: 11, fill: "var(--admin-ink)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--admin-line-strong)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--admin-surface-soft)" }}
            content={<MetricTooltip valueFormatter={valueFormatter} />}
          />
          <Bar dataKey={dataKey} fill={barColor} radius={[0, 5, 5, 0]} barSize={30}>
            <LabelList
              dataKey={dataKey}
              position="right"
              formatter={valueFormatter}
              className="fill-[var(--admin-navy)] text-[11px] font-bold"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
};

export const SalesReport = () => {
  const { filters, data, loading, error, refresh } = useMarketplaceAnalytics();
  const sellerView = isSellerPanel();
  const orders = data.orders || {};
  const payments = data.payments || {};
  const returns = data.returns || {};
  const orderStatusRows = sellerView
    ? orderStatusRowsFromRecentOrders(data.recentOrders)
    : listFrom(orders.statusBreakdown);
  const paymentRows = statusRows(payments);
  const performanceRows = performanceRowsFromAnalytics({
    recentOrders: data.recentOrders,
    orders,
  });

  const stats = [
    { label: "Total Revenue", value: formatCurrency(orders.gmvAmount ?? orders.totalSalesAmount), sub: "GMV in selected range" },
    { label: "Total Orders", value: formatNumber(orders.orderCount), sub: "All order statuses" },
    { label: "Delivered Orders", value: formatNumber(orders.deliveredOrders), sub: "Completed fulfilment" },
    { label: "Refund Amount", value: formatCurrency(returns.refundAmount), sub: "Return refunds" },
  ];

  return (
    <ReportShell
      title={sellerView ? "Sales Report" : "Sales Reports"}
      subtitle={sellerView ? "Revenue and order status for your seller account" : "Revenue, order status, payments, and refunds from live marketplace analytics"}
      breadcrumbs={[{ label: sellerView ? SELLER_REPORT_CRUMB : "Reports & Analytics" }, { label: sellerView ? "Sales Report" : "Sales Reports" }]}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onRefresh={refresh}
      exportEndpoint={sellerView ? null : ENDPOINTS.operationsReports.orders}
      exportFilename={sellerView ? null : "sales-report.csv"}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <PerformanceOverview rows={performanceRows} />
        <SummaryDonut title="Order Status" rows={orderStatusRows} totalLabel="Total Orders" />
        {!sellerView && <SummaryDonut title="Payment Status" rows={paymentRows} totalLabel="Payments" />}
      </div>
    </ReportShell>
  );
};

export const ProductAnalytics = () => {
  const filters = useReportFilters();
  const sellerView = isSellerPanel();
  const loadData = useCallback(async ({ fromDate, toDate }) => {
    const [topProducts, inventoryStats] = await Promise.all([
      fetchJson(ENDPOINTS.products.analyticsTop, { limit: 10, metric: "purchases", fromDate, toDate }),
      fetchJson(ENDPOINTS.products.inventoryStats),
    ]);
    return { topProducts: listFrom(topProducts), inventoryStats };
  }, []);
  const { data, loading, error, refresh } = useApiReport(loadData, filters);
  const products = listFrom(data.topProducts);
  const inventory = data.inventoryStats || {};
  const purchaseTotal = products.reduce((sum, product) => sum + asNumber(product.analytics?.purchases), 0);
  const revenueTotal = products.reduce((sum, product) => sum + asNumber(product.analytics?.revenue), 0);

  const rows = products.map((product) => ({
    id: product._id || product.id,
    title: product.title || product.name || "Untitled",
    chartLabel: truncateLabel(product.title || product.name || "Untitled", 26),
    sku: product.sku || "-",
    price: formatCurrency(product.price),
    purchases: asNumber(product.analytics?.purchases),
    revenue: asNumber(product.analytics?.revenue),
    views: asNumber(product.analytics?.views),
  }));

  const stats = [
    { label: "Total Products", value: formatNumber(inventory.totalProducts), sub: "Current catalog" },
    { label: "Top Product Purchases", value: formatNumber(purchaseTotal), sub: "Top 10 products" },
    { label: "Top Product Revenue", value: formatCurrency(revenueTotal), sub: "Tracked product analytics" },
    { label: "Out of Stock", value: formatNumber(inventory.outOfStockCount), sub: "Current inventory" },
  ];

  return (
    <ReportShell
      title={sellerView ? "Product Report" : "Product Analytics"}
      subtitle={sellerView ? "Top-selling products and catalog health for your seller account" : "Top-selling products and current catalog health from product analytics APIs"}
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
        <HorizontalMetricChart
          title="Top Products by Purchases"
          rows={rows}
          dataKey="purchases"
          barColor="var(--admin-navy)"
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
  const stockRows = [
    { status: "Total Stock", count: asNumber(statsData.totalStock) },
    { status: "Reserved", count: asNumber(statsData.totalReserved) },
    { status: "Low Stock", count: asNumber(statsData.lowStockCount) },
    { status: "Out of Stock", count: asNumber(statsData.outOfStockCount) },
  ];
  const lowStockRows = listFrom(data.lowStock).map((product) => ({
    id: product._id || product.id,
    title: product.title || product.name || "Untitled",
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
      subtitle={sellerView ? "Current stock health and low-stock products for your seller account" : "Current stock health and low-stock products from inventory APIs"}
      breadcrumbs={[{ label: sellerView ? SELLER_REPORT_CRUMB : "Reports & Analytics" }, { label: sellerView ? "Inventory Report" : "Inventory Analytics" }]}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onRefresh={refresh}
      exportEndpoint={sellerView ? null : ENDPOINTS.operationsReports.inventory}
      exportFilename={sellerView ? null : "inventory-report.csv"}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryDonut title="Stock Health" rows={stockRows} totalLabel="Units" />
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
        <HorizontalMetricChart
          title="Top Sellers by GMV"
          rows={rows}
          dataKey="gmvAmount"
          valueFormatter={formatCurrency}
          barColor="var(--admin-navy)"
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
  const orderStatusRows = sellerView
    ? orderStatusRowsFromRecentOrders(marketplace.recentOrders)
    : listFrom(orders.statusBreakdown);
  const performanceRows = performanceRowsFromAnalytics({
    recentOrders: marketplace.recentOrders,
    orders,
  });
  const sellerRows = listFrom(marketplace.sellerPerformance).map((seller) => ({
    sellerName: seller.sellerName || seller.sellerId,
    chartLabel: truncateLabel(seller.sellerName || seller.sellerId, 26),
    gmvAmount: asNumber(seller.gmvAmount),
  }));
  const productRows = listFrom(data.topProducts).map((product) => ({
    title: product.title || product.name || "Untitled",
    chartLabel: truncateLabel(product.title || product.name || "Untitled", 24),
    purchases: asNumber(product.analytics?.purchases),
  }));
  const stats = [
    { label: "Total Revenue", value: formatCurrency(orders.gmvAmount ?? orders.totalSalesAmount), sub: "GMV in selected range" },
    { label: "Total Orders", value: formatNumber(orders.orderCount), sub: "All order statuses" },
    { label: "Return Requests", value: formatNumber(returns.returnCount), sub: "Return workflow" },
    { label: "Pending Payouts", value: formatCurrency(payouts.byStatus?.pending?.netAmount), sub: "Seller settlements" },
  ];

  return (
    <ReportShell
      title="Analytics Dashboard"
      subtitle={sellerView ? "Live seller metrics for orders, returns, products, inventory, and wallet activity" : "Live marketplace metrics for orders, returns, payouts, sellers, products, and inventory"}
      breadcrumbs={[{ label: sellerView ? SELLER_REPORT_CRUMB : "Reports & Analytics" }, { label: "Analytics Dashboard" }]}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onRefresh={refresh}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <PerformanceOverview rows={performanceRows} />
        <SummaryDonut title="Order Status" rows={orderStatusRows} totalLabel="Total Orders" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {!sellerView && (
          <HorizontalMetricChart
            title="Top Sellers by GMV"
            rows={sellerRows}
            dataKey="gmvAmount"
            valueFormatter={formatCurrency}
            barColor="var(--admin-gold)"
          />
        )}
        <div className={sellerView ? "xl:col-span-2" : ""}>
          <HorizontalMetricChart
            title="Top Products by Purchases"
            rows={productRows}
            dataKey="purchases"
            barColor="var(--admin-navy)"
          />
        </div>
      </div>
    </ReportShell>
  );
};
