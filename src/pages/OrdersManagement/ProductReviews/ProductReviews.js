/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useMemo } from 'react';
import TableData from '../../../components/Atoms/TableData/TableData';
import ImageViewer from '../../../components/ImageViewer/ImageViewer';
import EditProductReview from './components/EditProductReview';
import { useDispatch, useSelector } from 'react-redux';
import { getReviewList } from '../../../Redux/orderSlice';
import Loader from '../../../components/Loader/Loader';
import { Link } from 'react-router-dom';
import Pagination from '../../../components/Pagination/Pagination';
const SIZE = 10

const ProductReviews = () => {
  const dispatch = useDispatch();
  const reviewsData = useSelector(state => state.order);

  const [selectedImage, setSelectedImage] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageNo, setPageNo] = useState(1)

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating = 0) => {
    return (
      <div className="flex items-center justify-center">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`text-xl ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const apiPayload = {
          size: SIZE,
          pageNo: pageNo,
          populate:
            "user_id:userName,email,fullName| product_id: name,product_catalogs_id,store_id | product_id.product_catalogs_id:images |product_id.store_id:name,user_id | product_id.store_id.user_id:userName,email"
        };
        await dispatch(getReviewList(apiPayload)).unwrap();
      } catch (err) {
        setError('Failed to fetch product reviews. Please try again.');
        console.error('Review fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [dispatch]);

  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  const tableHeadings = [
    "Product",
    "Store",
    "Reviewed By",
    "Rating",
    "Comment",
    "Date",
  ];

  const tableRows = useMemo(() => {
    const list = reviewsData?.getReviewListData?.data?.data?.list;

    if (!Array.isArray(list)) return [];

    return list.map((review, index) => {
      try {
        const product = review.product_id || {};
        const store = product.store_id || {};
        const user = review.user_id || {};
        const productCatalog = product.product_catalogs_id || {};
        const productImage = productCatalog.images?.[0] || '/placeholder-image.jpg';

        return [
          <div
            key={`product-${index}`}
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80"
            onClick={() => handleImageClick(productImage)}
          >
            <img
              src={productImage}
              alt={product.name || 'Product'}
              className="object-cover w-16 h-16 border rounded-lg shadow-sm"
              onError={(e) => {
                e.target.src = '/placeholder-image.jpg';
              }}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 line-clamp-2">
                {product.name || 'N/A'}
              </span>
            </div>
          </div>,

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {store.name || 'Unknown Store'}
            </span>
            <span className="text-xs text-gray-500">
              {store.email || 'N/A'}
            </span>
          </div>,

          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              {user.fullName || user.userName || 'Anonymous'}
            </span>
            <span className="text-xs text-gray-500">
              {user.email || 'N/A'}
            </span>
          </div>,

          <div className="flex flex-col items-center">
            {renderStars(review.rating)}
            <span className="text-xs text-gray-500 mt-1">
              {review.rating}/5
            </span>
          </div>,

          <div className="max-w-xs">
            <p className="text-sm text-gray-700 line-clamp-3" title={review.comment}>
              {review.comment || 'No comment'}
            </p>
          </div>,

          <div className="flex flex-col">
            <span className="text-sm text-gray-900">
              {formatDate(review.createdAt)}
            </span>
            <span className="text-xs text-gray-500">
              Updated: {formatDate(review.updatedAt)}
            </span>
          </div>,
        ];
      } catch (innerErr) {
        console.error('Error rendering review row:', innerErr);
        return ['Invalid data', '', '', '', '', ''];
      }
    });
  }, [reviewsData]);

  return (
    <>
      <Loader loading={isLoading} />
      <div className="p-6 max-w-7xl mx-auto space-y-3">
        <h3><Link to="/app/setting">Home</Link> / Product Review</h3>

        <div className="bg-white  border border-gray-200 shadow-sm">
          {error ? (
            <div className="text-red-600 p-4">{error}</div>
          ) : (
            <TableData
              Heading="Product Reviews"
              tableHeadings={tableHeadings}
              data={tableRows}
              showSearch={true}
              placeholder="Search reviews, products, users..."
              showFilter={false}
              showSummary={false}
              showAddButton={false}
              totalData={reviewsData?.getReviewListData?.data?.data?.total || 0}
              emptyMessage={isLoading ? 'Loading reviews...' : 'No reviews found'}
            />
          )}
        </div>

        {reviewsData?.getReviewListData?.data?.data?.total > SIZE && (
          <Pagination
            totalPages={Math.ceil(reviewsData?.getReviewListData?.data?.data?.total / SIZE)}
            currentPage={pageNo}
            onPageChange={onPageChange}
          />
        )}
      </div>

      <ImageViewer imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />

      <EditProductReview
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedReview(null);
        }}
        reviewData={selectedReview}
      />
    </>
  );
};

export default ProductReviews;
