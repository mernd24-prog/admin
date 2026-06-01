import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import TableData from "../../components/Atoms/TableData/TableData";
import Loader from "../../components/Loader/Loader";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../components/Atoms/Input/Input";
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

  const invoiceRows = invoices.list.map((row) => [
    row.invoice_number,
    row.order_id,
    row.buyer_id,
    `₹ ${money(row.taxable_amount)}`,
    `₹ ${money(row.cgst_amount)}`,
    `₹ ${money(row.sgst_amount)}`,
    `₹ ${money(row.igst_amount)}`,
    `₹ ${money(row.total_amount)}`,
    row.issued_at ? moment(row.issued_at).format("DD-MM-YYYY HH:mm") : "N/A",
  ]);

  const creditRows = creditNotes.list.map((row) => [
    row.credit_note_number,
    row.order_id,
    `${row.reference_type}:${row.reference_id}`,
    `₹ ${money(row.taxable_amount)}`,
    `₹ ${money(row.tax_amount)}`,
    `₹ ${money(row.total_amount)}`,
    row.issued_at ? moment(row.issued_at).format("DD-MM-YYYY HH:mm") : "N/A",
  ]);

  const reportRows = useMemo(() => reportEntries.map((row) => [
    firstDefined(row.tax_component, "N/A"),
    firstDefined(row.entry_type, "N/A"),
    row.entry_count || 0,
    `₹ ${money(row.total_amount)}`,
  ]), [reportEntries]);

  return (
    <div className="p-3 max-w-7xl mx-auto">
      <Loader loading={loading} />
      <h3 className="text-gray-500 text-sm font-semibold py-6">Home / <span className="text-[#181c32]">Tax Documents</span></h3>

      <section className="bg-white p-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pb-4">
          <input className="border rounded px-3 py-2 text-sm" placeholder="Search invoice/order" value={filters.search} onChange={(event) => setFilter("search", event.target.value)} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Seller ID" value={filters.sellerId} onChange={(event) => setFilter("sellerId", event.target.value)} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="Buyer ID" value={filters.buyerId} onChange={(event) => setFilter("buyerId", event.target.value)} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="HSN code" value={filters.hsnCode} onChange={(event) => setFilter("hsnCode", event.target.value)} />
          <input className="border rounded px-3 py-2 text-sm" placeholder="State" value={filters.state} onChange={(event) => setFilter("state", event.target.value)} />
          <input className="border rounded px-3 py-2 text-sm" type="date" value={filters.fromDate} onChange={(event) => setFilter("fromDate", event.target.value)} />
          <input className="border rounded px-3 py-2 text-sm" type="date" value={filters.toDate} onChange={(event) => setFilter("toDate", event.target.value)} />
          <button className="border rounded px-3 py-2 text-sm" type="button" onClick={resetFilters}>Reset</button>
        </div>

        <div className="flex flex-wrap justify-between gap-2 pb-4">
          <div className="flex gap-2">
            {["invoices", "creditNotes", "report"].map((tab) => (
              <button key={tab} type="button" className={`px-4 py-2 rounded text-sm capitalize ${activeTab === tab ? "bg-[#181c32] text-white" : "border"}`} onClick={() => setActiveTab(tab)}>
                {tab.replace(/([A-Z])/g, " $1")}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <PermissionGuard module="tax" action="update" hide>
              <button type="button" className="border px-4 py-2 rounded text-sm" onClick={() => setInvoiceModal(true)}>Generate Invoice</button>
              <button type="button" className="border px-4 py-2 rounded text-sm" onClick={() => setCreditModal(true)}>Create Credit Note</button>
            </PermissionGuard>
            <PermissionGuard module="tax" action="export" hide>
              <button type="button" className="bg-[#181c32] text-white px-4 py-2 rounded text-sm" onClick={exportCsv}>Export</button>
            </PermissionGuard>
          </div>
        </div>

        {activeTab === "invoices" && <TableData Heading="Tax Invoices" tableHeadings={["Invoice", "Order", "Buyer", "Taxable", "CGST", "SGST", "IGST", "Total", "Issued"]} data={invoiceRows} showSearch={false} showFilter={false} showAddButton={false} totalData={invoices.total} />}
        {activeTab === "creditNotes" && <TableData Heading="Credit Notes" tableHeadings={["Credit Note", "Order", "Reference", "Taxable", "Tax", "Total", "Issued"]} data={creditRows} showSearch={false} showFilter={false} showAddButton={false} totalData={creditNotes.total} />}
        {activeTab === "report" && <TableData Heading="Tax Ledger Report" tableHeadings={["Component", "Entry Type", "Count", "Amount"]} data={reportRows} showSearch={false} showFilter={false} showAddButton={false} totalData={reportRows.length} />}
      </section>

      <DefaultModal isOpen={invoiceModal} onClose={() => setInvoiceModal(false)} title="Generate Invoice" onSubmit={createInvoice}>
        <Input labelName="Order ID" name="orderId" value={invoiceForm.orderId} onChange={(event) => setInvoiceForm({ orderId: event.target.value })} placeholder="Enter order ID" required />
      </DefaultModal>

      <DefaultModal isOpen={creditModal} onClose={() => setCreditModal(false)} title="Create Credit Note" onSubmit={createCredit}>
        <div className="space-y-3">
          <Input labelName="Order ID" name="orderId" value={creditForm.orderId} onChange={(event) => setCreditForm((prev) => ({ ...prev, orderId: event.target.value }))} placeholder="Enter order ID" required />
          <select className="border rounded px-3 py-2 text-sm w-full" value={creditForm.referenceType} onChange={(event) => setCreditForm((prev) => ({ ...prev, referenceType: event.target.value }))}>
            <option value="manual">Manual</option>
            <option value="cancellation">Cancellation</option>
            <option value="return">Return</option>
            <option value="refund">Refund</option>
          </select>
          <Input labelName="Reference ID" name="referenceId" value={creditForm.referenceId} onChange={(event) => setCreditForm((prev) => ({ ...prev, referenceId: event.target.value }))} placeholder="Optional reference ID" />
          <Input type="number" labelName="Taxable Amount" name="taxableAmount" value={creditForm.taxableAmount} onChange={(event) => setCreditForm((prev) => ({ ...prev, taxableAmount: event.target.value }))} required />
          <Input type="number" labelName="Tax Amount" name="taxAmount" value={creditForm.taxAmount} onChange={(event) => setCreditForm((prev) => ({ ...prev, taxAmount: event.target.value }))} />
          <Input type="textarea" labelName="Reason" name="reason" value={creditForm.reason} onChange={(event) => setCreditForm((prev) => ({ ...prev, reason: event.target.value }))} />
        </div>
      </DefaultModal>
    </div>
  );
};

export default TaxCompliance;
