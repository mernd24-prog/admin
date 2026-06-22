import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdRefresh, MdSave, MdSearch, MdSettings, MdStorefront } from "react-icons/md";
import { PageHeader, StatusBadge } from "../../../components/Shared";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { toast } from "react-toastify";

const DEFAULT_SETTINGS = {
  productWorkflow: {
    moderationRevisionTiming: "parallel",
    revisionDiffStatus: "in_progress",
    notes: "",
  },
  checkout: {
    figmaSignoffStatus: "pending",
    figmaSignoffTargetDate: "2026-06-17",
    figmaSignoffDate: "",
    multiSellerOrderMode: "single_order",
    multiSellerPolicyLocked: true,
  },
  payments: {
    razorpaySandboxStatus: "pending",
    razorpaySandboxTargetDate: "2026-06-18",
    razorpaySandboxKeyAvailable: false,
    gatewayFeePolicy: "platform_absorbs",
  },
  cod: {
    availabilityMode: "all_pincodes",
    allowPincodes: [],
    blockPincodes: [],
    collectionPolicy: "platform_or_courier",
    payoutRequiresCapture: true,
  },
  wallet: {
    partialPaymentMode: "user_opt_in",
    autoApplyMaxPercent: 100,
  },
  finance: {
    sellerPayoutBase: "gross_customer_price",
    platformFeeTaxRate: 18,
    chargePlatformFeeTaxToSeller: true,
    payoutReleaseMilestone: "delivered_or_fulfilled",
    shippingPolicy: "not_in_seller_payout",
  },
};

const DEFAULT_SELLER = {
  sellerId: "",
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
    notes: "",
  },
  metadata: {},
};

const option = (value, label) => ({ value, label });

