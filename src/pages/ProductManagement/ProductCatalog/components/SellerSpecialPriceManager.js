import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ImageGallery from "../../../../components/Atoms/ImageGallery/ImageGallery";
import {
  getPrimaryProductImage,
  getProductImages,
} from "../../../../_helpers/productMedia";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Upload,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Percent,
  CheckCircle2,
} from "lucide-react";
import {
  bulkUpdateSpecialPrices,
  getProducts,
  getProductById,
} from "../../../../Redux/productSlice";
import { getAllSellerList } from "../../../../Redux/StoreSlice";
import { transformArray } from "../../../../_helpers/globalFunctions";

import {
  DataTable,
  PageHeader,
  FilterBar,
  SellerIdentity,
} from "../../../../components/Shared";
import ProductStatusBadge from "../../../../components/Product/ProductStatusBadge";
import Loader from "../../../../components/Loader/Loader";
import { useListPage } from "../../../../hooks/useListPage";
import { isSellerPanel } from "../../../../_helpers/panelConfig";
import {
  ExportButton,
  ImportButton,
} from "../../../../components/Atoms/buttons/exportImport";
import { MdFileDownload } from "react-icons/md";

import toast from "../../../../utils/toast";
import {
  exportToExcelWorkbook,
  parseImportFile,
} from "../../../../_helpers/exportToCsv";

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
  "newSpecialPrice",
  "updatedSpecialPrice",
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
  const original = normalizeSpecialPriceValue(row.originalSpecialPrice ?? "");

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
    !isEmpty && current !== original && !hasError && !isZeroPrice;

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
    return typeof product.image === "string"
      ? product.image
      : product.image?.url || "";
  }
  if (product?.variants && product.variants.length > 0) {
    const vImg = product.variants[0]?.images?.[0] || product.variants[0]?.image;
    return typeof vImg === "string" ? vImg : vImg?.url || "";
  }
  return "";
};

