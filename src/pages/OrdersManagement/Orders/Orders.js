import React, { useEffect, useMemo, useState } from "react";
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
import { useDispatch, useSelector } from "react-redux";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  OrderLink,
  SellerLink,
  UserLink,
} from "../../../components/Shared";
// import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";
import { getOrderList } from "../../../Redux/orderSlice";
import { useListPage } from "../../../hooks/useListPage";
import { MdPayments, MdShoppingCart, MdVisibility } from "react-icons/md";
import { dropdownApi } from "../../../_helpers/dropdownApi";

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
    key: "deliveryStatus",
    type: "select",
    label: "Delivery Status",
    width: "w-44",
    options: DELIVERY_STATUS_OPTIONS,
  },
  {
    key: "buyerId",
    type: "asyncDropdown",
    label: "Buyer",
    width: "w-52",
    load: (search) =>
      dropdownApi.getBuyers({
        keyWord: search,
        searchFields: "full_name,email",
      }),
  },
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller",
    width: "w-52",
    load: (search) =>
      dropdownApi.getSellers({
        keyWord: search,
        searchFields: "full_name,email,businessName",
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

const firstDefined = (...values) =>
  values.find((v) => v !== undefined && v !== null && v !== "");

const orderIdOf = (order = {}) =>
  firstDefined(order._id, order.id, order.orderId, order.order_no);

const formatMoney = (value) => formatCurrency(value, "—");

const getInitialQueryFilters = () => {
  const params = new URLSearchParams(window.location.search);
  return [
    "status",
    "paymentStatus",
    "deliveryStatus",
    "buyerId",
    "sellerId",
    "fromDate",
    "toDate",
  ].reduce((filters, key) => {
    const value = params.get(key);
    if (value) filters[key] = value;
    return filters;
  }, {});
};

const normalizeJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const sellerNameOf = (seller = {}) =>
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

const organizationNameOf = (organization = {}) =>
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

const sellerGroupsOf = (row = {}) => {
  const relationGroups = Array.isArray(row.relations?.sellerFulfillmentGroups)
    ? row.relations.sellerFulfillmentGroups
    : [];
  if (relationGroups.length) return relationGroups;

  const itemGroups = (Array.isArray(row.items) ? row.items : []).reduce(
    (groups, item) => {
      const sellerId = firstDefined(item.seller_id, item.sellerId, "platform");
      const organizationId = firstDefined(
        item.organization_id,
        item.organizationId,
        "default",
      );
      const key = `${sellerId}:${organizationId}`;
      const sellerSnapshot = normalizeJson(
        firstDefined(item.seller_snapshot, item.sellerSnapshot),
        {},
      );
      const organizationSnapshot = normalizeJson(
        firstDefined(item.organization_snapshot, item.organizationSnapshot),
        {},
      );
      if (!groups[key]) {
        groups[key] = {
          sellerId,
          organizationId,
          sellerName: sellerNameOf(sellerSnapshot),
          organizationName: organizationNameOf(organizationSnapshot),
          itemCount: 0,
          quantity: 0,
        };
      }
      groups[key].itemCount += 1;
      groups[key].quantity += Number(item.quantity || 0);
      return groups;
    },
    {},
  );
  return Object.values(itemGroups);
};

const countItems = (row = {}) => {
  if (Array.isArray(row.items)) {
    return row.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  }
  const groups = sellerGroupsOf(row);
  const quantity = groups.reduce(
    (sum, group) => sum + Number(group.quantity || 0),
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

const shipmentStatusOf = (row = {}) => {
  const forwardShipments = (row.relations?.shipments || []).filter(
    (shipment) => String(shipment.direction || "forward") !== "reverse",
  );
  const statusCounts = forwardShipments.reduce((counts, shipment) => {
    const status = firstDefined(
      shipment.status,
      shipment.shipment_status,
      shipment.delivery_status,
    );
    if (!status) return counts;
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const statuses = Object.keys(statusCounts);
  if (statuses.length === 1) return statuses[0];
  if (statuses.length > 1)
    return statuses
      .map((status) => `${status} (${statusCounts[status]})`)
      .join(", ");
  return firstDefined(
    row.delivery_status,
    row.deliveryStatus,
    row.shipmentStatus,
    row.shipment_status,
  );
};

const payoutWindowOf = (row = {}) => {
  const items = Array.isArray(row.items) ? row.items : [];
  const commissions = row.relations?.sellerCommissions || [];
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
  const latestDeadline = deadlines.length
    ? deadlines.reduce((latest, value) =>
        new Date(value).getTime() > new Date(latest).getTime() ? value : latest,
      )
    : null;
  const held = items.some((item) => item.payout_status === "held");
  const paid =
    commissions.length > 0 &&
    commissions.every((commission) => commission.status === "paid");
  const fulfilled = row.status === "fulfilled";
  return { latestDeadline, held, paid, fulfilled };
};

const returnWindowLabel = (deadline) => {
  if (!deadline) return "Starts after delivery";
  const remaining = new Date(deadline).getTime() - Date.now();
  if (remaining <= 0) return "Return window closed";
  const hours = Math.ceil(remaining / 3600000);
  if (hours <= 48) return `${hours} hour${hours === 1 ? "" : "s"} remaining`;
  const days = Math.ceil(hours / 24);
  return `${days} days remaining`;
};

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
    render: (v, row) => (
      <OrderLink orderId={orderIdOf(row)} orderNumber={v || row.orderNumber} />
    ),
  },
  {
    key: "createdAt",
    label: "Date",
    sortable: true,
    render: (v, row) => {
      const date = firstDefined(v, row.created_at);
      return (
        <span className="text-gray-500 text-sm">
          {formatDateTime12Hour(date)}
        </span>
      );
    },
  },
  ...(showBuyerColumn
    ? [
        {
          key: "buyer_id",
          label: "Buyer",
          render: (v, row) => {
            const buyer =
              row.relations?.buyer || row.buyer || row.buyerSnapshot || {};
            const name =
              row.buyerName ||
              buyer.displayName ||
              buyer.fullName ||
              buyer.name ||
              row.buyer_name;
            const email = row.buyerEmail || buyer.email || row.buyer_email;
            const buyerId = firstDefined(
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
                  <div className="text-sm text-gray-700">{email}</div>
                )}
                {email && name && (
                  <div className="text-xs text-gray-400">{email}</div>
                )}
                {!name && !email && (
                  <span className="text-gray-400">
                    Customer details unavailable
                  </span>
                )}
              </>
            );

            return canOpenBuyerDetails && buyerId ? (
              <UserLink userId={buyerId} userName={name || email} className="block text-left">
                {buyerContent}
              </UserLink>
            ) : (
              <div className="text-left">{buyerContent}</div>
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
            const sellerGroups = sellerGroupsOf(row);
            const primaryGroup = sellerGroups[0] || {};
            const primarySeller =
              row.relations?.sellers?.[0] || row.seller || {};
            const sellerName = firstDefined(
              row.sellerName,
              primaryGroup.sellerName,
              sellerNameOf(primarySeller),
              row.sellerSnapshot?.name,
              row.seller_snapshot?.name,
            );
            const organizationName = firstDefined(
              row.organizationName,
              primaryGroup.organizationName,
              organizationNameOf(primaryGroup.organizationSnapshot),
              row.organization?.legalName,
              row.organizationSnapshot?.legalName,
              row.organization_snapshot?.legalName,
              row.organizationSnapshot?.storeDisplayName,
              row.organization_snapshot?.storeDisplayName,
            );
            const sellerId = firstDefined(
              row.sellerId,
              row.seller_id,
              primaryGroup.sellerId,
              primaryGroup.seller_id,
              primarySeller.id,
              primarySeller._id,
              row.seller?.id,
              row.seller?._id,
            );
            const organizationId = firstDefined(
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
              return <span className="text-gray-400">—</span>;
            }
            const canLinkSeller = sellerId && canOpenSellerDetails;
            const content = (
              <>
                <div className="text-sm font-medium text-gray-800">
                  {organizationName || sellerName || "Seller"}
                </div>
                {sellerName && organizationName && (
                  <div className="text-xs text-gray-400">{sellerName}</div>
                )}
                {canLinkSeller && (
                  <div className="text-[11px] font-medium text-[#2f6fed]">
                    View seller
                  </div>
                )}
                {sellerGroups.length > 1 && (
                  <div className="text-xs text-gray-400">
                    +{sellerGroups.length - 1} more seller
                  </div>
                )}
                {!sellerName && sellerId && (
                  <div className="text-xs text-gray-400">
                    Seller details unavailable
                  </div>
                )}
              </>
            );
            return canLinkSeller ? (
              <SellerLink sellerId={sellerId} sellerName={sellerName} className="block text-left">
                {content}
              </SellerLink>
            ) : (
              <div className="text-left">{content}</div>
            );
          },
        },
      ]
    : []),
  {
    key: "items",
    label: "Items",
    render: (_, row) => <span className="font-mono">{countItems(row)}</span>,
  },
  {
    key: "total_amount",
    label: "Total",
    sortable: true,
    render: (v, row) => (
      <span className="font-mono font-semibold">
        {formatMoney(firstDefined(v, row.totalAmount))}
      </span>
    ),
  },
  {
    key: "status",
    label: "Order Status",
    render: (v) => <StatusBadge status={v} />,
  },
  // {
  //   key: "fulfillment_status",
  //   label: "Fulfilment",
  //   render: (v, row) => (
  //     <StatusBadge
  //       status={firstDefined(v, row.fulfilmentStatus, row.fulfillmentStatus, row.status)}
  //       dot
  //     />
  //   ),
  // },
  {
    key: "payment_status",
    label: "Payment",
    render: (v, row) => (
      <StatusBadge status={firstDefined(v, row.paymentStatus)} dot />
    ),
  },
  {
    key: "delivery_status",
    label: "Shipment Status",
    render: (v, row) => {
      const s = firstDefined(v, shipmentStatusOf(row));
      return s ? (
        <StatusBadge status={s} dot />
      ) : (
        <span className="text-gray-400">N/A</span>
      );
    },
  },
];

const getListPayload = (selector = {}) => {
  const data = selector?.getOrderListData?.data?.data;
  if (Array.isArray(data)) return { items: data, total: data.length };
  return {
    items: data?.list || data?.items || [],
    total: Number(
      data?.total || data?.list?.length || data?.items?.length || 0,
    ),
  };
};

const Orders = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isSeller, isAdmin } = usePermission();
  const selector = useSelector((state) => state.order);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
    defaultFilters: getInitialQueryFilters(),
  });
  const { toQueryParams } = list;

  const { items, total } = getListPayload(selector);
  const orderListState = selector?.getOrderListData;
  const loading =
    !!selector?.loading || (!orderListState?.data && !orderListState?.error);
  const [buyerDirectory, setBuyerDirectory] = useState({});

  const buyerIds = useMemo(
    () => [
      ...new Set(
        items
          .map((order) => firstDefined(order.buyer_id, order.buyerId))
          .filter(Boolean),
      ),
    ],
    [items],
  );

  useEffect(() => {
    if (!isAdmin || !buyerIds.length) {
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
        if (!active) return;
        setBuyerDirectory(
          buyers.reduce((directory, buyer) => {
            directory[String(buyer.value)] = {
              name: buyer.label,
              email: buyer.meta?.email || "",
            };
            return directory;
          }, {}),
        );
      })
      .catch(() => {
        if (active) setBuyerDirectory({});
      });

    return () => {
      active = false;
    };
  }, [buyerIds, isAdmin]);

  const displayItems = useMemo(
    () =>
      items.map((order) => {
        const buyerId = firstDefined(order.buyer_id, order.buyerId);
        const buyer = buyerId ? buyerDirectory[String(buyerId)] : null;
        if (!buyer) return order;
        return {
          ...order,
          buyerName: firstDefined(
            order.buyerName,
            order.buyer_name,
            buyer.name,
          ),
          buyerEmail: firstDefined(
            order.buyerEmail,
            order.buyer_email,
            buyer.email,
          ),
        };
      }),
    [items, buyerDirectory],
  );

  const baseColumns = useMemo(
    () => createColumns(navigate, isAdmin, !isSeller, !isSeller, isAdmin),
    [isAdmin, isSeller, navigate],
  );

  useEffect(() => {
    const params = toQueryParams();
    dispatch(
      getOrderList({
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        status: params.status || undefined,
        paymentStatus: params.paymentStatus || undefined,
        deliveryStatus: params.deliveryStatus || undefined,
        buyerId: params.buyerId || undefined,
        sellerId: params.sellerId || undefined,
        fromDate: params.fromDate || undefined,
        toDate: params.toDate || undefined,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
      }),
    )
      .unwrap()
      .catch((err) => {
        toast.error(err?.message || "Failed to fetch orders");
      });
  }, [
    dispatch,
    toQueryParams,
    list.page,
    list.pageSize,
    list.search,
    list.sortKey,
    list.sortDir,
    list.filters,
  ]);

  const filterFields = useMemo(
    () =>
      FILTER_FIELDS.filter((field) => {
        if (field.key === "buyerId" && !isAdmin) return false;
        if (field.key === "sellerId" && isSeller) return false;
        return true;
      }),
    [isAdmin, isSeller],
  );

  const columns = [
    ...baseColumns,
    {
      key: "_payout_window",
      label: "Return Window / Payout",
      render: (_, row) => {
        const payout = payoutWindowOf(row);
        if (payout.paid) return <StatusBadge status="paid" dot />;
        if (payout.held)
          return (
            <>
              <StatusBadge status="held" dot />
              <div className="mt-1 text-[11px] text-red-600">
                Return or refund hold
              </div>
            </>
          );
        if (payout.fulfilled)
          return (
            <>
              <StatusBadge status="eligible" dot />
              <div className="mt-1 text-[11px] text-green-700">
                Ready for payout
              </div>
            </>
          );
        return (
          <div>
            <StatusBadge
              status={payout.latestDeadline ? "pending" : "waiting"}
              dot
            />
            <div className="mt-1 text-[11px] text-gray-500">
              {returnWindowLabel(payout.latestDeadline)}
            </div>
            {payout.latestDeadline && (
              <div className="text-[11px] text-gray-400">
                Until {formatDateTime12Hour(payout.latestDeadline)}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Orders List"
        subtitle="Manage and track all customer orders."
        breadcrumbs={[
          { label: isSeller ? "Orders" : "Orders Management" },
          { label: "Orders List" },
        ]}
      />

      <DataTable
        columns={columns}
        data={displayItems}
        loading={loading}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder={
          isAdmin
            ? "Search by order number or buyer…"
            : "Search by order number…"
        }
        emptyText="No orders found."
        emptyIcon={<MdShoppingCart size={40} className="text-gray-200" />}
        requiredModule="orders"
        exportConfig={{ filename: "orders", columns: baseColumns }}
        filterBar={
          <FilterBar
            filters={filterFields}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        }
        rowActions={(row) => {
          const payout = payoutWindowOf(row);
          const group = sellerGroupsOf(row)[0] || {};

          const actions = [
            {
              label: "View Details",
              icon: <MdVisibility size={16} className="text-blue-600" />,
              requiredModule: "orders",
              requiredAction: ACTIONS.VIEW,
              onClick: () => navigate(`/app/orders/view/${orderIdOf(row)}`),
            },
          ];

          if (!isSeller && payout.fulfilled && !payout.paid) {
            actions.push({
              label: "Manage Payout",
              icon: <MdPayments size={16} className="text-green-600" />,
              requiredModule: "sellers/commissions",
              requiredAction: ACTIONS.UPDATE,
              onClick: () => {
                const params = new URLSearchParams({
                  orderId: String(orderIdOf(row)),
                });

                if (group.sellerId) {
                  params.set("sellerId", String(group.sellerId));
                }

                if (group.organizationId) {
                  params.set("organizationId", String(group.organizationId));
                }

                navigate(`/app/seller-finance?${params.toString()}`);
              },
            });
          }

          return actions;
        }}
      />
    </div>
  );
};

export default Orders;
