import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Info } from "lucide-react";
import {
  bulkUpdateSpecialPrices,
  getProducts,
  getProductById,
} from "../../../../Redux/productSlice";
import { getAllSellerList } from "../../../../Redux/StoreSlice";
import { transformArray } from "../../../../_helpers/globalFunctions";
import {
  exportToExcel,
  parseImportFile,
} from "../../../../_helpers/exportToCsv";
import {
  DataTable,
  PageHeader,
  FilterBar,
} from "../../../../components/Shared";
import ProductStatusBadge from "../../../../components/Product/ProductStatusBadge";
import Loader from "../../../../components/Loader/Loader";
import { useListPage } from "../../../../hooks/useListPage";
import { isSellerPanel } from "../../../../_helpers/panelConfig";
import { toast } from "../../../../utils/toast";

const getErrorMessage = (error, fallback) => {
  if (typeof error === "string" && error.trim()) return error;
  return error?.message || error?.data?.message || fallback;
};

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const MIN_SPECIAL_PRICE_RATIO = 0.5;

const IMPORT_COLUMNS = [
  "productId",
  "productName",
  "sku",
  "variantId",
  "variantSku",
  "variantTitle",
  "mrp",
  "sellingPrice",
  "currentSpecialPrice",
  "newSpecialPrice",
];
const EDITABLE_IMPORT_COLUMN = "newSpecialPrice";

const getMinimumSpecialPrice = (sellingPrice) =>
  Math.ceil(Number(sellingPrice || 0) * MIN_SPECIAL_PRICE_RATIO * 100) / 100;

const normalizeSpecialPriceValue = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getRowFlags = (row) => {
  const current = normalizeSpecialPriceValue(row.specialPrice ?? "");
  const original = normalizeSpecialPriceValue(
    row.originalSpecialPrice ?? ""
  );

  const sellingPrice = Number(row.sellingPrice) || 0;
  const minimumSpecialPrice = getMinimumSpecialPrice(sellingPrice);

  // Check whether the input is empty
  const isEmpty =
    row.specialPrice === "" ||
    row.specialPrice === null ||
    row.specialPrice === undefined;

  // Validate only when a value has been entered
  const hasError =
    !isEmpty &&
    current !== null &&
    (current < minimumSpecialPrice ||
      sellingPrice <= 0 ||
      current >= sellingPrice);

  const isZeroPrice = sellingPrice === 0;

  const isPending =
    !isEmpty &&
    current !== original &&
    !hasError &&
    !isZeroPrice;

  return {
    current,
    original,
    sellingPrice,
    minimumSpecialPrice,
    hasError,
    isZeroPrice,
    isPending,
    isEmpty,
  };
};

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
          productStatus: product?.status || "",
          variantStatus: variant?.status || product?.status || "",
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
      productStatus: product?.status || "",
      variantStatus: product?.status || "",
    });
  });

  return rows;
};

const getProductImage = (product) => {
  if (product?.images && product.images.length > 0) {
    const img = product.images[0];
    return typeof img === "string" ? img : img?.url || img?.src || "";
  }
  if (product?.image) {
    return typeof product.image === "string" ? product.image : product.image?.url || "";
  }
  if (product?.variants && product.variants.length > 0) {
    const vImg = product.variants[0]?.images?.[0] || product.variants[0]?.image;
    return typeof vImg === "string" ? vImg : vImg?.url || "";
  }
  return "";
};

