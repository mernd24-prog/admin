import React, { useId } from 'react';
import { MdFilterList, MdClose, MdSearch } from 'react-icons/md';

/**
 * FilterBar
 *
 * A consistent horizontal filter strip used on all list pages.
 * Works standalone or embedded inside DataTable via the `filterBar` prop.
 *
 * Props:
 *   filters      {FilterField[]}   — filter field definitions
 *   values       {object}          — current filter values { [key]: value }
 *   onChange     {(key, value) => void}
 *   onClear      {() => void}
 *   loading      {boolean}
 *   activeCount  {number}          — how many filters are non-empty (badge)
 *
 * FilterField shape:
 *   {
 *     key:         string,
 *     type:        "select" | "text" | "date" | "daterange" | "search",
 *     label:       string,
 *     placeholder? string,
 *     options?:    { value: string, label: string }[],    — for "select"
 *     width?:      string,    — Tailwind width class, e.g. "w-40"
 *   }
 */

const FilterField = ({ field, value, onChange }) => {
  const id = useId();

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
            <MdSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
    <div className="flex flex-wrap items-end gap-3 px-4 py-3 bg-gray-50/70 border-b border-gray-100">
      {/* Icon */}
      <div className="flex items-center gap-1.5 text-gray-400 self-end pb-1.5">
        <MdFilterList size={16} />
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-[#989AFF] text-white rounded-full">
            {activeCount}
          </span>
        )}
      </div>

      {/* Fields */}
      {filters.map((field) => (
        <FilterField
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={onChange}
        />
      ))}

      {/* Clear */}
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
