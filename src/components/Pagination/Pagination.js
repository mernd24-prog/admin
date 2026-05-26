import React, { memo } from 'react'
import { LuChevronRight, LuChevronLeft } from "react-icons/lu";

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
  const handlePageChange = page => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }
  const renderPageNumbers = () => {
    const pageNumbers = []
    const maxPagesToShow = 5
    const isTruncated = totalPages > maxPagesToShow 
    for (let i = 1; i <= Math.min(2, totalPages); i++) {
      pageNumbers.push(i)
    }
    if (isTruncated && currentPage > 4) {
      pageNumbers.push('...')
    }
    for (
      let i = Math.max(3, currentPage - 1);
      i <= Math.min(totalPages - 2, currentPage + 1);
      i++
    ) {
      pageNumbers.push(i)
    }
    if (isTruncated && currentPage < totalPages - 3) {
      pageNumbers.push('...')
    }
    for (let i = Math.max(totalPages - 1, 3); i <= totalPages; i++) {
      if (i > 2) {
        pageNumbers.push(i)
      }
    } 
    return pageNumbers
  }

  const pageNumbers = renderPageNumbers()

  return (
    <div className='admin-pagination flex flex-wrap items-center justify-end gap-3'>
      {!compact && totalRecords !== undefined && pageSize && (
        <span className="text-xs text-gray-500">
          {totalRecords ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, totalRecords)} of {totalRecords}
        </span>
      )}
      {onPageSizeChange && (
        <label className="inline-flex items-center gap-2 text-xs text-gray-500">
          Rows
          <select
            className="admin-input !h-8 !w-auto"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      )}
      <nav
        className='flex flex-row items-center justify-between flex-nowrap md:justify-center'
        aria-label='Pagination'
      >
        <button
          className='flex mx-1 justify-center items-center bg-transparent text-[#0F172AB2] hover:text-black transition duration-300 text-[13px] font-[600] cursor-pointer'
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
        >
         First
        </button>
        <button
          className='flex w-8 h-8 mx-1 justify-center items-center rounded-[8px] border
           border-[#D2D2D2] bg-transparent text-black hover:bg-gradient-to-r from-[#f3e8ca] to-[#f3e8ca] transition duration-300'
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <LuChevronLeft />
        </button>

        {pageNumbers.map((page, index) => (
          <button
            key={index}
            className={`flex w-8 h-8 mx-1 justify-center items-center rounded-[8px] border border-[#D2D2D2] text-black ${currentPage === page
              ? 'bg-[#dbdde0] text-black'
              : 'bg-transparent hover:bg-gradient-to-r from-[#f3e8ca] to-[#f3e8ca] transition duration-300'
              }`}
            onClick={() => handlePageChange(page)}
            disabled={page === '...'}
            aria-current={currentPage === page ? "page" : undefined}
            aria-label={page === "..." ? "More pages" : `Page ${page}`}
          >
            {page}
          </button>
        ))}

        <button
          className='flex w-8 h-8 mx-1 justify-center items-center rounded-[8px] border border-[#D2D2D2] bg-transparent text-black hover:bg-gradient-to-r from-[#f3e8ca] to-[#f3e8ca] transition duration-300'
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <LuChevronRight />
        </button>
        <button
          className='flex items-center justify-center mx-1 text-[#0F172AB2] transition duration-300 bg-transparent hover:text-black text-[13px] font-[600] cursor-pointer'
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
        >
          Last
        </button>
      </nav>
    </div>
  )
}

export default memo(Pagination)
