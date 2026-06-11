/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdLabel } from "react-icons/md";
import { PageHeader, DataTable, FilterBar, StatusBadge } from "../../../components/Shared";
import { useListPage } from "../../../hooks/useListPage";
import { getProducts } from "../../../Redux/productSlice";

const firstDefined = (...values) =>
  values.find((v) => v !== undefined && v !== null && v !== "");

const FILTER_FIELDS = [
  {
    key: "tags",
    type: "text",
    label: "Tag",
    placeholder: "Filter by tag",
    width: "w-44",
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    width: "w-44",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "pending_approval", label: "Pending Approval" },
      { value: "draft", label: "Draft" },
      { value: "rejected", label: "Rejected" },
      { value: "archived", label: "Archived" },
    ],
  },
];

const COLUMNS = [
  {
    key: "title",
    label: "Product Name",
    sortable: true,
    render: (v, row) => (
      <span className="font-medium text-gray-800">
        {firstDefined(row?.title, row?.name, row?.productName, "N/A")}
      </span>
    ),
  },
  {
    key: "tags",
    label: "Tags",
    render: (v, row) => {
      const tags = Array.isArray(row?.tags) ? row.tags : [];
      return tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={`${row?._id}-${tag}`}
              className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[var(--admin-blue-soft)] text-[#2d4db3]"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : (
      <span className="text-xs text-gray-400">No tags</span>
      );
    },
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value || "draft"} dot />,
  },
];

const ProductTags = () => {
  const dispatch = useDispatch();
  const list = useListPage({ defaultPageSize: 10, defaultSortKey: "createdAt", defaultSortDir: "desc" });
  const [loading, setLoading] = useState(false);

  const selector = useSelector((state) => state.product);
  const listResponse = selector?.getProductsData?.data?.data || {};
  const products = listResponse?.list || [];
  const total = Number(listResponse?.total || 0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = list.toQueryParams();
      await dispatch(
        getProducts({
          page: params.page,
          limit: params.limit || 10,
          search: params.search || undefined,
          tags: params.tags || undefined,
          status: params.status || undefined,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          includeAllStatuses: true,
        })
      ).unwrap();
    } catch (err) {
      toast.error(err?.message || "Failed to fetch product tags");
    } finally {
      setLoading(false);
    }
  }, [dispatch, list.page, list.pageSize, list.search, list.filters, list.sortKey, list.sortDir]);

  useEffect(() => {
    fetchProducts();
  }, [list.page, list.pageSize, list.search, list.filters, list.sortKey, list.sortDir]);

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Product Tags"
        subtitle="View tags associated with products"
        breadcrumbs={[{ label: "Product Management" }, { label: "Product Tags" }]}
      />

      <DataTable
        columns={COLUMNS}
        data={products}
        loading={loading}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder="Search by product name…"
        emptyText="No products with tags found."
        emptyIcon={<MdLabel size={40} className="text-gray-200" />}
        requiredModule="products"
        exportConfig={{ filename: "product-tags", columns: COLUMNS }}
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

export default ProductTags;
