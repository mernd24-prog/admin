import { useCallback, useMemo, useReducer, useRef } from 'react';

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
  page:         1,
  pageSize:     20,
  search:       '',
  sortKey:      'createdAt',
  sortDir:      'desc',
  filters:      {},
  selectedKeys: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'SET_PAGE_SIZE':
      return { ...state, pageSize: action.payload, page: 1, selectedKeys: [] };
    case 'SET_SEARCH':
      return { ...state, search: action.payload, page: 1, selectedKeys: [] };
    case 'SET_SORT':
      return { ...state, sortKey: action.payload.key, sortDir: action.payload.dir, page: 1, selectedKeys: [] };
    case 'SET_FILTER':
      return {
        ...state,
        filters: { ...state.filters, [action.payload.key]: action.payload.value },
        page: 1,
        selectedKeys: [],
      };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload, page: 1, selectedKeys: [] };
    case 'CLEAR_FILTERS':
      return { ...state, filters: {}, page: 1, selectedKeys: [] };
    case 'SET_SELECTED_KEYS':
      return { ...state, selectedKeys: action.payload };
    case 'CLEAR_SELECTION':
      return { ...state, selectedKeys: [] };
    case 'RESET':
      return { ...DEFAULT_STATE, ...action.payload };
    default:
      return state;
  }
}

/**
 * @param {object} [opts]
 * @param {number}  [opts.defaultPageSize]
 * @param {string}  [opts.defaultSortKey]
 * @param {"asc"|"desc"} [opts.defaultSortDir]
 * @param {object}  [opts.defaultFilters]
 * @param {string[]} [opts.ignoredFilterKeys]  — keys that don't count toward activeFilterCount
 */
export function useListPage(opts = {}) {
  const {
    defaultPageSize  = 20,
    defaultSortKey   = 'createdAt',
    defaultSortDir   = 'desc',
    defaultFilters   = {},
    ignoredFilterKeys = [],
  } = opts;

  const [state, dispatch] = useReducer(reducer, {
    ...DEFAULT_STATE,
    pageSize:  defaultPageSize,
    sortKey:   defaultSortKey,
    sortDir:   defaultSortDir,
    filters:   defaultFilters,
  });

  // ── Debounce search ─────────────────────────────────────────────────────────
  const searchTimer = useRef(null);
  const setSearch = useCallback((value) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      dispatch({ type: 'SET_SEARCH', payload: value });
    }, 300);
  }, []);

  // ── Sort ────────────────────────────────────────────────────────────────────
  const setSort = useCallback((key, dir) => {
    dispatch({ type: 'SET_SORT', payload: { key, dir } });
  }, []);

  // ── Filters ─────────────────────────────────────────────────────────────────
  const setFilter = useCallback((key, value) => {
    dispatch({ type: 'SET_FILTER', payload: { key, value } });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, []);

  // ── Pagination ──────────────────────────────────────────────────────────────
  const setPage = useCallback((page) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  }, []);

  const setPageSize = useCallback((size) => {
    dispatch({ type: 'SET_PAGE_SIZE', payload: size });
  }, []);

  // ── Selection ───────────────────────────────────────────────────────────────
  const setSelectedKeys = useCallback((keys) => {
    dispatch({ type: 'SET_SELECTED_KEYS', payload: keys });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedCount = state.selectedKeys.length;

  const activeFilterCount = useMemo(() => {
    return Object.entries(state.filters).filter(
      ([key, val]) =>
        !ignoredFilterKeys.includes(key) &&
        val !== undefined &&
        val !== null &&
        val !== '' &&
        val !== 'all',
    ).length + (state.search ? 1 : 0);
  }, [state.filters, state.search, ignoredFilterKeys]);

  /**
   * Convert current state to API query params object.
   * Flattens daterange objects into startDate/endDate.
   */
  const toQueryParams = useCallback(() => {
    const params = {
      page:    state.page,
      limit:   state.pageSize,
      sortBy:  state.sortKey,
      sortDir: state.sortDir,
    };
    if (state.search) params.search = state.search;

    for (const [key, value] of Object.entries(state.filters)) {
      if (value === undefined || value === null || value === '' || value === 'all') continue;
      if (value && typeof value === 'object' && ('startDate' in value || 'endDate' in value)) {
        if (value.startDate) params[`${key}_start`] = value.startDate;
        if (value.endDate)   params[`${key}_end`]   = value.endDate;
      } else {
        params[key] = value;
      }
    }
    return params;
  }, [state]);

  const reset = useCallback(() => {
    dispatch({
      type: 'RESET',
      payload: {
        pageSize: defaultPageSize,
        sortKey:  defaultSortKey,
        sortDir:  defaultSortDir,
        filters:  defaultFilters,
      },
    });
  }, [defaultPageSize, defaultSortKey, defaultSortDir, defaultFilters]);

  return {
    // State
    page:         state.page,
    pageSize:     state.pageSize,
    search:       state.search,
    sortKey:      state.sortKey,
    sortDir:      state.sortDir,
    filters:      state.filters,
    selectedKeys: state.selectedKeys,
    // Derived
    selectedCount,
    activeFilterCount,
    // Handlers
    setPage,
    setPageSize,
    setSearch,
    setSort,
    setFilter,
    clearFilters,
    setSelectedKeys,
    clearSelection,
    reset,
    toQueryParams,
  };
}
