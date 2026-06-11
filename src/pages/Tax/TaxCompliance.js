import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { DataTable } from "../../components/Shared";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import {
  createTaxCreditNote,
  createTaxInvoice,
  getTaxCreditNotes,
  getTaxInvoices,
  getTaxReports,
} from "../../Redux/adminCoreSlice";

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const money = (value) => Number(value || 0).toFixed(2);
const csvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

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

  const [activeTab, setActiveTab] = useState("invoices");
  const [filters, setFilters] = useState({ search: "", fromDate: "", toDate: "", sellerId: "", buyerId: "", state: "", hsnCode: "" });
  const [loading, setLoading] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [creditModal, setCreditModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ orderId: "" });
  const [creditForm, setCreditForm] = useState({ orderId: "", referenceType: "manual", referenceId: "", taxableAmount: "", taxAmount: "", reason: "" });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        dispatch(getTaxInvoices({ ...filters, limit: 50, offset: 0 })).unwrap(),
        dispatch(getTaxCreditNotes({ fromDate: filters.fromDate, toDate: filters.toDate, limit: 50, offset: 0 })).unwrap(),
        dispatch(getTaxReports({ fromDate: filters.fromDate, toDate: filters.toDate, limit: 200, offset: 0 })).unwrap(),
      ]);
    } catch (error) {
      toast.error(error?.message || error || "Failed to fetch tax data");
    } finally {
      setLoading(false);
    }
  }, [dispatch, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFilter = (field, value) => setFilters((prev) => ({ ...prev, [field]: value }));

  const resetFilters = () => setFilters({ search: "", fromDate: "", toDate: "", sellerId: "", buyerId: "", state: "", hsnCode: "" });

  const exportCsv = useCallback(() => {
    const rows = activeTab === "creditNotes" ? creditNotes.list : invoices.list;
    if (!rows.length) {
      toast.error("No records to export");
      return;
    }
    const headers = activeTab === "creditNotes"
      ? ["Credit Note", "Order", "Reference", "Taxable", "Tax", "Total", "Issued"]
      : ["Invoice", "Order", "Buyer", "Taxable", "CGST", "SGST", "IGST", "Total", "Issued"];
    const body = rows.map((row) => activeTab === "creditNotes"
      ? [row.credit_note_number, row.order_id, `${row.reference_type}:${row.reference_id}`, row.taxable_amount, row.tax_amount, row.total_amount, row.issued_at]
      : [row.invoice_number, row.order_id, row.buyer_id, row.taxable_amount, row.cgst_amount, row.sgst_amount, row.igst_amount, row.total_amount, row.issued_at]);
    const csv = [headers, ...body].map((row) => row.map(csvValue).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tax-${activeTab}-${moment().format("YYYYMMDD-HHmm")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeTab, creditNotes.list, invoices.list]);

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
      setInvoiceForm({ orderId: "" });
      await fetchData();
    } catch (error) {
      toast.error(error?.message || error || "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchData, invoiceForm.orderId]);

  const createCredit = useCallback(async () => {
    if (!creditForm.orderId.trim() || !creditForm.taxableAmount) {
      toast.error("Order ID and taxable amount are required");
      return;
    }
    try {
      setLoading(true);
      await dispatch(createTaxCreditNote({
        ...creditForm,
        orderId: creditForm.orderId.trim(),
        referenceId: creditForm.referenceId || creditForm.orderId.trim(),
        taxableAmount: Number(creditForm.taxableAmount),
        ...(creditForm.taxAmount ? { taxAmount: Number(creditForm.taxAmount) } : {}),
      })).unwrap();
      toast.success("Credit note generated successfully");
      setCreditModal(false);
      setCreditForm({ orderId: "", referenceType: "manual", referenceId: "", taxableAmount: "", taxAmount: "", reason: "" });
      await fetchData();
    } catch (error) {
      toast.error(error?.message || error || "Failed to generate credit note");
    } finally {
      setLoading(false);
    }
  }, [creditForm, dispatch, fetchData]);

  const INVOICE_COLS = [
    { key: "invoice_number", label: "Invoice", render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: "order_id", label: "Order", render: (v) => <span className="text-xs">{v}</span> },
    { key: "buyer_id", label: "Buyer", render: (v) => <span className="text-xs">{v}</span> },
    { key: "taxable_amount", label: "Taxable", render: (v) => <span className="font-mono text-xs">₹ {money(v)}</span> },
    { key: "cgst_amount", label: "CGST", render: (v) => <span className="font-mono text-xs">₹ {money(v)}</span> },
    { key: "sgst_amount", label: "SGST", render: (v) => <span className="font-mono text-xs">₹ {money(v)}</span> },
    { key: "igst_amount", label: "IGST", render: (v) => <span className="font-mono text-xs">₹ {money(v)}</span> },
    { key: "total_amount", label: "Total", render: (v) => <span className="font-mono text-sm font-medium">₹ {money(v)}</span> },
    { key: "issued_at", label: "Issued", render: (v) => <span className="text-xs text-gray-500">{v ? moment(v).format("DD-MM-YYYY HH:mm") : "N/A"}</span> },
  ];

  const CREDIT_COLS = [
    { key: "credit_note_number", label: "Credit Note", render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: "order_id", label: "Order", render: (v) => <span className="text-xs">{v}</span> },
    { key: "reference", label: "Reference", render: (_, row) => <span className="text-xs">{row.reference_type}:{row.reference_id}</span> },
    { key: "taxable_amount", label: "Taxable", render: (v) => <span className="font-mono text-xs">₹ {money(v)}</span> },
    { key: "tax_amount", label: "Tax", render: (v) => <span className="font-mono text-xs">₹ {money(v)}</span> },
    { key: "total_amount", label: "Total", render: (v) => <span className="font-mono text-sm font-medium">₹ {money(v)}</span> },
    { key: "issued_at", label: "Issued", render: (v) => <span className="text-xs text-gray-500">{v ? moment(v).format("DD-MM-YYYY HH:mm") : "N/A"}</span> },
  ];

  const REPORT_COLS = [
    { key: "tax_component", label: "Component", render: (v) => <span className="font-medium">{firstDefined(v, "N/A")}</span> },
    { key: "entry_type", label: "Entry Type", render: (v) => <span className="text-sm text-gray-600">{firstDefined(v, "N/A")}</span> },
    { key: "entry_count", label: "Count", render: (v) => <span className="font-mono text-sm">{v || 0}</span> },
    { key: "total_amount", label: "Amount", render: (v) => <span className="font-mono text-sm font-medium">₹ {money(v)}</span> },
  ];

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--admin-navy)]">Tax Documents</h1>
          <p className="text-sm text-gray-400 mt-0.5">Invoices, credit notes and tax ledger reports</p>
        </div>
        <div className="flex gap-2">
          <PermissionGuard module="tax" action="update" hide>
            <button type="button" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50" onClick={() => setInvoiceModal(true)}>Generate Invoice</button>
            <button type="button" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50" onClick={() => setCreditModal(true)}>Create Credit Note</button>
          </PermissionGuard>
          <PermissionGuard module="tax" action="export" hide>
            <button type="button" className="px-4 py-2 text-sm bg-[var(--admin-gold)] text-white rounded-lg hover:bg-[var(--admin-gold-dark)]" onClick={exportCsv}>Export CSV</button>
          </PermissionGuard>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" placeholder="Search invoice/order" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" placeholder="Seller ID" value={filters.sellerId} onChange={(e) => setFilter("sellerId", e.target.value)} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" placeholder="Buyer ID" value={filters.buyerId} onChange={(e) => setFilter("buyerId", e.target.value)} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" placeholder="HSN code" value={filters.hsnCode} onChange={(e) => setFilter("hsnCode", e.target.value)} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" placeholder="State" value={filters.state} onChange={(e) => setFilter("state", e.target.value)} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" type="date" value={filters.fromDate} onChange={(e) => setFilter("fromDate", e.target.value)} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" type="date" value={filters.toDate} onChange={(e) => setFilter("toDate", e.target.value)} />
          <button className="border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50" type="button" onClick={resetFilters}>Reset Filters</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {["invoices", "creditNotes", "report"].map((tab) => (
          <button key={tab} type="button" className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${activeTab === tab ? "bg-[var(--admin-navy)] text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-50"}`} onClick={() => setActiveTab(tab)}>
            {tab.replace(/([A-Z])/g, " $1")}
          </button>
        ))}
      </div>

      {activeTab === "invoices" && (
        <DataTable columns={INVOICE_COLS} data={invoices.list} loading={loading} totalCount={invoices.total} emptyText="No invoices found." requiredModule="tax" />
      )}
      {activeTab === "creditNotes" && (
        <DataTable columns={CREDIT_COLS} data={creditNotes.list} loading={loading} totalCount={creditNotes.total} emptyText="No credit notes found." requiredModule="tax" />
      )}
      {activeTab === "report" && (
        <DataTable columns={REPORT_COLS} data={reportEntries} loading={loading} totalCount={reportEntries.length} emptyText="No report entries found." requiredModule="tax" />
      )}

      {invoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-4">Generate Invoice</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order ID <span className="text-red-500">*</span></label>
                <input type="text" value={invoiceForm.orderId} onChange={(e) => setInvoiceForm({ orderId: e.target.value })} placeholder="Enter order ID" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setInvoiceModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={createInvoice} disabled={loading} className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] disabled:opacity-60">Generate</button>
            </div>
          </div>
        </div>
      )}

      {creditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--admin-navy)] mb-4">Create Credit Note</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order ID <span className="text-red-500">*</span></label>
                <input type="text" value={creditForm.orderId} onChange={(e) => setCreditForm((p) => ({ ...p, orderId: e.target.value }))} placeholder="Enter order ID" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Type</label>
                <select value={creditForm.referenceType} onChange={(e) => setCreditForm((p) => ({ ...p, referenceType: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]">
                  <option value="manual">Manual</option>
                  <option value="cancellation">Cancellation</option>
                  <option value="return">Return</option>
                  <option value="refund">Refund</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference ID</label>
                <input type="text" value={creditForm.referenceId} onChange={(e) => setCreditForm((p) => ({ ...p, referenceId: e.target.value }))} placeholder="Optional reference ID" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taxable Amount <span className="text-red-500">*</span></label>
                <input type="number" value={creditForm.taxableAmount} onChange={(e) => setCreditForm((p) => ({ ...p, taxableAmount: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
                <input type="number" value={creditForm.taxAmount} onChange={(e) => setCreditForm((p) => ({ ...p, taxAmount: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea value={creditForm.reason} onChange={(e) => setCreditForm((p) => ({ ...p, reason: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setCreditModal(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={createCredit} disabled={loading} className="px-5 py-2 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)] disabled:opacity-60">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxCompliance;
