import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdClose, MdFilterList, MdGridView, MdRefresh } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { PageHeader, DataTable, StatusBadge, ExportButton } from "../../components/Shared";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { toast } from "../../utils/toast";
import { useListPage } from "../../hooks/useListPage";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  getAvailableStock,
  getInventoryStatus,
  getStockTextClass,
  useLowStockThreshold,
} from "./lowStockThreshold";

const FILTER_FIELDS = [
  {
    key: "stockStatus",
    type: "select",
    label: "Stock Status",
    width: "w-44",
    options: [
      { value: "in_stock", label: "In Stock" },
      { value: "low_stock", label: "Low Stock" },
      { value: "out_of_stock", label: "Out of Stock" },
    ],
  },
  {
    key: "status",
    type: "select",
    label: "Product Status",
    width: "w-44",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "pending_approval", label: "Pending Approval" },
      { value: "draft", label: "Draft" },
    ],
  },
];

const createFlatColumns = (lowStockThreshold) => [
  { key: "productTitle", label: "Product", sortable: true },
  { key: "productSku", label: "Product SKU" },
  { key: "variantTitle", label: "Variant" },
  { key: "variantSku", label: "Variant SKU" },
  { key: "category", label: "Category" },
  {
    key: "stock",
    label: "Stock",
    sortable: true,
    render: (v) => <span className="font-mono font-medium">{v ?? 0}</span>,
  },
  {
    key: "reserved",
    label: "Reserved",
    render: (v) => <span className="font-mono text-gray-400">{v ?? 0}</span>,
  },
  {
    key: "available",
    label: "Available",
    render: (_, row) => {
      const avail = getAvailableStock(row);
      return (
        <span className={`font-mono font-semibold ${getStockTextClass(avail, lowStockThreshold)}`}>
          {avail}
        </span>
      );
    },
  },
  {
    key: "variantStatus",
    label: "Status",
    render: (_, row) => {
      return <StatusBadge status={getInventoryStatus(row, lowStockThreshold)} dot />;
    },
  },
];

const flattenVariants = (products) => {
  const rows = [];
  (products || []).forEach((p) => {
    (p.variants || []).forEach((v) => {
      rows.push({
        _id: `${p._id}-${v._id || v.sku}`,
        productId: p._id,
        productTitle: p.title,
        productSku: p.sku || "—",
        variantTitle: v.title || "—",
        variantSku: v.sku || "—",
        category: (typeof p.category === "object"
          ? (p.category?.name || p.category?.title || p.category?.label)
          : p.category) || "—",
        stock: v.stock ?? 0,
        reserved: v.reservedStock ?? 0,
        variantStatus: v.status || p.status,
      });
    });
  });
  return rows;
};

const VariantInventory = () => {
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "productTitle" });
  const navigate = useNavigate();
  const [flatRows, setFlatRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { toQueryParams } = list;
  const {
    lowStockThreshold,
    setLowStockThreshold,
    resetLowStockThreshold,
  } = useLowStockThreshold();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = toQueryParams();
      const res = await axiosProvider.get(ENDPOINTS.products.listForPanel, {
        params: {
          page: params.page,
          limit: params.limit,
          q: params.search || undefined,
          productType: "variable",
          hasVariants: true,
          includeVariants: true,
          status: params.status || undefined,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          includeAllStatuses: true,
        },
      });

      const data = res?.data?.data;
      const items = Array.isArray(data)
        ? data
        : data?.products || data?.list || data?.items || [];
      const totalCount = Number(
        res?.data?.pagination?.total ??
          res?.data?.meta?.total ??
          data?.total ??
          items.length,
      );
      setFlatRows(flattenVariants(items));
      setTotal(totalCount);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load variant inventory";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toQueryParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRows = useMemo(() => {
    if (!list.filters.stockStatus) return flatRows;
    return flatRows.filter(
      (row) => getInventoryStatus(row, lowStockThreshold) === list.filters.stockStatus,
    );
  }, [flatRows, list.filters.stockStatus, lowStockThreshold]);

  const columns = useMemo(
    () => createFlatColumns(lowStockThreshold),
    [lowStockThreshold],
  );

  return (
    <div>
      <PageHeader
        title="Variant Inventory"
        subtitle="Per-variant stock levels for all variable products"
        breadcrumbs={[
          { label: "Inventory Management" },
          { label: "Variant Inventory" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              data={flatRows}
              filename="variant-inventory"
              requiredModule="inventory"
            />
            <PermissionGuard module="inventory" action={ACTIONS.ADJUST}>
              <button
                onClick={() => navigate("/app/inventory-adjustment")}

              >
                Adjust Stock
              </button>
            </PermissionGuard>
            <button
              onClick={fetchData}

            >
              <MdRefresh size={16} /> Refresh
            </button>
          </div>
        }
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Products", value: total },
          {
            label: "Total Variants",
            value: flatRows.length,
            color: "text-[var(--admin-gold)]",
          },
          {
            label: "Low Stock",
            value: flatRows.filter(
              (row) => getInventoryStatus(row, lowStockThreshold) === "low_stock",
            ).length,
            color: "text-red-600",
          },
          {
            label: "Out of Stock",
            value: flatRows.filter((row) => getInventoryStatus(row, lowStockThreshold) === "out_of_stock").length,
            color: "text-red-500",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white border border-[#e7e7e7] bg-gradient-to-br from-white to-[#F4F1ED] rounded-xl shadow-sm p-4"
          >
            <div
              className={`text-xl md:text-3xl font-bold ${card.color || "text-[var(--admin-navy)]"}`}
            >
              {loading ? (
                <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                card.value
              )}
            </div>
            <div className="text-sm md:text-base font-semibold text-gray-500">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredRows}
        loading={loading}
        totalCount={list.filters.stockStatus ? filteredRows.length : total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={(q) => list.setSearch(q)}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        error={error}
        searchPlaceholder="Search products or variants…"
        requiredModule="inventory"
        emptyText="No variable products with variants found."
        emptyIcon={<MdGridView size={40} className="text-gray-200" />}
        filterBar={
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex w-40 flex-col gap-0.5">
                <label className="px-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  Low stock limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(event) => setLowStockThreshold(event.target.value)}
                  className="admin-input py-1.5 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={resetLowStockThreshold}
                className="mb-0.5 text-xs font-semibold text-gray-500 hover:text-[var(--admin-navy)]"
              >
                Default {DEFAULT_LOW_STOCK_THRESHOLD}
              </button>
              <p className="mb-1.5 text-xs text-gray-400">
                Variant Low Stock uses this available stock limit.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex items-center gap-1.5 self-end pb-1.5 text-[var(--admin-muted)]">
                <MdFilterList size={16} />
                {list.activeFilterCount > 0 && (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--admin-gold)] text-[9px] font-bold text-[var(--admin-navy)]">
                    {list.activeFilterCount}
                  </span>
                )}
              </div>
              {FILTER_FIELDS.map((field) => (
                <div key={field.key} className={`flex flex-col gap-0.5 ${field.width || "w-36"}`}>
                  <label className="px-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    {field.label}
                  </label>
                  <select
                    value={list.filters[field.key] ?? ""}
                    onChange={(event) => list.setFilter(field.key, event.target.value)}
                    className="admin-input py-1.5 text-sm"
                  >
                    <option value="">All {field.label}</option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {list.activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={list.clearFilters}
                  disabled={loading}
                  className="mb-0.5 flex items-center gap-1 whitespace-nowrap text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  <MdClose size={13} />
                  Clear filters
                </button>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
};

export default VariantInventory;
