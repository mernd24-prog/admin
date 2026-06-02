/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaFile, FaRegNoteSticky } from "react-icons/fa6";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import moment from "moment";
import { getAdminReturns } from "../../../../Redux/adminCoreSlice";
import { addOrderNote, getOrderInfo, orderCancel, updateOrderStatus } from "../../../../Redux/orderSlice";
import { getProfile } from "../../../../Redux/userSlice";
import Loader from "../../../../components/Loader/Loader";
import DefaultModal from "../../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../../components/Atoms/Input/Input";
import FilterSelect from "../../../../components/Atoms/FilterSelect/FilterSelect";
import PermissionGuard from "../../../../components/Atoms/PermissionGuard/PermissionGuard";
import PageHeader from "../../../../components/Shared/PageHeader";
import StatusBadge from "../../../../components/Shared/StatusBadge";

const MINIMUM_CANCEL_REASON_LENGTH = 10;

const STATUS_OPTIONS = [
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "fulfilled",
  "return_requested",
  "returned",
  "cancelled",
].map((status) => ({ value: status, label: status.replace(/_/g, " ") }));

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const money = (value) => Number(value || 0);

const percent = (value) => `${Number(value || 0).toFixed(2).replace(/\.00$/, "")}%`;

const displayStatus = (value = "") =>
  String(value || "N/A").replace(/_/g, " ");

const normalizeJson = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
};

const getOrderId = (order = {}) => firstDefined(order.id, order._id, order.orderId, order.order_no);

const formatMoney = (value) => `₹ ${money(value).toFixed(2)}`;

const formatDate = (value) => value ? moment(value).format("DD MMM YYYY HH:mm") : "N/A";

const extractList = (payload) => {
  const root = payload?.data?.data || payload?.data || {};
  if (Array.isArray(root)) return root;
  return root.list || root.items || root.rows || [];
};

const getItemKey = (item = {}) => firstDefined(item.id, item._id, `${item.product_id}-${item.variant_sku}`);

const getItemTaxLabel = (tax = {}, item = {}) => {
  const gstRate = firstDefined(tax.gstRate, item.gst_rate, item.gstRate, 0);
  const cessRate = firstDefined(tax.cessRate, item.cess_rate, item.cessRate, 0);
  const mode = firstDefined(tax.taxMode, tax.tax_mode, "N/A");
  const cessText = money(cessRate) > 0 ? ` + Cess ${percent(cessRate)}` : "";
  return `${percent(gstRate)} GST${cessText} · ${displayStatus(mode)}`;
};

const getOrderTaxRates = (taxBreakup = {}, items = []) => {
  const sourceItems = Array.isArray(taxBreakup.items) && taxBreakup.items.length
    ? taxBreakup.items
    : items.map((item) => normalizeJson(firstDefined(item.tax_breakup, item.taxBreakup), {}));
  const rates = sourceItems
    .map((taxItem, index) => firstDefined(taxItem.gstRate, items[index]?.gst_rate, items[index]?.gstRate))
    .filter((rate) => rate !== undefined && rate !== null && rate !== "")
    .map((rate) => Number(rate || 0));
  return [...new Set(rates)].sort((a, b) => a - b);
};

const groupItemsBySeller = (items = []) =>
  items.reduce((groups, item) => {
    const sellerId = firstDefined(item.seller_id, item.sellerId, "platform");
    const sellerSnapshot = normalizeJson(firstDefined(item.seller_snapshot, item.sellerSnapshot), {});
    const sellerName = firstDefined(sellerSnapshot.name, sellerSnapshot.sellerName, sellerId);
    if (!groups[sellerId]) {
      groups[sellerId] = { sellerId, sellerName, items: [] };
    }
    groups[sellerId].items.push(item);
    return groups;
  }, {});

