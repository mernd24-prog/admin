import React, { useEffect, useMemo, useState } from "react";
import { MdNotifications, MdAddCircleOutline } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
} from "../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { toast } from "../../utils/toast";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../_helpers/usePermission";
import { useListPage } from "../../hooks/useListPage";

const FILTER_FIELDS = [
  {
    key: "stockStatus",
    type: "select",
    label: "Alert Type",
    options: [
      { value: "low_stock", label: "Low Stock" },
      { value: "out_of_stock", label: "Out of Stock" },
    ],
    width: "w-44",
  },
];

const COLUMNS = [
  { key: "title", label: "Product", sortable: true },
  { key: "sku", label: "SKU" },
  { key: "category", label: "Category" },
  {
    key: "stock",
    label: "Current Stock",
    sortable: true,
    render: (v) => (
      <span className="font-mono font-semibold text-yellow-600">{v ?? 0}</span>
    ),
  },
  {
    key: "threshold",
    label: "Threshold",
    render: (v) => <span className="font-mono text-gray-400">{v ?? 5}</span>,
  },
  {
    key: "gap",
    label: "Gap",
    render: (_, row) => {
      const g = (row.threshold ?? 5) - (row.stock ?? 0);
      return (
        <span
          className={`font-mono font-semibold ${g > 0 ? "text-red-500" : "text-green-600"}`}
        >
          {g > 0 ? `−${g}` : "OK"}
        </span>
      );
    },
  },
  {
    key: "status",
    label: "Alert",
    render: (_, row) => {
      const avail = row.stock ?? 0;
      const thr = row.threshold ?? 5;
      return avail <= 0 ? (
        <StatusBadge status="out_of_stock" dot />
      ) : avail <= thr ? (
        <StatusBadge status="low_stock" dot />
      ) : null;
    },
  },
];

const LowStockAlerts = () => {
  const navigate = useNavigate();
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "stock",
    defaultSortDir: "asc",
    defaultFilters: { stockStatus: "low_stock" },
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const { toQueryParams } = list;

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
    const fetch = async () => {
      setLoading(true);
      setError("");
      try {
        const params = toQueryParams();
        const res = await axiosProvider.get(ENDPOINTS.products.listForPanel, {
          params: {
            page: params.page,
            limit: params.limit,
            q: params.search || undefined,
            stockStatus: params.stockStatus || "low_stock",
            sortBy: params.sortBy,
            sortDir: params.sortDir,
          },
        });
        const payload = normalizeProductListResponse(res);
        setProducts(payload.items);
        setTotal(payload.total);
      } catch (err) {
        const message = err?.response?.data?.message || "Failed to load low stock data";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [toQueryParams]);

  const tableData = useMemo(
    () =>
      products.map((p) => ({
        _id: p._id,
        title: p.title,
        sku: p.sku || "—",
        category: (typeof p.category === "object"
          ? (p.category?.name || p.category?.title || p.category?.label)
          : p.category) || "—",
        stock: p.stock ?? 0,
        threshold: p.inventorySettings?.lowStockThreshold ?? 5,
      })),
    [products],
  );

  return (
    <div>
      <PageHeader
        title="Low Stock Alerts"
        subtitle="Products that need to be restocked soon"
        breadcrumbs={[
          { label: "Inventory Management" },
          { label: "Low Stock Alerts" },
        ]}
        actions={
          <PermissionGuard module="inventory" action={ACTIONS.ADJUST} hide>
            <button
              type="button"

              onClick={() => navigate("/app/inventory-adjustment")}
            >
              <MdAddCircleOutline size={16} /> Adjust Stock
            </button>
          </PermissionGuard>
        }
      />

      {/* Summary banner */}
      <div className="mb-5 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3 flex items-center gap-3">
        <MdNotifications size={20} className="text-yellow-500 flex-shrink-0" />
        <span className="text-sm text-yellow-700">
          <strong>{total}</strong> product{total !== 1 ? "s" : ""} are below
          their low-stock threshold and need attention.
        </span>
      </div>

      <DataTable
        columns={COLUMNS}
        data={tableData}
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
        searchPlaceholder="Search low-stock products..."
        emptyText="No low stock alerts — all products are well stocked!"
        requiredModule="inventory"
        exportConfig={{ filename: "low-stock-alerts", columns: COLUMNS }}
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

export default LowStockAlerts;
