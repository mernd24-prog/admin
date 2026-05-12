import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import ToggleButton from '../../../../components/Atoms/ToggleButton/ToggleButton';
import { ActionButtons } from '../../../../components/Atoms/TableActionButton/TableActionButton';
import TableData from '../../../../components/Atoms/TableData/TableData';
import ImageViewer from '../../../../components/ImageViewer/ImageViewer';
import BannerSetup from './BannerSetup';
import SearchComponent from '../../../../components/Atoms/New Table/NewTable';
import Loader from '../../../../components/Loader/Loader';
import Pagination from '../../../../components/Pagination/Pagination';
import { getContentPages, updateContentPage } from '../../../../Redux/adminCoreSlice';

const PAGE_SIZE = 10;
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const contentIdOf = (item = {}) => firstDefined(item.slug, item.id, item._id);

const Banners = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);

  const payload = selector?.contentPagesData?.data?.data || {};
  const list = payload?.list || [];
  const total = Number(payload?.total || 0);

  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '' });
  const [selectedRow, setSelectedRow] = useState([]);
  const [pageNo, setPageNo] = useState(1);

  const fetchBanners = useCallback(async () => {
    try {
      await dispatch(getContentPages({
        page: pageNo,
        limit: PAGE_SIZE,
        q: filters.search || undefined,
        pageType: 'banner',
      })).unwrap();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to fetch banners');
    }
  }, [dispatch, filters.search, pageNo]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleToggle = useCallback(async (item) => {
    try {
      await dispatch(updateContentPage({
        id: contentIdOf(item),
        published: !item?.published,
      })).unwrap();
      toast.success('Banner status updated');
      fetchBanners();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to update status');
    }
  }, [dispatch, fetchBanners]);

  const tableHeadings = ['Title', 'Type', 'Image', 'Open in (Target)', 'Status', 'Actions'];

  const tableRows = list.map((item) => {
    const image = firstDefined(item?.metadata?.image, item?.metadata?.thumbnail, item?.media?.url, '');
    return [
      firstDefined(item?.title, 'Untitled Banner'),
      firstDefined(item?.metadata?.type, item?.pageType, 'Banner'),
      <span className='flex items-center cursor-pointer' onClick={() => image && setSelectedImage(image)}>
        {image ? <img src={image} alt='' className='object-cover w-24 h-auto' /> : <span className='text-xs text-gray-500'>No image</span>}
      </span>,
      firstDefined(item?.metadata?.target, 'Same Window'),
      <ToggleButton isToggle={Boolean(item?.published)} handleClick={() => handleToggle(item)} />,
      <ActionButtons showLinkButton={false} onEdit={() => setIsModalOpen(true)} showDeleteButton={false} />,
    ];
  });

  return (
    <>
      <Loader loading={selector.loading} />
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto space-y-3'>
        <h3 className='text-gray-500 text-sm font-semibold py-3'>
          <Link to='/app/banners'>Banner Locations</Link> / <span className='text-[#181c32]'>Banners</span>
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
              fetchBanners();
            }}
            handleSearchRemove={() => {
              setFilters({ search: '' });
              setPageNo(1);
            }}
          />
          <TableData
            Heading='Banners'
            tableHeadings={tableHeadings}
            data={tableRows}
            showSearch={true}
            placeholder='Search by title...'
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
      <BannerSetup isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
};

export default Banners;
