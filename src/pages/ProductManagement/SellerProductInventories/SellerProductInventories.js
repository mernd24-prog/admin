import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  MdDelete,
  MdInfoOutline,
  MdInventory,
  MdTune,
  MdToggleOff,
  MdToggleOn,
} from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { ConfirmModal, DataTable, FilterBar, PageHeader, StatusBadge } from "../../../components/Shared";
import ImageViewer from "../../../components/ImageViewer/ImageViewer";
import { useListPage } from "../../../hooks/useListPage";
import ProductMissingInfo from "./components/ProductMissingInformation";
import SellerInventorySetup from "./components/SellerInventorySetup";
import {
  adjustProductInventory,
  deleteProducts,
  enableDisableProductCatalogs,
  getProducts,
} from "../../../Redux/productSlice";

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
      { value: "rejected", label: "Rejected" },
      { value: "archived", label: "Archived" },
    ],
  },
  {
    key: "productType",
    type: "select",
    label: "Product Type",
    width: "w-40",
    options: [
      { value: "simple", label: "Simple" },
      { value: "variable", label: "Variable" },
    ],
  },
];

const EMPTY_INVENTORY_FORM = {
  user: "",
  title: "",
  urlKeyword: "",
  costPrice: "",
  sellingPrice: "",
  availableQty: "",
  sku: "",
  minPurchaseQty: "1",
  productCondition: "New",
  codAvailable: "No",
  fulfillmentMethod: "Ship Only",
  availableDate: new Date().toISOString().slice(0, 10),
  returnPeriod: "0",
  cancelPeriod: "0",
  periodInDays: "",
};

const getRootPayload = (payload) => payload?.data?.data || payload?.data || payload || {};

const extractList = (payload) => {
  const root = getRootPayload(payload);
  return root.products || root.list || root.items || root.rows || [];
};

const extractTotal = (payload, fallback = 0) => {
  const root = getRootPayload(payload);
  return Number(
    payload?.pagination?.total ??
      payload?.data?.pagination?.total ??
      root?.pagination?.total ??
      root?.total ??
      fallback,
  );
};

const firstImage = (product) => {
  if (Array.isArray(product?.images) && product.images.length > 0) return product.images[0];
  if (Array.isArray(product?.thumbnails) && product.thumbnails.length > 0) return product.thumbnails[0];
  return "https://placehold.co/120x120?text=Product";
};

const sellerLabel = (product) => {
  const seller = product?.sellerId || product?.seller || {};
  if (typeof seller === "object") {
    return seller?.full_name || seller?.name || seller?.email || seller?.businessName || "N/A";
  }
  return String(seller || "N/A");
};

const stockStatusFor = (row) => {
  const threshold = Number(row?.inventorySettings?.lowStockThreshold ?? 5);
  const available = Number(row?.stock || 0) - Number(row?.reservedStock || 0);
  if (available <= 0) return "out_of_stock";
  if (available <= threshold) return "low_stock";
  return "in_stock";
};

