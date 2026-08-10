import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MdFilterList,
  MdClose,
  MdSearch,
  MdArrowDropDown,
  MdClear,
} from "react-icons/md";
import FilterSelect from "../Atoms/FilterSelect/FilterSelect";
import DateRangePickerModal from "./DateRangePickerModal";

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
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const debounceRef = useRef(null);

  const loadOptions = useCallback(
    async (search) => {
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
    },
    [field],
  );

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
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (opt) => {
    onChange(field.key, opt.value);
    setSelectedLabel(opt.label);
    setOpen(false);
    setQuery("");
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange(field.key, "");
    setSelectedLabel("");
    setQuery("");
  };

  const displayText = value
    ? selectedLabel || value
    : field.placeholder || `All ${field.label || ""}`;
  const hasValue = !!value;

  return (
    <div
      ref={containerRef}
      className="relative flex min-w-0 flex-col gap-1 w-full"
    >
      {field.label && (
        <label
          htmlFor={id}
          className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-0.5"
        >
          {field.label}
        </label>
      )}
      <button
        id={id}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`admin-input text-sm py-1.5 flex items-center justify-between gap-1 text-left ${hasValue ? "text-gray-800" : "text-gray-400"}`}
      >
        <span className="truncate">{displayText}</span>
        <span className="flex items-center gap-0.5 shrink-0">
          {hasValue && (
            <MdClear
              size={14}
              className="text-gray-400 hover:text-red-500"
              onClick={clear}
              role="button"
              aria-label={`Clear ${field.label || field.key}`}
            />
          )}
          <MdArrowDropDown
            size={16}
            className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <MdSearch
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
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
              <div className="px-3 py-2 text-xs text-gray-400 text-center">
                Loading…
              </div>
            )}
            {!loading && options.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">
                No results
              </div>
            )}
            {!loading &&
              options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => select(opt)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${String(value) === String(opt.value) ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}
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

const RANGE_PAIRS = [
  ["fromDate", "toDate"],
  ["startDate", "endDate"],
  ["dateFrom", "dateTo"],
];
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
});

const normalizeKey = (key = "") => String(key).trim().toLowerCase();

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseInputDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const addMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount, 1);
  return next;
};

const buildCalendarDays = (viewDate) => {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      value: toInputDate(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === viewDate.getMonth(),
    };
  });
};

const isBetweenDates = (value, start, end) =>
  Boolean(start && end && value >= start && value <= end);

