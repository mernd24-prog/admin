import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import {
  MdAdd,
  MdCheckCircle,
  MdDelete,
  MdEdit,
  MdLocalShipping,
  MdStar,
  MdStarBorder,
} from "react-icons/md";
import DefaultModal from "../../../components/Atoms/Modal/DefaultMiddleModal ";
import {
  ConfirmModal,
  DataTable,
  FilterBar,
  PageHeader,
  StatusBadge,
} from "../../../components/Shared";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { getStoredUser } from "../../../_helpers/authStorage";
import { getSelectedSellerOrganizationId } from "../../../_helpers/sellerOrganizationContext";
import { usePermission } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
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

const unwrapProfiles = (payload = {}) => {
  const data = payload?.data?.data || payload?.data || payload || {};
  const profiles = Array.isArray(data)
    ? data
    : data.profiles || data.items || data.list || [];
  return {
    list: Array.isArray(profiles) ? profiles : [],
    total: Number(data.total || profiles.length || 0),
  };
};

const getSellerIdFromUser = (user = {}) =>
  String(user.ownerSellerId || user.sellerId || user._id || user.id || user.userId || "");

const getSellerLabelFromUser = (user = {}) =>
  user.sellerProfile?.displayName ||
  user.sellerProfile?.businessName ||
  user.profile?.firstName ||
  user.email ||
  getSellerIdFromUser(user) ||
  "Current seller";

const displayStatus = (value = "") => String(value || "N/A").replace(/_/g, " ");
const formatMoney = (value) => Number(value || 0) === 0 ? "Free" : `₹${Number(value || 0).toFixed(0)}`;
const shortId = (value = "") => String(value || "").slice(0, 8) || "N/A";
const profileId = (profile = {}) => profile.id || profile._id || profile.profileId;

const modeLabel = (value) =>
  SERVICEABILITY_MODES.find((mode) => mode.value === value)?.label || displayStatus(value);

const methodLabel = (value) =>
  SHIPPING_METHODS.find((method) => method.value === value)?.label || displayStatus(value);

const etaLabel = (profile = {}) => {
  const values = [profile.etaMin, profile.etaMax].filter((value) => value !== undefined && value !== null && value !== "");
  return values.length ? `${values.join("-")} days` : "N/A";
};