const ImportExportGuide = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2.5 text-left focus:outline-none"
      >
        <Info size={16} className="shrink-0 text-blue-600" />
        <h3 className="flex-1 text-xs font-semibold text-gray-900">
          Import & Export Guide
        </h3>
        <span className="text-xs font-medium text-blue-700">
          {open ? "Hide ▲" : "Show ▼"}
        </span>
      </button>

      {open && (
        <div className="mt-2.5 space-y-2 pl-[26px]">
          {/* Export Steps */}
          <div>
            <p className="text-[11px] font-semibold text-gray-800">
              📤 How to Export
            </p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[11px] text-gray-600">
              <li>Click the <strong>"Export Template"</strong> button above.</li>
              <li>An Excel file (.xlsx) will download with all variant details.</li>
              <li>
                Open the file and edit <strong>only</strong> the{" "}
                <strong className="text-blue-800">"newSpecialPrice"</strong> column.
              </li>
            </ol>
          </div>

          {/* Import Steps */}
          <div>
            <p className="text-[11px] font-semibold text-gray-800">
              📥 How to Import
            </p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[11px] text-gray-600">
              <li>
                Fill in the <strong>"newSpecialPrice"</strong> column in the exported template.
              </li>
              <li>Save the file as <strong>.xlsx, .xls, or .csv</strong>.</li>
              <li>Click the <strong>"Import Excel"</strong> button and select your file.</li>
              <li>
                Review the imported values in the table, then click{" "}
                <strong>"Save Changes"</strong> to apply.
              </li>
            </ol>
          </div>

          {/* Important Notes */}
          <div className="rounded-md border border-blue-300 bg-blue-100/60 px-3 py-2">
            <p className="text-[11px] font-semibold text-blue-900">
              ⚠️ Important Notes
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-gray-700">
              <li>
                Do <strong>not</strong> modify columns other than{" "}
                <strong>"newSpecialPrice"</strong> — they are used for matching.
              </li>
              <li>
                Special price must be <strong>at least 50%</strong> of the selling price and{" "}
                <strong>below</strong> the selling price.
              </li>
              <li>
                Leave <strong>"newSpecialPrice"</strong> empty to keep the current price unchanged.
              </li>
              <li>
                Always export a <strong>fresh template</strong> before importing to ensure data is up to date.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

const SellerSpecialPriceManager = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { productId } = useParams();

  const storeSelector = useSelector((state) => state?.store);
  const sellerContext = useMemo(() => getSellerContext(), []);
  const sellerView = isSellerPanel();

  const list = useListPage({ defaultPageSize: 20 });
  const detailList = useListPage({ defaultPageSize: 20 });

  // Main list state (Products view)
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [productsLoading, setProductsLoading] = useState(false);

  // Detail view state (Variants for single product)
  const [detailProduct, setDetailProduct] = useState(null);
  const [rows, setRows] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Mutation states
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importInfo, setImportInfo] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  const fileInputRef = useRef(null);

  // Fetch Sellers List for Admin
  useEffect(() => {
    if (!sellerView) {
      dispatch(getAllSellerList());
    }
  }, [dispatch, sellerView]);

  const sellerListData = useMemo(() => {
    if (sellerView) return [];
    return transformArray(
      storeSelector?.getAllSellerListData?.data?.data?.list || [],
    );
  }, [sellerView, storeSelector]);

  // Load products list for main page
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const query = {
        page: list.page,
        limit: list.pageSize,
        includeAllStatuses: true,
        includeVariants: true,
      };
      if (list.search) query.search = list.search;

      // Filter by seller
      const activeSellerId = sellerView
        ? sellerContext.sellerId
        : list.filters?.sellerId?.value || list.filters?.sellerId;
      if (activeSellerId) {
        query.sellerId = activeSellerId;
      }

      const res = await dispatch(getProducts(query)).unwrap();
      let productList =
        res?.data?.data?.list || res?.data?.list || res?.data?.data || [];
      if (!Array.isArray(productList)) {
        productList = [];
      }
      const count =
        res?.data?.data?.total ||
        res?.data?.total ||
        res?.data?.meta?.totalItems ||
        productList.length;

      setProducts(productList);
      setTotalProducts(count);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Failed to load products for special price management",
        ),
      );
    } finally {
      setProductsLoading(false);
    }
  }, [
    dispatch,
    sellerView,
    sellerContext.sellerId,
    list.search,
    list.page,
    list.pageSize,
    list.filters?.sellerId,
  ]);

  useEffect(() => {
    if (!productId) {
      loadProducts();
    }
  }, [loadProducts, productId]);

  // Load single product details & variant rows for detail page
  const loadProductDetail = useCallback(async () => {
    if (!productId) return;
    setDetailLoading(true);
    try {
      let foundProduct = products.find(
        (p) => (p._id || p.id) === productId,
      );

      if (!foundProduct) {
        const res = await dispatch(getProductById({ _id: productId })).unwrap();
        foundProduct =
          res?.data?.data?.product ||
          res?.data?.data ||
          res?.data?.product ||
          res?.data;
      }

      if (!foundProduct) {
        // Fallback: search products endpoint for this productId
        const listRes = await dispatch(
          getProducts({
            page: 1,
            limit: 10,
            search: productId,
            includeAllStatuses: true,
            includeVariants: true,
          }),
        ).unwrap();
        const listData =
          listRes?.data?.data?.list || listRes?.data?.list || listRes?.data?.data || [];
        foundProduct = listData.find((p) => (p._id || p.id) === productId) || listData[0];
      }

      if (foundProduct) {
        setDetailProduct(foundProduct);
        setRows(buildRowsFromProducts([foundProduct]));
      } else {
        toast.error("Product not found");
        navigate("/app/seller-special-price-manager");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load product variants"));
    } finally {
      setDetailLoading(false);
    }
  }, [dispatch, productId, products, navigate]);

  useEffect(() => {
    if (productId) {
      loadProductDetail();
    } else {
      setDetailProduct(null);
      setRows([]);
    }
  }, [productId, loadProductDetail]);

  // Auto clear alerts
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

  // Product Dropdown options
  const productDropdownOptions = useMemo(() => {
    return products.map((p) => ({
      label: `${p.title || p.name || "Untitled"} (${p.sku || "No SKU"})`,
      value: p._id || p.id,
    }));
  }, [products]);

  // Filter bar fields for main view
const filterFields = useMemo(() => {
  const fields = [];

  if (!sellerView) {
    fields.push({
      key: "sellerId",
      type: "select",
      label: "Seller",
      placeholder: "All Sellers",
      options: sellerListData,
    });
  }

  return fields;
}, [sellerView, sellerListData]);

  // Handle selecting a product from dropdown
  useEffect(() => {
    const selectedProd = list.filters?.selectedProduct;
    const prodId = typeof selectedProd === "object" ? selectedProd?.value : selectedProd;
    if (prodId && !productId) {
      navigate(`/app/seller-special-price-manager/${prodId}`);
    }
  }, [list.filters?.selectedProduct, productId, navigate]);

  // Pending changes count for detail view
  const pendingCount = useMemo(
    () => rows.filter((row) => getRowFlags(row).isPending).length,
    [rows],
  );
  const canSave = pendingCount > 0 && !saving && !importing && !detailLoading;

const handleRowChange = useCallback((rowId, value) => {
  setImportError("");
  setImportInfo("");
  setImportSuccess("");

  setRows((current) =>
    current.map((row) => {
      if (row.id === rowId) {
        return {
          ...row,
          // Keep the input empty when the user clears it
          specialPrice: value === "" ? "" : normalizeSpecialPriceValue(value),
        };
      }

      return row;
    })
  );
}, []);

  const persistRows = async (
    nextRows = rows,
    allowedRowIds = null,
    { showToast = true } = {},
  ) => {
    const allowedIds = allowedRowIds ? new Set(allowedRowIds) : null;
    const changedRows = nextRows.filter(
      (row) =>
        (!allowedIds || allowedIds.has(row.id)) && getRowFlags(row).isPending,
    );
    if (!changedRows.length) {
      const message = "No valid special price changes to save";
      if (showToast) toast.info(message);
      else setImportError(message);
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

    groupedByProduct.forEach((groupRows, targetProductId) => {
      const variantUpdates = groupRows
        .filter((row) => row.variantId || row.variantSku)
        .map((row) => ({
          variantId: row.variantId || undefined,
          variantSku: row.variantSku || undefined,
          salePrice: normalizeSpecialPriceValue(row.specialPrice),
        }));

      if (variantUpdates.length) {
        updates.push({
          productId: targetProductId,
          variants: variantUpdates,
        });
        return;
      }

      const [firstRow] = groupRows;
      updates.push({
        productId: targetProductId,
        salePrice: normalizeSpecialPriceValue(firstRow.specialPrice),
      });
    });

    if (!updates.length) {
      const message = "No matching products were found to update";
      if (showToast) toast.info(message);
      else setImportError(message);
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
      setImportError("");
      if (showToast) {
        toast.success(
          `Updated ${changedRows.length} special price ${changedRows.length > 1 ? "entries" : "entry"}`,
        );
      }
      return changedRows.length;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to save special prices");
      setImportError(message);
      if (showToast) toast.error(message);
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
      filename: `special-prices-${detailProduct?.sku || "template"}.xlsx`,
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
      setImportError("");
      setImportInfo("");
      setImportSuccess("");
      const imported = await parseImportFile(file);
      if (!imported.length) {
        throw new Error("The selected file did not contain any rows");
      }

      const importedColumns = Object.keys(imported[0] || {});
      const missingColumns = IMPORT_COLUMNS.filter(
        (column) => !importedColumns.includes(column),
      );
      if (missingColumns.length) {
        throw new Error(
          `Missing required column(s): ${missingColumns.join(", ")}. Export a fresh template and edit only the "${EDITABLE_IMPORT_COLUMN}" column.`,
        );
      }

      const nextRows = rows.map((row) => ({ ...row }));
      let matchesFound = 0;

      imported.forEach((importedRow) => {
        const targetRow = nextRows.find((row) => {
          if (importedRow.variantId && row.variantId) {
            return String(importedRow.variantId) === String(row.variantId);
          }
          if (importedRow.variantSku && row.variantSku) {
            return String(importedRow.variantSku).toLowerCase() === String(row.variantSku).toLowerCase();
          }
          return String(importedRow.productId) === String(row.productId);
        });

        if (targetRow) {
          matchesFound += 1;
          const parsedVal = normalizeSpecialPriceValue(importedRow.newSpecialPrice);
          targetRow.specialPrice = parsedVal;
        }
      });

      if (!matchesFound) {
        throw new Error("No matching variant rows were found in the template");
      }

      setRows(nextRows);
      setImportSuccess(`Loaded prices for ${matchesFound} variants from file`);
    } catch (error) {
      setImportError(getErrorMessage(error, "Failed to parse import file"));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Products List Table Columns (Main View) - Matching ProductCatalog.js UI
  const productColumns = useMemo(
    () => [
      {
        key: "image",
        label: "Image",
        render: (_, row) => {
          const img = getProductImage(row);
          return (
            <div className="flex flex-col items-center gap-1">
              {img ? (
                <div className="h-10 w-10 overflow-hidden rounded border border-gray-200 bg-gray-50 p-0.5">
                  <img
                    src={img}
                    alt={row.title || row.name || "Product"}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
                  No
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: "title",
        label: "Product",
        sortable: true,
        render: (_, row) => (
          <div>
            <button
              type="button"
              onClick={() => navigate(`/app/seller-special-price-manager/${row._id || row.id}`)}
              className="block max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap text-left font-semibold text-[var(--admin-ink)] hover:text-[var(--admin-blue)] hover:underline focus:outline-none"
            >
              {row.title || row.name || "Untitled Product"}
            </button>
            <span className="block text-xs text-gray-500">{row.sku || "No SKU"}</span>
          </div>
        ),
      },
      ...(!sellerView
        ? [
            {
              key: "seller",
              label: "Seller",
              render: (_, row) => (
                <span className="block max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium text-gray-700">
                  {row.sellerName || row.seller?.name || row.organizationName || "-"}
                </span>
              ),
            },
          ]
        : []),
      {
        key: "category",
        label: "Category",
        render: (_, row) => (
          <span className="block max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-gray-600">
            {row.category?.name || row.categoryName || row.category || "-"}
          </span>
        ),
      },
      {
        key: "variants",
        label: "Variants",
        render: (_, row) => {
          const count = Array.isArray(row.variants) ? row.variants.length : 1;
          return (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {`${count} ${count === 1 ? "Variant" : "Variants"}`}
            </span>
          );
        },
      },
      {
        key: "price",
        label: "Price",
        sortable: true,
        render: (_, row) => {
          const variants = row.variants || [];
          if (variants.length > 0) {
            const prices = variants.map((v) => Number(v.price || 0)).filter((p) => p > 0);
            if (prices.length > 0) {
              const min = Math.min(...prices);
              const max = Math.max(...prices);
              return (
                <span className="font-mono text-xs font-medium text-gray-800">
                  {min === max ? formatMoney(min) : `${formatMoney(min)} - ${formatMoney(max)}`}
                </span>
              );
            }
          }
          return (
            <span className="font-mono text-xs font-medium text-gray-800">
              {formatMoney(row.price || 0)}
            </span>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        render: (_, row) => <ProductStatusBadge status={row.status || "active"} />,
      },
  
{
  key: "action",
  label: "Action",
  render: (_, row) => (
    <button
      type="button"
      onClick={() =>
        navigate(
          `/app/seller-special-price-manager/${row._id || row.id}`
        )
      }
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--admin-gold)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--admin-gold)] transition-colors hover:bg-[var(--admin-gold)] hover:text-white focus:border-[var(--admin-gold)] focus:outline-none focus:ring-0"
    >
      Manage Special Prices
      <ArrowRight size={14} />
    </button>
  ),
}
    ],
    [sellerView, navigate],
  );

  // Filtered variant rows for search in detail view
  const filteredVariantRows = useMemo(() => {
    if (!detailList.search) return rows;
    const term = detailList.search.toLowerCase().trim();
    return rows.filter(
      (row) =>
        row.variantTitle?.toLowerCase().includes(term) ||
        row.variantSku?.toLowerCase().includes(term) ||
        row.productName?.toLowerCase().includes(term),
    );
  }, [rows, detailList.search]);

  // Variant Rows Table Columns (Detail View)
  const variantColumns = useMemo(
    () => [
      {
        key: "variantTitle",
        label: "Variant Name",
        render: (value, row) => (
          <div>
            <p className="font-semibold text-gray-900">{value || "Default Variant"}</p>
            <p className="font-mono text-xs text-gray-500">{row.variantSku || row.productSku}</p>
          </div>
        ),
      },
      {
        key: "mrp",
        label: "MRP",
        render: (value) => (
          <span className="font-mono text-xs text-gray-500 line-through">
            {formatMoney(value)}
          </span>
        ),
      },
      {
        key: "sellingPrice",
        label: "Selling Price",
        render: (value) => (
          <span className="font-mono text-sm font-semibold text-gray-800">
            {formatMoney(value)}
          </span>
        ),
      },
      {
        key: "originalSpecialPrice",
        label: "Current Special Price",
        render: (value) =>
          value !== "" && value !== null && value !== undefined ? (
            <span className="font-mono text-xs font-semibold text-green-700">
              {formatMoney(value)}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Not Set</span>
          ),
      },
      {
        key: "specialPrice",
        label: "New Special Price",
        render: (value, row) => {
          const { hasError, minimumSpecialPrice } = getRowFlags(row);
          return (
            <div>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-xs font-medium text-gray-400">₹</span>
              <input
  type="number"
  min="0"
  step="0.01"
  value={value ?? ""}
  onChange={(e) => handleRowChange(row.id, e.target.value)}
  placeholder="Enter price"
  className={`w-36 rounded-lg border py-1.5 pl-6 pr-2 text-sm font-mono transition-colors ${
    hasError
      ? "border-red-400 bg-red-50 text-red-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
      : "border-gray-300 bg-white focus:border-[var(--admin-blue)] focus:ring-1 focus:ring-[var(--admin-blue)]"
  }`}
/>
              </div>
              {hasError && (
                <p className="mt-1 text-[10px] font-medium text-red-600">
                {`Must be at least ${formatMoney(
  minimumSpecialPrice
)} and below ${formatMoney(row.sellingPrice)}`}
                </p>
              )}
            </div>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        render: (_, row) => {
          const { isPending, hasError } = getRowFlags(row);
          if (hasError) {
            return (
              <span className="inline-flex rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                Invalid Price
              </span>
            );
          }
          if (isPending) {
            return (
              <span className="inline-flex rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Modified
              </span>
            );
          }
          return (
            <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              Unchanged
            </span>
          );
        },
      },
    ],
    [handleRowChange],
  );

  // ----------------------------------------------------
  // RENDER: DETAIL VIEW (Single Product Variants Editing)
  // ----------------------------------------------------
  if (productId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Special Price Management"
          subtitle="Set and update special promotional prices for product variants"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button
  type="button"
  onClick={() => navigate("/app/seller-special-price-manager")}

>
  <ArrowLeft size={16} />
  Back to Products
</button>

              <button
                type="button"
                onClick={handleExport}
                // className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                Export Template
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                // className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                {importing ? "Importing..." : "Import Excel"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImport}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                // className="inline-flex items-center gap-1 rounded-lg bg-[var(--admin-blue)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : `Save Changes ${pendingCount ? `(${pendingCount})` : ""}`}
              </button>
            </div>
          }
        />

        {/* Notifications */}
        {importError && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{importError}</span>
            <button
              type="button"
              onClick={() => setImportError("")}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}
        {importSuccess && (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <span>{importSuccess}</span>
            <button
              type="button"
              onClick={() => setImportSuccess("")}
              className="text-green-500 hover:text-green-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Product Summary Header Card */}
        {detailProduct && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {getProductImage(detailProduct) ? (
                  <img
                    src={getProductImage(detailProduct)}
                    alt={detailProduct.title || "Product"}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No Image</span>
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {detailProduct.title || detailProduct.name || "Product"}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>SKU: <strong className="text-gray-700">{detailProduct.sku || "-"}</strong></span>
                  {!sellerView && (detailProduct.sellerName || detailProduct.seller?.name) && (
                    <span>Seller: <strong className="text-gray-700">{detailProduct.sellerName || detailProduct.seller?.name}</strong></span>
                  )}
                  <span>Category: <strong className="text-gray-700">{detailProduct.category?.name || detailProduct.categoryName || "-"}</strong></span>
                  <span>Total Variants: <strong className="text-gray-700">{rows.length}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}
{/* Special Price Suggestion */}
<div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
  <div className="flex items-start gap-2.5">
   <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />

    <div>
      <h3 className="text-xs font-semibold text-gray-900">
        Special Price Suggestion
      </h3>

      <p className="mt-1 text-[11px] text-gray-600">
        Enter a price that is <strong>below the Selling Price</strong> and at
        least <strong>50% of it</strong>. Then click{" "}
        <strong>Save Changes</strong>.
      </p>

      <p className="mt-1 text-[11px] font-medium text-blue-700">
        Example: Selling Price ₹1,999 → Special Price: ₹999.50 to ₹1,998.99
      </p>
    </div>
  </div>
</div>

        {/* Import & Export Guide */}
        <ImportExportGuide />

        {/* Variants Data Table */}
        {detailLoading ? (
          <Loader />
        ) : (
          <DataTable
            columns={variantColumns}
            data={filteredVariantRows}
            loading={detailLoading}
            listPage={detailList}
            searchPlaceholder="Search variant title or SKU..."
            emptyText="No variants found for this product."
          />
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: MAIN VIEW (Products List Table with Search & FilterBar)
  // ----------------------------------------------------
  return (
    <div className="space-y-6">
      <PageHeader
        title="Special Price Management"
        subtitle="Manage promotional special prices for seller products and variants"
      />

      {/* Products DataTable with embedded Search and FilterBar */}
      <DataTable
        columns={productColumns}
        data={products}
        loading={productsLoading}
        totalCount={totalProducts}
        listPage={list}
        rowKey="_id"
        searchPlaceholder="Search product name or SKU"
        filterBar={
          <FilterBar
            filters={filterFields}
            listPage={list}
            loading={productsLoading}
            compactFilterBar={true}
            filterGridClassName={
              sellerView
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }
          />
        }
        emptyText="No products found matching your search or filter criteria."
        onRowClick={(row) => navigate(`/app/seller-special-price-manager/${row._id || row.id}`)}
      />
    </div>
  );
};

export default SellerSpecialPriceManager;