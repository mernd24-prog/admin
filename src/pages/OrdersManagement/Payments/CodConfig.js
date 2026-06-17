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

const unwrap = (payload = {}) => payload?.data?.data || payload?.data || {};

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
    allowedPincodes: "",
    blockedPincodes: "",
    note: "",
  });

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      await dispatch(getCodConfig()).unwrap();
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
      allowedPincodes: Array.isArray(saved.allowedPincodes)
        ? saved.allowedPincodes.join(", ")
        : saved.allowedPincodes || "",
      blockedPincodes: Array.isArray(saved.blockedPincodes)
        ? saved.blockedPincodes.join(", ")
        : saved.blockedPincodes || "",
      note: saved.note || "",
    });
  }, [saved]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      await dispatch(updateCodConfig({
        enabled: form.enabled,
        chargeAmount: form.chargeAmount !== "" ? Number(form.chargeAmount) : 0,
        minOrderAmount: form.minOrderAmount !== "" ? Number(form.minOrderAmount) : undefined,
        maxOrderAmount: form.maxOrderAmount !== "" ? Number(form.maxOrderAmount) : undefined,
        currency: form.currency || "INR",
        allowedPincodes: form.allowedPincodes
          ? form.allowedPincodes.split(",").map((p) => p.trim()).filter(Boolean)
          : [],
        blockedPincodes: form.blockedPincodes
          ? form.blockedPincodes.split(",").map((p) => p.trim()).filter(Boolean)
          : [],
        note: form.note || undefined,
      })).unwrap();
      toast.success("COD configuration saved");
    } catch (err) {
      toast.error(err?.message || "Failed to save COD config");
    } finally {
      setSaving(false);
    }
  }, [form, dispatch]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="COD Configuration"
        subtitle="Configure Cash on Delivery payment option"
        actions={
          <PermissionGuard module="payments" action={ACTIONS.UPDATE} hide>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
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
              checked={form.enabled}
              onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
            />
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
            <p className="font-medium text-gray-800 mb-4">Pincode Restrictions (optional)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Pincodes</label>
                <textarea
                  rows={3}
                  value={form.allowedPincodes}
                  onChange={(e) => setForm((p) => ({ ...p, allowedPincodes: e.target.value }))}
                  placeholder="110001, 400001, 560001 (comma separated, leave blank for all)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Blocked Pincodes</label>
                <textarea
                  rows={3}
                  value={form.blockedPincodes}
                  onChange={(e) => setForm((p) => ({ ...p, blockedPincodes: e.target.value }))}
                  placeholder="110092, 400099 (comma separated)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
