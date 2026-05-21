import React from 'react';
import { MdBarChart, MdTrendingUp, MdInventory, MdStorefront, MdFileDownload } from 'react-icons/md';
import { PageHeader } from '../../components/Shared';

/**
 * Shared shell for all report pages.
 * Shows date-range selector, export button, and a chart placeholder.
 */
const RANGE_OPTIONS = ['Today', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'Custom'];

const StatCard = ({ label, value, sub, trend, loading }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
    {loading ? (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-7 w-28 bg-gray-200 rounded" />
        <div className="h-3 w-16 bg-gray-100 rounded" />
      </div>
    ) : (
      <>
        <div className="text-xs text-gray-400 mb-1">{label}</div>
        <div className="text-2xl font-bold text-gray-800">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
        {trend != null && (
          <div className={`text-xs font-medium mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs prev period
          </div>
        )}
      </>
    )}
  </div>
);

const ChartPlaceholder = ({ height = 300 }) => (
  <div
    className="w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm"
    style={{ height }}
  >
    Chart visualization (connect chart library)
  </div>
);

export const ReportShell = ({ title, subtitle, breadcrumbs, stats = [], children, loading = false }) => {
  const [range, setRange] = React.useState('Last 30 days');

  return (
    <div className="p-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#989AFF]"
            >
              {RANGE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              <MdFileDownload size={16} /> Export
            </button>
          </div>
        }
      />

      {stats.length > 0 && (
        <div className={`grid grid-cols-2 lg:grid-cols-${Math.min(stats.length, 4)} gap-4 mb-6`}>
          {stats.map((s) => <StatCard key={s.label} {...s} loading={loading} />)}
        </div>
      )}

      {children ?? <ChartPlaceholder />}
    </div>
  );
};

// ─── Individual report pages ──────────────────────────────────────────────────

export const SalesReport = () => (
  <ReportShell
    title="Sales Reports"
    subtitle="Revenue, orders, and conversion data"
    breadcrumbs={[{ label: 'Reports & Analytics' }, { label: 'Sales Reports' }]}
    stats={[
      { label: 'Total Revenue',   value: '₹12,40,500', trend: 8.3  },
      { label: 'Total Orders',    value: '3,842',      trend: 5.1  },
      { label: 'Avg Order Value', value: '₹1,620',     trend: -1.2 },
      { label: 'Conversion Rate', value: '3.4%',       trend: 0.2  },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Over Time</h3>
        <div className="h-64 w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Line chart — revenue by day/week
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Sales by Category</h3>
        <div className="h-64 w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Pie / donut chart
        </div>
      </div>
    </div>
  </ReportShell>
);

export const ProductAnalytics = () => (
  <ReportShell
    title="Product Analytics"
    subtitle="Top performers, views, and conversion by product"
    breadcrumbs={[{ label: 'Reports & Analytics' }, { label: 'Product Analytics' }]}
    stats={[
      { label: 'Total Products',   value: '4,231' },
      { label: 'Active Listings',  value: '3,890', trend: 2.1  },
      { label: 'Avg Rating',       value: '4.2 ★' },
      { label: 'Reviews This Month', value: '1,204', trend: 14 },
    ]}
  >
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Products by Revenue</h3>
      <div className="h-72 w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
        Horizontal bar chart — top 10 products
      </div>
    </div>
  </ReportShell>
);

export const InventoryAnalytics = () => (
  <ReportShell
    title="Inventory Analytics"
    subtitle="Stock health, turnover, and restock predictions"
    breadcrumbs={[{ label: 'Reports & Analytics' }, { label: 'Inventory Analytics' }]}
    stats={[
      { label: 'Total SKUs',      value: '12,430' },
      { label: 'Low Stock Items', value: '342',   trend: -5   },
      { label: 'Out of Stock',    value: '89',    trend: -12  },
      { label: 'Turnover Rate',   value: '8.2×'              },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Stock Level Distribution</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Stacked bar — in_stock / low / OOS by category
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Inventory Movement</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Area chart — stock in/out over time
        </div>
      </div>
    </div>
  </ReportShell>
);

export const SellerAnalytics = () => (
  <ReportShell
    title="Seller Analytics"
    subtitle="Seller performance, GMV, and compliance metrics"
    breadcrumbs={[{ label: 'Reports & Analytics' }, { label: 'Seller Analytics' }]}
    stats={[
      { label: 'Active Sellers',   value: '284',       trend: 6   },
      { label: 'Total GMV',        value: '₹8.4 Cr',  trend: 11  },
      { label: 'Avg Seller Rating',value: '4.1 ★'                },
      { label: 'Pending KYC',      value: '17',       trend: -3  },
    ]}
  >
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">GMV by Seller (Top 20)</h3>
      <div className="h-72 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
        Bar chart — GMV ranked by seller
      </div>
    </div>
  </ReportShell>
);
