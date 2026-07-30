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
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, isOpen, onClose]);

  useEffect(() => {
    if (currentIndex >= imageArray.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, imageArray.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-11/12 max-w-2xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[70vh]">
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-xl font-semibold">
            Product Images{" "}
            {imageArray.length
              ? `(${currentIndex + 1}/${imageArray.length})`
              : ""}
          </h2>
          <button
            className="p-1 text-2xl font-bold text-gray-600 cursor-pointer hover:text-black"
            onClick={onClose}
            aria-label="Close gallery"
          >
            &times;
          </button>
        </div>

        <div className="p-4">
          {imageArray.length ? (
            <div className="relative flex items-center">
              {imageArray.length > 1 && (
                <button
                  onClick={handlePrev}
                  disabled={isFirst}
                  className={`absolute left-0 p-2 text-2xl rounded-full -translate-x-1/2 z-10 transition-opacity ${
                    isFirst
                      ? "bg-gray-300 text-gray-400 opacity-50 cursor-not-allowed"
                      : "text-white bg-[#CE9F2D] hover:opacity-90"
                  }`}
                  aria-label="Previous image"
                >
                  <IoArrowBack />
                </button>
              )}

              <div className="w-full h-[40vh]">
                <img
                  src={imageArray[currentIndex]}
                  alt={`Product view ${currentIndex + 1}`}
                  className="object-contain w-full h-full"
                />
              </div>

              {imageArray.length > 1 && (
                <button
                  onClick={handleNext}
                  disabled={isLast}
                  className={`absolute right-0 p-2 text-2xl rounded-full translate-x-1/2 z-10 transition-opacity ${
                    isLast
                      ? "bg-gray-300 text-gray-400 opacity-50 cursor-not-allowed"
                      : "text-white bg-[#CE9F2D] hover:opacity-90"
                  }`}
                  aria-label="Next image"
                >
                  <IoArrowForwardOutline />
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-[30vh] items-center justify-center rounded bg-gray-50 text-sm text-gray-500">
              No product images available.
            </div>
          )}

          {imageArray.length > 1 && (
            <div className="mt-4">
              <div className="flex justify-center gap-2 overflow-x-auto py-2">
                {imageArray.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`shrink-0 transition-opacity ${idx === currentIndex ? "ring-2 ring-blue-500" : "opacity-70 hover:opacity-100"}`}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx}`}
                      className="object-cover w-16 h-16"
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
