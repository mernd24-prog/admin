import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MdCalendarToday } from "react-icons/md";
import {
  Area,
  AreaChart,
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
  { label: "Mon", value: 0 },
  { label: "Tue", value: 0 },
  { label: "Wed", value: 0 },
  { label: "Thu", value: 0 },
  { label: "Fri", value: 0 },
  { label: "Sat", value: 0 },
  { label: "Sun", value: 0 },
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

export default function Dashboard() {
  const dispatch = useDispatch();
  const dashboardState = useSelector(
    (state) => state.adminCore?.dashboardOverviewData,
  );
  const isLoading = useSelector((state) => state.adminCore?.loading);
  const overview = useMemo(
    () => dashboardState?.normalized?.data || dashboardState?.data?.data || {},
    [dashboardState],
  );

  useEffect(() => {
    dispatch(getDashboardOverview());
  }, [dispatch]);

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
        value: formatNumber(
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

  const performanceData = useMemo(() => {
    const source =
      overview?.orderPerformance ||
      overview?.ordersPerformance ||
      overview?.salesTrend;
    if (!Array.isArray(source) || source.length === 0) return EMPTY_PERFORMANCE;

    return source.map((item, index) => ({
      label: item.label || item.name || item.date || `Day ${index + 1}`,
      value: asNumber(
        item.value ?? item.orders ?? item.totalOrders ?? item.total,
      ),
    }));
  }, [overview]);

  const hasPerformanceSeries = performanceData.some((item) => item.value > 0);
  const topProducts = useMemo(
    () =>
      Array.isArray(overview?.topProducts)
        ? overview.topProducts.filter((product) =>
            Boolean(product?.name || product?.title),
          )
        : [],
    [overview],
  );
  const recentOrders = useMemo(
    () => (Array.isArray(overview?.recentOrders) ? overview.recentOrders : []),
    [overview],
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
            <Cards key={metric.label} {...metric} />
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
              <button type="button" className="admin-btn-secondary !min-h-8 !px-3 !text-xs">
                <MdCalendarToday className="h-3.5 w-3.5" />
                This Year
              </button>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-5 text-[11px] font-medium text-[var(--admin-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--admin-gold)]" />
                Order
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
                <AreaChart
                  data={performanceData}
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
                      <stop offset="5%" stopColor="#D6A323" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#D6A323" stopOpacity={0.01} />
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
                    formatter={(value) => [formatNumber(value), "Orders"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#D6A323"
                    strokeWidth={2}
                    fill="url(#ordersPerformanceFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {!hasPerformanceSeries && (
              <p className="-mt-4 text-center text-[11px] text-slate-400">
                Performance trend data is not available yet.
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
            <button type="button" className="mt-4 text-xs font-semibold text-[var(--admin-gold-dark)] hover:text-[var(--admin-navy)]">
              View Detailed Report
            </button>
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
                <button type="button" className="admin-btn-secondary !min-h-7 !px-3 !text-[11px]">
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
              <button type="button" className="admin-btn-secondary !min-h-7 !px-3 !text-[11px]">
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