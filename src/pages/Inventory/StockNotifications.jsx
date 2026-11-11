import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MdEmail,
  MdInventory2,
  MdRefresh,
  MdSend,
  MdClose,
  MdImageNotSupported,
} from "react-icons/md";
import { toast } from "sonner";
import {
  BulkActionBar,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
  CustomerIdentity,
  SellerIdentity,
} from "../../components/Shared";
import FilterSelect from "../../components/Atoms/FilterSelect/FilterSelect";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { isSellerPanel } from "../../_helpers/panelConfig";
import { formatDateTime12Hour } from "../../utils/formatters";
import { useNavigate } from "react-router-dom";
import { Upload } from "lucide-react";

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

const productImageCell = (row = {}, onPreview) => (
  <div className="flex flex-col items-center gap-1">
    {row.productImage ? (
      <>
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-[var(--admin-line)] bg-white">
          <img
            src={row.productImage}
            alt={row.productTitle || "Product"}
            loading="lazy"
            className="h-full w-full object-contain p-1"
          />
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreview(row.productImage);
          }}
          className="text-xs font-medium text-[var(--admin-blue)] hover:underline"
        >
          View
        </button>
      </>
    ) : (
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--admin-line)] bg-white text-[var(--admin-muted)]">
        <MdImageNotSupported size={20} />
      </div>
    )}
  </div>
);

const productNameCell = (row = {}) => (
  <div className="min-w-[180px] max-w-[300px]">
    <p
      className="truncate font-semibold text-[var(--admin-ink)]"
      title={row.productTitle || "Untitled product"}
    >
      {row.productTitle || "Untitled product"}
    </p>
    <p className="truncate text-xs text-[var(--admin-muted)]">
      {row.variantTitle || row.sku || "Default variant"}
    </p>
  </div>
);

const userCell = (row = {}) => (
  <CustomerIdentity row={row} name={row.name} loginName={row.email} />
);

const StockNotifications = () => {
  const navigate = useNavigate();
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
  const [previewImage, setPreviewImage] = useState("");
  const selectedStatusOption = useMemo(
    () =>
      STATUS_OPTIONS.find((option) => option.value === status) ||
      STATUS_OPTIONS[0],
    [status],
  );
  const handleViewInventory = useCallback(
    (row) => {
      if (!row?.productId) {
        toast.error("Product ID not found");
        return;
      }

      navigate(`/app/inventory/${encodeURIComponent(row.productId)}`, {
        state: {
          productId: row.productId,
          sku: row.sku || null,
          variantId: row.variantId || null,
        },
      });
    },
    [navigate],
  );
  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosProvider.get(
        ENDPOINTS.stockNotifications.list,
        {
          params: {
            search: search || undefined,
            status: status || undefined,
            limit: pageSize,
            offset: (page - 1) * pageSize,
          },
        },
      );
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

  const notifyUser = useCallback(
    async (row) => {
      if (!row?.productId) return;
      const message = window.prompt(
        "Optional message for the customer email",
        "Your requested product is back in stock. Order soon while it is available.",
      );
      if (message === null) return;

      try {
        setSendingId(row.id);
        const response = await axiosProvider.post(
          ENDPOINTS.stockNotifications.notify,
          {
            productId: row.productId,
            variantId: row.variantId || null,
            message,
          },
        );
        const result = response?.data?.data || {};
        toast.success(
          `Email queued: ${result.queued || 0} queued, ${result.failed || 0} failed`,
        );
        await fetchRows();
      } catch (error) {
        toast.error(error?.message || "Failed to send stock email");
      } finally {
        setSendingId("");
      }
    },
    [fetchRows],
  );

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
      const response = await axiosProvider.post(
        ENDPOINTS.stockNotifications.notifyBulk,
        {
          items,
          message,
        },
      );
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

  const columns = useMemo(
    () => [
      {
        key: "productImage",
        label: "Image",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (_, row) =>
          productImageCell(row, (image) => setPreviewImage(image)),
      },
      { key: "customer", label: "User", render: (_, row) => userCell(row) },

      {
        key: "product",
        label: "Product",
        render: (_, row) => productNameCell(row),
      },
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
      ...(!sellerView
        ? [
            {
              key: "sellerId",
              label: "Seller",
              render: (value, row) => (
                <SellerIdentity row={row} sellerId={value} />
              ),
            },
          ]
        : []),
    ],
    [sellerView],
  );

  const exportColumns = useMemo(
    () => [
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
    ],
    [],
  );

  const FILTER_FIELDS = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS,
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Notifications"
        subtitle={
          sellerView
            ? "Customers waiting for your products to return to stock."
            : "All customer back-in-stock requests across products and sellers."
        }
        breadcrumbs={[
          { label: "Inventory", to: "/app/inventory" },
          { label: "Stock Notifications" },
        ]}
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
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            listPage={{
              page,
              pageSize,
              search,
              setPage,
              setPageSize,
              setSearch,
            }}
            loading={loading}
          />
        }
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
                icon: <MdSend aria-hidden="true" size={15} />,
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

          icon: (
            <Upload
              size={15}
              className="shrink-0 text-[var(--admin-blue)]"
              aria-hidden="true"
            />
          ),
        }}
        rowActions={(row) => [
          {
            label: "View Inventory",
            icon: <MdInventory2 aria-hidden="true" size={17} />,
            onClick: () => handleViewInventory(row),
            disabled: !row.productId,
          },
        ]}
      />

      {previewImage && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-950/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewImage("");
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Product image preview"
            className="relative flex max-h-[85vh] w-full max-w-2xl items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setPreviewImage("")}
              aria-label="Close image preview"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-100"
            >
              <MdClose size={21} />
            </button>

            <img
              src={previewImage}
              alt="Product preview"
              className="max-h-[75vh] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StockNotifications;
