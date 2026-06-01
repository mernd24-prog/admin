/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import TableData from "../../../components/Atoms/TableData/TableData";
import Loader from "../../../components/Loader/Loader";
import Pagination from "../../../components/Pagination/Pagination";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { getOrderList } from "../../../Redux/orderSlice";
import { getAllUserList } from "../../../Redux/userManagementSlice";

const PAGE_SIZE = 10;

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

const PAYMENT_STATUSES = ["initiated", "authorized", "captured", "failed", "refunded", "cancelled"];
const DELIVERY_STATUSES = ["initiated", "manifested", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed", "cancelled", "rto"];

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const orderIdOf = (order = {}) =>
  firstDefined(order._id, order.id, order.orderId, order.order_no);

const displayStatus = (value = "") =>
  String(value || "N/A").replace(/_/g, " ");

const getListPayload = (selector = {}) => {
  const data = selector?.getOrderListData?.data?.data;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || [],
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
  };
};

const csvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const Orders = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state.order);
  const userSelector = useSelector((state) => state.userManagement);

  const { list, total } = getListPayload(selector);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    paymentStatus: "",
    deliveryStatus: "",
    buyerId: "",
    sellerId: "",
    fromDate: "",
    toDate: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);

  const userListData = useMemo(
    () =>
      (userSelector?.getAllUserListData?.data?.data?.list || []).map((user) => ({
        value: user?._id || user?.id || "",
        label:
          [user?.email, user?.phone].filter(Boolean).join(" - ") ||
          user?._id ||
          user?.id ||
          "Unknown",
      })),
    [userSelector?.getAllUserListData],
  );

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      await dispatch(
        getOrderList({
          page: pageNo,
          limit: PAGE_SIZE,
          ...filters,
        }),
      ).unwrap();
    } catch (err) {
      toast.error(err?.message || err || "Failed to fetch orders");
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, pageNo, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    dispatch(getAllUserList({ searchFields: "email,phone", select: "" }));
  }, [dispatch]);

  const setFilter = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPageNo(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: "",
      status: "",
      paymentStatus: "",
      deliveryStatus: "",
      buyerId: "",
      sellerId: "",
      fromDate: "",
      toDate: "",
    });
    setPageNo(1);
  }, []);

  const exportCsv = useCallback(() => {
    if (!list.length) {
      toast.error("No orders to export");
      return;
    }

    const rows = [
      ["Order Number", "Order ID", "Buyer", "Status", "Payment Status", "Delivery Status", "Total", "Payable", "Created At"],
      ...list.map((order) => [
        firstDefined(order.order_number, order.orderNumber, order.order_no, ""),
        orderIdOf(order),
        firstDefined(order.buyer_id, order.buyerId, order.user_id, ""),
        order.status || "",
        firstDefined(order.payment_status, order.paymentStatus, ""),
        firstDefined(order.delivery_status, order.deliveryStatus, ""),
        firstDefined(order.total_amount, order.totalAmount, 0),
        firstDefined(order.payable_amount, order.payableAmount, 0),
        firstDefined(order.created_at, order.createdAt, ""),
      ]),
    ];

    const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${moment().format("YYYYMMDD-HHmm")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [list]);

  const tableHeadings = [
    "Order",
    "Buyer",
    "Created",
    "Total",
    "Status",
    "Payment",
    "Delivery",
    "Action",
  ];

  const tableRows = list.map((order) => {
    const orderId = orderIdOf(order);
    const orderNumber = firstDefined(order.order_number, order.orderNumber, order.order_no, orderId);
    const buyer = firstDefined(order.buyer_id, order.buyerId, order.user_id, "N/A");
    const totalAmount = Number(firstDefined(order.total_amount, order.totalAmount, 0));
    const createdAt = firstDefined(order.created_at, order.createdAt);

    return [
      <span className="font-medium">{orderNumber}</span>,
      <span>{buyer}</span>,
      <span>{createdAt ? moment(createdAt).format("DD-MM-YYYY HH:mm") : "N/A"}</span>,
      <span>₹ {totalAmount.toFixed(2)}</span>,
      <span className="capitalize">{displayStatus(order.status)}</span>,
      <span className="capitalize">{displayStatus(firstDefined(order.payment_status, order.paymentStatus))}</span>,
      <span className="capitalize">{displayStatus(firstDefined(order.delivery_status, order.deliveryStatus))}</span>,
      <PermissionGuard module="orders" action="view" hide>
        <ActionButtons
          showLinkButton={false}
          showDeleteButton={false}
          showViewButton={false}
          showEditButton={false}
          viewButton={true}
          onViewClick={() => navigate(`/app/orders/view/${orderId}`)}
        />
      </PermissionGuard>,
    ];
  });

  return (
    <>
      <Loader loading={isLoading} />
      <div className="p-3 max-w-7xl mx-auto">
        <h3 className="text-gray-500 text-sm font-semibold py-6">
          <Link to="/app/home">Home</Link> / <span className="text-[#181c32]">Orders</span>
        </h3>

        <section className="bg-white p-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pb-4">
            <input
              className="border rounded px-3 py-2 text-sm"
              placeholder="Search order number"
              value={filters.search}
              onChange={(event) => setFilter("search", event.target.value)}
            />
            <select className="border rounded px-3 py-2 text-sm" value={filters.status} onChange={(event) => setFilter("status", event.target.value)}>
              <option value="">All order statuses</option>
              {ORDER_STATUSES.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}
            </select>
            <select className="border rounded px-3 py-2 text-sm" value={filters.paymentStatus} onChange={(event) => setFilter("paymentStatus", event.target.value)}>
              <option value="">All payment statuses</option>
              {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}
            </select>
            <select className="border rounded px-3 py-2 text-sm" value={filters.deliveryStatus} onChange={(event) => setFilter("deliveryStatus", event.target.value)}>
              <option value="">All delivery statuses</option>
              {DELIVERY_STATUSES.map((status) => <option key={status} value={status}>{displayStatus(status)}</option>)}
            </select>
            <select className="border rounded px-3 py-2 text-sm" value={filters.buyerId} onChange={(event) => setFilter("buyerId", event.target.value)}>
              <option value="">All buyers</option>
              {userListData.map((user) => <option key={user.value} value={user.value}>{user.label}</option>)}
            </select>
            <input className="border rounded px-3 py-2 text-sm" placeholder="Seller ID" value={filters.sellerId} onChange={(event) => setFilter("sellerId", event.target.value)} />
            <input className="border rounded px-3 py-2 text-sm" type="date" value={filters.fromDate} onChange={(event) => setFilter("fromDate", event.target.value)} />
            <input className="border rounded px-3 py-2 text-sm" type="date" value={filters.toDate} onChange={(event) => setFilter("toDate", event.target.value)} />
          </div>

          <div className="flex flex-wrap justify-between gap-2 pb-3">
            <button type="button" className="border px-4 py-2 rounded text-sm" onClick={resetFilters}>Reset</button>
            <PermissionGuard module="orders" action="export" hide>
              <button type="button" className="bg-[#181c32] text-white px-4 py-2 rounded text-sm" onClick={exportCsv}>Export CSV</button>
            </PermissionGuard>
          </div>

          <TableData
            Heading="Orders"
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={false}
            showFilter={false}
            showSummary={false}
            showAddButton={false}
            isHeaderCheckbox={false}
            totalData={total}
          />
          {!isLoading && list.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-500">No orders found</div>
          )}
        </section>

        {total > PAGE_SIZE && (
          <Pagination
            totalPages={Math.ceil(total / PAGE_SIZE)}
            currentPage={pageNo}
            onPageChange={setPageNo}
          />
        )}
      </div>
    </>
  );
};

export default Orders;
