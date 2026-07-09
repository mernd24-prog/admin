import React, { useEffect, useRef, useState } from "react";
import { MdCheckCircle } from "react-icons/md";
import { dropdownApi } from "../../_helpers/dropdownApi";

const optionLabel = (item = {}) =>
  item.label || item.name || item.title || item.zipCode || item.pincode || item.code || String(item.value || "");

const optionValue = (item = {}) =>
  String(item.rawValue || item.zipCode || item.pincode || item.name || item.label || item.value || item.id || item._id || "").trim();

const optionParentId = (item = {}) => item.id || item._id || item.value || "";
const normalizeSelectedValues = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
};

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

  const selectedValues = normalizeSelectedValues(value);
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

const Field = ({ label, children, hint }) => (
  <label className="block space-y-1">
    <span className="admin-label">{label}</span>
    {children}
    {hint ? <span className="block text-xs text-gray-500">{hint}</span> : null}
  </label>
);

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

export default LocationValueSelector;
