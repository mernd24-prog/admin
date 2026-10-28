import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MdAccountBalanceWallet,
  MdAssessment,
  MdDownload,
  MdOpenInNew,
  MdPayments,
  MdReceiptLong,
  MdRefresh,
  MdShoppingCart,
  MdUploadFile,
  MdWarningAmber,
} from "react-icons/md";
import { toast } from "sonner";
import { axiosPrivate } from "../../_helpers/axiosProvider";
import { dropdownApi } from "../../_helpers/dropdownApi";
import { exportToExcelWorkbook } from "../../_helpers/exportToCsv";
import { isSellerPanel } from "../../_helpers/panelConfig";
import {
  DataTable,
  FilterBar,
  OrderLink,
  PageHeader,
  SellerIdentity,
  StatusBadge,
  SummaryCard,
} from "../../components/Shared";
import { financeMoney } from "../OrdersManagement/SellerFinance/financeUi";
import Tabs from "../../components/Shared/Tabs";

const REGISTERS = [
  ["sales", "Sales Register"],
  ["collections", "Collections"],
  ["refunds", "Refund Register"],
  ["platform-revenue", "Platform Revenue"],
  ["seller-payable", "Seller Payable"],
  ["payouts", "Payouts & Settlements"],
  ["gst", "GST Register"],
  ["tcs-tds", "TCS / TDS"],
  ["razorpay", "Razorpay Reconciliation"],
];
const BASIS_OPTIONS = [
  ["Order date", "order_date"],
  ["Payment captured date", "payment_date"],
  ["Invoice date", "invoice_date"],
  ["Payout date", "payout_date"],
  ["Settlement date", "settlement_date"],
].map(([label, value]) => ({ label, value }));
const PROVIDER_OPTIONS = ["razorpay", "cod", "wallet"].map((value) => ({
  label: value.toUpperCase(),
  value,
}));
const STATUS_OPTIONS = [
  "captured",
  "verified",
  "pending",
  "approved",
  "processing",
  "completed",
  "paid",
  "failed",
  "cancelled",
].map((value) => ({ label: value.replace(/_/g, " "), value }));
const CARDS = [
  ["ordersBooked", "Orders booked", MdShoppingCart, true],
  ["unitsSold", "Units sold", MdShoppingCart, true],
  ["grossMerchandiseValue", "Gross merchandise value", MdAssessment],
  ["netMerchandiseValue", "Net merchandise value", MdAssessment],
  ["customerInvoiceValue", "Customer invoice value", MdReceiptLong],
  ["customerCollections", "Customer collections", MdPayments],
  ["razorpayCaptured", "Razorpay captured", MdPayments],
  ["razorpaySettled", "Razorpay settled", MdPayments],
  ["razorpayFeesAndGst", "Razorpay fees + GST", MdReceiptLong],
  ["codOutstanding", "COD outstanding", MdPayments],
  ["refundsCompleted", "Refunds completed", MdReceiptLong],
  ["refundsPending", "Refunds pending / failed", MdWarningAmber],
  ["platformRevenue", "Platform revenue", MdAssessment],
  ["outputGstLiability", "Output GST liability", MdReceiptLong],
  ["statutoryWithheld", "TCS / TDS withheld", MdReceiptLong],
  ["sellerPayable", "Seller payable", MdAccountBalanceWallet],
  ["sellerPaid", "Seller paid", MdPayments],
  ["sellerOutstanding", "Seller outstanding", MdWarningAmber],
];
const unwrap = (response) => response?.data?.data ?? response?.data ?? {};
const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "N/A";
const money = (value, row) => financeMoney(value, row?.currency || "INR");
const OrganizationLink = ({ row, seller }) =>
  row.organization_id ? (
    <Link
      className="font-semibold text-[var(--admin-navy)] hover:underline"
      to={
        seller
          ? "/app/my-organizations"
          : `/app/seller-organizations?organizationId=${encodeURIComponent(row.organization_id)}`
      }
    >
      {row.organization_name || row.legal_business_name || "View organization"}
    </Link>
  ) : (
    <span className="text-[var(--admin-muted)]">Default organization</span>
  );

