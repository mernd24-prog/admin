import React, { memo } from 'react'
import { LuChevronRight, LuChevronLeft } from "react-icons/lu";

const pageButtonBase =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#082f91]/20 disabled:cursor-not-allowed disabled:opacity-45";

const pageButtonIdle =
  "border-[#dce2ef] bg-white text-slate-600 hover:border-[#082f91]/30 hover:bg-[#f4f7ff] hover:text-[#082f91]";

const pageButtonActive =
  "border-[#082f91] bg-[#082f91] text-white shadow-sm shadow-[#082f91]/20";

const Pagination = ({
  totalPages = 1,
  currentPage = 1,
  onPageChange,
  totalRecords,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  compact = false,
}) => {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const safeCurrentPage = Math.min(
    Math.max(1, Number(currentPage) || 1),
    safeTotalPages,
  );

  const handlePageChange = page => {
    if (typeof page !== "number" || page === safeCurrentPage) return;
    if (page >= 1 && page <= safeTotalPages) {
      onPageChange?.(page)
    }
  }

  const renderPageNumbers = () => {
    const pageNumbers = []
    const maxPagesToShow = 5
    const isTruncated = safeTotalPages > maxPagesToShow

    for (let i = 1; i <= Math.min(2, safeTotalPages); i++) {
      pageNumbers.push(i)
    }

    if (isTruncated && safeCurrentPage > 4) {
      pageNumbers.push('...')
    }

    for (
      let i = Math.max(3, safeCurrentPage - 1);
      i <= Math.min(safeTotalPages - 2, safeCurrentPage + 1);
      i++
    ) {
      pageNumbers.push(i)
    }

    if (isTruncated && safeCurrentPage < safeTotalPages - 3) {
      pageNumbers.push('...')
    }

    for (let i = Math.max(safeTotalPages - 1, 3); i <= safeTotalPages; i++) {
      if (i > 2) {
        pageNumbers.push(i)
      }
    }

    return pageNumbers
  }

  const pageNumbers = renderPageNumbers()
  const rangeStart =
    totalRecords && pageSize ? (safeCurrentPage - 1) * pageSize + 1 : 0;
  const rangeEnd =
    totalRecords && pageSize ? Math.min(safeCurrentPage * pageSize, totalRecords) : 0;

  const wrapperClass = compact
    ? "admin-pagination flex flex-wrap items-center justify-end gap-3"
    : "admin-pagination flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e6ebf3] bg-white px-3 py-2 shadow-sm";

  return (
    <div className={wrapperClass}>
      {!compact && totalRecords !== undefined && pageSize && (
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Showing
          </span>
          <span className="text-sm font-semibold text-slate-700">
            {rangeStart}-{rangeEnd} of {totalRecords}
          </span>
        </div>
      )}
      {onPageSizeChange && (
        <label className="inline-flex items-center gap-2 rounded-md border border-[#e6ebf3] bg-[#f8fafc] px-2 py-1 text-xs font-medium text-slate-500">
          Rows per page
          <select
            className="admin-input !h-8 !w-auto !min-w-[68px] !border-[#dce2ef] !bg-white !px-2"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      )}
      <nav
        className='flex flex-row items-center justify-end gap-1 overflow-x-auto'
        aria-label='Pagination'
      >
        <button
          className={`${pageButtonBase} ${pageButtonIdle} hidden sm:inline-flex`}
          onClick={() => handlePageChange(1)}
          disabled={safeCurrentPage === 1}
          aria-label="First page"
        >
         First
        </button>
        <button
          className={`${pageButtonBase} ${pageButtonIdle} !px-0`}
          onClick={() => handlePageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          aria-label="Previous page"
        >
          <LuChevronLeft />
        </button>

        {pageNumbers.map((page, index) => (
          <button
            key={`${page}-${index}`}
            className={`${pageButtonBase} ${
              safeCurrentPage === page ? pageButtonActive : pageButtonIdle
            } ${page === '...' ? "!min-w-7 !border-transparent !bg-transparent !px-1 !text-slate-400 !opacity-100" : ""}`}
            onClick={() => handlePageChange(page)}
            disabled={page === '...'}
            aria-current={safeCurrentPage === page ? "page" : undefined}
            aria-label={page === "..." ? "More pages" : `Page ${page}`}
          >
            {page}
          </button>
        ))}

        <button
          className={`${pageButtonBase} ${pageButtonIdle} !px-0`}
          onClick={() => handlePageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === safeTotalPages}
          aria-label="Next page"
        >
          <LuChevronRight />
        </button>
        <button
          className={`${pageButtonBase} ${pageButtonIdle} hidden sm:inline-flex`}
          onClick={() => handlePageChange(safeTotalPages)}
          disabled={safeCurrentPage === safeTotalPages}
          aria-label="Last page"
        >
          Last
        </button>
      </nav>
    </div>
  )
}

export default memo(Pagination)
