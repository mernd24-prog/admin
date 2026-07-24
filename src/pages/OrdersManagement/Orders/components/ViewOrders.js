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
import { formatLabel } from "../../../../utils/formatters";

const MINIMUM_CANCEL_REASON_LENGTH = 10;

// All structurally valid transitions (mirrors backend assertOrderTransitionAllowed)
const ALLOWED_TRANSITIONS = {
  pending_payment: ["confirmed", "payment_failed", "cancelled", "on_hold"],
  payment_failed:  ["pending_payment", "cancelled", "on_hold"],
  on_hold:         ["pending_payment", "confirmed", "processing", "cancelled"],
  confirmed:       ["processing", "packed", "cancelled", "on_hold"],
  processing:      ["packed", "cancelled", "on_hold"],
  packed:          ["ready_to_ship", "cancelled", "on_hold"],
  ready_to_ship:   ["shipped", "cancelled", "on_hold"],
  shipped:         ["out_for_delivery", "delivered", "failed_delivery", "return_requested"],
  out_for_delivery:["delivered", "failed_delivery", "return_requested"],
  failed_delivery: ["out_for_delivery", "returned", "cancelled"],
  delivered:       ["fulfilled", "return_requested"],
  fulfilled:       ["return_requested"],
  return_requested:["partially_returned", "returned"],
  partially_returned:["return_requested", "fulfilled", "refunded"],
  returned:        ["fulfilled", "refunded"],
  refunded:        ["fulfilled"],
};

const ADMIN_ORDER_ROLES = new Set(["super-admin", "admin", "sub-admin", "super_admin", "sub_admin"]);
const ORDER_STATUS_VALUES = [...new Set([
  ...Object.keys(ALLOWED_TRANSITIONS),
  ...Object.values(ALLOWED_TRANSITIONS).flat(),
])];

const STATUS_ALIASES = {
  pending: "pending_payment",
  placed: "pending_payment",
  created: "pending_payment",
  initiated: "pending_payment",
  authorized: "pending_payment",
  paid: "confirmed",
  captured: "confirmed",
  dispatched: "shipped",
  completed: "fulfilled",
  complete: "fulfilled",
};

const normalizeStatusKey = (status = "") =>
  STATUS_ALIASES[String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_")] ||
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");

const toOption = (status) => ({ value: status, label: formatLabel(status) });

const transitionStatusOf = (transition) => {
  if (typeof transition === "string") return transition;
  if (!transition || typeof transition !== "object") return "";
  return firstDefined(
    transition.to,
    transition.toStatus,
    transition.to_status,
    transition.nextStatus,
    transition.next_status,
    transition.status,
    transition.value,
  );
};

const orderTransitionOptionsOf = (order = {}) => [
  order.availableTransitions,
  order.available_transitions,
  order.allowedTransitions,
  order.allowed_transitions,
  order.statusTransitions,
  order.status_transitions,
  order.transitions,
  order.relations?.availableTransitions,
  order.relations?.allowedTransitions,
]
  .find((transitions) => Array.isArray(transitions) && transitions.length) || [];

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
  if (mode === "cgst_sgst") {
    return `CGST ${percent(money(gstRate) / 2)} + SGST ${percent(money(gstRate) / 2)}${cessText}`;
  }
  if (mode === "igst") return `IGST ${percent(gstRate)}${cessText}`;
  if (mode === "zero_rated_export") return `Zero-rated export${cessText}`;
  if (mode === "exempt") return "GST exempt";
  return `${percent(gstRate)} GST${cessText}`;
};

const getOrganizationName = (snapshot = {}) =>
  firstDefined(
    snapshot.legalBusinessName,
    snapshot.legalName,
    snapshot.legal_name,
    snapshot.storeDisplayName,
    snapshot.store_name,
    snapshot.name,
    "",
  );

const getSellerDisplayName = (seller = {}) =>
  firstDefined(
    seller.sellerName,
    seller.seller_name,
    seller.displayName,
    seller.businessName,
    seller.name,
    seller.sellerProfile?.displayName,
    seller.sellerProfile?.businessName,
    seller.profile?.name,
    seller.email,
    "",
  );

const buildSellerLookup = (relations = {}) => {
  const lookup = {};
  const remember = (sellerId, organizationId, values = {}) => {
    if (!sellerId) return;
    const key = `${sellerId}:${organizationId || "default"}`;
    lookup[key] = {
      ...(lookup[key] || {}),
      ...Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== "")),
    };
    lookup[String(sellerId)] = {
      ...(lookup[String(sellerId)] || {}),
      ...lookup[key],
    };
  };

  (relations.sellerFulfillmentGroups || []).forEach((group) => {
    const organizationSnapshot = normalizeJson(group.organizationSnapshot || group.organization_snapshot, {});
    remember(group.sellerId || group.seller_id, group.organizationId || group.organization_id, {
      sellerName: group.sellerName || group.seller_name,
      organizationName: group.organizationName || group.organization_name || getOrganizationName(organizationSnapshot),
    });
  });
  (relations.sellerSettlements || []).forEach((seller) => {
    const organizationSnapshot = normalizeJson(seller.organizationSnapshot || seller.organization_snapshot, {});
    remember(seller.sellerId || seller.seller_id, seller.organizationId || seller.organization_id, {
      sellerName: seller.sellerName || seller.seller_name,
      organizationName: seller.organizationName || seller.organization_name || getOrganizationName(organizationSnapshot),
    });
  });
  (relations.shipments || []).forEach((shipment) => {
    const sellerSnapshot = normalizeJson(shipment.sellerSnapshot || shipment.seller_snapshot, {});
    const organizationSnapshot = normalizeJson(shipment.organizationSnapshot || shipment.organization_snapshot, {});
    remember(shipment.sellerId || shipment.seller_id || shipment.seller?.id || shipment.seller?._id, shipment.organizationId || shipment.organization_id, {
      sellerName: getSellerDisplayName(shipment.seller) || getSellerDisplayName(sellerSnapshot),
      organizationName: getOrganizationName(organizationSnapshot),
    });
  });
  return lookup;
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

