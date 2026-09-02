import React, { useRef } from "react";
import { FaCloudUploadAlt, FaImage, FaExchangeAlt, FaTrash } from "react-icons/fa";
import { ButtonLoader } from "../../Loader/Loader";

const ImageUpload = ({
  id = "default-image-upload",
  label = "",
  subtext = "",
  accept = "image/jpeg,image/jpg,image/png,image/webp",
  file,
  onChange,
  onRemove,
  isLoading = false,
  loadingText = "Uploading...",
  errorMessage = "",
  error = "",
  isDisabled = false,
  containerClassName = "",
  labelClassName = "",
  previewClassName = "",
  iconClassName = "",
  dropzoneClassName = "",
  helperText,
  required,
}) => {
  const fileInputRef = useRef();
  const displayError =
    errorMessage ||
    (typeof error === "string" ? error : error?.message || "");
  const supportedFormats =
    helperText ||
    `Supports: ${
      String(accept).includes("image/svg+xml")
        ? "JPEG, PNG, WEBP, SVG"
        : "JPEG, PNG, WEBP"
    }`;

  const handleFileChange = (e) => {
    if (isDisabled || isLoading) return;
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onChange?.(selectedFile);
      e.target.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (isDisabled || isLoading) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      onChange?.(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDisabled && !isLoading) {
      e.currentTarget.classList.add("ring-2", "ring-blue-400");
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("ring-2", "ring-blue-400");
  };

  return (
    <div className={`rounded-lg border border-dashed border-gray-300 p-3 bg-white ${containerClassName}`}>
      {/* Label and Subtext */}
      {label && (
        <div className="mb-2">
          <label className={`block text-sm font-medium text-gray-700 ${labelClassName}`}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {subtext && <p className="mt-0.5 text-xs text-gray-500">{subtext}</p>}
        </div>
      )}

      {/* Input File Element */}
      <input
        type="file"
        id={id}
        accept={accept}
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isDisabled || isLoading}
      />

      {/* Main Box: Loading / Preview / Dropzone */}
      {isLoading ? (
        <div className="flex h-[155px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50">
          <ButtonLoader />
          <span className="text-xs font-medium text-gray-500">{loadingText}</span>
        </div>
      ) : file ? (
        <div className="relative group flex h-[155px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 p-2">
          <img
            src={file}
            alt={label || "Preview"}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/image_upload.jpg";
            }}
            className={`h-full w-full object-contain ${previewClassName}`}
          />

          {!isDisabled && (
            <div className="absolute top-2 right-2 flex items-center space-x-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="rounded-md border border-gray-200 bg-white p-1.5 text-xs text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-blue-600"
                aria-label="Change image"
                title="Change image"
              >
                <FaExchangeAlt size={12} />
              </button>

              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="rounded-md border border-red-100 bg-white p-1.5 text-xs text-red-500 shadow-sm transition hover:bg-red-50"
                  aria-label="Remove image"
                  title="Remove image"
                >
                  <FaTrash size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`relative border-2 border-dashed rounded-lg transition-all duration-200 h-[155px] flex flex-col items-center justify-center p-4 text-center ${
            displayError ? "border-red-500" : "border-gray-200 hover:border-blue-400"
          } ${
            isDisabled
              ? "opacity-70 cursor-not-allowed bg-gray-100"
              : "bg-white cursor-pointer hover:bg-gray-50/50"
          } ${dropzoneClassName}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => {
            handleDrop(e);
            handleDragLeave(e);
          }}
          onClick={() => !isDisabled && !isLoading && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className={`p-2.5 rounded-full bg-blue-50 text-blue-500 ${iconClassName}`}>
              <FaCloudUploadAlt size={22} />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-gray-700">Click to browse or drop file</p>
              <div className="flex items-center justify-center text-[11px] text-gray-400">
                <FaImage className="mr-1" />
                <span>{supportedFormats}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {displayError && <p className="mt-1.5 text-xs text-red-500">{displayError}</p>}
    </div>
  );
};

export default React.memo(ImageUpload);