const buildSellerSettlements = (items = []) =>
  Object.values(groupItemsBySeller(items)).map((group) => {
    const totals = group.items.reduce(
      (acc, item) => {
        const itemTax = normalizeJson(firstDefined(item.tax_breakup, item.taxBreakup), {});
        const pricing = normalizeJson(firstDefined(item.pricing_snapshot, item.pricingSnapshot), {});
        const lineTotal = money(firstDefined(item.line_total, item.lineTotal));
        const taxableAmount = money(firstDefined(itemTax.taxableAmount, itemTax.taxable_amount, lineTotal - money(firstDefined(item.discount_amount, item.discountAmount))));
        const taxAmount = money(firstDefined(item.tax_amount, item.taxAmount, itemTax.taxAmount, itemTax.tax_amount));
        const platformFee = money(firstDefined(item.platform_fee_amount, item.platformFeeAmount, pricing.platformFeeAmount));
        const commissionFee = money(firstDefined(pricing.commissionFee, pricing.commission_fee, platformFee));
        const fixedFee = money(firstDefined(pricing.fixedFee, pricing.fixed_fee));
        const closingFee = money(firstDefined(pricing.closingFee, pricing.closing_fee));
        const commissionPercent = money(firstDefined(pricing.commissionPercent, pricing.commission_percent));

        acc.grossSales += lineTotal;
        acc.taxableSales += taxableAmount;
        acc.taxCollected += taxAmount;
        acc.platformFee += platformFee;
        acc.commissionFee += commissionFee;
        acc.fixedFee += fixedFee;
        acc.closingFee += closingFee;
        if (commissionPercent > 0) acc.commissionRates.add(commissionPercent);
        return acc;
      },
      {
        grossSales: 0,
        taxableSales: 0,
        taxCollected: 0,
        platformFee: 0,
        commissionFee: 0,
        fixedFee: 0,
        closingFee: 0,
        commissionRates: new Set(),
      },
    );

    return {
      ...group,
      ...totals,
      commissionRates: [...totals.commissionRates].sort((a, b) => a - b),
      sellerPayout: Math.max(0, Number((totals.taxableSales - totals.platformFee).toFixed(2))),
    };
  });

