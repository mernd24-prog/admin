import React from 'react';

const PreviewModal = ({ isOpen, onClose, children, title = 'Preview' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white w-full max-w-2xl rounded-xl p-6 shadow-lg relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl"
        >
          &times;
        </button>

        {/* Title */}
        <h2 className="text-2xl font-semibold mb-4">{title}</h2>

        {/* Content */}
        <div className="overflow-y-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  );
};

export default PreviewModal;
