import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdAdd, MdReceiptLong, MdVisibility } from "react-icons/md";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
} from "../../components/Shared";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import {
  createTaxCreditNote,
  createTaxInvoice,
  getTaxCreditNotes,
  getTaxInvoices,
  getTaxReports,
} from "../../Redux/adminCoreSlice";
import { ACTIONS } from "../../_helpers/usePermission";
import { useListPage } from "../../hooks/useListPage";
import { dropdownApi } from "../../_helpers/dropdownApi";

const FILTER_FIELDS = [
  { key: "orderId", type: "text", label: "Order #", width: "w-56" },
  { key: "sellerId", type: "asyncDropdown", label: "Seller", load: (search) => dropdownApi.getSellers({ keyWord: search, searchFields: "storeName,email" }) },
  { key: "organizationId", type: "text", label: "Organization ID", width: "w-52" },
  { key: "buyerId", type: "asyncDropdown", label: "Buyer", load: (search) => dropdownApi.getBuyers({ keyWord: search, searchFields: "full_name,email" }) },
  { key: "hsnCode", type: "text", label: "HSN", width: "w-32" },
  { key: "state", type: "text", label: "State", width: "w-36" },
  {
    key: "referenceType",
    type: "select",
    label: "Credit Ref",
    width: "w-40",
    options: [
      { value: "manual", label: "Manual" },
      { value: "cancellation", label: "Cancellation" },
      { value: "return", label: "Return" },
      { value: "refund", label: "Refund" },
    ],
  },
  {
    key: "taxComponent",
    type: "select",
    label: "Component",
    width: "w-36",
    options: [
      { value: "cgst", label: "CGST" },
      { value: "sgst", label: "SGST" },
      { value: "igst", label: "IGST" },
      { value: "tcs", label: "TCS" },
    ],
  },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const EMPTY_INVOICE = { orderId: "" };
const EMPTY_CREDIT = {
  orderId: "",
  invoiceId: "",
  referenceType: "manual",
  referenceId: "",
  taxableAmount: "",
  taxAmount: "",
  reason: "",
};

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const money = (value) => Number(value || 0).toFixed(2);
const shortId = (value = "") => {
  const text = String(value || "");
  return text.length > 12 ? `${text.slice(0, 8)}...${text.slice(-4)}` : text || "—";
};

const getListData = (payload = {}) => {
  const data = payload?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || [],
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
  };
};

