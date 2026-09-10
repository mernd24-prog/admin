import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdClose, MdChevronLeft, MdChevronRight } from "react-icons/md";

const ImageViewer = ({
  imageUrl,
  images = [],
  initialIndex = 0,
  currentIndex,
  onClose,
  onIndexChange,
}) => {
  const imageList = useMemo(() => {
    if (Array.isArray(images) && images.length > 0) {
      return images.filter(Boolean);
    }
    if (imageUrl) {
      return [imageUrl];
    }
    return [];
  }, [images, imageUrl]);

  const [activeIndex, setActiveIndex] = useState(
    currentIndex ?? initialIndex ?? 0,
  );

  useEffect(() => {
    if (currentIndex !== undefined) {
      setActiveIndex(currentIndex);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (initialIndex !== undefined && currentIndex === undefined) {
      setActiveIndex(initialIndex);
    }
  }, [initialIndex, currentIndex]);

  const safeIndex = Math.min(
    Math.max(activeIndex, 0),
    Math.max(imageList.length - 1, 0),
  );

  const handlePrev = useCallback(() => {
    const nextIdx = safeIndex > 0 ? safeIndex - 1 : imageList.length - 1;
    setActiveIndex(nextIdx);
    onIndexChange?.(nextIdx);
  }, [safeIndex, imageList.length, onIndexChange]);

  const handleNext = useCallback(() => {
    const nextIdx = safeIndex < imageList.length - 1 ? safeIndex + 1 : 0;
    setActiveIndex(nextIdx);
    onIndexChange?.(nextIdx);
  }, [safeIndex, imageList.length, onIndexChange]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  if (!imageList.length) return null;

  const currentImg = imageList[safeIndex];
  const hasMultiple = imageList.length > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 transition-all focus:outline-none cursor-pointer"
        aria-label="Close"
      >
        <MdClose size={24} />
      </button>

      {/* Image counter indicator */}
      {hasMultiple && (
        <div className="absolute top-4 left-4 z-50 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-xs border border-white/10">
          {safeIndex + 1} / {imageList.length}
        </div>
      )}

      {/* Content wrapper */}
      <div
        className="relative flex flex-col items-center justify-center max-h-[90vh] max-w-5xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main image container */}
        <div className="relative flex items-center justify-center w-full min-h-[300px] max-h-[75vh]">
          {/* Left Arrow button */}
          {hasMultiple && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute -left-2 sm:left-2 top-1/2 -translate-y-1/2 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90 hover:scale-105 transition-all shadow-lg focus:outline-none cursor-pointer border border-white/10"
              aria-label="Previous image"
            >
              <MdChevronLeft size={28} />
            </button>
          )}

          {/* Main Image */}
          <img
            src={currentImg}
            alt={`Preview ${safeIndex + 1}`}
            className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-200"
          />

          {/* Right Arrow button */}
          {hasMultiple && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute -right-2 sm:right-2 top-1/2 -translate-y-1/2 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/90 hover:scale-105 transition-all shadow-lg focus:outline-none cursor-pointer border border-white/10"
              aria-label="Next image"
            >
              <MdChevronRight size={28} />
            </button>
          )}
        </div>

        {/* Thumbnail Strip */}
        {hasMultiple && (
          <div className="mt-4 flex items-center justify-center gap-2 overflow-x-auto max-w-full px-2 py-1 scrollbar-thin">
            {imageList.map((img, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => {
                  setActiveIndex(idx);
                  onIndexChange?.(idx);
                }}
                className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-all cursor-pointer ${
                  idx === safeIndex
                    ? "border-amber-400 scale-105 shadow-md opacity-100"
                    : "border-white/20 opacity-60 hover:opacity-90 bg-white/5"
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageViewer;
