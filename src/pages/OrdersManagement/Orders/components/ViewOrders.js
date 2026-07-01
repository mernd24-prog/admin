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

import { usePermission } from "../../../../_helpers/usePermission";

const MINIMUM_CANCEL_REASON_LENGTH = 10;

// All structurally valid transitions (mirrors backend assertOrderTransitionAllowed)
const ALLOWED_TRANSITIONS = {
  pending_payment: ["confirmed", "payment_failed", "cancelled"],
  payment_failed:  ["pending_payment", "cancelled"],
  confirmed:       ["packed", "cancelled"],
  packed:          ["shipped", "cancelled"],
  shipped:         [],
  delivered:       ["fulfilled", "return_requested"],
  fulfilled:       ["return_requested"],
  return_requested:["partially_returned", "returned"],
  partially_returned:["return_requested", "fulfilled"],
};

// Seller order actions stop at shipment handoff. Delivery progress is managed in Shipments.
const SELLER_ALLOWED_NEXT = new Set(["packed", "shipped", "fulfilled"]);

const ALL_STATUSES = [
  "pending_payment", "payment_failed", "confirmed", "packed",
  "shipped", "delivered", "fulfilled", "return_requested", "partially_returned", "returned", "cancelled",
];

const toOption = (status) => ({ value: status, label: status.replace(/_/g, " ") });

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
    const organizationId = firstDefined(item.organization_id, item.organizationId, "default");
    const sellerSnapshot = normalizeJson(firstDefined(item.seller_snapshot, item.sellerSnapshot), {});
    const organizationSnapshot = normalizeJson(firstDefined(item.organization_snapshot, item.organizationSnapshot), {});
    const sellerName = firstDefined(sellerSnapshot.displayName, sellerSnapshot.businessName, sellerSnapshot.name, sellerSnapshot.sellerName, "Seller");
    const organizationName = firstDefined(
      organizationSnapshot.legalName,
      organizationSnapshot.legal_name,
      organizationSnapshot.storeDisplayName,
      organizationSnapshot.store_name,
      item.organizationName,
      ""
    );
    const groupKey = `${sellerId}:${organizationId}`;
    if (!groups[groupKey]) {
      groups[groupKey] = { sellerId, sellerName, organizationId, organizationName, items: [] };
    }
    groups[groupKey].items.push(item);
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

