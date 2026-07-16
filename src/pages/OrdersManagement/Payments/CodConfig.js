/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { MdSave } from "react-icons/md";
import PermissionGuard from "../../../components/Atoms/PermissionGuard/PermissionGuard";
import Loader from "../../../components/Loader/Loader";
import Input from "../../../components/Atoms/Input/Input";
import { PageHeader } from "../../../components/Shared";
import { getCodConfig, updateCodConfig } from "../../../Redux/adminCoreSlice";
import { ACTIONS } from "../../../_helpers/usePermission";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import LocationValueSelector from "../../../components/Shared/LocationValueSelector";
import { axiosPrivate as axiosProvider } from "../../../_helpers/axiosProvider";
import { ENDPOINTS } from "../../../_helpers/endpoints";

const unwrap = (payload = {}) => payload?.data?.data || payload?.data || {};
const splitList = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);

const CodConfig = () => {
  const dispatch = useDispatch();
  const selector = useSelector((s) => s.adminCore);
  const saved = unwrap(selector.codConfigData);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: true,
    chargeAmount: 0,
    minOrderAmount: "",
    maxOrderAmount: "",
    currency: "INR",
    allowedPincodes: [],
    blockedPincodes: [],
    availabilityMode: "all_pincodes",
    collectionPolicy: "platform_or_courier",
    payoutRequiresCapture: true,
    note: "",
  });

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const [codResponse, commerceResponse] = await Promise.all([
        dispatch(getCodConfig()).unwrap(),
        axiosProvider.get(ENDPOINTS.commerceSettings.detail),
      ]);
      const cod = unwrap(codResponse);
      const commerceCod = commerceResponse?.data?.data?.settings?.cod || {};
      setForm((current) => ({
        ...current,
        enabled: cod.enabled !== false && commerceCod.enabled !== false,
        chargeAmount: cod.chargeAmount ?? cod.charge_amount ?? 0,
        minOrderAmount: cod.minOrderAmount ?? cod.min_order_amount ?? "",
        maxOrderAmount: cod.maxOrderAmount ?? cod.max_order_amount ?? "",
        currency: cod.currency || "INR",
        allowedPincodes: Array.isArray(commerceCod.allowPincodes)
          ? commerceCod.allowPincodes
          : splitList(commerceCod.allowPincodes),
        blockedPincodes: Array.isArray(commerceCod.blockPincodes)
          ? commerceCod.blockPincodes
          : splitList(commerceCod.blockPincodes),
        availabilityMode: commerceCod.availabilityMode || "all_pincodes",
        collectionPolicy: commerceCod.collectionPolicy || "platform_or_courier",
        payoutRequiresCapture: commerceCod.payoutRequiresCapture !== false,
        note: cod.metadata?.note || cod.note || "",
      }));
    } catch (err) {
      toast.error(err?.message || "Failed to load COD config");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  useEffect(() => {
    if (!saved || Object.keys(saved).length === 0) return;
    setForm({
      enabled: saved.enabled !== false,
      chargeAmount: saved.chargeAmount ?? saved.charge_amount ?? 0,
      minOrderAmount: saved.minOrderAmount ?? saved.min_order_amount ?? "",
      maxOrderAmount: saved.maxOrderAmount ?? saved.max_order_amount ?? "",
      currency: saved.currency || "INR",
      allowedPincodes: form.allowedPincodes,
      blockedPincodes: form.blockedPincodes,
      availabilityMode: form.availabilityMode,
      collectionPolicy: form.collectionPolicy,
      payoutRequiresCapture: form.payoutRequiresCapture,
      note: saved.metadata?.note || saved.note || form.note || "",
    });
  }, [saved]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const commerceResponse = await axiosProvider.get(ENDPOINTS.commerceSettings.detail);
      const commerceSettings = commerceResponse?.data?.data?.settings || {};
      await Promise.all([
        dispatch(updateCodConfig({
        enabled: form.enabled,
        chargeAmount: form.chargeAmount !== "" ? Number(form.chargeAmount) : 0,
        minOrderAmount: form.minOrderAmount !== "" ? Number(form.minOrderAmount) : undefined,
        maxOrderAmount: form.maxOrderAmount !== "" ? Number(form.maxOrderAmount) : undefined,
        currency: form.currency || "INR",
        metadata: { note: form.note || "" },
        })).unwrap(),
        axiosProvider.put(ENDPOINTS.commerceSettings.detail, {
          ...commerceSettings,
          cod: {
            ...(commerceSettings.cod || {}),
            enabled: Boolean(form.enabled),
            availabilityMode: form.enabled ? form.availabilityMode : "disabled",
            collectionPolicy: form.collectionPolicy,
            payoutRequiresCapture: Boolean(form.payoutRequiresCapture),
            allowPincodes: Array.isArray(form.allowedPincodes) ? form.allowedPincodes : [],
            blockPincodes: Array.isArray(form.blockedPincodes) ? form.blockedPincodes : [],
          },
        }),
      ]);
      toast.success("COD configuration saved");
    } catch (err) {
      toast.error(err?.message || "Failed to save COD config");
    } finally {
      setSaving(false);
    }
  }, [form, dispatch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="COD Configuration"
        subtitle="Configure Cash on Delivery payment option"
        breadcrumbs={[{ label: "Commerce Settings" }, { label: "COD Settings" }]}
        actions={
          <PermissionGuard module="cod-config" action={ACTIONS.UPDATE} hide>
            <button
              onClick={handleSave}
              disabled={saving}

            >
              <MdSave size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </PermissionGuard>
        }
      />

      {loading ? (
        <Loader />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {/* Enable toggle */}
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Enable COD</p>
              <p className="text-sm text-gray-500 mt-0.5">Allow customers to pay cash on delivery</p>
            </div>
            <ToggleButton
              isToggle={form.enabled}
              handleClick={() => setForm((p) => ({ ...p, enabled: !p.enabled }))}
            />
          </div>

          <div className="p-6">
            <p className="font-medium text-gray-800 mb-4">COD Availability</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Availability Rule</span>
                <select
                  className="admin-input"
                  value={form.availabilityMode}
                  disabled={!form.enabled}
                  onChange={(e) => setForm((p) => ({ ...p, availabilityMode: e.target.value }))}
                >
                  <option value="all_pincodes">All India</option>
                  <option value="allowlist">Serviceable pincodes only</option>
                  <option value="blocklist">All except blocked pincodes</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700">Collection Mode</span>
                <select
                  className="admin-input"
                  value={form.collectionPolicy}
                  disabled={!form.enabled}
                  onChange={(e) => setForm((p) => ({ ...p, collectionPolicy: e.target.value }))}
                >
                  <option value="platform_or_courier">Platform or courier</option>
                  <option value="seller_direct">Seller direct</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--admin-blue)]"
                  checked={form.payoutRequiresCapture}
                  disabled={!form.enabled}
                  onChange={(e) => setForm((p) => ({ ...p, payoutRequiresCapture: e.target.checked }))}
                />
                <span className="text-sm font-medium text-gray-700">Payout requires COD capture</span>
              </label>
            </div>
          </div>

          {/* Charge */}
          <div className="p-6">
            <p className="font-medium text-gray-800 mb-4">COD Charge</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="COD Charge Amount (₹)"
                type="number"
                value={form.chargeAmount}
                onChange={(e) => setForm((p) => ({ ...p, chargeAmount: e.target.value }))}
                placeholder="0"
              />
              <Input
                label="Currency"
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                placeholder="INR"
              />
            </div>
          </div>

          {/* Order limits */}
          <div className="p-6">
            <p className="font-medium text-gray-800 mb-4">Order Amount Limits</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Minimum Order Amount (₹)"
                type="number"
                value={form.minOrderAmount}
                onChange={(e) => setForm((p) => ({ ...p, minOrderAmount: e.target.value }))}
                placeholder="No minimum"
              />
              <Input
                label="Maximum Order Amount (₹)"
                type="number"
                value={form.maxOrderAmount}
                onChange={(e) => setForm((p) => ({ ...p, maxOrderAmount: e.target.value }))}
                placeholder="No maximum"
              />
            </div>
          </div>

          {/* Pincodes */}
          <div className="p-6">
            <p className="font-medium text-gray-800 mb-4">Pincode Restrictions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <LocationValueSelector
                  label="Allowed Pincodes"
                  value={form.allowedPincodes}
                  onChange={(value) => setForm((p) => ({ ...p, allowedPincodes: value }))}
                  type="pincode"
                  hint="Leave empty to allow all serviceable pincodes."
                />
              </div>
              <div>
                <LocationValueSelector
                  label="Blocked Pincodes"
                  value={form.blockedPincodes}
                  onChange={(value) => setForm((p) => ({ ...p, blockedPincodes: value }))}
                  type="pincode"
                  hint="Select country, state, and city to pick blocked pincodes."
                />
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="p-6">
            <Input
              label="Internal Note"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Reason for this configuration..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CodConfig;
