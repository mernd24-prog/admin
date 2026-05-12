/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import TableData from '../../../components/Atoms/TableData/TableData';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Loader from '../../../components/Loader/Loader';
import Pagination from '../../../components/Pagination/Pagination';
import { getContentPages } from '../../../Redux/adminCoreSlice';

const PAGE_SIZE = 10;
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const RecommendedProductTagWeightages = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);
  const payload = selector?.contentPagesData?.data?.data || {};
  const list = payload?.list || [];
  const total = Number(payload?.total || 0);

  const [filters, setFilters] = useState({ search: '' });
  const [selectedRow, setSelectedRow] = useState([]);
  const [pageNo, setPageNo] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      await dispatch(getContentPages({ page: pageNo, limit: PAGE_SIZE, q: filters.search || undefined, pageType: 'recommended_tag_weightage' })).unwrap();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to fetch recommended tag weightages');
    }
  }, [dispatch, filters.search, pageNo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tableHeadings = ['Tag', 'Product', 'System Weightage', 'Custom Weightage', 'Valid Till'];
  const tableRows = list.map((item) => [
    firstDefined(item?.metadata?.tag, 'N/A'),
    firstDefined(item?.metadata?.product, item?.title, 'N/A'),
    firstDefined(item?.metadata?.systemWeightage, '0.00'),
    firstDefined(item?.metadata?.customWeightage, '0.00'),
    firstDefined(item?.metadata?.validTill, '-'),
  ]);

  return (
    <>
      <Loader loading={selector.loading} />
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto space-y-3'>
        <h3 className='text-gray-500 text-sm font-semibold py-3'>
          <Link to='/app/home'>Home</Link> / <span className='text-[#181c32]'>Recommended Product Tag Weightages</span>
        </h3>
        <div className='p-4 overflow-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <SearchComponent tableHeadings={tableHeadings} data={tableRows} selectedRow={selectedRow} setSelectedRow={setSelectedRow} loading={selector.loading} filters={filters} setFilters={setFilters} isSearchShow={true} isActionButton={false} isStatusAction={false} isDelete={false} applyFilters={() => { setPageNo(1); fetchData(); }} handleSearchRemove={() => { setFilters({ search: '' }); setPageNo(1); }} />
          <TableData Heading='Recommended Product Tag Weightages' tableHeadings={tableHeadings} data={tableRows} showSearch={true} showFilter={false} showSummary={false} showAddButton={false} isHeaderCheckbox={false} totalData={total} />
        </div>
        {total > PAGE_SIZE && <Pagination totalPages={Math.ceil(total / PAGE_SIZE)} currentPage={pageNo} onPageChange={setPageNo} />}
      </div>
    </>
  );
};

export default RecommendedProductTagWeightages;
