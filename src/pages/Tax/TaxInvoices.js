/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { MdDownload, MdVisibility } from "react-icons/md";

import {
  DataTable,
  FilterBar,
  OrderLink,
  PageHeader,
  StatusBadge,
} from "../../components/Shared";

import { getTaxInvoices } from "../../Redux/adminCoreSlice";
import { useListPage } from "../../hooks/useListPage";
import useStoreNames from "../../hooks/useStoreNames";
import { dropdownApi } from "../../_helpers/dropdownApi";
import { downloadApiFile } from "../../_helpers/downloadApi";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { isSellerPanel } from "../../_helpers/panelConfig";
import { formatDateTime12Hour, formatLabel } from "../../utils/formatters";
import { resolveStoreName } from "../../utils/storeNameUtils";

const STATES = ["draft", "issued", "cancelled", "amended"];

const INVOICE_TYPES = [
  { value: "seller_customer", label: "Seller → Customer" },
  { value: "platform_commission", label: "Platform → Seller" },
  { value: "platform_customer_fee", label: "Platform → Customer Fee" },
  { value: "order_customer", label: "Order Receipt" },
];

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
      {
        key: "invoiceType",
        type: "select",
        label: "Document Type",
        options: INVOICE_TYPES,
      },
      {
        key: "sellerId",
        type: "asyncDropdown",
        label: "Seller Store Name",
        width: "w-52",
        load: (search) =>
          dropdownApi.getStoreName({
            keyWord: search,
            searchFields: "organizationName,businessName,legalBusinessName",
          }),
      },
      {
        key: "status",
        type: "select",
        label: "Status",
        options: STATES.map((s) => ({
          value: s,
          label: formatLabel(s),
        })),
      },
      { key: "fromDate", type: "date", label: "From" },
      { key: "toDate", type: "date", label: "To" },
    ];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data;

  if (Array.isArray(data)) {
    return { list: data, total: data.length };
  }

  return {
    list: data?.list || data?.items || data?.invoices || data || [],
    total: Number(
      data?.total || data?.list?.length || data?.items?.length || 0,
    ),
  };
};

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

const pick = (row = {}, ...keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }

  return undefined;
};

const invoiceMetadata = (row = {}) => {
  if (!row.metadata || typeof row.metadata !== "string") {
    return row.metadata || {};
  }

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

  if (type === "platform_commission") {
    return "Platform service charge billed to seller.";
  }

  if (type === "platform_customer_fee") {
    return "Platform fee billed to customer.";
  }

  if (type === "order_customer") {
    return "Customer payment receipt. Not a seller tax invoice.";
  }

  return "Tax document";
};

const TaxInvoices = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.taxInvoicesData);

  // Global store-name lookup.
  const { storeNameMap } = useStoreNames();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  const hideOrganizationColumn = isSellerPanel();

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "issuedAt",
    defaultSortDir: "desc",
  });

  const { toQueryParams } = list;

  const firstDefined = (...values) =>
    values.find(
      (value) => value !== undefined && value !== null && value !== "",
    );

  const orderIdOf = (order = {}) =>
    firstDefined(order._id, order.id, order.orderId, order.order_no);

  /**
   * Fetch invoices.
   */
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

  /**
   * Download invoice PDF.
   */
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
          filename: `${
            pick(row, "invoiceNumber", "invoice_number") || invoiceId
          }.pdf`,
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

  /**
   * Table columns.
   */
  const COLUMNS = useMemo(
    () =>
      [
        {
          key: "invoiceNumber",
          label: "Document No.",
          sortable: true,
          render: (value, row) => (
            <span className="font-mono text-sm font-medium">
              {value || row.invoice_number || "—"}
            </span>
          ),
        },

        {
          key: "orderId",
          label: "Order",
          render: (value, row) => {
            const orderId = value || orderIdOf(row);

            return (
              <OrderLink
                orderId={orderId}
                orderNumber={row.orderNumber || row.order_number}
              />
            );
          },
        },

        {
          key: "invoiceType",
          label: "Document",
          sortable: true,
          render: (value, row) => (
            <div className="min-w-[180px]">
              <span className="whitespace-nowrap rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                {invoiceTypeLabel(value || row.invoice_type)}
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
          render: (value, row) => {
            const status = value || row.status || row.invoice_state || "issued";

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
          label: "Store Name",
          render: (_, row) => {
            const { name, id } = resolveStoreName(row, storeNameMap);

            return (
              <span className="font-medium text-[var(--admin-navy)]" title={id}>
                {name}
              </span>
            );
          },
        },

        {
          key: "taxableAmount",
          label: "Taxable",
          sortable: true,
          render: (value, row) => (
            <span className="text-sm">
              {money(value ?? row.taxable_amount)}
            </span>
          ),
        },

        {
          key: "taxAmount",
          label: "Tax",
          sortable: true,
          render: (value, row) => (
            <span className="text-sm font-medium">
              {money(value ?? row.totalTax ?? row.tax_amount)}
            </span>
          ),
        },

        {
          key: "totalAmount",
          label: "Total",
          sortable: true,
          render: (value, row) => (
            <span className="text-sm font-semibold">
              {money(value ?? row.total_amount)}
            </span>
          ),
        },

        {
          key: "issuedAt",
          label: "Issued",
          sortable: true,
          render: (value, row) => (
            <span className="text-xs text-gray-500">
              {formatDateTime12Hour(value ?? row.issueDate ?? row.issued_at)}
            </span>
          ),
        },
      ].filter(
        (column) =>
          !(hideOrganizationColumn && column.key === "organizationId"),
      ),
    [hideOrganizationColumn, storeNameMap],
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
          {
            label: isSellerPanel() ? "Invoice Documents" : "Tax Invoices",
          },
        ]}
      />

      <DataTable
        columns={COLUMNS}
        data={payload.list}
        loading={loading}
        total={payload.total}
        listPage={list}
        searchPlaceholder="Search Invoice or Order..."
        emptyMessage={error || "No tax invoices found"}
        onRefresh={fetchInvoices}
        filterBar={
          <FilterBar filters={FILTER_FIELDS} listPage={list} loading={false} />
        }
        rowActions={(row) => {
          const invoiceId = pick(row, "id", "invoiceId", "invoice_id");

          return [
            {
              label: "View",
              icon: (
                <MdVisibility
                  aria-hidden="true"
                  size={16}
                  className="text-blue-600"
                />
              ),
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
              icon: (
                <MdDownload
                  aria-hidden="true"
                  size={16}
                  className="text-gray-600"
                />
              ),
              disabled: downloadingId === invoiceId,
              onClick: () => downloadInvoice(row),
            },
          ];
        }}
      />
    </div>
  );
};

export default TaxInvoices;