const normalizeSellerSettlement = (seller = {}) => ({
  sellerId: firstDefined(seller.sellerId, seller.seller_id, ""),
  sellerName: firstDefined(seller.sellerName, seller.seller_name, seller.sellerId, seller.seller_id, "Seller"),
  organizationId: firstDefined(seller.organizationId, seller.organization_id, ""),
  organizationName: firstDefined(seller.organizationName, seller.organization_name, seller.organizationSnapshot?.legalBusinessName, seller.organizationSnapshot?.storeDisplayName, ""),
  grossSales: money(firstDefined(seller.grossSalesAmount, seller.gross_sales_amount, 0)),
  taxableSales: money(firstDefined(seller.taxableAmount, seller.taxableSales, seller.taxable_sales, 0)),
  taxCollected: money(firstDefined(seller.taxAmount, seller.taxCollected, seller.tax_amount, 0)),
  sellerPayoutBase: money(firstDefined(seller.sellerPayoutBaseAmount, seller.seller_payout_base_amount, seller.taxableAmount, seller.taxableSales, 0)),
  commissionFee: money(firstDefined(seller.platformFeeAmount, seller.commissionAmount, seller.commissionFee, seller.platform_fee_amount, 0)),
  variableCommissionFee: money(firstDefined(seller.commissionFeeAmount, seller.commission_fee_amount, 0)),
  platformFeeTax: money(firstDefined(seller.platformFeeTaxAmount, seller.commissionTaxAmount, seller.platform_fee_tax_amount, 0)),
  fixedFee: money(firstDefined(seller.fixedFeeAmount, seller.fixedFee, seller.fixed_fee_amount, seller.fixed_fee, 0)),
  closingFee: money(firstDefined(seller.closingFeeAmount, seller.closingFee, seller.closing_fee_amount, seller.closing_fee, 0)),
  shippingReimbursement: money(firstDefined(seller.shippingReimbursementAmount, seller.shipping_reimbursement_amount, 0)),
  shippingDeduction: money(firstDefined(seller.shippingDeductionAmount, seller.shipping_deduction_amount, 0)),
  refundAmount: money(firstDefined(seller.refundAmount, seller.refund_amount, 0)),
  sellerPayout: money(firstDefined(seller.sellerPayoutAmount, seller.sellerPayout, seller.seller_payout_amount, 0)),
  commissionStatus: firstDefined(seller.commissionStatus, seller.commission_status, ""),
  payoutStatus: firstDefined(seller.payoutStatus, seller.payout_status, ""),
  payoutId: firstDefined(seller.payoutId, seller.payout_id, ""),
  payoutReference: firstDefined(seller.payoutReference, seller.payment_reference, ""),
  payoutMethod: firstDefined(seller.payoutMethod, seller.payment_method, ""),
  payoutProcessedAt: firstDefined(seller.payoutProcessedAt, seller.processed_at, ""),
  commissionRates: Array.isArray(seller.commissionRates) ? seller.commissionRates : [],
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
  const { isSeller, isAdmin, isSuperAdmin } = usePermission();

  const [state, setState] = useState({
    orderInfo: null,
    isLoading: false,
    statusModal: false,
    noteModal: false,
    userData: {},
    returns: [],
  });
  const [formData, setFormData] = useState({
    status: "", reason: "", reasonCode: "other", refundMethod: "auto", cancelItems: {},
    note: "", trackingNumber: "", carrierName: "", carrierUrl: "",
  });
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
  const sellerPlatformFeeAmount = money(firstDefined(summary.sellerPlatformFeeAmount, summary.platformFeeAmount, order.platform_fee_amount, order.platformFeeAmount));
  const customerPlatformFeeAmount = money(firstDefined(summary.customerPlatformFeeAmount, 0));
  const customerPlatformFeeTaxAmount = money(firstDefined(summary.customerPlatformFeeTaxAmount, 0));
  const customerTotalAmount = money(firstDefined(summary.customerTotalAmount, order.total_amount, order.totalAmount));
  const customerPayableAmount = money(firstDefined(summary.customerPayableAmount, order.payable_amount, order.payableAmount, order.total_amount));
  const items = Array.isArray(order.items) ? order.items : [];
  const relations = order.relations || {};
  const buyer = relations.buyer || order.buyer || order.buyerSnapshot || {};
  const payments = Array.isArray(relations.payments) ? relations.payments : [];
  const shipments = Array.isArray(relations.shipments) ? relations.shipments : [];
  const walletTransactions = Array.isArray(relations.walletTransactions) ? relations.walletTransactions : [];
  const cancellations = Array.isArray(relations.cancellations) ? relations.cancellations : [];
  const invoice = relations.invoice || relations.taxInvoice || null;
  const eWayBill = relations.eWayBill || relations.ewayBill || null;
  const returns = Array.isArray(state.returns) ? state.returns : [];
  const sellerGroups = useMemo(() => Object.values(groupItemsBySeller(items)), [items]);
  const sellerSettlements = useMemo(() => {
    const savedSettlements = Array.isArray(relations.sellerSettlements) ? relations.sellerSettlements : [];
    return savedSettlements.length
      ? savedSettlements.map(normalizeSellerSettlement)
      : buildSellerSettlements(items).map(normalizeSellerSettlement);
  }, [items, relations.sellerSettlements]);
  const orderTaxRates = useMemo(() => getOrderTaxRates(taxBreakup, items), [taxBreakup, items]);
  const timeline = Array.isArray(order.timeline) ? order.timeline : [];
  const notes = Array.isArray(order.notes) ? order.notes : [];

  // Build role-aware status options filtered to valid next transitions from current status
  const statusOptions = useMemo(() => {
    const currentStatus = order.status;
    const validNext = ALLOWED_TRANSITIONS[currentStatus] || ALL_STATUSES;
    return validNext
      .filter((s) => {
        if (isSuperAdmin || isAdmin) return true;
        if (isSeller) return SELLER_ALLOWED_NEXT.has(s);
        return false;
      })
      .map(toOption);
  }, [order.status, isSeller, isAdmin, isSuperAdmin]);

  const handleStatusSubmit = useCallback(async () => {
    if (!formData.status) {
      toast.error("Status is required");
      return;
    }
    if (formData.status === "cancelled" && formData.reason.trim().length < MINIMUM_CANCEL_REASON_LENGTH) {
      toast.error(`Please provide a cancellation reason with at least ${MINIMUM_CANCEL_REASON_LENGTH} characters`);
      return;
    }
    const cancellationItems = Object.entries(formData.cancelItems || {})
      .filter(([, quantity]) => Number(quantity) > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity: Number(quantity) }));
    if (formData.status === "cancelled" && !cancellationItems.length) {
      toast.error("Select at least one item quantity to cancel");
      return;
    }
    try {
      setLoading(true);
      const payload = {
        orderId,
        status: formData.status,
        reason: formData.reason,
        note: formData.note,
        trackingNumber: formData.trackingNumber,
        carrierName: formData.carrierName,
        carrierUrl: formData.carrierUrl,
      };
      const res = formData.status === "cancelled"
        ? await dispatch(orderCancel({
            orderId,
            reason: formData.reason,
            reasonCode: formData.reasonCode,
            refundMethod: formData.refundMethod,
            items: cancellationItems,
            idempotencyKey: `admin:${orderId}:${Date.now()}`,
          })).unwrap()
        : await dispatch(updateOrderStatus(payload)).unwrap();
      toast.success(res?.message || "Order updated successfully");
      setState((prev) => ({ ...prev, statusModal: false }));
      setFormData({ status: "", reason: "", reasonCode: "other", refundMethod: "auto", cancelItems: {}, note: "", trackingNumber: "", carrierName: "", carrierUrl: "" });
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
          subtitle="Customer, payment, shipment, tax, commission, and payout details"
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
            {/* Sellers see the button based on role + available transitions; admins need status_change permission */}
            {statusOptions.length > 0 && ((isSeller) ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-[#f3b234] bg-[#f6b73c] px-3 py-2 text-sm font-semibold text-[#202337] shadow-sm transition hover:bg-[#f2aa22]"
                onClick={() => setState((prev) => ({ ...prev, statusModal: true }))}
              >
                <FaFile /> Update Status
              </button>
            ) : (
              <PermissionGuard module="orders" action="status_change" hide>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-[#f3b234] bg-[#f6b73c] px-3 py-2 text-sm font-semibold text-[#202337] shadow-sm transition hover:bg-[#f2aa22]"
                  onClick={() => setState((prev) => ({ ...prev, statusModal: true }))}
                >
                  <FaFile /> Status
                </button>
              </PermissionGuard>
            ))}
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
              <div key={`${group.sellerId}-${group.organizationId}`} className="mb-4 overflow-hidden rounded-lg border border-[#eadfbd] bg-white last:mb-0">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fff9ea] px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-[#202337]">{group.organizationName || group.sellerName}</div>
                    <div className="text-xs text-[#65718b]">
                      Seller: {group.sellerName} · Organization: {group.organizationName || group.organizationId || "N/A"}
                    </div>
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
                      <div className="md:col-span-2"><StatusBadge status={item.cancellation_status || order.status} size="sm" dot /></div>
                      <div className="font-medium text-[#202337] md:col-span-1 md:text-center">
                        {Number(item.quantity || 0)}
                        {Number(item.cancelled_quantity || 0) > 0 && <div className="text-xs text-red-600">-{Number(item.cancelled_quantity)} cancelled</div>}
                      </div>
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
              <InfoRow label="Seller Commission/Fee" value={formatMoney(sellerPlatformFeeAmount)} />
              {customerPlatformFeeAmount > 0 && <InfoRow label="Customer Platform Fee" value={formatMoney(customerPlatformFeeAmount)} />}
              {customerPlatformFeeTaxAmount > 0 && <InfoRow label="Platform Fee GST" value={formatMoney(customerPlatformFeeTaxAmount)} />}
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
              <div>
                <InfoRow label="Customer" value={firstDefined(buyer.displayName, buyer.fullName, buyer.name, order.buyerName, "Customer")} />
                <InfoRow label="Email" value={firstDefined(buyer.email, order.buyerEmail, "Not available")} />
                <InfoRow label="Phone" value={firstDefined(buyer.phone, shippingAddress.phone, "Not available")} />
              </div>
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
              <button type="button" className="rounded-md border border-[#2f6fed] bg-white px-3 py-1.5 text-xs font-medium text-[#2f6fed] hover:bg-[#f3f6ff]" onClick={() => navigate(`/app/cancellations?orderId=${encodeURIComponent(orderId)}`)}>
                Cancellations
              </button>
              <button type="button" className="rounded-md border border-[#2f6fed] bg-white px-3 py-1.5 text-xs font-medium text-[#2f6fed] hover:bg-[#f3f6ff]" onClick={() => navigate(`/app/tax-invoices?orderId=${encodeURIComponent(orderId)}`)}>
                Tax Invoices
              </button>
              <button type="button" className="rounded-md border border-[#2f6fed] bg-white px-3 py-1.5 text-xs font-medium text-[#2f6fed] hover:bg-[#f3f6ff]" onClick={() => navigate(`/app/credit-notes?orderId=${encodeURIComponent(orderId)}`)}>
                Credit Notes
              </button>
            </div>
          )}
        >
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-[#65718b]">Cancellations</h3>
              {cancellations.length ? (
                <div className="space-y-3">
                  {cancellations.map((cancellation) => (
                    <RelatedCard
                      key={cancellation.id}
                      title={cancellation.cancellation_number}
                      subtitle={`${displayStatus(cancellation.scope)} · ${cancellation.reason}`}
                      status={cancellation.status}
                      rows={[
                        { label: "Refund", value: formatMoney(cancellation.refund_amount) },
                        { label: "Refund status", value: displayStatus(cancellation.refund_status) },
                        { label: "Inventory", value: displayStatus(cancellation.inventory_status) },
                        { label: "Shipment", value: displayStatus(cancellation.shipment_status) },
                        { label: "Requested", value: formatDate(cancellation.created_at) },
                      ]}
                      action={<button type="button" className="text-xs font-medium text-[#2f6fed]" onClick={() => navigate(`/app/cancellations?search=${encodeURIComponent(cancellation.cancellation_number)}`)}>Open recovery queue</button>}
                    />
                  ))}
                </div>
              ) : <EmptyState>No cancellation records found</EmptyState>}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-[#65718b]">Payments</h3>
              {payments.length ? (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <RelatedCard
                      key={payment.id || payment._id || payment.transaction_reference}
                      title={`${displayStatus(payment.provider || "payment")} payment`}
                      subtitle={`Order #${orderNumber}`}
                      status={payment.status}
                      rows={[
                        { label: "Provider", value: displayStatus(payment.provider) },
                        { label: "Amount", value: `${payment.currency || order.currency || "INR"} ${money(payment.amount).toFixed(2)}` },
                        { label: "Payment status", value: displayStatus(payment.status) },
                        { label: "Method", value: displayStatus(firstDefined(payment.method, payment.payment_method, payment.provider)) },
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
                      title={firstDefined(shipment.awb_number, shipment.tracking_number, "Shipment")}
                      subtitle={(() => {
                        const sellerName = firstDefined(
                          shipment.sellerSnapshot?.name, shipment.sellerName,
                          shipment.seller?.displayName, shipment.seller?.name, shipment.seller?.businessName
                        );
                        return sellerName || "Seller";
                      })()}
                      status={shipment.status}
                      rows={[
                        { label: "Provider", value: displayStatus(firstDefined(shipment.provider, shipment.courier_name, shipment.courierName)) },
                        { label: "Tracking", value: firstDefined(shipment.tracking_number, shipment.trackingNumber, shipment.awb_number, "N/A") },
                        { label: "COD", value: shipment.cod ? "Yes" : "No" },
                        { label: "Created", value: formatDate(firstDefined(shipment.created_at, shipment.createdAt)) },
                        { label: "Events", value: Array.isArray(shipment.trackingEvents) ? shipment.trackingEvents.length : 0 },
                      ]}
                      action={(
                        <button
                          type="button"
                          className="text-xs font-medium text-[#2f6fed]"
                          onClick={() => navigate(`/app/shipment-tracking?orderId=${encodeURIComponent(orderId)}&shipmentId=${encodeURIComponent(firstDefined(shipment.id, shipment._id, ""))}`)}
                        >
                          Manage tracking, agent, OTP, E-way
                        </button>
                      )}
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
                    title={firstDefined(invoice.invoice_number, invoice.invoiceNumber, "Tax invoice")}
                    subtitle="Tax invoice"
                    status={firstDefined(invoice.status, "generated")}
                    rows={[
                      { label: "Invoice number", value: firstDefined(invoice.invoice_number, invoice.invoiceNumber, "Generated") },
                      { label: "Total", value: formatMoney(firstDefined(invoice.total_amount, invoice.totalAmount)) },
                      { label: "Created", value: formatDate(firstDefined(invoice.created_at, invoice.createdAt)) },
                    ]}
                  />
                ) : <EmptyState>No invoice found</EmptyState>}
                {eWayBill ? (
                  <RelatedCard
                    title={firstDefined(eWayBill.eway_bill_number, eWayBill.ewayBillNumber, "E-way bill")}
                    subtitle="E-way bill"
                    status={firstDefined(eWayBill.status, "created")}
                    rows={[
                      { label: "Vehicle", value: firstDefined(eWayBill.vehicle_number, eWayBill.vehicleNumber, "Not added") },
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
                        title="Return request"
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
                        title={`${displayStatus(firstDefined(walletTx.type, walletTx.transaction_type, "wallet"))} wallet entry`}
                        subtitle={displayStatus(firstDefined(walletTx.type, walletTx.transaction_type, "wallet"))}
                        status={firstDefined(walletTx.status, "recorded")}
                        rows={[
                          { label: "Amount", value: formatMoney(firstDefined(walletTx.amount, walletTx.value)) },
                          { label: "Order", value: `#${orderNumber}` },
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
                <div key={`${seller.sellerId}-${seller.organizationId || "default"}`} className="rounded-lg border border-[#eadfbd] bg-white p-4 text-sm">
                  <div className="flex justify-between gap-2 mb-3">
                    <div>
                      <div className="font-semibold text-[#202337]">{seller.sellerName}</div>
                      {seller.organizationName && <div className="text-xs text-[#65718b]">{seller.organizationName}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#1f4fc9]">{formatMoney(seller.sellerPayout)}</div>
                      <div className="text-xs text-[#65718b]">seller payout</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Gross product sales</span><span>{formatMoney(seller.grossSales)}</span></div>
                    <div className="flex justify-between"><span>Seller payout base</span><span>{formatMoney(seller.sellerPayoutBase)}</span></div>
                    <div className="flex justify-between"><span>Taxable product sales</span><span>{formatMoney(seller.taxableSales)}</span></div>
                    <div className="flex justify-between"><span>Tax to maintain</span><span>{formatMoney(seller.taxCollected)}</span></div>
                    <div className="flex justify-between">
                      <span>Total platform fee</span>
                      <span>
                        -{formatMoney(seller.commissionFee)}
                        {seller.commissionRates.length ? ` (${seller.commissionRates.map(percent).join(", ")})` : ""}
                      </span>
                    </div>
                    <div className="ml-3 flex justify-between text-xs text-[#65718b]"><span>Percentage commission part</span><span>{formatMoney(seller.variableCommissionFee)}</span></div>
                    <div className="ml-3 flex justify-between text-xs text-[#65718b]"><span>Fixed fee part</span><span>{formatMoney(seller.fixedFee)}</span></div>
                    <div className="ml-3 flex justify-between text-xs text-[#65718b]"><span>Closing fee part</span><span>{formatMoney(seller.closingFee)}</span></div>
                    <div className="flex justify-between"><span>Platform fee GST</span><span>-{formatMoney(seller.platformFeeTax)}</span></div>
                    <div className="flex justify-between"><span>Shipping reimbursement</span><span>{formatMoney(seller.shippingReimbursement)}</span></div>
                    <div className="flex justify-between"><span>Shipping deduction</span><span>-{formatMoney(seller.shippingDeduction)}</span></div>
                    <div className="flex justify-between"><span>Refund adjustment</span><span>-{formatMoney(seller.refundAmount)}</span></div>
                    {(seller.commissionStatus || seller.payoutStatus) && (
                      <div className="rounded-md bg-[#f8faff] px-2 py-1 text-xs text-[#65718b]">
                        {seller.commissionStatus && <span>Commission: {displayStatus(seller.commissionStatus)}</span>}
                        {seller.payoutStatus && <span className="ml-2">Payout: {displayStatus(seller.payoutStatus)}</span>}
                        {seller.payoutMethod && <span className="ml-2">Method: {displayStatus(seller.payoutMethod)}</span>}
                        {seller.payoutReference && <span className="ml-2">Bank ref: {seller.payoutReference}</span>}
                        {seller.payoutProcessedAt && <span className="ml-2">Paid: {formatDate(seller.payoutProcessedAt)}</span>}
                      </div>
                    )}
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

      <DefaultModal isOpen={state.statusModal} onClose={() => setState((prev) => ({ ...prev, statusModal: false }))} title="Order Status Change" onSubmit={handleStatusSubmit} loading={state.isLoading}>
        <div className="space-y-4">
          <FilterSelect
            options={statusOptions}
            value={statusOptions.find((opt) => opt.value === formData.status) || null}
            onChange={(option) => {
              const status = option?.value || "";
              const cancelItems = status === "cancelled"
                ? Object.fromEntries(items
                    .map((item) => [String(item.id), Number(item.quantity || 0) - Number(item.cancelled_quantity || 0)])
                    .filter(([, quantity]) => quantity > 0))
                : {};
              setFormData((prev) => ({ ...prev, status, cancelItems }));
            }}
            label="Status"
            placeholder="Select Status"
          />
          {formData.status === "shipped" && (
            <div className="rounded-md border border-[#e0ecff] bg-[#f0f6ff] p-3 space-y-3">
              <p className="text-xs font-semibold text-[#2f6fed]">Shipment Details</p>
              <Input labelName="Tracking Number" value={formData.trackingNumber} onChange={(event) => setFormData((prev) => ({ ...prev, trackingNumber: event.target.value }))} name="trackingNumber" placeholder="AWB / tracking number" maxLength={200} />
              <Input labelName="Carrier / Courier" value={formData.carrierName} onChange={(event) => setFormData((prev) => ({ ...prev, carrierName: event.target.value }))} name="carrierName" placeholder="e.g. Delhivery, BlueDart, FedEx" maxLength={100} />
              <Input labelName="Tracking URL (optional)" value={formData.carrierUrl} onChange={(event) => setFormData((prev) => ({ ...prev, carrierUrl: event.target.value }))} name="carrierUrl" placeholder="https://..." maxLength={500} />
            </div>
          )}
          {formData.status === "cancelled" && (
            <div className="space-y-3 rounded-md border border-[#f4d7d7] bg-[#fff8f8] p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-[#202337]">
                  Reason type
                  <select className="mt-1 w-full rounded border px-3 py-2" value={formData.reasonCode} onChange={(event) => setFormData((prev) => ({ ...prev, reasonCode: event.target.value }))}>
                    <option value="other">Other</option>
                    <option value="seller_unavailable">Seller unavailable</option>
                    <option value="inventory_unavailable">Inventory unavailable</option>
                    <option value="delivery_delay">Delivery delay</option>
                    <option value="pricing_issue">Pricing issue</option>
                    <option value="address_issue">Address issue</option>
                    <option value="payment_issue">Payment issue</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-[#202337]">
                  Refund handling
                  <select className="mt-1 w-full rounded border px-3 py-2" value={formData.refundMethod} onChange={(event) => setFormData((prev) => ({ ...prev, refundMethod: event.target.value }))}>
                    <option value="auto">Automatic</option>
                    <option value="original_source">Original source</option>
                    <option value="wallet">Wallet</option>
                    <option value="manual">Manual review</option>
                  </select>
                </label>
              </div>
              <div className="text-xs font-semibold uppercase text-[#65718b]">Cancellation quantities</div>
              {items.map((item) => {
                const itemId = String(item.id);
                const remaining = Number(item.quantity || 0) - Number(item.cancelled_quantity || 0);
                const selected = Object.prototype.hasOwnProperty.call(formData.cancelItems, itemId);
                return (
                  <div key={itemId} className="flex items-center gap-3 rounded border bg-white p-2 text-sm">
                    <input type="checkbox" checked={selected} disabled={remaining <= 0} onChange={(event) => setFormData((prev) => {
                      const next = { ...prev.cancelItems };
                      if (event.target.checked) next[itemId] = remaining;
                      else delete next[itemId];
                      return { ...prev, cancelItems: next };
                    })} />
                    <span className="min-w-0 flex-1 truncate">{firstDefined(item.product_title, item.product_id)}</span>
                    <input type="number" min="1" max={remaining} disabled={!selected} className="w-20 rounded border px-2 py-1" value={selected ? formData.cancelItems[itemId] : ""} onChange={(event) => setFormData((prev) => ({
                      ...prev,
                      cancelItems: { ...prev.cancelItems, [itemId]: Math.min(Math.max(Number(event.target.value || 1), 1), remaining) },
                    }))} />
                    <span className="text-xs text-[#65718b]">of {remaining}</span>
                  </div>
                );
              })}
            </div>
          )}
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
