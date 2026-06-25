import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  MdAdd,
  MdCheckCircle,
  MdDelete,
  MdEdit,
  MdLocalShipping,
  MdRefresh,
  MdStar,
  MdStarBorder,
} from "react-icons/md";
import { FiPackage } from "react-icons/fi";
import DefaultModal from "../../../components/Atoms/Modal/DefaultMiddleModal ";
import { ConfirmModal, PageHeader } from "../../../components/Shared";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import {
  createShippingProfile,
  deleteShippingProfile,
  getShippingProfiles,
  setDefaultShippingProfile,
  updateShippingProfile,
} from "../../../Redux/deliverySlice";

// ── Constants ────────────────────────────────────────────────────────────────

const INDIA_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra & Nagar Haveli and Daman & Diu",
  "Delhi","Jammu & Kashmir","Ladakh","Lakshadweep","Puducherry",
];

const SERVICEABILITY_MODES = [
  { value: "all_india", label: "All India", description: "Deliver everywhere in India" },
  { value: "selected_states", label: "Selected States", description: "Only selected states" },
  { value: "selected_cities", label: "Selected Cities", description: "Only selected cities (within selected states)" },
  { value: "selected_pincodes", label: "Selected Pincodes", description: "Only listed pincodes" },
  { value: "block_pincodes", label: "Block Pincodes", description: "All India except blocked pincodes" },
];

const SHIPPING_METHODS = [
  { value: "standard", label: "Standard" },
  { value: "express", label: "Express" },
  { value: "same_day", label: "Same Day" },
  { value: "hyperlocal", label: "Hyperlocal" },
];

const EMPTY_FORM = {
  name: "",
  description: "",
  shippingMethod: "standard",
  serviceabilityMode: "all_india",
  allowedStates: [],
  allowedCities: [],
  allowedPincodes: [],
  blockedPincodes: [],
  codAvailable: true,
  shippingCharge: 0,
  freeShippingThreshold: "",
  etaMin: "",
  etaMax: "",
  isDefault: false,
  active: true,
};

// ── Reusable tag-input ───────────────────────────────────────────────────────

function TagInput({ value = [], onChange, placeholder = "Type and press Enter", validate }) {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  const commit = () => {
    const v = input.trim();
    if (!v) return;
    if (validate && !validate(v)) { toast.error("Invalid value: " + v); return; }
    if (!value.includes(v)) onChange([...value, v]);
    setInput("");
  };

  return (
    <div
      className="admin-input min-h-[42px] flex flex-wrap gap-1 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded bg-[var(--admin-blue)]/10 text-[var(--admin-blue)] text-xs px-2 py-0.5 font-medium">
          {tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(value.filter((t) => t !== tag)); }} className="hover:text-red-500 ml-0.5 leading-none">×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
        value={input}
        placeholder={value.length === 0 ? placeholder : ""}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } if (e.key === "Backspace" && !input && value.length) onChange(value.slice(0, -1)); }}
        onBlur={commit}
      />
    </div>
  );
}

// Multi-select dropdown for states
function StateMultiSelect({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = INDIA_STATES.filter((s) => s.toLowerCase().includes(search.toLowerCase()));

  const toggle = (state) => {
    if (value.includes(state)) onChange(value.filter((s) => s !== state));
    else onChange([...value, state]);
  };

  return (
    <div ref={ref} className="relative">
      <div
        className="admin-input min-h-[42px] flex flex-wrap gap-1 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        {value.length === 0 && <span className="text-sm text-gray-400">Select states…</span>}
        {value.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded bg-[var(--admin-blue)]/10 text-[var(--admin-blue)] text-xs px-2 py-0.5 font-medium">
            {s}
            <button type="button" onClick={(e) => { e.stopPropagation(); toggle(s); }} className="hover:text-red-500 ml-0.5 leading-none">×</button>
          </span>
        ))}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          <div className="p-2 border-b sticky top-0 bg-white">
            <input
              className="admin-input text-sm py-1"
              placeholder="Search states…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          {filtered.map((s) => (
            <div
              key={s}
              className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm ${value.includes(s) ? "text-[var(--admin-blue)] font-medium" : "text-gray-700"}`}
              onClick={(e) => { e.stopPropagation(); toggle(s); }}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center ${value.includes(s) ? "bg-[var(--admin-blue)] border-[var(--admin-blue)]" : "border-gray-300"}`}>
                {value.includes(s) && <MdCheckCircle className="text-white text-xs" />}
              </span>
              {s}
            </div>
          ))}
          {filtered.length === 0 && <div className="px-3 py-4 text-center text-sm text-gray-400">No states found</div>}
        </div>
      )}
    </div>
  );
}

