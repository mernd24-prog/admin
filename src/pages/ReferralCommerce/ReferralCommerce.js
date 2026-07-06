import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeIndianRupee,
  Check,
  GitBranch,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
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
  updateReferralRules,
} from "../../Redux/referralCommerceSlice";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "influencers", label: "Influencer Profiles" },
  { key: "codes", label: "Influencer Codes" },
  { key: "rules", label: "Rules & Coins" },
  { key: "bonusRules", label: "Bonus Rules" },
  { key: "bonusProgress", label: "Bonus Progress" },
  { key: "bonusHistory", label: "Bonus History" },
  { key: "orders", label: "Referral Orders" },
  { key: "commissions", label: "Wallet Ledger" },
  { key: "payouts", label: "Payout Requests" },
  { key: "hierarchy", label: "Hierarchy" },
  { key: "fraud", label: "Fraud Review" },
];

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

const getId = (record = {}) => record.id || record._id || record.influencerId || record.codeId || record.payoutId;
const shortId = (value) => (value ? String(value).slice(0, 12) : "-");

const fullName = (user = {}) => {
  const profile = user.profile || {};
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ") || user.email || "Influencer";
};

const formatAmount = (value) => `INR ${Number(value || 0).toLocaleString("en-IN", {
  maximumFractionDigits: 2,
})}`;

const formatCoins = (value) => `${Number(value || 0).toLocaleString("en-IN", {
  maximumFractionDigits: 2,
})} coins`;

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "-");

const humanize = (value) => String(value || "").replace(/_/g, " ");
const optionList = (options = [], fallbackValues = []) =>
  options.length
    ? options
    : fallbackValues.map((value) => ({ value, label: humanize(value) }));

const statusClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["active", "completed", "available", "paid", "approved", "resolved"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (["pending", "locked", "payout_requested", "reviewing"].includes(normalized)) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (["suspended", "rejected", "reversed", "failed", "cancelled", "refunded", "dismissed"].includes(normalized)) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const StatusPill = ({ value }) => (
  <span className={`inline-flex max-w-full items-center rounded border px-2 py-1 text-xs font-medium ${statusClass(value)}`}>
    {value || "-"}
  </span>
);

const IconButton = ({ title, onClick, children, variant = "plain", disabled = false }) => {
  const variants = {
    plain: "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
    primary: "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
    danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
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

const TextInput = ({ label, name, value, onChange, type = "text", placeholder = "", min, step, hint = "" }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium uppercase text-gray-500">{label}</span>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      step={step}
      className="h-10 w-full rounded border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-indigo-400"
    />
    {hint ? <span className="mt-1 block text-xs font-normal text-gray-500">{hint}</span> : null}
  </label>
);

const SelectInput = ({ label, name, value, onChange, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-medium uppercase text-gray-500">{label}</span>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="h-10 w-full rounded border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-indigo-400"
    >
      {children}
    </select>
  </label>
);

const Modal = ({ title, open, onClose, children, footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <IconButton title="Close" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-gray-200 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
};

const Section = ({ title, actions, children }) => (
  <section className="bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
      <h2 className="text-sm font-semibold uppercase tracking-normal text-gray-700">{title}</h2>
      {actions}
    </div>
    {children}
  </section>
);

const DataTable = ({ columns, rows, emptyText = "No records found" }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full table-fixed border-collapse text-left text-sm">
      <thead className="bg-gray-50 text-xs uppercase text-gray-500">
        <tr>
          {columns.map((column) => (
            <th key={column.key} className="border-b border-gray-200 px-4 py-3 font-semibold">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.length ? (
          rows.map((row, index) => (
            <tr key={row.key || index} className="align-top hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-gray-700">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-500">
              {emptyText}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const ReferralCommerce = () => {
  const referralFilterStatuses = useDropdownOptions("referral-filter-statuses");
  const referralCodeStatuses = useDropdownOptions("referral-code-statuses");
  const referralDistributionTypes = useDropdownOptions("referral-distribution-types");
  const referralCoinUsageModes = useDropdownOptions("referral-coin-usage-modes");
  const referralWithdrawalApprovalModes = useDropdownOptions("referral-withdrawal-approval-modes");
  const referralWithdrawalMethods = useDropdownOptions("referral-withdrawal-methods");
  const referralBonusPeriods = useDropdownOptions("referral-bonus-periods");
  const referralBonusTargetTypes = useDropdownOptions("referral-bonus-target-types");
  const referralBonusTypes = useDropdownOptions("referral-bonus-types");
  const referralBonusApplyTo = useDropdownOptions("referral-bonus-apply-to");
  const referralBonusReleaseRules = useDropdownOptions("referral-bonus-release-rules");
  const dispatch = useDispatch();
  const referralState = useSelector((state) => state.referralCommerce || {});
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [childModalOpen, setChildModalOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [bonusRuleModalOpen, setBonusRuleModalOpen] = useState(false);
  const [editingBonusRule, setEditingBonusRule] = useState(null);
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
      return <span className="font-mono text-xs text-gray-500">{shortId(influencerId)}</span>;
    }
    return (
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-gray-800">{fullName(influencer.user)}</div>
        <div className="truncate font-mono text-xs text-gray-500">Profile {shortId(getId(influencer))}</div>
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
      ...(nextStatus && allowed.includes(nextStatus) ? { status: nextStatus } : {}),
    });
    await Promise.all([
      dispatch(getReferralSummary()),
      dispatch(getReferralHierarchy()),
      dispatch(getReferralInfluencers(withStatus(["pending", "active", "suspended", "rejected"]))),
      dispatch(getReferralCodes(withStatus(["active", "inactive", "expired", "suspended"]))),
      dispatch(getReferralOrders(withStatus(["pending", "completed", "cancelled", "refunded", "reversed"]))),
      dispatch(getReferralCommissions(withStatus(["pending", "locked", "available", "payout_requested", "paid", "reversed"]))),
      dispatch(getReferralPayouts(withStatus(["pending", "approved", "rejected", "processing", "paid", "failed"]))),
      dispatch(getReferralRules({ page: 1, limit: 20 })),
      dispatch(getReferralBonusRules(withStatus(["active", "inactive"]))),
      dispatch(getReferralBonusProgress({ page: 1, limit: 50 })),
      dispatch(getReferralBonusAchievements(withStatus(["locked", "released", "reversed"]))),
      dispatch(getReferralFraudReviews({
        page: 1,
        limit: 50,
        ...(nextStatus && ["open", "reviewing", "resolved", "dismissed"].includes(nextStatus)
          ? { status: nextStatus }
          : {}),
      })),
    ]);
  };

  useEffect(() => {
    refreshAll({ q: "", status: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentRules = rulesPayload?.current || rulesPayload;
    if (currentRules && Object.keys(currentRules).length) {
      setRulesForm({
        ...emptyRulesForm,
        ...Object.fromEntries(
          Object.entries(currentRules).filter(([, value]) => value !== undefined && value !== null),
        ),
      });
    }
  }, [rulesPayload]);

  const handleSearch = async (event) => {
    event.preventDefault();
    try {
      await refreshAll({ q: search, status });
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
      const selected = new Set(Array.isArray(prev.withdrawalMethods) ? prev.withdrawalMethods : []);
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
      if (value !== "" && value !== undefined && value !== null) acc[key] = value;
      return acc;
    }, {});

  const submitParent = async (event) => {
    event.preventDefault();
    try {
      await dispatch(
        createReferralParent(compactPayload(influencerForm)),
      ).unwrap();
      toast.success("Parent influencer created");
      setParentModalOpen(false);
      resetInfluencerForm();
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to create parent influencer");
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
      toast.success("Child influencer created");
      setChildModalOpen(false);
      resetInfluencerForm();
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to create child influencer");
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    const payload = compactPayload(numberize(codeForm, ["usageLimit"]));
    try {
      if (editingCode) {
        const { influencerId: _influencerId, ...codePayload } = payload;
        await dispatch(updateReferralCode({ ...codePayload, codeId: getId(editingCode) })).unwrap();
        toast.success("Influencer code updated");
      } else {
        await dispatch(createReferralCode(payload)).unwrap();
        toast.success("Influencer code created");
      }
      setCodeModalOpen(false);
      setEditingCode(null);
      setCodeForm(emptyCodeForm);
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to save influencer code");
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
    setBonusRuleForm(rule ? {
      ...emptyBonusRuleForm,
      ruleName: rule.ruleName || "",
      period: rule.period || "monthly",
      customStartAt: rule.customStartAt ? String(rule.customStartAt).slice(0, 10) : "",
      customEndAt: rule.customEndAt ? String(rule.customEndAt).slice(0, 10) : "",
      targetType: rule.targetType || "order_value",
      targetValue: rule.targetValue ?? "",
      bonusType: rule.bonusType || "fixed_coins",
      bonusValue: rule.bonusValue ?? "",
      applyTo: rule.applyTo || "code_owner",
      resetCycle: rule.resetCycle || "monthly",
      releaseRule: rule.releaseRule || "instantly_available",
      status: rule.status || "active",
    } : emptyBonusRuleForm);
    setBonusRuleModalOpen(true);
  };

  const submitBonusRule = async (event) => {
    event.preventDefault();
    const payload = compactPayload(
      numberize(bonusRuleForm, ["targetValue", "bonusValue"]),
    );
    try {
      if (editingBonusRule) {
        await dispatch(updateReferralBonusRule({ ...payload, ruleId: getId(editingBonusRule) })).unwrap();
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
      toast.success(`Bonus evaluation complete: ${payload.totalCreated || 0} awarded`);
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
      toast.success("Influencer status updated");
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to update influencer status");
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
      toast.success("Influencer promoted");
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to promote influencer");
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
      toast.success("Influencer code status updated");
      await refreshAll();
    } catch (error) {
      toast.error(error || "Unable to update influencer code");
    }
  };

  const handlePayoutAction = async (payout, action) => {
    const payoutId = getId(payout);
    try {
      if (action === "approve") {
        await dispatch(approveReferralPayout({ payoutId })).unwrap();
      }
      if (action === "reject") {
        await dispatch(rejectReferralPayout({ payoutId, adminNote: "Rejected by admin" })).unwrap();
      }
      if (action === "paid") {
        await dispatch(markReferralPayoutPaid({ payoutId })).unwrap();
      }
      toast.success("Payout updated");
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
      label: "Influencers",
      value: summary?.influencers?.total || 0,
      sub: `${summary?.influencers?.active || 0} active`,
      icon: <UserPlus size={18} />,
    },
    {
      label: "Active Codes",
      value: summary?.codes?.active || 0,
      sub: `${summary?.codes?.total || 0} total`,
      icon: <Share2 size={18} />,
    },
    {
      label: "Referral Sales",
      value: formatAmount(summary?.orders?.eligibleAmount),
      sub: `${summary?.orders?.total || 0} orders`,
      icon: <BadgeIndianRupee size={18} />,
    },
    {
      label: "Referral Coins",
      value: formatCoins(summary?.commissions?.amount),
      sub: `${summary?.commissions?.totalEntries || 0} ledger entries`,
      icon: <GitBranch size={18} />,
    },
    {
      label: "Bonus Coins",
      value: formatCoins(summary?.bonuses?.totalCoins),
      sub: `${summary?.bonuses?.achievements || 0} achievements`,
      icon: <Check size={18} />,
    },
  ];

  const influencerRows = influencers.map((item) => ({
    key: getId(item),
    influencer: (
      <div className="min-w-0">
        <div className="truncate font-medium text-gray-900">{fullName(item.user)}</div>
        <div className="truncate text-xs text-gray-500">{item.user?.email || "Linked account"}</div>
      </div>
    ),
    profileId: (
      <div className="min-w-0">
        <div className="font-mono text-xs text-gray-800">{shortId(getId(item))}</div>
        <div className="font-mono text-[11px] text-gray-400">User {shortId(item.userId)}</div>
      </div>
    ),
    type: <span className="capitalize">{item.influencerType}</span>,
    code: item.primaryCode?.code
      ? <span className="font-mono text-sm font-semibold text-indigo-700">{item.primaryCode.code}</span>
      : "-",
    hierarchy: `Level ${item.level || 1}`,
    wallet: formatCoins(item.wallet?.availableBalance),
    status: <StatusPill value={item.status} />,
    actions: (
      <div className="flex flex-wrap gap-2">
        <IconButton
          title={item.status === "active" ? "Suspend" : "Reactivate"}
          onClick={() => setInfluencerStatus(item, item.status === "active" ? "suspended" : "active")}
          variant={item.status === "active" ? "danger" : "success"}
        >
          {item.status === "active" ? <X size={15} /> : <Check size={15} />}
        </IconButton>
        <IconButton
          title="Promote"
          onClick={() => promoteInfluencer(item)}
          variant="primary"
          disabled={item.influencerType === "parent" && item.canCreateChildren}
        >
          <GitBranch size={15} />
        </IconButton>
      </div>
    ),
  }));

  const codeRows = codes.map((code) => ({
    key: getId(code),
    code: <span className="font-semibold text-gray-900">{code.code}</span>,
    influencer: renderInfluencerRef(code.influencerId),
    usage: `${code.usageCount || 0}${code.usageLimit ? ` / ${code.usageLimit}` : ""}`,
    status: <StatusPill value={code.status} />,
    actions: (
      <div className="flex flex-wrap gap-2">
        <IconButton title="Edit" onClick={() => openEditCode(code)} variant="primary">
          <Pencil size={15} />
        </IconButton>
        <IconButton title={code.status === "active" ? "Deactivate" : "Activate"} onClick={() => toggleCodeStatus(code)}>
          {code.status === "active" ? <X size={15} /> : <Check size={15} />}
        </IconButton>
      </div>
    ),
  }));

  const orderRows = orders.map((order) => ({
    key: getId(order),
    order: order.orderId,
    code: order.code,
    customer: order.customerId,
    amount: formatAmount(order.eligibleAmount),
    discount: formatAmount(order.discountAmount),
    status: <StatusPill value={order.status} />,
    created: formatDate(order.createdAt),
  }));

  const commissionRows = commissions.map((entry) => ({
    key: getId(entry),
    order: entry.orderId,
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
    amount: formatCoins(payout.amount),
    method: payout.payoutMethod || "-",
    status: <StatusPill value={payout.status} />,
    requested: formatDate(payout.requestedAt || payout.createdAt),
    actions: (
      <div className="flex flex-wrap gap-2">
        <IconButton title="Approve" onClick={() => handlePayoutAction(payout, "approve")} variant="success" disabled={payout.status !== "pending"}>
          <Check size={15} />
        </IconButton>
        <IconButton title="Reject" onClick={() => handlePayoutAction(payout, "reject")} variant="danger" disabled={payout.status === "paid"}>
          <X size={15} />
        </IconButton>
        <IconButton title="Mark Paid" onClick={() => handlePayoutAction(payout, "paid")} variant="primary" disabled={!["approved", "processing"].includes(payout.status)}>
          <BadgeIndianRupee size={15} />
        </IconButton>
      </div>
    ),
  }));

  const bonusRuleRows = bonusRules.map((rule) => ({
    key: getId(rule),
    name: <span className="font-medium text-gray-900">{rule.ruleName}</span>,
    period: <span className="capitalize">{String(rule.period || "").replace(/_/g, " ")}</span>,
    target: `${String(rule.targetType || "").replace(/_/g, " ")} >= ${Number(rule.targetValue || 0).toLocaleString("en-IN")}`,
    bonus: rule.bonusType === "percentage_extra_coins"
      ? `${Number(rule.bonusValue || 0)}% extra coins`
      : formatCoins(rule.bonusValue),
    applyTo: String(rule.applyTo || "").replace(/_/g, " "),
    release: String(rule.releaseRule || "").replace(/_/g, " "),
    status: <StatusPill value={rule.status} />,
    actions: (
      <div className="flex flex-wrap gap-2">
        <IconButton title="Edit bonus rule" onClick={() => openBonusRuleModal(rule)} variant="primary">
          <Pencil size={15} />
        </IconButton>
        <IconButton title={rule.status === "active" ? "Deactivate" : "Activate"} onClick={() => toggleBonusRuleStatus(rule)}>
          {rule.status === "active" ? <X size={15} /> : <Check size={15} />}
        </IconButton>
      </div>
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
    status: row.existingAchievement
      ? <StatusPill value={row.existingAchievement.status} />
      : <StatusPill value={row.achieved ? "achieved" : "in_progress"} />,
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

  const renderHierarchyNode = (node, depth = 0) => (
    <div key={getId(node)} className="border-l border-gray-200 pl-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2">
        <span className="font-medium text-gray-900">{fullName(node.user)}</span>
        <span className="font-mono text-xs text-gray-500">Profile {shortId(getId(node))}</span>
        <StatusPill value={node.influencerType} />
        <span className="text-xs text-gray-500">Level {node.level || depth + 1}</span>
        <span className="text-xs text-gray-500">{node.primaryCode?.code || "No influencer code"}</span>
      </div>
      {Array.isArray(node.children) && node.children.length > 0 && (
        <div className="ml-4 space-y-2">
          {node.children.map((child) => renderHierarchyNode(child, depth + 1))}
        </div>
      )}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statItems.map((item) => (
          <div key={item.label} className="rounded border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-gray-500">{item.label}</p>
                <p className="mt-2 truncate text-xl font-semibold text-gray-900">{item.value}</p>
                <p className="mt-1 truncate text-xs text-gray-500">{item.sub}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded border border-indigo-100 bg-indigo-50 text-indigo-600">
                {item.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Section title="Wallet Balances">
        <div className="grid grid-cols-1 divide-y divide-gray-100 text-sm md:grid-cols-4 md:divide-x md:divide-y-0">
          {[
            ["Locked", summary?.wallets?.lockedBalance ?? summary?.wallets?.pendingBalance],
            ["Available", summary?.wallets?.availableBalance],
            ["Withdrawn", summary?.wallets?.withdrawnBalance ?? summary?.wallets?.paidBalance],
            ["Reversed", summary?.wallets?.reversedBalance],
          ].map(([label, value]) => (
            <div key={label} className="p-4">
              <p className="text-xs uppercase text-gray-500">{label}</p>
              <p className="mt-1 font-semibold text-gray-900">{formatCoins(value)}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );

  const renderRules = () => (
    <Section title="Referral Commerce Rules">
      <form onSubmit={submitRules} className="grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
        <div className="md:col-span-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Referral pool and coin setup</p>
        </div>
        <SelectInput label="Distribution Type" name="distributionType" value={rulesForm.distributionType} onChange={handleRulesField}>
          {optionList(referralDistributionTypes.options, ["percentage", "fixed_amount"]).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectInput>
        {rulesForm.distributionType === "fixed_amount" ? (
          <TextInput label="Referral Pool Amount" name="referralPoolAmount" type="number" min="0" step="0.01" value={rulesForm.referralPoolAmount} onChange={handleRulesField} />
        ) : (
          <TextInput label="Referral Pool %" name="referralPoolPercent" type="number" min="0" step="0.01" value={rulesForm.referralPoolPercent} onChange={handleRulesField} />
        )}
        <TextInput
          label="Maximum Referral Pool Per Order"
          name="maximumReferralPoolAmount"
          type="number"
          min="0"
          step="0.01"
          value={rulesForm.maximumReferralPoolAmount}
          onChange={handleRulesField}
          hint="Safety cap on the total referral pool calculated for one order. Enter 0 for unlimited; customer and influencer shares are then calculated from this capped pool."
        />
        <TextInput label="INR per Coin" name="coinValue" type="number" min="0.000001" step="0.01" value={rulesForm.coinValue} onChange={handleRulesField} />
        <TextInput label="Coin Expiry Days" name="coinExpiryDays" type="number" value={rulesForm.coinExpiryDays} onChange={handleRulesField} />
        <SelectInput label="Coin Usage" name="coinUsage" value={rulesForm.coinUsage} onChange={handleRulesField}>
          {optionList(referralCoinUsageModes.options, ["wallet", "discount", "both"]).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectInput>
        <TextInput label="Release Delay Days" name="releaseDelayDays" type="number" value={rulesForm.releaseDelayDays} onChange={handleRulesField} />
        <TextInput label="Minimum Eligible Order Amount" name="minOrderAmount" type="number" min="0" step="0.01" value={rulesForm.minOrderAmount} onChange={handleRulesField} />

        <div className="border-t border-gray-100 pt-2 md:col-span-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Distribution shares</p>
        </div>
        <TextInput label="Customer Discount Share %" name="customerSharePercent" type="number" min="0" step="0.01" value={rulesForm.customerSharePercent} onChange={handleRulesField} />
        <TextInput label="Code Owner / Child Share %" name="childSharePercent" type="number" min="0" step="0.01" value={rulesForm.childSharePercent} onChange={handleRulesField} />
        <TextInput label="Parent Share %" name="parentSharePercent" type="number" step="0.01" value={rulesForm.parentSharePercent} onChange={handleRulesField} />

        <div className="border-t border-gray-100 pt-2 md:col-span-4">
          <p className="text-xs font-semibold uppercase text-gray-500">Withdrawal rules</p>
        </div>
        <TextInput label="Minimum Withdrawal Coins" name="minimumWithdrawalCoins" type="number" step="0.01" value={rulesForm.minimumWithdrawalCoins} onChange={handleRulesField} />
        <TextInput label="Maximum Withdrawal Coins" name="maximumWithdrawalCoins" type="number" step="0.01" value={rulesForm.maximumWithdrawalCoins} onChange={handleRulesField} />
        <TextInput label="Daily Withdrawal Limit" name="dailyWithdrawalLimitCoins" type="number" step="0.01" value={rulesForm.dailyWithdrawalLimitCoins} onChange={handleRulesField} />
        <TextInput label="Monthly Withdrawal Limit" name="monthlyWithdrawalLimitCoins" type="number" step="0.01" value={rulesForm.monthlyWithdrawalLimitCoins} onChange={handleRulesField} />
        <SelectInput label="Approval Mode" name="withdrawalApprovalMode" value={rulesForm.withdrawalApprovalMode} onChange={handleRulesField}>
          {optionList(referralWithdrawalApprovalModes.options, ["manual", "auto"]).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectInput>
        <label className="flex items-center gap-2 pt-6 text-sm text-gray-700">
          <input
            type="checkbox"
            name="withdrawalKycRequired"
            checked={Boolean(rulesForm.withdrawalKycRequired)}
            onChange={handleRulesField}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600"
          />
          KYC required for withdrawal
        </label>
        <div className="md:col-span-2">
          <span className="mb-2 block text-xs font-medium uppercase text-gray-500">Withdrawal Methods</span>
          <div className="flex flex-wrap gap-2">
            {optionList(referralWithdrawalMethods.options, ["upi", "bank", "manual"]).map((option) => (
              <label key={option.value} className="inline-flex items-center gap-2 rounded border border-gray-200 px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={Array.isArray(rulesForm.withdrawalMethods) && rulesForm.withdrawalMethods.includes(option.value)}
                  onChange={() => toggleWithdrawalMethod(option.value)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-4">
          <button type="submit" className="inline-flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Check size={16} />
            Save Rules
          </button>
        </div>
      </form>
    </Section>
  );

  const renderBonusRules = () => (
    <Section
      title="Influencer Bonus Rules"
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
    >
      <DataTable
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
        rows={bonusRuleRows}
      />
    </Section>
  );

  const renderBonusProgress = () => (
    <Section title="Current Bonus Target Progress">
      <DataTable
        columns={[
          { key: "rule", label: "Rule" },
          { key: "influencer", label: "Influencer Profile" },
          { key: "cycle", label: "Cycle" },
          { key: "target", label: "Target" },
          { key: "achieved", label: "Achieved" },
          { key: "progress", label: "Progress" },
          { key: "status", label: "Status" },
        ]}
        rows={bonusProgressRows}
        emptyText="No active bonus progress found"
      />
    </Section>
  );

  const renderBonusHistory = () => (
    <Section title="Bonus Achievement History">
      <DataTable
        columns={[
          { key: "rule", label: "Rule" },
          { key: "influencer", label: "Influencer Profile" },
          { key: "cycle", label: "Cycle" },
          { key: "target", label: "Target" },
          { key: "bonus", label: "Bonus Coins" },
          { key: "status", label: "Status" },
          { key: "achievedAt", label: "Achieved At" },
        ]}
        rows={bonusAchievementRows}
        emptyText="No bonus achievements yet"
      />
    </Section>
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Referral Commerce</h1>
          <p className="text-sm text-gray-500">Influencer referral operations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <IconButton title="Refresh" onClick={() => refreshAll()} variant="primary" disabled={loading}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </IconButton>
          <button
            type="button"
            onClick={() => {
              resetInfluencerForm();
              setParentModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            <UserPlus size={16} />
            Parent
          </button>
          <button
            type="button"
            onClick={() => {
              resetInfluencerForm();
              setInfluencerForm({ ...emptyInfluencerForm, canCreateChildren: false });
              setChildModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <GitBranch size={16} />
            Child
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingCode(null);
              setCodeForm(emptyCodeForm);
              setCodeModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus size={16} />
            Influencer Code
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-white p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            className="h-10 w-full rounded border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-indigo-400"
        >
          <option value="">All statuses</option>
          {referralFilterStatuses.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button type="submit" className="inline-flex h-10 items-center gap-2 rounded bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800">
          <Search size={16} />
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <div className="flex min-w-max gap-1 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded px-3 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && renderOverview()}
      {activeTab === "influencers" && (
        <Section title="Influencer Profiles">
          <DataTable
            columns={[
              { key: "influencer", label: "Influencer" },
              { key: "profileId", label: "Profile ID" },
              { key: "type", label: "Type" },
              { key: "code", label: "Influencer Code" },
              { key: "hierarchy", label: "Hierarchy" },
              { key: "wallet", label: "Available Coins" },
              { key: "status", label: "Status" },
              { key: "actions", label: "Actions" },
            ]}
            rows={influencerRows}
          />
        </Section>
      )}
      {activeTab === "codes" && (
        <Section title="Influencer Codes">
          <DataTable
            columns={[
              { key: "code", label: "Influencer Code" },
              { key: "influencer", label: "Influencer Profile" },
              { key: "usage", label: "Usage" },
              { key: "status", label: "Status" },
              { key: "actions", label: "Actions" },
            ]}
            rows={codeRows}
          />
        </Section>
      )}
      {activeTab === "rules" && renderRules()}
      {activeTab === "bonusRules" && renderBonusRules()}
      {activeTab === "bonusProgress" && renderBonusProgress()}
      {activeTab === "bonusHistory" && renderBonusHistory()}
      {activeTab === "orders" && (
        <Section title="Referral Orders">
          <DataTable
            columns={[
              { key: "order", label: "Order" },
              { key: "code", label: "Influencer Code" },
              { key: "customer", label: "Customer" },
              { key: "amount", label: "Eligible Amount" },
              { key: "discount", label: "Discount" },
              { key: "status", label: "Status" },
              { key: "created", label: "Created" },
            ]}
            rows={orderRows}
          />
        </Section>
      )}
      {activeTab === "commissions" && (
        <Section title="Coin Ledger">
          <DataTable
            columns={[
              { key: "order", label: "Order" },
              { key: "influencer", label: "Influencer Profile" },
              { key: "type", label: "Type" },
              { key: "basis", label: "Basis" },
              { key: "amount", label: "Coins" },
              { key: "status", label: "Status" },
              { key: "releaseAt", label: "Release At" },
            ]}
            rows={commissionRows}
          />
        </Section>
      )}
      {activeTab === "payouts" && (
        <Section title="Payout Requests">
          <DataTable
            columns={[
              { key: "influencer", label: "Influencer Profile" },
              { key: "amount", label: "Coins" },
              { key: "method", label: "Method" },
              { key: "status", label: "Status" },
              { key: "requested", label: "Requested" },
              { key: "actions", label: "Actions" },
            ]}
            rows={payoutRows}
          />
        </Section>
      )}
      {activeTab === "hierarchy" && (
        <Section
          title={`Hierarchy (${hierarchy?.total || 0})`}
          actions={<span className="text-xs text-gray-500">Max level {hierarchy?.maxLevel || 1}</span>}
        >
          <div className="space-y-2 p-4">
            {Array.isArray(hierarchy?.roots) && hierarchy.roots.length ? (
              hierarchy.roots.map((node) => renderHierarchyNode(node))
            ) : (
              <div className="py-8 text-center text-sm text-gray-500">No hierarchy found</div>
            )}
          </div>
        </Section>
      )}
      {activeTab === "fraud" && (
        <Section title="Fraud Review" actions={<ShieldAlert size={18} className="text-amber-600" />}>
          <DataTable
            columns={[
              { key: "reason", label: "Reason" },
              { key: "influencer", label: "Influencer Profile" },
              { key: "code", label: "Influencer Code" },
              { key: "severity", label: "Severity" },
              { key: "status", label: "Status" },
              { key: "created", label: "Created" },
            ]}
            rows={fraudRows}
          />
        </Section>
      )}

      <Modal
        title="Create Parent Influencer"
        open={parentModalOpen}
        onClose={() => setParentModalOpen(false)}
        footer={
          <button type="submit" form="parentInfluencerForm" className="inline-flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Check size={16} />
            Create Parent
          </button>
        }
      >
        <form id="parentInfluencerForm" onSubmit={submitParent} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextInput label="First Name" name="firstName" value={influencerForm.firstName} onChange={handleInfluencerField} />
          <TextInput label="Last Name" name="lastName" value={influencerForm.lastName} onChange={handleInfluencerField} />
          <TextInput label="Email" name="email" type="email" value={influencerForm.email} onChange={handleInfluencerField} />
          <TextInput label="Phone" name="phone" value={influencerForm.phone} onChange={handleInfluencerField} />
          <TextInput label="Password" name="password" type="password" value={influencerForm.password} onChange={handleInfluencerField} />
          <TextInput label="Influencer Code" name="code" value={influencerForm.code} onChange={handleInfluencerField} />
          <label className="flex items-center gap-2 pt-6 text-sm text-gray-700">
            <input type="checkbox" name="canCreateChildren" checked={Boolean(influencerForm.canCreateChildren)} onChange={handleInfluencerField} className="h-4 w-4" />
            Can create children
          </label>
        </form>
      </Modal>

      <Modal
        title="Create Child Influencer"
        open={childModalOpen}
        onClose={() => setChildModalOpen(false)}
        footer={
          <button type="submit" form="childInfluencerForm" className="inline-flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Check size={16} />
            Create Child
          </button>
        }
      >
        <form id="childInfluencerForm" onSubmit={submitChild} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectInput label="Parent" name="parentId" value={parentId} onChange={(event) => setParentId(event.target.value)}>
            <option value="">Select parent</option>
            {parentOptions.map((parent) => (
              <option key={getId(parent)} value={getId(parent)}>
                {fullName(parent.user)} - {parent.primaryCode?.code || getId(parent)}
              </option>
            ))}
          </SelectInput>
          <TextInput label="First Name" name="firstName" value={influencerForm.firstName} onChange={handleInfluencerField} />
          <TextInput label="Last Name" name="lastName" value={influencerForm.lastName} onChange={handleInfluencerField} />
          <TextInput label="Email" name="email" type="email" value={influencerForm.email} onChange={handleInfluencerField} />
          <TextInput label="Phone" name="phone" value={influencerForm.phone} onChange={handleInfluencerField} />
          <TextInput label="Password" name="password" type="password" value={influencerForm.password} onChange={handleInfluencerField} />
          <TextInput label="Influencer Code" name="code" value={influencerForm.code} onChange={handleInfluencerField} />
        </form>
      </Modal>

      <Modal
        title={editingCode ? "Edit Influencer Code" : "Create Influencer Code"}
        open={codeModalOpen}
        onClose={() => {
          setCodeModalOpen(false);
          setEditingCode(null);
        }}
        footer={
          <button type="submit" form="referralCodeForm" className="inline-flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Check size={16} />
            Save Influencer Code
          </button>
        }
      >
        <form id="referralCodeForm" onSubmit={submitCode} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {!editingCode && (
            <SelectInput label="Influencer Profile" name="influencerId" value={codeForm.influencerId} onChange={handleCodeField}>
              <option value="">Select influencer profile</option>
              {influencers.map((item) => (
                <option key={getId(item)} value={getId(item)}>
                  {fullName(item.user)} - {getId(item)}
                </option>
              ))}
            </SelectInput>
          )}
          <TextInput label="Influencer Code" name="code" value={codeForm.code} onChange={handleCodeField} />
          <TextInput label="Usage Limit" name="usageLimit" type="number" value={codeForm.usageLimit} onChange={handleCodeField} />
          <SelectInput label="Status" name="status" value={codeForm.status} onChange={handleCodeField}>
            {referralCodeStatuses.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectInput>
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
          <button type="submit" form="bonusRuleForm" className="inline-flex items-center gap-2 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Check size={16} />
            Save Bonus Rule
          </button>
        }
      >
        <form id="bonusRuleForm" onSubmit={submitBonusRule} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextInput label="Bonus Rule Name" name="ruleName" value={bonusRuleForm.ruleName} onChange={handleBonusRuleField} />
          <SelectInput label="Bonus Period" name="period" value={bonusRuleForm.period} onChange={handleBonusRuleField}>
            {referralBonusPeriods.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectInput>
          {bonusRuleForm.period === "custom" && (
            <>
              <TextInput label="Custom Start" name="customStartAt" type="date" value={bonusRuleForm.customStartAt} onChange={handleBonusRuleField} />
              <TextInput label="Custom End" name="customEndAt" type="date" value={bonusRuleForm.customEndAt} onChange={handleBonusRuleField} />
            </>
          )}
          <SelectInput label="Target Type" name="targetType" value={bonusRuleForm.targetType} onChange={handleBonusRuleField}>
            {referralBonusTargetTypes.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectInput>
          <TextInput label="Target Value" name="targetValue" type="number" step="0.01" value={bonusRuleForm.targetValue} onChange={handleBonusRuleField} />
          <SelectInput label="Bonus Type" name="bonusType" value={bonusRuleForm.bonusType} onChange={handleBonusRuleField}>
            {referralBonusTypes.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectInput>
          <TextInput label="Bonus Value" name="bonusValue" type="number" step="0.01" value={bonusRuleForm.bonusValue} onChange={handleBonusRuleField} />
          <SelectInput label="Apply To" name="applyTo" value={bonusRuleForm.applyTo} onChange={handleBonusRuleField}>
            {referralBonusApplyTo.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectInput>
          <SelectInput label="Reset Cycle" name="resetCycle" value={bonusRuleForm.resetCycle} onChange={handleBonusRuleField}>
            {["monthly", "quarterly", "yearly"].map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
          </SelectInput>
          <SelectInput label="Release Rule" name="releaseRule" value={bonusRuleForm.releaseRule} onChange={handleBonusRuleField}>
            {referralBonusReleaseRules.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectInput>
          <SelectInput label="Status" name="status" value={bonusRuleForm.status} onChange={handleBonusRuleField}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectInput>
        </form>
      </Modal>
    </div>
  );
};

export default ReferralCommerce;
