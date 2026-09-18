import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../../../utils/toast";

import {
  formatCurrency,
  formatDateTime12Hour,
} from "../../../utils/formatters";

import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
} from "../../../constants/statusConstants";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  OrderLink,
  SellerLink,
  UserLink,
} from "../../../components/Shared";

import {
  ACTIONS,
  usePermission,
} from "../../../_helpers/usePermission";

import { getOrderList } from "../../../Redux/orderSlice";
import { useListPage } from "../../../hooks/useListPage";

import {
  MdFileDownload,
  MdPayments,
  MdShoppingCart,
  MdVisibility,
} from "react-icons/md";

import { dropdownApi } from "../../../_helpers/dropdownApi";
import useRealtimeRefresh from "../../../hooks/useRealtimeRefresh";
import { exportToExcelWorkbook } from "../../../_helpers/exportToCsv";

/* =========================================================
   PAYMENT TYPE OPTIONS
========================================================= */

const PAYMENT_TYPE_OPTIONS = [
  {
    value: "cod",
    label: "Cash on Delivery (COD)",
  },
  {
    value: "razorpay",
    label: "Online (Razorpay)",
  },
  {
    value: "stripe",
    label: "Online (Stripe)",
  },
  {
    value: "manual_upi",
    label: "Manual UPI",
  },
  {
    value: "manual_bank_transfer",
    label: "Bank Transfer",
  },
  {
    value: "wallet_only",
    label: "Wallet Only",
  },
];

/* =========================================================
   FILTER FIELDS
========================================================= */

const FILTER_FIELDS = [
  {
    key: "status",
    type: "select",
    label: "Order Status",
    width: "w-44",
    options: ORDER_STATUS_OPTIONS,
  },
  {
    key: "paymentStatus",
    type: "select",
    label: "Payment Status",
    width: "w-44",
    options: PAYMENT_STATUS_OPTIONS,
  },
  {
    key: "paymentProvider",
    type: "select",
    label: "Payment Type",
    width: "w-52",
    options: PAYMENT_TYPE_OPTIONS,
  },
  {
    key: "deliveryStatus",
    type: "select",
    label: "Delivery Status",
    width: "w-44",
    options: DELIVERY_STATUS_OPTIONS,
  },
  // {
  //   key: "buyerId",
  //   type: "asyncDropdown",
  //   label: "Buyer",
  //   width: "w-52",
  //   load: (search) =>
  //     dropdownApi.getBuyers({
  //       keyWord: search,
  //       searchFields: "full_name,email",
  //     }),
  // },
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller Store name",
    width: "w-52",
    load: (search) =>
      dropdownApi.getSellers({
        keyWord: search,
        searchFields:
          "full_name,email,businessName",
      }),
  },
  {
    key: "fromDate",
    type: "date",
    label: "From Date",
    width: "w-36",
    disableFuture: true,
  },
  {
    key: "toDate",
    type: "date",
    label: "To Date",
    width: "w-36",
    disableFuture: true,
  },
];

/* =========================================================
   COMMON HELPERS
========================================================= */

const firstDefined = (...values) =>
  values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== "",
  );

const orderIdOf = (order = {}) =>
  firstDefined(
    order._id,
    order.id,
    order.orderId,
    order.order_no,
  );

const formatMoney = (value) =>
  formatCurrency(value, "—");

/* =========================================================
   INITIAL FILTERS FROM URL
========================================================= */

const getInitialQueryFilters = () => {
  const params = new URLSearchParams(
    window.location.search,
  );

  return [
    "status",
    "paymentStatus",
    "paymentProvider",
    "deliveryStatus",
    "buyerId",
    "sellerId",
    "fromDate",
    "toDate",
  ].reduce((filters, key) => {
    const value = params.get(key);

    if (value) {
      filters[key] = value;
    }

    return filters;
  }, {});
};

/* =========================================================
   JSON NORMALIZER
========================================================= */

