import React, { useEffect, useMemo, useState } from "react";
import {
  MdInventory,
  MdWarning,
  MdAddCircleOutline,
  MdTrendingDown,
  MdTune,
  MdVisibility,
  MdFilterList,
  MdClose,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import {
  PageHeader,
  DataTable,
  StatusBadge,
} from "../../components/Shared";
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

const STAT_CARDS = [
  { label: "Total SKUs",    key: "totalSkus",   icon: MdInventory,    color: "text-[var(--admin-gold)] bg-[var(--admin-blue-soft)]" },
  { label: "In Stock",      key: "inStock",      icon: MdInventory,    color: "text-green-600 bg-green-50" },
  { label: "Low Stock",     key: "lowStock",     icon: MdWarning,      color: "text-red-600 bg-red-50" },
  { label: "Out of Stock",  key: "outOfStock",   icon: MdTrendingDown, color: "text-red-600 bg-red-50" },
];

const FILTER_FIELDS = [
  {
    key:     "stockStatus",
    type:    "select",
    label:   "Stock Status",
    width:   "w-44",
    options: [
      { value: "in_stock",     label: "In Stock" },
      { value: "low_stock",    label: "Low Stock" },
      { value: "out_of_stock", label: "Out of Stock" },
    ],
  },
];

const createColumns = (lowStockThreshold) => [
  { key: "title",     label: "Product",   sortable: true },
  { key: "sku",       label: "SKU",       sortable: true },
  { key: "category",  label: "Category" },
  {
    key: "stock", label: "Stock", sortable: true,
    render: (v) => <span className="font-mono font-medium">{v ?? 0}</span>,
  },
  {
    key: "reserved", label: "Reserved",
    render: (v) => <span className="font-mono text-gray-400">{v ?? 0}</span>,
  },
  {
    key: "available", label: "Available",
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
    key: "status", label: "Status",
    render: (_, row) => {
      const status = getInventoryStatus(row, lowStockThreshold);
      return <StatusBadge status={status} dot />;
    },
  },
];

const InventoryOverview = () => {
  const list    = useListPage({ defaultPageSize: 20, defaultSortKey: "title" });
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [stats,    setStats]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [error,    setError]    = useState("");
  const {
    lowStockThreshold,
    setLowStockThreshold,
    resetLowStockThreshold,
  } = useLowStockThreshold();

  const normalizeProductListResponse = (response) => {
    const data = response?.data?.data;
    const pagination = response?.data?.pagination || response?.data?.meta?.pagination || response?.data?.meta;
    const items = Array.isArray(data) ? data : data?.products || data?.list || data?.items || [];
    return {
      items,
      total: Number(pagination?.total ?? data?.total ?? items.length),
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const params = list.toQueryParams();
        const res = await axiosProvider.get(ENDPOINTS.products.listForPanel, {
          params: {
            page:   params.page,
            limit:  params.limit,
            q:      params.search || undefined,
            sortBy: params.sortBy,
            sortDir:params.sortDir,
          },
        });
        const { items, total: nextTotal } = normalizeProductListResponse(res);
        setProducts(items);
        setTotal(nextTotal);

        const s = { totalSkus: nextTotal, inStock: 0, lowStock: 0, outOfStock: 0 };
        items.forEach((p) => {
          const status = getInventoryStatus({
            stock: p.stock ?? 0,
            reserved: p.reservedStock ?? 0,
          }, lowStockThreshold);
          if (status === "out_of_stock") s.outOfStock++;
          else if (status === "low_stock") s.lowStock++;
          else s.inStock++;
        });
        setStats(s);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load inventory data");
        toast.error("Failed to load inventory data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.pageSize, list.search, list.sortKey, list.sortDir, lowStockThreshold]);

  const tableData = useMemo(
    () =>
      products.map((p) => ({
        _id:      p._id,
        title:    p.title,
        sku:      p.sku || "—",
        category: (typeof p.category === "object"
          ? (p.category?.name || p.category?.title || p.category?.label)
          : p.category) || "—",
        stock:    p.stock ?? 0,
        reserved: p.reservedStock ?? 0,
      })),
    [products],
  );

  const filteredTableData = useMemo(() => {
    if (!list.filters.stockStatus) return tableData;
    return tableData.filter(
      (row) => getInventoryStatus(row, lowStockThreshold) === list.filters.stockStatus,
    );
  }, [list.filters.stockStatus, lowStockThreshold, tableData]);

  const columns = [
    ...createColumns(lowStockThreshold),
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/app/product-catalog/view/${row._id}`)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:border-[var(--admin-navy)] hover:text-[var(--admin-navy)]"
          >
            <MdVisibility size={14} />
            View
          </button>
          <PermissionGuard module="inventory" action={ACTIONS.ADJUST} hide>
            <button
              type="button"
              onClick={() =>
                navigate(`/app/inventory-adjustment?productId=${row._id}`, {
                  state: { product: row },
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-gold)] px-2.5 py-1.5 text-xs font-semibold text-[var(--admin-navy)] hover:bg-[var(--admin-blue-soft)]"
            >
              <MdTune size={14} />
              Adjust
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory Overview"
        subtitle="Monitor stock levels across all products"
        breadcrumbs={[{ label: "Inventory Management" }, { label: "Stock Overview" }]}
        actions={
          <PermissionGuard module="inventory" action={ACTIONS.ADJUST}>
            <button
              type="button"
              onClick={() => navigate("/app/inventory-adjustment")}

            >
              <MdAddCircleOutline size={16} /> Adjust Stock
            </button>
          </PermissionGuard>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="bg-white border border-[#e7e7e7] bg-gradient-to-br from-white to-[#F4F1ED] rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <span className={`flex items-center justify-center w-9 h-9 rounded-lg ${card.color}`}>
                  <Icon size={18} />
                </span>
              </div>
              <div className="text-xl md:text-3xl font-bold text-[var(--admin-navy)]">
                {loading ? <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" /> : (stats[card.key] ?? 0)}
              </div>
              <div className="text-sm md:text-base font-semibold text-gray-500">{card.label}</div>
            </div>
          );
        })}
      </div>

      <DataTable
        columns={columns}
        data={filteredTableData}
        loading={loading}
        totalCount={list.filters.stockStatus ? filteredTableData.length : total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={(q) => { list.setSearch(q); }}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        error={error}
        searchPlaceholder="Search products…"
        requiredModule="inventory"
        exportConfig={{ filename: "inventory-products", columns: createColumns(lowStockThreshold) }}
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
                Low Stock shows when available stock is below this limit.
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

export default InventoryOverview;