const Panel = ({ title, children, actions, className = "" }) => (
  <section className={`rounded-lg border border-[#eadfbd] bg-[#fffdf8] shadow-[0_1px_3px_rgba(31,41,55,0.06)] ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-3 border-b border-[#efe6cd] px-4 py-3">
        {title && <h2 className="text-sm font-semibold text-[#202337]">{title}</h2>}
        {actions}
      </div>
    )}
    <div className="p-4">{children}</div>
  </section>
);

const InfoRow = ({ label, value, strong = false }) => (
  <div className="flex items-start justify-between gap-4 py-2 text-sm">
    <span className="text-[#65718b]">{label}</span>
    <span className={`text-right text-[#202337] ${strong ? "font-semibold" : "font-medium"}`}>{value || "N/A"}</span>
  </div>
);

const MetricCard = ({ label, value, tone = "default" }) => {
  const toneClass = {
    default: "bg-[#fffdf8] border-[#eadfbd]",
    dark: "bg-[#fff9ea] border-[#eadfbd]",
    green: "bg-[#effbf4] border-[#cfeedd]",
    blue: "bg-[#f3f6ff] border-[#dce5ff]",
  }[tone] || "bg-[#fffdf8] border-[#eadfbd]";

  const valueClass = {
    default: "text-[#202337]",
    dark: "text-[#1f4fc9]",
    green: "text-[#2ea84a]",
    blue: "text-[#1f4fc9]",
  }[tone] || "text-[#202337]";

  return (
    <div className={`rounded-lg border p-4 shadow-[0_1px_3px_rgba(31,41,55,0.05)] ${toneClass}`}>
      <p className="text-xs font-medium text-[#65718b]">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
};

const EmptyState = ({ children }) => (
  <div className="rounded-lg border border-dashed border-[#eadfbd] bg-[#fffaf0] py-8 text-center text-sm text-[#65718b]">
    {children}
  </div>
);

const RelatedCard = ({ title, subtitle, status, rows = [], action }) => (
  <div className="rounded-lg border border-[#eadfbd] bg-white p-4 text-sm">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <div className="font-semibold text-[#202337]">{title || "N/A"}</div>
        {subtitle && <div className="mt-0.5 text-xs text-[#65718b]">{subtitle}</div>}
      </div>
      {status && <StatusBadge status={status} size="sm" dot />}
    </div>
    <div className="space-y-1.5">
      {rows.map((row) => (
        <InfoRow key={row.label} label={row.label} value={row.value} />
      ))}
    </div>
    {action && <div className="mt-3">{action}</div>}
  </div>
);

const OrderSummary = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();

  const [state, setState] = useState({
    orderInfo: null,
    isLoading: false,
    statusModal: false,
    noteModal: false,
    userData: {},
    returns: [],
  });
  const [formData, setFormData] = useState({ status: "", reason: "", note: "" });
  const [noteData, setNoteData] = useState({ note: "", visibility: "internal" });

  const setLoading = useCallback((loading) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  const handleError = useCallback((error, defaultMessage = "An error occurred") => {
    toast.error(error?.message || error || defaultMessage);
  }, []);

  const fetchOrderInfo = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await dispatch(getOrderInfo({ orderId: id })).unwrap();
      if (!res?.data) throw new Error("Invalid order response");
      setState((prev) => ({ ...prev, orderInfo: res.data }));
    } catch (error) {
      handleError(error, "Failed to fetch order information");
    } finally {
      setLoading(false);
    }
  }, [id, dispatch, handleError, setLoading]);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await dispatch(getProfile()).unwrap();
      if (res?.data) setState((prev) => ({ ...prev, userData: res.data }));
    } catch {
      setState((prev) => ({ ...prev, userData: {} }));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchOrderInfo();
    fetchUserData();
  }, [fetchOrderInfo, fetchUserData]);

  const fetchOrderReturns = useCallback(async () => {
    if (!id) return;
    try {
      const res = await dispatch(getAdminReturns({ orderId: id, limit: 20 })).unwrap();
      setState((prev) => ({ ...prev, returns: extractList(res) }));
    } catch {
      setState((prev) => ({ ...prev, returns: [] }));
    }
  }, [dispatch, id]);

  useEffect(() => {
    fetchOrderReturns();
  }, [fetchOrderReturns]);

  const order = state.orderInfo || {};
  const orderId = getOrderId(order);
  const orderNumber = firstDefined(order.order_number, order.orderNumber, order.order_no, orderId);
  const shippingAddress = normalizeJson(firstDefined(order.shipping_address, order.shippingAddress), {});
  const taxBreakup = normalizeJson(firstDefined(order.tax_breakup, order.taxBreakup), {});
  const summary = order.summary || {};
  const taxIncludedAmount = money(firstDefined(summary.taxIncludedAmount, taxBreakup.taxIncludedAmount));
  const taxPayableAmount = money(firstDefined(summary.taxPayableAmount, taxBreakup.taxPayableAmount));
  const customerTotalAmount = money(firstDefined(summary.customerTotalAmount, order.total_amount, order.totalAmount));
  const customerPayableAmount = money(firstDefined(summary.customerPayableAmount, order.payable_amount, order.payableAmount, order.total_amount));
  const items = Array.isArray(order.items) ? order.items : [];
  const relations = order.relations || {};
  const payments = Array.isArray(relations.payments) ? relations.payments : [];
  const shipments = Array.isArray(relations.shipments) ? relations.shipments : [];
  const walletTransactions = Array.isArray(relations.walletTransactions) ? relations.walletTransactions : [];
  const invoice = relations.invoice || relations.taxInvoice || null;
  const eWayBill = relations.eWayBill || relations.ewayBill || null;
  const returns = Array.isArray(state.returns) ? state.returns : [];
  const sellerGroups = useMemo(() => Object.values(groupItemsBySeller(items)), [items]);
  const sellerSettlements = useMemo(() => buildSellerSettlements(items), [items]);
  const orderTaxRates = useMemo(() => getOrderTaxRates(taxBreakup, items), [taxBreakup, items]);
  const timeline = Array.isArray(order.timeline) ? order.timeline : [];
  const notes = Array.isArray(order.notes) ? order.notes : [];

  const handleStatusSubmit = useCallback(async () => {
    if (!formData.status) {
      toast.error("Status is required");
      return;
    }
    if (formData.status === "cancelled" && formData.reason.trim().length < MINIMUM_CANCEL_REASON_LENGTH) {
      toast.error(`Please provide a cancellation reason with at least ${MINIMUM_CANCEL_REASON_LENGTH} characters`);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        orderId,
        status: formData.status,
        reason: formData.reason,
        note: formData.note,
      };
      const res = formData.status === "cancelled"
        ? await dispatch(orderCancel({ orderId, reason: formData.reason })).unwrap()
        : await dispatch(updateOrderStatus(payload)).unwrap();
      toast.success(res?.message || "Order updated successfully");
      setState((prev) => ({ ...prev, statusModal: false }));
      setFormData({ status: "", reason: "", note: "" });
      await fetchOrderInfo();
    } catch (error) {
      handleError(error, "Failed to update order");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchOrderInfo, formData, handleError, orderId, setLoading]);

  const handleNoteSubmit = useCallback(async () => {
    if (!noteData.note.trim()) {
      toast.error("Note is required");
      return;
    }

    try {
      setLoading(true);
      await dispatch(addOrderNote({ orderId, ...noteData })).unwrap();
      toast.success("Note added successfully");
      setState((prev) => ({ ...prev, noteModal: false }));
      setNoteData({ note: "", visibility: "internal" });
      await fetchOrderInfo();
    } catch (error) {
      handleError(error, "Failed to add order note");
    } finally {
      setLoading(false);
    }
  }, [dispatch, fetchOrderInfo, handleError, noteData, orderId, setLoading]);

  if (!id) {
    return <div className="min-h-screen flex items-center justify-center text-xl font-semibold text-gray-700">Invalid Order ID</div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-3 md:p-5">
      <Loader loading={state.isLoading} />

      <div className="mx-auto max-w-7xl">
        <PageHeader
          title={`Order #${orderNumber}`}
          subtitle={orderId}
          breadcrumbs={[
            { label: "Home", to: "/app/home" },
            { label: "Orders", to: "/app/orders" },
            { label: "Order View" },
          ]}
          backPath="/app/orders"
          status={order.status}
          actions={(
            <>
            <PermissionGuard module="orders" action="update" hide>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-[#2f6fed] bg-white px-3 py-2 text-sm font-medium text-[#2f6fed] shadow-sm transition hover:bg-[#f3f6ff]"
                onClick={() => setState((prev) => ({ ...prev, noteModal: true }))}
              >
                <FaRegNoteSticky /> Note
              </button>
            </PermissionGuard>
            <PermissionGuard module="orders" action="status_change" hide>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-[#f3b234] bg-[#f6b73c] px-3 py-2 text-sm font-semibold text-[#202337] shadow-sm transition hover:bg-[#f2aa22]"
                onClick={() => setState((prev) => ({ ...prev, statusModal: true }))}
              >
                <FaFile /> Status
              </button>
            </PermissionGuard>
            </>
          )}
        />

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Customer Payable" value={formatMoney(customerPayableAmount)} tone="dark" />
          <MetricCard label="Customer Total" value={formatMoney(customerTotalAmount)} tone="blue" />
          <MetricCard label="Payment Status" value={<StatusBadge status={firstDefined(order.payment_status, order.paymentStatus)} dot />} />
          <MetricCard label="Delivery Status" value={<StatusBadge status={firstDefined(order.delivery_status, order.deliveryStatus)} dot />} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Items By Seller" className="lg:col-span-2">
            {sellerGroups.length ? sellerGroups.map((group) => (
              <div key={group.sellerId} className="mb-4 overflow-hidden rounded-lg border border-[#eadfbd] bg-white last:mb-0">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fff9ea] px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-[#202337]">{group.sellerName}</div>
                    <div className="text-xs text-[#65718b]">{group.sellerId}</div>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#202337] ring-1 ring-[#eadfbd]">
                    {group.items.length} item{group.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="hidden grid-cols-12 gap-3 border-b border-[#e6ebf7] bg-[#eef2fb] px-4 py-2 text-xs font-semibold uppercase text-[#65718b] md:grid">
                  <span className="col-span-5">Product</span>
                  <span className="col-span-2">Status</span>
                  <span className="col-span-1 text-center">Qty</span>
                  <span className="col-span-2 text-right">Unit Price</span>
                  <span className="col-span-2 text-right">Line Total</span>
                </div>
                {group.items.map((item) => {
                  const itemTax = normalizeJson(firstDefined(item.tax_breakup, item.taxBreakup), {});
                  const productSnapshot = normalizeJson(firstDefined(item.product_snapshot, item.productSnapshot), {});
                  const productTitle = firstDefined(item.product_title, item.productTitle, productSnapshot.title, item.product_id, "Product");
                  return (
                    <div key={getItemKey(item)} className="grid grid-cols-1 gap-3 border-b border-[#eef0f6] px-4 py-4 text-sm last:border-b-0 md:grid-cols-12 md:items-start">
                      <div className="md:col-span-5">
                        <div className="font-semibold text-[#202337]">{productTitle}</div>
                        <div className="text-xs text-[#65718b]">
                          SKU: {firstDefined(item.variant_sku, item.product_sku, productSnapshot.sku, "N/A")} · HSN: {firstDefined(item.hsn_code, productSnapshot.hsnCode, "N/A")}
                        </div>
                      </div>
                      <div className="md:col-span-2"><StatusBadge status={order.status} size="sm" dot /></div>
                      <div className="font-medium text-[#202337] md:col-span-1 md:text-center">{Number(item.quantity || 0)}</div>
                      <div className="font-medium text-[#202337] md:col-span-2 md:text-right">{formatMoney(firstDefined(item.unit_price, item.unitPrice))}</div>
                      <div className="md:col-span-2 md:text-right">
                        <div className="font-semibold text-[#202337]">{formatMoney(firstDefined(item.line_total, item.lineTotal))}</div>
                        <div className="text-xs text-[#65718b]">
                          Tax {formatMoney(firstDefined(item.tax_amount, item.taxAmount, itemTax.taxAmount))} ({getItemTaxLabel(itemTax, item)})
                        </div>
                        <div className="text-xs text-[#65718b]">
                          Taxable {formatMoney(firstDefined(itemTax.taxableAmount, itemTax.taxable_amount, item.line_total, item.lineTotal))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )) : <EmptyState>No items found</EmptyState>}
          </Panel>

          <aside className="space-y-4">
            <Panel title="Order Summary">
              <InfoRow label="Order Date" value={order.created_at ? moment(order.created_at).format("DD MMM YYYY HH:mm") : "N/A"} />
              <InfoRow label="Status" value={<StatusBadge status={order.status} dot />} />
              <InfoRow label="Payment Method" value={displayStatus(firstDefined(order.payment_provider, order.paymentProvider))} />
              <InfoRow label="Subtotal" value={formatMoney(firstDefined(order.subtotal_amount, order.subtotalAmount))} />
              <InfoRow label="Discount" value={<span className="text-[#2ea84a]">-{formatMoney(firstDefined(order.discount_amount, order.discountAmount))}</span>} />
              <InfoRow label="GST Payable" value={formatMoney(taxPayableAmount)} />
              <InfoRow label="GST Included" value={formatMoney(taxIncludedAmount)} />
              <InfoRow label="Platform Fees" value={formatMoney(firstDefined(order.platform_fee_amount, order.platformFeeAmount))} />
              <InfoRow label="COD Charge" value={formatMoney(firstDefined(order.cod_charge_amount, order.codChargeAmount))} />
              <InfoRow label="Wallet" value={`-${formatMoney(firstDefined(order.wallet_discount_amount, order.walletDiscountAmount))}`} />
              <div className="mt-2 border-t border-[#efe6cd] pt-2">
                <InfoRow label="Customer Payable" value={formatMoney(customerPayableAmount)} strong />
              </div>
            </Panel>
          </aside>
        </div>

        <div className="mt-4 space-y-4">
          <Panel title="Tax Breakup">
            <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
              <InfoRow label="Taxable" value={formatMoney(taxBreakup.taxableAmount)} />
              <InfoRow label="GST Rate" value={orderTaxRates.length ? orderTaxRates.map(percent).join(", ") : "N/A"} />
              <InfoRow label={`CGST ${money(taxBreakup.cgstAmount) > 0 && orderTaxRates.length === 1 ? percent(orderTaxRates[0] / 2) : ""}`} value={formatMoney(taxBreakup.cgstAmount)} />
              <InfoRow label={`SGST ${money(taxBreakup.sgstAmount) > 0 && orderTaxRates.length === 1 ? percent(orderTaxRates[0] / 2) : ""}`} value={formatMoney(taxBreakup.sgstAmount)} />
              <InfoRow label={`IGST ${money(taxBreakup.igstAmount) > 0 ? orderTaxRates.map(percent).join(", ") : ""}`} value={formatMoney(taxBreakup.igstAmount)} />
              <InfoRow label="Cess" value={formatMoney(taxBreakup.cessAmount)} />
              <InfoRow label="Total Tax" value={formatMoney(firstDefined(order.tax_amount, order.taxAmount, taxBreakup.totalTaxAmount))} />
              <InfoRow label="Mode" value={displayStatus(taxBreakup.taxMode)} />
            </div>
            {Array.isArray(taxBreakup.items) && taxBreakup.items.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-3 border-t border-[#efe6cd] pt-3 md:grid-cols-2">
                {taxBreakup.items.map((taxItem, index) => {
                  const orderItem = items[index] || {};
                  const productSnapshot = normalizeJson(firstDefined(orderItem.product_snapshot, orderItem.productSnapshot), {});
                  const productTitle = firstDefined(orderItem.product_title, orderItem.productTitle, productSnapshot.title, taxItem.productId, `Item ${index + 1}`);
                  return (
                    <div key={`${taxItem.productId || "tax"}-${index}`} className="rounded-md bg-[#f8faff] p-3 text-xs text-[#65718b]">
                      <div className="font-semibold text-[#202337]">{productTitle}</div>
                      <div className="flex justify-between gap-2">
                        <span>{getItemTaxLabel(taxItem, orderItem)}</span>
                        <span>{formatMoney(money(taxItem.taxAmount) + money(taxItem.cessAmount))}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Taxable base</span>
                        <span>{formatMoney(taxItem.taxableAmount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Buyer & Shipping">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(220px,320px)_1fr]">
              <InfoRow label="Buyer" value={firstDefined(order.buyer_id, order.buyerId, "N/A")} />
              <div className="rounded-md bg-[#f8faff] p-3 text-sm leading-6 text-[#202337]">
                {[shippingAddress.line1, shippingAddress.line2, shippingAddress.city, shippingAddress.state, shippingAddress.postalCode, shippingAddress.country].filter(Boolean).join(", ") || "N/A"}
              </div>
            </div>
          </Panel>
        </div>

        <Panel
          title="Order Relations"
          className="mt-4"
          actions={(
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-md border border-[#2f6fed] bg-white px-3 py-1.5 text-xs font-medium text-[#2f6fed] hover:bg-[#f3f6ff]" onClick={() => navigate(`/app/payments?orderId=${encodeURIComponent(orderId)}`)}>
                Payments
              </button>
              <button type="button" className="rounded-md border border-[#2f6fed] bg-white px-3 py-1.5 text-xs font-medium text-[#2f6fed] hover:bg-[#f3f6ff]" onClick={() => navigate(`/app/shipment-tracking?orderId=${encodeURIComponent(orderId)}`)}>
                Shipments
              </button>
              <button type="button" className="rounded-md border border-[#2f6fed] bg-white px-3 py-1.5 text-xs font-medium text-[#2f6fed] hover:bg-[#f3f6ff]" onClick={() => navigate(`/app/returns?orderId=${encodeURIComponent(orderId)}`)}>
                Returns
              </button>
            </div>
          )}
        >
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-[#65718b]">Payments</h3>
              {payments.length ? (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <RelatedCard
                      key={payment.id || payment._id || payment.transaction_reference}
                      title={firstDefined(payment.transaction_reference, payment.provider_payment_id, payment.id)}
                      subtitle={`Order ${firstDefined(payment.order_id, payment.orderId, orderId)}`}
                      status={payment.status}
                      rows={[
                        { label: "Provider", value: displayStatus(payment.provider) },
                        { label: "Amount", value: `${payment.currency || order.currency || "INR"} ${money(payment.amount).toFixed(2)}` },
                        { label: "Provider Order", value: firstDefined(payment.provider_order_id, payment.providerOrderId, "N/A") },
                        { label: "Provider Payment", value: firstDefined(payment.provider_payment_id, payment.providerPaymentId, "N/A") },
                        { label: "Created", value: formatDate(firstDefined(payment.created_at, payment.createdAt)) },
                      ]}
                    />
                  ))}
                </div>
              ) : <EmptyState>No payment records found</EmptyState>}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-[#65718b]">Shipments</h3>
              {shipments.length ? (
                <div className="space-y-3">
                  {shipments.map((shipment) => (
                    <RelatedCard
                      key={shipment.id || shipment._id || shipment.awb_number}
                      title={firstDefined(shipment.awb_number, shipment.tracking_number, shipment.id)}
                      subtitle={`Seller ${firstDefined(shipment.seller_id, shipment.sellerId, "N/A")}`}
                      status={shipment.status}
                      rows={[
                        { label: "Provider", value: displayStatus(firstDefined(shipment.provider, shipment.courier_name, shipment.courierName)) },
                        { label: "Tracking", value: firstDefined(shipment.tracking_number, shipment.trackingNumber, shipment.awb_number, "N/A") },
                        { label: "COD", value: shipment.cod ? "Yes" : "No" },
                        { label: "Created", value: formatDate(firstDefined(shipment.created_at, shipment.createdAt)) },
                        { label: "Events", value: Array.isArray(shipment.trackingEvents) ? shipment.trackingEvents.length : 0 },
                      ]}
                    />
                  ))}
                </div>
              ) : <EmptyState>No shipment records found</EmptyState>}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-[#65718b]">Tax & Delivery Docs</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
                {invoice ? (
                  <RelatedCard
                    title={firstDefined(invoice.invoice_number, invoice.invoiceNumber, invoice.id)}
                    subtitle="Tax invoice"
                    status={firstDefined(invoice.status, "generated")}
                    rows={[
                      { label: "Invoice ID", value: firstDefined(invoice.id, invoice._id, "N/A") },
                      { label: "Total", value: formatMoney(firstDefined(invoice.total_amount, invoice.totalAmount)) },
                      { label: "Created", value: formatDate(firstDefined(invoice.created_at, invoice.createdAt)) },
                    ]}
                  />
                ) : <EmptyState>No invoice found</EmptyState>}
                {eWayBill ? (
                  <RelatedCard
                    title={firstDefined(eWayBill.eway_bill_number, eWayBill.ewayBillNumber, eWayBill.id)}
                    subtitle="E-way bill"
                    status={firstDefined(eWayBill.status, "created")}
                    rows={[
                      { label: "Document ID", value: firstDefined(eWayBill.id, eWayBill._id, "N/A") },
                      { label: "Valid Till", value: formatDate(firstDefined(eWayBill.valid_till, eWayBill.validTill)) },
                      { label: "Created", value: formatDate(firstDefined(eWayBill.created_at, eWayBill.createdAt)) },
                    ]}
                  />
                ) : <EmptyState>No e-way bill found</EmptyState>}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-[#65718b]">Returns & Wallet</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
                {returns.length ? (
                  <div className="space-y-3">
                    {returns.map((returnRequest) => (
                      <RelatedCard
                        key={returnRequest.id || returnRequest._id}
                        title={firstDefined(returnRequest.id, returnRequest._id)}
                        subtitle={displayStatus(returnRequest.reason)}
                        status={returnRequest.status}
                        rows={[
                          { label: "Refund", value: formatMoney(firstDefined(returnRequest.refundAmount, returnRequest.refundBreakup?.totalRefundAmount)) },
                          { label: "Items", value: Array.isArray(returnRequest.items) ? returnRequest.items.length : 0 },
                          { label: "Requested", value: formatDate(firstDefined(returnRequest.createdAt, returnRequest.created_at)) },
                        ]}
                      />
                    ))}
                  </div>
                ) : <EmptyState>No return requests found</EmptyState>}
                {walletTransactions.length ? (
                  <div className="space-y-3">
                    {walletTransactions.map((walletTx) => (
                      <RelatedCard
                        key={walletTx.id || walletTx._id || walletTx.transaction_id}
                        title={firstDefined(walletTx.transaction_id, walletTx.id, walletTx._id)}
                        subtitle={displayStatus(firstDefined(walletTx.type, walletTx.transaction_type, "wallet"))}
                        status={firstDefined(walletTx.status, "recorded")}
                        rows={[
                          { label: "Amount", value: formatMoney(firstDefined(walletTx.amount, walletTx.value)) },
                          { label: "Reference", value: firstDefined(walletTx.reference_id, walletTx.referenceId, orderId) },
                          { label: "Created", value: formatDate(firstDefined(walletTx.created_at, walletTx.createdAt)) },
                        ]}
                      />
                    ))}
                  </div>
                ) : <EmptyState>No wallet transactions found</EmptyState>}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Seller Commission & Payout" className="mt-4">
          {sellerSettlements.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {sellerSettlements.map((seller) => (
                <div key={seller.sellerId} className="rounded-lg border border-[#eadfbd] bg-white p-4 text-sm">
                  <div className="flex justify-between gap-2 mb-3">
                    <div>
                      <div className="font-semibold text-[#202337]">{seller.sellerName}</div>
                      <div className="text-xs text-[#65718b]">{seller.sellerId}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#1f4fc9]">{formatMoney(seller.sellerPayout)}</div>
                      <div className="text-xs text-[#65718b]">seller payout</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Taxable product sales</span><span>{formatMoney(seller.taxableSales)}</span></div>
                    <div className="flex justify-between"><span>Tax to maintain</span><span>{formatMoney(seller.taxCollected)}</span></div>
                    <div className="flex justify-between">
                      <span>Platform commission</span>
                      <span>
                        -{formatMoney(seller.commissionFee)}
                        {seller.commissionRates.length ? ` (${seller.commissionRates.map(percent).join(", ")})` : ""}
                      </span>
                    </div>
                    <div className="flex justify-between"><span>Fixed/closing fees</span><span>-{formatMoney(seller.fixedFee + seller.closingFee)}</span></div>
                    <div className="flex justify-between border-t border-[#efe6cd] pt-2 font-medium"><span>Net seller payout</span><span>{formatMoney(seller.sellerPayout)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No seller settlement data found</EmptyState>
          )}
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Timeline" className="mt-4">
            {timeline.length ? timeline.map((entry) => (
              <div key={entry.id} className="relative border-l border-[#dce5ff] pb-4 pl-4 text-sm last:pb-0">
                <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-[#2f6fed]" />
                <div className="font-semibold capitalize text-[#202337]">{displayStatus(entry.to_status || entry.toStatus)}</div>
                <div className="text-[#65718b]">{entry.created_at ? moment(entry.created_at).format("DD MMM YYYY HH:mm") : "N/A"} · {entry.actor_role || "system"}</div>
                {entry.reason && <div className="text-[#65718b] mt-1">{entry.reason}</div>}
              </div>
            )) : <EmptyState>No timeline yet</EmptyState>}
          </Panel>

          <Panel title="Notes" className="mt-4">
            {notes.length ? notes.map((note) => (
              <div key={note.id} className="mb-3 rounded-lg border border-[#eadfbd] bg-white p-3 text-sm last:mb-0">
                <div className="text-[#202337] leading-6">{note.note}</div>
                <div className="text-xs text-[#65718b] mt-1">{note.actor_role || "system"} · {note.visibility} · {note.created_at ? moment(note.created_at).format("DD MMM YYYY HH:mm") : "N/A"}</div>
              </div>
            )) : <EmptyState>No notes yet</EmptyState>}
          </Panel>
        </div>
      </div>

      <DefaultModal isOpen={state.statusModal} onClose={() => setState((prev) => ({ ...prev, statusModal: false }))} title="Order Status Change" onSubmit={handleStatusSubmit}>
        <div className="space-y-4">
          <FilterSelect
            options={STATUS_OPTIONS}
            value={STATUS_OPTIONS.find((opt) => opt.value === formData.status) || null}
            onChange={(option) => setFormData((prev) => ({ ...prev, status: option?.value || "" }))}
            label="Status"
            placeholder="Select Status"
          />
          <Input type="textarea" labelName="Reason" value={formData.reason} onChange={(event) => setFormData((prev) => ({ ...prev, reason: event.target.value }))} name="reason" placeholder="Reason or operational note" maxLength={1000} />
          <Input type="textarea" labelName="Internal Note" value={formData.note} onChange={(event) => setFormData((prev) => ({ ...prev, note: event.target.value }))} name="note" placeholder="Optional internal note" maxLength={1000} />
        </div>
      </DefaultModal>

      <DefaultModal isOpen={state.noteModal} onClose={() => setState((prev) => ({ ...prev, noteModal: false }))} title="Add Order Note" onSubmit={handleNoteSubmit}>
        <div className="space-y-4">
          <select className="border rounded px-3 py-2 text-sm w-full" value={noteData.visibility} onChange={(event) => setNoteData((prev) => ({ ...prev, visibility: event.target.value }))}>
            <option value="internal">Internal</option>
            <option value="seller">Seller visible</option>
            <option value="buyer">Buyer visible</option>
          </select>
          <Input type="textarea" labelName="Note" value={noteData.note} onChange={(event) => setNoteData((prev) => ({ ...prev, note: event.target.value }))} name="note" placeholder="Enter order note" maxLength={2000} required={true} />
        </div>
      </DefaultModal>
    </div>
  );
};

export default OrderSummary;
