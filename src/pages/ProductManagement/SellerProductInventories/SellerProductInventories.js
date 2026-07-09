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
import { dropdownApi } from "../../../_helpers/dropdownApi";
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
  productReference: "",
  variantSku: "",
  costPrice: "",
  sellingPrice: "",
  specialPrice: "",
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

const extractSellerOptions = (payload) => {
  const root = getRootPayload(payload);
  return (
    payload?.meta?.sellers ||
    payload?.data?.meta?.sellers ||
    root?.meta?.sellers ||
    root?.sellers ||
    []
  );
};

const mergeSellerLookup = (items = [], previous = {}) => {
  const next = { ...previous };
  items.forEach((item) => {
    const id = String(item?.value || item?.id || item?._id || "").trim();
    if (!id) return;
    next[id] = {
      name: item.label ||
        item.name ||
        item.displayName ||
        item.businessName ||
        item.full_name ||
        item.sellerProfile?.displayName ||
        item.sellerProfile?.businessName ||
        item.sellerProfile?.legalBusinessName ||
        [item.profile?.firstName, item.profile?.lastName].filter(Boolean).join(" ") ||
        item.email ||
        id,
      email: item.meta?.email || item.email || "",
      avatarUrl: item.meta?.avatarUrl || item.profile?.avatarUrl || item.avatarUrl || "",
    };
  });
  return next;
};

const firstImage = (product) => {
  if (Array.isArray(product?.images) && product.images.length > 0) return product.images[0];
  if (Array.isArray(product?.thumbnails) && product.thumbnails.length > 0) return product.thumbnails[0];
  return "https://placehold.co/120x120?text=Product";
};

const cssImageUrl = (value) => `url("${String(value || "").replace(/"/g, "%22")}")`;

const sellerLabel = (product, sellerLookup = {}) => {
  const seller = product?.sellerId || product?.seller || {};
  if (typeof seller === "object") {
    return seller?.full_name ||
      seller?.name ||
      seller?.displayName ||
      seller?.email ||
      seller?.businessName ||
      seller?.sellerProfile?.displayName ||
      "N/A";
  }
  const sellerId = String(seller || product?.seller_id || "").trim();
  return sellerLookup[sellerId]?.name || String(sellerId || "N/A");
};

const getInventoryVariants = (product = {}) => {
  const variants = Array.isArray(product?.variants) ? product.variants.filter(Boolean) : [];
  if (variants.length) return variants;
  return [{
    _id: "default",
    title: "Default variant",
    sku: product?.sku || "",
    price: product?.price,
    mrp: product?.mrp,
    salePrice: product?.salePrice,
    stock: product?.stock,
    reservedStock: product?.reservedStock,
    isDefault: true,
  }];
};

const getSelectedInventoryVariant = (product = {}, variantSku = "") => {
  const variants = getInventoryVariants(product);
  return (
    variants.find((variant) => String(variant.sku || "") === String(variantSku || "")) ||
    variants.find((variant) => variant.isDefault) ||
    variants[0] ||
    null
  );
};

const stockStatusForVariant = (product = {}, variant = {}) => {
  const threshold = Number(product?.inventorySettings?.lowStockThreshold ?? 5);
  const available = Number(variant?.stock ?? product?.stock ?? 0) - Number(variant?.reservedStock ?? product?.reservedStock ?? 0);
  if (available <= 0) return "out_of_stock";
  if (available <= threshold) return "low_stock";
  return "in_stock";
};

