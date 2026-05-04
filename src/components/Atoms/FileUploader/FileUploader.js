import React, { useRef } from 'react';

const FileUploader = ({
  imagePreview,
  handleFileChange,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  isDragging,
}) => {
  const fileInputRef = useRef(null);

  const handleDivClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`border-2 border-dashed rounded p-8 flex flex-col items-center justify-center bg-[#af62f70d] ${isDragging ? 
        'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleDivClick}
    >
      {imagePreview ? (
        <img src={imagePreview} alt="Preview" className="max-w-full mb-4 max-h-40" />
      ) : (
        <div className="mb-4">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
      )}
      <p className="mb-1 text-center">
        Drop your files here or{' '}
        <span className="font-medium text-green-600 cursor-pointer">browse</span>
      </p>
      <p className="text-sm text-center text-gray-500">
        Upload PDF or image, max size 20 MB
      </p>
      <input
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default FileUploader;