const SellerProductInventories = () => {
  const dispatch = useDispatch();
  const productSelector = useSelector((state) => state.product);
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "title", defaultSortDir: "asc" });
  const { toQueryParams } = list;

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [adjustConfirm, setAdjustConfirm] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [missingOpen, setMissingOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_INVENTORY_FORM);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = toQueryParams();
      const response = await dispatch(
        getProducts({
          page: params.page,
          limit: params.limit,
          q: params.search || undefined,
          status: params.status || undefined,
          stockStatus: params.stockStatus || undefined,
          productType: params.productType || undefined,
          sortBy: params.sortBy,
          sortDir: params.sortDir,
          includeAllStatuses: true,
        }),
      ).unwrap();
      const rows = extractList(response);
      setProducts(rows);
      setTotal(extractTotal(response, rows.length));
    } catch (loadError) {
      const message = loadError?.message || "Failed to load seller product inventory";
      setProducts([]);
      setTotal(0);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dispatch, toQueryParams]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const confirmToggleStatus = async () => {
    if (!toggleTarget?._id) return;
    try {
      setLoading(true);
      await dispatch(
        enableDisableProductCatalogs({
          ids: [toggleTarget._id],
          isDisable: toggleTarget.status === "active",
          reason: toggleTarget.status === "active" ? "Disabled from seller inventory" : "Enabled from seller inventory",
        }),
      ).unwrap();
      toast.success("Product status updated successfully");
      setToggleTarget(null);
      await loadProducts();
    } catch (toggleError) {
      toast.error(toggleError?.message || "Failed to update product status");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      setLoading(true);
      await dispatch(deleteProducts({ productId: deleteTarget._id })).unwrap();
      toast.success("Product deleted successfully");
      setDeleteTarget(null);
      await loadProducts();
    } catch (deleteError) {
      toast.error(deleteError?.message || "Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  const openInventoryModal = (item) => {
    setSelectedItem(item);
    setFormData({
      ...EMPTY_INVENTORY_FORM,
      user: sellerLabel(item),
      title: item?.title || item?.name || "",
      urlKeyword: item?._id ? `/products/${item._id}` : "",
      costPrice: String(item?.costPrice ?? item?.mrp ?? ""),
      sellingPrice: String(item?.price ?? item?.salePrice ?? ""),
      availableQty: String(item?.stock ?? 0),
      sku: item?.sku || "",
    });
    setInventoryOpen(true);
  };

  const handleInventorySave = () => {
    if (!selectedItem?._id) {
      setInventoryOpen(false);
      return;
    }

    const nextQty = Number(formData.availableQty);
    if (!Number.isInteger(nextQty) || nextQty < 0) {
      toast.error("Available quantity must be a non-negative whole number");
      return;
    }

    const currentQty = Number(selectedItem.stock || 0);
    const adjustment = nextQty - currentQty;
    if (adjustment === 0) {
      toast.info("No stock change to save");
      setInventoryOpen(false);
      return;
    }

    setAdjustConfirm({ nextQty, currentQty, adjustment });
  };

  const confirmInventorySave = async () => {
    if (!selectedItem?._id || !adjustConfirm) return;
    try {
      setLoading(true);
      await dispatch(
        adjustProductInventory({
          productId: selectedItem._id,
          adjustmentType: "set",
          quantity: adjustConfirm.nextQty,
          reason: "Admin seller inventory update",
          note: `Stock changed from ${adjustConfirm.currentQty} to ${adjustConfirm.nextQty}`,
          reference: `seller-inventory:${selectedItem._id}:${Date.now()}`,
        }),
      ).unwrap();
      toast.success("Inventory updated successfully");
      setAdjustConfirm(null);
      setInventoryOpen(false);
      setSelectedItem(null);
      await loadProducts();
    } catch (adjustError) {
      toast.error(adjustError?.message || "Failed to update inventory");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "Product",
        sortable: true,
        render: (_, row) => (
          <div className="flex items-center gap-3">
            <img
              src={firstImage(row)}
              alt=""
              className="w-12 h-12 object-cover rounded border cursor-pointer"
              onClick={() => setSelectedImage(firstImage(row))}
            />
            <div>
              <div className="font-medium text-sm text-gray-800">{row?.title || row?.name || "-"}</div>
              <div className="text-xs text-gray-500">{sellerLabel(row)}</div>
            </div>
          </div>
        ),
      },
      {
        key: "sku",
        label: "SKU",
        sortable: true,
        render: (value) => <span className="font-mono text-sm">{value || "-"}</span>,
      },
      {
        key: "price",
        label: "Selling Price",
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm">
            INR {Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: "stock",
        label: "Available Qty",
        sortable: true,
        render: (value) => <span className="font-mono text-sm">{value ?? 0}</span>,
      },
      {
        key: "reservedStock",
        label: "Reserved",
        render: (value) => <span className="font-mono text-gray-500">{value ?? 0}</span>,
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
          <div className="flex items-center gap-2">
            <PermissionGuard module="inventory" action={ACTIONS.ADJUST} hide>
              <button
                type="button"
                className="admin-icon-btn"
                title="Adjust inventory"
                onClick={() => openInventoryModal(row)}
              >
                <MdTune size={18} />
              </button>
            </PermissionGuard>
            <PermissionGuard module="products" action={ACTIONS.VIEW} hide>
              <button
                type="button"
                className="admin-icon-btn"
                title="View missing information"
                onClick={() => setMissingOpen(true)}
              >
                <MdInfoOutline size={18} />
              </button>
            </PermissionGuard>
            <PermissionGuard module="products" action={ACTIONS.STATUS_CHANGE} hide>
              <button
                type="button"
                className={row.status === "active" ? "admin-icon-btn text-yellow-600" : "admin-icon-btn text-green-600"}
                title={row.status === "active" ? "Disable product" : "Enable product"}
                onClick={() => setToggleTarget(row)}
              >
                {row.status === "active" ? <MdToggleOff size={20} /> : <MdToggleOn size={20} />}
              </button>
            </PermissionGuard>
            <PermissionGuard module="products" action={ACTIONS.DELETE} hide>
              <button
                type="button"
                className="admin-icon-btn text-red-600"
                title="Delete product"
                onClick={() => setDeleteTarget(row)}
              >
                <MdDelete size={18} />
              </button>
            </PermissionGuard>
          </div>
        ),
      },
    ],
    [],
  );

  const exportColumns = columns.filter((column) => column.key !== "actions");

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Seller Product Inventories"
        subtitle="Manage seller product stock levels and inventory adjustments"
        breadcrumbs={[{ label: "Inventory Management" }, { label: "Seller Product Inventories" }]}
      />

      <DataTable
        columns={columns}
        data={products}
        loading={loading || Boolean(productSelector?.getProductsData?.loading)}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        error={error}
        searchPlaceholder="Search products, SKU, or sellers..."
        emptyText="No seller product inventories found."
        emptyIcon={<MdInventory size={40} className="text-gray-200" />}
        requiredModule="inventory"
        exportConfig={{ filename: "seller-product-inventories", columns: exportColumns }}
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
        open={Boolean(toggleTarget)}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggleStatus}
        variant={toggleTarget?.status === "active" ? "warning" : "success"}
        title={`${toggleTarget?.status === "active" ? "Disable" : "Enable"} Product?`}
        message={`${toggleTarget?.status === "active" ? "Disable" : "Enable"} "${toggleTarget?.title || toggleTarget?.name || "this product"}"?`}
        confirmLabel={toggleTarget?.status === "active" ? "Disable" : "Enable"}
        loading={loading}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        variant="danger"
        title="Delete Product?"
        message={`Delete "${deleteTarget?.title || deleteTarget?.name || "this product"}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={loading}
      />

      <ConfirmModal
        open={Boolean(adjustConfirm)}
        onClose={() => setAdjustConfirm(null)}
        onConfirm={confirmInventorySave}
        variant={adjustConfirm?.adjustment < 0 ? "warning" : "success"}
        title="Confirm Inventory Adjustment"
        message={`Change stock for "${selectedItem?.title || selectedItem?.name || "this product"}" from ${adjustConfirm?.currentQty ?? 0} to ${adjustConfirm?.nextQty ?? 0}?`}
        confirmLabel="Update Stock"
        loading={loading}
      />

      <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />

      <ProductMissingInfo missingOpen={missingOpen} togglePanel={() => setMissingOpen(false)} />

      <SellerInventorySetup
        setFormData={setFormData}
        formData={formData}
        InventorySetupOpen={inventoryOpen}
        togglePanel={() => { setInventoryOpen(false); setSelectedItem(null); }}
        onSave={handleInventorySave}
      />
    </div>
  );
};

export default SellerProductInventories;
