import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  MdAdd,
  MdCheckCircle,
  MdDelete,
  MdDeleteSweep,
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
  SummaryCard,
} from "../../../components/Shared";
import { dropdownApi } from "../../../_helpers/dropdownApi";
import { getStoredUser } from "../../../_helpers/authStorage";
import { getSelectedSellerOrganizationId } from "../../../_helpers/sellerOrganizationContext";
import { ACTIONS, usePermission } from "../../../_helpers/usePermission";
import { useListPage } from "../../../hooks/useListPage";
import {
  bulkDeleteShippingProfiles,
  createShippingProfile,
  createShippingProfileTemplate,
  deleteShippingProfile,
  cloneShippingProfileTemplate,
  getShippingProfileTemplates,
  getShippingProfiles,
  setDefaultShippingProfile,
  updateShippingProfile,
  updateShippingProfileTemplate,
} from "../../../Redux/deliverySlice";

// ── Constants ────────────────────────────────────────────────────────────────

const SERVICEABILITY_MODES = [
  { value: "all_india", label: "All Locations", description: "Deliver everywhere supported by configured locations" },
  { value: "selected_states", label: "Selected States", description: "Only selected states" },
  { value: "selected_cities", label: "Selected Cities", description: "Only selected cities (within selected states)" },
  { value: "selected_pincodes", label: "Selected Pincodes", description: "Only listed pincodes" },
  { value: "block_pincodes", label: "Block Pincodes", description: "All locations except blocked pincodes" },
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

const EMPTY_CLONE_FORM = {
  templateId: "",
  sellerId: "",
  organizationId: "",
  name: "",
  description: "",
  isDefault: false,
  active: true,
};

const optionLabel = (option = {}) =>
  option.label || option.name || option.title || option.code || option.pincode || option.value || "";

const optionValue = (option = {}) =>
  String(option.rawValue || option.value || option.name || option.code || option.pincode || option.label || "").trim();

const optionId = (option = {}) => option.id || option.value || option._id || optionLabel(option);

const optionParentId = (option = {}) => option.id || option._id || option.value || "";

// API-backed multi-select dropdown for states, cities, and pincodes.
function OptionMultiSelect({
  value = [],
  onChange,
  options = [],
  placeholder = "Select values...",
  searchPlaceholder = "Search...",
  emptyText = "No options found",
  disabled = false,
  loading = false,
  getValue = optionValue,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((option) =>
    optionLabel(option).toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (option) => {
    const nextValue = getValue(option);
    if (!nextValue) return;
    if (value.includes(nextValue)) onChange(value.filter((item) => item !== nextValue));
    else onChange([...value, nextValue]);
  };

  return (
    <div ref={ref} className="relative">
      <div
        className={`admin-input min-h-[42px] flex flex-wrap gap-1 ${disabled ? "cursor-not-allowed bg-gray-50 text-gray-400" : "cursor-pointer"}`}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
      >
        {value.length === 0 && <span className="text-sm text-gray-400">{placeholder}</span>}
        {value.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 rounded bg-[var(--admin-blue)]/10 text-[var(--admin-blue)] text-xs px-2 py-0.5 font-medium">
            {item}
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(value.filter((tag) => tag !== item)); }} className="hover:text-red-500 ml-0.5 leading-none">×</button>
          </span>
        ))}
      </div>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          <div className="p-2 border-b sticky top-0 bg-white">
            <input
              className="admin-input text-sm py-1"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          {loading && <div className="px-3 py-4 text-center text-sm text-gray-400">Loading...</div>}
          {!loading && filtered.map((option) => {
            const selectedValue = getValue(option);
            const selected = value.includes(selectedValue);
            return (
            <div
              key={optionId(option)}
              className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm ${selected ? "text-[var(--admin-blue)] font-medium" : "text-gray-700"}`}
              onClick={(e) => { e.stopPropagation(); toggle(option); }}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center ${selected ? "bg-[var(--admin-blue)] border-[var(--admin-blue)]" : "border-gray-300"}`}>
                {selected && <MdCheckCircle className="text-white text-xs" />}
              </span>
              {optionLabel(option)}
            </div>
          );})}
          {!loading && filtered.length === 0 && <div className="px-3 py-4 text-center text-sm text-gray-400">{emptyText}</div>}
        </div>
      )}
    </div>
  );
}

// ── Profile Form (inside modal) ──────────────────────────────────────────────

