import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";


/**
 * useListPage
 *
 * Encapsulates all state and handlers for an admin list page so each page
 * doesn't re-implement the same boilerplate.
 *
 * Covers:
 *   - search (with debounce)
 *   - filters (arbitrary key/value map)
 *   - sort (key + direction)
 *   - pagination (page + pageSize)
 *   - row selection (for bulk actions)
 *   - active filter count (for FilterBar badge)
 *
 * Usage:
 *   const list = useListPage({ defaultPageSize: 20, defaultSortKey: 'createdAt' });
 *
 *   // Pass to DataTable:
 *   <DataTable
 *     page={list.page}
 *     pageSize={list.pageSize}
 *     onPageChange={list.setPage}
 *     onPageSizeChange={list.setPageSize}
 *     onSearch={list.setSearch}
 *     onSort={list.setSort}
 *     sortKey={list.sortKey}
 *     sortDir={list.sortDir}
 *     selectable
 *     selectedKeys={list.selectedKeys}
 *     onSelectionChange={list.setSelectedKeys}
 *     filterBar={<FilterBar filters={...} values={list.filters} onChange={list.setFilter} onClear={list.clearFilters} />}
 *     bulkActionBar={<BulkActionBar selectedCount={list.selectedCount} onClear={list.clearSelection} ... />}
 *   />
 *
 *   // Build API query params:
 *   const params = list.toQueryParams();
 */

const DEFAULT_STATE = {
  page: 1,
  pageSize: 20,
  search: "",
  sortKey: "createdAt",
  sortDir: "desc",
  filters: {},
  selectedKeys: [],
};

const getFilterValue = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if ("value" in value) {
      return value.value;
    }
  }

  return value;
};

const isBlankFilterValue = (value) => {
  const normalized = getFilterValue(value);

  return (
    normalized === undefined ||
    normalized === null ||
    normalized === "" ||
    String(normalized).toLowerCase() === "all"
  );
};

const END_DATE_KEYS = new Set([
  "todate",
  "enddate",
  "dateto",
  "createdto",
]);

const isDateOnlyValue = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

const toInclusiveEndOfDay = (key, value) => {
  if (
    !END_DATE_KEYS.has(String(key || "").toLowerCase()) ||
    !isDateOnlyValue(value)
  ) {
    return value;
  }

  return `${value}T23:59:59.999`;
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_PAGE":
      return {
        ...state,
        page: action.payload,
      };

    case "SET_PAGE_SIZE":
      return {
        ...state,
        pageSize: action.payload,
        page: 1,
        selectedKeys: [],
      };

    case "SET_SEARCH":
      return {
        ...state,
        search: action.payload,
        page: 1,
        selectedKeys: [],
      };

    case "SET_SORT":
      return {
        ...state,
        sortKey: action.payload.key,
        sortDir: action.payload.dir,
        page: 1,
        selectedKeys: [],
      };

    case "SET_FILTER":
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.key]: action.payload.value,
        },
        page: 1,
        selectedKeys: [],
      };

    case "SET_FILTERS":
      return {
        ...state,
        filters: action.payload,
        page: 1,
        selectedKeys: [],
      };

    case "CLEAR_FILTERS":
      return {
        ...state,
        filters: {},
        page: 1,
        selectedKeys: [],
      };

    case "SET_SELECTED_KEYS":
      return {
        ...state,
        selectedKeys: action.payload,
      };

    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedKeys: [],
      };

    case "RESET":
      return {
        ...DEFAULT_STATE,
        ...action.payload,
      };

    default:
      return state;
  }
}

/**
 * useListPage
 *
 * Options:
 *
 * defaultPageSize
 * defaultSortKey
 * defaultSortDir
 * defaultFilters
 * ignoredFilterKeys
 * debounceDelay
 */
