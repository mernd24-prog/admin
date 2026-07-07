import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MdAdd,
  MdCheckCircle,
  MdCompareArrows,
  MdDashboard,
  MdExpandLess,
  MdExpandMore,
  MdRefresh,
  MdSave,
  MdSearch,
  MdSettings,
  MdStorefront,
} from "react-icons/md";
import { PageHeader, StatusBadge } from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { toast } from "../../../utils/toast";

const DEFAULT_SETTINGS = {
  platformFees: {
    customerFeeType: "fixed",
    customerFeeValue: 0,
    sellerFeeType: "percentage",
    sellerFeeValue: 0,
    gstRate: 18,
    calculationBase: "subtotal",
  },
  payments: {
    gateway: "razorpay",
    gatewayFeePolicy: "platform_absorbs",
    refundPolicy: "manual_review",
  },
  wallet: {
    partialPaymentMode: "user_opt_in",
    autoApplyMaxPercent: 100,
  },
  cod: {
    enabled: true,
    availabilityMode: "all_pincodes",
    allowPincodes: [],
    blockPincodes: [],
    collectionPolicy: "platform_or_courier",
    payoutRequiresCapture: true,
    feeAmount: 0,
    minOrderAmount: "",
    maxOrderAmount: "",
  },
  shippingDefaults: {
    defaultCharge: 0,
    freeShippingThreshold: "",
    handlingFee: 0,
    shippingMethod: "standard",
  },
  finance: {
    sellerPayoutBase: "gross_customer_price",
    platformFeeTaxRate: 18,
    chargePlatformFeeTaxToSeller: true,
    payoutReleaseMilestone: "delivered_or_fulfilled",
    payoutReleaseDaysAfterDelivery: 7,
    payoutSchedule: "manual",
    payoutManualApprovalRequired: true,
    minimumPayoutAmount: 0,
    shippingPolicy: "not_in_seller_payout",
  },
  templates: [
    { id: "standard_seller", name: "Standard Seller", active: true, version: "v1", description: "Default marketplace commerce rules.", sellerIds: [] },
    { id: "premium_seller", name: "Premium Seller", active: true, version: "v1", description: "Reduced friction settings for high quality sellers.", sellerIds: [] },
    { id: "local_seller", name: "Local Seller", active: true, version: "v1", description: "Local delivery and tight regional serviceability.", sellerIds: [] },
    { id: "grocery_seller", name: "Grocery Seller", active: true, version: "v1", description: "Fast moving grocery and COD friendly defaults.", sellerIds: [] },
    { id: "heavy_item_seller", name: "Heavy Item Seller", active: true, version: "v1", description: "Higher shipping and handling defaults.", sellerIds: [] },
    { id: "electronics_seller", name: "Electronics Seller", active: true, version: "v1", description: "Electronics focused shipping, COD, and payout rules.", sellerIds: [] },
  ],
  sellerTiers: [
    { id: "bronze", name: "Bronze", active: true, platformFeeType: "percentage", platformFeeValue: 0, codCharge: 0, commissionPercent: 0, payoutDelayDays: 7, shippingBenefits: "", freeShippingRule: "", prioritySupport: false, upgradeRule: "" },
    { id: "silver", name: "Silver", active: true, platformFeeType: "percentage", platformFeeValue: 0, codCharge: 0, commissionPercent: 0, payoutDelayDays: 5, shippingBenefits: "", freeShippingRule: "", prioritySupport: false, upgradeRule: "" },
    { id: "gold", name: "Gold", active: true, platformFeeType: "percentage", platformFeeValue: 0, codCharge: 0, commissionPercent: 0, payoutDelayDays: 3, shippingBenefits: "", freeShippingRule: "", prioritySupport: false, upgradeRule: "" },
    { id: "platinum", name: "Platinum", active: true, platformFeeType: "percentage", platformFeeValue: 0, codCharge: 0, commissionPercent: 0, payoutDelayDays: 2, shippingBenefits: "", freeShippingRule: "", prioritySupport: true, upgradeRule: "" },
    { id: "enterprise", name: "Enterprise", active: true, platformFeeType: "percentage", platformFeeValue: 0, codCharge: 0, commissionPercent: 0, payoutDelayDays: 1, shippingBenefits: "", freeShippingRule: "", prioritySupport: true, upgradeRule: "" },
  ],
};

const DEFAULT_SELLER = {
  sellerId: "",
  organizationId: "",
  source: "default",
  cod: {
    enabled: true,
    chargeMode: "inherit",
    chargeAmount: 0,
    minOrderAmount: "",
    maxOrderAmount: "",
    availabilityMode: "inherit",
    allowPincodes: [],
    blockPincodes: [],
    notes: "",
  },
  delivery: {
    mode: "none",
    chargeAmount: 0,
    freeDeliveryMinOrderAmount: "",
    serviceabilityMode: "all_pincodes",
    allowPincodes: [],
    blockPincodes: [],
    regions: [],
    productRules: [],
    orderRules: [],
    regionRules: [],
    estimatedDaysMin: "",
    estimatedDaysMax: "",
    shippingPartner: "",
    shippingMethod: "standard",
    handlingCharge: 0,
    notes: "",
  },
  metadata: {
    templateId: "",
    tierId: "",
    adminOverride: false,
    overrideNotes: "",
  },
};

const ROUTES = [
  { key: "dashboard", label: "Dashboard", path: "/app/commerce-settings", icon: MdDashboard },
  { key: "platform", label: "Platform Defaults", path: "/app/platform-commerce-settings", icon: MdSettings },
  { key: "seller", label: "Seller Config", path: "/app/seller-commerce-config", icon: MdStorefront },
  { key: "templates", label: "Templates", path: "/app/commerce-templates", icon: MdCompareArrows },
  { key: "tiers", label: "Seller Tiers", path: "/app/seller-tiers", icon: MdStorefront },
];

