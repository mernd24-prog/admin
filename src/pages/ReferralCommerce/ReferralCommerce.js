import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useFormik } from "formik";
import { useParams, useNavigate } from "react-router-dom";
import {
  BadgeIndianRupee,
  Check,
  Eye,
  ExternalLink,
  GitBranch,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  UploadCloud,
  MoreVertical,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import useDropdownOptions from "../../hooks/useDropdownOptions";
import {
  approveReferralPayout,
  createReferralBonusRule,
  createReferralChild,
  createReferralCode,
  createReferralParent,
  evaluateReferralBonusRules,
  getReferralBonusAchievements,
  getReferralBonusProgress,
  getReferralBonusRules,
  getReferralCodes,
  getReferralCommissions,
  getReferralFraudReviews,
  getReferralHierarchy,
  getReferralInfluencers,
  getReferralOrders,
  getReferralPayouts,
  getReferralRules,
  getReferralSummary,
  markReferralPayoutPaid,
  rejectReferralPayout,
  updateReferralCode,
  updateReferralBonusRule,
  updateReferralRules,
} from "../../Redux/referralCommerceSlice";
import { formatDateTime12Hour, formatLabel } from "../../utils/formatters";
import { uploadDocumentFile } from "../../_helpers/globalFunctions";
import {
  brandAssociateValidationSchema,
  parentInfluencerValidationSchema,
  referralCodeValidationSchema,
} from "../../_helpers/validationSchemas";
import { axiosPrivate } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import OrangeButton from "../../components/Atoms/buttons/OrangeButton";
import FilterSelect from "../../components/Atoms/FilterSelect/FilterSelect";
import {
  FilterBar,
  OrderLink,
  PageHeader,
  SummaryCard,
} from "../../components/Shared";
import SharedDataTable from "../../components/Shared/DataTable";
import DefaultModal from "../../components/Atoms/Modal/DefaultRightSideModal";
import FormSection from "../../components/Atoms/FormSection/FormSection";
import FormInput from "../../components/Atoms/FormInput/FormInput";
import FormToggleRow from "../../components/Atoms/FormToggleRow/FormToggleRow";
import FormSelectGroup from "../../components/Atoms/FormSelectGroup/FormSelectGroup";
import ToggleButton from "../../components/Atoms/ToggleButton/ToggleButton";
import {
  resolveProductStoreId,
  resolveProductStoreName,
  resolveStoreKey,
} from "./referralProductStoreUtils";
import Tabs from "../../components/Shared/Tabs";
import { DateRangeFilter } from "../../components/Shared/FilterBar";
import Loader, { ButtonLoader } from "../../components/Loader/Loader";
import ButtonTransparent from "../../components/Atoms/ButtonTransparent/button";
import Cards from "../../components/Cards/Cards";
import { SkeletonLoader } from "../../components/Loader/SkeletonLoader";

const influencerPortalUrl =
  process.env.REACT_APP_INFLUENCER_PORTAL_URL ||
  process.env.VITE_INFLUENCER_PORTAL_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:5173/login`
    : "http://localhost:5173/login");

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "influencers", label: "Referral Partners" },
  { key: "rules", label: "Rules & Coins" },
  { key: "productAmounts", label: "Product Referral Amounts" },
  { key: "bonuses", label: "Bonuses" },
  { key: "orders", label: "Referral Orders" },

  { key: "payouts", label: "Payout Requests" },
  { key: "hierarchy", label: "Hierarchy" },
  { key: "fraud", label: "Fraud Review" },
];

const sectionToTab = Object.fromEntries(
  tabs.map((tab) => [
    tab.key.replace(/([A-Z])/g, "-$1").toLowerCase(),
    tab.key,
  ]),
);
sectionToTab["bonus-rules"] = "bonuses";
sectionToTab["bonus-progress"] = "bonuses";
sectionToTab["bonus-history"] = "bonuses";

const FILTER_STATUSES = {
  influencers: ["pending", "active", "suspended", "rejected"],
  codes: ["active", "inactive", "expired", "suspended"],
  bonuses: ["active", "inactive", "locked", "released", "reversed"],
  orders: ["pending", "completed", "cancelled", "refunded", "reversed"],

  payouts: [
    "pending",
    "approved",
    "rejected",
    "processing",
    "paid",
    "failed",
    "cancelled",
  ],
  fraud: ["open", "reviewing", "resolved", "dismissed"],
};

const MARKETING_PAGE_META = {
  overview: {
    title: "Marketing Overview",
    subtitle: "Monitor referral commerce performance and activity",
  },
  influencers: {
    title: "Referral Partners",
    subtitle: "Manage Growth Partners and Brand Associates",
  },

  rules: {
    title: "Rules & Coins",
    subtitle: "Configure referral rewards, coin values, and withdrawal rules",
  },
  productAmounts: {
    title: "Product Referral Amounts",
    subtitle: "Override only the referral pool amount for selected products",
  },
  bonuses: {
    title: "Bonuses",
    subtitle: "Manage bonus rules, progress, and achievement history",
  },
  orders: {
    title: "Referral Orders",
    subtitle: "View and manage orders placed through referral codes",
  },

  payouts: {
    title: "Payout Requests",
    subtitle: "Review and manage referral partner payout requests",
  },

  fraud: {
    title: "Fraud Review",
    subtitle: "Review and manage flagged referral activity",
  },
};
const emptyInfluencerForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  code: "",
  canCreateChildren: true,
};

const emptyCodeForm = {
  influencerId: "",
  code: "",
  status: "active",
  usageLimit: "",
};

const emptyChildForm = {
  ...emptyInfluencerForm,
  canCreateChildren: false,
  parentId: "",
};

const emptyRulesForm = {
  distributionType: "percentage",
  referralPoolAmount: 0,
  referralPoolPercent: 10,
  maximumReferralPoolAmount: 0,
  coinValue: 1,
  coinExpiryDays: 365,
  coinUsage: "wallet",
  customerSharePercent: 50,
  childSharePercent: 30,
  parentSharePercent: 20,
  releaseDelayDays: 7,
  minimumWithdrawalCoins: 0,
  maximumWithdrawalCoins: 0,
  dailyWithdrawalLimitCoins: 0,
  monthlyWithdrawalLimitCoins: 0,
  withdrawalKycRequired: true,
  withdrawalApprovalMode: "manual",
  withdrawalMethods: ["upi", "bank", "manual"],
  referralCodePrefix: "REF",
  referralCodeRandomLength: 6,
  referralCodeCharacterSet: "alphanumeric",
  minOrderAmount: 0,
  active: true,
  effectiveFrom: "",
  effectiveTo: "",
  metadata: "{}",
};

const validateRulesForm = (form) => {
  const errors = {};
  const number = (
    name,
    label,
    { min = 0, max, integer = false, positive = false } = {},
  ) => {
    const raw = form[name];
    const value = Number(raw);
    if (
      raw === "" ||
      raw === null ||
      raw === undefined ||
      !Number.isFinite(value)
    ) {
      errors[name] = `${label} is required and must be a valid number.`;
    } else if (positive && value <= 0) {
      errors[name] = `${label} must be greater than 0.`;
    } else if (value < min || (max !== undefined && value > max)) {
      errors[name] =
        max === undefined
          ? `${label} must be ${min} or greater.`
          : `${label} must be between ${min} and ${max}.`;
    } else if (integer && !Number.isInteger(value)) {
      errors[name] = `${label} must be a whole number.`;
    }
  };

  if (!["fixed_amount", "percentage"].includes(form.distributionType))
    errors.distributionType = "Select a valid distribution type.";
  if (form.distributionType === "fixed_amount")
    number("referralPoolAmount", "Referral pool amount", { positive: true });
  else
    number("referralPoolPercent", "Referral pool percentage", {
      positive: true,
      max: 100,
    });
  number("maximumReferralPoolAmount", "Maximum referral pool", { min: 0 });
  number("coinValue", "INR per coin", { positive: true });
  number("coinExpiryDays", "Coin expiry days", { min: 0, integer: true });
  number("minOrderAmount", "Minimum eligible order amount", { min: 0 });
  if (!["wallet", "discount", "both"].includes(form.coinUsage))
    errors.coinUsage = "Select a valid coin usage option.";

  [
    ["customerSharePercent", "Customer discount share"],
    ["childSharePercent", "Brand associate share"],
    ["parentSharePercent", "Growth partner share"],
  ].forEach(([name, label]) => number(name, label, { min: 0, max: 100 }));
  const shareTotal =
    Number(form.customerSharePercent) +
    Number(form.childSharePercent) +
    Number(form.parentSharePercent);
  if (Number.isFinite(shareTotal) && Math.abs(shareTotal - 100) > 0.000001)
    errors.shareTotal = "Distribution shares must total exactly 100%.";

  number("releaseDelayDays", "Release delay days", { min: 0, integer: true });
  [
    ["minimumWithdrawalCoins", "Minimum withdrawal coins"],
    ["maximumWithdrawalCoins", "Maximum withdrawal coins"],
    ["dailyWithdrawalLimitCoins", "Daily withdrawal limit"],
    ["monthlyWithdrawalLimitCoins", "Monthly withdrawal limit"],
  ].forEach(([name, label]) => number(name, label, { min: 0 }));
  const minimum = Number(form.minimumWithdrawalCoins);
  const maximum = Number(form.maximumWithdrawalCoins);
  const daily = Number(form.dailyWithdrawalLimitCoins);
  const monthly = Number(form.monthlyWithdrawalLimitCoins);
  if (maximum > 0 && maximum < minimum)
    errors.maximumWithdrawalCoins =
      "Maximum must be 0 (unlimited) or at least the minimum withdrawal.";
  if (daily > 0 && daily < minimum)
    errors.dailyWithdrawalLimitCoins =
      "Daily limit must be 0 (unlimited) or at least the minimum withdrawal.";
  if (monthly > 0 && monthly < minimum)
    errors.monthlyWithdrawalLimitCoins =
      "Monthly limit must be 0 (unlimited) or at least the minimum withdrawal.";
  if (daily > 0 && monthly > 0 && monthly < daily)
    errors.monthlyWithdrawalLimitCoins =
      "Monthly limit cannot be lower than the daily limit.";
  if (!["manual", "auto"].includes(form.withdrawalApprovalMode))
    errors.withdrawalApprovalMode = "Select a valid approval mode.";
  if (
    !Array.isArray(form.withdrawalMethods) ||
    form.withdrawalMethods.length === 0
  )
    errors.withdrawalMethods = "Select at least one withdrawal method.";

  if (
    !/^[A-Z0-9]*$/.test(String(form.referralCodePrefix || "").toUpperCase()) ||
    String(form.referralCodePrefix || "").length > 8
  )
    errors.referralCodePrefix = "Use up to 8 letters or numbers only.";
  number("referralCodeRandomLength", "Random character length", {
    min: 4,
    max: 16,
    integer: true,
  });
  if (
    !["alphanumeric", "numeric", "alphabetic"].includes(
      form.referralCodeCharacterSet,
    )
  )
    errors.referralCodeCharacterSet = "Select a valid character set.";
  if (form.effectiveFrom && Number.isNaN(Date.parse(form.effectiveFrom)))
    errors.effectiveFrom = "Enter a valid start date.";
  if (form.effectiveTo && Number.isNaN(Date.parse(form.effectiveTo)))
    errors.effectiveTo = "Enter a valid end date.";
  if (
    form.effectiveFrom &&
    form.effectiveTo &&
    new Date(form.effectiveTo) < new Date(form.effectiveFrom)
  )
    errors.effectiveTo = "End date must be on or after the start date.";
  try {
    const metadata = JSON.parse(form.metadata || "{}");
    if (!metadata || Array.isArray(metadata) || typeof metadata !== "object")
      errors.metadata = "Metadata must be a valid JSON object.";
  } catch (_error) {
    errors.metadata = "Metadata must be valid JSON, for example {}.";
  }
  return errors;
};

const emptyBonusRuleForm = {
  ruleName: "",
  period: "monthly",
  customStartAt: "",
  customEndAt: "",
  targetType: "order_value",
  targetValue: "",
  bonusType: "fixed_coins",
  bonusValue: "",
  applyTo: "code_owner",
  resetCycle: "monthly",
  releaseRule: "instantly_available",
  status: "active",
};

const getBranchPayload = (branch = {}) =>
  branch?.normalized?.data || branch?.data?.data || branch?.data || {};

const getBranchList = (branch = {}) => {
  const payload = getBranchPayload(branch);
  if (Array.isArray(payload)) return payload;
  return payload?.list || payload?.items || [];
};

const getId = (record = {}) =>
  record.id ||
  record._id ||
  record.influencerId ||
  record.codeId ||
  record.payoutId;
const shortId = (value) => (value ? String(value).slice(0, 12) : "-");

const fullName = (user = {}) => {
  const profile = user.profile || {};
  return (
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Referral Partner"
  );
};

const formatAmount = (value) =>
  `INR ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const formatCoins = (value) =>
  formatLabel(
    `${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })} coins`,
  );

const formatDate = (value) => formatDateTime12Hour(value, "-");

const humanize = (value) => formatLabel(value, "-");
const partnerTypeLabel = (value) =>
  value === "parent"
    ? "Growth Partner"
    : value === "child"
      ? "Brand Associate"
      : humanize(value);
const optionList = (options = [], fallbackValues = []) =>
  options.length
    ? options
    : fallbackValues.map((value) => ({ value, label: humanize(value) }));

const statusClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (
    [
      "active",
      "completed",
      "available",
      "paid",
      "approved",
      "resolved",
    ].includes(normalized)
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (
    ["pending", "locked", "payout_requested", "reviewing"].includes(normalized)
  ) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (
    [
      "suspended",
      "rejected",
      "reversed",
      "failed",
      "cancelled",
      "refunded",
      "dismissed",
    ].includes(normalized)
  ) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const StatusPill = ({ value }) => (
  <span
    className={`inline-flex max-w-full items-center rounded border px-2 py-1 text-xs font-medium ${statusClass(value)}`}
  >
    {formatLabel(value, "-")}
  </span>
);

const IconButton = ({
  title,
  onClick,
  children,
  variant = "plain",
  disabled = false,
}) => {
  const variants = {
    plain: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
    primary:
      "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  };
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded border transition ${variants[variant]} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
};

const RowActions = ({ actions = [] }) => {
  const visible = actions.filter((action) => action && !action.hidden);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = 190;
    const estimatedHeight = Math.min(visible.length * 38 + 16, 320);
    const left = Math.max(
      8,
      Math.min(window.innerWidth - width - 8, rect.right - width),
    );
    const belowTop = rect.bottom + 6;
    const top =
      belowTop + estimatedHeight > window.innerHeight
        ? Math.max(8, rect.top - estimatedHeight - 6)
        : belowTop;
    setPosition({ top, left });
  }, [visible.length]);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();

    const closeOutside = (event) => {
      if (
        !buttonRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const closeOnViewportChange = () => setOpen(false);

    document.addEventListener("mousedown", closeOutside);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [open, updatePosition]);

  if (!visible.length) return <span className="text-gray-400">-</span>;

  return (
    <div className="inline-flex" onClick={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        title="Actions"
        aria-label="Row actions"
        onClick={(event) => {
          event.stopPropagation();
          if (!open) updatePosition();
          setOpen((value) => !value);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-700"
      >
        <MoreVertical aria-hidden="true" size={18} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[1000] max-h-80 w-[190px] overflow-y-auto rounded-md border border-gray-200 bg-white p-1.5 shadow-xl"
            style={{ top: position.top, left: position.left }}
            onClick={(event) => event.stopPropagation()}
          >
            {visible.map((action, index) => (
              <button
                key={`${action.label || "action"}-${index}`}
                type="button"
                disabled={action.disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  action.onClick?.();
                }}
                className={`flex min-h-9 w-full items-center gap-2 rounded px-3 py-2 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  action.danger
                    ? "text-rose-600 hover:bg-rose-50"
                    : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                }`}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

const TextInput = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  min,
  max,
  minLength,
  maxLength,
  pattern,
  step,
  hint = "",
  required = false,
  error = "",
  onBlur,
}) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium uppercase text-gray-500">
      {label}
      {required ? <span className="admin-required">*</span> : null}
    </span>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      minLength={minLength}
      maxLength={maxLength}
      pattern={pattern}
      step={step}
      required={required}
      onBlur={onBlur}
      aria-invalid={Boolean(error)}
      className={`h-10 w-full rounded border bg-white px-3 text-sm text-gray-800 outline-none focus:border-indigo-400 ${error ? "border-red-400" : "border-gray-200"}`}
    />
    {error ? (
      <span className="admin-field-error" role="alert">
        {error}
      </span>
    ) : hint ? (
      <span className="mt-1 block text-xs font-normal text-gray-500">
        {hint}
      </span>
    ) : null}
  </label>
);

const SelectInput = ({
  label,
  name,
  value,
  onChange,
  options,
  children,
  required,
  placeholder,
  className = "",
  disabled = false,
  formatOptionLabel,
  error = "",
  onBlur,
}) => {
  const parsedOptions = useMemo(() => {
    if (options && Array.isArray(options)) return options;
    const flatChildren = [];
    const extractOptions = (nodes) => {
      React.Children.forEach(nodes, (child) => {
        if (!child) return;
        if (Array.isArray(child)) {
          extractOptions(child);
        } else if (React.isValidElement(child)) {
          let childLabel = child.props.children;
          if (Array.isArray(childLabel)) {
            childLabel = childLabel.join("");
          }
          flatChildren.push({
            value: child.props.value !== undefined ? child.props.value : "",
            label: String(
              childLabel !== undefined && childLabel !== null
                ? childLabel
                : child.props.value || "",
            ),
          });
        }
      });
    };
    extractOptions(children);
    return flatChildren;
  }, [options, children]);

  const selectedValue = useMemo(() => {
    return (
      parsedOptions.find((opt) => String(opt.value) === String(value ?? "")) ||
      null
    );
  }, [parsedOptions, value]);

  const handleChange = (selected) => {
    if (onChange) {
      onChange({
        target: {
          name,
          value: selected ? selected.value : "",
        },
      });
    }
  };

  return (
    <FilterSelect
      label={label}
      name={name}
      options={parsedOptions}
      value={selectedValue}
      onChange={handleChange}
      required={required}
      isDisabled={disabled}
      placeholder={
        placeholder ||
        (label ? `Select ${label.toLowerCase()}` : "Select option")
      }
      isSearchable={true}
      formatOptionLabel={
        formatOptionLabel ||
        ((option) => (
          <span className="block truncate text-[13px] leading-5">
            {option.label}
          </span>
        ))
      }
      error={error}
      onBlur={onBlur}
      className={className}
    />
  );
};

const Modal = ({ title, open, onClose, children, footer }) => {
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && onClose?.();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[rgba(31,27,95,0.35)] px-4 backdrop-blur-[2px]"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onClose?.()
      }
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="admin-card max-h-[90vh] w-full max-w-2xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <IconButton title="Close" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
const ProductReferralAmounts = () => {
  const empty = {
    storeId: "",
    storeKey: "",
    productId: "",
    productTitle: "",
    amountType: "fixed_amount",
    amountValue: "",
    maximumAmount: "",
    active: true,
  };

  const [form, setForm] = useState(empty);
  const [products, setProducts] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [totalCount, setTotalCount] = useState(0);

  const isEditMode = Boolean(form.productId);

  const unwrapList = (response) => {
    const value = response?.data?.data || response?.data || [];

    return Array.isArray(value)
      ? value
      : value.items || value.list || value.products || [];
  };

  const getProductStoreId = (product) => resolveProductStoreId(product);

  const getProductStoreName = (product) => resolveProductStoreName(product);

  const getProductStoreKey = (product) => resolveStoreKey(product);

  const getProductTitle = (product) => {
    return (
      product?.name || product?.title || product?.productName || getId(product)
    );
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [configResponse, productResponse] = await Promise.all([
        axiosPrivate.get(ENDPOINTS.referral.productAmounts, {
          params: {
            page: pagination.page,
            limit: pagination.limit,
          },
        }),

        axiosPrivate.get(ENDPOINTS.products.list, {
          params: {
            page: 1,
            limit: 200,
            status: "active",
          },
        }),
      ]);

      setConfigs(unwrapList(configResponse));
      setTotalCount(
        configResponse?.data?.data?.total ||
        configResponse?.data?.total ||
        unwrapList(configResponse).length
      );
      setProducts(unwrapList(productResponse));
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Unable to load product referral amounts",
      );
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    load();
  }, [load]);

  const storeOptions = useMemo(() => {
    const storeMap = new Map();

    products.forEach((product) => {
      const storeKey = getProductStoreKey(product);
      const storeName = getProductStoreName(product);

      if (!storeKey) return;

      if (!storeMap.has(storeKey)) {
        storeMap.set(storeKey, {
          label: storeName,
          value: storeKey,
        });
      }
    });

    return Array.from(storeMap.values());
  }, [products]);

  const storeProducts = useMemo(() => {
    if (!form.storeKey) {
      return [];
    }

    return products.filter(
      (product) => getProductStoreKey(product) === String(form.storeKey),
    );
  }, [products, form.storeKey]);

  const productOptions = useMemo(() => {
    return storeProducts.map((product) => ({
      label: getProductTitle(product),
      value: getId(product),
    }));
  }, [storeProducts]);

  const amountTypeOptions = [
    {
      label: "Fixed amount per unit",
      value: "fixed_amount",
    },
    {
      label: "Percentage of product line",
      value: "percentage",
    },
  ];

  const selectedProduct = useMemo(() => {
    if (!form.productId) {
      return null;
    }

    return (
      products.find(
        (product) => String(getId(product)) === String(form.productId),
      ) || null
    );
  }, [products, form.productId]);

  const selectedStore = useMemo(() => {
    return (
      storeOptions.find(
        (option) => String(option.value) === String(form.storeKey),
      ) || null
    );
  }, [storeOptions, form.storeKey]);

  const save = async (event) => {
    event.preventDefault();

    if (!form.storeKey) {
      toast.error("Please select a store");
      return;
    }

    if (!form.productId) {
      toast.error("Please select a product");
      return;
    }

    if (form.amountValue === "") {
      toast.error("Please enter the referral amount");
      return;
    }

    const amountValue = Number(form.amountValue);

    if (Number.isNaN(amountValue) || amountValue < 0) {
      toast.error("Referral amount must be a valid positive number");
      return;
    }

    if (form.amountType === "percentage" && amountValue > 100) {
      toast.error("Percentage must be between 0 and 100");
      return;
    }

    const maximumAmount =
      form.maximumAmount === "" ? 0 : Number(form.maximumAmount);

    if (Number.isNaN(maximumAmount) || maximumAmount < 0) {
      toast.error("Maximum pool amount must be a valid number");
      return;
    }

    try {
      setLoading(true);

      const actualStoreId = getProductStoreId(selectedProduct);

      const payload = {
        productId: form.productId,
        productTitle:
          getProductTitle(selectedProduct) || form.productTitle || "",
        amountType: form.amountType,
        amountValue,
        maximumAmount,
        active: form.active,
      };

      if (actualStoreId) {
        payload.storeId = actualStoreId;
      }

      await axiosPrivate.put(ENDPOINTS.referral.productAmounts, payload);

      toast.success(
        isEditMode
          ? "Product referral amount updated"
          : "Product referral amount saved",
      );

      setForm(empty);

      await load();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Unable to save product referral amount",
      );
    } finally {
      setLoading(false);
    }
  };

  const remove = async (config) => {
    try {
      setLoading(true);

      await axiosPrivate.delete(
        ENDPOINTS.referral.productAmount(getId(config)),
      );

      toast.success("Product override removed; global amount will apply");

      await load();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Unable to remove product referral amount",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (row) => {
    const product = products.find(
      (item) => String(getId(item)) === String(row.productId),
    );

    if (!product) {
      toast.error("Product details could not be found");
      return;
    }

    const storeKey = row.storeId || getProductStoreKey(product);

    const actualStoreId = row.storeId || getProductStoreId(product);

    setForm({
      storeId: actualStoreId ? String(actualStoreId) : "",

      storeKey: storeKey ? String(storeKey) : "",

      productId: row.productId ? String(row.productId) : "",

      productTitle: row.productTitle || getProductTitle(product) || "",

      amountType: row.amountType || "fixed_amount",

      amountValue: row.amountValue ?? "",

      maximumAmount: row.maximumAmount ?? "",

      active: row.active !== false,
    });
  };

  const handleCancelEdit = () => {
    setForm(empty);
  };

  const showInitialSkeleton = loading && !configs.length && !products.length;

  return (
    <>
      {/* <Loader loading={loading} label="Loading..." /> */}
      <section className="admin-card overflow-hidden">
        {/* Header */}
        <div className="border-b border-[var(--admin-line)] bg-white px-5 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-surface-soft)]">
                <span className="text-sm font-bold text-[var(--admin-navy)]">
                  %
                </span>
              </div>

              <h2 className="text-base font-bold text-[var(--admin-navy)]">
                Product Referral Pool Overrides
              </h2>
            </div>

            <p className="max-w-3xl text-xs leading-5 text-[var(--admin-muted)]">
              Configure the referral pool contribution for individual products.
              Select a store first to view only the products belonging to that
              store.
            </p>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={save} className="bg-[var(--admin-surface-soft)] p-5">
          <div className="rounded-xl border border-[var(--admin-line)] bg-white p-5">
            {/* Configuration Header */}
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--admin-navy)]">
                    {isEditMode ? "Edit Product Override" : "Referral Override"}
                  </h3>

                  {isEditMode && (
                    <span className="rounded-full bg-[var(--admin-surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-navy)]">
                      Edit Mode
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {isEditMode
                    ? "Update the referral pool configuration for this product."
                    : "Select a store first, then choose a product and define the pool contribution rules."}
                </p>
              </div>

              {/* Active Toggle */}
              {/* Active Toggle */}
              {/* Override Status */}
              <div className="flex shrink-0 items-center">
                <ButtonTransparent
                  type="button"
                  onClick={() => {
                    setForm((current) => ({
                      ...current,
                      active: !current.active,
                    }));
                  }}
                  isDisable={loading}
                  className={`!w-auto !space-x-2 !border !border-blue-500 !px-4 !py-2 !text-xs !font-semibold !text-blue-500 !rounded-md !hover:scale-100 ${
                    form.active
                      ? "!border-green-500 !text-green-600"
                      : "!border-blue-500 !text-blue-500"
                  }`}
                >
                  {/* Small toggle icon */}
                  <span
                    className={`relative inline-flex h-3.5 w-6 shrink-0 rounded-full border transition-colors ${
                      form.active
                        ? "border-green-500 bg-green-50"
                        : "border-blue-400 bg-white"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-2 w-2 rounded-full transition-transform ${
                        form.active
                          ? "translate-x-[11px] bg-green-500"
                          : "translate-x-0.5 bg-blue-500"
                      }`}
                    />
                  </span>

                  <span>{form.active ? "Active" : "Activate"}</span>
                </ButtonTransparent>
              </div>
            </div>

            {/* Form Fields */}
            {showInitialSkeleton ? (
              <div className="grid items-end gap-5 md:grid-cols-2 xl:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index}>
                    <SkeletonLoader height={12} width={120} />
                    <div className="mt-2">
                      <SkeletonLoader height={42} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid items-end gap-5 md:grid-cols-2 xl:grid-cols-5">
                {/* Store */}
                <FormSelectGroup
                  label="Store"
                  options={storeOptions}
                  value={
                    storeOptions.find(
                      (option) =>
                        String(option.value) === String(form.storeKey),
                    ) || null
                  }
                  onChange={(selectedOption) => {
                    const storeKey = selectedOption?.value || "";

                    setForm((current) => ({
                      ...current,
                      storeKey,
                      storeId: "",
                      productId: "",
                      productTitle: "",
                    }));
                  }}
                  placeholder="Select store"
                  isSearchable
                  isClearable
                  className="w-full"
                />

                {/* Product */}
                <FormSelectGroup
                  label="Product"
                  options={productOptions}
                  value={
                    productOptions.find(
                      (option) =>
                        String(option.value) === String(form.productId),
                    ) || null
                  }
                  onChange={(selectedOption) => {
                    const productId = selectedOption?.value || "";

                    const product = storeProducts.find(
                      (item) => String(getId(item)) === String(productId),
                    );

                    setForm((current) => ({
                      ...current,
                      productId,
                      productTitle: getProductTitle(product),
                      storeId: getProductStoreId(product),
                    }));
                  }}
                  placeholder={
                    form.storeKey ? "Select product" : "Select store first"
                  }
                  isDisabled={!form.storeKey}
                  isSearchable
                  isClearable
                  className="w-full"
                />

                {/* Amount Type */}
                <FormSelectGroup
                  label="Amount Type"
                  options={amountTypeOptions}
                  value={
                    amountTypeOptions.find(
                      (option) => option.value === form.amountType,
                    ) || null
                  }
                  onChange={(selectedOption) => {
                    setForm((current) => ({
                      ...current,
                      amountType: selectedOption?.value || "fixed_amount",
                    }));
                  }}
                  placeholder="Select amount type"
                  isSearchable={false}
                  className="w-full"
                />

                {/* Pool Amount */}
                <FormInput
                  label={
                    form.amountType === "percentage"
                      ? "Pool Percentage"
                      : "Pool Amount Per Unit (₹)"
                  }
                  name="amountValue"
                  type="number"
                  min="0"
                  max={form.amountType === "percentage" ? "100" : undefined}
                  step="0.01"
                  value={form.amountValue}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      amountValue: event.target.value,
                    }));
                  }}
                  className="w-full"
                />

                {/* Maximum Amount */}
                <FormInput
                  label="Maximum Pool Per Line (₹)"
                  name="maximumAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.maximumAmount}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      maximumAmount: event.target.value,
                    }));
                  }}
                  hint="0 means no additional limit."
                  className="w-full"
                />
              </div>
            )}

            {/* Selected Product Information */}
            {selectedProduct && (
              <div className="mt-5 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div>
                    <p className="text-[11px] font-medium text-[var(--admin-muted)]">
                      Store
                    </p>

                    <p className="text-xs font-semibold text-[var(--admin-navy)]">
                      {selectedStore?.label ||
                        getProductStoreName(selectedProduct)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-[var(--admin-muted)]">
                      Product
                    </p>

                    <p className="max-w-xl text-xs font-semibold text-[var(--admin-navy)]">
                      {getProductTitle(selectedProduct)}
                    </p>
                  </div>

                  {selectedProduct?.sku && (
                    <div>
                      <p className="text-[11px] font-medium text-[var(--admin-muted)]">
                        SKU
                      </p>

                      <p className="text-xs font-semibold text-[var(--admin-navy)]">
                        {selectedProduct.sku}
                      </p>
                    </div>
                  )}

                  {selectedProduct?.price !== undefined && (
                    <div>
                      <p className="text-[11px] font-medium text-[var(--admin-muted)]">
                        Price
                      </p>

                      <p className="text-xs font-semibold text-[var(--admin-navy)]">
                        ₹{Number(selectedProduct.price).toLocaleString("en-IN")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Referral Pool Preview */}
            {form.amountValue !== "" && (
              <div className="mt-4 rounded-lg border border-[var(--admin-line)] bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-[var(--admin-navy)]">
                      Referral Pool Preview
                    </p>

                    <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">
                      Estimated contribution based on the selected
                      configuration.
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--admin-navy)]">
                      {form.amountType === "percentage"
                        ? `${Number(form.amountValue || 0)}%`
                        : `₹${Number(form.amountValue || 0).toLocaleString(
                            "en-IN",
                            {
                              minimumFractionDigits: 2,
                            },
                          )}`}
                    </p>

                    <p className="text-[11px] text-[var(--admin-muted)]">
                      {form.amountType === "percentage"
                        ? "of product line"
                        : "per unit"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3 border-t border-[var(--admin-line)] pt-5">
              {showInitialSkeleton ? (
                <SkeletonLoader height={40} width={180} />
              ) : (
                <>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={loading}
                      className="rounded-md border border-[var(--admin-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--admin-navy)] transition hover:bg-[var(--admin-surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}

                  <OrangeButton
                    type="submit"
                    disabled={loading}
                    className="min-w-[180px]"
                  >
                    {loading ? (
                      <>
                        <ButtonLoader />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check aria-hidden="true" size={16} />
                        {isEditMode
                          ? "Update Product Amount"
                          : "Save Product Amount"}
                      </>
                    )}
                  </OrangeButton>
                </>
              )}
            </div>
          </div>
        </form>

        {/* Existing Overrides */}
        <div className="border-t border-[var(--admin-line)]">
          <div className="flex flex-col gap-1 border-b border-[var(--admin-line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--admin-navy)]">
                Existing Overrides
              </h3>

              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                Manage product-specific referral pool configurations.
              </p>
            </div>

            <div className="rounded-full bg-[var(--admin-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--admin-navy)]">
              {configs.length} {configs.length === 1 ? "Override" : "Overrides"}
            </div>
          </div>

          <SharedDataTable
            columns={[
              {
                key: "storeId",
                label: "Store",
                render: (value, row) => {
                  const product = products.find(
                    (item) => String(getId(item)) === String(row.productId),
                  );

                  return (
                    row.storeName ||
                    product?.organizationSnapshot?.storeDisplayName ||
                    product?.storeDisplayName ||
                    product?.organizationSnapshot?.legalBusinessName ||
                    "—"
                  );
                },
              },
              {
                key: "productTitle",
                label: "Product",
                className: "w-[280px] max-w-[280px]",
                render: (value) => (
                  <div className="max-w-[280px] truncate" title={value || "—"}>
                    {value || "—"}
                  </div>
                ),
              },
              {
                key: "amountType",
                label: "Type",
                render: (value) => formatLabel(value),
              },
              {
                key: "amountValue",
                label: "Pool Value",
                render: (value, row) => {
                  if (row.amountType === "percentage") {
                    return `${value}%`;
                  }

                  return `₹${Number(value || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })} / unit`;
                },
              },
              {
                key: "maximumAmount",
                label: "Maximum",
                render: (value) => {
                  if (Number(value || 0) === 0) {
                    return "No Limit";
                  }

                  return `₹${Number(value || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}`;
                },
              },
              {
                key: "active",
                label: "Status",
                render: (value) => (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      value
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {value ? "Active" : "Inactive"}
                  </span>
                ),
              },
            ]}
            data={configs}
            loading={loading}
            page={pagination.page}
            pageSize={pagination.limit}
            totalCount={totalCount}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            onPageSizeChange={(limit) =>
              setPagination((prev) => ({ ...prev, limit, page: 1 }))
            }
            rowActions={(row) => [
              {
                label: "Edit",
                icon: <Pencil aria-hidden="true" size={15} />,
                onClick: () => handleEdit(row),
              },
              {
                label: "Remove override",
                icon: <X aria-hidden="true" size={15} />,
                danger: true,
                onClick: () => remove(row),
              },
            ]}
            emptyText="No product referral amount found."
          />
        </div>
      </section>
    </>
  );
};

const ReferralCommerce = () => {
  const { section } = useParams();
  const navigate = useNavigate();
  const referralCodeStatuses = useDropdownOptions("referral-code-statuses");
  const referralDistributionTypes = useDropdownOptions(
    "referral-distribution-types",
  );
  const referralCoinUsageModes = useDropdownOptions(
    "referral-coin-usage-modes",
  );
  const referralWithdrawalApprovalModes = useDropdownOptions(
    "referral-withdrawal-approval-modes",
  );
  const referralWithdrawalMethods = useDropdownOptions(
    "referral-withdrawal-methods",
  );
  const referralBonusPeriods = useDropdownOptions("referral-bonus-periods");
  const referralBonusTargetTypes = useDropdownOptions(
    "referral-bonus-target-types",
  );
  const referralBonusTypes = useDropdownOptions("referral-bonus-types");
  const referralBonusApplyTo = useDropdownOptions("referral-bonus-apply-to");
  const referralBonusReleaseRules = useDropdownOptions(
    "referral-bonus-release-rules",
  );
  const dispatch = useDispatch();
  const referralState = useSelector((state) => state.referralCommerce || {});
  const activeTab = sectionToTab[section] || "overview";
  const pageMeta =
    MARKETING_PAGE_META[activeTab] || MARKETING_PAGE_META.overview;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [hierarchySearch, setHierarchySearch] = useState("");
  const [expandedHierarchyIds, setExpandedHierarchyIds] = useState(
    () => new Set(),
  );

  const [paginations, setPaginations] = useState({
    influencers: { page: 1, limit: 20 },
    orders: { page: 1, limit: 20 },
    payouts: { page: 1, limit: 20 },
    fraud: { page: 1, limit: 20 },
    bonusRules: { page: 1, limit: 20 },
    bonusProgress: { page: 1, limit: 20 },
    bonusHistory: { page: 1, limit: 20 },
  });

  const [paginationsLoading, setPaginationsLoading] = useState({});

  const getPageData = (key, rows) => {
    const { page, limit } = paginations[key];
    const start = (page - 1) * limit;
    return rows.slice(start, start + limit);
  };

  const handlePageChange = (key, page) => {
    setPaginationsLoading((prev) => ({ ...prev, [key]: true }));
    setPaginations((prev) => ({
      ...prev,
      [key]: { ...prev[key], page },
    }));
    setTimeout(() => {
      setPaginationsLoading((prev) => ({ ...prev, [key]: false }));
    }, 300);
  };

  const handlePageSizeChange = (key, limit) => {
    setPaginationsLoading((prev) => ({ ...prev, [key]: true }));
    setPaginations((prev) => ({
      ...prev,
      [key]: { ...prev[key], limit, page: 1 },
    }));
    setTimeout(() => {
      setPaginationsLoading((prev) => ({ ...prev, [key]: false }));
    }, 300);
  };
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [childModalOpen, setChildModalOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [bonusRuleModalOpen, setBonusRuleModalOpen] = useState(false);
  const [editingBonusRule, setEditingBonusRule] = useState(null);
  const [bonusView, setBonusView] = useState("rules");
  const [payoutAction, setPayoutAction] = useState(null);
  const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false);
  const [parentSubmitting, setParentSubmitting] = useState(false);
  const [payoutActionForm, setPayoutActionForm] = useState({
    adminNote: "",
    transactionReference: "",
    paymentProofUrl: "",
  });
  const parentFormik = useFormik({
    initialValues: emptyInfluencerForm,
    validationSchema: parentInfluencerValidationSchema,
    validateOnMount: true,
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      setParentSubmitting(true);
      try {
        await dispatch(createReferralParent(compactPayload(values))).unwrap();
        toast.success("Parent Influencer created");
        setParentModalOpen(false);
        resetForm({ values: emptyInfluencerForm });
        await refreshAll();
      } catch (error) {
        toast.error(error || "Unable to create Parent Influencer");
      } finally {
        setParentSubmitting(false);
        setSubmitting(false);
      }
    },
  });
  const childFormik = useFormik({
    initialValues: emptyChildForm,
    validationSchema: brandAssociateValidationSchema,
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      try {
        await dispatch(
          createReferralChild({
            ...compactPayload(values),
            parentId: values.parentId,
          }),
        ).unwrap();
        toast.success("Brand Associate created");
        setChildModalOpen(false);
        resetForm({ values: emptyChildForm });
        await refreshAll();
      } catch (error) {
        toast.error(error || "Unable to create Brand Associate");
      } finally {
        setSubmitting(false);
      }
    },
  });
  const codeFormik = useFormik({
    initialValues: emptyCodeForm,
    validationSchema: () =>
      editingCode
        ? referralCodeValidationSchema.omit(["influencerId"])
        : referralCodeValidationSchema,
    onSubmit: async (values, { resetForm, setSubmitting }) => {
      const payload = compactPayload(numberize(values, ["usageLimit"]));
      try {
        if (editingCode) {
          const { influencerId: _influencerId, ...codePayload } = payload;
          await dispatch(
            updateReferralCode({ ...codePayload, codeId: getId(editingCode) }),
          ).unwrap();
          toast.success("Referral code updated");
        } else {
          await dispatch(createReferralCode(payload)).unwrap();
          toast.success("Referral code created");
        }
        setCodeModalOpen(false);
        setEditingCode(null);
        resetForm({ values: emptyCodeForm });
        await refreshAll();
      } catch (error) {
        toast.error(error || "Unable to save referral code");
      } finally {
        setSubmitting(false);
      }
    },
  });
  const [rulesForm, setRulesForm] = useState(emptyRulesForm);
  const [rulesErrors, setRulesErrors] = useState({});
  const [rulesSubmitting, setRulesSubmitting] = useState(false);
  const [bonusRuleForm, setBonusRuleForm] = useState(emptyBonusRuleForm);

  const summary = getBranchPayload(referralState.summaryData);
  const rulesPayload = getBranchPayload(referralState.rulesData);
  const influencers = getBranchList(referralState.influencersData);
  const orders = getBranchList(referralState.ordersData);
  const payouts = getBranchList(referralState.payoutsData);
  const bonusRules = getBranchList(referralState.bonusRulesData);
  const bonusAchievements = getBranchList(referralState.bonusAchievementsData);
  const bonusProgress = getBranchList(referralState.bonusProgressData);
  const fraudReviews = getBranchList(referralState.fraudReviewsData);
  const hierarchy = getBranchPayload(referralState.hierarchyData);
  const loading = Boolean(referralState.loading);
  const activeStatusOptions = (FILTER_STATUSES[activeTab] || []).map(
    (value) => ({
      value,
      label: humanize(value),
    }),
  );
  const hasListFilters = activeStatusOptions.length > 0;

  const filteredHierarchyRoots = useMemo(() => {
    const roots = Array.isArray(hierarchy?.roots) ? hierarchy.roots : [];
    const query = hierarchySearch.trim().toLowerCase();
    if (!query) return roots;

    const filterNodes = (nodes = []) =>
      nodes.reduce((matches, node) => {
        const children = filterNodes(node.children || []);
        const searchableText = [
          fullName(node.user),
          getId(node),
          node.primaryCode?.code,
          partnerTypeLabel(node.influencerType),
          `level ${node.level || ""}`,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (searchableText.includes(query) || children.length) {
          matches.push({ ...node, children });
        }
        return matches;
      }, []);

    return filterNodes(roots);
  }, [hierarchy?.roots, hierarchySearch]);

  useEffect(() => {
    const ids = new Set();
    const collectParentIds = (nodes = []) => {
      nodes.forEach((node) => {
        if (Array.isArray(node.children) && node.children.length) {
          ids.add(String(getId(node)));
          collectParentIds(node.children);
        }
      });
    };
    collectParentIds(hierarchy?.roots);
    setExpandedHierarchyIds(ids);
  }, [hierarchy?.roots]);

  const parentOptions = useMemo(
    () =>
      influencers.filter(
        (item) => item.status === "active" && item.canCreateChildren,
      ),
    [influencers],
  );
  const influencerById = useMemo(
    () => new Map(influencers.map((item) => [String(getId(item)), item])),
    [influencers],
  );

  const renderInfluencerRef = (influencerId) => {
    const influencer = influencerById.get(String(influencerId));
    const viewerId = influencer ? getId(influencer) : influencerId;

    if (!influencer) {
      return (
        <span className="font-mono text-xs text-gray-500">
          {shortId(influencerId)}
        </span>
      );
    }

    return (
      <button
        type="button"
        className="block min-w-0 text-left transition hover:text-indigo-700"
        onClick={(event) => {
          event.stopPropagation();
          navigate(`/app/referral-commerce/influencers/view/${viewerId}`, {
            state: { influencer },
          });
        }}
      >
        <div className="truncate text-sm font-medium text-gray-800">
          {fullName(influencer.user)}
        </div>
        <div className="truncate font-mono text-xs text-gray-500">
          Profile {shortId(getId(influencer))}
        </div>
      </button>
    );
  };

  const renderOrderLink = (orderId, orderNumber) => {
    return <OrderLink orderId={orderId} orderNumber={orderNumber} />;
  };

  const renderCustomerDetails = (order = {}) => {
    const customer =
      order.customer && typeof order.customer === "object"
        ? order.customer
        : {};
    const name =
      order.customerName ||
      customer.name ||
      customer.fullName ||
      customer.displayName ||
      "";
    const email = order.customerEmail || customer.email || "";
    const fallbackId =
      order.customerId || order.buyer_id || order.buyerId || customer.id || "";

    return (
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-gray-800">
          {name || email || fallbackId || "-"}
        </div>
        {name && email && (
          <div className="truncate text-xs text-gray-500">{email}</div>
        )}
      </div>
    );
  };

  const refreshAll = async (filters = {}) => {
    const baseQuery = {
      q: filters.q ?? search,
      page: 1,
      limit: 50,
    };
    const nextStatus = filters.status ?? status;
    const withStatus = (allowed = []) => ({
      ...baseQuery,
      ...(nextStatus && allowed.includes(nextStatus)
        ? { status: nextStatus }
        : {}),
    });
    await Promise.all([
      dispatch(getReferralSummary()),
      dispatch(getReferralHierarchy()),
      dispatch(
        getReferralInfluencers(
          withStatus(["pending", "active", "suspended", "rejected"]),
        ),
      ),
      dispatch(
        getReferralCodes(
          withStatus(["active", "inactive", "expired", "suspended"]),
        ),
      ),
      dispatch(
        getReferralOrders(
          withStatus([
            "pending",
            "completed",
            "cancelled",
            "refunded",
            "reversed",
          ]),
        ),
      ),
      dispatch(
        getReferralCommissions(
          withStatus([
            "pending",
            "locked",
            "available",
            "payout_requested",
            "paid",
            "reversed",
          ]),
        ),
      ),
      dispatch(
        getReferralPayouts(
          withStatus([
            "pending",
            "approved",
            "rejected",
            "processing",
            "paid",
            "failed",
          ]),
        ),
      ),
      dispatch(getReferralRules({ page: 1, limit: 20 })),
      dispatch(getReferralBonusRules(withStatus(["active", "inactive"]))),
      dispatch(getReferralBonusProgress({ page: 1, limit: 50 })),
      dispatch(
        getReferralBonusAchievements(
          withStatus(["locked", "released", "reversed"]),
        ),
      ),
      dispatch(
        getReferralFraudReviews({
          page: 1,
          limit: 50,
          ...(nextStatus &&
          ["open", "reviewing", "resolved", "dismissed"].includes(nextStatus)
            ? { status: nextStatus }
            : {}),
        }),
      ),
    ]);
  };

  const refreshActive = async (filters = {}) => {
    const query = {
      q: filters.q ?? search,
      page: 1,
      limit: 50,
      ...((filters.status ?? status)
        ? { status: filters.status ?? status }
        : {}),
    };
    const requests = {
      overview: () =>
        Promise.all([
          dispatch(getReferralSummary()),
          dispatch(getReferralOrders({ page: 1, limit: 50 })),
        ]),
      influencers: () =>
        Promise.all([
          dispatch(
            getReferralInfluencers({ ...query, influencerType: "parent" }),
          ),
          dispatch(getReferralHierarchy()),
        ]),

      rules: () => dispatch(getReferralRules({ page: 1, limit: 20 })),
      bonuses: () =>
        Promise.all([
          dispatch(
            getReferralBonusRules({
              ...query,
              status: ["active", "inactive"].includes(query.status)
                ? query.status
                : undefined,
            }),
          ),
          dispatch(
            getReferralBonusProgress({
              ...query,
              status: ["achieved", "in_progress"].includes(query.status)
                ? query.status
                : undefined,
            }),
          ),
          dispatch(
            getReferralBonusAchievements({
              ...query,
              status: ["locked", "released", "reversed"].includes(query.status)
                ? query.status
                : undefined,
            }),
          ),
        ]),
      orders: () => dispatch(getReferralOrders(query)),
      commissions: () => dispatch(getReferralCommissions(query)),
      payouts: () => dispatch(getReferralPayouts(query)),
      hierarchy: () => dispatch(getReferralHierarchy()),
      fraud: () => dispatch(getReferralFraudReviews(query)),
    };
    return requests[activeTab]?.();
  };

  const isInitialMount = useRef(true);
  const searchStatusMounted = useRef(false);

  useEffect(() => {
    refreshAll({ q: "", status: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSearch("");
    setStatus("");
    refreshActive({ q: "", status: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (
      !["influencers", "bonuses", "orders", "payouts", "fraud"].includes(
        activeTab,
      )
    ) {
      return undefined;
    }

    if (!searchStatusMounted.current) {
      searchStatusMounted.current = true;
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      refreshActive({ q: search, status });
    }, 350);

    return () => window.clearTimeout(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search, status]);

  useEffect(() => {
    const refreshOnFocus = () => refreshActive();
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search, status]);

  useEffect(() => {
    const currentRules = rulesPayload?.current || rulesPayload;
    if (currentRules && Object.keys(currentRules).length) {
      setRulesForm({
        ...emptyRulesForm,
        ...Object.fromEntries(
          Object.entries(currentRules).filter(
            ([, value]) => value !== undefined && value !== null,
          ),
        ),
        effectiveFrom: currentRules.effectiveFrom
          ? String(currentRules.effectiveFrom).slice(0, 10)
          : "",
        effectiveTo: currentRules.effectiveTo
          ? String(currentRules.effectiveTo).slice(0, 10)
          : "",
        metadata: JSON.stringify(currentRules.metadata || {}, null, 2),
      });
      setRulesErrors({});
    }
  }, [rulesPayload]);

  const handleSearch = async (event) => {
    event.preventDefault();
    try {
      await refreshActive({ q: search, status });
    } catch (error) {
      toast.error(error || "Failed to refresh referral commerce data");
    }
  };

  const resetInfluencerForm = () => {
    parentFormik.resetForm({ values: emptyInfluencerForm });
    childFormik.resetForm({ values: emptyChildForm });
  };

  const closeParentModal = () => {
    parentFormik.resetForm({ values: emptyInfluencerForm });
    setParentModalOpen(false);
  };

  const handleRulesField = (e) => {
    const { name, value } = e.target;

    const shareFields = [
      "customerSharePercent",
      "childSharePercent",
      "parentSharePercent",
    ];

    if (shareFields.includes(name)) {
      const newValue = Number(value || 0);

      const otherTotal = shareFields
        .filter((field) => field !== name)
        .reduce((total, field) => total + Number(rulesForm[field] || 0), 0);

      const newTotal = otherTotal + newValue;

      // Don't allow total allocation to exceed 100%
      if (newTotal > 100) {
        setRulesErrors((prev) => ({
          ...prev,
          [name]: `Share cannot exceed ${100 - otherTotal}%`,
          shareTotal: "Shares should total exactly 100%",
        }));
        return;
      }

      // Clear field error when valid
      setRulesErrors((prev) => ({
        ...prev,
        [name]: "",
        shareTotal: "",
      }));
    }

    setRulesForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleWithdrawalMethod = (method) => {
    setRulesForm((prev) => {
      const selected = new Set(
        Array.isArray(prev.withdrawalMethods) ? prev.withdrawalMethods : [],
      );
      if (selected.has(method)) selected.delete(method);
      else selected.add(method);
      const next = {
        ...prev,
        withdrawalMethods: Array.from(selected),
      };
      if (Object.keys(rulesErrors).length)
        setRulesErrors(validateRulesForm(next));
      return next;
    });
  };

  const handleBonusRuleField = (event) => {
    const { name, value } = event.target;
    setBonusRuleForm((prev) => ({ ...prev, [name]: value }));
  };

  const numberize = (payload, keys = []) =>
    keys.reduce(
      (acc, key) => ({
        ...acc,
        [key]: acc[key] === "" ? undefined : Number(acc[key]),
      }),
      { ...payload },
    );

  const compactPayload = (payload = {}) =>
    Object.entries(payload).reduce((acc, [key, value]) => {
      if (value !== "" && value !== undefined && value !== null)
        acc[key] = value;
      return acc;
    }, {});

  const submitParent = async (event) => {
    event.preventDefault();
    const errors = await parentFormik.validateForm();
    parentFormik.setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      phone: true,
      code: true,
    });
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    await parentFormik.submitForm();
  };

  const submitRules = async (event) => {
    event.preventDefault();
    const validationErrors = validateRulesForm(rulesForm);
    setRulesErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      toast.error("Please correct the highlighted rule settings.");
      return;
    }
    const cleanRules = [
      "distributionType",
      "referralPoolAmount",
      "referralPoolPercent",
      "maximumReferralPoolAmount",
      "coinValue",
      "coinExpiryDays",
      "coinUsage",
      "customerSharePercent",
      "childSharePercent",
      "parentSharePercent",
      "releaseDelayDays",
      "minimumWithdrawalCoins",
      "maximumWithdrawalCoins",
      "dailyWithdrawalLimitCoins",
      "monthlyWithdrawalLimitCoins",
      "withdrawalKycRequired",
      "withdrawalApprovalMode",
      "withdrawalMethods",
      "referralCodePrefix",
      "referralCodeRandomLength",
      "referralCodeCharacterSet",
      "minOrderAmount",
      "active",
      "effectiveFrom",
      "effectiveTo",
    ].reduce((acc, key) => {
      if (rulesForm[key] !== undefined) acc[key] = rulesForm[key];
      return acc;
    }, {});
    cleanRules.effectiveFrom = cleanRules.effectiveFrom || null;
    cleanRules.effectiveTo = cleanRules.effectiveTo || null;
    cleanRules.metadata = JSON.parse(rulesForm.metadata || "{}");
    try {
      setRulesSubmitting(true);
      await dispatch(
        updateReferralRules(
          numberize(cleanRules, [
            "referralPoolAmount",
            "referralPoolPercent",
            "maximumReferralPoolAmount",
            "coinValue",
            "coinExpiryDays",
            "customerSharePercent",
            "childSharePercent",
            "parentSharePercent",
            "releaseDelayDays",
            "minimumWithdrawalCoins",
            "maximumWithdrawalCoins",
            "dailyWithdrawalLimitCoins",
            "monthlyWithdrawalLimitCoins",
            "referralCodeRandomLength",
            "minOrderAmount",
          ]),
        ),
      ).unwrap();
      toast.success("Referral commerce rules saved");
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to save commission rules");
    } finally {
      setRulesSubmitting(false);
    }
  };

  const openBonusRuleModal = (rule = null) => {
    setEditingBonusRule(rule);
    setBonusRuleForm(
      rule
        ? {
            ...emptyBonusRuleForm,
            ruleName: rule.ruleName || "",
            period: rule.period || "monthly",
            customStartAt: rule.customStartAt
              ? String(rule.customStartAt).slice(0, 10)
              : "",
            customEndAt: rule.customEndAt
              ? String(rule.customEndAt).slice(0, 10)
              : "",
            targetType: rule.targetType || "order_value",
            targetValue: rule.targetValue ?? "",
            bonusType: rule.bonusType || "fixed_coins",
            bonusValue: rule.bonusValue ?? "",
            applyTo: rule.applyTo || "code_owner",
            resetCycle: rule.resetCycle || "monthly",
            releaseRule: rule.releaseRule || "instantly_available",
            status: rule.status || "active",
          }
        : emptyBonusRuleForm,
    );
    setBonusRuleModalOpen(true);
  };

  const submitBonusRule = async (event) => {
    event.preventDefault();
    const payload = compactPayload(
      numberize(bonusRuleForm, ["targetValue", "bonusValue"]),
    );
    try {
      if (editingBonusRule) {
        await dispatch(
          updateReferralBonusRule({
            ...payload,
            ruleId: getId(editingBonusRule),
          }),
        ).unwrap();
        toast.success("Bonus rule updated");
      } else {
        await dispatch(createReferralBonusRule(payload)).unwrap();
        toast.success("Bonus rule created");
      }
      setBonusRuleModalOpen(false);
      setEditingBonusRule(null);
      setBonusRuleForm(emptyBonusRuleForm);
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to save bonus rule");
    }
  };

  const toggleBonusRuleStatus = async (rule) => {
    try {
      await dispatch(
        updateReferralBonusRule({
          ruleId: getId(rule),
          status: rule.status === "active" ? "inactive" : "active",
        }),
      ).unwrap();
      toast.success("Bonus rule status updated");
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to update bonus rule");
    }
  };

  const evaluateBonuses = async () => {
    try {
      const result = await dispatch(evaluateReferralBonusRules({})).unwrap();
      const payload = result?.normalized?.data || result?.data || result || {};
      toast.success(
        `Bonus evaluation complete: ${payload.totalCreated || 0} awarded`,
      );
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to evaluate bonus rules");
    }
  };

  const toggleCodeStatus = async (code) => {
    try {
      await dispatch(
        updateReferralCode({
          codeId: getId(code),
          status: code.status === "active" ? "inactive" : "active",
        }),
      ).unwrap();
      toast.success("Referral code status updated");
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to update referral code");
    }
  };

  const openPayoutAction = (payout, action) => {
    setPayoutAction({ payout, action });
    setPayoutActionForm({
      adminNote: "",
      transactionReference: payout.transactionReference || "",
      paymentProofUrl: payout.paymentProofUrl || "",
    });
  };

  const closePayoutAction = () => {
    if (uploadingPaymentProof) return;
    setPayoutAction(null);
    setPayoutActionForm({
      adminNote: "",
      transactionReference: "",
      paymentProofUrl: "",
    });
  };

  const handlePaymentProofUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Upload a PDF, JPG, PNG, or WebP payment proof");
      return;
    }
    try {
      setUploadingPaymentProof(true);
      const paymentProofUrl = await uploadDocumentFile(
        file,
        "REFERRAL_PAYOUTS",
      );
      setPayoutActionForm((form) => ({ ...form, paymentProofUrl }));
      toast.success("Payment proof uploaded");
    } catch (error) {
      toast.error(error?.message || error || "Unable to upload payment proof");
    } finally {
      setUploadingPaymentProof(false);
    }
  };

  const handlePayoutAction = async (event) => {
    event.preventDefault();
    if (!payoutAction || uploadingPaymentProof) return;
    const { payout, action } = payoutAction;
    const payoutId = getId(payout);
    try {
      if (action === "approve") {
        await dispatch(
          approveReferralPayout({
            payoutId,
            adminNote: payoutActionForm.adminNote,
          }),
        ).unwrap();
      }
      if (action === "reject") {
        await dispatch(
          rejectReferralPayout({
            payoutId,
            adminNote: payoutActionForm.adminNote,
          }),
        ).unwrap();
      }
      if (action === "paid") {
        await dispatch(
          markReferralPayoutPaid({
            payoutId,
            transactionReference: payoutActionForm.transactionReference.trim(),
            paymentProofUrl: payoutActionForm.paymentProofUrl || null,
            adminNote: payoutActionForm.adminNote || null,
            paidAt: new Date().toISOString(),
          }),
        ).unwrap();
      }
      toast.success("Payout updated");
      closePayoutAction();
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to update payout");
    }
  };

  const openEditCode = (code) => {
    setEditingCode(code);
    codeFormik.setValues({
      influencerId: code.influencerId || "",
      code: code.code || "",
      status: code.status || "active",
      usageLimit: code.usageLimit || "",
    });
    codeFormik.setTouched({});
    setCodeModalOpen(true);
  };
  const bonusTabs = [
    { value: "rules", label: "Rules" },
    { value: "progress", label: "Current Progress" },
    { value: "history", label: "Achievement History" },
  ];
  const statItems = [
    {
      label: "Referral Partners",
      value: summary?.influencers?.total || 0,
      sub: `${summary?.influencers?.active || 0} active`,
      icon: <UserPlus aria-hidden="true" size={18} />,
      iconBg: "#dce5fb",
      iconColor: "#2457d6",
    },
    {
      label: "Active Codes",
      value: summary?.codes?.active || 0,
      sub: `${summary?.codes?.total || 0} total`,
      icon: <Share2 aria-hidden="true" size={18} />,
      iconBg: "#e7dcff",
      iconColor: "#8156e8",
    },
    {
      label: "Referral Sales",
      value: formatAmount(summary?.orders?.eligibleAmount),
      sub: `${summary?.orders?.total || 0} orders`,
      icon: <BadgeIndianRupee aria-hidden="true" size={18} />,
      iconBg: "#ffe7b8",
      iconColor: "#e79a00",
    },
    {
      label: "Referral Coins",
      value: formatCoins(summary?.commissions?.amount),
      sub: `${summary?.commissions?.totalEntries || 0} ledger entries`,
      icon: <GitBranch aria-hidden="true" size={18} />,
      iconBg: "#cfeee0",
      iconColor: "#23965b",
    },
    {
      label: "Bonus Coins",
      value: formatCoins(summary?.bonuses?.totalCoins),
      sub: `${summary?.bonuses?.achievements || 0} achievements`,
      icon: <Check aria-hidden="true" size={18} />,
      iconBg: "#ffd7d4",
      iconColor: "#ef5057",
    },
  ];

  const growthPartners = influencers.filter(
    (item) => item.influencerType === "parent",
  );
  const influencerRows = growthPartners.map((item) => ({
    key: getId(item),
    influencer: (
      <div className="min-w-0">
        <div className="truncate font-medium text-gray-900">
          {fullName(item.user)}
        </div>
        <div className="truncate text-xs text-gray-500">
          {item.user?.email || "Linked account"}
        </div>
      </div>
    ),
    profileId: (
      <div className="min-w-0">
        <div className="font-mono text-xs text-gray-800">
          {shortId(getId(item))}
        </div>
        <div className="font-mono text-[11px] text-gray-400">
          User {shortId(item.userId)}
        </div>
      </div>
    ),
    type: <span>{partnerTypeLabel(item.influencerType)}</span>,
    code: item.primaryCode?.code ? (
      <span className="font-mono text-sm font-semibold text-indigo-700">
        {item.primaryCode.code}
      </span>
    ) : (
      "-"
    ),
    hierarchy: `Level ${item.level || 1}`,
    wallet: formatCoins(item.wallet?.availableBalance),
    documents: (() => {
      const documents = item.metadata?.details?.documents || {};
      const links = [
        ["PAN", documents.panCardUrl],
        ["Aadhaar", documents.aadhaarCardUrl],
        ["Cheque", documents.cancelledChequeUrl],
      ].filter(([, url]) => url);
      return links.length ? (
        <div className="flex flex-wrap gap-1">
          {links.map(([label, url]) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-700 underline"
            >
              {label}
            </a>
          ))}
        </div>
      ) : (
        "-"
      );
    })(),
    bankDetails: (() => {
      const payout = item.metadata?.details?.payout || {};
      if (payout.method === "upi" && payout.upiId)
        return `UPI: ${payout.upiId}`;
      if (!payout.accountNumber) return "-";
      return (
        <div className="text-xs">
          <div>{payout.bankName || "Bank"}</div>
          <div className="font-mono">
            ••••{String(payout.accountNumber).slice(-4)} · {payout.ifscCode}
          </div>
        </div>
      );
    })(),
    kyc: <StatusPill value={item.kycStatus || "not_submitted"} />,
    bank: <StatusPill value={item.payoutProfileStatus || "not_submitted"} />,
    status: <StatusPill value={item.status} />,
    actions: (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded bg-[var(--admin-blue-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--admin-blue)] transition hover:bg-[var(--admin-blue)] hover:text-white"
        onClick={() =>
          navigate(`/app/referral-commerce/influencers/view/${getId(item)}`, {
            state: { influencer: item },
          })
        }
        aria-label={`View details for ${fullName(item.user)}`}
      >
        <Eye size={14} />
        View
      </button>
    ),
  }));

  const orderRows = orders.map((order) => ({
    key: getId(order),
    order: renderOrderLink(
      order.orderId || order.order_id,
      order.orderNumber || order.order_number,
    ),
    code: order.code,
    customer: renderCustomerDetails(order),
    amount: formatAmount(order.eligibleAmount),
    discount: formatAmount(order.discountAmount),
    status: <StatusPill value={order.status} />,
    created: formatDate(order.createdAt),
  }));

  const payoutRows = payouts.map((payout) => ({
    key: getId(payout),
    influencerId: payout.influencerId,
    influencer: renderInfluencerRef(payout.influencerId),
    coins: formatCoins(payout.coinAmount ?? payout.amount),
    payable: formatAmount(
      payout.currencyAmount ??
        Number((payout.coinAmount ?? payout.amount) || 0) *
          Number(payout.coinValue || 1),
    ),
    method:
      payout.payoutMethod === "upi_qr" ? "UPI QR" : payout.payoutMethod || "-",
    destination: payout.destinationSnapshot?.accountNumberLast4
      ? `${payout.destinationSnapshot.bankName || "Bank"} · •••• ${payout.destinationSnapshot.accountNumberLast4}`
      : ["upi", "upi_qr"].includes(payout.payoutMethod)
        ? payout.destinationSnapshot?.upiId || payout.upiId || "-"
        : payout.payoutMethod === "bank"
          ? payout.bankAccountId || "-"
          : "Manual",
    status: <StatusPill value={payout.status} />,
    requested: formatDate(payout.requestedAt || payout.createdAt),
    reference: payout.transactionReference || "-",
    actions: (
      <RowActions
        actions={[
          {
            label: "Approve request",
            icon: <Check aria-hidden="true" size={14} />,
            hidden: payout.status !== "pending",
            onClick: () => openPayoutAction(payout, "approve"),
          },
          {
            label: "Reject request",
            icon: <X aria-hidden="true" size={14} />,
            danger: true,
            hidden: !["pending", "approved", "processing", "failed"].includes(
              payout.status,
            ),
            onClick: () => openPayoutAction(payout, "reject"),
          },
          {
            label: "Mark as paid",
            icon: <BadgeIndianRupee aria-hidden="true" size={14} />,
            hidden: !["approved", "processing"].includes(payout.status),
            onClick: () => openPayoutAction(payout, "paid"),
          },
        ]}
      />
    ),
  }));
  const payoutHasActions = payouts.some((payout) =>
    ["pending", "approved", "processing", "failed"].includes(payout.status),
  );
  const payoutHasReference = payouts.some(
    (payout) => payout.transactionReference,
  );

  const bonusRuleRows = bonusRules.map((rule) => ({
    key: getId(rule),
    name: <span className="font-medium text-gray-900">{rule.ruleName}</span>,
    period: (
      <span className="capitalize">
        {String(rule.period || "").replace(/_/g, " ")}
      </span>
    ),
    target: `${String(rule.targetType || "").replace(/_/g, " ")} >= ${Number(rule.targetValue || 0).toLocaleString("en-IN")}`,
    bonus:
      rule.bonusType === "percentage_extra_coins"
        ? `${Number(rule.bonusValue || 0)}% extra coins`
        : formatCoins(rule.bonusValue),
    applyTo: String(rule.applyTo || "").replace(/_/g, " "),
    release: String(rule.releaseRule || "").replace(/_/g, " "),
    status: <StatusPill value={rule.status} />,
    actions: (
      <RowActions
        actions={[
          {
            label: "Edit rule",
            icon: <Pencil aria-hidden="true" size={14} />,
            onClick: () => openBonusRuleModal(rule),
          },
          {
            label:
              rule.status === "active" ? "Deactivate rule" : "Activate rule",
            icon:
              rule.status === "active" ? <X size={14} /> : <Check size={14} />,
            danger: rule.status === "active",
            onClick: () => toggleBonusRuleStatus(rule),
          },
        ]}
      />
    ),
  }));

  const bonusProgressRows = bonusProgress.map((row) => ({
    key: `${getId(row.rule)}-${row.influencer?.id}-${row.cycleKey}`,
    rule: row.rule?.ruleName || "-",
    influencer: renderInfluencerRef(row.influencer?.id),
    cycle: row.cycleKey,
    target: Number(row.targetValue || 0).toLocaleString("en-IN"),
    achieved: Number(row.achievedValue || 0).toLocaleString("en-IN"),
    progress: `${Number(row.progressPercent || 0).toFixed(2)}%`,
    status: row.existingAchievement ? (
      <StatusPill value={row.existingAchievement.status} />
    ) : (
      <StatusPill value={row.achieved ? "achieved" : "in_progress"} />
    ),
  }));

  const bonusAchievementRows = bonusAchievements.map((achievement) => ({
    key: getId(achievement),
    rule: achievement.ruleName,
    influencer: renderInfluencerRef(achievement.influencerId),
    cycle: achievement.cycleKey,
    target: `${String(achievement.targetType || "").replace(/_/g, " ")} ${Number(achievement.achievedValue || 0).toLocaleString("en-IN")} / ${Number(achievement.targetValue || 0).toLocaleString("en-IN")}`,
    bonus: formatCoins(achievement.bonusCoins),
    status: <StatusPill value={achievement.status} />,
    achievedAt: formatDate(achievement.achievedAt || achievement.createdAt),
  }));

  const fraudRows = fraudReviews.map((review) => ({
    key: getId(review),
    reason: review.reason,
    influencer: renderInfluencerRef(review.influencerId),
    code: review.code || "-",
    severity: <StatusPill value={review.severity} />,
    status: <StatusPill value={review.status} />,
    created: formatDate(review.createdAt),
  }));

  const countHierarchyDescendants = (node) =>
    (node.children || []).reduce(
      (count, child) => count + 1 + countHierarchyDescendants(child),
      0,
    );

  const toggleHierarchyNode = (nodeId) => {
    setExpandedHierarchyIds((current) => {
      const next = new Set(current);
      const key = String(nodeId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderHierarchyNode = (
    node,
    depth = 0,
    siblingIndex = 0,
    siblingCount = 1,
  ) => {
    const nodeId = String(getId(node));
    const children = Array.isArray(node.children) ? node.children : [];
    const hasChildren = children.length > 0;
    const isExpanded = hierarchySearch.trim()
      ? true
      : expandedHierarchyIds.has(nodeId);
    const isLastChild = siblingIndex === siblingCount - 1;
    const offset = depth * 40;

    return (
      <div key={nodeId} className="relative">
        {depth > 0 && (
          <>
            <span
              className="absolute top-0 w-px bg-gray-300"
              style={{
                left: `${offset - 20}px`,
                height: isLastChild ? "24px" : "100%",
              }}
            />
            <span
              className="absolute top-6 h-px w-5 bg-gray-300"
              style={{ left: `${offset - 20}px` }}
            />
          </>
        )}

        <div
          className={`mb-1 flex min-h-14 items-center justify-between gap-3 px-3 py-3 transition-colors ${
            depth === 0
              ? "border-l-4 border-l-gray-400 bg-gray-100"
              : "bg-white hover:bg-gray-50"
          }`}
          style={{ marginLeft: `${offset}px` }}
        >
          <div className="flex min-w-0 items-center gap-3">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleHierarchyNode(nodeId)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border text-sm leading-none ${
                  isExpanded
                    ? "border-gray-600 bg-gray-600 text-white"
                    : "border-gray-400 bg-white text-gray-600 hover:border-gray-600"
                }`}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${fullName(node.user)}`}
              >
                {isExpanded ? "−" : "+"}
              </button>
            ) : depth > 0 ? (
              <span className="h-5 w-5 shrink-0" />
            ) : null}

            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={`${
                  depth === 0
                    ? "text-base font-semibold text-gray-800"
                    : "text-sm font-medium text-gray-700"
                }`}
              >
                {fullName(node.user)}
              </span>
              <span className="font-mono text-xs text-gray-500">
                Profile {shortId(getId(node))}
              </span>
              {hasChildren && (
                <span className="rounded bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-700">
                  {countHierarchyDescendants(node)}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
            <StatusPill value={partnerTypeLabel(node.influencerType)} />
            <span className="text-xs font-medium text-gray-500">
              Level {node.level || depth + 1}
            </span>
            <span className="min-w-20 font-mono text-xs text-indigo-700">
              {node.primaryCode?.code || "No code"}
            </span>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="relative">
            {children.map((child, index) =>
              renderHierarchyNode(child, depth + 1, index, children.length),
            )}
          </div>
        )}
      </div>
    );
  };

  const RecentOrdersSkeleton = () => (
    <tbody>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index} className="border-b border-[#EDE5D8]">
          {/* S. No. */}
          <td className="px-4 py-4">
            <div className="h-4 w-6 animate-pulse rounded bg-gray-200" />
          </td>

          {/* Order ID */}
          <td className="px-4 py-4">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </td>

          {/* Customer */}
          <td className="px-4 py-4">
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-40 animate-pulse rounded bg-gray-200" />
            </div>
          </td>

          {/* Amount */}
          <td className="px-4 py-4">
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" />
          </td>

          {/* Status */}
          <td className="px-4 py-4">
            <div className="h-7 w-20 animate-pulse rounded-md bg-gray-200" />
          </td>
        </tr>
      ))}
    </tbody>
  );

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="admin-card min-h-[100px] animate-pulse p-4"
              >
                <div className="mb-4 h-3 w-24 rounded bg-gray-200" />
                <div className="mb-3 h-6 w-20 rounded bg-gray-200" />
                <div className="h-3 w-32 rounded bg-gray-200" />
              </div>
            ))
          : statItems.map((item) => (
              <SummaryCard
                key={item.label}
                title={item.label}
                value={item.value}
                description={item.sub}
                icon={
                  <span style={{ color: item.iconColor }}>{item.icon}</span>
                }
                iconClassName="right-0 top-0 h-9 w-10 rounded-none rounded-bl-[10px] border-0"
                iconStyle={{ backgroundColor: item.iconBg }}
                className="min-h-[100px]"
                titleClassName="uppercase text-[10px]"
                valueClassName="text-[20px]"
                descriptionClassName="mt-2 text-[10px]"
              />
            ))}
      </div>

      {/* Wallet Balances */}
      <section className="admin-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-line)] px-4 py-3.5">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--admin-navy)]">
              Wallet Balances
            </h2>
            <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
              Current referral coin allocation by wallet state
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="admin-card min-h-[104px] animate-pulse p-4"
                >
                  <div className="mb-4 h-3 w-20 rounded bg-gray-200" />
                  <div className="mb-3 h-6 w-24 rounded bg-gray-200" />
                  <div className="h-3 w-28 rounded bg-gray-200" />
                </div>
              ))
            : [
                {
                  label: "Locked",
                  value:
                    summary?.wallets?.lockedBalance ??
                    summary?.wallets?.pendingBalance,
                  helper: "Awaiting release",
                  icon: <ShieldAlert aria-hidden="true" size={18} />,
                },
                {
                  label: "Available",
                  value: summary?.wallets?.availableBalance,
                  helper: "Ready for payout",
                  icon: <Check aria-hidden="true" size={18} />,
                },
                {
                  label: "Reserved",
                  value: summary?.wallets?.reservedBalance,
                  helper: "Held for requests",
                  icon: <GitBranch aria-hidden="true" size={18} />,
                },
                {
                  label: "Withdrawn",
                  value:
                    summary?.wallets?.withdrawnBalance ??
                    summary?.wallets?.paidBalance,
                  helper: "Successfully paid",
                  icon: <ExternalLink aria-hidden="true" size={18} />,
                },
                {
                  label: "Reversed",
                  value: summary?.wallets?.reversedBalance,
                  helper: "Returned to wallet",
                  icon: <RefreshCw aria-hidden="true" size={18} />,
                },
              ].map((item) => (
                <Cards
                  key={item.label}
                  label={item.label}
                  value={formatCoins(item.value)}
                  helper={item.helper}
                  icon={item.icon}
                  iconBg="var(--admin-gold-soft)"
                  iconColor="var(--admin-gold-dark)"
                  className="min-h-[104px]"
                />
              ))}
        </div>
      </section>

      {/* Recent Orders */}
      <section className="admin-card overflow-hidden bg-white">
        <div className="flex items-center justify-between border-b border-[var(--admin-line)] px-5 py-4">
          <h2 className="text-[17px] font-bold font-inter text-[var(--admin-navy)]">
            Recent Orders
          </h2>

          <button
            type="button"
            className="inline-flex min-h-7 items-center justify-center rounded border border-[var(--admin-gold)] bg-[#fff8e6] px-3 text-[11px] font-semibold text-[var(--admin-gold-dark)] transition hover:bg-[#fff3cc] focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)]"
            onClick={() => navigate("/app/referral-commerce/orders")}
          >
            See All
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="admin-table-head font-inter text-[12px]">
              <tr>
                <th className="px-4 py-3 font-semibold">S. No.</th>
                <th className="px-4 py-3 font-semibold">Order ID</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>

            {loading ? (
              <tbody className="text-[12px]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr
                    key={index}
                    className="border-b border-[#f0e8dc] last:border-0"
                  >
                    {/* S. No. */}
                    <td className="px-4 py-4">
                      <div className="h-4 w-6 animate-pulse rounded bg-gray-200" />
                    </td>

                    {/* Order ID */}
                    <td className="px-4 py-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                        <div className="h-3 w-40 animate-pulse rounded bg-gray-200" />
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <div className="h-7 w-20 animate-pulse rounded-md bg-gray-200" />
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : (
              <tbody className="text-[12px] text-slate-600">
                {orders.slice(0, 5).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6">
                      <div className="mx-auto flex flex-col items-center gap-2 rounded-lg bg-[var(--admin-surface-soft)] px-4 py-8 text-center text-gray-400">
                        <img
                          src="/Img/noData.png"
                          alt="No recent orders"
                          className="h-24 w-24 max-w-full object-contain sm:h-32 sm:w-32 md:h-[150px] md:w-[150px]"
                        />
                        <span className="text-sm font-medium">
                          No Recent Orders Found.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.slice(0, 5).map((order, index) => {
                    const status = order.status || "Pending";

                    const orderId =
                      order.orderId || order.order_id || order.id || order._id;

                    const orderNumber =
                      order.orderNumber ||
                      order.order_number ||
                      String(orderId || index + 1).slice(0, 10);

                    const amountVal =
                      order.eligibleAmount ??
                      order.seller_order_total ??
                      order.payable_amount ??
                      order.totalAmount ??
                      order.total ??
                      0;

                    const formattedAmount = `₹${Number(
                      amountVal,
                    ).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

                    return (
                      <tr
                        key={orderId || index}
                        className="border-b border-[#f0e8dc] last:border-0 hover:bg-[var(--admin-surface-soft)]"
                      >
                        <td className="px-4 py-3 text-start tabular-nums">
                          {index + 1}.
                        </td>

                        <td className="px-4 py-3 font-medium">
                          {renderOrderLink(orderId, orderNumber)}
                        </td>

                        <td className="px-4 py-3">
                          {renderCustomerDetails(order)}
                        </td>

                        <td className="px-4 py-3 font-medium text-gray-900">
                          {formattedAmount}
                        </td>

                        <td className="px-4 py-3">
                          <StatusPill value={status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            )}
          </table>
        </div>
      </section>
    </div>
  );

  const renderRules = () => (
    <section className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-line)] bg-gradient-to-r from-white to-[var(--admin-gold-soft)]/35 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--admin-navy)]">
            <BadgeIndianRupee
              aria-hidden="true"
              size={18}
              className="text-[var(--admin-gold-dark)]"
            />
            Referral Commerce Rules
          </h2>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            Configure referral pools, coin behavior, distribution shares, and
            withdrawals
          </p>
        </div>
        <span className="rounded-full border border-[var(--admin-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--admin-muted)]">
          Global configuration
        </span>
      </div>
      <form
        onSubmit={submitRules}
        noValidate
        className="grid grid-cols-1 gap-x-4 gap-y-5 p-5 md:grid-cols-4"
      >
        <div className="flex items-center gap-3 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-3 md:col-span-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--admin-navy)] text-xs font-bold text-white">
            1
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--admin-navy)]">
              Referral Pool & Coin Setup
            </h3>
            <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">
              Define the reward pool, coin value, validity, and eligible orders
            </p>
          </div>
        </div>
        <SelectInput
          label="Distribution Type"
          name="distributionType"
          value={rulesForm.distributionType}
          onChange={handleRulesField}
          required
          error={rulesErrors.distributionType}
        >
          {optionList(referralDistributionTypes.options, [
            "percentage",
            "fixed_amount",
          ]).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
        {rulesForm.distributionType === "fixed_amount" ? (
          <TextInput
            label="Referral Pool Amount"
            name="referralPoolAmount"
            type="number"
            min="0"
            step="0.01"
            value={rulesForm.referralPoolAmount}
            onChange={handleRulesField}
            required
            error={rulesErrors.referralPoolAmount}
          />
        ) : (
          <TextInput
            label="Referral Pool %"
            name="referralPoolPercent"
            type="number"
            min="0"
            step="0.01"
            value={rulesForm.referralPoolPercent}
            onChange={handleRulesField}
            max="100"
            required
            error={rulesErrors.referralPoolPercent}
          />
        )}
        <TextInput
          label="Maximum Referral Pool Per Order"
          name="maximumReferralPoolAmount"
          type="number"
          min="0"
          step="0.01"
          value={rulesForm.maximumReferralPoolAmount}
          onChange={handleRulesField}
          required
          error={rulesErrors.maximumReferralPoolAmount}
          hint="Safety cap on the total referral pool calculated for one order. Enter 0 for unlimited; customer and partner shares are then calculated from this capped pool."
        />
        <TextInput
          label="INR per Coin"
          name="coinValue"
          type="number"
          min="0.000001"
          step="0.000001"
          value={rulesForm.coinValue}
          onChange={handleRulesField}
          required
          error={rulesErrors.coinValue}
        />
        <TextInput
          label="Coin Expiry Days"
          name="coinExpiryDays"
          type="number"
          min="0"
          step="1"
          value={rulesForm.coinExpiryDays}
          onChange={handleRulesField}
          required
          error={rulesErrors.coinExpiryDays}
        />
        <SelectInput
          label="Coin Usage"
          name="coinUsage"
          value={rulesForm.coinUsage}
          onChange={handleRulesField}
          required
          error={rulesErrors.coinUsage}
        >
          {optionList(referralCoinUsageModes.options, [
            "wallet",
            "discount",
            "both",
          ]).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
        <TextInput
          label="Minimum Eligible Order Amount"
          name="minOrderAmount"
          type="number"
          min="0"
          step="0.01"
          value={rulesForm.minOrderAmount}
          onChange={handleRulesField}
          required
          error={rulesErrors.minOrderAmount}
        />

        <div className="mt-1 flex items-center gap-3 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-3 md:col-span-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--admin-navy)] text-xs font-bold text-white">
            2
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--admin-navy)]">
              Distribution Shares
            </h3>
            <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">
              Split the referral pool between the customer and referral partners
            </p>
          </div>
        </div>
        <TextInput
          label="Customer Discount Share %"
          name="customerSharePercent"
          type="number"
          min="0"
          step="0.01"
          max="100"
          value={rulesForm.customerSharePercent}
          onChange={handleRulesField}
          required
          error={rulesErrors.customerSharePercent}
        />
        <TextInput
          label="Brand Associate Share %"
          name="childSharePercent"
          type="number"
          min="0"
          step="0.01"
          max="100"
          value={rulesForm.childSharePercent}
          onChange={handleRulesField}
          required
          error={rulesErrors.childSharePercent}
        />
        <TextInput
          label="Growth Partner Share %"
          name="parentSharePercent"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={rulesForm.parentSharePercent}
          onChange={handleRulesField}
          required
          error={rulesErrors.parentSharePercent}
        />

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase text-[var(--admin-navy)]">
            Total Allocation
          </label>

          <div
            className={`flex h-9 items-center gap-2 rounded-md border px-3 ${
              Number(rulesForm.customerSharePercent || 0) +
                Number(rulesForm.childSharePercent || 0) +
                Number(rulesForm.parentSharePercent || 0) ===
              100
                ? " border-[var(--admin-line)] bg-[#fffaf0]"
                : " border-[var(--admin-line)] bg-[#fffaf0]"
            }`}
          >
            {/* Progress bar */}
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
              <div
                className={`h-full rounded-full transition-all ${
                  Number(rulesForm.customerSharePercent || 0) +
                    Number(rulesForm.childSharePercent || 0) +
                    Number(rulesForm.parentSharePercent || 0) ===
                  100
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
                style={{
                  width: `${Math.min(
                    Math.max(
                      Number(rulesForm.customerSharePercent || 0) +
                        Number(rulesForm.childSharePercent || 0) +
                        Number(rulesForm.parentSharePercent || 0),
                      0,
                    ),
                    100,
                  )}%`,
                }}
              />
            </div>

            {/* Percentage */}
            <span
              className={`shrink-0 text-xs font-bold ${
                Number(rulesForm.customerSharePercent || 0) +
                  Number(rulesForm.childSharePercent || 0) +
                  Number(rulesForm.parentSharePercent || 0) ===
                100
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              {Number(rulesForm.customerSharePercent || 0) +
                Number(rulesForm.childSharePercent || 0) +
                Number(rulesForm.parentSharePercent || 0)}
              %
            </span>
          </div>

          {/* Helper text outside */}

          {rulesErrors.shareTotal ? (
            <p className="admin-field-error" role="alert">
              {rulesErrors.shareTotal}
            </p>
          ) : null}
        </div>

        <div className="mt-1 flex items-center gap-3 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-3 md:col-span-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--admin-navy)] text-xs font-bold text-white">
            3
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--admin-navy)]">
              Withdrawal Rules
            </h3>
            <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">
              Control payout limits, approvals, KYC, and supported methods
            </p>
          </div>
        </div>
        <TextInput
          label="Minimum Withdrawal Coins"
          name="minimumWithdrawalCoins"
          type="number"
          min="0"
          step="0.01"
          value={rulesForm.minimumWithdrawalCoins}
          onChange={handleRulesField}
          required
          error={rulesErrors.minimumWithdrawalCoins}
        />
        <TextInput
          label="Maximum Withdrawal Coins"
          name="maximumWithdrawalCoins"
          type="number"
          min="0"
          step="0.01"
          value={rulesForm.maximumWithdrawalCoins}
          onChange={handleRulesField}
          required
          error={rulesErrors.maximumWithdrawalCoins}
        />
        <TextInput
          label="Daily Withdrawal Limit"
          name="dailyWithdrawalLimitCoins"
          type="number"
          min="0"
          step="0.01"
          value={rulesForm.dailyWithdrawalLimitCoins}
          onChange={handleRulesField}
          required
          error={rulesErrors.dailyWithdrawalLimitCoins}
        />
        <TextInput
          label="Monthly Withdrawal Limit"
          name="monthlyWithdrawalLimitCoins"
          type="number"
          min="0"
          step="0.01"
          value={rulesForm.monthlyWithdrawalLimitCoins}
          onChange={handleRulesField}
          required
          error={rulesErrors.monthlyWithdrawalLimitCoins}
        />
        <TextInput
          label="Coin Release Delay Days"
          name="releaseDelayDays"
          type="number"
          min="0"
          step="1"
          value={rulesForm.releaseDelayDays}
          onChange={handleRulesField}
          required
          error={rulesErrors.releaseDelayDays}
          hint="Whole days before earned referral coins become available."
        />
        <SelectInput
          label="Approval Mode"
          name="withdrawalApprovalMode"
          value={rulesForm.withdrawalApprovalMode}
          onChange={handleRulesField}
          required
          error={rulesErrors.withdrawalApprovalMode}
        >
          {optionList(referralWithdrawalApprovalModes.options, [
            "manual",
            "auto",
          ]).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectInput>
        <label className="admin-switch mt-6 h-10 rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-3">
          <input
            type="checkbox"
            className="sr-only"
            name="withdrawalKycRequired"
            checked={Boolean(rulesForm.withdrawalKycRequired)}
            onChange={handleRulesField}
          />
          <span className="admin-switch-track" />
          <span className="font-semibold">KYC required</span>
        </label>
        <div className="md:col-span-2">
          <span className="mb-2 block text-xs font-semibold uppercase text-[var(--admin-navy)]">
            Withdrawal Methods
          </span>

          <div className="flex flex-wrap gap-2">
            {optionList(referralWithdrawalMethods.options, [
              "upi",
              "bank",
              "manual",
            ]).map((option) => {
              const isSelected =
                Array.isArray(rulesForm.withdrawalMethods) &&
                rulesForm.withdrawalMethods.includes(option.value);

              return (
                <label
                  key={option.value}
                  className={`flex min-w-[120px] cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-[var(--admin-gold)] bg-[#fffaf0] text-[var(--admin-navy)] shadow-sm"
                      : "border-[var(--admin-line)] bg-white text-[var(--admin-muted)] hover:border-[var(--admin-gold)] hover:bg-[#fffaf0]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleWithdrawalMethod(option.value)}
                    className="h-4 w-4 rounded border-gray-300 accent-[var(--admin-gold)]"
                  />

                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
          {rulesErrors.withdrawalMethods ? (
            <p className="admin-field-error" role="alert">
              {rulesErrors.withdrawalMethods}
            </p>
          ) : null}
        </div>

        <div className="mt-1 flex items-center gap-3 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-3 md:col-span-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--admin-navy)] text-xs font-bold text-white">
            4
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--admin-navy)]">
              Referral Code Format
            </h3>
            <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">
              Define the format used for every newly generated influencer code
            </p>
          </div>
        </div>
        <TextInput
          label="Code Prefix"
          name="referralCodePrefix"
          value={rulesForm.referralCodePrefix}
          onChange={handleRulesField}
          maxLength="8"
          pattern="[A-Za-z0-9]*"
          error={rulesErrors.referralCodePrefix}
          hint="Optional; up to 8 uppercase letters or numbers, for example SAM."
        />
        <TextInput
          label="Random Character Length"
          name="referralCodeRandomLength"
          type="number"
          min="4"
          max="16"
          step="1"
          value={rulesForm.referralCodeRandomLength}
          onChange={handleRulesField}
          required
          error={rulesErrors.referralCodeRandomLength}
        />
        <SelectInput
          label="Character Set"
          name="referralCodeCharacterSet"
          value={rulesForm.referralCodeCharacterSet}
          onChange={handleRulesField}
          required
          error={rulesErrors.referralCodeCharacterSet}
        >
          <option value="alphanumeric">Letters and numbers</option>
          <option value="alphabetic">Letters only</option>
          <option value="numeric">Numbers only</option>
        </SelectInput>
        <div className="relative">
          <label className="mb-1.5 block text-xs font-semibold text-[var(--admin-navy)]">
            Example
          </label>

          <div className="flex h-10 items-center rounded-md border border-[var(--admin-line)] bg-[var(--admin-field)] px-3">
            <span className="font-mono text-sm font-semibold tracking-wider text-[var(--admin-navy)]">
              {String(rulesForm.referralCodePrefix || "").toUpperCase()}
              {rulesForm.referralCodeCharacterSet === "numeric"
                ? "0".repeat(
                    Math.min(
                      Math.max(
                        Number(rulesForm.referralCodeRandomLength || 4),
                        4,
                      ),
                      16,
                    ),
                  )
                : "X".repeat(
                    Math.min(
                      Math.max(
                        Number(rulesForm.referralCodeRandomLength || 4),
                        4,
                      ),
                      16,
                    ),
                  )}
            </span>

            <span className="ml-auto text-[10px] font-medium text-[var(--admin-muted)]">
              Preview
            </span>
          </div>
        </div>

        <div className="mt-1 flex items-center gap-3 rounded-lg border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] p-3 md:col-span-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--admin-navy)] text-xs font-bold text-white">
            5
          </span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--admin-navy)]">
              Activation & Advanced Settings
            </h3>
            <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">
              Control when this global rule is active and attach optional
              backend metadata
            </p>
          </div>
        </div>
        <DateRangeFilter
          field={{
            key: "effectiveRange",
            type: "daterange",
            label: "Effective Period",
            startKey: "effectiveFrom",
            endKey: "effectiveTo",
            disableFuture: true,
            width: "w-full",
            placeholder: "Select effective period",
          }}
          values={rulesForm}
          onChange={(key, value) =>
            handleRulesField({ target: { name: key, value } })
          }
        />
        <label className="admin-switch mt-6 h-10 rounded-md border border-[var(--admin-line)] bg-[var(--admin-surface-soft)] px-3">
          <input
            type="checkbox"
            className="sr-only"
            name="active"
            checked={Boolean(rulesForm.active)}
            onChange={handleRulesField}
          />
          <span className="admin-switch-track" />
          <span className="font-semibold">Rule active</span>
        </label>
        <div />
        <label className="block md:col-span-4">
          <span className="mb-1 block text-xs font-medium uppercase text-gray-500">
            Metadata (JSON object)
          </span>
          <textarea
            name="metadata"
            rows="4"
            value={rulesForm.metadata}
            onChange={handleRulesField}
            aria-invalid={Boolean(rulesErrors.metadata)}
            className={`w-full rounded border bg-white px-3 py-2 font-mono text-sm outline-none focus:border-indigo-400 ${rulesErrors.metadata ? "border-red-400" : "border-gray-200"}`}
            placeholder='{"campaign": "default"}'
          />
          {rulesErrors.metadata ? (
            <span className="admin-field-error" role="alert">
              {rulesErrors.metadata}
            </span>
          ) : (
            <span className="mt-1 block text-xs text-gray-500">
              Optional backend metadata. Enter an object or keep {"{}"}.
            </span>
          )}
        </label>

        <div className="flex justify-end border-t border-[var(--admin-line)] pt-4 md:col-span-4">
          <OrangeButton type="submit" disabled={rulesSubmitting || loading}>
            <Check size={16} />
            {rulesSubmitting ? "Saving..." : "Save Rules"}
          </OrangeButton>
        </div>
      </form>
    </section>
  );

  const renderActiveFilterBar = (options = activeStatusOptions) => (
    <FilterBar
      filters={[
        {
          key: "status",
          type: "select",
          label: "Status",
          width: "w-48",
          options,
        },
      ]}
      values={{ status }}
      onChange={(_, value) => setStatus(value)}
      onClear={() => setStatus("")}
      loading={loading}
    />
  );

  const renderBonusRules = () => (
    <SharedDataTable
      columns={[
        { key: "name", label: "Rule" },
        { key: "period", label: "Period" },
        { key: "target", label: "Target" },
        { key: "bonus", label: "Bonus" },
        { key: "applyTo", label: "Apply To" },
        { key: "release", label: "Release" },
        { key: "status", label: "Status" },
        { key: "actions", label: "Actions" },
      ]}
      data={getPageData("bonusRules", bonusRuleRows)}
      page={paginations.bonusRules.page}
      pageSize={paginations.bonusRules.limit}
      totalCount={bonusRuleRows.length}
      onPageChange={(page) => handlePageChange("bonusRules", page)}
      onPageSizeChange={(limit) => handlePageSizeChange("bonusRules", limit)}
      loading={loading || paginationsLoading["bonusRules"]}
      rowKey="key"
      onSearch={setSearch}
      searchPlaceholder="Search bonus rules..."
      filterBar={renderActiveFilterBar(
        ["active", "inactive"].map((value) => ({
          value,
          label: humanize(value),
        })),
      )}
      emptyText="No bonus rules found."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={evaluateBonuses}
            className="inline-flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <Check aria-hidden="true" size={16} />
            Evaluate Bonuses
          </button>
          <button
            type="button"
            onClick={() => openBonusRuleModal()}
            className="inline-flex items-center gap-2 rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <Plus aria-hidden="true" size={16} />
            Bonus Rule
          </button>
        </div>
      }
    />
  );

  const renderBonusProgress = () => (
    <SharedDataTable
      columns={[
        { key: "rule", label: "Rule" },
        { key: "influencer", label: "Referral Partner" },
        { key: "cycle", label: "Cycle" },
        { key: "target", label: "Target" },
        { key: "achieved", label: "Achieved" },
        { key: "progress", label: "Progress" },
        { key: "status", label: "Status" },
      ]}
      data={getPageData("bonusProgress", bonusProgressRows)}
      page={paginations.bonusProgress.page}
      pageSize={paginations.bonusProgress.limit}
      totalCount={bonusProgressRows.length}
      onPageChange={(page) => handlePageChange("bonusProgress", page)}
      onPageSizeChange={(limit) => handlePageSizeChange("bonusProgress", limit)}
      loading={loading || paginationsLoading["bonusProgress"]}
      rowKey="key"
      onSearch={setSearch}
      searchPlaceholder="Search bonus progress..."
      filterBar={renderActiveFilterBar(
        ["achieved", "in_progress"].map((value) => ({
          value,
          label: humanize(value),
        })),
      )}
      emptyText="No active bonus progress found."
    />
  );

  const renderBonusHistory = () => (
    <SharedDataTable
      columns={[
        { key: "rule", label: "Rule" },
        { key: "influencer", label: "Referral Partner" },
        { key: "cycle", label: "Cycle" },
        { key: "target", label: "Target" },
        { key: "bonus", label: "Bonus Coins" },
        { key: "status", label: "Status" },
        { key: "achievedAt", label: "Achieved At" },
      ]}
      data={getPageData("bonusHistory", bonusAchievementRows)}
      page={paginations.bonusHistory.page}
      pageSize={paginations.bonusHistory.limit}
      totalCount={bonusAchievementRows.length}
      onPageChange={(page) => handlePageChange("bonusHistory", page)}
      onPageSizeChange={(limit) => handlePageSizeChange("bonusHistory", limit)}
      loading={loading || paginationsLoading["bonusHistory"]}
      rowKey="key"
      onSearch={setSearch}
      searchPlaceholder="Search bonus achievements..."
      filterBar={renderActiveFilterBar(
        ["locked", "released", "reversed"].map((value) => ({
          value,
          label: humanize(value),
        })),
      )}
      emptyText="No bonus achievements yet."
    />
  );

  const renderBonuses = () => (
    <div className="space-y-3">
      <Tabs
        tabs={bonusTabs}
        activeTab={bonusView}
        onChange={(value) => {
          setBonusView(value);
          setStatus("");
        }}
      />

      {bonusView === "rules" && renderBonusRules()}
      {bonusView === "progress" && renderBonusProgress()}
      {bonusView === "history" && renderBonusHistory()}
    </div>
  );

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title={pageMeta.title}
        subtitle={pageMeta.subtitle}
        breadcrumbs={[{ label: "Marketing" }, { label: pageMeta.title }]}
        actions={
          activeTab === "influencers" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  resetInfluencerForm();
                  setParentModalOpen(true);
                }}
              >
                <UserPlus aria-hidden="true" size={16} />
                Growth Partner
              </button>

              <button
                type="button"
                onClick={() => {
                  resetInfluencerForm();
                  childFormik.resetForm({ values: emptyChildForm });
                  setChildModalOpen(true);
                }}
              >
                <GitBranch aria-hidden="true" size={16} />
                Brand Associate
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingCode(null);
                  codeFormik.resetForm({ values: emptyCodeForm });
                  setCodeModalOpen(true);
                }}
              >
                <Plus aria-hidden="true" size={16} />
                Referral Code
              </button>
              <a
                href={influencerPortalUrl}
                target="_blank"
                rel="noreferrer"
                title="Open the Referral Partner sign-in portal"
              >
                <ExternalLink aria-hidden="true" size={16} />
                Partner Login
              </a>
            </div>
          ) : undefined
        }
      />

      {hasListFilters &&
        ![
          "influencers",

          "bonuses",
          "orders",
          "commissions",
          "payouts",
          "fraud",
        ].includes(activeTab) && (
          <form
            onSubmit={handleSearch}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="relative min-w-[220px] flex-1">
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-gray-400">
                Search
              </label>
              <Search
                size={16}
                className="absolute bottom-3 left-3 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${tabs.find((tab) => tab.key === activeTab)?.label?.toLowerCase() || "records"}…`}
                className="h-10 w-full rounded border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
              />
            </div>
            <FilterSelect
              className="w-48"
              label="Status"
              options={[
                { value: "", label: "All statuses" },
                ...activeStatusOptions,
              ]}
              value={
                [
                  { value: "", label: "All statuses" },
                  ...activeStatusOptions,
                ].find((opt) => String(opt.value) === String(status)) || {
                  value: "",
                  label: "All statuses",
                }
              }
              onChange={(selected) => setStatus(selected ? selected.value : "")}
              isSearchable={false}
              placeholder="All statuses"
              controlHeight={40}
            />
            <OrangeButton
              type="submit"
              className="!h-10 min-w-[106px] justify-center !py-0"
              style={{ height: 40 }}
            >
              <Search size={16} />
              Apply
            </OrangeButton>
            <button
              type="button"
              onClick={() => refreshActive()}
              className="admin-btn-secondary inline-flex h-10 items-center gap-2 px-3"
            >
              <RefreshCw
                aria-hidden="true"
                size={16}
                className={loading ? "animate-spin" : ""}
              />{" "}
              Refresh
            </button>
          </form>
        )}

      {activeTab === "overview" && renderOverview()}
      {activeTab === "influencers" && (
        <SharedDataTable
          columns={[
            { key: "influencer", label: "Referral Partner" },
            { key: "profileId", label: "Profile ID" },
            { key: "type", label: "Type" },
            { key: "code", label: "Referral Code" },
            { key: "hierarchy", label: "Hierarchy" },
            { key: "wallet", label: "Available Coins" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions" },
          ]}
          data={getPageData("influencers", influencerRows)}
          page={paginations.influencers.page}
          pageSize={paginations.influencers.limit}
          totalCount={influencerRows.length}
          onPageChange={(page) => handlePageChange("influencers", page)}
          onPageSizeChange={(limit) => handlePageSizeChange("influencers", limit)}
          loading={loading || paginationsLoading["influencers"]}
          rowKey="key"
          onRowClick={(row) =>
            navigate(`/app/referral-commerce/influencers/view/${row.key}`, {
              state: {
                influencer: influencers.find(
                  (item) => String(getId(item)) === String(row.key),
                ),
              },
            })
          }
          onSearch={setSearch}
          searchPlaceholder="Search referral partners..."
          filterBar={
            <FilterBar
              filters={[
                {
                  key: "status",
                  type: "select",
                  label: "Status",
                  width: "w-48",
                  options: activeStatusOptions,
                },
              ]}
              values={{ status }}
              onChange={(_, value) => setStatus(value)}
              onClear={() => setStatus("")}
              loading={loading}
            />
          }
          emptyText="No referral partners found."
          cardClassName="admin-card overflow-hidden border border-[var(--admin-line)] bg-white shadow-sm"
        />
      )}

      {activeTab === "rules" && renderRules()}
      {activeTab === "productAmounts" && <ProductReferralAmounts />}
      {activeTab === "bonuses" && renderBonuses()}
      {activeTab === "orders" && (
        <SharedDataTable
          columns={[
            { key: "order", label: "Order" },
            { key: "code", label: "Referral Code" },
            { key: "customer", label: "Customer" },
            { key: "amount", label: "Eligible Amount" },
            { key: "discount", label: "Discount" },
            { key: "status", label: "Status" },
            { key: "created", label: "Created" },
          ]}
          data={getPageData("orders", orderRows)}
          page={paginations.orders.page}
          pageSize={paginations.orders.limit}
          totalCount={orderRows.length}
          onPageChange={(page) => handlePageChange("orders", page)}
          onPageSizeChange={(limit) => handlePageSizeChange("orders", limit)}
          loading={loading || paginationsLoading["orders"]}
          rowKey="key"
          onSearch={setSearch}
          searchPlaceholder="Search referral orders..."
          filterBar={renderActiveFilterBar()}
          emptyText="No referral orders found."
        />
      )}

      {activeTab === "payouts" && (
        <SharedDataTable
          columns={[
            { key: "influencer", label: "Referral Partner" },
            { key: "coins", label: "Requested Coins" },
            { key: "payable", label: "Transfer Amount" },
            { key: "method", label: "Method" },
            { key: "destination", label: "Transfer To" },
            { key: "status", label: "Status" },
            { key: "requested", label: "Requested" },
            ...(payoutHasReference
              ? [{ key: "reference", label: "UTR / Reference" }]
              : []),
            ...(payoutHasActions ? [{ key: "actions", label: "Actions" }] : []),
          ]}
          data={getPageData("payouts", payoutRows)}
          page={paginations.payouts.page}
          pageSize={paginations.payouts.limit}
          totalCount={payoutRows.length}
          onPageChange={(page) => handlePageChange("payouts", page)}
          onPageSizeChange={(limit) => handlePageSizeChange("payouts", limit)}
          loading={loading || paginationsLoading["payouts"]}
          rowKey="key"
          onSearch={setSearch}
          searchPlaceholder="Search payout requests..."
          filterBar={renderActiveFilterBar()}
          emptyText="No payout requests found."
        />
      )}

      {activeTab === "fraud" && (
        <SharedDataTable
          columns={[
            { key: "reason", label: "Reason" },
            { key: "influencer", label: "Referral Partner" },
            { key: "code", label: "Referral Code" },
            { key: "severity", label: "Severity" },
            { key: "status", label: "Status" },
            { key: "created", label: "Created" },
          ]}
          data={getPageData("fraud", fraudRows)}
          page={paginations.fraud.page}
          pageSize={paginations.fraud.limit}
          totalCount={fraudRows.length}
          onPageChange={(page) => handlePageChange("fraud", page)}
          onPageSizeChange={(limit) => handlePageSizeChange("fraud", limit)}
          loading={loading || paginationsLoading["fraud"]}
          rowKey="key"
          onSearch={setSearch}
          searchPlaceholder="Search fraud reviews..."
          filterBar={renderActiveFilterBar()}
          actions={
            <span title="Fraud review">
              <ShieldAlert
                aria-hidden="true"
                size={18}
                className="text-amber-600"
              />
            </span>
          }
          emptyText="No fraud reviews found."
        />
      )}

      <DefaultModal
        isOpen={parentModalOpen}
        onClose={closeParentModal}
        onSubmit={submitParent}
        title="Create Growth Partner"
        submitButtonText="Create Growth Partner"
        closeButtonText="Cancel"
        isButtonView={true}
        width="600px"
        loading={parentSubmitting}
      >
        <form onSubmit={parentFormik.handleSubmit} className="space-y-5">
          <FormSection
            title="Basic Information"
            description="Enter the basic details of the growth partner."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              <FormInput
                label="First Name"
                name="firstName"
                required
                value={parentFormik.values.firstName}
                onChange={parentFormik.handleChange}
                onBlur={parentFormik.handleBlur}
                placeholder="Enter first name"
                error={
                  parentFormik.touched.firstName &&
                  parentFormik.errors.firstName
                }
                className="border-[var(--admin-field-line)] focus:border-[var(--admin-gold)] focus:ring-1 focus:ring-[var(--admin-gold)]"
              />

              <FormInput
                label="Last Name"
                name="lastName"
                required
                value={parentFormik.values.lastName}
                onChange={parentFormik.handleChange}
                onBlur={parentFormik.handleBlur}
                placeholder="Enter last name"
                error={
                  parentFormik.touched.lastName && parentFormik.errors.lastName
                }
                className="border-[var(--admin-field-line)] focus:border-[var(--admin-gold)] focus:ring-1 focus:ring-[var(--admin-gold)]"
              />

              <FormInput
                label="Email"
                name="email"
                type="email"
                required
                value={parentFormik.values.email}
                onChange={parentFormik.handleChange}
                onBlur={parentFormik.handleBlur}
                placeholder="Enter email address"
                error={parentFormik.touched.email && parentFormik.errors.email}
                className="border-[var(--admin-field-line)] focus:border-[var(--admin-gold)] focus:ring-1 focus:ring-[var(--admin-gold)]"
              />

              <FormInput
                label="Phone"
                name="phone"
                type="phone"
                value={parentFormik.values.phone}
                onChange={parentFormik.handleChange}
                onBlur={parentFormik.handleBlur}
                placeholder="Enter phone number"
                error={parentFormik.touched.phone && parentFormik.errors.phone}
                className="border-[var(--admin-field-line)] focus:border-[var(--admin-gold)] focus:ring-1 focus:ring-[var(--admin-gold)]"
              />

              <FormInput
                label="Temporary Password"
                name="password"
                type="password"
                required
                value={parentFormik.values.password}
                onChange={parentFormik.handleChange}
                onBlur={parentFormik.handleBlur}
                placeholder="Enter temporary password"
                hint="At least 8 characters. The influencer uses this for the first login."
                error={
                  parentFormik.touched.password && parentFormik.errors.password
                }
                className="border-[var(--admin-field-line)] focus:border-[var(--admin-gold)] focus:ring-1 focus:ring-[var(--admin-gold)]"
              />

              <FormInput
                label="Referral Code"
                name="code"
                value={parentFormik.values.code}
                onChange={parentFormik.handleChange}
                onBlur={parentFormik.handleBlur}
                placeholder="Enter referral code"
                error={parentFormik.touched.code && parentFormik.errors.code}
                className="border-[var(--admin-field-line)] focus:border-[var(--admin-gold)] focus:ring-1 focus:ring-[var(--admin-gold)]"
              />
            </div>
          </FormSection>

          <FormSection
            title="Permissions"
            description="Manage what this parent influencer can do."
          >
            <FormToggleRow
              title="Can Create Brand Associates"
              description="Allow this influencer to create and manage Brand Associates."
              isToggle={Boolean(parentFormik.values.canCreateChildren)}
              handleClick={() =>
                parentFormik.setFieldValue(
                  "canCreateChildren",
                  !parentFormik.values.canCreateChildren,
                )
              }
            />
          </FormSection>
        </form>
      </DefaultModal>

      <DefaultModal
        isOpen={childModalOpen}
        onClose={() => {
          childFormik.resetForm({ values: emptyChildForm });
          setChildModalOpen(false);
        }}
        onSubmit={childFormik.handleSubmit}
        title="Create Brand Associate"
        submitButtonText="Create Brand Associate"
        closeButtonText="Cancel"
        isButtonView={true}
        width="600px"
        loading={loading || childFormik.isSubmitting}
      >
        <div className="space-y-5">
          <FormSection
            title="Basic Information"
            description="Enter the basic details of the Brand Associate."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              {/* Growth Partner - Full Width */}
              <div className="md:col-span-2">
                <FormSelectGroup
                  label="Growth Partner"
                  options={parentOptions.map((parent) => ({
                    label: `${fullName(parent.user)} - ${
                      parent.primaryCode?.code || getId(parent)
                    }`,
                    value: getId(parent),
                  }))}
                  value={childFormik.values.parentId}
                  onChange={(selectedOption) =>
                    childFormik.setFieldValue(
                      "parentId",
                      selectedOption?.value || selectedOption || "",
                    )
                  }
                  error={
                    childFormik.touched.parentId && childFormik.errors.parentId
                  }
                  required
                  placeholder="Select Growth Partner"
                />
              </div>

              {/* First Name */}
              <FormInput
                label="First Name"
                name="firstName"
                value={childFormik.values.firstName}
                onChange={childFormik.handleChange}
                onBlur={childFormik.handleBlur}
                error={
                  childFormik.touched.firstName && childFormik.errors.firstName
                }
                required
                placeholder="Enter first name"
              />

              {/* Last Name */}
              <FormInput
                label="Last Name"
                name="lastName"
                value={childFormik.values.lastName}
                onChange={childFormik.handleChange}
                onBlur={childFormik.handleBlur}
                error={
                  childFormik.touched.lastName && childFormik.errors.lastName
                }
                required
                placeholder="Enter last name"
              />

              {/* Email */}
              <FormInput
                label="Email"
                name="email"
                type="email"
                value={childFormik.values.email}
                onChange={childFormik.handleChange}
                onBlur={childFormik.handleBlur}
                error={childFormik.touched.email && childFormik.errors.email}
                required
                placeholder="Enter email address"
              />

              {/* Phone */}
              <FormInput
                label="Phone"
                name="phone"
                value={childFormik.values.phone}
                onChange={childFormik.handleChange}
                onBlur={childFormik.handleBlur}
                error={childFormik.touched.phone && childFormik.errors.phone}
                placeholder="Enter phone number"
              />

              {/* Password */}
              <FormInput
                label="Password"
                name="password"
                type="password"
                value={childFormik.values.password}
                onChange={childFormik.handleChange}
                onBlur={childFormik.handleBlur}
                error={
                  childFormik.touched.password && childFormik.errors.password
                }
                required
                placeholder="Enter password"
              />

              {/* Referral Code */}
              <FormInput
                label="Referral Code"
                name="code"
                value={childFormik.values.code}
                onChange={childFormik.handleChange}
                onBlur={childFormik.handleBlur}
                error={childFormik.touched.code && childFormik.errors.code}
                placeholder="Enter referral code"
              />
            </div>
          </FormSection>
        </div>
      </DefaultModal>

      <DefaultModal
        isOpen={codeModalOpen}
        onClose={() => {
          setCodeModalOpen(false);
          setEditingCode(null);
          codeFormik.resetForm({ values: emptyCodeForm });
        }}
        onSubmit={codeFormik.handleSubmit}
        title={editingCode ? "Edit Referral Code" : "Create Referral Code"}
        submitButtonText="Save Referral Code"
        closeButtonText="Cancel"
        isButtonView={true}
        width="600px"
        loading={loading || codeFormik.isSubmitting}
      >
        <div className="space-y-5">
          {/* ==================== Referral Code Information ==================== */}
          <FormSection
            title="Referral Code Information"
            description={
              editingCode
                ? "Update the referral code details."
                : "Create a referral code for a referral partner."
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
              {/* Referral Partner */}
              {!editingCode && (
                <div className="md:col-span-2">
                  <FormSelectGroup
                    label="Referral Partner"
                    options={influencers.map((item) => ({
                      label: `${fullName(item.user)} - ${getId(item)}`,
                      value: getId(item),
                    }))}
                    value={codeFormik.values.influencerId}
                    onChange={(selectedOption) =>
                      codeFormik.setFieldValue(
                        "influencerId",
                        selectedOption?.value || selectedOption || "",
                      )
                    }
                    error={
                      codeFormik.touched.influencerId &&
                      codeFormik.errors.influencerId
                    }
                    required
                    placeholder="Select Referral Partner"
                  />
                </div>
              )}

              {/* Referral Code */}
              <FormInput
                label="Referral Code"
                name="code"
                value={codeFormik.values.code}
                onChange={codeFormik.handleChange}
                onBlur={codeFormik.handleBlur}
                error={codeFormik.touched.code && codeFormik.errors.code}
                required
                placeholder="Enter referral code"
              />

              {/* Usage Limit */}
              <FormInput
                label="Usage Limit"
                name="usageLimit"
                type="number"
                value={codeFormik.values.usageLimit}
                onChange={codeFormik.handleChange}
                onBlur={codeFormik.handleBlur}
                error={
                  codeFormik.touched.usageLimit && codeFormik.errors.usageLimit
                }
                placeholder="Enter usage limit"
              />

              {/* Status */}
              <div className="md:col-span-2">
                <FormSelectGroup
                  label="Status"
                  options={referralCodeStatuses.options}
                  value={codeFormik.values.status}
                  onChange={(selectedOption) =>
                    codeFormik.setFieldValue(
                      "status",
                      selectedOption?.value || selectedOption || "",
                    )
                  }
                  error={codeFormik.touched.status && codeFormik.errors.status}
                  required
                  placeholder="Select status"
                />
              </div>
            </div>
          </FormSection>
        </div>
      </DefaultModal>

      <Modal
        title={
          payoutAction?.action === "paid"
            ? "Record Payout Payment"
            : payoutAction?.action === "reject"
              ? "Reject Payout Request"
              : "Approve Payout Request"
        }
        open={Boolean(payoutAction)}
        onClose={closePayoutAction}
        footer={
          <>
            <button
              type="button"
              disabled={uploadingPaymentProof}
              onClick={closePayoutAction}
              className="admin-btn-secondary"
            >
              Cancel
            </button>
            <OrangeButton
              type="submit"
              form="payoutActionForm"
              disabled={
                uploadingPaymentProof ||
                (payoutAction?.action === "paid" &&
                  !payoutActionForm.paymentProofUrl)
              }
            >
              {payoutAction?.action === "paid"
                ? "Mark Paid"
                : payoutAction?.action === "reject"
                  ? "Reject Request"
                  : "Approve Request"}
            </OrangeButton>
          </>
        }
      >
        <form
          id="payoutActionForm"
          onSubmit={handlePayoutAction}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-4 text-sm">
            <div>
              <span className="block text-xs text-gray-500">Partner</span>
              {payoutAction
                ? renderInfluencerRef(payoutAction.payout.influencerId)
                : "-"}
            </div>
            <div>
              <span className="block text-xs text-gray-500">
                Requested coins
              </span>
              <strong>
                {formatCoins(
                  payoutAction?.payout?.coinAmount ??
                    payoutAction?.payout?.amount,
                )}
              </strong>
            </div>
            <div>
              <span className="block text-xs text-gray-500">
                Transfer amount
              </span>
              <strong>
                {formatAmount(
                  payoutAction?.payout?.currencyAmount ??
                    Number(
                      (payoutAction?.payout?.coinAmount ??
                        payoutAction?.payout?.amount) ||
                        0,
                    ) * Number(payoutAction?.payout?.coinValue || 1),
                )}
              </strong>
            </div>
            <div>
              <span className="block text-xs text-gray-500">
                Transfer destination
              </span>
              <strong>
                {payoutAction?.payout?.destinationSnapshot?.accountNumber
                  ? `${payoutAction.payout.destinationSnapshot.bankName || "Bank"} · ${payoutAction.payout.destinationSnapshot.accountNumber}`
                  : payoutAction?.payout?.destinationSnapshot?.upiId ||
                    payoutAction?.payout?.upiId ||
                    payoutAction?.payout?.bankAccountId ||
                    "Manual"}
              </strong>
            </div>
            {payoutAction?.payout?.destinationSnapshot?.accountHolderName && (
              <div>
                <span className="block text-xs text-gray-500">
                  Account holder
                </span>
                <strong>
                  {payoutAction.payout.destinationSnapshot.accountHolderName}
                </strong>
              </div>
            )}
            {payoutAction?.payout?.destinationSnapshot?.ifscCode && (
              <div>
                <span className="block text-xs text-gray-500">IFSC</span>
                <strong>
                  {payoutAction.payout.destinationSnapshot.ifscCode}
                </strong>
              </div>
            )}
            {payoutAction?.payout?.payoutQrUrl && (
              <div>
                <span className="block text-xs text-gray-500">
                  Submitted QR
                </span>
                <a
                  href={payoutAction.payout.payoutQrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                >
                  <ExternalLink aria-hidden="true" size={13} />
                  Review QR
                </a>
              </div>
            )}
            <div>
              <span className="block text-xs text-gray-500">
                Destination source
              </span>
              <strong>
                {payoutAction?.payout?.destinationSource === "saved_profile"
                  ? "Saved profile details"
                  : payoutAction?.payout?.destinationSource === "one_time"
                    ? "One-time details"
                    : "Legacy request"}
              </strong>
            </div>
          </div>
          {payoutAction?.action === "paid" && (
            <>
              <TextInput
                required
                label="Bank / UPI Transaction Reference *"
                name="transactionReference"
                value={payoutActionForm.transactionReference}
                onChange={(event) =>
                  setPayoutActionForm((form) => ({
                    ...form,
                    transactionReference: event.target.value,
                  }))
                }
              />
              <div className="rounded-lg border border-dashed border-[#d8caa6] bg-[#fffaf0] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium uppercase text-gray-600">
                      Payment proof *
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Upload a PDF, JPG, PNG, or WebP receipt.
                    </div>
                  </div>
                  <label
                    className={`admin-btn-secondary inline-flex cursor-pointer items-center gap-2 ${uploadingPaymentProof ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <UploadCloud aria-hidden="true" size={15} />
                    {uploadingPaymentProof
                      ? "Uploading…"
                      : payoutActionForm.paymentProofUrl
                        ? "Replace file"
                        : "Upload proof"}
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingPaymentProof}
                      onChange={handlePaymentProofUpload}
                    />
                  </label>
                </div>
                {payoutActionForm.paymentProofUrl && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-green-200 bg-white px-3 py-2 text-xs">
                    <a
                      href={payoutActionForm.paymentProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-w-0 items-center gap-1 font-semibold text-green-700 hover:underline"
                    >
                      <ExternalLink aria-hidden="true" size={13} /> View
                      uploaded payment proof
                    </a>
                    <button
                      type="button"
                      className="font-semibold text-red-600 hover:underline"
                      onClick={() =>
                        setPayoutActionForm((form) => ({
                          ...form,
                          paymentProofUrl: "",
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase text-gray-500">
              Admin Note{payoutAction?.action === "reject" ? " *" : ""}
            </span>
            <textarea
              required={payoutAction?.action === "reject"}
              rows="3"
              value={payoutActionForm.adminNote}
              onChange={(event) =>
                setPayoutActionForm((form) => ({
                  ...form,
                  adminNote: event.target.value,
                }))
              }
              className="admin-input w-full resize-y"
              placeholder="Add an audit note"
            />
          </label>
        </form>
      </Modal>

      <DefaultModal
        isOpen={bonusRuleModalOpen}
        onClose={() => {
          setBonusRuleModalOpen(false);
          setEditingBonusRule(null);
          setBonusRuleForm(emptyBonusRuleForm);
        }}
        title={editingBonusRule ? "Edit Bonus Rule" : "Create Bonus Rule"}
        submitButtonText="Save Bonus Rule"
        closeButtonText="Cancel"
        isButtonView={true}
        onSubmit={submitBonusRule}
      >
        <div className="space-y-5">
          {/* ==================== Basic Information ==================== */}
          <FormSection
            title="Basic Information"
            description="Configure the bonus rule and its applicable period."
          >
            <div className="space-y-4">
              {/* Full Width */}
              <FormInput
                label="Bonus Rule Name"
                name="ruleName"
                value={bonusRuleForm.ruleName}
                onChange={handleBonusRuleField}
                placeholder="Enter bonus rule name"
                required
              />

              {/* 2 Fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormSelectGroup
                  label="Bonus Period"
                  options={referralBonusPeriods.options}
                  value={
                    referralBonusPeriods.options.find(
                      (option) => option.value === bonusRuleForm.period,
                    ) || null
                  }
                  onChange={(option) =>
                    handleBonusRuleField({
                      target: {
                        name: "period",
                        value: option?.value || "",
                      },
                    })
                  }
                />

                <FormSelectGroup
                  label="Target Type"
                  options={referralBonusTargetTypes.options}
                  value={
                    referralBonusTargetTypes.options.find(
                      (option) => option.value === bonusRuleForm.targetType,
                    ) || null
                  }
                  onChange={(option) =>
                    handleBonusRuleField({
                      target: {
                        name: "targetType",
                        value: option?.value || "",
                      },
                    })
                  }
                />
              </div>

              {/* Custom Dates - 2 fields logically belong together */}
              {bonusRuleForm.period === "custom" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormInput
                    label="Custom Start"
                    name="customStartAt"
                    type="date"
                    value={bonusRuleForm.customStartAt}
                    onChange={handleBonusRuleField}
                  />

                  <FormInput
                    label="Custom End"
                    name="customEndAt"
                    type="date"
                    value={bonusRuleForm.customEndAt}
                    onChange={handleBonusRuleField}
                  />
                </div>
              )}
            </div>
          </FormSection>

          {/* ==================== Target & Bonus ==================== */}
          <FormSection
            title="Target & Bonus"
            description="Define the target value and bonus that will be awarded."
          >
            <div className="space-y-4">
              {/* Target Value + Bonus Type */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label="Target Value"
                  name="targetValue"
                  type="number"
                  step="0.01"
                  value={bonusRuleForm.targetValue}
                  onChange={handleBonusRuleField}
                  placeholder="Enter target value"
                />

                <FormSelectGroup
                  label="Bonus Type"
                  options={referralBonusTypes.options}
                  value={
                    referralBonusTypes.options.find(
                      (option) => option.value === bonusRuleForm.bonusType,
                    ) || null
                  }
                  onChange={(option) =>
                    handleBonusRuleField({
                      target: {
                        name: "bonusType",
                        value: option?.value || "",
                      },
                    })
                  }
                />
              </div>

              {/* Bonus Value + Apply To */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  label="Bonus Value"
                  name="bonusValue"
                  type="number"
                  step="0.01"
                  value={bonusRuleForm.bonusValue}
                  onChange={handleBonusRuleField}
                  placeholder="Enter bonus value"
                />

                <FormSelectGroup
                  label="Apply To"
                  options={referralBonusApplyTo.options}
                  value={
                    referralBonusApplyTo.options.find(
                      (option) => option.value === bonusRuleForm.applyTo,
                    ) || null
                  }
                  onChange={(option) =>
                    handleBonusRuleField({
                      target: {
                        name: "applyTo",
                        value: option?.value || "",
                      },
                    })
                  }
                />
              </div>
            </div>
          </FormSection>

          {/* ==================== Rule Settings ==================== */}
          <FormSection
            title="Rule Settings"
            description="Configure the reset cycle and bonus release conditions."
          >
            <div className="space-y-4">
              {/* Reset Cycle + Release Rule */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormSelectGroup
                  label="Reset Cycle"
                  options={["monthly", "quarterly", "yearly"].map((value) => ({
                    label: value.replace(/_/g, " "),
                    value,
                  }))}
                  value={{
                    label: bonusRuleForm.resetCycle?.replace(/_/g, " "),
                    value: bonusRuleForm.resetCycle,
                  }}
                  onChange={(option) =>
                    handleBonusRuleField({
                      target: {
                        name: "resetCycle",
                        value: option?.value || "",
                      },
                    })
                  }
                />

                <FormSelectGroup
                  label="Release Rule"
                  options={referralBonusReleaseRules.options}
                  value={
                    referralBonusReleaseRules.options.find(
                      (option) => option.value === bonusRuleForm.releaseRule,
                    ) || null
                  }
                  onChange={(option) =>
                    handleBonusRuleField({
                      target: {
                        name: "releaseRule",
                        value: option?.value || "",
                      },
                    })
                  }
                />
              </div>

              {/* Status - Full Width because it is alone */}
              <FormToggleRow
                title="Status"
                description="Enable this bonus rule to make it active and available."
                isToggle={bonusRuleForm.status === "active"}
                handleClick={() =>
                  setBonusRuleForm((prev) => ({
                    ...prev,
                    status: prev.status === "active" ? "inactive" : "active",
                  }))
                }
              />
            </div>
          </FormSection>
        </div>
      </DefaultModal>
    </div>
  );
};

export default ReferralCommerce;
