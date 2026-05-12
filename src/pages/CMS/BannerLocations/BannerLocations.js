import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import TableData from '../../../components/Atoms/TableData/TableData';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import Bannerlocationsetup from './components/Bannerlocationsetup';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Loader from '../../../components/Loader/Loader';
import Pagination from '../../../components/Pagination/Pagination';
import { getContentPages, updateContentPage } from '../../../Redux/adminCoreSlice';

const PAGE_SIZE = 10;
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const contentIdOf = (item = {}) => firstDefined(item.slug, item.id, item._id);

const BannerLocations = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state.adminCore);

  const payload = selector?.contentPagesData?.data?.data || {};
  const list = payload?.list || [];
  const total = Number(payload?.total || 0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '' });
  const [selectedRow, setSelectedRow] = useState([]);
  const [pageNo, setPageNo] = useState(1);

  const fetchLocations = useCallback(async () => {
    try {
      await dispatch(getContentPages({
        page: pageNo,
        limit: PAGE_SIZE,
        q: filters.search || undefined,
        pageType: 'banner-location',
      })).unwrap();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to fetch banner locations');
    }
  }, [dispatch, filters.search, pageNo]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleToggle = useCallback(async (item) => {
    try {
      await dispatch(updateContentPage({
        id: contentIdOf(item),
        published: !item?.published,
      })).unwrap();
      toast.success('Banner location status updated');
      fetchLocations();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to update status');
    }
  }, [dispatch, fetchLocations]);

  const tableHeadings = ['Title', 'Preferred width (in pixels)', 'Preferred height (in pixels)', 'Promotion Cost', 'Status', 'Actions'];

  const tableRows = list.map((item) => [
    firstDefined(item?.title, 'Untitled Location'),
    firstDefined(item?.metadata?.preferredWidth, item?.metadata?.width, 'N/A'),
    firstDefined(item?.metadata?.preferredHeight, item?.metadata?.height, 'N/A'),
    firstDefined(item?.metadata?.promotionCost, item?.metadata?.cost, 'N/A'),
    <ToggleButton isToggle={Boolean(item?.published)} handleClick={() => handleToggle(item)} />,
    <ActionButtons
      showLinkButton={false}
      onEdit={() => setIsModalOpen(true)}
      showOptionValues={false}
      showDeleteButton={false}
      showBannerButton={true}
      onBanner={() => navigate('/app/inner-banners')}
    />,
  ]);

  return (
    <>
      <Loader loading={selector.loading} />
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto space-y-3'>
        <h3 className='text-gray-500 text-sm font-semibold py-3'>
          <Link to='/app/home'>Home</Link> / <span className='text-[#181c32]'>Banner Locations</span>
        </h3>
        <div className='p-4 overflow-auto bg-white rounded-lg border border-[#E6E6E6]'>
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
              fetchLocations();
            }}
            handleSearchRemove={() => {
              setFilters({ search: '' });
              setPageNo(1);
            }}
          />
          <TableData
            Heading='Banner Locations'
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder='Search by title...'
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
      <Bannerlocationsetup isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default BannerLocations;
