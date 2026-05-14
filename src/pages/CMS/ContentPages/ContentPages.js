/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import TableData from '../../../components/Atoms/TableData/TableData';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import DeletePopup from '../../../components/Atoms/DeletePopup.js/DeletePopup';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import ToggleButton from '../../../components/Atoms/ToggleButton/ToggleButton';
import Pagination from '../../../components/Pagination/Pagination';
import Loader from '../../../components/Loader/Loader';
import ContentPageSetup from './components/ContentPageSetup';
import {
  createContentPage,
  deleteContentPage,
  getContentPages,
  updateContentPage,
} from '../../../Redux/adminCoreSlice';

const PAGE_SIZE = 10;

const emptyForm = {
  slug: "",
  title: "",
  pageType: "",
  body: "",
  excerpt: "",
  category: "",
  tags: [],
  coverImage: "",
  thumbnailUrl: "",
  heroImage: "",
  galleryImages: [],
  author: {
    name: "",
    avatar: "",
  },
  readTime: 0,
  language: "en",
  published: false,
  publishedAt: "",
  metadata: {},
};
const slugify = (value = '') =>
  String(value || 'content-page')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'content-page';

const pageSlug = (page = {}) => page?.slug || page?.id || page?._id || '';

const ContentPages = () => {
  const dispatch = useDispatch();
  const selector = useSelector(state => state.adminCore);
  const [pageNo, setPageNo] = useState(1);
  const [filters, setFilters] = useState({ search: '' });
  const [isRefresh, setIsRefresh] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const payload = selector?.contentPagesData?.data?.data || {};
  const pages = payload?.list || [];
  const total = payload?.total || 0;

  const fetchPages = useCallback(() => {
    dispatch(getContentPages({
      page: pageNo,
      limit: PAGE_SIZE,
      q: filters.search,
    }));
  }, [dispatch, pageNo, filters.search]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages, isRefresh]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'title' && !prev.recordSlug && !prev.slug ? { slug: slugify(value) } : {}),
    }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.title.trim()) nextErrors.title = 'Title is required';
    if (!formData.slug.trim()) nextErrors.slug = 'Slug is required';
    if (!formData.pageType.trim()) nextErrors.pageType = 'Page type is required';
    if (!formData.body.trim()) nextErrors.body = 'Body is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(emptyForm);
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    // if (!validate()) return;

    const body = {
      ...formData
    };

    try {
      if (formData.recordSlug) {
        await dispatch(updateContentPage({ ...body, slug: formData.recordSlug })).unwrap();
        toast.success('Content page updated successfully');
      } else {
        await dispatch(createContentPage(body)).unwrap();
        toast.success('Content page created successfully');
      }
      closeModal();
      setIsRefresh(value => !value);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to save content page');
    }
  };

  const openEdit = (page) => {
    setFormData({
      recordSlug: pageSlug(page),
      slug: page.slug || pageSlug(page),
      title: page.title || '',
      pageType: page.pageType || 'content',
      language: page.language || 'en',
      body: page.body || '',
      published: Boolean(page.published),
    });
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    const slug = pageSlug(deleteTarget);
    if (!slug) return;
    try {
      await dispatch(deleteContentPage({ slug })).unwrap();
      toast.success('Content page deleted successfully');
      setDeleteTarget(null);
      setIsRefresh(value => !value);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to delete content page');
    }
  };

  const togglePublished = async (page) => {
    try {
      await dispatch(updateContentPage({
        slug: pageSlug(page),
        published: !page.published,
      })).unwrap();
      toast.success('Status updated successfully');
      setIsRefresh(value => !value);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to update status');
    }
  };

  const tableRows = pages.map((page) => [
    <span className="font-medium">{page.title}</span>,
    <span className="font-mono text-xs">{page.slug}</span>,
    <span className="capitalize">{page.pageType}</span>,
    <span>{page.language || 'en'}</span>,
    <ToggleButton isToggle={Boolean(page.published)} handleClick={() => togglePublished(page)} />,
    <ActionButtons
      showLinkButton={false}
      onEdit={() => openEdit(page)}
      onDelete={() => setDeleteTarget(page)}
    />,
  ]);

  return (
    <>
      <Loader loading={selector.loading} />
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto'>
        <div className='p-4 overflow-auto bg-white rounded-lg border border-[#E6E6E6]'>
          <div className="border-b mb-4">
            <SearchComponent
              isSearchShow={true}
              filters={filters}
              setFilters={setFilters}
              placeholder="Search content pages"
              applyFilters={() => {
                setPageNo(1);
                setIsRefresh(value => !value);
              }}
              handleSearchRemove={() => {
                setFilters({ search: '' });
                setPageNo(1);
                setIsRefresh(value => !value);
              }}
            />
          </div>
          <TableData
            Heading="Content Pages"
            tableHeadings={['Title', 'Slug', 'Type', 'Language', 'Published', 'Actions']}
            data={tableRows}
            showAddButton={true}
            addButtonLabel="Add"
            onClickFunction={() => setIsModalOpen(true)}
            totalData={total}
            totalSize={PAGE_SIZE}
            currentPage={pageNo}
            onPageChange={setPageNo}
          />
          <div className="flex justify-center my-6">
            {total > PAGE_SIZE && (
              <Pagination
                totalPages={Math.ceil(total / PAGE_SIZE)}
                currentPage={pageNo}
                onPageChange={setPageNo}
              />
            )}
          </div>
        </div>
      </div>
      <DeletePopup
        isDeleteModalOpen={Boolean(deleteTarget)}
        closeDeleteModal={() => setDeleteTarget(null)}
        confirmDelete={confirmDelete}
        DeleteHeading="Are you sure you want to delete this content page?"
      />
      <ContentPageSetup
        errors={errors}
        formData={formData}
        isOpen={isModalOpen}
        onChange={onChange}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default ContentPages;
