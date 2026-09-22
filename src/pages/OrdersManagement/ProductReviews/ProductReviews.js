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
} from "react-icons/md";
import {
  PageHeader,
  DataTable,
  ConfirmModal,
  BulkActionBar,
  FilterBar,
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

const getProductOptions = async (dispatch, search = "", sellerId = "") => {
  try {
    const response = await dispatch(
      getProducts({
        page: 1,
        limit: 20,
        q: search || undefined,
        sellerId: sellerId || undefined,
      }),
    ).unwrap();

    const list = Array.isArray(response?.data?.products)
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

    return list.map((product) => ({
      value: product._id || product.id,
      label:
        product.title ||
        product.name ||
        product.productName ||
        product.sku ||
        "Unnamed product",
    }));
  } catch {
    return [];
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
  row.productId || row.product?.id || row._id || row.id || "";

const getMetaTotal = (payload = {}, source = {}, list = []) =>
  Number(
    source?.total ||
      payload?.total ||
      payload?.meta?.total ||
      payload?.meta?.pagination?.total ||
      list.length ||
      0,
  );

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

const getProductReviewDetailPayload = (state = {}) => {
  const payload = state?.productReviewSummaryReviewsData?.data || {};

  const source =
    payload?.data && !payload?.list && !payload?.items ? payload.data : payload;

  const list = Array.isArray(source?.list)
    ? source.list
    : Array.isArray(source?.items)
      ? source.items
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  return {
    list: Array.isArray(list) ? list : [],
    total: getMetaTotal(payload, source, list),
    summary:
      payload?.meta?.summary || source?.summary || payload?.summary || {},
    product:
      payload?.meta?.product || source?.product || payload?.product || null,
  };
};

const RatingStars = ({ value = 0, showValue = true }) => {
  const rating = Number(value || 0);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) =>
          star <= Math.round(rating) ? (
            <MdStar key={star} className="text-orange-500" size={17} />
          ) : (
            <MdStarBorder key={star} className="text-gray-300" size={17} />
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

const StatusPill = ({ status = "pending" }) => {
  const normalized = String(status || "pending").toLowerCase();

  const styles = {
    published: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    hidden: "border-slate-200 bg-slate-50 text-slate-600",
    rejected: "border-red-200 bg-red-50 text-red-600",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
        styles[normalized] || styles.pending
      }`}
    >
      {normalized}
    </span>
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

  const [sellerOptions, setSellerOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);

  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  const isSellerPanelUser = SELLER_PANEL_ROLES.has(userData?.role);

  const sellerView = isSellerPanel();

  const showSellerFilter = !isSellerPanelUser && !sellerView;

  const sellerScoped = isSellerPanelUser || sellerView;

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

      {
        key: "product",
        type: "select",
        label: "Product",
        width: "w-52",
        options: productOptions,
        placeholder: "All Products",
      },

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
    ],
    [productOptions, showSellerFilter],
  );

  const summaryPayload = getProductReviewSummaryPayload(reviewsData);

  const detailPayload = getProductReviewDetailPayload(reviewsData);

  const isDetailMode = Boolean(selectedProductId);

  const items = isDetailMode ? detailPayload.list : summaryPayload.list;

  const total = isDetailMode ? detailPayload.total : summaryPayload.total;

  const selectedSummaryRow =
    selectedProductId && summaryPayload.list.length
      ? summaryPayload.list.find(
          (row) =>
            String(row.productId || row._id || row.id) ===
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

  const selectedStatusCounts = detailPayload.list.reduce(
    (counts, review) => ({
      ...counts,
      [review.status || "pending"]:
        (counts[review.status || "pending"] || 0) + 1,
    }),
    {},
  );

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

      sellerId:
        !isSellerPanelUser && !sellerView ? sellerIdFromFilter : undefined,

      sortBy: params.sortBy,
      sortDir: params.sortDir,
      sellerScope: sellerScoped || undefined,
    };

    let action;

    if (selectedProductId) {
      // Detail mode is only used when opening reviews
      // from a product row.
      action = getProductReviewSummaryReviews({
        ...requestParams,
        productId: selectedProductId,
      });
    } else {
      // Main Product Reviews page:
      // Product filter should filter the summary list
      // instead of opening detail mode.
      action = getProductReviewSummaries({
        ...requestParams,
        productId: productIdFromFilter,
      });
    }

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

    const loadSellerOptions = async () => {
      if (isSellerPanelUser || sellerView) {
        if (mounted) {
          setSellerOptions([]);
        }

        return;
      }

      try {
        const result = await dropdownApi.getSellers({
          limit: 100,
        });

        if (mounted) {
          setSellerOptions(Array.isArray(result) ? result : []);
        }
      } catch {
        if (mounted) {
          setSellerOptions([]);
        }
      }
    };

    loadSellerOptions();

    return () => {
      mounted = false;
    };
  }, [isSellerPanelUser, sellerView]);

  useEffect(() => {
    let mounted = true;

    const loadProductOptions = async () => {
      try {
        const response = await dispatch(
          getProducts({
            page: 1,
            limit: 200,
            sellerId: selectedSellerId || undefined,
          }),
        ).unwrap();

        const list = Array.isArray(response?.data?.products)
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

        const mapped = list.map((product) => ({
          value: product._id || product.id,
          label:
            product.title ||
            product.name ||
            product.productName ||
            product.sku ||
            "Unnamed product",
        }));

        if (mounted) {
          setProductOptions(mapped);
        }
      } catch {
        if (mounted) {
          setProductOptions([]);
        }
      }
    };

    loadProductOptions();

    return () => {
      mounted = false;
    };
  }, [dispatch, isSellerPanelUser, sellerView, selectedSellerId]);

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
    const reviewId = deleteConfirm.review?._id || deleteConfirm.review?.id;

    if (!reviewId) return;

    try {
      await dispatch(
        deleteProductReview({
          reviewId,
        }),
      ).unwrap();

      toast.success("Review deleted");

      setDeleteConfirm({
        open: false,
        review: null,
      });

      fetchReviews();
    } catch (err) {
      toast.error(err?.message || "Failed to delete review");
    }
  };

  const handleBulkDelete = async () => {
    if (sellerScoped || !list.selectedKeys.length) {
      return;
    }

    setBulkLoading(true);

    try {
      await Promise.all(
        list.selectedKeys.map((reviewId) =>
          dispatch(
            deleteProductReview({
              reviewId,
            }),
          ).unwrap(),
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

  const navigate = useNavigate();

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

      fetchReviews();
    } catch (err) {
      toast.error(err?.message || "Failed to update review");
    } finally {
      setBulkLoading(false);
    }
  };

  const openProductReviews = (row) => {
    const productId = getProductId(row);

    if (!productId) return;

    list.setPage(1);

    list.setFilter("product", String(productId));

    setSelectedProductId(String(productId));
  };

  const summaryColumns = [
    {
      key: "productId",
      label: "Product",

      render: (v, row) => {
        const productImage =
          row.productImage || row.product?.image || row.image;

        const productName = getProductName(row) || "Product";

        return (
          <div className="flex min-w-0 items-center gap-2.5">
            {productImage && (
              <span
                role="img"
                aria-label={productName}
                className="h-9 w-9 flex-shrink-0 rounded-md border border-gray-200 bg-cover bg-center"
                style={{
                  backgroundImage: cssImageUrl(productImage),
                }}
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

      render: (v, row) => (
        <div className="flex flex-wrap items-center gap-1.5 whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />

            <span className="font-bold">{row.publishedCount || 0}</span>

            <span>Live</span>
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />

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

      render: (v, row) => (
        <div className="min-w-[260px] max-w-[460px]">
          {row.title && (
            <p className="truncate text-xs font-semibold text-gray-800">
              {row.title}
            </p>
          )}

          <p className="line-clamp-2 whitespace-normal text-xs leading-5 text-gray-600">
            {v || row.comment || "No review text"}
          </p>
        </div>
      ),
    },

    {
      key: "status",
      label: "Status",

      render: (v) => <StatusPill status={v} />,
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
                {
                  label: sellerView ? "Catalog" : "Orders Management",
                },
                {
                  label: "Product Reviews",
                },
              ]
            : undefined
        }
        actions={
          !sellerScoped ? (
            <PermissionGuard module="reviews" action={ACTIONS.CREATE} hide>
              <button onClick={() => setAddOpen(true)}>
                <MdAdd size={18} />
                Add Review
              </button>
            </PermissionGuard>
          ) : null
        }
      />

      {isDetailMode && (
        <div>
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

            {/* Global Cards component */}
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
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        error={error}
        total={total}
        listPage={list}
        searchPlaceholder={
          isDetailMode
            ? "Search buyers, review text, orders..."
            : "Search products..."
        }
        emptyMessage={
          isDetailMode
            ? "No reviews found for this product."
            : "No product review summaries found."
        }
        emptyIcon={<MdRateReview size={40} className="text-gray-200" />}
        requiredModule="reviews"
        exportConfig={{
          filename: isDetailMode
            ? "product-review-details"
            : "product-review-summaries",
          columns,
        }}
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
                list.setFilters({
                  product: selectedProductId,
                });
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
                        icon: <MdCheckCircle />,
                        variant: "primary",
                        onClick: () => handleBulkStatus("published"),
                      },
                      {
                        label: "Hide",
                        icon: <MdVisibilityOff />,
                        variant: "warning",
                        onClick: () => handleBulkStatus("hidden"),
                      },
                      {
                        label: "Reject",
                        icon: <MdClose />,
                        variant: "danger",
                        onClick: () => handleBulkStatus("rejected"),
                      },
                    ]
                  : [
                      {
                        label: "Approve",
                        icon: <MdCheckCircle />,
                        action: ACTIONS.EDIT,
                        variant: "primary",
                        onClick: () => handleBulkStatus("published"),
                      },
                      {
                        label: "Reject",
                        icon: <MdClose />,
                        action: ACTIONS.EDIT,
                        variant: "danger",
                        onClick: () => handleBulkStatus("rejected"),
                      },
                      {
                        label: "Hide",
                        icon: <MdVisibilityOff />,
                        action: ACTIONS.EDIT,
                        variant: "warning",
                        onClick: () => handleBulkStatus("hidden"),
                      },
                      {
                        label: "Delete",
                        icon: <MdDelete />,
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
          {
            /* =====================================================
              SUMMARY MODE ACTION
             ===================================================== */
          }
          if (!isDetailMode) {
            return [
              {
                label: "View Reviews",
                icon: <MdVisibility size={16} className="text-blue-600" />,
                onClick: () => openProductReviews(row),
              },
            ];
          }

          {
            /* =====================================================
              DETAIL MODE ACTIONS
             ===================================================== */
          }
          const actions = [
            {
              label: "Approve Review",
              icon: <MdCheckCircle size={16} className="text-emerald-600" />,
              requiredModule: "reviews",
              requiredAction: ACTIONS.EDIT,
              hidden: row.status === "published",
              onClick: () => handleReviewStatus(row, "published"),
            },

            {
              label: "Hide Review",
              icon: <MdVisibilityOff size={16} className="text-amber-600" />,
              requiredModule: "reviews",
              requiredAction: ACTIONS.EDIT,
              hidden: row.status === "hidden",
              onClick: () => handleReviewStatus(row, "hidden"),
            },

            {
              label: "Reject Review",
              icon: <MdClose size={16} className="text-red-600" />,
              requiredModule: "reviews",
              requiredAction: ACTIONS.EDIT,
              hidden: row.status === "rejected",
              onClick: () => handleReviewStatus(row, "rejected"),
            },
          ];

          {
            /* =====================================================
              ADMIN ONLY EDIT + DELETE
             ===================================================== */
          }
          if (!sellerScoped) {
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

      {/* =========================================================
          EDIT REVIEW
         ========================================================= */}
      <EditProductReview
        isOpen={Boolean(editTarget)}
        onClose={() => {
          setEditTarget(null);
          fetchReviews();
        }}
        reviewData={editTarget}
      />

      {/* =========================================================
          ADD REVIEW
         ========================================================= */}
      <AddProductReview
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={fetchReviews}
      />

      {/* =========================================================
          SINGLE DELETE CONFIRMATION
         ========================================================= */}
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

      {/* =========================================================
          BULK DELETE CONFIRMATION
         ========================================================= */}
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
    </div>
  );
};

export default ProductReviews;
