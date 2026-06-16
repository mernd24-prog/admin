import React, { useCallback, useEffect, useState } from "react";
import { MdGridView, MdRefresh } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { PageHeader, DataTable, StatusBadge, FilterBar, ExportButton } from "../../components/Shared";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { toast } from "react-toastify";
import { useListPage } from "../../hooks/useListPage";

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

const FLAT_COLUMNS = [
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
      const avail = (row.stock ?? 0) - (row.reserved ?? 0);
      return (
        <span
          className={`font-mono font-semibold ${
            avail <= 0
              ? "text-red-500"
              : avail <= (row.threshold ?? 5)
              ? "text-yellow-600"
              : "text-green-600"
          }`}
        >
          {avail}
        </span>
      );
    },
  },
  {
    key: "variantStatus",
    label: "Status",
    render: (_, row) => {
      const avail = (row.stock ?? 0) - (row.reserved ?? 0);
      const s =
        avail <= 0
          ? "out_of_stock"
          : avail <= (row.threshold ?? 5)
          ? "low_stock"
          : "in_stock";
      return <StatusBadge status={s} dot />;
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
        threshold: p.inventorySettings?.lowStockThreshold ?? 5,
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
          stockStatus: params.stockStatus || undefined,
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

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
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
                className="flex items-center gap-2 px-4 py-2 bg-[var(--admin-gold)] text-white text-sm rounded-lg hover:bg-[var(--admin-gold-dark)] transition-colors"
              >
                Adjust Stock
              </button>
            </PermissionGuard>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 text-gray-600"
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
              (r) =>
                r.stock - r.reserved > 0 && r.stock - r.reserved <= r.threshold,
            ).length,
            color: "text-yellow-600",
          },
          {
            label: "Out of Stock",
            value: flatRows.filter((r) => r.stock - r.reserved <= 0).length,
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
        columns={FLAT_COLUMNS}
        data={flatRows}
        loading={loading}
        totalCount={total}
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

export default VariantInventory;
