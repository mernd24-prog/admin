import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  MdAccountBalance,
  MdArrowBack,
  MdDownload,
  MdLocalOffer,
  MdPayments,
  MdPercent,
  MdReceiptLong,
} from "react-icons/md";
import Loader from "../../components/Loader/Loader";
import {
  PageHeader,
  StatusBadge,
  SummaryCard,
} from "../../components/Shared";
import { getTaxInvoice } from "../../Redux/adminCoreSlice";
import { downloadApiFile } from "../../_helpers/downloadApi";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { formatDateTime12Hour } from "../../utils/formatters";

const pick = (row = {}, ...keys) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
  }
  return undefined;
};

const unwrap = (payload = {}) => payload?.data?.data || payload?.data || payload || {};
const money = (value, currency = "INR") =>
  `${currency} ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value) => formatDateTime12Hour(value, "—");
const label = (value = "") => String(value || "—").replace(/_/g, " ");

const invoiceCopy = {
  order_customer: {
    title: "Customer Order Receipt",
    description: "Marketplace payment summary for the complete multi-seller order; seller tax invoices are separate.",
  },
  seller_customer: {
    title: "Seller Customer GST Invoice",
    description: "Seller-issued customer invoice for this seller or organization package.",
  },
  platform_commission: {
    title: "Platform Commission Tax Invoice",
    description: "Platform invoice to seller for commission cut and GST on platform fee.",
  },
  platform_customer_fee: {
    title: "Customer Platform Fee Tax Invoice",
    description: "Marketplace-issued customer invoice for a taxable platform service fee; product invoices are separate.",
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
  const Icon = {
    "Taxable Amount": MdReceiptLong,
    "GST / Tax": MdPercent,
    TCS: MdAccountBalance,
    Total: MdPayments,
    CGST: MdPercent,
    SGST: MdPercent,
    IGST: MdPercent,
    "Seller-funded discount": MdLocalOffer,
    "Paid by customer": MdPayments,
    "Marketplace contribution": MdLocalOffer,
    "Payment partner contribution": MdAccountBalance,
  }[cardLabel] || MdReceiptLong;

  return (
    <SummaryCard
      title={cardLabel}
      value={value}
      icon={<Icon size={18} />}
      valueClassName={toneClass}
    />
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
  const items = invoiceType === "platform_commission" && metadata.itemReferences?.length
    ? metadata.itemReferences.map((item) => ({
        ...item,
        description: `Marketplace commission for ${item.productTitle || "order item"}`,
        hsnCode: item.serviceSacCode,
        taxableAmount: item.platformFeeAmount,
        taxAmount: item.platformFeeTaxAmount,
        totalAmount: Number(item.platformFeeAmount || 0) + Number(item.platformFeeTaxAmount || 0),
      }))
    : metadata.items || metadata.lineItems || [];
  const sellerName = metadata.organization?.legalBusinessName || metadata.organization?.storeDisplayName ||
    metadata.seller?.legalBusinessName || metadata.seller?.businessName || metadata.seller?.displayName ||
    pick(invoice, "sellerId", "seller_id");
  const customerName = metadata.buyer?.profile?.displayName ||
    [metadata.buyer?.profile?.firstName, metadata.buyer?.profile?.lastName].filter(Boolean).join(" ") ||
    metadata.buyer?.email || pick(invoice, "buyerId", "buyer_id");
  const issuerName = invoiceType === "seller_customer" ? sellerName : "Sam Global";
  const recipientName = invoiceType === "platform_commission" ? sellerName : customerName;
  const partyGstinLabel = invoiceType === "platform_commission"
    ? "Recipient GSTIN"
    : invoiceType === "seller_customer"
      ? "Supplier GSTIN"
      : "Marketplace GSTIN";
  const partyGstin = ["order_customer", "platform_customer_fee"].includes(invoiceType)
    ? pick(invoice, "gstin_marketplace")
    : pick(invoice, "gstin_seller") || metadata.seller?.gstNumber;

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
        { format: "pdf" },
        { filename: `${pick(invoice, "invoiceNumber", "invoice_number") || invoiceId}.pdf`, format: "pdf" },
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

      <section className="rounded-lg border border-gray-200 bg-[#FFFDF8] p-5">
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
          <Field label="Issued By" value={issuerName} />
          <Field label="Recipient" value={recipientName} />
          <Field label="Organization" value={pick(invoice, "organizationId", "organization_id") || metadata.organization?.legalBusinessName} mono />
          <Field label={partyGstinLabel} value={partyGstin} mono />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AmountCard label="Taxable Amount" value={money(pick(invoice, "taxableAmount", "taxable_amount") ?? amountMeta.productTaxableAmount, currency)} />
        <AmountCard label="GST / Tax" value={money(pick(invoice, "taxAmount", "tax_amount"), currency)} tone="red" />
        <AmountCard label="TCS" value={money(pick(invoice, "tcsAmount", "tcs_amount"), currency)} tone="red" />
        <AmountCard label="Total" value={money(pick(invoice, "totalAmount", "total_amount") ?? amountMeta.finalPayableAmount, currency)} tone="green" />
      </section>

      {invoiceType === "seller_customer" && (
        <section className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h2 className="text-sm font-semibold text-gray-900">Invoice payment allocation</h2>
          <p className="mt-1 text-xs text-gray-600">
            Marketplace and payment-partner promotions pay part of this seller invoice; they do not reduce its taxable value.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <AmountCard label="Seller-funded discount" value={money(amountMeta.sellerFundedDiscountAmount, currency)} />
            <AmountCard label="Paid by customer" value={money(amountMeta.customerPaidTowardInvoiceAmount, currency)} />
            <AmountCard label="Marketplace contribution" value={money(amountMeta.marketplaceFundedDiscountAmount, currency)} tone="green" />
            <AmountCard label="Payment partner contribution" value={money(amountMeta.paymentPartnerFundedDiscountAmount, currency)} tone="green" />
          </div>
        </section>
      )}

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
                <th className="px-4 py-3">{invoiceType === "platform_commission" ? "SAC" : "HSN"}</th>
                <th className="px-4 py-3">Qty</th>
                {invoiceType === "seller_customer" && <th className="px-4 py-3">Customer Promotion</th>}
                {invoiceType === "seller_customer" && <th className="px-4 py-3">Paid by Platform / Partner</th>}
                <th className="px-4 py-3">Taxable</th>
                <th className="px-4 py-3">Tax</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length ? items.map((item, index) => (
                <tr key={item.orderItemId || item.productId || index}>
                  <td className="px-4 py-3">
                    <div>{item.description || item.productTitle || "—"}</div>
                    {invoiceType === "platform_commission" && Number(item.commissionRate || 0) > 0 && (
                      <div className="mt-1 text-xs text-gray-500">Commission: {Number(item.commissionRate).toFixed(2)}%</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{item.hsnCode || "—"}</td>
                  <td className="px-4 py-3">{item.quantity || "—"}</td>
                  {invoiceType === "seller_customer" && <td className="px-4 py-3">{money(item.customerDiscountAmount, currency)}</td>}
                  {invoiceType === "seller_customer" && <td className="px-4 py-3">{money(
                    Number(item.marketplaceFundedDiscountAmount || 0) +
                    Number(item.paymentPartnerFundedDiscountAmount || 0),
                    currency,
                  )}</td>}
                  <td className="px-4 py-3">{money(item.taxableAmount, currency)}</td>
                  <td className="px-4 py-3">{money(item.taxAmount, currency)}</td>
                  <td className="px-4 py-3">{money(
                    item.totalAmount ?? (Number(item.taxableAmount || 0) + Number(item.taxAmount || 0)),
                    currency,
                  )}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={invoiceType === "seller_customer" ? 8 : 6} className="px-4 py-6 text-center text-gray-500">No line items available</td>
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
