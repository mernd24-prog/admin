import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdSearch, MdRefresh, MdUnfoldMore, MdInbox, MdMoreVert } from "react-icons/md";
import Pagination from "../Pagination/Pagination";
import CustomCheckbox from "../Atoms/Checkbox/Checkbox";
import { ExportButton, ImportButton } from "./TableTools";

const SkeletonRow = ({ cols }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

const RowActionsMenu = ({ actions = [], rowLabel = "record" }) => {
  const visibleActions = Array.isArray(actions)
    ? actions.filter((action) => action && action.hidden !== true)
    : [];
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = 190;
    const estimatedHeight = Math.min(visibleActions.length * 38 + 16, 320);
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width));
    const belowTop = rect.bottom + 6;
    const top = belowTop + estimatedHeight > window.innerHeight
      ? Math.max(8, rect.top - estimatedHeight - 6)
      : belowTop;
    setPosition({ top, left });
  }, [visibleActions.length]);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();

    const closeOutside = (event) => {
      if (
        !buttonRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const closeOnViewportChange = () => setOpen(false);

    document.addEventListener("mousedown", closeOutside);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [open, updatePosition]);

  if (!visibleActions.length) return null;

  return (
    <div className="inline-flex" onClick={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--admin-muted)] transition hover:bg-[var(--admin-blue-soft)] hover:text-[var(--admin-blue)]"
        aria-label={`Actions for ${rowLabel}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Actions"
        onClick={(event) => {
          event.stopPropagation();
          if (!open) updatePosition();
          setOpen((value) => !value);
        }}
      >
        <MdMoreVert size={19} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[1000] max-h-80 w-[190px] overflow-y-auto rounded-md border border-[var(--admin-line)] bg-white p-1.5 shadow-xl"
          style={{ top: position.top, left: position.left }}
          onClick={(event) => event.stopPropagation()}
        >
          {visibleActions.map((action, index) => (
            <button
              key={`${action.label || "action"}-${index}`}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              className={`flex min-h-9 w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                action.danger
                  ? "text-red-600 hover:bg-red-50"
                  : "text-[var(--admin-ink)] hover:bg-[var(--admin-blue-soft)] hover:text-[var(--admin-blue)]"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                action.onClick?.();
              }}
            >
              {action.icon ? <span className="flex-shrink-0">{action.icon}</span> : null}
              <span>{action.label || "Action"}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
};

