import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  bulkUpdateSpecialPrices,
  getProducts,
} from "../../../../Redux/productSlice";
import {
  exportToExcel,
  parseImportFile,
} from "../../../../_helpers/exportToCsv";
import {
  DataTable,
  PageHeader,
  FilterBar,
} from "../../../../components/Shared";
import { useListPage } from "../../../../hooks/useListPage";
import { isSellerPanel } from "../../../../_helpers/panelConfig";

const getErrorMessage = (error, fallback) => {
  if (typeof error === "string" && error.trim()) return error;
  return error?.message || fallback;
};

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const MIN_SPECIAL_PRICE_RATIO = 0.5;
const getMinimumSpecialPrice = (sellingPrice) =>
  Math.ceil(Number(sellingPrice || 0) * MIN_SPECIAL_PRICE_RATIO * 100) / 100;

const normalizeSpecialPriceValue = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getRowFlags = (row) => {
  const current = normalizeSpecialPriceValue(row.specialPrice ?? "");
  const original = normalizeSpecialPriceValue(row.originalSpecialPrice ?? "");
  const sellingPrice = Number(row.sellingPrice) || 0;
  const minimumSpecialPrice = getMinimumSpecialPrice(sellingPrice);
  const hasError =
    current !== null &&
    (current < minimumSpecialPrice ||
      sellingPrice <= 0 ||
      current >= sellingPrice);
  const isZeroPrice = sellingPrice === 0;
  const isPending = current !== original && !hasError && !isZeroPrice;
  return {
    current,
    original,
    sellingPrice,
    minimumSpecialPrice,
    hasError,
    isZeroPrice,
    isPending,
  };
};

const PRICE_STATUS_FILTER_FIELDS = [
  {
    key: "priceStatus",
    type: "select",
    label: "Price Status",
    options: [
      { value: "pending", label: "Pending Changes" },
      { value: "conflict", label: "Price Conflicts" },
      { value: "zero", label: "Zero Selling Price" },
    ],
  },
];

const getSellerContext = () => {
  try {
    const raw = sessionStorage.getItem("EcomAdmin");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      sellerId:
        parsed?.ownerSellerId ||
        parsed?.sellerId ||
        parsed?.seller?.id ||
        parsed?.seller?.sellerId ||
        parsed?._id ||
        parsed?.id ||
        "",
      organizationId:
        parsed?.organizationId || parsed?.ownerOrganizationId || "",
    };
  } catch {
    return {};
  }
};

const buildRowsFromProducts = (products = []) => {
  const rows = [];

  products.forEach((product) => {
    const productId = product?._id || product?.id || "";
    const productName = product?.title || product?.name || "";
    const productSku = product?.sku || "";
    const variants =
      Array.isArray(product?.variants) && product.variants.length
        ? product.variants
        : [];

    if (variants.length) {
      variants.forEach((variant, variantIndex) => {
        const variantId = variant?._id || variant?.id || "";
        const variantSku =
          variant?.sku || `${productSku}-${variantIndex + 1}` || "";
        const variantTitle =
          variant?.title || variant?.name || `Variant ${variantIndex + 1}`;
        const variantSpecialPrice =
          variant?.salePrice !== undefined && variant?.salePrice !== null
            ? variant.salePrice
            : "";
        const variantPrice = variant?.price || 0;
        const variantMrp = variant?.mrp || 0;
        rows.push({
          id: `${productId}-${variantId || variantSku}-${variantIndex}`,
          productId,
          productName,
          productSku,
          variantId,
          variantSku,
          variantTitle,
          mrp: variantMrp,
          sellingPrice: variantPrice,
          originalSpecialPrice: variantSpecialPrice,
          specialPrice: variantSpecialPrice,
        });
      });
      return;
    }

    rows.push({
      id: `${productId || productSku || rows.length}`,
      productId,
      productName,
      productSku,
      variantId: "",
      variantSku: productSku,
      variantTitle: "Default",
      mrp: product?.mrp || 0,
      sellingPrice: product?.price || 0,
      originalSpecialPrice: product?.salePrice ?? "",
      specialPrice: product?.salePrice ?? "",
    });
  });

  return rows;
};

