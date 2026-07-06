import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdInventory, MdVisibility } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { DataTable, FilterBar, PageHeader, StatusBadge } from "../../../components/Shared";
import ImageViewer from "../../../components/ImageViewer/ImageViewer";
import { useListPage } from "../../../hooks/useListPage";
import { getProducts } from "../../../Redux/productSlice";

const FILTER_FIELDS = [
  {
    key: "stockStatus",
    type: "select",
    label: "Stock Status",
    width: "w-44",
    options: [
      { value: "low_stock", label: "Low Stock" },
      { value: "out_of_stock", label: "Out of Stock" },
      { value: "in_stock", label: "In Stock" },
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
      { value: "rejected", label: "Rejected" },
      { value: "archived", label: "Archived" },
    ],
  },
];

const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const productIdOf = (product = {}) =>
  firstDefined(product._id, product.id, product.productId);

const firstImage = (product) => {
  const thumbnails = product?.thumbnails;
  if (Array.isArray(product?.images) && product.images.length) return product.images[0];
  if (Array.isArray(thumbnails) && thumbnails.length) return thumbnails[0];
  if (typeof thumbnails === "string" && thumbnails) return thumbnails;
  return "";
};

const sellerName = (product) => {
  const seller = product?.sellerId || product?.seller || {};
  if (typeof seller === "object") {
    return firstDefined(seller?.businessName, seller?.name, seller?.full_name, seller?.email, "N/A");
  }
  return String(seller || "N/A");
};

const availableStock = (product) =>
  Number(product?.stock || 0) - Number(product?.reservedStock || product?.reserved || 0);

const thresholdFor = (product) =>
  Number(firstDefined(product?.inventorySettings?.lowStockThreshold, product?.thresholdStock, product?.threshold, 5));

const stockStatusFor = (product) => {
  const available = availableStock(product);
  if (available <= 0) return "out_of_stock";
  if (available <= thresholdFor(product)) return "low_stock";
  return "in_stock";
};

const ThresholdProducts = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state.product);
  const list = useListPage({
    defaultPageSize: 10,
    defaultSortKey: "stock",
    defaultSortDir: "asc",
    defaultFilters: { stockStatus: "low_stock" },
  });
  const { toQueryParams } = list;

  const listResponse = selector?.getProductsData?.data?.data || {};
  const products = listResponse?.list || [];
  const total = Number(listResponse?.total || 0);

  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = toQueryParams();
      await dispatch(
        getProducts({
          page: params.page,
          limit: params.limit,
          search: params.search || undefined,
          stockStatus: params.stockStatus || "low_stock",
          status: params.status || undefined,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          includeAllStatuses: true,
        }),
      ).unwrap();
    } catch (error) {
      toast.error(error?.message || "Failed to fetch threshold products");
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "Product",
        sortable: true,
        render: (_, row) => {
          const title = firstDefined(row?.title, row?.name, row?.productName, "N/A");
          const image = firstImage(row);
          return (
            <div className="flex items-center gap-3">
              {image ? (
                <img
                  src={image}
                  alt={title}
                  className="object-cover w-12 h-12 border rounded cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                />
              ) : (
                <span className="w-12 h-12 border rounded bg-gray-100" />
              )}
              <div>
                <div className="text-sm font-medium text-gray-800">{title}</div>
                <div className="text-xs text-gray-500">Seller: {sellerName(row)}</div>
              </div>
            </div>
          );
        },
      },
      {
        key: "stock",
        label: "Stock",
        sortable: true,
        render: (value) => <span className="font-mono">{Number(value || 0)}</span>,
      },
      {
        key: "reservedStock",
        label: "Reserved",
        render: (value) => <span className="font-mono text-gray-500">{Number(value || 0)}</span>,
      },
      {
        key: "threshold",
        label: "Threshold",
        render: (_, row) => <span className="font-mono">{thresholdFor(row)}</span>,
      },
      {
        key: "available",
        label: "Available",
        render: (_, row) => {
          const available = availableStock(row);
          return (
            <span className={`font-mono font-semibold ${available <= 0 ? "text-red-600" : "text-yellow-600"}`}>
              {available}
            </span>
          );
        },
      },
      {
        key: "stockStatus",
        label: "Stock Status",
        render: (_, row) => <StatusBadge status={stockStatusFor(row)} dot />,
      },
      {
        key: "status",
        label: "Product Status",
        sortable: true,
        render: (value) => <StatusBadge status={value || "draft"} dot />,
      },
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => (
          <PermissionGuard module="products" action={ACTIONS.VIEW} hide>
            <button
              type="button"
              className="admin-icon-btn"
              title="View product"
              onClick={() => {
                const id = productIdOf(row);
                if (!id) {
                  toast.error("Product ID not found");
                  return;
                }
                navigate(`/app/product-catalog/view/${id}`);
              }}
            >
              <MdVisibility size={18} />
            </button>
          </PermissionGuard>
        ),
      },
    ],
    [navigate],
  );

  const exportColumns = columns.filter((column) => column.key !== "actions");

  return (
    <div>
      <PageHeader
        title="Threshold Products"
        subtitle="Products at or below their configured low-stock threshold"
        breadcrumbs={[{ label: "Inventory Management" }, { label: "Threshold Products" }]}
      />

      <DataTable
        columns={columns}
        data={products}
        loading={loading || selector.loading}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder="Search threshold products..."
        emptyText="No threshold products found."
        emptyIcon={<MdInventory size={40} className="text-gray-200" />}
        requiredModule="inventory"
        exportConfig={{ filename: "threshold-products", columns: exportColumns }}
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

      <ImageViewer
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
};

export default ThresholdProducts;
