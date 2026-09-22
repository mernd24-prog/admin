import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MdAdd,
  MdInventory2,
  MdOpenInNew,
  MdRemove,
  MdRefresh,
  MdSave,
} from "react-icons/md";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  FormSection,
  ImageThumbnail,
  PageHeader,
  SellerLink,
  StatusBadge,
} from "../../components/Shared";
import OrangeButton from "../../components/Atoms/buttons/OrangeButton";
import Loader from "../../components/Loader/Loader";
import { exportToExcel, parseImportFile } from "../../_helpers/exportToCsv";
import { isSellerPanel } from "../../_helpers/panelConfig";
import { useListPage } from "../../hooks/useListPage";
import {
  adjustInventory,
  bulkUpdateInventory,
  getInventoryDetail,
  getInventoryList,
} from "../../Redux/inventorySlice";
import { formatDateTime12Hour } from "../../utils/formatters";
import { toast } from "../../utils/toast";
import ImageGallery from "../../components/Atoms/ImageGallery/ImageGallery";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";

import FormInput from "../../components/Atoms/FormInput/FormInput";

const isSeller = isSellerPanel();

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

const getInitialInventoryFilters = () => {
  const params = new URLSearchParams(window.location.search);
  return ["stockStatus", "variantStatus", "status"].reduce((filters, key) => {
    const value = params.get(key);
    if (value) filters[key] = value;
    return filters;
  }, {});
};

const IMPORT_COLUMNS = [
  "productId",
  "productName",
  "productSku",
  "variantId",
  "variantSku",
  "variantName",
  "currentStock",
  "newStock",
];

const EDITABLE_IMPORT_COLUMN = "newStock";
const READ_ONLY_IMPORT_COLUMNS = IMPORT_COLUMNS.filter(
  (column) => column !== EDITABLE_IMPORT_COLUMN,
);

const getErrorMessage = (error, fallback) => {
  if (typeof error === "string" && error.trim()) return error;

  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    fallback
  );
};

const normalizeText = (value) => String(value ?? "").trim();

const normalizeNumber = (value) => {
  if (value === "" || value === null || value === undefined) return "";

  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : normalizeText(value);
};

const buildImportValidationError = (message) =>
  `${message} Export a fresh template and edit only the "${EDITABLE_IMPORT_COLUMN}" column.`;

const unwrapApiPayload = (response) =>
  response?.data?.data ?? response?.data ?? response ?? {};

const getRowsFromResponse = (response) => {
  const payload = unwrapApiPayload(response);

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;

  return [];
};

const getTotalFromResponse = (response, fallback = 0) => {
  const payload = unwrapApiPayload(response);

  return Number(
    response?.data?.meta?.productTotal ??
      response?.data?.data?.meta?.productTotal ??
      payload?.meta?.productTotal ??
      payload?.meta?.pagination?.totalItems ??
      payload?.total ??
      fallback,
  );
};

const getDetailFromResponse = (response) => {
  const payload = unwrapApiPayload(response);

  if (payload?.product || payload?.variants) return payload;
  if (payload?.data?.product || payload?.data?.variants) {
    return payload.data;
  }

  return null;
};

const numberCell = (value, className = "") => (
  <span
    className={`inline-block min-w-[3ch] text-right font-mono text-sm font-semibold tabular-nums ${className}`}
  >
    {Number(value || 0)}
  </span>
);

const firstImage = (row = {}) => row.image || "";

const getVariantImage = (variant = {}) => {
  if (Array.isArray(variant.images) && variant.images.length > 0) {
    return variant.images.filter(Boolean)[0] || "";
  }

  return variant.image || "";
};

const getVariantImagesList = (variant = {}) => {
  if (Array.isArray(variant.images) && variant.images.length > 0) {
    return variant.images.filter(Boolean);
  }

  return variant.image ? [variant.image] : [];
};

const variantTitle = (row = {}) => (
  <div className="min-w-[160px]">
    <p className="font-semibold text-[var(--admin-ink)]">
      {row.variantName || "Default variant"}
    </p>
    <p className="text-xs text-[var(--admin-muted)]">
      {row.variantSku || row.sku || "No SKU"}
    </p>
  </div>
);