export function useListPage(opts = {}) {
  const {
    defaultPageSize = 20,
    defaultSortKey = "createdAt",
    defaultSortDir = "desc",
    defaultFilters = {},
    ignoredFilterKeys = [],
    debounceDelay = 400,
  } = opts;

  const [state, dispatch] = useReducer(reducer, {
    ...DEFAULT_STATE,
    pageSize: defaultPageSize,
    sortKey: defaultSortKey,
    sortDir: defaultSortDir,
    filters: defaultFilters,
  });

  // ============================================================
  // SEARCH DEBOUNCE
  // ============================================================

  const searchTimer = useRef(null);

  const setSearch = useCallback(
    (value) => {
      clearTimeout(searchTimer.current);

      searchTimer.current = setTimeout(() => {
        dispatch({
          type: "SET_SEARCH",
          payload: value,
        });
      }, debounceDelay);
    },
    [debounceDelay],
  );

  const clearSearch = useCallback(() => {
    clearTimeout(searchTimer.current);

    dispatch({
      type: "SET_SEARCH",
      payload: "",
    });
  }, []);

  // ============================================================
  // SORT
  // ============================================================

  const setSort = useCallback((key, dir) => {
    dispatch({
      type: "SET_SORT",
      payload: {
        key,
        dir,
      },
    });
  }, []);

  // ============================================================
  // FILTERS
  // ============================================================

  const filterTimers = useRef({});

const setFilter = useCallback((key, value) => {
  dispatch({
    type: "SET_FILTER",
    payload: {
      key,
      value,
    },
  });
}, []);

  const setFilters = useCallback((filters) => {
    Object.values(filterTimers.current).forEach(clearTimeout);
    filterTimers.current = {};

    dispatch({
      type: "SET_FILTERS",
      payload: filters,
    });
  }, []);

  const clearFilters = useCallback(() => {
    Object.values(filterTimers.current).forEach(clearTimeout);

    filterTimers.current = {};

    dispatch({
      type: "CLEAR_FILTERS",
    });
  }, []);

  // ============================================================
  // PAGINATION
  // ============================================================

  const setPage = useCallback((page) => {
    dispatch({
      type: "SET_PAGE",
      payload: page,
    });
  }, []);

  const setPageSize = useCallback((size) => {
    dispatch({
      type: "SET_PAGE_SIZE",
      payload: size,
    });
  }, []);

  // ============================================================
  // SELECTION
  // ============================================================

  const setSelectedKeys = useCallback((keys) => {
    dispatch({
      type: "SET_SELECTED_KEYS",
      payload: keys,
    });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({
      type: "CLEAR_SELECTION",
    });
  }, []);

  // ============================================================
  // CLEANUP
  // ============================================================

  useEffect(() => {
    return () => {
      clearTimeout(searchTimer.current);

      Object.values(filterTimers.current).forEach(clearTimeout);
    };
  }, []);

  // ============================================================
  // DERIVED VALUES
  // ============================================================

  const selectedCount = state.selectedKeys.length;

  const activeFilterCount = useMemo(() => {
    const filterCount = Object.entries(state.filters).filter(
      ([key, value]) =>
        !ignoredFilterKeys.includes(key) &&
        !isBlankFilterValue(value),
    ).length;

    return filterCount + (state.search ? 1 : 0);
  }, [
    state.filters,
    state.search,
    ignoredFilterKeys,
  ]);

  // ============================================================
  // QUERY PARAMS
  // ============================================================

  const toQueryParams = useCallback(() => {
    const params = {
      page: state.page,
      limit: state.pageSize,
      sortBy: state.sortKey,
      sortDir: state.sortDir,
    };

    let finalSearch = state.search
      ? String(state.search)
          .trim()
          .replace(/^#/, "")
      : "";

    for (const [key, value] of Object.entries(state.filters)) {
      const normalizedValue = getFilterValue(value);

      if (isBlankFilterValue(normalizedValue)) {
        continue;
      }

      // Date range
      if (
        value &&
        typeof value === "object" &&
        ("startDate" in value || "endDate" in value)
      ) {
        if (value.startDate) {
          params[`${key}_start`] = value.startDate;
        }

        if (value.endDate) {
          params[`${key}_end`] = toInclusiveEndOfDay(
            "endDate",
            value.endDate,
          );
        }

        continue;
      }

      let val = normalizedValue;

      // Remove # from IDs
      if (
        typeof val === "string" &&
        (
          key.toLowerCase().includes("order") ||
          key.toLowerCase().includes("return") ||
          key.toLowerCase().includes("id")
        )
      ) {
        val = val.trim().replace(/^#/, "");
      }

      // Order ID / Order Number handling
      if (
        typeof val === "string" &&
        (
          key === "orderId" ||
          key === "orderNumber"
        )
      ) {
        const isObjectId =
          /^[0-9a-fA-F]{24}$/.test(val);

        const isUuid =
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(
            val,
          );

        if (isObjectId || isUuid) {
          params.orderId = val;
        } else {
          params.orderNumber = val;
          params.order_number = val;

          finalSearch = finalSearch
            ? `${finalSearch} ${val}`
            : val;
        }
      } else {
        params[key] = toInclusiveEndOfDay(
          key,
          val,
        );
      }
    }

    if (finalSearch) {
      params.search = finalSearch;
    }

    return params;
  }, [state]);

  // ============================================================
  // RESET
  // ============================================================

  const reset = useCallback(() => {
    clearTimeout(searchTimer.current);

    Object.values(filterTimers.current).forEach(clearTimeout);

    filterTimers.current = {};

    dispatch({
      type: "RESET",
      payload: {
        pageSize: defaultPageSize,
        sortKey: defaultSortKey,
        sortDir: defaultSortDir,
        filters: defaultFilters,
      },
    });
  }, [
    defaultPageSize,
    defaultSortKey,
    defaultSortDir,
    defaultFilters,
  ]);

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // State
    page: state.page,
    pageSize: state.pageSize,
    search: state.search,
    sortKey: state.sortKey,
    sortDir: state.sortDir,
    filters: state.filters,
    selectedKeys: state.selectedKeys,

    // Derived
    selectedCount,
    activeFilterCount,

    // Handlers
    setPage,
    setPageSize,

    setSearch,
    clearSearch,

    setSort,

    setFilter,
    setFilters,
    clearFilters,

    setSelectedKeys,
    clearSelection,

    reset,
    toQueryParams,
  };
}