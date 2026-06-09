import { useState } from "react";
import { FaChevronDown, FaChevronUp, FaInfoCircle, FaImage, FaFileAlt, FaStar } from "react-icons/fa";
import MultiImageUpload from '../../../../components/Atoms/ImageGallery/MultiImageUpload';
import ImageUpload from "../../../../components/Atoms/ImageGallery/ImageUpload";
import { uploadDocumentFile, validateDocumentFiles } from "../../../../_helpers/globalFunctions";
import { toast } from "sonner";
import Loader from "../../../../components/Loader/Loader";

export default function MediaTab({ setFormData, formData, images, setImages, error }) {
  const [isImagesExpanded, setIsImagesExpanded] = useState(true);
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCatalogUpload = async (file) => {
    if (!file) return;
    const validFiles = validateDocumentFiles([file]);
    if (validFiles.length === 0) return;
    try {
      setIsLoading(true);
      const catalogUrl = await uploadDocumentFile(validFiles[0], 'PRODUCTS');
      setFormData((prev) => ({ ...prev, catalogsUrls: catalogUrl }));
    } catch (err) {
      toast.error(err || "Catalog upload failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const catalogUrl = formData?.catalogsUrls;
  const isCatalogImage = /\.(png|jpe?g|webp)(\?.*)?$/i.test(String(catalogUrl || ""));

  return (
    <div className="w-full space-y-4">
      <Loader loading={isLoading} />

      {/* ── Product Images ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[var(--admin-line)] shadow-[var(--admin-shadow)] overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--admin-surface-soft)] transition-colors select-none"
          onClick={() => setIsImagesExpanded(!isImagesExpanded)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--admin-gold-soft)] flex-shrink-0">
              <FaImage className="text-[var(--admin-gold)] text-sm" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--admin-ink)]">
                Product Images
                {images.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold bg-[var(--admin-gold-soft)] text-[var(--admin-gold)] rounded-full">
                    {images.length} / 6
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--admin-muted)] mt-0.5 truncate">
                Default gallery shown to customers — variant images override these when a variant is selected
              </p>
            </div>
          </div>
          {isImagesExpanded
            ? <FaChevronUp className="text-sm text-[var(--admin-muted)] flex-shrink-0" />
            : <FaChevronDown className="text-sm text-[var(--admin-muted)] flex-shrink-0" />}
        </div>

        {isImagesExpanded && (
          <div className="px-5 pb-5 border-t border-[var(--admin-line)] space-y-4">
            <div className="pt-4">
              <MultiImageUpload
                images={images}
                setImages={setImages}
                label=""
                required
                maxFiles={6}
              />
              {error?.images && (
                <p className="mt-1.5 text-xs text-[var(--admin-danger)] flex items-center gap-1.5">
                  <FaInfoCircle size={11} /> {error.images}
                </p>
              )}
            </div>

            {/* Guidance cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--admin-gold-soft)] border border-[var(--admin-gold)]/25">
                <FaStar className="text-[var(--admin-gold)] mt-0.5 flex-shrink-0 text-xs" />
                <p className="text-xs text-[var(--admin-ink)]/75 leading-relaxed">
                  <strong>First image</strong> is the cover shown in listing cards and search results. Place your best shot first.
                </p>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--admin-blue-soft)] border border-[var(--admin-blue)]/20">
                <FaInfoCircle className="text-[var(--admin-blue)] mt-0.5 flex-shrink-0 text-xs" />
                <p className="text-xs text-[var(--admin-ink)]/75 leading-relaxed">
                  Up to <strong>6 images</strong>. JPG / PNG / WEBP only, max 5 MB each. Minimum 1500 × 1500 px recommended.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Catalog Document ───────────────────────────────────────────── */}
      {/* <div className="bg-white rounded-xl border border-[var(--admin-line)] shadow-[var(--admin-shadow)] overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--admin-surface-soft)] transition-colors select-none"
          onClick={() => setIsCatalogExpanded(!isCatalogExpanded)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0">
              <FaFileAlt className="text-gray-500 text-sm" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[var(--admin-ink)]">
                Catalog Document
                {formData?.catalogsUrls && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold bg-green-50 text-green-600 rounded-full">
                    Uploaded
                  </span>
                )}
              </h2>
              <p className="text-xs text-[var(--admin-muted)] mt-0.5">
                Specification sheet or brochure — for download only, not shown in the image gallery
              </p>
            </div>
          </div>
          {isCatalogExpanded
            ? <FaChevronUp className="text-sm text-[var(--admin-muted)] flex-shrink-0" />
            : <FaChevronDown className="text-sm text-[var(--admin-muted)] flex-shrink-0" />}
        </div>

        {isCatalogExpanded && (
          <div className="px-5 pb-5 border-t border-[var(--admin-line)]">
            <div className="pt-4">
              <ImageUpload
                label="Catalog / Specification Sheet"
                onChange={handleCatalogUpload}
                accept="application/pdf,image/png,image/jpeg,image/webp"
                file={isCatalogImage ? catalogUrl : ""}
                errorMessage={error?.catalogsUrls}
              />
              {catalogUrl && !isCatalogImage && (
                <a
                  href={catalogUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-medium text-[var(--admin-blue)] hover:underline"
                >
                  View uploaded document
                </a>
              )}
              {!formData?.catalogsUrls && (
                <p className="mt-2 text-xs text-[var(--admin-muted)] flex items-center gap-1.5">
                  <FaInfoCircle size={11} />
                  Upload a PDF, image, or document customers can download from the product page.
                </p>
              )}
            </div>
          </div>
        )}
      </div> */}
    </div>
  );
}
