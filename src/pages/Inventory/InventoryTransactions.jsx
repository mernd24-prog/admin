import React, { useCallback, useEffect, useState } from "react";
import { MdHistory, MdOutlineAutorenew } from "react-icons/md";
import { PageHeader, DataTable, FilterBar, StatusBadge, ConfirmModal } from "../../components/Shared";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { ACTIONS } from "../../_helpers/usePermission";
import { toast } from "react-toastify";
import { useListPage } from "../../hooks/useListPage";

const TYPE_OPTIONS = [
  { value: "reservation", label: "Reservation" },
  { value: "release", label: "Release" },
  { value: "sale", label: "Sale" },
  { value: "restock", label: "Restock" },
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
  const { toQueryParams } = list;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = toQueryParams();
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
  }, [toQueryParams]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const releaseExpiredReservations = async () => {
    setCleanupLoading(true);
    try {
      const response = await axiosProvider.post(
        ENDPOINTS.inventory.releaseExpiredReservations,
        {
          limit: 100,
          reason: "admin_expired_reservation_cleanup",
        },
      );
      const result = response?.data?.data || {};
      toast.success(
        `Released ${result.released || 0} expired reservation${Number(result.released || 0) === 1 ? "" : "s"}.`,
      );
      if (result.failed) {
        toast.warn(`${result.failed} reservation cleanup attempt${result.failed === 1 ? "" : "s"} failed. Check server logs and audit data.`);
      }
      setCleanupOpen(false);
      fetchTransactions();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to release expired reservations");
    } finally {
      setCleanupLoading(false);
    }
  };

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
    {
      key: "productId",
      label: "Product",
      sortable: true,
      render: (value, row) => {
        const name = row.productTitle || row.productName || row.product?.title || row.product?.name;
        return (
          <div>
            {name && <div className="text-sm font-medium text-gray-800 max-w-[180px] truncate">{name}</div>}
            <div className={`font-mono text-xs ${name ? "text-gray-400" : "text-gray-700"}`}>
              {value ? String(value).slice(0, 16) + (String(value).length > 16 ? "…" : "") : "—"}
            </div>
          </div>
        );
      },
    },
    { key: "variantSku", label: "Variant SKU" },
    {
      key: "sellerId",
      label: "Seller",
      sortable: true,
      render: (value, row) => {
        const name = row.sellerName || row.seller?.name || row.seller?.businessName;
        return (
          <div>
            {name && <div className="text-sm font-medium text-gray-800 max-w-[160px] truncate">{name}</div>}
            <div className={`font-mono text-xs ${name ? "text-gray-400" : "text-gray-700"}`}>
              {value ? String(value).slice(0, 16) + (String(value).length > 16 ? "…" : "") : "—"}
            </div>
          </div>
        );
      },
    },
    {
      key: "referenceType",
      label: "Reference",
      render: (value, row) => (
        <div>
          {value && <div className="text-xs font-medium capitalize text-gray-600">{String(value).replace(/_/g, " ")}</div>}
          {row.referenceId && (
            <div className="font-mono text-xs text-gray-400">
              {String(row.referenceId).slice(0, 16) + (String(row.referenceId).length > 16 ? "…" : "")}
            </div>
          )}
          {!value && !row.referenceId && "—"}
        </div>
      ),
    },
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
        actions={
          <PermissionGuard module="inventory" action={ACTIONS.ADJUST} hide>
            <button
              type="button"
              onClick={() => setCleanupOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-[var(--admin-navy)] text-sm font-semibold rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors"
            >
              <MdOutlineAutorenew size={16} /> Release Expired
            </button>
          </PermissionGuard>
        }
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

      <ConfirmModal
        open={cleanupOpen}
        onClose={() => setCleanupOpen(false)}
        onConfirm={releaseExpiredReservations}
        title="Release expired reservations?"
        message="This will release stock held by expired unpaid orders and add release entries to the inventory transaction audit."
        variant="warning"
        confirmLabel="Release"
        loading={cleanupLoading}
      />
    </div>
  );
};

export default InventoryTransactions;
