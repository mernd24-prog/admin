/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MdDownload, MdVisibility } from "react-icons/md";
import Loader from "../../components/Loader/Loader";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../components/Shared";
import { getTaxInvoices } from "../../Redux/adminCoreSlice";
import { useListPage } from "../../hooks/useListPage";
import { dropdownApi } from "../../_helpers/dropdownApi";
import { downloadApiFile } from "../../_helpers/downloadApi";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { isSellerPanel } from "../../_helpers/panelConfig";

const STATES = [
  "draft", "issued", "cancelled", "amended",
];
const INVOICE_TYPES = [
  { value: "seller_customer", label: "Seller → Customer" },
  { value: "platform_commission", label: "Platform → Seller" },
  { value: "platform_customer_fee", label: "Platform → Customer Fee" },
  { value: "order_customer", label: "Order Receipt" },
];

// const isSeller = isSellerPanel();

const FILTER_FIELDS = isSellerPanel()
  ? [
      { key: "invoiceType", type: "select", label: "Document Type", options: INVOICE_TYPES },
      { key: "fromDate", type: "date", label: "From" },
      { key: "toDate", type: "date", label: "To" },
    ]
  : [
      { key: "search", type: "text", label: "Search", width: "w-56" },
      { key: "invoiceType", type: "select", label: "Document Type", options: INVOICE_TYPES },
      {
        key: "sellerId",
        type: "asyncDropdown",
        label: "Seller",
        width: "w-52",
        load: (search) =>
          dropdownApi.getSellers({
            keyWord: search,
            searchFields: "full_name,email,businessName",
          }),
      },
      {
        key: "buyerId",
        type: "asyncDropdown",
        label: "Buyer",
        width: "w-52",
        load: (search) =>
          dropdownApi.getBuyers({
            keyWord: search,
            searchFields: "full_name,email",
          }),
      },
      {
        key: "organizationId",
        type: "text",
        label: "Organization ID",
        width: "w-52",
      },
      {
        key: "state",
        type: "select",
        label: "State",
        options: STATES.map((v) => ({ value: v, label: v })),
      },
      { key: "hsnCode", type: "text", label: "HSN Code", width: "w-36" },
      { key: "fromDate", type: "date", label: "From" },
      { key: "toDate", type: "date", label: "To" },
    ];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || data?.invoices || data || [],
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
  };
};

const fmt = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");
const money = (v) => `₹${Number(v || 0).toFixed(2)}`;
const pick = (row = {}, ...keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return undefined;
};
const shortId = (value = "") => {
  const text = String(value || "");
  return text.length > 12 ? `${text.slice(0, 8)}...${text.slice(-4)}` : text || "—";
};
const invoiceMetadata = (row = {}) => {
  if (!row.metadata || typeof row.metadata !== "string") return row.metadata || {};
  try { return JSON.parse(row.metadata); } catch { return {}; }
};
const invoiceReconciliation = (row = {}) => {
  const total = Number(row.totalAmount ?? row.total_amount ?? 0);
  if (total <= 0) return { label: "Invalid zero value", valid: false };
  const type = row.invoiceType || row.invoice_type;
  const metadata = invoiceMetadata(row);
  let calculated = total;
  if (type === "platform_commission" && metadata.itemReferences?.length) {
    calculated = metadata.itemReferences.reduce((sum, item) =>
      sum + Number(item.platformFeeAmount || 0) + Number(item.platformFeeTaxAmount || 0), 0);
  } else if (type === "seller_customer" && metadata.items?.length) {
    calculated = metadata.items.reduce((sum, item) =>
      sum + Number(item.taxableAmount || 0) + Number(item.taxAmount || 0), 0) +
      Number(metadata.amounts?.deliveryChargeAmount || 0);
  } else if (type === "order_customer") {
    calculated = Number(metadata.amounts?.finalPayableAmount ?? total);
  }
  const valid = Math.abs(calculated - total) <= 0.02;
  return { label: valid ? "Reconciled" : "Mismatch", valid };
};
const invoiceTypeLabel = (value) => ({
  order_customer: "Order invoice",
  seller_customer: "Seller → Customer",
  platform_commission: "Platform → Seller",
  platform_customer_fee: "Platform → Customer",
}[value] || String(value || "Invoice").replace(/_/g, " "));

