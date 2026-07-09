import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MdFileDownload, MdRefresh } from "react-icons/md";
import { toast } from "sonner";
import Cards from "../../components/Cards/Cards";
import { StatCardSkeletonLoader } from "../../components/Loader/SkeletonLoader";
import { PageHeader } from "../../components/Shared";
import { axiosPrivate } from "../../_helpers/axiosProvider";
import { downloadApiFile } from "../../_helpers/downloadApi";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { isSellerPanel } from "../../_helpers/panelConfig";

const RANGE_OPTIONS = ["Today", "Last 7 days", "Last 30 days", "Last 90 days"];
const CHART_COLORS = ["#1f4fb2", "#d6a323", "#24b8c3", "#37b446", "#ff453d", "#6f4edb"];

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

const StatCard = ({ label, value, sub, loading }) => (
  <div className="h-full">
    {loading ? (
      <StatCardSkeletonLoader />
    ) : (
      <Cards label={label} value={value} helper={sub} />
    )}
  </div>
);

const EmptyPanel = ({ text = "No data returned for this period." }) => (
  <div className="admin-card flex min-h-[220px] items-center justify-center p-6 text-center text-sm text-[var(--admin-muted)]">
    {text}
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
    <div className="admin-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-[var(--admin-ink)]">{title}</h3>
      {loading ? <PanelSkeleton /> : data.length ? children : <EmptyPanel text="No chart data returned." />}
    </div>
  );
};

