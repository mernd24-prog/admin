/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
// Components
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import ImageGallery from "../../../components/Atoms/ImageGallery/ImageGallery";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import AddButton from "../../../components/Button/AddButton";

// Redux
import {
  approveDisapprove,
  archiveProduct,
  deleteProducts,
  duplicateProduct,
  enableDisableProductCatalogs,
  getProductById,
  getProductModerationQueue,
  getProductRevisions,
  getProducts,
  getList as getCategoryList,
  restoreProduct,
  reviewProductRevision,
} from "../../../Redux/productSlice";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import Loader from "../../../components/Loader/Loader";
import { toast } from "sonner";
import { getAllSellerList } from "../../../Redux/StoreSlice";
import { transformArray } from "../../../_helpers/globalFunctions";
import ProductReviewModal from "../../../components/Product/ProductReviewModal";
import ProductStatusBadge from "../../../components/Product/ProductStatusBadge";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import {
  DataTable,
  ExportButton,
  PageHeader,
} from "../../../components/Shared";
import ConfirmModal from "../../../components/Shared/ConfirmModal";
import { getPrimaryProductImage, getProductImages } from "../../../_helpers/productMedia";
import { useListPage } from "../../../hooks/useListPage";
import { getSelectedSellerOrganizationId } from "../../../_helpers/sellerOrganizationContext";
// import { GoDesktopDownload } from "react-icons/go";

const INITIAL_FILTERS = {
  search: "",
  product: { value: "All", label: "All" },
  sellerName: { value: "", label: "Search By User Name" },
  category: { value: "", label: "Search By Category" },
  activationStatus: { value: "All", label: "All" },
  approvalStatus: { value: "All", label: "All" },
  dateFrom: "",
  dateTo: "",
};