const option = (value, label) => ({ value, label });
const joinList = (value) => (Array.isArray(value) ? value.join(", ") : String(value || ""));
const splitList = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const nullableNumber = (value) => (value === "" || value === null || value === undefined ? null : Number(value));
const money = (value) => `INR ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const slug = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const shortId = (value = "") => {
  const text = String(value || "");
  return text.length > 14 ? `${text.slice(0, 8)}...${text.slice(-4)}` : text;
};
const formatRules = (value) => JSON.stringify(Array.isArray(value) ? value : [], null, 2);
const parseRules = (value, label) => {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) throw new Error("Expected array");
    return parsed;
  } catch {
    throw new Error(`${label} must be a valid JSON array`);
  }
};
const optionLabel = (item = {}) =>
  item.label || item.name || item.title || item.zipCode || item.pincode || item.code || String(item.value || "");
const optionValue = (item = {}) =>
  String(item.rawValue || item.zipCode || item.pincode || item.name || item.label || item.value || item.id || item._id || "").trim();
const optionParentId = (item = {}) => item.id || item._id || item.value || "";

const mergeSettings = (data = {}) => ({
  ...DEFAULT_SETTINGS,
  ...data,
  platformFees: { ...DEFAULT_SETTINGS.platformFees, ...(data.platformFees || {}) },
  payments: { ...DEFAULT_SETTINGS.payments, ...(data.payments || {}) },
  wallet: { ...DEFAULT_SETTINGS.wallet, ...(data.wallet || {}) },
  cod: { ...DEFAULT_SETTINGS.cod, ...(data.cod || {}) },
  shippingDefaults: { ...DEFAULT_SETTINGS.shippingDefaults, ...(data.shippingDefaults || {}) },
  finance: { ...DEFAULT_SETTINGS.finance, ...(data.finance || {}) },
  templates: Array.isArray(data.templates) && data.templates.length ? data.templates : DEFAULT_SETTINGS.templates,
  sellerTiers: Array.isArray(data.sellerTiers) && data.sellerTiers.length ? data.sellerTiers : DEFAULT_SETTINGS.sellerTiers,
});

const Field = ({ label, children, hint }) => (
  <label className="block space-y-1">
    <span className="admin-label">{label}</span>
    {children}
    {hint ? <span className="block text-xs text-gray-500">{hint}</span> : null}
  </label>
);

const InputField = ({ label, value, onChange, type = "text", hint, ...props }) => (
  <Field label={label} hint={hint}>
    <input className="admin-input" type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} {...props} />
  </Field>
);

const SelectField = ({ label, value, onChange, options, hint }) => (
  <Field label={label} hint={hint}>
    <select className="admin-input" value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
      {options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  </Field>
);

const ToggleField = ({ label, checked, onChange, hint }) => (
  <label className="flex min-h-[44px] items-center justify-between gap-3 rounded border border-gray-200 px-3 py-2">
    <span>
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      {hint ? <span className="block text-xs text-gray-500">{hint}</span> : null}
    </span>
    <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
  </label>
);

const TextAreaField = ({ label, value, onChange, hint, mono = false, rows = 3, ...props }) => (
  <Field label={label} hint={hint}>
    <textarea
      className={`admin-input min-h-[84px] ${mono ? "font-mono text-xs" : ""}`}
      rows={rows}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      {...props}
    />
  </Field>
);

const OptionMultiSelect = ({
  value = [],
  onChange,
  options = [],
  placeholder = "Select values...",
  searchPlaceholder = "Search...",
  emptyText = "No options found",
  disabled = false,
  loading = false,
  getValue = optionValue,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedValues = Array.isArray(value) ? value : [];
  const filteredOptions = options.filter((item) =>
    optionLabel(item).toLowerCase().includes(search.toLowerCase()),
  );

  const toggleOption = (item) => {
    const selectedValue = getValue(item);
    if (!selectedValue) return;
    if (selectedValues.includes(selectedValue)) {
      onChange(selectedValues.filter((current) => current !== selectedValue));
      return;
    }
    onChange([...selectedValues, selectedValue]);
  };

  return (
    <div ref={ref} className="relative">
      <div
        className={`admin-input flex min-h-[42px] flex-wrap gap-1.5 ${disabled ? "cursor-not-allowed bg-gray-50 text-gray-400" : "cursor-pointer bg-white"}`}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
      >
        {!selectedValues.length ? <span className="text-sm text-gray-400">{placeholder}</span> : null}
        {selectedValues.map((item) => (
          <span key={item} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--admin-blue)]/10 px-2 py-0.5 text-xs font-medium text-[var(--admin-blue)]">
            <span className="truncate">{item}</span>
            <button
              type="button"
              className="leading-none hover:text-red-500"
              onClick={(event) => {
                event.stopPropagation();
                onChange(selectedValues.filter((current) => current !== item));
              }}
            >
              x
            </button>
          </span>
        ))}
      </div>
      {open && !disabled ? (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="sticky top-0 border-b bg-white p-2">
            <input
              className="admin-input py-1 text-sm"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              autoFocus
            />
          </div>
          {loading ? <div className="px-3 py-4 text-center text-sm text-gray-400">Loading...</div> : null}
          {!loading && filteredOptions.map((item) => {
            const selectedValue = getValue(item);
            const selected = selectedValues.includes(selectedValue);
            return (
              <button
                key={optionParentId(item) || selectedValue}
                type="button"
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${selected ? "font-medium text-[var(--admin-blue)]" : "text-gray-700"}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleOption(item);
                }}
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? "border-[var(--admin-blue)] bg-[var(--admin-blue)]" : "border-gray-300"}`}>
                  {selected ? <MdCheckCircle className="text-xs text-white" /> : null}
                </span>
                {optionLabel(item)}
              </button>
            );
          })}
          {!loading && !filteredOptions.length ? <div className="px-3 py-4 text-center text-sm text-gray-400">{emptyText}</div> : null}
        </div>
      ) : null}
    </div>
  );
};

