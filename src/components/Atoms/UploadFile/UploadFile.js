import React, { useState } from 'react';

const UploadFile = ({ onFileSelect }) => {
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        if (onFileSelect) onFileSelect(file);
    };

    const resetFile = () => {
        setSelectedFile(null);
        if (onFileSelect) onFileSelect(null);
    };

    return (
        <div className="w-full max-w-md mx-auto p-6 ">
            <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500 transition-all text-gray-500"
            >
                {selectedFile ? (
                    <div className="text-center">
                        <p className="text-sm font-medium">Selected File:</p>
                        <p className="text-blue-600 mt-1">{selectedFile.name}</p>
                        <button
                            onClick={resetFile}
                            type="button"
                            className="mt-3 px-4 py-1 text-xs bg-red-500 text-black rounded hover:bg-red-600"
                        >
                            Remove File
                        </button>
                    </div>
                ) : (
                    <>
                        <svg
                            className="w-10 h-10 mb-2 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m5 12h6M3 16l4-4 4 4M3 20h18" />
                        </svg>
                        <p className="text-sm">Click or drag a file to upload</p>
                    </>
                )}
            </label>
            <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    );
};

export default UploadFile;
