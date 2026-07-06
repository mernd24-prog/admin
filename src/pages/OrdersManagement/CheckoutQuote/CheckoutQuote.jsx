import React, { useEffect, useMemo, useRef, useState } from "react";
import { MdAdd, MdCalculate, MdDeleteOutline } from "react-icons/md";
import { PageHeader, StatusBadge } from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { toast } from "../../../utils/toast";
import { dropdownApi } from "../../../_helpers/dropdownApi";

const BuyerSearchField = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState('');
  const ref = useRef(null);
  const timer = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => {
    if (!open) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLoading(true);
      dropdownApi.getBuyers({ keyWord: query, searchFields: 'full_name,email', limit: 20 })
        .then(setOptions).catch(() => {}).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query, open]);
  const select = (opt) => { onChange(opt.value); setLabel(opt.label); setOpen(false); setQuery(''); };
  const clear = (e) => { e.stopPropagation(); onChange(''); setLabel(''); };
  return (
    <div ref={ref} className="relative">
      <div className="admin-input flex items-center cursor-pointer min-h-[38px]" onClick={() => setOpen((o) => !o)}>
        {value && label ? <span className="flex-1 text-sm text-gray-700 truncate">{label}</span>
          : value ? <span className="flex-1 font-mono text-xs text-gray-500 truncate">{String(value).slice(0,20)}…</span>
          : <span className="flex-1 text-sm text-gray-400">Optional customer id</span>}
        {value && <button type="button" onClick={clear} className="ml-1 text-gray-300 hover:text-gray-600">×</button>}
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="px-2 py-1.5 border-b border-gray-100">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email…" className="w-full text-sm outline-none" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loading ? <div className="px-3 py-2 text-sm text-gray-400">Loading…</div>
              : options.length === 0 ? <div className="px-3 py-2 text-sm text-gray-400">No customers found</div>
              : options.map((opt) => (
                <div key={opt.value} onClick={() => select(opt)} className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 text-gray-700">{opt.label}</div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

const EMPTY_ITEM = { productId: "", variantId: "", variantSku: "", quantity: 1 };
const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

const PAYMENT_OPTIONS = [
  { value: "razorpay", label: "Online" },
  { value: "cod", label: "COD" },
  { value: "manual_bank_transfer", label: "Manual Bank" },
  { value: "manual_upi", label: "Manual UPI" },
  { value: "wallet_only", label: "Wallet Only" },
];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const CheckoutQuote = () => {
  const [buyerId, setBuyerId] = useState("");
  const [paymentProvider, setPaymentProvider] = useState("razorpay");
  const [couponCode, setCouponCode] = useState("");
  const [walletAmount, setWalletAmount] = useState("");
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);

  const summary = quote?.summary || {};
  const quoteTotals = quote?.quote || {};
  const sellerSettlements = Array.isArray(quote?.sellerSettlements) ? quote.sellerSettlements : [];

  const validItems = useMemo(
    () =>
      items
        .map((item) => ({
          ...item,
          productId: item.productId.trim(),
          variantId: item.variantId.trim(),
          variantSku: item.variantSku.trim(),
          quantity: Number(item.quantity || 0),
        }))
        .filter((item) => item.productId),
    [items],
  );

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)));
    setErrors((prev) => ({ ...prev, items: "" }));
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index) => setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index)));

  const updateAddress = (field, value) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!address.line1.trim()) nextErrors.line1 = "Address line is required.";
    if (!address.city.trim()) nextErrors.city = "City is required.";
    if (!address.state.trim()) nextErrors.state = "State is required.";
    if (!address.postalCode.trim()) nextErrors.postalCode = "Postal code is required.";
    if (!address.country.trim()) nextErrors.country = "Country is required.";
    if (!validItems.length) nextErrors.items = "At least one product is required.";
    validItems.forEach((item, index) => {
      if (!/^[a-f0-9]{24}$/i.test(item.productId)) {
        nextErrors.items = `Row ${index + 1}: product id must be a valid ObjectId.`;
      }
      if (item.variantId && !/^[a-f0-9]{24}$/i.test(item.variantId)) {
        nextErrors.items = `Row ${index + 1}: variant id must be a valid ObjectId.`;
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        nextErrors.items = `Row ${index + 1}: quantity must be at least 1.`;
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitQuote = async () => {
    if (!validate()) return;
    setLoading(true);
    setQuote(null);
    try {
      const response = await axiosProvider.post(ENDPOINTS.orders.checkoutQuote, {
        buyerId: buyerId.trim() || undefined,
        paymentProvider,
        couponCode: couponCode.trim() || undefined,
        walletAmount: Number(walletAmount || 0),
        shippingAddress: {
          ...address,
          line1: address.line1.trim(),
          line2: address.line2.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          postalCode: address.postalCode.trim(),
          country: address.country.trim(),
        },
        items: validItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          variantSku: item.variantSku || undefined,
          quantity: item.quantity,
        })),
      });
      setQuote(response?.data?.data || null);
      toast.success("Checkout quote calculated.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to calculate checkout quote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-0">
      <PageHeader
        title="Checkout Quote"
        subtitle="Validate checkout totals, tax, wallet, COD, and seller settlement before order creation."
        breadcrumbs={[{ label: "Orders Management" }, { label: "Checkout Quote" }]}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="admin-card space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1">
              <span className="admin-label">Buyer</span>
              <BuyerSearchField value={buyerId} onChange={setBuyerId} />
            </label>
            <label className="space-y-1">
              <span className="admin-label">Payment</span>
              <select className="admin-input" value={paymentProvider} onChange={(event) => setPaymentProvider(event.target.value)}>
                {PAYMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="admin-label">Wallet Amount</span>
              <input className="admin-input" type="number" min="0" value={walletAmount} onChange={(event) => setWalletAmount(event.target.value)} placeholder="0" />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="admin-label">Coupon Code</span>
            <input className="admin-input max-w-sm uppercase" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Optional" />
          </label>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Checkout Items</h2>
              <button type="button" className="admin-btn-secondary" onClick={addItem}>
                <MdAdd size={16} /> Add Item
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid gap-3 rounded border p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_90px_36px]">
                  <input className="admin-input" value={item.productId} onChange={(event) => updateItem(index, "productId", event.target.value)} placeholder="Product ObjectId" />
                  <input className="admin-input" value={item.variantId} onChange={(event) => updateItem(index, "variantId", event.target.value)} placeholder="Variant ObjectId" />
                  <input className="admin-input" value={item.variantSku} onChange={(event) => updateItem(index, "variantSku", event.target.value)} placeholder="Variant SKU" />
                  <input className="admin-input" type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} />
                  <button type="button" className="rounded border text-red-600 disabled:opacity-40" onClick={() => removeItem(index)} disabled={items.length <= 1} aria-label="Remove item">
                    <MdDeleteOutline size={18} className="mx-auto" />
                  </button>
                </div>
              ))}
            </div>
            {errors.items && <p className="text-xs text-red-600">{errors.items}</p>}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Shipping Address</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["line1", "Address Line 1"],
                ["line2", "Address Line 2"],
                ["city", "City"],
                ["state", "State"],
                ["postalCode", "Postal Code"],
                ["country", "Country"],
              ].map(([field, label]) => (
                <label key={field} className="space-y-1">
                  <span className="admin-label">{label}</span>
                  <input className="admin-input" value={address[field]} onChange={(event) => updateAddress(field, event.target.value)} />
                  {errors[field] && <span className="text-xs text-red-600">{errors[field]}</span>}
                </label>
              ))}
            </div>
          </section>

          <PermissionGuard module="orders" action={ACTIONS.VIEW} hide>
            <button type="button" className="admin-btn-primary" onClick={submitQuote} disabled={loading}>
              <MdCalculate size={16} /> {loading ? "Calculating..." : "Calculate Quote"}
            </button>
          </PermissionGuard>
        </div>

        <aside className="admin-card h-fit p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Quote Result</h2>
            {quote && <StatusBadge status={quoteTotals.paymentProvider || "quoted"} dot />}
          </div>
          {!quote ? (
            <p className="text-sm text-gray-500">Enter checkout details and calculate a quote.</p>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Items</span><span>{money(summary.itemAmount)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>-{money(summary.discountAmount)}</span></div>
                <div className="flex justify-between"><span>Tax Payable</span><span>{money(summary.taxPayableAmount)}</span></div>
                <div className="flex justify-between"><span>Tax Included</span><span>{money(summary.taxIncludedAmount)}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span>{money(summary.deliveryChargeAmount ?? summary.shippingFeeAmount)}</span></div>
                <div className="flex justify-between"><span>Customer Platform Fee</span><span>{money(summary.customerPlatformFeeAmount)}</span></div>
                <div className="flex justify-between"><span>Platform Fee GST</span><span>{money(summary.customerPlatformFeeTaxAmount)}</span></div>
                <div className="flex justify-between"><span>COD Charge</span><span>{money(summary.codChargeAmount)}</span></div>
                <div className="flex justify-between"><span>Wallet</span><span>-{money(summary.walletDiscountAmount)}</span></div>
                <div className="border-t pt-2 flex justify-between text-base font-semibold"><span>Payable</span><span>{money(summary.customerPayableAmount)}</span></div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">Seller Settlement Preview</h3>
                <div className="space-y-2">
                  {sellerSettlements.length ? sellerSettlements.map((seller) => (
                    <div key={seller.sellerId} className="rounded border p-2 text-xs">
                      <p className="font-semibold">{seller.sellerId}</p>
                      <p>Gross: {money(seller.grossSalesAmount)}</p>
                      <p>Seller fee: {money(seller.platformFeeAmount)}</p>
                      <p>Fee GST: {money(seller.platformFeeTaxAmount)}</p>
                      <p>Delivery: {money(seller.sellerDeliveryChargeAmount)}</p>
                      <p>Shipping reimbursement: {money(seller.shippingReimbursementAmount)}</p>
                      <p>Shipping deduction: {money(seller.shippingDeductionAmount)}</p>
                      <p>Payout: {money(seller.sellerPayoutAmount)}</p>
                    </div>
                  )) : <p className="text-xs text-gray-500">No settlement rows.</p>}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">Items</h3>
                <div className="space-y-2">
                  {(quote.items || []).map((item) => (
                    <div key={`${item.productId}-${item.variantSku}`} className="rounded border p-2 text-xs">
                      <p className="font-semibold">{item.title}</p>
                      <p>Qty {item.quantity} x {money(item.unitPrice)}</p>
                      <p>HSN {item.hsnCode || "-"} | GST {item.gstRate || 0}%</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default CheckoutQuote;
