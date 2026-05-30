import React, { useEffect, useState } from "react";
import {
  MdInventory,
  MdWarning,
  MdAddCircleOutline,
  MdTrendingDown,
} from "react-icons/md";
import { PageHeader, DataTable, StatusBadge, FilterBar } from "../../components/Shared";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { toast } from "react-toastify";
import { useListPage } from "../../hooks/useListPage";

const STAT_CARDS = [
  { label: "Total SKUs",    key: "totalSkus",   icon: MdInventory,    color: "text-[#989AFF] bg-[#F0F0F3]" },
  { label: "In Stock",      key: "inStock",      icon: MdInventory,    color: "text-green-600 bg-green-50" },
  { label: "Low Stock",     key: "lowStock",     icon: MdWarning,      color: "text-yellow-600 bg-yellow-50" },
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

const COLUMNS = [
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
      const avail = (row.stock ?? 0) - (row.reserved ?? 0);
      return (
        <span className={`font-mono font-semibold ${avail <= 0 ? "text-red-500" : avail <= 5 ? "text-yellow-600" : "text-green-600"}`}>
          {avail}
        </span>
      );
    },
  },
  {
    key: "status", label: "Status",
    render: (_, row) => {
      const avail = (row.stock ?? 0) - (row.reserved ?? 0);
      const s = avail <= 0 ? "out_of_stock" : avail <= 5 ? "low_stock" : "in_stock";
      return <StatusBadge status={s} dot />;
    },
  },
];

const InventoryOverview = () => {
  const list    = useListPage({ defaultPageSize: 20, defaultSortKey: "title" });
  const [products, setProducts] = useState([]);
  const [stats,    setStats]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = list.toQueryParams();
        const res = await axiosProvider.get("/products", {
          params: {
            page:   params.page,
            limit:  params.limit,
            search: params.search || undefined,
            stockStatus: params.stockStatus || undefined,
            sortBy: params.sortBy,
            sortDir:params.sortDir,
          },
        });
        const items     = res.data?.data?.products || res.data?.data || [];
        const nextTotal = res.data?.pagination?.total || res.data?.data?.total || items.length;
        setProducts(items);
        setTotal(nextTotal);

        const s = { totalSkus: nextTotal, inStock: 0, lowStock: 0, outOfStock: 0 };
        items.forEach((p) => {
          const avail = (p.stock ?? 0) - (p.reservedStock ?? 0);
          if (avail <= 0) s.outOfStock++;
          else if (avail <= (p.inventorySettings?.lowStockThreshold ?? 5)) s.lowStock++;
          else s.inStock++;
        });
        setStats(s);
      } catch {
        toast.error("Failed to load inventory data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.pageSize, list.search, list.sortKey, list.sortDir, list.filters]);

  const tableData = products.map((p) => ({
    _id:      p._id,
    title:    p.title,
    sku:      p.sku || "—",
    category: p.category || "—",
    stock:    p.stock ?? 0,
    reserved: p.reservedStock ?? 0,
  }));

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Inventory Overview"
        subtitle="Monitor stock levels across all products"
        breadcrumbs={[{ label: "Inventory Management" }, { label: "Stock Overview" }]}
        actions={
          <PermissionGuard module="inventory" action={ACTIONS.ADJUST}>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#989AFF] text-white text-sm rounded-lg hover:bg-[#7b7de8] transition-colors">
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
              <div className="text-xl md:text-3xl font-bold text-[#042586]">
                {loading ? <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" /> : (stats[card.key] ?? 0)}
              </div>
              <div className="text-sm md:text-base font-semibold text-gray-500">{card.label}</div>
            </div>
          );
        })}
      </div>

      <DataTable
        columns={COLUMNS}
        data={tableData}
        loading={loading}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={(q) => { list.setSearch(q); }}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder="Search products…"
        requiredModule="inventory"
        exportConfig={{ filename: "inventory-products", columns: COLUMNS }}
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

export default InventoryOverview;
