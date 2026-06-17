import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
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
    <div ref={containerRef} className={`flex flex-col gap-0.5 ${field.width || 'w-52'} relative`}>
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
            <MdClear size={14} className="text-gray-400 hover:text-red-500" onClick={clear} />
          )}
          <MdArrowDropDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
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

  if (field.type === 'asyncDropdown') {
    return <AsyncDropdownFilter field={field} value={value} onChange={onChange} />;
  }

  if (field.type === 'select') {
    return (
      <div className={`flex flex-col gap-0.5 ${field.width || 'w-36'}`}>
        {field.label && (
          <label htmlFor={id} className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-0.5">
            {field.label}
          </label>
        )}
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="admin-input text-sm py-1.5"
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
      <div className={`flex flex-col gap-0.5 ${field.width || 'w-44'}`}>
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
            className={`admin-input text-sm py-1.5 ${field.type === 'search' ? 'pl-7' : ''}`}
          />
        </div>
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div className={`flex flex-col gap-0.5 ${field.width || 'w-36'}`}>
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
          className="admin-input text-sm py-1.5"
        />
      </div>
    );
  }

  if (field.type === 'daterange') {
    return (
      <div className={`flex flex-col gap-0.5 ${field.width || 'w-auto'}`}>
        {field.label && (
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-0.5">
            {field.label}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={value?.startDate ?? ''}
            onChange={(e) =>
              onChange(field.key, { ...value, startDate: e.target.value })
            }
            placeholder="From"
            className="admin-input text-sm py-1.5 w-32"
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
            className="admin-input text-sm py-1.5 w-32"
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
  values = {},
  onChange,
  onClear,
  loading = false,
  activeCount = 0,
}) => {
  if (!filters.length) return null;

  return (
    <div className="flex flex-wrap items-end gap-3 px-4 py-3 bg-[var(--admin-surface-soft)] border-b border-[var(--admin-line)]">
      <div className="flex items-center gap-1.5 text-[var(--admin-muted)] self-end pb-1.5">
        <MdFilterList size={16} />
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-[var(--admin-gold)] text-[var(--admin-navy)] rounded-full">
            {activeCount}
          </span>
        )}
      </div>

      {filters.map((field) => (
        <FilterField
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={onChange}
        />
      ))}

      {activeCount > 0 && onClear && (
        <button
          type="button"
          onClick={onClear}
          disabled={loading}
          className="self-end mb-0.5 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 whitespace-nowrap"
        >
          <MdClose size={13} />
          Clear filters
        </button>
      )}
    </div>
  );
};

export default FilterBar;
