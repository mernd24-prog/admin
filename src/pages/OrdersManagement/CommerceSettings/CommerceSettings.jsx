import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  // MdCheckCircle,
  MdRefresh,
  MdSave,
  MdStorefront,
} from "react-icons/md";
import { PageHeader } from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { toast } from "../../../utils/toast";

const DEFAULT_SETTINGS = {
  platformFees: {
    customerFeeType: "fixed",
    customerFeeValue: 0,
    customerFeeTaxRate: 0,
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
  returns: {
    defaultWindowDays: 7,
    allowSellerOverrides: false,
    maxSellerOverrideDays: 7,
    refundPolicy: {
      shipping: {
        fullCancellation: true,
        sellerCancellation: true,
        rtoDeliveryFailed: true,
        customerReturn: false,
        partialReturn: false,
      },
      platformFee: {
        fullCancellation: true,
        sellerCancellation: true,
        rtoDeliveryFailed: false,
        customerReturn: false,
        partialReturn: false,
      },
    },
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
    payoutSchedule: "manual",
    payoutManualApprovalRequired: true,
    minimumPayoutAmount: 0,
    shippingPolicy: "reimburse_seller",
    gstTcsEnabled: false,
    gstTcsRate: 0.5,
    incomeTaxTdsEnabled: false,
    incomeTaxTdsRate: 0.1,
  },
};

const ROUTES = [
  { key: "platform", label: "Platform Commission", path: "/app/platform-commission", icon: MdStorefront },
];

const option = (value, label) => ({ value, label });
const joinList = (value) => (Array.isArray(value) ? value.join(", ") : String(value || ""));
const splitList = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
const nullableNumber = (value) => (value === "" || value === null || value === undefined ? null : Number(value));
// const optionLabel = (item = {}) =>
//   item.label || item.name || item.title || item.zipCode || item.pincode || item.code || String(item.value || "");
// const optionValue = (item = {}) =>
//   String(item.rawValue || item.zipCode || item.pincode || item.name || item.label || item.value || item.id || item._id || "").trim();
// const optionParentId = (item = {}) => item.id || item._id || item.value || "";

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
  returns: {
    ...DEFAULT_SETTINGS.returns,
    ...(data.returns || {}),
    refundPolicy: {
      shipping: {
        ...DEFAULT_SETTINGS.returns.refundPolicy.shipping,
        ...(data.returns?.refundPolicy?.shipping || {}),
      },
      platformFee: {
        ...DEFAULT_SETTINGS.returns.refundPolicy.platformFee,
        ...(data.returns?.refundPolicy?.platformFee || {}),
      },
    },
  },
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

const RefundOption = ({ label, checked, onChange }) => (
  <label className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${checked ? "border-green-200 bg-green-50 text-green-900" : "border-gray-200 bg-white text-gray-700"}`}>
    <span>{label}</span>
    <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
  </label>
);

const RefundScenario = ({ title, hint, shipping, platformFee, onShippingChange, onPlatformFeeChange }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4">
    <div className="mb-3">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-xs text-gray-500">{hint}</div>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      <RefundOption label="Refund shipping" checked={shipping} onChange={onShippingChange} />
      <RefundOption label="Refund platform fee" checked={platformFee} onChange={onPlatformFeeChange} />
    </div>
  </div>
);

// const OptionMultiSelect = ({
//   value = [],
//   onChange,
//   options = [],
//   placeholder = "Select values...",
//   searchPlaceholder = "Search...",
//   emptyText = "No options found",
//   disabled = false,
//   loading = false,
//   getValue = optionValue,
// }) => {
//   const [open, setOpen] = useState(false);
//   const [search, setSearch] = useState("");
//   const ref = useRef(null);

//   useEffect(() => {
//     const handler = (event) => {
//       if (ref.current && !ref.current.contains(event.target)) setOpen(false);
//     };
//     document.addEventListener("mousedown", handler);
//     return () => document.removeEventListener("mousedown", handler);
//   }, []);

//   const selectedValues = Array.isArray(value) ? value : [];
//   const filteredOptions = options.filter((item) =>
//     optionLabel(item).toLowerCase().includes(search.toLowerCase()),
//   );

//   const toggleOption = (item) => {
//     const selectedValue = getValue(item);
//     if (!selectedValue) return;
//     if (selectedValues.includes(selectedValue)) {
//       onChange(selectedValues.filter((current) => current !== selectedValue));
//       return;
//     }
//     onChange([...selectedValues, selectedValue]);
//   };

//   return (
//     <div ref={ref} className="relative">
//       <div
//         className={`admin-input flex min-h-[42px] flex-wrap gap-1.5 ${disabled ? "cursor-not-allowed bg-gray-50 text-gray-400" : "cursor-pointer bg-white"}`}
//         onClick={() => {
//           if (!disabled) setOpen((current) => !current);
//         }}
//       >
//         {!selectedValues.length ? <span className="text-sm text-gray-400">{placeholder}</span> : null}
//         {selectedValues.map((item) => (
//           <span key={item} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--admin-blue)]/10 px-2 py-0.5 text-xs font-medium text-[var(--admin-blue)]">
//             <span className="truncate">{item}</span>
//             <button
//               type="button"
//               className="leading-none hover:text-red-500"
//               onClick={(event) => {
//                 event.stopPropagation();
//                 onChange(selectedValues.filter((current) => current !== item));
//               }}
//             >
//               x
//             </button>
//           </span>
//         ))}
//       </div>
//       {open && !disabled ? (
//         <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
//           <div className="sticky top-0 border-b bg-white p-2">
//             <input
//               className="admin-input py-1 text-sm"
//               placeholder={searchPlaceholder}
//               value={search}
//               onChange={(event) => setSearch(event.target.value)}
//               onClick={(event) => event.stopPropagation()}
//               autoFocus
//             />
//           </div>
//           {loading ? <div className="px-3 py-4 text-center text-sm text-gray-400">Loading...</div> : null}
//           {!loading && filteredOptions.map((item) => {
//             const selectedValue = getValue(item);
//             const selected = selectedValues.includes(selectedValue);
//             return (
//               <button
//                 key={optionParentId(item) || selectedValue}
//                 type="button"
//                 className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${selected ? "font-medium text-[var(--admin-blue)]" : "text-gray-700"}`}
//                 onClick={(event) => {
//                   event.stopPropagation();
//                   toggleOption(item);
//                 }}
//               >
//                 <span className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? "border-[var(--admin-blue)] bg-[var(--admin-blue)]" : "border-gray-300"}`}>
//                   {selected ? <MdCheckCircle className="text-xs text-white" /> : null}
//                 </span>
//                 {optionLabel(item)}
//               </button>
//             );
//           })}
//           {!loading && !filteredOptions.length ? <div className="px-3 py-4 text-center text-sm text-gray-400">{emptyText}</div> : null}
//         </div>
//       ) : null}
//     </div>
//   );
// };

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

  const patchRefundPolicy = (component, key, value) => {
    setSettings((current) => ({
      ...current,
      returns: {
        ...(current.returns || {}),
        refundPolicy: {
          ...(current.returns?.refundPolicy || {}),
          [component]: {
            ...(current.returns?.refundPolicy?.[component] || {}),
            [key]: value,
          },
        },
      },
    }));
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
          customerFeeValue: Number(nextSettings.platformFees.customerFeeValue || 0),
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
          gstTcsRate: Number(nextSettings.finance.gstTcsRate || 0),
          incomeTaxTdsRate: Number(nextSettings.finance.incomeTaxTdsRate || 0),
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="admin-card p-4">
          <p className="text-xs font-semibold uppercase text-gray-400">Seller Commission</p>
          <p className="mt-2 text-lg font-bold text-[var(--admin-navy)]">{settings.platformFees.sellerCommissionValue}{settings.platformFees.sellerCommissionType === "percentage" ? "%" : " INR"}</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs font-semibold uppercase text-gray-400">Customer Fee</p>
          <p className="mt-2 text-lg font-bold text-[var(--admin-navy)]">{settings.platformFees.customerFeeValue}{settings.platformFees.customerFeeType === "percentage" ? "%" : " INR"}</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs font-semibold uppercase text-gray-400">COD</p>
          <p className="mt-2 text-lg font-bold text-[var(--admin-navy)]">{settings.cod.enabled ? "Enabled" : "Disabled"}</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs font-semibold uppercase text-gray-400">Shipping Payout</p>
          <p className="mt-2 text-lg font-bold text-[var(--admin-navy)]">{settings.finance.shippingPolicy === "not_in_seller_payout" ? "Excluded" : settings.finance.shippingPolicy === "reimburse_seller" ? "Reimburse" : "Deduct"}</p>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
      <Section title="Return & Settlement Policy">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Global Return Window (Days)" type="number" min="1" max="60" value={settings.returns.defaultWindowDays} onChange={(value) => patchSettings("returns", { defaultWindowDays: value })} />
          <ToggleField label="Allow Seller Return Overrides" checked={settings.returns.allowSellerOverrides} onChange={(value) => patchSettings("returns", { allowSellerOverrides: value })} />
          {settings.returns.allowSellerOverrides && <InputField label="Maximum Seller Override (Days)" type="number" min="1" max="60" value={settings.returns.maxSellerOverrideDays} onChange={(value) => patchSettings("returns", { maxSellerOverrideDays: value })} />}
          <div className="md:col-span-2 rounded border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
            The delivered date and this policy are snapshotted per order item. Each item becomes payout-eligible only after its return deadline closes.
          </div>
        </div>
      </Section>
      <Section title="Refund Policy">
        <div className="space-y-3">
          <div className="rounded border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
            Product amount is refunded from the cancelled or returned items. Use these options only for extra charges collected from the customer.
          </div>
          <div className="grid gap-3">
            {[
              ["fullCancellation", "Full order cancellation", "Customer cancels the complete order before fulfilment."],
              ["sellerCancellation", "Seller cancels / out of stock", "Seller cannot fulfil the item or order."],
              ["rtoDeliveryFailed", "RTO / delivery failed", "Courier returns the shipment or delivery fails."],
              ["customerReturn", "Customer return after delivery", "Customer returns delivered products."],
              ["partialReturn", "Partial item return", "Only some products from the order are returned."],
            ].map(([key, title, hint]) => (
              <RefundScenario
                key={key}
                title={title}
                hint={hint}
                shipping={settings.returns.refundPolicy?.shipping?.[key]}
                platformFee={settings.returns.refundPolicy?.platformFee?.[key]}
                onShippingChange={(value) => patchRefundPolicy("shipping", key, value)}
                onPlatformFeeChange={(value) => patchRefundPolicy("platformFee", key, value)}
              />
            ))}
          </div>
        </div>
      </Section>
      <Section title="Seller Commission">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Commission Type" value={settings.platformFees.sellerCommissionType} onChange={(value) => patchSettings("platformFees", { sellerCommissionType: value })} options={[option("percentage", "Percentage"), option("fixed", "Fixed")]} />
          <InputField label="Commission Value" type="number" min="0" value={settings.platformFees.sellerCommissionValue} onChange={(value) => patchSettings("platformFees", { sellerCommissionValue: value })} />
          <InputField label="GST Percentage" type="number" min="0" max="100" value={settings.platformFees.gstRate} onChange={(value) => patchSettings("platformFees", { gstRate: value })} />
          <SelectField label="Apply On" value={settings.platformFees.calculationBase} onChange={(value) => patchSettings("platformFees", { calculationBase: value })} options={[option("subtotal", "Subtotal"), option("order_total", "Total")]} />
        </div>
      </Section>
      <Section title="Customer Commission / Fee">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Fee Type" value={settings.platformFees.customerFeeType} onChange={(value) => patchSettings("platformFees", { customerFeeType: value })} options={[option("percentage", "Percentage"), option("fixed", "Fixed")]} />
          <InputField label="Fee Value" type="number" min="0" value={settings.platformFees.customerFeeValue} onChange={(value) => patchSettings("platformFees", { customerFeeValue: value })} hint="Added to the customer-facing order total." />
          <InputField label="Customer Fee GST Rate (%)" type="number" min="0" max="100" step="0.01" value={settings.platformFees.customerFeeTaxRate} onChange={(value) => patchSettings("platformFees", { customerFeeTaxRate: value })} hint="A separate marketplace-to-customer platform fee invoice is issued whenever the fee is charged; GST is shown when this rate is greater than zero." />
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
            hint="Payout is calculated from the order's stored return deadline; it is never released before Fulfilled."
          />
        </div>
      </Section>
      <Section title="Payout Calculation">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Seller Payout Base" value={settings.finance.sellerPayoutBase} onChange={(value) => patchSettings("finance", { sellerPayoutBase: value })} options={[option("gross_customer_price", "Gross customer price"), option("taxable_ex_gst", "Taxable ex GST")]} />
          <SelectField label="Shipping Settlement" value={settings.finance.shippingPolicy} onChange={(value) => patchSettings("finance", { shippingPolicy: value })} options={[option("reimburse_seller", "Customer shipping credited to seller"), option("not_in_seller_payout", "Platform fulfils and retains shipping"), option("deduct_from_seller", "Shipping charged to seller")]} />
        </div>
      </Section>
      <Section title="Seller Statutory Deductions">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="GST TCS" value={settings.finance.gstTcsEnabled ? "enabled" : "disabled"} onChange={(value) => patchSettings("finance", { gstTcsEnabled: value === "enabled" })} options={[option("disabled", "Disabled"), option("enabled", "Enabled")]} hint="Collected from net taxable supplies and credited through GST compliance." />
          <InputField label="GST TCS Rate (%)" type="number" min="0" max="100" step="0.01" value={settings.finance.gstTcsRate} onChange={(value) => patchSettings("finance", { gstTcsRate: value })} />
          <SelectField label="Income-tax TDS" value={settings.finance.incomeTaxTdsEnabled ? "enabled" : "disabled"} onChange={(value) => patchSettings("finance", { incomeTaxTdsEnabled: value === "enabled" })} options={[option("disabled", "Disabled"), option("enabled", "Enabled")]} hint="Withheld from seller gross sales and shown separately in payout statements." />
          <InputField label="Income-tax TDS Rate (%)" type="number" min="0" max="100" step="0.01" value={settings.finance.incomeTaxTdsRate} onChange={(value) => patchSettings("finance", { incomeTaxTdsRate: value })} />
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
