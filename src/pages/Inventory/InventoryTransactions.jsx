import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MdClose,
  MdHistory,
  MdLaunch,
  MdOutlineAutorenew,
  MdVisibility,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { PageHeader, DataTable, FilterBar, StatusBadge, ConfirmModal } from "../../components/Shared";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { ACTIONS } from "../../_helpers/usePermission";
import { toast } from "../../utils/toast";
import { useListPage } from "../../hooks/useListPage";

const TYPE_OPTIONS = [
  { value: "reservation", label: "Reservation" },
  { value: "release", label: "Release" },
  { value: "sale", label: "Sale" },
  { value: "restock", label: "Restock" },
  { value: "return", label: "Return" },
  { value: "adjustment", label: "Adjustment" },
  { value: "damage", label: "Damage" },
  { value: "cancellation_release", label: "Cancellation Release" },
  { value: "cancellation_restock", label: "Cancellation Restock" },
];

const STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

const FILTER_FIELDS = [
  { key: "type", type: "select", label: "Type", options: TYPE_OPTIONS, width: "w-40" },
  { key: "status", type: "select", label: "Status", options: STATUS_OPTIONS, width: "w-40" },
  { key: "productId", type: "text", label: "Product", width: "w-52" },
  { key: "orderId", type: "text", label: "Order", width: "w-52" },
];

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const formatType = (value) =>
  String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatMetadata = (value = {}) => {
  if (!value || typeof value !== "object" || !Object.keys(value).length) return "-";
  const reason = value.reason || value.note || value.adjustmentType;
  return reason || JSON.stringify(value);
};

const shortId = (value, length = 12) => {
  if (!value) return "—";
  const text = String(value);
  return text.length > length ? `${text.slice(0, length)}…` : text;
};

const getTransactionReason = (row = {}) =>
  row.metadata?.reason ||
  row.metadata?.note ||
  row.metadata?.adjustmentType ||
  row.referenceType ||
  "-";

const normalizeResponse = (response) => {
  const data = response?.data?.data || {};
  return {
    items: data.items || [],
    total: Number(data.total || 0),
  };
};

