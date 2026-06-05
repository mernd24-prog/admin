/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
// Components
import DeletePopup from "../../../components/Atoms/DeletePopup.js/DeletePopup";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import ImageGallery from "../../../components/Atoms/ImageGallery/ImageGallery";
import TableData from "../../../components/Atoms/TableData/TableData";
import SearchComponent from "../../../components/Atoms/New Table/NewTable";
import AddButton from "../../../components/Button/AddButton";

// Redux
import {
  approveDisapprove,
  deleteProducts,
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
import Pagination from "../../../components/Pagination/Pagination";
import CustomCheckbox from "../../../components/Atoms/Checkbox/Checkbox";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import { getAllSellerList } from "../../../Redux/StoreSlice";
import {
  transformArray,
  uploadCsvFile,
} from "../../../_helpers/globalFunctions";
import UploadFile from "../../../components/Atoms/UploadFile/UploadFile";
import Button from "../../../components/Atoms/buttons/button";
import ProductReviewModal from "../../../components/Product/ProductReviewModal";
import ProductStatusBadge from "../../../components/Product/ProductStatusBadge";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ExportButton } from "../../../components/Shared";
import { getShopList } from "../../../Redux/StoreSlice";
// import { GoDesktopDownload } from "react-icons/go";

const INITIAL_FILTERS = {
  search: "",
  product: { value: "All", label: "All" },
  sellerName: { value: "", label: "Search By User Name" },
  category: { value: "", label: "Search By Category" },
  activationStatus: { value: "Does not matter", label: "Does not matter" },
  approvalStatus: { value: "Does not matter", label: "Does not matter" },
  productType: { value: "Select", label: "Select" },
  dateFrom: "",
  dateTo: "",
};

