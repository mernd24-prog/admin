import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { MdCalendarToday } from "react-icons/md";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDashboardOverview } from "../../Redux/adminCoreSlice";
import Cards from "../../components/Cards/Cards";
import { formatLabel } from "../../utils/formatters";

const EMPTY_PERFORMANCE = [
  { label: "Mon", value: 0, revenue: 0, averageOrderValue: 0 },
  { label: "Tue", value: 0, revenue: 0, averageOrderValue: 0 },
  { label: "Wed", value: 0, revenue: 0, averageOrderValue: 0 },
  { label: "Thu", value: 0, revenue: 0, averageOrderValue: 0 },
  { label: "Fri", value: 0, revenue: 0, averageOrderValue: 0 },
  { label: "Sat", value: 0, revenue: 0, averageOrderValue: 0 },
  { label: "Sun", value: 0, revenue: 0, averageOrderValue: 0 },
];

const RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Last Week", value: "last_week" },
  { label: "Last Month", value: "last_month" },
  { label: "This Year", value: "year" },
  { label: "Custom Range", value: "custom" },
];

const CHART_OPTIONS = [
  { label: "Performance", value: "performance" },
  { label: "Top Products", value: "top_products" },
  { label: "Recent Orders", value: "recent_orders" },
];

const integerFormatter = new Intl.NumberFormat("en-IN");
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
});
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRangeDates = (range) => {
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  if (range === "last_week") {
    start.setDate(today.getDate() + mondayOffset - 7);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
  } else if (range === "last_month") {
    start.setMonth(today.getMonth() - 1, 1);
    end.setMonth(today.getMonth(), 0);
  } else if (range === "year") {
    start.setMonth(0, 1);
  } else if (range === "today") {
    start.setTime(today.getTime());
  }

  return {
    fromDate: toInputDate(start),
    toDate: toInputDate(end),
  };
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
      value: toInputDate(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === viewDate.getMonth(),
    };
  });
};

const isBetweenDates = (value, start, end) =>
  Boolean(start && end && value >= start && value <= end);

const formatNumber = (value) => integerFormatter.format(asNumber(value));
const formatCurrency = (value) => currencyFormatter.format(asNumber(value));
const formatTrend = (value) => {
  const number = asNumber(value);
  return `${number > 0 ? "+" : ""}${number}%`;
};
const isNegativeTrend = (value) => asNumber(value) < 0;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const formatRangeLabel = ({ fromDate, toDate } = {}) => {
  if (!fromDate || !toDate) return "Custom Range";
  return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
};

const statusStyle = (status = "") => {
  const nextStatus = String(status).toLowerCase();
  if (
    ["delivered", "paid", "shipped", "captured", "completed"].includes(
      nextStatus,
    )
  ) {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }
  if (["cancelled", "failed", "rejected", "returned"].includes(nextStatus)) {
    return "border-red-100 bg-red-50 text-red-600";
  }
  return "border-amber-100 bg-amber-50 text-amber-600";
};

const STATUS_COLORS = {
  delivered: "#37B446",
  processing: "#E79A12",
  shipped: "#1F1B5F",
  cancelled: "#FF453D",
  returned: "#24B8C3",
  pending: "#D6A323",
};

function EmptyTableRow({ colSpan, children }) {
  return (
    <tr>
      <td
        className="px-4 py-10 text-center text-xs text-slate-400"
        colSpan={colSpan}
      >
        {children}
      </td>
    </tr>
  );
}

