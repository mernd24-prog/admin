import React from "react";
import { MdFileDownload } from "react-icons/md";
import Cards from "../../components/Cards/Cards";
import { StatCardSkeletonLoader } from "../../components/Loader/SkeletonLoader";
import { PageHeader } from "../../components/Shared";

/**
 * Shared shell for all report pages.
 * Shows date-range selector, export button, and a chart placeholder.
 */
const RANGE_OPTIONS = [
  "Today",
  "Last 7 days",
  "Last 30 days",
  "Last 90 days",
  "Custom",
];

const StatCard = ({ label, value, sub, trend, loading }) => (
  <div className="h-full">
    {loading ? (
      <StatCardSkeletonLoader />
    ) : (
      <Cards
        label={label}
        value={value}
        helper={trend != null ? sub || "vs prev period" : sub}
        trend={trend != null ? `${Math.abs(trend)}%` : undefined}
        trendNegative={trend < 0}
      />
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

export const ReportShell = ({
  title,
  subtitle,
  breadcrumbs,
  stats = [],
  children,
  loading = false,
}) => {
  const [range, setRange] = React.useState("Last 30 days");

  return (
    <div className="p-4 md:p-6 ">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[var(--admin-gold)]"
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
            <button className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              <MdFileDownload size={16} /> Export
            </button>
          </div>
        }
      />

      {stats.length > 0 && (
        <div
          className={`grid grid-cols-2 xl:grid-cols-${Math.min(stats.length, 4)} gap-4 mb-6`}
        >
          {stats.map((s) => (
            <StatCard key={s.label} {...s} loading={loading} />
          ))}
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
    breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Sales Reports" }]}
    stats={[
      { label: "Total Revenue", value: "₹12,40,500", trend: 8.3 },
      { label: "Total Orders", value: "3,842", trend: 5.1 },
      { label: "Avg Order Value", value: "₹1,620", trend: -1.2 },
      { label: "Conversion Rate", value: "3.4%", trend: 0.2 },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Revenue Over Time
        </h3>
        <div className="h-64 w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Line chart — revenue by day/week
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Sales by Category
        </h3>
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
    breadcrumbs={[
      { label: "Reports & Analytics" },
      { label: "Product Analytics" },
    ]}
    stats={[
      { label: "Total Products", value: "4,231" },
      { label: "Active Listings", value: "3,890", trend: 2.1 },
      { label: "Avg Rating", value: "4.2 ★" },
      { label: "Reviews This Month", value: "1,204", trend: 14 },
    ]}
  >
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        Top Products by Revenue
      </h3>
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
    breadcrumbs={[
      { label: "Reports & Analytics" },
      { label: "Inventory Analytics" },
    ]}
    stats={[
      { label: "Total SKUs", value: "12,430" },
      { label: "Low Stock Items", value: "342", trend: -5 },
      { label: "Out of Stock", value: "89", trend: -12 },
      { label: "Turnover Rate", value: "8.2×" },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Stock Level Distribution
        </h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Stacked bar — in_stock / low / OOS by category
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Inventory Movement
        </h3>
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
    breadcrumbs={[
      { label: "Reports & Analytics" },
      { label: "Seller Analytics" },
    ]}
    stats={[
      { label: "Active Sellers", value: "284", trend: 6 },
      { label: "Total GMV", value: "₹8.4 Cr", trend: 11 },
      { label: "Avg Seller Rating", value: "4.1 ★" },
      { label: "Pending KYC", value: "17", trend: -3 },
    ]}
  >
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        GMV by Seller (Top 20)
      </h3>
      <div className="h-72 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
        Bar chart — GMV ranked by seller
      </div>
    </div>
  </ReportShell>
);

export const OrdersReport = () => (
  <ReportShell
    title="Orders Report"
    subtitle="Order volume, fulfilment rate, and status breakdown"
    breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Orders Report" }]}
    stats={[
      { label: "Total Orders", value: "50,240", trend: 9.2 },
      { label: "Fulfilled", value: "46,180", trend: 7.4 },
      { label: "Cancelled", value: "2,340", trend: -3.1 },
      { label: "Pending", value: "1,720", trend: -1.8 },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Volume Over Time</h3>
        <div className="h-64 w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Bar chart — daily/weekly order count
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Status Breakdown</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Donut — status distribution
        </div>
      </div>
    </div>
  </ReportShell>
);

export const PaymentsReport = () => (
  <ReportShell
    title="Payments Report"
    subtitle="Revenue collected, payment methods, failures, and refund rates"
    breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Payments Report" }]}
    stats={[
      { label: "Total Collected", value: "₹9.2 Cr", trend: 12.1 },
      { label: "Online Payments", value: "₹7.8 Cr", trend: 14 },
      { label: "COD Collected", value: "₹1.4 Cr", trend: -2 },
      { label: "Refunds Issued", value: "₹18.4 L", trend: -5.3 },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Payment Method</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Pie — UPI / Card / COD / Wallet / Netbanking
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment Failure Rate</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Line — daily failure % by method
        </div>
      </div>
    </div>
  </ReportShell>
);

export const ReturnsReport = () => (
  <ReportShell
    title="Returns & Refunds Report"
    subtitle="Return requests, approval rates, refund timelines, and restock impact"
    breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Returns Report" }]}
    stats={[
      { label: "Return Requests", value: "4,820", trend: -2.4 },
      { label: "Approved Returns", value: "3,940", trend: -1.8 },
      { label: "Refunds Issued", value: "₹21.6 L", trend: -4.2 },
      { label: "Avg Resolution Days", value: "3.2d", trend: -0.8 },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Returns by Reason</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Horizontal bar — top return reasons
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Refund Timeline Distribution</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Histogram — days to refund
        </div>
      </div>
    </div>
  </ReportShell>
);

export const CancellationReport = () => (
  <ReportShell
    title="Cancellations Report"
    subtitle="Order cancellations by reason, stage, and seller"
    breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Cancellations Report" }]}
    stats={[
      { label: "Total Cancellations", value: "2,340", trend: -3.1 },
      { label: "Customer Initiated", value: "1,680", trend: -4.2 },
      { label: "Seller Initiated", value: "480", trend: -1.5 },
      { label: "System Auto-cancel", value: "180", trend: -8 },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Cancellations by Reason</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Horizontal bar — cancellation reasons
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Cancellations Over Time</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Line — daily cancellation trend
        </div>
      </div>
    </div>
  </ReportShell>
);

export const DeliveryReport = () => (
  <ReportShell
    title="Delivery Report"
    subtitle="Shipment status, SLA adherence, carrier performance, and RTO rates"
    breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Delivery Report" }]}
    stats={[
      { label: "Shipments Created", value: "46,100", trend: 8.4 },
      { label: "On-Time Delivery", value: "94.2%", trend: 1.1 },
      { label: "RTO Rate", value: "3.8%", trend: -0.6 },
      { label: "Avg Delivery Days", value: "2.4d", trend: -0.3 },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">SLA Adherence Over Time</h3>
        <div className="h-64 w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Line — on-time % by day
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Carrier Performance</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Bar — on-time % by carrier
        </div>
      </div>
    </div>
  </ReportShell>
);

export const CommissionReport = () => (
  <ReportShell
    title="Commission & Payout Report"
    subtitle="Seller commissions earned, platform fee collected, payouts processed"
    breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Commission Report" }]}
    stats={[
      { label: "Total Commission", value: "₹84.2 L", trend: 11.3 },
      { label: "Platform Fees", value: "₹12.6 L", trend: 9.8 },
      { label: "Payouts Processed", value: "₹71.4 L", trend: 10.2 },
      { label: "Pending Settlement", value: "₹6.2 L", trend: 3 },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Commission by Category</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Pie — commission split by category
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Payout Timeline</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Bar — weekly payout batches
        </div>
      </div>
    </div>
  </ReportShell>
);

export const UserReport = () => (
  <ReportShell
    title="User Report"
    subtitle="Customer acquisition, retention, lifetime value, and activity"
    breadcrumbs={[{ label: "Reports & Analytics" }, { label: "User Report" }]}
    stats={[
      { label: "Total Customers", value: "10,240", trend: 14.6 },
      { label: "New This Month", value: "842", trend: 22 },
      { label: "Repeat Buyers", value: "4,180", trend: 8.1 },
      { label: "Avg LTV", value: "₹3,420", trend: 5.4 },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">New Customer Acquisition</h3>
        <div className="h-64 w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Area chart — daily new signups
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Retention Cohorts</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Cohort heatmap
        </div>
      </div>
    </div>
  </ReportShell>
);

export const AnalyticsDashboard = () => (
  <ReportShell
    title="Analytics Dashboard"
    subtitle="Platform-wide metrics: GMV, orders, users, and seller health at a glance"
    breadcrumbs={[{ label: "Reports & Analytics" }, { label: "Analytics Dashboard" }]}
    stats={[
      { label: "Platform GMV", value: "₹8.4 Cr", trend: 11.2 },
      { label: "Total Orders", value: "50,240", trend: 9.2 },
      { label: "Active Customers", value: "10,240", trend: 14.6 },
      { label: "Active Sellers", value: "284", trend: 6 },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">GMV Over Time</h3>
        <div className="h-64 w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Area chart — daily GMV trend
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Category</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Donut — top categories by GMV
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Status Health</h3>
        <div className="h-48 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Stacked bar — fulfilled / pending / cancelled
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Customer Acquisition</h3>
        <div className="h-48 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Bar chart — new signups per week
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Sellers by GMV</h3>
        <div className="h-48 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Horizontal bar — top 10 sellers
        </div>
      </div>
    </div>
  </ReportShell>
);

export const DynamicPricingReport = () => (
  <ReportShell
    title="Dynamic Pricing"
    subtitle="Algorithmic price rules, surge pricing events, and competitive benchmarks"
    breadcrumbs={[{ label: "Marketing" }, { label: "Dynamic Pricing" }]}
    stats={[
      { label: "Active Rules", value: "34", trend: 2 },
      { label: "Price Adjustments Today", value: "1,204", trend: 8.6 },
      { label: "Avg Price Lift", value: "+4.2%", trend: 0.3 },
      { label: "Rules Triggered (7d)", value: "8,420", trend: 5.1 },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Price Rule Coverage</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Pie — products under dynamic vs static pricing
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Price Change Events Over Time</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Line — hourly price adjustments by rule type
        </div>
      </div>
    </div>
  </ReportShell>
);

export const NotificationsOverview = () => (
  <ReportShell
    title="Notifications"
    subtitle="Send and manage platform notifications to customers, sellers, and admins"
    breadcrumbs={[{ label: "Marketing" }, { label: "Notifications" }]}
    stats={[
      { label: "Sent This Week", value: "42,800", trend: 6.2 },
      { label: "Delivery Rate", value: "98.4%", trend: 0.3 },
      { label: "Open Rate", value: "34.2%", trend: 2.1 },
      { label: "Failed / Bounced", value: "682", trend: -4.8 },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Notification Volume Over Time</h3>
        <div className="h-64 w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Stacked area — email / SMS / push by day
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Channel Breakdown</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Donut — Email / SMS / Push / In-App
        </div>
      </div>
    </div>
  </ReportShell>
);

export const SubscriptionsOverview = () => (
  <ReportShell
    title="Subscriptions Overview"
    subtitle="Active subscriptions, MRR, churn rate, and plan distribution"
    breadcrumbs={[{ label: "Orders Management" }, { label: "Subscriptions Overview" }]}
    stats={[
      { label: "Active Subscriptions", value: "1,840", trend: 12.4 },
      { label: "MRR", value: "₹18.4 L", trend: 9.6 },
      { label: "Churn Rate", value: "2.1%", trend: -0.4 },
      { label: "New This Month", value: "234", trend: 18.2 },
    ]}
  >
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">MRR Growth</h3>
        <div className="h-64 w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Area chart — monthly recurring revenue trend
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Plan Distribution</h3>
        <div className="h-64 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-sm">
          Donut — Basic / Standard / Premium plans
        </div>
      </div>
    </div>
  </ReportShell>
);