const normalizeJson = (
  value,
  fallback = {},
) => {
  if (!value) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

/* =========================================================
   SELLER HELPERS
========================================================= */

const sellerNameOf = (
  seller = {},
) =>
  firstDefined(
    seller.sellerName,
    seller.seller_name,
    seller.displayName,
    seller.businessName,
    seller.name,
    seller.sellerProfile?.displayName,
    seller.sellerProfile?.businessName,
    seller.sellerProfile?.legalBusinessName,
    seller.profile?.name,
    seller.email,
  );

const organizationNameOf = (
  organization = {},
) =>
  firstDefined(
    organization.organizationName,
    organization.organization_name,
    organization.legalBusinessName,
    organization.legalName,
    organization.legal_name,
    organization.storeDisplayName,
    organization.store_display_name,
    organization.name,
  );

const sellerGroupsOf = (
  row = {},
) => {
  const relationGroups = Array.isArray(
    row.relations?.sellerFulfillmentGroups,
  )
    ? row.relations
        .sellerFulfillmentGroups
    : [];

  if (relationGroups.length) {
    return relationGroups;
  }

  const itemGroups = (
    Array.isArray(row.items)
      ? row.items
      : []
  ).reduce((groups, item) => {
    const sellerId = firstDefined(
      item.seller_id,
      item.sellerId,
      "platform",
    );

    const organizationId =
      firstDefined(
        item.organization_id,
        item.organizationId,
        "default",
      );

    const key = `${sellerId}:${organizationId}`;

    const sellerSnapshot =
      normalizeJson(
        firstDefined(
          item.seller_snapshot,
          item.sellerSnapshot,
        ),
        {},
      );

    const organizationSnapshot =
      normalizeJson(
        firstDefined(
          item.organization_snapshot,
          item.organizationSnapshot,
        ),
        {},
      );

    if (!groups[key]) {
      groups[key] = {
        sellerId,
        organizationId,
        sellerName:
          sellerNameOf(
            sellerSnapshot,
          ),
        organizationName:
          organizationNameOf(
            organizationSnapshot,
          ),
        organizationSnapshot,
        itemCount: 0,
        quantity: 0,
      };
    }

    groups[key].itemCount += 1;
    groups[key].quantity += Number(
      item.quantity || 0,
    );

    return groups;
  }, {});

  return Object.values(itemGroups);
};

/* =========================================================
   ITEM COUNT
========================================================= */

const countItems = (
  row = {},
) => {
  if (Array.isArray(row.items)) {
    return row.items.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity || 1),
      0,
    );
  }

  const groups =
    sellerGroupsOf(row);

  const quantity =
    groups.reduce(
      (sum, group) =>
        sum +
        Number(
          group.quantity || 0,
        ),
      0,
    );

  return firstDefined(
    quantity || null,
    row.itemQuantity,
    row.item_quantity,
    row.itemCount,
    row.item_count,
    row.itemsCount,
    row.items_count,
    "—",
  );
};

/* =========================================================
   SHIPMENT STATUS
========================================================= */

const shipmentStatusOf = (
  row = {},
) => {
  const forwardShipments = (
    Array.isArray(
      row.relations?.shipments,
    )
      ? row.relations.shipments
      : []
  ).filter(
    (shipment) =>
      String(
        shipment.direction ||
          "forward",
      ) !== "reverse",
  );

  const statusCounts =
    forwardShipments.reduce(
      (counts, shipment) => {
        const status = firstDefined(
          shipment.status,
          shipment.shipment_status,
          shipment.delivery_status,
        );

        if (!status) {
          return counts;
        }

        counts[status] =
          (counts[status] || 0) + 1;

        return counts;
      },
      {},
    );

  const statuses =
    Object.keys(statusCounts);

  if (statuses.length === 1) {
    return statuses[0];
  }

  if (statuses.length > 1) {
    return statuses
      .map(
        (status) =>
          `${status} (${statusCounts[status]})`,
      )
      .join(", ");
  }

  return firstDefined(
    row.delivery_status,
    row.deliveryStatus,
    row.shipmentStatus,
    row.shipment_status,
  );
};

/* =========================================================
   PAYOUT WINDOW
========================================================= */

const payoutWindowOf = (
  row = {},
) => {
  const items = Array.isArray(
    row.items,
  )
    ? row.items
    : [];

  const commissions =
    Array.isArray(
      row.relations
        ?.sellerCommissions,
    )
      ? row.relations
          .sellerCommissions
      : [];

  const deadlines = items
    .map((item) =>
      firstDefined(
        item.payout_eligible_at,
        item.payoutEligibleAt,
        item.return_eligible_until,
        item.returnEligibleUntil,
      ),
    )
    .filter(Boolean);

  const latestDeadline =
    deadlines.length
      ? deadlines.reduce(
          (latest, value) =>
            new Date(value).getTime() >
            new Date(
              latest,
            ).getTime()
              ? value
              : latest,
        )
      : null;

  const held = items.some(
    (item) =>
      String(
        item.payout_status ||
          item.payoutStatus ||
          "",
      ).toLowerCase() === "held",
  );

  const paid =
    commissions.length > 0 &&
    commissions.every(
      (commission) =>
        String(
          commission.status || "",
        ).toLowerCase() ===
        "paid",
    );

  const fulfilled =
    String(
      row.status || "",
    ).toLowerCase() ===
    "fulfilled";

  return {
    latestDeadline,
    held,
    paid,
    fulfilled,
  };
};

/* =========================================================
   RETURN WINDOW LABEL
========================================================= */

