import { useState } from 'react';

const useFileUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelection(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelection(file);
  };

  const handleFileSelection = (file) => {
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/svg+xml", "application/pdf"];
      const allowedExtensions = ["jpg", "jpeg", "svg", "png", "pdf"];
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (allowedTypes.includes(file.type) || (fileExtension && allowedExtensions.includes(fileExtension))) {
        setSelectedFile(file);
        if (file.type.includes("image")) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreview(reader.result);
          };
          reader.readAsDataURL(file);
        } else {
          setImagePreview(null);
        }
        setErrors((prev) => ({ ...prev, file: "" }));
      } else {
        setErrors((prev) => ({
          ...prev,
          file: "Please select a valid file type: JPG, JPEG, SVG, PNG, or PDF",
        }));
      }
    }
  };

  const resetFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setErrors((prev) => ({ ...prev, file: "" }));
  };

  return {
    isDragging,
    selectedFile,
    imagePreview,
    errors,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    resetFile,
  };
};

export default useFileUpload;