const productTitle = (row = {}) => (
  <div className="min-w-[220px] max-w-[52vw] xl:w-[560px]">
    <div className="min-w-0">
      <p
        className="truncate font-semibold text-[var(--admin-ink)]"
        title={row.productName || "Untitled product"}
      >
        {row.productName || "Untitled product"}
      </p>

      <p className="truncate text-xs text-[var(--admin-muted)]">
        {row.productSku || "No product SKU"}
      </p>

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

  if (
    statuses.includes("out_of_stock") ||
    variants.every((variant) => Number(variant.availableStock || 0) <= 0)
  ) {
    return "out_of_stock";
  }

  if (statuses.includes("low_stock")) return "low_stock";

  if (statuses.length && statuses.every((status) => status === "inactive")) {
    return "inactive";
  }

  if (statuses.includes("pending_approval")) {
    return "pending_approval";
  }

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
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value),
  );

const sellerLabel = (row = {}) => {
  const seller = row.seller && typeof row.seller === "object" ? row.seller : {};

  const organization =
    row.organizationSnapshot || row.organization_snapshot || {};

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

const prepareDetailVariants = (variants = [], product = {}) =>
  variants.map((variant, index) => {
    const currentStock = Number(variant.currentStock ?? variant.stock ?? 0);

    return {
      ...variant,
      id:
        variant.id ||
        variant._id ||
        `${product.id || product._id || product.productId}-${variant.variantSku || variant.sku || index}`,
      productId:
        variant.productId ||
        variant.product_id ||
        product.id ||
        product._id ||
        product.productId ||
        "",
      productName: variant.productName || product.name || product.title || "",
      productSku: variant.productSku || product.sku || "",
      variantId:
        variant.variantId ||
        variant.variant_id ||
        variant._id ||
        variant.id ||
        "",
      variantSku: variant.variantSku || variant.sku || "",
      variantName:
        variant.variantName ||
        variant.variantTitle ||
        variant.title ||
        variant.name ||
        "Default variant",
      originalStock: currentStock,
      currentStock,
    };
  });

const isPendingStock = (row = {}) =>
  Number(row.currentStock) !== Number(row.originalStock);

const getVariantIdentity = (row = {}) =>
  [
    normalizeText(row.productId),
    normalizeText(row.variantId),
    normalizeText(row.variantSku),
  ].join("::");

const getExpectedImportValue = (row, column) => {
  const values = {
    productId: row.productId,
    productName: row.productName,
    productSku: row.productSku,
    variantId: row.variantId,
    variantSku: row.variantSku,
    variantName: row.variantName,
    currentStock: row.originalStock,
  };

  return values[column];
};

const importValuesMatch = (actual, expected, column) => {
  if (column === "currentStock") {
    return normalizeNumber(actual) === normalizeNumber(expected);
  }

  return normalizeText(actual) === normalizeText(expected);
};

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

  return (
   <DefaultModal
  isOpen={open}
  onClose={onClose}
  title="Adjust Variant Inventory"
  subtitle={`${target?.productName || ""} · ${
    target?.variantName || ""
  }`}
  onSubmit={submit}
  loading={loading}
  submitButtonText="Update Stock"
>
  <div className="space-y-5">
    {/* Adjustment Type */}
    <FormSection
      title="Adjustment Type"
      subtitle="Choose how you want to update the available stock."
    >
      <div className="grid grid-cols-3 gap-2">
        {ADJUST_TYPES.map(({ value, label, icon: Icon }) => {
          const isActive = form.adjustmentType === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() =>
                setForm((previous) => ({
                  ...previous,
                  adjustmentType: value,
                }))
              }
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                isActive
                  ? "bg-[var(--admin-blue)] text-white shadow-sm"
                  : "bg-[var(--admin-soft)] text-[var(--admin-muted)] hover:bg-[var(--admin-blue)]/10 hover:text-[var(--admin-blue)]"
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </FormSection>

    {/* Stock Details */}
    <FormSection
      title="Stock Details"
      subtitle="Enter the quantity and reason for this inventory adjustment."
    >
      <div className="space-y-4">
        <FormInput
          label="Quantity"
          type="number"
          min={0}
          value={form.quantity}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              quantity: event.target.value,
            }))
          }
          placeholder="Enter quantity"
        />

        <FormInput
          label="Reason"
          value={form.reason}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              reason: event.target.value,
            }))
          }
          placeholder="Cycle count, restock, damage, correction"
        />

        <FormInput
          label="Note"
          type="textarea"
          value={form.note}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              note: event.target.value,
            }))
          }
          placeholder="Add an optional internal note"
        />
      </div>
    </FormSection>
  </div>
