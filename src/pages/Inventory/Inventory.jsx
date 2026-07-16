import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdAdd, MdInventory2, MdOpenInNew, MdRefresh, MdRemove, MdSave } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import { BulkActionBar, ConfirmModal, DataTable, FilterBar, PageHeader, StatusBadge } from "../../components/Shared";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { isSellerPanel } from "../../_helpers/panelConfig";
import { useListPage } from "../../hooks/useListPage";
import { toast } from "../../utils/toast";

const FILTERS = [
  {
    key: "stockStatus",
    type: "select",
    label: "Stock",
    options: [
      { value: "in_stock", label: "In Stock" },
      { value: "low_stock", label: "Low Stock" },
      { value: "out_of_stock", label: "Out of Stock" },
    ],
  },
  {
    key: "variantStatus",
    type: "select",
    label: "Variant Status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "out_of_stock", label: "Out Of Stock" },
    ],
  },
  {
    key: "status",
    type: "select",
    label: "Product Status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "pending_approval", label: "Pending Approval" },
      { value: "draft", label: "Draft" },
    ],
  },
];

const ADJUST_TYPES = [
  { value: "add", label: "Add Stock", icon: MdAdd },
  { value: "remove", label: "Remove Stock", icon: MdRemove },
  { value: "set", label: "Set Exact", icon: MdSave },
];

const STOCK_HISTORY_PAGE_SIZE = 10;

const fmtDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const numberCell = (value, className = "") => (
  <span className={`inline-block min-w-[3ch] text-right font-mono text-sm font-semibold tabular-nums ${className}`}>
    {Number(value || 0)}
  </span>
);

const firstImage = (row = {}) => row.image || "";

const variantTitle = (row = {}) => (
  <div className="min-w-[160px]">
    <p className="font-semibold text-[var(--admin-ink)]">{row.variantName || "Default variant"}</p>
    <p className="text-xs text-[var(--admin-muted)]">{row.variantSku || "No SKU"}</p>
  </div>
);

const productTitle = (row = {}) => (
  <div className="flex min-w-[220px] max-w-[52vw] items-center gap-3 xl:w-[560px]">
    <div className="h-11 w-11 overflow-hidden rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)]">
      {firstImage(row) ? (
        <img src={firstImage(row)} alt={row.productName || "Variant"} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[var(--admin-muted)]">
          <MdInventory2 size={20} />
        </div>
      )}
    </div>
    <div className="min-w-0">
      <p className="truncate font-semibold text-[var(--admin-ink)]" title={row.productName || "Untitled product"}>
        {row.productName || "Untitled product"}
      </p>
      <p className="truncate text-xs text-[var(--admin-muted)]">{row.productSku || "No product SKU"}</p>
      {row.variantCount > 0 && (
        <p className="text-xs text-[var(--admin-muted)]">
          {`${row.variantCount} Variant${row.variantCount === 1 ? "" : "s"}`}
        </p>
      )}
    </div>
  </div>
);

const sumBy = (items = [], key) =>
  items.reduce((total, item) => total + Number(item?.[key] || 0), 0);

const latestDate = (items = [], key) =>
  items
    .map((item) => item?.[key])
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || "";

const productStatusOf = (variants = []) => {
  const statuses = variants
    .flatMap((variant) => [variant.status, variant.stockStatus])
    .filter(Boolean)
    .map((status) => String(status).toLowerCase());
  if (statuses.includes("out_of_stock") || variants.every((variant) => Number(variant.availableStock || 0) <= 0)) {
    return "out_of_stock";
  }
  if (statuses.includes("low_stock")) return "low_stock";
  if (statuses.length && statuses.every((status) => status === "inactive")) return "inactive";
  if (statuses.includes("pending_approval")) return "pending_approval";
  return statuses.find(Boolean) || "active";
};

const groupInventoryByProduct = (variantRows = []) => {
  const groups = new Map();

  variantRows.forEach((variant, index) => {
    const productKey = String(
      variant.productId ||
        variant.product_id ||
        variant.productSku ||
        variant.productName ||
        variant.id ||
        index,
    );

    if (!groups.has(productKey)) {
      groups.set(productKey, {
        ...variant,
        id: productKey,
        productId: variant.productId || variant.product_id || productKey,
        variants: [],
      });
    }

    groups.get(productKey).variants.push(variant);
  });

  return Array.from(groups.values()).map((group) => {
    const variants = group.variants || [];
    return {
      ...group,
      variantCount: variants.length,
      currentStock: sumBy(variants, "currentStock"),
      reservedStock: sumBy(variants, "reservedStock"),
      availableStock: sumBy(variants, "availableStock"),
      lastUpdated: latestDate(variants, "lastUpdated"),
      status: productStatusOf(variants),
    };
  });
};

