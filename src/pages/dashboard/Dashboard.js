import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
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

function GoldDropdown({ icon, options, value, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <div className={`relative w-full sm:w-[170px] ${className}`}>
      <button
        type="button"
        className="flex min-h-8 w-full items-center justify-between gap-2 rounded border border-[var(--admin-gold)] bg-[#fff8e6] px-3 text-xs font-semibold text-[var(--admin-gold-dark)] transition hover:bg-[#fff3cc] focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate">{selected?.label}</span>
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

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [range, setRange] = useState("year");
  const [dateFilters, setDateFilters] = useState(() => getRangeDates("year"));
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
    dispatch(getDashboardOverview(dateFilters));
  }, [dateFilters, dispatch]);

  const handleRangeChange = (nextRange) => {
    setRange(nextRange);
    setDateFilters(getRangeDates(nextRange));
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
        route: "/app/inventory-overview",
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
    <div className="admin-page min-h-screen w-full px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[18px] font-inter font-bold text-[var(--admin-ink)]">
            Merchant Insights
          </h1>
        </div>

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
              <div className="flex flex-wrap items-center gap-2">
                <GoldDropdown
                  icon={<MdCalendarToday className="h-3.5 w-3.5" />}
                  options={RANGE_OPTIONS}
                  value={range}
                  onChange={handleRangeChange}
                />
                <GoldDropdown
                  options={CHART_OPTIONS}
                  value={chartView}
                  onChange={setChartView}
                  className="sm:w-[170px]"
                />
              </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-5 text-[11px] font-medium text-[var(--admin-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--admin-gold)]" />
                {chartView === "performance" ? "Order" : "Units / Orders"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--admin-success)]" />
                Revenue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--admin-navy)]" />
                Average Order Value
              </span>
            </div>
            <div className="h-[270px] w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
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
                        <stop offset="5%" stopColor="#D6A323" stopOpacity={0.38} />
                        <stop offset="95%" stopColor="#D6A323" stopOpacity={0.08} />
                      </linearGradient>
                      <linearGradient
                        id="revenuePerformanceFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#37B446" stopOpacity={0.34} />
                        <stop offset="95%" stopColor="#37B446" stopOpacity={0.07} />
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
                      stroke="#D6A323"
                      strokeWidth={2}
                      fill="url(#ordersPerformanceFill)"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#37B446"
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
                      fill="#D6A323"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill="#37B446"
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
          {topProducts.length > 0 && (
            <section className="admin-card overflow-hidden bg-white">
              <div className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
                <h2 className="text-[17px] font-bold font-inter text-[var(--admin-ink)]">
                  Top Products
                </h2>
                <button
                  type="button"
                  className="admin-btn-secondary !min-h-7 !px-3 !text-[11px]"
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
                  {topProducts.map((product, index) => (
                    <tr
                      key={product.product_id || product.productId || index}
                      className="border-b border-[#f0e8dc] last:border-0 hover:bg-[var(--admin-surface-soft)]"
                    >
                      <td className="px-5 py-3 font-medium text-slate-700">
                        {product.name || product.title}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(product.units_sold ?? product.unitsSold)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(product.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="admin-card overflow-hidden bg-white">
            <div className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
              <h2 className="text-[17px] font-bold font-inter text-[var(--admin-ink)]">
                Recent Orders
              </h2>
              <button
                type="button"
                className="admin-btn-secondary !min-h-7 !px-3 !text-[11px]"
                onClick={() => navigate("/app/orders")}
              >
                See All
              </button>
            </div>
            <table className="w-full text-left">
              <thead className="admin-table-head font-inter text-[12px]">
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
                  return (
                    <tr
                      key={order.id || order._id || index}
                      className="border-b border-[#f0e8dc] last:border-0 hover:bg-[var(--admin-surface-soft)]"
                    >
                      <td className="px-4 py-3 font-medium">
                        #
                        {order.orderNumber ||
                          order.order_number ||
                          String(order.id || order._id || index + 1).slice(
                            0,
                            10,
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
                          {status}
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
    </div>
  );
}
