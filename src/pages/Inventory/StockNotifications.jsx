import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdEmail, MdInventory2, MdRefresh, MdSend } from "react-icons/md";
import { toast } from "sonner";
import { BulkActionBar, DataTable, PageHeader, StatusBadge } from "../../components/Shared";
import FilterSelect from "../../components/Atoms/FilterSelect/FilterSelect";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { isSellerPanel } from "../../_helpers/panelConfig";
import { formatDateTime12Hour } from "../../utils/formatters";

const STATUS_OPTIONS = [
  { value: "", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "queued", label: "Queued" },
  { value: "notified", label: "Notified" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const getPaginationTotal = (payload = {}, fallback = 0) =>
  Number(
    payload?.pagination?.total ??
      payload?.meta?.total ??
      payload?.meta?.pagination?.total ??
      fallback,
  );

const productCell = (row = {}) => (
  <div className="flex min-w-[260px] max-w-[520px] items-center gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--admin-line)] bg-white">
      {row.productImage ? (
        <img
          src={row.productImage}
          alt={row.productTitle || "Product"}
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <MdInventory2 size={20} className="text-[var(--admin-muted)]" />
      )}
    </div>
    <div className="min-w-0">
      <p className="truncate font-semibold text-[var(--admin-ink)]">
        {row.productTitle || "Untitled product"}
      </p>
      <p className="truncate text-xs text-[var(--admin-muted)]">
        {row.variantTitle || row.sku || "Default variant"}
      </p>
      <p className="truncate font-mono text-[11px] text-[var(--admin-muted)]">
        {row.productId}
      </p>
    </div>
  </div>
);

const userCell = (row = {}) => (
  <div className="min-w-[210px]">
    <p className="font-semibold text-[var(--admin-ink)]">{row.name || "N/A"}</p>
    <p className="text-xs text-[var(--admin-muted)]">{row.email || "N/A"}</p>
  </div>
);

const StockNotifications = () => {
  const sellerView = isSellerPanel();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [sendingId, setSendingId] = useState("");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [bulkSending, setBulkSending] = useState(false);
  const selectedStatusOption = useMemo(
    () => STATUS_OPTIONS.find((option) => option.value === status) || STATUS_OPTIONS[0],
    [status],
  );

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosProvider.get(ENDPOINTS.stockNotifications.list, {
        params: {
          search: search || undefined,
          status: status || undefined,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
      });
      const payload = response?.data || {};
      const list = Array.isArray(payload.data) ? payload.data : [];
      setRows(list);
      setTotal(getPaginationTotal(payload, list.length));
    } catch (error) {
      toast.error(error?.message || "Failed to load stock notifications");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const notifyUser = useCallback(async (row) => {
    if (!row?.productId) return;
    const message = window.prompt(
      "Optional message for the customer email",
      "Your requested product is back in stock. Order soon while it is available.",
    );
    if (message === null) return;

    try {
      setSendingId(row.id);
      const response = await axiosProvider.post(ENDPOINTS.stockNotifications.notify, {
        productId: row.productId,
        variantId: row.variantId || null,
        message,
      });
      const result = response?.data?.data || {};
      toast.success(`Email queued: ${result.queued || 0} queued, ${result.failed || 0} failed`);
      await fetchRows();
    } catch (error) {
      toast.error(error?.message || "Failed to send stock email");
    } finally {
      setSendingId("");
    }
  }, [fetchRows]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedKeys.includes(row.id)),
    [rows, selectedKeys],
  );

  const notifySelected = useCallback(async () => {
    if (!selectedRows.length) return;
    const items = Array.from(
      new Map(
        selectedRows
          .filter((row) => row?.productId)
          .map((row) => [
            `${row.productId}:${row.variantId || ""}`,
            { productId: row.productId, variantId: row.variantId || null },
          ]),
      ).values(),
    );
    if (!items.length) return;

    const message = window.prompt(
      "Optional message for the customer email",
      "Your requested product is back in stock. Order soon while it is available.",
    );
    if (message === null) return;

    try {
      setBulkSending(true);
      const response = await axiosProvider.post(ENDPOINTS.stockNotifications.notifyBulk, {
        items,
        message,
      });
      const result = response?.data?.data || {};
      toast.success(
        `Batch queued: ${result.queued || 0} emails, ${result.skipped || 0} products skipped, ${result.failed || 0} failed`,
      );
      setSelectedKeys([]);
      await fetchRows();
    } catch (error) {
      toast.error(error?.message || "Failed to queue selected stock emails");
    } finally {
      setBulkSending(false);
    }
  }, [fetchRows, selectedRows]);

  const columns = useMemo(() => [
    { key: "customer", label: "User", render: (_, row) => userCell(row) },
    { key: "product", label: "Product", render: (_, row) => productCell(row) },
    { key: "sku", label: "SKU" },
    {
      key: "price",
      label: "Price",
      render: (value) =>
        value === null || value === undefined
          ? "N/A"
          : `₹${Number(value || 0).toLocaleString("en-IN")}`,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value || "pending"} dot />,
    },
    {
      key: "requestedAt",
      label: "Requested",
      render: (value) => formatDateTime12Hour(value),
    },
    {
      key: "notifiedAt",
      label: "Notified",
      render: (value) => formatDateTime12Hour(value),
    },
    ...(!sellerView ? [{ key: "sellerId", label: "Seller ID" }] : []),
  ], [sellerView]);

  const exportColumns = useMemo(() => [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "productId", label: "Product ID" },
    { key: "productTitle", label: "Product" },
    { key: "variantId", label: "Variant ID" },
    { key: "variantTitle", label: "Variant" },
    { key: "sku", label: "SKU" },
    { key: "price", label: "Price" },
    { key: "sellerId", label: "Seller ID" },
    { key: "status", label: "Status" },
    { key: "requestedAt", label: "Requested At" },
    { key: "notifiedAt", label: "Notified At" },
  ], []);

  const filterBar = (
    <div className="flex flex-wrap items-end gap-3 border-b border-[var(--admin-line)] bg-white px-4 py-3">
      <div className="w-56">
        <FilterSelect
          label="Status"
          value={selectedStatusOption}
          options={STATUS_OPTIONS}
          onChange={(option) => {
            setStatus(option?.value || "");
            setPage(1);
          }}
        />
      </div>
      <button
        type="button"
        className="admin-btn-secondary"
        onClick={fetchRows}
        disabled={loading}
      >
        <MdRefresh size={17} />
        Refresh
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Notifications"
        subtitle={
          sellerView
            ? "Customers waiting for your products to return to stock."
            : "All customer back-in-stock requests across products and sellers."
        }
        breadcrumbs={[
          { label: sellerView ? "Seller" : "Admin", to: "/app/home" },
          { label: "Inventory", to: "/app/inventory" },
          { label: "Stock Notifications" },
        ]}
        count={total}
      />

      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        loading={loading}
        totalCount={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search name, email, product, SKU..."
        filterBar={filterBar}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        bulkActionBar={
          <BulkActionBar
            selectedCount={selectedKeys.length}
            totalCount={rows.length}
            onClear={() => setSelectedKeys([])}
            module="inventory"
            loading={bulkSending}
            actions={[
              {
                label: "Queue emails",
                icon: <MdSend size={15} />,
                action: "adjust",
                variant: "primary",
                onClick: notifySelected,
                disabled: !selectedRows.length,
              },
            ]}
          />
        }
        onRefresh={fetchRows}
        emptyText="No stock notification requests found."
        exportConfig={{
          filename: "stock-notifications",
          columns: exportColumns,
          data: rows,
        }}
        rowActions={(row) => [
          {
            label: row.status === "pending" ? "Send Email" : "Send Again",
            icon: <MdEmail size={17} />,
            onClick: () => notifyUser(row),
            disabled: sendingId === row.id,
          },
        ]}
      />
    </div>
  );
};

export default StockNotifications;