const variantSummary = (row = {}) => {
  const variants = Array.isArray(row.variants) ? row.variants : [];

  return (
    <span className="inline-flex rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--admin-ink)]">
      {`${variants.length} Variant${variants.length === 1 ? "" : "s"}`}
    </span>
  );
};

const looksLikeId = (value = "") =>
  /^[a-f0-9]{24}$/i.test(String(value)) ||
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));

const sellerLabel = (row = {}) => {
  const seller = row.seller && typeof row.seller === "object" ? row.seller : {};
  const organization = row.organizationSnapshot || row.organization_snapshot || {};
  const label =
    row.sellerName ||
    row.seller_name ||
    row.sellerDisplayName ||
    row.seller_display_name ||
    row.organizationName ||
    row.organization_name ||
    organization.storeDisplayName ||
    organization.legalBusinessName ||
    organization.legalName ||
    organization.name ||
    organization.businessName ||
    seller.displayName ||
    seller.businessName ||
    seller.legalBusinessName ||
    seller.name ||
    (typeof row.seller === "string" ? row.seller : "");

  return label && !looksLikeId(label) ? label : "Seller details unavailable";
};

const getRowsFromResponse = (response) => {
  const payload = response?.data || {};
  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const getTotalFromResponse = (response, fallback = 0) =>
  Number(
    response?.data?.meta?.pagination?.totalItems ??
      response?.data?.meta?.total ??
      response?.data?.total ??
      fallback,
  );

const AdjustModal = ({ open, target, loading, onClose, onConfirm }) => {
  const [form, setForm] = useState({
    adjustmentType: "set",
    quantity: "",
    reason: "",
    note: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      adjustmentType: "set",
      quantity: target?.currentStock ?? target?.stock ?? "",
      reason: "",
      note: "",
    });
  }, [open, target]);

  const submit = () => {
    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error("Stock quantity must be a non-negative number");
      return;
    }
    onConfirm({
      adjustmentType: form.adjustmentType,
      quantity,
      reason: form.reason,
      note: form.note,
    });
  };

  const isBulk = Array.isArray(target?.rows);

  return (
    <ConfirmModal
      open={open}
      title={isBulk ? "Bulk Adjust Inventory" : "Adjust Variant Inventory"}
      message={isBulk ? `${target?.rows?.length || 0} variants selected` : `${target?.productName || ""} · ${target?.variantName || ""}`}
      confirmLabel="Update Stock"
      variant="info"
      loading={loading}
      onClose={onClose}
      onConfirm={submit}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {ADJUST_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, adjustmentType: value }))}
              className={`flex min-h-10 items-center justify-center gap-1 rounded-md border px-2 text-xs font-semibold transition ${
                form.adjustmentType === value
                  ? "border-[var(--admin-blue)] bg-[var(--admin-blue-soft)] text-[var(--admin-blue)]"
                  : "border-[var(--admin-line)] bg-white text-[var(--admin-muted)] hover:text-[var(--admin-ink)]"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--admin-muted)]">Quantity</span>
          <input
            type="number"
            min={0}
            value={form.quantity}
            onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
            className="admin-input"
            placeholder="0"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--admin-muted)]">Reason</span>
          <input
            value={form.reason}
            onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
            className="admin-input"
            placeholder="Cycle count, restock, damage, correction"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[var(--admin-muted)]">Note</span>
          <textarea
            value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
            className="admin-input min-h-[72px]"
            placeholder="Optional internal note"
          />
        </label>
      </div>
    </ConfirmModal>
  );
};

const Inventory = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "updatedAt" });
  const adminPanel = !isSellerPanel();
  const { toQueryParams } = list;
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjusting, setAdjusting] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const fetchList = useCallback(async () => {
    if (productId) return;
    setLoading(true);
    setError("");
    try {
      const params = toQueryParams();
      const response = await axiosProvider.get(ENDPOINTS.inventory.variants, { params });
      const nextRows = getRowsFromResponse(response);
      setRows(nextRows);
      setTotal(getTotalFromResponse(response, nextRows.length));
    } catch (err) {
      setError(err?.message || "Unable to load inventory");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [productId, toQueryParams]);

  const fetchDetail = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError("");
    try {
      const response = await axiosProvider.get(ENDPOINTS.inventory.product(productId));
      setDetail(response?.data?.data || null);
    } catch (err) {
      setError(err?.message || "Unable to load product inventory");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) fetchDetail();
    else fetchList();
  }, [fetchDetail, fetchList, productId]);

  const refresh = () => (productId ? fetchDetail() : fetchList());

  const detailVariants = detail?.variants || [];
  const transactions = useMemo(() => detail?.transactions?.items || [], [detail?.transactions?.items]);
  const pagedTransactions = useMemo(() => {
    const offset = (historyPage - 1) * STOCK_HISTORY_PAGE_SIZE;
    return transactions.slice(offset, offset + STOCK_HISTORY_PAGE_SIZE);
  }, [historyPage, transactions]);
  const productRows = useMemo(() => groupInventoryByProduct(rows), [rows]);
  useEffect(() => {
    setHistoryPage(1);
  }, [productId]);

  const selectedProductRows = useMemo(
    () => productRows.filter((row) => list.selectedKeys.includes(row.id)),
    [list.selectedKeys, productRows],
  );

  const selectedVariantRows = useMemo(
    () => selectedProductRows.flatMap((row) => row.variants || []),
    [selectedProductRows],
  );

  const adjustRows = async (target, payload) => {
    const targetRows = Array.isArray(target?.rows) ? target.rows : [target];
    setAdjusting(true);
    try {
      await Promise.all(targetRows.map((row) =>
        axiosProvider.patch(ENDPOINTS.inventory.adjustVariant(row.productId, row.variantSku), payload),
      ));
      toast.success(targetRows.length > 1 ? "Selected variant stock updated" : "Variant stock updated");
      setAdjustTarget(null);
      list.clearSelection();
      refresh();
    } catch (err) {
      toast.error(err?.message || "Unable to update inventory");
    } finally {
      setAdjusting(false);
    }
  };

  const baseColumns = [
    {
    key: "productName",
    label: "Product",
    sortable: true,
    render: (_, row) => (
      <button
        type="button"
        className="text-left hover:underline"
        onClick={(e) => {
          e.stopPropagation();

          const productIdValue = row?.productId || row?.product_id || row?.id;

          if (productIdValue) {
            navigate(`/app/product-catalog/view/${productIdValue}`);
          }
        }}
      >
        {productTitle(row)}
      </button>
    ),
  },
    { key: "variantName", label: "Variant", render: (_, row) => variantTitle(row) },
    { key: "sku", label: "SKU", render: (value) => <span className="font-mono text-xs">{value || "N/A"}</span> },
    { key: "currentStock", label: "Current", sortable: true, render: (value) => numberCell(value) },
    { key: "reservedStock", label: "Reserved", render: (value) => numberCell(value, "text-amber-600") },
    { key: "availableStock", label: "Available", render: (value) => numberCell(value, Number(value || 0) <= 0 ? "text-red-600" : "text-emerald-700") },
    { key: "status", label: "Status", render: (value) => <StatusBadge status={value} dot /> },
  ];

  const listColumns = [
    { key: "productName", label: "Product", sortable: true, render: (_, row) => productTitle(row) },
    { key: "variants", label: "Variants", render: (_, row) => variantSummary(row) },
    { key: "currentStock", label: "Current", sortable: true, render: (value) => numberCell(value) },
    { key: "reservedStock", label: "Reserved", render: (value) => numberCell(value, "text-amber-600") },
    { key: "availableStock", label: "Available", render: (value) => numberCell(value, Number(value || 0) <= 0 ? "text-red-600" : "text-emerald-700") },
    { key: "status", label: "Status", render: (value) => <StatusBadge status={value} dot /> },
    ...(adminPanel ? [{ key: "seller", label: "Seller", render: (_, row) => sellerLabel(row) }] : []),
    { key: "lastUpdated", label: "Last Updated", sortable: true, render: fmtDate },
  ];

  const transactionColumns = [
    { key: "createdAt", label: "Date", render: fmtDate },
    { key: "variantSku", label: "Variant SKU", render: (value) => <span className="font-mono text-xs">{value || "N/A"}</span> },
    { key: "type", label: "Type", render: (value) => <StatusBadge status={value} /> },
    { key: "quantity", label: "Change", render: (value) => numberCell(value, Number(value || 0) < 0 ? "text-red-600" : "text-emerald-700") },
    { key: "actorRole", label: "Actor" },
    { key: "metadata", label: "Reason", render: (value) => value?.reason || value?.note || "N/A" },
  ];

  const sellerView = isSellerPanel();
  if (productId) {
    const product = detail?.product || {};
    return (
      <div>
        <PageHeader
          title="Product Inventory"
          subtitle={product.name || "Variant-wise stock and history"}
          backPath="/app/inventory"
          status={product.status}
        />

        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="admin-card flex items-center gap-4 p-4">
            <div className="h-16 w-16 overflow-hidden rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)]">
              {product.image ? <img src={product.image} alt={product.name} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[var(--admin-ink)]">{product.name || "Untitled product"}</p>
              <p className="text-xs text-[var(--admin-muted)]">SKU: {product.sku || "N/A"}</p>
              {adminPanel && <p className="text-xs text-[var(--admin-muted)]">Seller: {product.seller || "N/A"}</p>}
            </div>
          </div>
        </div>

        <DataTable
          columns={[...baseColumns, { key: "lastUpdated", label: "Last Updated", render: fmtDate }]}
          data={detailVariants}
          loading={loading}
          error={error}
          totalCount={detailVariants.length}
          rowKey="id"
          searchPlaceholder="Search variants"
          onRefresh={refresh}
          emptyText="No variants found"
          rowActions={(row) => [
            { label: "Adjust Inventory", icon: <MdInventory2 />, onClick: () => setAdjustTarget(row) },
          ]}
        />

        <div className="mt-5">
          <PageHeader title="Stock History" subtitle="Complete movement log for this product's variants" />
          <DataTable
            columns={transactionColumns}
            data={pagedTransactions}
            loading={loading}
            totalCount={transactions.length}
            page={historyPage}
            pageSize={STOCK_HISTORY_PAGE_SIZE}
            onPageChange={setHistoryPage}
            rowKey={(row, index) => row._id || row.id || index}
            emptyText="No stock history found"
            cardClassName="admin-card overflow-hidden"
          />
        </div>

        <AdjustModal
          open={Boolean(adjustTarget)}
          target={adjustTarget}
          loading={adjusting}
          onClose={() => setAdjustTarget(null)}
          onConfirm={(payload) => adjustRows(adjustTarget, payload)}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Product-level inventory list with variant stock managed inside each product"
        count={productRows.length}
         breadcrumbs={[
          { label: sellerView ? "Seller Inventory" : "Inventory" },
          { label: "Inventory" },
        ]}
      />

      <DataTable
        columns={listColumns}
        data={productRows}
        loading={loading}
        error={error}
        totalCount={total}
        listPage={list}
        rowKey="id"
        selectable
        selectedKeys={list.selectedKeys}
        onSelectionChange={list.setSelectedKeys}
        onRefresh={refresh}
        searchPlaceholder="Search product, variant, or SKU"
        filterBar={<FilterBar filters={FILTERS} listPage={list} loading={loading} />}
        bulkActionBar={
          <BulkActionBar
            selectedCount={list.selectedCount}
            totalCount={productRows.length}
            onClear={list.clearSelection}
            module="inventory"
            actions={[
              {
                label: "Bulk Adjust Variants",
                action: "adjust",
                icon: <MdInventory2 />,
                variant: "primary",
                disabled: selectedVariantRows.length === 0,
                onClick: () => setAdjustTarget({ rows: selectedVariantRows }),
              },
            ]}
          />
        }
        emptyText="No inventory products found"
        onRowClick={(row) => navigate(`/app/inventory/${row.productId}`)}
        rowActions={(row) => {
          const variants = row.variants || [];
          return [
            { label: "View Product Inventory", icon: <MdOpenInNew />, onClick: () => navigate(`/app/inventory/${row.productId}`) },
            {
              label: "Quick Adjust",
              icon: <MdInventory2 />,
              hidden: variants.length !== 1,
              onClick: () => setAdjustTarget(variants[0]),
            },
          ];
        }}
      />

      <AdjustModal
        open={Boolean(adjustTarget)}
        target={adjustTarget}
        loading={adjusting}
        onClose={() => setAdjustTarget(null)}
        onConfirm={(payload) => adjustRows(adjustTarget, payload)}
      />
    </div>
  );
};

export default Inventory;
