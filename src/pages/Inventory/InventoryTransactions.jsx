import React, { useCallback, useEffect, useState } from "react";
import { MdHistory } from "react-icons/md";
import { PageHeader, DataTable, FilterBar, StatusBadge } from "../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { toast } from "react-toastify";
import { useListPage } from "../../hooks/useListPage";

const TYPE_OPTIONS = [
  { value: "reservation", label: "Reservation" },
  { value: "release", label: "Release" },
  { value: "sale", label: "Sale" },
  { value: "return", label: "Return" },
  { value: "adjustment", label: "Adjustment" },
  { value: "damage", label: "Damage" },
];

const STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

const FILTER_FIELDS = [
  { key: "type", type: "select", label: "Type", options: TYPE_OPTIONS, width: "w-40" },
  { key: "status", type: "select", label: "Status", options: STATUS_OPTIONS, width: "w-40" },
  { key: "productId", type: "text", label: "Product ID", width: "w-52" },
  { key: "sellerId", type: "text", label: "Seller ID", width: "w-52" },
  { key: "orderId", type: "text", label: "Order ID", width: "w-52" },
];

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const formatMetadata = (value = {}) => {
  if (!value || typeof value !== "object" || !Object.keys(value).length) return "-";
  const reason = value.reason || value.note || value.adjustmentType;
  return reason || JSON.stringify(value);
};

const normalizeResponse = (response) => {
  const data = response?.data?.data || {};
  return {
    items: data.items || [],
    total: Number(data.total || 0),
  };
};

const InventoryTransactions = () => {
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "createdAt", defaultSortDir: "desc" });
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = list.toQueryParams();
      const response = await axiosProvider.get(ENDPOINTS.inventory.transactions, {
        params: {
          limit: params.limit,
          offset: (params.page - 1) * params.limit,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          ...(params.search ? { referenceId: params.search } : {}),
          ...(params.type ? { type: params.type } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.productId ? { productId: params.productId } : {}),
          ...(params.sellerId ? { sellerId: params.sellerId } : {}),
          ...(params.orderId ? { orderId: params.orderId } : {}),
        },
      });
      const payload = normalizeResponse(response);
      setItems(payload.items);
      setTotal(payload.total);
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to load inventory transactions";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const columns = [
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (value) => <StatusBadge status={value || "unknown"} dot />,
    },
    {
      key: "quantity",
      label: "Qty",
      sortable: true,
      render: (value) => (
        <span className={`font-mono font-semibold ${Number(value || 0) < 0 ? "text-red-600" : "text-green-600"}`}>
          {Number(value || 0)}
        </span>
      ),
    },
    { key: "productId", label: "Product ID", sortable: true },
    { key: "variantSku", label: "Variant SKU" },
    { key: "sellerId", label: "Seller ID", sortable: true },
    { key: "referenceType", label: "Reference" },
    { key: "referenceId", label: "Reference ID" },
    { key: "actorRole", label: "Actor" },
    {
      key: "metadata",
      label: "Reason / Note",
      render: (value) => (
        <span className="block max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap">
          {formatMetadata(value)}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: formatDate,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Inventory Transactions"
        subtitle="Audit every stock reservation, release, sale, return, damage, and manual adjustment"
        breadcrumbs={[{ label: "Inventory Management" }, { label: "Inventory Transactions" }]}
        icon={<MdHistory size={20} />}
      />

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        error={error}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder="Search by reference ID..."
        requiredModule="inventory"
        emptyText="No inventory transactions found."
        exportConfig={{ filename: "inventory-transactions", columns }}
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

export default InventoryTransactions;