const TaxInvoices = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.taxInvoicesData);

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "issuedAt",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const hideOrganizationColumn = isSellerPanel();

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      const allowedSortBy = new Set([
        "issuedAt",
        "invoiceNumber",
        "taxableAmount",
        "taxAmount",
        "totalAmount",
        "invoiceType",
      ]);
      const sortBy = allowedSortBy.has(params.sortBy) ? params.sortBy : "issuedAt";
      await dispatch(getTaxInvoices({ ...params, sortBy, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      const msg = err?.message || "Failed to load tax invoices";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const downloadInvoice = useCallback(async (row = {}) => {
    const invoiceId = pick(row, "id", "invoiceId", "invoice_id");
    if (!invoiceId) {
      toast.error("Invoice ID is missing");
      return;
    }
    try {
      setDownloadingId(invoiceId);
      await downloadApiFile(
        ENDPOINTS.tax.invoiceDownload(invoiceId),
        { format: "pdf" },
        { filename: `${pick(row, "invoiceNumber", "invoice_number") || invoiceId}.pdf`, format: "pdf" },
      );
      toast.success("Download started");
    } catch (downloadError) {
      toast.error(downloadError?.message || "Unable to download invoice");
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const COLUMNS = useMemo(() => [
    {
      key: "invoiceNumber",
      label: "Invoice #",
      sortable: true,
      render: (v, row) => <span className="font-mono text-sm font-medium">{v || row.invoice_number || "—"}</span>,
    },
    {
      key: "orderId",
      label: "Order",
      render: (v, row) => {
        const orderId = v || row.order_id;
        return <span className="font-mono text-xs text-gray-500">{orderId ? String(orderId).slice(-8) : "—"}</span>;
      },
    },
    {
      key: "invoiceType",
      label: "Invoice Type",
      sortable: true,
      render: (v, row) => (
        <span className="whitespace-nowrap rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
          {invoiceTypeLabel(v || row.invoice_type)}
        </span>
      ),
    },
    {
      key: "parties",
      label: "Issued By → Recipient",
      render: (_, row) => {
        const type = row.invoiceType || row.invoice_type;
        const metadata = invoiceMetadata(row);
        const seller = metadata.organization?.legalBusinessName || metadata.organization?.storeDisplayName ||
          metadata.seller?.legalBusinessName || metadata.seller?.businessName || metadata.seller?.displayName || "Seller";
        const customer = metadata.buyer?.profile?.displayName || metadata.buyer?.email || "Customer";
        const issuer = type === "seller_customer" ? seller : "Sam Global";
        const recipient = type === "platform_commission" ? seller : customer;
        return <span className="whitespace-nowrap text-xs text-gray-600">{issuer} → {recipient}</span>;
      },
    },
    {
      key: "state",
      label: "Status",
      render: (v, row) => {
        const status = v || row.status || row.invoice_state || "issued";
        return (
        <StatusBadge
          status={status}
          color={status === "issued" ? "green" : status === "cancelled" ? "red" : status === "amended" ? "yellow" : "gray"}
        />
        );
      },
    },
    {
      key: "organizationId",
      label: "Organization",
      render: (v, row) => <span className="font-mono text-xs text-gray-500">{shortId(v || row.organization_id)}</span>,
    },
    {
      key: "taxableAmount",
      label: "Taxable Amt",
      sortable: true,
      render: (v, row) => <span className="text-sm">{money(v ?? row.taxable_amount)}</span>,
    },
    {
      key: "taxAmount",
      label: "Tax",
      sortable: true,
      render: (v, row) => <span className="text-sm font-medium">{money(v ?? row.totalTax ?? row.tax_amount)}</span>,
    },
    {
      key: "totalAmount",
      label: "Total",
      sortable: true,
      render: (v, row) => <span className="text-sm font-semibold">{money(v ?? row.total_amount)}</span>,
    },
    {
      key: "reconciliation",
      label: "Reconciliation",
      render: (_, row) => {
        const result = invoiceReconciliation(row);
        return (
          <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${result.valid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.label}
          </span>
        );
      },
    },
    {
      key: "issuedAt",
      label: "Issued",
      sortable: true,
      render: (v, row) => <span className="text-xs text-gray-500">{fmt(v ?? row.issueDate ?? row.issued_at)}</span>,
    },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex gap-1">
          <button
            onClick={() => {
              const invoiceId = pick(row, "id", "invoiceId", "invoice_id");
              if (!invoiceId) {
                toast.error("Invoice ID is missing");
                return;
              }
              navigate(`/app/tax-invoices/${invoiceId}`, { state: { invoice: row } });
            }}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="View"
          >
            <MdVisibility size={18} />
          </button>
          <button
            type="button"
            onClick={() => downloadInvoice(row)}
            disabled={downloadingId === pick(row, "id", "invoiceId", "invoice_id")}
            className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
            title="Download PDF"
          >
              <MdDownload size={18} />
          </button>
        </div>
      ),
    },
  ].filter((column) => !(hideOrganizationColumn && column.key === "organizationId")), [downloadInvoice, downloadingId, hideOrganizationColumn, navigate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Invoices"
        subtitle="View and manage all tax invoices"
        breadcrumbs={[{ label: "Invoices & Taxation" }, { label: "Tax Invoices" }]}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <DataTable
          columns={COLUMNS}
          data={payload.list}
          total={payload.total}
          listPage={list}
          emptyMessage="No tax invoices found"
           filterBar={
            <FilterBar
              filters={FILTER_FIELDS}
              listPage={list}
              loading={false}
            />}
        />
      )}

    </div>
  );
};

export default TaxInvoices;
