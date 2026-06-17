import { useCallback, useState } from "react";

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;
export const LOW_STOCK_THRESHOLD_STORAGE_KEY = "admin.inventory.lowStockThreshold";

export const normalizeLowStockThreshold = (value) => {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue) || nextValue < 1) {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
  return Math.floor(nextValue);
};

export const getSavedLowStockThreshold = () => {
  if (typeof window === "undefined") return DEFAULT_LOW_STOCK_THRESHOLD;
  try {
    return normalizeLowStockThreshold(
      window.localStorage.getItem(LOW_STOCK_THRESHOLD_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }
};

export const getAvailableStock = (row = {}) =>
  Number(row.stock ?? 0) - Number(row.reserved ?? row.reservedStock ?? 0);

export const getInventoryStatus = (
  row = {},
  threshold = DEFAULT_LOW_STOCK_THRESHOLD,
) => {
  const available = getAvailableStock(row);
  if (available <= 0) return "out_of_stock";
  if (available < normalizeLowStockThreshold(threshold)) return "low_stock";
  return "in_stock";
};

export const getStockTextClass = (
  value,
  threshold = DEFAULT_LOW_STOCK_THRESHOLD,
) => {
  const stockValue = Number(value || 0);
  if (stockValue <= 0) return "text-red-600";
  if (stockValue < normalizeLowStockThreshold(threshold)) return "text-red-600";
  return "text-green-600";
};

export const useLowStockThreshold = () => {
  const [lowStockThreshold, setLowStockThresholdState] = useState(
    getSavedLowStockThreshold,
  );

  const setLowStockThreshold = useCallback((value) => {
    const nextValue = normalizeLowStockThreshold(value);
    setLowStockThresholdState(nextValue);
    try {
      window.localStorage.setItem(
        LOW_STOCK_THRESHOLD_STORAGE_KEY,
        String(nextValue),
      );
    } catch {
      // localStorage can be blocked; the in-memory value still updates.
    }
  }, []);

  const resetLowStockThreshold = useCallback(() => {
    setLowStockThresholdState(DEFAULT_LOW_STOCK_THRESHOLD);
    try {
      window.localStorage.removeItem(LOW_STOCK_THRESHOLD_STORAGE_KEY);
    } catch {
      // localStorage can be blocked; the in-memory value still resets.
    }
  }, []);

  return {
    lowStockThreshold,
    setLowStockThreshold,
    resetLowStockThreshold,
  };
};
