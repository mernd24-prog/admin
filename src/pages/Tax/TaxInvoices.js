/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { formatDateTime12Hour } from "../../utils/formatters";

const STATES = ["draft", "issued", "cancelled", "amended"];
const INVOICE_TYPES = [
  { value: "seller_customer", label: "Seller → Customer" },
  { value: "platform_commission", label: "Platform → Seller" },
  { value: "platform_customer_fee", label: "Platform → Customer Fee" },
  { value: "order_customer", label: "Order Receipt" },
];

// const isSeller = isSellerPanel();

const FILTER_FIELDS = isSellerPanel()
  ? [
      {
        key: "invoiceType",
        type: "select",
        label: "Document Type",
        options: INVOICE_TYPES,
      },
      { key: "fromDate", type: "date", label: "From" },
      { key: "toDate", type: "date", label: "To" },
    ]
  : [
      { key: "search", type: "text", label: "Search", width: "w-56" },
      {
        key: "invoiceType",
        type: "select",
        label: "Document Type",
        options: INVOICE_TYPES,
      },
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
    total: Number(
      data?.total || data?.list?.length || data?.items?.length || 0,
    ),
  };
};

const money = (v) => `₹${Number(v || 0).toFixed(2)}`;
const pick = (row = {}, ...keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "")
      return row[key];
  }
  return undefined;
};
const shortId = (value = "") => {
  const text = String(value || "");
  return text.length > 12
    ? `${text.slice(0, 8)}...${text.slice(-4)}`
    : text || "—";
};
const invoiceMetadata = (row = {}) => {
  if (!row.metadata || typeof row.metadata !== "string")
    return row.metadata || {};
  try {
    return JSON.parse(row.metadata);
  } catch {
    return {};
  }
};
const invoiceTypeLabel = (value) =>
  ({
    order_customer: "Order receipt",
    seller_customer: "Product tax invoice",
    platform_commission: "Platform commission invoice",
    platform_customer_fee: "Customer platform fee invoice",
  })[value] || String(value || "Invoice").replace(/_/g, " ");

