import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../../../utils/toast";
import { formatDateTime, formatCurrency } from "../../../utils/formatters";
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
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";
import { getOrderList } from "../../../Redux/orderSlice";
import { useListPage } from "../../../hooks/useListPage";
import { MdShoppingCart, MdVisibility } from "react-icons/md";
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
    load: (search) => dropdownApi.getBuyers({ keyWord: search, searchFields: "full_name,email" }),
  },
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller",
    width: "w-52",
    load: (search) => dropdownApi.getSellers({ keyWord: search, searchFields: "full_name,email,businessName" }),
  },
  {
    key: "fromDate",
    type: "date",
    label: "From Date",
    width: "w-36",
  },
  {
    key: "toDate",
    type: "date",
    label: "To Date",
    width: "w-36",
  },
];

const firstDefined = (...values) =>
  values.find((v) => v !== undefined && v !== null && v !== "");

const orderIdOf = (order = {}) =>
  firstDefined(order._id, order.id, order.orderId, order.order_no);

const formatMoney = (value) => formatCurrency(value, "—");

const createColumns = (navigate) => [
  {
    key: "order_number",
    label: "Order #",
    sortable: true,
    render: (v, row) => (
      <button
        type="button"
        onClick={() => navigate(`/app/orders/view/${orderIdOf(row)}`)}
        className="font-mono font-medium text-[var(--admin-navy)] hover:underline"
      >
        {v || orderIdOf(row)}
      </button>
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
          {formatDateTime(date)}
        </span>
      );
    },
  },
  {
    key: "buyer_id",
    label: "Buyer",
    render: (v, row) => {
      const buyer = row.relations?.buyer || row.buyer || row.buyerSnapshot || {};
      const name = row.buyerName || buyer.displayName || buyer.fullName || buyer.name || row.buyer_name;
      const email = row.buyerEmail || buyer.email || row.buyer_email;
      const buyerId = firstDefined(buyer.id, buyer._id, row.buyer_id, row.buyerId);
      return (
        <button
          type="button"
          disabled={!buyerId}
          onClick={() => buyerId && navigate(`/app/users/view/${buyerId}`)}
          className="text-left enabled:hover:underline"
        >
          {name && <div className="text-sm font-medium text-gray-800">{name}</div>}
          {email && !name && <div className="text-sm text-gray-700">{email}</div>}
          {email && name && <div className="text-xs text-gray-400">{email}</div>}
          {!name && !email && <span className="text-gray-400">Customer details unavailable</span>}
        </button>
      );
    },
  },
  {
    key: "seller",
    label: "Seller / Org",
    render: (_, row) => {
      const sellerName = firstDefined(
        row.sellerName,
        row.relations?.sellers?.[0]?.displayName,
        row.relations?.sellers?.[0]?.businessName,
        row.seller?.name,
        row.sellerSnapshot?.name,
        row.seller_snapshot?.name,
      );
      const organizationName = firstDefined(
        row.organizationName,
        row.organization?.legalName,
        row.organizationSnapshot?.legalName,
        row.organization_snapshot?.legalName,
        row.organizationSnapshot?.storeDisplayName,
        row.organization_snapshot?.storeDisplayName,
      );
      const sellerId = firstDefined(
        row.sellerId,
        row.seller_id,
        row.relations?.sellers?.[0]?.id,
        row.relations?.sellers?.[0]?._id,
        row.seller?.id,
        row.seller?._id,
      );
      const organizationId = firstDefined(row.organizationId, row.organization_id);
      if (!sellerName && !organizationName && !sellerId && !organizationId) {
        return <span className="text-gray-400">—</span>;
      }
      return (
        <button
          type="button"
          disabled={!sellerId}
          onClick={() => sellerId && navigate(`/app/seller/view/${sellerId}`)}
          className="text-left enabled:hover:underline"
        >
          <div className="text-sm font-medium text-gray-800">
            {organizationName || sellerName || "Seller"}
          </div>
          {sellerName && organizationName && (
            <div className="text-xs text-gray-400">{sellerName}</div>
          )}
          {!sellerName && sellerId && <div className="text-xs text-gray-400">Seller details unavailable</div>}
        </button>
      );
    },
  },
  {
    key: "items",
    label: "Items",
    render: (v, row) => {
      const count = Array.isArray(v)
        ? v.length
        : firstDefined(row.itemCount, row.item_count, "—");
      return <span className="font-mono">{count}</span>;
    },
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
  {
    key: "fulfillment_status",
    label: "Fulfilment",
    render: (v, row) => (
      <StatusBadge
        status={firstDefined(v, row.fulfilmentStatus, row.fulfillmentStatus, row.status)}
        dot
      />
    ),
  },
  {
    key: "payment_status",
    label: "Payment",
    render: (v, row) => (
      <StatusBadge
        status={firstDefined(v, row.paymentStatus)}
        dot
      />
    ),
  },
  {
    key: "delivery_status",
    label: "Shipment Status",
    render: (v, row) => {
      const s = firstDefined(v, row.deliveryStatus);
      return s ? <StatusBadge status={s} dot /> : <span className="text-gray-400">—</span>;
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
  const { isSeller } = usePermission();
  const selector = useSelector((state) => state.order);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const { items, total } = getListPayload(selector);
  const orderListState = selector?.getOrderListData;
  const loading =
    !!selector?.loading ||
    (!orderListState?.data && !orderListState?.error);
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
    if (!buyerIds.length) {
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
  }, [buyerIds]);

  const displayItems = useMemo(
    () =>
      items.map((order) => {
        const buyerId = firstDefined(order.buyer_id, order.buyerId);
        const buyer = buyerId ? buyerDirectory[String(buyerId)] : null;
        if (!buyer) return order;
        return {
          ...order,
          buyerName: firstDefined(order.buyerName, order.buyer_name, buyer.name),
          buyerEmail: firstDefined(order.buyerEmail, order.buyer_email, buyer.email),
        };
      }),
    [items, buyerDirectory],
  );

  const baseColumns = useMemo(() => createColumns(navigate), [navigate]);

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
    ).unwrap().catch((err) => {
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
    () => (isSeller ? FILTER_FIELDS.filter((field) => field.key !== "sellerId") : FILTER_FIELDS),
    [isSeller],
  );

  const columns = [
    ...baseColumns,
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGuard module="orders" action={ACTIONS.VIEW} hide>
            <button
              type="button"
              onClick={() => navigate(`/app/orders/view/${orderIdOf(row)}`)}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--admin-navy)] px-2.5 py-1.5 text-xs font-medium text-[var(--admin-navy)] transition-colors hover:bg-[var(--admin-navy)] hover:text-white"
            >
              <MdVisibility size={15} /> View Details
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle="Manage and track all customer orders"
        breadcrumbs={[
          { label: "Orders Management" },
          { label: "Orders" },
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
        searchPlaceholder="Search by order number or buyer…"
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
      />

    </div>
  );
};

export default Orders;
