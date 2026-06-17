import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdDeleteSweep, MdOutlineShoppingCart } from "react-icons/md";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { toast } from "react-toastify";
import { dropdownApi } from "../../../_helpers/dropdownApi";

const FILTER_FIELDS = [
  {
    key: "userId",
    type: "asyncDropdown",
    label: "Customer",
    width: "w-52",
    load: (search) => dropdownApi.getBuyers({ keyWord: search, searchFields: "full_name,email" }),
  },
  { key: "productId", type: "text", label: "Product SKU", width: "w-48" },
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller",
    width: "w-52",
    load: (search) => dropdownApi.getSellers({ keyWord: search, searchFields: "full_name,email,businessName" }),
  },
  {
    key: "hasItems",
    type: "select",
    label: "Cart State",
    width: "w-40",
    options: [
      { value: "true", label: "Has items" },
      { value: "false", label: "Empty" },
    ],
  },
  { key: "updatedFrom", type: "date", label: "Updated From", width: "w-40" },
  { key: "updatedTo", type: "date", label: "Updated To", width: "w-40" },
];

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "-");
const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const normalizeListResponse = (response) => {
  const data = response?.data?.data;
  const meta = response?.data?.meta || response?.data?.pagination || {};
  const items = Array.isArray(data) ? data : data?.list || data?.items || [];
  return {
    items,
    total: Number(meta.total ?? data?.total ?? items.length),
  };
};

const normalizeDetailResponse = (response) => response?.data?.data || null;

