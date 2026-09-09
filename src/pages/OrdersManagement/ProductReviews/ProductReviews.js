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

const StarRating = ({ rating = 0 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) =>
      star <= rating ? (
        <MdStar key={star} size={14} className="text-yellow-400" />
      ) : (
        <MdStarBorder key={star} size={14} className="text-gray-300" />
      ),
    )}
    <span className="ml-1 text-xs text-gray-500">{rating}/5</span>
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

const ReviewDetailsDrawer = ({
  review,
  onClose,
  sellerView = false,
  detailReviews = [],
  detailStats = {},
  detailLoading = false,
  onReviewAction,
}) => {
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

  const CLASS_DETAIL_LABEL = "text-xs font-medium uppercase text-gray-400";

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {isSummary ? "Product Review Details" : "Review Details"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <MdClose size={22} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {isSummary ? (
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className={CLASS_DETAIL_LABEL}>Average Rating</p>
                  <div className="mt-1">
                    <StarRating rating={summaryAverage} />
                  </div>
                </div>
                <div>
                  <p className={CLASS_DETAIL_LABEL}>Total Reviews</p>
                  <p className="mt-1 font-medium text-gray-800">
                    {totalReviews}
                  </p>
                </div>
                <div>
                  <p className={CLASS_DETAIL_LABEL}>Published</p>
                  <p className="mt-1 text-gray-800">
                    {review.publishedCount || 0}
                  </p>
                </div>
                <div>
                  <p className={CLASS_DETAIL_LABEL}>Pending</p>
                  <p className="mt-1 text-gray-800">
                    {review.pendingCount || 0}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm">
              <div>
                <p className={CLASS_DETAIL_LABEL}>
                  {sellerView ? "Created By" : "Buyer"}
                </p>
                <p className="mt-1 font-medium text-gray-800">
                  {getCreatedByName(review, sellerView)}
                </p>
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Status</p>
                <div className="mt-1">
                  <StatusBadge
                    status={review.status || "pending"}
                    dot
                    variant={STATUS_COLOR[review.status] || "default"}
                  />
                </div>
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Rating</p>
                <div className="mt-1">
                  <StarRating rating={Number(review.rating) || 0} />
                </div>
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Date</p>
                <p className="mt-1 text-gray-800">{reviewDate}</p>
              </div>
              <div>
                <p className={CLASS_DETAIL_LABEL}>Helpful Votes</p>
                <p className="mt-1 text-gray-800">{review.helpfulVotes || 0}</p>
              </div>
            </div>
          )}

          {isSummary ? (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className={CLASS_DETAIL_LABEL}>Reviews</p>
                {detailLoading && (
                  <span className="text-xs text-gray-500">Loading…</span>
                )}
              </div>
              <div className="space-y-3">
                {detailReviews.length ? (
                  detailReviews.map((row) => (
                    <div
                      key={row._id || row.id}
                      className="rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-gray-700">
                            {getCreatedByName(row, sellerView)}
                          </div>
                          <div className="mt-1">
                            <StarRating rating={Number(row.rating) || 0} />
                          </div>
                        </div>
                        <StatusBadge
                          status={row.status || "pending"}
                          dot
                          variant={STATUS_COLOR[row.status] || "default"}
                        />
                      </div>
                      {row.title && (
                        <div className="mt-2 text-xs font-semibold text-gray-700">
                          {row.title}
                        </div>
                      )}
                      <div className="mt-2 text-xs leading-5 text-gray-600">
                        {row.reviewText || "—"}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
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
                            onClick={() => onReviewAction?.(row, action.value)}
                            className="rounded bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-200"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                    No reviews yet for this product.
                  </div>
                )}
              </div>
            </section>
          ) : (
            <>
              <section>
                <p className={CLASS_DETAIL_LABEL}>Title</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">
                  {review.title || "—"}
                </p>
              </section>

              <section>
                <p className={CLASS_DETAIL_LABEL}>Review</p>
                <p className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-100 bg-white p-3 text-sm leading-6 text-gray-700">
                  {review.reviewText || "—"}
                </p>
              </section>

              {Array.isArray(review.media) && review.media.length ? (
                <section>
                  <p className={CLASS_DETAIL_LABEL}>Review Photos</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {review.media.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded border"
                      >
                        <img
                          src={url}
                          alt="Review media"
                          className="h-24 w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}

              {review.adminReply?.text ? (
                <section className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="text-xs font-medium uppercase text-blue-500">
                    Admin Reply
                  </p>
                  <p className="mt-1 text-sm text-blue-900">
                    {review.adminReply.text}
                  </p>
                </section>
              ) : null}
            </>
          )}
        </div>
      </aside>
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
          <div className="flex items-center gap-2 min-w-0">
            {productImage && (
              <span
                role="img"
                aria-label={productName}
                className="w-9 h-9 rounded border flex-shrink-0 bg-cover bg-center"
                style={{ backgroundImage: cssImageUrl(productImage) }}
              />
            )}
            <div className="min-w-0">
              <span className="block max-w-[180px] truncate text-xs font-medium text-gray-700">
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
      render: (v) => (
        <span className="text-xs font-medium text-gray-700">{v || 0}</span>
      ),
    },
    {
      key: "publishedCount",
      label: "Status",
      render: (v, row) => (
        <div className="flex flex-wrap gap-1 text-[10px] text-gray-600">
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">
            {row.publishedCount || 0} live
          </span>
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">
            {row.pendingCount || 0} pending
          </span>
        </div>
      ),
    },
    {
      key: "latestReviewAt",
      label: "Last Review",
      sortable: true,
      render: (v) => (
        <span className="text-xs text-gray-400">
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
