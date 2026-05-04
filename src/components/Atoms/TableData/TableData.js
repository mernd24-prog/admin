import React from "react";
import { IoCaretDownOutline, IoCaretUpOutline } from "react-icons/io5";
import Nodata from "../NoData/NoData";
// import Pagination from "../../Pagination/Pagination";
import { TableSkeletonLoader } from "../../Loader/SkeletonLoader";
import CustomCheckbox from "../Checkbox/Checkbox";

const TableData = ({
  tableHeadings = [], isHeaderCheckbox = false,
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
  sortableColumns = [], allRowsSelected, handleHeaderCheckboxChange

}) => {


  return (
    <>
      <section className="w-full overflow-hidden">
        <div className="w-full">
          {loading ? (
            <TableSkeletonLoader
              columns={tableHeadings.length}
              rows={totalSize || 10}
            />
          ) : data && Array.isArray(data) && data.length > 0 ? (
            <>
              <div className="hidden w-full border-b-[#ebedf0] lg:block overflow-hidden overflow-x-auto overflow-y-auto">
                <table className="w-full text-sm text-gray-800 bg-transparent border-collapse table-auto">
                  <thead className="">
                    <tr className="border-b border-[#edeff1]">
                      {
                        isHeaderCheckbox && (
                          <th key="checkbox-header" className="px-4 py-4 font-semibold text-left text-black  whitespace-nowrap">
                            <CustomCheckbox checked={allRowsSelected} onChange={handleHeaderCheckboxChange} />
                          </th>
                        )
                      }
                      {tableHeadings.map((heading, index) => (
                        <th
                          key={`heading-${index}`}
                          className={` px-4 py-4 font-medium text-left text-black whitespace-nowrap ${sortableColumns.includes(index)
                            ? "cursor-pointer"
                            : "cursor-default"
                            }`}
                          onClick={
                            sortableColumns.includes(index)
                              ? () => handleSort && handleSort(index)
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-1">
                            {heading}
                            {sortableColumns.includes(index) &&
                              showTableSorting && (
                                <div className="flex flex-col">
                                  <IoCaretUpOutline
                                    size={8}
                                    className={`${sortColumn === index &&
                                      sortDirection === "asc"
                                      ? "text-blue-600"
                                      : "text-gray-400"
                                      }`}
                                  />
                                  <IoCaretDownOutline
                                    size={8}
                                    className={`${sortColumn === index &&
                                      sortDirection === "desc"
                                      ? "text-blue-600"
                                      : "text-gray-400"
                                      }`}
                                  />
                                </div>
                              )}
                          </div>
                        </th>
                      ))}
                      {showExtraHeading &&
                        [...Array(Math.max(0, 10 - tableHeadings.length))].map(
                          (_, index) => <th key={`extra-${index}`} className="p-2"></th>
                        )}
                    </tr>
                  </thead>
                  <tbody className="">
                    {data.map((row, rowIndex) => (
                      <tr
                        key={`row-${rowIndex}`}
                        className="border-t border-[#edeff1]  hover:bg-gray-100"
                      >
                        {row && Array.isArray(row) && row.length > 0 ? (
                          row.map((cell, cellIndex) => (
                            <td
                              key={`cell-${rowIndex}-${cellIndex}`}
                              className="px-4 py-4 text-gray-700 align-top"
                            >
                              {cell}
                            </td>
                          ))
                        ) : (
                          <td
                            colSpan={
                              tableHeadings.length + (showExtraHeading ? 5 : 0)
                            }
                            className="p-2 text-center text-gray-500 whitespace-nowrap"
                          >
                            No Data Available
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-start gap-4 p-2 text-sm text-gray-500">
                  <p>Total Records :</p>
                  <p>{totalData}</p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden overflow-y-auto lg:hidden">
                {data.map((row, rowIndex) => (
                  <div
                    key={`mobile-row-${rowIndex}`}
                    className="p-4 mb-4 border border-[#dbdbdb]"
                  >
                    <div className="flex items-center justify-between pb-3 mb-3">
                      {/* Mobile row header area */}
                    </div>
                    {row && Array.isArray(row) && row.length > 0 ? (
                      row.map((cell, cellIndex) => (
                        <div
                          key={`mobile-cell-${rowIndex}-${cellIndex}`}
                          className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200"
                        >
                          <span className="text-xs font-medium text-gray-700">
                            {tableHeadings[cellIndex - 1] || "Select"} {/* Adjust for checkbox column */}
                          </span>
                          <span className="text-sm font-medium">{cell}</span>
                        </div>
                      ))
                    ) : (
                      <div className="h-4 p-4 text-sm text-center text-gray-500">
                        No Data Available
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-2">
              <Nodata
                nodataLabel={"No Data found"}
                nodataDesc={"There are no Data to display"}
              />
            </div>
          )}
        </div>
      </section>
      {/* {!loading && (
        <div className="flex justify-center my-6">
          {totalData && totalSize && Math.ceil(totalData / totalSize) > 1 && (
            <Pagination
              totalPages={Math.ceil(totalData / totalSize)}
              currentPage={currentPage}
              onPageChange={onPageChange}
            />
          )}
        </div>
      )} */}
    </>
  );
};

export default TableData;