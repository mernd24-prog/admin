import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import {
  BadgeIndianRupee,
  Check,
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
  promoteReferralInfluencer,
  rejectReferralPayout,
  updateReferralCode,
  updateReferralBonusRule,
  updateReferralInfluencerStatus,
  updateReferralInfluencerChildPermission,
  updateReferralRules,
} from "../../Redux/referralCommerceSlice";
import { formatDateTime12Hour, formatLabel } from "../../utils/formatters";
import { uploadDocumentFile } from "../../_helpers/globalFunctions";
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

const influencerPortalUrl =
  process.env.REACT_APP_INFLUENCER_PORTAL_URL ||
  process.env.VITE_INFLUENCER_PORTAL_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:5173/login`
    : "http://localhost:5173/login");

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "influencers", label: "Referral Partners" },
  { key: "codes", label: "Referral Codes" },
  { key: "rules", label: "Rules & Coins" },
  { key: "productAmounts", label: "Product Referral Amounts" },
  { key: "bonuses", label: "Bonuses" },
  { key: "orders", label: "Referral Orders" },
  { key: "commissions", label: "Wallet Ledger" },
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
  commissions: [
    "pending",
    "locked",
    "available",
    "payout_requested",
    "paid",
    "reversed",
    "expired",
  ],
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
  codes: {
    title: "Referral Codes",
    subtitle: "Create and manage referral codes",
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
  commissions: {
    title: "Wallet Ledger",
    subtitle: "Track referral coins and wallet transactions",
  },
  payouts: {
    title: "Payout Requests",
    subtitle: "Review and manage referral partner payout requests",
  },
  hierarchy: {
    title: "Hierarchy",
    subtitle: "View Growth Partner and Brand Associate relationships",
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
        <MoreVertical size={18} />
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
  minLength,
  step,
  hint = "",
  required = false,
}) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium uppercase text-gray-500">
      {label}
    </span>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      minLength={minLength}
      step={step}
      required={required}
      className="h-10 w-full rounded border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-indigo-400"
    />
    {hint ? (
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
  const [loading, setLoading] = useState(false);
  const unwrapList = (response) => {
    const value = response?.data?.data || response?.data || [];
    return Array.isArray(value)
      ? value
      : value.items || value.list || value.products || [];
  };
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [configResponse, productResponse] = await Promise.all([
        axiosPrivate.get(ENDPOINTS.referral.productAmounts, {
          params: { page: 1, limit: 100 },
        }),
        axiosPrivate.get(ENDPOINTS.products.list, {
          params: { page: 1, limit: 200, status: "active" },
        }),
      ]);
      setConfigs(unwrapList(configResponse));
      setProducts(unwrapList(productResponse));
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Unable to load product referral amounts",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const selectedProduct = products.find(
    (product) => String(getId(product)) === String(form.productId),
  );
  const save = async (event) => {
    event.preventDefault();
    if (!form.productId || form.amountValue === "")
      return toast.error("Select a product and enter its referral amount");
    try {
      setLoading(true);
      await axiosPrivate.put(ENDPOINTS.referral.productAmounts, {
        ...form,
        productTitle:
          selectedProduct?.name ||
          selectedProduct?.title ||
          form.productTitle ||
          "",
        amountValue: Number(form.amountValue),
        maximumAmount: Number(form.maximumAmount || 0),
      });
      toast.success("Product referral amount saved");
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
      await axiosPrivate.delete(
        ENDPOINTS.referral.productAmount(getId(config)),
      );
      toast.success("Product override removed; global amount will apply");
      await load();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to remove override",
      );
    }
  };
  return (
    <section className="admin-card overflow-hidden">
      <div className="border-b border-[var(--admin-line)] p-5">
        <h2 className="text-base font-bold text-[var(--admin-navy)]">
          Product Referral Pool Overrides
        </h2>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          Set how much pool a product contributes. Distribution percentages
          always come from Global Rules. Variants cannot override this value.
        </p>
      </div>
      <form
        onSubmit={save}
        className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4"
      >
        <label className="text-xs font-semibold text-gray-600">
          Product
          <select
            className="admin-input mt-2"
            value={form.productId}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                productId: event.target.value,
              }))
            }
          >
            <option value="">Select product</option>
            {products.map((product) => (
              <option key={getId(product)} value={getId(product)}>
                {product.name || product.title || getId(product)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-gray-600">
          Amount type
          <select
            className="admin-input mt-2"
            value={form.amountType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                amountType: event.target.value,
              }))
            }
          >
            <option value="fixed_amount">Fixed amount per unit</option>
            <option value="percentage">Percentage of product line</option>
          </select>
        </label>
        <TextInput
          label={
            form.amountType === "percentage"
              ? "Pool Percentage"
              : "Pool Amount Per Unit (₹)"
          }
          name="amountValue"
          type="number"
          min="0"
          step="0.01"
          value={form.amountValue}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              amountValue: event.target.value,
            }))
          }
        />
        <TextInput
          label="Maximum Pool Per Line (₹)"
          name="maximumAmount"
          type="number"
          min="0"
          step="0.01"
          value={form.maximumAmount}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              maximumAmount: event.target.value,
            }))
          }
          hint="0 means no extra cap."
        />
        <div className="flex items-center justify-between gap-3 md:col-span-2 xl:col-span-4">
          <label className="admin-switch">
            <input
              type="checkbox"
              className="sr-only"
              checked={form.active}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  active: event.target.checked,
                }))
              }
            />
            <span className="admin-switch-track" />
            <span>Active override</span>
          </label>
          <OrangeButton type="submit" disabled={loading}>
            <Check size={16} /> Save Product Amount
          </OrangeButton>
        </div>
      </form>
      <div className="border-t border-[var(--admin-line)]">
        <SharedDataTable
          columns={[
            { key: "productTitle", label: "Product" },
            {
              key: "amountType",
              label: "Type",
              render: (value) => formatLabel(value),
            },
            { key: "amountValue", label: "Pool Value" },
            { key: "maximumAmount", label: "Maximum" },
            {
              key: "active",
              label: "Status",
              render: (value) => (value ? "Active" : "Inactive"),
            },
          ]}
          data={configs}
          loading={loading}
          rowActions={(row) => [
            {
              label: "Edit",
              icon: <Pencil size={15} />,
              onClick: () =>
                setForm({
                  productId: row.productId,
                  productTitle: row.productTitle || "",
                  amountType: row.amountType,
                  amountValue: row.amountValue,
                  maximumAmount: row.maximumAmount || "",
                  active: row.active !== false,
                }),
            },
            {
              label: "Remove override",
              icon: <X size={15} />,
              danger: true,
              onClick: () => remove(row),
            },
          ]}
          emptyText="No product overrides. The global referral pool amount applies to every product."
        />
      </div>
    </section>
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
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [childModalOpen, setChildModalOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [bonusRuleModalOpen, setBonusRuleModalOpen] = useState(false);
  const [editingBonusRule, setEditingBonusRule] = useState(null);
  const [bonusView, setBonusView] = useState("rules");
  const [payoutAction, setPayoutAction] = useState(null);
  const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false);
  const [payoutActionForm, setPayoutActionForm] = useState({
    adminNote: "",
    transactionReference: "",
    paymentProofUrl: "",
  });
  const [parentId, setParentId] = useState("");
  const [influencerForm, setInfluencerForm] = useState(emptyInfluencerForm);
  const [codeForm, setCodeForm] = useState(emptyCodeForm);
  const [rulesForm, setRulesForm] = useState(emptyRulesForm);
  const [bonusRuleForm, setBonusRuleForm] = useState(emptyBonusRuleForm);

  const summary = getBranchPayload(referralState.summaryData);
  const rulesPayload = getBranchPayload(referralState.rulesData);
  const influencers = getBranchList(referralState.influencersData);
  const codes = getBranchList(referralState.codesData);
  const orders = getBranchList(referralState.ordersData);
  const commissions = getBranchList(referralState.commissionsData);
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
    if (!influencer) {
      return (
        <span className="font-mono text-xs text-gray-500">
          {shortId(influencerId)}
        </span>
      );
    }
    return (
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-gray-800">
          {fullName(influencer.user)}
        </div>
        <div className="truncate font-mono text-xs text-gray-500">
          Profile {shortId(getId(influencer))}
        </div>
      </div>
    );
  };

  const renderOrderLink = (orderId, orderNumber) => {
    return <OrderLink orderId={orderId} orderNumber={orderNumber} />;
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
    const responses = await Promise.all([
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
          dispatch(getReferralInfluencers(query)),
          dispatch(getReferralHierarchy()),
        ]),
      codes: () => dispatch(getReferralCodes(query)),
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

  useEffect(() => {
    refreshAll({ q: "", status: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSearch("");
    setStatus("");
    refreshActive({ q: "", status: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (
      ![
        "influencers",
        "codes",
        "bonuses",
        "orders",
        "commissions",
        "payouts",
        "fraud",
      ].includes(activeTab)
    ) {
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
      });
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
    setInfluencerForm(emptyInfluencerForm);
    setParentId("");
  };

  const handleInfluencerField = (event) => {
    const { name, value, type, checked } = event.target;
    setInfluencerForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCodeField = (event) => {
    const { name, value } = event.target;
    setCodeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRulesField = (event) => {
    const { name, value, type, checked } = event.target;
    setRulesForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleWithdrawalMethod = (method) => {
    setRulesForm((prev) => {
      const selected = new Set(
        Array.isArray(prev.withdrawalMethods) ? prev.withdrawalMethods : [],
      );
      if (selected.has(method)) selected.delete(method);
      else selected.add(method);
      return {
        ...prev,
        withdrawalMethods: Array.from(selected),
      };
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
    try {
      await dispatch(
        createReferralParent(compactPayload(influencerForm)),
      ).unwrap();
      toast.success("Parent Influencer created");
      setParentModalOpen(false);
      resetInfluencerForm();
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to create Parent Influencer");
    }
  };

  const submitChild = async (event) => {
    event.preventDefault();
    try {
      await dispatch(
        createReferralChild({
          ...compactPayload(influencerForm),
          parentId,
        }),
      ).unwrap();
      toast.success("Brand Associate created");
      setChildModalOpen(false);
      resetInfluencerForm();
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to create Brand Associate");
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    const payload = compactPayload(numberize(codeForm, ["usageLimit"]));
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
      setCodeForm(emptyCodeForm);
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to save referral code");
    }
  };

  const submitRules = async (event) => {
    event.preventDefault();
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
    ].reduce((acc, key) => {
      if (rulesForm[key] !== undefined) acc[key] = rulesForm[key];
      return acc;
    }, {});
    try {
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

  const setInfluencerStatus = async (influencer, nextStatus) => {
    try {
      await dispatch(
        updateReferralInfluencerStatus({
          influencerId: getId(influencer),
          status: nextStatus,
        }),
      ).unwrap();
      toast.success("Referral Partner status updated");
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to update Referral Partner status");
    }
  };

  const promoteInfluencer = async (influencer) => {
    try {
      await dispatch(
        promoteReferralInfluencer({
          influencerId: getId(influencer),
          canCreateChildren: true,
        }),
      ).unwrap();
      toast.success("Brand Associate promoted to Growth Partner");
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to promote Brand Associate");
    }
  };

  const toggleChildPermission = async (influencer) => {
    const granting = !influencer.canCreateChildren;
    try {
      await dispatch(updateReferralInfluencerChildPermission({
        influencerId: getId(influencer),
        canCreateChildren: granting,
        reason: granting ? "Granted by Admin" : "Revoked by Admin",
      })).unwrap();
      toast.success(granting
        ? "Child account permission granted"
        : "Child account permission revoked; registration QR is disabled");
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to update child account permission");
    }
  };

  const copyRegistrationLink = async (influencer) => {
    const link = influencer.childRegistration?.registrationUrl;
    if (!link || !influencer.childRegistration?.shareable) {
      toast.error("Grant child account permission before sharing this registration QR/link");
      return;
    }
    await navigator.clipboard.writeText(link);
    toast.success("Associate registration link copied");
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
    setCodeForm({
      influencerId: code.influencerId || "",
      code: code.code || "",
      status: code.status || "active",
      usageLimit: code.usageLimit || "",
    });
    setCodeModalOpen(true);
  };

  const statItems = [
    {
      label: "Referral Partners",
      value: summary?.influencers?.total || 0,
      sub: `${summary?.influencers?.active || 0} active`,
      icon: <UserPlus size={18} />,
      iconBg: "#dce5fb",
      iconColor: "#2457d6",
    },
    {
      label: "Active Codes",
      value: summary?.codes?.active || 0,
      sub: `${summary?.codes?.total || 0} total`,
      icon: <Share2 size={18} />,
      iconBg: "#e7dcff",
      iconColor: "#8156e8",
    },
    {
      label: "Referral Sales",
      value: formatAmount(summary?.orders?.eligibleAmount),
      sub: `${summary?.orders?.total || 0} orders`,
      icon: <BadgeIndianRupee size={18} />,
      iconBg: "#ffe7b8",
      iconColor: "#e79a00",
    },
    {
      label: "Referral Coins",
      value: formatCoins(summary?.commissions?.amount),
      sub: `${summary?.commissions?.totalEntries || 0} ledger entries`,
      icon: <GitBranch size={18} />,
      iconBg: "#cfeee0",
      iconColor: "#23965b",
    },
    {
      label: "Bonus Coins",
      value: formatCoins(summary?.bonuses?.totalCoins),
      sub: `${summary?.bonuses?.achievements || 0} achievements`,
      icon: <Check size={18} />,
      iconBg: "#ffd7d4",
      iconColor: "#ef5057",
    },
  ];

  const influencerRows = influencers.map((item) => ({
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
    status: <StatusPill value={item.status} />,
    actions: (
      <RowActions
        actions={[
          {
            label:
              item.status === "pending"
                ? "Approve account"
                : item.status === "active"
                ? "Suspend partner"
                : "Reactivate partner",
            icon:
              item.status === "active" ? <X size={14} /> : <Check size={14} />,
            danger: item.status === "active",
            onClick: () =>
              setInfluencerStatus(
                item,
                item.status === "active" ? "suspended" : "active",
              ),
          },
          {
            label: item.canCreateChildren
              ? "Revoke child creation"
              : "Grant child creation",
            icon: item.canCreateChildren ? <X size={14} /> : <UserPlus size={14} />,
            onClick: () => toggleChildPermission(item),
          },
          {
            label: "Copy registration link",
            icon: <Share2 size={14} />,
            hidden: !item.childRegistration?.shareable,
            onClick: () => copyRegistrationLink(item),
          },
          {
            label: "Promote to Growth Partner",
            icon: <GitBranch size={14} />,
            hidden: item.influencerType === "parent" && item.canCreateChildren,
            onClick: () => promoteInfluencer(item),
          },
        ]}
      />
    ),
  }));

  const codeRows = codes.map((code) => ({
    key: getId(code),
    code: <span className="font-semibold text-gray-900">{code.code}</span>,
    influencer: renderInfluencerRef(code.influencerId),
    usage: `${code.usageCount || 0}${code.usageLimit ? ` / ${code.usageLimit}` : ""}`,
    status: <StatusPill value={code.status} />,
    actions: (
      <RowActions
        actions={[
          {
            label: "Edit code",
            icon: <Pencil size={14} />,
            onClick: () => openEditCode(code),
          },
          {
            label:
              code.status === "active" ? "Deactivate code" : "Activate code",
            icon:
              code.status === "active" ? <X size={14} /> : <Check size={14} />,
            danger: code.status === "active",
            onClick: () => toggleCodeStatus(code),
          },
        ]}
      />
    ),
  }));

  const orderRows = orders.map((order) => ({
    key: getId(order),
    order: renderOrderLink(
      order.orderId || order.order_id,
      order.orderNumber || order.order_number,
    ),
    code: order.code,
    customer: order.customerId,
    amount: formatAmount(order.eligibleAmount),
    discount: formatAmount(order.discountAmount),
    status: <StatusPill value={order.status} />,
    created: formatDate(order.createdAt),
  }));

  const commissionRows = commissions.map((entry) => ({
    key: getId(entry),
    order: renderOrderLink(
      entry.orderId || entry.order_id,
      entry.orderNumber || entry.order_number,
    ),
    influencer: renderInfluencerRef(entry.influencerId),
    type: entry.commissionType,
    basis: formatAmount(entry.basisAmount),
    amount: formatCoins(entry.amount),
    status: <StatusPill value={entry.status} />,
    releaseAt: formatDate(entry.releaseAt),
  }));

  const payoutRows = payouts.map((payout) => ({
    key: getId(payout),
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
            icon: <Check size={14} />,
            hidden: payout.status !== "pending",
            onClick: () => openPayoutAction(payout, "approve"),
          },
          {
            label: "Reject request",
            icon: <X size={14} />,
            danger: true,
            hidden: !["pending", "approved", "processing", "failed"].includes(
              payout.status,
            ),
            onClick: () => openPayoutAction(payout, "reject"),
          },
          {
            label: "Mark as paid",
            icon: <BadgeIndianRupee size={14} />,
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
            icon: <Pencil size={14} />,
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

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {statItems.map((item) => (
          <SummaryCard
            key={item.label}
            title={item.label}
            value={item.value}
            description={item.sub}
            icon={<span style={{ color: item.iconColor }}>{item.icon}</span>}
            iconClassName="right-0 top-0 h-9 w-10 rounded-none rounded-bl-[10px] border-0"
            iconStyle={{ backgroundColor: item.iconBg }}
            className="min-h-[100px]"
            titleClassName="uppercase text-[10px]"
            valueClassName="text-[20px]"
            descriptionClassName="mt-2 text-[10px]"
          />
        ))}
      </div>
      <section className="admin-card overflow-hidden">
        <div className="flex flex-wrap items-center  justify-between gap-3 border-b border-[var(--admin-line)] px-4 py-3.5">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--admin-navy)]">
              Wallet Balances
            </h2>
            <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
              Current referral coin allocation by wallet state
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--admin-gold-soft)] text-[var(--admin-gold-dark)]">
            <BadgeIndianRupee size={19} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {[
            {
              label: "Locked",
              value:
                summary?.wallets?.lockedBalance ??
                summary?.wallets?.pendingBalance,
              helper: "Awaiting release",
              icon: <ShieldAlert size={18} />,
            },
            {
              label: "Available",
              value: summary?.wallets?.availableBalance,
              helper: "Ready for payout",
              icon: <Check size={18} />,
            },
            {
              label: "Reserved",
              value: summary?.wallets?.reservedBalance,
              helper: "Held for requests",
              icon: <GitBranch size={18} />,
            },
            {
              label: "Withdrawn",
              value:
                summary?.wallets?.withdrawnBalance ??
                summary?.wallets?.paidBalance,
              helper: "Successfully paid",
              icon: <ExternalLink size={18} />,
            },
            {
              label: "Reversed",
              value: summary?.wallets?.reversedBalance,
              helper: "Returned to wallet",
              icon: <RefreshCw size={18} />,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="relative min-h-[104px] doverflow-hidden rounded-lg border border-[var(--admin-line)] bg-gradient-to-br from-white to-[var(--admin-gold-soft)]/45 p-4 shadow-[0_8px_22px_rgba(31,27,95,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--admin-gold)] hover:shadow-[var(--admin-shadow)]"
            >
              {/* <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--admin-gold)]" /> */}
              {/* <div className="absolute right-0 top-0 flex h-10 w-11 items-center justify-center rounded-bl-xl bg-[var(--admin-gold-soft)] text-[var(--admin-navy)]">
                {item.icon}
              </div> */}
              <p className="pr-10 text-[10px] font-bold uppercase tracking-wide text-[var(--admin-muted)]">
                {item.label}
              </p>
              <p className="mt-2 text-xl font-bold text-[var(--admin-navy)]">
                {formatCoins(item.value)}
              </p>
              <p className="mt-1.5 text-[10px] font-medium text-[var(--admin-muted)]">
                {item.helper}
              </p>
            </div>
          ))}
        </div>
      </section>

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
          <tbody className="text-[12px] text-slate-600">
            {orders.slice(0, 5).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No recent orders available.
                </td>
              </tr>
            )}
            {orders.slice(0, 5).map((order, index) => {
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
              const formattedAmount = `₹${Number(amountVal).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

              const customerName =
                order.customerName ||
                order.customer ||
                order.customerId ||
                order.buyer_id ||
                order.buyerId ||
                "-";

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
                  <td className="px-4 py-3">{formatLabel(customerName)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {formattedAmount}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill value={status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );

  const renderRules = () => (
    <section className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-line)] bg-gradient-to-r from-white to-[var(--admin-gold-soft)]/35 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--admin-navy)]">
            <BadgeIndianRupee
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
        />
        <TextInput
          label="Coin Expiry Days"
          name="coinExpiryDays"
          type="number"
          value={rulesForm.coinExpiryDays}
          onChange={handleRulesField}
        />
        <SelectInput
          label="Coin Usage"
          name="coinUsage"
          value={rulesForm.coinUsage}
          onChange={handleRulesField}
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
          label="Release Delay Days"
          name="releaseDelayDays"
          type="number"
          value={rulesForm.releaseDelayDays}
          onChange={handleRulesField}
        />
        <TextInput
          label="Minimum Eligible Order Amount"
          name="minOrderAmount"
          type="number"
          min="0"
          step="0.01"
          value={rulesForm.minOrderAmount}
          onChange={handleRulesField}
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
          value={rulesForm.customerSharePercent}
          onChange={handleRulesField}
        />
        <TextInput
          label="Brand Associate Share %"
          name="childSharePercent"
          type="number"
          min="0"
          step="0.01"
          value={rulesForm.childSharePercent}
          onChange={handleRulesField}
        />
        <TextInput
          label="Growth Partner Share %"
          name="parentSharePercent"
          type="number"
          step="0.01"
          value={rulesForm.parentSharePercent}
          onChange={handleRulesField}
        />

        <div
          className={`rounded-lg border p-3 ${
            Number(rulesForm.customerSharePercent || 0) +
              Number(rulesForm.childSharePercent || 0) +
              Number(rulesForm.parentSharePercent || 0) ===
            100
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex items-center justify-between gap-3 text-xs font-semibold">
            <span className="text-[var(--admin-ink)]">Total allocation</span>
            <span
              className={
                Number(rulesForm.customerSharePercent || 0) +
                  Number(rulesForm.childSharePercent || 0) +
                  Number(rulesForm.parentSharePercent || 0) ===
                100
                  ? "text-emerald-700"
                  : "text-red-700"
              }
            >
              {Number(rulesForm.customerSharePercent || 0) +
                Number(rulesForm.childSharePercent || 0) +
                Number(rulesForm.parentSharePercent || 0)}
              %
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
            <div
              className={`h-full rounded-full ${
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
          <p className="mt-2 text-[10px] text-[var(--admin-muted)]">
            Shares should total exactly 100%
          </p>
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
          step="0.01"
          value={rulesForm.minimumWithdrawalCoins}
          onChange={handleRulesField}
        />
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
          hint="Up to 8 uppercase letters or numbers, for example SAM."
        />
        <TextInput
          label="Random Character Length"
          name="referralCodeRandomLength"
          type="number"
          min="4"
          max="16"
          value={rulesForm.referralCodeRandomLength}
          onChange={handleRulesField}
        />
        <SelectInput
          label="Character Set"
          name="referralCodeCharacterSet"
          value={rulesForm.referralCodeCharacterSet}
          onChange={handleRulesField}
        >
          <option value="alphanumeric">Letters and numbers</option>
          <option value="alphabetic">Letters only</option>
          <option value="numeric">Numbers only</option>
        </SelectInput>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="block text-[10px] font-semibold uppercase tracking-wide">
            Example
          </span>
          <strong>
            {String(rulesForm.referralCodePrefix || "").toUpperCase()}
            {rulesForm.referralCodeCharacterSet === "numeric"
              ? "0".repeat(
                  Math.min(Number(rulesForm.referralCodeRandomLength || 6), 16),
                )
              : "X".repeat(
                  Math.min(Number(rulesForm.referralCodeRandomLength || 6), 16),
                )}
          </strong>
        </div>
        <TextInput
          label="Maximum Withdrawal Coins"
          name="maximumWithdrawalCoins"
          type="number"
          step="0.01"
          value={rulesForm.maximumWithdrawalCoins}
          onChange={handleRulesField}
        />
        <TextInput
          label="Daily Withdrawal Limit"
          name="dailyWithdrawalLimitCoins"
          type="number"
          step="0.01"
          value={rulesForm.dailyWithdrawalLimitCoins}
          onChange={handleRulesField}
        />
        <TextInput
          label="Monthly Withdrawal Limit"
          name="monthlyWithdrawalLimitCoins"
          type="number"
          step="0.01"
          value={rulesForm.monthlyWithdrawalLimitCoins}
          onChange={handleRulesField}
        />
        <SelectInput
          label="Approval Mode"
          name="withdrawalApprovalMode"
          value={rulesForm.withdrawalApprovalMode}
          onChange={handleRulesField}
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
          <span className="mb-2 block text-xs font-medium uppercase text-gray-500">
            Withdrawal Methods
          </span>
          <div className="flex flex-wrap gap-2">
            {optionList(referralWithdrawalMethods.options, [
              "upi",
              "bank",
              "manual",
            ]).map((option) => (
              <label
                key={option.value}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
                  Array.isArray(rulesForm.withdrawalMethods) &&
                  rulesForm.withdrawalMethods.includes(option.value)
                    ? "border-[var(--admin-gold)] bg-[var(--admin-gold-soft)] text-[var(--admin-navy)]"
                    : "border-[var(--admin-line)] bg-white text-[var(--admin-muted)] hover:border-[var(--admin-gold)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(rulesForm.withdrawalMethods) &&
                    rulesForm.withdrawalMethods.includes(option.value)
                  }
                  onChange={() => toggleWithdrawalMethod(option.value)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-[var(--admin-line)] pt-4 md:col-span-4">
          <OrangeButton type="submit">
            <Check size={16} />
            Save Rules
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
      data={bonusRuleRows}
      loading={loading}
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
            <Check size={16} />
            Evaluate Bonuses
          </button>
          <button
            type="button"
            onClick={() => openBonusRuleModal()}
            className="inline-flex items-center gap-2 rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <Plus size={16} />
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
      data={bonusProgressRows}
      loading={loading}
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
      data={bonusAchievementRows}
      loading={loading}
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
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1.5">
        {[
          ["rules", "Rules"],
          ["progress", "Current Progress"],
          ["history", "Achievement History"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setBonusView(value);
              setStatus("");
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${bonusView === value ? "bg-[var(--admin-navy)] text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            {label}
          </button>
        ))}
      </div>
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
                <UserPlus size={16} />
                Parent Influencer
              </button>

              <button
                type="button"
                onClick={() => {
                  resetInfluencerForm();
                  setInfluencerForm({
                    ...emptyInfluencerForm,
                    canCreateChildren: false,
                  });
                  setChildModalOpen(true);
                }}
              >
                <GitBranch size={16} />
                Brand Associate
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingCode(null);
                  setCodeForm(emptyCodeForm);
                  setCodeModalOpen(true);
                }}
              >
                <Plus size={16} />
                Referral Code
              </button>
              <a
                href={influencerPortalUrl}
                target="_blank"
                rel="noreferrer"
                title="Open the Referral Partner sign-in portal"
              >
                <ExternalLink size={16} />
                Partner Login
              </a>
            </div>
          ) : undefined
        }
      />

      {hasListFilters &&
        ![
          "influencers",
          "codes",
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
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />{" "}
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
          data={influencerRows}
          loading={loading}
          rowKey="key"
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
          cardClassName="overflow-hidden"
        />
      )}
      {activeTab === "codes" && (
        <SharedDataTable
          columns={[
            { key: "code", label: "Referral Code" },
            { key: "influencer", label: "Referral Partner" },
            { key: "usage", label: "Usage" },
            { key: "status", label: "Status" },
            { key: "actions", label: "Actions" },
          ]}
          data={codeRows}
          loading={loading}
          rowKey="key"
          onSearch={setSearch}
          searchPlaceholder="Search referral codes..."
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
          emptyText="No referral codes found."
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
          data={orderRows}
          loading={loading}
          rowKey="key"
          onSearch={setSearch}
          searchPlaceholder="Search referral orders..."
          filterBar={renderActiveFilterBar()}
          emptyText="No referral orders found."
        />
      )}
      {activeTab === "commissions" && (
        <SharedDataTable
          columns={[
            { key: "order", label: "Order" },
            { key: "influencer", label: "Referral Partner" },
            { key: "type", label: "Type" },
            { key: "basis", label: "Basis" },
            { key: "amount", label: "Coins" },
            { key: "status", label: "Status" },
            { key: "releaseAt", label: "Release At" },
          ]}
          data={commissionRows}
          loading={loading}
          rowKey="key"
          onSearch={setSearch}
          searchPlaceholder="Search wallet ledger..."
          filterBar={renderActiveFilterBar()}
          emptyText="No coin ledger entries found."
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
          data={payoutRows}
          loading={loading}
          rowKey="key"
          onSearch={setSearch}
          searchPlaceholder="Search payout requests..."
          filterBar={renderActiveFilterBar()}
          emptyText="No payout requests found."
        />
      )}
      {activeTab === "hierarchy" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-2xl">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-[var(--admin-muted)]"
              />
              <input
                type="text"
                value={hierarchySearch}
                onChange={(event) => setHierarchySearch(event.target.value)}
                placeholder="Search hierarchy..."
                className="admin-input h-10 w-full bg-white !pl-11 !pr-10 text-sm"
              />
              {hierarchySearch && (
                <button
                  type="button"
                  onClick={() => setHierarchySearch("")}
                  className="absolute right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[var(--admin-muted)] hover:bg-[var(--admin-surface-soft)] hover:text-[var(--admin-ink)]"
                  aria-label="Clear hierarchy search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
              <span className="rounded bg-cyan-50 px-2.5 py-1.5 font-medium text-cyan-700">
                {hierarchy?.total || 0} partners
              </span>
              <span className="rounded bg-gray-100 px-2.5 py-1.5 font-medium">
                Max level {hierarchy?.maxLevel || 1}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            {loading ? (
              <div className="space-y-2 py-2" aria-label="Loading hierarchy">
                {[0, 1, 2].map((row) => (
                  <div
                    key={row}
                    className="h-14 animate-pulse bg-gray-100"
                    style={{ marginLeft: row ? "40px" : 0 }}
                  />
                ))}
              </div>
            ) : filteredHierarchyRoots.length ? (
              filteredHierarchyRoots.map((node, index) =>
                renderHierarchyNode(
                  node,
                  0,
                  index,
                  filteredHierarchyRoots.length,
                ),
              )
            ) : (
              <div className="py-10 text-center text-sm text-gray-400">
                {hierarchySearch
                  ? "No partners match your search"
                  : "No hierarchy found"}
              </div>
            )}
          </div>
        </div>
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
          data={fraudRows}
          loading={loading}
          rowKey="key"
          onSearch={setSearch}
          searchPlaceholder="Search fraud reviews..."
          filterBar={renderActiveFilterBar()}
          actions={
            <span title="Fraud review">
              <ShieldAlert size={18} className="text-amber-600" />
            </span>
          }
          emptyText="No fraud reviews found."
        />
      )}

      <Modal
        title="Create Parent Influencer"
        open={parentModalOpen}
        onClose={() => setParentModalOpen(false)}
        footer={
          <OrangeButton type="submit" form="parentInfluencerForm">
            <Check size={16} />
            Create Parent Influencer
          </OrangeButton>
        }
      >
        <form
          id="parentInfluencerForm"
          onSubmit={submitParent}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <TextInput
            label="First Name"
            name="firstName"
            value={influencerForm.firstName}
            onChange={handleInfluencerField}
          />
          <TextInput
            label="Last Name"
            name="lastName"
            value={influencerForm.lastName}
            onChange={handleInfluencerField}
          />
          <TextInput
            label="Email"
            name="email"
            type="email"
            required
            value={influencerForm.email}
            onChange={handleInfluencerField}
          />
          <TextInput
            label="Phone"
            name="phone"
            value={influencerForm.phone}
            onChange={handleInfluencerField}
          />
          <TextInput
            label="Temporary Password"
            name="password"
            type="password"
            required
            minLength={8}
            hint="At least 8 characters. The influencer uses this for the first login."
            value={influencerForm.password}
            onChange={handleInfluencerField}
          />
          <TextInput
            label="Referral Code"
            name="code"
            value={influencerForm.code}
            onChange={handleInfluencerField}
          />
          <label className="flex items-center gap-2 pt-6 text-sm text-gray-700">
            <input
              type="checkbox"
              name="canCreateChildren"
              checked={Boolean(influencerForm.canCreateChildren)}
              onChange={handleInfluencerField}
              className="h-4 w-4"
            />
            Can create Brand Associates
          </label>
        </form>
      </Modal>

      <Modal
        title="Create Brand Associate"
        open={childModalOpen}
        onClose={() => setChildModalOpen(false)}
        footer={
          <OrangeButton type="submit" form="childInfluencerForm">
            <Check size={16} />
            Create Brand Associate
          </OrangeButton>
        }
      >
        <form
          id="childInfluencerForm"
          onSubmit={submitChild}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <SelectInput
            label="Growth Partner"
            name="parentId"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
          >
            <option value="">Select Growth Partner</option>
            {parentOptions.map((parent) => (
              <option key={getId(parent)} value={getId(parent)}>
                {fullName(parent.user)} -{" "}
                {parent.primaryCode?.code || getId(parent)}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="First Name"
            name="firstName"
            value={influencerForm.firstName}
            onChange={handleInfluencerField}
          />
          <TextInput
            label="Last Name"
            name="lastName"
            value={influencerForm.lastName}
            onChange={handleInfluencerField}
          />
          <TextInput
            label="Email"
            name="email"
            type="email"
            value={influencerForm.email}
            onChange={handleInfluencerField}
          />
          <TextInput
            label="Phone"
            name="phone"
            value={influencerForm.phone}
            onChange={handleInfluencerField}
          />
          <TextInput
            label="Password"
            name="password"
            type="password"
            value={influencerForm.password}
            onChange={handleInfluencerField}
          />
          <TextInput
            label="Referral Code"
            name="code"
            value={influencerForm.code}
            onChange={handleInfluencerField}
          />
        </form>
      </Modal>

      <Modal
        title={editingCode ? "Edit Referral Code" : "Create Referral Code"}
        open={codeModalOpen}
        onClose={() => {
          setCodeModalOpen(false);
          setEditingCode(null);
        }}
        footer={
          <OrangeButton type="submit" form="referralCodeForm">
            <Check size={16} />
            Save Referral Code
          </OrangeButton>
        }
      >
        <form
          id="referralCodeForm"
          onSubmit={submitCode}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          {!editingCode && (
            <SelectInput
              label="Referral Partner"
              name="influencerId"
              value={codeForm.influencerId}
              onChange={handleCodeField}
            >
              <option value="">Select Referral Partner</option>
              {influencers.map((item) => (
                <option key={getId(item)} value={getId(item)}>
                  {fullName(item.user)} - {getId(item)}
                </option>
              ))}
            </SelectInput>
          )}
          <TextInput
            label="Referral Code"
            name="code"
            value={codeForm.code}
            onChange={handleCodeField}
          />
          <TextInput
            label="Usage Limit"
            name="usageLimit"
            type="number"
            value={codeForm.usageLimit}
            onChange={handleCodeField}
          />
          <SelectInput
            label="Status"
            name="status"
            value={codeForm.status}
            onChange={handleCodeField}
          >
            {referralCodeStatuses.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </form>
      </Modal>

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
                  <ExternalLink size={13} />
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
                    <UploadCloud size={15} />
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
                      <ExternalLink size={13} /> View uploaded payment proof
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

      <Modal
        title={editingBonusRule ? "Edit Bonus Rule" : "Create Bonus Rule"}
        open={bonusRuleModalOpen}
        onClose={() => {
          setBonusRuleModalOpen(false);
          setEditingBonusRule(null);
          setBonusRuleForm(emptyBonusRuleForm);
        }}
        footer={
          <OrangeButton type="submit" form="bonusRuleForm">
            <Check size={16} />
            Save Bonus Rule
          </OrangeButton>
        }
      >
        <form
          id="bonusRuleForm"
          onSubmit={submitBonusRule}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <TextInput
            label="Bonus Rule Name"
            name="ruleName"
            value={bonusRuleForm.ruleName}
            onChange={handleBonusRuleField}
          />
          <SelectInput
            label="Bonus Period"
            name="period"
            value={bonusRuleForm.period}
            onChange={handleBonusRuleField}
          >
            {referralBonusPeriods.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
          {bonusRuleForm.period === "custom" && (
            <>
              <TextInput
                label="Custom Start"
                name="customStartAt"
                type="date"
                value={bonusRuleForm.customStartAt}
                onChange={handleBonusRuleField}
              />
              <TextInput
                label="Custom End"
                name="customEndAt"
                type="date"
                value={bonusRuleForm.customEndAt}
                onChange={handleBonusRuleField}
              />
            </>
          )}
          <SelectInput
            label="Target Type"
            name="targetType"
            value={bonusRuleForm.targetType}
            onChange={handleBonusRuleField}
          >
            {referralBonusTargetTypes.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="Target Value"
            name="targetValue"
            type="number"
            step="0.01"
            value={bonusRuleForm.targetValue}
            onChange={handleBonusRuleField}
          />
          <SelectInput
            label="Bonus Type"
            name="bonusType"
            value={bonusRuleForm.bonusType}
            onChange={handleBonusRuleField}
          >
            {referralBonusTypes.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
          <TextInput
            label="Bonus Value"
            name="bonusValue"
            type="number"
            step="0.01"
            value={bonusRuleForm.bonusValue}
            onChange={handleBonusRuleField}
          />
          <SelectInput
            label="Apply To"
            name="applyTo"
            value={bonusRuleForm.applyTo}
            onChange={handleBonusRuleField}
          >
            {referralBonusApplyTo.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
          <SelectInput
            label="Reset Cycle"
            name="resetCycle"
            value={bonusRuleForm.resetCycle}
            onChange={handleBonusRuleField}
          >
            {["monthly", "quarterly", "yearly"].map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </SelectInput>
          <SelectInput
            label="Release Rule"
            name="releaseRule"
            value={bonusRuleForm.releaseRule}
            onChange={handleBonusRuleField}
          >
            {referralBonusReleaseRules.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
          <SelectInput
            label="Status"
            name="status"
            value={bonusRuleForm.status}
            onChange={handleBonusRuleField}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectInput>
        </form>
      </Modal>
    </div>
  );
};

export default ReferralCommerce;