const TaxCompliance = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);
  const invoices = getListData(selector.taxInvoicesData);
  const creditNotes = getListData(selector.taxCreditNotesData);
  const reportEntries = useMemo(
    () => selector?.taxReportsData?.data?.data?.entries || [],
    [selector?.taxReportsData],
  );
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "issued_at", defaultSortDir: "desc" });
  const { toQueryParams } = list;

  const [activeTab, setActiveTab] = useState("invoices");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [creditModal, setCreditModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE);
  const [creditForm, setCreditForm] = useState(EMPTY_CREDIT);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      const paging = { limit: params.limit, offset: (params.page - 1) * params.limit };
      await Promise.all([
        dispatch(getTaxInvoices({ ...params, ...paging })).unwrap(),
        dispatch(getTaxCreditNotes({ ...params, ...paging })).unwrap(),
        dispatch(getTaxReports({ ...params, limit: 200, offset: 0 })).unwrap(),
      ]);
    } catch (requestError) {
      const message = requestError?.message || requestError || "Failed to fetch tax data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportRows = useMemo(() => {
    if (activeTab === "creditNotes") return creditNotes.list;
    if (activeTab === "report") return reportEntries;
    return invoices.list;
  }, [activeTab, creditNotes.list, invoices.list, reportEntries]);

  const createInvoice = useCallback(async () => {
    if (!invoiceForm.orderId.trim()) {
      toast.error("Order ID is required");
      return;
    }
    try {
      setLoading(true);
      await dispatch(createTaxInvoice({ orderId: invoiceForm.orderId.trim() })).unwrap();
      toast.success("Invoice generated successfully");
      setInvoiceModal(false);
      setConfirmAction(null);
      setInvoiceForm(EMPTY_INVOICE);
      await fetchData();
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchData, invoiceForm.orderId]);

  const createCredit = useCallback(async () => {
    if (!creditForm.orderId.trim() || !creditForm.taxableAmount) {
      toast.error("Order ID and taxable amount are required");
      return;
    }
    if (Number(creditForm.taxableAmount) <= 0) {
      toast.error("Taxable amount must be greater than zero");
      return;
    }
    try {
      setLoading(true);
      await dispatch(createTaxCreditNote({
        ...creditForm,
        orderId: creditForm.orderId.trim(),
        referenceId: creditForm.referenceId || creditForm.orderId.trim(),
        taxableAmount: Number(creditForm.taxableAmount),
        ...(creditForm.invoiceId ? { invoiceId: creditForm.invoiceId.trim() } : {}),
        ...(creditForm.taxAmount ? { taxAmount: Number(creditForm.taxAmount) } : {}),
      })).unwrap();
      toast.success("Credit note generated successfully");
      setCreditModal(false);
      setConfirmAction(null);
      setCreditForm(EMPTY_CREDIT);
      await fetchData();
    } catch (requestError) {
      toast.error(requestError?.message || requestError || "Failed to generate credit note");
    } finally {
      setLoading(false);
    }
  }, [creditForm, dispatch, fetchData]);

  const invoiceColumns = useMemo(() => [
    { key: "invoice_number", label: "Invoice", sortable: true, render: (value) => <span className="font-mono text-xs">{value}</span> },
    { key: "order_id", label: "Order", render: (value, row) => <span className="font-mono text-xs">{row.orderNumber || row.order_number || (value ? `#${String(value).slice(-8)}` : "—")}</span> },
    { key: "organization_id", label: "Organization", render: (value, row) => <span className="font-mono text-xs text-gray-500">{shortId(value || row.organizationId)}</span> },
    { key: "buyer_id", label: "Buyer", render: (value, row) => {
      const name = row.buyerName || row.buyer?.name || row.buyer?.full_name || row.buyer?.email;
      return name ? <span className="text-xs font-medium text-gray-700">{name}</span> : <span className="font-mono text-xs text-gray-400">{value ? `${String(value).slice(0, 10)}…` : "—"}</span>;
    } },
    { key: "taxable_amount", label: "Taxable", sortable: true, render: (value) => <span className="font-mono text-xs">₹ {money(value)}</span> },
    { key: "cgst_amount", label: "CGST", render: (value) => <span className="font-mono text-xs">₹ {money(value)}</span> },
    { key: "sgst_amount", label: "SGST", render: (value) => <span className="font-mono text-xs">₹ {money(value)}</span> },
    { key: "igst_amount", label: "IGST", render: (value) => <span className="font-mono text-xs">₹ {money(value)}</span> },
    { key: "total_amount", label: "Total", sortable: true, render: (value) => <span className="font-mono text-sm font-medium">₹ {money(value)}</span> },
    { key: "issued_at", label: "Issued", sortable: true, render: (value) => <span className="text-xs text-gray-500">{value ? moment(value).format("DD-MM-YYYY HH:mm") : "N/A"}</span> },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => setSelectedDoc({ type: "invoice", row })}>
          <MdVisibility size={15} /> View
        </button>
      ),
    },
  ], []);

  const creditColumns = useMemo(() => [
    { key: "credit_note_number", label: "Credit Note", sortable: true, render: (value) => <span className="font-mono text-xs">{value}</span> },
    { key: "order_id", label: "Order", render: (value, row) => <span className="font-mono text-xs">{row.orderNumber || row.order_number || (value ? `#${String(value).slice(-8)}` : "—")}</span> },
    { key: "organization_id", label: "Organization", render: (value, row) => <span className="font-mono text-xs text-gray-500">{shortId(value || row.organizationId)}</span> },
    { key: "reference", label: "Reference", render: (_, row) => <span className="text-xs text-gray-500">{[row.reference_type, row.reference_id ? `#${String(row.reference_id).slice(-8)}` : null].filter(Boolean).join(" ") || "—"}</span> },
    { key: "taxable_amount", label: "Taxable", sortable: true, render: (value) => <span className="font-mono text-xs">₹ {money(value)}</span> },
    { key: "tax_amount", label: "Tax", sortable: true, render: (value) => <span className="font-mono text-xs">₹ {money(value)}</span> },
    { key: "total_amount", label: "Total", sortable: true, render: (value) => <span className="font-mono text-sm font-medium">₹ {money(value)}</span> },
    { key: "issued_at", label: "Issued", sortable: true, render: (value) => <span className="text-xs text-gray-500">{value ? moment(value).format("DD-MM-YYYY HH:mm") : "N/A"}</span> },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <button type="button" className="admin-btn-secondary !px-2 !py-1" onClick={() => setSelectedDoc({ type: "credit note", row })}>
          <MdVisibility size={15} /> View
        </button>
      ),
    },
  ], []);

  const reportColumns = useMemo(() => [
    { key: "organization_id", label: "Organization", render: (value, row) => <span className="font-mono text-xs text-gray-500">{shortId(value || row.organizationId)}</span> },
    { key: "tax_component", label: "Component", render: (value) => <span className="font-medium">{firstDefined(value, "N/A")}</span> },
    { key: "entry_type", label: "Entry Type", render: (value) => <span className="text-sm text-gray-600">{firstDefined(value, "N/A")}</span> },
    { key: "entry_count", label: "Count", render: (value) => <span className="font-mono text-sm">{value || 0}</span> },
    { key: "total_amount", label: "Amount", render: (value) => <span className="font-mono text-sm font-medium">₹ {money(value)}</span> },
  ], []);

  const activeColumns = activeTab === "creditNotes" ? creditColumns : activeTab === "report" ? reportColumns : invoiceColumns;
  const activeRows = activeTab === "creditNotes" ? creditNotes.list : activeTab === "report" ? reportEntries : invoices.list;
  const activeTotal = activeTab === "creditNotes" ? creditNotes.total : activeTab === "report" ? reportEntries.length : invoices.total;

  return (
    <div className="max-w-7xl mx-auto mt-8">
      <PageHeader
        title="Tax Documents"
        subtitle="Invoices, credit notes, and tax ledger reports"
        breadcrumbs={[{ label: "Tax & Compliance" }, { label: "Tax Documents" }]}
        actions={(
          <div className="flex flex-wrap gap-2">
            <PermissionGuard module="tax" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-btn-primary" onClick={() => setInvoiceModal(true)}>
                <MdReceiptLong size={16} /> Generate Invoice
              </button>
              <button type="button" className="admin-btn-secondary" onClick={() => setCreditModal(true)}>
                <MdAdd size={16} /> Credit Note
              </button>
            </PermissionGuard>
          </div>
        )}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: "invoices", label: "Invoices" },
          { key: "creditNotes", label: "Credit Notes" },
          { key: "report", label: "Tax Report" },
        ].map((tab) => (
          <button key={tab.key} type="button" className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? "bg-[var(--admin-navy)] text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-50"}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={activeColumns}
        data={activeRows}
        loading={loading}
        totalCount={activeTotal}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        searchPlaceholder="Search invoice, credit note, order, or reference"
        onSort={activeTab === "report" ? undefined : list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onRefresh={fetchData}
        error={error}
        emptyText="No tax documents found."
        requiredModule="tax"
        filterBar={(
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        )}
        exportConfig={{
          filename: `tax-${activeTab}`,
          columns: activeColumns,
          data: exportRows,
        }}
      />

      <DefaultModal isOpen={invoiceModal} onClose={() => setInvoiceModal(false)} title="Generate Invoice">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Order ID <span className="text-red-500">*</span>
            <input type="text" value={invoiceForm.orderId} onChange={(event) => setInvoiceForm({ orderId: event.target.value })} placeholder="Enter order ID" className="admin-input mt-1 w-full" />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setInvoiceModal(false)} className="admin-btn-secondary">Cancel</button>
            <button type="button" onClick={() => setConfirmAction("invoice")} disabled={loading} className="admin-btn-primary">Generate</button>
          </div>
        </div>
      </DefaultModal>

      <DefaultModal isOpen={creditModal} onClose={() => setCreditModal(false)} title="Create Credit Note">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            Order ID <span className="text-red-500">*</span>
            <input type="text" value={creditForm.orderId} onChange={(event) => setCreditForm((prev) => ({ ...prev, orderId: event.target.value }))} placeholder="Enter order ID" className="admin-input mt-1 w-full" />
          </label>
          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            Invoice ID
            <input type="text" value={creditForm.invoiceId} onChange={(event) => setCreditForm((prev) => ({ ...prev, invoiceId: event.target.value }))} placeholder="Optional invoice ID" className="admin-input mt-1 w-full" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Reference Type
            <select value={creditForm.referenceType} onChange={(event) => setCreditForm((prev) => ({ ...prev, referenceType: event.target.value }))} className="admin-input mt-1 w-full">
              <option value="manual">Manual</option>
              <option value="cancellation">Cancellation</option>
              <option value="return">Return</option>
              <option value="refund">Refund</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Reference ID
            <input type="text" value={creditForm.referenceId} onChange={(event) => setCreditForm((prev) => ({ ...prev, referenceId: event.target.value }))} placeholder="Optional reference ID" className="admin-input mt-1 w-full" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Taxable Amount <span className="text-red-500">*</span>
            <input type="number" min="0" value={creditForm.taxableAmount} onChange={(event) => setCreditForm((prev) => ({ ...prev, taxableAmount: event.target.value }))} className="admin-input mt-1 w-full" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Tax Amount
            <input type="number" min="0" value={creditForm.taxAmount} onChange={(event) => setCreditForm((prev) => ({ ...prev, taxAmount: event.target.value }))} className="admin-input mt-1 w-full" />
          </label>
          <label className="block text-sm font-medium text-gray-700 md:col-span-2">
            Reason
            <textarea value={creditForm.reason} onChange={(event) => setCreditForm((prev) => ({ ...prev, reason: event.target.value }))} rows={2} className="admin-input mt-1 w-full" />
          </label>
          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setCreditModal(false)} className="admin-btn-secondary">Cancel</button>
            <button type="button" onClick={() => setConfirmAction("credit")} disabled={loading} className="admin-btn-primary">Create</button>
          </div>
        </div>
      </DefaultModal>

      <DefaultModal isOpen={Boolean(selectedDoc)} onClose={() => setSelectedDoc(null)} title={`${selectedDoc?.type || "Document"} Detail`}>
        <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto">{JSON.stringify(selectedDoc?.row || {}, null, 2)}</pre>
      </DefaultModal>

      <ConfirmModal
        open={confirmAction === "invoice"}
        onClose={() => setConfirmAction(null)}
        onConfirm={createInvoice}
        title="Generate invoice?"
        message="The invoice will be generated from the immutable order snapshot."
        variant="warning"
        confirmLabel="Generate invoice"
        loading={loading}
      />
      <ConfirmModal
        open={confirmAction === "credit"}
        onClose={() => setConfirmAction(null)}
        onConfirm={createCredit}
        title="Create credit note?"
        message="This will create tax reversal ledger entries from the original invoice/order snapshot."
        variant="warning"
        confirmLabel="Create credit note"
        loading={loading}
      />
    </div>
  );
};

export default TaxCompliance;
