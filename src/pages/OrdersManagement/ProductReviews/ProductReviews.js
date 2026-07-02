import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { MdAdd, MdStar, MdStarBorder, MdRateReview, MdEdit, MdDelete, MdReply, MdCheckCircle, MdClose, MdVisibilityOff } from "react-icons/md";
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
        sortOrder: params.sortDir,
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
      render: (v, row) => {
        const buyerImage = row.buyerImage || row.buyerAvatarUrl;
        return (
          <div className="flex items-center gap-2 min-w-0">
            {buyerImage ? (
              <img
                src={buyerImage}
                alt={row.buyerName || "Buyer"}
                className="w-8 h-8 rounded-full object-cover border flex-shrink-0"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 text-xs font-semibold grid place-items-center flex-shrink-0">
                {(row.buyerName || "B").charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-xs font-mono text-gray-500 truncate max-w-[90px] block">{v || "—"}</span>
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
      render: (_, row) => isSellerPanelUser ? null : (
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
        actions={!isSellerPanelUser ? (
          <PermissionGuard module="reviews" action={ACTIONS.CREATE} hide>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--admin-navy)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
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
