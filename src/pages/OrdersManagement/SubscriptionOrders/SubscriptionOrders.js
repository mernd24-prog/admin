import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdSubscriptions } from "react-icons/md";
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

const PAYMENT_STATUSES = [
  "initiated",
  "authorized",
  "captured",
  "failed",
  "refunded",
  "cancelled",
];

const FILTER_FIELDS = [
  {
    key: "status",
    type: "select",
    label: "Payment Status",
    width: "w-44",
    options: PAYMENT_STATUSES.map((s) => ({
      value: s,
      label: s.replace(/_/g, " "),
    })),
  },
  { key: "fromDate", type: "date", label: "From Date", width: "w-36" },
  { key: "toDate", type: "date", label: "To Date", width: "w-36" },
];

const firstDefined = (...values) =>
  values.find((v) => v !== undefined && v !== null && v !== "");

const orderIdOf = (order = {}) =>
  firstDefined(order._id, order.id, order.order_no, order.orderId);

const COLUMNS = [
  {
    key: "order_no",
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
    render: (v, row) => (
      <span className="text-xs text-gray-500">
        {firstDefined(v, row.created_at)
          ? moment(firstDefined(v, row.created_at)).format("DD MMM YYYY HH:mm")
          : "N/A"}
      </span>
    ),
  },
  {
    key: "buyer_id",
    label: "Buyer",
    render: (v, row) => (
      <span className="text-xs font-mono text-gray-500">
        {firstDefined(v, row.buyerId, row.user_id, "—")}
      </span>
    ),
  },
  {
    key: "total_amount",
    label: "Amount",
    sortable: true,
    render: (v, row) => (
      <span className="font-mono font-semibold">
        ₹ {Number(firstDefined(v, row.totalAmount, 0)).toFixed(2)}
      </span>
    ),
  },
  {
    key: "payment_status",
    label: "Payment Status",
    render: (v, row) => (
      <StatusBadge status={firstDefined(v, row.paymentStatus, row.status)} dot />
    ),
  },
];

const getListPayload = (selector = {}) => {
  const data = selector?.getOrderListData?.data?.data;
  if (Array.isArray(data)) return { items: data, total: data.length };
  return {
    items: data?.list || data?.items || [],
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
  };
};

const SubscriptionOrders = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state.order);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });

  const { items, total } = getListPayload(selector);
  const loading = !!selector?.getOrderListData?.loading;

  useEffect(() => {
    const params = list.toQueryParams();
    dispatch(
      getOrderList({
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        status: params.status || undefined,
        fromDate: params.fromDate || undefined,
        toDate: params.toDate || undefined,
        orderType: "subscription",
        sortBy: params.sortBy,
        sortOrder: params.sortDir,
      }),
    )
      .unwrap()
      .catch((err) => toast.error(err?.message || "Failed to load subscription orders"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.pageSize, list.search, list.sortKey, list.sortDir, list.filters]);

  const columns = [
    ...COLUMNS,
    {
      key: "_actions",
      label: "",
      render: (_, row) => (
        <PermissionGuard module="subscriptions" action={ACTIONS.VIEW} hide>
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
        title="Subscription Orders"
        subtitle="Track and manage subscription-based orders"
        breadcrumbs={[
          { label: "Orders Management" },
          { label: "Subscription Orders" },
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
        searchPlaceholder="Search by order number…"
        emptyText="No subscription orders found."
        emptyIcon={<MdSubscriptions size={40} className="text-gray-200" />}
        requiredModule="subscriptions"
        exportConfig={{ filename: "subscription-orders", columns: COLUMNS }}
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

export default SubscriptionOrders;
