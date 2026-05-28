/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useMemo } from "react";
import TableData from "../../../components/Atoms/TableData/TableData";
import ImageViewer from "../../../components/ImageViewer/ImageViewer";
import EditProductReview from "./components/EditProductReview";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteProductReview,
  getProductReviews,
  updateProductReview,
} from "../../../Redux/adminCoreSlice";
import Loader from "../../../components/Loader/Loader";
import { Link } from "react-router-dom";
import Pagination from "../../../components/Pagination/Pagination";
import ToggleButton from "../../../components/Atoms/ToggleButton/ToggleButton";
import { ActionButtons } from "../../../components/Atoms/TableActionButton/TableActionButton";
import DeletePopup from "../../../components/Atoms/DeletePopup.js/DeletePopup";
import { toast } from "sonner";
const SIZE = 10;

const getReviewsPayload = (state = {}) => {
  const payload = state?.productReviewsData?.data?.data || {};
  const list = payload?.list || payload?.items || [];
  return {
    list: Array.isArray(list) ? list : [],
    total: Number(payload?.total || list.length || 0),
  };
};

const ProductReviews = () => {
  const dispatch = useDispatch();
  const reviewsData = useSelector((state) => state.adminCore);

  const [selectedImage, setSelectedImage] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageNo, setPageNo] = useState(1);

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStars = (rating = 0) => {
    return (
      <div className="flex items-center justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-xl ${star <= rating ? "text-yellow-500" : "text-gray-300"}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await dispatch(getProductReviews({ limit: SIZE, page: pageNo })).unwrap();
    } catch (err) {
      setError(
        err?.message ||
          err ||
          "Failed to fetch product reviews. Please try again.",
      );
      console.error("Review fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [dispatch, pageNo]);

  const onPageChange = (newPageNo) => {
    setPageNo(newPageNo);
  };

  const tableHeadings = [
    "Product ID",
    "Buyer ID",
    "Order ID",
    "Rating",
    "Review",
    "Status",
    "Date",
    "Action",
  ];

  const tableRows = useMemo(() => {
    const { list } = getReviewsPayload(reviewsData);

    return list.map((review, index) => {
      try {
        const reviewId = review._id || review.id;
        const productImage = review.media?.[0] || "/placeholder-image.jpg";
        const comment = review.reviewText || review.comment || "No comment";
        const title = review.title || "";
        const isPublished = (review.status || "published") === "published";

        return [
          <div
            key={`product-${index}`}
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80"
            onClick={() => handleImageClick(productImage)}
          >
            <img
              src={productImage}
              alt={review.productId || "Product"}
              className="object-cover w-16 h-16 border rounded-lg shadow-sm"
              onError={(e) => {
                e.target.src = "/placeholder-image.jpg";
              }}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 break-all line-clamp-2">
                {review.productId || "N/A"}
              </span>
            </div>
          </div>,

          <span className="text-sm text-gray-700 break-all">
            {review.buyerId || "N/A"}
          </span>,

          <span className="text-sm text-gray-700 break-all">
            {review.orderId || "N/A"}
          </span>,

          <div className="flex flex-col items-center">
            {renderStars(review.rating)}
            <span className="text-xs text-gray-500 mt-1">
              {review.rating}/5
            </span>
          </div>,

          <div className="max-w-xs">
            {title && (
              <p className="text-sm font-medium text-gray-900 line-clamp-1">
                {title}
              </p>
            )}
            <p className="text-sm text-gray-700 line-clamp-3" title={comment}>
              {comment}
            </p>
          </div>,

          <ToggleButton
            isToggle={isPublished}
            handleClick={async () => {
              try {
                await dispatch(
                  updateProductReview({
                    reviewId,
                    status: isPublished ? "hidden" : "published",
                  }),
                ).unwrap();
                toast.success("Review status updated");
                fetchReviews();
              } catch (err) {
                toast.error(
                  err?.message || err || "Failed to update review status",
                );
              }
            }}
          />,

          <div className="flex flex-col">
            <span className="text-sm text-gray-900">
              {formatDate(review.createdAt)}
            </span>
            <span className="text-xs text-gray-500">
              Updated: {formatDate(review.updatedAt)}
            </span>
          </div>,

          <ActionButtons
            onEdit={() => {
              setSelectedReview(review);
              setIsEditOpen(true);
            }}
            onDelete={() => setDeleteTarget(review)}
            showLinkButton={false}
          />,
        ];
      } catch (innerErr) {
        console.error("Error rendering review row:", innerErr);
        return ["Invalid data", "", "", "", "", "", "", ""];
      }
    });
  }, [reviewsData]);

  const totalReviews = getReviewsPayload(reviewsData).total;

  const handleDeleteReview = async () => {
    const reviewId = deleteTarget?._id || deleteTarget?.id;
    if (!reviewId) return;
    try {
      await dispatch(deleteProductReview({ reviewId })).unwrap();
      toast.success("Review deleted successfully");
      setDeleteTarget(null);
      fetchReviews();
    } catch (err) {
      toast.error(err?.message || err || "Failed to delete review");
    }
  };

  return (
    <>
      <Loader loading={isLoading} />
      <div className="p-6 max-w-7xl mx-auto space-y-3">
        <h3>
          <Link to="/app/setting">Home</Link> / Product Review
        </h3>

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
              totalData={totalReviews}
              totalSize={SIZE}
              currentPage={pageNo}
              onPageChange={onPageChange}
              loading={isLoading}
              emptyMessage={
                isLoading ? "Loading reviews..." : "No reviews found"
              }
            />
          )}
        </div>

        {totalReviews > SIZE && (
          <Pagination
            totalPages={Math.ceil(totalReviews / SIZE)}
            currentPage={pageNo}
            onPageChange={onPageChange}
          />
        )}
      </div>

      <ImageViewer
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      <EditProductReview
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedReview(null);
        }}
        reviewData={selectedReview}
      />

      <DeletePopup
        isDeleteModalOpen={Boolean(deleteTarget)}
        closeDeleteModal={() => setDeleteTarget(null)}
        confirmDelete={handleDeleteReview}
        DeleteHeading="Are you sure you want to delete this product review?"
      />
    </>
  );
};

export default ProductReviews;
