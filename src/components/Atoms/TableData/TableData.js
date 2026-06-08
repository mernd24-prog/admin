import React from "react";
import { IoCaretDownOutline, IoCaretUpOutline } from "react-icons/io5";
import Nodata from "../NoData/NoData";
// import Pagination from "../../Pagination/Pagination";
import { TableSkeletonLoader } from "../../Loader/SkeletonLoader";
import CustomCheckbox from "../Checkbox/Checkbox";

const getMobileHeading = (tableHeadings, cellIndex, isHeaderCheckbox) =>
  tableHeadings[isHeaderCheckbox ? cellIndex - 1 : cellIndex] || "Select";

const isActionHeading = (heading) =>
  String(heading?.props?.children ?? heading)
    .toLowerCase()
    .includes("action");

const getHeadingText = (heading) =>
  String(heading?.props?.children ?? heading).toLowerCase();

const getColumnMeta = (heading) => {
  const headingText = getHeadingText(heading);

  if (headingText === "sku") {
    return {
      headerClass: "min-w-[260px] w-[260px]",
      cellClass: "min-w-[260px] w-[260px] whitespace-nowrap",
      contentClass:
        "block max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap",
    };
  }

  if (headingText.includes("family") || headingText.includes("product")) {
    return {
      headerClass: "min-w-[280px] w-[280px]",
      cellClass: "min-w-[280px] w-[280px] whitespace-nowrap",
      contentClass:
        "block max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap",
    };
  }

  if (headingText.includes("seller")) {
    return {
      headerClass: "min-w-[180px] w-[180px]",
      cellClass: "min-w-[180px] w-[180px] whitespace-nowrap",
      contentClass:
        "block max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap",
    };
  }

  if (
    headingText.includes("stock") ||
    headingText.includes("reserved") ||
    headingText.includes("attributes")
  ) {
    return {
      headerClass: "min-w-[120px] w-[120px]",
      cellClass: "min-w-[120px] w-[120px] whitespace-nowrap",
      contentClass:
        "block max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap",
    };
  }

  if (headingText.includes("description")) {
    return {
      headerClass: "min-w-[360px] max-w-[420px] w-[380px]",
      cellClass:
        "admin-table-description-cell min-w-[360px] max-w-[420px] w-[380px]",
      contentClass:
        "block max-w-[380px] overflow-hidden text-ellipsis whitespace-nowrap",
    };
  }

  if (headingText.includes("status")) {
    return {
      headerClass: "min-w-[120px] w-[120px] text-center",
      cellClass: "min-w-[120px] w-[120px] text-center",
      contentClass: "flex justify-center",
    };
  }

  if (headingText.includes("action")) {
    return {
      headerClass: "min-w-[140px] text-center",
      cellClass: "admin-table-action-cell min-w-[140px] text-center",
      contentClass: "flex justify-center",
    };
  }

  return {
    headerClass: "min-w-[160px] w-[160px]",
    cellClass: "min-w-[160px] w-[160px] whitespace-nowrap",
    contentClass:
      "block max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap",
  };
};

const TotalRecordsSummary = ({ total }) => (
  <div className="flex items-center justify-between border-t border-[var(--admin-line)] bg-white px-5 py-3 text-sm text-[var(--admin-muted)]">
    <span>Total Records</span>
    <span className="font-semibold text-gray-700">{total}</span>
  </div>
);

