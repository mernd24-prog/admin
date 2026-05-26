import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export const useTableFilters = ({
  initialFilters = {},
  syncQuery = true,
  debounce = 300,
  onChange,
} = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryValues = useMemo(() => {
    if (!syncQuery) return {};
    return Object.keys(initialFilters).reduce((values, key) => {
      const value = searchParams.get(key);
      return value === null ? values : { ...values, [key]: value };
    }, {});
  }, [initialFilters, searchParams, syncQuery]);
  const [filters, setFilters] = useState({ ...initialFilters, ...queryValues });

  useEffect(() => {
    const timer = setTimeout(() => onChange?.(filters), debounce);
    return () => clearTimeout(timer);
  }, [debounce, filters, onChange]);

  useEffect(() => {
    if (!syncQuery) return;
    const next = new URLSearchParams(searchParams);
    Object.entries(filters).forEach(([key, value]) => {
      const normalized = typeof value === "object" ? value?.value : value;
      if (normalized === "" || normalized === undefined || normalized === null) next.delete(key);
      else next.set(key, String(normalized));
    });
    setSearchParams(next, { replace: true });
    // Search params are intentionally updated only when local filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, setSearchParams, syncQuery]);

  const setFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);
  const resetFilters = useCallback(() => setFilters(initialFilters), [initialFilters]);
  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    const initial = initialFilters[key];
    const normalized = typeof value === "object" ? value?.value : value;
    const initialNormalized = typeof initial === "object" ? initial?.value : initial;
    return normalized !== "" && normalized !== initialNormalized;
  });

  return { filters, setFilters, setFilter, resetFilters, activeFilters };
};

export default useTableFilters;