const formatDateLabel = (value) => {
  if (!value) return "";
  const date = parseInputDate(value);
  if (!date || Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const isDateRangeStart = (field, nextField) => {
  if (
    !field ||
    !nextField ||
    field.type !== "date" ||
    nextField.type !== "date"
  ) {
    return null;
  }

  return (
    RANGE_PAIRS.find(
      ([startKey, endKey]) =>
        normalizeKey(field.key) === normalizeKey(startKey) &&
        normalizeKey(nextField.key) === normalizeKey(endKey),
    ) || null
  );
};

const resolveDateRangeLabel = (startField = {}, endField = {}) => {
  if (startField.rangeLabel) return startField.rangeLabel;
  if (endField.rangeLabel) return endField.rangeLabel;

  const labels = [startField.label, endField.label]
    .filter(Boolean)
    .map((label) => String(label).trim().toLowerCase());

  if (
    labels.length === 2 &&
    labels.some((label) => ["from", "from date"].includes(label)) &&
    labels.some((label) => ["to", "to date"].includes(label))
  ) {
    return "Date Range";
  }

  return startField.label && endField.label
    ? `${startField.label} - ${endField.label}`
    : "Date Range";
};

const GoldDateRangeCalendar = ({
  dates,
  viewDate,
  onViewDateChange,
  onSelectDate,
  onApply,
  onCancel,
  onClear,
  onToday,
  loading,
  maxDate,
}) => {
  const days = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const hasCompleteRange = Boolean(dates.fromDate && dates.toDate);

  return (
    <div className="w-full rounded-lg border border-[var(--admin-gold)] bg-white p-3 shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded border border-[var(--admin-gold)] bg-[#fff8e6] text-sm font-bold text-[var(--admin-gold-dark)] hover:bg-[#fff3cc]"
          onClick={() => onViewDateChange(addMonths(viewDate, -1))}
          disabled={loading}
          aria-label="Previous month"
        >
          ‹
        </button>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-2">
            {/* Month dropdown */}
            <FilterSelect
              className="w-[130px]"
              options={[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((month, index) => ({ value: index, label: month }))}
              value={{
                value: viewDate.getMonth(),
                label: [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ][viewDate.getMonth()],
              }}
              onChange={(selected) => {
                if (!selected) return;
                const nextDate = new Date(viewDate);
                nextDate.setDate(1);
                nextDate.setMonth(Number(selected.value));
                onViewDateChange(nextDate);
              }}
              isDisabled={loading}
              isSearchable={false}
              placeholder="Month"
            />

            {/* Year dropdown */}
            <FilterSelect
              className="w-[90px]"
              options={Array.from({ length: 21 }, (_, index) => {
                const year = new Date().getFullYear() - 10 + index;
                return { value: year, label: String(year) };
              })}
              value={{
                value: viewDate.getFullYear(),
                label: String(viewDate.getFullYear()),
              }}
              onChange={(selected) => {
                if (!selected) return;
                const nextDate = new Date(viewDate);
                nextDate.setDate(1);
                nextDate.setFullYear(Number(selected.value));
                onViewDateChange(nextDate);
              }}
              isDisabled={loading}
              isSearchable={false}
              placeholder="Year"
            />
          </div>

          <p className="text-[11px] font-medium text-[var(--admin-muted)]">
            Select start and end date
          </p>
        </div>

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded border border-[var(--admin-gold)] bg-[#fff8e6] text-sm font-bold text-[var(--admin-gold-dark)] hover:bg-[#fff3cc]"
          onClick={() => onViewDateChange(addMonths(viewDate, 1))}
          disabled={loading}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-[var(--admin-muted)]">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isStart = day.value === dates.fromDate;
          const isEnd = day.value === dates.toDate;
          const isSelected = isStart || isEnd;
          const isInRange = isBetweenDates(
            day.value,
            dates.fromDate,
            dates.toDate,
          );
          const isDisabled = Boolean(maxDate && day.value > maxDate);
          return (
            <button
              key={day.value}
              type="button"
              className={`flex h-9 items-center justify-center rounded text-xs font-semibold transition ${
                isSelected
                  ? "bg-[var(--admin-gold)] text-white shadow-sm"
                  : isInRange
                    ? "bg-[#fff3cc] text-[var(--admin-gold-dark)]"
                    : day.isCurrentMonth
                      ? "text-[var(--admin-ink)] hover:bg-[#fff8e6] hover:text-[var(--admin-gold-dark)]"
                      : "text-slate-300 hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:bg-transparent disabled:text-slate-200 disabled:shadow-none`}
              onClick={() => onSelectDate(day.value)}
              disabled={loading || isDisabled}
            >
              {day.day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded border border-[#f1dfad] bg-[#fffaf0] px-3 py-2 text-[11px] font-semibold text-[var(--admin-gold-dark)]">
        {dates.fromDate ? formatDateLabel(dates.fromDate) : "Start date"} -{" "}
        {dates.toDate ? formatDateLabel(dates.toDate) : "End date"}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex min-h-8 items-center justify-center rounded border border-[var(--admin-gold)] bg-[#fff8e6] px-3 text-xs font-semibold text-[var(--admin-gold-dark)] transition hover:bg-[#fff3cc] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onToday}
            disabled={loading}
          >
            Today
          </button>
          <button
            type="button"
            className="inline-flex min-h-8 items-center justify-center rounded border border-red-100 bg-white px-3 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClear}
            disabled={loading || (!dates.fromDate && !dates.toDate)}
          >
            Clear
          </button>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="inline-flex min-h-8 items-center justify-center rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex min-h-8 min-w-[86px] items-center justify-center rounded border border-[var(--admin-gold)] bg-[#fff8e6] px-3 text-xs font-semibold text-[var(--admin-gold-dark)] transition hover:bg-[#fff3cc] focus:outline-none focus:ring-2 focus:ring-[var(--admin-gold)] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={!hasCompleteRange || loading}
            onClick={onApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export const DateRangeFilter = ({ field, value, onChange, values }) => {
  const id = useId();
  const startKey = field.startKey || "startDate";
  const endKey = field.endKey || "endDate";
  const startValue = values?.[startKey] ?? value?.startDate ?? "";
  const endValue = values?.[endKey] ?? value?.endDate ?? "";
  const today = new Date().toISOString().split("T")[0];
  const maxDate = field.disableFuture ? today : field.maxDate;
  const [open, setOpen] = useState(false);
  const [draftDates, setDraftDates] = useState({
    fromDate: startValue,
    toDate: endValue,
  });
  const [viewDate, setViewDate] = useState(
    () => parseInputDate(startValue) || new Date(),
  );

  useEffect(() => {
    if (open) return;
    setDraftDates({ fromDate: startValue, toDate: endValue });
  }, [endValue, open, startValue]);

  const displayLabel =
    startValue && endValue
      ? `${formatDateLabel(startValue)} - ${formatDateLabel(endValue)}`
      : field.placeholder || `All ${field.label || "Date Range"}`;

  const applyRange = () => {
    if (!draftDates.fromDate || !draftDates.toDate) return;
    const nextDates =
      draftDates.fromDate <= draftDates.toDate
        ? draftDates
        : { fromDate: draftDates.toDate, toDate: draftDates.fromDate };
    onChange(startKey, nextDates.fromDate);
    onChange(endKey, nextDates.toDate);
    setOpen(false);
  };

  const clearRange = () => {
    setDraftDates({ fromDate: "", toDate: "" });
    onChange(startKey, "");
    onChange(endKey, "");
    setOpen(false);
  };

  const selectToday = () => {
    const todayValue = toInputDate(new Date());
    setDraftDates({ fromDate: todayValue, toDate: todayValue });
    setViewDate(new Date());
  };

  const selectDate = (valueToSelect) => {
    const selectedDate = parseInputDate(valueToSelect);
    if (!selectedDate) return;
    setViewDate(selectedDate);
    setDraftDates((current) => {
      if (!current.fromDate || current.toDate) {
        return { fromDate: valueToSelect, toDate: "" };
      }
      if (valueToSelect < current.fromDate) {
        return { fromDate: valueToSelect, toDate: current.fromDate };
      }
      return { ...current, toDate: valueToSelect };
    });
  };

  const openPicker = () => {
    setDraftDates({ fromDate: startValue, toDate: endValue });
    setViewDate(parseInputDate(startValue || endValue) || new Date());
    setOpen(true);
  };

  return (
    <div
      className={`flex min-w-[250px] flex-col gap-1 ${
        field.wrapperClassName || ""
      } ${field.width || "w-full"}`}
    >
      {field.label && (
        <label
          htmlFor={id}
          className={
            field.labelClassName ||
            "px-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400"
          }
        >
          {field.label}
        </label>
      )}

      <button
        id={id}
        type="button"
        onClick={openPicker}
        className={`admin-input !flex !h-9 w-full items-center justify-between gap-2 !py-0 text-left !text-[13px] !leading-none ${
          field.inputClassName || ""
        } ${
          startValue && endValue ? "text-[var(--admin-ink)]" : "text-gray-400"
        }`}
      >
        <span className="whitespace-nowrap">{displayLabel}</span>
        <MdArrowDropDown size={16} className="shrink-0 text-gray-400" />
      </button>

      <DateRangePickerModal
        open={open}
        onClose={() => setOpen(false)}
        title="Select Date Range"
        subtitle="Filter data will update after apply."
      >
        <GoldDateRangeCalendar
          dates={draftDates}
          viewDate={viewDate}
          onViewDateChange={setViewDate}
          onSelectDate={selectDate}
          onApply={applyRange}
          onCancel={() => setOpen(false)}
          onClear={clearRange}
          onToday={selectToday}
          maxDate={maxDate}
        />
      </DateRangePickerModal>
    </div>
  );
};

/* ─────────────── FilterField ─────────────── */
const FilterField = ({ field, value, onChange, values }) => {
  const id = useId();
  const wrapperClass = "flex min-w-0 flex-col gap-1 w-full";

  if (field.type === "asyncDropdown") {
    return (
      <AsyncDropdownFilter field={field} value={value} onChange={onChange} />
    );
  }

  if (field.type === "select") {
    const selectedOption =
      (field.options || []).find(
        (opt) => String(opt.value) === String(value),
      ) || null;

    return (
      <div className={wrapperClass}>
        {field.label && (
          <label
            htmlFor={id}
            className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-0.5"
          >
            {field.label}
          </label>
        )}
        <FilterSelect
          options={field.options || []}
          value={selectedOption}
          onChange={(opt) => onChange(field.key, opt ? opt.value : "")}
          placeholder={field.placeholder || `All ${field.label || ""}`}
          isSearchable={field.isSearchable ?? true}
          isClearable={true}
          inputId={id}
          className="!mb-0"
        />
      </div>
    );
  }

  if (field.type === "text" || field.type === "search") {
    return (
      <div className={wrapperClass}>
        {field.label && (
          <label
            htmlFor={id}
            className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-0.5"
          >
            {field.label}
          </label>
        )}
        <div className="relative">
          {field.type === "search" && (
            <MdSearch
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted)]"
            />
          )}
          <input
            id={id}
            type="text"
            value={value ?? ""}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder || `Search ${field.label}…`}
            className={`admin-input min-h-9 w-full text-sm ${field.type === "search" ? "!pl-9" : ""}`}
          />
        </div>
      </div>
    );
  }

  if (field.type === "date") {
    const today = new Date().toISOString().split("T")[0];
    const maxDate = field.maxDate ?? today;
    const isEndDate = field.key === "endDate" || field.key === "toDate";
    const minDate =
      isEndDate && values?.fromDate ? values.fromDate : field.minDate;
    return (
      <div className={wrapperClass}>
        {field.label && (
          <label
            htmlFor={id}
            className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-0.5"
          >
            {field.label}
          </label>
        )}
        <input
          id={id}
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          min={minDate}
          max={maxDate}
          className="admin-input min-h-9 w-full text-sm"
        />
      </div>
    );
  }

  if (field.type === "daterange") {
    return (
      <DateRangeFilter
        field={field}
        value={value}
        onChange={onChange}
        values={values}
      />
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
    () => (filters.length ? filters : fields || []),
    [fields, filters],
  );
  const resolvedValues = listPage?.filters || values || {};
  const resolvedOnChange = onChange || listPage?.setFilter;
  const resolvedOnClear = useCallback(() => {
    if (onClear) {
      onClear();
    } else {
      listPage?.clearFilters?.();
    }
    listPage?.clearSearch?.();
  }, [listPage, onClear]);
  // const resolvedActiveCount = activeCount || listPage?.activeFilterCount || 0;

  const normalizedFilters = useMemo(() => {
    const nextFilters = [];

    for (let index = 0; index < resolvedFilters.length; index += 1) {
      const field = resolvedFilters[index];
      const nextField = resolvedFilters[index + 1];
      const rangePair = isDateRangeStart(field, nextField);

      if (rangePair) {
        const [startKey, endKey] = rangePair;
        nextFilters.push({
          ...field,
          key: `${startKey}__${endKey}`,
          type: "daterange",
          label: resolveDateRangeLabel(field, nextField),
          startKey: field.key || startKey,
          endKey: nextField.key || endKey,
          minDate: field.minDate,
          maxDate: nextField.maxDate ?? field.maxDate,
          disableFuture: field.disableFuture ?? nextField.disableFuture ?? true,
          width:
            field.rangeWidth ||
            nextField.rangeWidth ||
            field.width ||
            nextField.width ||
            "w-full",
        });
        index += 1;
        continue;
      }

      if (field.type !== "date") {
        nextFilters.push(field);
        continue;
      }
      const lowerKey = String(field.key || "").toLowerCase();
      if (lowerKey === "from" || lowerKey === "startdate") {
        nextFilters.push({ ...field, key: "startDate" });
        continue;
      }
      if (lowerKey === "to" || lowerKey === "enddate") {
        nextFilters.push({ ...field, key: "endDate" });
        continue;
      }
      nextFilters.push(field);
    }

    return nextFilters;
  }, [resolvedFilters]);

  const resolvedActiveCount = useMemo(() => {
    return normalizedFilters.reduce((count, field) => {
      if (field.type === "daterange") {
        const startValue = resolvedValues[field.startKey];
        const endValue = resolvedValues[field.endKey];

        // From Date + To Date count as one filter
        if (startValue || endValue) {
          return count + 1;
        }

        return count;
      }

      const value = resolvedValues[field.key];

      if (
        value !== "" &&
        value !== null &&
        value !== undefined &&
        (!Array.isArray(value) || value.length > 0)
      ) {
        return count + 1;
      }

      return count;
    }, 0);
  }, [normalizedFilters, resolvedValues]);

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

      <div className="grid  grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {normalizedFilters.map((field) => (
          <FilterField
            key={field.key}
            field={field}
            value={resolvedValues[field.key]}
            values={resolvedValues}
            onChange={resolvedOnChange}
          />
        ))}
      </div>
    </div>
  );
};

export default FilterBar;