const TableData = ({
  tableHeadings = [],
  isHeaderCheckbox = false,
  showExtraHeading,
  data,
  sortColumn,
  sortDirection,
  handleSort,
  showTableSorting = true,
  totalData,
  totalSize,
  currentPage,
  onPageChange,
  loading = false,
  sortableColumns = [],
  allRowsSelected,
  handleHeaderCheckboxChange,
  error = "",
  emptyMessage = "No Data found",
  rowKey,
  stickyHeader = true,
  actions,
  onRefresh,
}) => {
  const visibleColumnCount =
    tableHeadings.length +
    (isHeaderCheckbox ? 1 : 0) +
    (showExtraHeading ? Math.max(0, 10 - tableHeadings.length) : 0);
  const totalRecords = totalData ?? data?.length ?? 0;

  return (
    <>
      <section className="admin-card w-full overflow-hidden bg-white">
        {(actions || onRefresh) && (
          <div className="admin-table-toolbar flex-wrap">
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
            {onRefresh && (
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={onRefresh}
              >
                Refresh
              </button>
            )}
          </div>
        )}
        <div className="w-full">
          {loading ? (
            <TableSkeletonLoader
              columns={tableHeadings.length}
              rows={totalSize || 10}
            />
          ) : error ? (
            <div className="admin-table-error" role="alert">
              {error}
            </div>
          ) : data && Array.isArray(data) && data.length > 0 ? (
            <>
              <div className="hidden w-full lg:block overflow-x-auto">
                <table className="w-full min-w-max table-auto border-collapse text-left font-inter">
                  <thead
                    className={`admin-table-head text-[13px] ${stickyHeader ? "sticky top-0 z-10 shadow-sm" : ""}`}
                  >
                    <tr>
                      {isHeaderCheckbox && (
                        <th
                          key="checkbox-header"
                          className="w-12 px-4 py-3 text-left align-middle"
                        >
                          <CustomCheckbox
                            checked={allRowsSelected}
                            onChange={handleHeaderCheckboxChange}
                          />
                        </th>
                      )}
                      {tableHeadings.map((heading, index) => {
                        const columnMeta = getColumnMeta(heading);
                        const isActions = isActionHeading(heading);

                        return (
                          <th
                            key={`heading-${index}`}
                            className={`px-5 py-3 text-left font-semibold text-[var(--admin-navy)] whitespace-nowrap select-none ${
                              columnMeta.headerClass
                            } ${
                              sortableColumns.includes(index)
                                ? "cursor-pointer hover:bg-[var(--admin-blue-soft)]"
                                : "cursor-default"
                            }`}
                            onClick={
                              sortableColumns.includes(index)
                                ? () => handleSort && handleSort(index)
                                : undefined
                            }
                          >
                            <div
                              className={`flex items-center gap-2 ${
                                isActions ? "justify-center" : ""
                              }`}
                            >
                              <span>{heading}</span>
                              {sortableColumns.includes(index) &&
                                showTableSorting && (
                                  <div className="flex flex-col text-[var(--admin-muted)]">
                                    <IoCaretUpOutline
                                      size={8}
                                      className={`${
                                        sortColumn === index &&
                                        sortDirection === "asc"
                                          ? "text-[var(--admin-gold)]"
                                          : ""
                                      }`}
                                    />
                                    <IoCaretDownOutline
                                      size={8}
                                      className={`${
                                        sortColumn === index &&
                                        sortDirection === "desc"
                                          ? "text-[var(--admin-gold)]"
                                          : ""
                                      }`}
                                    />
                                  </div>
                                )}
                            </div>
                          </th>
                        );
                      })}
                      {showExtraHeading &&
                        [...Array(Math.max(0, 10 - tableHeadings.length))].map(
                          (_, index) => (
                            <th
                              key={`extra-${index}`}
                              className="px-4 py-3"
                            ></th>
                          ),
                        )}
                    </tr>
                  </thead>
                  <tbody className="bg-white text-[12px] text-slate-600">
                    {data.map((row, rowIndex) => (
                      <tr
                        key={
                          typeof rowKey === "function"
                            ? rowKey(row, rowIndex)
                            : `row-${rowIndex}`
                        }
                        className="border-b border-[#f0e8dc] last:border-0 transition-colors hover:bg-[var(--admin-surface-soft)]"
                      >
                        {row && Array.isArray(row) && row.length > 0 ? (
                          row.map((cell, cellIndex) => {
                            const headingIndex = isHeaderCheckbox
                              ? cellIndex - 1
                              : cellIndex;
                            const isCheckboxCell =
                              isHeaderCheckbox && cellIndex === 0;
                            const isActions = isActionHeading(
                              tableHeadings[headingIndex],
                            );
                            const columnMeta = getColumnMeta(
                              tableHeadings[headingIndex],
                            );

                            if (isCheckboxCell) {
                              return (
                                <td
                                  key={`cell-${rowIndex}-${cellIndex}`}
                                  className="w-12 px-4 py-3 align-middle"
                                >
                                  <div className="flex justify-start">
                                    {cell}
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={`cell-${rowIndex}-${cellIndex}`}
                                className={`px-5 py-3 align-middle text-[var(--admin-ink)] ${
                                  columnMeta.cellClass
                                }`}
                              >
                                <div
                                  className={`min-w-0 ${
                                    isActions
                                      ? "flex justify-center"
                                      : columnMeta.contentClass
                                  }`}
                                >
                                  {cell}
                                </div>
                              </td>
                            );
                          })
                        ) : (
                          <td
                            colSpan={visibleColumnCount}
                            className="px-4 py-8 text-center text-sm text-gray-500"
                          >
                            No Data Available
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="hidden lg:block">
                <TotalRecordsSummary total={totalRecords} />
              </div>

              <div className="space-y-3 p-3 lg:hidden">
                {data.map((row, rowIndex) => (
                  <div
                    key={`mobile-row-${rowIndex}`}
                    className="overflow-hidden rounded-lg border border-[var(--admin-line)] bg-white"
                  >
                    <div className="flex items-center justify-between border-b border-[var(--admin-line)] bg-[var(--admin-table-head)] px-4 py-3">
                      <span className="text-xs font-semibold text-[var(--admin-navy)]">
                        Record {rowIndex + 1}
                      </span>
                    </div>
                    {row && Array.isArray(row) && row.length > 0 ? (
                      row.map((cell, cellIndex) => (
                        <div
                          key={`mobile-cell-${rowIndex}-${cellIndex}`}
                          className="grid grid-cols-[minmax(96px,42%)_1fr] gap-3 border-b border-[#f0e8dc] px-4 py-3 last:border-b-0"
                        >
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {getMobileHeading(
                              tableHeadings,
                              cellIndex,
                              isHeaderCheckbox,
                            )}
                          </span>
                          <span className="min-w-0 text-right text-sm font-medium text-gray-800">
                            {cell}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No Data Available
                      </div>
                    )}
                  </div>
                ))}
                <div className="overflow-hidden rounded-lg border border-[var(--admin-line)]">
                  <TotalRecordsSummary total={totalRecords} />
                </div>
              </div>
            </>
          ) : (
            <div className="mt-2">
              <Nodata
                nodataLabel={emptyMessage}
                nodataDesc={"There are no Data to display"}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default TableData;
