/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Loader from '../../../components/Loader/Loader';
import Pagination from '../../../components/Pagination/Pagination';
import { deleteContentPage, getContentPages } from '../../../Redux/adminCoreSlice';

const PAGE_SIZE = 10;
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const contentIdOf = (item = {}) => firstDefined(item.slug, item.id, item._id);

const PPCPromotionsManagement = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);

  const payload = selector?.contentPagesData?.data?.data || {};
  const list = payload?.list || [];
  const total = Number(payload?.total || 0);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filters, setFilters] = useState({ search: '' });
  const [selectedRow, setSelectedRow] = useState([]);
  const [pageNo, setPageNo] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      await dispatch(getContentPages({
        page: pageNo,
        limit: PAGE_SIZE,
        q: filters.search || undefined,
        pageType: 'ppc_promotion',
      })).unwrap();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to fetch PPC promotions');
    }
  }, [dispatch, filters.search, pageNo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const confirmDelete = useCallback(async () => {
    try {
      await dispatch(deleteContentPage({ id: contentIdOf(deleteTarget) })).unwrap();
      toast.success('PPC promotion deleted successfully');
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to delete PPC promotion');
    }
  }, [deleteTarget, dispatch, fetchData]);

  const tableHeadings = ['Promotion Name', 'Promotion Advertiser', 'Type', 'CPC', 'Budget', 'Impressions', 'Clicks', 'Approved', 'Actions'];

  const tableRows = list.map((item) => {
    const md = item?.metadata || {};
    return [
      firstDefined(item?.title, md?.promotionName, 'N/A'),
      <div className='flex flex-col'>
        <span className='text-sm font-bold capitalize'>{firstDefined(md?.advertiser, 'N/A')}</span>
        <span className='text-sm text-gray-500'>Seller: {firstDefined(md?.seller, 'N/A')}</span>
      </div>,
      firstDefined(md?.type, 'N/A'),
      firstDefined(md?.cpc, '0.00'),
      firstDefined(md?.budget, '0.00'),
      firstDefined(md?.impressions, 0),
      firstDefined(md?.clicks, 0),
      firstDefined(md?.approved, 'Pending'),
      <ActionButtons onDelete={() => setDeleteTarget(item)} showLinkButton={false} />,
    ];
  });

  return (
    <>
      <Loader loading={selector.loading} />
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto space-y-3'>
        <h3 className='text-gray-500 text-sm font-semibold py-3'>
          <Link to='/app/home'>Home</Link> / <span className='text-[#181c32]'>PPC Promotions Management</span>
        </h3>
        <div className='p-4 overflow-auto overflow-y-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <SearchComponent
            tableHeadings={tableHeadings}
            data={tableRows}
            selectedRow={selectedRow}
            setSelectedRow={setSelectedRow}
            loading={selector.loading}
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
            applyFilters={() => {
              setPageNo(1);
              fetchData();
            }}
            handleSearchRemove={() => {
              setFilters({ search: '' });
              setPageNo(1);
            }}
          />
          <TableData
            Heading='PPC Promotions Management'
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder='Search by promotion name, advertiser...'
            showFilter={false}
            showSummary={false}
            showAddButton={false}
            isHeaderCheckbox={false}
            totalData={total}
          />
        </div>
        {total > PAGE_SIZE && (
          <Pagination totalPages={Math.ceil(total / PAGE_SIZE)} currentPage={pageNo} onPageChange={setPageNo} />
        )}
      </div>
      <DeletePopup
        isDeleteModalOpen={Boolean(deleteTarget)}
        closeDeleteModal={() => setDeleteTarget(null)}
        confirmDelete={confirmDelete}
        DeleteHeading='Are you sure you want to delete this promotion?'
      />
    </>
  );
};

export default PPCPromotionsManagement;
