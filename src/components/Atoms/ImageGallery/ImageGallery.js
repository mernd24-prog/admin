import { useCallback, useEffect, useState } from "react";
import { IoArrowForwardOutline, IoArrowBack } from "react-icons/io5";
import { normalizeImageList } from "../../../_helpers/productMedia";

const ImageGallery = ({ images, isOpen, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const imageArray = normalizeImageList(images);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === imageArray.length - 1;

  const handlePrev = useCallback(() => {
    if (!imageArray.length) return;

    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, [imageArray.length]);

  const handleNext = useCallback(() => {
    if (!imageArray.length) return;

    setCurrentIndex((prev) => (prev < imageArray.length - 1 ? prev + 1 : prev));
  }, [imageArray.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        handleNext();
      }

      if (e.key === "ArrowLeft") {
        handlePrev();
      }

      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleNext, handlePrev, isOpen, onClose]);

  // Reset index if current image is no longer available
  useEffect(() => {
    if (currentIndex >= imageArray.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, imageArray.length]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      {/* Gallery Container */}
      <div
        className="max-h-[70vh] w-11/12 max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Product Images{" "}
            {imageArray.length
              ? `(${currentIndex + 1}/${imageArray.length})`
              : ""}
          </h2>

          <button
            type="button"
            className="cursor-pointer p-1 text-2xl font-bold text-gray-600 transition-colors hover:text-black"
            onClick={onClose}
            aria-label="Close gallery"
          >
            &times;
          </button>
        </div>

        {/* Gallery Content */}
        <div className="p-4">
          {imageArray.length ? (
            <div className="relative flex items-center">
              {/* Previous Button */}
              {imageArray.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={isFirst}
                  className={`absolute left-0 z-10 -translate-x-1/2 rounded-full p-2 text-2xl transition-opacity ${
                    isFirst
                      ? "cursor-not-allowed bg-gray-300 text-gray-400 opacity-50"
                      : "bg-[#CE9F2D] text-white hover:opacity-90"
                  }`}
                  aria-label="Previous image"
                >
                  <IoArrowBack />
                </button>
              )}

              {/* Main Image */}
              <div className="h-[40vh] w-full">
                <img
                  src={imageArray[currentIndex]}
                  alt={`Product view ${currentIndex + 1}`}
                  className="h-full w-full object-contain"
                />
              </div>

              {/* Next Button */}
              {imageArray.length > 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isLast}
                  className={`absolute right-0 z-10 translate-x-1/2 rounded-full p-2 text-2xl transition-opacity ${
                    isLast
                      ? "cursor-not-allowed bg-gray-300 text-gray-400 opacity-50"
                      : "bg-[#CE9F2D] text-white hover:opacity-90"
                  }`}
                  aria-label="Next image"
                >
                  <IoArrowForwardOutline aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-[30vh] items-center justify-center rounded bg-gray-50 text-sm text-gray-500">
              No product images available.
            </div>
          )}

          {/* Thumbnails */}
          {imageArray.length > 1 && (
            <div className="mt-4">
              <div className="flex justify-center gap-2 overflow-x-auto py-2">
                {imageArray.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`shrink-0 transition-opacity ${
                      idx === currentIndex
                        ? "ring-2 ring-blue-500"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="h-16 w-16 object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGallery;