const DEFAULT_PAGE_SIZE = 10;
const APPROVAL_STATUS_OPTIONS = [
  { value: "All", label: "All" },
  { value: "Draft", label: "Draft" },
  { value: "Pending", label: "Pending" },
  { value: "Change Pending", label: "Change Pending" },
  { value: "Rejected", label: "Rejected" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Archived", label: "Archived" },
];
const ACTIVATION_STATUS_OPTIONS = [
  { value: "All", label: "All" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];
const SELLER_PANEL_ROLES = new Set(["seller", "seller-admin", "seller-sub-admin"]);
const STATUS_TOGGLEABLE = new Set(["active", "inactive"]);
const REVIEWABLE_STATUSES = new Set(["pending_approval"]);

const getProductStatus = (product = {}) =>
  product.status || (product.isDisable ? "inactive" : "active");

const isProductActive = (product = {}) => getProductStatus(product) === "active";

const getNextToggleStatus = (product = {}) =>
  isProductActive(product) ? "inactive" : "active";

const refToLabel = (value) => {
  if (!value) return "N/A";
  if (typeof value === "object") {
    return (
      value?.name ||
      value?.title ||
      value?.label ||
      value?.email ||
      value?._id ||
      "N/A"
    );
  }
  return String(value);
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const hasVariants = (product = {}) =>
  Array.isArray(product?.variants) && product.variants.length > 0;

const getDefaultVariant = (product = {}) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;
  return variants.find((variant) => variant?.isDefault === true) ||
    variants.find((variant) => variant?.status !== "inactive") ||
    variants[0] ||
    null;
};

const getEffectivePrice = (product = {}) => {
  const defaultVariant = getDefaultVariant(product);
  return hasVariants(product)
    ? toNumberOrNull(defaultVariant?.price ?? defaultVariant?.salePrice)
    : toNumberOrNull(product?.price ?? product?.salePrice);
};

const getEffectiveStock = (product = {}) => {
  if (!hasVariants(product)) return toNumberOrNull(product?.stock);
  return product.variants.reduce(
    (total, variant) => total + Number(variant?.stock || 0),
    0,
  );
};

const formatMoney = (value) => {
  const amount = toNumberOrNull(value);
  return amount === null ? "N/A" : `₹${amount.toLocaleString("en-IN")}`;
};

const getInitialFiltersForPath = (pathname = "", search = "") => {
  const queryStatus = new URLSearchParams(search || "").get("status");
  const isArchivedRoute =
    String(pathname || "").includes("/product-catalog/archived") ||
    String(queryStatus || "").toLowerCase() === "archived";

  if (!isArchivedRoute) return INITIAL_FILTERS;

  return {
    ...INITIAL_FILTERS,
    approvalStatus: { value: "Archived", label: "Archived" },
  };
};

const ProductCatalog = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state);
  const navigate = useNavigate();
  const location = useLocation();
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [duplicateConfirmation, setDuplicateConfirmation] = useState({ open: false, product: null });
  const [archiveConfirmation, setArchiveConfirmation] = useState({ open: false, product: null });
  const [statusConfirmation, setStatusConfirmation] = useState({
    open: false,
    type: null,
    product: null,
    productIds: [],
    nextStatus: null,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    variant: "warning",
  });
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedImages, setSelectedImages] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [filters, setFilters] = useState(() => getInitialFiltersForPath(location.pathname, location.search));
  const [appliedFilters, setAppliedFilters] = useState(() => getInitialFiltersForPath(location.pathname, location.search));
  const didMountRouteRef = useRef(false);
  const list = useListPage({
    defaultPageSize: DEFAULT_PAGE_SIZE,
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
  });
  const selectedRow = list.selectedKeys;
  const setSelectedRow = list.setSelectedKeys;
  const handleAddNavigate = () => navigate("/app/product-catalog/form");
  const [userData, setUserData] = useState(null);
  const [reviewModal, setReviewModal] = useState({
    open: false,
    product: null,
    revision: null,
  });
  const isSellerPanelUser = SELLER_PANEL_ROLES.has(userData?.role);

  // console.log("this is store list-->", selector?.product?.getAllStoreListData?.data?.data?.list)
  const sellerListData = transformArray(
    selector?.store?.getAllSellerListData?.data?.data?.list || [],
  );

  const isChangePendingFilter = appliedFilters?.approvalStatus?.value === "Change Pending";
  const approvalStatusToProductStatus = {
    Draft: "draft",
    Pending: "pending_approval",
    Rejected: "rejected",
    Scheduled: "scheduled",
    Archived: "archived",
  };
  const getSortByParam = (sortKey, sortDir) => {
    if (sortKey === "price") {
      return sortDir === "asc" ? "price_asc" : "price_desc";
    }
    return sortKey;
  };

  const buildProductQuery = useCallback(
    (page = list.page) => ({
      page,
      limit: list.pageSize,
      keyWord: appliedFilters?.search,
      includeAllStatuses: true,
      sortBy: getSortByParam(list.sortKey, list.sortDir),
      sortDir: list.sortDir,
      // Seller panel users always filter by their active organization
      ...(isSellerPanelUser ? { organizationId: getSelectedSellerOrganizationId() } : {}),
      ...(appliedFilters?.category?.value
        ? { category: appliedFilters.category.value }
        : {}),
      ...(appliedFilters?.sellerName?.value
        ? { sellerId: appliedFilters.sellerName.value }
        : {}),
      ...(appliedFilters?.dateFrom ? { dateFrom: appliedFilters.dateFrom } : {}),
      ...(appliedFilters?.dateTo ? { dateTo: appliedFilters.dateTo } : {}),
      ...(appliedFilters?.activationStatus?.value === "Active"
        ? { status: "active" }
        : {}),
      ...(appliedFilters?.activationStatus?.value === "Inactive"
        ? { status: "inactive" }
        : {}),
      ...(approvalStatusToProductStatus[appliedFilters?.approvalStatus?.value]
        ? { status: approvalStatusToProductStatus[appliedFilters.approvalStatus.value] }
        : {}),
    }),
    [appliedFilters, isSellerPanelUser, list.page, list.pageSize, list.sortDir, list.sortKey],
  );

  const fetchProductsList = useCallback(async () => {
    setLoading(true);
    try {
      const response = isChangePendingFilter
        ? await dispatch(
          getProductModerationQueue({
            status: "change_pending",
            page: list.page,
            limit: list.pageSize,
            sortBy: getSortByParam(list.sortKey, list.sortDir),
            sortDir: list.sortDir,
            ...(isSellerPanelUser ? { organizationId: getSelectedSellerOrganizationId() } : {}),
            ...(appliedFilters?.category?.value
              ? { category: appliedFilters.category.value }
              : {}),
            ...(appliedFilters?.search ? { q: appliedFilters.search } : {}),
            ...(appliedFilters?.sellerName?.value
              ? { sellerId: appliedFilters.sellerName.value }
              : {}),
            ...(appliedFilters?.dateFrom ? { dateFrom: appliedFilters.dateFrom } : {}),
            ...(appliedFilters?.dateTo ? { dateTo: appliedFilters.dateTo } : {}),
          }),
        )
        : await dispatch(getProducts(buildProductQuery(list.page)));
      setApiRes(response?.payload?.data || { list: [], total: 0 });
    } catch (err) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [
    dispatch,
    appliedFilters,
    isChangePendingFilter,
    buildProductQuery,
    list.page,
    list.pageSize,
  ]);

  useEffect(() => {
    fetchProductsList();
  }, [fetchProductsList]);

  useEffect(() => {
    dispatch(getAllSellerList());
    dispatch(getCategoryList({ tree: true, limit: 100 }))
      .then((res) => {
        const raw = res?.payload?.data?.data || res?.payload?.data || [];
        const flattenTree = (nodes = [], out = [], prefix = '') => {
          nodes.forEach((node) => {
            const name = node?.title || node?.name || node?.categoryKey || '';
            const key = node?.categoryKey || String(node?._id || '');
            if (name && key) out.push({ value: key, label: prefix ? `${prefix} > ${name}` : name });
            const children = node?.children || node?.subCategories || [];
            if (children.length) flattenTree(children, out, prefix ? `${prefix} > ${name}` : name);
          });
          return out;
        };
        const source = Array.isArray(raw) ? raw : raw?.items || raw?.list || [];
        setCategoryOptions([{ value: '', label: 'All Categories' }, ...flattenTree(source)]);
      })
      .catch(() => { });
  }, [dispatch]);

  useEffect(() => {
    const nextFilters = getInitialFiltersForPath(location.pathname, location.search);
    if (!didMountRouteRef.current) {
      didMountRouteRef.current = true;
      setFilters(nextFilters);
      setAppliedFilters(nextFilters);
      return;
    }
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    list.setPage(1);
    list.clearSelection();
  }, [location.pathname, location.search]);

  useEffect(() => {
    const userDataString = sessionStorage.getItem("EcomAdmin");
    if (userDataString) {
      try {
        const parsedData = JSON.parse(userDataString);
        setUserData(parsedData);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const handleImageClick = useCallback((data) => {
    const images = Array.isArray(data) ? data : getProductImages(data);
    if (!images.length) {
      toast.info("No product images available.");
      return;
    }
    setSelectedImages(images);
    setGalleryOpen(true);
  }, []);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    } catch (err) {
      toast.error(err || "Error formatting date:");
      return dateString || "N/A";
    }
  };
  const closeStatusConfirmation = () => {
    if (loading) return;
    setStatusConfirmation({
      open: false,
      type: null,
      product: null,
      productIds: [],
      nextStatus: null,
      title: "",
      message: "",
      confirmLabel: "Confirm",
      variant: "warning",
    });
  };

  const executeToggleStatus = async (product, nextStatus) => {
    const apiPayload = {
      _id: [product?._id],
      status: nextStatus,
      isDisable: nextStatus !== "active",
      reason: "product_status_toggle",
    };
    const response = await dispatch(
      enableDisableProductCatalogs(apiPayload),
    ).unwrap();
    toast.success(
      response?.message ||
      `Product ${nextStatus === "active" ? "enabled" : "disabled"} successfully.`,
    );
  };

  const executeBulkStatus = async (productIds, nextStatus) => {
    const apiPayload = {
      _id: productIds,
      status: nextStatus,
      isDisable: nextStatus !== "active",
      reason: "product_bulk_status_toggle",
    };
    const response = await dispatch(
      enableDisableProductCatalogs(apiPayload),
    ).unwrap();
    toast.success(response?.message || "Products updated successfully.");
    setSelectedRow([]);
  };

  const executeRestoreProduct = async (product) => {
    const response = await dispatch(
      restoreProduct({
        _id: [product?._id],
        status: "draft",
        visibility: "private",
        reason: "product_restored_from_admin",
      }),
    ).unwrap();
    toast.success(response?.message || "Product restored as draft.");
  };

  const handleToggle = async (data) => {
    if (!canToggleProduct(data)) {
      toast.error("This product status cannot be toggled from here.");
      return;
    }
    const nextStatus = getNextToggleStatus(data);
    setStatusConfirmation({
      open: true,
      type: "toggle",
      product: data,
      productIds: [],
      nextStatus,
      title: nextStatus === "active" ? "Activate product?" : "Deactivate product?",
      message: `This will mark "${data?.title || data?.name || "this product"}" as ${nextStatus}.`,
      confirmLabel: nextStatus === "active" ? "Activate" : "Deactivate",
      variant: nextStatus === "active" ? "success" : "warning",
    });
  };

  const hasPendingRevision = (product) =>
    product?.revisionStatus === "change_pending" ||
    Boolean(product?.pendingRevisionId) ||
    Boolean(product?.pendingRevision);
  const canReviewProduct = (product) =>
    !isSellerPanelUser &&
    (REVIEWABLE_STATUSES.has(product?.status) || hasPendingRevision(product));
  const canToggleProduct = (product) => {
    const status = getProductStatus(product);
    if (!STATUS_TOGGLEABLE.has(status)) return false;
    if (isSellerPanelUser && status === "inactive") return false;
    return true;
  };

  const extractRevisionList = (response) => {
    const data = response?.data || response?.payload?.data || {};
    if (Array.isArray(data)) return data;
    return data?.list || data?.items || data?.data?.list || data?.data?.items || [];
  };

  const handleApproveToggle = async (data) => {
    if (isSellerPanelUser) {
      toast.error("Product approval and revision review are admin-only actions.");
      return;
    }
    if (!hasPendingRevision(data)) {
      setReviewModal({ open: true, product: data, revision: null });
      return;
    }

    setLoading(true);
    try {
      const detailResponse = await dispatch(getProductById({ id: data?._id })).unwrap();
      const product = detailResponse?.data || data;
      let revision = product?.pendingRevision || null;

      if (!revision) {
        const revisionsResponse = await dispatch(
          getProductRevisions({ productId: data?._id, status: "pending", size: 1 }),
        ).unwrap();
        revision = extractRevisionList(revisionsResponse)[0] || null;
      }

      if (!revision) {
        toast.error("Pending product revision was not found.");
        return;
      }

      setReviewModal({ open: true, product, revision });
    } catch (error) {
      toast.error(error?.message || error || "Failed to load product revision");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (decision, rejectionReason, checklist, notes) => {
    if (isSellerPanelUser) {
      throw new Error("Product approval and revision review are admin-only actions.");
    }
    const product = reviewModal.product;
    setLoading(true);
    try {
      const response = reviewModal.revision
        ? await dispatch(
          reviewProductRevision({
            productId: product?._id,
            revisionId: reviewModal.revision?._id || reviewModal.revision?.id,
            status: decision,
            rejectionReason: rejectionReason || null,
            notes: notes || null,
            checklist,
          }),
        ).unwrap()
        : await dispatch(
          approveDisapprove({
            id: product?._id,
            status: decision,
            rejectionReason: rejectionReason || null,
            notes: notes || null,
            checklist,
          }),
        ).unwrap();
      const labels = {
        active: "approved",
        inactive: "deactivated",
        rejected: "rejected",
      };
      const subject = reviewModal.revision ? "Product revision" : "Product";
      toast.success(
        response?.message ||
        `${subject} ${labels[decision] || "updated"} successfully.`,
      );
      fetchProductsList();
    } catch (error) {
      throw new Error(error?.message || error || "Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  function handleDelete(data) {
    setShowDeleteConfirmation(true);
    setProductToDelete(data);
  }

  async function handleDeleteSubmit() {
    try {
      const apiPayload = { _id: [productToDelete?._id] };
      setLoading(true);
      const res = await dispatch(deleteProducts(apiPayload)).unwrap();
      toast.success(res?.message || "Product deleted successfully!");
      setLoading(false);
    } catch (error) {
      toast.error(error?.message || "Delete failed.");
      setLoading(false);
    } finally {
      setShowDeleteConfirmation(false);
      setProductToDelete(null);
      setLoading(false);
      fetchProductsList();
    }
  }

  const handleRestoreProduct = async (product) => {
    setStatusConfirmation({
      open: true,
      type: "restore",
      product,
      productIds: [],
      nextStatus: "draft",
      title: "Restore product?",
      message: `This will restore "${product?.title || product?.name || "this product"}" as a private draft for review before it can go live again.`,
      confirmLabel: "Restore",
      variant: "success",
    });
  };

  const handleDuplicateProduct = (product) => {
    setDuplicateConfirmation({ open: true, product });
  };

  const handleDuplicateSubmit = async () => {
    const product = duplicateConfirmation.product;
    try {
      setLoading(true);
      const res = await dispatch(
        duplicateProduct({ _id: product?._id }),
      ).unwrap();
      const newId = res?.data?.data?._id || res?.data?._id;
      toast.success(res?.message || "Product duplicated successfully.");
      setDuplicateConfirmation({ open: false, product: null });
      fetchProductsList();
      if (newId) navigate(`/app/product-catalog/form/${newId}`);
    } catch (err) {
      toast.error(err?.message || "Failed to duplicate product.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveProduct = (product) => {
    setArchiveConfirmation({ open: true, product });
  };

  const handleArchiveSubmit = async () => {
    const product = archiveConfirmation.product;
    try {
      setLoading(true);
      const res = await dispatch(
        archiveProduct({ _id: product?._id, reason: "admin_archived" }),
      ).unwrap();
      toast.success(res?.message || "Product archived successfully.");
      setArchiveConfirmation({ open: false, product: null });
      fetchProductsList();
    } catch (err) {
      toast.error(err?.message || "Failed to archive product.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusConfirm = async () => {
    try {
      setLoading(true);
      if (statusConfirmation.type === "toggle") {
        await executeToggleStatus(statusConfirmation.product, statusConfirmation.nextStatus);
      } else if (statusConfirmation.type === "bulk_status") {
        await executeBulkStatus(statusConfirmation.productIds, statusConfirmation.nextStatus);
      } else if (statusConfirmation.type === "restore") {
        await executeRestoreProduct(statusConfirmation.product);
      }
      fetchProductsList();
    } catch (error) {
      toast.error(error?.message || error || "Action failed.");
    } finally {
      setLoading(false);
      setStatusConfirmation({
        open: false,
        type: null,
        product: null,
        productIds: [],
        nextStatus: null,
        title: "",
        message: "",
        confirmLabel: "Confirm",
        variant: "warning",
      });
    }
  };

  const handleSearchApply = () => {
    list.clearSelection();
    setAppliedFilters(filters);
    list.setPage(1);
  };

  // Apply selections and dates immediately, while lightly debouncing text input.
  useEffect(() => {
    const delay = filters.search !== appliedFilters.search ? 300 : 0;
    const timer = setTimeout(() => {
      list.clearSelection();
      setAppliedFilters(filters);
      list.setPage(1);
    }, delay);

    return () => clearTimeout(timer);
  }, [filters]);

  const clearFilters = () => {
    const nextFilters = getInitialFiltersForPath(location.pathname);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    list.setPage(1);
    list.clearSelection();
  };
  const handleBulkAction = async (action) => {
    if (isSellerPanelUser && action === "Active") {
      toast.error("Seller products must be approved by admin before activation.");
      return;
    }
    if (action === "Active" || action === "Inactive") {
      const nextStatus = action === "Active" ? "active" : "inactive";
      setStatusConfirmation({
        open: true,
        type: "bulk_status",
        product: null,
        productIds: [...selectedRow],
        nextStatus,
        title: nextStatus === "active" ? "Activate selected products?" : "Deactivate selected products?",
        message: `This will mark ${selectedRow.length} selected product${selectedRow.length === 1 ? "" : "s"} as ${nextStatus}.`,
        confirmLabel: nextStatus === "active" ? "Activate" : "Deactivate",
        variant: nextStatus === "active" ? "success" : "warning",
      });
    }
  };

  const handleEditProduct = (id) => {
    navigate(`/app/product-catalog/form/${id}`);
  };

  const productColumns = useMemo(
    () => [
      {
        key: "image",
        label: "Image",
        render: (_, product) => {
          const productImages = getProductImages(product);
          const primaryImage = getPrimaryProductImage(product);

          return (
            <div className="relative flex min-w-[96px] items-center gap-2">
              {primaryImage ? (
                <button
                  type="button"
                  className="h-10 w-10 overflow-hidden rounded border border-gray-200 bg-gray-50"
                  onClick={() => handleImageClick(productImages)}
                  title="View product images"
                >
                  <img
                    src={primaryImage}
                    alt={product?.title || product?.name || "Product"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
                  No
                </span>
              )}
              <button
                type="button"
                className={`text-sm ${productImages.length ? "text-blue-500 hover:underline" : "cursor-not-allowed text-gray-400"}`}
                onClick={() => handleImageClick(productImages)}
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
        render: (_, product) => (
          <span className="block max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap capitalize">
            {product?.title || product?.name || "N/A"}
          </span>
        ),
      },
      {
        key: "sku",
        label: "SKU",
        sortable: true,
        render: (value) => (
          <span className="block max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap">
            {value || "N/A"}
          </span>
        ),
      },
      {
        key: "brand",
        label: "Brand",
        render: (value) => (
          <span className="block max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">
            {refToLabel(value)}
          </span>
        ),
      },
      {
        key: "price",
        label: "Price",
        sortable: true,
        render: (_, product) => formatMoney(getEffectivePrice(product)),
      },
      {
        key: "stock",
        label: "Stock",
        sortable: true,
        render: (_, product) => {
          const stock = getEffectiveStock(product);
          return stock === null ? "N/A" : stock;
        },
      },
      {
        key: "_deal",
        label: "Deal",
        render: (_, product) =>
          product?.metadata?.isDealProduct ? (
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {product.metadata.dealBadge || "Deal"}
            </span>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          ),
      },
      {
        key: "_completeness",
        label: "Complete",
        render: (_, product) => {
          const checks = [
            !!product?.title,
            !!product?.description,
            !!product?.category,
            Number(getEffectivePrice(product) || 0) > 0,
            (product?.images || []).length >= 1,
            !!product?.sku,
            Number(getEffectiveStock(product) ?? product?.availableStock ?? 0) >= 0,
            !!product?.hsnCode,
          ];
          const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
          const color = score >= 80 ? "#15803d" : score >= 50 ? "#b45309" : "#dc2626";
          const bg = score >= 80 ? "#f0fdf4" : score >= 50 ? "#fffbeb" : "#fef2f2";
          return (
            <div title={`${score}% complete`} className="flex items-center gap-1.5">
              <div className="relative h-1.5 w-14 overflow-hidden rounded-full bg-gray-200">
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
              </div>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ color, backgroundColor: bg }}>
                {score}%
              </span>
            </div>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        render: (_, product) => (
          <ProductStatusBadge
            status={product?.status}
            revisionStatus={product?.revisionStatus}
          />
        ),
      },
      {
        key: "createdAt",
        label: "Created On",
        sortable: true,
        render: (value) => formatDate(value),
      },
      {
        key: "active",
        label: "Active",
        render: (_, product) =>
          canToggleProduct(product) ? (
            <ToggleButton
              isToggle={isProductActive(product)}
              handleClick={() => handleToggle(product)}
              requiredModule="products"
            />
          ) : (
            <span className="text-xs text-gray-400">-</span>
          ),
      },
      {
        key: "actions",
        label: "Action",
        headerClassName: "min-w-[360px]",
        cellClassName: "min-w-[360px]",
        render: (_, product) => (
          <div className="admin-table-actions-nowrap">
            <ActionButtons
              onEdit={() => handleEditProduct(product?._id)}
              viewButton={true}
              onViewClick={() =>
                navigate(`/app/product-catalog/view/${product?._id}`)
              }
              showLinkButton={false}
              onDelete={() => handleDelete(product)}
              showDeleteButton={product?.status !== "archived"}
              requiredModule="products"
            />
            {product?.status === "archived" && (
              <PermissionGuard module="products" action="restore" hide>
                <button
                  className="admin-table-action-btn"
                  onClick={() => handleRestoreProduct(product)}
                >
                  Restore
                </button>
              </PermissionGuard>
            )}
            {product?.status !== "archived" && (
              <PermissionGuard module="products" action="delete" hide>
                <button
                  className="admin-table-action-btn"
                  onClick={() => handleArchiveProduct(product)}
                  title="Archive product"
                >
                  Archive
                </button>
              </PermissionGuard>
            )}
            <PermissionGuard module="products" action="create" hide>
              <button
                className="admin-table-action-btn"
                onClick={() => handleDuplicateProduct(product)}
                title="Duplicate product"
              >
                Duplicate
              </button>
            </PermissionGuard>
            {canReviewProduct(product) && (
              <PermissionGuard module="products" action="approve" hide>
                <button
                  className="admin-table-action-btn"
                  onClick={() => handleApproveToggle(product)}
                >
                  {hasPendingRevision(product) ? "Review Revision" : "Review"}
                </button>
              </PermissionGuard>
            )}
          </div>
        ),
      },
    ],
    [
      canReviewProduct,
      canToggleProduct,
      formatDate,
      handleApproveToggle,
      handleArchiveProduct,
      handleDelete,
      handleDuplicateProduct,
      handleEditProduct,
      handleImageClick,
      handleRestoreProduct,
      handleToggle,
      hasPendingRevision,
      navigate,
    ],
  );

  return (
    <div className="overflow-x-auto overflow-y-auto">
      <Loader loading={loading} />
      <PageHeader
        title="Product Catalog"
        breadcrumbs={[
          { label: "Catalog Management" },
          { label: "Product Catalog" },
        ]}
        actions={
          <>
          <ExportButton
            data={apiRes?.list || []}
            filename="products"
            requiredModule="products"
          />
          <AddButton onClick={handleAddNavigate} requiredModule="products" />
          </>
        }
      />
      <div className="overflow-hidden rounded-xl border border-[var(--admin-line)] bg-white shadow-sm">
        <section className="border-b border-[var(--admin-line)] p-4">
          <SearchComponent
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            filters={filters}
            setFilters={setFilters}
            isSearchShow={true}
            isActivationStatus={true}
            isApprovalOptions={true}
            isCategory={true}
            categoryOptions={categoryOptions}
            dateFrom={true}
            dateTo={true}
            isUser={true}
            approvalOptions={APPROVAL_STATUS_OPTIONS}
            activationStatusOptions={ACTIVATION_STATUS_OPTIONS}
            userOptions={sellerListData}
            applyFilters={handleSearchApply}
            handleSearchRemove={clearFilters}
            isActionButton={true}
            isStatusAction={true}
            handleAction={handleBulkAction}
            requiredModule="products"
            isSearchDown={false}
            defaultSearchOpen={true}
            exclusiveStatusFilters={true}
            filterGridClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-7"
            compactFilterBar={true}
            hideFilterActions={true}
            largeSearchInput={true}
          />
        </section>
        <section>
          <DataTable
            columns={productColumns}
            data={apiRes?.list || []}
            loading={loading}
            totalCount={apiRes?.total || 0}
            page={list.page}
            pageSize={list.pageSize}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
            onSort={list.setSort}
            sortKey={list.sortKey}
            sortDir={list.sortDir}
            selectable
            selectedKeys={selectedRow}
            onSelectionChange={setSelectedRow}
            rowKey={(product) => product?._id || product?.id}
            emptyText="No products found."
            requiredModule="products"
            cardClassName="overflow-hidden rounded-none border-0 shadow-none"
            tableContainerClassName="hide-scrollbar max-h-[calc(100vh-360px)] overflow-x-auto overflow-y-auto pb-2"
            tableClassName="min-w-[1880px]"
          />
        </section>
      </div>

      <ConfirmModal
        open={showDeleteConfirmation}
        onClose={() => {
          setShowDeleteConfirmation(false);
          setProductToDelete(null);
        }}
        title="Delete product?"
        message={`This will archive "${productToDelete?.title || productToDelete?.name || "this product"}" and remove it from the normal catalog list.`}
        variant="danger"
        confirmLabel="Delete"
        loading={loading && Boolean(productToDelete)}
        onConfirm={handleDeleteSubmit}
      />

      <ConfirmModal
        open={statusConfirmation.open}
        onClose={closeStatusConfirmation}
        title={statusConfirmation.title}
        message={statusConfirmation.message}
        variant={statusConfirmation.variant}
        confirmLabel={statusConfirmation.confirmLabel}
        loading={loading && statusConfirmation.open}
        onConfirm={handleStatusConfirm}
      />

      <ConfirmModal
        open={duplicateConfirmation.open}
        onClose={() => setDuplicateConfirmation({ open: false, product: null })}
        title="Duplicate product?"
        message={`This will create a draft copy of "${duplicateConfirmation.product?.title || "this product"}". You can edit it before publishing.`}
        variant="info"
        confirmLabel="Duplicate"
        loading={loading && duplicateConfirmation.open}
        onConfirm={handleDuplicateSubmit}
      />

      <ConfirmModal
        open={archiveConfirmation.open}
        onClose={() => setArchiveConfirmation({ open: false, product: null })}
        title="Archive product?"
        message={`This will archive "${archiveConfirmation.product?.title || "this product"}" and remove it from the active catalog. You can restore it later.`}
        variant="danger"
        confirmLabel="Archive"
        loading={loading && archiveConfirmation.open}
        onConfirm={handleArchiveSubmit}
      />

      <ImageGallery
        images={selectedImages}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />

      <ProductReviewModal
        isOpen={reviewModal.open}
        product={reviewModal.product}
        revision={reviewModal.revision}
        onClose={() => setReviewModal({ open: false, product: null, revision: null })}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
};

export default ProductCatalog;
