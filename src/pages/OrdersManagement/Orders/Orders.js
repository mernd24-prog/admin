import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { getOrderList } from "../../../Redux/orderSlice";
import { useListPage } from "../../../hooks/useListPage";
import { MdShoppingCart } from "react-icons/md";

const ORDER_STATUSES = [
  "pending_payment",
  "payment_failed",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "fulfilled",
  "return_requested",
  "returned",
  "cancelled",
];

const PAYMENT_STATUSES = [
  "initiated",
  "authorized",
  "captured",
  "failed",
  "refunded",
  "cancelled",
];

const DELIVERY_STATUSES = [
  "initiated",
  "manifested",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "cancelled",
  "rto",
];

const FILTER_FIELDS = [
  {
    key: "status",
    type: "select",
    label: "Order Status",
    width: "w-44",
    options: ORDER_STATUSES.map((s) => ({
      value: s,
      label: s.replace(/_/g, " "),
    })),
  },
  {
    key: "paymentStatus",
    type: "select",
    label: "Payment Status",
    width: "w-44",
    options: PAYMENT_STATUSES.map((s) => ({
      value: s,
      label: s.replace(/_/g, " "),
    })),
  },
  {
    key: "deliveryStatus",
    type: "select",
    label: "Delivery Status",
    width: "w-44",
    options: DELIVERY_STATUSES.map((s) => ({
      value: s,
      label: s.replace(/_/g, " "),
    })),
  },
  {
    key: "buyerId",
    type: "text",
    label: "Buyer ID",
    width: "w-52",
  },
  {
    key: "sellerId",
    type: "text",
    label: "Seller ID",
    width: "w-52",
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

const formatMoney = (value) =>
  `₹ ${Number(value || 0).toFixed(2)}`;

const COLUMNS = [
  {
    key: "order_number",
    label: "Order #",
    sortable: true,
    render: (v, row) => (
      <span className="font-mono font-medium text-[var(--admin-navy)]">
        {v || orderIdOf(row)}
      </span>
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
          {date ? moment(date).format("DD MMM YYYY HH:mm") : "N/A"}
        </span>
      );
    },
  },
  {
    key: "buyer_id",
    label: "Buyer",
    render: (v, row) => {
      const name = row.buyerName || row.buyer?.name || row.buyerSnapshot?.name || row.buyer_name;
      const email = row.buyerEmail || row.buyer?.email || row.buyerSnapshot?.email || row.buyer_email;
      const rawId = firstDefined(v, row.buyerId, row.user_id);
      return (
        <div>
          {name && <div className="text-sm font-medium text-gray-800">{name}</div>}
          {email && !name && <div className="text-sm text-gray-700">{email}</div>}
          {email && name && <div className="text-xs text-gray-400">{email}</div>}
          {!name && !email && rawId && (
            <span className="font-mono text-xs text-gray-500">
              {String(rawId).slice(0, 16)}{String(rawId).length > 16 ? "…" : ""}
            </span>
          )}
          {!name && !email && !rawId && <span className="text-gray-400">—</span>}
        </div>
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
    label: "Status",
    render: (v) => <StatusBadge status={v} />,
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
    label: "Delivery",
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
  const selector = useSelector((state) => state.order);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const { items, total } = getListPayload(selector);
  const loading = !!selector?.getOrderListData?.loading;

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

  const columns = [
    ...COLUMNS,
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <PermissionGuard module="orders" action={ACTIONS.VIEW} hide>
          <button
            onClick={() => navigate(`/app/orders/view/${orderIdOf(row)}`)}
            className="px-3 py-1.5 text-xs rounded-lg border border-[var(--admin-navy)] text-[var(--admin-navy)] hover:bg-[var(--admin-navy)] hover:text-white transition-colors"
          >
            View
          </button>
        </PermissionGuard>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
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
        data={items}
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
        exportConfig={{ filename: "orders", columns: COLUMNS }}
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
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