const flattenInventoryRows = (products = [], sellerLookup = {}) => {
  const rows = [];
  (products || []).forEach((product) => {
    getInventoryVariants(product).forEach((variant) => {
      rows.push({
        _id: `${product._id}-${variant._id || variant.sku || "default"}`,
        product,
        sellerName: sellerLabel(product, sellerLookup),
        variantTitle: variant.isDefault ? "Default variant" : (variant.title || variant.name || "Variant"),
        sku: variant.sku || product.sku || "-",
        price: variant.price ?? variant.salePrice ?? product.price ?? product.salePrice ?? 0,
        stock: variant.stock ?? product.stock ?? 0,
        reservedStock: variant.reservedStock ?? product.reservedStock ?? 0,
        stockStatus: stockStatusForVariant(product, variant),
        status: product.status,
        variantSku: variant.sku || "",
      });
    });
  });
  return rows;
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
  const [sellerLookup, setSellerLookup] = useState({});

  useEffect(() => {
    let active = true;
    dropdownApi.getSellers({
      keyWord: "",
      searchFields: "full_name,email,businessName,sellerProfile.displayName",
      limit: 500,
    })
      .then((options) => {
        if (active) setSellerLookup((previous) => mergeSellerLookup(options, previous));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

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
          productType: params.productType || undefined,
	          sortBy: params.sortBy,
	          sortDir: params.sortDir,
	          includeAllStatuses: true,
	          includeVariants: true,
	        }),
      ).unwrap();
      const rows = extractList(response);
      const sellers = extractSellerOptions(response);
      setProducts(rows);
      if (sellers.length) {
        setSellerLookup((previous) => mergeSellerLookup(sellers, previous));
      }
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

  const resolveSellerName = useCallback((product) => sellerLabel(product, sellerLookup), [sellerLookup]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const flatRows = useMemo(() => flattenInventoryRows(products, sellerLookup), [products, sellerLookup]);

  const filteredRows = useMemo(() => {
    if (!list.filters.stockStatus) return flatRows;
    return flatRows.filter((row) => row.stockStatus === list.filters.stockStatus);
  }, [flatRows, list.filters.stockStatus]);

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

  const openInventoryModal = useCallback((row) => {
    const item = row?.product || row;
    const selectedVariant =
      getSelectedInventoryVariant(item, row?.variantSku) || getSelectedInventoryVariant(item);
    setSelectedItem(item);
    setFormData({
      ...EMPTY_INVENTORY_FORM,
      user: resolveSellerName(item),
      title: item?.title || item?.name || "",
      urlKeyword: item?._id ? `/products/${item._id}` : "",
      costPrice: String(item?.costPrice ?? item?.mrp ?? ""),
      sellingPrice: String(item?.price ?? item?.salePrice ?? ""),
      availableQty: String(selectedVariant?.stock ?? item?.stock ?? 0),
      sku: selectedVariant?.sku || item?.sku || "",
      variantSku: selectedVariant?.sku || "",
    });
    setInventoryOpen(true);
  }, [resolveSellerName]);

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

    const selectedVariant = getSelectedInventoryVariant(selectedItem, formData.variantSku);
    const currentQty = Number(selectedVariant?.stock ?? selectedItem.stock ?? 0);
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
    const selectedVariant = getSelectedInventoryVariant(selectedItem, formData.variantSku);
    try {
      setLoading(true);
      await dispatch(
        adjustProductInventory({
          productId: selectedItem._id,
          variantSku: selectedVariant?.sku || undefined,
          adjustmentType: "set",
          quantity: adjustConfirm.nextQty,
          reason: "Admin seller inventory update",
          note: `Stock changed from ${adjustConfirm.currentQty} to ${adjustConfirm.nextQty}`,
          reference: `seller-inventory:${selectedItem._id}:${selectedVariant?.sku || "default"}:${Date.now()}`,
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
        render: (_, row) => {
          const imageUrl = firstImage(row.product);
          return (
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="h-12 w-12 shrink-0 cursor-pointer rounded border bg-cover bg-center"
              style={{ backgroundImage: cssImageUrl(imageUrl) }}
              onClick={() => setSelectedImage(imageUrl)}
              aria-label="View product image"
            />
            <div className="min-w-0">
              <div className="max-w-[260px] truncate text-sm font-semibold text-gray-800">
                {row.product?.title || row.product?.name || "-"}
              </div>
              <div className="max-w-[220px] truncate text-xs font-medium text-[var(--admin-muted)]">
                {row.sellerName}
              </div>
              <div className="max-w-[220px] truncate text-xs text-gray-400">
                {row.variantTitle}
              </div>
            </div>
          </div>
          );
        },
      },
      {
        key: "sku",
        label: "Variant SKU",
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
        render: (_, row) => <StatusBadge status={row.stockStatus} dot />,
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
        cellClassName: "admin-table-action-cell",
        render: (_, row) => (
          <div className="admin-table-actions-nowrap">
            <PermissionGuard module="inventory" action={ACTIONS.ADJUST} hide>
              <button
                type="button"
                className="admin-icon-btn"
                title="Adjust inventory"
                onClick={() => openInventoryModal(row)}
              >
                <MdTune size={16} />
              </button>
            </PermissionGuard>
            <PermissionGuard module="products" action={ACTIONS.VIEW} hide>
              <button
                type="button"
                className="admin-icon-btn"
                title="View missing information"
                onClick={() => setMissingOpen(true)}
              >
                <MdInfoOutline size={16} />
              </button>
            </PermissionGuard>
            <PermissionGuard module="products" action={ACTIONS.STATUS_CHANGE} hide>
              <button
                type="button"
                className={row.product?.status === "active" ? "admin-icon-btn text-yellow-600" : "admin-icon-btn text-green-600"}
                title={row.product?.status === "active" ? "Disable product" : "Enable product"}
                onClick={() => setToggleTarget(row.product)}
              >
                {row.product?.status === "active" ? <MdToggleOff size={16} /> : <MdToggleOn size={16} />}
              </button>
            </PermissionGuard>
            <PermissionGuard module="products" action={ACTIONS.DELETE} hide>
              <button
                type="button"
                className="admin-icon-btn text-red-600"
                title="Delete product"
                onClick={() => setDeleteTarget(row.product)}
              >
                <MdDelete size={16} />
              </button>
            </PermissionGuard>
          </div>
        ),
      },
    ],
    [openInventoryModal],
  );

  const exportColumns = columns.filter((column) => column.key !== "actions");

  return (
    <div>
      <PageHeader
        title="Seller Product Inventories"
        subtitle="Manage seller product stock levels and inventory adjustments"
        breadcrumbs={[{ label: "Inventory Management" }, { label: "Seller Product Inventories" }]}
      />

      <DataTable
        columns={columns}
        data={filteredRows}
        loading={loading || Boolean(productSelector?.getProductsData?.loading)}
        totalCount={list.filters.stockStatus ? filteredRows.length : total}
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
        variantOptions={getInventoryVariants(selectedItem)}
        InventorySetupOpen={inventoryOpen}
        togglePanel={() => { setInventoryOpen(false); setSelectedItem(null); }}
        onSave={handleInventorySave}
      />
    </div>
  );
};

export default SellerProductInventories;