const SpecialPriceGuide = () => {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5decb] bg-gradient-to-b from-[#fbf8f1] via-white to-white shadow-xs">
      {/* Top Banner: Guideline Rule + Example + Toggle Button */}
      <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
        {/* Left: Rule Description */}
        <div className="flex items-start gap-3">
          {/* <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1f1b5f] text-[#e5b338] shadow-xs">
            <Percent size={18} aria-hidden="true" />
          </div> */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-bold text-[#1f1b5f]">
                Special Price Guidelines
              </h3>
              <span className="inline-flex items-center rounded-full border border-[#f5dc97] bg-[#fff3d2] px-2 py-0.5 text-[10px] font-semibold text-[#8c6300]">
                50% – 99.9% of Selling Price
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-600">
              Special promotional price must be <strong>at least 50%</strong> of
              the selling price and <strong>strictly lower</strong> than selling
              price.
            </p>
          </div>
        </div>

        {/* Right: Example Box & Quick Guide Toggle */}
        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
          <div className="flex items-center gap-2 rounded-lg border border-[#e5decb] bg-white/95 px-3 py-1.5 text-[11px] shadow-2xs">
            <span className="text-gray-500 font-medium">Example:</span>
            <span className="font-semibold text-gray-800">
              Selling Price ₹1,999
            </span>
            <span className="text-gray-400">→</span>
            <span className="font-bold text-emerald-700">
              Valid: ₹999.50 to ₹1,998.99
            </span>
          </div>

          <button
            type="button"
            onClick={() => setGuideOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#dcd4c3] bg-white px-3 py-1.5 text-xs font-medium text-[#1f1b5f] shadow-2xs transition-colors hover:border-[#1f1b5f]/50 hover:bg-[#faf7f0] focus:outline-none"
            aria-expanded={guideOpen}
          >
            <FileSpreadsheet size={14} className="text-[#1f1b5f]" />
            <span>Import & Export Guide</span>
            {guideOpen ? (
              <ChevronUp size={14} className="text-[#1f1b5f]" />
            ) : (
              <ChevronDown size={14} className="text-[#1f1b5f]" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Detail Section: Step-by-Step Workflow */}
      {guideOpen && (
        <div className="border-t border-[#eae3d5] bg-[#faf8f4]/60 p-4 space-y-3.5">
          {/* Two-Column Steps Card Grid */}
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {/* Step Card 1: Export */}
            <div className="rounded-lg border border-[#e8e2d5] bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#eef0f8] text-[#1f1b5f]">
                  <Download size={14} />
                </div>
                <h4 className="text-xs font-bold text-gray-900">
                  How to Export & Edit Template
                </h4>
              </div>
              <ol className="mt-2.5 space-y-2 text-[11px] text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e8ebf7] text-[10px] font-bold text-[#1f1b5f]">
                    1
                  </span>
                  <span>
                    Click the <strong>"Export Template"</strong> button in the
                    top action bar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e8ebf7] text-[10px] font-bold text-[#1f1b5f]">
                    2
                  </span>
                  <span>
                    Download and open the Excel file (
                    <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-800">
                      .xlsx
                    </code>
                    ) with all variant details.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e8ebf7] text-[10px] font-bold text-[#1f1b5f]">
                    3
                  </span>
                  <span>
                    Edit <strong>only</strong> the{" "}
                    <code className="rounded border border-[#d6cfec] bg-[#f0edf7] px-1.5 py-0.5 text-[10px] font-semibold text-[#1f1b5f]">
                      newSpecialPrice
                    </code>{" "}
                    column for desired variants.
                  </span>
                </li>
              </ol>
            </div>

            {/* Step Card 2: Import */}
            <div className="rounded-lg border border-[#e8e2d5] bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                  <Upload size={14} />
                </div>
                <h4 className="text-xs font-bold text-gray-900">
                  How to Import & Apply Prices
                </h4>
              </div>
              <ol className="mt-2.5 space-y-2 text-[11px] text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                    1
                  </span>
                  <span>
                    Fill in{" "}
                    <code className="rounded bg-emerald-50 px-1 py-0.5 text-[10px] font-semibold text-emerald-800">
                      newSpecialPrice
                    </code>{" "}
                    values in the sheet.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                    2
                  </span>
                  <span>
                    Save file as{" "}
                    <strong className="text-gray-800">
                      .xlsx, .xls, or .csv
                    </strong>
                    .
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                    3
                  </span>
                  <span>
                    Click <strong>"Import Excel"</strong> and select your
                    prepared file.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">
                    4
                  </span>
                  <span>
                    Review loaded prices in the table below and click{" "}
                    <strong className="text-[#8c6300]">"Save Changes"</strong>{" "}
                    to apply.
                  </span>
                </li>
              </ol>
            </div>
          </div>

          {/* Validation Checklist / Important Notes Callout */}
          <div className="rounded-lg border border-amber-200/90 bg-amber-50/80 p-3 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle size={14} className="shrink-0 text-amber-600" />
              <span>Important Validation Notes</span>
            </div>
            <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-gray-700">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>
                  Do <strong>not</strong> modify column headers or IDs
                  (productId, variantId, SKU).
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>
                  Special price must be <strong>≥ 50%</strong> and{" "}
                  <strong>&lt; 100%</strong> of selling price.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>
                  Leave{" "}
                  <code className="bg-amber-100/90 px-1 rounded text-[10px]">
                    newSpecialPrice
                  </code>{" "}
                  empty to keep existing price unchanged.
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>
                  Always export a fresh template before importing to sync latest
                  prices.
                </span>
              </div>
            </div>
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

  const [selectedImages, setSelectedImages] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const handleImageClick = useCallback((data) => {
    const images = Array.isArray(data) ? data : getProductImages(data);

    if (!images.length) {
      toast.info("No product images available.");
      return;
    }

    setSelectedImages(images);
    setGalleryOpen(true);
  }, []);

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
      if (list.search) {
        const trimmedSearch = String(list.search).trim();
        query.search = trimmedSearch;
        query.keyWord = trimmedSearch;
      }

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
      let foundProduct = products.find((p) => (p._id || p.id) === productId);

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
          listRes?.data?.data?.list ||
          listRes?.data?.list ||
          listRes?.data?.data ||
          [];
        foundProduct =
          listData.find((p) => (p._id || p.id) === productId) || listData[0];
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
    const prodId =
      typeof selectedProd === "object" ? selectedProd?.value : selectedProd;
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
      }),
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
    if (!rows.length) {
      toast.info("No special prices available to export.");
      return;
    }

    try {
      const columns = [
        { key: "productId", label: "Product ID" },
        { key: "productName", label: "Product Name" },
        { key: "sku", label: "SKU" },
        { key: "variantId", label: "Variant ID" },
        { key: "variantSku", label: "Variant SKU" },
        { key: "variantTitle", label: "Variant Title" },
        { key: "mrp", label: "MRP" },
        { key: "sellingPrice", label: "Selling Price" },
        { key: "specialPrice", label: "Current Special Price" },
        { key: "newSpecialPrice", label: "New Special Price" },
        { key: "productStatus", label: "Product Status" },
        { key: "variantStatus", label: "Variant Status" },
      ];

      const data = rows.map((row) => ({
        productId: row.productId || "",
        productName: row.productName || "",
        sku: row.productSku || "",
        variantId: row.variantId || "",
        variantSku: row.variantSku || "",
        variantTitle: row.variantTitle || "Default",
        mrp: Number(row.mrp || 0),
        sellingPrice: Number(row.sellingPrice || 0),
        specialPrice:
          row.originalSpecialPrice === "" || row.originalSpecialPrice == null
            ? ""
            : Number(row.originalSpecialPrice),
        newSpecialPrice:
          row.specialPrice === "" || row.specialPrice == null
            ? ""
            : Number(row.specialPrice),
        productStatus: row.productStatus || "",
        variantStatus: row.variantStatus || "",
      }));

      const sheets = [
        {
          name: "Special Prices",
          title: "Special Price Report",
          data,
          columns,
        },
      ];

      const exported = exportToExcelWorkbook(
        sheets,
        "Special_Price_Report.xlsx",
      );

      if (exported) {
        toast.success("Special price report exported successfully.");
      } else {
        toast.error("Unable to export special price report.");
      }
    } catch (error) {
      console.error("Special price export error:", error);
      toast.error("Failed to export special price report.");
    }
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
            return (
              String(importedRow.variantSku).toLowerCase() ===
              String(row.variantSku).toLowerCase()
            );
          }
          return String(importedRow.productId) === String(row.productId);
        });

        if (targetRow) {
          matchesFound += 1;
          const parsedVal = normalizeSpecialPriceValue(
            importedRow.newSpecialPrice,
          );
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
        render: (_, product) => {
          const productImages = getProductImages(product);
          const primaryImage = getPrimaryProductImage(product);

          return (
            <div className="flex flex-col items-center gap-1">
              {primaryImage ? (
                <button
                  type="button"
                  className="h-10 w-10 overflow-hidden rounded border border-gray-200 bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageClick(productImages);
                  }}
                  title="View product images"
                >
                  <span
                    role="img"
                    aria-label={product?.title || product?.name || "Product"}
                    className="block h-full w-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url("${String(primaryImage).replace(
                        /"/g,
                        "%22",
                      )}")`,
                    }}
                  />
                </button>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
                  No
                </span>
              )}

              <button
                type="button"
                className={`text-xs ${
                  productImages.length
                    ? "text-blue-500 hover:underline"
                    : "cursor-not-allowed text-gray-400"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick(productImages);
                }}
                disabled={!productImages.length}
              >
                View
              </button>
            </div>
          );
        },
      },
      {
        key: "title",
        label: "Product",
        sortable: true,
        render: (_, row) => (
          <div className="special-price-product-cell">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/app/seller-special-price-manager/${row._id || row.id}`,
                )
              }
              className="special-price-product-name text-left font-semibold text-[var(--admin-ink)] hover:text-[var(--admin-blue)] hover:underline focus:outline-none"
            >
              {row.title || row.name || "Untitled Product"}
            </button>
            <span className="special-price-product-sku text-xs text-gray-500">
              {row.sku || "No SKU"}
            </span>
          </div>
        ),
      },
      ...(!sellerView
        ? [
            {
              key: "seller",
              label: "Seller",
              render: (_, row) => <SellerIdentity row={row} />,
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
            const prices = variants
              .map((v) => Number(v.price || 0))
              .filter((p) => p > 0);
            if (prices.length > 0) {
              const min = Math.min(...prices);
              const max = Math.max(...prices);
              return (
                <span className="font-mono text-xs font-medium text-gray-800">
                  {min === max
                    ? formatMoney(min)
                    : `${formatMoney(min)} - ${formatMoney(max)}`}
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
        render: (_, row) => (
          <ProductStatusBadge status={row.status || "active"} />
        ),
      },

      {
        key: "action",
        label: "Action",
        render: (_, row) => (
          <button
            type="button"
            onClick={() =>
              navigate(`/app/seller-special-price-manager/${row._id || row.id}`)
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--admin-gold)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--admin-gold)] transition-colors hover:bg-[var(--admin-gold)] hover:text-white focus:border-[var(--admin-gold)] focus:outline-none focus:ring-0"
          >
            Manage Special Prices
            <ArrowRight aria-hidden="true" size={14} />
          </button>
        ),
      },
    ],
    [sellerView, navigate, handleImageClick],
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
            <p className="font-semibold text-gray-900">
              {value || "Default Variant"}
            </p>
            <p className="font-mono text-xs text-gray-500">
              {row.variantSku || row.productSku}
            </p>
          </div>
        ),
      },
      {
        key: "mrp",
        label: "MRP",
        render: (value) => (
          <span className="font-mono text-sm text-gray-500 line-through">
            {formatMoney(value)}
          </span>
        ),
      },
      {
        key: "sellingPrice",
        label: "Price",
        render: (value) => (
          <span className="font-mono text-sm font-semibold text-gray-800">
            {formatMoney(value)}
          </span>
        ),
      },
      {
        key: "originalSpecialPrice",
        label: "Special Price",
        render: (value) =>
          value !== "" && value !== null && value !== undefined ? (
            <span className="font-mono text-sm font-semibold text-green-700">
              {formatMoney(value)}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Not Set</span>
          ),
      },
      {
        key: "specialPrice",
        label: "Update Special Price",
        render: (value, row) => {
          const { hasError, minimumSpecialPrice } = getRowFlags(row);
          return (
            <div>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-xs font-medium text-gray-400">
                  ₹
                </span>
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
                    minimumSpecialPrice,
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
                className="admin-btn-secondary"
              >
                <ArrowLeft aria-hidden="true" size={15} />
                Back
              </button>

              <ExportButton onClick={handleExport} disabled={importing} />

              <ImportButton
                onClick={() => fileInputRef.current?.click()}
                importing={importing}
              />

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
                className={`inline-flex items-center gap-1.5 rounded-lg bg-[var(--admin-gold)] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:opacity-90 focus:outline-none ${
                  canSave ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                }`}
              >
                {saving
                  ? "Saving..."
                  : `Save Changes ${pendingCount ? `(${pendingCount})` : ""}`}
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
                  <span>
                    SKU:{" "}
                    <strong className="text-gray-700">
                      {detailProduct.sku || "-"}
                    </strong>
                  </span>
                  {!sellerView &&
                    (detailProduct.sellerName ||
                      detailProduct.seller?.name) && (
                      <span>
                        Seller:{" "}
                        <strong className="text-gray-700">
                          {detailProduct.sellerName ||
                            detailProduct.seller?.name}
                        </strong>
                      </span>
                    )}
                  <span>
                    Total Variants:{" "}
                    <strong className="text-gray-700">{rows.length}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Unified Special Price Guidelines & Import/Export Guide */}
        <SpecialPriceGuide />

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
        breadcrumbs={[
          { label: sellerView ? "Catalog" : "Catalog Management" },
          { label: "Special Price Management" },
        ]}
      />

      {/* Products DataTable with embedded Search and FilterBar */}
      <DataTable
        columns={productColumns}
        data={products}
        loading={productsLoading}
        totalCount={totalProducts}
        listPage={list}
        rowKey="_id"
        searchPlaceholder="Search product name, SKU"
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
        onRowClick={(row) =>
          navigate(`/app/seller-special-price-manager/${row._id || row.id}`)
        }
      />
      <ImageGallery
        images={selectedImages}
        isOpen={galleryOpen}
        onClose={() => {
          setGalleryOpen(false);
          setSelectedImages(null);
        }}
      />
    </div>
  );
};

export default SellerSpecialPriceManager;
