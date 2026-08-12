/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaFile, FaRegNoteSticky } from "react-icons/fa6";
import {
  MdCheckCircle,
  MdCurrencyRupee,
  MdInventory2,
  MdLocalShipping,
  MdPayments,
  MdShoppingCart,
} from "react-icons/md";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
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
import SummaryCard from "../../../../components/Shared/SummaryCard";
import {OrderLink} from "../../../../components/Shared/EntityLink";

import { ENDPOINTS } from "../../../../_helpers/endpoints";
import { downloadApiFile } from "../../../../_helpers/downloadApi";
import { usePermission } from "../../../../_helpers/usePermission";
import {
  formatDateTime12Hour,
  formatLabel,
} from "../../../../utils/formatters";

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

const formatDate = (value) => formatDateTime12Hour(value, "N/A");

const sumMoney = (rows = [], key) =>
  rows.reduce((total, row) => total + money(row?.[key]), 0);

const extractList = (payload) => {
  const root = payload?.data?.data || payload?.data || {};
  if (Array.isArray(root)) return root;
  return root.list || root.items || root.rows || [];
};

const getItemKey = (item = {}) => firstDefined(item.id, item._id, `${item.product_id}-${item.variant_sku}`);

const getReturnItemTitle = (item = {}) => {
  const snapshot = normalizeJson(firstDefined(item.productSnapshot, item.product_snapshot), {});
  return firstDefined(
    item.productTitle,
    item.product_title,
    item.productName,
    item.product_name,
    item.title,
    snapshot.title,
    item.productId,
    item.product_id,
    "Returned item",
  );
};

const getReturnItemQuantity = (item = {}) =>
  Number(firstDefined(item.approvedQuantity, item.approved_quantity, item.requestedQuantity, item.requested_quantity, item.quantity, 1));

const getReturnItemOrderItemId = (item = {}) =>
  String(firstDefined(item.orderItemId, item.order_item_id, item.order_item, item.itemId, item.item_id, "") || "");

const getReturnItemProductId = (item = {}) =>
  String(firstDefined(item.productId, item.product_id, item.product?.id, item.product?._id, "") || "");

const getReturnItemVariantText = (item = {}) => {
  const snapshot = normalizeJson(firstDefined(item.productSnapshot, item.product_snapshot), {});
  const variant = normalizeJson(firstDefined(item.variantSnapshot, item.variant_snapshot, snapshot.variant), {});
  return firstDefined(
    item.variantSku,
    item.variant_sku,
    variant.sku,
    variant.name,
    item.sku,
    "",
  );
};

const getOrderItemQuantity = (item = {}) =>
  Number(firstDefined(item.quantity, item.qty, item.orderedQuantity, item.ordered_quantity, 1)) || 1;

const getReturnStatus = (returnRequest = {}) =>
  String(firstDefined(returnRequest.status, returnRequest.refundStatus, returnRequest.refund_status, "") || "").toLowerCase();

const shouldCountReturnForPayout = (returnRequest = {}) => {
  const status = getReturnStatus(returnRequest);
  if (!status) return true;
  return !["cancelled", "canceled", "rejected", "declined"].includes(status);
};

const buildReturnImpactByItem = (returnRequests = []) => {
  const impact = {};
  (Array.isArray(returnRequests) ? returnRequests : []).forEach((returnRequest) => {
    if (!shouldCountReturnForPayout(returnRequest)) return;
    (Array.isArray(returnRequest.items) ? returnRequest.items : []).forEach((item) => {
      const itemId = getReturnItemOrderItemId(item);
      const productId = getReturnItemProductId(item);
      const keys = [itemId, productId].filter(Boolean);
      if (!keys.length) return;
      const quantity = getReturnItemQuantity(item);
      const refundAmount = money(firstDefined(item.refundAmount, item.refund_amount, item.eligibleRefundAmount, item.eligible_refund_amount, 0));
      keys.forEach((key) => {
        impact[key] = {
          quantity: money((impact[key]?.quantity || 0) + quantity),
          refundAmount: money((impact[key]?.refundAmount || 0) + refundAmount),
        };
      });
    });
  });
  return impact;
};

const getCancellationItemQuantity = (item = {}) =>
  Number(firstDefined(item.cancelledQuantity, item.cancelled_quantity, item.quantity, item.qty, item.requestedQuantity, item.requested_quantity, 0)) || 0;

const buildCancellationImpactByItem = (cancellations = []) => {
  const impact = {};
  (Array.isArray(cancellations) ? cancellations : []).forEach((cancellation) => {
    const status = String(firstDefined(cancellation.status, cancellation.cancellation_status, "") || "").toLowerCase();
    if (["rejected", "declined"].includes(status)) return;
    const items = firstDefined(cancellation.items, cancellation.cancelledItems, cancellation.cancellation_items, []);
    (Array.isArray(items) ? items : []).forEach((item) => {
      const itemId = getReturnItemOrderItemId(item);
      const productId = getReturnItemProductId(item);
      const keys = [itemId, productId].filter(Boolean);
      if (!keys.length) return;
      const quantity = getCancellationItemQuantity(item);
      const refundAmount = money(firstDefined(item.refundAmount, item.refund_amount, item.amount, item.totalAmount, item.total_amount, 0));
      keys.forEach((key) => {
        impact[key] = {
          quantity: money((impact[key]?.quantity || 0) + quantity),
          refundAmount: money((impact[key]?.refundAmount || 0) + refundAmount),
        };
      });
    });
  });
  return impact;
};

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
  platformFeeTaxRate: money(firstDefined(seller.platformFeeTaxRate, seller.platform_fee_tax_rate, seller.commissionTaxRate, seller.commission_tax_rate, 18)),
  commissionTaxReversal: money(firstDefined(seller.commissionTaxReversalAmount, seller.commission_tax_reversal_amount, 0)),
  netCommissionTax: money(firstDefined(seller.netCommissionTaxAmount, seller.net_commission_tax_amount, seller.platformFeeTaxAmount, seller.commissionTaxAmount, 0)),
  commissionTaxableBase: money(firstDefined(
    seller.netCommissionTaxableBaseAmount,
    seller.net_commission_taxable_base_amount,
    seller.commissionTaxableBaseAmount,
    seller.commission_taxable_base_amount,
    seller.commissionBaseAmount,
    seller.commission_base_amount,
    seller.platformFeeBaseAmount,
    seller.platform_fee_base_amount,
    seller.netGstTcsTaxableBaseAmount,
    seller.net_gst_tcs_taxable_base_amount,
    seller.gstTcsTaxableBaseAmount,
    seller.gst_tcs_taxable_base_amount,
    seller.taxableAmount,
    seller.taxableSales,
    0,
  )),
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
  incomeTaxTdsTaxableBaseReversal: money(firstDefined(seller.incomeTaxTdsTaxableBaseReversalAmount, seller.income_tax_tds_taxable_base_reversal_amount, 0)),
  netIncomeTaxTdsTaxableBase: money(firstDefined(seller.netIncomeTaxTdsTaxableBaseAmount, seller.net_income_tax_tds_taxable_base_amount, seller.grossSalesAmount, seller.grossSales, 0)),
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

const PayoutRow = ({ label, value, note, tone = "default", small = false, className = "" }) => {
  const toneClass = {
    default: "text-[#202337]",
    muted: "text-[#65718b]",
    credit: "text-[#21812C]",
    debit: "text-[#202337]",
    warning: "text-[#A35B00]",
  }[tone] || "text-[#202337]";

  return (
    <div className={`flex items-start justify-between gap-3 ${small ? "text-xs" : "text-sm"} ${toneClass} ${className}`}>
      <span className="min-w-0 pr-2">
        {label}
        {note && <span className="block text-xs font-normal text-[#65718b]">{note}</span>}
      </span>
      <span className="shrink-0 text-right font-medium">{value}</span>
    </div>
  );
};

