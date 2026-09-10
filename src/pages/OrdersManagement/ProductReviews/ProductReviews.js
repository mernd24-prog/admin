import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import {
  MdAdd,
  MdStar,
  MdStarBorder,
  MdRateReview,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdClose,
  MdVisibility,
  MdVisibilityOff,
} from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  ConfirmModal,
  BulkActionBar,
  ShowMoreText,
  ImageViewer,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import {
  deleteProductReview,
  getProductReviewSummaries,
  getProductReviewSummaryReviews,
  updateProductReview,
  bulkUpdateProductReviews,
} from "../../../Redux/adminCoreSlice";
import EditProductReview from "./components/EditProductReview";
import AddProductReview from "./components/AddProductReview";
import { useListPage } from "../../../hooks/useListPage";
import { isSellerPanel } from "../../../_helpers/panelConfig";
import { formatDateTime12Hour } from "../../../utils/formatters";

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

const FILTER_FIELDS = [
  {
    key: "status",
    type: "select",
    label: "Status",
    width: "w-36",
    options: [
      { value: "published", label: "Published" },
      { value: "pending", label: "Pending" },
      { value: "hidden", label: "Hidden" },
      { value: "rejected", label: "Rejected" },
    ],
  },
  {
    key: "rating",
    type: "select",
    label: "Rating",
    width: "w-32",
    options: [
      { value: "5", label: "5 Stars" },
      { value: "4", label: "4 Stars" },
      { value: "3", label: "3 Stars" },
      { value: "2", label: "2 Stars" },
      { value: "1", label: "1 Star" },
    ],
  },
];

const StarRating = ({ rating = 0, size = 20 }) => (
  <div className="flex items-center gap-0.5 text-orange-500">
    {[1, 2, 3, 4, 5].map((star) =>
      star <= Math.round(rating) ? (
        <MdStar key={star} size={size} />
      ) : (
        <MdStarBorder key={star} size={size} className="text-gray-300" />
      ),
    )}
  </div>
);

const STATUS_COLOR = {
  published: "success",
  pending: "warning",
  hidden: "default",
  rejected: "danger",
};

const isLikelyId = (value = "") => /^[a-f\d]{24}$/i.test(String(value || ""));
const isLikelyEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const getBuyerName = (row = {}) => {
  const names = [
    row.buyerName,
    row.buyer?.displayName,
    row.buyer?.fullName,
    row.buyer?.name,
    row.buyer?.email || "",
  ];
  const name = names.find(
    (value) => value && !isLikelyId(value) && !isLikelyEmail(value),
  );
  if (name) return name;
  return "Verified Buyer";
};

const isPlatformCreatedReview = (row = {}) =>
  String(row.orderId || "").startsWith("admin:") ||
  String(row.orderItemId || "").startsWith("admin:");

const getCreatedByName = (row = {}, sellerView = false) => {
  if (sellerView && isPlatformCreatedReview(row)) return "Platform";
  return getBuyerName(row);
};

const getProductName = (row = {}) =>
  row.productName ||
  row.product?.title ||
  row.product?.name ||
  row.product?.sku ||
  row.title ||
  "";

// const initials = (value = "") =>
//   String(value || "B")
//     .trim()
//     .split(/\s+/)
//     .slice(0, 2)
//     .map((part) => part.charAt(0).toUpperCase())
//     .join("") || "B";

const cssImageUrl = (value) =>
  `url("${String(value || "").replace(/"/g, "%22")}")`;

const getProductReviewSummaryPayload = (state = {}) => {
  const payload = state?.productReviewSummariesData?.data || {};
  const source =
    payload?.data && !payload?.list && !payload?.items ? payload.data : payload;
  const list = Array.isArray(source?.list)
    ? source.list
    : Array.isArray(source?.items)
      ? source.items
      : [];

  return {
    list: Array.isArray(list) ? list : [],
    total: Number(source?.total || payload?.total || list.length || 0),
    summary: source?.summary || payload?.summary || {},
  };
};

const ReviewSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2].map((item) => (
      <div
        key={item}
        className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-xs"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 shrink-0" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-gray-200" />
              <div className="h-3 w-20 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-5 w-20 rounded-full bg-gray-200 shrink-0" />
        </div>
        <div className="h-3.5 w-3/4 rounded bg-gray-200" />
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-3 w-5/6 rounded bg-gray-200" />
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-16 w-16 rounded-lg bg-gray-200" />
          <div className="h-16 w-16 rounded-lg bg-gray-200" />
        </div>
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <div className="h-7 w-20 rounded-md bg-gray-200" />
          <div className="h-7 w-16 rounded-md bg-gray-200" />
        </div>
      </div>
    ))}
  </div>
);

const ReviewCard = ({ row, sellerView, onReviewAction, onOpenPhoto }) => {
  const buyerName = getCreatedByName(row, sellerView);
  const buyerAvatar =
    row.buyerImage || row.buyerAvatarUrl || row.buyer?.avatarUrl || "";
  const initials = (buyerName || "CU")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const reviewDate = row.createdAt ? formatDateTime12Hour(row.createdAt) : "—";
  const mediaList = Array.isArray(row.media) ? row.media.filter(Boolean) : [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3.5 shadow-xs transition-colors hover:border-gray-300">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {buyerAvatar ? (
            <img
              src={buyerAvatar}
              alt={buyerName}
              className="h-10 w-10 rounded-full object-cover border border-gray-200 shrink-0"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-xs font-bold text-amber-900 border border-amber-300/60 shrink-0">
              {initials}
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 leading-tight">
              {buyerName}
            </h4>
            <div className="mt-1 flex items-center gap-2">
              <StarRating rating={Number(row.rating) || 0} />
              <span className="text-[11px] text-gray-300">•</span>
              <span className="text-[11px] font-medium text-gray-500">
                {reviewDate}
              </span>
            </div>
          </div>
        </div>
        <StatusBadge status={row.status || "pending"} dot size="xs" />
      </div>

      {/* Review Title */}
      {row.title && (
        <h5 className="text-sm font-semibold text-gray-900 leading-snug">
          <ShowMoreText
            text={row.title}
            limit={80}
            moreLabel="See more"
            lessLabel="See less"
            textClassName="text-sm font-semibold text-gray-900"
          />
        </h5>
      )}

      {/* Review Text */}
      {row.reviewText && (
        <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">
          <ShowMoreText
            text={row.reviewText}
            limit={150}
            moreLabel="See more"
            lessLabel="See less"
            textClassName="text-xs sm:text-sm text-gray-600 leading-relaxed"
          />
        </div>
      )}

      {/* Media Photos Gallery */}
      {mediaList.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Photos ({mediaList.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {mediaList.map((imgUrl, mIdx) => (
              <button
                type="button"
                key={mIdx}
                onClick={() => onOpenPhoto?.(mediaList, mIdx)}
                className="group relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-all hover:scale-105 hover:shadow-sm cursor-pointer focus:outline-none"
              >
                <img
                  src={imgUrl}
                  alt={`Review photo ${mIdx + 1}`}
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
        {row.status !== "published" && (
          <button
            type="button"
            onClick={() => onReviewAction?.(row, "published")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
          >
            <MdCheckCircle size={14} />
            Publish
          </button>
        )}
        {row.status !== "hidden" && (
          <button
            type="button"
            onClick={() => onReviewAction?.(row, "hidden")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <MdVisibilityOff size={14} />
            Hide
          </button>
        )}
        {row.status !== "rejected" && (
          <button
            type="button"
            onClick={() => onReviewAction?.(row, "rejected")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
          >
            <MdClose size={14} />
            Reject
          </button>
        )}
      </div>
    </div>
  );
};

const ReviewDetailsDrawer = ({
  review,
  onClose,
  sellerView = false,
  detailReviews = [],
  detailStats = {},
  detailLoading = false,
  onReviewAction,
}) => {
  const [lightboxData, setLightboxData] = useState({
    open: false,
    images: [],
    index: 0,
  });

  if (!review) return null;

  const productName = getProductName(review) || "Product not found";
  const reviewDate = formatDateTime12Hour(review.createdAt, "—");
  const isSummary =
    !review.reviewText &&
    !review.buyerName &&
    !review.buyerId &&
    !review.status;
  const summaryAverage = Number(
    review.averageRating || detailStats.avgRating || 0,
  );
  const totalReviews = Number(
    review.reviewCount || detailStats.count || detailReviews.length || 0,
  );

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isSummary ? "Product Review Details" : "Review Details"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 font-medium line-clamp-1">
              {productName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <MdClose size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {isSummary ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Avg Rating
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-gray-900">
                    {Number(summaryAverage).toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    / 5.0
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Total Reviews
                </p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {totalReviews}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Published
                </p>
                <p className="mt-1 text-xl font-bold text-emerald-700">
                  {review.publishedCount || 0}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Pending
                </p>
                <p className="mt-1 text-xl font-bold text-amber-700">
                  {review.pendingCount || 0}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  {sellerView ? "Created By" : "Buyer"}
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {getCreatedByName(review, sellerView)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge
                    status={review.status || "pending"}
                    dot
                    size="xs"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Rating
                </p>
                <div className="mt-1">
                  <StarRating rating={Number(review.rating) || 0} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Date
                </p>
                <p className="mt-1 font-medium text-gray-700">{reviewDate}</p>
              </div>
            </div>
          )}

          {isSummary ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Reviews{" "}
                  {detailReviews.length > 0 ? `(${detailReviews.length})` : ""}
                </h3>
                {detailLoading && (
                  <span className="text-xs font-semibold text-amber-600 animate-pulse">
                    Updating…
                  </span>
                )}
              </div>

              {detailLoading ? (
                <ReviewSkeleton />
              ) : detailReviews.length > 0 ? (
                <div className="space-y-3">
                  {detailReviews.map((row) => (
                    <ReviewCard
                      key={row._id || row.id}
                      row={row}
                      sellerView={sellerView}
                      onReviewAction={onReviewAction}
                      onOpenPhoto={(images, index) =>
                        setLightboxData({ open: true, images, index })
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center text-sm text-gray-500">
                  No reviews yet for this product.
                </div>
              )}
            </section>
          ) : (
            <>
              {review.title && (
                <section>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Title
                  </p>
                  <h4 className="mt-1 text-sm font-semibold text-gray-900 leading-snug">
                    <ShowMoreText
                      text={review.title}
                      limit={100}
                      moreLabel="See more"
                      lessLabel="See less"
                      textClassName="text-sm font-semibold text-gray-900"
                    />
                  </h4>
                </section>
              )}

              {review.reviewText && (
                <section>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Review
                  </p>
                  <div className="mt-2 whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700">
                    <ShowMoreText
                      text={review.reviewText}
                      limit={250}
                      moreLabel="See more"
                      lessLabel="See less"
                    />
                  </div>
                </section>
              )}

              {Array.isArray(review.media) && review.media.length ? (
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Review Photos ({review.media.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {review.media.map((url, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() =>
                          setLightboxData({
                            open: true,
                            images: review.media,
                            index: idx,
                          })
                        }
                        className="group relative h-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-all hover:scale-105 hover:shadow-md cursor-pointer focus:outline-none"
                      >
                        <img
                          src={url}
                          alt="Review media"
                          className="h-full w-full object-cover transition-transform group-hover:scale-110"
                        />
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {review.adminReply?.text ? (
                <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Admin Reply
                  </p>
                  <p className="mt-1.5 text-sm text-blue-950 leading-relaxed">
                    {review.adminReply.text}
                  </p>
                </section>
              ) : null}
            </>
          )}
        </div>
      </aside>

      {/* Global Image Viewer Lightbox Modal */}
      {lightboxData.open && (
        <ImageViewer
          images={lightboxData.images}
          initialIndex={lightboxData.index}
          onClose={() => setLightboxData({ open: false, images: [], index: 0 })}
        />
      )}
    </>
  );
};

const ProductReviews = () => {
  const dispatch = useDispatch();
  const reviewsData = useSelector((state) => state.adminCore);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });

  const [editTarget, setEditTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    review: null,
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toggleLoadingId, setToggleLoadingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [detailReviews, setDetailReviews] = useState([]);
  const [detailStats, setDetailStats] = useState({
    avgRating: 0,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userData, setUserData] = useState(() => getSessionUserData());

  const { list: items, total } = getProductReviewSummaryPayload(reviewsData);
  const isSellerPanelUser = SELLER_PANEL_ROLES.has(userData?.role);
  const sellerView = isSellerPanel();

  useEffect(() => {
    setUserData(getSessionUserData());
  }, []);

  const fetchReviews = () => {
    const params = list.toQueryParams();
    setLoading(true);
    setError("");
    dispatch(
      getProductReviewSummaries({
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        status: params.status || undefined,
        rating: params.rating ? Number(params.rating) : undefined,
        productId: params.productId || undefined,
        sortBy: params.sortBy,
        sortDir: params.sortDir,
        sellerScope: isSellerPanelUser || undefined,
      }),
    )
      .unwrap()
      .catch((err) => {
        const msg = err?.message || "Failed to load product reviews";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  };

  const fetchReviewDetails = async (productId) => {
    if (!productId) return;
    setDetailLoading(true);
    try {
      const response = await dispatch(
        getProductReviewSummaryReviews({
          productId,
          page: 1,
          limit: 100,
          sellerScope: isSellerPanelUser || undefined,
        }),
      ).unwrap();

      const payload = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response?.list)
            ? response.list
            : Array.isArray(response?.data?.items)
              ? response.data.items
              : Array.isArray(response?.data?.list)
                ? response.data.list
                : [];

      const meta = response?.meta || response?.data?.meta || {};
      const summary =
        meta?.summary ||
        response?.summary ||
        response?.data?.summary ||
        response?.stats ||
        response?.data?.stats ||
        {};
      const list = Array.isArray(payload) ? payload : [];

      setDetailReviews(list);
      setDetailStats({
        avgRating: Number(summary.avgRating || 0),
        count: Number(summary.count || list.length || 0),
        distribution: summary.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
    } catch (err) {
      toast.error(err?.message || "Failed to load review details");
      setDetailReviews([]);
    } finally {
      setDetailLoading(false);
    }
  };

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
  ]);

  const updateReviewStatus = async (review, status, successMessage) => {
    const reviewId = review._id || review.id;
    if (!reviewId) return;
    setToggleLoadingId(reviewId);
    try {
      await dispatch(
        updateProductReview({
          reviewId,
          status,
          sellerScope: isSellerPanelUser,
        }),
      ).unwrap();
      toast.success(successMessage || "Review status updated");
      fetchReviews();
    } catch (err) {
      toast.error(err?.message || "Failed to update review status");
    } finally {
      setToggleLoadingId(null);
    }
  };

  // const handleToggleStatus = async (review) => {
  //   const current = review.status || "pending";
  //   const newStatus = current === "published" ? "hidden" : "published";
  //   const message =
  //     newStatus === "published" ? "Review approved" : "Review hidden";
  //   await updateReviewStatus(review, newStatus, message);
  // };

  const handleBulkStatus = async (status) => {
    if (!list.selectedKeys.length) return;
    setBulkLoading(true);
    try {
      await dispatch(
        bulkUpdateProductReviews({
          reviewIds: list.selectedKeys,
          status,
          sellerScope: isSellerPanelUser,
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

  const handleViewProductReviews = async (row) => {
    const productId = row?.productId || row?._id || row?.id;
    if (!productId) return;
    setSelectedProduct(row);
    setViewTarget(row);
    await fetchReviewDetails(productId);
  };

  const handleReviewAction = async (review, newStatus) => {
    await updateReviewStatus(
      review,
      newStatus,
      newStatus === "published" ? "Review approved" : "Review hidden",
    );
    const productId =
      review.productId ||
      viewTarget?.productId ||
      viewTarget?._id ||
      viewTarget?.id;
    if (productId) await fetchReviewDetails(productId);
  };

  const handleDelete = async () => {
    const reviewId = deleteConfirm.review?._id || deleteConfirm.review?.id;
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
    if (isSellerPanelUser || !list.selectedKeys.length) return;
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

  const columns = [
    {
      key: "productId",
      label: "Product",
      render: (v, row) => {
        const productImage =
          row.productImage || row.product?.image || row.image;
        const productName = getProductName(row) || "Product";
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            {productImage && (
              <span
                role="img"
                aria-label={productName}
                className="w-9 h-9 rounded-md border border-gray-200 flex-shrink-0 bg-cover bg-center"
                style={{ backgroundImage: cssImageUrl(productImage) }}
              />
            )}
            <div className="min-w-0">
              <span
                className="block max-w-[200px] truncate text-xs font-semibold text-gray-800"
                title={productName}
              >
                {productName || "Product not found"}
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
      render: (v) => <StarRating rating={Number(v) || 0} />,
    },
    {
      key: "reviewCount",
      label: "Reviews",
      headerClassName: "text-center",
      cellClassName: "text-center",
      render: (v) => (
        <span className="inline-flex items-center justify-center font-semibold text-xs text-gray-800">
          {v || 0}
        </span>
      ),
    },
    {
      key: "publishedCount",
      label: "Status",
      render: (v, row) => (
        <div className="flex items-center gap-1.5 flex-wrap whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-bold">{row.publishedCount || 0}</span>
            <span>Live</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="font-bold">{row.pendingCount || 0}</span>
            <span>Pending</span>
          </span>
        </div>
      ),
    },
    {
      key: "latestReviewAt",
      label: "Last Review",
      sortable: true,
      render: (v) => (
        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
          {v ? formatDateTime12Hour(v, "—") : "—"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Product Reviews"
        subtitle="Manage and moderate customer product reviews."
        breadcrumbs={[
          { label: sellerView ? "Catalog" : "Orders Management" },
          { label: "Product Reviews" },
        ]}
        actions={
          !isSellerPanelUser ? (
            <PermissionGuard module="reviews" action={ACTIONS.CREATE} hide>
              <button onClick={() => setAddOpen(true)}>
                <MdAdd size={18} />
                Add Review
              </button>
            </PermissionGuard>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        error={error}
        totalCount={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onSearch={list.setSearch}
        onSort={list.setSort}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        searchPlaceholder="Search reviews, products, buyers…"
        emptyText="No product reviews found."
        emptyIcon={<MdRateReview size={40} className="text-gray-200" />}
        requiredModule="reviews"
        exportConfig={{ filename: "product-reviews", columns }}
        selectable
        selectedKeys={list.selectedKeys}
        onSelectionChange={list.setSelectedKeys}
        rowKey="_id"
        filterBar={
          <FilterBar
            filters={FILTER_FIELDS}
            values={list.filters}
            onChange={list.setFilter}
            onClear={list.clearFilters}
            loading={loading}
            activeCount={list.activeFilterCount}
          />
        }
        bulkActionBar={
          <BulkActionBar
            selectedCount={list.selectedCount}
            totalCount={items.length}
            onClear={list.clearSelection}
            onSelectAll={() =>
              list.setSelectedKeys(
                items.map((row) => row._id || row.id).filter(Boolean),
              )
            }
            module="reviews"
            loading={loading || bulkLoading}
            actions={
              isSellerPanelUser
                ? [
                    {
                      label: "Approve Selected",
                      icon: <MdCheckCircle />,
                      variant: "primary",
                      onClick: () => handleBulkStatus("published"),
                    },
                    {
                      label: "Hide Selected",
                      icon: <MdVisibilityOff />,
                      variant: "warning",
                      onClick: () => handleBulkStatus("hidden"),
                    },
                  ]
                : [
                    {
                      label: "Approve Selected",
                      icon: <MdCheckCircle />,
                      action: ACTIONS.EDIT,
                      variant: "primary",
                      onClick: () => handleBulkStatus("published"),
                    },
                    {
                      label: "Reject Selected",
                      icon: <MdClose />,
                      action: ACTIONS.EDIT,
                      variant: "danger",
                      onClick: () => handleBulkStatus("rejected"),
                    },
                    {
                      label: "Hide Selected",
                      icon: <MdVisibilityOff />,
                      action: ACTIONS.EDIT,
                      variant: "warning",
                      onClick: () => handleBulkStatus("hidden"),
                    },
                    {
                      label: "Delete Selected",
                      icon: <MdDelete />,
                      action: ACTIONS.DELETE,
                      variant: "danger",
                      onClick: () => setBulkDeleteConfirm(true),
                    },
                  ]
            }
          />
        }
        rowActions={(row) => {
          const actions = [
            {
              label: "View Details",
              icon: <MdVisibility size={16} className="text-blue-600" />,
              onClick: () => handleViewProductReviews(row),
            },
          ];

          if (!isSellerPanelUser) {
            actions.push(
              {
                label: "Edit Review",
                icon: <MdEdit size={16} className="text-green-600" />,
                requiredModule: "reviews",
                requiredAction: ACTIONS.EDIT,
                onClick: () => setEditTarget(row),
              },
              {
                label: "Delete Review",
                icon: <MdDelete size={16} className="text-red-600" />,
                requiredModule: "reviews",
                requiredAction: ACTIONS.DELETE,
                onClick: () => setDeleteConfirm({ open: true, review: row }),
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

      {selectedProduct && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
                Product
              </p>
              <h3 className="mt-1 text-lg font-semibold text-gray-800">
                {getProductName(selectedProduct)}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedProduct(null);
                setViewTarget(null);
                setDetailReviews([]);
                setDetailStats({
                  avgRating: 0,
                  count: 0,
                  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                });
              }}
              className="rounded border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Close details
            </button>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
                Average Rating
              </p>
              <div className="mt-2">
                <StarRating
                  rating={Number(
                    selectedProduct.averageRating || detailStats.avgRating || 0,
                  )}
                />
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
                Total Reviews
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-800">
                {Number(
                  selectedProduct.reviewCount ||
                    detailStats.count ||
                    detailReviews.length ||
                    0,
                )}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
                Published
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-800">
                {selectedProduct.publishedCount || 0}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
                Pending
              </p>
              <p className="mt-2 text-lg font-semibold text-gray-800">
                {selectedProduct.pendingCount || 0}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {detailLoading ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
                Loading reviews…
              </div>
            ) : detailReviews.length ? (
              detailReviews.map((row) => (
                <div
                  key={row._id || row.id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {getCreatedByName(row, sellerView)}
                        </span>
                        <StatusBadge
                          status={row.status || "pending"}
                          dot
                          variant={STATUS_COLOR[row.status] || "default"}
                        />
                      </div>
                      <div className="mt-2">
                        <StarRating rating={Number(row.rating) || 0} />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDateTime12Hour(row.createdAt, "—")}
                    </div>
                  </div>

                  {row.title && (
                    <div className="mt-3 text-sm font-semibold text-gray-800">
                      {row.title}
                    </div>
                  )}
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {row.reviewText || "—"}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(row.status === "published"
                      ? [{ label: "Hide", value: "hidden" }]
                      : [
                          { label: "Publish", value: "published" },
                          { label: "Hide", value: "hidden" },
                        ]
                    ).map((action) => (
                      <button
                        key={action.value}
                        type="button"
                        onClick={() => handleReviewAction(row, action.value)}
                        className="rounded bg-gray-100 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-200"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
                No reviews yet for this product.
              </div>
            )}
          </div>
        </div>
      )}

      <ReviewDetailsDrawer
        review={viewTarget}
        onClose={() => {
          setViewTarget(null);
          setSelectedProduct(null);
          setDetailReviews([]);
          setDetailStats({
            avgRating: 0,
            count: 0,
            distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          });
        }}
        sellerView={sellerView}
        detailReviews={detailReviews}
        detailStats={detailStats}
        detailLoading={detailLoading}
        onReviewAction={handleReviewAction}
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
        onCancel={() => setDeleteConfirm({ open: false, review: null })}
      />

      <ConfirmModal
        isOpen={bulkDeleteConfirm}
        title="Delete Selected Reviews"
        message={`Are you sure you want to delete ${list.selectedCount} selected review${list.selectedCount === 1 ? "" : "s"}? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete Selected"
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />
    </div>
  );
};

export default ProductReviews;