/**
 * DataTable
 *
 * Props:
 *   columns          {Array<{key, label, render?, sortable?, width?}>}
 *   data             {Array<object>}
 *   loading          {boolean}
 *   totalCount       {number}
 *   page             {number}
 *   pageSize         {number}
 *   onPageChange     {(page: number) => void}
 *   onSearch         {(q: string) => void}
 *   searchPlaceholder {string}
 *   rowKey           {string | (row) => string}  — defaults to "_id"
 *   actions          {React.ReactNode}            — toolbar actions (buttons etc.)
 *   emptyText        {string}
 *   emptyIcon        {React.ReactNode}            — custom empty state icon
 *   filterBar        {React.ReactNode}            — FilterBar rendered between toolbar and table
 *   bulkActionBar    {React.ReactNode}            — BulkActionBar rendered above table body
 *   onSort           {(key, dir) => void}
 *   sortKey          {string}
 *   sortDir          {"asc"|"desc"}
 *   selectable       {boolean}
 *   selectedKeys     {Array}
 *   onSelectionChange{(keys) => void}
 *   onRefresh        {() => void}
 *   error            {string}
 *   pageSizeOptions  {number[]}
 *   onPageSizeChange {(size: number) => void}
 *   tableContainerClassName {string}
 *   tableClassName   {string}
 *   exportConfig     {object}
 *   importConfig     {object}
 *   requiredModule   {string}
 *   onRowClick       {(row) => void}
 *   rowClassName     {string | (row) => string}
 *   rowActions       {(row) => Array<{label, icon?, onClick, danger?, disabled?, hidden?}>}
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
  searchPlaceholder = "Search…",
  rowKey = "_id",
  actions,
  emptyText = "No records found.",
  emptyIcon,
  filterBar,
  bulkActionBar,
  onSort,
  sortKey,
  sortDir = "asc",
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  onRefresh,
  error,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  tableContainerClassName = "",
  tableClassName = "",
  exportConfig,
  importConfig,
  requiredModule,
  onRowClick,
  rowClassName = "",
  rowActions,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getKey = (row, index) =>
    typeof rowKey === "function"
      ? rowKey(row)
      : (row[rowKey] ?? row.id ?? index);

  const pageKeys = data.map((row, index) => getKey(row, index));
  const allSelected =
    pageKeys.length > 0 && pageKeys.every((key) => selectedKeys.includes(key));
  const selectedData = data.filter((row, index) =>
    selectedKeys.includes(getKey(row, index)),
  );

  useEffect(() => {
    if (page > totalPages && onPageChange) onPageChange(totalPages);
  }, [onPageChange, page, totalPages]);

  const handleSearch = (e) => {
    const v = e.target.value;
    setSearchValue(v);
    onSearch?.(v);
  };

  const handleSort = (col) => {
    if (col.sortable && onSort)
      onSort(
        col.key,
        sortKey === col.key && sortDir === "asc" ? "desc" : "asc",
      );
  };

  const toggleAll = (checked) => {
    if (!onSelectionChange) return;
    const remaining = selectedKeys.filter((key) => !pageKeys.includes(key));
    onSelectionChange(checked ? [...remaining, ...pageKeys] : remaining);
  };

  const toggleRow = (key, checked) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      checked
        ? [...new Set([...selectedKeys, key])]
        : selectedKeys.filter((item) => item !== key),
    );
  };

  const colCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);

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
      {importConfig && (
        <ImportButton {...importConfig} requiredModule={requiredModule} />
      )}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="admin-btn-secondary"
          aria-label="Refresh records"
        >
          <MdRefresh size={17} /> Refresh
        </button>
      )}
      {actions}
    </>
  );

  return (
    <div className="admin-card overflow-hidden">
      {/* Search + toolbar */}
      {(onSearch || actions || exportConfig || importConfig || onRefresh) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-[var(--admin-line)] bg-white">
          {onSearch && (
            <div className="relative w-full sm:w-72">
              <MdSearch
                size={16}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                value={searchValue}
                onChange={handleSearch}
                placeholder={searchPlaceholder}
                className="admin-input w-full pl-8 pr-4"
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {tools}
          </div>
        </div>
      )}

      {/* Filter bar slot */}
      {filterBar}

      {/* Bulk action bar slot */}
      {bulkActionBar && (
        <div className="px-4 pt-3">{bulkActionBar}</div>
      )}

      {/* Table */}
      <div className={tableContainerClassName || "overflow-x-auto"}>
        <table className={`w-full text-sm ${tableClassName}`}>
          <thead className="admin-table-head">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left w-10">
                  <CustomCheckbox
                    checked={allSelected}
                    onChange={(event) => toggleAll(event.target.checked)}
                  />
                </th>
              )}
              {columns.map((col, columnIndex) => (
                <th
                  key={`${col.key}-${columnIndex}`}
                className={`px-4 py-3 text-left text-xs font-semibold text-[var(--admin-navy)] whitespace-nowrap ${
                    col.sortable
                      ? "cursor-pointer select-none hover:text-[var(--admin-blue)]"
                      : ""
                  } ${col.width ? `w-${col.width}` : ""}`}
                  onClick={() => handleSort(col)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <MdUnfoldMore
                        size={14}
                        className={
                          sortKey === col.key
                            ? "text-[var(--admin-gold)]"
                            : "text-[var(--admin-muted)]"
                        }
                      />
                    )}
                  </span>
                </th>
              ))}
              {rowActions && (
                <th className="w-16 px-4 py-3 text-right text-xs font-semibold text-[var(--admin-navy)] whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#f0e8dc]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} cols={colCount} />
              ))
            ) : error ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-12 text-center text-red-500 text-sm"
                >
                  {error}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    {emptyIcon || (
                      <MdInbox size={36} className="text-gray-200" />
                    )}
                    <span className="text-sm">{emptyText}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={getKey(row, index)}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(event) => {
                    if (!onRowClick) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  className={`hover:bg-[var(--admin-surface-soft)] transition-colors ${
                    onRowClick ? "cursor-pointer focus:bg-[var(--admin-surface-soft)] focus:outline-none" : ""
                  } ${typeof rowClassName === "function" ? rowClassName(row) : rowClassName}`}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <CustomCheckbox
                        checked={selectedKeys.includes(getKey(row, index))}
                        onChange={(event) =>
                          toggleRow(getKey(row, index), event.target.checked)
                        }
                      />
                    </td>
                  )}
                  {columns.map((col, columnIndex) => (
                    <td key={`${col.key}-${columnIndex}`} className="px-4 py-3 text-[var(--admin-ink)]">
                      {col.render
                        ? col.render(row[col.key], row)
                        : (row[col.key] ?? "—")}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-3 text-right">
                      <RowActionsMenu
                        actions={rowActions(row)}
                        rowLabel={row.full_name || row.name || row.title || getKey(row, index)}
                      />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(totalPages > 1 || onPageSizeChange) && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--admin-line)] bg-white text-sm text-[var(--admin-muted)]">
          <span>
            Showing{" "}
            {totalCount
              ? Math.min((page - 1) * pageSize + 1, totalCount)
              : 0}
            –{Math.min(page * pageSize, totalCount)} of {totalCount}
          </span>
          <Pagination
            totalPages={totalPages}
            currentPage={page}
            onPageChange={onPageChange}
            pageSize={pageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={onPageSizeChange}
            compact
          />
        </div>
      )}
    </div>
  );
};

export default DataTable;
