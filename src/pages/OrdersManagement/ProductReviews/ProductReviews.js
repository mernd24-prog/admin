import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import Cards from "../../../components/Cards/Cards";
import {
  MdAdd,
  MdRateReview,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdClose,
  MdVisibilityOff,
  MdVisibility,
  MdStar,
  MdStarBorder,
  MdChevronLeft,
  MdChevronRight,
  MdImageNotSupported,
  MdDescription,
  MdOutlineDescription,
} from "react-icons/md";
import {
  PageHeader,
  DataTable,
  ConfirmModal,
  BulkActionBar,
  FilterBar,
  StatusBadge,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import {
  bulkUpdateProductReviews,
  deleteProductReview,
  getProductReviewSummaryReviews,
  getProductReviewSummaries,
  updateProductReview,
} from "../../../Redux/adminCoreSlice";
import EditProductReview from "./components/EditProductReview";
import AddProductReview from "./components/AddProductReview";
import { useListPage } from "../../../hooks/useListPage";
import { isSellerPanel } from "../../../_helpers/panelConfig";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { getProducts } from "../../../Redux/productSlice";
import { formatDateTime12Hour } from "../../../utils/formatters";
import { useNavigate } from "react-router";
import { exportToExcelWorkbook } from "../../../_helpers/exportToCsv";
import { ExportButton } from "../../../components/Atoms/buttons/exportImport";

const SELLER_PANEL_ROLES = new Set([
  "seller",
  "seller-admin",
  "seller-sub-admin",
]);

const getSessionUserData = () => {
  const userDataString = sessionStorage.getItem("EcomAdmin");

  if (!userDataString) return null;

  try {
    return JSON.parse(userDataString);
  } catch {
    return null;
  }
};

const getProductName = (row = {}) =>
  row.productName ||
  row.product?.title ||
  row.product?.name ||
  row.product?.sku ||
  row.title ||
  "";

const cssImageUrl = (value) =>
  `url("${String(value || "").replace(/"/g, "%22")}")`;

const getReviewId = (row = {}) => row._id || row.id || row.reviewId || "";

const displayBuyerName = (review = {}) => {
  const name =
    review.buyerName ||
    review.buyer?.displayName ||
    review.buyer?.fullName ||
    review.buyer?.name ||
    review.buyer?.email ||
    "";

  return name || "Verified Buyer";
};

const getProductId = (row = {}) =>
  row.productId || row.product?._id || row.product?.id || "";

const getMetaTotal = (payload = {}, source = {}, list = []) =>
  Number(
    source?.total ??
      payload?.total ??
      source?.meta?.total ??
      payload?.meta?.total ??
      source?.meta?.pagination?.total ??
      payload?.meta?.pagination?.total ??
      list.length,
  );

const getProductReviewSummaryPayload = (state = {}) => {
  const payload = state?.productReviewSummariesData?.data || {};
  const source =
    payload?.data && !payload?.list && !payload?.items ? payload.data : payload;

  const list = Array.isArray(source?.list)
    ? source.list
    : Array.isArray(source?.items)
      ? source.items
      : Array.isArray(source?.summaries)
        ? source.summaries
        : [];

  return {
    list,
    total: getMetaTotal(payload, source, list),
    summary: source?.summary || payload?.summary || {},
  };
};

const getProductReviewDetailPayload = (state = {}) => {
  const candidateKeys = [
    "productReviewSummaryReviewsData",
    "productReviewSummaryReviews",
    "productReviewDetailsData",
    "productReviewDetails",
    "productReviewsData",
    "productReviews",
  ];

  let payload = null;

  for (const key of candidateKeys) {
    if (state?.[key] != null) {
      payload = state[key]?.data ?? state[key];
      break;
    }
  }

  if (!payload) {
    const matchingEntry = Object.entries(state || {}).find(
      ([key, value]) =>
        /product.*review|review.*product/i.test(key) &&
        !/summaries/i.test(key) &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value),
    );

    if (matchingEntry) {
      const value = matchingEntry[1];
      payload = value?.data ?? value;
    }
  }

  payload = payload || {};

  const source =
    payload?.data &&
    !Array.isArray(payload?.list) &&
    !Array.isArray(payload?.items) &&
    !Array.isArray(payload?.reviews)
      ? payload.data
      : payload;

  const nestedSource = source?.data || source;

  const list = Array.isArray(nestedSource?.list)
    ? nestedSource.list
    : Array.isArray(nestedSource?.items)
      ? nestedSource.items
      : Array.isArray(nestedSource?.reviews)
        ? nestedSource.reviews
        : Array.isArray(nestedSource?.docs)
          ? nestedSource.docs
          : Array.isArray(nestedSource?.results)
            ? nestedSource.results
            : Array.isArray(nestedSource?.data)
              ? nestedSource.data
              : [];

  return {
    list,
    total: getMetaTotal(payload, nestedSource, list),
    summary: nestedSource?.summary || source?.summary || payload?.summary || {},
    product:
      nestedSource?.product || source?.product || payload?.product || null,
  };
};

