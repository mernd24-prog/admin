import React, { useState } from "react";
import { MdTune, MdSearch, MdAdd, MdRemove, MdCheck } from "react-icons/md";
import { PageHeader, FormSection } from "../../components/Shared";
import PermissionGuard from "../../components/Atoms/PermissionGuard/PermissionGuard";
import { ACTIONS } from "../../_helpers/usePermission";
import { axiosPrivate as axiosProvider } from "../../_helpers/axiosProvider";
import { toast } from "react-toastify";
import useDropdownOptions from "../../hooks/useDropdownOptions";

const TYPES = [
  { value: "add", label: "Add Stock", icon: MdAdd, color: "text-green-600" },
  {
    value: "remove",
    label: "Remove Stock",
    icon: MdRemove,
    color: "text-red-500",
  },
  { value: "set", label: "Set Exact", icon: MdCheck, color: "text-blue-500" },
];

const InventoryAdjustment = () => {
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [adjustType, setAdjustType] = useState("add");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const adjustmentReasons = useDropdownOptions("inventory-adjustment-reasons");

  const searchProducts = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await axiosProvider.get("/products", {
        params: { search, limit: 10 },
      });
      setResults(res.data?.data?.products || []);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!selected || !qty || !reason)
      return toast.warn("Fill all required fields");
    setSubmitting(true);
    try {
      await axiosProvider.patch(`/products/${selected._id}/inventory`, {
        adjustmentType: adjustType,
        quantity: Number(qty),
        reason,
        note,
      });
      toast.success("Inventory adjusted successfully");
      setStep(1);
      setSelected(null);
      setQty("");
      setReason("");
      setNote("");
    } catch {
      toast.error("Adjustment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className=" max-w-7xl mx-auto p-6">
      <PageHeader
        title="Inventory Adjustment"
        subtitle="Manually add, remove, or set stock quantities"
        breadcrumbs={[
          { label: "Inventory Management" },
          { label: "Inventory Adjustment" },
        ]}
      />

      <PermissionGuard
        module="inventory"
        action={ACTIONS.ADJUST}
        fallback={
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
            You don't have permission to adjust inventory.
          </div>
        }
      >
        <div className="max-w-2xl">
          {/* Step 1: Select product */}
          <FormSection
            title="1. Find Product"
            icon={<MdSearch size={16} />}
            required
          >
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchProducts()}
                placeholder="Search by name or SKU…"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--admin-gold)]"
              />
              <button
                onClick={searchProducts}
                disabled={searching}
                className="px-4 py-2 text-sm bg-[var(--admin-gold)] text-white rounded-lg hover:bg-[var(--admin-gold-dark)] disabled:opacity-50"
              >
                {searching ? "…" : "Search"}
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-3 border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-50">
                {results.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => {
                      setSelected(p);
                      setResults([]);
                    }}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50 text-sm ${selected?._id === p._id ? "bg-[var(--admin-blue-soft)]" : ""}`}
                  >
                    <div>
                      <div className="font-medium text-gray-700">{p.title}</div>
                      <div className="text-xs text-gray-400">
                        {p.sku || "No SKU"} · Stock: {p.stock ?? 0}
                      </div>
                    </div>
                    {selected?._id === p._id && (
                      <MdCheck size={16} className="text-[var(--admin-gold)]" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {selected && (
              <div className="mt-3 bg-[#F8F8FF] border border-[#E0E0FF] rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      {selected.title}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      SKU: {selected.sku || "—"} · Current Stock:{" "}
                      <strong>{selected.stock ?? 0}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    change
                  </button>
                </div>
              </div>
            )}
          </FormSection>

          {/* Step 2: Adjustment details */}
          {selected && (
            <FormSection
              title="2. Adjustment Details"
              icon={<MdTune size={16} />}
              required
              className="mt-4"
            >
              {/* Type */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setAdjustType(t.value)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border text-sm font-medium transition-colors ${adjustType === t.value ? "border-[var(--admin-gold)] bg-[var(--admin-blue-soft)] text-[var(--admin-gold)]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                    >
                      <Icon
                        size={20}
                        className={
                          adjustType === t.value ? "text-[var(--admin-gold)]" : t.color
                        }
                      />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Quantity */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--admin-gold)]"
                  placeholder="Enter quantity"
                />
              </div>

              {/* Reason */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Reason *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--admin-gold)] bg-white"
                >
                  <option value="">Select reason…</option>
                  {adjustmentReasons.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[var(--admin-gold)] resize-none"
                  placeholder="Additional notes…"
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !qty || !reason}
                  className="px-6 py-2 text-sm font-medium text-white bg-[var(--admin-gold)] rounded-lg hover:bg-[var(--admin-gold-dark)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && (
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  Apply Adjustment
                </button>
              </div>
            </FormSection>
          )}
        </div>
      </PermissionGuard>
    </div>
  );
};

export default InventoryAdjustment;