function GoldDropdown({ icon, options, value, onChange, className = "", displayLabel }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={dropdownRef} className={`relative w-full sm:w-[170px] ${className}`}>
      <button
        type="button"
        className="flex min-h-8 w-full items-center justify-between gap-2 rounded border border-[var(--admin-gold)] bg-[#fff8e6] px-3 text-xs font-semibold text-[var(--admin-gold-dark)] transition hover:bg-[#fff3cc] focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate">{displayLabel || selected?.label}</span>
        </span>
        <span className="text-[10px] leading-none">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-md border border-[var(--admin-gold)] bg-white py-1 shadow-lg">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={`block w-full px-3 py-2 text-left text-xs font-semibold transition ${
                  isSelected
                    ? "bg-[var(--admin-gold)] text-white"
                    : "text-[var(--admin-ink)] hover:bg-[#fff3cc] hover:text-[var(--admin-gold-dark)]"
                }`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GoldDateRangeCalendar({
  dates,
  viewDate,
  onViewDateChange,
  onSelectDate,
  onApply,
  onCancel,
  loading,
  className = "",
}) {
  const days = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const hasCompleteRange = Boolean(dates.fromDate && dates.toDate);

  return (
    <div className={`w-full rounded-lg border border-[var(--admin-gold)] bg-white p-3 shadow-xl ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded border border-[var(--admin-gold)] bg-[#fff8e6] text-sm font-bold text-[var(--admin-gold-dark)] hover:bg-[#fff3cc]"
          onClick={() => onViewDateChange(addMonths(viewDate, -1))}
          disabled={loading}
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-[var(--admin-ink)]">
            {monthFormatter.format(viewDate)}
          </h2>
          <p className="text-[11px] font-medium text-[var(--admin-muted)]">
            Select start and end date
          </p>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded border border-[var(--admin-gold)] bg-[#fff8e6] text-sm font-bold text-[var(--admin-gold-dark)] hover:bg-[#fff3cc]"
          onClick={() => onViewDateChange(addMonths(viewDate, 1))}
          disabled={loading}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[var(--admin-muted)]">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isStart = day.value === dates.fromDate;
          const isEnd = day.value === dates.toDate;
          const isSelected = isStart || isEnd;
          const isInRange = isBetweenDates(day.value, dates.fromDate, dates.toDate);
          return (
            <button
              key={day.value}
              type="button"
              className={`flex h-9 items-center justify-center rounded text-xs font-semibold transition ${
                isSelected
                  ? "bg-[var(--admin-gold)] text-white shadow-sm"
                  : isInRange
                    ? "bg-[#fff3cc] text-[var(--admin-gold-dark)]"
                    : day.isCurrentMonth
                      ? "text-[var(--admin-ink)] hover:bg-[#fff8e6] hover:text-[var(--admin-gold-dark)]"
                      : "text-slate-300 hover:bg-slate-50"
              }`}
              onClick={() => onSelectDate(day.value)}
              disabled={loading}
            >
              {day.day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded border border-[#f1dfad] bg-[#fffaf0] px-3 py-2 text-[11px] font-semibold text-[var(--admin-gold-dark)]">
        {dates.fromDate || "Start date"} - {dates.toDate || "End date"}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          className="inline-flex min-h-8 items-center justify-center rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="inline-flex min-h-8 min-w-[86px] items-center justify-center rounded border border-[var(--admin-gold)] bg-[#fff8e6] px-3 text-xs font-semibold text-[var(--admin-gold-dark)] transition hover:bg-[#fff3cc] focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={!hasCompleteRange || loading}
          onClick={onApply}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--admin-gold)] border-t-transparent" />
              Loading
            </span>
          ) : "Apply"}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [range, setRange] = useState("year");
  const [dateFilters, setDateFilters] = useState(() => getRangeDates("year"));
  const [customDates, setCustomDates] = useState(() => getRangeDates("year"));
  const [customCalendarViewDate, setCustomCalendarViewDate] = useState(() => new Date());
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [customApplying, setCustomApplying] = useState(false);
  const closeCustomPickerAfterLoadRef = useRef(false);
  const [chartView, setChartView] = useState("performance");
  const dashboardState = useSelector(
    (state) => state.adminCore?.dashboardOverviewData,
  );
  const isLoading = useSelector((state) => state.adminCore?.loading);
  const overview = useMemo(
    () => dashboardState?.normalized?.data || dashboardState?.data?.data || {},
    [dashboardState],
  );

  useEffect(() => {
    let active = true;
    dispatch(getDashboardOverview(dateFilters)).finally(() => {
      if (active && closeCustomPickerAfterLoadRef.current) {
        closeCustomPickerAfterLoadRef.current = false;
        setCustomApplying(false);
        setCustomPickerOpen(false);
      }
    });
    return () => {
      active = false;
    };
  }, [dateFilters, dispatch]);

  const handleRangeChange = (nextRange) => {
    if (nextRange === "custom") {
      setCustomDates(dateFilters);
      setCustomCalendarViewDate(new Date());
      setCustomPickerOpen(true);
      return;
    }

    const nextDates = getRangeDates(nextRange);
    setRange(nextRange);
    setDateFilters(nextDates);
    setCustomDates(nextDates);
    setCustomCalendarViewDate(new Date());
  };

  const handleCustomCalendarSelect = (value) => {
    const selectedDate = parseInputDate(value);
    if (!selectedDate) return;

    setCustomCalendarViewDate(selectedDate);
    setCustomDates((current) => {
      if (!current.fromDate || current.toDate) {
        return { fromDate: value, toDate: "" };
      }

      if (value < current.fromDate) {
        return { fromDate: value, toDate: current.fromDate };
      }

      return { ...current, toDate: value };
    });
  };

  const applyCustomDateRange = () => {
    if (!customDates.fromDate || !customDates.toDate) return;
    const fromTime = new Date(customDates.fromDate).getTime();
    const toTime = new Date(customDates.toDate).getTime();
    if (Number.isNaN(fromTime) || Number.isNaN(toTime)) return;

    const nextDates = fromTime <= toTime
      ? customDates
      : { fromDate: customDates.toDate, toDate: customDates.fromDate };
    setCustomDates(nextDates);
    setRange("custom");
    setCustomApplying(true);
    closeCustomPickerAfterLoadRef.current = true;

    if (
      nextDates.fromDate === dateFilters.fromDate &&
      nextDates.toDate === dateFilters.toDate
    ) {
      dispatch(getDashboardOverview(nextDates)).finally(() => {
        closeCustomPickerAfterLoadRef.current = false;
        setCustomApplying(false);
        setCustomPickerOpen(false);
      });
      return;
    }

    setDateFilters(nextDates);
  };

  const closeCustomPicker = () => {
    if (customApplying) return;
    setCustomPickerOpen(false);
    if (range !== "custom") {
      setCustomDates(dateFilters);
    }
  };

  const metrics = useMemo(() => {
    const sellerMetrics = overview?.metrics || {};
    const commerce = overview?.commerce || {};
    const payouts = overview?.payouts || {};
    const trends = overview?.trends || {};

    return [
      {
        icon: "/icons/shopping.png",
        iconBg: "#04258633",
        iconColor: "#0f4bb3",
        label: "Total Orders",
        route: "/app/orders",
        value: formatNumber(sellerMetrics.totalOrders ?? commerce.totalOrders),
        helper: "vs last month",
        trend: formatTrend(trends.totalOrders),
        trendNegative: isNegativeTrend(trends.totalOrders),
      },
      {
        icon: "/icons/revenue.png",
        iconBg: "#cce8c9",
        iconColor: "#1d9b50",
        label: "Total Revenue ( GMV )",
        route: "/app/payments",
        value: formatCurrency(sellerMetrics.gmv ?? commerce.gmv),
        helper: "vs last month",
        trend: formatTrend(trends.gmv),
        trendNegative: isNegativeTrend(trends.gmv),
      },
      {
        icon: "/icons/order.png",
        iconBg: "#e3d4ff",
        iconColor: "#8d5cf6",
        label: "Orders Today",
        route: "/app/orders",
        value: formatNumber(
          sellerMetrics.ordersToday ??
            commerce.ordersToday ??
            overview.ordersToday,
        ),
        helper: "today",
      },
      {
        icon: "/icons/sold.png",
        iconBg: "#ffe5b5",
        iconColor: "#f5a300",
        label: "Units Sold",
        route: "/app/inventory",
        value: formatNumber(
          sellerMetrics.unitsSold ?? commerce.unitsSold ?? overview.unitsSold,
        ),
        helper: "from order items",
      },
      {
        icon: "/icons/pending.png",
        iconBg: "#ffd4d2",
        iconColor: "#ff4b55",
        label: "Pending Payouts",
        route: "/app/seller-payouts",
        value: formatCurrency(
          sellerMetrics.pendingPayouts ??
            payouts.pendingAmount ??
            overview.pendingPayouts,
        ),
        helper: "pending amount",
        warning: true,
      },
      {
        icon: "/icons/return.png",
        iconBg: "#bfeee8",
        iconColor: "#16b8af",
        label: "Returned Orders",
        route: "/app/returns",
        value: formatNumber(
          sellerMetrics.returnedOrders ??
            commerce.returnedOrders ??
            overview.returnedOrders,
        ),
        helper: "vs last month",
        trend: formatTrend(trends.returnedOrders),
        trendNegative: isNegativeTrend(trends.returnedOrders),
      },
    ];
  }, [overview]);

  const recentOrders = useMemo(
    () => (Array.isArray(overview?.recentOrders) ? overview.recentOrders : []),
    [overview],
  );

  const performanceData = useMemo(() => {
    const source =
      overview?.orderPerformance ||
      overview?.ordersPerformance ||
      overview?.salesTrend;
    if (!Array.isArray(source) || source.length === 0) {
      if (!recentOrders.length) return EMPTY_PERFORMANCE;

      const weekdayCounts = recentOrders.reduce((acc, order) => {
        const rawDate = order.created_at || order.createdAt || order.date;
        const date = rawDate ? new Date(rawDate) : null;
        if (!date || Number.isNaN(date.getTime())) return acc;
        const label = date.toLocaleDateString("en-IN", { weekday: "short" });
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {});

      return EMPTY_PERFORMANCE.map((item) => ({
        ...item,
        value: weekdayCounts[item.label] || 0,
      }));
    }

    return source.map((item, index) => ({
      label: item.label || item.name || item.date || `Day ${index + 1}`,
      value: asNumber(
        item.value ?? item.orders ?? item.totalOrders ?? item.total,
      ),
      revenue: asNumber(item.revenue ?? item.gmv ?? item.totalRevenue),
      averageOrderValue: asNumber(
        item.averageOrderValue ??
          item.aov ??
          (asNumber(item.revenue ?? item.gmv ?? item.totalRevenue) /
            Math.max(
              asNumber(item.value ?? item.orders ?? item.totalOrders ?? item.total),
              1,
            )),
      ),
    }));
  }, [overview, recentOrders]);

  const topProducts = useMemo(
    () =>
      Array.isArray(overview?.topProducts)
        ? overview.topProducts.filter((product) =>
            Boolean(product?.name || product?.title),
          )
        : [],
    [overview],
  );
  const topProductChartData = useMemo(
    () =>
      topProducts.slice(0, 8).map((product) => ({
        label: String(product.name || product.title || "Product").slice(0, 18),
        orders: asNumber(product.units_sold ?? product.unitsSold),
        revenue: asNumber(product.revenue),
      })),
    [topProducts],
  );
  const recentOrderChartData = useMemo(
    () =>
      recentOrders.slice(0, 8).map((order, index) => ({
        label:
          order.orderNumber ||
          order.order_number ||
          `#${String(order.id || order._id || index + 1).slice(0, 6)}`,
        revenue: asNumber(
          order.seller_order_total ??
            order.payable_amount ??
            order.totalAmount ??
            order.total,
        ),
        orders: 1,
      })),
    [recentOrders],
  );
  const activeChartData = useMemo(() => {
    if (chartView === "top_products") return topProductChartData;
    if (chartView === "recent_orders") return recentOrderChartData;
    return performanceData;
  }, [chartView, performanceData, recentOrderChartData, topProductChartData]);
  const chartRenderKey = `${chartView}:${dateFilters.fromDate}:${dateFilters.toDate}`;
  const hasActiveChartData = activeChartData.some(
    (item) => item.value > 0 || item.orders > 0 || item.revenue > 0 || item.averageOrderValue > 0,
  );
  const statusRows = useMemo(() => {
    const source = overview?.orderStatus || overview?.statusBreakdown;
    if (Array.isArray(source) && source.length) {
      return source.map((row) => {
        const name = String(row.name || row.status || "pending")
          .toLowerCase()
          .replace(/\s+/g, "_");
        return {
          name,
          label: row.label || name.replace(/_/g, " "),
          value: asNumber(row.value ?? row.total ?? row.count),
          color: row.color || STATUS_COLORS[name] || STATUS_COLORS.pending,
        };
      });
    }

    const counts = recentOrders.reduce((acc, order) => {
      const key = String(order.status || order.paymentStatus || "Pending")
        .toLowerCase()
        .replace(/\s+/g, "_");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const rows = Object.entries(counts).map(([name, value]) => ({
      name,
      label: name.replace(/_/g, " "),
      value,
      color: STATUS_COLORS[name] || STATUS_COLORS.pending,
    }));
    return rows;
  }, [overview, recentOrders]);
  const statusTotal = statusRows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="admin-page min-h-screen">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[18px] font-inter font-bold text-[var(--admin-ink)]">
            Merchant Insights
          </h1>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <GoldDropdown
              icon={<MdCalendarToday className="h-3.5 w-3.5" />}
              options={RANGE_OPTIONS}
              value={range}
              onChange={handleRangeChange}
              displayLabel={range === "custom" ? formatRangeLabel(dateFilters) : undefined}
              className={range === "custom" ? "sm:w-[220px]" : undefined}
            />
            <GoldDropdown
              options={CHART_OPTIONS}
              value={chartView}
              onChange={setChartView}
              className="sm:w-[170px]"
            />
          </div>
        </div>

        {customPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
            <div className="w-full max-w-[380px] rounded-lg border border-[var(--admin-gold)] bg-white p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[var(--admin-ink)]">
                    Select Date Range
                  </h2>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    Dashboard data will update after apply.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded border border-transparent px-2 py-1 text-lg leading-none text-slate-400 hover:border-slate-200 hover:text-slate-700"
                  onClick={closeCustomPicker}
                  disabled={customApplying}
                  aria-label="Close custom date picker"
                >
                  ×
                </button>
              </div>

              <GoldDateRangeCalendar
                dates={customDates}
                viewDate={customCalendarViewDate}
                onViewDateChange={setCustomCalendarViewDate}
                onSelectDate={handleCustomCalendarSelect}
                onApply={applyCustomDateRange}
                onCancel={closeCustomPicker}
                loading={customApplying}
                className="shadow-none"
              />
            </div>
          </div>
        )}

        {isLoading && !dashboardState?.normalized?.data && (
          <p className="mb-4 text-xs text-slate-400">
            Loading dashboard data...
          </p>
        )}

        {/* Cards UI */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {metrics.map((metric) => (
            <Cards
              key={metric.label}
              {...metric}
              onClick={() => navigate(metric.route)}
            />
          ))}
        </div>

        <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,0.95fr)]">
          <section className="admin-card p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--admin-line)] pb-3">
              <div>
                <h2 className="text-[17px] font-inter font-bold text-[var(--admin-ink)]">
                  Performance Overview
                </h2>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-5 text-[11px] font-medium text-[var(--admin-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                {chartView === "performance" ? "Order" : "Units / Orders"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--admin-gold)]" />
                Revenue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--admin-navy)]" />
                Average Order Value
              </span>
            </div>
            <div className="h-[270px] w-full text-xs">
              <ResponsiveContainer key={chartRenderKey} width="100%" height="100%">
                {chartView === "performance" ? (
                  <AreaChart
                    data={activeChartData}
                    margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="ordersPerformanceFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#37B446" stopOpacity={0.34} />
                        <stop offset="95%" stopColor="#37B446" stopOpacity={0.07} />
                      </linearGradient>
                      <linearGradient
                        id="revenuePerformanceFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#D6A323" stopOpacity={0.38} />
                        <stop offset="95%" stopColor="#D6A323" stopOpacity={0.08} />
                      </linearGradient>
                      <linearGradient
                        id="aovPerformanceFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#1F1B5F" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1F1B5F" stopOpacity={0.06} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#EADFCE" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#777487", fontSize: 10 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#777487", fontSize: 10 }}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "Revenue" || name === "Average Order Value"
                          ? formatCurrency(value)
                          : formatNumber(value),
                        name,
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Orders"
                      stroke="#37B446"
                      strokeWidth={2}
                      fill="url(#ordersPerformanceFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#D6A323"
                      strokeWidth={2}
                      fill="url(#revenuePerformanceFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="averageOrderValue"
                      name="Average Order Value"
                      stroke="#1F1B5F"
                      strokeWidth={2}
                      fill="url(#aovPerformanceFill)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={activeChartData}
                    margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="#EADFCE" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#777487", fontSize: 10 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#777487", fontSize: 10 }}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "Revenue" ? formatCurrency(value) : formatNumber(value),
                        name,
                      ]}
                    />
                    <Bar
                      dataKey="orders"
                      name={chartView === "top_products" ? "Units Sold" : "Orders"}
                      fill="#37B446"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#D6A323"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            {!hasActiveChartData && (
              <p className="-mt-4 text-center text-[11px] text-slate-400">
                Chart data is not available yet.
              </p>
            )}
          </section>

          <section className="admin-card p-5">
            <div className="mb-4 border-b border-[var(--admin-line)] pb-3">
              <h2 className="text-[17px] font-inter font-bold text-[var(--admin-ink)]">
                Order Status
              </h2>
            </div>
            <div className="grid items-center gap-4 sm:grid-cols-[160px_1fr] xl:grid-cols-1 2xl:grid-cols-[170px_1fr]">
              <div className="relative h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusRows}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={48}
                      outerRadius={74}
                      paddingAngle={1}
                    >
                      {statusRows.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[21px] font-bold text-[var(--admin-ink)]">
                    {formatNumber(statusTotal)}
                  </span>
                  <span className="text-[10px] text-[var(--admin-muted)]">
                    Total Orders
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {statusRows.slice(0, 5).map((row) => (
                  <div key={row.name} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-2 capitalize text-[var(--admin-ink)]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
                      {row.label}
                    </span>
                    <span className="font-semibold text-[var(--admin-ink)]">
                      {formatNumber(row.value)}
                      {statusTotal ? ` (${Math.round((row.value / statusTotal) * 100)}%)` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          
          </section>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="admin-card overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
              <h2 className="text-[17px] font-bold font-inter text-[var(--admin-ink)]">
                Top Products
              </h2>
              <button
                type="button"
                className="inline-flex min-h-7 items-center justify-center rounded border border-[var(--admin-gold)] bg-[#fff8e6] px-3 text-[11px] font-semibold text-[var(--admin-gold-dark)] transition hover:bg-[#fff3cc] focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                onClick={() => navigate("/app/product-catalog")}
              >
                See All
              </button>
            </div>
            <table className="w-full text-left">
              <thead className="admin-table-head font-inter text-[12px]">
                <tr>
                  <th className="px-5 py-3  font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Units Sold</th>
                  <th className="px-4 py-3 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody className="text-[12px] text-slate-600">
                {topProducts.length === 0 && (
                  <EmptyTableRow colSpan={3}>
                    No top products available.
                  </EmptyTableRow>
                )}
                {topProducts.map((product, index) => {
                  const productId = product.product_id || product.productId || product._id || product.id;
                  const productName = product.name || product.title || "Untitled product";

                  return (
                    <tr
                      key={productId || index}
                      className="border-b border-[#f0e8dc] last:border-0 hover:bg-[var(--admin-surface-soft)]"
                    >
                      <td className="px-5 py-3 font-medium text-slate-700">
                        {productId ? (
                          <Link
                            to={`/app/product-catalog/view/${productId}`}
                            className="line-clamp-1 max-w-[220px] break-normal font-semibold text-[var(--admin-ink)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-blue)]"
                            title={productName}
                          >
                            {productName}
                          </Link>
                        ) : (
                          <span className="line-clamp-1 max-w-[220px] break-normal" title={productName}>
                            {productName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(product.units_sold ?? product.unitsSold)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(product.revenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="admin-card overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
              <h2 className="text-[17px] font-bold font-inter text-[var(--admin-ink)]">
                Recent Orders
              </h2>
              <button
                type="button"
                className="inline-flex min-h-7 items-center justify-center rounded border border-[var(--admin-gold)] bg-[#fff8e6] px-3 text-[11px] font-semibold text-[var(--admin-gold-dark)] transition hover:bg-[#fff3cc] focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
                onClick={() => navigate("/app/orders")}
              >
                See All
              </button>
            </div>
            <table className="w-full text-left">
              <thead className="admin-table-head  font-inter text-[12px]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order ID</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-[12px] text-slate-600">
                {recentOrders.length === 0 && (
                  <EmptyTableRow colSpan={5}>
                    No recent orders available.
                  </EmptyTableRow>
                )}
                {recentOrders.map((order, index) => {
                  const status =
                    order.status || order.paymentStatus || "Pending";
                  const orderId =
                    order._id ||
                    order.id ||
                    order.orderId ||
                    order.order_id ||
                    order.order_no;
                  const orderNumber =
                    order.orderNumber ||
                    order.order_number ||
                    order.order_no ||
                    String(orderId || index + 1).slice(0, 10);
                  return (
                    <tr
                      key={orderId || index}
                      className="border-b border-[#f0e8dc] last:border-0 hover:bg-[var(--admin-surface-soft)]"
                    >
                      <td className="px-4 py-3 font-medium">
                        {orderId ? (
                          <Link
                            to={`/app/orders/view/${orderId}`}
                            className="font-mono font-semibold text-[var(--admin-navy)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-blue)]"
                            title={`View order #${orderNumber}`}
                          >
                            #{orderNumber}
                          </Link>
                        ) : (
                          <span className="font-mono">#{orderNumber}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {order.customerName ||
                          order.customer ||
                          order.buyer_id ||
                          order.buyerId ||
                          "-"}
                      </td>
                      <td className="px-4 py-3">
                        {formatDate(
                          order.created_at || order.createdAt || order.date,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(
                          order.seller_order_total ??
                            order.payable_amount ??
                            order.totalAmount ??
                            order.total,
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold capitalize ${statusStyle(status)}`}
                        >
                          {formatLabel(status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
    </div>
  );
}
