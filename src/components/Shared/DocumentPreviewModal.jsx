import React from "react";
import { PiX, PiDownloadSimple } from "react-icons/pi";

const isPdfDocument = (url = "") =>
  /\.pdf(\?.*)?$/i.test(String(url || "")) ||
  String(url || "")
    .toLowerCase()
    .includes("application/pdf");

const isImageDocument = (url = "") =>
  /\.(png|jpe?g|webp|gif|bmp|avif)(\?.*)?$/i.test(String(url || ""));

const DocumentPreviewModal = ({ document, onClose }) => {
  if (!document || !document.url) return null;

  const { label, url } = document;
  const isPdf = isPdfDocument(url);
  const isImage = isImageDocument(url);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(31,27,95,0.45)] backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl border border-[var(--admin-line)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--admin-line)] bg-gray-50">
          <div>
            <h3 className="text-base font-bold text-[var(--admin-navy)]">
              {label || "Document Preview"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Securely viewing uploaded verification document
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <PiDownloadSimple size={14} />
              <span>Download</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <PiX size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-100/50 flex items-center justify-center min-h-[400px]">
          {isPdf ? (
            <iframe
              src={`${url}#toolbar=0`}
              title={label}
              className="w-full h-[65vh] rounded-lg border border-gray-200 bg-white"
            />
          ) : isImage ? (
            <img
              src={url}
              alt={label || "Document Preview"}
              className="max-w-full max-h-[65vh] object-contain rounded-lg border border-gray-200 bg-white shadow-sm"
            />
          ) : (
            <div className="text-center p-8 bg-white border border-gray-200 rounded-xl shadow-sm max-w-md">
              <p className="text-sm text-gray-600 mb-4">
                This file format cannot be previewed directly in the browser.
              </p>
              <a
                href={url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[var(--admin-navy)] rounded-lg hover:bg-[var(--admin-navy-dark)] transition-colors"
              >
                <PiDownloadSimple size={16} />
                <span>Download Document</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-[var(--admin-line)] bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