const RatingStars = ({ value = 0, showValue = true }) => {
  const rating = Number(value || 0);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) =>
          star <= Math.round(rating) ? (
            <MdStar
              aria-hidden="true"
              key={star}
              className="text-orange-500"
              size={17}
            />
          ) : (
            <MdStarBorder
              aria-hidden="true"
              key={star}
              className="text-gray-300"
              size={17}
            />
          ),
        )}
      </div>

      {showValue && (
        <span className="text-xs font-semibold text-gray-700">
          {rating ? rating.toFixed(1) : "0.0"}
        </span>
      )}
    </div>
  );
};

const ReviewDetailsModal = ({ review, onClose, onModerate }) => {
  const [activeImage, setActiveImage] = useState("");

  if (!review) return null;

  const reviewText = review.reviewText || review.comment || review.review || "";

  const productName = getProductName(review) || "Product";

  const reviewMedia = Array.isArray(review.media)
    ? review.media
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.url || item?.imageUrl || item?.src || "",
        )
        .filter(Boolean)
    : [];

  const selectedImage = reviewMedia.includes(activeImage)
    ? activeImage
    : reviewMedia[0] || "";

  const activeImageIndex = reviewMedia.indexOf(selectedImage);

  const showAdjacentImage = (direction) => {
    if (reviewMedia.length < 2) return;

    const nextIndex =
      (activeImageIndex + direction + reviewMedia.length) % reviewMedia.length;

    setActiveImage(reviewMedia[nextIndex]);
  };

  const rating = Math.min(5, Math.max(0, Number(review.rating) || 0));

  const isVerifiedPurchase = Boolean(
    review.orderId && !String(review.orderId).startsWith("admin:"),
  );

  const reviewId = review._id || review.id || review.reviewId || "—";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-details-title"
        className="relative flex h-[min(600px,80vh)] w-full max-w-[1000px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close review details"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-100 hover:text-gray-900 sm:right-4 sm:top-4"
        >
          <MdClose size={21} />
        </button>

        {/* Main content */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] md:overflow-hidden">
          {/* LEFT: Image gallery */}
          <section className="flex min-h-[400px] flex-col border-b border-gray-200 bg-white p-4 sm:p-6 md:min-h-0 md:border-b-0 md:border-r md:p-5 lg:p-7">
            {/* Gallery heading */}
            <div className="mb-4 flex items-center justify-between gap-3 pr-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-[#1f356b]">
                  Review photos
                </span>

                <span className="rounded-full bg-[#fff4d9] px-2.5 py-1 text-xs font-semibold text-[#946500]">
                  {reviewMedia.length} photos
                </span>
              </div>

              <span className="shrink-0 text-sm font-semibold text-gray-500">
                {reviewMedia.length
                  ? `${activeImageIndex + 1} / ${reviewMedia.length}`
                  : "0 / 0"}
              </span>
            </div>

            {/* Main image */}
            <div className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-[#f3f5f8] md:min-h-0">
              {selectedImage ? (
                <>
                  <img
                    key={selectedImage}
                    src={selectedImage}
                    alt={`${productName} review photo ${activeImageIndex + 1}`}
                    className="h-full w-full object-contain"
                  />

                  {reviewMedia.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => showAdjacentImage(-1)}
                        aria-label="Previous review photo"
                        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-[#1f356b] shadow-md transition hover:bg-[#fff4d9]"
                      >
                        <MdChevronLeft size={26} />
                      </button>

                      <button
                        type="button"
                        onClick={() => showAdjacentImage(1)}
                        aria-label="Next review photo"
                        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white text-[#1f356b] shadow-md transition hover:bg-[#fff4d9]"
                      >
                        <MdChevronRight size={26} />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <MdImageNotSupported size={32} />
                  </span>

                  <span className="text-sm font-medium">
                    No review photos available
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail gallery */}
            {reviewMedia.length > 0 && (
              <div className="mt-4 flex shrink-0 gap-3 overflow-x-auto pb-1">
                {reviewMedia.map((image, index) => {
                  const isActive = image === selectedImage;

                  return (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(image)}
                      aria-label={`Show review photo ${index + 1}`}
                      aria-pressed={isActive}
                      className={`h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border-2 bg-[#f3f5f8] p-0.5 transition ${
                        isActive
                          ? "border-[#d6a323] shadow-sm"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full rounded-lg object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* RIGHT: Review details */}
          <section className="flex min-h-[420px] min-w-0 flex-col overflow-hidden bg-white px-4 pb-0 pt-5 sm:px-6 md:min-h-0 md:px-7 md:pt-8 lg:px-9">
            {/* Review title */}
            <div className="shrink-0 border-b border-gray-200 pb-5 pr-10">
              <h2
                id="review-details-title"
                className="text-xl font-bold line-clamp-2 leading-snug text-[#1f356b] sm:text-2xl"
              >
                {review.title || "Customer review"}
              </h2>

              {/* Rating and verified purchase */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div
                  className="flex items-center gap-0.5"
                  aria-label={`${rating} out of 5 stars`}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-[27px] leading-none ${
                        star <= rating ? "text-[#d99a00]" : "text-gray-300"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Review heading and character count */}
            <div className="flex shrink-0 items-center justify-between gap-3 py-4">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[#1f356b]">
                Customer review
              </h3>

              <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500">
                {reviewText.length} characters
              </span>
            </div>

            {/* Independently scrollable review text */}
            <div className="min-h-[180px] flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-[#fcfcfd] p-4 sm:p-5">
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#283b67] sm:text-base sm:leading-8">
                {reviewText || "No review text provided."}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 py-4 sm:py-5">
              <div className="flex min-w-0 items-center gap-2 text-sm text-gray-500">
                <MdOutlineDescription
                  size={20}
                  className="shrink-0 text-[#526994]"
                />

                <span className="truncate">Review ID: {String(reviewId)}</span>
              </div>

              <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold capitalize text-gray-600">
                {String(review.status || "pending").replace(/_/g, " ")}
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const ProductReviews = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const reviewsData = useSelector((state) => state.adminCore);

  const [reviewDetailsTarget, setReviewDetailsTarget] = useState(null);

  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });

  const { clearSelection } = list;

  const [editTarget, setEditTarget] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    review: null,
  });

  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [userData, setUserData] = useState(() => getSessionUserData());
  const [productOptions, setProductOptions] = useState([]);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  const isSellerPanelUser = SELLER_PANEL_ROLES.has(userData?.role);
  const sellerView = isSellerPanel();
  const sellerScoped = isSellerPanelUser || sellerView;
  const isDetailMode = Boolean(selectedProductId);
  const showSellerFilter = !sellerScoped;

  const summaryPayload = getProductReviewSummaryPayload(reviewsData);
  const detailPayload = getProductReviewDetailPayload(reviewsData);

  const filterFields = useMemo(
    () => [
      ...(showSellerFilter
        ? [
            {
              key: "sellerId",
              type: "asyncDropdown",
              label: "Seller",
              width: "w-52",
              placeholder: "All Sellers",
              load: async (search) => {
                const result = await dropdownApi.getSellers({
                  keyWord: search,
                  searchFields: "full_name,email,businessName",
                  limit: 20,
                });

                return Array.isArray(result) ? result : [];
              },
            },
          ]
        : []),
      ...(!isDetailMode
        ? [
            {
              key: "product",
              type: "select",
              label: "Product",
              width: "w-52",
              options: productOptions,
              placeholder: "All Products",
            },
          ]
        : []),
    ],
    [productOptions, showSellerFilter, isDetailMode],
  );

  const items = isDetailMode ? detailPayload.list : summaryPayload.list;
  const total = isDetailMode ? detailPayload.total : summaryPayload.total;

  const selectedSummaryRow =
    selectedProductId && summaryPayload.list.length
      ? summaryPayload.list.find(
          (row) =>
            String(row.productId || row.product?._id || row._id || row.id) ===
            String(selectedProductId),
        ) || null
      : null;

  const selectedProductOption = productOptions.find(
    (product) => String(product.value) === String(selectedProductId),
  );

  const selectedProduct =
    detailPayload.product ||
    selectedSummaryRow?.product ||
    (selectedProductId
      ? {
          id: selectedProductId,
          title: selectedProductOption?.label || "Selected product",
        }
      : null);

  const selectedProductTitle =
    selectedProduct?.title ||
    selectedProduct?.name ||
    selectedProductOption?.label ||
    "Selected product";

  const selectedStatusCounts = detailPayload.list.reduce((counts, review) => {
    const status = review.status || "pending";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  useEffect(() => {
    setUserData(getSessionUserData());
  }, []);

  const fetchReviews = () => {
    const params = list.toQueryParams();

    setLoading(true);
    setError("");

    const productIdFromFilter = list.filters.product || undefined;
    const sellerIdFromFilter =
      list.filters.sellerId || selectedSellerId || undefined;

    const requestParams = {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      status: params.status || undefined,
      rating: params.rating ? Number(params.rating) : undefined,
      sellerId: !sellerScoped ? sellerIdFromFilter : undefined,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
      sellerScope: sellerScoped || undefined,
    };

    const action = selectedProductId
      ? getProductReviewSummaryReviews({
          ...requestParams,
          productId: selectedProductId,
        })
      : getProductReviewSummaries({
          ...requestParams,
          productId: productIdFromFilter,
        });

    dispatch(action)
      .unwrap()
      .catch((err) => {
        const msg = err?.message || "Failed to load product reviews";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let mounted = true;

    const loadProductOptions = async () => {
      try {
        const response = await dispatch(
          getProducts({
            page: 1,
            limit: 200,
            sellerId: !sellerScoped ? selectedSellerId || undefined : undefined,
          }),
        ).unwrap();

        const products = Array.isArray(response?.data?.products)
          ? response.data.products
          : Array.isArray(response?.data?.docs)
            ? response.data.docs
            : Array.isArray(response?.items)
              ? response.items
              : Array.isArray(response?.list)
                ? response.list
                : Array.isArray(response?.data?.items)
                  ? response.data.items
                  : Array.isArray(response?.data?.list)
                    ? response.data.list
                    : [];

        const mapped = products.map((product) => ({
          value: product._id || product.id,
          label:
            product.title ||
            product.name ||
            product.productName ||
            product.sku ||
            "Unnamed product",
        }));

        if (mounted) setProductOptions(mapped);
      } catch {
        if (mounted) setProductOptions([]);
      }
    };

    loadProductOptions();

    return () => {
      mounted = false;
    };
  }, [dispatch, sellerScoped, selectedSellerId]);

  useEffect(() => {
    const nextSellerId = list.filters.sellerId || "";

    if (selectedSellerId !== nextSellerId) {
      setSelectedSellerId(nextSellerId);
    }

    clearSelection();
  }, [clearSelection, list.filters.sellerId, selectedSellerId]);

  useEffect(() => {
    fetchReviews();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    list.page,
    list.pageSize,
    list.search,
    list.sortKey,
    list.sortDir,
    list.filters,
    selectedSellerId,
    selectedProductId,
  ]);

  const handleBulkStatus = async (status) => {
    if (!list.selectedKeys.length) return;

    setBulkLoading(true);

    try {
      await dispatch(
        bulkUpdateProductReviews({
          reviewIds: list.selectedKeys,
          status,
          sellerScope: sellerScoped,
        }),
      ).unwrap();

      toast.success(
        status === "published"
          ? "Selected reviews approved"
          : "Selected reviews updated",
      );

      list.clearSelection();
      fetchReviews();
    } catch (err) {
      toast.error(err?.message || "Failed to update selected reviews");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDelete = async () => {
    const reviewId = getReviewId(deleteConfirm.review || {});
    if (!reviewId) return;

    try {
      await dispatch(deleteProductReview({ reviewId })).unwrap();

      toast.success("Review deleted");
      setDeleteConfirm({ open: false, review: null });
      fetchReviews();
    } catch (err) {
      toast.error(err?.message || "Failed to delete review");
    }
  };

  const handleBulkDelete = async () => {
    if (sellerScoped || !list.selectedKeys.length) return;

    setBulkLoading(true);

    try {
      await Promise.all(
        list.selectedKeys.map((reviewId) =>
          dispatch(deleteProductReview({ reviewId })).unwrap(),
        ),
      );

      toast.success("Selected reviews deleted");
      setBulkDeleteConfirm(false);
      list.clearSelection();
      fetchReviews();
    } catch (err) {
      toast.error(err?.message || "Failed to delete selected reviews");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleReviewStatus = async (row, status) => {
    const reviewId = getReviewId(row);
    if (!reviewId) return;

    setBulkLoading(true);

    try {
      await dispatch(
        updateProductReview({
          reviewId,
          status,
          sellerScope: sellerScoped,
        }),
      ).unwrap();

      toast.success(
        status === "published" ? "Review approved" : "Review updated",
      );

      setReviewDetailsTarget(null);
      fetchReviews();
    } catch (err) {
      toast.error(err?.message || "Failed to update review");
    } finally {
      setBulkLoading(false);
    }
  };

  const openProductReviews = (row) => {
    const productId = getProductId(row);

    if (!productId) {
      toast.error("Product ID not found");
      return;
    }

    list.setPage(1);
    list.setFilter("product", String(productId));
    setSelectedProductId(String(productId));
  };

  const exportExcelSheets = useMemo(() => {
    if (!items?.length) return [];

    if (isDetailMode) {
      const detailRows = items.map((row, idx) => ({
        serialNumber: idx + 1,
        buyer: displayBuyerName(row),
        rating: row.rating || 0,
        title: row.title || "",
        review: row.reviewText || row.comment || "",
        status: row.status || "",
        reviewedAt: row.createdAt
          ? formatDateTime12Hour(row.createdAt, "—")
          : "—",
      }));

      return [
        {
          name: "Review Details",
          title: "Review Details",
          data: detailRows,
          columns: [
            { key: "serialNumber", label: "S.No" },
            { key: "buyer", label: "Buyer" },
            { key: "rating", label: "Rating" },
            { key: "title", label: "Title" },
            { key: "review", label: "Review" },
            { key: "status", label: "Status" },
            { key: "reviewedAt", label: "Reviewed At" },
          ],
        },
      ];
    }

    const summaryRows = items.map((row, idx) => ({
      serialNumber: idx + 1,
      productName: getProductName(row) || "Product",
      averageRating: row.averageRating || 0,
      reviewCount: row.reviewCount || 0,
      publishedCount: row.publishedCount || 0,
      pendingCount: row.pendingCount || 0,
      latestReviewAt: row.latestReviewAt
        ? formatDateTime12Hour(row.latestReviewAt, "—")
        : "—",
    }));

    return [
      {
        name: "Review Summaries",
        title: "Review Summaries",
        data: summaryRows,
        columns: [
          { key: "serialNumber", label: "S.No" },
          { key: "productName", label: "Product Name" },
          { key: "averageRating", label: "Average Rating" },
          { key: "reviewCount", label: "Reviews" },
          { key: "publishedCount", label: "Published" },
          { key: "pendingCount", label: "Pending" },
          { key: "latestReviewAt", label: "Last Review" },
        ],
      },
    ];
  }, [items, isDetailMode]);

  const exportFilename = isDetailMode
    ? "product-review-details.xlsx"
    : "product-review-summaries.xlsx";

  const handleExport = () => {
    if (!items?.length) {
      toast.info("No reviews available to export.");
      return;
    }

    try {
      const exported = exportToExcelWorkbook(exportExcelSheets, exportFilename);

      if (exported) {
        toast.success("Reviews exported successfully.");
      } else {
        toast.error("Unable to export reviews.");
      }
    } catch (error) {
      console.error("Reviews export error:", error);
      toast.error("Failed to export reviews.");
    }
  };

  const summaryColumns = [
    {
      key: "productId",
      label: "Product",
      render: (v, row) => {
        const productImage =
          row.productImage ||
          row.product?.image ||
          row.product?.imageUrl ||
          row.product?.thumbnail ||
          row.product?.thumbnailUrl ||
          row.product?.images?.find(Boolean) ||
          row.product?.commonImages?.find(Boolean) ||
          row.image ||
          row.imageUrl ||
          row.thumbnail ||
          row.thumbnailUrl ||
          row.images?.find(Boolean) ||
          row.commonImages?.find(Boolean);
        const productName = getProductName(row) || "Product";

        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              role="img"
              aria-label={`${productName} image`}
              className="h-9 w-9 flex-shrink-0 rounded-md border border-gray-200 bg-cover bg-center bg-gray-50"
              style={
                productImage
                  ? { backgroundImage: cssImageUrl(productImage) }
                  : undefined
              }
            />

            <div className="min-w-0">
              <span
                className="block max-w-[200px] truncate text-xs font-semibold text-gray-800"
                title={productName}
              >
                {productName}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "averageRating",
      label: "Average Rating",
      sortable: true,
      render: (v) => <RatingStars value={v} />,
    },
    {
      key: "reviewCount",
      label: "Reviews",
      headerClassName: "text-center",
      cellClassName: "text-center",
      render: (v) => (
        <span className="inline-flex items-center justify-center text-xs font-semibold text-gray-800">
          {v || 0}
        </span>
      ),
    },
    {
      key: "publishedCount",
      label: "Status",
      render: (v, row) => {
        const publishedCount = Number(row.publishedCount || 0);
        const pendingCount = Number(row.pendingCount || 0);

        return (
          <div className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
            {publishedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="font-bold">{publishedCount}</span>
                <span>Live</span>
              </span>
            )}

            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span className="font-bold">{pendingCount}</span>
                <span>Pending</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "latestReviewAt",
      label: "Last Review",
      sortable: true,
      render: (v) => (
        <span className="whitespace-nowrap text-xs font-medium text-gray-500">
          {v ? formatDateTime12Hour(v, "—") : "—"}
        </span>
      ),
    },
  ];

  const detailColumns = [
    {
      key: "buyerName",
      label: "Buyer",
      render: (v, row) => (
        <div className="min-w-0">
          <span className="block max-w-[180px] truncate text-xs font-semibold text-gray-800">
            {displayBuyerName(row)}
          </span>

          {row.buyer?.email && (
            <span className="block max-w-[180px] truncate text-[11px] text-gray-400">
              {row.buyer.email}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      render: (v) => <RatingStars value={v} showValue={false} />,
    },
    {
      key: "reviewText",
      label: "Review",
      render: (v, row) => {
        const reviewText = v || row.comment || row.review || "";
        const previewLength = 140;
        const isLongReview = reviewText.length > previewLength;

        return (
          <div className="min-w-[260px] max-w-[460px] py-1">
            {row.title && (
              <p
                className="mb-1 truncate text-xs font-semibold text-gray-800"
                title={row.title}
              >
                {row.title}
              </p>
            )}

            <p className="whitespace-normal break-words text-xs leading-5 text-gray-600">
              {isLongReview
                ? `${reviewText.slice(0, previewLength).trimEnd()}…`
                : reviewText || "No review text"}
            </p>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setReviewDetailsTarget(row);
              }}
              className="mt-1 text-xs font-semibold text-[#2F6BFF] transition hover:text-[#1F1B5F] hover:underline"
            >
              {isLongReview ? "Show more" : "View details"}
            </button>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v || "pending"} dot size="sm" />,
    },
    {
      key: "createdAt",
      label: "Reviewed At",
      sortable: true,
      render: (v) => (
        <span className="whitespace-nowrap text-xs font-medium text-gray-500">
          {v ? formatDateTime12Hour(v, "—") : "—"}
        </span>
      ),
    },
  ];

  const columns = isDetailMode ? detailColumns : summaryColumns;

  const handleBackToProductReviews = () => {
    list.setFilters({});
    list.clearSearch();
    list.clearSelection();
    setSelectedProductId("");
    setReviewDetailsTarget(null);
    navigate("/app/product-reviews");
  };

  return (
    <div>
      <PageHeader
        title="Product Reviews"
        subtitle="Manage and moderate customer product reviews."
        backPath={isDetailMode ? "/app/product-reviews" : undefined}
        onBack={isDetailMode ? handleBackToProductReviews : undefined}
        breadcrumbs={
          !isDetailMode
            ? [
                { label: sellerView ? "Catalog" : "Orders Management" },
                { label: "Product Reviews" },
              ]
            : undefined
        }
        actions={
          !sellerScoped ? (
            <PermissionGuard module="reviews" action={ACTIONS.CREATE} hide>
              <button type="button" onClick={() => setAddOpen(true)}>
                <MdAdd aria-hidden="true" size={18} />
                Add Review
              </button>
            </PermissionGuard>
          ) : null
        }
      />

      {isDetailMode && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
                Selected Product
              </p>
              <h3 className="mt-1 text-lg font-semibold text-gray-800">
                {selectedProductTitle}
              </h3>
            </div>

            <RatingStars
              value={
                detailPayload.summary?.avgRating ||
                selectedSummaryRow?.averageRating ||
                selectedProduct?.rating ||
                0
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Cards
              label="Total Reviews"
              value={Number(
                detailPayload.summary?.count ||
                  selectedSummaryRow?.reviewCount ||
                  total ||
                  0,
              )}
            />
            <Cards
              label="Published"
              value={
                selectedSummaryRow?.publishedCount ||
                selectedStatusCounts.published ||
                0
              }
            />
            <Cards
              label="Pending"
              value={
                selectedSummaryRow?.pendingCount ||
                selectedStatusCounts.pending ||
                0
              }
            />
            <Cards
              label="Hidden"
              value={
                selectedSummaryRow?.hiddenCount ||
                selectedStatusCounts.hidden ||
                0
              }
            />
            <Cards
              label="Rejected"
              value={
                selectedSummaryRow?.rejectedCount ||
                selectedStatusCounts.rejected ||
                0
              }
            />
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        error={error}
        total={total}
        listPage={list}
        onRefresh={fetchReviews}
        searchPlaceholder={
          isDetailMode ? "Search buyers, review text..." : "Search products..."
        }
        emptyMessage={
          isDetailMode
            ? "No reviews found for this product."
            : "No product review summaries found."
        }
        emptyIcon={
          <MdRateReview
            aria-hidden="true"
            size={40}
            className="text-gray-200"
          />
        }
        requiredModule="reviews"
        actions={<ExportButton onClick={handleExport} label="Export" />}
        selectable={isDetailMode}
        selectedKeys={list.selectedKeys}
        onSelectionChange={list.setSelectedKeys}
        rowKey={isDetailMode ? "_id" : "productId"}
        onRowClick={undefined}
        filterBar={
          <FilterBar
            fields={filterFields}
            listPage={list}
            excludeCountKeys={isDetailMode ? ["product"] : []}
            onClear={() => {
              if (isDetailMode && selectedProductId) {
                list.setFilters({ product: selectedProductId });
              } else {
                list.clearFilters();
              }

              list.clearSearch();
            }}
          />
        }
        bulkActionBar={
          isDetailMode ? (
            <BulkActionBar
              selectedCount={list.selectedCount}
              totalCount={items.length}
              onClear={list.clearSelection}
              module="reviews"
              loading={loading || bulkLoading}
              actions={
                sellerScoped
                  ? [
                      {
                        label: "Approve",
                        icon: <MdCheckCircle aria-hidden="true" />,
                        variant: "primary",
                        onClick: () => handleBulkStatus("published"),
                      },
                      {
                        label: "Hide",
                        icon: <MdVisibilityOff aria-hidden="true" />,
                        variant: "warning",
                        onClick: () => handleBulkStatus("hidden"),
                      },
                      {
                        label: "Reject",
                        icon: <MdClose aria-hidden="true" />,
                        variant: "danger",
                        onClick: () => handleBulkStatus("rejected"),
                      },
                    ]
                  : [
                      {
                        label: "Approve",
                        icon: <MdCheckCircle aria-hidden="true" />,
                        action: ACTIONS.EDIT,
                        variant: "primary",
                        onClick: () => handleBulkStatus("published"),
                      },
                      {
                        label: "Reject",
                        icon: <MdClose aria-hidden="true" />,
                        action: ACTIONS.EDIT,
                        variant: "danger",
                        onClick: () => handleBulkStatus("rejected"),
                      },
                      {
                        label: "Hide",
                        icon: <MdVisibilityOff aria-hidden="true" />,
                        action: ACTIONS.EDIT,
                        variant: "warning",
                        onClick: () => handleBulkStatus("hidden"),
                      },
                      {
                        label: "Delete",
                        icon: <MdDelete aria-hidden="true" />,
                        action: ACTIONS.DELETE,
                        variant: "danger",
                        onClick: () => setBulkDeleteConfirm(true),
                      },
                    ]
              }
            />
          ) : null
        }
        rowActions={(row) => {
          if (!isDetailMode) {
            return [
              {
                label: "View Reviews",
                icon: (
                  <MdVisibility
                    aria-hidden="true"
                    size={16}
                    className="text-blue-600"
                  />
                ),
                onClick: () => openProductReviews(row),
              },
            ];
          }

          const actions = [
            {
              label: "Approve Review",
              icon: (
                <MdCheckCircle
                  aria-hidden="true"
                  size={16}
                  className="text-emerald-600"
                />
              ),
              requiredModule: "reviews",
              requiredAction: ACTIONS.EDIT,
              hidden: row.status === "published",
              onClick: () => handleReviewStatus(row, "published"),
            },
            {
              label: "Hide Review",
              icon: (
                <MdVisibilityOff
                  aria-hidden="true"
                  size={16}
                  className="text-amber-600"
                />
              ),
              requiredModule: "reviews",
              requiredAction: ACTIONS.EDIT,
              hidden: row.status === "hidden",
              onClick: () => handleReviewStatus(row, "hidden"),
            },
            {
              label: "Reject Review",
              icon: (
                <MdClose
                  aria-hidden="true"
                  size={16}
                  className="text-red-600"
                />
              ),
              requiredModule: "reviews",
              requiredAction: ACTIONS.EDIT,
              hidden: row.status === "rejected",
              onClick: () => handleReviewStatus(row, "rejected"),
            },
          ];

          if (!sellerScoped) {
            actions.push(
              {
                label: "Edit Review",
                icon: (
                  <MdEdit
                    aria-hidden="true"
                    size={16}
                    className="text-green-600"
                  />
                ),
                requiredModule: "reviews",
                requiredAction: ACTIONS.EDIT,
                onClick: () => setEditTarget(row),
              },
              {
                label: "Delete Review",
                icon: (
                  <MdDelete
                    aria-hidden="true"
                    size={16}
                    className="text-red-600"
                  />
                ),
                requiredModule: "reviews",
                requiredAction: ACTIONS.DELETE,
                onClick: () =>
                  setDeleteConfirm({
                    open: true,
                    review: row,
                  }),
              },
            );
          }

          return actions;
        }}
      />

      <EditProductReview
        isOpen={Boolean(editTarget)}
        onClose={() => {
          setEditTarget(null);
          fetchReviews();
        }}
        reviewData={editTarget}
      />

      <AddProductReview
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={fetchReviews}
      />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        title="Delete Review"
        message="Are you sure you want to delete this review? This cannot be undone."
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() =>
          setDeleteConfirm({
            open: false,
            review: null,
          })
        }
      />

      <ConfirmModal
        isOpen={bulkDeleteConfirm}
        title="Delete Selected Reviews"
        message={`Are you sure you want to delete ${
          list.selectedCount
        } selected review${
          list.selectedCount === 1 ? "" : "s"
        }? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete Selected"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      {/* FIX: Render the modal when Show more is clicked. */}
      <ReviewDetailsModal
        review={reviewDetailsTarget}
        onClose={() => setReviewDetailsTarget(null)}
        onModerate={handleReviewStatus}
      />
    </div>
  );
};

export default ProductReviews;