const coverageLabel = (profile = {}) => {
  if (profile.serviceabilityMode === "all_india") return "All India";
  const parts = [
    profile.allowedStates?.length ? `${profile.allowedStates.length} states` : "",
    profile.allowedCities?.length ? `${profile.allowedCities.length} cities` : "",
    profile.allowedPincodes?.length ? `${profile.allowedPincodes.length} pincodes` : "",
    profile.blockedPincodes?.length ? `${profile.blockedPincodes.length} blocked` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : modeLabel(profile.serviceabilityMode);
};

export default function ShippingProfiles() {
  const dispatch = useDispatch();
  const { isSeller } = usePermission();
  const storedUser = useMemo(() => getStoredUser() || {}, []);
  const sellerSessionId = useMemo(() => getSellerIdFromUser(storedUser), [storedUser]);
  const sellerSessionLabel = useMemo(() => getSellerLabelFromUser(storedUser), [storedUser]);
  const list = useListPage({
    defaultPageSize: 20,
    defaultSortKey: "created_at",
    defaultSortDir: "desc",
  });
  const {
    page,
    pageSize,
    search,
    sortKey,
    sortDir,
    filters,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    setFilter,
    clearFilters,
    activeFilterCount,
  } = list;

  const [selectedOrganizationId, setSelectedOrganizationIdState] = useState(getSelectedSellerOrganizationId());
  const [modal, setModal] = useState({ open: false, mode: "create", profile: null });
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sellerOptions, setSellerOptions] = useState([]);
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { shippingProfilesData } = useSelector((state) => state.delivery);
  const profilesPayload = useMemo(() => unwrapProfiles(shippingProfilesData), [shippingProfilesData]);

  useEffect(() => {
    if (!isSeller) return undefined;
    const handler = (event) => {
      setSelectedOrganizationIdState(
        event?.detail?.organizationId || getSelectedSellerOrganizationId(),
      );
    };
    window.addEventListener("seller:organizationChanged", handler);
    return () => window.removeEventListener("seller:organizationChanged", handler);
  }, [isSeller]);

  useEffect(() => {
    if (isSeller) return;
    dropdownApi.getSellers({ keyWord: "", limit: 200 })
      .then((options) => setSellerOptions(options || []))
      .catch(() => {});
  }, [isSeller]);

  const activeSellerId = isSeller ? sellerSessionId : filters.sellerId;
  const activeOrganizationId = isSeller ? selectedOrganizationId : filters.organizationId;

  useEffect(() => {
    if (!activeSellerId) {
      setOrganizationOptions([]);
      if (!isSeller && filters.organizationId) setFilter("organizationId", "");
      return;
    }

    let active = true;
    dropdownApi.getSellerOrganizations(activeSellerId)
      .then((options) => {
        if (active) setOrganizationOptions(options || []);
      })
      .catch(() => {
        if (active) setOrganizationOptions([]);
      });
    return () => { active = false; };
  }, [activeSellerId, filters.organizationId, isSeller, setFilter]);

  useEffect(() => {
    if (!isSeller && !filters.sellerId && filters.organizationId) {
      setFilter("organizationId", "");
    }
  }, [filters.organizationId, filters.sellerId, isSeller, setFilter]);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };
      if (search) params.search = search;
      if (activeSellerId) params.sellerId = activeSellerId;
      if (activeOrganizationId) params.organizationId = activeOrganizationId;
      if (filters.active !== undefined && filters.active !== "") {
        params.active = filters.active === "true";
      }
      await dispatch(getShippingProfiles(params)).unwrap();
    } catch (requestError) {
      const message = requestError?.message || requestError || "Failed to load shipping profiles";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [
    activeOrganizationId,
    activeSellerId,
    dispatch,
    filters.active,
    page,
    pageSize,
    search,
  ]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const filterFields = useMemo(() => {
    const fields = [];
    if (!isSeller) {
      fields.push({
        key: "sellerId",
        type: "asyncDropdown",
        label: "Seller",
        width: "w-52",
        load: (search) =>
          dropdownApi.getSellers({
            keyWord: search,
            searchFields: "full_name,email,businessName",
          }),
      });
      if (filters.sellerId) {
        fields.push({
          key: "organizationId",
          type: "select",
          label: "Organization",
          width: "w-56",
          placeholder: "All Organizations",
          options: organizationOptions.map((option) => ({
            value: option.value,
            label: option.label,
          })),
        });
      }
    }
    fields.push({
      key: "active",
      type: "select",
      label: "Status",
      options: [
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" },
      ],
    });
    return fields;
  }, [filters.sellerId, isSeller, organizationOptions]);

  const sellerLabel = useCallback((sellerId) => {
    if (isSeller) return sellerSessionLabel;
    return sellerOptions.find((option) => String(option.value) === String(sellerId))?.label || shortId(sellerId);
  }, [isSeller, sellerOptions, sellerSessionLabel]);

  const organizationLabel = useCallback((organizationId) =>
    organizationOptions.find((option) => String(option.value) === String(organizationId))?.label || shortId(organizationId),
  [organizationOptions]);

  const openCreate = () => {
    const sellerId = activeSellerId;
    if (!sellerId) {
      toast.error(isSeller ? "Seller session not found. Please sign in again." : "Select a seller before creating a shipping profile");
      return;
    }
    setForm({
      ...EMPTY_FORM,
      sellerId,
      organizationId: activeOrganizationId || "",
    });
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
      sellerId: profile.sellerId || activeSellerId,
      organizationId: profile.organizationId || "",
    });
    setModal({ open: true, mode: "edit", profile });
  };

  const closeModal = () => setModal({ open: false, mode: "create", profile: null });

  const buildPayload = () => ({
    ...form,
    sellerId: form.sellerId || activeSellerId || undefined,
    organizationId: form.organizationId || null,
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
        await dispatch(createShippingProfile(buildPayload())).unwrap();
        toast.success("Shipping profile created");
      } else {
        await dispatch(updateShippingProfile({ profileId: profileId(modal.profile), ...buildPayload() })).unwrap();
        toast.success("Shipping profile updated");
      }
      closeModal();
      fetchProfiles();
    } catch (err) {
      toast.error(err?.message || err || "Failed to save shipping profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      await dispatch(deleteShippingProfile({ profileId: profileId(deleteTarget) })).unwrap();
      toast.success("Profile deleted");
      setDeleteTarget(null);
      fetchProfiles();
    } catch (err) {
      toast.error(err?.message || err || "Failed to delete profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (profile) => {
    try {
      setLoading(true);
      await dispatch(setDefaultShippingProfile({ profileId: profileId(profile) })).unwrap();
      toast.success(`"${profile.name}" set as default`);
      fetchProfiles();
    } catch (err) {
      toast.error(err?.message || err || "Failed to set default profile");
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(() => {
    const baseColumns = [
      {
        key: "name",
        label: "Profile",
        sortable: true,
        render: (value, row) => (
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md ${row.active !== false ? "bg-[var(--admin-blue-soft)] text-[var(--admin-blue)]" : "bg-gray-100 text-gray-400"}`}>
              <MdLocalShipping size={18} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[var(--admin-ink)]">{value || "N/A"}</span>
                {row.isDefault && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--admin-blue-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--admin-blue)]">
                    <MdStar size={12} /> Default
                  </span>
                )}
              </div>
              <div className="mt-0.5 max-w-md text-xs text-[var(--admin-muted)]">
                {row.description || "Reusable product delivery rules"}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "sellerId",
        label: "Seller",
        render: (value, row) => (
          <div>
            <div className="text-sm font-medium text-[var(--admin-ink)]">{sellerLabel(value || row.seller_id)}</div>
            {row.organizationId && (
              <div className="text-xs text-[var(--admin-muted)]">{organizationLabel(row.organizationId)}</div>
            )}
          </div>
        ),
      },
      {
        key: "shippingMethod",
        label: "Method",
        render: (value) => <span className="capitalize">{methodLabel(value)}</span>,
      },
      {
        key: "serviceabilityMode",
        label: "Serviceability",
        render: (value, row) => (
          <div>
            <div className="text-sm font-medium text-[var(--admin-ink)]">{modeLabel(value)}</div>
            <div className="text-xs text-[var(--admin-muted)]">{coverageLabel(row)}</div>
          </div>
        ),
      },
      {
        key: "shippingCharge",
        label: "Charge",
        render: (value, row) => (
          <div>
            <div className="font-medium text-[var(--admin-ink)]">{formatMoney(value)}</div>
            {row.freeShippingThreshold != null && (
              <div className="text-xs text-[var(--admin-muted)]">Free above ₹{Number(row.freeShippingThreshold).toFixed(0)}</div>
            )}
          </div>
        ),
      },
      {
        key: "codAvailable",
        label: "COD",
        render: (value) => (
          <StatusBadge
            status={value ? "yes" : "no"}
            label={value ? "Available" : "Unavailable"}
            dot
          />
        ),
      },
      {
        key: "etaMin",
        label: "ETA",
        render: (_, row) => etaLabel(row),
      },
      {
        key: "active",
        label: "Status",
        render: (value) => <StatusBadge status={value === false ? "inactive" : "active"} dot />,
      },
    ];

    return isSeller ? baseColumns.filter((column) => column.key !== "sellerId") : baseColumns;
  }, [isSeller, organizationLabel, sellerLabel]);

  return (
    <div>
      <PageHeader
        title="Shipping Profiles"
        subtitle={isSeller
          ? "Manage reusable delivery rules for your products"
          : "Manage reusable seller delivery configurations"}
        breadcrumbs={[{ label: "Shipping & Fulfilment" }, { label: "Shipping Profiles" }]}
        actions={
          <button className="admin-btn-primary" onClick={openCreate}>
            <MdAdd size={17} /> New Profile
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={profilesPayload.list}
        loading={loading || shippingProfilesData?.loading}
        totalCount={profilesPayload.total || profilesPayload.list.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearch={setSearch}
        onSort={setSort}
        sortKey={sortKey}
        sortDir={sortDir}
        searchPlaceholder="Search shipping profile name…"
        emptyText="No shipping profiles found."
        emptyIcon={<MdLocalShipping size={42} className="text-gray-200" />}
        onRefresh={fetchProfiles}
        error={error}
        requiredModule="delivery"
        rowKey={profileId}
        filterBar={
          <FilterBar
            filters={filterFields}
            values={filters}
            onChange={setFilter}
            onClear={clearFilters}
            loading={loading}
            activeCount={activeFilterCount}
          />
        }
        rowActions={(row) => [
          { label: "Edit", icon: <MdEdit size={16} />, onClick: () => openEdit(row) },
          {
            label: "Set Default",
            icon: <MdStarBorder size={16} />,
            hidden: row.isDefault,
            onClick: () => handleSetDefault(row),
          },
          { label: "Delete", icon: <MdDelete size={16} />, danger: true, onClick: () => setDeleteTarget(row) },
        ]}
      />

      <DefaultModal
        isOpen={modal.open}
        onClose={closeModal}
        title={modal.mode === "create" ? "Create Shipping Profile" : `Edit - ${modal.profile?.name}`}
        onSubmit={handleSave}
        submitButtonText={modal.mode === "create" ? "Create Profile" : "Save Changes"}
        closeButtonText="Cancel"
        loading={saving}
      >
        <ProfileForm form={form} setForm={setForm} />
      </DefaultModal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Shipping Profile"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Products using this profile will fall back to seller charge settings.`}
        confirmLabel="Delete"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}
