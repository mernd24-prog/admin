import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdStar, MdStarBorder, MdRateReview, MdEdit, MdDelete, MdReply } from "react-icons/md";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  FilterBar,
  ConfirmModal,
} from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import {
  deleteProductReview,
  getProductReviews,
  updateProductReview,
} from "../../../Redux/adminCoreSlice";
import EditProductReview from "./components/EditProductReview";
import { useListPage } from "../../../hooks/useListPage";

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

const getReviewsPayload = (state = {}) => {
  const payload = state?.productReviewsData?.data?.data || {};
  const list = payload?.list || payload?.items || [];
  return {
    list: Array.isArray(list) ? list : [],
    total: Number(payload?.total || list.length || 0),
  };
};

const ProductReviews = () => {
  const dispatch = useDispatch();
  const reviewsData = useSelector((state) => state.adminCore);
  const list = useListPage({ defaultPageSize: 20, defaultSortKey: "createdAt", defaultSortDir: "desc" });

  const [editTarget, setEditTarget]       = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, review: null });
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [toggleLoadingId, setToggleLoadingId] = useState(null);

  const { list: items, total } = getReviewsPayload(reviewsData);

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
        sortOrder: params.sortDir,
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

  const columns = [
    {
      key: "productId",
      label: "Product",
      render: (v, row) => (
        <div className="flex items-center gap-2 min-w-0">
          {row.media?.[0] && (
            <img
              src={row.media[0]}
              alt="media"
              className="w-9 h-9 object-cover rounded border flex-shrink-0"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          )}
          <span className="text-xs font-mono text-gray-600 truncate max-w-[100px]">{v || "—"}</span>
        </div>
      ),
    },
    {
      key: "buyerId",
      label: "Buyer",
      render: (v) => <span className="text-xs font-mono text-gray-500 truncate max-w-[90px] block">{v || "—"}</span>,
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
          disabled={toggleLoadingId === (row._id || row.id)}
          className="disabled:opacity-50"
          title="Click to toggle published/hidden"
        >
          <StatusBadge status={v || "pending"} dot variant={STATUS_COLOR[v] || "default"} />
        </button>
      ),
    },
    {
      key: "helpfulVotes",
      label: "Helpful",
      render: (v) => (
        <span className="text-xs text-gray-500">{v || 0}</span>
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
      label: "",
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <PermissionGuard module="reviews" action={ACTIONS.EDIT} hide>
            <button
              onClick={() => setEditTarget(row)}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[var(--admin-navy)] transition-colors"
              title="Edit review"
            >
              <MdEdit size={15} />
            </button>
          </PermissionGuard>
          <PermissionGuard module="reviews" action={ACTIONS.DELETE} hide>
            <button
              onClick={() => setDeleteConfirm({ open: true, review: row })}
              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete review"
            >
              <MdDelete size={15} />
            </button>
          </PermissionGuard>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 sm:px-0">
      <PageHeader
        title="Product Reviews"
        subtitle="Manage and moderate customer product reviews"
        breadcrumbs={[
          { label: "Orders Management" },
          { label: "Product Reviews" },
        ]}
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
      />

      <EditProductReview
        isOpen={Boolean(editTarget)}
        onClose={() => { setEditTarget(null); fetchReviews(); }}
        reviewData={editTarget}
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
    </div>
  );
};

export default ProductReviews;