const returnWindowLabel = (
  deadline,
) => {
  if (!deadline) {
    return "Starts after delivery";
  }

  const remaining =
    new Date(deadline).getTime() -
    Date.now();

  if (remaining <= 0) {
    return "Return window closed";
  }

  const hours = Math.ceil(
    remaining / 3600000,
  );

  if (hours <= 48) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    } remaining`;
  }

  const days = Math.ceil(
    hours / 24,
  );

  return `${days} days remaining`;
};

/* =========================================================
   ORDER TABLE COLUMNS
========================================================= */

const createColumns = (
  navigate,
  canOpenBuyerDetails,
  canOpenSellerDetails,
  showSellerColumn = true,
  showBuyerColumn = true,
) => [
  {
    key: "order_number",
    label: "Order #",
    sortable: true,

    render: (value, row) => (
      <OrderLink
        orderId={orderIdOf(row)}
        orderNumber={
          value || row.orderNumber
        }
      />
    ),
  },

  ...(showBuyerColumn
    ? [
        {
          key: "buyer_id",
          label: "Buyer",

          render: (_, row) => {
            const shippingAddress =
              normalizeJson(
                firstDefined(
                  row.shipping_address,
                  row.shippingAddress,
                ),
                {},
              );

            const buyer =
              row.relations?.buyer ||
              row.relations?.customer ||
              row.buyer ||
              row.customer ||
              row.buyerSnapshot ||
              {};

            const name =
              row.buyerName ||
              row.customerName ||
              buyer.displayName ||
              buyer.fullName ||
              buyer.name ||
              row.buyer_name ||
              shippingAddress.fullName ||
              shippingAddress.name;

            const email =
              row.buyerEmail ||
              row.customerEmail ||
              buyer.email ||
              row.buyer_email ||
              shippingAddress.email;

            const buyerId =
              firstDefined(
                buyer.id,
                buyer._id,
                row.buyer_id,
                row.buyerId,
              );

            const buyerContent = (
              <>
                {name && (
                  <div className="text-sm font-medium text-gray-800">
                    {name}
                  </div>
                )}

                {email && !name && (
                  <div className="text-sm text-gray-700">
                    {email}
                  </div>
                )}

                {email && name && (
                  <div className="text-xs text-gray-400">
                    {email}
                  </div>
                )}

                {!name && !email && (
                  <span className="text-gray-400">
                    Customer details unavailable
                  </span>
                )}
              </>
            );

            return canOpenBuyerDetails &&
              buyerId ? (
              <UserLink
                userId={buyerId}
                userName={
                  name || email
                }
                className="block text-left"
              >
                {buyerContent}
              </UserLink>
            ) : (
              <div className="text-left">
                {buyerContent}
              </div>
            );
          },
        },
      ]
    : []),

  ...(showSellerColumn
    ? [
        {
          key: "seller",
          label: "Seller / Org",

          render: (_, row) => {
            const sellerGroups =
              sellerGroupsOf(row);

            const primaryGroup =
              sellerGroups[0] || {};

            const primarySeller =
              row.relations
                ?.sellers?.[0] ||
              row.seller ||
              {};

            const sellerName =
              firstDefined(
                row.sellerName,
                primaryGroup.sellerName,
                sellerNameOf(
                  primarySeller,
                ),
                row.sellerSnapshot?.name,
                row.seller_snapshot?.name,
              );

            const organizationName =
              firstDefined(
                row.organizationName,
                primaryGroup.organizationName,
                organizationNameOf(
                  primaryGroup.organizationSnapshot,
                ),
                row.organization?.legalName,
                row.organizationSnapshot
                  ?.legalName,
                row.organization_snapshot
                  ?.legalName,
                row.organizationSnapshot
                  ?.storeDisplayName,
                row.organization_snapshot
                  ?.storeDisplayName,
              );

            const sellerId =
              firstDefined(
                row.sellerId,
                row.seller_id,
                primaryGroup.sellerId,
                primaryGroup.seller_id,
                primarySeller.id,
                primarySeller._id,
                row.seller?.id,
                row.seller?._id,
              );

            const organizationId =
              firstDefined(
                row.organizationId,
                row.organization_id,
                primaryGroup.organizationId,
                primaryGroup.organization_id,
              );

            if (
              !sellerName &&
              !organizationName &&
              !sellerId &&
              !organizationId
            ) {
              return (
                <span className="text-gray-400">
                  —
                </span>
              );
            }

            const canLinkSeller =
              Boolean(
                sellerId &&
                  canOpenSellerDetails,
              );

            const content = (
              <>
                <div className="text-sm font-medium text-gray-800">
                  {organizationName ||
                    sellerName ||
                    "Seller"}
                </div>

                {sellerName &&
                  organizationName && (
                    <div className="text-xs text-gray-400">
                      {sellerName}
                    </div>
                  )}

                {canLinkSeller && (
                  <div className="text-[11px] font-medium text-[#2f6fed]">
                    View seller
                  </div>
                )}

                {sellerGroups.length >
                  1 && (
                  <div className="text-xs text-gray-400">
                    +
                    {sellerGroups.length -
                      1}{" "}
                    more seller
                  </div>
                )}

                {!sellerName &&
                  sellerId && (
                    <div className="text-xs text-gray-400">
                      Seller details unavailable
                    </div>
                  )}
              </>
            );

            return canLinkSeller ? (
              <SellerLink
                sellerId={sellerId}
                sellerName={
                  sellerName
                }
                className="block text-left"
              >
                {content}
              </SellerLink>
            ) : (
              <div className="text-left">
                {content}
              </div>
            );
          },
        },
      ]
    : []),

  {
    key: "items",
    label: "Items",

    render: (_, row) => (
      <span className="font-mono">
        {countItems(row)}
      </span>
    ),
  },

  {
    key: "total_amount",
    label: "Total",
    sortable: true,

    render: (value, row) => (
      <span className="font-mono font-semibold">
        {formatMoney(
          firstDefined(
            value,
            row.totalAmount,
          ),
        )}
      </span>
    ),
  },

  {
    key: "payment_provider",
    label: "Payment Type",

    render: (value, row) => {
      const provider =
        String(
          firstDefined(
            value,
            row.paymentProvider,
            "",
          ),
        ).toLowerCase();

      const label =
        PAYMENT_TYPE_OPTIONS.find(
          (option) =>
            option.value ===
            provider,
        )?.label;

      return (
        <span className="text-sm font-medium text-gray-700">
          {label ||
            (provider
              ? provider.replace(
                  /_/g,
                  " ",
                )
              : "N/A")}
        </span>
      );
    },
  },

  {
    key: "payment_status",
    label: "Payment Status",

    render: (value, row) => (
      <StatusBadge
        status={firstDefined(
          value,
          row.paymentStatus,
        )}
        dot
      />
    ),
  },

  {
    key: "status",
    label: "Order Status",

    render: (value) => (
      <StatusBadge status={value} />
    ),
  },

  {
    key: "delivery_status",
    label: "Shipment Status",

    render: (value, row) => {
      const status = firstDefined(
        value,
        shipmentStatusOf(row),
      );

      return status ? (
        <StatusBadge
          status={status}
          dot
        />
      ) : (
        <span className="text-gray-400">
          N/A
        </span>
      );
    },
  },
];

/* =========================================================
   API RESPONSE
========================================================= */

const getListPayload = (
  selector = {},
) => {
  const data =
    selector?.getOrderListData?.data
      ?.data;

  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
    };
  }

  return {
    items:
      data?.list ||
      data?.items ||
      [],

    total: Number(
      data?.total ||
        data?.list?.length ||
        data?.items?.length ||
        0,
    ),
  };
};

/* =========================================================
   EXCEL HELPERS
========================================================= */

const excelDate = (
  value,
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
};

const excelNumber = (
  value,
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const productNameOf = (
  item = {},
) =>
  firstDefined(
    item.productName,
    item.product_name,
    item.product?.name,
    item.product?.title,
    item.name,
    item.title,
    "—",
  );

const skuOf = (
  item = {},
) =>
  firstDefined(
    item.variantSku,
    item.variant_sku,
    item.sku,
    item.variant?.sku,
    "—",
  );

const variantNameOf = (
  item = {},
) =>
  firstDefined(
    item.variantName,
    item.variant_name,
    item.variant?.name,
    item.variantTitle,
    item.variant_title,
    "—",
  );

const itemAmountOf = (
  item = {},
) =>
  firstDefined(
    item.lineTotal,
    item.line_total,
    item.totalAmount,
    item.total_amount,
    item.price,
    item.sellingPrice,
    item.selling_price,
    0,
  );

const itemTaxOf = (
  item = {},
) =>
  firstDefined(
    item.taxAmount,
    item.tax_amount,
    0,
);

/* =========================================================
   EXPORT DATE HELPERS
========================================================= */

/**
 * Returns a formatted date for filename/summary.
 * Returns an empty string when no date is supplied.
 *
 * This prevents:
 * Orders_Report_All_to_All.xlsx
 * and
 * All - All
 */
const formatExportDateLabel = (
  value,
) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
};

/**
 * Creates a readable date range for the Excel summary.
 */
const formatExportDateRange = (
  fromDate,
  toDate,
) => {
  const from =
    formatExportDateLabel(
      fromDate,
    );

  const to =
    formatExportDateLabel(
      toDate,
    );

  if (!from && !to) {
    return "All Dates";
  }

  if (from && !to) {
    return `From ${from} onwards`;
  }

  if (!from && to) {
    return `Until ${to}`;
  }

  return `${from} - ${to}`;
};

/**
 * Creates a clean filename date range.
 */
const buildExportFilename = (
  fromDate,
  toDate,
) => {
  const from =
    formatExportDateLabel(
      fromDate,
    ).replace(/\s+/g, "-");

  const to =
    formatExportDateLabel(
      toDate,
    ).replace(/\s+/g, "-");

  if (!from && !to) {
    return "Orders_Report.xlsx";
  }

  if (from && !to) {
    return `Orders_Report_${from}_onwards.xlsx`;
  }

  if (!from && to) {
    return `Orders_Report_until_${to}.xlsx`;
  }

  return `Orders_Report_${from}_to_${to}.xlsx`;
};

/* =========================================================
   EXPORT SELLER INFO
========================================================= */

const sellerExportInfo = (
  order = {},
) => {
  const group =
    sellerGroupsOf(order)[0] ||
    {};

  const seller =
    order.relations
      ?.sellers?.[0] ||
    order.seller ||
    {};

  return {
    sellerName: firstDefined(
      order.sellerName,
      group.sellerName,
      sellerNameOf(seller),
      "—",
    ),

    organizationName:
      firstDefined(
        order.organizationName,
        group.organizationName,
        organizationNameOf(
          group.organizationSnapshot,
        ),
        order.organization
          ?.legalName,
        order.organizationSnapshot
          ?.legalName,
        order.organization_snapshot
          ?.legalName,
        order.organizationSnapshot
          ?.storeDisplayName,
        order.organization_snapshot
          ?.storeDisplayName,
        "—",
      ),
  };
};

/* =========================================================
   EXPORT BUYER INFO
========================================================= */

const buyerNameOf = (
  order = {},
) => {
  const shippingAddress =
    normalizeJson(
      firstDefined(
        order.shipping_address,
        order.shippingAddress,
      ),
      {},
    );

  const buyer =
    order.relations?.buyer ||
    order.relations?.customer ||
    order.buyer ||
    order.customer ||
    {};

  return firstDefined(
    order.buyerName,
    order.customerName,
    buyer.displayName,
    buyer.fullName,
    buyer.name,
    order.buyer_name,
    shippingAddress.fullName,
    shippingAddress.name,
    "—",
  );
};

const buyerEmailOf = (
  order = {},
) => {
  const shippingAddress =
    normalizeJson(
      firstDefined(
        order.shipping_address,
        order.shippingAddress,
      ),
      {},
    );

  const buyer =
    order.relations?.buyer ||
    order.relations?.customer ||
    order.buyer ||
    order.customer ||
    {};

  return firstDefined(
    order.buyerEmail,
    order.customerEmail,
    buyer.email,
    order.buyer_email,
    shippingAddress.email,
    "—",
  );
};

/* =========================================================
   PAYMENT TYPE LABEL
========================================================= */

const paymentTypeLabelOf = (
  order = {},
) => {
  const provider =
    String(
      firstDefined(
        order.payment_provider,
        order.paymentProvider,
        "",
      ),
    ).toLowerCase();

  return (
    PAYMENT_TYPE_OPTIONS.find(
      (option) =>
        option.value === provider,
    )?.label ||
    (provider
      ? provider.replace(
          /_/g,
          " ",
        )
      : "N/A")
  );
};

/* =========================================================
   BUILD EXCEL DATA
========================================================= */

const buildOrderExportData = (
  orders = [],
  filters = {},
) => {
  const totalOrders =
    orders.length;

  const totalItems =
    orders.reduce(
      (sum, order) =>
        sum +
        Number(
          countItems(order) || 0,
        ),
      0,
    );

  const totalOrderAmount =
    orders.reduce(
      (sum, order) =>
        sum +
        excelNumber(
          firstDefined(
            order.total_amount,
            order.totalAmount,
            0,
          ),
        ),
      0,
    );

  const totalSubtotal =
    orders.reduce(
      (sum, order) =>
        sum +
        excelNumber(
          firstDefined(
            order.subtotal_amount,
            order.subtotalAmount,
            order.subtotal,
            0,
          ),
        ),
      0,
    );

  const totalDiscount =
    orders.reduce(
      (sum, order) =>
        sum +
        excelNumber(
          firstDefined(
            order.discount_amount,
            order.discountAmount,
            order.discount,
            0,
          ),
        ),
      0,
    );

  const totalTax =
    orders.reduce(
      (sum, order) =>
        sum +
        excelNumber(
          firstDefined(
            order.tax_amount,
            order.taxAmount,
            order.tax,
            0,
          ),
        ),
      0,
    );

  const totalShippingFee =
    orders.reduce(
      (sum, order) =>
        sum +
        excelNumber(
          firstDefined(
            order.shipping_fee_amount,
            order.shippingFeeAmount,
            order.shipping_fee,
            order.shippingFee,
            0,
          ),
        ),
      0,
    );

  const totalPayableAmount =
    orders.reduce(
      (sum, order) =>
        sum +
        excelNumber(
          firstDefined(
            order.payable_amount,
            order.payableAmount,
            0,
          ),
        ),
      0,
    );

  const capturedOrders =
    orders.filter(
      (order) =>
        String(
          firstDefined(
            order.payment_status,
            order.paymentStatus,
            "",
          ),
        ).toLowerCase() ===
        "captured",
    ).length;

  const deliveredOrders =
    orders.filter(
      (order) =>
        String(
          firstDefined(
            order.status,
            "",
          ),
        ).toLowerCase() ===
        "delivered",
    ).length;

  /* =====================================================
     SUMMARY SHEET
  ===================================================== */

  const summaryRows = [
    {
      field: "Report Name",
      value: "Orders Report",
    },
    {
      field: "Date Range",
      value: formatExportDateRange(
        filters.fromDate,
        filters.toDate,
      ),
    },
    {
      field: "Total Orders",
      value: totalOrders,
    },
    {
      field: "Total Items",
      value: totalItems,
    },
    {
      field: "Total Subtotal",
      value: totalSubtotal,
    },
    {
      field: "Total Discount",
      value: totalDiscount,
    },
    {
      field: "Total Tax",
      value: totalTax,
    },
    {
      field: "Total Shipping Fee",
      value: totalShippingFee,
    },
    {
      field: "Total Order Amount",
      value: totalOrderAmount,
    },
    {
      field: "Total Payable Amount",
      value: totalPayableAmount,
    },
    {
      field: "Captured Orders",
      value: capturedOrders,
    },
    {
      field: "Delivered Orders",
      value: deliveredOrders,
    },
  ];

  /* =====================================================
     DETAILS SHEET
  ===================================================== */

  const detailRows =
    orders.flatMap(
      (order, orderIndex) => {
        const seller =
          sellerExportInfo(order);

        const items = Array.isArray(
          order.items,
        )
          ? order.items
          : [];

        /*
         * Normalize pricingSummary because
         * API may return it either as an object
         * or as a JSON string.
         */
        const pricingSummary =
          normalizeJson(
            order.metadata
              ?.pricingSummary,
            {},
          );

        const settlement =
          Array.isArray(
            pricingSummary.sellerSettlementBreakup,
          )
            ? pricingSummary
                .sellerSettlementBreakup[0] ||
              {}
            : {};

        const base = {
          serialNumber:
            orderIndex + 1,

          orderNumber:
            firstDefined(
              order.order_number,
              order.orderNumber,
              "—",
            ),

          orderDate: excelDate(
            firstDefined(
              order.created_at,
              order.createdAt,
            ),
          ),

          buyer:
            buyerNameOf(order),

          buyerEmail:
            buyerEmailOf(order),

          seller:
            seller.sellerName,

          organization:
            seller.organizationName,

          paymentType:
            paymentTypeLabelOf(order),

          paymentStatus:
            firstDefined(
              order.payment_status,
              order.paymentStatus,
              "—",
            ),

          orderStatus:
            firstDefined(
              order.status,
              "—",
            ),

          shipmentStatus:
            firstDefined(
              order.delivery_status,
              order.deliveryStatus,
              order.shipmentStatus,
              order.shipment_status,
              shipmentStatusOf(order),
              "—",
            ),
        };

        if (!items.length) {
          return [
            {
              ...base,

              productName: "—",

              sku: "—",

              variant: "—",

              quantity:
                Number(
                  countItems(order),
                ) || 0,

              productAmount:
                excelNumber(
                  firstDefined(
                    order.subtotal_amount,
                    order.total_amount,
                    0,
                  ),
                ),

              taxAmount:
                excelNumber(
                  firstDefined(
                    order.tax_amount,
                    order.taxAmount,
                    0,
                  ),
                ),

              sellerCommission:
                excelNumber(
                  firstDefined(
                    pricingSummary.sellerCommissionAmount,
                    0,
                  ),
                ),

              sellerPayout:
                excelNumber(
                  firstDefined(
                    settlement.sellerPayoutAmount,
                    pricingSummary.sellerPayoutAmount,
                    0,
                  ),
                ),
            },
          ];
        }

        return items.map(
          (item) => ({
            ...base,

            productName:
              productNameOf(item),

            sku:
              skuOf(item),

            variant:
              variantNameOf(item),

            quantity:
              Number(
                item.quantity || 0,
              ),

            productAmount:
              excelNumber(
                itemAmountOf(item),
              ),

            taxAmount:
              excelNumber(
                itemTaxOf(item),
              ),

            sellerCommission:
              excelNumber(
                firstDefined(
                  item.sellerCommissionAmount,
                  item.seller_commission_amount,
                  pricingSummary.sellerCommissionAmount,
                  0,
                ),
              ),

            sellerPayout:
              excelNumber(
                firstDefined(
                  item.sellerPayoutAmount,
                  item.seller_payout_amount,
                  settlement.sellerPayoutAmount,
                  pricingSummary.sellerPayoutAmount,
                  0,
                ),
              ),
          }),
        );
      },
    );

  return {
    summaryRows,
    detailRows,
  };
};

/* =========================================================
   ORDERS COMPONENT
========================================================= */

const Orders = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    isSeller,
    isAdmin,
  } = usePermission();

  const selector = useSelector(
    (state) => state.order,
  );

  const realtimeRevision =
    useRealtimeRefresh([
      "order",
      "payment",
      "shipment",
      "return",
      "refund",
    ]);

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
    defaultFilters:
      getInitialQueryFilters(),
  });

  const {
    toQueryParams,
  } = list;

  const {
    items,
    total,
  } = getListPayload(selector);

  const orderListState =
    selector?.getOrderListData;

  const loading =
    !!selector?.loading ||
    (!orderListState?.data &&
      !orderListState?.error);

  const [
    buyerDirectory,
    setBuyerDirectory,
  ] = useState({});

  /* =====================================================
     BUYER DIRECTORY
  ===================================================== */

  const buyerIds = useMemo(
    () => [
      ...new Set(
        items
          .map((order) =>
            firstDefined(
              order.buyer_id,
              order.buyerId,
            ),
          )
          .filter(Boolean),
      ),
    ],
    [items],
  );

  useEffect(() => {
    if (
      !isAdmin ||
      !buyerIds.length
    ) {
      setBuyerDirectory({});
      return;
    }

    let active = true;

    dropdownApi
      .getUsers({
        size: 100,
        limit: 100,
      })
      .then((buyers) => {
        if (!active) {
          return;
        }

        setBuyerDirectory(
          buyers.reduce(
            (
              directory,
              buyer,
            ) => {
              directory[
                String(
                  buyer.value,
                )
              ] = {
                name:
                  buyer.label,
                email:
                  buyer.meta
                    ?.email ||
                  "",
              };

              return directory;
            },
            {},
          ),
        );
      })
      .catch(() => {
        if (active) {
          setBuyerDirectory({});
        }
      });

    return () => {
      active = false;
    };
  }, [
    buyerIds,
    isAdmin,
  ]);

  /* =====================================================
     DISPLAY ITEMS
  ===================================================== */

  const displayItems =
    useMemo(
      () =>
        items.map((order) => {
          const buyerId =
            firstDefined(
              order.buyer_id,
              order.buyerId,
            );

          const buyer =
            buyerId
              ? buyerDirectory[
                  String(buyerId)
                ]
              : null;

          if (!buyer) {
            return order;
          }

          return {
            ...order,

            buyerName:
              firstDefined(
                order.buyerName,
                order.buyer_name,
                buyer.name,
              ),

            buyerEmail:
              firstDefined(
                order.buyerEmail,
                order.buyer_email,
                buyer.email,
              ),
          };
        }),
      [
        items,
        buyerDirectory,
      ],
    );

  /* =====================================================
     TABLE COLUMNS
  ===================================================== */

  const baseColumns =
    useMemo(
      () =>
        createColumns(
          navigate,
          isAdmin,
          !isSeller,
          !isSeller,
          isAdmin,
        ),
      [
        isAdmin,
        isSeller,
        navigate,
      ],
    );

  /* =====================================================
     FETCH ORDERS
  ===================================================== */

  const fetchOrders = () => {
    const params =
      toQueryParams();

    return dispatch(
      getOrderList({
        page: params.page,

        limit: params.limit,

        search:
          params.search ||
          undefined,

        status:
          params.status ||
          undefined,

        paymentStatus:
          params.paymentStatus ||
          undefined,

        paymentProvider:
          params.paymentProvider ||
          undefined,

        deliveryStatus:
          params.deliveryStatus ||
          undefined,

        buyerId:
          params.buyerId ||
          undefined,

        sellerId:
          params.sellerId ||
          undefined,

        fromDate:
          params.fromDate ||
          undefined,

        toDate:
          params.toDate ||
          undefined,

        sortBy: params.sortBy,

        sortDir: params.sortDir,
      }),
    )
      .unwrap()
      .catch((err) => {
        toast.error(
          err?.message ||
            "Failed to fetch orders",
        );
      });
  };

  /* =====================================================
     FETCH EFFECT
  ===================================================== */

  useEffect(() => {
    fetchOrders();
  }, [
    dispatch,
    toQueryParams,
    list.page,
    list.pageSize,
    list.search,
    list.sortKey,
    list.sortDir,
    list.filters,
    realtimeRevision,
  ]);

  /* =====================================================
     EXCEL EXPORT DATA
  ===================================================== */

  const {
    summaryRows,
    detailRows,
  } = useMemo(
    () =>
      buildOrderExportData(
        displayItems,
        list.filters,
      ),
    [
      displayItems,
      list.filters,
    ],
  );

  /* =====================================================
     EXCEL FILE NAME
  ===================================================== */

  const exportFilename =
    useMemo(
      () =>
        buildExportFilename(
          list.filters?.fromDate,
          list.filters?.toDate,
        ),
      [list.filters],
    );

  /* =====================================================
     EXCEL SHEETS
  ===================================================== */

  const exportExcelSheets =
    useMemo(
      () => [
        {
          name: "Order Summary",

          title: "Order Summary",

          data: summaryRows,

          columns: [
            {
              key: "field",
              label: "Field",
            },
            {
              key: "value",
              label: "Value",
            },
          ],
        },

        {
          name: "Order Details",

          title: "Order Details",

          data: detailRows,

          columns: [
            {
              key: "serialNumber",
              label: "S.No",
            },
            {
              key: "orderNumber",
              label: "Order #",
            },
            {
              key: "orderDate",
              label: "Order Date",
            },
            {
              key: "buyer",
              label: "Buyer",
            },
            {
              key: "buyerEmail",
              label: "Buyer Email",
            },
            {
              key: "productName",
              label: "Product Name",
            },
            {
              key: "sku",
              label: "SKU",
            },
            {
              key: "variant",
              label: "Variant",
            },
            {
              key: "quantity",
              label: "Quantity",
            },
            {
              key: "productAmount",
              label: "Product Amount",
            },
            {
              key: "taxAmount",
              label: "Tax Amount",
            },
            {
              key: "seller",
              label: "Seller",
            },
            {
              key: "organization",
              label: "Organization",
            },
            {
              key: "sellerCommission",
              label: "Seller Commission",
            },
            {
              key: "sellerPayout",
              label: "Seller Payout",
            },
            {
              key: "paymentType",
              label: "Payment Type",
            },
            {
              key: "paymentStatus",
              label: "Payment Status",
            },
            {
              key: "orderStatus",
              label: "Order Status",
            },
            {
              key: "shipmentStatus",
              label: "Shipment Status",
            },
          ],
        },
      ],
      [
        summaryRows,
        detailRows,
      ],
    );

  /* =====================================================
     EXPORT HANDLER
  ===================================================== */

  const handleExport = () => {
    if (!displayItems.length) {
      toast.info(
        "No orders available to export.",
      );
      return;
    }

    try {
      const exported =
        exportToExcelWorkbook(
          exportExcelSheets,
          exportFilename,
        );

      if (exported) {
        toast.success(
          "Orders report exported successfully.",
        );
      } else {
        toast.error(
          "Unable to export orders report.",
        );
      }
    } catch (error) {
      console.error(
        "Orders export error:",
        error,
      );

      toast.error(
        "Failed to export orders report.",
      );
    }
  };

  /* =====================================================
     FILTER FIELDS
  ===================================================== */

  const filterFields =
    useMemo(
      () =>
        FILTER_FIELDS.filter(
          (field) => {
            if (
              field.key ===
                "buyerId" &&
              !isAdmin
            ) {
              return false;
            }

            if (
              field.key ===
                "sellerId" &&
              isSeller
            ) {
              return false;
            }

            return true;
          },
        ),
      [
        isAdmin,
        isSeller,
      ],
    );

  /* =====================================================
     FINAL TABLE COLUMNS
  ===================================================== */

  const columns = [
    ...baseColumns,

    {
      key: "_payout_window",
      label:
        "Return Window / Payout",

      render: (_, row) => {
        const payout =
          payoutWindowOf(row);

        if (payout.paid) {
          return (
            <StatusBadge
              status="paid"
              dot
            />
          );
        }

        if (payout.held) {
          return (
            <>
              <StatusBadge
                status="held"
                dot
              />

              <div className="mt-1 text-[11px] text-red-600">
                Return or refund hold
              </div>
            </>
          );
        }

        if (payout.fulfilled) {
          return (
            <>
              <StatusBadge
                status="eligible"
                dot
              />

              <div className="mt-1 text-[11px] text-green-700">
                Ready for payout
              </div>
            </>
          );
        }

        return (
          <div>
            <StatusBadge
              status={
                payout.latestDeadline
                  ? "pending"
                  : "waiting"
              }
              dot
            />

            <div className="mt-1 text-[11px] text-gray-500">
              {returnWindowLabel(
                payout.latestDeadline,
              )}
            </div>

            {payout.latestDeadline && (
              <div className="text-[11px] text-gray-400">
                Until{" "}
                {formatDateTime12Hour(
                  payout.latestDeadline,
                )}
              </div>
            )}
          </div>
        );
      },
    },

    {
      key: "createdAt",
      label: "Date",
      sortable: true,

      render: (value, row) => {
        const date =
          firstDefined(
            value,
            row.created_at,
          );

        return (
          <span className="text-gray-500 text-sm whitespace-nowrap">
            {formatDateTime12Hour(
              date,
            )}
          </span>
        );
      },
    },
  ];

  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <>
      <PageHeader
        title="Orders List"
        subtitle="Manage and track all customer orders."
        breadcrumbs={[
          {
            label: isSeller
              ? "Orders"
              : "Orders Management",
          },
          {
            label: "Orders List",
          },
        ]}
        actions={
          <button
            type="button"
            onClick={handleExport}
            disabled={
              loading ||
              !displayItems.length
            }
            className="inline-flex items-center gap-2 rounded-md bg-[#CE9F2D] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#b88d25] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MdFileDownload
              size={17}
            />

            Export Report
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={displayItems}
        loading={loading}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={
          list.setPage
        }
        onPageSizeChange={
          list.setPageSize
        }
        onSearch={
          list.setSearch
        }
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder={
          isAdmin
            ? "Search by order number or buyer…"
            : "Search by order number…"
        }
        emptyText="No orders found."
        emptyIcon={
          <MdShoppingCart
            size={40}
            className="text-gray-200"
          />
        }
        requiredModule="orders"
        filterBar={
          <FilterBar
            filters={filterFields}
            values={list.filters}
            onChange={
              list.setFilter
            }
            onClear={
              list.clearFilters
            }
            loading={loading}
            activeCount={
              list.activeFilterCount
            }
          />
        }
        rowActions={(row) => {
          const payout =
            payoutWindowOf(row);

          const group =
            sellerGroupsOf(row)[0] ||
            {};

          const actions = [
            {
              label: "View Details",

              icon: (
                <MdVisibility
                  size={16}
                  className="text-blue-600"
                />
              ),

              requiredModule:
                "orders",

              requiredAction:
                ACTIONS.VIEW,

              onClick: () =>
                navigate(
                  `/app/orders/view/${orderIdOf(
                    row,
                  )}`,
                ),
            },
          ];

          if (
            !isSeller &&
            payout.fulfilled &&
            !payout.paid
          ) {
            actions.push({
              label:
                "Manage Payout",

              icon: (
                <MdPayments
                  size={16}
                  className="text-green-600"
                />
              ),

              requiredModule:
                "sellers/commissions",

              requiredAction:
                ACTIONS.UPDATE,

              onClick: () => {
                const params =
                  new URLSearchParams({
                    orderId:
                      String(
                        orderIdOf(
                          row,
                        ),
                      ),
                  });

                if (
                  group.sellerId
                ) {
                  params.set(
                    "sellerId",
                    String(
                      group.sellerId,
                    ),
                  );
                }

                if (
                  group.organizationId
                ) {
                  params.set(
                    "organizationId",
                    String(
                      group.organizationId,
                    ),
                  );
                }

                navigate(
                  `/app/seller-finance?${params.toString()}`,
                );
              },
            });
          }

          return actions;
        }}
      />
    </>
  );
};

export default Orders;