import React, { useState } from "react";
import { MdInventory2, MdZoomIn } from "react-icons/md";
import ImageViewer from "./ImageViewer";

export const ImageThumbnail = ({
  src,
  alt = "Image preview",
  images,
  size = "md",
  className = "",
  fallbackIcon = null,
  showZoomIcon = true,
  showViewButton = false,
  viewButtonText = "View",
  onClick,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const imageList =
    Array.isArray(images) && images.length > 0
      ? images.filter(Boolean)
      : src
        ? [src]
        : [];

  const hasImage = imageList.length > 0;

  const sizeClasses = {
    xs: "h-8 w-8",
    sm: "h-10 w-10",
    md: "h-12 w-12",
    lg: "h-16 w-16",
    xl: "h-20 w-20",
  };

  const dimensionClass = sizeClasses[size] || sizeClasses.md;

  const handleClick = (e) => {
    e.stopPropagation();

    if (!hasImage) return;

    if (onClick) {
      onClick(e);
      return;
    }

    setModalOpen(true);
  };

  const handleViewClick = (e) => {
    e.stopPropagation();

    if (!hasImage) return;

    if (onClick) {
      onClick(e);
      return;
    }

    setModalOpen(true);
  };

  return (
    <div className="flex flex-col items-start gap-3">
      {/* Image Thumbnail */}
      <div
        className={`group relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-[var(--admin-line)] bg-white transition-all hover:border-[var(--admin-gold)] hover:shadow-md ${dimensionClass} ${className}`}
        onClick={handleClick}
        title={hasImage ? "View variant images" : alt}
      >
        {hasImage ? (
          <>
            <img
              src={imageList[0]}
              alt={alt}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
            />

            {showZoomIcon && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <MdZoomIn
                  size={18}
                  className="text-white drop-shadow-md"
                />
              </div>
            )}
          </>
        ) : (
          fallbackIcon || (
            <MdInventory2
              size={20}
              className="text-[var(--admin-muted)]"
            />
          )
        )}
      </div>

      {/* View Button */}
      {showViewButton && (
        <button
          type="button"
          disabled={!hasImage}
          onClick={handleViewClick}
          className="text-xs item-centre font-bold text-[var(--admin-blue)] transition-colors hover:text-[var(--admin-gold)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {viewButtonText}
        </button>
      )}

      {/* Default Image Viewer */}
      {modalOpen && hasImage && (
        <ImageViewer
          images={imageList}
          imageUrl={imageList[0]}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ImageThumbnail;