import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  MdAdd,
  MdCalendarToday,
  MdCurrencyRupee,
  MdInventory2,
  MdMoreVert,
  MdOutlineFileDownload,
  MdPayments,
  MdPendingActions,
  MdShoppingCart,
  MdStorefront,
} from 'react-icons/md';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDashboardOverview } from '../../Redux/adminCoreSlice';

const EMPTY_PERFORMANCE = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 0 },
  { label: 'Wed', value: 0 },
  { label: 'Thu', value: 0 },
  { label: 'Fri', value: 0 },
  { label: 'Sat', value: 0 },
  { label: 'Sun', value: 0 },
];

const integerFormatter = new Intl.NumberFormat('en-IN');
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const asNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value) => integerFormatter.format(asNumber(value));
const formatCurrency = (value) => currencyFormatter.format(asNumber(value));

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const statusStyle = (status = '') => {
  const nextStatus = String(status).toLowerCase();
  if (['delivered', 'paid', 'shipped', 'captured', 'completed'].includes(nextStatus)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (['cancelled', 'failed', 'rejected', 'returned'].includes(nextStatus)) {
    return 'border-red-200 bg-red-50 text-red-600';
  }
  return 'border-amber-200 bg-amber-50 text-amber-600';
};

function MetricCard({ icon: Icon, label, value, helper, warning = false }) {
  return (
    <div className="rounded-xl border border-[#eee9e4] bg-white px-5 py-4 shadow-[0_1px_4px_rgba(35,29,23,0.06)]">
      <div className="mb-4 flex items-start justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${warning ? 'bg-red-600' : 'bg-[#efa817]'} text-white`}>
          <Icon className="h-4 w-4" />
        </span>
        <MdMoreVert className="h-4 w-4 text-gray-400" />
      </div>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[22px] font-bold leading-none text-[#082f91]">{value}</p>
      <p className="mt-2 text-[10px] text-slate-400">{helper}</p>
    </div>
  );
}

function EmptyTableRow({ colSpan, children }) {
  return (
    <tr>
      <td className="px-4 py-10 text-center text-xs text-slate-400" colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const dashboardState = useSelector((state) => state.adminCore?.dashboardOverviewData);
  const isLoading = useSelector((state) => state.adminCore?.loading);
  const overview = useMemo(
    () => dashboardState?.normalized?.data || dashboardState?.data?.data || {},
    [dashboardState]
  );

  useEffect(() => {
    dispatch(getDashboardOverview());
  }, [dispatch]);

  const metrics = useMemo(() => {
    const sellerMetrics = overview?.metrics || {};
    const commerce = overview?.commerce || {};
    const payouts = overview?.payouts || {};

    return [
      { icon: MdShoppingCart, label: 'Total Orders', value: formatNumber(sellerMetrics.totalOrders ?? commerce.totalOrders), helper: 'vs last month' },
      { icon: MdCurrencyRupee, label: 'Total Revenue (GMV)', value: formatCurrency(sellerMetrics.gmv ?? commerce.gmv), helper: 'vs last month' },
      { icon: MdStorefront, label: 'Orders Today', value: formatNumber(sellerMetrics.ordersToday ?? commerce.ordersToday ?? overview.ordersToday), helper: 'vs last month' },
      { icon: MdInventory2, label: 'Units Sold', value: formatNumber(sellerMetrics.unitsSold ?? commerce.unitsSold ?? overview.unitsSold), helper: 'vs last month' },
      { icon: MdPayments, label: 'Pending Payouts', value: formatCurrency(sellerMetrics.pendingPayouts ?? payouts.pendingAmount ?? overview.pendingPayouts), helper: 'vs last month', warning: true },
      { icon: MdPendingActions, label: 'Returned Orders', value: formatNumber(sellerMetrics.returnedOrders ?? commerce.returnedOrders ?? overview.returnedOrders), helper: 'vs last month' },
    ];
  }, [overview]);

  const performanceData = useMemo(() => {
    const source = overview?.orderPerformance || overview?.ordersPerformance || overview?.salesTrend;
    if (!Array.isArray(source) || source.length === 0) return EMPTY_PERFORMANCE;

    return source.map((item, index) => ({
      label: item.label || item.name || item.date || `Day ${index + 1}`,
      value: asNumber(item.value ?? item.orders ?? item.totalOrders ?? item.total),
    }));
  }, [overview]);

  const hasPerformanceSeries = performanceData.some((item) => item.value > 0);
  const topProducts = Array.isArray(overview?.topProducts) ? overview.topProducts : [];
  const recentOrders = Array.isArray(overview?.recentOrders) ? overview.recentOrders : [];

  return (
    <div className="admin-page min-h-screen w-full px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-2 inline-flex items-center rounded-sm bg-[#fff1d2] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#df9500]">
              Global Dashboard
            </span>
            <h1 className="text-xl font-bold text-[#082f91]">Merchant Insights</h1>
          </div>
          <div className="flex gap-3">
            <button type="button" className="admin-btn-secondary !min-h-[34px] !px-4 !text-[11px]">
              <MdOutlineFileDownload className="h-4 w-4" />
              Export Report
            </button>
            <button type="button" className="admin-btn-primary !min-h-[34px] !px-4 !text-[11px]">
              <MdAdd className="h-4 w-4" />
              New Listing
            </button>
          </div>
        </div>

        {isLoading && !dashboardState?.normalized?.data && (
          <p className="mb-4 text-xs text-slate-400">Loading dashboard data...</p>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>

        <section className="mb-6 rounded-xl border border-[#ebeaf1] bg-[#f7f9ff] p-5 shadow-[0_1px_4px_rgba(18,37,80,0.05)]">
          <div className="mb-5 flex flex-wrap justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#082f91]">Orders Performance</h2>
              <p className="mt-1 text-[11px] text-slate-500">Daily transactional volume for current period</p>
            </div>
            <div className="flex items-center rounded-md bg-[#e9eefc] p-1 text-[10px] font-semibold text-slate-500">
              <span className="rounded bg-[#082f91] px-4 py-2 text-white">Day</span>
              <span className="px-4 py-2">Week</span>
              <span className="px-4 py-2">Month</span>
              <MdCalendarToday className="mx-3 h-3.5 w-3.5" />
            </div>
          </div>
          <div className="h-[270px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="ordersPerformanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1f55d1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#1f55d1" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e3e8f4" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip formatter={(value) => [formatNumber(value), 'Orders']} />
                <Area type="monotone" dataKey="value" stroke="#2156d5" strokeWidth={2} fill="url(#ordersPerformanceFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {!hasPerformanceSeries && (
            <p className="-mt-4 text-center text-[11px] text-slate-400">Performance trend data is not available yet.</p>
          )}
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="admin-card overflow-hidden">
            <h2 className="px-5 py-4 text-sm font-bold text-[#082f91]">Top Products</h2>
            <table className="w-full text-left">
              <thead className="admin-table-head text-[10px]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Units Sold</th>
                  <th className="px-4 py-3 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-slate-600">
                {topProducts.length === 0 && <EmptyTableRow colSpan={3}>No product sales data available.</EmptyTableRow>}
                {topProducts.map((product, index) => (
                  <tr key={product.product_id || product.productId || index} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-700">
                      {product.name || product.title || `Product #${product.product_id || product.productId || index + 1}`}
                    </td>
                    <td className="px-4 py-3">{formatNumber(product.units_sold ?? product.unitsSold)}</td>
                    <td className="px-4 py-3">{formatCurrency(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="admin-card overflow-hidden">
            <h2 className="px-5 py-4 text-sm font-bold text-[#082f91]">Recent Orders</h2>
            <table className="w-full text-left">
              <thead className="admin-table-head text-[10px]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order ID</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px] text-slate-600">
                {recentOrders.length === 0 && <EmptyTableRow colSpan={5}>No recent orders available.</EmptyTableRow>}
                {recentOrders.map((order, index) => {
                  const status = order.status || order.paymentStatus || 'Pending';
                  return (
                    <tr key={order.id || order._id || index} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 font-medium">#{String(order.id || order._id || index + 1).slice(0, 10)}</td>
                      <td className="px-4 py-3">{order.customerName || order.customer || order.buyer_id || order.buyerId || '-'}</td>
                      <td className="px-4 py-3">{formatDate(order.created_at || order.createdAt || order.date)}</td>
                      <td className="px-4 py-3">{formatCurrency(order.seller_order_total ?? order.payable_amount ?? order.totalAmount ?? order.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold capitalize ${statusStyle(status)}`}>
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