const LocationValueSelector = ({
  label,
  value = [],
  onChange,
  type = "pincode",
  hint,
}) => {
  const [filters, setFilters] = useState({ countryId: "", stateId: "", cityId: "" });
  const [options, setOptions] = useState({ countries: [], states: [], cities: [], pincodes: [] });
  const [loading, setLoading] = useState({ countries: false, states: false, cities: false, pincodes: false });

  useEffect(() => {
    let active = true;
    setLoading((current) => ({ ...current, countries: true }));
    dropdownApi.getCountries({ limit: 100 })
      .then((items) => {
        if (!active) return;
        setOptions((current) => ({ ...current, countries: items || [] }));
        const india = (items || []).find((item) => /india/i.test(optionLabel(item)));
        setFilters((current) => current.countryId || !india ? current : { ...current, countryId: optionParentId(india) });
      })
      .catch(() => {
        if (active) setOptions((current) => ({ ...current, countries: [] }));
      })
      .finally(() => {
        if (active) setLoading((current) => ({ ...current, countries: false }));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!filters.countryId) {
      setOptions((current) => ({ ...current, states: [], cities: [], pincodes: [] }));
      return undefined;
    }
    let active = true;
    setLoading((current) => ({ ...current, states: true }));
    dropdownApi.getStates(filters.countryId, { limit: 100 })
      .then((items) => {
        if (active) setOptions((current) => ({ ...current, states: items || [] }));
      })
      .catch(() => {
        if (active) setOptions((current) => ({ ...current, states: [] }));
      })
      .finally(() => {
        if (active) setLoading((current) => ({ ...current, states: false }));
      });
    return () => { active = false; };
  }, [filters.countryId]);

  useEffect(() => {
    if (!filters.stateId) {
      setOptions((current) => ({ ...current, cities: [], pincodes: [] }));
      return undefined;
    }
    let active = true;
    setLoading((current) => ({ ...current, cities: true }));
    dropdownApi.getCities(filters.stateId, { limit: 100 })
      .then((items) => {
        if (active) setOptions((current) => ({ ...current, cities: items || [] }));
      })
      .catch(() => {
        if (active) setOptions((current) => ({ ...current, cities: [] }));
      })
      .finally(() => {
        if (active) setLoading((current) => ({ ...current, cities: false }));
      });
    return () => { active = false; };
  }, [filters.stateId]);

  useEffect(() => {
    if (type !== "pincode" || !filters.cityId) {
      setOptions((current) => ({ ...current, pincodes: [] }));
      return undefined;
    }
    let active = true;
    setLoading((current) => ({ ...current, pincodes: true }));
    dropdownApi.getPincodes(filters.cityId, { limit: 100 })
      .then((items) => {
        if (active) setOptions((current) => ({ ...current, pincodes: items || [] }));
      })
      .catch(() => {
        if (active) setOptions((current) => ({ ...current, pincodes: [] }));
      })
      .finally(() => {
        if (active) setLoading((current) => ({ ...current, pincodes: false }));
      });
    return () => { active = false; };
  }, [filters.cityId, type]);

  const patchFilter = (key, selectedValue) => {
    setFilters((current) => ({
      ...current,
      [key]: selectedValue,
      ...(key === "countryId" ? { stateId: "", cityId: "" } : {}),
      ...(key === "stateId" ? { cityId: "" } : {}),
    }));
  };

  const selectedOptions = type === "state" ? options.states : type === "city" ? options.cities : options.pincodes;
  const needsState = type === "city" || type === "pincode";
  const needsCity = type === "pincode";

  return (
    <div className="space-y-2">
      <Field label={label} hint={hint}>
        <div className="grid gap-2 md:grid-cols-3">
          <select className="admin-input" value={filters.countryId} onChange={(event) => patchFilter("countryId", event.target.value)}>
            <option value="">{loading.countries ? "Loading countries..." : "Country"}</option>
            {options.countries.map((item) => <option key={optionParentId(item) || optionLabel(item)} value={optionParentId(item)}>{optionLabel(item)}</option>)}
          </select>
          {needsState ? (
            <select className="admin-input" value={filters.stateId} onChange={(event) => patchFilter("stateId", event.target.value)} disabled={!filters.countryId}>
              <option value="">{loading.states ? "Loading states..." : "State"}</option>
              {options.states.map((item) => <option key={optionParentId(item) || optionLabel(item)} value={optionParentId(item)}>{optionLabel(item)}</option>)}
            </select>
          ) : null}
          {needsCity ? (
            <select className="admin-input" value={filters.cityId} onChange={(event) => patchFilter("cityId", event.target.value)} disabled={!filters.stateId}>
              <option value="">{loading.cities ? "Loading cities..." : "City"}</option>
              {options.cities.map((item) => <option key={optionParentId(item) || optionLabel(item)} value={optionParentId(item)}>{optionLabel(item)}</option>)}
            </select>
          ) : null}
        </div>
        <OptionMultiSelect
          value={value}
          onChange={onChange}
          options={selectedOptions}
          disabled={type === "state" ? !filters.countryId : type === "city" ? !filters.stateId : !filters.cityId}
          loading={type === "state" ? loading.states : type === "city" ? loading.cities : loading.pincodes}
          placeholder={type === "state" ? "Select states..." : type === "city" ? "Select cities..." : "Select pincodes..."}
          searchPlaceholder={type === "state" ? "Search states..." : type === "city" ? "Search cities..." : "Search pincodes..."}
          emptyText={type === "state" ? "No states found" : type === "city" ? "No cities found" : "No pincodes found"}
        />
      </Field>
    </div>
  );
};

const Section = ({ title, icon: Icon = MdSettings, children, action }) => (
  <section className="admin-card p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-[var(--admin-gold)]" />
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const TemplateSellerSelector = ({
  value = [],
  sellerOptions = [],
  onChange,
}) => {
  const assignedIds = Array.isArray(value) ? value : [];
  const availableOptions = sellerOptions.filter((seller) => !assignedIds.includes(seller.value));

  const addSeller = (sellerId) => {
    if (!sellerId || assignedIds.includes(sellerId)) return;
    onChange([...assignedIds, sellerId]);
  };

  const removeSeller = (sellerId) => {
    onChange(assignedIds.filter((id) => id !== sellerId));
  };

  const sellerLabel = (sellerId) =>
    sellerOptions.find((seller) => seller.value === sellerId)?.label || shortId(sellerId);

  return (
    <div className="space-y-2">
      <select
        className="admin-input"
        value=""
        onChange={(event) => addSeller(event.target.value)}
      >
        <option value="">Assign seller...</option>
        {availableOptions.map((seller) => (
          <option key={seller.value} value={seller.value}>{seller.label}</option>
        ))}
      </select>
      <div className="flex min-h-[38px] flex-wrap gap-2 rounded border border-gray-100 bg-gray-50 p-2">
        {assignedIds.length ? assignedIds.map((sellerId) => (
          <span
            key={sellerId}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--admin-line)] bg-white px-2.5 py-1 text-xs font-medium text-gray-700"
          >
            <span className="truncate">{sellerLabel(sellerId)}</span>
            <button
              type="button"
              className="text-gray-400 hover:text-red-600"
              onClick={() => removeSeller(sellerId)}
              aria-label={`Remove ${sellerLabel(sellerId)}`}
            >
              x
            </button>
          </span>
        )) : (
          <span className="text-xs text-gray-400">No sellers assigned</span>
        )}
      </div>
    </div>
  );
};

