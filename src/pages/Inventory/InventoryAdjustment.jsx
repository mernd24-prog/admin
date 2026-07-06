import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MdAdd,
  MdCheck,
  MdClose,
  MdInventory,
  MdRefresh,
  MdRemove,
  MdSearch,
  MdTune,
} from "react-icons/md";
import { useLocation, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/Shared";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { toast } from "../../utils/toast";
import useDropdownOptions from "../../hooks/useDropdownOptions";
import ConfirmModal from "../../components/Shared/ConfirmModal";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  useLowStockThreshold,
} from "./lowStockThreshold";

const TYPES = [
  { value: "add", label: "Add Stock", icon: MdAdd, color: "text-green-600" },
  { value: "remove", label: "Remove Stock", icon: MdRemove, color: "text-red-500" },
  { value: "set", label: "Set Exact", icon: MdCheck, color: "text-blue-500" },
];

const STOCK_FILTERS = [
  { value: "", label: "All stock" },
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

const PRODUCT_STATUS_FILTERS = [
  { value: "", label: "All Product Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "draft", label: "Draft" },
];

const PRODUCT_SEARCH_LIMIT = 50;
const NOTE_MAX_LENGTH = 240;

const getProductId = (product) => product?._id || product?.id || product?.productId;

const getCategoryName = (category) =>
  (typeof category === "object"
    ? category?.name || category?.title || category?.label
    : category) || "No category";

const numberValue = (value) => Number(value || 0);

const getAvailableStock = (stock, reserved) =>
  numberValue(stock) - numberValue(reserved);

const getStockStatus = (stock, reserved, threshold = DEFAULT_LOW_STOCK_THRESHOLD) => {
  const available = getAvailableStock(stock, reserved);
  if (available <= 0) {
    return {
      label: "Out of stock",
      pill: "border-red-100 bg-red-50 text-red-600",
      text: "text-red-600",
    };
  }
  if (available < threshold) {
    return {
      label: "Low stock",
      pill: "border-red-100 bg-red-50 text-red-600",
      text: "text-red-600",
    };
  }
  return {
    label: "In stock",
    pill: "border-green-100 bg-green-50 text-green-700",
    text: "text-green-600",
  };
};

const normalizeProductList = (response) => {
  const data = response?.data?.data;
  if (Array.isArray(data)) return data;
  return data?.products || data?.list || data?.items || [];
};

const normalizeProductDetail = (response) => {
  const data = response?.data?.data;
  return data?.product || data?.item || data || null;
};

const stockBoxClass = (value, threshold = DEFAULT_LOW_STOCK_THRESHOLD) =>
  Number(value || 0) <= 0
    ? "text-red-600"
    : Number(value || 0) < threshold
      ? "text-red-600"
      : "text-green-600";

const InventoryAdjustment = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const adjustmentReasons = useDropdownOptions("inventory-adjustment-reasons");
  const { lowStockThreshold } = useLowStockThreshold();

  const [search, setSearch] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [productStatus, setProductStatus] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(location.state?.product || null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [adjustType, setAdjustType] = useState("add");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [variantSku, setVariantSku] = useState("");

  const selectedVariant = useMemo(
    () =>
      (selected?.variants || []).find(
        (variant) => String(variant.sku || "") === String(variantSku || ""),
      ) || null,
    [selected, variantSku],
  );
  const currentStock = numberValue(selectedVariant?.stock ?? selected?.stock);
  const reservedStock = numberValue(selectedVariant?.reservedStock ?? selected?.reservedStock);
  const availableStock = currentStock - reservedStock;
  const requestedQty = qty === "" ? NaN : Number(qty);
  const adjustmentPreview = useMemo(() => {
    if (!Number.isFinite(requestedQty)) return 0;
    if (adjustType === "add") return requestedQty;
    if (adjustType === "remove") return -requestedQty;
    return requestedQty - currentStock;
  }, [adjustType, currentStock, requestedQty]);
  const stockAfter = currentStock + adjustmentPreview;
  const selectedStatus = getStockStatus(currentStock, reservedStock, lowStockThreshold);

  const selectProduct = useCallback((product) => {
    setSelected(product);
    setVariantSku("");
    setQty("");
    setReason("");
    setNote("");
    setErrors({});
  }, []);

  const clearSelection = () => {
    setSelected(null);
    setVariantSku("");
    setQty("");
    setReason("");
    setNote("");
    setErrors({});
  };

  const loadProductById = useCallback(
    async (productId, { silent = false } = {}) => {
      if (!productId) return;
      if (!silent) setLoadingSelected(true);
      try {
        const response = await axiosProvider.get(ENDPOINTS.products.detail(productId), {
          params: { includeVariants: true, includeAllStatuses: true },
        });
        const product = normalizeProductDetail(response);
        if (product) selectProduct(product);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load product inventory");
      } finally {
        if (!silent) setLoadingSelected(false);
      }
    },
    [selectProduct],
  );

  const loadProducts = useCallback(async ({ query = "", stock = "", status = "" } = {}) => {
    setErrors({});
    setSearching(true);
    try {
      const response = await axiosProvider.get(ENDPOINTS.products.listForPanel, {
        params: {
          q: query.trim() || undefined,
          stockStatus: stock || undefined,
          lowStockThreshold: stock ? lowStockThreshold : undefined,
          status: status || undefined,
          limit: PRODUCT_SEARCH_LIMIT,
          includeVariants: true,
          includeAllStatuses: true,
        },
      });
      setResults(normalizeProductList(response));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  }, [lowStockThreshold]);

  useEffect(() => {
    const productId = searchParams.get("productId");
    if (productId) {
      loadProductById(productId, { silent: Boolean(location.state?.product) });
    }
  }, [loadProductById, location.state?.product, searchParams]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const searchProducts = () => {
    loadProducts({
      query: search,
      stock: stockStatus,
      status: productStatus,
    });
  };

  const resetFilters = () => {
    setSearch("");
    setStockStatus("");
    setProductStatus("");
    loadProducts();
  };

  const validate = () => {
    const nextErrors = {};
    const selectedProductId = getProductId(selected);
    const validTypes = TYPES.map((type) => type.value);
    const validReasonValues = adjustmentReasons.options.map((option) => option.value);

    if (!selectedProductId) nextErrors.product = "Select a valid product.";
    if (!validTypes.includes(adjustType)) {
      nextErrors.adjustType = "Select a valid adjustment type.";
    }
    if (variantSku && !selectedVariant) {
      nextErrors.variant = "Select a valid variant.";
    }
    if (qty === "" || !Number.isFinite(requestedQty)) {
      nextErrors.qty = "Enter a valid quantity.";
    } else if (!Number.isInteger(requestedQty)) {
      nextErrors.qty = "Quantity must be a whole number.";
    } else if (adjustType !== "set" && requestedQty <= 0) {
      nextErrors.qty = "Enter a quantity greater than 0.";
    } else if (adjustType === "set" && requestedQty < 0) {
      nextErrors.qty = "Set quantity cannot be negative.";
    }
    if (!reason) nextErrors.reason = "Select a reason.";
    if (reason && validReasonValues.length > 0 && !validReasonValues.includes(reason)) {
      nextErrors.reason = "Select a valid reason.";
    }
    if (adjustType === "remove" && requestedQty > availableStock) {
      nextErrors.qty = "Remove quantity cannot be greater than available stock.";
    }
    if (adjustType === "set" && requestedQty < reservedStock) {
      nextErrors.qty = "Set quantity cannot be lower than reserved stock.";
    }
    if (adjustType === "set" && requestedQty === currentStock) {
      nextErrors.qty = "Set quantity must be different from current stock.";
    }
    if (Number.isFinite(stockAfter) && stockAfter < reservedStock) {
      nextErrors.qty = "Final stock cannot be lower than reserved stock.";
    }
    if (note.trim().length > NOTE_MAX_LENGTH) {
      nextErrors.note = `Note cannot be more than ${NOTE_MAX_LENGTH} characters.`;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) setConfirmOpen(true);
  };

  const applyAdjustment = async () => {
    if (!validate()) {
      setConfirmOpen(false);
      return;
    }
    const selectedProductId = getProductId(selected);
    setSubmitting(true);
    try {
      await axiosProvider.patch(ENDPOINTS.products.inventory(selectedProductId), {
        adjustmentType: adjustType,
        quantity: requestedQty,
        ...(variantSku ? { variantSku } : {}),
        reason,
        note: note.trim() || undefined,
      });
      toast.success("Inventory adjusted successfully");
      setQty("");
      setReason("");
      setNote("");
      setConfirmOpen(false);
      setErrors({});
      await loadProductById(selectedProductId, { silent: true });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Adjustment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const activeType = TYPES.find((type) => type.value === adjustType) || TYPES[0];
  const ActiveIcon = activeType.icon;

  return (
    <div>
      <PageHeader
        title="Inventory Adjustment"
        subtitle="Search a product, review stock, then apply a controlled stock correction"
        breadcrumbs={[
          { label: "Inventory Management" },
          { label: "Inventory Adjustment" },
        ]}
      />

      <PermissionGuard
        module="inventory"
        action={ACTIONS.ADJUST}
        fallback={
          <div className="admin-card p-12 text-center text-gray-400">
            You don't have permission to adjust inventory.
          </div>
        }
      >
        <div className="mb-5 grid gap-3 lg:grid-cols-3">
          {[
            { label: "1. Find Product", active: true },
            { label: "2. Review Stock", active: Boolean(selected) },
            { label: "3. Apply Change", active: Boolean(selected && qty && reason) },
          ].map((step) => (
            <div
              key={step.label}
              className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                step.active
                  ? "border-[var(--admin-gold)] bg-[var(--admin-blue-soft)] text-[var(--admin-navy)]"
                  : "border-gray-200 bg-white text-gray-400"
              }`}
            >
              {step.label}
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(390px,0.85fr)]">
          <section className="admin-card flex min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-[var(--admin-line)] px-5 py-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[240px] flex-1">
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-400">
                    Product search
                  </label>
                  <div className="relative">
                    <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && searchProducts()}
                      placeholder="Name, SKU, or keyword"
                      className="admin-input pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-44">
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-400">
                    Stock
                  </label>
                  <select
                    value={stockStatus}
                    onChange={(event) => setStockStatus(event.target.value)}
                    className="admin-input text-sm"
                  >
                    {STOCK_FILTERS.map((option) => (
                      <option key={option.value || "all-stock"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-52">
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-gray-400">
                    Product status
                  </label>
                  <select
                    value={productStatus}
                    onChange={(event) => setProductStatus(event.target.value)}
                    className="admin-input text-sm"
                  >
                    {PRODUCT_STATUS_FILTERS.map((option) => (
                      <option key={option.value || "all-status"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={searchProducts}
                  disabled={searching}
                  className="admin-btn-primary min-w-[110px] justify-center"
                >
                  {searching ? "Searching" : "Search"}
                </button>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="admin-btn-secondary"
                >
                  <MdClose size={16} />
                  Clear
                </button>
              </div>
              {errors.product && <p className="mt-2 text-xs text-red-500">{errors.product}</p>}
            </div>

            <div className="min-h-0 bg-white p-4">
              <div className="hide-scrollbar h-[520px] overflow-y-auto overscroll-contain pr-1 lg:h-[638px]">
                {searching && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="h-28 animate-pulse rounded-lg bg-gray-100" />
                    ))}
                  </div>
                )}

                {!searching && results.length === 0 && (
                  <div className="flex min-h-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 text-center">
                    <MdInventory size={42} className="text-gray-200" />
                    <p className="mt-3 text-sm font-semibold text-gray-500">
                      No products loaded
                    </p>
                    <p className="mt-1 max-w-sm text-xs text-gray-400">
                      Search by name or SKU, or use the filters to load products for stock adjustment.
                    </p>
                  </div>
                )}

                {!searching && results.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {results.map((product) => {
                      const productId = getProductId(product);
                      const active = String(getProductId(selected)) === String(productId);
                      const productAvailable = getAvailableStock(product.stock, product.reservedStock);
                      const productStatusMeta = getStockStatus(product.stock, product.reservedStock, lowStockThreshold);
                      return (
                        <button
                          key={productId}
                          type="button"
                          onClick={() => selectProduct(product)}
                          className={`min-h-[118px] rounded-lg border bg-white p-4 text-left transition hover:border-[var(--admin-gold)] hover:shadow-sm ${
                            active
                              ? "border-[var(--admin-gold)] ring-1 ring-[var(--admin-gold)]"
                              : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-800">
                                {product.title || product.name || "Untitled product"}
                              </p>
                              <p className="mt-1 truncate text-xs text-gray-400">
                                {product.sku || "No SKU"} · {getCategoryName(product.category)}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${productStatusMeta.pill}`}>
                              {productStatusMeta.label}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-gray-400">Stock</p>
                              <p className="font-mono font-semibold text-gray-700">{product.stock ?? 0}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Reserved</p>
                              <p className="font-mono font-semibold text-gray-700">{product.reservedStock ?? 0}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Available</p>
                              <p className={`font-mono font-semibold ${stockBoxClass(productAvailable, lowStockThreshold)}`}>
                                {productAvailable}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            <section className="admin-card overflow-hidden">
              <div className="border-b border-[var(--admin-line)] px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--admin-ink)]">
                      Selected Stock
                    </h2>
                    <p className="mt-1 text-xs text-gray-400">
                      Review before applying an adjustment
                    </p>
                  </div>
                  {selected && (
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-xs font-semibold text-gray-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5">
                {loadingSelected && (
                  <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    Loading selected product...
                  </div>
                )}

                {!selected && (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-400">
                    Select a product from the left to start.
                  </div>
                )}

                {selected && (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">
                          {selected.title || selected.name || "Selected product"}
                        </p>
                        <p className="mt-1 truncate text-xs text-gray-400">
                          {selected.sku || "No SKU"} · {getCategoryName(selected.category)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${selectedStatus.pill}`}>
                        {selectedStatus.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {[
                        { label: "Current", value: currentStock },
                        { label: "Reserved", value: reservedStock },
                        { label: "Available", value: availableStock, color: stockBoxClass(availableStock, lowStockThreshold) },
                        { label: "After", value: Number.isFinite(stockAfter) ? stockAfter : currentStock, color: stockBoxClass(stockAfter, lowStockThreshold) },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg bg-[var(--admin-surface-soft)] px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase text-gray-400">{item.label}</p>
                          <p className={`mt-1 font-mono text-xl font-bold ${item.color || "text-[var(--admin-navy)]"}`}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {Array.isArray(selected.variants) && selected.variants.length > 0 && (
                      <div className="mt-4">
                        <label className="mb-1 block text-xs font-medium text-gray-600">
                          Variant
                        </label>
                        <select
                          value={variantSku}
                          onChange={(event) => {
                            setVariantSku(event.target.value);
                            setQty("");
                            setErrors((prev) => ({
                              ...prev,
                              variant: undefined,
                              qty: undefined,
                            }));
                          }}
                          className="admin-input text-sm"
                        >
                          <option value="">Root product stock</option>
                          {selected.variants.map((variant) => (
                            <option key={variant.sku || variant._id} value={variant.sku}>
                              {variant.sku || variant.title} · Stock: {variant.stock ?? 0} · Reserved: {variant.reservedStock ?? 0}
                            </option>
                          ))}
                        </select>
                        {errors.variant && <p className="mt-1 text-xs text-red-500">{errors.variant}</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            <section className="admin-card overflow-hidden">
              <div className="border-b border-[var(--admin-line)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--admin-ink)]">
                  Adjustment
                </h2>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setAdjustType(type.value);
                          setErrors((prev) => ({
                            ...prev,
                            adjustType: undefined,
                            qty: undefined,
                          }));
                        }}
                        className={`flex min-h-[74px] flex-col items-center justify-center gap-1 rounded-lg border text-xs font-semibold transition ${
                          adjustType === type.value
                            ? "border-[var(--admin-gold)] bg-[var(--admin-blue-soft)] text-[var(--admin-navy)]"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        <Icon size={20} className={adjustType === type.value ? "text-[var(--admin-gold)]" : type.color} />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
                {errors.adjustType && <p className="-mt-2 text-xs text-red-500">{errors.adjustType}</p>}

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    {adjustType === "set" ? "New stock quantity" : "Quantity"}
                  </label>
                  <input
                    type="number"
                    min={adjustType === "set" ? "0" : "1"}
                    value={qty}
                    onChange={(event) => {
                      setQty(event.target.value);
                      setErrors((prev) => ({ ...prev, qty: undefined }));
                    }}
                    className="admin-input text-sm"
                    placeholder={adjustType === "set" ? "Exact stock value" : "Stock movement quantity"}
                  />
                  {errors.qty && <p className="mt-1 text-xs text-red-500">{errors.qty}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Reason
                  </label>
                  <select
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      setErrors((prev) => ({ ...prev, reason: undefined }));
                    }}
                    className="admin-input text-sm"
                  >
                    <option value="">Select reason</option>
                    {adjustmentReasons.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    Note
                  </label>
                  <textarea
                    value={note}
                    onChange={(event) => {
                      setNote(event.target.value);
                      setErrors((prev) => ({ ...prev, note: undefined }));
                    }}
                    maxLength={NOTE_MAX_LENGTH}
                    rows={3}
                    className="admin-input resize-none text-sm"
                    placeholder="Optional internal note"
                  />
                  <div className="mt-1 flex items-center justify-between gap-2">
                    {errors.note ? (
                      <p className="text-xs text-red-500">{errors.note}</p>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs text-gray-400">
                      {note.length}/{NOTE_MAX_LENGTH}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 font-semibold text-gray-700">
                      <ActiveIcon size={16} className={activeType.color} />
                      {activeType.label}
                    </span>
                    <span className={`font-mono font-bold ${adjustmentPreview < 0 ? "text-red-600" : "text-green-600"}`}>
                      {adjustmentPreview > 0 ? "+" : ""}
                      {adjustmentPreview}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => selected && loadProductById(getProductId(selected))}
                    disabled={!selected || loadingSelected}
                    className="admin-btn-secondary"
                  >
                    <MdRefresh size={16} />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || qty === "" || !reason || !selected}
                    className="admin-btn-primary"
                  >
                    {submitting ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <MdTune size={16} />
                    )}
                    Apply
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </PermissionGuard>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={applyAdjustment}
        title="Apply inventory adjustment?"
        message={`This will change ${selected?.title || "the selected product"}${variantSku ? ` (${variantSku})` : ""} from ${currentStock} to ${stockAfter}.`}
        variant={adjustmentPreview < 0 ? "warning" : "info"}
        confirmLabel="Apply Adjustment"
        loading={submitting}
      />
    </div>
  );
};

export default InventoryAdjustment;