const groupItemsBySeller = (items = [], relations = {}) => {
  const sellerLookup = buildSellerLookup(relations);
  return items.reduce((groups, item) => {
    const sellerId = firstDefined(item.seller_id, item.sellerId, "platform");
    const organizationId = firstDefined(item.organization_id, item.organizationId, "default");
    const lookup = sellerLookup[`${sellerId}:${organizationId}`] || sellerLookup[String(sellerId)] || {};
    const sellerSnapshot = normalizeJson(firstDefined(item.seller_snapshot, item.sellerSnapshot), {});
    const organizationSnapshot = normalizeJson(firstDefined(item.organization_snapshot, item.organizationSnapshot), {});
    const sellerName = firstDefined(
      lookup.sellerName,
      getSellerDisplayName(sellerSnapshot),
      item.sellerName,
      "Seller",
    );
    const organizationName = firstDefined(
      lookup.organizationName,
      getOrganizationName(organizationSnapshot),
      item.organizationName,
      "",
    );
    const groupKey = `${sellerId}:${organizationId}`;
    if (!groups[groupKey]) {
      groups[groupKey] = { sellerId, sellerName, organizationId, organizationName, items: [] };
    }
    groups[groupKey].items.push(item);
    return groups;
  }, {});
};

const sameSellerGroup = (entry = {}, group = {}) =>
  String(firstDefined(entry.sellerId, entry.seller_id, "")) === String(group.sellerId || "") &&
  String(firstDefined(entry.organizationId, entry.organization_id, "default") || "default") === String(group.organizationId || "default");

