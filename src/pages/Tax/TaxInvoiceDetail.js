import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { MdArrowBack, MdDownload } from "react-icons/md";
import Loader from "../../components/Loader/Loader";
import { PageHeader, StatusBadge } from "../../components/Shared";
import { getTaxInvoice } from "../../Redux/adminCoreSlice";
import { downloadApiFile } from "../../_helpers/downloadApi";
import { ENDPOINTS } from "../../_helpers/endpoints";

const pick = (row = {}, ...keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
  }
  return undefined;
};

const unwrap = (payload = {}) => payload?.data?.data || payload?.data || payload || {};
const money = (value, currency = "INR") =>
  `${currency} ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value) => (value ? moment(value).format("DD MMM YYYY, hh:mm A") : "—");
const label = (value = "") => String(value || "—").replace(/_/g, " ");

const invoiceCopy = {
  order_customer: {
    title: "Customer Order GST Invoice",
    description: "Platform-issued customer invoice for the complete order.",
  },
  seller_customer: {
    title: "Seller Customer GST Invoice",
    description: "Seller-issued customer invoice for this seller or organization package.",
  },
  platform_commission: {
    title: "Platform Commission Tax Invoice",
    description: "Platform invoice to seller for commission cut and GST on platform fee.",
  },
};

const Field = ({ label: fieldLabel, value, mono = false }) => (
  <div>
    <p className="text-xs font-medium uppercase text-gray-500">{fieldLabel}</p>
    <p className={`mt-1 text-sm text-gray-900 ${mono ? "font-mono break-all" : ""}`}>{value || "—"}</p>
  </div>
);

const AmountCard = ({ label: cardLabel, value, tone = "default" }) => {
  const toneClass = tone === "green" ? "text-green-700" : tone === "red" ? "text-red-600" : "text-gray-950";
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase text-gray-500">{cardLabel}</p>
      <p className={`mt-2 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
};

const TaxInvoiceDetail = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const stateInvoice = location.state?.invoice || null;
  const fetchedInvoice = unwrap(selector.taxInvoiceData);
  const invoice = useMemo(() => {
    const fetchedId = pick(fetchedInvoice, "id", "invoiceId", "invoice_id");
    if (fetchedId && String(fetchedId) === String(invoiceId)) return fetchedInvoice;
    return stateInvoice || {};
  }, [fetchedInvoice, invoiceId, stateInvoice]);

  const metadata = useMemo(() => {
    const raw = pick(invoice, "metadata") || {};
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return {};
      }
    }
    return raw || {};
  }, [invoice]);

  const invoiceType = pick(invoice, "invoiceType", "invoice_type") || "order_customer";
  const copy = invoiceCopy[invoiceType] || invoiceCopy.order_customer;
  const currency = pick(invoice, "currency") || "INR";
  const amountMeta = metadata.amounts || {};
  const items = metadata.items || metadata.lineItems || [];

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) return;
    try {
      setLoading(true);
      await dispatch(getTaxInvoice({ invoiceId })).unwrap();
    } catch (error) {
      toast.error(error?.message || error || "Unable to load invoice");
    } finally {
      setLoading(false);
    }
  }, [dispatch, invoiceId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const downloadInvoice = async () => {
    try {
      setDownloading(true);
      await downloadApiFile(
        ENDPOINTS.tax.invoiceDownload(invoiceId),
        { format: "html" },
        { filename: `${pick(invoice, "invoiceNumber", "invoice_number") || invoiceId}.html`, format: "html" },
      );
      toast.success("Download started");
    } catch (error) {
      toast.error(error?.message || "Unable to download invoice");
    } finally {
      setDownloading(false);
    }
  };

  if (loading && !pick(invoice, "id", "invoice_id")) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        subtitle={copy.description}
        breadcrumbs={[{ label: "Invoices & Taxation" }, { label: "Tax Invoices" }, { label: pick(invoice, "invoiceNumber", "invoice_number") || "Detail" }]}
        actions={(
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate("/app/tax-invoices")} className="admin-btn-secondary">
              <MdArrowBack size={16} /> Back
            </button>
            <button type="button" onClick={downloadInvoice} disabled={downloading} className="admin-btn-primary">
              <MdDownload size={16} /> Download PDF
            </button>
          </div>
        )}
      />

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm font-semibold text-gray-950">{pick(invoice, "invoiceNumber", "invoice_number") || "—"}</p>
            <p className="mt-1 text-sm text-gray-500">{label(invoiceType)}</p>
          </div>
          <StatusBadge status={pick(invoice, "state", "status", "invoice_state") || "issued"} dot />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Order" value={pick(invoice, "orderId", "order_id")} mono />
          <Field label="Reference" value={[pick(invoice, "reference_type"), pick(invoice, "reference_id")].filter(Boolean).join(" / ")} mono />
          <Field label="Issued" value={date(pick(invoice, "issuedAt", "issued_at", "created_at"))} />
          <Field label="Place of Supply" value={pick(invoice, "place_of_supply") || metadata.shippingAddress?.state} />
          <Field label="Seller" value={pick(invoice, "sellerId", "seller_id") || metadata.seller?.displayName || metadata.seller?.businessName} mono />
          <Field label="Buyer" value={pick(invoice, "buyerId", "buyer_id") || metadata.buyer?.email} mono />
          <Field label="Organization" value={pick(invoice, "organizationId", "organization_id") || metadata.organization?.legalBusinessName} mono />
          <Field label="GSTIN Seller" value={pick(invoice, "gstin_seller") || metadata.seller?.gstNumber} mono />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AmountCard label="Taxable Amount" value={money(pick(invoice, "taxableAmount", "taxable_amount") ?? amountMeta.productTaxableAmount, currency)} />
        <AmountCard label="GST / Tax" value={money(pick(invoice, "taxAmount", "tax_amount"), currency)} tone="red" />
        <AmountCard label="TCS" value={money(pick(invoice, "tcsAmount", "tcs_amount"), currency)} tone="red" />
        <AmountCard label="Total" value={money(pick(invoice, "totalAmount", "total_amount") ?? amountMeta.finalPayableAmount, currency)} tone="green" />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Tax Breakup</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
          <AmountCard label="CGST" value={money(pick(invoice, "cgstAmount", "cgst_amount"), currency)} />
          <AmountCard label="SGST" value={money(pick(invoice, "sgstAmount", "sgst_amount"), currency)} />
          <AmountCard label="IGST" value={money(pick(invoice, "igstAmount", "igst_amount"), currency)} />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">HSN</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Taxable</th>
                <th className="px-4 py-3">Tax</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length ? items.map((item, index) => (
                <tr key={item.orderItemId || item.productId || index}>
                  <td className="px-4 py-3">{item.productTitle || item.description || "—"}</td>
                  <td className="px-4 py-3">{item.hsnCode || "—"}</td>
                  <td className="px-4 py-3">{item.quantity || "—"}</td>
                  <td className="px-4 py-3">{money(item.taxableAmount, currency)}</td>
                  <td className="px-4 py-3">{money(item.taxAmount, currency)}</td>
                  <td className="px-4 py-3">{money(item.totalAmount ?? item.lineTotal, currency)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">No line items available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default TaxInvoiceDetail;
