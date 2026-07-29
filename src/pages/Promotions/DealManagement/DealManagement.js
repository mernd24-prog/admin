/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  MdRefresh,
  MdSearch,
  MdVisibility,
} from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import DefaultModal from "../../../components/Atoms/Modal/DefaultRightSideModal";
import Input from "../../../components/Atoms/Input/Input";
import FilterSelect from "../../../components/Atoms/FilterSelect/FilterSelect";
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
import { ACTIONS } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { axiosPrivate } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { isAdminPanel, isSellerPanel } from "../../../_helpers/panelConfig";
import { formatDateTime12Hour } from "../../../utils/formatters";

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
    label: "Seller",
    width: "w-52",
    load: (search) =>
      dropdownApi.getSellers({
        keyWord: search,
        searchFields: "full_name,email,businessName",
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
    total: Number(data?.total || data?.list?.length || data?.items?.length || 0),
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
const getProductId = (product = {}) => product._id || product.id || product.productId;
const remainingQty = (deal = {}) =>
  Math.max(0, num(deal.allocatedQuantity) - num(deal.soldQuantity) - num(deal.reservedQuantity));
const discountAmount = (deal = {}) => Math.max(0, num(deal.originalPrice) - num(deal.dealPrice));
const discountPercent = (deal = {}) =>
  num(deal.originalPrice) > 0
    ? ((discountAmount(deal) / num(deal.originalPrice)) * 100).toFixed(1)
    : "0.0";

const normalizeProduct = (product = {}) => {
  const price = product.salePrice ?? product.sellingPrice ?? product.price ?? product.mrp ?? "";
  const stock = product.availableStock ?? product.stock ?? product.inventory?.available ?? product.inventory?.stock ?? "";
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

function MetricCard({ icon, label, value, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-50 text-slate-700",
  };
  return (
    <div className="rounded-md border border-[var(--admin-line)] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-[var(--admin-muted)]">{label}</p>
          <p className="mt-1 text-xl font-semibold text-[var(--admin-ink)]">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-md ${tones[tone] || tones.blue}`}>
          {icon}
        </span>
      </div>
    </div>
  );
}

function ProductSearch({ sellerId, value, onSelect }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const requestRef = useRef(0);

  const searchProducts = useCallback(async (search = "") => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    try {
      const trimmed = search.trim();
      const response = await axiosPrivate.get(ENDPOINTS.products.listForPanel, {
        params: {
          q: trimmed || undefined,
          search: trimmed || undefined,
          keyWord: trimmed || undefined,
          sellerId: sellerId || undefined,
          limit: 10,
          includeVariants: true,
          includeAllStatuses: true,
        },
      });
      if (requestRef.current === requestId) {
        setItems(
          unwrapApiItems(response)
            .map(normalizeProduct)
            .sort((left, right) => Number(right.isDealProduct) - Number(left.isDealProduct)),
        );
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to search products");
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(query), 250);
    return () => clearTimeout(timer);
  }, [query, sellerId, searchProducts]);

  return (
    <div className="admin-field">
      <label className="admin-label">Existing Product <span className="admin-required">*</span></label>
      <div className="relative">
        <MdSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onFocus={() => setIsListOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsListOpen(true);
          }}
          className="admin-input w-full !pl-9"
          placeholder={value?.label || "Search product name or SKU"}
        />
      </div>
      {value?.label && !isListOpen ? (
        <div className="mt-2 rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-3 py-2 text-sm text-[var(--admin-ink)]">
          <span className="block truncate font-medium">{value.label}</span>
          <span className="block truncate text-xs text-[var(--admin-muted)]">
            {value.sku || "No SKU"} · Stock {value.stock || 0}
          </span>
        </div>
      ) : null}
      {isListOpen && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-[var(--admin-line)] bg-white">
          {loading ? (
            <div className="px-3 py-4 text-center text-xs text-[var(--admin-muted)]">Loading products...</div>
          ) : items.length ? (
            items.map((item) => {
              const selected = String(value?.id || "") === String(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(item);
                    setQuery("");
                    setIsListOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-[var(--admin-blue-soft)] ${
                    selected ? "bg-[var(--admin-blue-soft)] text-[var(--admin-blue)]" : "text-[var(--admin-ink)]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{item.label}</span>
                    <span className="block truncate text-xs text-[var(--admin-muted)]">
                      {item.sku || "No SKU"} · Stock {item.stock || 0}
                    </span>
                    {item.isDealProduct && (
                      <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {item.dealBadge || "Deal"}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs font-semibold">{money(item.price)}</span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-4 text-center text-xs text-[var(--admin-muted)]">
              Search and select an existing product.
            </div>
          )}
        </div>
      )}
    </div>
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
  const selector = useSelector((state) => state.adminCore);
  const payload = unwrapList(selector.dealsData);
  const analytics = selector.dealAnalyticsData?.data?.data || selector.dealAnalyticsData?.data || {};
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
  const [confirm, setConfirm] = useState({ open: false, action: "", deal: null, reason: "", note: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = toQueryParams();
      await dispatch(
        getDeals({
          ...params,
          status: activeTab && activeTab !== "product_keys" ? activeTab : params.status,
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

  const openDetail = useCallback(async (deal) => {
    setDetail(deal);
    setDetailLoading(true);
    try {
      const res = await dispatch(getDeal({ dealId: getDealId(deal) })).unwrap();
      setDetail(res?.data?.data || res?.data || deal);
    } catch (err) {
      toast.error(err?.message || err || "Failed to load deal detail");
    } finally {
      setDetailLoading(false);
    }
  }, [dispatch]);

  const openForm = (mode = isSellerPanel() ? "seller_request" : "admin_direct") => {
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
    setSelectedSeller(deal.sellerId ? {
      value: deal.sellerId,
      label: getRowSellerName(deal) || deal.sellerName || deal.sellerId,
    } : null);
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
      startAt: deal.startAt ? moment(deal.startAt).format("YYYY-MM-DDTHH:mm") : "",
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
      originalPrice: product.price === "" ? current.originalPrice : product.price,
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
    setForm((current) => {
      const nextSellerId = seller?.value || "";
      const sellerChanged = String(current.sellerId || "") !== String(nextSellerId || "");
      return {
        ...current,
        sellerId: nextSellerId,
        ...(sellerChanged
          ? {
              productId: "",
              productLabel: "",
              originalPrice: "",
              allocatedQuantity: "",
              category: "",
            }
          : {}),
      };
    });
    if (!seller?.value || String(form.sellerId || "") !== String(seller.value)) {
      setSelectedProduct(null);
    }
  };

  const formDeal = useMemo(() => ({
    originalPrice: form.originalPrice,
    dealPrice: form.dealPrice,
  }), [form.originalPrice, form.dealPrice]);

  const validateForm = () => {
    if (isAdminPanel() && !form.sellerId) return "Select seller.";
    if (!form.productId) return "Select an existing product.";
    if (!form.title.trim()) return "Enter deal title.";
    if (!num(form.originalPrice)) return "Original price is required.";
    if (!num(form.dealPrice)) return "Deal price is required.";
    if (num(form.dealPrice) >= num(form.originalPrice)) {
      return "Deal price must be lower than original price.";
    }
    if (num(form.allocatedQuantity) < 0) return "Deal quantity cannot be negative.";
    if (selectedProduct?.stock !== "" && num(form.allocatedQuantity) > num(selectedProduct?.stock)) {
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
    status: editingDeal ? editingDeal.status : form.mode === "admin_direct" && isAdminPanel() ? "active" : "draft",
    originalPrice: num(form.originalPrice),
    dealPrice: num(form.dealPrice),
    allocatedQuantity: Number(form.allocatedQuantity || 0),
    maxQuantityPerOrder: form.maxQuantityPerOrder ? Number(form.maxQuantityPerOrder) : null,
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
        await dispatch(updateDeal({ dealId: getDealId(editingDeal), ...buildDealPayload() })).unwrap();
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
        toast.success("Direct deal created without changing product master price");
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
      active: analytics.activeDeals ?? listData.filter((deal) => deal.status === "active").length,
      scheduled: analytics.scheduledDeals ?? listData.filter((deal) => deal.status === "scheduled").length,
      expired: analytics.expiredDeals ?? listData.filter((deal) => deal.status === "expired").length,
      revenue: analytics.revenueFromDeals ?? analytics.revenue ?? 0,
      units: analytics.unitsSold ?? listData.reduce((sum, deal) => sum + num(deal.soldQuantity), 0),
    };
  }, [analytics, payload]);

  const tableRows = useMemo(() => {
    const deals = payload.list || [];
    const dealProductIds = new Set(deals.map((deal) => String(deal.productId || "")));
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
            if (option.value) next[String(option.value)] = sellerLookupFromOption(option);
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
          <p className="font-mono text-xs font-semibold text-[var(--admin-ink)]">{value || getDealId(row)}</p>
          <p className="text-xs text-[var(--admin-muted)]">{display(row.metadata?.dealSource || "seller_request")}</p>
        </div>
      ),
    },
    {
      key: "title",
      label: "Product",
      sortable: true,
      render: (value, row) => (
        <div className="max-w-[220px]">
          <p className="truncate font-medium text-gray-800">{row.metadata?.productLabel || value || "—"}</p>
          <p className="truncate text-xs text-gray-500">{row.category || display(row.dealType)}</p>
        </div>
      ),
    },
    {
      key: "sellerId",
      label: "Seller",
      render: (value, row) => {
        const seller = sellerLookup[String(value || "")] || {};
        const sellerName = getRowSellerName(row) || seller.label || value || "—";
        return (
          <div className="max-w-[180px]">
            <p className="truncate text-sm font-medium text-gray-800">{sellerName}</p>
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
      render: (value) => <span className="text-sm line-through decoration-red-400">{money(value)}</span>,
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
          <p>Allocated: <strong>{num(row.allocatedQuantity)}</strong></p>
          <p>Sold: <strong>{num(row.soldQuantity)}</strong></p>
          <p>Remaining: <strong>{remainingQty(row)}</strong></p>
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
      render: (value) => <StatusBadge status={value} color={STATUS_COLOR[value] || "gray"} />,
    },
    {
      key: "_actions",
      label: "Actions",
      render: (_, row) => {
        const status = row.status;
        return (
          <div className="flex flex-wrap gap-1">
            {row._rowType === "product_deal_key" ? (
              <button onClick={() => openFormFromProduct(row)} className="px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded" title="Create Deal">
                Create Deal
              </button>
            ) : (
              <>
                <button onClick={() => openDetail(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View">
                  <MdVisibility size={18} />
                </button>
                <button onClick={() => openEditDeal(row)} className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Edit">
                  <MdEdit size={18} />
                </button>
              </>
            )}
            <PermissionGuard module="deals" action={ACTIONS.APPROVE} hide>
              {row._rowType !== "product_deal_key" && ["pending_approval", "draft"].includes(status) && isAdminPanel() && (
                <button onClick={() => openConfirm("approve", row)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve">
                  <MdCheckCircle size={18} />
                </button>
              )}
            </PermissionGuard>
            <PermissionGuard module="deals" action={ACTIONS.REJECT} hide>
              {row._rowType !== "product_deal_key" && !["expired", "completed", "cancelled", "rejected"].includes(status) && isAdminPanel() && (
                <button onClick={() => openConfirm("reject", row)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject">
                  <MdClose size={18} />
                </button>
              )}
            </PermissionGuard>
            <PermissionGuard module="deals" action={ACTIONS.STATUS_CHANGE} hide>
              {row._rowType !== "product_deal_key" && status === "active" && isAdminPanel() && (
                <button onClick={() => openConfirm("pause", row)} className="p-1 text-yellow-600 hover:bg-yellow-50 rounded" title="Pause">
                  <MdPause size={18} />
                </button>
              )}
              {row._rowType !== "product_deal_key" && status === "paused" && isAdminPanel() && (
                <button onClick={() => openConfirm("resume", row)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Resume">
                  <MdPlayArrow size={18} />
                </button>
              )}
              {row._rowType !== "product_deal_key" && ["draft", "pending_approval", "active", "paused", "scheduled"].includes(status) && (
                <button onClick={() => openConfirm("cancel", row)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Cancel">
                  <MdClose size={18} />
                </button>
              )}
            </PermissionGuard>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Deal Product Management"
        subtitle="Convert existing products into temporary deals without changing Product Master pricing"
        actions={
          <>
            <button onClick={fetchDeals}>
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="deals" action={ACTIONS.CREATE} hide>
              <button onClick={() => openForm(isSellerPanel() ? "seller_request" : "admin_direct")}>
                <MdAdd size={17} /> {isSellerPanel() ? "Request Deal" : "Create Deal"}
              </button>
            </PermissionGuard>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard icon={<MdLocalOffer size={20} />} label="Deal Products" value={metrics.total} />
        <MetricCard icon={<MdCheckCircle size={20} />} label="Active" value={metrics.active} tone="green" />
        <MetricCard icon={<MdHistory size={20} />} label="Scheduled" value={metrics.scheduled} tone="amber" />
        <MetricCard icon={<MdClose size={20} />} label="Expired" value={metrics.expired} tone="slate" />
        <MetricCard icon={<MdBarChart size={20} />} label="Units Sold" value={metrics.units} tone="blue" />
        <MetricCard icon={<MdBarChart size={20} />} label="Deal Revenue" value={money(metrics.revenue)} tone="green" />
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-[var(--admin-line)]">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              list.setPage?.(1);
            }}
            className={`min-h-10 shrink-0 border-b-2 px-3 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "border-[var(--admin-blue)] text-[var(--admin-blue)]"
                : "border-transparent text-[var(--admin-muted)] hover:text-[var(--admin-ink)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <FilterBar fields={FILTER_FIELDS} listPage={list} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={tableRows}
        total={activeTab === "product_keys" ? tableRows.length : payload.total + (activeTab ? 0 : Math.max(0, tableRows.length - payload.list.length))}
        listPage={list}
        loading={loading}
        rowKey={(row) => getDealId(row) || getProductId(row)}
        emptyMessage="No deal products found"
        tableContainerClassName="overflow-x-auto"
      />

      <DefaultModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingDeal(null);
        }}
        isButtonView={false}
        title={editingDeal ? "Edit Deal Product" : form.mode === "seller_request" ? "Request Deal Product" : "Create Direct Deal"}
      >
        <div className="space-y-5 p-4">
          {isAdminPanel() && <SellerSearch value={selectedSeller} onSelect={onSellerSelect} />}

          <ProductSearch sellerId={form.sellerId} value={selectedProduct} onSelect={onProductSelect} />

          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Deal Title" value={form.title} onChange={(event) => setField("title", event.target.value)} required />
            <Input
              label="Deal Type"
              type="select"
              value={form.dealType}
              options={DEAL_TYPES}
              onChange={(option) => setField("dealType", option?.value || "fixed_price")}
            />
            <Input label="Original Price" type="price" value={form.originalPrice} readOnly helperText="Copied for deal snapshot only." />
            <Input label="Deal Price" type="price" value={form.dealPrice} onChange={(event) => setField("dealPrice", event.target.value)} required />
            <Input label="Discount Amount" value={money(discountAmount(formDeal))} readOnly />
            <Input label="Discount Percentage" value={`${discountPercent(formDeal)}%`} readOnly />
            <Input label="Deal Quantity Allocation" type="number" value={form.allocatedQuantity} onChange={(event) => setField("allocatedQuantity", event.target.value)} />
            <Input label="Maximum Quantity Per Customer" type="number" value={form.maxQuantityPerOrder} onChange={(event) => setField("maxQuantityPerOrder", event.target.value)} />
            <Input label="Deal Start" type="datetime-local" value={form.startAt} onChange={(event) => setField("startAt", event.target.value)} required />
            <Input label="Deal End" type="datetime-local" value={form.endAt} onChange={(event) => setField("endAt", event.target.value)} required />
            <Input
              label="Deal Source"
              type="select"
              value={form.dealSource}
              options={DEAL_SOURCES}
              onChange={(option) => setField("dealSource", option?.value || "admin_direct")}
            />
            <Input
              label="Deal Badge"
              type="select"
              value={form.dealBadge}
              options={DEAL_BADGES.map((badge) => ({ label: badge, value: badge }))}
              onChange={(option) => setField("dealBadge", option?.value || "")}
            />
            <Input label="Priority" type="number" value={form.priority} onChange={(event) => setField("priority", event.target.value)} />
          </div>

          {form.mode === "seller_request" && (
            <Input
              label="Reason"
              type="textarea"
              value={form.reason}
              onChange={(event) => setField("reason", event.target.value)}
              placeholder="Why should this product become a deal?"
              required
            />
          )}
          {form.mode === "seller_request" && (
            <Input
              label="Optional Message"
              type="textarea"
              value={form.message}
              onChange={(event) => setField("message", event.target.value)}
              placeholder="Add any context for admin."
            />
          )}

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            This creates a deal record for the selected existing product. It does not create a new product and does not update Product Master price.
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--admin-line)] pt-4">
            <button type="button" className="admin-btn-secondary" onClick={() => {
              setFormOpen(false);
              setEditingDeal(null);
            }}>Cancel</button>
            <button type="button" className="admin-btn-primary" onClick={submitForm} disabled={submitLoading}>
              {submitLoading ? "Saving..." : editingDeal ? "Update Deal" : form.mode === "seller_request" ? "Submit Request" : "Activate Deal"}
            </button>
          </div>
        </div>
      </DefaultModal>

      <DefaultModal isOpen={!!detail} onClose={() => setDetail(null)} title="Deal Product Detail" isButtonView={false}>
        {!detail && detailLoading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Loader />
          </div>
        ) : detail ? (
          <div className="space-y-5 p-4">
            {detailLoading ? (
              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                Loading latest deal details...
              </div>
            ) : null}
            <div className="rounded-md border border-[var(--admin-line)] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--admin-ink)]">{detail.metadata?.productLabel || detail.title}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{detail.dealNumber || getDealId(detail)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={detail.status} color={STATUS_COLOR[detail.status] || "gray"} />
                  <button
                    type="button"
                    className="rounded p-1 text-amber-600 transition hover:bg-amber-50"
                    title="Edit Deal"
                    onClick={() => {
                      openEditDeal(detail);
                      setDetail(null);
                    }}
                  >
                    <MdEdit size={18} />
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500">Original Price</p><p className="line-through">{money(detail.originalPrice)}</p></div>
                <div><p className="text-gray-500">Deal Price</p><p className="font-semibold text-emerald-700">{money(detail.dealPrice)}</p></div>
                <div><p className="text-gray-500">Discount</p><p>{money(discountAmount(detail))} ({discountPercent(detail)}%)</p></div>
                <div><p className="text-gray-500">Deal Badge</p><p>{detail.metadata?.dealBadge || "—"}</p></div>
                <div><p className="text-gray-500">Start</p><p>{fmtDateTime(detail.startAt)}</p></div>
                <div><p className="text-gray-500">End</p><p>{fmtDateTime(detail.endAt)}</p></div>
                <div><p className="text-gray-500">Allocated</p><p>{num(detail.allocatedQuantity)}</p></div>
                <div><p className="text-gray-500">Remaining</p><p>{remainingQty(detail)}</p></div>
                <div><p className="text-gray-500">Deal Source</p><p>{display(detail.metadata?.dealSource)}</p></div>
                <div><p className="text-gray-500">Max/customer</p><p>{detail.maxQuantityPerOrder || "—"}</p></div>
              </div>
            </div>

            {(detail.metadata?.sellerReason || detail.metadata?.sellerMessage || detail.description) && (
              <div className="rounded-md border border-[var(--admin-line)] bg-white p-4 text-sm">
                <p className="mb-2 font-semibold text-[var(--admin-ink)]">Notes</p>
                {detail.metadata?.sellerReason && <p><span className="text-gray-500">Reason:</span> {detail.metadata.sellerReason}</p>}
                {detail.metadata?.sellerMessage && <p><span className="text-gray-500">Seller message:</span> {detail.metadata.sellerMessage}</p>}
                {!detail.metadata?.sellerReason && detail.description && <p>{detail.description}</p>}
              </div>
            )}

            <div className="rounded-md border border-[var(--admin-line)] bg-white p-4">
              <p className="mb-3 font-semibold text-[var(--admin-ink)]">History</p>
              <div className="space-y-3">
                {(detail.timeline || []).length ? detail.timeline.map((event) => (
                  <div key={event.id || `${event.event_type}-${event.created_at}`} className="border-l-2 border-[var(--admin-blue)] pl-3 text-sm">
                    <p className="font-medium">{display(event.event_type)}</p>
                    <p className="text-xs text-[var(--admin-muted)]">{fmtDateTime(event.created_at)} · {event.actor_role || "system"}</p>
                    {event.reason && <p className="mt-1 text-xs">Reason: {event.reason}</p>}
                    {event.note && <p className="mt-1 text-xs">Note: {event.note}</p>}
                  </div>
                )) : (
                  <p className="text-sm text-[var(--admin-muted)]">No history recorded.</p>
                )}
              </div>
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
        confirmVariant={["approve", "resume"].includes(confirm.action) ? "success" : "danger"}
      >
        {["reject", "cancel"].includes(confirm.action) && (
          <div className="mt-3">
            <Input label="Reason *" value={confirm.reason} onChange={(event) => setConfirm((current) => ({ ...current, reason: event.target.value }))} />
          </div>
        )}
        {["approve", "pause", "resume"].includes(confirm.action) && (
          <div className="mt-3">
            <Input label="Note" value={confirm.note} onChange={(event) => setConfirm((current) => ({ ...current, note: event.target.value }))} />
          </div>
        )}
      </ConfirmModal>
    </div>
  );
};

export default DealManagement;
