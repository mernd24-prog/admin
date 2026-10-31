import React, { useCallback, useEffect, useState } from "react";
import PermissionGuard from "../Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../_helpers/endpoints";
import { toast } from "../../utils/toast";
const DEFAULT_MARKETING = {
  enabled: false,
  campaignKey: "default",
  scope: "both",
  startsAt: null,
  endsAt: null,
  firstOrderOnly: false,
  customerEligibility: "all",
  allowDeals: true,
  allowWallet: true,
  productCapMode: "per_line",
  minOrderAmount: 0,
  maxDiscountPerOrder: 0,
  maxReferralPoolPerOrder: 0,
  usesPerCustomer: 0,
  usesPerCustomerPerCode: 0,
  monthlyUsesPerCustomer: 0,
  customerDiscountBudget: 0,
  monthlyCustomerDiscountBudget: 0,
  campaignBudget: 0,
  partnerCommissionBudget: 0,
};
const MARKETING_LIMIT_FIELDS = [
  ["minOrderAmount", "Minimum order subtotal (₹)"],
  ["maxDiscountPerOrder", "Maximum customer discount per order (₹)"],
  ["maxReferralPoolPerOrder", "Maximum referral pool per order (₹)"],
  ["usesPerCustomer", "Uses per customer across all codes"],
  ["usesPerCustomerPerCode", "Uses per customer for each code"],
  ["monthlyUsesPerCustomer", "Monthly uses per customer"],
  ["customerDiscountBudget", "Customer campaign discount limit (₹)"],
  ["monthlyCustomerDiscountBudget", "Customer monthly discount limit (₹)"],
  ["campaignBudget", "Total campaign budget (₹)"],
  ["partnerCommissionBudget", "Commission limit per partner (₹)"],
];

const Field = ({ label, children, hint }) => (
  <div>
    {label ? <span className="admin-label">{label}</span> : null}
    {children}
    {hint ? (
      <span className="block mt-1 text-xs text-gray-500">{hint}</span>
    ) : null}
  </div>
);

const InputField = ({
  label,
  value,
  onChange,
  type = "text",
  hint,
  ...props
}) => (
  <Field label={label} hint={hint}>
    <input
      className="admin-input"
      type={type}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      {...props}
    />
  </Field>
);

const ToggleField = ({ label, checked, onChange, hint, activeLabel = "Enabled", inactiveLabel = "Disabled", disabled = false }) => (
  <Field label={label} hint={hint}>
    <label className="flex h-[36px] cursor-pointer items-center justify-between gap-3 rounded-[6px] border border-[var(--admin-field-line)] bg-[var(--admin-field)] px-3 text-xs font-medium text-gray-700 transition hover:border-[var(--admin-line-strong)]">
      <span>{checked ? activeLabel : inactiveLabel}</span>
      <input
        type="checkbox"
        aria-label={label}
        disabled={disabled}
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 cursor-pointer accent-[var(--admin-navy)]"
      />
    </label>
  </Field>
);

