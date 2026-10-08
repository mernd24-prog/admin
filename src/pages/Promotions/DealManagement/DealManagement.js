/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import moment from "moment";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  MdAdd,
  MdBarChart,
  MdCheckCircle,
  MdClose,
  MdEdit,
  MdHistory,
  MdLocalOffer,
  MdPause,
  MdPlayArrow,
  MdVisibility,
} from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
import Cards from "../../../components/Cards/Cards";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import {
  getDeals,
  getDeal,
  createDeal,
  updateDeal,
  submitDeal,
  approveDeal,
  rejectDeal,
  pauseDeal,
  resumeDeal,
  cancelDeal,
  getDealAnalytics,
} from "../../../Redux/adminCoreSlice";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { axiosPrivate } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { isAdminPanel, isSellerPanel } from "../../../_helpers/panelConfig";
import { formatDateTime12Hour } from "../../../utils/formatters";
import FormSection from "../../../components/Atoms/FormSection/FormSection";
import Tabs from "../../../components/Shared/Tabs";
import FormInput from "../../../components/Atoms/FormInput/FormInput";
import { DateRangeFilter } from "../../../components/Shared/FilterBar";

const DEAL_TYPES = [
  { value: "fixed_price", label: "Fixed Deal Price" },
  { value: "percentage_discount", label: "Percentage Discount" },
  { value: "flash_sale", label: "Flash Sale" },
  { value: "limited_inventory", label: "Limited Inventory" },
  { value: "bulk_quantity", label: "Bulk Quantity" },
  { value: "brand_partnership", label: "Brand Partnership" },
  { value: "region_specific", label: "Region Specific" },
  { value: "variant_level", label: "Variant Level" },
];

const DEAL_SOURCES = [
  { value: "seller_request", label: "Seller Request" },
  { value: "admin_direct", label: "Admin Direct" },
  { value: "marketing_campaign", label: "Marketing Campaign" },
  { value: "seasonal_campaign", label: "Seasonal Campaign" },
];

const DEAL_BADGES = [
  "Today's Deal",
  "Flash Sale",
  "Hot Deal",
  "Limited Offer",
  "Best Deal",
  "Festival Offer",
  "Mega Sale",
];

const STATUS_COLOR = {
  draft: "gray",
  pending_approval: "yellow",
  scheduled: "blue",
  active: "green",
  paused: "orange",
  expired: "gray",
  completed: "green",
  rejected: "red",
  cancelled: "red",
};

const TAB_CONFIG = [
  { key: "", label: "All Deals" },
  { key: "product_keys", label: "Product Deal Keys" },
  { key: "pending_approval", label: "Deal Requests" },
  { key: "active", label: "Active Deals" },
  { key: "scheduled", label: "Scheduled Deals" },
  { key: "expired", label: "Expired Deals" },
  { key: "rejected", label: "Rejected Deals" },
  { key: "cancelled", label: "Deal History" },
];

const initialForm = {
  mode: "admin_direct",
  sellerId: "",
  productId: "",
  productLabel: "",
  variantId: "",
  variantSku: "",
  category: "",
  title: "",
  originalPrice: "",
  dealPrice: "",
  allocatedQuantity: "",
  maxQuantityPerOrder: "",
  startAt: "",
  endAt: "",
  dealType: "fixed_price",
  dealSource: "admin_direct",
  dealBadge: "Today's Deal",
  priority: "100",
  reason: "",
  message: "",
};

const FILTER_FIELDS = [
  { key: "search", type: "text", label: "Search", width: "w-56" },
  {
    key: "sellerId",
    type: "asyncDropdown",
    label: "Seller Store Name",
    width: "w-52",
    load: (search) =>
      dropdownApi.getStoreName({
        keyWord: search,
        searchFields: "organizationName,businessName,legalBusinessName",
      }),
  },
  {
    key: "dealType",
    type: "select",
    label: "Type",
    options: DEAL_TYPES,
  },
  { key: "fromDate", type: "date", label: "From" },
  { key: "toDate", type: "date", label: "To" },
];

const unwrapList = (payload = {}) => {
  const data = payload?.data?.data || payload?.data || payload;
  if (Array.isArray(data)) return { list: data, total: data.length };
  return {
    list: data?.list || data?.items || data?.deals || [],
    total: Number(
      data?.total || data?.list?.length || data?.items?.length || 0,
    ),
  };
};

const unwrapApiItems = (response) => {
  const data = response?.data?.data ?? response?.data ?? response ?? {};
  if (Array.isArray(data)) return data;
  return data.items || data.list || data.results || [];
};

const display = (value = "") =>
  String(value || "—")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const fmtDate = (value) => formatDateTime12Hour(value, "—");
const fmtDateTime = (value) => formatDateTime12Hour(value, "—");
const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const num = (value) => Number(value || 0);
const getDealId = (deal = {}) => deal._id || deal.id || deal.dealId;
const getProductId = (product = {}) =>
  product._id || product.id || product.productId;
const remainingQty = (deal = {}) =>
  Math.max(
    0,
    num(deal.allocatedQuantity) -
      num(deal.soldQuantity) -
      num(deal.reservedQuantity),
  );
const discountAmount = (deal = {}) =>
  Math.max(0, num(deal.originalPrice) - num(deal.dealPrice));
const discountPercent = (deal = {}) =>
  num(deal.originalPrice) > 0
    ? ((discountAmount(deal) / num(deal.originalPrice)) * 100).toFixed(1)
    : "0.0";

