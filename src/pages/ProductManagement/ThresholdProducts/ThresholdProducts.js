/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import TableData from '../../../components/Atoms/TableData/TableData';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import SearchComponent from '../../../components/Atoms/New Table/NewTable';
import Loader from '../../../components/Loader/Loader';
import Pagination from '../../../components/Pagination/Pagination';
import { ActionButtons } from '../../../components/Atoms/TableActionButton/TableActionButton';
import { getProducts } from '../../../Redux/productSlice';

const PAGE_SIZE = 10;
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const productIdOf = (product = {}) => firstDefined(product._id, product.id, product.productId);

const ThresholdProducts = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selector = useSelector((state) => state.product);

  const listResponse = selector?.getProductsData?.data?.data || {};
  const list = listResponse?.list || [];
  const total = Number(listResponse?.total || 0);

  const [selectedImage, setSelectedImage] = useState(null);
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
      toast.error(err?.message || err || 'Failed to fetch threshold products');
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

  const tableHeadings = ['Product Name', 'Stock Left', 'Threshold Stock', 'Action'];

  const tableRows = list.map((product) => {
    const id = productIdOf(product);
    const title = firstDefined(product?.title, product?.name, product?.productName, 'N/A');
    const image = firstDefined(product?.thumbnail, product?.thumbnails, product?.images?.[0], '');
    const stock = Number(firstDefined(product?.stock, product?.quantity, 0));
    const thresholdStock = Number(firstDefined(product?.thresholdStock, product?.threshold, 0));
    const seller = product?.sellerId || product?.seller || {};
    const sellerLabel = typeof seller === 'object'
      ? firstDefined(seller?.name, seller?.email, seller?.phone, 'N/A')
      : String(seller || 'N/A');

    return [
      <span className='flex items-center space-x-2'>
        {image ? (
          <img
            src={image}
            alt={title}
            className='object-cover w-14 h-14 border rounded cursor-pointer'
            onClick={() => setSelectedImage(image)}
          />
        ) : (
          <span className='w-14 h-14 border rounded bg-gray-100' />
        )}
        <div className='flex flex-col'>
          <span className='text-sm font-medium'>{title}</span>
          <span className='text-sm text-gray-500'>Seller: {sellerLabel}</span>
        </div>
      </span>,
      <span>{stock}</span>,
      <span>{thresholdStock}</span>,
      <ActionButtons
        showDeleteButton={false}
        showEditButton={false}
        showViewButton={false}
        viewButton={true}
        onViewClick={() => {
          if (!id) {
            toast.error('Product ID not found');
            return;
          }
          navigate(`/app/product-catalog/view/${id}`);
        }}
      />,
    ];
  });

  return (
    <>
      <Loader loading={isLoading} />
      <div className='p-6 overflow-hidden overflow-x-auto overflow-y-auto max-w-7xl mx-auto space-y-3'>
        <h3 className='text-gray-500 text-sm font-semibold py-3'>
          <Link to='/app/home'>Home</Link> / <span className='text-[#181c32]'>Threshold Products</span>
        </h3>
        <div className='overflow-auto overflow-y-auto bg-white'>
          <div className='border-b p-2 border-[#dee2e6]'>
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
            Heading='Threshold Products'
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
      <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
};

export default ThresholdProducts;