const InventoryTransactions = () => {
  const navigate = useNavigate();
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "createdAt", defaultSortDir: "desc" });
  const { toQueryParams } = list;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);

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
        toast.warning(`${result.failed} reservation cleanup attempt${result.failed === 1 ? "" : "s"} failed. Check server logs and audit data.`);
      }
      setCleanupOpen(false);
      fetchTransactions();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to release expired reservations");
    } finally {
      setCleanupLoading(false);
    }
  };

  const openLinkedRoute = (path) => {
    if (!path) return;
    setSelectedTransaction(null);
    navigate(path);
  };

  const getReferenceRoute = (row = {}) => {
    if (row.orderId) return `/app/orders/view/${row.orderId}`;
    if (row.referenceType === "order" && row.referenceId) {
      return `/app/orders/view/${row.referenceId}`;
    }
    if (row.referenceType === "return" && (row.orderId || row.referenceId)) {
      return `/app/returns?${row.orderId ? `orderId=${encodeURIComponent(row.orderId)}` : `returnId=${encodeURIComponent(row.referenceId)}`}`;
    }
    return "";
  };

  const detailRows = useMemo(() => {
    if (!selectedTransaction) return [];
    return [
      ["Transaction ID", selectedTransaction._id || selectedTransaction.id],
      ["Product ID", selectedTransaction.productId],
      ["Variant SKU", selectedTransaction.variantSku],
      ["Seller ID", selectedTransaction.sellerId],
      ["Order ID", selectedTransaction.orderId],
      ["Return ID", selectedTransaction.returnId],
      ["Shipment ID", selectedTransaction.shipmentId],
      ["Reference Type", selectedTransaction.referenceType],
      ["Reference ID", selectedTransaction.referenceId],
      ["Actor ID", selectedTransaction.actorId],
      ["Actor Role", selectedTransaction.actorRole],
      ["Created", formatDate(selectedTransaction.createdAt)],
      ["Updated", formatDate(selectedTransaction.updatedAt)],
    ].filter(([, value]) => value !== undefined && value !== null && value !== "");
  }, [selectedTransaction]);

  const columns = [
    {
      key: "type",
      label: "Movement",
      sortable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <StatusBadge status={value || "unknown"} label={formatType(value)} dot />
          <div className="text-xs text-gray-400">{row.status || "completed"}</div>
        </div>
      ),
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
          <div className="min-w-[170px]">
            {name && <div className="text-sm font-medium text-gray-800 max-w-[180px] truncate">{name}</div>}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (value) navigate(`/app/product-catalog/view/${value}`);
              }}
              disabled={!value}
              className={`font-mono text-xs ${value ? "text-[var(--admin-blue)] hover:underline" : "text-gray-400"}`}
            >
              {shortId(value, 16)}
            </button>
          </div>
        );
      },
    },
    {
      key: "variantSku",
      label: "Variant",
      render: (value) => <span className="font-mono text-xs text-gray-600">{value || "Root stock"}</span>,
    },
    {
      key: "referenceType",
      label: "Reference",
      render: (value, row) => (
        <div className="min-w-[150px]">
          {value && <div className="text-xs font-medium capitalize text-gray-600">{String(value).replace(/_/g, " ")}</div>}
          {(row.orderId || row.referenceId) && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                const path = getReferenceRoute(row);
                if (path) navigate(path);
              }}
              className="font-mono text-xs text-[var(--admin-blue)] hover:underline"
            >
              {shortId(row.orderId || row.referenceId, 16)}
            </button>
          )}
          {!value && !row.referenceId && !row.orderId && "—"}
        </div>
      ),
    },
    {
      key: "metadata",
      label: "Reason",
      render: (_, row) => (
        <span className="block max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap">
          {getTransactionReason(row)}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: formatDate,
    },
    {
      key: "details",
      label: "",
      render: (_, row) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedTransaction(row);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:border-[var(--admin-blue)] hover:text-[var(--admin-blue)]"
        >
          <MdVisibility size={14} />
          Details
        </button>
      ),
    },
  ];

  return (
    <div className="px-4 sm:px-0">
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
        onRowClick={setSelectedTransaction}
        rowClassName="align-top"
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

      {selectedTransaction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close transaction details"
            className="absolute inset-0 bg-[rgba(31,27,95,0.35)] backdrop-blur-[2px]"
            onClick={() => setSelectedTransaction(null)}
          />

          <div className="admin-card relative z-10 flex max-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--admin-line)] px-5 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedTransaction.type || "unknown"} label={formatType(selectedTransaction.type)} dot />
                  <StatusBadge status={selectedTransaction.status || "completed"} dot />
                </div>
                <h2 className="mt-3 text-lg font-semibold text-[var(--admin-ink)]">
                  Inventory Transaction Details
                </h2>
                <p className="mt-1 font-mono text-xs text-gray-400">
                  {selectedTransaction._id || selectedTransaction.id || "No transaction id"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              >
                <MdClose size={22} />
              </button>
            </div>

            <div className="hide-scrollbar overflow-y-auto p-5">
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  ["Type", formatType(selectedTransaction.type)],
                  ["Quantity", selectedTransaction.quantity],
                  ["Variant", selectedTransaction.variantSku || "Root stock"],
                  ["Created", formatDate(selectedTransaction.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-[var(--admin-surface-soft)] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase text-gray-400">{label}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-[var(--admin-ink)]">{value ?? "—"}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {selectedTransaction.productId && (
                  <button
                    type="button"
                    onClick={() => openLinkedRoute(`/app/product-catalog/view/${selectedTransaction.productId}`)}
                    className="admin-btn-secondary"
                  >
                    <MdLaunch size={15} />
                    Open Product
                  </button>
                )}
                {getReferenceRoute(selectedTransaction) && (
                  <button
                    type="button"
                    onClick={() => openLinkedRoute(getReferenceRoute(selectedTransaction))}
                    className="admin-btn-secondary"
                  >
                    <MdLaunch size={15} />
                    Open Reference
                  </button>
                )}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <section className="rounded-lg border border-[var(--admin-line)]">
                  <div className="border-b border-[var(--admin-line)] px-4 py-3 text-sm font-semibold text-[var(--admin-ink)]">
                    Transaction Fields
                  </div>
                  <div className="divide-y divide-gray-100">
                    {detailRows.map(([label, value]) => (
                      <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr]">
                        <p className="text-xs font-semibold uppercase text-gray-400">{label}</p>
                        <p className="break-all font-mono text-xs text-gray-700">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-[var(--admin-line)]">
                  <div className="border-b border-[var(--admin-line)] px-4 py-3 text-sm font-semibold text-[var(--admin-ink)]">
                    Reason & Metadata
                  </div>
                  <div className="space-y-4 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-400">Reason / Note</p>
                      <p className="mt-1 break-words text-sm text-gray-700">
                        {formatMetadata(selectedTransaction.metadata)}
                      </p>
                    </div>
                    <pre className="hide-scrollbar max-h-72 overflow-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-100">
                      {JSON.stringify(selectedTransaction.metadata || {}, null, 2)}
                    </pre>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTransactions;
