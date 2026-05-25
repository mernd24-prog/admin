import React, { useState } from 'react';
import { MdSearch, MdChevronLeft, MdChevronRight, MdUnfoldMore } from 'react-icons/md';

const SkeletonRow = ({ cols }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

/**
 * DataTable
 *
 * Props:
 *   columns      {Array<{key, label, render?, sortable?, width?}>}
 *   data         {Array<object>}
 *   loading      {boolean}
 *   totalCount   {number}
 *   page         {number}
 *   pageSize     {number}
 *   onPageChange {(page: number) => void}
 *   onSearch     {(q: string) => void}
 *   searchPlaceholder {string}
 *   rowKey       {string | (row) => string}   — defaults to "_id"
 *   actions      {React.ReactNode}             — toolbar actions (buttons etc.)
 *   emptyText    {string}
 */
const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  totalCount = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  onSearch,
  searchPlaceholder = 'Search…',
  rowKey = '_id',
  actions,
  emptyText = 'No records found.',
  onSort,
  sortKey,
  sortDir = 'asc',
}) => {
  const [searchValue, setSearchValue] = useState('');
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getKey = (row) =>
    typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? Math.random();

  const handleSearch = (e) => {
    const v = e.target.value;
    setSearchValue(v);
    onSearch?.(v);
  };

  const handleSort = (col) => {
    if (col.sortable && onSort) onSort(col.key, sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="admin-card overflow-hidden">
      {/* Toolbar */}
      {(onSearch || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          {onSearch && (
            <div className="relative w-full sm:w-72">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={searchValue}
                onChange={handleSearch}
                placeholder={searchPlaceholder}
                className="admin-input w-full pl-9 pr-4"
              />
            </div>
          )}
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="admin-table-head">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide whitespace-nowrap ${col.sortable ? 'cursor-pointer select-none hover:text-white/80' : ''} ${col.width ? `w-${col.width}` : ''}`}
                  onClick={() => handleSort(col)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <MdUnfoldMore
                        size={14}
                        className={sortKey === col.key ? 'text-[#e49e1c]' : 'text-white/50'}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)
              : data.length === 0
                ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400 text-sm">
                      {emptyText}
                    </td>
                  </tr>
                )
                : data.map((row) => (
                  <tr key={getKey(row)} className="hover:bg-[#f7f9ff] transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-gray-700">
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>
            Showing {Math.min((page - 1) * pageSize + 1, totalCount)}–{Math.min(page * pageSize, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <MdChevronLeft size={18} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 7) {
                if (page <= 4) p = i + 1;
                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                else p = page - 3 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => onPageChange?.(p)}
                  className={`w-8 h-8 rounded text-xs font-medium transition-colors ${p === page ? 'bg-[#082f91] text-white' : 'hover:bg-[#eef2ff]'}`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <MdChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
