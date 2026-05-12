/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import TableData from '../../../components/Atoms/TableData/TableData';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Loader from '../../../components/Loader/Loader';
import Pagination from '../../../components/Pagination/Pagination';
import { getProducts } from '../../../Redux/productSlice';

const PAGE_SIZE = 10;
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const ProductTags = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.product);

  const listResponse = selector?.getProductsData?.data?.data || {};
  const list = listResponse?.list || [];
  const total = Number(listResponse?.total || 0);

  const [filters, setFilters] = useState({ search: '' });
  const [selectedRow, setSelectedRow] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageNo, setPageNo] = useState(1);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      await dispatch(
        getProducts({
          page: pageNo,
          limit: PAGE_SIZE,
          search: filters.search || undefined,
        }),
      ).unwrap();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to fetch product tags');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, pageNo, filters.search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handlePageChange = useCallback((newPageNo) => {
    setPageNo(newPageNo);
  }, []);

  const applyFilters = useCallback(() => {
    setPageNo(1);
    fetchProducts();
  }, [fetchProducts]);

  const handleSearchRemove = useCallback(() => {
    setFilters({ search: '' });
    setPageNo(1);
  }, []);

  const tableHeadings = ['Product Name', 'Tags'];

  const tableRows = list.map((product) => {
    const title = firstDefined(product?.title, product?.name, product?.productName, 'N/A');
    const tags = Array.isArray(product?.tags) ? product.tags : [];

    return [
      <span className='text-sm font-medium'>{title}</span>,
      <div className='flex flex-wrap gap-1'>
        {tags.length > 0 ? tags.map((tag) => (
          <span key={`${product?._id || product?.id || title}-${tag}`} className='inline-flex px-2 py-0.5 rounded-full text-xs bg-[#eef3ff] text-[#2d4db3]'>
            #{tag}
          </span>
        )) : <span className='text-xs text-gray-500'>No tags</span>}
      </div>,
    ];
  });

  return (
    <>
      <Loader loading={isLoading} />
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto space-y-3'>
        <h3 className='text-gray-500 text-sm font-semibold py-3'>
          <Link to='/app/home'>Home</Link> / <span className='text-[#181c32]'>Product Tags</span>
        </h3>
        <div className='overflow-auto overflow-y-auto bg-white'>
          <div className='p-2 border-b'>
            <SearchComponent
              tableHeadings={tableHeadings}
              data={tableRows}
              selectedRow={selectedRow}
              setSelectedRow={setSelectedRow}
              loading={isLoading}
              filters={filters}
              setFilters={setFilters}
              isSearchShow={true}
              isActivationStatus={false}
              isApprovalOptions={false}
              isProduct={false}
              isUser={false}
              isActionButton={false}
              isSearchDown={false}
              isStatusAction={false}
              isDelete={false}
              applyFilters={applyFilters}
              handleSearchRemove={handleSearchRemove}
            />
          </div>
          <TableData
            Heading='Product Tags'
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder='Search by product name...'
            showFilter={false}
            showSummary={false}
            showAddButton={false}
            isHeaderCheckbox={false}
            totalData={total}
          />
        </div>
        {total > PAGE_SIZE && (
          <Pagination
            totalPages={Math.ceil(total / PAGE_SIZE)}
            currentPage={pageNo}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </>
  );
};

export default ProductTags;
