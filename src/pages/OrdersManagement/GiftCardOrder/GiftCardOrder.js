/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdCardGiftcard, MdVisibility } from "react-icons/md";
import { PageHeader, DataTable, StatusBadge } from "../../../components/Shared";
import { getOrderList } from "../../../Redux/orderSlice";
import { getAllUserList } from "../../../Redux/userManagementSlice";
import useDropdownOptions from "../../../hooks/useDropdownOptions";

const PAGE_SIZE = 10;

const firstDefined = (...values) =>
  values.find((v) => v !== undefined && v !== null && v !== "");

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COLUMNS = [
  {
    key: "order_no",
    label: "Order ID",
    render: (_, row) => (
      <span className="font-mono text-xs capitalize">
        {firstDefined(row?.order_no, row?.id, row?._id, "N/A")}
      </span>
    ),
  },
  {
    key: "buyer",
    label: "Buyer",
    render: (_, row) => {
      const buyer =
        typeof row?.user_id === "object"
          ? [row?.user_id?.phone, row?.user_id?.email].filter(Boolean).join(" / ") || "N/A"
          : firstDefined(row?.buyerId, row?.buyer_id, row?.user_id, "N/A");
      return <span className="text-sm">{buyer}</span>;
    },
  },
  {
    key: "createdAt",
    label: "Order Date & Time",
    render: (v, row) => {
      const ts = v || row?.created_at;
      return (
        <span className="text-xs text-gray-500">
          {ts ? new Date(ts).toLocaleString("en-IN") : "N/A"}
        </span>
      );
    },
  },
  {
    key: "totalAmount",
    label: "Amount",
    render: (_, row) => (
      <span className="font-mono text-sm">
        {formatCurrency(firstDefined(row?.totalAmount, row?.total_amount, row?.payableAmount, row?.payable_amount, 0))}
      </span>
    ),
  },
  {
    key: "paymentStatus",
    label: "Payment Status",
    render: (_, row) => {
      const status = firstDefined(row?.paymentStatus, row?.status, "");
      return status ? (
        <StatusBadge status={status === "paid" || status === "completed" ? "active" : "inactive"} label={status} dot />
      ) : (
        <span className="text-gray-400">—</span>
      );
    },
  },
];

const GiftCardOrder = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const orderSelector = useSelector((state) => state.order);
  const userSelector = useSelector((state) => state.userManagement);

  const listPayload = orderSelector?.getOrderListData?.data?.data || {};
  const list = listPayload?.list || [];
  const total = Number(listPayload?.total || 0);

  const [filters, setFilters] = useState({
    search: "",
    activationStatus: "",
    dateFrom: "",
    dateTo: "",
    sellerName: "",
  });
  const [pageNo, setPageNo] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const paymentStatuses = useDropdownOptions("payment-statuses");

  const userListData = useMemo(
    () =>
      (userSelector?.getAllUserListData?.data?.data?.list || []).map((user) => ({
        value: user?._id || "",
        label: [user?.email, user?.phone].filter(Boolean).join(" - ") || user?._id || "Unknown",
      })),
    [userSelector?.getAllUserListData],
  );

  const fetchOrders = useCallback(async (overrideFilters) => {
    const active = overrideFilters || filters;
    try {
      setIsLoading(true);
      await dispatch(
        getOrderList({
          page: pageNo,
          limit: PAGE_SIZE,
          status: active.activationStatus || undefined,
          fromDate: active.dateFrom || undefined,
          toDate: active.dateTo || undefined,
          userId: active.sellerName || undefined,
          keyWord: active.search || undefined,
          orderType: "gift_card",
        }),
      ).unwrap();
    } catch (err) {
      toast.error(err?.message || "Failed to fetch gift card orders");
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, pageNo, filters]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    dispatch(getAllUserList({ searchFields: "email,phone", select: "" }));
  }, [dispatch]);

  const handleSearch = useCallback((value) => {
    setFilters((prev) => ({ ...prev, search: value || "" }));
    setPageNo(1);
  }, []);

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const handleApply = () => {
    setPageNo(1);
    fetchOrders();
  };

  const handleClear = () => {
    const cleared = { search: "", activationStatus: "", dateFrom: "", dateTo: "", sellerName: "" };
    setFilters(cleared);
    setPageNo(1);
    fetchOrders(cleared);
  };

  const rowActions = (row) => [
    {
      label: "View",
      icon: <MdVisibility size={14} />,
      onClick: () => {
        const orderId = firstDefined(row?._id, row?.id, row?.order_no, row?.orderId);
        if (!orderId) { toast.error("Order ID not found"); return; }
        navigate(`/app/orders/view/${orderId}`);
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Gift Card Orders"
        subtitle="View and manage all gift card order transactions"
        breadcrumbs={[{ label: "Orders Management" }, { label: "Gift Card Orders" }]}
      />

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            className="min-h-[38px] rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
            value={filters.activationStatus}
            onChange={(e) => updateFilter("activationStatus", e.target.value)}
          >
            <option value="">All Payment Statuses</option>
            {paymentStatuses.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            className="min-h-[38px] rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
            value={filters.sellerName}
            onChange={(e) => updateFilter("sellerName", e.target.value)}
          >
            <option value="">All Buyers</option>
            {userListData.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>

          <input
            type="date"
            className="min-h-[38px] rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
            value={filters.dateFrom}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
            placeholder="From date"
          />
          <input
            type="date"
            className="min-h-[38px] rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
            value={filters.dateTo}
            onChange={(e) => updateFilter("dateTo", e.target.value)}
            placeholder="To date"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 min-h-[38px] px-4 text-sm rounded-lg bg-[var(--admin-gold)] text-white hover:bg-[var(--admin-gold-dark)]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="min-h-[38px] px-4 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <DataTable
        columns={COLUMNS}
        data={list}
        loading={isLoading}
        totalCount={total}
        page={pageNo}
        pageSize={PAGE_SIZE}
        onPageChange={setPageNo}
        onSearch={handleSearch}
        rowActions={rowActions}
        searchPlaceholder="Search by order ID..."
        emptyText="No gift card orders found."
        emptyIcon={<MdCardGiftcard size={40} className="text-gray-200" />}
        requiredModule="orders"
      />
    </div>
  );
};

export default GiftCardOrder;
