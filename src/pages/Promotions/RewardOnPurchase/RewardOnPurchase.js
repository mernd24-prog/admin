/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../components/Atoms/TableData/TableData';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import AddEditRewardOnPurchase from './components/AddEditRewardOnPurchase';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Loader from '../../../components/Loader/Loader';
import Pagination from '../../../components/Pagination/Pagination';
import { deleteContentPage, getContentPages } from '../../../Redux/adminCoreSlice';

const PAGE_SIZE = 10;
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const contentIdOf = (item = {}) => firstDefined(item.slug, item.id, item._id);

const RewardOnPurchase = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);

  const payload = selector?.contentPagesData?.data?.data || {};
  const list = payload?.list || [];
  const total = Number(payload?.total || 0);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '' });
  const [selectedRow, setSelectedRow] = useState([]);
  const [pageNo, setPageNo] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      await dispatch(getContentPages({
        page: pageNo,
        limit: PAGE_SIZE,
        q: filters.search || undefined,
        pageType: 'reward_on_purchase',
      })).unwrap();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to fetch reward rules');
    }
  }, [dispatch, filters.search, pageNo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const confirmDelete = useCallback(async () => {
    try {
      await dispatch(deleteContentPage({ id: contentIdOf(deleteTarget) })).unwrap();
      toast.success('Reward rule deleted successfully');
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to delete reward rule');
    }
  }, [deleteTarget, dispatch, fetchData]);

  const tableHeadings = ['Min Purchase Amt', 'Reward Point', 'Actions'];

  const tableRows = list.map((item) => [
    firstDefined(item?.metadata?.minPurchaseAmt, item?.metadata?.minPurchase, '0.00'),
    firstDefined(item?.metadata?.rewardPoint, item?.metadata?.points, '0'),
    <ActionButtons
      onDelete={() => setDeleteTarget(item)}
      showLinkButton={false}
      onEdit={() => setIsModalOpen(true)}
    />,
  ]);

  return (
    <>
      <Loader loading={selector.loading} />
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto space-y-3'>
        <h3 className='text-gray-500 text-sm font-semibold py-3'>
          <Link to='/app/home'>Home</Link> / <span className='text-[#181c32]'>Reward On Purchase</span>
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
            Heading='Reward On Purchase'
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            showFilter={false}
            showSummary={false}
            showAddButton={true}
            addButtonLabel='Add'
            onClickFunction={() => setIsModalOpen(true)}
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
        DeleteHeading='Are you sure you want to delete this reward rule?'
      />
      <AddEditRewardOnPurchase isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default RewardOnPurchase;
