import React, { useState } from 'react';
import { MdOutlineClose } from 'react-icons/md';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import FileUploader from '../../../../components/Atoms/FileUploader/FileUploader';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';

const SlideSetup = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    openIn: 'Same Window',
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(formData, imagePreview);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isOpen ? 'block' : 'hidden'
        }`}
    >
      <div className="w-11/12 max-w-xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-xl font-semibold">Slide Setup</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <MdOutlineClose size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Slide Title*"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter slide title"
          />

          <FormInput
            label="Slide URL"
            name="url"
            value={formData.url}
            onChange={handleChange}
            placeholder="http://"
          />

          <FormInput
            label="Open In"
            name="openIn"
            type="select"
            value={formData.openIn}
            onChange={handleChange}
            options={['Same Window', 'New Window']}
          />

          <div>
            <label className="block mb-1 text-[#1E293B] text-[14px] font-[500] font-[Poppins]">
              Upload Image or PDF
            </label>
            <FileUploader
              imagePreview={imagePreview}
              handleFileChange={handleFileChange}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              isDragging={isDragging}
            />
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <ButtonTransparent type="button" onClick={onClose}>
              Cancel
            </ButtonTransparent>
            <NewButton type="submit">Submit</NewButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SlideSetup;