const PayoutSection = ({ title, subtitle, tone = "default", children }) => {
  const toneClass = {
    earn: "bg-[#f6fff8] border-[#d9f1df] text-[#21812C]",
    deduct: "bg-[#fffaf8] border-[#f0ded3] text-[#A35B00]",
    refund: "bg-[#fff8ea] border-[#eadfbd] text-[#8A5A00]",
    tax: "bg-[#f8faff] border-[#dde6ff] text-[#1f4fc9]",
    default: "bg-[#fffdf8] border-[#eadfbd] text-[#202337]",
  }[tone] || "bg-[#fffdf8] border-[#eadfbd] text-[#202337]";

  return (
    <div className={`rounded-lg border px-3 py-3 ${toneClass}`}>
      <div className="mb-2">
        <div className="text-xs font-bold uppercase tracking-wide">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs font-normal text-[#65718b]">{subtitle}</div>}
      </div>
      <div className="space-y-2 text-[#202337]">{children}</div>
    </div>
  );
};

const PayoutFormula = ({ children }) => (
  <div className="rounded-lg border border-[#eadfbd] bg-[#fffdf8] px-3 py-2 text-xs leading-5 text-[#65718b]">
    {children}
  </div>
);

const commissionBaseNote = (seller = {}, commissionAmount = 0) => {
  const explicitBase = money(firstDefined(seller.commissionTaxableBase, 0));
  const rate = seller.commissionRates.length === 1 ? money(seller.commissionRates[0]) : 0;
  const derivedBase = rate > 0 && commissionAmount > 0
    ? money((commissionAmount)) 
    : 0;
  const base = derivedBase || explicitBase;
  const baseText = base > 0 ? `Base: ${formatMoney(base)}` : "";
  const rateText = seller.commissionRates.length ? `Rate: ${seller.commissionRates.map(percent).join(", ")}` : "";
  return [baseText, rateText].filter(Boolean).join(" · ");
};

const commissionGstBaseNote = (seller = {}, commissionAmount = 0, commissionTaxAmount = 0) => {
  const base = money(commissionAmount);
  const configuredRate = money(firstDefined(seller.platformFeeTaxRate, 0));
  const derivedRate = configuredRate > 0
    ? configuredRate
    : base > 0 && commissionTaxAmount > 0
    ? money((commissionTaxAmount * 100) / base)
    : 0;
  const rateText = derivedRate > 0 ? `Rate: ${percent(derivedRate)}` : "";
  return [`GST base: ${formatMoney(base)}`, rateText].filter(Boolean).join(" · ");
};

const getOrderItemId = (item = {}) => String(firstDefined(item.id, item._id, item.order_item_id, item.orderItemId, "") || "");

const getItemProductId = (item = {}) => String(firstDefined(item.product_id, item.productId, item.product?.id, item.product?._id, "") || "");

const getOrderItemTitle = (item = {}) => {
  const snapshot = normalizeJson(firstDefined(item.product_snapshot, item.productSnapshot), {});
  return firstDefined(item.product_title, item.productTitle, snapshot.title, item.name, item.product_id, item.productId, "Product");
};

const getCommissionForItem = (item = {}, records = []) => {
  const itemId = getOrderItemId(item);
  const productId = getItemProductId(item);
  return (Array.isArray(records) ? records : []).find((record) => {
    const metadata = normalizeJson(record.metadata, {});
    const products = Array.isArray(metadata.products) ? metadata.products : [];
    const ids = [
      record.order_item_id,
      record.orderItemId,
      ...(Array.isArray(record.order_item_ids) ? record.order_item_ids : []),
      ...(Array.isArray(record.orderItemIds) ? record.orderItemIds : []),
      ...products.flatMap((product) => [product.orderItemId, product.order_item_id, product.productId, product.product_id]),
    ].filter(Boolean).map(String);
    return (itemId && ids.includes(itemId)) || (productId && ids.includes(productId));
  }) || null;
};

const buildSimpleItemPayoutRows = (seller = {}, sellerItems = [], commissionRecords = [], returnRequests = [], cancellations = []) => {
  const returnImpactByItem = buildReturnImpactByItem(returnRequests);
  const cancellationImpactByItem = buildCancellationImpactByItem(cancellations);
  const productTotal = sellerItems.reduce((total, item) => total + money(firstDefined(item.line_total, item.lineTotal, 0)), 0);
  const taxableTotal = sellerItems.reduce((total, item) => {
    const tax = normalizeJson(firstDefined(item.tax_breakup, item.taxBreakup), {});
    return total + money(firstDefined(tax.taxableAmount, tax.taxable_amount, item.taxable_amount, item.taxableAmount, 0));
  }, 0);

  return sellerItems.map((item) => {
    const orderItemId = getOrderItemId(item);
    const productId = getItemProductId(item);
    const itemQuantity = getOrderItemQuantity(item);
    const returnImpact = returnImpactByItem[orderItemId] || returnImpactByItem[productId] || {};
    const cancellationImpact = cancellationImpactByItem[orderItemId] || cancellationImpactByItem[productId] || {};
    const returnedQuantity = Math.min(itemQuantity, money(returnImpact.quantity || 0));
    const directCancelledQuantity = money(firstDefined(item.cancelled_quantity, item.cancelledQuantity, 0));
    const cancelledQuantity = Math.min(Math.max(0, itemQuantity - returnedQuantity), Math.max(directCancelledQuantity, money(cancellationImpact.quantity || 0)));
    const reversedQuantity = Math.min(itemQuantity, money(returnedQuantity + cancelledQuantity));
    const remainingQuantity = Math.max(0, money(itemQuantity - reversedQuantity));
    const returnRatio = itemQuantity > 0 ? Math.min(1, reversedQuantity / itemQuantity) : 0;
    const tax = normalizeJson(firstDefined(item.tax_breakup, item.taxBreakup), {});
    const pricing = normalizeJson(firstDefined(item.pricing_snapshot, item.pricingSnapshot), {});
    const record = getCommissionForItem(item, commissionRecords);
    const metadata = normalizeJson(record?.metadata, {});
    const product = Array.isArray(metadata.products) ? metadata.products[0] || {} : {};
    const lineTotal = money(firstDefined(item.line_total, item.lineTotal, product.amount, record?.amount, 0));
    const taxableBase = money(firstDefined(tax.taxableAmount, tax.taxable_amount, product.taxableAmount, item.taxable_amount, item.taxableAmount, lineTotal));
    const gstTcsTaxableBase = money(firstDefined(metadata.taxableSupplyAmount, metadata.gstTcsTaxableAmount, metadata.gst_tcs_taxable_amount, pricing.gstTcsTaxableAmount, pricing.gst_tcs_taxable_amount, taxableBase));
    const incomeTaxTdsTaxableBase = money(firstDefined(metadata.incomeTaxTdsTaxableAmount, metadata.income_tax_tds_taxable_amount, pricing.incomeTaxTdsTaxableAmount, pricing.income_tax_tds_taxable_amount, taxableBase));
    const productShare = productTotal > 0 ? lineTotal / productTotal : 0;
    const taxableShare = taxableTotal > 0 ? taxableBase / taxableTotal : productShare;
    const payoutMode = String(firstDefined(pricing.sellerPayoutBase, pricing.seller_payout_base, metadata.sellerPayoutBase, "")).toLowerCase();
    const discountIncluded = payoutMode === "gross_customer_price" || payoutMode === "gross_seller_invoice";
    const productAmount = money(firstDefined(pricing.sellerPayoutBaseAmount, pricing.seller_payout_base_amount, product.grossSellerInvoiceAmount, product.amount, record?.amount, lineTotal));
    const shipping = money(firstDefined(pricing.shippingReimbursementAmount, pricing.shipping_reimbursement_amount, metadata.shippingReimbursementAmount, metadata.sellerDeliveryChargeAmount, seller.shippingReimbursement * productShare));
    const shippingDeduction = money(firstDefined(pricing.shippingDeductionAmount, pricing.shipping_deduction_amount, metadata.shippingDeductionAmount, seller.shippingDeduction * productShare));
    const discount = discountIncluded ? 0 : money(firstDefined(pricing.marketplaceFundedDiscountAmount, pricing.marketplace_funded_discount_amount, product.marketplaceFundedDiscountAmount, seller.marketplaceFundedDiscount * productShare));
    const commission = money(firstDefined(record?.commission_amount, record?.commissionAmount, metadata.platformFeeAmount, metadata.commissionFeeAmount, product.platformFeeAmount, pricing.platformFeeAmount, seller.commissionFee * taxableShare));
    const commissionGst = money(firstDefined(record?.tax_amount, record?.taxAmount, metadata.platformFeeTaxAmount, product.platformFeeTaxAmount, pricing.platformFeeTaxAmount, seller.platformFeeTax * taxableShare));
    const commissionRate = money(firstDefined(metadata.platformFeeRate, metadata.commissionRate, pricing.platformFeeRate, pricing.commissionRate, seller.commissionRates?.[0], 0));
    const commissionBase = money(firstDefined(
      metadata.sellerCommissionBaseAmount,
      metadata.commissionBaseAmount,
      metadata.platformFeeBaseAmount,
      product.sellerCommissionBaseAmount,
      product.commissionBaseAmount,
      pricing.sellerCommissionBaseAmount,
      pricing.seller_commission_base_amount,
      pricing.commissionBaseAmount,
      pricing.commission_base_amount,
      commissionRate > 0 ? (commission * 100) / commissionRate : taxableBase,
    ));
    const netCommission = money(commission * (1 - returnRatio));
    const netCommissionGst = money(commissionGst * (1 - returnRatio));
    const netCommissionBase = money(commissionBase * (1 - returnRatio));
    const commissionGstRate = money(firstDefined(metadata.platformFeeTaxRate, metadata.commissionTaxRate, pricing.platformFeeTaxRate, pricing.commissionTaxRate, seller.platformFeeTaxRate, 18));
    const gstTcs = money(firstDefined(metadata.gstTcsAmount, pricing.gstTcsAmount, pricing.gst_tcs_amount, seller.gstTcsAmount * taxableShare));
    const incomeTaxTds = money(firstDefined(metadata.incomeTaxTdsAmount, pricing.incomeTaxTdsAmount, pricing.income_tax_tds_amount, seller.incomeTaxTdsAmount * taxableShare));
    const netGstTcs = money(gstTcs * (1 - returnRatio));
    const netIncomeTaxTds = money(incomeTaxTds * (1 - returnRatio));
    const netGstTcsTaxableBase = money(gstTcsTaxableBase * (1 - returnRatio));
    const netIncomeTaxTdsTaxableBase = money(incomeTaxTdsTaxableBase * (1 - returnRatio));
    const computedOriginalPayout = money(productAmount + shipping + discount - shippingDeduction - commission - commissionGst - gstTcs - incomeTaxTds);
    const backendRefundRecovery = money(firstDefined(record?.refund_amount, record?.refundAmount, metadata.refundAmount, 0));
    const refundRecovery = backendRefundRecovery || (returnRatio > 0 ? money(computedOriginalPayout * returnRatio) : 0);
    const backendNetPayout = money(firstDefined(record?.net_amount, record?.netAmount, 0));
    const finalPayout = record
      ? (refundRecovery > 0 && backendRefundRecovery <= 0 ? Math.max(0, money(backendNetPayout - refundRecovery)) : backendNetPayout)
      : Math.max(0, money(productAmount + shipping + discount - shippingDeduction - commission - commissionGst - gstTcs - incomeTaxTds - refundRecovery));
    const beforeReturn = money(finalPayout + refundRecovery);
    const originalShippingNet = money(shipping - shippingDeduction);
    const nonShippingOriginalPayout = money(computedOriginalPayout - originalShippingNet);
    const estimatedFinalWithoutShipping = money(nonShippingOriginalPayout * (1 - returnRatio));
    const finalShippingNet = money(Math.max(
      Math.min(finalPayout - estimatedFinalWithoutShipping, Math.max(originalShippingNet, 0)),
      Math.min(originalShippingNet, 0),
    ));
    const shippingNetReversal = money(originalShippingNet - finalShippingNet);
    const netShipping = originalShippingNet >= 0
      ? finalShippingNet
      : 0;
    const netShippingDeduction = originalShippingNet < 0
      ? Math.abs(finalShippingNet)
      : money(shippingDeduction * (1 - returnRatio));
    const shippingReversal = shipping > 0
      ? Math.max(0, money(shipping - netShipping))
      : 0;
    const shippingDeductionReversal = shippingDeduction > 0
      ? Math.max(0, money(shippingDeduction - netShippingDeduction))
      : 0;
    const isCancelled = cancelledQuantity > 0;
    const isReturned = returnedQuantity > 0;

    return {
      id: getItemKey(item),
      title: getOrderItemTitle(item),
      status: remainingQuantity <= 0 && isCancelled
        ? "Cancelled"
        : remainingQuantity <= 0 && isReturned
          ? "Returned/refunded"
          : isCancelled
            ? "Partially cancelled"
            : isReturned
              ? "Partially returned"
              : displayStatus(firstDefined(record?.status, item.payout_status, item.payoutStatus, item.delivery_status, item.deliveryStatus, "pending")),
      orderedQuantity: itemQuantity,
      returnedQuantity,
      cancelledQuantity,
      reversedQuantity,
      remainingQuantity,
      returnRatio,
      customerRefundAmount: money((returnImpact.refundAmount || 0) + (cancellationImpact.refundAmount || 0)),
      productAmount,
      shipping,
      shippingDeduction,
      netShipping,
      netShippingDeduction,
      shippingReversal,
      shippingDeductionReversal,
      shippingNetReversal,
      discount,
      discountIncluded,
      commission,
      commissionGst,
      commissionRate,
      commissionBase,
      netCommission,
      netCommissionGst,
      netCommissionBase,
      commissionGstRate,
      gstTcs,
      incomeTaxTds,
      gstTcsTaxableBase,
      incomeTaxTdsTaxableBase,
      netGstTcs,
      netIncomeTaxTds,
      netGstTcsTaxableBase,
      netIncomeTaxTdsTaxableBase,
      refundRecovery,
      beforeReturn,
      finalPayout,
    };
  });
};

const SimpleItemPayoutBreakup = ({ rows = [], finalTotal = 0 }) => (
  <div className="overflow-hidden rounded-xl border border-[#eadfbd] bg-white">
    <div className="bg-[#fff9ea] px-4 py-3">
      <div className="text-sm font-bold text-[#202337]">Seller payout by product</div>
      <div className="mt-1 text-xs text-[#65718b]">Simple view: original payout, reversed amount, and final payable.</div>
    </div>
    <div className="divide-y divide-[#f1e7cd]">
      {rows.map((row, index) => {
        const finalTaxWithheld = money(row.netGstTcs + row.netIncomeTaxTds);
        const returned = row.refundRecovery > 0;
        return (
          <div key={row.id || index} className="px-4 py-3">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-bold text-[#202337]">{row.title}</div>
                <div className="mt-1 text-xs text-[#65718b]">
                  {row.status}
                  {row.orderedQuantity > 1 && (
                    <span>
                      {" "}· Ordered {row.orderedQuantity}
                      {row.returnedQuantity > 0 ? ` · Returned ${row.returnedQuantity} · Payable ${row.remainingQuantity}` : ""}
                      {row.cancelledQuantity > 0 ? ` · Cancelled ${row.cancelledQuantity} · Payable ${row.remainingQuantity}` : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#65718b]">Item payout</div>
                <div className="text-base font-bold text-[#21812C]">{formatMoney(row.finalPayout)}</div>
              </div>
            </div>
            <div className="space-y-2 rounded-lg bg-[#fffdf8] px-3 py-2">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-white p-2">
                  <div className="text-[11px] font-bold uppercase text-[#65718b]">Original payout</div>
                  <div className="mt-1 text-sm font-bold text-[#202337]">{formatMoney(row.beforeReturn)}</div>
                  <div className="mt-1 text-[11px] leading-4 text-[#65718b]">Before return or cancellation adjustment.</div>
                </div>
                <div className="rounded-lg bg-[#fff7ed] p-2">
                  <div className="text-[11px] font-bold uppercase text-[#9a5b00]">Reversed</div>
                  <div className="mt-1 text-sm font-bold text-[#9a3412]">
                    {returned ? `-${formatMoney(row.refundRecovery)}` : "—"}
                  </div>
                  <div className="mt-1 text-[11px] leading-4 text-[#8a5a00]">
                    {returned
                      ? `${row.returnedQuantity > 0 ? `Returned ${row.returnedQuantity}` : ""}${row.returnedQuantity > 0 && row.cancelledQuantity > 0 ? " · " : ""}${row.cancelledQuantity > 0 ? `Cancelled ${row.cancelledQuantity}` : ""} of ${row.orderedQuantity}. Charges/tax are recalculated.`
                      : "No reversal for this item."}
                  </div>
                </div>
                <div className="rounded-lg bg-[#eefbf2] p-2">
                  <div className="text-[11px] font-bold uppercase text-[#21812C]">Final payable</div>
                  <div className="mt-1 text-sm font-bold text-[#21812C]">{formatMoney(row.finalPayout)}</div>
                  <div className="mt-1 text-[11px] leading-4 text-[#2f6f3f]">
                    Commission/GST {formatMoney(row.netCommission + row.netCommissionGst)}
                    {row.netShipping > 0 ? ` · shipping kept ${formatMoney(row.netShipping)}` : ""}
                    {row.netShippingDeduction > 0 ? ` · shipping deducted ${formatMoney(row.netShippingDeduction)}` : ""}
                    {` · TCS/TDS ${formatMoney(finalTaxWithheld)}`}
                  </div>
                </div>
              </div>
              {(row.shipping > 0 || row.shippingDeduction > 0) && (
                <div className="rounded-lg border border-[#d9f1df] bg-[#f7fff9] px-3 py-2 text-xs">
                  <div className="mb-1 font-bold text-[#21812C]">Shipping settlement</div>
                  {row.shipping > 0 && (
                    <PayoutRow
                      label="Shipping collected for seller"
                      note={row.shippingReversal > 0 ? "Returned/cancelled quantity reduced the seller shipping payout." : "Shipping is still payable to seller as per policy."}
                      value={`${row.shippingReversal > 0 ? `${formatMoney(row.shipping)} − ${formatMoney(row.shippingReversal)} = ` : ""}${formatMoney(row.netShipping || row.shipping)}`}
                      tone="credit"
                      small
                    />
                  )}
                  {row.shippingDeduction > 0 && (
                    <PayoutRow
                      label="Shipping deducted from seller"
                      note={row.shippingDeductionReversal > 0 ? "Deduction is reduced for the returned/cancelled quantity." : "Deduction remains as configured for this seller/order."}
                      value={`-${formatMoney(row.netShippingDeduction || row.shippingDeduction)}`}
                      tone="warning"
                      small
                      className="mt-1"
                    />
                  )}
                </div>
              )}
              {row.customerRefundAmount > 0 && (
                <PayoutRow
                  label="Customer refund for returned quantity"
                  note="Shown for reference; seller payout reversal is calculated separately."
                  value={formatMoney(row.customerRefundAmount)}
                  tone="muted"
                  small
                />
              )}
              <PayoutRow label="Final payable for this product" value={formatMoney(row.finalPayout)} tone="credit" small className="border-t border-[#f1e7cd] pt-2 font-bold" />
            </div>
          </div>
        );
      })}
    </div>
    <div className="flex items-center justify-between bg-[#fff9ea] px-4 py-3 text-base font-bold text-[#202337]">
      <span>Total seller payout</span>
      <span>{formatMoney(finalTotal)}</span>
    </div>
  </div>
);

const ItemWisePayoutCalculation = ({ rows = [], totals = {} }) => (
  <div className="space-y-3 border-t border-[#dbe6f7] p-3">
    {rows.map((row, index) => (
      <div key={row.id || index} className="overflow-hidden rounded-lg border border-[#dbe6f7] bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 bg-[#f8faff] px-3 py-2">
          <div>
            <div className="font-bold text-[#202337]">{row.title}</div>
            <div className="mt-0.5 text-xs text-[#65718b]">
              Ordered {row.orderedQuantity}
              {row.returnedQuantity > 0 ? ` · Returned ${row.returnedQuantity} · Payable ${row.remainingQuantity}` : " · No return"}
              {row.cancelledQuantity > 0 ? ` · Cancelled ${row.cancelledQuantity} · Payable ${row.remainingQuantity}` : ""}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase text-[#65718b]">Final item payout</div>
            <div className="text-base font-bold text-[#21812C]">{formatMoney(row.finalPayout)}</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#eef3ff] text-[#56617a]">
              <tr>
                <th className="px-3 py-2 font-bold">Calculation</th>
                <th className="px-3 py-2 text-right font-bold">Original</th>
                <th className="px-3 py-2 text-right font-bold">Reversed</th>
                <th className="px-3 py-2 text-right font-bold">Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f7] text-[#202337]">
              <tr>
                <td className="px-3 py-2">
                  <div className="font-semibold">Seller payout</div>
                  <div className="text-[#65718b]">Payable amount for this product.</div>
                </td>
                <td className="px-3 py-2 text-right font-semibold">{formatMoney(row.beforeReturn)}</td>
                <td className="px-3 py-2 text-right font-semibold text-[#b45309]">{row.refundRecovery > 0 ? `-${formatMoney(row.refundRecovery)}` : "—"}</td>
                <td className="px-3 py-2 text-right font-bold text-[#21812C]">{formatMoney(row.finalPayout)}</td>
              </tr>
              {row.shipping > 0 && (
                <tr>
                  <td className="px-3 py-2">
                    <div className="font-semibold">Shipping collected for seller</div>
                    <div className="text-[#65718b]">
                      {row.shippingReversal > 0
                        ? "Part of shipping was reversed because the return/refund policy applied shipping refund."
                        : "Shipping is kept in seller payout as per policy."}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-[#21812C]">{formatMoney(row.shipping)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-[#b45309]">{row.shippingReversal > 0 ? `-${formatMoney(row.shippingReversal)}` : "—"}</td>
                  <td className="px-3 py-2 text-right font-bold text-[#21812C]">{formatMoney(row.netShipping)}</td>
                </tr>
              )}
              {row.shippingDeduction > 0 && (
                <tr>
                  <td className="px-3 py-2">
                    <div className="font-semibold">Shipping deducted from seller</div>
                    <div className="text-[#65718b]">Configured seller-side shipping deduction.</div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{formatMoney(row.shippingDeduction)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-[#21812C]">{row.shippingDeductionReversal > 0 ? formatMoney(row.shippingDeductionReversal) : "—"}</td>
                  <td className="px-3 py-2 text-right font-bold">{formatMoney(row.netShippingDeduction)}</td>
                </tr>
              )}
              <tr>
                <td className="px-3 py-2">
                  <div className="font-semibold">Platform commission</div>
                  <div className="text-[#65718b]">
                    Base {formatMoney(row.commissionBase)} → final base {formatMoney(row.netCommissionBase)} · Rate {percent(row.commissionRate)}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-semibold">{formatMoney(row.commission)}</td>
                <td className="px-3 py-2 text-right font-semibold text-[#b45309]">{row.returnRatio > 0 ? `-${formatMoney(row.commission - row.netCommission)}` : "—"}</td>
                <td className="px-3 py-2 text-right font-bold">{formatMoney(row.netCommission)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <div className="font-semibold">GST on commission</div>
                  <div className="text-[#65718b]">
                    GST base {formatMoney(row.commission)} → final base {formatMoney(row.netCommission)} · Rate {percent(row.commissionGstRate)}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-semibold">{formatMoney(row.commissionGst)}</td>
                <td className="px-3 py-2 text-right font-semibold text-[#b45309]">{row.returnRatio > 0 ? `-${formatMoney(row.commissionGst - row.netCommissionGst)}` : "—"}</td>
                <td className="px-3 py-2 text-right font-bold">{formatMoney(row.netCommissionGst)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <div className="font-semibold">GST TCS</div>
                  <div className="text-[#65718b]">
                    Base {formatMoney(row.gstTcsTaxableBase)} → final base {formatMoney(row.netGstTcsTaxableBase)}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-semibold">{formatMoney(row.gstTcs)}</td>
                <td className="px-3 py-2 text-right font-semibold text-[#b45309]">{row.returnRatio > 0 ? `-${formatMoney(row.gstTcs - row.netGstTcs)}` : "—"}</td>
                <td className="px-3 py-2 text-right font-bold">{formatMoney(row.netGstTcs)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <div className="font-semibold">Income-tax TDS</div>
                  <div className="text-[#65718b]">
                    Base {formatMoney(row.incomeTaxTdsTaxableBase)} → final base {formatMoney(row.netIncomeTaxTdsTaxableBase)}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-semibold">{formatMoney(row.incomeTaxTds)}</td>
                <td className="px-3 py-2 text-right font-semibold text-[#b45309]">{row.returnRatio > 0 ? `-${formatMoney(row.incomeTaxTds - row.netIncomeTaxTds)}` : "—"}</td>
                <td className="px-3 py-2 text-right font-bold">{formatMoney(row.netIncomeTaxTds)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ))}

    <div className="overflow-hidden rounded-lg border border-[#cdebd6] bg-[#f7fff9]">
      <div className="bg-[#eefbf2] px-3 py-2 font-bold text-[#21812C]">Final seller payout calculation</div>
      <div className="grid gap-2 p-3 text-sm sm:grid-cols-3">
        <div>
          <div className="text-xs font-bold uppercase text-[#65718b]">Original payout</div>
          <div className="font-bold text-[#202337]">{formatMoney(totals.beforeReturn)}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-[#b45309]">Return removed</div>
          <div className="font-bold text-[#b45309]">{formatMoney(totals.refundRecovery)}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-[#21812C]">Final payout</div>
          <div className="font-bold text-[#21812C]">{formatMoney(totals.finalPayout)}</div>
        </div>
      </div>
      <div className="border-t border-[#d9f1df] px-3 py-2 text-xs leading-5 text-[#65718b]">
        Final payout is the amount payable to the seller for delivered/non-returned quantity after platform commission, GST on commission, GST TCS, income-tax TDS, shipping settlement, and return reversal.
      </div>
    </div>
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
  const valueClass = {
    default: "text-[#202337]",
    dark: "text-[#1f4fc9]",
    green: "text-[#2ea84a]",
    blue: "text-[#1f4fc9]",
  }[tone] || "text-[#202337]";

  const Icon = {
    "Product Total": MdCurrencyRupee,
    "Customer Paid / Payable": MdCurrencyRupee,
    "Payment Collection": MdPayments,
    "Payment Status": MdCheckCircle,
    "Order Status": MdInventory2,
    Shipment: MdLocalShipping,
    Items: MdShoppingCart,
  }[label] || MdInventory2;

  return (
    <SummaryCard
      title={label}
      value={value}
      icon={<Icon size={18} />}
      valueClassName={valueClass + "capitalize"}
    />
  );
};

const EmptyState = ({ children }) => (
  <div className="rounded-lg border border-dashed border-[#eadfbd] bg-[#fffaf0] py-8 text-center text-sm text-[#65718b]">
    {children}
  </div>
);
const RelatedCard = ({ title, subtitle, status, rows = [], action, children }) => (
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

    {children && <div className="mt-3">{children}</div>}

    {action && <div className="mt-3">{action}</div>}
  </div>
);

const DetailStat = ({ label, value, icon, tone = "default" }) => {
  const toneClass = {
    default: "bg-[#f8faff] text-[#202337]",
    success: "bg-[#f6fff8] text-[#21812C]",
    warning: "bg-[#fff8ea] text-[#8A5A00]",
    muted: "bg-[#f6f7fb] text-[#65718b]",
  }[tone] || "bg-[#f8faff] text-[#202337]";

  return (
    <div className={`rounded-lg px-3 py-2 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide opacity-75">
        {icon}
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-bold">{formatLabel(value, "N/A")}</div>
    </div>
  );
};

const ShipmentCard = ({ shipment = {}, seller, onManage, onDownloadLabel }) => {
  const trackingNumber = firstDefined(shipment.tracking_number, shipment.trackingNumber, shipment.awb_number, "");
  const provider = displayStatus(firstDefined(shipment.provider, shipment.courier_name, shipment.courierName, "Manual"));
  const isCod = Boolean(shipment.cod);
  const eventCount = Array.isArray(shipment.trackingEvents) ? shipment.trackingEvents.length : 0;
  const createdAt = formatDate(firstDefined(shipment.created_at, shipment.createdAt));

  return (
    <div className="overflow-hidden rounded-xl border border-[#eadfbd] bg-white shadow-[0_1px_4px_rgba(31,41,55,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3 bg-[#fff9ea] px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <MdLocalShipping className="text-[#D8A21D]" size={18} />
            <div className="font-bold text-[#202337]">
              {trackingNumber || "Shipment not dispatched yet"}
            </div>
          </div>
          {seller && <div className="mt-1 text-xs text-[#65718b]">{seller}</div>}
        </div>
        <StatusBadge status={shipment.status || "not_created"} size="sm" dot />
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
        <DetailStat label="Courier" value={provider} icon={<MdLocalShipping size={13} />} />
        <DetailStat label="Tracking / AWB" value={trackingNumber || "Will be added after dispatch"} tone={trackingNumber ? "default" : "warning"} />
        <DetailStat label="Collection" value={isCod ? "COD collection" : "Prepaid / no COD"} tone={isCod ? "warning" : "success"} />
        <DetailStat label="Created" value={createdAt} tone="muted" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#f1e7cd] px-4 py-3 text-xs text-[#65718b]">
        <span>{eventCount ? `${eventCount} tracking update${eventCount === 1 ? "" : "s"}` : "No tracking updates yet"}</span>
        <div className="flex flex-wrap items-center gap-2">
        {onDownloadLabel && (
          <button
            type="button"
            className="rounded-md border border-[#D8A21D] bg-white px-3 py-1.5 text-xs font-semibold text-[#8A5A00] hover:bg-[#fff8ea]"
            onClick={onDownloadLabel}
          >
            Download box label
          </button>
        )}
        {onManage && (
          <button
            type="button"
            className="rounded-md border border-[#2f6fed] bg-white px-3 py-1.5 text-xs font-semibold text-[#2f6fed] hover:bg-[#f3f6ff]"
            onClick={onManage}
          >
            Manage shipment
          </button>
        )}
        </div>
      </div>
    </div>
  );
};

const PaymentCard = ({ payment = {}, orderNumber, orderId, currency = "INR" }) => {
  const provider = displayStatus(firstDefined(payment.provider, "payment"));
  const method = displayStatus(firstDefined(payment.method, payment.payment_method, payment.provider));
  const amount = `${payment.currency || currency} ${money(payment.amount).toFixed(2)}`;

  return (
    <div className="overflow-hidden rounded-xl border border-[#eadfbd] bg-white shadow-[0_1px_4px_rgba(31,41,55,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3 bg-[#fff9ea] px-4 py-3">
        <div>
          <div className="flex items-center gap-2 font-bold text-[#202337]">
            <MdPayments className="text-[#D8A21D]" size={18} />
            {provider} payment
          </div>
          <OrderLink orderId={orderId} orderNumber={orderNumber} prefix="Order #" className="mt-1 block" />
        </div>
        <StatusBadge status={payment.status || "recorded"} size="sm" dot />
      </div>
      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
        <DetailStat label="Amount" value={amount} tone="success" />
        <DetailStat label="Method" value={method} />
        <DetailStat label="Provider" value={provider} />
        <DetailStat label="Created" value={formatDate(firstDefined(payment.created_at, payment.createdAt))} tone="muted" />
      </div>
    </div>
  );
};

const DocumentCard = ({ document = {}, onOpen }) => {
  const number = firstDefined(document.invoice_number, document.invoiceNumber, document.credit_note_number, document.creditNoteNumber, "Document");
  const type = displayStatus(firstDefined(document.invoice_type, document.invoiceType, document.type, "tax invoice"));
  const total = formatMoney(firstDefined(document.total_amount, document.totalAmount, 0));

  return (
    <div className="overflow-hidden rounded-xl border border-[#eadfbd] bg-white shadow-[0_1px_4px_rgba(31,41,55,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3 bg-[#fff9ea] px-4 py-3">
        <div>
          <div className="font-bold text-[#202337]">{number}</div>
          <div className="mt-1 text-xs text-[#65718b]">{type}</div>
        </div>
        <StatusBadge status={firstDefined(document.status, "generated")} size="sm" dot />
      </div>
      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
        <DetailStat label="Total" value={total} tone="success" />
        <DetailStat label="Created" value={formatDate(firstDefined(document.created_at, document.createdAt, document.issued_at, document.issuedAt))} tone="muted" />
      </div>
      {onOpen && (
        <div className="border-t border-[#f1e7cd] px-4 py-3 text-right">
          <button type="button" className="rounded-md border border-[#2f6fed] bg-white px-3 py-1.5 text-xs font-semibold text-[#2f6fed] hover:bg-[#f3f6ff]" onClick={onOpen}>
            Open document
          </button>
        </div>
      )}
    </div>
  );
};

const EmptyMiniCard = ({ title, note }) => (
  <div className="rounded-xl border border-dashed border-[#eadfbd] bg-[#fffaf0] px-4 py-5 text-sm">
    <div className="font-semibold text-[#202337]">{title}</div>
    {note && <div className="mt-1 text-xs text-[#65718b]">{note}</div>}
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

  const handleError = useCallback(
  (error, defaultMessage = "An error occurred") => {
    const message = error?.message || error || defaultMessage;

    toast.error(message, {
      id: message,
    });

    console.error(error);
  },
  []
);

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
  const handleDownloadBoxLabel = useCallback(async (shipment) => {
    const shipmentId = shipment?.id || shipment?._id || shipment?.shipment_id || shipment?.shipmentId;
    if (!orderId || !shipmentId) {
      toast.error("Shipment label is not available for this package yet");
      return;
    }
    try {
      await downloadApiFile(ENDPOINTS.orders.boxLabelDownload(orderId, shipmentId), { format: "pdf" });
      toast.success("Box label downloaded");
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Failed to download box label";
      toast.error(message);
    }
  }, [orderId]);
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
                  <FaRegNoteSticky /> Add Note
              </button>
            </PermissionGuard>
            {orderId && (
              <button
                type="button"
                onClick={() => navigate(`/app/shipment-tracking?orderId=${encodeURIComponent(orderId)}`)}
              >
                <FaFile /> Manage Shipments
              </button>
            )}
            {!isSeller && statusOptions.length > 0 && (
              <PermissionGuard module="orders" action="status_change" hide>
                <button
                  type="button"
                  onClick={openStatusModal}
                >
                  <FaFile /> Update Status
                </button>
              </PermissionGuard>
            )}
            </>
          )}
        />

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {isSeller ? (
            <>
              <MetricCard label="Product Total" value={formatMoney(subtotalAmount)} />
              <MetricCard
                label="Payment Collection"
                value={String(firstDefined(order.payment_provider, order.paymentProvider, "")).toLowerCase() === "cod" ? "COD" : "Prepaid"}
              />
            </>
          ) : (
            <>
              <MetricCard label="Customer Paid / Payable" value={formatMoney(customerPayableAmount)} tone="dark" />
            </>
          )}
          <MetricCard label="Payment Status" value={<StatusBadge status={firstDefined(order.payment_status, order.paymentStatus)} dot />} />
          <MetricCard label="Order Status" value={<StatusBadge status={order.status} dot />} />
          <MetricCard label="Shipment" value={shipmentSummary} />
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
                  <span className="col-span-1 text-center">Qty</span>
                  <span className="col-span-2">Item status</span>
                  <span className="col-span-2 text-right">Price</span>
                  <span className="col-span-2 text-right">Total</span>
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
                      <div className="font-medium text-[#202337] md:col-span-1 md:text-center">
                        {Number(item.quantity || 0)}
                        {Number(item.cancelled_quantity || 0) > 0  }
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
                      <div className="font-medium text-[#202337] md:col-span-2 md:text-right">{formatMoney(firstDefined(item.unit_price, item.unitPrice))}</div>
                      <div className="md:col-span-2 md:text-right">
                        <div className="font-semibold text-[#202337]">{formatMoney(firstDefined(item.line_total, item.lineTotal))}</div>
                        <div className="text-xs text-[#65718b]">
                          GST included: {formatMoney(firstDefined(item.tax_amount, item.taxAmount, itemTax.taxAmount))} · {getItemTaxLabel(itemTax, item)}
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
            <Panel title={isSeller ? "Seller Order Summary" : "Customer Payment Breakup"}>
              <InfoRow label="Order Date" value={formatDate(order.created_at)} />
              <InfoRow label="Status" value={<StatusBadge status={order.status} dot />} />
              <InfoRow label="Return Window" value={formatDateTime12Hour(firstDefined(order.return_eligible_until, order.returnEligibleUntil), "Starts after delivery")} />
              <InfoRow
                label={isSeller ? "Payment Collection" : "Payment Method"}
                value={isSeller
                  ? (String(firstDefined(order.payment_provider, order.paymentProvider, "")).toLowerCase() === "cod" ? "COD" : "Prepaid")
                  : displayStatus(firstDefined(order.payment_provider, order.paymentProvider))}
              />
              <InfoRow
                label="Product Total"
                value={(
                  <span>
                    {formatMoney(subtotalAmount)}
                    {taxIncludedAmount > 0 && <span className="block text-xs font-normal text-[#65718b]">Includes GST {formatMoney(taxIncludedAmount)}</span>}
                  </span>
                )}
              />
              {!isSeller && deliveryChargeAmount > 0 && <InfoRow label="Shipping Charge" value={formatMoney(deliveryChargeAmount)} />}
              {!isSeller && customerPlatformFeeAmount > 0 && <InfoRow label="Platform Fee" value={formatMoney(customerPlatformFeeAmount)} />}
              {!isSeller && customerPlatformFeeTaxAmount > 0 && <InfoRow label="GST on Platform Fee" value={formatMoney(customerPlatformFeeTaxAmount)} />}
              {!isSeller && taxPayableAmount > 0 && <InfoRow label="GST Added at Checkout" value={formatMoney(taxPayableAmount)} />}
              {!isSeller && codChargeAmount > 0 && <InfoRow label="COD Charge" value={formatMoney(codChargeAmount)} />}
              {!isSeller && discountAmount > 0 && <InfoRow label={discountLabel} value={<span className="text-[#2ea84a]">-{formatMoney(discountAmount)}</span>} />}
              {!isSeller && walletDiscountAmount > 0 && <InfoRow label="Wallet Deduction" value={<span className="text-[#2ea84a]">-{formatMoney(walletDiscountAmount)}</span>} />}
              {!isSeller && (
                <div className="mt-2 border-t border-[#efe6cd] pt-2">
                  <InfoRow label="Customer Payable" value={formatMoney(customerPayableAmount)} strong />
                </div>
              )}
            </Panel>
          </aside>
        </div>

        <div className="mt-4 space-y-4">
          <Panel title="GST Summary">
            <div className="rounded-md bg-[#f8faff] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#202337]">
                    {taxPayableAmount > 0 ? "GST charged separately" : "GST is included in product prices"}
                  </div>
                  <div className="mt-1 text-xs text-[#65718b]">
                    Rates: {orderTaxRates.length ? orderTaxRates.map(percent).join(", ") : "N/A"}
                    {money(taxBreakup.taxableAmount) > 0 ? ` · Taxable value: ${formatMoney(taxBreakup.taxableAmount)}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-[#202337]">
                    {formatMoney(firstDefined(order.tax_amount, order.taxAmount, taxBreakup.totalTaxAmount, taxIncludedAmount))}
                  </div>
                  <div className="text-xs text-[#65718b]">Total GST</div>
                </div>
              </div>
              {(money(taxBreakup.cgstAmount) > 0 || money(taxBreakup.sgstAmount) > 0 || money(taxBreakup.igstAmount) > 0 || money(taxBreakup.cessAmount) > 0) && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#65718b]">
                  {money(taxBreakup.cgstAmount) > 0 && <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-[#e0e7f5]">CGST: {formatMoney(taxBreakup.cgstAmount)}</span>}
                  {money(taxBreakup.sgstAmount) > 0 && <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-[#e0e7f5]">SGST: {formatMoney(taxBreakup.sgstAmount)}</span>}
                  {money(taxBreakup.igstAmount) > 0 && <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-[#e0e7f5]">IGST: {formatMoney(taxBreakup.igstAmount)}</span>}
                  {money(taxBreakup.cessAmount) > 0 && <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-[#e0e7f5]">Cess: {formatMoney(taxBreakup.cessAmount)}</span>}
                </div>
              )}
            </div>
            {Array.isArray(taxBreakup.items) && taxBreakup.items.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 text-xs font-semibold uppercase text-[#65718b]">Item-wise GST</div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {taxBreakup.items.map((taxItem, index) => {
                  const taxProductId = firstDefined(taxItem.productId, taxItem.product_id);
                  const orderItem = items.find(
                    (item) => String(firstDefined(item.product_id, item.productId, "")) === String(taxProductId || ""),
                  ) || items[index] || {};
                  const productSnapshot = normalizeJson(firstDefined(orderItem.product_snapshot, orderItem.productSnapshot), {});
                  const productId = firstDefined(taxProductId, orderItem.product_id, orderItem.productId, productSnapshot.id, productSnapshot._id);
                  const productTitle = firstDefined(orderItem.product_title, orderItem.productTitle, productSnapshot.title, productId, `Item ${index + 1}`);
                  const itemGstAmount = money(taxItem.taxAmount) + money(taxItem.cessAmount);
                  return (
                    <div key={`${productId || "tax"}-${index}`} className="rounded-md border border-[#e6ebf7] bg-white p-3 text-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
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
                          <div className="mt-1 text-[#65718b]">{getItemTaxLabel(taxItem, orderItem)} · Base {formatMoney(taxItem.taxableAmount)}</div>
                        </div>
                        <div className="shrink-0 text-right font-semibold text-[#202337]">{formatMoney(itemGstAmount)}</div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Customer & Delivery Address">
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
                <div className="mb-1 text-xs font-semibold uppercase text-[#65718b]">Delivery address</div>
                <div>{[shippingAddress.line1, shippingAddress.line2, shippingAddress.city, shippingAddress.state, shippingAddress.postalCode, shippingAddress.country].filter(Boolean).join(", ") || "N/A"}</div>
              </div>
            </div>
          </Panel>
        </div>

        <Panel
          title="Related Records"
          className="mt-4"
          actions={(
            <div className="flex flex-wrap gap-2">
              {relationActions.map((action) => (
                <button
                  key={action.path}
                  type="button"
                  className="rounded-full border border-[#eadfbd] bg-white px-3 py-1.5 text-xs font-semibold text-[#202337] hover:border-[#2f6fed] hover:text-[#2f6fed]"
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
              ) : <EmptyMiniCard title="No cancellations" note="This order has no cancellation record." />}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-[#65718b]">Payments</h3>
              {payments.length ? (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <PaymentCard
                      key={payment.id || payment._id || payment.transaction_reference}
                      payment={payment}
                      orderNumber={orderNumber}
                      orderId={orderId}
                      currency={order.currency || "INR"}
                    />
                  ))}
                </div>
              ) : <EmptyMiniCard title="No payment record" note="Payment details will appear after collection/capture." />}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-[#65718b]">Shipments</h3>
              {shipments.length ? (
                <div className="space-y-3">
                  {shipments.map((shipment) => {
                    const seller = (() => {
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
                    })();
                    return (
                      <ShipmentCard
                        key={shipment.id || shipment._id || shipment.awb_number || shipment.tracking_number}
                        shipment={shipment}
                        seller={seller}
                        onDownloadLabel={() => handleDownloadBoxLabel(shipment)}
                        onManage={() => navigate(`/app/shipment-tracking?orderId=${encodeURIComponent(orderId)}`)}
                      />
                    );
                  })}
                </div>
              ) : <EmptyMiniCard title="No shipment created" note="Shipment details will appear after dispatch is created." />}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-[#65718b]">Invoices & Tax Documents</h3>
              <div className="grid grid-cols-1 gap-3">
                {invoice ? (
                  <DocumentCard
                    document={invoice}
                    onOpen={() => navigate(`/app/tax-invoices?search=${encodeURIComponent(firstDefined(invoice.invoice_number, invoice.invoiceNumber, ""))}`)}
                  />
                ) : <EmptyMiniCard title="No invoice generated" note="Tax documents will appear here once generated." />}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase text-[#65718b]">Returns & Wallet</h3>
              {returns.length || walletTransactions.length ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
                  {returns.length ? (
                  <div className="space-y-3">
                    {returns.map((returnRequest) => (
                      (() => {
                        const creditNoteId = firstDefined(
                          returnRequest.creditNoteId,
                          returnRequest.credit_note_id,
                          returnRequest.refund?.creditNoteId,
                          returnRequest.refund?.credit_note_id,
                        );
                        const returnedQuantity = (Array.isArray(returnRequest.items) ? returnRequest.items : [])
                          .reduce((total, item) => total + getReturnItemQuantity(item), 0);
                        const refundStatus = String(firstDefined(returnRequest.refundStatus, returnRequest.refund_status, returnRequest.status, "") || "").toLowerCase();
                        const creditNoteLabel = creditNoteId
                          ? "Generated"
                          : refundStatus === "refunded"
                          ? "Pending generation"
                          : "Will generate after refund";
                        return (
                          <RelatedCard
                            key={returnRequest.id || returnRequest._id}
                            title="Return request"
                            subtitle={displayStatus(returnRequest.reason)}
                            status={returnRequest.status}
                            rows={[
                              { label: "Refund", value: formatMoney(firstDefined(returnRequest.refundAmount, returnRequest.refundBreakup?.totalRefundAmount)) },
                              { label: "Returned quantity", value: returnedQuantity },
                              { label: "Seller payout impact", value: "Only returned quantity is reversed" },
                              { label: "Credit note / reverse invoice", value: creditNoteLabel },
                              { label: "Requested", value: formatDate(firstDefined(returnRequest.createdAt, returnRequest.created_at)) },
                            ]}
                            action={creditNoteId ? (
                              <button type="button" className="text-xs font-medium text-[#2f6fed]" onClick={() => navigate(`/app/credit-notes?creditNoteId=${encodeURIComponent(creditNoteId)}`)}>
                                Open reverse invoice / credit note
                              </button>
                            ) : null}
                          >
                            {Array.isArray(returnRequest.items) && returnRequest.items.length > 0 && (
                              <div className="space-y-2 rounded-md bg-[#fffaf0] p-2 text-xs">
                                <div className="font-semibold uppercase text-[#65718b]">Returned item-wise impact</div>
                                {returnRequest.items.map((item, index) => (
                                  <div key={firstDefined(item.orderItemId, item.order_item_id, item.productId, item.product_id, index)} className="flex items-start justify-between gap-3 border-t border-[#efe6cd] pt-2 first:border-t-0 first:pt-0">
                                    <div className="min-w-0">
                                      <div className="font-medium text-[#202337]">{getReturnItemTitle(item)}</div>
                                      <div className="text-[#65718b]">
                                        Returned qty {getReturnItemQuantity(item)}
                                        {getReturnItemVariantText(item) ? ` · ${getReturnItemVariantText(item)}` : ""}
                                        {getReturnItemOrderItemId(item) ? ` · Item ${getReturnItemOrderItemId(item).slice(0, 8)}` : ""}
                                      </div>
                                    </div>
                                    <div className="shrink-0 text-right font-semibold text-[#202337]">
                                      {formatMoney(firstDefined(item.refundAmount, item.refund_amount, item.eligibleRefundAmount, item.eligible_refund_amount, 0))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </RelatedCard>
                        );
                      })()
                    ))}
                  </div>
                  ) : null}
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
                              <OrderLink orderId={orderId} orderNumber={orderNumber} />
                            ),
                          },
                          { label: "Created", value: formatDate(firstDefined(walletTx.created_at, walletTx.createdAt)) },
                        ]}
                      />
                    ))}
                  </div>
                  ) : null}
                </div>
              ) : (
                <EmptyMiniCard
                  title="No returns or wallet activity"
                  note="Return requests, refund impact, credit notes, and wallet entries will appear here when created."
                />
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Seller Commission & Payout" className="mt-4">
          {sellerSettlements.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {sellerSettlements.map((seller) => {
                const sellerItems = sellerGroups.find((group) => sameSellerGroup(seller, group))?.items || [];
                const sellerCommissionRecords = (relations.sellerCommissions || []).filter((record) =>
                  String(firstDefined(record.seller_id, record.sellerId, "")) === String(seller.sellerId || "") &&
                  (!seller.organizationId || String(firstDefined(record.organization_id, record.organizationId, "default") || "default") === String(seller.organizationId || "default")),
                );
                const productRows = buildSimpleItemPayoutRows(seller, sellerItems, sellerCommissionRecords, returns, cancellations);
                const productRowsTotal = sumMoney(productRows, "finalPayout");
                const hasProductRows = productRows.length > 0;
                const itemRefundRecovery = sumMoney(productRows, "refundRecovery");
                const hasItemLevelAdjustment = productRows.some((row) =>
                  money(row.refundRecovery) > 0 || money(row.returnedQuantity) > 0 || money(row.cancelledQuantity) > 0,
                );
                const displaySellerPayout = hasProductRows && hasItemLevelAdjustment ? productRowsTotal : seller.sellerPayout;
                const payoutMismatch = hasProductRows && Math.abs(productRowsTotal - seller.sellerPayout) >= 0.01;
                const itemProductPayable = sumMoney(productRows, "productAmount");
                const itemShipping = sumMoney(productRows, "shipping");
                const itemShippingDeduction = sumMoney(productRows, "shippingDeduction");
                const itemDiscount = sumMoney(productRows, "discount");
                const itemCommission = sumMoney(productRows, "netCommission");
                const itemCommissionTax = sumMoney(productRows, "netCommissionGst");
                const itemGstTcs = sumMoney(productRows, "netGstTcs");
                const itemIncomeTaxTds = sumMoney(productRows, "netIncomeTaxTds");
                const itemGstTcsBase = sumMoney(productRows, "netGstTcsTaxableBase");
                const itemIncomeTaxTdsBase = sumMoney(productRows, "netIncomeTaxTdsTaxableBase");
                const beforeReturnTotal = sumMoney(productRows, "beforeReturn");
                const productPayable = hasProductRows ? itemProductPayable : (seller.sellerPayoutBase || seller.grossSales);
                const netCommission = seller.commissionReversal > 0 ? seller.netCommissionFee : seller.commissionFee;
                const netCommissionTax = seller.commissionTaxReversal > 0 ? seller.netCommissionTax : seller.platformFeeTax;
                const netGstTcs = seller.gstTcsReversal > 0 ? seller.netGstTcsAmount : seller.gstTcsAmount;
                const netIncomeTaxTds = seller.incomeTaxTdsReversal > 0 ? seller.netIncomeTaxTdsAmount : seller.incomeTaxTdsAmount;
                const displayShipping = hasProductRows ? itemShipping : seller.shippingReimbursement;
                const displayShippingDeduction = hasProductRows ? itemShippingDeduction : seller.shippingDeduction;
                const displayMarketplaceDiscount = hasProductRows ? itemDiscount : seller.marketplaceFundedDiscount;
                const displayCommission = hasProductRows ? itemCommission : netCommission;
                const displayCommissionTax = hasProductRows ? itemCommissionTax : netCommissionTax;
                const displayGstTcs = hasProductRows ? itemGstTcs : netGstTcs;
                const displayIncomeTaxTds = hasProductRows ? itemIncomeTaxTds : netIncomeTaxTds;
                const displayGstTcsBase = hasProductRows
                  ? itemGstTcsBase
                  : seller.gstTcsReversal > 0
                    ? seller.netGstTcsTaxableBase
                    : seller.gstTcsTaxableBase;
                const displayIncomeTaxTdsBase = hasProductRows
                  ? itemIncomeTaxTdsBase
                  : seller.incomeTaxTdsReversal > 0
                    ? firstDefined(seller.netIncomeTaxTdsTaxableBase, seller.incomeTaxTdsTaxableBase)
                    : seller.incomeTaxTdsTaxableBase;
                const hasRefundAdjustment = itemRefundRecovery > 0 || seller.sellerPayoutBaseReversal > 0 || seller.commissionReversal > 0 || seller.commissionTaxReversal > 0 || seller.gstTcsReversal > 0 || seller.incomeTaxTdsReversal > 0;

                return (
                  <div key={`${seller.sellerId}-${seller.organizationId || "default"}`} className="rounded-xl border border-[#eadfbd] bg-white p-4 text-sm shadow-[0_1px_4px_rgba(31,41,55,0.05)]">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        {seller.sellerId && canOpenAdminProfiles ? (
                          <DetailLink onClick={() => navigate(`/app/seller/view/${seller.sellerId}`)} className="font-semibold">
                            {seller.sellerName}
                          </DetailLink>
                        ) : (
                          <span className="font-semibold text-[#202337]">{seller.sellerName}</span>
                        )}
                        {seller.organizationName && <div className="text-xs text-[#65718b]">{seller.organizationName}</div>}
                        {hasRefundAdjustment && (
                          <div className="mt-2 inline-flex rounded-full bg-[#fff3d6] px-2.5 py-1 text-xs font-semibold text-[#8A5A00]">
                            Payout adjusted because an item was returned or cancelled
                          </div>
                        )}
                      </div>
                      <div className="rounded-lg bg-[#f8faff] px-3 py-2 text-right">
                        <div className="text-xs text-[#65718b]">Amount payable to seller</div>
                        <div className="text-lg font-bold text-[#1f4fc9]">{formatMoney(displaySellerPayout)}</div>
                        {payoutMismatch && !hasItemLevelAdjustment && (
                          <div className="mt-1 text-[11px] font-semibold text-[#8A5A00]">
                            Item rows need backend reconciliation
                          </div>
                        )}
                        {payoutMismatch && hasItemLevelAdjustment && (
                          <div className="mt-1 text-[11px] font-semibold text-[#8A5A00]">
                            Showing item-wise adjusted payout
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {productRows.length > 0 ? (
                        <SimpleItemPayoutBreakup rows={productRows} finalTotal={displaySellerPayout} />
                      ) : (
                        <PayoutFormula>
                          No product-wise payout records found. Showing seller-level payout below.
                        </PayoutFormula>
                      )}
   {hasProductRows && itemRefundRecovery > 0 && (
                            <details className="rounded-lg border border-[#dbe6f7] bg-white">
                              <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-[#1f4fc9]">
                                View full calculation
                              </summary>
                              <ItemWisePayoutCalculation
                                rows={productRows}
                                totals={{
                                  beforeReturn: beforeReturnTotal,
                                  refundRecovery: itemRefundRecovery,
                                  finalPayout: displaySellerPayout,
                                }}
                              />
                            </details>
                          )}

                          {!itemRefundRecovery && (
                            <PayoutSection
                              title="Seller receivable"
                              subtitle="Amount before platform charges."
                              tone="earn"
                            >
                              <PayoutRow
                                label="Product amount"
                                note={seller.taxCollected > 0 ? `Product GST included: ${formatMoney(seller.taxCollected)}` : ""}
                                value={formatMoney(productPayable)}
                              />
                              {displayShipping > 0 && (
                                <PayoutRow
                                  label="Shipping collected for seller"
                                  note="Platform collected this online and adds it to seller payout."
                                  value={formatMoney(displayShipping)}
                                  tone="credit"
                                />
                              )}
                              {displayMarketplaceDiscount > 0 && (
                                <PayoutRow
                                  label="Marketplace-funded discount reimbursement"
                                  note="Shown separately only when not already included in product amount."
                                  value={formatMoney(displayMarketplaceDiscount)}
                                  tone="credit"
                                />
                              )}
                            </PayoutSection>
                          )}

                          {!itemRefundRecovery && (seller.sellerFundedDiscount > 0 || seller.discountAmount > 0 || displayCommission > 0 || displayCommissionTax > 0 || displayShippingDeduction > 0) && (
                            <PayoutSection
                              title="Platform charges"
                              subtitle="Charges kept by platform as per marketplace agreement."
                              tone="deduct"
                            >
                              {seller.sellerFundedDiscount > 0 && <PayoutRow label="Seller-funded discount" value={`-${formatMoney(seller.sellerFundedDiscount)}`} tone="warning" />}
                              {seller.discountAmount > 0 && seller.marketplaceFundedDiscount <= 0 && <PayoutRow label="Customer discount" value={`-${formatMoney(seller.discountAmount)}`} tone="muted" />}
                              {displayCommission > 0 && (
                                <PayoutRow
                                  label="Platform commission"
                                  note={commissionBaseNote(seller, displayGstTcsBase)}
                                  value={`-${formatMoney(displayCommission)}`}
                                />
                              )}
                              {displayCommissionTax > 0 && (
                                <PayoutRow
                                  label="GST on commission"
                                  note={commissionGstBaseNote(seller, displayCommission, displayCommissionTax)}
                                  value={`-${formatMoney(displayCommissionTax)}`}
                                />
                              )}
                              {displayShippingDeduction > 0 && <PayoutRow label="Shipping deduction" note="Configured seller-side shipping deduction." value={`-${formatMoney(displayShippingDeduction)}`} />}
                            </PayoutSection>
                          )}

                          {!itemRefundRecovery && hasRefundAdjustment && (
                            <PayoutSection
                              title="Return adjustment"
                              subtitle="Only the returned quantity payout is removed."
                              tone="refund"
                            >
                              {itemRefundRecovery > 0 && <PayoutRow label="Returned item payout removed" value={`-${formatMoney(itemRefundRecovery)}`} />}
                              {!itemRefundRecovery && seller.sellerPayoutBaseReversal > 0 && <PayoutRow label="Returned item value removed" value={`-${formatMoney(seller.sellerPayoutBaseReversal)}`} />}
                            </PayoutSection>
                          )}

                          {!itemRefundRecovery && (displayGstTcs > 0 || displayIncomeTaxTds > 0) && (
                            <PayoutSection
                              title="Tax withheld"
                              subtitle="Final withholding after refund reversals."
                              tone="tax"
                            >
                              {displayGstTcs > 0 && (
                                <PayoutRow
                                  label={`GST TCS (${percent(seller.gstTcsRate)})`}
                                  note={`Final base: ${formatMoney(displayGstTcsBase)}`}
                                  value={`-${formatMoney(displayGstTcs)}`}
                                />
                              )}
                              {displayIncomeTaxTds > 0 && (
                                <PayoutRow
                                  label={`Income-tax TDS (${percent(seller.incomeTaxTdsRate)})`}
                                  note={`Final base: ${formatMoney(displayIncomeTaxTdsBase)}`}
                                  value={`-${formatMoney(displayIncomeTaxTds)}`}
                                />
                              )}
                              {seller.adjustmentAmount !== 0 && (
                                <PayoutRow
                                  label="Other payout adjustment"
                                  value={`${seller.adjustmentAmount > 0 ? "+" : "-"}${formatMoney(Math.abs(seller.adjustmentAmount))}`}
                                  tone={seller.adjustmentAmount > 0 ? "credit" : "warning"}
                                />
                              )}
                            </PayoutSection>
                          )}
                      

                      <div className="flex items-center justify-between rounded-lg bg-[#fff9ea] px-3 py-3 text-base font-bold text-[#202337]">
                        <span>Final seller payout</span>
                        <span>{formatMoney(displaySellerPayout)}</span>
                      </div>
                      {(seller.commissionStatus || seller.payoutStatus) && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-[#f8faff] px-3 py-2 text-xs text-[#65718b]">
                          {seller.commissionStatus && <span>Commission: {formatLabel(displayStatus(seller.commissionStatus))}</span>}
                          {seller.payoutStatus && <span>Payout: {formatLabel(displayStatus(seller.payoutStatus))}</span>}
                          {seller.payoutMethod && <span>Method: {formatLabel(displayStatus(seller.payoutMethod))}</span>}
                          {seller.payoutReference && <span>Bank ref: {seller.payoutReference}</span>}
                          {seller.payoutProcessedAt && <span>Paid: {formatDate(seller.payoutProcessedAt)}</span>}
                          {seller.commissionIds.length > 0 && <span>Item records: {seller.commissionIds.length}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState>No seller settlement data found</EmptyState>
          )}
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Timeline" className="mt-4">
            {timeline.length ? (
              <div className="space-y-2">
                {timeline.map((entry) => {
                  const statusLabel = formatLabel(displayStatus(entry.to_status || entry.toStatus));
                  const reasonLabel = entry.reason ? formatLabel(entry.reason) : "";
                  return (
                    <div key={entry.id} className="rounded-md border border-[#e6ebf7] bg-white px-3 py-2 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold capitalize text-[#202337]">{statusLabel}</div>
                          {reasonLabel && <div className="mt-0.5 text-xs text-[#65718b]">{reasonLabel}</div>}
                        </div>
                        <div className="text-right text-xs text-[#65718b]">
                          <div>{formatDate(entry.created_at)}</div>
                          <div>{formatLabel(entry.actor_role || "system")}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState>No timeline yet</EmptyState>}
          </Panel>

          <Panel title="Notes" className="mt-4">
            {notes.length ? notes.map((note) => (
              <div key={note.id} className="mb-3 rounded-lg border border-[#eadfbd] bg-white p-3 text-sm last:mb-0">
                <div className="text-[#202337] leading-6">{note.note}</div>
                <div className="text-xs text-[#65718b] mt-1">{formatLabel(note.actor_role || "system")} · {formatLabel(note.visibility)} · {formatDate(note.created_at)}</div>
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