const invoicePurpose = (row = {}) => {
  const type = row.invoiceType || row.invoice_type;
  const metadata = invoiceMetadata(row);
  const amounts = metadata.amounts || {};
  if (type === "seller_customer") {
    const discount = Number(
      amounts.marketplaceFundedDiscountAmount || amounts.discountAmount || 0,
    );
    return discount > 0
      ? "Seller product invoice. Customer discount/payment split may be shown separately."
      : "Seller product invoice issued to the customer.";
  }
  if (type === "platform_commission")
    return "Platform service charge billed to seller.";
  if (type === "platform_customer_fee")
    return "Platform fee billed to customer.";
  if (type === "order_customer")
    return "Customer payment receipt. Not a seller tax invoice.";
  return "Tax document";
};

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
  const firstDefined = (...values) =>
    values.find((v) => v !== undefined && v !== null && v !== "");

  const orderIdOf = (order = {}) =>
    firstDefined(order._id, order.id, order.orderId, order.order_no);

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
      const sortBy = allowedSortBy.has(params.sortBy)
        ? params.sortBy
        : "issuedAt";
      await dispatch(
        getTaxInvoices({
          ...params,
          sortBy,
          offset: (params.page - 1) * params.limit,
        }),
      ).unwrap();
    } catch (err) {
      const msg = err?.message || "Failed to load tax invoices";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

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
        {
          filename: `${pick(row, "invoiceNumber", "invoice_number") || invoiceId}.pdf`,
          format: "pdf",
        },
      );
      toast.success("Download started");
    } catch (downloadError) {
      toast.error(downloadError?.message || "Unable to download invoice");
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const COLUMNS = useMemo(
    () =>
      [
        {
          key: "invoiceNumber",
          label: "Document No.",
          sortable: true,
          render: (v, row) => (
            <span className="font-mono text-sm font-medium">
              {v || row.invoice_number || "—"}
            </span>
          ),
        },
        {
          key: "orderId",
          label: "Order",
          render: (v, row) => {
            const orderId = v || orderIdOf(row);

            return (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => navigate(`/app/orders/view/${orderId}`)}
                  className="font-mono font-medium text-[var(--admin-navy)] hover:underline text-left"
                >
                  <span className="font-mono text-xs text-gray-500">
                    {orderId ? String(orderId).slice(-8) : "—"}
                  </span>
                </button>
              </div>
            );
          },
        },

        {
          key: "invoiceType",
          label: "Document",
          sortable: true,
          render: (v, row) => (
            <div className="min-w-[180px]">
              <span className="whitespace-nowrap rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                {invoiceTypeLabel(v || row.invoice_type)}
              </span>
              <div className="mt-1 text-xs text-gray-500">
                {invoicePurpose(row)}
              </div>
            </div>
          ),
        },
        {
          key: "parties",
          label: "From / To",
          render: (_, row) => {
            const type = row.invoiceType || row.invoice_type;
            const metadata = invoiceMetadata(row);
            const seller =
              metadata.organization?.legalBusinessName ||
              metadata.organization?.storeDisplayName ||
              metadata.seller?.legalBusinessName ||
              metadata.seller?.businessName ||
              metadata.seller?.displayName ||
              "Seller";
            const customer =
              metadata.buyer?.profile?.displayName ||
              metadata.buyer?.email ||
              "Customer";
            const issuer = type === "seller_customer" ? seller : "Sam Global";
            const recipient =
              type === "platform_commission" ? seller : customer;
            return (
              <div className="min-w-[220px] text-xs text-gray-600">
                <div>
                  <span className="font-semibold text-gray-800">From:</span>{" "}
                  {issuer}
                </div>
                <div>
                  <span className="font-semibold text-gray-800">To:</span>{" "}
                  {recipient}
                </div>
              </div>
            );
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
                color={
                  status === "issued"
                    ? "green"
                    : status === "cancelled"
                      ? "red"
                      : status === "amended"
                        ? "yellow"
                        : "gray"
                }
              />
            );
          },
        },
        {
          key: "organizationId",
          label: "Organization",
          render: (v, row) => (
            <span className="font-mono text-xs text-gray-500">
              {shortId(v || row.organization_id)}
            </span>
          ),
        },
        {
          key: "taxableAmount",
          label: "Taxable",
          sortable: true,
          render: (v, row) => (
            <span className="text-sm">{money(v ?? row.taxable_amount)}</span>
          ),
        },
        {
          key: "taxAmount",
          label: "Tax",
          sortable: true,
          render: (v, row) => (
            <span className="text-sm font-medium">
              {money(v ?? row.totalTax ?? row.tax_amount)}
            </span>
          ),
        },
        {
          key: "totalAmount",
          label: "Total",
          sortable: true,
          render: (v, row) => (
            <span className="text-sm font-semibold">
              {money(v ?? row.total_amount)}
            </span>
          ),
        },
        {
          key: "issuedAt",
          label: "Issued",
          sortable: true,
          render: (v, row) => (
            <span className="text-xs text-gray-500">
              {formatDateTime12Hour(v ?? row.issueDate ?? row.issued_at)}
            </span>
          ),
        },
      ].filter(
        (column) =>
          !(hideOrganizationColumn && column.key === "organizationId"),
      ),
    [downloadInvoice, downloadingId, hideOrganizationColumn, navigate],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSellerPanel() ? "Invoice Documents" : "Tax Invoices"}
        subtitle={
          isSellerPanel()
            ? "Download product invoices, platform commission invoices, and customer fee documents linked to your orders."
            : "View and manage tax invoices for orders, sellers, customers, and platform services."
        }
        breadcrumbs={[
          { label: "Invoices & Taxation" },
          { label: isSellerPanel() ? "Invoice Documents" : "Tax Invoices" },
        ]}
      />

      {/* {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )} */}

      {loading ? (
        <Loader />
      ) : (
        <DataTable
          columns={COLUMNS}
          data={payload.list}
          total={payload.total}
          listPage={list}
          searchPlaceholder="Search Invoice or Order..."
          emptyMessage="No tax invoices found"
          filterBar={
            <FilterBar
              filters={FILTER_FIELDS}
              listPage={list}
              loading={false}
            />
          }
          rowActions={(row) => {
            const invoiceId = pick(row, "id", "invoiceId", "invoice_id");

            return [
              {
                label: "View",
                icon: <MdVisibility size={16} className="text-blue-600" />,
                onClick: () => {
                  if (!invoiceId) {
                    toast.error("Invoice ID is missing");
                    return;
                  }

                  navigate(`/app/tax-invoices/${invoiceId}`, {
                    state: { invoice: row },
                  });
                },
              },
              {
                label: "Download PDF",
                icon: <MdDownload size={16} className="text-gray-600" />,
                disabled: downloadingId === invoiceId,
                onClick: () => downloadInvoice(row),
              },
            ];
          }}
        />
      )}
    </div>
  );
};

export default TaxInvoices;