// ── Profile Card ─────────────────────────────────────────────────────────────

function ProfileCard({ profile, onEdit, onDelete, onSetDefault }) {
  const modeLabel = SERVICEABILITY_MODES.find((m) => m.value === profile.serviceabilityMode)?.label || profile.serviceabilityMode;
  const methodLabel = SHIPPING_METHODS.find((m) => m.value === profile.shippingMethod)?.label || profile.shippingMethod;

  return (
    <div className={`relative rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${profile.isDefault ? "border-[var(--admin-blue)]" : "border-gray-200"}`}>
      {profile.isDefault && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-[var(--admin-blue)] text-white text-[10px] font-semibold px-2 py-0.5">
          <MdStar className="text-xs" /> Default
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${profile.active ? "bg-[var(--admin-blue)]/10" : "bg-gray-100"}`}>
          <MdLocalShipping className={`text-xl ${profile.active ? "text-[var(--admin-blue)]" : "text-gray-400"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold text-sm truncate ${profile.active ? "text-gray-900" : "text-gray-400 line-through"}`}>{profile.name}</h3>
            {!profile.active && <span className="text-[10px] rounded-full bg-gray-100 text-gray-400 px-1.5 py-0.5 font-medium">Inactive</span>}
          </div>
          {profile.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{profile.description}</p>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Chip label="Method" value={methodLabel} />
        <Chip label="Mode" value={modeLabel} />
        <Chip label="Charge" value={profile.shippingCharge === 0 ? "Free" : `₹${Number(profile.shippingCharge).toFixed(0)}`} highlight={profile.shippingCharge === 0} />
        <Chip label="COD" value={profile.codAvailable ? "Available" : "Not Available"} highlight={profile.codAvailable} />
        {(profile.etaMin || profile.etaMax) && (
          <Chip label="ETA" value={[profile.etaMin, profile.etaMax].filter(Boolean).join("–") + " days"} />
        )}
        {profile.freeShippingThreshold != null && (
          <Chip label="Free above" value={`₹${Number(profile.freeShippingThreshold).toFixed(0)}`} />
        )}
      </div>

      {profile.serviceabilityMode !== "all_india" && (
        <div className="mt-2 text-xs text-gray-500">
          {profile.allowedStates?.length > 0 && <span>{profile.allowedStates.length} state(s) selected</span>}
          {profile.allowedCities?.length > 0 && <span className="ml-2">{profile.allowedCities.length} city/cities</span>}
          {profile.allowedPincodes?.length > 0 && <span className="ml-2">{profile.allowedPincodes.length} pincode(s)</span>}
          {profile.blockedPincodes?.length > 0 && <span className="ml-2">{profile.blockedPincodes.length} blocked</span>}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
        <button onClick={() => onEdit(profile)} className="flex-1 admin-btn-sm text-center text-xs">
          <MdEdit className="inline mr-1" /> Edit
        </button>
        {!profile.isDefault && (
          <button onClick={() => onSetDefault(profile)} className="flex-1 admin-btn-sm text-center text-xs text-[var(--admin-blue)] border-[var(--admin-blue)]/30 hover:bg-[var(--admin-blue)]/5">
            <MdStarBorder className="inline mr-1" /> Set Default
          </button>
        )}
        <button onClick={() => onDelete(profile)} className="px-2 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-xs">
          <MdDelete />
        </button>
      </div>
    </div>
  );
}

function Chip({ label, value, highlight }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2 py-1.5">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium leading-none">{label}</p>
      <p className={`text-xs font-semibold mt-0.5 ${highlight ? "text-emerald-600" : "text-gray-700"}`}>{value}</p>
    </div>
  );
}

// ── Profile Form (inside modal) ──────────────────────────────────────────────

function ProfileForm({ form, setForm }) {
  const patch = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const mode = form.serviceabilityMode;

  return (
    <div className="space-y-6 py-2">
      {/* Identity */}
      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Profile Identity</h4>

        <div className="space-y-1">
          <label className="admin-label">Profile Name <span className="text-red-500">*</span></label>
          <input className="admin-input" placeholder="e.g. Standard Shipping, Express, Heavy Products" value={form.name} onChange={(e) => patch("name", e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="admin-label">Description</label>
          <input className="admin-input" placeholder="Optional description" value={form.description} onChange={(e) => patch("description", e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="admin-label">Shipping Method</label>
          <select className="admin-input" value={form.shippingMethod} onChange={(e) => patch("shippingMethod", e.target.value)}>
            {SHIPPING_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </section>

      {/* Serviceability */}
      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Serviceability</h4>

        <div className="space-y-2">
          {SERVICEABILITY_MODES.map((m) => (
            <label key={m.value} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${form.serviceabilityMode === m.value ? "border-[var(--admin-blue)] bg-[var(--admin-blue)]/5" : "border-gray-200 hover:border-gray-300"}`}>
              <input type="radio" name="serviceabilityMode" value={m.value} checked={form.serviceabilityMode === m.value} onChange={() => patch("serviceabilityMode", m.value)} className="mt-0.5 accent-[var(--admin-blue)]" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                <p className="text-xs text-gray-500">{m.description}</p>
              </div>
            </label>
          ))}
        </div>

        {(mode === "selected_states" || mode === "selected_cities") && (
          <div className="space-y-1">
            <label className="admin-label">States</label>
            <StateMultiSelect value={form.allowedStates} onChange={(v) => patch("allowedStates", v)} />
            <p className="text-xs text-gray-400">{form.allowedStates.length} state(s) selected</p>
          </div>
        )}

        {mode === "selected_cities" && (
          <div className="space-y-1">
            <label className="admin-label">Cities</label>
            <TagInput value={form.allowedCities} onChange={(v) => patch("allowedCities", v)} placeholder="Type city name and press Enter…" />
            <p className="text-xs text-gray-400">Enter each city name then press Enter</p>
          </div>
        )}

        {mode === "selected_pincodes" && (
          <div className="space-y-1">
            <label className="admin-label">Allowed Pincodes</label>
            <TagInput
              value={form.allowedPincodes}
              onChange={(v) => patch("allowedPincodes", v)}
              placeholder="Type pincode and press Enter…"
              validate={(v) => /^\d{4,10}$/.test(v)}
            />
            <p className="text-xs text-gray-400">{form.allowedPincodes.length} pincode(s) added</p>
          </div>
        )}

        {mode === "block_pincodes" && (
          <div className="space-y-1">
            <label className="admin-label">Blocked Pincodes</label>
            <TagInput
              value={form.blockedPincodes}
              onChange={(v) => patch("blockedPincodes", v)}
              placeholder="Type pincode and press Enter…"
              validate={(v) => /^\d{4,10}$/.test(v)}
            />
            <p className="text-xs text-gray-400">{form.blockedPincodes.length} pincode(s) blocked</p>
          </div>
        )}
      </section>

      {/* Charges */}
      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Charges</h4>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="admin-label">Shipping Charge (₹)</label>
            <input className="admin-input" type="number" min="0" placeholder="0" value={form.shippingCharge} onChange={(e) => patch("shippingCharge", e.target.value)} />
            <p className="text-xs text-gray-400">Set 0 for free shipping</p>
          </div>
          <div className="space-y-1">
            <label className="admin-label">Free Shipping Above (₹)</label>
            <input className="admin-input" type="number" min="0" placeholder="Leave blank to disable" value={form.freeShippingThreshold} onChange={(e) => patch("freeShippingThreshold", e.target.value)} />
            <p className="text-xs text-gray-400">Order value threshold</p>
          </div>
        </div>
      </section>

      {/* ETA */}
      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Estimated Delivery Time</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="admin-label">ETA Min (days)</label>
            <input className="admin-input" type="number" min="0" placeholder="e.g. 2" value={form.etaMin} onChange={(e) => patch("etaMin", e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="admin-label">ETA Max (days)</label>
            <input className="admin-input" type="number" min="0" placeholder="e.g. 5" value={form.etaMax} onChange={(e) => patch("etaMax", e.target.value)} />
          </div>
        </div>
      </section>

      {/* COD & Flags */}
      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Options</h4>
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
            <div>
              <p className="text-sm font-semibold text-gray-800">COD Available</p>
              <p className="text-xs text-gray-500">Allow Cash on Delivery for this profile</p>
            </div>
            <input type="checkbox" className="h-4 w-4 accent-[var(--admin-blue)]" checked={Boolean(form.codAvailable)} onChange={(e) => patch("codAvailable", e.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
            <div>
              <p className="text-sm font-semibold text-gray-800">Set as Default Profile</p>
              <p className="text-xs text-gray-500">Products with no profile assigned will use this</p>
            </div>
            <input type="checkbox" className="h-4 w-4 accent-[var(--admin-blue)]" checked={Boolean(form.isDefault)} onChange={(e) => patch("isDefault", e.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
            <div>
              <p className="text-sm font-semibold text-gray-800">Active</p>
              <p className="text-xs text-gray-500">Inactive profiles cannot be assigned to products</p>
            </div>
            <input type="checkbox" className="h-4 w-4 accent-[var(--admin-blue)]" checked={Boolean(form.active)} onChange={(e) => patch("active", e.target.checked)} />
          </label>
        </div>
      </section>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ShippingProfiles() {
  const dispatch = useDispatch();
  const [sellerId, setSellerId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [modal, setModal] = useState({ open: false, mode: "create", profile: null });
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sellerOptions, setSellerOptions] = useState([]);
  const [organizationOptions, setOrganizationOptions] = useState([]);

  const { shippingProfilesData } = useSelector((s) => s.delivery);
  const profiles = useMemo(() => shippingProfilesData?.data?.profiles || shippingProfilesData?.profiles || [], [shippingProfilesData]);

  const load = useCallback(() => {
    const params = {};
    if (sellerId) params.sellerId = sellerId;
    if (organizationId) params.organizationId = organizationId;
    if (filterActive !== "") params.active = filterActive === "true";
    if (search) params.search = search;
    dispatch(getShippingProfiles(params));
  }, [dispatch, sellerId, organizationId, filterActive, search]);

  useEffect(() => { load(); }, [load]);

  // Load seller dropdown
  useEffect(() => {
    dropdownApi.getSellers({ keyWord: "" }).then((opts) => setSellerOptions(opts || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sellerId) {
      setOrganizationId("");
      setOrganizationOptions([]);
      return;
    }

    let active = true;
    dropdownApi.getSellerOrganizations(sellerId)
      .then((options) => {
        if (!active) return;
        setOrganizationOptions(options || []);
      })
      .catch(() => {
        if (active) setOrganizationOptions([]);
      });
    return () => { active = false; };
  }, [sellerId]);

  const handleSellerChange = (value) => {
    setSellerId(value);
    setOrganizationId("");
  };

  const openCreate = () => {
    if (!sellerId) {
      toast.error("Select a seller before creating a shipping profile");
      return;
    }
    setForm({ ...EMPTY_FORM, sellerId, organizationId: organizationId || "" });
    setModal({ open: true, mode: "create", profile: null });
  };

  const openEdit = (profile) => {
    setForm({
      name: profile.name || "",
      description: profile.description || "",
      shippingMethod: profile.shippingMethod || "standard",
      serviceabilityMode: profile.serviceabilityMode || "all_india",
      allowedStates: profile.allowedStates || [],
      allowedCities: profile.allowedCities || [],
      allowedPincodes: profile.allowedPincodes || [],
      blockedPincodes: profile.blockedPincodes || [],
      codAvailable: profile.codAvailable !== false,
      shippingCharge: profile.shippingCharge ?? 0,
      freeShippingThreshold: profile.freeShippingThreshold ?? "",
      etaMin: profile.etaMin ?? "",
      etaMax: profile.etaMax ?? "",
      isDefault: Boolean(profile.isDefault),
      active: profile.active !== false,
      sellerId: profile.sellerId || sellerId,
      organizationId: profile.organizationId || "",
    });
    setModal({ open: true, mode: "edit", profile });
  };

  const closeModal = () => setModal({ open: false, mode: "create", profile: null });

  const buildPayload = () => ({
    ...form,
    sellerId: sellerId || form.sellerId || undefined,
    organizationId: organizationId || form.organizationId || null,
    shippingCharge: form.shippingCharge !== "" ? Number(form.shippingCharge) : 0,
    freeShippingThreshold: form.freeShippingThreshold !== "" ? Number(form.freeShippingThreshold) : null,
    etaMin: form.etaMin !== "" ? Number(form.etaMin) : null,
    etaMax: form.etaMax !== "" ? Number(form.etaMax) : null,
  });

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error("Profile name is required"); return; }
    setSaving(true);
    try {
      if (modal.mode === "create") {
        const res = await dispatch(createShippingProfile(buildPayload()));
        if (res.error) throw new Error(res.payload?.message || "Failed to create profile");
        toast.success("Shipping profile created");
      } else {
        const res = await dispatch(updateShippingProfile({ profileId: modal.profile.id, ...buildPayload() }));
        if (res.error) throw new Error(res.payload?.message || "Failed to update profile");
        toast.success("Shipping profile updated");
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await dispatch(deleteShippingProfile({ profileId: deleteTarget.id }));
      if (res.error) throw new Error(res.payload?.message || "Failed to delete profile");
      toast.success("Profile deleted");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSetDefault = async (profile) => {
    try {
      const res = await dispatch(setDefaultShippingProfile({ profileId: profile.id }));
      if (res.error) throw new Error(res.payload?.message || "Failed");
      toast.success(`"${profile.name}" set as default`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const loading = shippingProfilesData?.loading;

  return (
    <div className="admin-page-container">
      <PageHeader
        title="Shipping Profiles"
        subtitle="Create reusable delivery configurations. Products select a profile instead of configuring shipping individually."
        rightContent={
          <button className="admin-btn-primary flex items-center gap-2" onClick={openCreate}>
            <MdAdd /> New Profile
          </button>
        }
      />

      {/* Filters */}
      <div className="admin-card mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-52 space-y-1">
            <label className="admin-label">Seller</label>
            <select className="admin-input" value={sellerId} onChange={(e) => handleSellerChange(e.target.value)}>
              <option value="">All Sellers</option>
              {sellerOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="w-56 space-y-1">
            <label className="admin-label">Organization</label>
            <select
              className="admin-input"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              disabled={!sellerId}
              title={!sellerId ? "Select a seller to filter by organization" : ""}
            >
              <option value="">{sellerId ? "All Organizations" : "Select seller first"}</option>
              {organizationOptions.map((org) => (
                <option key={org.value} value={org.value}>
                  {org.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-44 space-y-1">
            <label className="admin-label">Status</label>
            <select className="admin-input" value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="flex-1 min-w-[180px] space-y-1">
            <label className="admin-label">Search</label>
            <input className="admin-input" placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="admin-btn flex items-center gap-1" onClick={load}>
            <MdRefresh className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Grid of profile cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse h-48" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="admin-card flex flex-col items-center justify-center py-16 text-center">
          <FiPackage className="text-5xl text-gray-300 mb-4" />
          <h3 className="text-base font-semibold text-gray-600">No shipping profiles yet</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm">
            Create your first profile to define reusable delivery rules for your products.
          </p>
          <button className="admin-btn-primary mt-4 flex items-center gap-2" onClick={openCreate}>
            <MdAdd /> Create First Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <DefaultModal
        isOpen={modal.open}
        onClose={closeModal}
        title={modal.mode === "create" ? "Create Shipping Profile" : `Edit — ${modal.profile?.name}`}
        onSubmit={handleSave}
        submitButtonText={modal.mode === "create" ? "Create Profile" : "Save Changes"}
        closeButtonText="Cancel"
        loading={saving}
      >
        <ProfileForm form={form} setForm={setForm} />
      </DefaultModal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Shipping Profile"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Products using this profile will fall back to seller charge settings.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
