import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdAdd, MdInventory2, MdOpenInNew, MdRemove, MdSave } from "react-icons/md";
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
  <div className="flex w-[280px] max-w-[280px] items-center gap-3">
    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)]">
      {firstImage(row) ? (
        <img src={firstImage(row)} alt={row.productName || "Variant"} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[var(--admin-muted)]">
          <MdInventory2 size={20} />
        </div>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <p
        className="truncate font-semibold text-[var(--admin-ink)]"
        title={row.productName || "Untitled product"}
      >
        {row.productName || "Untitled product"}
      </p>
      <p className="truncate text-xs text-[var(--admin-muted)]">{row.productSku || "No product SKU"}</p>
    </div>
  </div>
);

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
  const transactions = detail?.transactions?.items || [];

  const selectedRows = useMemo(
    () => rows.filter((row) => list.selectedKeys.includes(row.id)),
    [list.selectedKeys, rows],
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
    { key: "productName", label: "Product", sortable: true, render: (_, row) => productTitle(row) },
    { key: "variantName", label: "Variant", render: (_, row) => variantTitle(row) },
    { key: "sku", label: "SKU", render: (value) => <span className="font-mono text-xs">{value || "N/A"}</span> },
    { key: "currentStock", label: "Current", sortable: true, render: (value) => numberCell(value) },
    { key: "reservedStock", label: "Reserved", render: (value) => numberCell(value, "text-amber-600") },
    { key: "availableStock", label: "Available", render: (value) => numberCell(value, Number(value || 0) <= 0 ? "text-red-600" : "text-emerald-700") },
    { key: "status", label: "Status", render: (value) => <StatusBadge status={value} dot /> },
  ];

  const listColumns = [
    ...baseColumns,
    ...(adminPanel ? [{
      key: "seller",
      label: "Seller",
      headerClassName: "w-[180px]",
      cellClassName: "w-[180px]",
      render: (value) => value || "N/A",
    }] : []),
    {
      key: "lastUpdated",
      label: "Last Updated",
      sortable: true,
      headerClassName: "w-[190px]",
      cellClassName: "w-[190px]",
      render: fmtDate,
    },
  ];

  const transactionColumns = [
    { key: "createdAt", label: "Date", render: fmtDate },
    { key: "variantSku", label: "Variant SKU", render: (value) => <span className="font-mono text-xs">{value || "N/A"}</span> },
    { key: "type", label: "Type", render: (value) => <StatusBadge status={value} /> },
    { key: "quantity", label: "Change", render: (value) => numberCell(value, Number(value || 0) < 0 ? "text-red-600" : "text-emerald-700") },
    { key: "actorRole", label: "Actor" },
    { key: "metadata", label: "Reason", render: (value) => value?.reason || value?.note || "N/A" },
  ];

  if (productId) {
    const product = detail?.product || {};
    return (
      <div className="p-4 md:p-6">
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
            data={transactions}
            loading={loading}
            totalCount={transactions.length}
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
    <div className="p-4 md:p-6">
      <PageHeader
        title="Inventory"
        subtitle="One variant-level inventory workflow for product stock, reservations, and adjustments"
        count={total}
      />

      <DataTable
        columns={listColumns}
        data={rows}
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
            totalCount={rows.length}
            onClear={list.clearSelection}
            module="inventory"
            actions={[
              {
                label: "Bulk Adjust",
                action: "adjust",
                icon: <MdInventory2 />,
                variant: "primary",
                disabled: selectedRows.length === 0,
                onClick: () => setAdjustTarget({ rows: selectedRows }),
              },
            ]}
          />
        }
        emptyText="No inventory variants found"
        onRowClick={(row) => navigate(`/app/inventory/${row.productId}`)}
        rowActions={(row) => [
          { label: "View / Adjust Inventory", icon: <MdOpenInNew />, onClick: () => navigate(`/app/inventory/${row.productId}`) },
          { label: "Quick Adjust", icon: <MdInventory2 />, onClick: () => setAdjustTarget(row) },
        ]}
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
