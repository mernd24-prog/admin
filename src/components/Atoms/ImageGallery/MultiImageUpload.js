import React, { useRef, useState } from "react";
import { FaCloudUploadAlt, FaTimes, FaSpinner, FaInfoCircle } from "react-icons/fa";
import { uploadFileMulti } from "../../../_helpers/globalFunctions";
import { toast } from "sonner";
import { normalizeImageList, resolveMediaUrl } from "../../../_helpers/productMedia";

const MultiImageUpload = ({
    label = "",
    accept = "image/*",
    images = [],
    setImages,
    isDisabled = false,
    maxFiles = 6,
    required = false,
    errorMessage = "", type, setError
}) => {
    const fileInputRef = useRef();
    const [isUploading, setIsUploading] = useState(false);

    const handleFiles = async (files) => {
        if (isDisabled || isUploading) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        const maxSize = 5 * 1024 * 1024; // 5MB
        const filesArray = Array.from(files);

        const normalizedImages = normalizeImageList(images);
        const remainingSlots = maxFiles - normalizedImages.length;
        if (remainingSlots <= 0) {
            toast.error(`You can only upload up to ${maxFiles} images.`);
            return;
        }

        const newFiles = filesArray.slice(0, remainingSlots);

        const validFiles = [];
        for (const file of newFiles) {
            if (!allowedTypes.includes(file.type)) {
                toast.error(`${file.name} is not a valid image. Only PNG, JPG, and WEBP are allowed.`);
                continue;
            }
            if (file.size > maxSize) {
                toast.error(`${file.name} is too large. Maximum size is 5MB.`);
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        setIsUploading(true);

        try {
            const uploadedUrls = await uploadFileMulti(validFiles, type || "PRODUCTS");
            console.log(uploadedUrls)
          
            setImages((prev) => normalizeImageList(prev, uploadedUrls));
        } catch (err) {
            toast.error(err || "Upload failed. Please try again.");
            console.log(err)
        } finally {
            setIsUploading(false);
        }
    };



    const handleChange = (e) => {
        const files = e.target.files;
        if (files?.length) handleFiles(files);
        e.target.value = '';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files?.length) handleFiles(files);
    };

    const handleDelete = (url) => {
        setImages((prev) => normalizeImageList(prev).filter((img) => img !== url));
    };

    const normalizedImages = normalizeImageList(images);

    return (
        <div className="space-y-3">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <div
                className={`relative border-2 border-dashed rounded-xl transition-all duration-200
          ${normalizedImages.length ? "border-gray-200" : "border-gray-300"}
          ${errorMessage ? "border-red-500" : ""}
          ${
            isDisabled
              ? "opacity-70 cursor-not-allowed bg-gray-100"
              : `bg-white cursor-pointer ${
                  normalizedImages.length ? "" : "hover:border-blue-400"
                }`
          }
        `}
                onClick={() => !isDisabled && fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
            >
                <input
                    type="file"
                    accept={accept}
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleChange}
                    disabled={isDisabled || isUploading}
                />

                {normalizedImages?.length ? (
                    <div className="p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {normalizedImages.map((url, idx) => (
                                <div
                                    key={idx}
                                    className="relative group rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                                >
                                    <div className="aspect-square bg-gray-100">
                                        <img
                                            src={resolveMediaUrl(url)}
                                            alt={`uploaded-${idx}`}
                                            className="object-cover w-full h-full"
                                            loading="lazy"
                                        />
                                    </div>
                                    {!isDisabled && (
                                        <button
                                            type="button"
                                            className="absolute top-2 right-2 bg-white/90 text-red-500 rounded-full p-1.5 hover:bg-red-500 hover:text-black transition-all shadow-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(url);
                                            }}
                                        >
                                            <FaTimes size={12} />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {normalizedImages.length < maxFiles && !isUploading && (
                                <div
                                    className="relative aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-400 transition-colors cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    <FaCloudUploadAlt size={24} className="mb-2" />
                                    <span className="text-xs text-center px-2">Add more images</span>
                                    <span className="text-xs text-gray-400 mt-1">
                                        {maxFiles - normalizedImages.length} remaining
                                    </span>
                                </div>
                            )}

                            {isUploading && (
                                <div className="relative aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center">
                                    <FaSpinner className="animate-spin text-blue-500 mb-2" size={24} />
                                    <span className="text-xs text-gray-500">Uploading...</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center p-8">
                        <div className="mx-auto w-16 h-16 flex items-center justify-center bg-blue-100 text-blue-500 rounded-full mb-4">
                            {isUploading ? (
                                <FaSpinner className="animate-spin" size={24} />
                            ) : (
                                <FaCloudUploadAlt size={24} />
                            )}
                        </div>
                        <h4 className="text-lg font-medium text-gray-700 mb-1">
                            {isUploading ? 'Uploading images...' : 'Drag & drop images here'}
                        </h4>
                        <p className="text-sm text-gray-500 mb-3">
                            or <span className="text-blue-600 font-medium">click to browse</span>
                        </p>
                        <p className="text-xs text-gray-400">
                            Supports JPG, PNG, WEBP (Max {maxFiles} images)
                        </p>
                    </div>
                )}
            </div>

            {errorMessage && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                    <FaInfoCircle />
                    {errorMessage}
                </p>
            )}
        </div>
    );
};

export default React.memo(MultiImageUpload);