export default function MarketingSettings({ kind = "coupons" }) {
  const title =
    kind === "referrals"
      ? "Referral Marketing Settings"
      : "Coupon Marketing Settings";
  const [policy, setPolicy] = useState({ ...DEFAULT_MARKETING, scope: kind });
  const [marketingUsage, setMarketingUsage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const patchPolicy = (patch) =>
    setPolicy((current) => ({ ...current, ...patch }));
  const patchField = (key, value) => patchPolicy({ [key]: value });
  const endpoint = `${ENDPOINTS.commerceSettings.detail}/marketing-policy/${kind}`;
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await axiosProvider.get(endpoint);
      setPolicy({ ...DEFAULT_MARKETING, ...response.data.data.policy });
      setMarketingUsage(response.data.data.usage);
      setLoaded(true);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to load marketing settings",
      );
    } finally {
      setBusy(false);
    }
  }, [endpoint]);
  useEffect(() => {
    load();
  }, [load]);
  const save = async () => {
    setBusy(true);
    try {
      const next = { ...policy, scope: kind };
      for (const [key, label] of MARKETING_LIMIT_FIELDS) {
        const value = Number(next[key] ?? 0);
        if (
          !Number.isFinite(value) ||
          value < 0 ||
          (key.toLowerCase().includes("uses") && !Number.isInteger(value))
        )
          throw new Error(`${label} must be a non-negative number.`);
        next[key] = value;
      }
      await axiosProvider.put(endpoint, next);
      toast.success(`${title} saved`);
      await load();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error.message ||
          "Unable to save marketing settings",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="admin-card p-5">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          className="admin-btn-secondary"
          onClick={load}
          disabled={busy}
        >
          Refresh
        </button>
        <PermissionGuard module="admin" action={ACTIONS.UPDATE} hide>
          <button
            type="button"
            className="admin-btn-primary"
            onClick={save}
            disabled={busy || !loaded}
          >
            {busy ? "Please wait..." : "Save Marketing Settings"}
          </button>
        </PermissionGuard>
      </div>
      <p className="mb-4 text-sm text-gray-600" aria-live="polite">
        {marketingUsage && marketingUsage.campaignKey === policy.campaignKey
          ? `Saved campaign ${marketingUsage.campaignKey}: ₹${marketingUsage.spent} reserved across ${marketingUsage.orders} orders. Remaining saved budget: ${marketingUsage.remaining === null ? "Unlimited" : `₹${marketingUsage.remaining}`}. Refresh to update.`
          : "Save and refresh to view the campaign budget usage (admin permission required)."}
      </p>
      <p className="mb-4 text-sm text-gray-600">
        Limits apply across{" "}
        {kind === "referrals"
          ? "growth partner and brand associate codes"
          : "regular coupons"}
        . Zero means unlimited. Pending orders reserve benefits; cancelled and
        fully refunded orders release them. Failed-payment orders retain
        reservations for retries. Monthly limits use UTC calendar months.
        Existing orders without a campaign snapshot do not consume these
        budgets.
      </p>
      <div className="mb-4 max-w-md">
        <ToggleField
          label="Apply marketing limits"
          activeLabel="Limits active"
          inactiveLabel="Limits inactive"
          disabled={busy || !loaded}
          checked={policy.enabled}
          onChange={(value) => patchField("enabled", value)}
        />
      </div>
      <p className={`mb-4 rounded-md border p-3 text-sm ${policy.enabled ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-900"}`} role="status">
        {policy.enabled
          ? "The minimum order amount, usage limits and budgets below will apply."
          : `${kind === "referrals" ? "Referral codes" : "Coupons"} still work under their existing rules. The marketing limits below are not applied.`}
        {" "}Click Save Marketing Settings to apply changes.
      </p>
      <fieldset disabled={!policy.enabled || busy || !loaded} className={`grid min-w-0 grid-cols-1 gap-4 border-0 p-0 md:grid-cols-2 xl:grid-cols-3 ${!policy.enabled ? "opacity-50" : ""}`}>
        <legend className="sr-only">Marketing limits</legend>
        <InputField
          label="Campaign key"
          value={policy.campaignKey}
          onChange={(value) => patchField("campaignKey", value)}
          hint="Keep this key to retain usage history. A new key starts new limits; reusing a key restores its history."
        />
        {[
          ["startsAt", "Campaign start"],
          ["endsAt", "Campaign end"],
        ].map(([key, label]) => (
          <InputField
            key={key}
            label={`${label} (local time)`}
            type="datetime-local"
            value={
              policy[key]
                ? new Date(
                    new Date(policy[key]).getTime() -
                      new Date(policy[key]).getTimezoneOffset() * 60000,
                  )
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
            onChange={(value) =>
              patchField(key, value ? new Date(value).toISOString() : null)
            }
          />
        ))}
        {kind === "referrals" && (
          <p className="text-sm text-gray-600 md:col-span-2 xl:col-span-3">
            One referral pool per order: the lowest positive eligible product pool applies.
            Quantities do not multiply it. Products without a pool are ignored.
            Percentage pools use one unit’s price.
          </p>
        )}
        <Field label="Customer eligibility">
          <select
            className="admin-input"
            value={policy.firstOrderOnly ? "new" : policy.customerEligibility}
            onChange={(event) =>
              patchPolicy({
                customerEligibility: event.target.value,
                firstOrderOnly: false,
              })
            }
          >
            <option value="all">All customers</option>
            <option value="new">First order only</option>
            <option value="returning">Returning customers only</option>
          </select>
        </Field>
        <ToggleField
          label="Allow combining with deals"
          checked={policy.allowDeals}
          onChange={(value) => patchField("allowDeals", value)}
        />
        <ToggleField
          label="Allow wallet with promotion"
          checked={policy.allowWallet}
          onChange={(value) => patchField("allowWallet", value)}
        />
        {MARKETING_LIMIT_FIELDS.filter(
          ([key]) =>
            kind === "referrals" ||
            !["maxReferralPoolPerOrder", "partnerCommissionBudget"].includes(
              key,
            ),
        ).map(([key, label]) => (
          <InputField
            key={key}
            label={label}
            type="number"
            min="0"
            hint={key === "minOrderAmount" ? "Uses the whole order subtotal, including products without a referral pool, before discounts, tax and shipping." : "Optional. Leave blank or enter 0 for no limit."}
            placeholder="0 — no limit"
            step={key.toLowerCase().includes("uses") ? "1" : "0.01"}
            value={policy[key]}
            onChange={(value) => patchField(key, value)}
          />
        ))}
      </fieldset>
      <p className="mt-4 text-xs text-gray-500">
        {kind === "referrals"
          ? "Budget includes customer discounts and allocated partner commissions. Limits reduce the shared pool proportionally."
          : "Budget includes customer coupon discounts."}{" "}
        Partial refunds retain the original reservation until full refund.
        Commission release, withdrawal limits, product eligibility and
        self-referral checks remain in Referral Commerce. Only one coupon or
        referral code is accepted per order. Use Save Marketing Settings to
        apply these controls.
      </p>
    </section>
  );
}