function ProfileForm({
  form,
  setForm,
  isTemplate = false,
  isSeller = false,
  sellerOptions = [],
  organizationOptions = [],
  onSellerSearch,
}) {
  const patch = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const mode = form.serviceabilityMode;
  const needsCountry = ["selected_states", "selected_cities", "selected_pincodes", "block_pincodes"].includes(mode);
  const needsState = ["selected_cities", "selected_pincodes", "block_pincodes"].includes(mode);
  const needsCity = ["selected_pincodes", "block_pincodes"].includes(mode);
  const [locationFilter, setLocationFilter] = useState({ countryId: "", stateId: "", cityId: "" });
  const [locationOptions, setLocationOptions] = useState({
    countries: [],
    states: [],
    cities: [],
    pincodes: [],
  });
  const [locationLoading, setLocationLoading] = useState({
    countries: false,
    states: false,
    cities: false,
    pincodes: false,
  });

  useEffect(() => {
    let active = true;
    setLocationLoading((prev) => ({ ...prev, countries: true }));
    dropdownApi.getCountries({ limit: 100 })
      .then((options) => {
        if (!active) return;
        setLocationOptions((prev) => ({ ...prev, countries: options || [] }));
        const india = (options || []).find((option) => /india/i.test(optionLabel(option)));
        setLocationFilter((prev) => prev.countryId || !india ? prev : { ...prev, countryId: optionParentId(india) });
      })
      .catch(() => {
        if (active) setLocationOptions((prev) => ({ ...prev, countries: [] }));
      })
      .finally(() => {
        if (active) setLocationLoading((prev) => ({ ...prev, countries: false }));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!locationFilter.countryId) {
      setLocationOptions((prev) => ({ ...prev, states: [], cities: [], pincodes: [] }));
      return undefined;
    }
    let active = true;
    setLocationLoading((prev) => ({ ...prev, states: true }));
    dropdownApi.getStates(locationFilter.countryId, { limit: 100 })
      .then((options) => {
        if (active) setLocationOptions((prev) => ({ ...prev, states: options || [] }));
      })
      .catch(() => {
        if (active) setLocationOptions((prev) => ({ ...prev, states: [] }));
      })
      .finally(() => {
        if (active) setLocationLoading((prev) => ({ ...prev, states: false }));
      });
    return () => { active = false; };
  }, [locationFilter.countryId]);

  useEffect(() => {
    if (!locationFilter.stateId) {
      setLocationOptions((prev) => ({ ...prev, cities: [], pincodes: [] }));
      return undefined;
    }
    let active = true;
    setLocationLoading((prev) => ({ ...prev, cities: true }));
    dropdownApi.getCities(locationFilter.stateId, { limit: 100 })
      .then((options) => {
        if (active) setLocationOptions((prev) => ({ ...prev, cities: options || [] }));
      })
      .catch(() => {
        if (active) setLocationOptions((prev) => ({ ...prev, cities: [] }));
      })
      .finally(() => {
        if (active) setLocationLoading((prev) => ({ ...prev, cities: false }));
      });
    return () => { active = false; };
  }, [locationFilter.stateId]);

  useEffect(() => {
    if (!locationFilter.cityId) {
      setLocationOptions((prev) => ({ ...prev, pincodes: [] }));
      return undefined;
    }
    let active = true;
    setLocationLoading((prev) => ({ ...prev, pincodes: true }));
    dropdownApi.getPincodes(locationFilter.cityId, { limit: 100 })
      .then((options) => {
        if (active) setLocationOptions((prev) => ({ ...prev, pincodes: options || [] }));
      })
      .catch(() => {
        if (active) setLocationOptions((prev) => ({ ...prev, pincodes: [] }));
      })
      .finally(() => {
        if (active) setLocationLoading((prev) => ({ ...prev, pincodes: false }));
      });
    return () => { active = false; };
  }, [locationFilter.cityId]);

  const patchLocation = (key, value) => {
    setLocationFilter((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "countryId" ? { stateId: "", cityId: "" } : {}),
      ...(key === "stateId" ? { cityId: "" } : {}),
    }));
  };

  return (
    <div className="space-y-6 py-2">
      {/* Identity */}
      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Profile Identity</h4>

        {!isTemplate && !isSeller && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="admin-label">Target Seller <span className="text-red-500">*</span></label>
              <input
                className="admin-input"
                placeholder="Search seller by name, email, or business..."
                onChange={(event) => onSellerSearch?.(event.target.value)}
              />
              <select
                className="admin-input"
                value={form.sellerId || ""}
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    sellerId: event.target.value,
                    organizationId: "",
                  }));
                }}
              >
                <option value="">Select seller...</option>
                {sellerOptions.map((seller) => (
                  <option key={seller.value} value={seller.value}>
                    {seller.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="admin-label">Organization</label>
              <select
                className="admin-input"
                value={form.organizationId || ""}
                onChange={(event) => patch("organizationId", event.target.value)}
                disabled={!form.sellerId}
              >
                <option value="">Seller-wide default</option>
                {organizationOptions.map((organization) => (
                  <option key={organization.value} value={organization.value}>
                    {organization.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

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

        {needsCountry && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="admin-label">Country</label>
              <select
                className="admin-input"
                value={locationFilter.countryId}
                onChange={(event) => patchLocation("countryId", event.target.value)}
              >
                <option value="">{locationLoading.countries ? "Loading countries..." : "Select country..."}</option>
                {locationOptions.countries.map((country) => (
                  <option key={optionId(country)} value={optionParentId(country)}>
                    {optionLabel(country)}
                  </option>
                ))}
              </select>
            </div>
            {needsState && (
              <div className="space-y-1">
                <label className="admin-label">State Filter</label>
                <select
                  className="admin-input"
                  value={locationFilter.stateId}
                  onChange={(event) => patchLocation("stateId", event.target.value)}
                  disabled={!locationFilter.countryId}
                >
                  <option value="">{locationLoading.states ? "Loading states..." : "Select state..."}</option>
                  {locationOptions.states.map((state) => (
                    <option key={optionId(state)} value={optionParentId(state)}>
                      {optionLabel(state)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {needsCity && (
              <div className="space-y-1">
                <label className="admin-label">City Filter</label>
                <select
                  className="admin-input"
                  value={locationFilter.cityId}
                  onChange={(event) => patchLocation("cityId", event.target.value)}
                  disabled={!locationFilter.stateId}
                >
                  <option value="">{locationLoading.cities ? "Loading cities..." : "Select city..."}</option>
                  {locationOptions.cities.map((city) => (
                    <option key={optionId(city)} value={optionParentId(city)}>
                      {optionLabel(city)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {(mode === "selected_states" || mode === "selected_cities") && (
          <div className="space-y-1">
            <label className="admin-label">States</label>
            <OptionMultiSelect
              value={form.allowedStates}
              onChange={(v) => patch("allowedStates", v)}
              options={locationOptions.states}
              placeholder={locationFilter.countryId ? "Select states..." : "Select a country first"}
              searchPlaceholder="Search states..."
              emptyText="No states found"
              disabled={!locationFilter.countryId}
              loading={locationLoading.states}
            />
            <p className="text-xs text-gray-400">{form.allowedStates.length} state(s) selected</p>
          </div>
        )}

        {mode === "selected_cities" && (
          <div className="space-y-1">
            <label className="admin-label">Cities</label>
            <OptionMultiSelect
              value={form.allowedCities}
              onChange={(v) => patch("allowedCities", v)}
              options={locationOptions.cities}
              placeholder={locationFilter.stateId ? "Select cities..." : "Select a state filter first"}
              searchPlaceholder="Search cities..."
              emptyText="No cities found"
              disabled={!locationFilter.stateId}
              loading={locationLoading.cities}
            />
            <p className="text-xs text-gray-400">{form.allowedCities.length} city/cities selected</p>
          </div>
        )}

        {mode === "selected_pincodes" && (
          <div className="space-y-1">
            <label className="admin-label">Allowed Pincodes</label>
            <OptionMultiSelect
              value={form.allowedPincodes}
              onChange={(v) => patch("allowedPincodes", v)}
              options={locationOptions.pincodes}
              placeholder={locationFilter.cityId ? "Select allowed pincodes..." : "Select a city filter first"}
              searchPlaceholder="Search pincodes..."
              emptyText="No pincodes found"
              disabled={!locationFilter.cityId}
              loading={locationLoading.pincodes}
            />
            <p className="text-xs text-gray-400">{form.allowedPincodes.length} pincode(s) added</p>
          </div>
        )}

        {mode === "block_pincodes" && (
          <div className="space-y-1">
            <label className="admin-label">Blocked Pincodes</label>
            <OptionMultiSelect
              value={form.blockedPincodes}
              onChange={(v) => patch("blockedPincodes", v)}
              options={locationOptions.pincodes}
              placeholder={locationFilter.cityId ? "Select blocked pincodes..." : "Select a city filter first"}
              searchPlaceholder="Search pincodes..."
              emptyText="No pincodes found"
              disabled={!locationFilter.cityId}
              loading={locationLoading.pincodes}
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
          {!isTemplate && (
            <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
              <div>
                <p className="text-sm font-semibold text-gray-800">Set as Default Profile</p>
                <p className="text-xs text-gray-500">Products with no profile assigned will use this</p>
              </div>
              <input type="checkbox" className="h-4 w-4 accent-[var(--admin-blue)]" checked={Boolean(form.isDefault)} onChange={(e) => patch("isDefault", e.target.checked)} />
            </label>
          )}
          <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
            <div>
              <p className="text-sm font-semibold text-gray-800">{isTemplate ? "Published / Active" : "Active"}</p>
              <p className="text-xs text-gray-500">{isTemplate ? "Inactive templates cannot be cloned by sellers" : "Inactive profiles cannot be assigned to products"}</p>
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

const unwrapTemplates = (payload = {}) => {
  const data = payload?.data?.data || payload?.data || payload || {};
  const templates = Array.isArray(data)
    ? data
    : data.templates || data.items || data.list || [];
  return {
    list: Array.isArray(templates) ? templates : [],
    total: Number(data.total || templates.length || 0),
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
const initialLetter = (value = "") => String(value || "S").trim().charAt(0).toUpperCase() || "S";

const modeLabel = (value) =>
  SERVICEABILITY_MODES.find((mode) => mode.value === value)?.label || displayStatus(value);

const methodLabel = (value) =>
  SHIPPING_METHODS.find((method) => method.value === value)?.label || displayStatus(value);

const etaLabel = (profile = {}) => {
  const values = [profile.etaMin, profile.etaMax].filter((value) => value !== undefined && value !== null && value !== "");
  return values.length ? `${values.join("-")} days` : "N/A";
};

const coverageLabel = (profile = {}) => {
  if (profile.serviceabilityMode === "all_india") return "All locations";
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
  const navigate = useNavigate();
  const { can, isSeller } = usePermission();
  const canCreateProfile = can("delivery", ACTIONS.CREATE);
  const canUpdateProfile = can("delivery", ACTIONS.UPDATE);
  const canDeleteProfile = can("delivery", ACTIONS.DELETE);
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
  const [templateModal, setTemplateModal] = useState({ open: false, mode: "create", template: null });
  const [cloneModal, setCloneModal] = useState({ open: false, template: null });
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [cloneForm, setCloneForm] = useState({ ...EMPTY_CLONE_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [, setDeleteTemplateTarget] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedProfileIds, setSelectedProfileIds] = useState([]);
  const [sellerOptions, setSellerOptions] = useState([]);
  const [organizationOptions, setOrganizationOptions] = useState([]);
  const [formOrganizationOptions, setFormOrganizationOptions] = useState([]);
  const [cloneOrganizationOptions, setCloneOrganizationOptions] = useState([]);
  const [cloneSellerSearch, setCloneSellerSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { shippingProfilesData, shippingProfileTemplatesData } = useSelector((state) => state.delivery);
  const profilesPayload = useMemo(() => unwrapProfiles(shippingProfilesData), [shippingProfilesData]);
  const templatesPayload = useMemo(() => unwrapTemplates(shippingProfileTemplatesData), [shippingProfileTemplatesData]);

  useEffect(() => {
    const visibleIds = new Set(profilesPayload.list.map(profileId).filter(Boolean));
    setSelectedProfileIds((ids) => ids.filter((id) => visibleIds.has(id)));
  }, [profilesPayload.list]);

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

  const loadSellerOptions = useCallback((term = "") => {
    if (isSeller) return Promise.resolve([]);
    const searchTerm = term.trim();
    return dropdownApi.getSellers({
      keyWord: searchTerm,
      keyword: searchTerm,
      search: searchTerm,
      q: searchTerm,
      searchFields: "full_name,email,businessName,displayName",
      limit: 100,
    })
      .then((options) => {
        setSellerOptions(options || []);
        return options || [];
      })
      .catch(() => {
        setSellerOptions([]);
        return [];
      });
  }, [isSeller]);

  useEffect(() => {
    loadSellerOptions("");
  }, [loadSellerOptions]);

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

  useEffect(() => {
    const cloneSellerId = isSeller ? sellerSessionId : cloneForm.sellerId;
    if (!cloneModal.open || !cloneSellerId) {
      setCloneOrganizationOptions([]);
      return undefined;
    }

    let active = true;
    dropdownApi.getSellerOrganizations(cloneSellerId)
      .then((options) => {
        if (active) setCloneOrganizationOptions(options || []);
      })
      .catch(() => {
        if (active) setCloneOrganizationOptions([]);
    });
    return () => { active = false; };
  }, [cloneForm.sellerId, cloneModal.open, isSeller, sellerSessionId]);

  useEffect(() => {
    const formSellerId = isSeller ? sellerSessionId : form.sellerId;
    if (!modal.open || !formSellerId) {
      setFormOrganizationOptions([]);
      return undefined;
    }

    let active = true;
    dropdownApi.getSellerOrganizations(formSellerId)
      .then((options) => {
        if (active) setFormOrganizationOptions(options || []);
      })
      .catch(() => {
        if (active) setFormOrganizationOptions([]);
      });
    return () => { active = false; };
  }, [form.sellerId, isSeller, modal.open, sellerSessionId]);

  useEffect(() => {
    if (!cloneModal.open || isSeller) return undefined;
    const timeout = window.setTimeout(() => {
      loadSellerOptions(cloneSellerSearch);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [cloneModal.open, cloneSellerSearch, isSeller, loadSellerOptions]);

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

  const fetchTemplates = useCallback(async () => {
    try {
      await dispatch(getShippingProfileTemplates({
        limit: 100,
        offset: 0,
        ...(isSeller ? {} : { status: "published" }),
        active: true,
      })).unwrap();
    } catch {
      // Template access is non-blocking for manual profile management.
    }
  }, [dispatch, isSeller]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filterFields = useMemo(() => {
    const fields = [];
    if (!isSeller) {
      fields.push({
        key: "sellerId",
        type: "asyncDropdown",
        label: "Seller",
        width: "w-52",
        load: loadSellerOptions,
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
  }, [filters.sellerId, isSeller, loadSellerOptions, organizationOptions]);

  const sellerDetails = useCallback((row = {}) => {
    const sellerId = row.sellerId || row.seller_id || row.seller?.id || row.seller?._id;
    const option = sellerOptions.find((item) => String(item.value) === String(sellerId));
    const name = row.seller?.name || (isSeller ? sellerSessionLabel : option?.label) || shortId(sellerId);

    return {
      id: sellerId,
      name,
      email: row.seller?.email || "",
      avatarUrl: row.seller?.avatarUrl || "",
    };
  }, [isSeller, sellerOptions, sellerSessionLabel]);

  const organizationLabel = useCallback((organizationId) =>
    organizationOptions.find((option) => String(option.value) === String(organizationId))?.label || shortId(organizationId),
  [organizationOptions]);

  const openCreate = () => {
    if (!canCreateProfile) {
      toast.error("You do not have permission to create shipping profiles");
      return;
    }
    const sellerId = activeSellerId;
    if (isSeller && !sellerId) {
      toast.error("Seller session not found. Please sign in again.");
      return;
    }
    setForm({
      ...EMPTY_FORM,
      sellerId: sellerId || "",
      organizationId: activeOrganizationId || "",
    });
    setModal({ open: true, mode: "create", profile: null });
  };

  const openTemplateCreate = () => {
    setForm({ ...EMPTY_FORM, active: true });
    setTemplateModal({ open: true, mode: "create", template: null });
  };

  const openTemplateEdit = (template) => {
    setForm({
      name: template.name || "",
      description: template.description || "",
      shippingMethod: template.shippingMethod || "standard",
      serviceabilityMode: template.serviceabilityMode || "all_india",
      allowedStates: template.allowedStates || [],
      allowedCities: template.allowedCities || [],
      allowedPincodes: template.allowedPincodes || [],
      blockedPincodes: template.blockedPincodes || [],
      codAvailable: template.codAvailable !== false,
      shippingCharge: template.shippingCharge ?? 0,
      freeShippingThreshold: template.freeShippingThreshold ?? "",
      etaMin: template.etaMin ?? "",
      etaMax: template.etaMax ?? "",
      isDefault: false,
      active: template.active !== false,
    });
    setTemplateModal({ open: true, mode: "edit", template });
  };

  const openClone = (template = null) => {
    if (!canCreateProfile) {
      toast.error("You do not have permission to copy shipping templates");
      return;
    }
    const sellerId = activeSellerId;
    if (isSeller && !sellerId) {
      toast.error("Seller session not found. Please sign in again.");
      return;
    }
    setCloneSellerSearch("");
    if (!isSeller) loadSellerOptions("");
    const selectedTemplate = template || templatesPayload.list[0] || null;
    setCloneForm({
      ...EMPTY_CLONE_FORM,
      templateId: profileId(selectedTemplate || {}) || "",
      sellerId: sellerId || "",
      organizationId: activeOrganizationId || "",
      name: selectedTemplate?.name ? `${selectedTemplate.name} - Seller Copy` : "",
      description: selectedTemplate?.description || "",
      isDefault: profilesPayload.list.length === 0,
      active: true,
    });
    setCloneModal({ open: true, template: selectedTemplate });
  };

  const openEdit = (profile) => {
    if (!canUpdateProfile) {
      toast.error("You do not have permission to edit shipping profiles");
      return;
    }
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
  const closeTemplateModal = () => setTemplateModal({ open: false, mode: "create", template: null });
  const closeCloneModal = () => setCloneModal({ open: false, template: null });

  const buildPayload = () => ({
    ...form,
    sellerId: form.sellerId || activeSellerId || undefined,
    organizationId: form.organizationId || null,
    shippingCharge: form.shippingCharge !== "" ? Number(form.shippingCharge) : 0,
    freeShippingThreshold: form.freeShippingThreshold !== "" ? Number(form.freeShippingThreshold) : null,
    etaMin: form.etaMin !== "" ? Number(form.etaMin) : null,
    etaMax: form.etaMax !== "" ? Number(form.etaMax) : null,
  });

  const buildTemplatePayload = () => {
    const payload = buildPayload();
    delete payload.sellerId;
    delete payload.organizationId;
    delete payload.isDefault;
    return {
      ...payload,
      status: payload.active === false ? "draft" : "published",
    };
  };

  const handleSave = async () => {
    if (modal.mode === "create" && !canCreateProfile) {
      toast.error("You do not have permission to create shipping profiles");
      return;
    }
    if (modal.mode !== "create" && !canUpdateProfile) {
      toast.error("You do not have permission to edit shipping profiles");
      return;
    }
    if (!form.name?.trim()) { toast.error("Profile name is required"); return; }
    if (!isSeller && !(form.sellerId || activeSellerId)) { toast.error("Select a target seller"); return; }
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

  const handleTemplateSave = async () => {
    if (!form.name?.trim()) { toast.error("Template name is required"); return; }
    setSaving(true);
    try {
      if (templateModal.mode === "create") {
        await dispatch(createShippingProfileTemplate(buildTemplatePayload())).unwrap();
        toast.success("Admin shipping template created");
      } else {
        await dispatch(updateShippingProfileTemplate({
          templateId: profileId(templateModal.template),
          ...buildTemplatePayload(),
        })).unwrap();
        toast.success("Admin shipping template updated");
      }
      closeTemplateModal();
      fetchTemplates();
    } catch (err) {
      toast.error(err?.message || err || "Failed to save shipping template");
    } finally {
      setSaving(false);
    }
  };

  const handleCloneTemplate = async () => {
    if (!canCreateProfile) {
      toast.error("You do not have permission to copy shipping templates");
      return;
    }
    if (!cloneForm.templateId) { toast.error("Select an admin template to clone"); return; }
    const targetSellerId = isSeller ? activeSellerId : cloneForm.sellerId;
    const targetOrganizationId = isSeller ? activeOrganizationId : cloneForm.organizationId;
    if (!targetSellerId) { toast.error("Select a seller before cloning a template"); return; }
    setSaving(true);
    try {
      await dispatch(cloneShippingProfileTemplate({
        templateId: cloneForm.templateId,
        sellerId: targetSellerId,
        organizationId: targetOrganizationId || null,
        name: cloneForm.name || undefined,
        description: cloneForm.description || undefined,
        isDefault: Boolean(cloneForm.isDefault),
        active: cloneForm.active !== false,
      })).unwrap();
      toast.success("Template copied to seller shipping profiles");
      closeCloneModal();
      fetchProfiles();
    } catch (err) {
      toast.error(err?.message || err || "Failed to clone template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!canDeleteProfile) {
      toast.error("You do not have permission to delete shipping profiles");
      return;
    }
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

  const handleBulkDelete = async () => {
    if (!selectedProfileIds.length) return;
    if (!canDeleteProfile) {
      toast.error("You do not have permission to delete shipping profiles");
      return;
    }
    try {
      setSaving(true);
      await dispatch(bulkDeleteShippingProfiles({ profileIds: selectedProfileIds })).unwrap();
      toast.success(`${selectedProfileIds.length} shipping profile${selectedProfileIds.length > 1 ? "s" : ""} deleted`);
      setSelectedProfileIds([]);
      setBulkDeleteOpen(false);
      fetchProfiles();
    } catch (err) {
      toast.error(err?.message || err || "Failed to delete selected profiles");
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (profile) => {
    if (!canUpdateProfile) {
      toast.error("You do not have permission to update shipping profiles");
      return;
    }
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
                {row.sourceTemplateId && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Template copy v{row.sourceTemplateVersion || 1}
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
        render: (_, row) => {
          const seller = sellerDetails(row);
          return (
            <button
              type="button"
              className="group flex min-w-[160px] items-center gap-2 text-left"
              onClick={(event) => {
                event.stopPropagation();
                if (seller.id) navigate(`/app/seller/view/${seller.id}`);
              }}
              disabled={!seller.id}
              title={seller.id ? "View seller profile" : "Seller profile unavailable"}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--admin-line)] bg-[var(--admin-gold)]/10 text-xs font-bold text-[var(--admin-gold)]">
                {seller.avatarUrl ? (
                  <img src={seller.avatarUrl} alt={seller.name} className="h-full w-full object-cover" />
                ) : (
                  initialLetter(seller.name)
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[var(--admin-ink)] group-hover:text-[var(--admin-gold)]">
                  {seller.name}
                </span>
                {row.organizationId && (
                  <span className="block truncate text-xs text-[var(--admin-muted)]">
                    {organizationLabel(row.organizationId)}
                  </span>
                )}
              </span>
            </button>
          );
        },
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
  }, [isSeller, navigate, organizationLabel, sellerDetails]);

  return (
    <div>
      <PageHeader
        title="Shipping Profiles"
        subtitle={isSeller
          ? "Manage reusable delivery rules for your products."
          : "Manage reusable seller delivery configurations"}
        breadcrumbs={[{ label: isSeller ? "Shipping" : "Shipping & Fulfilment" }, { label: "Shipping Profiles" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canCreateProfile && (
              <button onClick={() => openClone()}>
                <MdLocalShipping size={17} /> Use Admin Template
              </button>
            )}
            {!isSeller && canCreateProfile && (
              <button onClick={openTemplateCreate}>
                <MdAdd size={17} /> New Template
              </button>
            )}
            {canCreateProfile && (
              <button onClick={openCreate}>
                <MdAdd size={17} /> New Profile
              </button>
            )}
          </div>
        }
      />

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--admin-ink)]">Admin Shipping Templates</h3>
            <p className="text-xs text-[var(--admin-muted)]">
              Sellers copy these templates into their own profile, then edit only their private copy. The admin template never changes.
            </p>
          </div>
          <button type="button" className="admin-btn-secondary text-xs" onClick={fetchTemplates}>
            Refresh Templates
          </button>
        </div>
        {templatesPayload.list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-[var(--admin-muted)]">
            No published templates available yet.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templatesPayload.list.slice(0, 6).map((template) => (
              <SummaryCard
                key={profileId(template)}
                title={template.name}
                description={template.description || "Reusable admin template"}
                // icon={<MdLocalShipping size={18} />}
                badge={`v${template.version || 1}`}
                titleClassName="text-[16px] leading-5"
                descriptionClassName="text-[12px] leading-[18px]"
                footer={
                  <>
                    <div className="flex flex-wrap gap-2 text-xs text-[var(--admin-muted)]">
                      <span>{methodLabel(template.shippingMethod)}</span>
                      <span>•</span>
                      <span>{modeLabel(template.serviceabilityMode)}</span>
                      <span>•</span>
                      <span>{formatMoney(template.shippingCharge)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="admin-btn-secondary text-xs" onClick={() => openClone(template)}>
                        Copy to Seller
                      </button>
                      {!isSeller && (
                        <>
                          <button type="button" className="admin-btn-secondary text-xs" onClick={() => openTemplateEdit(template)}>
                            Edit Template
                          </button>
                          <button type="button" className="text-xs font-semibold text-red-500 hover:underline" onClick={() => setDeleteTemplateTarget(template)}>
                            Archive
                          </button>
                        </>
                      )}
                    </div>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>

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
        selectable={!isSeller}
        selectedKeys={selectedProfileIds}
        onSelectionChange={setSelectedProfileIds}
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
        bulkActionBar={!isSeller && canDeleteProfile && selectedProfileIds.length ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--admin-line)] bg-white p-2 m-2 shadow-sm">
            <span className="text-sm font-semibold text-[var(--admin-ink)]">
              {selectedProfileIds.length} profile{selectedProfileIds.length > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--admin-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--admin-muted)] transition hover:border-[var(--admin-gold)] hover:text-[var(--admin-gold-dark)]"
                onClick={() => setSelectedProfileIds([])}
              >
                Clear
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <MdDeleteSweep size={17} /> Delete Selected
              </button>
            </div>
          </div>
        ) : null}
        rowActions={(row) => [
          canUpdateProfile && { label: "Edit", icon: <MdEdit size={16} />, onClick: () => openEdit(row) },
          canUpdateProfile && {
            label: "Set Default",
            icon: <MdStarBorder size={16} />,
            hidden: row.isDefault,
            onClick: () => handleSetDefault(row),
          },
          canDeleteProfile && { label: "Delete", icon: <MdDelete size={16} />, danger: true, onClick: () => setDeleteTarget(row) },
        ].filter(Boolean)}
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
        <ProfileForm
          form={form}
          setForm={setForm}
          isSeller={isSeller}
          sellerOptions={sellerOptions}
          organizationOptions={formOrganizationOptions}
          onSellerSearch={loadSellerOptions}
        />
      </DefaultModal>

      <DefaultModal
        isOpen={templateModal.open}
        onClose={closeTemplateModal}
        title={templateModal.mode === "create" ? "Create Admin Shipping Template" : `Edit Template - ${templateModal.template?.name}`}
        onSubmit={handleTemplateSave}
        submitButtonText={templateModal.mode === "create" ? "Create Template" : "Save Template"}
        closeButtonText="Cancel"
        loading={saving}
      >
        <ProfileForm form={form} setForm={setForm} isTemplate isSeller={isSeller} />
      </DefaultModal>

      <DefaultModal
        isOpen={cloneModal.open}
        onClose={closeCloneModal}
        title="Copy Admin Template"
        onSubmit={handleCloneTemplate}
        submitButtonText="Copy to Seller Profiles"
        closeButtonText="Cancel"
        loading={saving}
      >
        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            This creates a private seller profile. Editing pincodes, charge, ETA, COD, or status after copying will not change the admin template.
          </div>
          {!isSeller && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="admin-label">Target Seller</label>
                <input
                  className="admin-input"
                  value={cloneSellerSearch}
                  onChange={(event) => setCloneSellerSearch(event.target.value)}
                  placeholder="Search seller by name, email, or business..."
                />
                <select
                  className="admin-input"
                  value={cloneForm.sellerId}
                  onChange={(event) => setCloneForm((prev) => ({
                    ...prev,
                    sellerId: event.target.value,
                    organizationId: "",
                  }))}
                >
                  <option value="">Select seller...</option>
                  {sellerOptions.map((seller) => (
                    <option key={seller.value} value={seller.value}>
                      {seller.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--admin-muted)]">
                  This is the seller who will receive the private copy.
                </p>
              </div>
              <div className="space-y-1">
                <label className="admin-label">Organization</label>
                <select
                  className="admin-input"
                  value={cloneForm.organizationId}
                  onChange={(event) => setCloneForm((prev) => ({
                    ...prev,
                    organizationId: event.target.value,
                  }))}
                  disabled={!cloneForm.sellerId}
                >
                  <option value="">Seller-wide default</option>
                  {cloneOrganizationOptions.map((organization) => (
                    <option key={organization.value} value={organization.value}>
                      {organization.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <label className="admin-label">Admin Template</label>
            <select
              className="admin-input"
              value={cloneForm.templateId}
              onChange={(event) => {
                const nextTemplate = templatesPayload.list.find((template) => profileId(template) === event.target.value);
                setCloneForm((prev) => ({
                  ...prev,
                  templateId: event.target.value,
                  name: nextTemplate?.name ? `${nextTemplate.name} - Seller Copy` : prev.name,
                  description: nextTemplate?.description || prev.description,
                }));
              }}
            >
              <option value="">Select template…</option>
              {templatesPayload.list.map((template) => (
                <option key={profileId(template)} value={profileId(template)}>
                  {template.name} · v{template.version || 1}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="admin-label">Seller Copy Name</label>
            <input
              className="admin-input"
              value={cloneForm.name}
              onChange={(event) => setCloneForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="e.g. Standard Shipping - Delhi NCR"
            />
          </div>
          <div className="space-y-1">
            <label className="admin-label">Copy Description</label>
            <input
              className="admin-input"
              value={cloneForm.description}
              onChange={(event) => setCloneForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Optional"
            />
          </div>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-gray-800">Set as Default</p>
              <p className="text-xs text-gray-500">Use for products without a specific profile in this seller/org.</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--admin-blue)]"
              checked={Boolean(cloneForm.isDefault)}
              onChange={(event) => setCloneForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
            />
          </label>
        </div>
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

      <ConfirmModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Shipping Profiles"
        message={`Are you sure you want to delete ${selectedProfileIds.length} selected shipping profile${selectedProfileIds.length > 1 ? "s" : ""}? Products using these profiles will fall back to seller charge settings.`}
        confirmLabel="Delete Selected"
        variant="danger"
        loading={saving}
      />
    </div>
  );
}