const normalizeProduct = (product = {}) => {
  const price =
    product.salePrice ??
    product.sellingPrice ??
    product.price ??
    product.mrp ??
    "";
  const stock =
    product.availableStock ??
    product.stock ??
    product.inventory?.available ??
    product.inventory?.stock ??
    "";
  return {
    ...product,
    id: product._id || product.id || product.productId,
    label: product.title || product.name || product.sku || "Untitled product",
    price,
    stock,
    isDealProduct: Boolean(product.metadata?.isDealProduct),
    dealBadge: product.metadata?.dealBadge || "",
    dealSource: product.metadata?.dealSource || "",
    sellerName:
      product.sellerName ||
      product.sellerDisplayName ||
      product.seller?.displayName ||
      product.seller?.businessName ||
      product.seller?.name ||
      product.seller?.email ||
      "",
    categoryLabel:
      product.categoryName ||
      product.category?.name ||
      product.category ||
      product.categorySlug ||
      "",
  };
};

const getRowSellerName = (row = {}) =>
  row.sellerName ||
  row.sellerDisplayName ||
  row.seller?.displayName ||
  row.seller?.businessName ||
  row.seller?.full_name ||
  row.seller?.name ||
  row.seller?.email ||
  "";

const sellerLookupFromOption = (option = {}) => ({
  label: option.label || option.name || option.email || option.value || "",
  email: option.meta?.email || option.email || "",
});

function ProductSearch({ sellerId, value, onSelect }) {
  const loadProductOptions = useCallback(
    async (search = "") => {
      try {
        const trimmed = search.trim();

        const response = await axiosPrivate.get(
          ENDPOINTS.products.listForPanel,
          {
            params: {
              q: trimmed || undefined,
              search: trimmed || undefined,
              keyWord: trimmed || undefined,
              sellerId: sellerId || undefined,
              limit: 20,
              includeVariants: true,
              includeAllStatuses: true,
            },
          },
        );

        return unwrapApiItems(response)
          .map(normalizeProduct)
          .sort(
            (left, right) =>
              Number(right.isDealProduct) - Number(left.isDealProduct),
          )
          .map((product) => ({
            value: product.id,
            label: product.label,
            sku: product.sku || "",
            stock: product.stock || 0,
            price: product.price || 0,
            product,
          }));
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Failed to search products",
        );
        return [];
      }
    },
    [sellerId],
  );

  const handleChange = (option) => {
    if (!option) {
      onSelect(null);
      return;
    }

    onSelect(option.product);
  };

  const selectedValue = value
    ? {
        value: value.id,
        label: value.label,
        sku: value.sku || "",
        stock: value.stock || 0,
        price: value.price || 0,
        product: value,
      }
    : null;

  return (
    <FilterSelect
      label="Existing Product"
      required
      name="productId"
      inputId="deal-product-id"
      value={selectedValue}
      onChange={handleChange}
      loadOptions={loadProductOptions}
      placeholder="Search product name or SKU"
      defaultOptions
    />
  );
}

