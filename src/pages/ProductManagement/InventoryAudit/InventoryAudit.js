import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdRefresh, MdSearch, MdTune } from "react-icons/md";
import { PageHeader, StatusBadge, DataTable } from "../../../components/Shared";
import { getInventoryTransactions } from "../../../Redux/productSlice";

const TRANSACTION_TYPES = [
  { value: "", label: "All Types" },
  { value: "reservation", label: "Reservation" },
  { value: "commitment", label: "Commitment" },
  { value: "release", label: "Release" },
  { value: "restock", label: "Restock" },
  { value: "adjustment", label: "Adjustment" },
  { value: "deduction", label: "Deduction" },
  { value: "addition", label: "Addition" },
  { value: "damage", label: "Damage" },
];

const TYPE_BADGE = {
  reservation: "info",
  commitment: "warning",
  release: "success",
  restock: "success",
  adjustment: "default",
  deduction: "error",
  addition: "success",
  damage: "error",
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

const shortId = (value = "") => {
  const text = String(value || "");
  return text.length > 14 ? `${text.slice(0, 10)}...` : text || "—";
};

const unwrapTransactions = (data) => {
  const root = data?.data?.data || data?.data || {};
  return Array.isArray(root) ? root : root.items || root.list || root.transactions || [];
};

const COLUMNS = [
  {
    key: "createdAt",
    label: "Date & Time",
    render: (value) => formatDate(value),
  },
  {
    key: "type",
    label: "Type",
    render: (value) => <StatusBadge status={value} tone={TYPE_BADGE[value]} dot />,
  },
  {
    key: "productId",
    label: "Product",
    render: (_, row) => (
      <span className="font-mono text-xs text-[#202337]">
        {shortId(row?.productId || row?.product_id)}
      </span>
    ),
  },
  {
    key: "variantSku",
    label: "SKU / Variant",
    render: (value) => <span className="text-xs">{value || "—"}</span>,
  },
  {
    key: "quantityChange",
    label: "Qty Change",
    render: (value, row) => {
      const qty = Number(value ?? row?.quantity ?? row?.adjustment ?? 0);
      const color = qty >= 0 ? "text-[#208a3c]" : "text-[#d92d20]";
      return <span className={`font-semibold ${color}`}>{qty >= 0 ? `+${qty}` : qty}</span>;
    },
  },
  {
    key: "stockBefore",
    label: "Before",
    render: (value) => <span className="font-mono text-xs">{value ?? "—"}</span>,
  },
  {
    key: "stockAfter",
    label: "After",
    render: (value) => <span className="font-mono text-xs">{value ?? "—"}</span>,
  },
  {
    key: "reason",
    label: "Reason / Note",
    render: (value, row) => (
      <span className="block max-w-[200px] truncate text-xs text-[#65718b]">
        {value || row?.note || row?.reference || "—"}
      </span>
    ),
  },
  {
    key: "orderId",
    label: "Order",
    render: (value, row) => (
      <span className="font-mono text-xs">
        {shortId(value || row?.order_id || row?.referenceId || row?.reference_id)}
      </span>
    ),
  },
  {
    key: "actorId",
    label: "Actor",
    render: (value, row) => (
      <span className="text-xs text-[#65718b]">{shortId(value || row?.actor_id || row?.userId)}</span>
    ),
  },
];

const InventoryAudit = () => {
  const dispatch = useDispatch();
  const transactionsState = useSelector((s) => s.products?.getInventoryTransactionsData);

  const [filters, setFilters] = useState({ productId: "", sellerId: "", type: "", orderId: "" });
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const transactions = unwrapTransactions(transactionsState);
  const loading = transactionsState?.loading;

  const loadTransactions = useCallback(async () => {
    try {
      await dispatch(
        getInventoryTransactions({
          ...filters,
          limit,
          offset,
        }),
      ).unwrap();
    } catch (error) {
      toast.error(error || "Failed to load inventory transactions");
    }
  }, [dispatch, filters, offset]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOffset(0);
  };

  const inputCls = "min-h-[36px] rounded-md border border-[#E6E6E6] px-3 text-sm outline-none focus:border-[#2f6fed]";

  return (
    <div className="min-h-screen bg-[#f4f6fb] p-3 md:p-5">
      <PageHeader
        title="Inventory Audit Log"
        subtitle="Full history of all stock movements — reservations, adjustments, restock, and deductions"
        breadcrumbs={[
          { label: "Home", to: "/app/home" },
          { label: "Product Management" },
          { label: "Inventory Audit" },
        ]}
        actions={(
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={loadTransactions}
            disabled={loading}
          >
            <MdRefresh size={17} /> Refresh
          </button>
        )}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[#E6E6E6] bg-white p-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[#202337]">
          <MdTune size={17} /> Filters
        </span>
        <input
          className={inputCls}
          placeholder="Product ID"
          value={filters.productId}
          onChange={(e) => updateFilter("productId", e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="Seller ID"
          value={filters.sellerId}
          onChange={(e) => updateFilter("sellerId", e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="Order ID"
          value={filters.orderId}
          onChange={(e) => updateFilter("orderId", e.target.value)}
        />
        <select
          className={inputCls}
          value={filters.type}
          onChange={(e) => updateFilter("type", e.target.value)}
        >
          {TRANSACTION_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2f6fed] px-4 text-sm font-medium text-white"
          onClick={loadTransactions}
        >
          <MdSearch size={16} /> Search
        </button>
      </div>

      {/* Summary info */}
      <p className="mb-3 text-xs text-[#65718b]">
        Showing {transactions.length} transactions.
        {" "}Stock changes show quantity delta (+add / −remove). Each row records the snapshot before and after.
      </p>

      <DataTable
        columns={COLUMNS}
        data={transactions}
        loading={loading}
        emptyMessage="No inventory transactions found. Adjust filters and search."
        rowKey={(row) => row?._id || row?.id || Math.random()}
      />

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          className="admin-btn-secondary"
          onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
          disabled={offset === 0 || loading}
        >
          ← Previous
        </button>
        <span className="text-xs text-[#65718b]">Page {Math.floor(offset / limit) + 1}</span>
        <button
          type="button"
          className="admin-btn-secondary"
          onClick={() => setOffset((prev) => prev + limit)}
          disabled={transactions.length < limit || loading}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default InventoryAudit;