export default function CaFinanceAnalytics() {
  const seller = isSellerPanel();
  const navigate = useNavigate();
  const base = seller ? "/sellers/me/ca-analytics" : "/admin/ca-analytics";
  const fileRef = useRef(null);
  const registerAbortRef = useRef(null);
  const registerRequestRef = useRef(0);
  const [filters, setFilters] = useState({
    basis: "order_date",
    fromDate: "",
    toDate: "",
    sellerId: "",
    organizationId: "",
    provider: "",
    status: "",
    search: "",
    limit: 20,
    offset: 0,
  });
  const [summary, setSummary] = useState({ cards: {} });
  const [trends, setTrends] = useState([]);
  const [checks, setChecks] = useState([]);
  const [register, setRegister] = useState("sales");
  const [registerData, setRegisterData] = useState({ rows: [], total: 0 });
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [sellerOptions, setSellerOptions] = useState([]);
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const query = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(
          ([, value]) => value !== "" && value !== null && value !== undefined,
        ),
      ),
    [filters],
  );
  const overviewQuery = useMemo(() => {
    const { limit, offset, search, ...rest } = query;
    return rest;
  }, [query]);
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState("trends");

const analyticsTabs = [
  { value: "trends", label: "Daily Orders and GMV" },
  { value: "reconciliation", label: "Reconciliation Checks" },
];

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const [a, b, c] = await Promise.all([
        axiosPrivate.get(`${base}/summary`, { params: overviewQuery }),
        axiosPrivate.get(`${base}/trends`, { params: overviewQuery }),
        axiosPrivate.get(`${base}/reconciliation`, { params: overviewQuery }),
      ]);
      setSummary(unwrap(a));
      setTrends(unwrap(b));
      setChecks(unwrap(c).checks || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to load finance summary.",
      );
    } finally {
      setOverviewLoading(false);
    }
  }, [base, overviewQuery]);
  const loadRegister = useCallback(async () => {
    registerAbortRef.current?.abort();
    const controller = new AbortController();
    const requestId = ++registerRequestRef.current;
    registerAbortRef.current = controller;
    setTableLoading(true);
    setRegisterData({ rows: [], total: 0 });
    try {
      const response = await axiosPrivate.get(`${base}/registers/${register}`, {
        params: query,
        signal: controller.signal,
      });
      if (requestId === registerRequestRef.current)
        setRegisterData(unwrap(response));
    } catch (error) {
      if (
        error?.code !== "ERR_CANCELED" &&
        error?.name !== "CanceledError" &&
        requestId === registerRequestRef.current
      ) {
        toast.error(
          error?.response?.data?.message || "Unable to load finance register.",
        );
        setRegisterData({ rows: [], total: 0 });
      }
    } finally {
      if (requestId === registerRequestRef.current) setTableLoading(false);
    }
  }, [base, query, register]);
  useEffect(() => {
    loadOverview();
  }, [loadOverview]);
  useEffect(() => {
    loadRegister();
    return () => registerAbortRef.current?.abort();
  }, [loadRegister]);
  useEffect(() => {
    if (!seller)
      dropdownApi
        .getSellers({ limit: 100 })
        .then(setSellerOptions)
        .catch(() => setSellerOptions([]));
  }, [seller]);
  useEffect(() => {
    if (seller || !filters.sellerId) return setOrganizationOptions([]);
    dropdownApi
      .getSellerOrganizations(filters.sellerId)
      .then(setOrganizationOptions)
      .catch(() => setOrganizationOptions([]));
  }, [filters.sellerId, seller]);

  const updateFilter = (key, value) =>
    setFilters((current) => ({
      ...current,
      [key]: value || "",
      ...(key === "sellerId" ? { organizationId: "" } : {}),
      offset: 0,
    }));
  const resetFilters = () =>
    setFilters((current) => ({
      ...current,
      basis: "order_date",
      fromDate: "",
      toDate: "",
      sellerId: "",
      organizationId: "",
      provider: "",
      status: "",
      offset: 0,
    }));
  const activeFilters = [
    filters.fromDate || filters.toDate,
    filters.basis !== "order_date",
    filters.sellerId,
    filters.organizationId,
    filters.provider,
    filters.status,
  ].filter(Boolean).length;
  const refreshing = overviewLoading || tableLoading;
  const importFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    body.append("provider", "razorpay");
    const toastId = toast.loading("Importing reconciliation file…");
    try {
      const result = unwrap(
        await axiosPrivate.post(`${base}/imports/provider`, body, {
          headers: { "Content-Type": "multipart/form-data" },
        }),
      );
      toast.success(
        `${result.imported} rows imported; ${result.duplicates} duplicates skipped.`,
        { id: toastId },
      );
      loadOverview();
      loadRegister();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Import failed.", {
        id: toastId,
      });
    }
    event.target.value = "";
  };
  const exportReport = () => {
    const overviewRows = CARDS.filter(
      ([key]) => !(seller && ["platformRevenue", "outputGstLiability"].includes(key)),
    ).map(([key, label]) => ({
      metric: label,
      value: summary.cards?.[key] ?? "Unavailable",
    }));
    const sheets = [
      {
        name: "Finance Summary",
        data: overviewRows,
        columns: [
          { key: "metric", label: "Metric" },
          { key: "value", label: "Value" },
        ],
      },
    ];

    try {
      const exported = exportToExcelWorkbook(
        sheets,
        "ca-finance-summary.xlsx",
      );
      if (exported) toast.success("Finance analytics workbook exported.");
      else toast.error("Unable to export finance analytics workbook.");
    } catch (error) {
      console.error("Finance analytics workbook export failed:", error);
      toast.error(error?.message || "Failed to export finance analytics workbook.");
    }
  };

  const identities = useMemo(
    () =>
      seller
        ? []
        : [
            {
              key: "seller_id",
              label: "Seller",
              render: (_, row) => <SellerIdentity row={row} />,
            },
            {
              key: "organization_id",
              label: "Organization",
              render: (_, row) => (
                <OrganizationLink row={row} seller={seller} />
              ),
            },
          ],
    [seller],
  );
  const columnMap = useMemo(
    () => ({
      sales: [
        { key: "date", label: "Date", render: dateTime },
        {
          key: "order_number",
          label: "Order",
          render: (v, r) => <OrderLink orderId={r.order_id} orderNumber={v} />,
        },
        ...identities,
        { key: "quantity", label: "Units" },
        { key: "line_total", label: "Gross value", render: money },
        { key: "tax_amount", label: "Tax", render: money },
        {
          key: "status",
          label: "Status",
          render: (v) => <StatusBadge status={v} dot />,
        },
      ],
      collections: [
        { key: "created_at", label: "Captured at", render: dateTime },
        {
          key: "order_number",
          label: "Order",
          render: (v, r) => <OrderLink orderId={r.order_id} orderNumber={v} />,
        },
        ...identities,
        { key: "provider", label: "Provider" },
        { key: "provider_payment_id", label: "Provider reference" },
        { key: "amount", label: "Captured", render: money },
        {
          key: "status",
          label: "Status",
          render: (v) => <StatusBadge status={v} dot />,
        },
      ],
      "seller-payable": [
        { key: "created_at", label: "Date", render: dateTime },
        {
          key: "order_id",
          label: "Order",
          render: (v) => <OrderLink orderId={v} />,
        },
        ...identities,
        { key: "gross_amount", label: "Gross", render: money },
        { key: "commission_amount", label: "Commission", render: money },
        { key: "commission_gst", label: "Commission GST", render: money },
        { key: "refund_amount", label: "Refund", render: money },
        { key: "net_amount", label: "Net payable", render: money },
        {
          key: "status",
          label: "Status",
          render: (v) => <StatusBadge status={v} dot />,
        },
      ],
      refunds: [
        { key: "created_at", label: "Recorded", render: dateTime },
        {
          key: "order_id",
          label: "Order",
          render: (v) => <OrderLink orderId={v} />,
        },
        ...identities,
        { key: "gross_amount", label: "Original gross", render: money },
        { key: "refund_amount", label: "Refund / reversal", render: money },
        { key: "net_amount", label: "Remaining payable", render: money },
        {
          key: "status",
          label: "Status",
          render: (v) => <StatusBadge status={v} dot />,
        },
      ],
      "platform-revenue": [
        { key: "created_at", label: "Recognized", render: dateTime },
        {
          key: "order_id",
          label: "Order",
          render: (v) => <OrderLink orderId={v} />,
        },
        ...identities,
        { key: "gross_amount", label: "Seller gross", render: money },
        {
          key: "commission_amount",
          label: "Commission before GST",
          render: money,
        },
        { key: "commission_gst", label: "GST on commission", render: money },
        { key: "refund_amount", label: "Reversal", render: money },
        {
          key: "status",
          label: "Status",
          render: (v) => <StatusBadge status={v} dot />,
        },
      ],
      payouts: [
        { key: "created_at", label: "Created", render: dateTime },
        ...identities,
        {
          key: "id",
          label: "Payout reference",
          render: (v, r) => r.payment_reference || String(v).slice(-8),
        },
        { key: "total_amount", label: "Gross", render: money },
        { key: "commission_amount", label: "Deductions", render: money },
        { key: "net_amount", label: "Net payout", render: money },
        { key: "payment_method", label: "Method" },
        { key: "processed_at", label: "Processed", render: dateTime },
        {
          key: "status",
          label: "Status",
          render: (v) => <StatusBadge status={v} dot />,
        },
      ],
      gst: [
        { key: "issued_at", label: "Issued", render: dateTime },
        { key: "invoice_number", label: "Invoice" },
        {
          key: "order_id",
          label: "Order",
          render: (v) => <OrderLink orderId={v} />,
        },
        ...identities,
        { key: "place_of_supply", label: "Place of supply" },
        { key: "taxable_amount", label: "Taxable", render: money },
        { key: "cgst_amount", label: "CGST", render: money },
        { key: "sgst_amount", label: "SGST", render: money },
        { key: "igst_amount", label: "IGST", render: money },
        { key: "total_amount", label: "Total", render: money },
      ],
      "tcs-tds": [
        { key: "created_at", label: "Date", render: dateTime },
        {
          key: "order_id",
          label: "Order",
          render: (v) => <OrderLink orderId={v} />,
        },
        ...identities,
        { key: "gross_amount", label: "Taxable base", render: money },
        { key: "gst_tcs", label: "GST TCS", render: money },
        { key: "income_tax_tds", label: "Income-tax TDS", render: money },
        { key: "net_amount", label: "Net payable", render: money },
      ],
      razorpay: [
        { key: "occurred_at", label: "Provider date", render: dateTime },
        { key: "transaction_type", label: "Type" },
        { key: "external_id", label: "Provider ID" },
        { key: "order_reference", label: "Order reference" },
        { key: "amount", label: "Amount", render: money },
        { key: "fee_amount", label: "Fee", render: money },
        { key: "fee_tax_amount", label: "Fee GST", render: money },
        { key: "settlement_reference", label: "Settlement" },
        { key: "utr", label: "UTR" },
        {
          key: "status",
          label: "Status",
          render: (v) => <StatusBadge status={v} dot />,
        },
      ],
    }),
    [identities],
  );
  const dateRangeFields = [
    {
      key: "fromDate",
      label: "From Date",
      type: "date",
      disableFuture: true,
    },
    {
      key: "toDate",
      label: "To Date",
      type: "date",
      disableFuture: true,
    },
  ];
  const filterFields = [
    ...dateRangeFields,
    {
      key: "basis",
      label: "Accounting basis",
      type: "select",
      options: BASIS_OPTIONS,
      isSearchable: false,
      isClearable: true,
    },
    ...(!seller
      ? [
          {
            key: "sellerId",
            label: "Seller",
            type: "select",
            options: sellerOptions,
            placeholder: "All sellers",
          },
          {
            key: "organizationId",
            label: "Organization",
            type: "select",
            options: organizationOptions,
            placeholder: filters.sellerId
              ? "All organizations"
              : "Select seller first",
            isDisabled: !filters.sellerId,
          },
        ]
      : []),
    ...(register === "collections"
      ? [
          {
            key: "provider",
            label: "Provider",
            type: "select",
            options: PROVIDER_OPTIONS,
            placeholder: "All providers",
          },
        ]
      : []),
    {
      key: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS,
      placeholder: "All statuses",
    },
  ];
  const rowActions = (row) => [
    {
      label: "Open order",
      icon: <MdOpenInNew />,
      hidden: !row.order_id,
      onClick: () => navigate(`/app/orders/view/${row.order_id}`),
    },
    {
      label: "Open seller",
      icon: <MdOpenInNew />,
      hidden: seller || !row.seller_id,
      onClick: () => navigate(`/app/seller/view/${row.seller_id}`),
    },
    {
      label: "Open organization",
      icon: <MdOpenInNew />,
      hidden: !row.organization_id,
      onClick: () =>
        navigate(
          seller
            ? "/app/my-organizations"
            : `/app/seller-organizations?organizationId=${row.organization_id}`,
        ),
    },
  ];

  return (
    <div className="p-3 sm:p-4 lg:p-6">
      <PageHeader
        title={seller ? "My Finance Analytics" : "CA Finance & Reconciliation"}
        subtitle="Sales, collections, statutory liabilities, seller payables and reconciliation exceptions."
        breadcrumbs={[
          {
            label: seller ? "My Reports" : "Reports & Analytics",
            to: "/app/analytics",
          },
          { label: "CA Finance" },
        ]}
        actions={
          <>
           <button
  type="button"
  onClick={() => {
    loadOverview();
    loadRegister();
  }}
  disabled={refreshing}
  aria-label={
    refreshing
      ? "Refreshing finance analytics"
      : "Refresh finance analytics"
  }
>
  <MdRefresh className={refreshing ? "animate-spin" : ""} />
  {refreshing ? "Refreshing..." : "Refresh"}
</button>
            {!seller && (
              <>
                <input
                  ref={fileRef}
                  className="hidden"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={importFile}
                />
                <button type="button" onClick={() => fileRef.current?.click()}>
                  <MdUploadFile />
                  Import
                </button>
              </>
            )}
            <button type="button" onClick={exportReport}>
              <MdDownload />
              Export
            </button>
          </>
        }
      />
      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {CARDS.filter(
          ([key]) =>
            !(
              seller && ["platformRevenue", "outputGstLiability"].includes(key)
            ),
        ).map(([key, label, Icon, count]) => {
          const value = summary.cards?.[key];
          return (
            <SummaryCard
              key={key}
              title={label}
              value={
                value === null
                  ? "Unavailable"
                  : count
                    ? Number(value || 0).toLocaleString("en-IN")
                    : financeMoney(value)
              }
              description={
                value === null ? "Awaiting provider/import evidence" : undefined
              }
              icon={<Icon size={18} />}
              loading={overviewLoading}
            />
          );
        })}
      </section>
       <section className="space-y-4 mb-4">
    <Tabs
      tabs={analyticsTabs}
      activeTab={activeAnalyticsTab}
      onChange={setActiveAnalyticsTab}
    />

    {activeAnalyticsTab === "trends" && (
      <div className="admin-card bg-white p-4">
        <h2 className="text-sm font-bold text-[var(--admin-ink)]">
          Daily Orders and GMV
        </h2>
        <p className="text-xs text-[var(--admin-muted)]">
          Based on the active accounting period.
        </p>

        <div className="mt-4 h-64">
          {overviewLoading ? (
            <div className="h-full animate-pulse rounded bg-[var(--admin-surface-soft)]" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <CartesianGrid stroke="#e9dfc9" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => financeMoney(v)} />
                <Area
                  type="monotone"
                  dataKey="gmv"
                  stroke="#2e1b78"
                  fill="#f5e7bd"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    )}

    {activeAnalyticsTab === "reconciliation" && (
      <div className="admin-card bg-white p-4">
        <h2 className="text-sm font-bold text-[var(--admin-ink)]">
          Reconciliation Checks
        </h2>
        <p className="text-xs text-[var(--admin-muted)]">
          Matched, warning, mismatch, or unavailable.
        </p>

        <div className="mt-3 space-y-2">
          {checks.map((check) => (
            <div
              key={check.id}
              className="rounded-md border border-[var(--admin-line)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold text-[var(--admin-ink)]">
                  {check.label}
                </span>

                <StatusBadge
                  status={check.state}
                  label={check.state}
                  dot
                />
              </div>

              {check.variance !== null && (
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  Variance: {financeMoney(check.variance)}
                </p>
              )}

              {check.reason && (
                <p className="mt-1 text-xs text-amber-700">
                  {check.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </section>
   <div className="mb-4">
<Tabs
  tabs={REGISTERS.filter(([key]) => !(seller && key === "razorpay")).map(
    ([key, label]) => ({
      value: key,
      label,
    }),
  )}
  activeTab={register}
  onChange={(key) => {
    if (key === register) return;

    setRegisterData({ rows: [], total: 0 });
    setTableLoading(true);
    setRegister(key);
    setFilters((current) => ({
      ...current,
      offset: 0,
      search: "",
      status: "",
      provider: "",
    }));
  }}
/>
</div>
      <DataTable
        columns={columnMap[register]}
        data={registerData.rows || []}
        loading={tableLoading}
        totalCount={registerData.total || 0}
        page={Math.floor(filters.offset / filters.limit) + 1}
        pageSize={filters.limit}
        onPageChange={(page) =>
          setFilters((c) => ({ ...c, offset: (page - 1) * c.limit }))
        }
        onPageSizeChange={(limit) =>
          setFilters((c) => ({ ...c, limit, offset: 0 }))
        }
        rowKey={(row) =>
          row.id || row.payment_id || `${row.order_id}-${row.created_at}`
        }
        onRefresh={loadRegister}
        onSearch={(search) => setFilters((c) => ({ ...c, search, offset: 0 }))}
        searchPlaceholder="Search reference, order, seller or UTR"
        emptyText="No finance records match the active filters."
        rowActions={rowActions}
        filterBar={
          <FilterBar
            filters={filterFields}
            values={filters}
            onChange={updateFilter}
            onClear={resetFilters}
            loading={tableLoading}
            activeCount={activeFilters}
            gridClassName="xl:grid-cols-[repeat(auto-fit,225px)]"
          />
        }
      />
    </div>
  );
}