const Carts = () => {
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "updatedAt", defaultSortDir: "desc" });
  const { toQueryParams } = list;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCart, setSelectedCart] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState(null);
  const [clearReason, setClearReason] = useState("");
  const [clearError, setClearError] = useState("");

  const fetchCarts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = toQueryParams();
      const response = await axiosProvider.get(ENDPOINTS.carts.admin, {
        params: {
          page: params.page,
          limit: params.limit,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          ...(params.search ? { search: params.search } : {}),
          ...(params.userId ? { userId: params.userId } : {}),
          ...(params.productId ? { productId: params.productId } : {}),
          ...(params.sellerId ? { sellerId: params.sellerId } : {}),
          ...(params.hasItems ? { hasItems: params.hasItems } : {}),
          ...(params.updatedFrom ? { updatedFrom: params.updatedFrom } : {}),
          ...(params.updatedTo ? { updatedTo: params.updatedTo } : {}),
        },
      });
      const payload = normalizeListResponse(response);
      setItems(payload.items);
      setTotal(payload.total);
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to load carts";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toQueryParams]);

  useEffect(() => {
    fetchCarts();
  }, [fetchCarts]);

  const openDetail = useCallback(async (cart) => {
    setDetailOpen(true);
    setSelectedCart(cart);
    setDetailLoading(true);
    try {
      const response = await axiosProvider.get(ENDPOINTS.carts.detail(cart._id));
      setSelectedCart(normalizeDetailResponse(response));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load cart details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const requestClear = useCallback((cart) => {
    setClearTarget(cart);
    setClearReason("");
    setClearError("");
  }, []);

  const confirmClear = async () => {
    if (!clearReason.trim() || clearReason.trim().length < 3) {
      setClearError("Reason must be at least 3 characters.");
      return;
    }
    setActionLoading(true);
    try {
      await axiosProvider.delete(ENDPOINTS.carts.detail(clearTarget._id), {
        data: { reason: clearReason.trim() },
      });
      toast.success("Cart cleared successfully.");
      setClearTarget(null);
      setClearReason("");
      fetchCarts();
      if (selectedCart?._id === clearTarget?._id) setDetailOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to clear cart");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "userId",
        label: "Customer",
        sortable: true,
        render: (value) => (
          <span className="block max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap">
            {value || "-"}
          </span>
        ),
      },
      {
        key: "lineCount",
        label: "Lines",
        render: (value) => <span className="font-mono">{Number(value || 0)}</span>,
      },
      {
        key: "itemCount",
        label: "Qty",
        render: (value) => <span className="font-mono">{Number(value || 0)}</span>,
      },
      {
        key: "wishlistCount",
        label: "Wishlist",
        render: (value) => <span className="font-mono">{Number(value || 0)}</span>,
      },
      {
        key: "subtotal",
        label: "Subtotal",
        render: formatMoney,
      },
      {
        key: "items",
        label: "Sample Items",
        render: (value = []) => (
          <div className="max-w-[340px] space-y-1">
            {value.length ? value.map((item, index) => (
              <p key={`${item.productId || index}-${item.variantSku || index}`} className="truncate text-xs text-gray-600">
                {item.title || item.productId} {item.quantity ? `x${item.quantity}` : ""}
              </p>
            )) : <span className="text-xs text-gray-400">No items</span>}
          </div>
        ),
      },
      {
        key: "updatedAt",
        label: "Updated",
        sortable: true,
        render: formatDate,
      },
      {
        key: "status",
        label: "State",
        render: (_, row) => <StatusBadge status={Number(row.lineCount || 0) > 0 ? "active" : "empty"} dot />,
      },
      {
        key: "actions",
        label: "Action",
        render: (_, row) => (
          <div className="flex flex-wrap gap-2">
            <PermissionGuard module="carts" action={ACTIONS.VIEW} hide>
              <button
                type="button"
                className="rounded bg-[var(--admin-blue)] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2e3074]"
                onClick={() => openDetail(row)}
              >
                View
              </button>
            </PermissionGuard>
            <PermissionGuard module="carts" action={ACTIONS.DELETE} hide>
              <button
                type="button"
                className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                onClick={() => requestClear(row)}
                disabled={Number(row.lineCount || 0) === 0 && Number(row.wishlistCount || 0) === 0}
              >
                Clear
              </button>
            </PermissionGuard>
          </div>
        ),
      },
    ],
    [openDetail, requestClear],
  );

  const detailItems = Array.isArray(selectedCart?.items) ? selectedCart.items : [];

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Cart Management"
        subtitle="Review active, abandoned, and empty customer carts before checkout."
        breadcrumbs={[{ label: "Orders Management" }, { label: "Cart Management" }]}
        count={total}
        actions={
          <PermissionGuard module="carts" action={ACTIONS.EXPORT} hide>
            <span className="text-xs text-[var(--admin-muted)]">Exports are available from the table tools.</span>
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
        searchPlaceholder="Search customer, product, SKU..."
        requiredModule="carts"
        emptyText="No carts found."
        onRefresh={fetchCarts}
        exportConfig={{ filename: "customer-carts", columns }}
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

      {detailOpen && (
        <div className="fixed inset-0 z-[9998] flex justify-end bg-black/25" onClick={() => setDetailOpen(false)}>
          <aside
            className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 border-b bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400">Cart Detail</p>
                  <h2 className="text-lg font-semibold text-[var(--admin-ink)]">{selectedCart?.userId || "-"}</h2>
                  <p className="text-xs text-gray-500">Updated {formatDate(selectedCart?.updatedAt)}</p>
                </div>
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => setDetailOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="space-y-5 p-5">
              {detailLoading ? (
                <div className="h-24 animate-pulse rounded bg-gray-100" />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded border p-3">
                      <p className="text-xs text-gray-500">Lines</p>
                      <p className="text-lg font-semibold">{detailItems.length}</p>
                    </div>
                    <div className="rounded border p-3">
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="text-lg font-semibold">{detailItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</p>
                    </div>
                    <div className="rounded border p-3">
                      <p className="text-xs text-gray-500">Wishlist</p>
                      <p className="text-lg font-semibold">{selectedCart?.wishlist?.length || 0}</p>
                    </div>
                    <div className="rounded border p-3">
                      <p className="text-xs text-gray-500">Subtotal</p>
                      <p className="text-lg font-semibold">{formatMoney(detailItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0))}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Cart Items</h3>
                    <div className="overflow-hidden rounded border">
                      {detailItems.length ? detailItems.map((item, index) => (
                        <div key={`${item.productId || index}-${item.variantSku || index}`} className="flex gap-3 border-b p-3 last:border-b-0">
                          {item.image ? (
                            <img src={item.image} alt={item.title || "Product"} className="h-14 w-14 rounded object-cover" />
                          ) : (
                            <span className="flex h-14 w-14 items-center justify-center rounded bg-gray-100">
                              <MdOutlineShoppingCart size={20} className="text-gray-400" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{item.title || item.productId}</p>
                            <p className="text-xs text-gray-500">SKU: {item.variantSku || item.sku || "-"}</p>
                            <p className="text-xs text-gray-500">Seller: {item.sellerId || "-"}</p>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs">
                              <StatusBadge status={item.stockStatus || "unknown"} dot />
                              <span>Available: {item.availableStock ?? "-"}</span>
                              <span>Qty: {item.quantity}</span>
                              <span>{formatMoney(item.price)}</span>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <p className="p-4 text-sm text-gray-500">No cart items.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Wishlist Product IDs</h3>
                    <div className="rounded border p-3 text-xs text-gray-600">
                      {selectedCart?.wishlist?.length ? selectedCart.wishlist.join(", ") : "No wishlist products."}
                    </div>
                  </div>

                  <PermissionGuard module="carts" action={ACTIONS.DELETE} hide>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      onClick={() => requestClear(selectedCart)}
                    >
                      <MdDeleteSweep size={16} /> Clear Cart
                    </button>
                  </PermissionGuard>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      <ConfirmModal
        open={Boolean(clearTarget)}
        onClose={() => {
          setClearTarget(null);
          setClearError("");
        }}
        title="Clear customer cart?"
        message={
          <span>
            This removes all items and wishlist entries from this cart. Enter a reason below.
            <textarea
              className="admin-input admin-textarea mt-3 w-full"
              rows={3}
              value={clearReason}
              onChange={(event) => {
                setClearReason(event.target.value);
                setClearError("");
              }}
              placeholder="Reason for clearing this cart"
            />
            {clearError && <span className="mt-1 block text-xs text-red-600">{clearError}</span>}
          </span>
        }
        variant="danger"
        confirmLabel="Clear Cart"
        loading={actionLoading}
        onConfirm={confirmClear}
      />
    </div>
  );
};

export default Carts;
