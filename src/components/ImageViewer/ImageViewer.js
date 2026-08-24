import React from "react";

const ImageViewer = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative">
        <img
          src={imageUrl}
          alt="Preview"
          className="max-w-full max-h-[90vh] rounded"
        />
        <button
          onClick={onClose}
          className="absolute px-2 text-xl font-bold text-black bg-black bg-opacity-50 rounded top-2 right-2"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default ImageViewer;
