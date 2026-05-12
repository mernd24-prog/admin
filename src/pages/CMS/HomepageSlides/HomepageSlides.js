/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import TableData from '../../../components/Atoms/TableData/TableData';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import SlideSetup from './components/SlideSetup';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Loader from '../../../components/Loader/Loader';
import Pagination from '../../../components/Pagination/Pagination';
import { deleteContentPage, getContentPages, updateContentPage } from '../../../Redux/adminCoreSlice';

const PAGE_SIZE = 10;
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const contentIdOf = (item = {}) => firstDefined(item.slug, item.id, item._id);

const HomepageSlides = () => {
  const dispatch = useDispatch();
  const selector = useSelector((state) => state.adminCore);

  const payload = selector?.contentPagesData?.data?.data || {};
  const list = payload?.list || [];
  const total = Number(payload?.total || 0);

  const [selectedImage, setSelectedImage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '' });
  const [selectedRow, setSelectedRow] = useState([]);
  const [pageNo, setPageNo] = useState(1);

  const fetchSlides = useCallback(async () => {
    try {
      await dispatch(getContentPages({
        page: pageNo,
        limit: PAGE_SIZE,
        q: filters.search || undefined,
        pageType: 'homepage-slide',
      })).unwrap();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to fetch homepage slides');
    }
  }, [dispatch, pageNo, filters.search]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const handleToggle = useCallback(async (item) => {
    try {
      await dispatch(updateContentPage({
        id: contentIdOf(item),
        published: !item?.published,
      })).unwrap();
      toast.success('Slide status updated');
      fetchSlides();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to update slide status');
    }
  }, [dispatch, fetchSlides]);

  const confirmDelete = useCallback(async () => {
    try {
      await dispatch(deleteContentPage({ id: contentIdOf(deleteTarget) })).unwrap();
      toast.success('Slide deleted successfully');
      setDeleteTarget(null);
      fetchSlides();
    } catch (err) {
      toast.error(err?.message || err || 'Failed to delete slide');
    }
  }, [deleteTarget, dispatch, fetchSlides]);

  const tableHeadings = ['Media', 'Title', 'Status', 'Action'];

  const tableRows = list.map((item, index) => {
    const image = firstDefined(item?.metadata?.image, item?.metadata?.thumbnail, item?.media?.url, '');
    const title = firstDefined(item?.title, item?.name, `Slide ${index + 1}`);

    return [
      <span className='flex items-center cursor-pointer' onClick={() => image && setSelectedImage(image)}>
        {image ? <img src={image} alt='' className='object-cover w-24 h-14 rounded' /> : <span className='text-xs text-gray-500'>No image</span>}
      </span>,
      title,
      <ToggleButton isToggle={Boolean(item?.published)} handleClick={() => handleToggle(item)} />,
      <ActionButtons
        showLinkButton={false}
        onEdit={() => setIsModalOpen(true)}
        onDelete={() => setDeleteTarget(item)}
      />,
    ];
  });

  return (
    <>
      <Loader loading={selector.loading} />
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto space-y-3'>
        <h3 className='text-gray-500 text-sm font-semibold py-3'>
          <Link to='/app/home'>Home</Link> / <span className='text-[#181c32]'>Homepage Slides</span>
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
              fetchSlides();
            }}
            handleSearchRemove={() => {
              setFilters({ search: '' });
              setPageNo(1);
            }}
          />
          <TableData
            Heading='Homepage Slides'
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
          <Pagination
            totalPages={Math.ceil(total / PAGE_SIZE)}
            currentPage={pageNo}
            onPageChange={setPageNo}
          />
        )}
      </div>
      <SlideSetup isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <DeletePopup
        isDeleteModalOpen={Boolean(deleteTarget)}
        closeDeleteModal={() => setDeleteTarget(null)}
        confirmDelete={confirmDelete}
        DeleteHeading='Are you sure you want to delete?'
      />
      <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
};

export default HomepageSlides;
