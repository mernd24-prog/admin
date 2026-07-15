import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdAdd, MdStar, MdStarBorder, MdRateReview, MdEdit, MdDelete, MdReply, MdCheckCircle, MdClose, MdVisibility, MdVisibilityOff } from "react-icons/md";
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
  getProductReviews,
  updateProductReview,
  bulkUpdateProductReviews,
} from "../../../Redux/adminCoreSlice";
import EditProductReview from "./components/EditProductReview";
import AddProductReview from "./components/AddProductReview";
import { useListPage } from "../../../hooks/useListPage";

const SELLER_PANEL_ROLES = new Set(["seller", "seller-admin", "seller-sub-admin"]);

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
      { value: "pending",   label: "Pending" },
      { value: "hidden",    label: "Hidden" },
      { value: "rejected",  label: "Rejected" },
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
      star <= rating
        ? <MdStar key={star} size={14} className="text-yellow-400" />
        : <MdStarBorder key={star} size={14} className="text-gray-300" />,
    )}
    <span className="ml-1 text-xs text-gray-500">{rating}/5</span>
  </div>
);

const STATUS_COLOR = {
  published: "success",
  pending:   "warning",
  hidden:    "default",
  rejected:  "danger",
};

const isLikelyId = (value = "") => /^[a-f\d]{24}$/i.test(String(value || ""));
const isLikelyEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const getBuyerName = (row = {}) => {
  const names = [
    row.buyerName,
    row.buyer?.displayName,
    row.buyer?.fullName,
    row.buyer?.name,
    row.buyer?.email || "",
  ];
  const name = names.find((value) => value && !isLikelyId(value) && !isLikelyEmail(value));
  if (name) return name;
  return "Verified Buyer";
};

const getProductName = (row = {}) =>
  row.productName ||
  row.product?.title ||
  row.product?.name ||
  row.product?.sku ||
  row.title ||
  "";

const initials = (value = "") =>
  String(value || "B")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "B";

const cssImageUrl = (value) => `url("${String(value || "").replace(/"/g, "%22")}")`;

const getReviewsPayload = (state = {}) => {
  const payload = state?.productReviewsData?.data?.data || {};
  const list = payload?.list || payload?.items || [];
  return {
    list: Array.isArray(list) ? list : [],
    total: Number(payload?.total || list.length || 0),
  };
};

