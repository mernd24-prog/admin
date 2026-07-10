import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdRefresh, MdUnfoldMore, MdMoreVert } from "react-icons/md";
import Pagination from "../Pagination/Pagination";
import CustomCheckbox from "../Atoms/Checkbox/Checkbox";
import SearchInput from "../Atoms/SearchInput/SearchInput";
import { ExportButton, ImportButton } from "./TableTools";
import { formatLabel } from "../../utils/formatters";

const SkeletonRow = ({ cols }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 w-3/4 rounded bg-[var(--admin-surface-soft)]" />
      </td>
    ))}
  </tr>
);

const EMPTY_TEXT_VALUES = new Set(["", "NA", "N/A"]);

const isEmptyCellValue = (value) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && EMPTY_TEXT_VALUES.has(value.trim().toUpperCase()));

const shouldPreserveText = (value) => /@|https?:\/\/|www\./i.test(value);

const formatCellText = (value) =>
  shouldPreserveText(value) ? value : formatLabel(value, "N/A");

const VOID_ELEMENT_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const renderCellValue = (value, nested = false) => {
  if (nested && (value === null || value === undefined || typeof value === "boolean")) {
    return null;
  }
  if (nested && typeof value === "string" && value.trim() === "") return null;
  if (isEmptyCellValue(value)) return <span className="text-gray-400">N/A</span>;
  if (typeof value === "string") return formatCellText(value);
  if (Array.isArray(value)) return value.map((item) => renderCellValue(item, true));
  if (React.isValidElement(value)) {
    const children = value.props?.children;
    if (VOID_ELEMENT_TAGS.has(value.type)) return value;
    if (children === undefined || children === null) return value;
    if (isEmptyCellValue(children)) {
      return React.cloneElement(value, undefined, "N/A");
    }
    return React.cloneElement(
      value,
      undefined,
      React.Children.map(children, (child) => renderCellValue(child, true)),
    );
  }
  return value;
};

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
  totalCount,
  total,
  page = 1,
  pageSize = 20,
  onPageChange,
  onSearch,
  searchPlaceholder = "Search…",
  rowKey = "_id",
  actions,
  emptyText = "No records found.",
  emptyMessage,
  emptyIcon,
  filterBar,
  bulkActionBar,
  onSort,
  sortKey,
  sortDir,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  onRefresh,
  error,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  listPage,
  tableContainerClassName = "",
  tableClassName = "",
  cardClassName = "admin-card overflow-hidden",
  exportConfig,
  importConfig,
  requiredModule,
  onRowClick,
  rowClassName = "",
  rowActions,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [hasMounted, setHasMounted] = useState(false);
  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns : [];
  const resolvedTotalCount = Number(totalCount ?? total ?? safeData.length);
  const resolvedPage = Number(listPage?.page ?? page ?? 1);
  const resolvedPageSize = Number(listPage?.pageSize ?? pageSize ?? 20);
  const resolvedOnPageChange = onPageChange || listPage?.setPage;
  const resolvedOnPageSizeChange = onPageSizeChange || listPage?.setPageSize;
  const resolvedOnSearch = onSearch || listPage?.setSearch;
  const resolvedOnSort = onSort || listPage?.setSort;
  const resolvedSortKey = sortKey ?? listPage?.sortKey;
  const resolvedSortDir = sortDir ?? listPage?.sortDir ?? "asc";
  const resolvedEmptyText = emptyMessage || emptyText;
  const totalPages = Math.max(1, Math.ceil(resolvedTotalCount / resolvedPageSize));
  const showLoading = loading || (!hasMounted && safeData.length === 0 && !error);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const getKey = (row, index) =>
    typeof rowKey === "function"
      ? rowKey(row)
      : (row[rowKey] ?? row.id ?? index);

  const pageKeys = safeData.map((row, index) => getKey(row, index));
  const allSelected =
    pageKeys.length > 0 && pageKeys.every((key) => selectedKeys.includes(key));
  const selectedData = safeData.filter((row, index) =>
    selectedKeys.includes(getKey(row, index)),
  );

  useEffect(() => {
    if (resolvedPage > totalPages && resolvedOnPageChange) {
      resolvedOnPageChange(totalPages);
    }
  }, [resolvedOnPageChange, resolvedPage, totalPages]);

  const handleSearch = (e) => {
    const v = e.target.value;
    setSearchValue(v);
    resolvedOnSearch?.(v);
  };

  const handleSort = (col) => {
    if (col.sortable && resolvedOnSort)
      resolvedOnSort(
        col.key,
        resolvedSortKey === col.key && resolvedSortDir === "asc" ? "desc" : "asc",
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

  const colCount = safeColumns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);

  const tools = (
    <>
      {exportConfig && (
        <ExportButton
          {...exportConfig}
          data={Array.isArray(exportConfig.data) ? exportConfig.data : safeData}
          selectedData={selectedData}
          columns={Array.isArray(exportConfig.columns) ? exportConfig.columns : safeColumns}
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
    <div className={cardClassName}>
      {/* Search + toolbar */}
      {(resolvedOnSearch || actions || exportConfig || importConfig || onRefresh) && (
        <div className="flex flex-col gap-3 border-b border-[var(--admin-line)] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          {resolvedOnSearch && (
            <div className="w-full min-w-0 sm:max-w-2xl sm:flex-1">
              <SearchInput
                searchTerm={searchValue}
                handleChange={handleSearch}
                placeholder={searchPlaceholder}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:flex-shrink-0">
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
      <div className={`admin-table-scroll ${tableContainerClassName || "overflow-x-auto overscroll-x-contain"}`}>
        <table className={`min-w-full whitespace-nowrap text-sm ${tableClassName}`}>
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
              {safeColumns.map((col, columnIndex) => (
                <th
                  key={`${col.key}-${columnIndex}`}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--admin-navy)] whitespace-nowrap ${
                    col.sortable
                      ? "cursor-pointer select-none hover:text-[var(--admin-blue)]"
                      : ""
                  } ${col.width ? `w-${col.width}` : ""} ${col.headerClassName || ""}`}
                  onClick={() => handleSort(col)}
                >
                  <span className="flex items-center gap-1 ">
                    {col.label}
                    {col.sortable && (
                      <MdUnfoldMore
                        size={14}
                        className={
                          resolvedSortKey === col.key
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

          <tbody className="divide-y divide-[#f0e8dc] bg-white">
            {showLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} cols={colCount} />
              ))
            ) : error ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-12 text-center text-sm"
                >
                  <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-5 text-red-600">
                    <span className="text-sm font-semibold">Unable to load records</span>
                    <span className="text-xs text-red-500">{error}</span>
                    {onRefresh && (
                      <button
                        type="button"
                        onClick={onRefresh}
                        className="mt-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : safeData.length === 0 ? (
              <tr>
                <td colSpan={colCount}>
                  <div className="mx-auto flex flex-col items-center gap-2 rounded-lg bg-[var(--admin-surface-soft)] px-4 py-8 text-center text-gray-400">
                    <img
                      src="/Img/noData.png"
                      alt="No records"
                      className="h-24 w-24 max-w-full object-contain sm:h-32 sm:w-32 md:h-[150px] md:w-[150px]"
                    />
                    <span className="text-sm font-medium">{formatLabel(resolvedEmptyText)}</span>
                  </div>
                </td>
              </tr>
            ) : (
              safeData.map((row, index) => (
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
                  className={`align-top transition-colors hover:bg-[var(--admin-surface-soft)] ${
                    onRowClick ? "cursor-pointer focus:bg-[var(--admin-surface-soft)] focus:outline-none" : ""
                  } ${typeof rowClassName === "function" ? rowClassName(row) : rowClassName}`}
                >
                  {selectable && (
                    <td className="px-4 py-3 align-middle">
                      <CustomCheckbox
                        checked={selectedKeys.includes(getKey(row, index))}
                        onChange={(event) =>
                          toggleRow(getKey(row, index), event.target.checked)
                        }
                      />
                    </td>
                  )}
                  {safeColumns.map((col, columnIndex) => (
                    <td
                      key={`${col.key}-${columnIndex}`}
                      className={`px-4 py-3 align-middle text-[var(--admin-ink)] ${col.cellClassName || ""}`}
                    >
                      {renderCellValue(
                        col.render
                          ? col.render(row[col.key], row)
                          : row[col.key],
                      )}
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
      {(totalPages > 1 || resolvedOnPageSizeChange) && (
        <div className="flex flex-col gap-3 border-t border-[var(--admin-line)] bg-white px-3 py-3 text-sm text-[var(--admin-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <span className="text-xs font-medium">
            Showing{" "}
            {resolvedTotalCount
              ? Math.min((resolvedPage - 1) * resolvedPageSize + 1, resolvedTotalCount)
              : 0}
            –{Math.min(resolvedPage * resolvedPageSize, resolvedTotalCount)} of {resolvedTotalCount}
          </span>
          <Pagination
            totalPages={totalPages}
            currentPage={resolvedPage}
            onPageChange={resolvedOnPageChange}
            pageSize={resolvedPageSize}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={resolvedOnPageSizeChange}
            compact
          />
        </div>
      )}
    </div>
  );
};

export default DataTable;