const size = 10;
const APPROVAL_STATUS_OPTIONS = [
  { value: "Does not matter", label: "Does not matter" },
  { value: "Draft", label: "Draft" },
  { value: "Pending", label: "Pending" },
  { value: "Change Pending", label: "Change Pending" },
  { value: "Rejected", label: "Rejected" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Archived", label: "Archived" },
];
const ACTIVATION_STATUS_OPTIONS = [
  { value: "Does not matter", label: "Does not matter" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];
const BULK_IMPORT_AVAILABLE = false;
const SELLER_PANEL_ROLES = new Set(["seller", "seller-admin", "seller-sub-admin"]);
const STATUS_TOGGLEABLE = new Set(["active", "inactive"]);
const REVIEWABLE_STATUSES = new Set(["pending_approval"]);

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

const getInitialFiltersForPath = (pathname = "") => {
  const path = String(pathname || "").toLowerCase();
  if (path.includes("draft-products")) {
    return { ...INITIAL_FILTERS, approvalStatus: { value: "Draft", label: "Draft" } };
  }
  if (path.includes("change-pending-products")) {
    return { ...INITIAL_FILTERS, approvalStatus: { value: "Change Pending", label: "Change Pending" } };
  }
  if (path.includes("pending-products")) {
    return { ...INITIAL_FILTERS, approvalStatus: { value: "Pending", label: "Pending" } };
  }
  if (path.includes("rejected-products")) {
    return { ...INITIAL_FILTERS, approvalStatus: { value: "Rejected", label: "Rejected" } };
  }
  return INITIAL_FILTERS;
};

const ProductCatalog = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state);
  const navigate = useNavigate();
  const location = useLocation();
  const [apiRes, setApiRes] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [selectedImages, setSelectedImages] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState([]);
  const [productToDelete, setProductToDelete] = useState(null);
  const [filters, setFilters] = useState(() => getInitialFiltersForPath(location.pathname));
  const handleAddNavigate = () => navigate("/app/product-catalog/form");
  const allRowIds = useMemo(
    () => apiRes.list.map((product) => product._id),
    [apiRes.list],
  );
  const [pageNo, setPageNo] = useState(1);
  const [userData, setUserData] = useState(null);
  const [isBulkUpload, setIsBulkUpload] = useState(false);
  const [bulkUploadData, setBulkUploadData] = useState({
    seller_id: "",
    store_id: "",
    file: "",
  });
  const [isLoading, setIsLoading] = useState(false);
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
  const storeList = transformArray(
    selector?.store?.getShopListData?.data?.list || [],
  );

  const isChangePendingFilter = filters?.approvalStatus?.value === "Change Pending";
  const approvalStatusToProductStatus = {
    Draft: "draft",
    Pending: "pending_approval",
    Rejected: "rejected",
    Scheduled: "scheduled",
    Archived: "archived",
  };

  const buildProductQuery = useCallback(
    (page = pageNo) => ({
      page,
      size: size,
      keyWord: filters?.search,
      includeAllStatuses: true,
      ...(filters?.category?.value
        ? { category: filters.category.value }
        : {}),
      ...(filters?.sellerName?.value
        ? { sellerId: filters.sellerName.value }
        : {}),
      ...(filters?.activationStatus?.value === "Active"
        ? { status: "active" }
        : {}),
      ...(filters?.activationStatus?.value === "Inactive"
        ? { status: "inactive" }
        : {}),
      ...(approvalStatusToProductStatus[filters?.approvalStatus?.value]
        ? { status: approvalStatusToProductStatus[filters.approvalStatus.value] }
        : {}),
    }),
    [filters, pageNo],
  );

  const fetchProductsList = useCallback(async () => {
    setLoading(true);
    try {
      const response = isChangePendingFilter
        ? await dispatch(
          getProductModerationQueue({
            status: "change_pending",
            page: pageNo,
            size,
            ...(filters?.category?.value
              ? { category: filters.category.value }
              : {}),
          }),
        )
        : await dispatch(getProducts(buildProductQuery(pageNo)));
      setApiRes(response?.payload?.data || { list: [], total: 0 });
    } catch (err) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [dispatch, pageNo, filters, isChangePendingFilter, buildProductQuery]);

  useEffect(() => {
    fetchProductsList();
    dispatch(getAllSellerList());
    dispatch(getShopList({ page: 1, size: 100 }));
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
      .catch(() => {});
  }, [pageNo]);

  useEffect(() => {
    const nextFilters = getInitialFiltersForPath(location.pathname);
    setFilters(nextFilters);
    setPageNo(1);
    const loadRouteProducts = async () => {
      setLoading(true);
      try {
        const response = nextFilters?.approvalStatus?.value === "Change Pending"
          ? await dispatch(getProductModerationQueue({ status: "change_pending", page: 1, size }))
          : await dispatch(
            getProducts({
              page: 1,
              size,
              keyWord: nextFilters.search,
              includeAllStatuses: true,
              ...(approvalStatusToProductStatus[nextFilters?.approvalStatus?.value]
                ? { status: approvalStatusToProductStatus[nextFilters.approvalStatus.value] }
                : {}),
            }),
          );
        setApiRes(response?.payload?.data || { list: [], total: 0 });
      } catch (err) {
        toast.error("Failed to fetch products");
      } finally {
        setLoading(false);
      }
    };
    loadRouteProducts();
  }, [location.pathname]);

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
  const TABLE_HEADINGS = [
    "Image",
    "Product",
    "SKU",
    // "Seller",   Uncomment when Admin loged in needs to see seller info in product list
    "Category",
    "Brand",
    "Color",
    "Origin",
    "Price",
    "Stock",
    "Status",
    "Created On",
    "Active",
    "Action",
  ];

  const bulkUploadValidation = (userData) => {
    const isRole9 = userData?.roleId === 9;

    if (isRole9) {
      if (!bulkUploadData.seller_id) {
        toast.error("Please select a seller");
        return false;
      }

      if (!bulkUploadData.store_id) {
        toast.error("Please select a store");
        return false;
      }
    }

    if (!bulkUploadData.file) {
      toast.error("Please upload a file");
      return false;
    }

    const file = bulkUploadData.file;
    const validTypes = ["text/csv", "application/vnd.ms-excel"];
    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (!validTypes.includes(file.type) && fileExtension !== "csv") {
      toast.error("Only CSV files are allowed.");
      return false;
    }

    return true;
  };

  const handleImageClick = useCallback((data) => {
    if (!data) return;
    setSelectedImages(data);
    setGalleryOpen(true);
  }, []);

  const handleRowCheckboxChange = (e, rowId) => {
    setSelectedRow((prev) =>
      e.target.checked ? [...prev, rowId] : prev.filter((id) => id !== rowId),
    );
  };

  const handleHeaderCheckboxChange = (e) => {
    setSelectedRow(e.target.checked ? allRowIds : []);
  };

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
  const handleToggle = async (data) => {
    if (!canToggleProduct(data)) {
      toast.error("This product status cannot be toggled from here.");
      return;
    }
    const apiPayload = {
      _id: [data?._id],
      isDisable: data?.isDisable ? false : true,
    };
    try {
      setLoading(true);
      const response = await dispatch(
        enableDisableProductCatalogs(apiPayload),
      ).unwrap();
      if (response.message) {
        toast.success(
          `Product ${apiPayload.isDisable ? "disabled" : "enabled"} successfully.`,
        );
      } else {
        toast.info(response?.message || "Something went wrong");
      }
    } catch (error) {
      toast.error(error?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
    fetchProductsList();
  };

  const hasPendingRevision = (product) =>
    product?.revisionStatus === "change_pending" ||
    Boolean(product?.pendingRevisionId) ||
    Boolean(product?.pendingRevision);
  const canReviewProduct = (product) =>
    REVIEWABLE_STATUSES.has(product?.status) || hasPendingRevision(product);
  const canToggleProduct = (product) => {
    if (!STATUS_TOGGLEABLE.has(product?.status)) return false;
    if (isSellerPanelUser && product?.status === "inactive") return false;
    return true;
  };

  const extractRevisionList = (response) => {
    const data = response?.data || response?.payload?.data || {};
    if (Array.isArray(data)) return data;
    return data?.list || data?.items || data?.data?.list || data?.data?.items || [];
  };

  const handleApproveToggle = async (data) => {
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

  const handleReviewSubmit = async (decision, rejectionReason, checklist) => {
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
            checklist,
          }),
        ).unwrap()
        : await dispatch(
          approveDisapprove({
            id: product?._id,
            status: decision,
            rejectionReason: rejectionReason || null,
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
    try {
      setLoading(true);
      const response = await dispatch(
        restoreProduct({
          _id: [product?._id],
          status: "draft",
          visibility: "private",
          reason: "product_restored_from_admin",
        }),
      ).unwrap();
      toast.success(response?.message || "Product restored as draft.");
      fetchProductsList();
    } catch (error) {
      toast.error(error?.message || error || "Restore failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchApply = async () => {
    setLoading(true);
    try {
      setPageNo(1);
      const response = isChangePendingFilter
        ? await dispatch(
          getProductModerationQueue({
            status: "change_pending",
            page: 1,
            size,
            ...(filters?.category?.value
              ? { category: filters.category.value }
              : {}),
          }),
        )
        : await dispatch(getProducts(buildProductQuery(1)));
      setApiRes(response?.payload?.data || { list: [], total: 0 });
    } catch (err) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };
  const clearFilters = async () => {
    setLoading(true);
    const nextFilters = getInitialFiltersForPath(location.pathname);
    setFilters(nextFilters);
    setPageNo(1);
    try {
      const query = {
        page: 1,
        size: size,
        keyWord: nextFilters.search,
        includeAllStatuses: true,
        ...(approvalStatusToProductStatus[nextFilters?.approvalStatus?.value]
          ? { status: approvalStatusToProductStatus[nextFilters.approvalStatus.value] }
          : {}),
      };
      const response = nextFilters?.approvalStatus?.value === "Change Pending"
        ? await dispatch(getProductModerationQueue({ status: "change_pending", page: 1, size }))
        : await dispatch(getProducts(query));
      setApiRes(response?.payload?.data || { list: [], total: 0 });
    } catch (err) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };
  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };
  const handleBulkAction = async (action) => {
    if (isSellerPanelUser && action === "Active") {
      toast.error("Seller products must be approved by admin before activation.");
      return;
    }
    if (action === "Active" || action === "Inactive") {
      let apiPayload = {
        _id: selectedRow,
        isDisable: action === "Active" ? false : true,
      };
      try {
        const res = await dispatch(
          enableDisableProductCatalogs(apiPayload),
        ).unwrap();
        if (res) {
          toast.success(res?.message);
        }
        fetchProductsList();
        setSelectedRow([]);
      } catch (error) {
        toast.error(error?.message || error || "Failed...!");
        if (error.errors) {
          toast.error(error.errors || "failed to update");
        }
      }
    }
  };

  const handleEditProduct = (id) => {
    navigate(`/app/product-catalog/form/${id}`);
  };

  const isAllRowsSelected = useMemo(
    () =>
      selectedRow.length === apiRes?.list?.length && apiRes?.list?.length > 0,
    [selectedRow.length, apiRes?.list?.length],
  );

  const tableRows = useMemo(
    () =>
      apiRes.list.map((product) => {
        return [
          <CustomCheckbox
            checked={selectedRow.includes(product._id)}
            onChange={(e) => handleRowCheckboxChange(e, product._id)}
          />,

          <div className="relative flex items-center">
            <span
              className="text-blue-500 hover:underline cursor-pointer "
              onClick={() =>
                handleImageClick(
                  product?.images || product?.product_image_id?.images,
                )
              }
            >
              View
            </span>
          </div>,
          <span className="capitalize">
            {product?.title || product?.name || "N/A"}
          </span>,
          <span>{product?.sku || "N/A"}</span>,
          // <span>{refToLabel(product?.sellerName || product?.sellerId)}</span>,
          <span>
            {refToLabel(
              product?.categoryName || product?.category || product?.categoryId,
            )}
          </span>,
          <span>{refToLabel(product?.brand)}</span>,
          <span>{product?.color || "N/A"}</span>,
          <span>
            {[
              product?.origin?.city,
              product?.origin?.state,
              product?.origin?.country,
            ]
              .filter(Boolean)
              .join(", ") || "N/A"}
          </span>,
          <span>
            {product?.price !== undefined ? `₹${product.price}` : "N/A"}
          </span>,
          <span>{product?.stock ?? "N/A"}</span>,
          <ProductStatusBadge
            status={product?.status}
            revisionStatus={product?.revisionStatus}
          />,
          <span key={`date-${product._id}`}>
            {formatDate(product.createdAt)}
          </span>,
          canToggleProduct(product) ? (
            <ToggleButton
              key={`toggle-${product._id}`}
              isToggle={!product?.isDisable}
              handleClick={() => handleToggle(product)}
              requiredModule="products"
            />
          ) : (
            <span className="text-xs text-gray-400">-</span>
          ),
          <span>
            <div className="flex flex-wrap gap-2">
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
                    className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                    onClick={() => handleRestoreProduct(product)}
                  >
                    Restore
                  </button>
                </PermissionGuard>
              )}
              {canReviewProduct(product) && (
                <PermissionGuard module="products" action="approve" hide>
                  <button
                    className="text-xs px-2 py-1 rounded bg-[var(--admin-blue)] text-white hover:bg-[#2e3074]"
                    onClick={() => handleApproveToggle(product)}
                  >
                    {hasPendingRevision(product) ? "Review Revision" : "Review"}
                  </button>
                </PermissionGuard>
              )}
            </div>
          </span>,
        ];
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiRes.list, selectedRow, handleImageClick, navigate, isSellerPanelUser],
  );

  const handleAddBulkUpload = () => {
    setIsBulkUpload(true);
  };
  const handleSelectChange = (data, action) => {
    if (action === "SELLER") {
      setBulkUploadData((prev) => ({
        ...prev,
        seller_id: data?.value,
      }));
      dispatch(getShopList({ page: 1, size: 100, sellerId: data?.value }));
    } else {
      setBulkUploadData((prev) => ({
        ...prev,
        store_id: data?.value,
      }));
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setBulkUploadData((prev) => ({ ...prev, file: file }));
  };
  const handleSubmitBulk = async () => {
    if (!bulkUploadValidation(userData)) return;

    try {
      setIsLoading(true);

      // 👉 Clone and update bulkUploadData
      const updatedBulkUploadData = {
        ...bulkUploadData,
        ...(userData?.roleId === 9 && { store_id: userData?.storeId }),
      };

      const csv = await uploadCsvFile(updatedBulkUploadData);
      toast.info(csv?.message || "Success!");

      navigate(`/app/product-catalog/bulk-history`);
    } catch (error) {
      toast.error(error || "Catalog upload failed. Please try again.");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
      setBulkUploadData({ seller_id: "", store_id: "", file: "" });
      setIsBulkUpload(false);
    }
  };

  return (
    <div className="p-6 mx-auto overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl">
      <Loader loading={loading || isLoading} />
      <div className="flex md:flex-row flex-col items-center justify-between mb-4">
        <h1 className="text-xl font-bold ">Product Catalog</h1>
        <div className="flex justify-end gap-2">
          {BULK_IMPORT_AVAILABLE && (
            <Button onClick={() => navigate(`/app/product-catalog/bulk-history`)}>
              Bulk History
            </Button>
          )}
          <ExportButton
            data={apiRes?.list || []}
            filename="products"
            requiredModule="products"
          />
          {BULK_IMPORT_AVAILABLE && (
            <AddButton
              onClick={handleAddBulkUpload}
              labelName={`Add in bulk`}
              requiredModule="products"
              requiredAction="import"
            />
          )}
          <AddButton onClick={handleAddNavigate} requiredModule="products" />
        </div>
      </div>
      {/* <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm font-semibold text-blue-900">
          Product Setup Flow
        </p>
        <p className="mt-1 text-xs text-blue-800">
          Recommended sequence: Categories/Attributes → Brands → Families →
          Options/Option Values → Variants → Dimensions/Warranty/Batch/HSN →
          Product Catalog.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button onClick={() => navigate("/app/product-flow")}>
            Open Full Flow
          </Button>
          <Button onClick={() => navigate("/app/categories")}>
            Categories
          </Button>
          <Button onClick={() => navigate("/app/brands")}>Brands</Button>
          <Button onClick={() => navigate("/app/product-families")}>
            Families
          </Button>
          <Button onClick={() => navigate("/app/product-options")}>
            Options
          </Button>
          <Button onClick={() => navigate("/app/product-variants")}>
            Variants
          </Button>
          <Button onClick={() => navigate("/app/product-dimensions")}>
            Dimensions
          </Button>
          <Button onClick={() => navigate("/app/warranty")}>Warranty</Button>
          <Button onClick={() => navigate("/app/batch")}>Batch</Button>
          <PermissionGuard module="tax" action="view" hide>
            <Button onClick={() => navigate("/app/hsn-code")}>HSN</Button>
          </PermissionGuard>
        </div>
      </div> */}
      <div className="bg-white">
        <section className="p-2 border-b">
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
            isProduct={true}
            isProductType={true}
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
          />
        </section>
        <section>
          <TableData
            tableHeadings={TABLE_HEADINGS}
            data={tableRows || []}
            isHeaderCheckbox={true}
            handleHeaderCheckboxChange={handleHeaderCheckboxChange}
            totalData={apiRes?.total}
            allRowsSelected={isAllRowsSelected}
          />
        </section>
      </div>
      <div className="mt-3">
        {apiRes?.total > size && (
          <Pagination
            totalPages={Math.ceil(apiRes?.total / size)}
            currentPage={pageNo}
            onPageChange={onPageChange}
          />
        )}
      </div>

      <DeletePopup
        isDeleteModalOpen={showDeleteConfirmation}
        closeDeleteModal={() => {
          setShowDeleteConfirmation(false);
          setProductToDelete(null);
        }}
        DeleteHeading={"Are you sure you want to delete?"}
        isDeleting={loading && productToDelete}
        confirmDelete={handleDeleteSubmit}
      />

      {BULK_IMPORT_AVAILABLE && (
        <DefaultModal
          isOpen={isBulkUpload}
          onClose={() => setIsBulkUpload(false)}
          title={`Add Bulk Product`}
          onSubmit={handleSubmitBulk}
        >
          <div className="space-y-8 p-2">
            {userData?.roleId !== 9 && (
              <>
                {userData?.roleId !== 3 && (
                  <FilterSelect
                    options={sellerListData || []}
                    onChange={(data) => handleSelectChange(data, "SELLER")}
                    value={
                      sellerListData.find(
                        (opt) => opt.value === bulkUploadData?.seller_id,
                      ) || null
                    }
                    label="Seller"
                  />
                )}

                <FilterSelect
                  options={storeList || []}
                  value={
                    storeList.find(
                      (opt) => opt.value === bulkUploadData?.store_id,
                    ) || null
                  }
                  onChange={(data) => handleSelectChange(data, "STORE")}
                  label="Store"
                />
              </>
            )}

            <UploadFile onFileSelect={handleFileUpload} />
          </div>
        </DefaultModal>
      )}

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