const SellerSpecialPriceManager = () => {
  const dispatch = useDispatch();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const sellerContext = useMemo(() => getSellerContext(), []);
  const sellerView = isSellerPanel();
  const list = useListPage({ defaultPageSize: 20 });

  // The special-price grid is variant-level, but the products API only paginates
  // at the product level, so a "product" page can yield a different number of
  // variant rows. To keep the on-screen count accurate, we fetch every matching
  // product for the current search once, then page/filter the flattened variant
  // rows entirely on the client.
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const query = {
        page: 1,
        limit: 200,
        includeAllStatuses: true,
        includeVariants: true,
      };
      if (list.search) query.search = list.search;
      if (sellerContext.sellerId) {
        query.sellerId = sellerContext.sellerId;
      }
      const res = await dispatch(getProducts(query)).unwrap();
      let productList =
        res?.data?.data?.list || res?.data?.list || res?.data?.data || [];
      if (!Array.isArray(productList)) {
        productList = [];
      }
      const productsWithVariants = productList.filter(
        (p) => Array.isArray(p?.variants) && p.variants.length > 0,
      );
      setRows(buildRowsFromProducts(productsWithVariants));
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to load products for special price management",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch, sellerContext.sellerId, list.search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const pendingCount = useMemo(
    () => rows.filter((row) => getRowFlags(row).isPending).length,
    [rows],
  );

  const filteredRows = useMemo(() => {
    const priceStatus = list.filters.priceStatus;
    if (!priceStatus || priceStatus === "all") return rows;
    return rows.filter((row) => {
      const { hasError, isZeroPrice, isPending } = getRowFlags(row);
      if (priceStatus === "conflict") return hasError;
      if (priceStatus === "zero") return isZeroPrice;
      if (priceStatus === "pending") return isPending;
      return true;
    });
  }, [rows, list.filters.priceStatus]);

  const total = filteredRows.length;

  const visibleRows = useMemo(() => {
    const start = (list.page - 1) * list.pageSize;
    return filteredRows.slice(start, start + list.pageSize);
  }, [filteredRows, list.page, list.pageSize]);

  const handleRowChange = useCallback((rowId, value) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id === rowId) {
          const normalizedValue = normalizeSpecialPriceValue(value);
          return { ...row, specialPrice: normalizedValue };
        }
        return row;
      }),
    );
  }, []);

  const persistRows = async (nextRows = rows, allowedRowIds = null) => {
    const allowedIds = allowedRowIds ? new Set(allowedRowIds) : null;
    const changedRows = nextRows.filter(
      (row) =>
        (!allowedIds || allowedIds.has(row.id)) && getRowFlags(row).isPending,
    );
    if (!changedRows.length) {
      toast.info("No valid special price changes to save");
      return 0;
    }

    const updates = [];
    const groupedByProduct = new Map();

    changedRows.forEach((row) => {
      if (!row.productId) return;
      const existing = groupedByProduct.get(row.productId) || [];
      existing.push(row);
      groupedByProduct.set(row.productId, existing);
    });

    groupedByProduct.forEach((groupRows, productId) => {
      const variantUpdates = groupRows
        .filter((row) => row.variantId || row.variantSku)
        .map((row) => ({
          variantId: row.variantId || undefined,
          variantSku: row.variantSku || undefined,
          salePrice: normalizeSpecialPriceValue(row.specialPrice),
        }));

      if (variantUpdates.length) {
        updates.push({
          productId,
          variants: variantUpdates,
        });
        return;
      }

      const [firstRow] = groupRows;
      updates.push({
        productId,
        salePrice: normalizeSpecialPriceValue(firstRow.specialPrice),
      });
    });

    if (!updates.length) {
      toast.info("No matching products were found to update");
      return 0;
    }

    try {
      await dispatch(bulkUpdateSpecialPrices({ updates })).unwrap();
      setRows((current) =>
        current.map((row) => {
          const matching = changedRows.find((item) => item.id === row.id);
          if (!matching) return row;
          return { ...row, originalSpecialPrice: matching.specialPrice };
        }),
      );
      toast.success(
        `Updated ${changedRows.length} special price ${changedRows.length > 1 ? "entries" : "entry"}`,
      );
      return changedRows.length;
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save special prices"));
      return 0;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await persistRows(rows);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const exportRows = rows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      sku: row.productSku,
      variantId: row.variantId,
      variantSku: row.variantSku,
      variantTitle: row.variantTitle,
      mrp: row.mrp,
      sellingPrice: row.sellingPrice,
      currentSpecialPrice: row.originalSpecialPrice,
      newSpecialPrice: row.specialPrice,
    }));

    exportToExcel(exportRows, {
      filename: "seller-special-price-template.xlsx",
      sheetName: "Special Prices",
      columns: [
        { label: "productId", key: "productId" },
        { label: "productName", key: "productName" },
        { label: "sku", key: "sku" },
        { label: "variantId", key: "variantId" },
        { label: "variantSku", key: "variantSku" },
        { label: "variantTitle", key: "variantTitle" },
        { label: "mrp", key: "mrp" },
        { label: "sellingPrice", key: "sellingPrice" },
        { label: "currentSpecialPrice", key: "currentSpecialPrice" },
        { label: "newSpecialPrice", key: "newSpecialPrice" },
      ],
    });
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const imported = await parseImportFile(file);
      if (!imported.length) {
        throw new Error("The selected file did not contain any rows");
      }

      const catalogByIdentity = new Map(
        rows.map((row) => [
          `${String(row.productId).trim()}::${String(row.variantId || "").trim()}::${String(row.variantSku || "").trim()}`,
          row,
        ]),
      );
      const catalogByProductAndSku = new Map(
        rows.map((row) => [
          `${String(row.productId).trim()}::${String(row.variantSku || "").trim()}`,
          row,
        ]),
      );
      const importedUpdates = new Map();

      imported.forEach((item, index) => {
        const rowNumber = index + 2;
        const productId = String(item.productId || "").trim();
        const variantId = String(item.variantId || "").trim();
        const variantSku = String(item.variantSku || "").trim();
        if (!productId || (!variantId && !variantSku)) {
          throw new Error(
            `Row ${rowNumber}: productId and variantId/variantSku are required. Use a freshly exported template.`,
          );
        }

        const identity = `${productId}::${variantId}::${variantSku}`;
        const fallbackIdentity = `${productId}::${variantSku}`;
        const catalogRow = variantId
          ? catalogByIdentity.get(identity)
          : catalogByProductAndSku.get(fallbackIdentity);
        if (!catalogRow) {
          throw new Error(
            `Row ${rowNumber}: product or variant identity was edited, is duplicated, or no longer exists.`,
          );
        }
        if (importedUpdates.has(catalogRow.id)) {
          throw new Error(
            `Row ${rowNumber}: duplicate product/variant row in the import file.`,
          );
        }
        if (!Object.prototype.hasOwnProperty.call(item, "newSpecialPrice")) {
          throw new Error(
            `Row ${rowNumber}: newSpecialPrice column is required.`,
          );
        }

        const rawPrice = item.newSpecialPrice;
        const isBlank =
          rawPrice === "" || rawPrice === null || rawPrice === undefined;
        const price = isBlank ? null : Number(rawPrice);
        if (!isBlank && (!Number.isFinite(price) || price < 0)) {
          throw new Error(
            `Row ${rowNumber}: newSpecialPrice must be a non-negative number or blank to clear it.`,
          );
        }
        const minimumSpecialPrice = getMinimumSpecialPrice(
          catalogRow.sellingPrice,
        );
        if (price !== null && price < minimumSpecialPrice) {
          throw new Error(
            `Row ${rowNumber}: newSpecialPrice must be at least ${formatMoney(minimumSpecialPrice)} (50% of selling price).`,
          );
        }
        if (price !== null && price >= Number(catalogRow.sellingPrice || 0)) {
          throw new Error(
            `Row ${rowNumber}: newSpecialPrice must be less than the current selling price.`,
          );
        }
        importedUpdates.set(catalogRow.id, price);
      });

      const nextRows = rows.map((row) =>
        importedUpdates.has(row.id)
          ? { ...row, specialPrice: importedUpdates.get(row.id) }
          : row,
      );

      setRows(nextRows);
      if (importedUpdates.size === 0) {
        toast.error(
          "No rows matched the imported file. Check the product ID / SKU columns.",
        );
        return;
      }

      await persistRows(nextRows, importedUpdates.keys());
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Failed to import special price Excel"),
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "productName",
        label: "Product",
        render: (_, row) => (
          <div className="w-[220px] max-w-[220px] min-w-0">
            <Link
              to={`/app/product-catalog/view/${row.productId}`}
              className="block truncate text-left font-semibold text-[var(--admin-ink)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-blue)]"
              title={row.productName || "Untitled product"}
            >
              {row.productName || "Untitled product"}
            </Link>
            <p className="text-xs text-[var(--admin-muted)]">
              {row.productSku || "N/A"}
            </p>
          </div>
        ),
      },
      {
        key: "variantTitle",
        label: "Variant",
        render: (value) => value || "Default",
      },
      {
        key: "variantSku",
        label: "SKU",
        render: (_, row) => (
          <span className="font-mono text-xs">
            {row.variantSku || row.productSku || "N/A"}
          </span>
        ),
      },
      {
        key: "mrp",
        label: "MRP",
        render: (value) => (
          <span className="font-mono text-sm">{formatMoney(value)}</span>
        ),
      },
      {
        key: "sellingPrice",
        label: "Selling Price",
        render: (value, row) => {
          const { isZeroPrice } = getRowFlags(row);
          return (
            <span
              className={`font-mono text-sm font-semibold ${isZeroPrice ? "text-red-600" : "text-[var(--admin-ink)]"}`}
            >
              {formatMoney(value)}
            </span>
          );
        },
      },
      {
        key: "originalSpecialPrice",
        label: "Current Special",
        render: (value) =>
          value ? (
            <span className="font-mono text-sm">{formatMoney(value)}</span>
          ) : (
            "N/A"
          ),
      },
      {
        key: "specialPrice",
        label: "New Special Price",
        render: (_, row) => {
          const { hasError, minimumSpecialPrice } = getRowFlags(row);
          return (
            <input
              type="number"
              min={minimumSpecialPrice}
              max={
                Number(row.sellingPrice) > 0
                  ? Math.max(0, Number(row.sellingPrice) - 0.01)
                  : undefined
              }
              step="0.01"
              className={`w-32 rounded-lg border px-2 py-1.5 text-sm ${
                hasError
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-[var(--admin-line)]"
              }`}
              value={row.specialPrice ?? ""}
              onChange={(event) => handleRowChange(row.id, event.target.value)}
              placeholder={String(minimumSpecialPrice)}
            />
          );
        },
      },
      {
        key: "status",
        label: "Status",
        render: (_, row) => {
          const {
            hasError,
            isZeroPrice,
            isPending,
            current,
            minimumSpecialPrice,
          } = getRowFlags(row);
          if (isZeroPrice) {
            return (
              <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                ⚠ Selling price is 0
              </span>
            );
          }
          if (hasError) {
            return (
              <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                {current < minimumSpecialPrice
                  ? `⚠ Minimum ${formatMoney(minimumSpecialPrice)}`
                  : "⚠ Special must be < Selling"}
              </span>
            );
          }
          if (isPending) {
            return (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                ⟳ Pending
              </span>
            );
          }
          return <span className="text-xs text-[var(--admin-muted)]">N/A</span>;
        },
      },
    ],
    [handleRowChange],
  );

  return (
    <div>
      <PageHeader
        title={sellerView ? "Seller Special Price Management" : "Special Price Management"}
        subtitle="Update variant-wise special prices, export a template, edit it in Excel, and import the updated values back here."
        count={total}
        breadcrumbs={[
          { label: sellerView ? "Seller Catalog" : "Product Management" },
          { label: sellerView ? "Seller Special Price Management" : "Special Price Management" },
        ]}
        actions={
          <>
            <button type="button" onClick={handleExport}>
              Export Excel
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              {importing ? "Importing…" : "Import Excel"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleImport}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !pendingCount}
            >
              {saving
                ? "Saving…"
                : `Save ${pendingCount ? `(${pendingCount})` : ""}`}
            </button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={visibleRows}
        loading={loading}
        totalCount={total}
        listPage={list}
        rowKey="id"
        searchPlaceholder="Search product name or SKU"
        // filterBar={<FilterBar filters={PRICE_STATUS_FILTER_FIELDS} listPage={list} loading={loading} />}
        emptyText="No products were found for this seller."
      />
    </div>
  );
};

export default SellerSpecialPriceManager;