const ReviewDetailsDrawer = ({ review, onClose }) => {
  if (!review) return null;
  const productName = getProductName(review) || "Product not found";
  const buyerName = getBuyerName(review);
  const reviewDate = review.createdAt
    ? new Date(review.createdAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Review Details</h2>
            <p className="mt-0.5 text-xs text-gray-500">{productName}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800" aria-label="Close">
            <MdClose size={22} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-gray-400">Buyer</p>
              <p className="mt-1 font-medium text-gray-800">{buyerName}</p>
              {review.buyer?.email ? <p className="text-xs text-gray-500">{review.buyer.email}</p> : null}
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-400">Status</p>
              <div className="mt-1">
                <StatusBadge status={review.status || "pending"} dot variant={STATUS_COLOR[review.status] || "default"} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-400">Rating</p>
              <div className="mt-1"><StarRating rating={Number(review.rating) || 0} /></div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-400">Date</p>
              <p className="mt-1 text-gray-800">{reviewDate}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-400">Order ID</p>
              <p className="mt-1 font-mono text-xs text-gray-700">{review.orderId || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-400">Helpful Votes</p>
              <p className="mt-1 text-gray-800">{review.helpfulVotes || 0}</p>
            </div>
          </div>

          <section>
            <p className="text-xs font-medium uppercase text-gray-400">Title</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{review.title || "—"}</p>
          </section>

          <section>
            <p className="text-xs font-medium uppercase text-gray-400">Review</p>
            <p className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-100 bg-white p-3 text-sm leading-6 text-gray-700">
              {review.reviewText || "—"}
            </p>
          </section>

          {Array.isArray(review.media) && review.media.length ? (
            <section>
              <p className="text-xs font-medium uppercase text-gray-400">Review Photos</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {review.media.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded border">
                    <img src={url} alt="Review media" className="h-24 w-full object-cover" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {review.adminReply?.text ? (
            <section className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs font-medium uppercase text-blue-500">Admin Reply</p>
              <p className="mt-1 text-sm text-blue-900">{review.adminReply.text}</p>
            </section>
          ) : null}
        </div>
      </aside>
    </>
  );
};

const ProductReviews = () => {
  const dispatch = useDispatch();
  const reviewsData = useSelector((state) => state.adminCore);
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "createdAt", defaultSortDir: "desc" });

  const [editTarget, setEditTarget]       = useState(null);
  const [viewTarget, setViewTarget]       = useState(null);
  const [addOpen, setAddOpen]             = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, review: null });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [toggleLoadingId, setToggleLoadingId] = useState(null);
  const [bulkLoading, setBulkLoading]     = useState(false);
  const [userData, setUserData]           = useState(() => getSessionUserData());

  const { list: items, total } = getReviewsPayload(reviewsData);
  const isSellerPanelUser = SELLER_PANEL_ROLES.has(userData?.role);

  useEffect(() => {
    setUserData(getSessionUserData());
  }, []);

  const fetchReviews = () => {
    const params = list.toQueryParams();
    setLoading(true);
    setError("");
    dispatch(
      getProductReviews({
        page:      params.page,
        limit:     params.limit,
        search:    params.search || undefined,
        status:    params.status || undefined,
        rating:    params.rating ? Number(params.rating) : undefined,
        productId: params.productId || undefined,
        buyerId:   params.buyerId || undefined,
        sortBy:    params.sortBy,
        sortDir:   params.sortDir,
        sellerScope: isSellerPanelUser || undefined,
      }),
    )
      .unwrap()
      .catch((err) => {
        const msg = err?.message || "Failed to load reviews";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.page, list.pageSize, list.search, list.sortKey, list.sortDir, list.filters]);

  const handleToggleStatus = async (review) => {
    if (isSellerPanelUser) return;
    const reviewId = review._id || review.id;
    const current = review.status || "pending";
    const newStatus = current === "published" ? "hidden" : "published";
    setToggleLoadingId(reviewId);
    try {
      await dispatch(updateProductReview({ reviewId, status: newStatus })).unwrap();
      toast.success("Review status updated");
      fetchReviews();
    } catch (err) {
      toast.error(err?.message || "Failed to update review status");
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleBulkStatus = async (status) => {
    if (isSellerPanelUser || !list.selectedKeys.length) return;
    setBulkLoading(true);
    try {
      await dispatch(
        bulkUpdateProductReviews({
          reviewIds: list.selectedKeys,
          status,
        }),
      ).unwrap();
      toast.success("Selected reviews updated");
      list.clearSelection();
      fetchReviews();
    } catch (err) {
      toast.error(err?.message || "Failed to update selected reviews");
    } finally {
      setBulkLoading(false);
    }
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
        const productImage = row.productImage || row.product?.image || row.media?.[0];
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
      key: "buyerId",
      label: "Buyer",
      render: (v, row) => {
        const buyerImage = row.buyerImage || row.buyerAvatarUrl;
        const buyerName = getBuyerName(row);
        return (
          <div className="flex items-center gap-2 min-w-0">
            {buyerImage ? (
              <span
                role="img"
                aria-label={buyerName}
                className="w-8 h-8 rounded-full border flex-shrink-0 bg-cover bg-center"
                style={{ backgroundImage: cssImageUrl(buyerImage) }}
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 text-xs font-semibold grid place-items-center flex-shrink-0">
                {initials(buyerName)}
              </span>
            )}
            <div className="min-w-0">
              <span className="block max-w-[150px] truncate text-xs font-medium text-gray-700">
                {buyerName}
              </span>
              {row.buyer?.email && row.buyer.email !== buyerName && (
                <span className="block max-w-[150px] truncate text-[10px] text-gray-400">
                  {row.buyer.email}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      render: (v) => <StarRating rating={Number(v) || 0} />,
    },
    {
      key: "reviewText",
      label: "Review",
      render: (v, row) => (
        <div className="max-w-[220px]">
          {row.title && (
            <div className="text-xs font-semibold text-gray-700 truncate">{row.title}</div>
          )}
          <div className="text-xs text-gray-500 line-clamp-2">{v || "—"}</div>
          {row.adminReply?.text && (
            <div className="mt-1 flex items-start gap-1 text-xs text-[var(--admin-navy)]">
              <MdReply size={12} className="mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{row.adminReply.text}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v, row) => (
        <button
          onClick={() => handleToggleStatus(row)}
          disabled={isSellerPanelUser || toggleLoadingId === (row._id || row.id)}
          className="disabled:opacity-50"
          title={isSellerPanelUser ? "Review status" : "Click to toggle published/hidden"}
        >
          <StatusBadge status={v || "pending"} dot variant={STATUS_COLOR[v] || "default"} />
        </button>
      ),
    },
   {
  key: "helpfulVotes",
  label: "Likes",
  render: (v) => (
    <span className="flex items-center gap-1 text-xs text-gray-500">
      👍 {v || 0}
    </span>
  ),
},
    {
      key: "createdAt",
      label: "Date",
      sortable: true,
      render: (v) => (
        <span className="text-xs text-gray-400">
          {v ? new Date(v).toLocaleDateString("en-GB") : "—"}
        </span>
      ),
    },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-start">
          <button
            onClick={() => setViewTarget(row)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[var(--admin-navy)] transition-colors"
            title="View review"
            aria-label="View review"
          >
            <MdVisibility size={15} />
          </button>
          {!isSellerPanelUser && (
            <>
              <PermissionGuard module="reviews" action={ACTIONS.EDIT} hide>
                <button
                  onClick={() => setEditTarget(row)}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[var(--admin-navy)] transition-colors"
                  title="Edit review"
                  aria-label="Edit review"
                >
                  <MdEdit size={15} />
                </button>
              </PermissionGuard>
              <PermissionGuard module="reviews" action={ACTIONS.DELETE} hide>
                <button
                  onClick={() => setDeleteConfirm({ open: true, review: row })}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete review"
                  aria-label="Delete review"
                >
                  <MdDelete size={15} />
                </button>
              </PermissionGuard>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Product Reviews"
        subtitle="Manage and moderate customer product reviews"
        breadcrumbs={[
          { label: "Orders Management" },
          { label: "Product Reviews" },
        ]}
        actions={!isSellerPanelUser ? (
          <PermissionGuard module="reviews" action={ACTIONS.CREATE} hide>
            <button
              onClick={() => setAddOpen(true)}

            >
              <MdAdd size={18} />
              Add Review
            </button>
          </PermissionGuard>
        ) : null}
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
        selectable={!isSellerPanelUser}
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
        bulkActionBar={!isSellerPanelUser ? (
          <BulkActionBar
            selectedCount={list.selectedCount}
            totalCount={items.length}
            onClear={list.clearSelection}
            onSelectAll={() => list.setSelectedKeys(items.map((row) => row._id || row.id).filter(Boolean))}
            module="reviews"
            loading={loading || bulkLoading}
            actions={[
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
            ]}
          />
        ) : null}
      />

      <EditProductReview
        isOpen={Boolean(editTarget)}
        onClose={() => { setEditTarget(null); fetchReviews(); }}
        reviewData={editTarget}
      />

      <ReviewDetailsDrawer
        review={viewTarget}
        onClose={() => setViewTarget(null)}
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
