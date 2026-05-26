import React, { useEffect, useState } from 'react';
import { MdSearch, MdRefresh, MdUnfoldMore } from 'react-icons/md';
import Pagination from '../Pagination/Pagination';
import CustomCheckbox from '../Atoms/Checkbox/Checkbox';
import { ExportButton, ImportButton } from './TableTools';

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
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  onRefresh,
  error,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  exportConfig,
  importConfig,
  requiredModule,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getKey = (row, index) =>
    typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? row.id ?? index;
  const pageKeys = data.map((row, index) => getKey(row, index));
  const allSelected = pageKeys.length > 0 && pageKeys.every((key) => selectedKeys.includes(key));
  const selectedData = data.filter((row, index) => selectedKeys.includes(getKey(row, index)));

  useEffect(() => {
    if (page > totalPages && onPageChange) onPageChange(totalPages);
  }, [onPageChange, page, totalPages]);

  const handleSearch = (e) => {
    const v = e.target.value;
    setSearchValue(v);
    onSearch?.(v);
  };

  const handleSort = (col) => {
    if (col.sortable && onSort) onSort(col.key, sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc');
  };

  const toggleAll = (checked) => {
    if (!onSelectionChange) return;
    const remaining = selectedKeys.filter((key) => !pageKeys.includes(key));
    onSelectionChange(checked ? [...remaining, ...pageKeys] : remaining);
  };

  const toggleRow = (key, checked) => {
    if (!onSelectionChange) return;
    onSelectionChange(checked ? [...new Set([...selectedKeys, key])] : selectedKeys.filter((item) => item !== key));
  };

  const tools = (
    <>
      {exportConfig && (
        <ExportButton
          {...exportConfig}
          data={exportConfig.data || data}
          selectedData={selectedData}
          columns={exportConfig.columns || columns}
          requiredModule={requiredModule}
        />
      )}
      {importConfig && <ImportButton {...importConfig} requiredModule={requiredModule} />}
      {onRefresh && (
        <button type="button" onClick={onRefresh} className="admin-btn-secondary" aria-label="Refresh records">
          <MdRefresh size={17} /> Refresh
        </button>
      )}
      {actions}
    </>
  );

  return (
    <div className="admin-card overflow-hidden">
      {/* Toolbar */}
      {(onSearch || actions || exportConfig || importConfig || onRefresh) && (
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
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{tools}</div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="admin-table-head">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <CustomCheckbox checked={allSelected} onChange={(event) => toggleAll(event.target.checked)} />
                </th>
              )}
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
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={columns.length + (selectable ? 1 : 0)} />)
              : error
                ? (
                  <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-red-600">{error}</td></tr>
                )
              : data.length === 0
                ? (
                  <tr>
                    <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-gray-400 text-sm">
                      {emptyText}
                    </td>
                  </tr>
                )
                : data.map((row, index) => (
                  <tr key={getKey(row, index)} className="hover:bg-[#f7f9ff] transition-colors">
                    {selectable && (
                      <td className="px-4 py-3"><CustomCheckbox checked={selectedKeys.includes(getKey(row, index))} onChange={(event) => toggleRow(getKey(row, index), event.target.checked)} /></td>
                    )}
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
      {(totalPages > 1 || onPageSizeChange) && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>
            Showing {totalCount ? Math.min((page - 1) * pageSize + 1, totalCount) : 0}-{Math.min(page * pageSize, totalCount)} of {totalCount}
          </span>
          <Pagination totalPages={totalPages} currentPage={page} onPageChange={onPageChange} pageSize={pageSize} pageSizeOptions={pageSizeOptions} onPageSizeChange={onPageSizeChange} compact />
        </div>
      )}
    </div>
  );
};

export default DataTable;