</DefaultModal>
  );
};

const Inventory = () => {
  const dispatch = useDispatch();
  const { productId } = useParams();
  const navigate = useNavigate();

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "updatedAt",
    defaultFilters: getInitialInventoryFilters(),
  });

  const adminPanel = !isSellerPanel();
  const sellerView = isSellerPanel();
  const { toQueryParams } = list;

  const fileInputRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [detail, setDetail] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  const [variantSearch, setVariantSearch] = useState("");

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);

  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjusting, setAdjusting] = useState(false);

  const [historyPage, setHistoryPage] = useState(1);

  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importInfo, setImportInfo] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  const fetchList = useCallback(async () => {
    if (productId) return;

    setLoading(true);
    setError("");

    try {
      const response = await dispatch(
        getInventoryList(toQueryParams()),
      ).unwrap();

      const nextRows = getRowsFromResponse(response);

      setRows(nextRows);
      setTotal(getTotalFromResponse(response, nextRows.length));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load inventory"));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dispatch, productId, toQueryParams]);

  const fetchDetail = useCallback(async () => {
    if (!productId) return;

    setLoading(true);
    setError("");

    try {
      const response = await dispatch(
        getInventoryDetail({ productId }),
      ).unwrap();

      const nextDetail = getDetailFromResponse(response);
      const product = nextDetail?.product || {};
      const variants = Array.isArray(nextDetail?.variants)
        ? nextDetail.variants
        : [];

      setDetail(nextDetail);
      setDetailRows(prepareDetailVariants(variants, product));
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, "Unable to load product inventory"),
      );
      setDetail(null);
      setDetailRows([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch, productId]);

  useEffect(() => {
    if (productId) fetchDetail();
    else fetchList();
  }, [fetchDetail, fetchList, productId]);

  useEffect(() => {
    setHistoryPage(1);
    setImportError("");
    setImportInfo("");
    setImportSuccess("");
  }, [productId]);

  useEffect(() => {
    if (!importSuccess) return undefined;

    const timer = window.setTimeout(() => setImportSuccess(""), 4000);

    return () => window.clearTimeout(timer);
  }, [importSuccess]);

  useEffect(() => {
    if (!importInfo) return undefined;

    const timer = window.setTimeout(() => setImportInfo(""), 4000);

    return () => window.clearTimeout(timer);
  }, [importInfo]);

  const refresh = useCallback(
    () => (productId ? fetchDetail() : fetchList()),
    [fetchDetail, fetchList, productId],
  );

  const transactions = useMemo(
    () => detail?.transactions?.items || [],
    [detail?.transactions?.items],
  );

  const pagedTransactions = useMemo(() => {
    const offset = (historyPage - 1) * STOCK_HISTORY_PAGE_SIZE;

    return transactions.slice(offset, offset + STOCK_HISTORY_PAGE_SIZE);
  }, [historyPage, transactions]);

  const productRows = useMemo(() => groupInventoryByProduct(rows), [rows]);
  const filteredDetailRows = useMemo(() => {
    const searchValue = variantSearch.trim().toLowerCase();

    if (!searchValue) {
      return detailRows;
    }

    return detailRows.filter((row) =>
      [
        row.productName,
        row.productSku,
        row.variantName,
        row.variantSku,
        row.sku,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchValue)),
    );
  }, [detailRows, variantSearch]);

  const listTableLoading = loading && productRows.length === 0;

  const filterFields = useMemo(() => (isSeller ? [] : FILTERS), []);

  const pendingCount = useMemo(
    () => detailRows.filter(isPendingStock).length,
    [detailRows],
  );

  const canSave = pendingCount > 0 && !saving && !importing && !loading;

  const handleStockChange = useCallback((rowId, value) => {
    setImportError("");
    setImportInfo("");
    setImportSuccess("");

    setDetailRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;

        if (value === "") {
          return {
            ...row,
            currentStock: "",
          };
        }

        const parsed = Number(value);

        return {
          ...row,
          currentStock: Number.isFinite(parsed) ? parsed : value,
        };
      }),
    );
  }, []);

  const persistDetailRows = useCallback(
    async (
      nextRows = detailRows,
      allowedRowIds = null,
      { showToast = true } = {},
    ) => {
      const allowedIds = allowedRowIds ? new Set(allowedRowIds) : null;

      const changedRows = nextRows.filter(
        (row) => (!allowedIds || allowedIds.has(row.id)) && isPendingStock(row),
      );

      if (!changedRows.length) {
        const message = "No valid inventory changes to save";

        if (showToast) toast.info(message);
        else setImportInfo(message);

        return 0;
      }

      const invalidRow = changedRows.find(
        (row) =>
          !Number.isInteger(Number(row.currentStock)) ||
          Number(row.currentStock) < 0,
      );

      if (invalidRow) {
        const message = `${invalidRow.variantName || "Variant"} stock must be a non-negative whole number.`;

        if (showToast) toast.error(message);
        else setImportError(message);

        return 0;
      }

      try {
        await dispatch(
          bulkUpdateInventory({
            productId,
            updates: changedRows.map((row) => ({
              variantSku: row.variantSku,
              adjustmentType: "set",
              quantity: Number(row.currentStock),
              reason: "Inventory Excel update",
              note: "Stock updated through inventory manager",
            })),
          }),
        ).unwrap();

        setDetailRows((current) =>
          current.map((row) => {
            const matching = changedRows.find((item) => item.id === row.id);

            if (!matching) return row;

            return {
              ...row,
              originalStock: Number(matching.currentStock),
              currentStock: Number(matching.currentStock),
            };
          }),
        );

        setImportError("");

        if (showToast) {
          toast.success(
            `Updated ${changedRows.length} inventory ${
              changedRows.length === 1 ? "entry" : "entries"
            }`,
          );
        }

        return changedRows.length;
      } catch (requestError) {
        const message = getErrorMessage(
          requestError,
          "Unable to save inventory changes",
        );

        setImportError(message);

        if (showToast) toast.error(message);

        return 0;
      }
    },
    [detailRows, dispatch],
  );

  const handleSave = async () => {
    setSaving(true);

    try {
      await persistDetailRows(detailRows);
    } finally {
      setSaving(false);
    }
  };

  // const handleExport = () => {
  //   if (!detailRows.length) {
  //     toast.info("No inventory variants available to export");
  //     return;
  //   }

  //   const exportRows = detailRows.map((row) => ({
  //     productId: row.productId,
  //     productName: row.productName,
  //     productSku: row.productSku,
  //     variantId: row.variantId,
  //     variantSku: row.variantSku,
  //     variantName: row.variantName,
  //     currentStock: row.originalStock,
  //     newStock: row.currentStock,
  //   }));

  //   exportToExcel(exportRows, {
  //     filename: `${normalizeText(detail?.product?.sku || "product")}-inventory-template.xlsx`,
  //     sheetName: "Product Inventory",
  //     columns: IMPORT_COLUMNS.map((key) => ({
  //       label: key,
  //       key,
  //     })),
  //   });
  // };

  // const handleImport = async (event) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;

  //   try {
  //     setImporting(true);
  //     setImportError("");
  //     setImportInfo("");
  //     setImportSuccess("");

  //     const imported = await parseImportFile(file);

  //     if (!imported.length) {
  //       throw new Error("The selected file did not contain any rows");
  //     }

  //     const importedColumns = Object.keys(imported[0] || {});

  //     const missingColumns = IMPORT_COLUMNS.filter(
  //       (column) => !importedColumns.includes(column),
  //     );

  //     const unknownColumns = importedColumns.filter(
  //       (column) => !IMPORT_COLUMNS.includes(column),
  //     );

  //     if (missingColumns.length) {
  //       throw new Error(
  //         buildImportValidationError(
  //           `Missing required column(s): ${missingColumns.join(", ")}.`,
  //         ),
  //       );
  //     }

  //     if (unknownColumns.length) {
  //       throw new Error(
  //         buildImportValidationError(
  //           `Unknown column(s) found: ${unknownColumns.join(", ")}.`,
  //         ),
  //       );
  //     }

  //     const catalogByIdentity = new Map(
  //       detailRows.map((row) => [getVariantIdentity(row), row]),
  //     );

  //     const catalogByProductAndSku = new Map(
  //       detailRows.map((row) => [
  //         `${normalizeText(row.productId)}::${normalizeText(row.variantSku)}`,
  //         row,
  //       ]),
  //     );

  //     const importedUpdates = new Map();

  //     imported.forEach((item, index) => {
  //       const rowNumber = index + 2;

  //       const productIdValue = normalizeText(item.productId);
  //       const variantIdValue = normalizeText(item.variantId);
  //       const variantSkuValue = normalizeText(item.variantSku);

  //       if (!productIdValue || (!variantIdValue && !variantSkuValue)) {
  //         throw new Error(
  //           buildImportValidationError(
  //             `Row ${rowNumber}: productId and variantId/variantSku are required.`,
  //           ),
  //         );
  //       }

  //       const identity = [productIdValue, variantIdValue, variantSkuValue].join(
  //         "::",
  //       );

  //       const fallbackIdentity = `${productIdValue}::${variantSkuValue}`;

  //       const catalogRow = variantIdValue
  //         ? catalogByIdentity.get(identity)
  //         : catalogByProductAndSku.get(fallbackIdentity);

  //       if (!catalogRow) {
  //         throw new Error(
  //           buildImportValidationError(
  //             `Row ${rowNumber}: product or variant identity was changed or no longer exists.`,
  //           ),
  //         );
  //       }

  //       if (importedUpdates.has(catalogRow.id)) {
  //         throw new Error(
  //           buildImportValidationError(
  //             `Row ${rowNumber}: duplicate product or variant row found.`,
  //           ),
  //         );
  //       }

  //       const editedColumns = READ_ONLY_IMPORT_COLUMNS.filter(
  //         (column) =>
  //           !importValuesMatch(
  //             item[column],
  //             getExpectedImportValue(catalogRow, column),
  //             column,
  //           ),
  //       );

  //       if (editedColumns.length) {
  //         throw new Error(
  //           buildImportValidationError(
  //             `Row ${rowNumber}: ${editedColumns.join(", ")} cannot be changed.`,
  //           ),
  //         );
  //       }

  //       const newStock = Number(item.newStock);

  //       if (!Number.isInteger(newStock) || newStock < 0) {
  //         throw new Error(
  //           `Row ${rowNumber}: newStock must be a non-negative whole number.`,
  //         );
  //       }

  //       importedUpdates.set(catalogRow.id, newStock);
  //     });

  //     const nextRows = detailRows.map((row) =>
  //       importedUpdates.has(row.id)
  //         ? {
  //             ...row,
  //             currentStock: importedUpdates.get(row.id),
  //           }
  //         : row,
  //     );

  //     setDetailRows(nextRows);

  //     const changedCount = nextRows.filter(
  //       (row) => importedUpdates.has(row.id) && isPendingStock(row),
  //     ).length;

  //     if (!changedCount) {
  //       setImportInfo(
  //         "The file was imported successfully, but there are no new stock changes to save.",
  //       );
  //       return;
  //     }

  //     setImportSuccess(
  //       `${changedCount} inventory ${
  //         changedCount === 1 ? "change is" : "changes are"
  //       } ready to save.`,
  //     );
  //   } catch (importErrorValue) {
  //     setImportError(
  //       getErrorMessage(importErrorValue, "Failed to import inventory Excel"),
  //     );
  //     setImportInfo("");
  //     setImportSuccess("");
  //   } finally {
  //     setImporting(false);

  //     if (fileInputRef.current) {
  //       fileInputRef.current.value = "";
  //     }
  //   }
  // };

  const openImageGallery = useCallback((variant) => {
    const images = getVariantImagesList(variant);

    setGalleryImages(images);
    setGalleryOpen(true);
  }, []);

  const closeImageGallery = useCallback(() => {
    setGalleryOpen(false);
    setGalleryImages([]);
  }, []);

  const adjustRows = async (target, payload) => {
    setAdjusting(true);

    try {
      await dispatch(
        adjustInventory({
          productId: target.productId,
          variantSku: target.variantSku,
          ...payload,
        }),
      ).unwrap();

      toast.success("Variant stock updated");
      setAdjustTarget(null);
      await refresh();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "Unable to update inventory"));
    } finally {
      setAdjusting(false);
    }
  };
  const listColumns = [
    {
      key: "productName",
      label: "Product",
      sortable: true,
      width: "260px",
      render: (_, row) => (
        <div className="max-w-[300px] truncate">{productTitle(row)}</div>
      ),
    },
    {
      key: "variants",
      label: "Variants",
      render: (_, row) => variantSummary(row),
    },
    {
      key: "currentStock",
      label: "Current",
      sortable: true,
      render: (value) => numberCell(value),
    },
    {
      key: "reservedStock",
      label: "Reserved",
      render: (value) => numberCell(value, "text-amber-600"),
    },
    {
      key: "availableStock",
      label: "Available",
      render: (value) =>
        numberCell(
          value,
          Number(value || 0) <= 0 ? "text-red-600" : "text-emerald-700",
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value} dot />,
    },
    ...(adminPanel
      ? [
          {
            key: "seller",
            label: "Seller",
            render: (_, row) => (
              <SellerLink
                sellerId={
                  row.sellerId ||
                  row.seller_id ||
                  row.seller?.id ||
                  row.seller?._id
                }
                sellerName={sellerLabel(row)}
              />
            ),
          },
        ]
      : []),
    {
      key: "lastUpdated",
      label: "Last Updated",
      sortable: true,
      render: (value) => formatDateTime12Hour(value, "N/A"),
    },
  ];

  const detailColumns = useMemo(
    () => [
      {
        key: "image",
        label: "Image",
        width: "150px",
        render: (_value, variant) => (
          <ImageThumbnail
            src={getVariantImage(variant)}
            images={getVariantImagesList(variant)}
            alt={variant?.sku || variant?.variantName || "Variant"}
            size="md"
            showZoomIcon
            showViewButton
            viewButtonText="View"
            onClick={() => openImageGallery(variant)}
          />
        ),
      },
      {
        key: "productName",
        label: "Product",
        sortable: true,
        width: "280px",
        render: (_, row) => (
          <button
            type="button"
            className="block w-[280px] max-w-[280px] truncate text-left hover:underline"
            onClick={(event) => {
              event.stopPropagation();

              if (row.productId) {
                navigate(`/app/product-catalog/view/${row.productId}`);
              }
            }}
          >
            {productTitle(row)}
          </button>
        ),
      },

      {
        key: "variantName",
        label: "Variant",
        render: (_, row) => variantTitle(row),
      },
      {
        key: "variantSku",
        label: "SKU",
        render: (value) => (
          <span className="font-mono text-xs">{value || "N/A"}</span>
        ),
      },
      {
        key: "originalStock",
        label: "Current Stock",
        render: (value) => numberCell(value),
      },
      {
        key: "reservedStock",
        label: "Reserved",
        render: (value) => numberCell(value, "text-amber-600"),
      },
      {
        key: "availableStock",
        label: "Available",
        render: (value) =>
          numberCell(
            value,
            Number(value || 0) <= 0 ? "text-red-600" : "text-emerald-700",
          ),
      },
      {
        key: "currentStock",
        label: "New Stock",
        render: (_, row) => {
          const hasError =
            row.currentStock === "" ||
            !Number.isInteger(Number(row.currentStock)) ||
            Number(row.currentStock) < 0;

          return (
            <input
              type="number"
              min={0}
              step={1}
              className={`w-28 rounded-lg border px-2 py-1.5 text-sm ${
                hasError
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-[var(--admin-line)]"
              }`}
              value={row.currentStock}
              onChange={(event) =>
                handleStockChange(row.id, event.target.value)
              }
            />
          );
        },
      },
      {
        key: "status",
        label: "Status",
        render: (value) => <StatusBadge status={value} dot />,
      },
      {
        key: "lastUpdated",
        label: "Last Updated",
        render: (value) => formatDateTime12Hour(value, "N/A"),
      },
    ],
    [handleStockChange, navigate, openImageGallery],
  );

  const transactionColumns = [
    {
      key: "createdAt",
      label: "Date",
      render: (value) => formatDateTime12Hour(value, "N/A"),
    },
    {
      key: "variantSku",
      label: "Variant SKU",
      render: (value) => (
        <span className="font-mono text-xs">{value || "N/A"}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: "quantity",
      label: "Change",
      render: (value) =>
        numberCell(
          value,
          Number(value || 0) < 0 ? "text-red-600" : "text-emerald-700",
        ),
    },
    {
      key: "actorRole",
      label: "Actor",
    },
    {
      key: "metadata",
      label: "Reason",
      render: (value) => value?.reason || value?.note || "N/A",
    },
  ];

  if (productId) {
    const product = detail?.product || {};

    return (
      <div>
        <Loader loading={saving || importing} />

        <PageHeader
          title="Product Inventory"
          subtitle="Update variant-wise stock, export a template, edit it in Excel, and import the updated values."
          backPath="/app/inventory"
          status={product.status}
          actions={
            <button
              type="button"
              className="admin-btn-secondary inline-flex items-center gap-1.5"
              onClick={refresh}
              disabled={loading}
            >
              <MdRefresh size={17} className={loading ? "animate-spin" : ""} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          }
        />

        {importError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">Import issue</p>
            <p className="mt-1 whitespace-pre-wrap">{importError}</p>
          </div>
        ) : null}

        {importInfo ? (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            <p className="font-semibold">Import info</p>
            <p className="mt-1 whitespace-pre-wrap">{importInfo}</p>
          </div>
        ) : null}

        {importSuccess ? (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p className="font-semibold">Import successful</p>
            <p className="mt-1 whitespace-pre-wrap">{importSuccess}</p>
          </div>
        ) : null}

        <div className="mb-4">
          <div className="admin-card flex items-center gap-4 p-4">
            <div className="h-16 w-16 overflow-hidden rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)]">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[var(--admin-ink)]">
                {product.name || "Untitled product"}
              </p>

              <p className="text-xs text-[var(--admin-muted)]">
                SKU: {product.sku || "N/A"}
              </p>

              {adminPanel && (
                <p className="text-xs text-[var(--admin-muted)]">
                  Seller: {product.seller || "N/A"}
                </p>
              )}
            </div>
          </div>
        </div>

        <DataTable
          columns={detailColumns}
          data={filteredDetailRows}
          loading={loading}
          error={error}
          totalCount={filteredDetailRows.length}
          rowKey="id"
          onSearch={setVariantSearch}
          searchPlaceholder="Search variant name or SKU"
          actions={
            <OrangeButton
              onClick={handleSave}
              disabled={!canSave}
              title={
                pendingCount ? "Save inventory changes" : "No changes to save"
              }
            >
              {saving
                ? "Saving…"
                : `Save ${pendingCount ? `(${pendingCount})` : ""}`}
            </OrangeButton>
          }
          emptyText="No variants found"
          rowActions={(row) => [
            {
              label: "Adjust Inventory",
              icon: <MdInventory2 />,
              onClick: () => setAdjustTarget(row),
            },
          ]}
        />

        <div className="mt-5">
          <PageHeader
            title="Stock History"
            subtitle="Complete movement log for this product's variants"
          />

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

        <ImageGallery
          images={galleryImages}
          isOpen={galleryOpen}
          onClose={closeImageGallery}
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
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="View product-level inventory and manage variant stock inside each product."
        breadcrumbs={[
          {
            label: sellerView ? "Inventory" : "Inventory Management",
          },
          { label: "Inventory" },
        ]}
      />

      <DataTable
        columns={listColumns}
        data={productRows}
        loading={listTableLoading}
        error={error}
        totalCount={total}
        listPage={list}
        rowKey="id"
        onRefresh={refresh}
        searchPlaceholder="Search product or SKU"
        filterBar={
          <FilterBar filters={filterFields} listPage={list} loading={false} />
        }
        emptyText="No inventory products found"
        onRowClick={(row) => navigate(`/app/inventory/${row.productId}`)}
        rowActions={(row) => {
          const variants = row.variants || [];

          return [
            {
              label: "View Product Inventory",
              icon: <MdOpenInNew />,
              onClick: () => navigate(`/app/inventory/${row.productId}`),
            },
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
