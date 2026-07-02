import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { MdFilterList, MdClose, MdSearch, MdArrowDropDown, MdClear } from 'react-icons/md';

/**
 * FilterBar
 *
 * FilterField shape:
 *   {
 *     key:         string,
 *     type:        "select" | "text" | "date" | "daterange" | "search" | "asyncDropdown",
 *     label:       string,
 *     placeholder? string,
 *     options?:    { value: string, label: string }[],   — for "select"
 *     load?:       (search: string) => Promise<{value,label}[]>,  — for "asyncDropdown"
 *     width?:      string,
 *   }
 */

/* ─────────────── AsyncDropdown ─────────────── */
const AsyncDropdownFilter = ({ field, value, onChange }) => {
  const id = useId();
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const debounceRef = useRef(null);

  const loadOptions = useCallback(async (search) => {
    if (!field.load) return;
    setLoading(true);
    try {
      const result = await field.load(search);
      setOptions(Array.isArray(result) ? result : []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [field]);

  // Load initial options when dropdown opens
  useEffect(() => {
    if (open) {
      loadOptions(query);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadOptions(q), 300);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (opt) => {
    onChange(field.key, opt.value);
    setSelectedLabel(opt.label);
    setOpen(false);
    setQuery('');
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange(field.key, '');
    setSelectedLabel('');
    setQuery('');
  };

  const displayText = value ? (selectedLabel || value) : (field.placeholder || `All ${field.label || ''}`);
  const hasValue = !!value;

  return (
    <div ref={containerRef} className= "relative flex min-w-0 flex-col gap-1 w-full">
      {field.label && (
        <label htmlFor={id} className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-0.5">
          {field.label}
        </label>
      )}
      <button
        id={id}
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) setTimeout(() => inputRef.current?.focus(), 50); }}
        className={`admin-input text-sm py-1.5 flex items-center justify-between gap-1 text-left ${hasValue ? 'text-gray-800' : 'text-gray-400'}`}
      >
        <span className="truncate">{displayText}</span>
        <span className="flex items-center gap-0.5 shrink-0">
          {hasValue && (
            <MdClear size={14} className="text-gray-400 hover:text-red-500" onClick={clear} role="button" aria-label={`Clear ${field.label || field.key}`} />
          )}
          <MdArrowDropDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <MdSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="Type to search…"
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-[var(--admin-navy)]"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loading && (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">Loading…</div>
            )}
            {!loading && options.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">No results</div>
            )}
            {!loading && options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => select(opt)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${String(value) === String(opt.value) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────── FilterField ─────────────── */
const FilterField = ({ field, value, onChange }) => {
  const id = useId();
  const wrapperClass = "flex min-w-0 flex-col gap-1 w-full";

  if (field.type === 'asyncDropdown') {
    return <AsyncDropdownFilter field={field} value={value} onChange={onChange} />;
  }

  if (field.type === 'select') {
    return (
      <div className={wrapperClass}>
        {field.label && (
          <label htmlFor={id} className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-0.5">
            {field.label}
          </label>
        )}
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="admin-input min-h-9 w-full text-sm"
        >
          <option value="">{field.placeholder || `All ${field.label}`}</option>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'text' || field.type === 'search') {
    return (
      <div className={wrapperClass}>
        {field.label && (
          <label htmlFor={id} className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-0.5">
            {field.label}
          </label>
        )}
        <div className="relative">
          {field.type === 'search' && (
            <MdSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-muted)] pointer-events-none" />
          )}
          <input
            id={id}
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder || `Search ${field.label}…`}
            className={`admin-input min-h-9 w-full text-sm ${field.type === 'search' ? 'pl-7' : ''}`}
          />
        </div>
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div className={wrapperClass}>
        {field.label && (
          <label htmlFor={id} className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-0.5">
            {field.label}
          </label>
        )}
        <input
          id={id}
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="admin-input min-h-9 w-full text-sm"
        />
      </div>
    );
  }

  if (field.type === 'daterange') {
    return (
      <div className={`flex min-w-0 flex-col gap-1 ${field.width || 'w-full sm:col-span-2 lg:col-span-2'}`}>
        {field.label && (
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-0.5">
            {field.label}
          </span>
        )}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
          <input
            type="date"
            value={value?.startDate ?? ''}
            onChange={(e) =>
              onChange(field.key, { ...value, startDate: e.target.value })
            }
            placeholder="From"
            className="admin-input min-h-9 w-full text-sm"
          />
          <span className="text-gray-400 text-xs">–</span>
          <input
            type="date"
            value={value?.endDate ?? ''}
            min={value?.startDate || undefined}
            onChange={(e) =>
              onChange(field.key, { ...value, endDate: e.target.value })
            }
            placeholder="To"
            className="admin-input min-h-9 w-full text-sm"
          />
        </div>
      </div>
    );
  }

  return null;
};

/* ─────────────── FilterBar ─────────────── */
const FilterBar = ({
  filters = [],
  fields,
  values = {},
  onChange,
  onClear,
  loading = false,
  activeCount = 0,
  listPage,
}) => {
  const resolvedFilters = useMemo(
    () => (filters.length ? filters : (fields || [])),
    [fields, filters],
  );
  const resolvedValues = listPage?.filters || values || {};
  const resolvedOnChange = onChange || listPage?.setFilter;
  const resolvedOnClear = onClear || listPage?.clearFilters;
  const resolvedActiveCount = activeCount || listPage?.activeFilterCount || 0;

  const normalizedFilters = useMemo(
    () =>
      resolvedFilters.map((field) => {
        if (field.type !== 'date') return field;
        const lowerKey = String(field.key || '').toLowerCase();
        if (lowerKey === 'from' || lowerKey === 'startdate') {
          return { ...field, key: 'startDate' };
        }
        if (lowerKey === 'to' || lowerKey === 'enddate') {
          return { ...field, key: 'endDate' };
        }
        return field;
      }),
    [resolvedFilters],
  );

  if (!normalizedFilters.length) return null;

  return (
    <div className="border-b border-[var(--admin-line)] bg-[#FFFDF8] px-3 py-3 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          <MdFilterList size={16} />
          Filters
          {resolvedActiveCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--admin-gold)] px-1.5 text-[10px] font-bold text-[var(--admin-navy)]">
              {resolvedActiveCount}
            </span>
          )}
        </div>

        {resolvedActiveCount > 0 && resolvedOnClear && (
          <button
            type="button"
            onClick={resolvedOnClear}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-md border border-red-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
          >
            <MdClose size={13} />
            Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {normalizedFilters.map((field) => (
          <FilterField
            key={field.key}
            field={field}
            value={resolvedValues[field.key]}
            onChange={resolvedOnChange}
          />
        ))}
      </div>
    </div>
  );
};

export default FilterBar;