export default function CommerceSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeView = useMemo(() => {
    const route = ROUTES.find((item) => location.pathname === item.path);
    return route?.key || "dashboard";
  }, [location.pathname]);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [runtime, setRuntime] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sellerRows, setSellerRows] = useState([]);
  const [sellerSearch, setSellerSearch] = useState("");
  const [sellerOptions, setSellerOptions] = useState([]);
  const [sellerId, setSellerId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [sellerSettings, setSellerSettings] = useState(DEFAULT_SELLER);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerSaving, setSellerSaving] = useState(false);
  const [ruleText, setRuleText] = useState({ productRules: "[]", orderRules: "[]", regionRules: "[]" });
  const [expandedTemplateId, setExpandedTemplateId] = useState("standard_seller");

  const patchSettings = (section, patch) => {
    setSettings((current) => ({ ...current, [section]: { ...(current[section] || {}), ...patch } }));
  };
  const patchSeller = (section, patch) => {
    setSellerSettings((current) => ({ ...current, [section]: { ...(current[section] || {}), ...patch } }));
  };
  const patchSellerMeta = (patch) => {
    setSellerSettings((current) => ({ ...current, metadata: { ...(current.metadata || {}), ...patch } }));
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosProvider.get(ENDPOINTS.commerceSettings.detail);
      const data = response?.data?.data || {};
      setSettings(mergeSettings(data.settings || {}));
      setRuntime(data.runtime || {});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load commerce settings");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSellerRows = useCallback(async () => {
    try {
      const response = await axiosProvider.get(ENDPOINTS.commerceSettings.sellerChargeSettings, {
        params: { search: sellerSearch || undefined, limit: 50 },
      });
      setSellerRows(response?.data?.data?.items || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load seller commerce settings");
    }
  }, [sellerSearch]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);
  useEffect(() => { fetchSellerRows(); }, [fetchSellerRows]);
  useEffect(() => {
    dropdownApi.getSellers({ limit: 100, searchFields: "full_name,email,businessName,displayName" })
      .then(setSellerOptions)
      .catch(() => setSellerOptions([]));
  }, []);

  const saveSettings = async (nextSettings = settings) => {
    setSaving(true);
    try {
      const payload = {
        ...nextSettings,
        cod: {
          ...nextSettings.cod,
          allowPincodes: splitList(joinList(nextSettings.cod.allowPincodes)),
          blockPincodes: splitList(joinList(nextSettings.cod.blockPincodes)),
          feeAmount: Number(nextSettings.cod.feeAmount || 0),
          minOrderAmount: nullableNumber(nextSettings.cod.minOrderAmount),
          maxOrderAmount: nullableNumber(nextSettings.cod.maxOrderAmount),
        },
        platformFees: {
          ...nextSettings.platformFees,
          customerFeeValue: Number(nextSettings.platformFees.customerFeeValue || 0),
          sellerFeeValue: Number(nextSettings.platformFees.sellerFeeValue || 0),
          gstRate: Number(nextSettings.platformFees.gstRate || 0),
        },
        shippingDefaults: {
          ...nextSettings.shippingDefaults,
          defaultCharge: Number(nextSettings.shippingDefaults.defaultCharge || 0),
          freeShippingThreshold: nullableNumber(nextSettings.shippingDefaults.freeShippingThreshold),
          handlingFee: Number(nextSettings.shippingDefaults.handlingFee || 0),
        },
        wallet: {
          ...nextSettings.wallet,
          autoApplyMaxPercent: Number(nextSettings.wallet.autoApplyMaxPercent || 0),
        },
        finance: {
          ...nextSettings.finance,
          platformFeeTaxRate: Number(nextSettings.platformFees.gstRate ?? nextSettings.finance.platformFeeTaxRate ?? 0),
        },
      };
      const response = await axiosProvider.put(ENDPOINTS.commerceSettings.detail, payload);
      setSettings(mergeSettings(response?.data?.data || payload));
      toast.success("Commerce settings saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save commerce settings");
    } finally {
      setSaving(false);
    }
  };

  const loadOrganizations = useCallback(async (targetSellerId) => {
    const value = String(targetSellerId || "").trim();
    if (!value) {
      setOrganizationOptions([]);
      setOrganizationId("");
      return;
    }
    try {
      const response = await axiosProvider.get(ENDPOINTS.sellerOrganizations.bySeller(value), { params: { limit: 100 } });
      const raw = response?.data?.data;
      const items = raw?.items || raw?.list || raw?.data || raw || [];
      setOrganizationOptions((Array.isArray(items) ? items : []).map((item) => ({
        value: item.id || item.organizationId,
        label: item.storeDisplayName || item.legalBusinessName || item.id || item.organizationId,
      })).filter((item) => item.value));
    } catch {
      setOrganizationOptions([]);
    }
  }, []);

  useEffect(() => { loadOrganizations(sellerId); }, [sellerId, loadOrganizations]);

  const loadSeller = async (id = sellerId, orgId = organizationId) => {
    const targetSellerId = String(id || "").trim();
    const targetOrganizationId = String(orgId || "").trim();
    if (!targetSellerId) {
      toast.error("Select a seller before creating a commerce configuration");
      return;
    }
    setSellerLoading(true);
    try {
      const response = await axiosProvider.get(ENDPOINTS.commerceSettings.sellerChargeSetting(targetSellerId), {
        params: targetOrganizationId ? { organizationId: targetOrganizationId } : undefined,
      });
      const data = response?.data?.data || {};
      const next = {
        ...DEFAULT_SELLER,
        ...data,
        cod: { ...DEFAULT_SELLER.cod, ...(data.cod || {}) },
        delivery: { ...DEFAULT_SELLER.delivery, ...(data.delivery || {}) },
        metadata: { ...DEFAULT_SELLER.metadata, ...(data.metadata || {}) },
      };
      setSellerId(data.sellerId || targetSellerId);
      setOrganizationId(data.organizationId || targetOrganizationId || "");
      setSellerSettings(next);
      setRuleText({
        productRules: formatRules(next.delivery.productRules),
        orderRules: formatRules(next.delivery.orderRules),
        regionRules: formatRules(next.delivery.regionRules),
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load seller commerce settings");
    } finally {
      setSellerLoading(false);
    }
  };

  const saveSeller = async () => {
    const targetSellerId = String(sellerId || sellerSettings.sellerId || "").trim();
    const targetOrganizationId = String(organizationId || sellerSettings.organizationId || "").trim();
    if (!targetSellerId) {
      toast.error("Select a seller before creating a shipping profile or commerce configuration");
      return;
    }
    setSellerSaving(true);
    try {
      const payload = {
        ...(targetOrganizationId ? { organizationId: targetOrganizationId } : {}),
        cod: {
          ...sellerSettings.cod,
          chargeAmount: Number(sellerSettings.cod.chargeAmount || 0),
          minOrderAmount: nullableNumber(sellerSettings.cod.minOrderAmount),
          maxOrderAmount: nullableNumber(sellerSettings.cod.maxOrderAmount),
          allowPincodes: splitList(joinList(sellerSettings.cod.allowPincodes)),
          blockPincodes: splitList(joinList(sellerSettings.cod.blockPincodes)),
        },
        delivery: {
          ...sellerSettings.delivery,
          chargeAmount: Number(sellerSettings.delivery.chargeAmount || 0),
          freeDeliveryMinOrderAmount: nullableNumber(sellerSettings.delivery.freeDeliveryMinOrderAmount),
          allowPincodes: splitList(joinList(sellerSettings.delivery.allowPincodes)),
          blockPincodes: splitList(joinList(sellerSettings.delivery.blockPincodes)),
          regions: splitList(joinList(sellerSettings.delivery.regions)),
          productRules: parseRules(ruleText.productRules, "Product rules"),
          orderRules: parseRules(ruleText.orderRules, "Order rules"),
          regionRules: parseRules(ruleText.regionRules, "Region rules"),
          estimatedDaysMin: nullableNumber(sellerSettings.delivery.estimatedDaysMin),
          estimatedDaysMax: nullableNumber(sellerSettings.delivery.estimatedDaysMax),
          handlingCharge: Number(sellerSettings.delivery.handlingCharge || 0),
        },
        metadata: sellerSettings.metadata || {},
      };
      const response = await axiosProvider.put(ENDPOINTS.commerceSettings.sellerChargeSetting(targetSellerId), payload, {
        params: targetOrganizationId ? { organizationId: targetOrganizationId } : undefined,
      });
      const data = response?.data?.data || {};
      setSellerSettings({
        ...DEFAULT_SELLER,
        ...data,
        cod: { ...DEFAULT_SELLER.cod, ...(data.cod || {}) },
        delivery: { ...DEFAULT_SELLER.delivery, ...(data.delivery || {}) },
        metadata: { ...DEFAULT_SELLER.metadata, ...(data.metadata || {}) },
      });
      toast.success("Seller commerce configuration saved");
      fetchSellerRows();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to save seller settings");
    } finally {
      setSellerSaving(false);
    }
  };

  const activeRoute = ROUTES.find((item) => item.key === activeView) || ROUTES[0];
  const sellerName = sellerOptions.find((item) => item.value === sellerId)?.label || sellerId;
  const appliedTemplate = settings.templates.find((item) => item.id === sellerSettings.metadata?.templateId);
  const appliedTier = settings.sellerTiers.find((item) => item.id === sellerSettings.metadata?.tierId);
  const razorpayStatus = runtime?.razorpay?.enabled ? "active" : runtime?.razorpay?.configured ? "pending" : "inactive";
  const pageSubtitle = {
    dashboard: "Review platform defaults, seller overrides, templates, tiers, and rule readiness.",
    platform: "Configure platform-level defaults only. Seller-specific overrides live under Seller Config.",
    seller: "Manage seller-specific commerce overrides without changing global platform defaults.",
    templates: "Build reusable seller configuration presets and assign them to sellers without raw ID entry.",
    tiers: "Define seller tier benefits, fee rules, payout delays, and future upgrade rules.",
  }[activeView] || "Commerce controls for platform defaults, seller overrides, templates, and tiers.";
  const sellerLabel = (sellerId) =>
    sellerOptions.find((seller) => seller.value === sellerId)?.label || shortId(sellerId);

  const addTemplate = () => {
    const next = { id: `template_${Date.now()}`, name: "New Template", active: true, version: "v1", description: "", sellerIds: [], settings: {} };
    setSettings((current) => ({ ...current, templates: [...current.templates, next] }));
    setExpandedTemplateId(next.id);
  };
  const updateTemplate = (index, patch) => {
    setSettings((current) => ({
      ...current,
      templates: current.templates.map((item, idx) => idx === index ? { ...item, ...patch, id: patch.name && !item.id ? slug(patch.name) : (patch.id ?? item.id) } : item),
    }));
  };
  const addTier = () => {
    const next = { id: `tier_${Date.now()}`, name: "New Tier", active: true, platformFeeType: "percentage", platformFeeValue: 0, codCharge: 0, commissionPercent: 0, payoutDelayDays: 7, shippingBenefits: "", freeShippingRule: "", prioritySupport: false, upgradeRule: "" };
    setSettings((current) => ({ ...current, sellerTiers: [...current.sellerTiers, next] }));
  };
  const updateTier = (index, patch) => {
    setSettings((current) => ({
      ...current,
      sellerTiers: current.sellerTiers.map((item, idx) => idx === index ? { ...item, ...patch, id: patch.name && !item.id ? slug(patch.name) : (patch.id ?? item.id) } : item),
    }));
  };

  const renderNav = () => (
    <div className="mb-5 flex flex-wrap gap-2">
      {ROUTES.map((item) => {
        const Icon = item.icon;
        const active = item.key === activeView;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.path)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              active ? "border-[var(--admin-gold)] bg-[var(--admin-gold-soft)] text-[var(--admin-navy)]" : "border-gray-200 bg-white text-gray-600 hover:border-[var(--admin-gold)]"
            }`}
          >
            <Icon size={16} /> {item.label}
          </button>
        );
      })}
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="admin-card p-4"><p className="text-xs font-semibold uppercase text-gray-400">Platform Fee</p><p className="mt-2 text-sm font-semibold">{settings.platformFees.sellerFeeValue}{settings.platformFees.sellerFeeType === "percentage" ? "%" : " INR"} seller</p></div>
        <div className="admin-card p-4"><p className="text-xs font-semibold uppercase text-gray-400">COD Default</p><p className="mt-2 text-sm font-semibold">{settings.cod.enabled ? settings.cod.availabilityMode.replace(/_/g, " ") : "Disabled"}</p></div>
        <div className="admin-card p-4"><p className="text-xs font-semibold uppercase text-gray-400">Shipping Default</p><p className="mt-2 text-sm font-semibold">{money(settings.shippingDefaults.defaultCharge)}</p></div>
        <div className="admin-card p-4"><p className="text-xs font-semibold uppercase text-gray-400">Gateway</p><div className="mt-2 flex items-center justify-between"><span className="text-sm font-semibold">{settings.payments.gateway}</span><StatusBadge status={razorpayStatus} dot /></div></div>
      </div>
      <Section
        title="Seller Overrides"
        icon={MdCompareArrows}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="admin-input w-64"
              value={sellerSearch}
              onChange={(event) => setSellerSearch(event.target.value)}
              placeholder="Search seller or organization"
            />
            <button type="button" className="admin-btn-secondary" onClick={fetchSellerRows}>
              <MdSearch size={16} /> Search
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead><tr className="text-left text-xs uppercase text-gray-500"><th className="py-2">Seller</th><th>Scope</th><th>Template</th><th>Tier</th><th>Shipping</th><th>COD</th><th>Difference</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sellerRows.map((row) => {
                const template = settings.templates.find((item) => item.id === row.metadata?.templateId);
                const tier = settings.sellerTiers.find((item) => item.id === row.metadata?.tierId);
                const shippingDiff = Number(row.delivery?.chargeAmount || 0) !== Number(settings.shippingDefaults.defaultCharge || 0);
                const codDiff = row.cod?.availabilityMode && row.cod.availabilityMode !== "inherit";
                return (
                  <tr key={`${row.sellerId}-${row.organizationId || "default"}`}>
                    <td className="py-3 font-medium">{sellerOptions.find((item) => item.value === row.sellerId)?.label || row.sellerId}</td>
                    <td>{row.organizationId ? shortId(row.organizationId) : "Seller default"}</td>
                    <td>{template?.name || "None"}</td>
                    <td>{tier?.name || "None"}</td>
                    <td>{money(row.delivery?.chargeAmount)}</td>
                    <td>{row.cod?.enabled ? row.cod?.availabilityMode : "Disabled"}</td>
                    <td><span className={`rounded-full px-2 py-1 text-xs ${shippingDiff || codDiff ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>{shippingDiff || codDiff ? "Override" : "Default"}</span></td>
                  </tr>
                );
              })}
              {!sellerRows.length ? <tr><td colSpan="7" className="py-6 text-center text-gray-500">No seller overrides saved yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );

  const renderPlatform = () => (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="admin-card p-4">
          <p className="text-xs font-semibold uppercase text-gray-400">Customer Fee</p>
          <p className="mt-2 text-lg font-bold text-[var(--admin-navy)]">{settings.platformFees.customerFeeValue}{settings.platformFees.customerFeeType === "percentage" ? "%" : " INR"}</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs font-semibold uppercase text-gray-400">Seller Fee</p>
          <p className="mt-2 text-lg font-bold text-[var(--admin-navy)]">{settings.platformFees.sellerFeeValue}{settings.platformFees.sellerFeeType === "percentage" ? "%" : " INR"}</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs font-semibold uppercase text-gray-400">COD</p>
          <p className="mt-2 text-lg font-bold text-[var(--admin-navy)]">{settings.cod.enabled ? "Enabled" : "Disabled"}</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs font-semibold uppercase text-gray-400">Shipping</p>
          <p className="mt-2 text-lg font-bold text-[var(--admin-navy)]">{money(settings.shippingDefaults.defaultCharge)}</p>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
      <Section title="Platform Fees">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Customer Platform Fee" value={settings.platformFees.customerFeeType} onChange={(value) => patchSettings("platformFees", { customerFeeType: value })} options={[option("fixed", "Fixed"), option("percentage", "Percentage")]} />
          <InputField label="Customer Fee Value" type="number" min="0" value={settings.platformFees.customerFeeValue} onChange={(value) => patchSettings("platformFees", { customerFeeValue: value })} />
          <SelectField label="Seller Platform Fee" value={settings.platformFees.sellerFeeType} onChange={(value) => patchSettings("platformFees", { sellerFeeType: value })} options={[option("fixed", "Fixed"), option("percentage", "Percentage")]} />
          <InputField label="Seller Fee Value" type="number" min="0" value={settings.platformFees.sellerFeeValue} onChange={(value) => patchSettings("platformFees", { sellerFeeValue: value })} />
          <InputField label="GST on Platform Fee" type="number" min="0" max="100" value={settings.platformFees.gstRate} onChange={(value) => patchSettings("platformFees", { gstRate: value })} />
          <SelectField label="Fee Calculation Base" value={settings.platformFees.calculationBase} onChange={(value) => patchSettings("platformFees", { calculationBase: value })} options={[option("product_price", "Product Price"), option("order_total", "Order Total"), option("subtotal", "Subtotal")]} />
        </div>
      </Section>
      <Section title="Payment Settings">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Payment Gateway" value={settings.payments.gateway} onChange={(value) => patchSettings("payments", { gateway: value })} options={[option("razorpay", "Razorpay"), option("cashfree", "Cashfree"), option("stripe", "Stripe"), option("manual", "Manual")]} />
          <SelectField label="Gateway Fee Policy" value={settings.payments.gatewayFeePolicy} onChange={(value) => patchSettings("payments", { gatewayFeePolicy: value })} options={[option("platform_absorbs", "Platform absorbs"), option("seller_deducted", "Seller deducted"), option("split", "Split")]} />
          <SelectField label="Wallet" value={settings.wallet.partialPaymentMode} onChange={(value) => patchSettings("wallet", { partialPaymentMode: value })} options={[option("user_opt_in", "User opt-in"), option("auto_apply", "Auto apply"), option("disabled", "Disabled")]} />
          <InputField label="Wallet Max Percent" type="number" min="0" max="100" value={settings.wallet.autoApplyMaxPercent} onChange={(value) => patchSettings("wallet", { autoApplyMaxPercent: value })} />
          <SelectField label="Refund Policy" value={settings.payments.refundPolicy} onChange={(value) => patchSettings("payments", { refundPolicy: value })} options={[option("manual_review", "Manual review"), option("auto_after_return", "Auto after return"), option("instant_wallet", "Instant wallet"), option("gateway_original", "Gateway original")]} />
          <SelectField
            label="Payout Release Rule"
            value={settings.finance.payoutReleaseMilestone}
            onChange={(value) => patchSettings("finance", { payoutReleaseMilestone: value })}
            options={[option("confirmed", "Confirmed"), option("delivered_or_fulfilled", "Delivered or fulfilled"), option("return_window_closed", "Return window closed")]}
            hint="Used by seller payout APIs to decide which commissions are released for payout."
          />
        </div>
      </Section>
      <Section title="COD Configuration">
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField label="Enable COD" checked={settings.cod.enabled} onChange={(value) => patchSettings("cod", { enabled: value, availabilityMode: value ? settings.cod.availabilityMode : "disabled" })} />
          <InputField label="COD Fee Default" type="number" min="0" value={settings.cod.feeAmount} onChange={(value) => patchSettings("cod", { feeAmount: value })} />
          <SelectField label="COD Availability" value={settings.cod.availabilityMode} onChange={(value) => patchSettings("cod", { availabilityMode: value, enabled: value !== "disabled" })} options={[option("all_pincodes", "All India"), option("allowlist", "Serviceable pincodes only"), option("blocklist", "All except blocked pincodes"), option("disabled", "Disabled")]} />
          <SelectField label="COD Collection Mode" value={settings.cod.collectionPolicy} onChange={(value) => patchSettings("cod", { collectionPolicy: value })} options={[option("platform_or_courier", "Platform or courier"), option("seller_direct", "Seller direct"), option("hybrid", "Hybrid")]} />
          <InputField label="COD Minimum Order" type="number" min="0" value={settings.cod.minOrderAmount || ""} onChange={(value) => patchSettings("cod", { minOrderAmount: value })} />
          <InputField label="COD Maximum Order" type="number" min="0" value={settings.cod.maxOrderAmount || ""} onChange={(value) => patchSettings("cod", { maxOrderAmount: value })} />
          <LocationValueSelector
            label="COD Serviceable Pincodes"
            value={settings.cod.allowPincodes}
            onChange={(value) => patchSettings("cod", { allowPincodes: value })}
            type="pincode"
            hint="Used when COD availability is serviceable pincodes only."
          />
          <LocationValueSelector
            label="COD Block Pincodes"
            value={settings.cod.blockPincodes}
            onChange={(value) => patchSettings("cod", { blockPincodes: value })}
            type="pincode"
            hint="Used when COD availability is all except blocked pincodes."
          />
        </div>
      </Section>
      <Section title="Shipping Defaults">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Default Shipping Charge" type="number" min="0" value={settings.shippingDefaults.defaultCharge} onChange={(value) => patchSettings("shippingDefaults", { defaultCharge: value })} />
          <InputField label="Free Shipping Threshold" type="number" min="0" value={settings.shippingDefaults.freeShippingThreshold || ""} onChange={(value) => patchSettings("shippingDefaults", { freeShippingThreshold: value })} />
          <InputField label="Default Handling Fee" type="number" min="0" value={settings.shippingDefaults.handlingFee} onChange={(value) => patchSettings("shippingDefaults", { handlingFee: value })} />
          <SelectField label="Default Shipping Method" value={settings.shippingDefaults.shippingMethod} onChange={(value) => patchSettings("shippingDefaults", { shippingMethod: value })} options={[option("standard", "Standard"), option("express", "Express"), option("same_day", "Same Day"), option("seller_managed", "Seller Managed")]} />
          <SelectField label="Seller Payout Base" value={settings.finance.sellerPayoutBase} onChange={(value) => patchSettings("finance", { sellerPayoutBase: value })} options={[option("gross_customer_price", "Gross customer price"), option("taxable_ex_gst", "Taxable ex GST")]} />
          <SelectField label="Shipping In Payout" value={settings.finance.shippingPolicy} onChange={(value) => patchSettings("finance", { shippingPolicy: value })} options={[option("not_in_seller_payout", "Not in seller payout"), option("reimburse_seller", "Reimburse seller"), option("deduct_from_seller", "Deduct from seller")]} />
        </div>
      </Section>
      </div>
    </div>
  );

  const renderSeller = () => (
    <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
      <Section title="Select Seller" icon={MdSearch}>
        <div className="space-y-4">
          <SelectField label="Seller" value={sellerId} onChange={setSellerId} options={[option("", "Select seller..."), ...sellerOptions]} hint="This seller receives the private commerce configuration." />
          <SelectField label="Organization" value={organizationId} onChange={setOrganizationId} options={[option("", "Seller-wide default"), ...organizationOptions]} />
          <div className="flex gap-2">
            <button type="button" className="admin-btn-secondary" onClick={() => loadSeller()} disabled={sellerLoading}><MdSearch size={16} /> {sellerLoading ? "Loading..." : "Load"}</button>
            <PermissionGuard module="admin" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-btn-primary" onClick={saveSeller} disabled={sellerSaving}><MdSave size={16} /> {sellerSaving ? "Saving..." : "Save"}</button>
            </PermissionGuard>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-semibold text-gray-800">{sellerName || "No seller selected"}</p>
            <p className="mt-1">Template: {appliedTemplate?.name || "None"} · Tier: {appliedTier?.name || "None"}</p>
          </div>
        </div>
      </Section>
      <div className="space-y-5">
        <Section title="Template, Tier, And Override">
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField label="Applied Template" value={sellerSettings.metadata?.templateId || ""} onChange={(value) => patchSellerMeta({ templateId: value })} options={[option("", "No template"), ...settings.templates.map((item) => option(item.id, `${item.name} · ${item.version || "v1"}`))]} />
            <SelectField label="Seller Tier" value={sellerSettings.metadata?.tierId || ""} onChange={(value) => patchSellerMeta({ tierId: value })} options={[option("", "No tier"), ...settings.sellerTiers.map((item) => option(item.id, item.name))]} />
            <ToggleField label="Admin Override" checked={sellerSettings.metadata?.adminOverride} onChange={(value) => patchSellerMeta({ adminOverride: value })} />
            <TextAreaField label="Override Notes" value={sellerSettings.metadata?.overrideNotes || ""} onChange={(value) => patchSellerMeta({ overrideNotes: value })} />
          </div>
        </Section>
        <Section title="Seller COD">
          <div className="grid gap-4 md:grid-cols-3">
            <ToggleField label="COD Enabled" checked={sellerSettings.cod.enabled} onChange={(value) => patchSeller("cod", { enabled: value })} />
            <SelectField label="COD Charge Mode" value={sellerSettings.cod.chargeMode} onChange={(value) => patchSeller("cod", { chargeMode: value })} options={[option("inherit", "Inherit platform"), option("none", "No charge"), option("flat", "Flat charge")]} />
            <InputField label="COD Charges" type="number" min="0" value={sellerSettings.cod.chargeAmount} onChange={(value) => patchSeller("cod", { chargeAmount: value })} />
            <SelectField label="COD Availability" value={sellerSettings.cod.availabilityMode} onChange={(value) => patchSeller("cod", { availabilityMode: value })} options={[option("inherit", "Inherit platform"), option("all_pincodes", "All India"), option("allowlist", "Allowed pincodes"), option("blocklist", "Block listed pincodes"), option("disabled", "Disabled")]} />
            <InputField label="COD Min Order" type="number" min="0" value={sellerSettings.cod.minOrderAmount || ""} onChange={(value) => patchSeller("cod", { minOrderAmount: value })} />
            <InputField label="COD Max Order" type="number" min="0" value={sellerSettings.cod.maxOrderAmount || ""} onChange={(value) => patchSeller("cod", { maxOrderAmount: value })} />
            <LocationValueSelector
              label="COD Serviceable Pincodes"
              value={sellerSettings.cod.allowPincodes}
              onChange={(value) => patchSeller("cod", { allowPincodes: value })}
              type="pincode"
            />
            <LocationValueSelector
              label="COD Blocked Pincodes"
              value={sellerSettings.cod.blockPincodes}
              onChange={(value) => patchSeller("cod", { blockPincodes: value })}
              type="pincode"
            />
          </div>
        </Section>
        <Section title="Seller Shipping And Delivery">
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField label="Shipping Charge Mode" value={sellerSettings.delivery.mode} onChange={(value) => patchSeller("delivery", { mode: value })} options={[option("none", "Use platform / none"), option("flat", "Flat charge"), option("free_over_amount", "Free above amount"), option("product", "Product rules"), option("order", "Order rules"), option("region", "Region rules"), option("rule_based", "Rule priority")]} />
            <InputField label="Shipping Charges" type="number" min="0" value={sellerSettings.delivery.chargeAmount} onChange={(value) => patchSeller("delivery", { chargeAmount: value })} />
            <InputField label="Free Shipping Above" type="number" min="0" value={sellerSettings.delivery.freeDeliveryMinOrderAmount || ""} onChange={(value) => patchSeller("delivery", { freeDeliveryMinOrderAmount: value })} />
            <InputField label="Handling Charges" type="number" min="0" value={sellerSettings.delivery.handlingCharge || 0} onChange={(value) => patchSeller("delivery", { handlingCharge: value })} />
            <InputField label="Shipping Partner" value={sellerSettings.delivery.shippingPartner || ""} onChange={(value) => patchSeller("delivery", { shippingPartner: value })} />
            <InputField label="Shipping Methods" value={sellerSettings.delivery.shippingMethod || "standard"} onChange={(value) => patchSeller("delivery", { shippingMethod: value })} />
            <InputField label="Delivery ETA Min" type="number" min="0" value={sellerSettings.delivery.estimatedDaysMin || ""} onChange={(value) => patchSeller("delivery", { estimatedDaysMin: value })} />
            <InputField label="Delivery ETA Max" type="number" min="0" value={sellerSettings.delivery.estimatedDaysMax || ""} onChange={(value) => patchSeller("delivery", { estimatedDaysMax: value })} />
            <SelectField label="Serviceability" value={sellerSettings.delivery.serviceabilityMode} onChange={(value) => patchSeller("delivery", { serviceabilityMode: value })} options={[option("all_pincodes", "All India"), option("allowlist", "Selected pincodes"), option("blocklist", "All except blocked"), option("regions", "State / city / region rules"), option("disabled", "Disabled")]} />
            <LocationValueSelector
              label="Serviceable Pincodes"
              value={sellerSettings.delivery.allowPincodes}
              onChange={(value) => patchSeller("delivery", { allowPincodes: value })}
              type="pincode"
            />
            <LocationValueSelector
              label="Blocked Pincodes"
              value={sellerSettings.delivery.blockPincodes}
              onChange={(value) => patchSeller("delivery", { blockPincodes: value })}
              type="pincode"
            />
            <LocationValueSelector
              label="State / City / Region Rules"
              value={sellerSettings.delivery.regions}
              onChange={(value) => patchSeller("delivery", { regions: value })}
              type="city"
              hint="Stores selected city/region names for seller delivery region rules."
            />
          </div>
        </Section>
        <Section title="Product-Wise And Dynamic Rules">
          <div className="grid gap-4 lg:grid-cols-3">
            <TextAreaField mono rows={8} label="Product-wise Shipping Rules" value={ruleText.productRules} onChange={(value) => setRuleText((current) => ({ ...current, productRules: value }))} />
            <TextAreaField mono rows={8} label="Order Value Rules" value={ruleText.orderRules} onChange={(value) => setRuleText((current) => ({ ...current, orderRules: value }))} />
            <TextAreaField mono rows={8} label="Region Pricing Rules" value={ruleText.regionRules} onChange={(value) => setRuleText((current) => ({ ...current, regionRules: value }))} />
          </div>
        </Section>
      </div>
    </div>
  );

  const renderTemplates = () => (
    <Section
      title="Configuration Templates"
      icon={MdCompareArrows}
      action={<button type="button" className="admin-btn-secondary" onClick={addTemplate}><MdAdd size={16} /> Create Template</button>}
    >
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <div className="min-w-[820px]">
        <div className="grid grid-cols-[minmax(220px,1.4fr)_120px_120px_minmax(180px,1fr)_72px] gap-4 border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase text-gray-500">
          <span>Template</span>
          <span>Version</span>
          <span>Status</span>
          <span>Assigned Sellers</span>
          <span className="text-right">Edit</span>
        </div>
        <div className="divide-y divide-gray-100">
          {settings.templates.map((template, index) => {
            const isExpanded = expandedTemplateId === template.id;
            const assignedCount = Array.isArray(template.sellerIds) ? template.sellerIds.length : 0;
            return (
              <div key={template.id || index}>
                <div className="grid grid-cols-[minmax(220px,1.4fr)_120px_120px_minmax(180px,1fr)_72px] items-center gap-4 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{template.name}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{template.description || "No description"}</p>
                  </div>
                  <span className="font-mono text-xs text-gray-600">{template.version || "v1"}</span>
                  <span className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${template.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {template.active ? "Active" : "Inactive"}
                  </span>
                  <div className="min-w-0">
                    {assignedCount ? (
                      <p className="truncate text-xs text-gray-700">
                        {template.sellerIds.slice(0, 2).map(sellerLabel).join(", ")}
                        {assignedCount > 2 ? ` +${assignedCount - 2}` : ""}
                      </p>
                    ) : (
                      <span className="text-xs text-gray-400">No sellers assigned</span>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-[var(--admin-blue-soft)] hover:text-[var(--admin-navy)]"
                      onClick={() => setExpandedTemplateId(isExpanded ? "" : template.id)}
                      aria-label={`Edit ${template.name}`}
                    >
                      {isExpanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
                    </button>
                  </div>
                </div>
                {isExpanded ? (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
                      <div className="grid gap-4 md:grid-cols-3">
                        <InputField label="Template Name" value={template.name} onChange={(value) => updateTemplate(index, { name: value, id: slug(value) || template.id })} />
                        <InputField label="Version" value={template.version || "v1"} onChange={(value) => updateTemplate(index, { version: value })} />
                        <ToggleField label="Active" checked={template.active} onChange={(value) => updateTemplate(index, { active: value })} />
                        <div className="md:col-span-3">
                          <TextAreaField label="Template Description" value={template.description || ""} onChange={(value) => updateTemplate(index, { description: value })} />
                        </div>
                      </div>
                      <Field label="Assigned Sellers" hint="Select sellers from the list. The saved template stores seller IDs behind the scenes.">
                        <TemplateSellerSelector
                          value={template.sellerIds}
                          sellerOptions={sellerOptions}
                          onChange={(sellerIds) => updateTemplate(index, { sellerIds })}
                        />
                      </Field>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </Section>
  );

  const renderTiers = () => (
    <Section title="Seller Tier Management" icon={MdStorefront} action={<button type="button" className="admin-btn-secondary" onClick={addTier}><MdAdd size={16} /> Create Tier</button>}>
      <div className="grid gap-4">
        {settings.sellerTiers.map((tier, index) => (
          <div key={tier.id || index} className="rounded border border-gray-200 p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <InputField label="Tier Name" value={tier.name} onChange={(value) => updateTier(index, { name: value, id: slug(value) || tier.id })} />
              <SelectField label="Platform Fee" value={tier.platformFeeType} onChange={(value) => updateTier(index, { platformFeeType: value })} options={[option("fixed", "Fixed"), option("percentage", "Percentage")]} />
              <InputField label="Platform Fee Value" type="number" min="0" value={tier.platformFeeValue} onChange={(value) => updateTier(index, { platformFeeValue: value })} />
              <InputField label="COD Charges" type="number" min="0" value={tier.codCharge} onChange={(value) => updateTier(index, { codCharge: value })} />
              <InputField label="Commission %" type="number" min="0" max="100" value={tier.commissionPercent} onChange={(value) => updateTier(index, { commissionPercent: value })} />
              <InputField label="Payout Delay Days" type="number" min="0" value={tier.payoutDelayDays} onChange={(value) => updateTier(index, { payoutDelayDays: value })} />
              <ToggleField label="Priority Support" checked={tier.prioritySupport} onChange={(value) => updateTier(index, { prioritySupport: value })} />
              <ToggleField label="Active" checked={tier.active} onChange={(value) => updateTier(index, { active: value })} />
              <TextAreaField label="Shipping Benefits" value={tier.shippingBenefits || ""} onChange={(value) => updateTier(index, { shippingBenefits: value })} />
              <TextAreaField label="Free Shipping Rules" value={tier.freeShippingRule || ""} onChange={(value) => updateTier(index, { freeShippingRule: value })} />
              <TextAreaField label="Auto Upgrade / Downgrade Rule" value={tier.upgradeRule || ""} onChange={(value) => updateTier(index, { upgradeRule: value })} />
            </div>
          </div>
        ))}
      </div>
    </Section>
  );

  return (
    <div>
      <PageHeader
        title={activeRoute.label}
        subtitle={pageSubtitle}
        breadcrumbs={[{ label: "Commerce Settings" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="admin-btn-secondary" onClick={() => { fetchSettings(); fetchSellerRows(); }} disabled={loading}><MdRefresh size={16} /> Refresh</button>
            {activeView !== "seller" ? (
              <PermissionGuard module="admin" action={ACTIONS.UPDATE} hide>
                <button type="button" className="admin-btn-primary" onClick={() => saveSettings()} disabled={saving}><MdSave size={16} /> {saving ? "Saving..." : "Save"}</button>
              </PermissionGuard>
            ) : null}
          </div>
        }
      />
      {renderNav()}
      {activeView === "dashboard" ? renderDashboard() : null}
      {activeView === "platform" ? renderPlatform() : null}
      {activeView === "seller" ? renderSeller() : null}
      {activeView === "templates" ? renderTemplates() : null}
      {activeView === "tiers" ? renderTiers() : null}
    </div>
  );
}