const joinPins = (value) => (Array.isArray(value) ? value.join(", ") : String(value || ""));
const splitPins = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const nullableNumber = (value) => (value === "" || value === null || value === undefined ? null : Number(value));
const money = (value) => `INR ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const Field = ({ label, children }) => (
  <label className="block space-y-1">
    <span className="admin-label">{label}</span>
    {children}
  </label>
);

const SelectField = ({ label, value, onChange, options }) => (
  <Field label={label}>
    <select className="admin-input" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((item) => (
        <option key={item.value} value={item.value}>{item.label}</option>
      ))}
    </select>
  </Field>
);

const InputField = ({ label, value, onChange, type = "text", ...props }) => (
  <Field label={label}>
    <input className="admin-input" type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} {...props} />
  </Field>
);

const ToggleField = ({ label, checked, onChange }) => (
  <label className="flex min-h-[42px] items-center justify-between gap-3 rounded border border-gray-200 px-3 py-2">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
  </label>
);

const CommerceSettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [runtime, setRuntime] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sellerRows, setSellerRows] = useState([]);
  const [sellerSearch, setSellerSearch] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [sellerSettings, setSellerSettings] = useState(DEFAULT_SELLER);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [sellerSaving, setSellerSaving] = useState(false);
  const [sellerOptions, setSellerOptions] = React.useState([]);
  React.useEffect(() => { dropdownApi.getSellers({ limit: 200 }).then(setSellerOptions).catch(() => {}); }, []);

  const patchSettings = (section, patch) => {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...(current[section] || {}),
        ...patch,
      },
    }));
  };

  const patchSeller = (section, patch) => {
    setSellerSettings((current) => ({
      ...current,
      [section]: {
        ...(current[section] || {}),
        ...patch,
      },
    }));
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosProvider.get(ENDPOINTS.commerceSettings.detail);
      const data = response?.data?.data || {};
      setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) });
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
        params: { search: sellerSearch || undefined, limit: 20 },
      });
      setSellerRows(response?.data?.data?.items || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load seller charge settings");
    }
  }, [sellerSearch]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    fetchSellerRows();
  }, [fetchSellerRows]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        ...settings,
        cod: {
          ...settings.cod,
          allowPincodes: splitPins(joinPins(settings.cod.allowPincodes)),
          blockPincodes: splitPins(joinPins(settings.cod.blockPincodes)),
        },
        wallet: {
          ...settings.wallet,
          autoApplyMaxPercent: Number(settings.wallet.autoApplyMaxPercent || 0),
        },
        finance: {
          ...settings.finance,
          platformFeeTaxRate: Number(settings.finance.platformFeeTaxRate || 0),
        },
      };
      const response = await axiosProvider.put(ENDPOINTS.commerceSettings.detail, payload);
      setSettings({ ...DEFAULT_SETTINGS, ...(response?.data?.data || {}) });
      toast.success("Commerce settings saved");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save commerce settings");
    } finally {
      setSaving(false);
    }
  };

  const loadSeller = async (id = sellerId) => {
    const targetSellerId = String(id || "").trim();
    if (!targetSellerId) {
      toast.error("Seller ID is required");
      return;
    }
    setSellerLoading(true);
    try {
      const response = await axiosProvider.get(ENDPOINTS.commerceSettings.sellerChargeSetting(targetSellerId));
      const data = response?.data?.data || {};
      setSellerId(data.sellerId || targetSellerId);
      setSellerSettings({
        ...DEFAULT_SELLER,
        ...data,
        cod: { ...DEFAULT_SELLER.cod, ...(data.cod || {}) },
        delivery: { ...DEFAULT_SELLER.delivery, ...(data.delivery || {}) },
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load seller settings");
    } finally {
      setSellerLoading(false);
    }
  };

  const saveSeller = async () => {
    const targetSellerId = String(sellerId || sellerSettings.sellerId || "").trim();
    if (!targetSellerId) {
      toast.error("Seller ID is required");
      return;
    }
    setSellerSaving(true);
    try {
      const payload = {
        cod: {
          ...sellerSettings.cod,
          chargeAmount: Number(sellerSettings.cod.chargeAmount || 0),
          minOrderAmount: nullableNumber(sellerSettings.cod.minOrderAmount),
          maxOrderAmount: nullableNumber(sellerSettings.cod.maxOrderAmount),
          allowPincodes: splitPins(joinPins(sellerSettings.cod.allowPincodes)),
          blockPincodes: splitPins(joinPins(sellerSettings.cod.blockPincodes)),
        },
        delivery: {
          ...sellerSettings.delivery,
          chargeAmount: Number(sellerSettings.delivery.chargeAmount || 0),
          freeDeliveryMinOrderAmount: nullableNumber(sellerSettings.delivery.freeDeliveryMinOrderAmount),
        },
      };
      const response = await axiosProvider.put(ENDPOINTS.commerceSettings.sellerChargeSetting(targetSellerId), payload);
      setSellerSettings({
        ...DEFAULT_SELLER,
        ...(response?.data?.data || {}),
        cod: { ...DEFAULT_SELLER.cod, ...(response?.data?.data?.cod || {}) },
        delivery: { ...DEFAULT_SELLER.delivery, ...(response?.data?.data?.delivery || {}) },
      });
      setSellerId(targetSellerId);
      toast.success("Seller charge settings saved");
      fetchSellerRows();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save seller settings");
    } finally {
      setSellerSaving(false);
    }
  };

  const razorpayStatus = useMemo(() => {
    if (runtime?.razorpay?.enabled) return "active";
    if (runtime?.razorpay?.configured) return "pending";
    return "inactive";
  }, [runtime]);

  return (
    <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-0">
      <PageHeader
        title="Commerce Settings"
        subtitle="Checkout, COD, wallet, taxation, seller payout, and seller charge controls"
        breadcrumbs={[{ label: "Commerce Settings" }, { label: "Commerce Settings" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="admin-btn-secondary" onClick={() => { fetchSettings(); fetchSellerRows(); }} disabled={loading}>
              <MdRefresh size={16} /> Refresh
            </button>
            <PermissionGuard module="admin" action={ACTIONS.UPDATE} hide>
              <button type="button" className="admin-btn-primary" onClick={saveSettings} disabled={saving}>
                <MdSave size={16} /> {saving ? "Saving..." : "Save Policy"}
              </button>
            </PermissionGuard>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="admin-card p-4">
          <p className="text-xs font-semibold uppercase text-gray-400">Razorpay</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">{runtime?.razorpay?.mode || "sandbox"}</span>
            <StatusBadge status={razorpayStatus} dot />
          </div>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs font-semibold uppercase text-gray-400">Payout Base</p>
          <p className="mt-2 text-sm font-semibold text-gray-800">{settings.finance.sellerPayoutBase.replace(/_/g, " ")}</p>
        </div>
        <div className="admin-card p-4">
          <p className="text-xs font-semibold uppercase text-gray-400">COD</p>
          <p className="mt-2 text-sm font-semibold text-gray-800">{settings.cod.availabilityMode.replace(/_/g, " ")}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="admin-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <MdSettings size={18} className="text-[var(--admin-gold)]" />
            <h2 className="text-sm font-semibold">Workflow And Checkout</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Moderation Timing"
              value={settings.productWorkflow.moderationRevisionTiming}
              onChange={(value) => patchSettings("productWorkflow", { moderationRevisionTiming: value })}
              options={[option("parallel", "Parallel"), option("after_checkout_plan", "After checkout plan")]}
            />
            <SelectField
              label="Revision Diff"
              value={settings.productWorkflow.revisionDiffStatus}
              onChange={(value) => patchSettings("productWorkflow", { revisionDiffStatus: value })}
              options={[option("not_started", "Not started"), option("in_progress", "In progress"), option("blocked", "Blocked"), option("ready", "Ready"), option("done", "Done")]}
            />
            <SelectField
              label="Figma Status"
              value={settings.checkout.figmaSignoffStatus}
              onChange={(value) => patchSettings("checkout", { figmaSignoffStatus: value })}
              options={[option("pending", "Pending"), option("signed_off", "Signed off"), option("blocked", "Blocked"), option("not_required", "Not required")]}
            />
            <InputField
              label="Figma Target"
              type="date"
              value={settings.checkout.figmaSignoffTargetDate || ""}
              onChange={(value) => patchSettings("checkout", { figmaSignoffTargetDate: value })}
            />
            <SelectField
              label="Multi Seller Order"
              value={settings.checkout.multiSellerOrderMode}
              onChange={(value) => patchSettings("checkout", { multiSellerOrderMode: value })}
              options={[option("single_order", "Single order"), option("split_by_seller", "Split by seller")]}
            />
            <ToggleField
              label="Policy locked"
              checked={settings.checkout.multiSellerPolicyLocked}
              onChange={(value) => patchSettings("checkout", { multiSellerPolicyLocked: value })}
            />
          </div>
        </section>

        <section className="admin-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <MdSettings size={18} className="text-[var(--admin-gold)]" />
            <h2 className="text-sm font-semibold">Payments And Wallet</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Razorpay Sandbox"
              value={settings.payments.razorpaySandboxStatus}
              onChange={(value) => patchSettings("payments", { razorpaySandboxStatus: value })}
              options={[option("pending", "Pending"), option("available", "Available"), option("blocked", "Blocked"), option("not_required", "Not required")]}
            />
            <InputField
              label="Razorpay Target"
              type="date"
              value={settings.payments.razorpaySandboxTargetDate || ""}
              onChange={(value) => patchSettings("payments", { razorpaySandboxTargetDate: value })}
            />
            <SelectField
              label="Gateway Fee Policy"
              value={settings.payments.gatewayFeePolicy}
              onChange={(value) => patchSettings("payments", { gatewayFeePolicy: value })}
              options={[option("platform_absorbs", "Platform absorbs"), option("seller_deducted", "Seller deducted"), option("split", "Split")]}
            />
            <ToggleField
              label="Sandbox key available"
              checked={settings.payments.razorpaySandboxKeyAvailable}
              onChange={(value) => patchSettings("payments", { razorpaySandboxKeyAvailable: value })}
            />
            <SelectField
              label="Wallet Mode"
              value={settings.wallet.partialPaymentMode}
              onChange={(value) => patchSettings("wallet", { partialPaymentMode: value })}
              options={[option("user_opt_in", "User opt-in"), option("auto_apply", "Auto apply"), option("disabled", "Disabled")]}
            />
            <InputField
              label="Wallet Max Percent"
              type="number"
              min="0"
              max="100"
              value={settings.wallet.autoApplyMaxPercent}
              onChange={(value) => patchSettings("wallet", { autoApplyMaxPercent: value })}
            />
          </div>
        </section>

        <section className="admin-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <MdSettings size={18} className="text-[var(--admin-gold)]" />
            <h2 className="text-sm font-semibold">COD Policy</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Availability"
              value={settings.cod.availabilityMode}
              onChange={(value) => patchSettings("cod", { availabilityMode: value })}
              options={[option("all_pincodes", "All pincodes"), option("allowlist", "Allowlist"), option("blocklist", "Blocklist"), option("disabled", "Disabled")]}
            />
            <SelectField
              label="Collection"
              value={settings.cod.collectionPolicy}
              onChange={(value) => patchSettings("cod", { collectionPolicy: value })}
              options={[option("platform_or_courier", "Platform or courier"), option("seller_direct", "Seller direct"), option("hybrid", "Hybrid")]}
            />
            <Field label="Allow Pincodes">
              <textarea className="admin-input min-h-[78px]" value={joinPins(settings.cod.allowPincodes)} onChange={(event) => patchSettings("cod", { allowPincodes: splitPins(event.target.value) })} />
            </Field>
            <Field label="Block Pincodes">
              <textarea className="admin-input min-h-[78px]" value={joinPins(settings.cod.blockPincodes)} onChange={(event) => patchSettings("cod", { blockPincodes: splitPins(event.target.value) })} />
            </Field>
            <ToggleField
              label="Payout requires COD capture"
              checked={settings.cod.payoutRequiresCapture}
              onChange={(value) => patchSettings("cod", { payoutRequiresCapture: value })}
            />
          </div>
        </section>

        <section className="admin-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <MdSettings size={18} className="text-[var(--admin-gold)]" />
            <h2 className="text-sm font-semibold">Taxation And Payout</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Seller Payout Base"
              value={settings.finance.sellerPayoutBase}
              onChange={(value) => patchSettings("finance", { sellerPayoutBase: value })}
              options={[option("gross_customer_price", "Gross customer price"), option("taxable_ex_gst", "Taxable ex GST")]}
            />
            <InputField
              label="Platform Fee GST Percent"
              type="number"
              min="0"
              max="100"
              value={settings.finance.platformFeeTaxRate}
              onChange={(value) => patchSettings("finance", { platformFeeTaxRate: value })}
            />
            <SelectField
              label="Payout Release"
              value={settings.finance.payoutReleaseMilestone}
              onChange={(value) => patchSettings("finance", { payoutReleaseMilestone: value })}
              options={[option("confirmed", "Confirmed"), option("delivered_or_fulfilled", "Delivered or fulfilled"), option("return_window_closed", "Return window closed")]}
            />
            <SelectField
              label="Shipping Policy"
              value={settings.finance.shippingPolicy}
              onChange={(value) => patchSettings("finance", { shippingPolicy: value })}
              options={[option("not_in_seller_payout", "Not in seller payout"), option("reimburse_seller", "Reimburse seller"), option("deduct_from_seller", "Deduct from seller")]}
            />
            <ToggleField
              label="Charge platform fee GST to seller"
              checked={settings.finance.chargePlatformFeeTaxToSeller}
              onChange={(value) => patchSettings("finance", { chargePlatformFeeTaxToSeller: value })}
            />
          </div>
        </section>
      </div>

      <section className="admin-card mt-5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MdStorefront size={18} className="text-[var(--admin-gold)]" />
            <h2 className="text-sm font-semibold">Seller Charge Settings</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input className="admin-input w-64" value={sellerSearch} onChange={(event) => setSellerSearch(event.target.value)} placeholder="Search seller id" />
            <button type="button" className="admin-btn-secondary" onClick={fetchSellerRows}>
              <MdSearch size={16} /> Search
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seller</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
              >
                <option value="">— Select seller —</option>
                {sellerOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" className="admin-btn-secondary" onClick={() => loadSeller()} disabled={sellerLoading}>
                <MdSearch size={16} /> {sellerLoading ? "Loading..." : "Load"}
              </button>
              <PermissionGuard module="admin" action={ACTIONS.UPDATE} hide>
                <button type="button" className="admin-btn-primary" onClick={saveSeller} disabled={sellerSaving}>
                  <MdSave size={16} /> {sellerSaving ? "Saving..." : "Save Seller"}
                </button>
              </PermissionGuard>
            </div>
            <div className="rounded border border-gray-200">
              {sellerRows.length ? sellerRows.map((row) => (
                <button
                  key={row.sellerId}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-50"
                  onClick={() => loadSeller(row.sellerId)}
                >
                  <span className="truncate font-medium text-gray-700">
                    {sellerOptions.find((o) => o.value === row.sellerId)?.label || row.sellerId}
                  </span>
                  <span className="text-xs text-gray-400">{money(row.delivery?.chargeAmount)}</span>
                </button>
              )) : (
                <p className="px-3 py-4 text-sm text-gray-500">No seller settings saved yet.</p>
              )}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded border border-gray-200 p-4">
              <h3 className="mb-4 text-sm font-semibold">Seller COD</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleField label="COD enabled" checked={sellerSettings.cod.enabled} onChange={(value) => patchSeller("cod", { enabled: value })} />
                <SelectField
                  label="Charge Mode"
                  value={sellerSettings.cod.chargeMode}
                  onChange={(value) => patchSeller("cod", { chargeMode: value })}
                  options={[option("inherit", "Inherit"), option("none", "None"), option("flat", "Flat")]}
                />
                <InputField label="COD Charge" type="number" min="0" value={sellerSettings.cod.chargeAmount} onChange={(value) => patchSeller("cod", { chargeAmount: value })} />
                <SelectField
                  label="Availability"
                  value={sellerSettings.cod.availabilityMode}
                  onChange={(value) => patchSeller("cod", { availabilityMode: value })}
                  options={[option("inherit", "Inherit"), option("all_pincodes", "All pincodes"), option("allowlist", "Allowlist"), option("blocklist", "Blocklist"), option("disabled", "Disabled")]}
                />
                <InputField label="Min Order" type="number" min="0" value={sellerSettings.cod.minOrderAmount || ""} onChange={(value) => patchSeller("cod", { minOrderAmount: value })} />
                <InputField label="Max Order" type="number" min="0" value={sellerSettings.cod.maxOrderAmount || ""} onChange={(value) => patchSeller("cod", { maxOrderAmount: value })} />
                <Field label="Allow Pincodes">
                  <textarea className="admin-input min-h-[74px]" value={joinPins(sellerSettings.cod.allowPincodes)} onChange={(event) => patchSeller("cod", { allowPincodes: splitPins(event.target.value) })} />
                </Field>
                <Field label="Block Pincodes">
                  <textarea className="admin-input min-h-[74px]" value={joinPins(sellerSettings.cod.blockPincodes)} onChange={(event) => patchSeller("cod", { blockPincodes: splitPins(event.target.value) })} />
                </Field>
              </div>
            </div>

            <div className="rounded border border-gray-200 p-4">
              <h3 className="mb-4 text-sm font-semibold">Seller Delivery</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Delivery Mode"
                  value={sellerSettings.delivery.mode}
                  onChange={(value) => patchSeller("delivery", { mode: value })}
                  options={[option("none", "None"), option("flat", "Flat"), option("free_over_amount", "Free over amount")]}
                />
                <InputField label="Delivery Charge" type="number" min="0" value={sellerSettings.delivery.chargeAmount} onChange={(value) => patchSeller("delivery", { chargeAmount: value })} />
                <InputField label="Free Delivery Above" type="number" min="0" value={sellerSettings.delivery.freeDeliveryMinOrderAmount || ""} onChange={(value) => patchSeller("delivery", { freeDeliveryMinOrderAmount: value })} />
                <Field label="Notes">
                  <textarea className="admin-input min-h-[74px]" value={sellerSettings.delivery.notes || ""} onChange={(event) => patchSeller("delivery", { notes: event.target.value })} />
                </Field>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CommerceSettings;
