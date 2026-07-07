/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdDownload, MdRefresh, MdVisibility } from "react-icons/md";
import Loader from "../../components/Loader/Loader";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import {
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../components/Shared";
import { getTaxInvoices } from "../../Redux/adminCoreSlice";
import { useListPage } from "../../hooks/useListPage";
import { dropdownApi } from "../../_helpers/dropdownApi";

const STATES = [
  "draft", "issued", "cancelled", "amended",
];

const FILTER_FIELDS = [
  { key: "search", type: "text", label: "Search", width: "w-56" },
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller",
    width: "w-52",
    load: (search) => dropdownApi.getSellers({ keyWord: search, searchFields: "full_name,email,businessName" }),
  },
  {
    key: "buyerId",
    type: "asyncDropdown",
    label: "Buyer",
    width: "w-52",
    load: (search) => dropdownApi.getBuyers({ keyWord: search, searchFields: "full_name,email" }),
  },
  { key: "organizationId", type: "text", label: "Organization ID", width: "w-52" },
  { key: "state", type: "select", label: "State", options: STATES.map((v) => ({ value: v, label: v })) },
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
const shortId = (value = "") => {
  const text = String(value || "");
  return text.length > 12 ? `${text.slice(0, 8)}...${text.slice(-4)}` : text || "—";
};

const TaxInvoices = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const payload = unwrapList(selector.taxInvoicesData);

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(getTaxInvoices({ ...params, offset: (params.page - 1) * params.limit })).unwrap();
    } catch (err) {
      const msg = err?.message || "Failed to load tax invoices";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const COLUMNS = [
    {
      key: "invoiceNumber",
      label: "Invoice #",
      sortable: true,
      render: (v) => <span className="font-mono text-sm font-medium">{v || "—"}</span>,
    },
    {
      key: "orderId",
      label: "Order",
      render: (v) => <span className="font-mono text-xs text-gray-500">{String(v || "—").slice(-8)}</span>,
    },
    {
      key: "state",
      label: "Status",
      render: (v) => (
        <StatusBadge
          status={v}
          color={v === "issued" ? "green" : v === "cancelled" ? "red" : v === "amended" ? "yellow" : "gray"}
        />
      ),
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
      render: (v) => <span className="text-sm">{money(v)}</span>,
    },
    {
      key: "totalTax",
      label: "Tax",
      render: (v) => <span className="text-sm font-medium">{money(v)}</span>,
    },
    {
      key: "totalAmount",
      label: "Total",
      sortable: true,
      render: (v) => <span className="text-sm font-semibold">{money(v)}</span>,
    },
    {
      key: "issueDate",
      label: "Issued",
      sortable: true,
      render: (v) => <span className="text-xs text-gray-500">{fmt(v)}</span>,
    },
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <div className="flex gap-1">
          <button
            onClick={() => setDetail(row)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="View"
          >
            <MdVisibility size={18} />
          </button>
          {row.pdfUrl && (
            <a
              href={row.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
              title="Download PDF"
            >
              <MdDownload size={18} />
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Invoices"
        subtitle="View and manage all tax invoices"
        breadcrumbs={[{ label: "Invoices & Taxation" }, { label: "Tax Invoices" }]}
        actions={
          <button
            onClick={fetchInvoices}

          >
            <MdRefresh size={16} />
            Refresh
          </button>
        }
      />

      <FilterBar fields={FILTER_FIELDS} listPage={list} />

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
        />
      )}

      <DefaultModal isOpen={!!detail} onClose={() => setDetail(null)} title="Invoice Detail">
        {detail && (
          <div className="p-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-gray-500">Invoice #</p><p className="font-mono font-medium">{detail.invoiceNumber || "—"}</p></div>
              <div><p className="text-gray-500">Status</p><StatusBadge status={detail.state} color={detail.state === "issued" ? "green" : "gray"} /></div>
              <div><p className="text-gray-500">Order ID</p><p className="font-mono text-xs">{detail.orderId || "—"}</p></div>
              <div><p className="text-gray-500">Seller ID</p><p className="font-mono text-xs">{detail.sellerId || "—"}</p></div>
              <div><p className="text-gray-500">Organization ID</p><p className="font-mono text-xs">{detail.organizationId || detail.organization_id || "—"}</p></div>
              <div><p className="text-gray-500">Buyer ID</p><p className="font-mono text-xs">{detail.buyerId || "—"}</p></div>
              <div><p className="text-gray-500">Issue Date</p><p>{fmt(detail.issueDate)}</p></div>
              <div><p className="text-gray-500">Taxable Amount</p><p>{money(detail.taxableAmount)}</p></div>
              <div><p className="text-gray-500">CGST</p><p>{money(detail.cgst)}</p></div>
              <div><p className="text-gray-500">SGST</p><p>{money(detail.sgst)}</p></div>
              <div><p className="text-gray-500">IGST</p><p>{money(detail.igst)}</p></div>
              <div><p className="text-gray-500">Total Tax</p><p className="font-medium">{money(detail.totalTax)}</p></div>
              <div><p className="text-gray-500">Total Amount</p><p className="font-semibold">{money(detail.totalAmount)}</p></div>
            </div>
            {detail.pdfUrl && (
              <a
                href={detail.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
              >
                <MdDownload size={16} />
                Download PDF
              </a>
            )}
          </div>
        )}
      </DefaultModal>
    </div>
  );
};

export default TaxInvoices;
