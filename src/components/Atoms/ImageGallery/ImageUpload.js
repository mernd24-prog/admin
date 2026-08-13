import React, { useRef } from "react";
import { FaCloudUploadAlt, FaImage, FaExchangeAlt } from "react-icons/fa";

const ImageUpload = ({
  id = "default-image-upload",
  label = "Upload Image",
  accept = "image/*",
  file,
  onChange,
  errorMessage = "",
  isDisabled = false,
  containerClassName = "",
  labelClassName = "",
  previewClassName = "",
  iconClassName = "",
  required
}) => {
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    if (isDisabled) return;
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      onChange(selectedFile);
      e.target.value = null
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (isDisabled) return;
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onChange(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("ring-2", "ring-blue-400");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("ring-2", "ring-blue-400");
  };

  return (
    <div className={`space-y-2 ${containerClassName}`}>
      {/* Label */}
      <label className="label block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Dropzone */}
      <div
        className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${
          file ? "border-transparent" : "border-gray-300"
        } ${
          errorMessage
            ? "border-red-500"
            : file
              ? ""
              : "hover:border-blue-400"
        } ${
          isDisabled
            ? "opacity-70 cursor-not-allowed bg-gray-100"
            : "bg-white cursor-pointer"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          handleDrop(e);
          handleDragLeave(e);
        }}
        onClick={() => !isDisabled && fileInputRef.current?.click()}
      >
        <input
          type="file"
          id={id}
          accept={accept}
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isDisabled}
        />

        {file ? (
          <div className="p-2">
            <div className="relative group">
              <div className="overflow-hidden rounded-md">
                <img
                  src={file}
                  alt="Preview"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = "/image_upload.jpg"; 
                  }}
                  className={`w-full min-h-24 h-auto object-contain border ${errorMessage ? "border-red-500" : "border-blue-400"
                    } border-dashed max-h-64 rounded-md ${previewClassName}`}
                />

              </div>
              {!isDisabled && (
                <div className="absolute top-0 right-0 flex space-x-2 p-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();

                    }}
                    className="bg-blue-500 text-black rounded-full p-2 shadow-lg hover:bg-blue-600 transition-colors"
                    aria-label="Change image"
                    title="Change image"
                  >

                    <FaExchangeAlt size={12} />
                  </button>

                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div
                className={`p-3 rounded-full bg-blue-50 text-blue-500 ${iconClassName}`}
              >
                <FaCloudUploadAlt size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  Click to browse files
                </p>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <FaImage className="mr-1" />
                <span>Supports: JPEG, PNG, WEBP</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
};

export default React.memo(ImageUpload);
