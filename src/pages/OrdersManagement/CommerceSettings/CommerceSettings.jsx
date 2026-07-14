import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MdCheckCircle,
  MdRefresh,
  MdSave,
  MdStorefront,
} from "react-icons/md";
import { PageHeader } from "../../../components/Shared";
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
    sellerCommissionType: "percentage",
    sellerCommissionValue: 0,
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
    payoutReleaseMilestone: "return_window_closed",
    payoutReleaseDaysAfterDelivery: 7,
    payoutSchedule: "manual",
    payoutManualApprovalRequired: true,
    minimumPayoutAmount: 0,
    shippingPolicy: "not_in_seller_payout",
  },
};

const ROUTES = [
  { key: "platform", label: "Platform Commission", path: "/app/platform-commission", icon: MdStorefront },
];

const option = (value, label) => ({ value, label });
const joinList = (value) => (Array.isArray(value) ? value.join(", ") : String(value || ""));
const splitList = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const nullableNumber = (value) => (value === "" || value === null || value === undefined ? null : Number(value));
const money = (value) => `INR ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const optionLabel = (item = {}) =>
  item.label || item.name || item.title || item.zipCode || item.pincode || item.code || String(item.value || "");
const optionValue = (item = {}) =>
  String(item.rawValue || item.zipCode || item.pincode || item.name || item.label || item.value || item.id || item._id || "").trim();
const optionParentId = (item = {}) => item.id || item._id || item.value || "";

const mergeSettings = (data = {}) => ({
  ...DEFAULT_SETTINGS,
  ...data,
  platformFees: {
    ...DEFAULT_SETTINGS.platformFees,
    ...(data.platformFees || {}),
    sellerCommissionType: data.platformFees?.sellerCommissionType || data.platformFees?.sellerFeeType || DEFAULT_SETTINGS.platformFees.sellerCommissionType,
    sellerCommissionValue: data.platformFees?.sellerCommissionValue ?? data.platformFees?.sellerFeeValue ?? DEFAULT_SETTINGS.platformFees.sellerCommissionValue,
  },
  payments: { ...DEFAULT_SETTINGS.payments, ...(data.payments || {}) },
  wallet: { ...DEFAULT_SETTINGS.wallet, ...(data.wallet || {}) },
  cod: { ...DEFAULT_SETTINGS.cod, ...(data.cod || {}) },
  shippingDefaults: { ...DEFAULT_SETTINGS.shippingDefaults, ...(data.shippingDefaults || {}) },
  finance: { ...DEFAULT_SETTINGS.finance, ...(data.finance || {}) },
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

const Section = ({ title, icon: Icon = MdStorefront, children, action }) => (
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

export default function CommerceSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeView = useMemo(() => {
    const route = ROUTES.find((item) => location.pathname === item.path);
    return route?.key || "platform";
  }, [location.pathname]);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const patchSettings = (section, patch) => {
    setSettings((current) => ({ ...current, [section]: { ...(current[section] || {}), ...patch } }));
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosProvider.get(ENDPOINTS.commerceSettings.detail);
      const data = response?.data?.data || {};
      setSettings(mergeSettings(data.settings || {}));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load commerce settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

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
          customerFeeType: "fixed",
          customerFeeValue: 0,
          sellerCommissionValue: Number(nextSettings.platformFees.sellerCommissionValue || 0),
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

  const activeRoute = ROUTES.find((item) => item.key === activeView) || ROUTES[0];
  const pageSubtitle = {
    platform: "Manage seller platform commission, commission GST, payout holds, and payment policy.",
  }[activeView] || "Commerce controls for platform commission.";

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

  const renderPlatform = () => (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="admin-card p-4">
          <p className="text-xs font-semibold uppercase text-gray-400">Seller Commission</p>
          <p className="mt-2 text-lg font-bold text-[var(--admin-navy)]">{settings.platformFees.sellerCommissionValue}{settings.platformFees.sellerCommissionType === "percentage" ? "%" : " INR"}</p>
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
      <Section title="Seller Commission">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Commission Type" value={settings.platformFees.sellerCommissionType} onChange={(value) => patchSettings("platformFees", { sellerCommissionType: value })} options={[option("percentage", "Percentage"), option("fixed", "Fixed")]} />
          <InputField label="Commission Value" type="number" min="0" value={settings.platformFees.sellerCommissionValue} onChange={(value) => patchSettings("platformFees", { sellerCommissionValue: value })} />
          <InputField label="GST Percentage" type="number" min="0" max="100" value={settings.platformFees.gstRate} onChange={(value) => patchSettings("platformFees", { gstRate: value })} />
          <SelectField label="Apply On" value={settings.platformFees.calculationBase} onChange={(value) => patchSettings("platformFees", { calculationBase: value })} options={[option("subtotal", "Subtotal"), option("order_total", "Total")]} />
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
            options={[option("return_window_closed", "Return window closed")]}
            hint="Seller payout is eligible only after OTP delivery verification and return-window closure."
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

  return (
    <div>
      <PageHeader
        title={activeRoute.label}
        subtitle={pageSubtitle}
        breadcrumbs={[{ label: "Commerce Settings" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="admin-btn-secondary" onClick={fetchSettings} disabled={loading}><MdRefresh size={16} /> Refresh</button>
            <PermissionGuard module="admin" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-btn-primary" onClick={() => saveSettings()} disabled={saving}><MdSave size={16} /> {saving ? "Saving..." : "Save"}</button>
            </PermissionGuard>
          </div>
        }
      />
      {renderNav()}
      {activeView === "platform" ? renderPlatform() : null}
    </div>
  );
}