const groupItemsBySellerFromItems = (items = []) =>
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
  Object.values(groupItemsBySellerFromItems(items)).map((group) => {
    const totals = group.items.reduce(
      (acc, item) => {
        const itemTax = normalizeJson(firstDefined(item.tax_breakup, item.taxBreakup), {});
        const pricing = normalizeJson(firstDefined(item.pricing_snapshot, item.pricingSnapshot), {});
        const lineTotal = money(firstDefined(item.line_total, item.lineTotal));
        const taxableAmount = money(firstDefined(itemTax.taxableAmount, itemTax.taxable_amount, lineTotal - money(firstDefined(item.discount_amount, item.discountAmount))));
        const taxAmount = money(firstDefined(item.tax_amount, item.taxAmount, itemTax.taxAmount, itemTax.tax_amount));
        const platformFee = money(firstDefined(item.platform_fee_amount, item.platformFeeAmount, pricing.platformFeeAmount));
        const commissionFee = money(firstDefined(pricing.commissionFee, pricing.commission_fee, platformFee));
        const commissionPercent = money(firstDefined(pricing.commissionPercent, pricing.commission_percent));

        acc.grossSales += lineTotal;
        acc.taxableSales += taxableAmount;
        acc.taxCollected += taxAmount;
        acc.platformFee += platformFee;
        acc.commissionFee += commissionFee;
        if (commissionPercent > 0) acc.commissionRates.add(commissionPercent);
        return acc;
      },
      {
        grossSales: 0,
        taxableSales: 0,
        taxCollected: 0,
        platformFee: 0,
        commissionFee: 0,
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
  commissionReversal: money(firstDefined(seller.commissionReversalAmount, seller.commission_reversal_amount, 0)),
  netCommissionFee: money(firstDefined(seller.netPlatformCommissionAmount, seller.net_platform_commission_amount, seller.platformFeeAmount, seller.commissionAmount, 0)),
  variableCommissionFee: money(firstDefined(seller.commissionFeeAmount, seller.commission_fee_amount, 0)),
  platformFeeTax: money(firstDefined(seller.platformFeeTaxAmount, seller.commissionTaxAmount, seller.platform_fee_tax_amount, 0)),
  commissionTaxReversal: money(firstDefined(seller.commissionTaxReversalAmount, seller.commission_tax_reversal_amount, 0)),
  netCommissionTax: money(firstDefined(seller.netCommissionTaxAmount, seller.net_commission_tax_amount, seller.platformFeeTaxAmount, seller.commissionTaxAmount, 0)),
  discountAmount: money(firstDefined(seller.discountAmount, seller.discount_amount, 0)),
  sellerFundedDiscount: money(firstDefined(seller.sellerFundedDiscountAmount, seller.seller_funded_discount_amount, 0)),
  marketplaceFundedDiscount: money(firstDefined(seller.marketplaceFundedDiscountAmount, seller.marketplace_funded_discount_amount, 0)),
  sellerDeliveryCharge: money(firstDefined(seller.sellerDeliveryChargeAmount, seller.seller_delivery_charge_amount, seller.deliveryChargeAmount, seller.delivery_charge_amount, 0)),
  shippingReimbursement: money(firstDefined(seller.shippingReimbursementAmount, seller.shipping_reimbursement_amount, 0)),
  shippingDeduction: money(firstDefined(seller.shippingDeductionAmount, seller.shipping_deduction_amount, 0)),
  shippingPolicy: firstDefined(seller.shippingPolicy, seller.shipping_policy, ""),
  refundAmount: money(firstDefined(seller.refundAmount, seller.refund_amount, 0)),
  sellerPayoutBaseReversal: money(firstDefined(seller.sellerPayoutBaseReversalAmount, seller.seller_payout_base_reversal_amount, seller.refundAmount, seller.refund_amount, 0)),
  adjustmentAmount: money(firstDefined(seller.adjustmentAmount, seller.adjustment_amount, 0)),
  gstTcsRate: money(firstDefined(seller.gstTcsRate, seller.gst_tcs_rate, 0)),
  gstTcsAmount: money(firstDefined(seller.gstTcsAmount, seller.gst_tcs_amount, 0)),
  gstTcsTaxableBase: money(firstDefined(seller.gstTcsTaxableAmount, seller.gstTcsTaxableBaseAmount, seller.gst_tcs_taxable_base_amount, seller.taxableAmount, seller.taxableSales, 0)),
  gstTcsReversal: money(firstDefined(seller.gstTcsReversalAmount, seller.gst_tcs_reversal_amount, 0)),
  netGstTcsAmount: money(firstDefined(seller.netGstTcsAmount, seller.net_gst_tcs_amount, seller.gstTcsAmount, seller.gst_tcs_amount, 0)),
  gstTcsTaxableBaseReversal: money(firstDefined(seller.gstTcsTaxableBaseReversalAmount, seller.gst_tcs_taxable_base_reversal_amount, 0)),
  netGstTcsTaxableBase: money(firstDefined(seller.netGstTcsTaxableBaseAmount, seller.net_gst_tcs_taxable_base_amount, seller.taxableAmount, seller.taxableSales, 0)),
  incomeTaxTdsRate: money(firstDefined(seller.incomeTaxTdsRate, seller.income_tax_tds_rate, 0)),
  incomeTaxTdsTaxableBase: money(firstDefined(seller.incomeTaxTdsTaxableAmount, seller.incomeTaxTdsTaxableBaseAmount, seller.income_tax_tds_taxable_base_amount, seller.grossSalesAmount, seller.grossSales, 0)),
  incomeTaxTdsAmount: money(firstDefined(seller.incomeTaxTdsAmount, seller.income_tax_tds_amount, 0)),
  incomeTaxTdsReversal: money(firstDefined(seller.incomeTaxTdsReversalAmount, seller.income_tax_tds_reversal_amount, 0)),
  netIncomeTaxTdsAmount: money(firstDefined(seller.netIncomeTaxTdsAmount, seller.net_income_tax_tds_amount, seller.incomeTaxTdsAmount, seller.income_tax_tds_amount, 0)),
  sellerPayout: money(firstDefined(seller.sellerPayoutAmount, seller.sellerPayout, seller.seller_payout_amount, 0)),
  commissionStatus: firstDefined(seller.commissionStatus, seller.commission_status, ""),
  payoutStatus: firstDefined(seller.payoutStatus, seller.payout_status, ""),
  payoutId: firstDefined(seller.payoutId, seller.payout_id, ""),
  payoutReference: firstDefined(seller.payoutReference, seller.payment_reference, ""),
  payoutMethod: firstDefined(seller.payoutMethod, seller.payment_method, ""),
  payoutProcessedAt: firstDefined(seller.payoutProcessedAt, seller.processed_at, ""),
  commissionRates: Array.isArray(seller.commissionRates) ? seller.commissionRates : [],
  commissionBreakdown: Array.isArray(seller.commissionBreakdown) ? seller.commissionBreakdown : [],
  commissionIds: Array.isArray(seller.commissionIds) ? seller.commissionIds : [],
});

const Panel = ({ title, children, actions, className = "" }) => (
  <section className={`rounded-lg border border-[#eadfbd] bg-[#fffdf8] shadow-[0_1px_3px_rgba(31,41,55,0.06)] ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-3 border-b border-[#efe6cd] px-4 py-3">
        {title && <h2 className="text-sm font-semibold text-[#202337]">{formatLabel(title)}</h2>}
        {actions}
      </div>
    )}
    <div className="p-4">{children}</div>
  </section>
);

const InfoRow = ({ label, value, strong = false }) => (
  <div className="flex items-start justify-between gap-4 py-2 text-sm">
    <span className="text-[#65718b]">{formatLabel(label)}</span>
    <span className={`text-right text-[#202337] ${strong ? "font-semibold" : "font-medium"}`}>
      {value && typeof value === "object" ? value : formatLabel(value, "N/A")}
    </span>
  </div>
);

const DetailLink = ({ children, onClick, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left font-medium text-[#202337] transition-colors hover:text-[var(--admin-gold-dark)] hover:underline ${className}`}
  >
    {children}
  </button>
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
        <div className="font-semibold text-[#202337]">
          {formatLabel(title, "N/A")}
        </div>

        {subtitle && (
          <div className="mt-0.5 text-xs text-[#65718b]">
            {subtitle}
          </div>
        )}
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
  const { can, isSeller, isAdmin, isSuperAdmin, role } = usePermission();
  const canOpenAdminProfiles = !isSeller;

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
  const relationActions = [
    { label: "Payments", module: "payments", path: "/app/payments" },
    { label: "Shipments", module: "delivery", path: "/app/shipment-tracking" },
    { label: "Returns", module: "returns", path: "/app/returns" },
    { label: "Cancellations", module: "cancellations", path: "/app/cancellations" },
    { label: "Tax Invoices", module: "tax-invoices", path: "/app/tax-invoices" },
    { label: "Credit Notes", module: "credit-notes", path: "/app/credit-notes" },
  ].filter((action) => can(action.module, "view"));
  const orderNumber = firstDefined(order.order_number, order.orderNumber, order.order_no, orderId);
  const shippingAddress = normalizeJson(firstDefined(order.shipping_address, order.shippingAddress), {});
  const taxBreakup = normalizeJson(firstDefined(order.tax_breakup, order.taxBreakup), {});
  const summary = order.summary || {};
  const taxIncludedAmount = money(firstDefined(summary.taxIncludedAmount, taxBreakup.taxIncludedAmount));
  const taxPayableAmount = money(firstDefined(summary.taxPayableAmount, taxBreakup.taxPayableAmount));
  const customerPlatformFeeAmount = money(firstDefined(summary.customerPlatformFeeAmount, 0));
  const customerPlatformFeeTaxAmount = money(firstDefined(summary.customerPlatformFeeTaxAmount, 0));
  const items = Array.isArray(order.items) ? order.items : [];
  const subtotalAmount = money(firstDefined(
    summary.subtotalAmount,
    order.subtotal_amount,
    order.subtotalAmount,
    items.reduce((total, item) => total + money(firstDefined(item.line_total, item.lineTotal)), 0),
  ));
  const discountAmount = money(firstDefined(summary.discountAmount, order.discount_amount, order.discountAmount));
  const discountSource = String(firstDefined(
    summary.discountSource,
    order.discount_source,
    order.discountSource,
    order.metadata?.discountSource,
    "platform",
  )).toLowerCase();
  const discountLabel = discountSource === "influencer" ? "Influencer Discount" : "Platform Discount";
  const deliveryChargeAmount = money(firstDefined(
    summary.deliveryChargeAmount,
    summary.shippingFeeAmount,
    order.shipping_fee_amount,
    order.shippingFeeAmount,
  ));
  const codChargeAmount = money(firstDefined(summary.codChargeAmount, order.cod_charge_amount, order.codChargeAmount));
  const walletDiscountAmount = money(firstDefined(summary.walletDiscountAmount, order.wallet_discount_amount, order.walletDiscountAmount));
  // The customer pays only customer-facing amounts. Seller commission and GST
  // already included in item prices must never be added again.
  const customerTotalAmount = Number(Math.max(0,
    subtotalAmount - discountAmount + taxPayableAmount + deliveryChargeAmount +
    customerPlatformFeeAmount + customerPlatformFeeTaxAmount + codChargeAmount,
  ).toFixed(2));
  const customerPayableAmount = Number(Math.max(0, customerTotalAmount - walletDiscountAmount).toFixed(2));
  const relations = order.relations || {};
  const buyer = relations.buyer || order.buyer || order.buyerSnapshot || {};
  const buyerId = firstDefined(buyer.id, buyer._id, order.buyer_id, order.buyerId);
  const payments = Array.isArray(relations.payments) ? relations.payments : [];
  const shipments = Array.isArray(relations.shipments) ? relations.shipments : [];
  const walletTransactions = Array.isArray(relations.walletTransactions) ? relations.walletTransactions : [];
  const cancellations = Array.isArray(relations.cancellations) ? relations.cancellations : [];
  const invoice = relations.invoice || relations.taxInvoice || null;
  const returns = Array.isArray(state.returns) ? state.returns : [];
  const sellerGroups = useMemo(() => Object.values(groupItemsBySeller(items, relations)), [items, relations]);
  const sellerSettlements = useMemo(() => {
    const savedSettlements = Array.isArray(relations.sellerSettlements) ? relations.sellerSettlements : [];
    return savedSettlements.length
      ? savedSettlements.map(normalizeSellerSettlement)
      : buildSellerSettlements(items).map(normalizeSellerSettlement);
  }, [items, relations.sellerSettlements]);
  const shipmentSummary = useMemo(() => {
    const statuses = shipments
      .filter((shipment) => String(shipment.direction || "forward") !== "reverse")
      .map((shipment) => firstDefined(shipment.status, shipment.shipment_status, shipment.delivery_status))
      .filter(Boolean);
    if (statuses.length) {
      const counts = statuses.reduce((acc, status) => {
        const key = String(status);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts)
        .map(([status, count]) => `${displayStatus(status)} (${count})`)
        .join(", ");
    }

    const groupStatuses = (relations.sellerFulfillmentGroups || [])
      .map((group) => firstDefined(group.shipmentStatus, group.shipment_status, group.fulfillmentStatus, group.fulfillment_status))
      .filter(Boolean);
    return groupStatuses.length ? [...new Set(groupStatuses.map(displayStatus))].join(", ") : "Not created";
  }, [relations.sellerFulfillmentGroups, shipments]);
  const orderTaxRates = useMemo(() => getOrderTaxRates(taxBreakup, items), [taxBreakup, items]);
  const timeline = Array.isArray(order.timeline) ? order.timeline : [];
  const notes = Array.isArray(order.notes) ? order.notes : [];

  // Build role-aware status options filtered to valid next transitions from current status
  const statusOptions = useMemo(() => {
    if (isSeller) return [];
    const currentStatus = normalizeStatusKey(firstDefined(order.status, order.order_status));
    const backendTransitions = orderTransitionOptionsOf(order)
      .map(transitionStatusOf)
      .map(normalizeStatusKey)
      .filter(Boolean);
    const validNext = backendTransitions.length
      ? backendTransitions
      : ALLOWED_TRANSITIONS[currentStatus] || [];
    const normalizedRole = normalizeStatusKey(role).replace(/_/g, "-");
    const isAdminOrderManager = isSuperAdmin || isAdmin || ADMIN_ORDER_ROLES.has(normalizedRole);
    const filteredNext = validNext
      .filter((s) => {
        if (isAdminOrderManager) return true;
        return true;
      });
    const fallbackNext = ORDER_STATUS_VALUES.filter((status) => status !== currentStatus);
    const transitionOptions = (filteredNext.length ? filteredNext : fallbackNext).map(toOption);

    return [...new Map(transitionOptions.map((option) => [option.value, option])).values()];
  }, [order, order.status, order.order_status, isSeller, isAdmin, isSuperAdmin, role]);

  const openStatusModal = useCallback(() => {
    setFormData((prev) => ({ ...prev, status: "", cancelItems: {} }));
    setState((prev) => ({ ...prev, statusModal: true }));
  }, []);

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
    <div className="min-h-screen bg-[#f4f6fb]">
      <Loader loading={state.isLoading} />

      <div>
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

                onClick={() => setState((prev) => ({ ...prev, noteModal: true }))}
              >
                <FaRegNoteSticky /> Note
              </button>
            </PermissionGuard>
            {orderId && (
              <button
                type="button"
                onClick={() => navigate(`/app/shipment-tracking?orderId=${encodeURIComponent(orderId)}`)}
              >
                <FaFile /> Shipments
              </button>
            )}
            {!isSeller && statusOptions.length > 0 && (
              <PermissionGuard module="orders" action="status_change" hide>
                <button
                  type="button"
                  onClick={openStatusModal}
                >
                  <FaFile /> Administrative Override
                </button>
              </PermissionGuard>
            )}
            </>
          )}
        />

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {isSeller ? (
            <>
              <MetricCard label="Product Total" value={formatMoney(subtotalAmount)} tone="dark" />
              <MetricCard
                label="Payment Collection"
                value={String(firstDefined(order.payment_provider, order.paymentProvider, "")).toLowerCase() === "cod" ? "COD" : "Prepaid"}
                tone="blue"
              />
            </>
          ) : (
            <>
              <MetricCard label="Customer Payable" value={formatMoney(customerPayableAmount)} tone="dark" />
              <MetricCard label="Customer Total" value={formatMoney(customerTotalAmount)} tone="blue" />
            </>
          )}
          <MetricCard label="Payment Status" value={<StatusBadge status={firstDefined(order.payment_status, order.paymentStatus)} dot />} />
          <MetricCard label="Delivery Status" value={<StatusBadge status={firstDefined(order.delivery_status, order.deliveryStatus)} dot />} />
          <MetricCard label="Shipment Status" value={shipmentSummary} tone="blue" />
          <MetricCard label="Items" value={`${items.length} item${items.length === 1 ? "" : "s"}`} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Items By Seller" className="lg:col-span-2">
            {sellerGroups.length ? sellerGroups.map((group) => (
              (() => {
                const fulfillmentGroup = (relations.sellerFulfillmentGroups || []).find((entry) => sameSellerGroup(entry, group)) || {};
                const groupShipments = shipments.filter((shipment) => sameSellerGroup(shipment, group) && String(shipment.direction || "forward") !== "reverse");
                const groupSettlement = sellerSettlements.find((settlement) => sameSellerGroup(settlement, group)) || {};
                const packageStatus = firstDefined(
                  fulfillmentGroup.deliveryStatus,
                  fulfillmentGroup.shipmentStatus,
                  groupShipments[0]?.status,
                  "not_created",
                );
                const returnLifecycle = fulfillmentGroup.returnLifecycle || {};
                return (
              <div key={`${group.sellerId}-${group.organizationId}`} className="mb-4 overflow-hidden rounded-lg border border-[#eadfbd] bg-white last:mb-0">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fff9ea] px-4 py-3">
                  <div>
                    {canOpenAdminProfiles && group.sellerId ? (
                      <DetailLink onClick={() => navigate(`/app/seller/view/${group.sellerId}`)} className="text-sm font-semibold">
                        {group.organizationName || group.sellerName}
                      </DetailLink>
                    ) : (
                      <span className="text-sm font-semibold text-[#202337]">{group.organizationName || group.sellerName}</span>
                    )}
                    <div className="text-xs text-[#65718b]">
                      Seller:{" "}
                      {canOpenAdminProfiles && group.sellerId ? (
                        <DetailLink onClick={() => navigate(`/app/seller/view/${group.sellerId}`)} className="text-xs">
                          {group.sellerName}
                        </DetailLink>
                      ) : (
                        <span>{group.sellerName}</span>
                      )}{" "}
                      · Organization: {group.organizationName || group.organizationId || "N/A"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[#202337] ring-1 ring-[#eadfbd]">
                        Package: {displayStatus(packageStatus)}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[#202337] ring-1 ring-[#eadfbd]">
                        Returns: {displayStatus(firstDefined(returnLifecycle.status, "none"))}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[#202337] ring-1 ring-[#eadfbd]">
                        Payout: {displayStatus(firstDefined(groupSettlement.payoutStatus, groupSettlement.commissionStatus, "pending"))}
                      </span>
                      {groupSettlement.eligibleAt && (
                        <span className="rounded-full bg-white px-2.5 py-1 text-[#202337] ring-1 ring-[#eadfbd]">
                          Eligible: {formatDate(groupSettlement.eligibleAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-[#2f6fed] bg-white px-3 py-1.5 text-xs font-medium text-[#2f6fed] hover:bg-[#f3f6ff]"
                      onClick={() => navigate(`/app/shipment-tracking?orderId=${encodeURIComponent(orderId)}&sellerId=${encodeURIComponent(group.sellerId || "")}`)}
                    >
                      Manage Shipment
                    </button>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#202337] ring-1 ring-[#eadfbd]">
                      {group.items.length} item{group.items.length === 1 ? "" : "s"}
                    </span>
                  </div>
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
                  const productId = firstDefined(item.product_id, item.productId, productSnapshot.id, productSnapshot._id);
                  return (
                    <div key={getItemKey(item)} className="grid grid-cols-1 gap-3 border-b border-[#eef0f6] px-4 py-4 text-sm last:border-b-0 md:grid-cols-12 md:items-start">
                      <div className="md:col-span-5">
                        {productId ? (
                          <DetailLink
                            onClick={() => navigate(`/app/product-catalog/view/${productId}`)}
                            className="font-semibold"
                          >
                            {productTitle}
                          </DetailLink>
                        ) : (
                          <div className="font-semibold text-[#202337]">{productTitle}</div>
                        )}
                        <div className="text-xs text-[#65718b]">
                          SKU: {firstDefined(item.variant_sku, item.product_sku, productSnapshot.sku, "N/A")} · HSN: {firstDefined(item.hsn_code, productSnapshot.hsnCode, "N/A")}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <StatusBadge
                          status={firstDefined(
                            item.cancellation_status,
                            item.delivery_status,
                            item.deliveryStatus,
                            packageStatus,
                            order.status,
                          )}
                          size="sm"
                          dot
                        />
                      </div>
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
                );
              })()
            )) : <EmptyState>No items found</EmptyState>}
          </Panel>

          <aside className="space-y-4">
            <Panel title={isSeller ? "Seller Order Summary" : "Order Summary"}>
              <InfoRow label="Order Date" value={order.created_at ? moment(order.created_at).format("DD MMM YYYY HH:mm") : "N/A"} />
              <InfoRow label="Status" value={<StatusBadge status={order.status} dot />} />
              <InfoRow label="Return Eligible Until" value={firstDefined(order.return_eligible_until, order.returnEligibleUntil) ? moment(firstDefined(order.return_eligible_until, order.returnEligibleUntil)).format("DD MMM YYYY HH:mm") : "Starts after delivery verification"} />
              <InfoRow
                label={isSeller ? "Payment Collection" : "Payment Method"}
                value={isSeller
                  ? (String(firstDefined(order.payment_provider, order.paymentProvider, "")).toLowerCase() === "cod" ? "COD" : "Prepaid")
                  : displayStatus(firstDefined(order.payment_provider, order.paymentProvider))}
              />
              <InfoRow label="Product Total" value={formatMoney(subtotalAmount)} />
              {!isSeller && deliveryChargeAmount > 0 && <InfoRow label="Delivery Charge" value={formatMoney(deliveryChargeAmount)} />}
              {!isSeller && customerPlatformFeeAmount > 0 && <InfoRow label="Platform Fee" value={formatMoney(customerPlatformFeeAmount)} />}
              {!isSeller && customerPlatformFeeTaxAmount > 0 && <InfoRow label="Platform Fee GST" value={formatMoney(customerPlatformFeeTaxAmount)} />}
              {!isSeller && taxPayableAmount > 0 && <InfoRow label="Additional GST" value={formatMoney(taxPayableAmount)} />}
              {!isSeller && codChargeAmount > 0 && <InfoRow label="COD Charge" value={formatMoney(codChargeAmount)} />}
              {!isSeller && discountAmount > 0 && <InfoRow label={discountLabel} value={<span className="text-[#2ea84a]">-{formatMoney(discountAmount)}</span>} />}
              {!isSeller && walletDiscountAmount > 0 && <InfoRow label="Wallet Deduction" value={<span className="text-[#2ea84a]">-{formatMoney(walletDiscountAmount)}</span>} />}
              {!isSeller && (
                <div className="mt-2 border-t border-[#efe6cd] pt-2">
                  <InfoRow label="Customer Payable" value={formatMoney(customerPayableAmount)} strong />
                </div>
              )}
              {taxIncludedAmount > 0 && <InfoRow label="Includes GST" value={formatMoney(taxIncludedAmount)} />}
            </Panel>
          </aside>
        </div>

        <div className="mt-4 space-y-4">
          <Panel title="Tax Breakup">
            <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
              <InfoRow label="Product Value Before GST" value={formatMoney(taxBreakup.taxableAmount)} />
              <InfoRow label="GST Rate" value={orderTaxRates.length ? orderTaxRates.map(percent).join(", ") : "N/A"} />
              {money(taxBreakup.cgstAmount) > 0 && <InfoRow label={`CGST ${orderTaxRates.length === 1 ? percent(orderTaxRates[0] / 2) : ""}`} value={formatMoney(taxBreakup.cgstAmount)} />}
              {money(taxBreakup.sgstAmount) > 0 && <InfoRow label={`SGST ${orderTaxRates.length === 1 ? percent(orderTaxRates[0] / 2) : ""}`} value={formatMoney(taxBreakup.sgstAmount)} />}
              {money(taxBreakup.igstAmount) > 0 && <InfoRow label={`IGST ${orderTaxRates.map(percent).join(", ")}`} value={formatMoney(taxBreakup.igstAmount)} />}
              {money(taxBreakup.cessAmount) > 0 && <InfoRow label="Cess" value={formatMoney(taxBreakup.cessAmount)} />}
              <InfoRow label={taxPayableAmount > 0 ? "Total GST" : "GST Included in Product Total"} value={formatMoney(firstDefined(order.tax_amount, order.taxAmount, taxBreakup.totalTaxAmount, taxIncludedAmount))} />
              {taxBreakup.taxMode && <InfoRow label="Tax Pricing" value={taxPayableAmount > 0 ? "Added at checkout" : "Included in product price"} />}
            </div>
            {Array.isArray(taxBreakup.items) && taxBreakup.items.length > 0 && (
                <div className="mt-3 grid grid-cols-1 gap-3 border-t border-[#efe6cd] pt-3 md:grid-cols-2">
                {taxBreakup.items.map((taxItem, index) => {
                  const taxProductId = firstDefined(taxItem.productId, taxItem.product_id);
                  const orderItem = items.find(
                    (item) => String(firstDefined(item.product_id, item.productId, "")) === String(taxProductId || ""),
                  ) || items[index] || {};
                  const productSnapshot = normalizeJson(firstDefined(orderItem.product_snapshot, orderItem.productSnapshot), {});
                  const productId = firstDefined(taxProductId, orderItem.product_id, orderItem.productId, productSnapshot.id, productSnapshot._id);
                  const productTitle = firstDefined(orderItem.product_title, orderItem.productTitle, productSnapshot.title, productId, `Item ${index + 1}`);
                  return (
                    <div key={`${productId || "tax"}-${index}`} className="rounded-md bg-[#f8faff] p-3 text-xs text-[#65718b]">
                      {productId ? (
                        <DetailLink
                          onClick={() => navigate(`/app/product-catalog/view/${productId}`)}
                          className="text-xs font-semibold"
                        >
                          {productTitle}
                        </DetailLink>
                      ) : (
                        <div className="font-semibold text-[#202337]">{productTitle}</div>
                      )}
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
                <InfoRow
                  label="Customer"
                  value={buyerId && canOpenAdminProfiles ? (
                    <DetailLink onClick={() => navigate(`/app/users/view/${buyerId}`)}>
                      {firstDefined(buyer.displayName, buyer.fullName, buyer.name, order.buyerName, "Customer")}
                    </DetailLink>
                  ) : firstDefined(buyer.displayName, buyer.fullName, buyer.name, order.buyerName, "Customer")}
                />
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
              {relationActions.map((action) => (
                <button
                  key={action.path}
                  type="button"
                  className="rounded-md border border-[#2f6fed] bg-white px-3 py-1.5 text-xs font-medium text-[#2f6fed] hover:bg-[#f3f6ff]"
                  onClick={() => navigate(`${action.path}?orderId=${encodeURIComponent(orderId)}`)}
                >
                  {action.label}
                </button>
              ))}
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
                      subtitle={(
                        <DetailLink onClick={() => navigate(`/app/orders/view/${orderId}`)} className="text-xs">
                          Order #{orderNumber}
                        </DetailLink>
                      )}
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
                        const sellerId = firstDefined(
                          shipment.seller_id,
                          shipment.sellerId,
                          shipment.seller?.id,
                          shipment.seller?._id,
                        );
                        return sellerId && canOpenAdminProfiles ? (
                          <DetailLink onClick={() => navigate(`/app/seller/view/${sellerId}`)} className="text-xs">
                            {sellerName || "Seller"}
                          </DetailLink>
                        ) : (sellerName || "Seller");
                      })()}
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
              <h3 className="mb-2 text-xs font-semibold uppercase text-[#65718b]">Tax Documents</h3>
              <div className="grid grid-cols-1 gap-3">
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
                ) : <EmptyState>No Return Requests Found</EmptyState>}
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
                          {
                            label: "Order",
                            value: (
                              <DetailLink onClick={() => navigate(`/app/orders/view/${orderId}`)} className="text-xs">
                                #{orderNumber}
                              </DetailLink>
                            ),
                          },
                          { label: "Created", value: formatDate(firstDefined(walletTx.created_at, walletTx.createdAt)) },
                        ]}
                      />
                    ))}
                  </div>
                ) : <EmptyState>No Wallet Transactions Found</EmptyState>}
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
                      {seller.sellerId && canOpenAdminProfiles ? (
                        <DetailLink onClick={() => navigate(`/app/seller/view/${seller.sellerId}`)} className="font-semibold">
                          {seller.sellerName}
                        </DetailLink>
                      ) : (
                        <span className="font-semibold text-[#202337]">{seller.sellerName}</span>
                      )}
                      {seller.organizationName && <div className="text-xs text-[#65718b]">{seller.organizationName}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[#1f4fc9]">{formatMoney(seller.sellerPayout)}</div>
                      <div className="text-xs text-[#65718b]">seller payout</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Product Total</span><span>{formatMoney(seller.grossSales)}</span></div>
                    <div className="flex justify-between text-[#65718b]"><span>Seller payout base</span><span>{formatMoney(seller.sellerPayoutBase)}</span></div>
                    {seller.taxCollected > 0 && <div className="flex justify-between text-xs text-[#65718b]"><span>Product GST (included; seller tax liability)</span><span>{formatMoney(seller.taxCollected)}</span></div>}
                    {seller.discountAmount > 0 && <div className="flex justify-between text-[#65718b]"><span>Customer Discount</span><span>-{formatMoney(seller.discountAmount)}</span></div>}
                    {seller.marketplaceFundedDiscount > 0 && <div className="flex justify-between text-xs text-[#21812C]"><span>Marketplace-funded reimbursement</span><span>+{formatMoney(seller.marketplaceFundedDiscount)}</span></div>}
                    {seller.sellerFundedDiscount > 0 && <div className="flex justify-between text-xs text-[#A35B00]"><span>Seller-funded discount impact</span><span>-{formatMoney(seller.sellerFundedDiscount)}</span></div>}
                    <div className="flex justify-between">
                      <span>{seller.commissionReversal > 0 ? "Net Platform Commission" : "Platform Commission"}</span>
                      <span>
                        -{formatMoney(seller.commissionReversal > 0 ? seller.netCommissionFee : seller.commissionFee)}
                        {seller.commissionRates.length ? ` (${seller.commissionRates.map(percent).join(", ")})` : ""}
                      </span>
                    </div>
                    {seller.commissionReversal > 0 && <div className="ml-3 space-y-1 text-xs text-[#65718b]">
                      <div className="flex justify-between"><span>Original commission</span><span>{formatMoney(seller.commissionFee)}</span></div>
                      <div className="flex justify-between text-[#21812C]"><span>Reversed for refunded item</span><span>-{formatMoney(seller.commissionReversal)}</span></div>
                    </div>}
                    {seller.commissionBreakdown.length > 1 && (
                      <div className="ml-3 space-y-1 rounded-md bg-[#f8faff] px-2 py-1.5 text-xs text-[#65718b]">
                        {seller.commissionBreakdown.map((entry) => (
                          <div key={entry.rate} className="flex justify-between">
                            <span>Commission at {percent(entry.rate)}</span>
                            <span>-{formatMoney(entry.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {seller.platformFeeTax > 0 && <div className="flex justify-between"><span>{seller.commissionTaxReversal > 0 ? "Net GST on Commission" : "GST on Commission"}</span><span>-{formatMoney(seller.commissionTaxReversal > 0 ? seller.netCommissionTax : seller.platformFeeTax)}</span></div>}
                    {seller.commissionTaxReversal > 0 && <div className="ml-3 space-y-1 text-xs text-[#65718b]">
                      <div className="flex justify-between"><span>Original commission GST</span><span>{formatMoney(seller.platformFeeTax)}</span></div>
                      <div className="flex justify-between text-[#21812C]"><span>Reversed through credit note</span><span>-{formatMoney(seller.commissionTaxReversal)}</span></div>
                    </div>}
                    {seller.shippingReimbursement > 0 && <div className="flex justify-between"><span>Shipping collected from customer</span><span>+{formatMoney(seller.shippingReimbursement)}</span></div>}
                    {seller.shippingDeduction > 0 && <div className="flex justify-between"><span>Shipping Deduction</span><span>-{formatMoney(seller.shippingDeduction)}</span></div>}
                    {seller.shippingPolicy && (
                      <div className="ml-3 flex justify-between text-xs text-[#65718b]"><span>Shipping settlement</span><span>{seller.shippingPolicy === "reimburse_seller" ? "Included in seller payout" : formatLabel(displayStatus(seller.shippingPolicy))}</span></div>
                    )}
                    {seller.refundAmount > 0 && <>
                      <div className="flex justify-between"><span>Refunded item payout-base reversal</span><span>-{formatMoney(seller.sellerPayoutBaseReversal)}</span></div>
                      <div className="ml-3 text-xs text-[#65718b]">The returned item's commission and statutory deductions are reversed above, so this row uses its corresponding payout base. It is not the customer's full refund.</div>
                    </>}
                    {seller.adjustmentAmount !== 0 && <div className="flex justify-between"><span>Payout Adjustment / Recovery</span><span>{seller.adjustmentAmount > 0 ? "+" : "-"}{formatMoney(Math.abs(seller.adjustmentAmount))}</span></div>}
                    {seller.gstTcsAmount > 0 && <>
                      <div className="ml-3 flex justify-between text-xs text-[#65718b]"><span>{seller.gstTcsReversal > 0 ? "Net GST TCS taxable base" : "GST TCS taxable base"}</span><span>{formatMoney(seller.gstTcsReversal > 0 ? seller.netGstTcsTaxableBase : seller.gstTcsTaxableBase)}</span></div>
                      <div className="flex justify-between"><span>{seller.gstTcsReversal > 0 ? "Net GST TCS" : "GST TCS"} ({percent(seller.gstTcsRate)})</span><span>-{formatMoney(seller.gstTcsReversal > 0 ? seller.netGstTcsAmount : seller.gstTcsAmount)}</span></div>
                      {seller.gstTcsReversal > 0 && <div className="ml-3 space-y-1 text-xs text-[#65718b]">
                        <div className="flex justify-between"><span>Original TCS / taxable base</span><span>{formatMoney(seller.gstTcsAmount)} / {formatMoney(seller.gstTcsTaxableBase)}</span></div>
                        <div className="flex justify-between text-[#21812C]"><span>Returned TCS / taxable base reversed</span><span>-{formatMoney(seller.gstTcsReversal)} / -{formatMoney(seller.gstTcsTaxableBaseReversal)}</span></div>
                      </div>}
                    </>}
                    {seller.incomeTaxTdsAmount > 0 && <>
                      <div className="ml-3 flex justify-between text-xs text-[#65718b]"><span>Income-tax TDS gross base</span><span>{formatMoney(seller.incomeTaxTdsTaxableBase)}</span></div>
                      <div className="flex justify-between"><span>{seller.incomeTaxTdsReversal > 0 ? "Net Income-tax TDS" : "Income-tax TDS"} ({percent(seller.incomeTaxTdsRate)})</span><span>-{formatMoney(seller.incomeTaxTdsReversal > 0 ? seller.netIncomeTaxTdsAmount : seller.incomeTaxTdsAmount)}</span></div>
                    </>}
                    <div className="mt-2 flex justify-between border-t border-[#efe6cd] pt-2 font-semibold"><span>Final Seller Payout</span><span>{formatMoney(seller.sellerPayout)}</span></div>
                    {(seller.commissionStatus || seller.payoutStatus) && (
                      <div className="rounded-md bg-[#f8faff] px-2 py-1 text-xs text-[#65718b]">
                        {seller.commissionStatus && <span>Commission: {formatLabel(displayStatus(seller.commissionStatus))}</span>}
                        {seller.payoutStatus && <span className="ml-2">Payout: {formatLabel(displayStatus(seller.payoutStatus))}</span>}
                        {seller.payoutMethod && <span className="ml-2">Method: {formatLabel(displayStatus(seller.payoutMethod))}</span>}
                        {seller.payoutReference && <span className="ml-2">Bank ref: {seller.payoutReference}</span>}
                        {seller.payoutProcessedAt && <span className="ml-2">Paid: {formatDate(seller.payoutProcessedAt)}</span>}
                        {seller.commissionIds.length > 0 && <span className="ml-2">Item commission records: {seller.commissionIds.length}</span>}
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
                <div className="font-semibold capitalize text-[#202337]">{formatLabel(displayStatus(entry.to_status || entry.toStatus))}</div>
                <div className="text-[#65718b]">{formatLabel(entry.created_at ? moment(entry.created_at).format("DD MMM YYYY HH:mm") : "N/A")} · {formatLabel(entry.actor_role || "system")}</div>
                {entry.reason && <div className="text-[#65718b] mt-1">{formatLabel(entry.reason)}</div>}
              </div>
            )) : <EmptyState>No timeline yet</EmptyState>}
          </Panel>

          <Panel title="Notes" className="mt-4">
            {notes.length ? notes.map((note) => (
              <div key={note.id} className="mb-3 rounded-lg border border-[#eadfbd] bg-white p-3 text-sm last:mb-0">
                <div className="text-[#202337] leading-6">{note.note}</div>
                <div className="text-xs text-[#65718b] mt-1">{formatLabel(note.actor_role || "system")} · {formatLabel(note.visibility)} · {formatLabel(note.created_at ? moment(note.created_at).format("DD MMM YYYY HH:mm") : "N/A")}</div>
              </div>
            )) : <EmptyState>{formatLabel("No notes yet")}</EmptyState>}
          </Panel>
        </div>
      </div>

      <DefaultModal isOpen={state.statusModal} onClose={() => setState((prev) => ({ ...prev, statusModal: false }))} title="Administrative Status Override" onSubmit={handleStatusSubmit} loading={state.isLoading}>
        <div className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Use this only for exceptional order corrections. Delivery changes must be made through Shipment Management.
          </div>
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
          {["ready_to_ship", "shipped", "out_for_delivery"].includes(formData.status) && (
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