function SellerSearch({ value, onSelect }) {
  const loadSellerOptions = useCallback(async (search = "") => {
    try {
      return await dropdownApi.getSellers({
        keyWord: search,
        searchFields: "full_name,email,businessName",
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to search sellers");
      return [];
    }
  }, []);

  return (
    <FilterSelect
      label="Seller"
      required
      name="sellerId"
      inputId="deal-seller-id"
      value={value}
      onChange={onSelect}
      loadOptions={loadSellerOptions}
      placeholder="Select seller"
      defaultOptions
      cacheOptions
    />
  );
}

const DealManagement = () => {
  const dispatch = useDispatch();
  const { can } = usePermission();
  const selector = useSelector((state) => state.adminCore);
  const payload = unwrapList(selector.dealsData);
  const analytics =
    selector.dealAnalyticsData?.data?.data ||
    selector.dealAnalyticsData?.data ||
    {};
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
  });
  const { toQueryParams } = list;

  const [activeTab, setActiveTab] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellerLookup, setSellerLookup] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dealProductKeys, setDealProductKeys] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [confirm, setConfirm] = useState({
    open: false,
    action: "",
    deal: null,
    reason: "",
    note: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(
        getDeals({
          ...params,
          status:
            activeTab && activeTab !== "product_keys"
              ? activeTab
              : params.status,
          offset: (params.page - 1) * params.limit,
        }),
      ).unwrap();
    } catch (err) {
      const msg = err?.message || err || "Failed to load deals";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, dispatch, toQueryParams]);

  const fetchAnalytics = useCallback(() => {
    dispatch(getDealAnalytics({ limit: 20 })).catch(() => null);
  }, [dispatch]);

  const fetchDealProductKeys = useCallback(async () => {
    try {
      const response = await axiosPrivate.get(ENDPOINTS.products.listForPanel, {
        params: {
          includeAllStatuses: true,
          limit: 100,
          sortBy: "updatedAt",
          sortDir: "desc",
        },
      });
      setDealProductKeys(
        unwrapApiItems(response)
          .map(normalizeProduct)
          .filter((product) => product.isDealProduct),
      );
    } catch {
      setDealProductKeys([]);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  useEffect(() => {
    fetchAnalytics();
    fetchDealProductKeys();
  }, [fetchAnalytics, fetchDealProductKeys]);

  const openDetail = useCallback(
    async (deal) => {
      setDetail(deal);
      setDetailLoading(true);
      try {
        const res = await dispatch(
          getDeal({ dealId: getDealId(deal) }),
        ).unwrap();
        setDetail(res?.data?.data || res?.data || deal);
      } catch (err) {
        toast.error(err?.message || err || "Failed to load deal detail");
      } finally {
        setDetailLoading(false);
      }
    },
    [dispatch],
  );

  const openForm = (
    mode = isSellerPanel() ? "seller_request" : "admin_direct",
  ) => {
    setEditingDeal(null);
    setForm({
      ...initialForm,
      mode,
      dealSource: mode === "seller_request" ? "seller_request" : "admin_direct",
    });
    setSelectedSeller(null);
    setSelectedProduct(null);
    setFormOpen(true);
  };

  const openEditDeal = (deal) => {
    const metadata = deal.metadata || {};
    const productLabel = metadata.productLabel || deal.title || "";
    setEditingDeal(deal);
    setSelectedSeller(
      deal.sellerId
        ? {
            value: deal.sellerId,
            label: getRowSellerName(deal) || deal.sellerName || deal.sellerId,
          }
        : null,
    );
    setSelectedProduct({
      id: deal.productId,
      label: productLabel,
      price: deal.originalPrice,
      stock: deal.allocatedQuantity,
      sku: metadata.productSku || deal.variantSku || "",
    });
    setForm({
      ...initialForm,
      mode: "edit",
      sellerId: deal.sellerId || "",
      productId: deal.productId || "",
      productLabel,
      variantId: deal.variantId || "",
      variantSku: deal.variantSku || "",
      category: deal.category || "",
      title: deal.title || productLabel,
      originalPrice: deal.originalPrice ?? "",
      dealPrice: deal.dealPrice ?? "",
      allocatedQuantity: deal.allocatedQuantity ?? "",
      maxQuantityPerOrder: deal.maxQuantityPerOrder ?? "",
      startAt: deal.startAt
        ? moment(deal.startAt).format("YYYY-MM-DDTHH:mm")
        : "",
      endAt: deal.endAt ? moment(deal.endAt).format("YYYY-MM-DDTHH:mm") : "",
      dealType: deal.dealType || "fixed_price",
      dealSource: metadata.dealSource || "admin_direct",
      dealBadge: metadata.dealBadge || "Today's Deal",
      priority: String(metadata.priority ?? "100"),
      reason: metadata.sellerReason || "",
      message: metadata.sellerMessage || "",
    });
    setFormOpen(true);
  };

  const openFormFromProduct = (product) => {
    openForm("admin_direct");
    if (product.sellerId) {
      const sellerOption = {
        value: product.sellerId,
        label: product.sellerName || product.sellerId,
      };
      setSelectedSeller(sellerOption);
      setSellerLookup((current) => ({
        ...current,
        [String(product.sellerId)]: sellerLookupFromOption(sellerOption),
      }));
    }
    setSelectedProduct(product);
    setForm((current) => ({
      ...current,
      sellerId: product.sellerId || "",
      productId: product.id,
      productLabel: product.label,
      title: `${product.label} Deal`,
      originalPrice: product.price || "",
      allocatedQuantity: product.stock || "",
      category: product.categoryLabel || "",
      dealBadge: product.dealBadge || current.dealBadge,
      dealSource: product.dealSource || current.dealSource,
    }));
  };

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onProductSelect = (product) => {
    setSelectedProduct(product);
    if (!selectedSeller && product.sellerId) {
      const sellerOption = {
        value: product.sellerId,
        label: product.sellerName || product.sellerId,
      };
      setSelectedSeller(sellerOption);
      setSellerLookup((current) => ({
        ...current,
        [String(product.sellerId)]: sellerLookupFromOption(sellerOption),
      }));
    }
    setForm((current) => ({
      ...current,
      sellerId: current.sellerId || product.sellerId || "",
      productId: product.id,
      productLabel: product.label,
      title: current.title || `${product.label} Deal`,
      originalPrice:
        product.price === "" ? current.originalPrice : product.price,
      allocatedQuantity: current.allocatedQuantity || product.stock || "",
      category: current.category || product.categoryLabel || "",
      dealBadge: product.dealBadge || current.dealBadge,
      dealSource: product.dealSource || current.dealSource,
    }));
  };

  const onSellerSelect = (seller) => {
    setSelectedSeller(seller);

    if (seller?.value) {
      setSellerLookup((current) => ({
        ...current,
        [String(seller.value)]: sellerLookupFromOption(seller),
      }));
    }

    setSelectedProduct(null);

    setForm((current) => ({
      ...current,
      sellerId: seller?.value || "",
      productId: "",
      productLabel: "",
      originalPrice: "",
      allocatedQuantity: "",
      category: "",
    }));
  };

  const formDeal = useMemo(
    () => ({
      originalPrice: form.originalPrice,
      dealPrice: form.dealPrice,
    }),
    [form.originalPrice, form.dealPrice],
  );

  const validateForm = () => {
    if (isAdminPanel() && !form.sellerId) return "Select seller.";
    if (!form.productId) return "Select an existing product.";
    if (!form.title.trim()) return "Enter deal title.";
    if (!num(form.originalPrice)) return "Original price is required.";
    if (!num(form.dealPrice)) return "Deal price is required.";
    if (num(form.dealPrice) >= num(form.originalPrice)) {
      return "Deal price must be lower than original price.";
    }
    if (num(form.allocatedQuantity) < 0)
      return "Deal quantity cannot be negative.";
    if (
      selectedProduct?.stock !== "" &&
      num(form.allocatedQuantity) > num(selectedProduct?.stock)
    ) {
      return "Deal quantity cannot exceed available stock.";
    }
    if (!form.startAt || !form.endAt) return "Select deal start and end.";
    if (new Date(form.endAt).getTime() <= new Date(form.startAt).getTime()) {
      return "Deal end must be after start.";
    }
    if (form.mode === "seller_request" && !form.reason.trim()) {
      return "Reason is required for seller deal request.";
    }
    return "";
  };

  const buildDealPayload = () => ({
    title: form.title.trim(),
    description: form.message || form.reason || "",
    sellerId: form.sellerId || undefined,
    productId: form.productId,
    variantId: form.variantId || undefined,
    variantSku: form.variantSku || undefined,
    category: form.category || undefined,
    dealType: form.dealType,
    status: editingDeal
      ? editingDeal.status
      : form.mode === "admin_direct" && isAdminPanel()
        ? "active"
        : "draft",
    originalPrice: num(form.originalPrice),
    dealPrice: num(form.dealPrice),
    allocatedQuantity: Number(form.allocatedQuantity || 0),
    maxQuantityPerOrder: form.maxQuantityPerOrder
      ? Number(form.maxQuantityPerOrder)
      : null,
    startAt: new Date(form.startAt).toISOString(),
    endAt: new Date(form.endAt).toISOString(),
    metadata: {
      dealSource: form.dealSource,
      dealBadge: form.dealBadge,
      priority: Number(form.priority || 100),
      sellerReason: form.reason || null,
      sellerMessage: form.message || null,
      productLabel: form.productLabel || selectedProduct?.label || null,
      productSku: selectedProduct?.sku || null,
      originalPriceLocked: true,
      productMasterUntouched: true,
    },
  });

  const submitForm = async () => {
    const message = validateForm();
    if (message) {
      toast.error(message);
      return;
    }

    try {
      setSubmitLoading(true);
      if (editingDeal) {
        await dispatch(
          updateDeal({ dealId: getDealId(editingDeal), ...buildDealPayload() }),
        ).unwrap();
        toast.success("Deal updated");
        setFormOpen(false);
        setEditingDeal(null);
        fetchDeals();
        fetchAnalytics();
        fetchDealProductKeys();
        return;
      }
      const created = await dispatch(createDeal(buildDealPayload())).unwrap();
      const createdDeal = created?.data?.data || created?.data || created;
      if (form.mode === "seller_request") {
        await dispatch(
          submitDeal({
            dealId: getDealId(createdDeal),
            reason: form.reason,
            note: form.message,
          }),
        ).unwrap();
        toast.success("Deal request submitted for admin approval");
      } else {
        toast.success(
          "Direct deal created without changing product master price",
        );
      }
      setFormOpen(false);
      setEditingDeal(null);
      fetchDeals();
      fetchAnalytics();
      fetchDealProductKeys();
    } catch (err) {
      toast.error(err?.message || err || "Failed to save deal");
    } finally {
      setSubmitLoading(false);
    }
  };

  const openConfirm = (action, deal) =>
    setConfirm({ open: true, action, deal, reason: "", note: "" });

  const closeConfirm = () =>
    setConfirm({ open: false, action: "", deal: null, reason: "", note: "" });

  const submitAction = useCallback(async () => {
    const { action, deal, reason, note } = confirm;
    if (!deal) return;
    const dealId = getDealId(deal);
    const thunkMap = {
      approve: approveDeal,
      reject: rejectDeal,
      pause: pauseDeal,
      resume: resumeDeal,
      cancel: cancelDeal,
    };

    if (["reject", "cancel"].includes(action) && !reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    try {
      setActionLoading(true);
      await dispatch(thunkMap[action]({ dealId, reason, note })).unwrap();
      toast.success(`Deal ${display(action).toLowerCase()} completed`);
      closeConfirm();
      fetchDeals();
      fetchAnalytics();
    } catch (err) {
      toast.error(err?.message || err || `Failed to ${action} deal`);
    } finally {
      setActionLoading(false);
    }
  }, [confirm, dispatch, fetchDeals, fetchAnalytics]);

  const metrics = useMemo(() => {
    const listData = payload.list || [];
    return {
      total: analytics.totalDeals ?? payload.total ?? listData.length,
      active:
        analytics.activeDeals ??
        listData.filter((deal) => deal.status === "active").length,
      scheduled:
        analytics.scheduledDeals ??
        listData.filter((deal) => deal.status === "scheduled").length,
      expired:
        analytics.expiredDeals ??
        listData.filter((deal) => deal.status === "expired").length,
      revenue: analytics.revenueFromDeals ?? analytics.revenue ?? 0,
      units:
        analytics.unitsSold ??
        listData.reduce((sum, deal) => sum + num(deal.soldQuantity), 0),
    };
  }, [analytics, payload]);

  const tabCounts = useMemo(() => {
    const listData = payload.list || [];

    const countsFromAnalytics = {};
    if (Array.isArray(analytics.statusCounts)) {
      analytics.statusCounts.forEach((item) => {
        if (item && item.status) {
          countsFromAnalytics[item.status] = Number(item.count || 0);
        }
      });
    } else if (
      analytics.statusCounts &&
      typeof analytics.statusCounts === "object"
    ) {
      Object.entries(analytics.statusCounts).forEach(([k, v]) => {
        countsFromAnalytics[k] = Number(v || 0);
      });
    }

    const getStatusCount = (statusKey) => {
      if (activeTab === statusKey) {
        return payload.total !== undefined ? payload.total : listData.length;
      }
      if (countsFromAnalytics[statusKey] !== undefined) {
        return countsFromAnalytics[statusKey];
      }
      if (statusKey === "active" && metrics.active !== undefined) {
        return metrics.active;
      }
      if (statusKey === "scheduled" && metrics.scheduled !== undefined) {
        return metrics.scheduled;
      }
      if (statusKey === "expired" && metrics.expired !== undefined) {
        return metrics.expired;
      }
      return listData.filter((deal) => deal.status === statusKey).length;
    };

    const activeCount = getStatusCount("active");
    const scheduledCount = getStatusCount("scheduled");
    const expiredCount = getStatusCount("expired");
    const pendingCount = getStatusCount("pending_approval");
    const rejectedCount = getStatusCount("rejected");
    const cancelledCount = getStatusCount("cancelled");
    const productKeysCount = dealProductKeys.length;

    const allDealsCount =
      activeTab === ""
        ? (payload.total !== undefined ? payload.total : listData.length) +
          productKeysCount
        : (metrics.total ??
            activeCount +
              scheduledCount +
              expiredCount +
              pendingCount +
              rejectedCount +
              cancelledCount) + productKeysCount;

    return {
      "": allDealsCount,
      product_keys: productKeysCount,
      pending_approval: pendingCount,
      active: activeCount,
      scheduled: scheduledCount,
      expired: expiredCount,
      rejected: rejectedCount,
      cancelled: cancelledCount,
    };
  }, [analytics, payload, activeTab, metrics, dealProductKeys]);

  const tableRows = useMemo(() => {
    const deals = payload.list || [];
    const dealProductIds = new Set(
      deals.map((deal) => String(deal.productId || "")),
    );
    const keyRows = dealProductKeys
      .filter((product) => !dealProductIds.has(String(product.id)))
      .map((product) => ({
        ...product,
        _rowType: "product_deal_key",
        dealNumber: "Product key",
        title: product.label,
        productId: product.id,
        sellerId: product.sellerId,
        originalPrice: product.price,
        dealPrice: product.price,
        allocatedQuantity: product.stock || 0,
        soldQuantity: 0,
        reservedQuantity: 0,
        status: "deal_key",
        metadata: {
          dealSource: product.dealSource || "admin_direct",
          dealBadge: product.dealBadge || "Deal",
          productLabel: product.label,
        },
      }));
    if (activeTab === "product_keys") return keyRows;
    if (!activeTab) return [...deals, ...keyRows];
    return deals;
  }, [activeTab, dealProductKeys, payload.list]);

  useEffect(() => {
    const sellerIds = Array.from(
      new Set(
        tableRows
          .map((row) => row.sellerId)
          .filter(Boolean)
          .map(String),
      ),
    );
    const missingIds = sellerIds.filter((sellerId) => !sellerLookup[sellerId]);
    if (!missingIds.length) return undefined;

    let cancelled = false;
    dropdownApi
      .getSellers({
        limit: 200,
        searchFields: "full_name,email,businessName",
      })
      .then((options = []) => {
        if (cancelled) return;
        setSellerLookup((current) => {
          const next = { ...current };
          options.forEach((option) => {
            if (option.value)
              next[String(option.value)] = sellerLookupFromOption(option);
          });
          return next;
        });
      })
      .catch(() => null);

    return () => {
      cancelled = true;
    };
  }, [sellerLookup, tableRows]);

  const columns = [
    {
      key: "dealNumber",
      label: "Deal ID",
      render: (value, row) => (
        <div>
          <p className="font-mono text-xs font-semibold text-[var(--admin-ink)]">
            {value || getDealId(row)}
          </p>
          <p className="text-xs text-[var(--admin-muted)]">
            {display(row.metadata?.dealSource || "seller_request")}
          </p>
        </div>
      ),
    },
    {
      key: "title",
      label: "Product",
      sortable: true,
      render: (value, row) => (
        <div className="max-w-[220px]">
          <p className="truncate font-medium text-gray-800">
            {row.metadata?.productLabel || value || "—"}
          </p>
          <p className="truncate text-xs text-gray-500">
            {row.category || display(row.dealType)}
          </p>
        </div>
      ),
    },
    {
      key: "sellerId",
      label: "Seller",
      render: (value, row) => {
        const seller = sellerLookup[String(value || "")] || {};
        const sellerName =
          getRowSellerName(row) || seller.label || value || "—";
        return (
          <div className="max-w-[180px]">
            <p className="truncate text-sm font-medium text-gray-800">
              {sellerName}
            </p>
            {seller.email && seller.email !== sellerName && (
              <p className="truncate text-xs text-gray-500">{seller.email}</p>
            )}
          </div>
        );
      },
    },
    {
      key: "originalPrice",
      label: "Original",
      render: (value) => (
        <span className="text-sm line-through decoration-red-400">
          {money(value)}
        </span>
      ),
    },
    {
      key: "dealPrice",
      label: "Deal Price",
      render: (value, row) => (
        <div>
          <p className="font-semibold text-emerald-700">{money(value)}</p>
          <p className="text-xs text-gray-500">{discountPercent(row)}% off</p>
        </div>
      ),
    },
    {
      key: "allocatedQuantity",
      label: "Quantity",
      render: (_, row) => (
        <div className="text-xs">
          <p>
            Allocated: <strong>{num(row.allocatedQuantity)}</strong>
          </p>
          <p>
            Sold: <strong>{num(row.soldQuantity)}</strong>
          </p>
          <p>
            Remaining: <strong>{remainingQty(row)}</strong>
          </p>
        </div>
      ),
    },
    {
      key: "startAt",
      label: "Duration",
      sortable: true,
      render: (_, row) => (
        <div className="text-xs">
          <p>{fmtDate(row.startAt)}</p>
          <p className="text-gray-500">{fmtDate(row.endAt)}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <StatusBadge status={value} color={STATUS_COLOR[value] || "gray"} />
      ),
    },
  ];

  const rowActions = useCallback(
    (row) => {
      const status = row.status;
      const isProductDealKey = row._rowType === "product_deal_key";

      if (isProductDealKey) {
        return [
          {
            label: "Create Deal",
            icon: (
              <MdAdd
                aria-hidden="true"
                size={16}
                className="text-emerald-600"
              />
            ),
            hidden: !can("deals", ACTIONS.CREATE),
            onClick: () => openFormFromProduct(row),
          },
        ];
      }

      return [
        {
          label: "View",
          icon: (
            <MdVisibility
              aria-hidden="true"
              size={16}
              className="text-blue-600"
            />
          ),
          onClick: () => openDetail(row),
        },
        {
          label: "Edit",
          icon: (
            <MdEdit aria-hidden="true" size={16} className="text-amber-600" />
          ),
          hidden: !can("deals", ACTIONS.UPDATE),
          onClick: () => openEditDeal(row),
        },
        {
          label: "Approve",
          icon: (
            <MdCheckCircle
              aria-hidden="true"
              size={16}
              className="text-green-600"
            />
          ),
          hidden: !(
            can("deals", ACTIONS.APPROVE) &&
            ["pending_approval", "draft"].includes(status) &&
            isAdminPanel()
          ),
          onClick: () => openConfirm("approve", row),
        },
        // {
        //   label: "Reject",
        //   icon: <MdClose size={16} className="text-red-600" />,
        //   danger: true,
        //   hidden: !(can("deals", ACTIONS.REJECT) && !["expired", "completed", "cancelled", "rejected"].includes(status) && isAdminPanel()),
        //   onClick: () => openConfirm("reject", row),
        // },
        {
          label: "Pause",
          icon: (
            <MdPause aria-hidden="true" size={16} className="text-yellow-600" />
          ),
          hidden: !(
            can("deals", ACTIONS.STATUS_CHANGE) &&
            status === "active" &&
            isAdminPanel()
          ),
          onClick: () => openConfirm("pause", row),
        },
        {
          label: "Resume",
          icon: (
            <MdPlayArrow
              aria-hidden="true"
              size={16}
              className="text-green-600"
            />
          ),
          hidden: !(
            can("deals", ACTIONS.STATUS_CHANGE) &&
            status === "paused" &&
            isAdminPanel()
          ),
          onClick: () => openConfirm("resume", row),
        },
        {
          label: "Cancel",
          icon: (
            <MdClose aria-hidden="true" size={16} className="text-red-600" />
          ),
          danger: true,
          hidden: !(
            can("deals", ACTIONS.STATUS_CHANGE) &&
            [
              "draft",
              "pending_approval",
              "active",
              "paused",
              "scheduled",
            ].includes(status)
          ),
          onClick: () => openConfirm("cancel", row),
        },
      ];
    },
    [can, openDetail, openFormFromProduct, openEditDeal, openConfirm],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Deal Management"
        subtitle="Convert existing products into temporary deals without changing Product Master pricing"
        breadcrumbs={[{ label: "Deals Management" }, { label: "Deals" }]}
        actions={
          <>
            <PermissionGuard module="deals" action={ACTIONS.CREATE} hide>
              <button
                onClick={() =>
                  openForm(isSellerPanel() ? "seller_request" : "admin_direct")
                }
              >
                <MdAdd aria-hidden="true" size={17} />{" "}
                {isSellerPanel() ? "Request Deal" : "Create Deal"}
              </button>
            </PermissionGuard>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Cards
          icon={<MdLocalOffer aria-hidden="true" size={18} />}
          label="Deal Products"
          value={metrics.total}
          iconBg="#e3d4ff"
          iconColor="#8d5cf6"
        />
        <Cards
          icon={<MdCheckCircle aria-hidden="true" size={18} />}
          label="Active"
          value={metrics.active}
          iconBg="#cce8c9"
          iconColor="#1d9b50"
        />
        <Cards
          icon={<MdHistory aria-hidden="true" size={18} />}
          label="Scheduled"
          value={metrics.scheduled}
          iconBg="#ffe5b5"
          iconColor="#f5a300"
        />
        <Cards
          icon={<MdClose aria-hidden="true" size={18} />}
          label="Expired"
          value={metrics.expired}
          iconBg="#ffd4d2"
          iconColor="#ff4b55"
        />
        <Cards
          icon={<MdBarChart aria-hidden="true" size={18} />}
          label="Units Sold"
          value={metrics.units}
          iconBg="#04258633"
          iconColor="#0f4bb3"
        />
        <Cards
          icon={<MdBarChart aria-hidden="true" size={18} />}
          label="Deal Revenue"
          value={money(metrics.revenue)}
          iconBg="#cce8c9"
          iconColor="#1d9b50"
        />
      </div>

      <Tabs
        tabs={TAB_CONFIG.map((tab) => ({
          value: tab.key,
          label: tab.label,
          count: tabCounts[tab.key] ?? 0,
        }))}
        activeTab={activeTab}
        onChange={(value) => {
          setActiveTab(value);
          list.setPage?.(1);
        }}
      />
      {/* {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )} */}

      <DataTable
        columns={columns}
        data={tableRows}
        onRefresh={fetchDeals}
        total={
          activeTab === "product_keys"
            ? tableRows.length
            : payload.total +
              (activeTab
                ? 0
                : Math.max(0, tableRows.length - payload.list.length))
        }
        listPage={list}
        loading={loading}
        searchPlaceholder="Search deals…"
        filterBar={<FilterBar fields={FILTER_FIELDS} listPage={list} />}
        rowKey={(row) => getDealId(row) || getProductId(row)}
        rowActions={rowActions}
        emptyMessage="No deal products found"
        tableContainerClassName="overflow-x-auto"
      />

      <DefaultModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingDeal(null);
        }}
        onSubmit={submitForm}
        title={
          editingDeal
            ? "Edit Deal Product"
            : form.mode === "seller_request"
              ? "Request Deal Product"
              : "Create Direct Deal"
        }
        submitButtonText={
          submitLoading
            ? "Saving..."
            : editingDeal
              ? "Update Deal"
              : form.mode === "seller_request"
                ? "Submit Request"
                : "Activate Deal"
        }
        closeButtonText="Cancel"
        isButtonView={true}
        submitLoading={submitLoading}
      >
        <div className="space-y-5">
          {/* ==================== Product Selection ==================== */}
          <FormSection
            title="Product Selection"
            description="Select the seller and existing product for this deal."
          >
            <div className="space-y-4">
              {isAdminPanel() && (
                <SellerSearch
                  value={selectedSeller}
                  onSelect={onSellerSelect}
                />
              )}

              <ProductSearch
                key={form.sellerId || "no-seller"}
                sellerId={form.sellerId}
                value={selectedProduct}
                onSelect={onProductSelect}
              />
            </div>
          </FormSection>

          {/* ==================== Deal Information ==================== */}
          <FormSection
            title="Deal Information"
            description="Configure the deal title, type, and pricing details."
          >
            <div className="space-y-4">
              {/* Deal Title */}
              <Input
                label="Deal Title"
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
                placeholder="Enter deal title"
                required
              />

              {/* Deal Type + Source */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Deal Type"
                  type="select"
                  value={form.dealType}
                  options={DEAL_TYPES}
                  onChange={(option) =>
                    setField("dealType", option?.value || "fixed_price")
                  }
                />

                <Input
                  label="Deal Source"
                  type="select"
                  value={form.dealSource}
                  options={DEAL_SOURCES}
                  onChange={(option) =>
                    setField("dealSource", option?.value || "admin_direct")
                  }
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Original Price"
                  type="price"
                  value={form.originalPrice}
                  readOnly
                  helperText="Copied for deal snapshot only."
                />

                <Input
                  label="Deal Price"
                  type="price"
                  value={form.dealPrice}
                  onChange={(event) =>
                    setField("dealPrice", event.target.value)
                  }
                  required
                />
              </div>

              {/* Calculated Values */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Discount Amount"
                  value={money(discountAmount(formDeal))}
                  readOnly
                />

                <Input
                  label="Discount Percentage"
                  value={`${discountPercent(formDeal)}%`}
                  readOnly
                />
              </div>
            </div>
          </FormSection>

          {/* ==================== Quantity & Schedule ==================== */}
          <FormSection
            title="Quantity & Schedule"
            description="Set the deal quantity limits and active duration."
          >
            <div className="space-y-4">
              {/* Quantity */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Deal Quantity Allocation"
                  type="number"
                  value={form.allocatedQuantity}
                  onChange={(event) =>
                    setField("allocatedQuantity", event.target.value)
                  }
                  min="0"
                />

                <Input
                  label="Maximum Quantity Per Customer"
                  type="number"
                  value={form.maxQuantityPerOrder}
                  onChange={(event) =>
                    setField("maxQuantityPerOrder", event.target.value)
                  }
                  min="1"
                />
              </div>

              {/* Deal Period */}
              <div className="space-y-5">
                <DateRangeFilter
                  field={{
                    key: "dateRange",
                    type: "daterange",
                    label: "Deal Period",
                    startKey: "startAt",
                    endKey: "endAt",
                    width: "w-full",
                    placeholder: "Select deal period",
                  }}
                  values={form}
                  onChange={(key, value) => setField(key, value)}
                />
              </div>
            </div>
          </FormSection>

          {/* ==================== Display Settings ==================== */}
          <FormSection
            title="Display Settings"
            description="Configure how the deal is displayed and prioritized."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Deal Badge"
                type="select"
                value={form.dealBadge}
                options={DEAL_BADGES.map((badge) => ({
                  label: badge,
                  value: badge,
                }))}
                onChange={(option) =>
                  setField("dealBadge", option?.value || "")
                }
              />

              <Input
                label="Priority"
                type="number"
                value={form.priority}
                onChange={(event) => setField("priority", event.target.value)}
                min="0"
              />
            </div>
          </FormSection>

          {/* ==================== Seller Request ==================== */}
          {form.mode === "seller_request" && (
            <FormSection
              title="Request Details"
              description="Provide the reason and any additional message for the deal request."
            >
              <div className="space-y-4">
                <Input
                  label="Reason"
                  type="textarea"
                  value={form.reason}
                  onChange={(event) => setField("reason", event.target.value)}
                  placeholder="Why should this product become a deal?"
                  required
                />

                <Input
                  label="Optional Message"
                  type="textarea"
                  value={form.message}
                  onChange={(event) => setField("message", event.target.value)}
                  placeholder="Add any additional context for admin."
                />
              </div>
            </FormSection>
          )}

          {/* ==================== Important Note ==================== */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                Deal Product Note
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-800">
                This creates a deal record for the selected existing product. It
                does not create a new product or update the Product Master
                price.
              </p>
            </div>
          </div>
        </div>
      </DefaultModal>
      <DefaultModal
        isOpen={!!detail}
        onClose={() => setDetail(null)}
        title="Deal Product Detail"
        isButtonView={true}
        submitButtonText="Edit Deal"
        closeButtonText="Close"
        onSubmit={() => {
          openEditDeal(detail);
          setDetail(null);
        }}
      >
        {!detail && detailLoading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Loader />
          </div>
        ) : detail ? (
          <div className="space-y-5 relative">
            {/* ==================== Deal Overview ==================== */}
            <FormSection
              title="Deal Overview"
              description="Basic information about this deal."
            >
              <div className="absolute right-6 top-5">
                <StatusBadge
                  status={detail.status}
                  color={STATUS_COLOR[detail.status] || "gray"}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label="Product"
                  name="product"
                  value={detail.metadata?.productLabel || detail.title || "—"}
                  disabled
                />

                <FormInput
                  label="Deal Number"
                  name="dealNumber"
                  value={detail.dealNumber || getDealId(detail) || "—"}
                  disabled
                />

                <FormInput
                  label="Deal Badge"
                  name="dealBadge"
                  value={detail.metadata?.dealBadge || "—"}
                  disabled
                />

                <FormInput
                  label="Deal Source"
                  name="dealSource"
                  value={display(detail.metadata?.dealSource)}
                  disabled
                />

                <FormInput
                  label="Max Quantity / Customer"
                  name="maxQuantity"
                  value={detail.maxQuantityPerOrder || "—"}
                  disabled
                />
              </div>
            </FormSection>

            {/* ==================== Pricing ==================== */}
            <FormSection
              title="Pricing & Discount"
              description="Deal price and discount information."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label="Original Price"
                  name="originalPrice"
                  value={money(detail.originalPrice)}
                  disabled
                />

                <FormInput
                  label="Deal Price"
                  name="dealPrice"
                  value={money(detail.dealPrice)}
                  disabled
                />

                <FormInput
                  label="Discount Amount"
                  name="discountAmount"
                  value={money(discountAmount(detail))}
                  disabled
                />

                <FormInput
                  label="Discount Percentage"
                  name="discountPercentage"
                  value={`${discountPercent(detail)}%`}
                  disabled
                />
              </div>
            </FormSection>

            {/* ==================== Schedule & Quantity ==================== */}
            <FormSection
              title="Schedule & Quantity"
              description="Deal validity and available quantity."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label="Start"
                  name="startAt"
                  value={fmtDateTime(detail.startAt)}
                  disabled
                />

                <FormInput
                  label="End"
                  name="endAt"
                  value={fmtDateTime(detail.endAt)}
                  disabled
                />

                <FormInput
                  label="Allocated Quantity"
                  name="allocatedQuantity"
                  value={num(detail.allocatedQuantity)}
                  disabled
                />

                <FormInput
                  label="Remaining Quantity"
                  name="remainingQuantity"
                  value={remainingQty(detail)}
                  disabled
                />
              </div>
            </FormSection>

            {/* ==================== Notes ==================== */}
            {(detail.metadata?.sellerReason ||
              detail.metadata?.sellerMessage ||
              detail.description) && (
              <FormSection
                title="Notes"
                description="Additional information related to this deal."
              >
                <div className="space-y-4">
                  {detail.metadata?.sellerReason && (
                    <FormInput
                      label="Reason"
                      name="sellerReason"
                      value={detail.metadata.sellerReason}
                      disabled
                    />
                  )}

                  {detail.metadata?.sellerMessage && (
                    <FormInput
                      label="Seller Message"
                      name="sellerMessage"
                      value={detail.metadata.sellerMessage}
                      disabled
                    />
                  )}

                  {!detail.metadata?.sellerReason && detail.description && (
                    <FormInput
                      label="Description"
                      name="description"
                      value={detail.description}
                      disabled
                    />
                  )}
                </div>
              </FormSection>
            )}

            {/* ==================== History ==================== */}

            <div className="space-y-3">
              {(detail.timeline || []).length ? (
                detail.timeline.map((event) => (
                  <div
                    key={event.id || `${event.event_type}-${event.created_at}`}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                  >
                    <p className="text-sm font-semibold text-[var(--admin-ink)]">
                      {display(event.event_type)}
                    </p>

                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      {fmtDateTime(event.created_at)} ·{" "}
                      {event.actor_role || "system"}
                    </p>

                    {event.reason && (
                      <p className="mt-2 text-xs text-gray-600">
                        <span className="font-medium">Reason:</span>{" "}
                        {event.reason}
                      </p>
                    )}

                    {event.note && (
                      <p className="mt-1 text-xs text-gray-600">
                        <span className="font-medium">Note:</span> {event.note}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-[var(--admin-muted)]">
                  No history recorded.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DefaultModal>

      <ConfirmModal
        isOpen={confirm.open}
        title={`${display(confirm.action)} Deal`}
        description={`Are you sure you want to ${display(confirm.action).toLowerCase()} this deal?`}
        onConfirm={submitAction}
        onCancel={closeConfirm}
        loading={actionLoading}
        confirmLabel={display(confirm.action)}
        variant={
          ["approve", "resume"].includes(confirm.action) ? "success" : "danger"
        }
      >
        {["reject", "cancel"].includes(confirm.action) && (
          <div className="mt-3">
            <Input
              label="Reason *"
              value={confirm.reason}
              onChange={(event) =>
                setConfirm((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
            />
          </div>
        )}
        {["approve", "pause", "resume"].includes(confirm.action) && (
          <div className="mt-3">
            <Input
              label="Note"
              value={confirm.note}
              onChange={(event) =>
                setConfirm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
            />
          </div>
        )}
      </ConfirmModal>
    </div>
  );
};

export default DealManagement;
