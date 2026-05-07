import { useState, useEffect } from "react";
import { IoArrowForwardOutline, IoArrowBack } from "react-icons/io5";

const ImageGallery = ({ images, isOpen, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const imageArray = Array.isArray(images) ? images : [images];

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, imageArray.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? imageArray.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === imageArray.length - 1 ? 0 : prev + 1));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="w-11/12 max-w-2xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[70vh]">
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-xl font-semibold">Product Images ({currentIndex + 1}/{imageArray.length})</h2>
          <button
            className="p-1 text-2xl font-bold text-gray-600 hover:text-black"
            onClick={onClose}
            aria-label="Close gallery"
          >
            &times;
          </button>
        </div>

        <div className="p-4">
          <div className="relative flex items-center">
            <button
              onClick={handlePrev}
              className="absolute left-0 p-2 text-2xl text-black bg-black bg-opacity-50 rounded-full -translate-x-1/2 hover:bg-opacity-70 z-10"
              aria-label="Previous image"
            >
              <IoArrowBack />
            </button>
            
            <div className="w-full h-[40vh]">
              <img
                src={imageArray[currentIndex]}
                alt={`Product view ${currentIndex + 1}`}
                className="object-contain w-full h-full"
              />
            </div>

            <button
              onClick={handleNext}
              className="absolute right-0 p-2 text-2xl text-black bg-black bg-opacity-50 rounded-full translate-x-1/2 hover:bg-opacity-70 z-10"
              aria-label="Next image"
            >
              <IoArrowForwardOutline />
            </button>
          </div>

          {imageArray.length > 1 && (
            <div className="mt-4">
              <div className="flex justify-center gap-2 overflow-x-auto py-2">
                {imageArray.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`shrink-0 transition-opacity ${idx === currentIndex ? 'ring-2 ring-blue-500' : 'opacity-70 hover:opacity-100'}`}
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