const ReportTable = ({ title, columns = [], rows = [] }) => {
  const loading = useContext(ReportLoadingContext);
  return (
    <div className="admin-card overflow-hidden">
    <div className="border-b border-[var(--admin-line)] px-4 py-3">
      <h3 className="text-sm font-semibold text-[var(--admin-ink)]">{title}</h3>
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
          <tbody className="divide-y divide-[#f0e8dc]">
            {rows.map((row, index) => (
              <tr key={row.id || row.sellerId || row.sku || index}>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-[var(--admin-ink)]">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyPanel text="No rows returned for this report." />
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

      <section className="admin-card mb-5 p-4">
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

  const stats = [
    { label: "Total Revenue", value: formatCurrency(orders.gmvAmount ?? orders.totalSalesAmount), sub: "GMV in selected range" },
    { label: "Total Orders", value: formatNumber(orders.orderCount), sub: "All order statuses" },
    { label: "Delivered Orders", value: formatNumber(orders.deliveredOrders), sub: "Completed fulfilment" },
    { label: "Refund Amount", value: formatCurrency(returns.refundAmount), sub: "Return refunds" },
  ];

  return (
    <ReportShell
      title="Sales Reports"
      subtitle="Revenue, order status, payments, and refunds from live marketplace analytics"
      breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Sales Reports" }]}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onRefresh={refresh}
      exportEndpoint={sellerView ? null : ENDPOINTS.operationsReports.orders}
      exportFilename={sellerView ? null : "sales-report.csv"}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel title="Order Status Summary" data={orderStatusRows}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={orderStatusRows} margin={{ left: 0, right: 16, top: 4, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee8dc" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value, name) => [name === "amount" ? formatCurrency(value) : formatNumber(value), titleize(name)]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {orderStatusRows.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        {!sellerView && <ChartPanel title="Payment Status Summary" data={paymentRows}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={paymentRows} margin={{ left: 0, right: 16, top: 4, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee8dc" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Bar dataKey="count" fill="#1f4fb2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>}
      </div>
    </ReportShell>
  );
};

export const ProductAnalytics = () => {
  const filters = useReportFilters();
  const sellerView = isSellerPanel();
  const loadData = useCallback(async () => {
    const [topProducts, inventoryStats] = await Promise.all([
      fetchJson(ENDPOINTS.products.analyticsTop, { limit: 10, metric: "purchases" }),
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
      title="Product Analytics"
      subtitle="Top-selling products and current catalog health from product analytics APIs"
      breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Product Analytics" }]}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onRefresh={refresh}
      exportEndpoint={sellerView ? null : ENDPOINTS.operationsReports.products}
      exportFilename={sellerView ? null : "product-analytics.csv"}
    >
      <div className="space-y-4">
        <ChartPanel title="Top Products by Purchases" data={rows}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rows} layout="vertical" margin={{ left: 80, right: 20, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee8dc" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Bar dataKey="purchases" fill="#1f4fb2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ReportTable
          title="Top Product Details"
          rows={rows}
          columns={[
            { key: "title", label: "Product" },
            { key: "sku", label: "SKU" },
            { key: "price", label: "Price" },
            { key: "purchases", label: "Purchases", render: (value) => formatNumber(value) },
            { key: "revenue", label: "Revenue", render: (value) => formatCurrency(value) },
            { key: "views", label: "Views", render: (value) => formatNumber(value) },
          ]}
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
      const stats = await fetchJson(ENDPOINTS.products.inventoryStats);
      return { stats, lowStock: [] };
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
      title="Inventory Analytics"
      subtitle="Current stock health and low-stock products from inventory APIs"
      breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Inventory Analytics" }]}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onRefresh={refresh}
      exportEndpoint={sellerView ? null : ENDPOINTS.operationsReports.inventory}
      exportFilename={sellerView ? null : "inventory-report.csv"}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel title="Stock Health" data={stockRows.filter((row) => row.count > 0)}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={stockRows.filter((row) => row.count > 0)} dataKey="count" nameKey="status" outerRadius={94} label>
                {stockRows.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatNumber(value)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ReportTable
          title="Low Stock Products"
          rows={lowStockRows}
          columns={[
            { key: "title", label: "Product" },
            { key: "sku", label: "SKU" },
            { key: "stock", label: "Stock", render: (value) => formatNumber(value) },
            { key: "reservedStock", label: "Reserved", render: (value) => formatNumber(value) },
            { key: "availableStock", label: "Available", render: (value) => formatNumber(value) },
          ]}
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
        <ChartPanel title="Top Sellers by GMV" data={rows}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={rows} layout="vertical" margin={{ left: 90, right: 20, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee8dc" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(value) => formatCurrency(value)} />
              <YAxis type="category" dataKey="sellerName" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="gmvAmount" fill="#1f4fb2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
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
      const [sellerDashboard, topProducts, inventoryStats] = await Promise.all([
        fetchJson(ENDPOINTS.analytics.sellerDashboard, { fromDate, toDate }),
        fetchJson(ENDPOINTS.products.analyticsTop, { limit: 5, metric: "purchases" }),
        fetchJson(ENDPOINTS.products.inventoryStats),
      ]);
      return { marketplace: sellerDashboard, topProducts: listFrom(topProducts), inventoryStats };
    }
    const [marketplace, topProducts, inventoryStats] = await Promise.all([
      fetchJson(ENDPOINTS.analytics.adminDashboard, { fromDate, toDate }),
      fetchJson(ENDPOINTS.products.analyticsTop, { limit: 5, metric: "purchases" }),
      fetchJson(ENDPOINTS.inventory.stats),
    ]);
    return { marketplace, topProducts: listFrom(topProducts), inventoryStats };
  }, []);
  const { data, loading, error, refresh } = useApiReport(loadData, filters);
  const sellerView = isSellerPanel();
  const marketplace = data.marketplace || {};
  const orders = marketplace.orders || {};
  const returns = marketplace.returns || {};
  const payouts = marketplace.payouts || {};
  const inventory = data.inventoryStats || {};
  const orderStatusRows = sellerView
    ? orderStatusRowsFromRecentOrders(marketplace.recentOrders)
    : listFrom(orders.statusBreakdown);
  const sellerRows = listFrom(marketplace.sellerPerformance).map((seller) => ({
    sellerName: seller.sellerName || seller.sellerId,
    gmvAmount: asNumber(seller.gmvAmount),
  }));
  const productRows = listFrom(data.topProducts).map((product) => ({
    title: product.title || product.name || "Untitled",
    purchases: asNumber(product.analytics?.purchases),
  }));
  const stockRows = [
    { status: "Low Stock", count: asNumber(inventory.lowStockCount) },
    { status: "Out of Stock", count: asNumber(inventory.outOfStockCount) },
    { status: "Reserved", count: asNumber(inventory.totalReserved) },
  ];

  const stats = [
    { label: "Total Revenue", value: formatCurrency(orders.gmvAmount ?? orders.totalSalesAmount), sub: "GMV in selected range" },
    { label: "Total Orders", value: formatNumber(orders.orderCount), sub: "All order statuses" },
    { label: "Return Requests", value: formatNumber(returns.returnCount), sub: "Return workflow" },
    { label: "Pending Payouts", value: formatCurrency(payouts.byStatus?.pending?.netAmount), sub: "Seller settlements" },
  ];

  return (
    <ReportShell
      title="Analytics Dashboard"
      subtitle="Live marketplace metrics for orders, returns, payouts, sellers, products, and inventory"
      breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Analytics Dashboard" }]}
      stats={stats}
      loading={loading}
      error={error}
      filters={filters}
      onRefresh={refresh}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Order Status Summary" data={orderStatusRows}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={orderStatusRows} margin={{ left: 0, right: 16, top: 4, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee8dc" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Bar dataKey="count" fill="#1f4fb2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        {!sellerView && <ChartPanel title="Top Sellers by GMV" data={sellerRows}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sellerRows} layout="vertical" margin={{ left: 90, right: 20, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee8dc" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(value) => formatCurrency(value)} />
              <YAxis type="category" dataKey="sellerName" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="gmvAmount" fill="#d6a323" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>}
        <ChartPanel title="Top Products by Purchases" data={productRows}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={productRows} layout="vertical" margin={{ left: 90, right: 20, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee8dc" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Bar dataKey="purchases" fill="#24b8c3" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Inventory Risk" data={stockRows.filter((row) => row.count > 0)}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stockRows.filter((row) => row.count > 0)} dataKey="count" nameKey="status" outerRadius={90} label>
                {stockRows.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatNumber(value)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
    </ReportShell>
  );
};
