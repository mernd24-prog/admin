/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState } from "react";
import { FaChevronDown, FaChevronUp, FaInfoCircle } from "react-icons/fa";
import MultiImageUpload from '../../../../components/Atoms/ImageGallery/MultiImageUpload';
import ImageUpload from "../../../../components/Atoms/ImageGallery/ImageUpload";
import { uploadFile, validateFiles } from "../../../../_helpers/globalFunctions";
import { toast } from "sonner";
import Loader from "../../../../components/Loader/Loader";

export default function MediaTab({ setFormData, formData, images, setImages, error }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false)

  console.log("5555555--->>>>>>>>", error)

  const handleCatalogUpload = async (file) => {
    if (!file) return;

    const validFiles = validateFiles([file]);
    if (validFiles.length === 0) return;

    try {
      setIsLoading(true)
      const catalogUrl = await uploadFile(validFiles[0], 'PRODUCTS');
      setIsLoading(false)
      setFormData((prev) => ({ ...prev, catalogsUrls: catalogUrl, }));
    } catch (error) {
      console.log("error------???", error)
      toast.error(error || "Catalog upload failed. Please try again.");
      setIsLoading(false)
    } finally {
      setIsLoading(false)
    }
  };

  return (
    <div className="w-full p-6 bg-white r">
      <Loader loading={isLoading} />
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-800">
            Media Gallery
          </h2>
          <p className="mt-1 text-sm text-gray-500">Add product images to showcase your item</p>
        </div>
        {isExpanded ? (
          <FaChevronUp className="text-lg text-gray-500" />
        ) : (
          <FaChevronDown className="text-lg text-gray-500" />
        )}
      </div>

      {isExpanded && (
        <div className="mt-6 space-y-3 animate-fadeIn">
          <MultiImageUpload
            images={images}
            setImages={setImages}
            label=""
            required
            maxFiles={6}

          />
          <span className="text-xs text-red-600">{error?.images}</span>

          <ImageUpload label='Catalogs ' onChange={(file) => handleCatalogUpload(file, 'PRODUCTS')} file={formData?.catalogsUrls}
            errorMessage={error?.catalogsUrls} />
          <div className="flex items-center px-3 py-2 mt-4 text-sm text-gray-500 rounded bg-blue-50">
            <FaInfoCircle className="flex-shrink-0 mr-2 text-blue-400" />
            <span>For best results, use high-quality JPG/PNG images (1500×1500px minimum)</span>
          </div>
        </div>
      )}
    </div>
  );
}