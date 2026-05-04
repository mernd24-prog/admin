import React, { useState } from 'react';
import { MdOutlineClose } from 'react-icons/md';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';

const ContentPageSetup = ({ onClose, isOpen }) => {
  const [formData, setFormData] = useState({
    title: '',
    seoUrl: '',
    layoutType: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitted Data:', formData);
    // Add form submission logic here
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isOpen ? 'block' : 'hidden'
        }`}
    >
      <div className="w-11/12 max-w-xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-xl font-semibold">Content Page Setup</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <MdOutlineClose size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">

          <FormInput
            label="Content Block Title*"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter content block title"
          />

          <FormInput
            label="SEO-friendly URL*"
            name="seoUrl"
            value={formData.seoUrl}
            onChange={handleChange}
            placeholder="https://demo.yo-kart.com/cms/view/0"
          />

          <FormInput
            label="Layout Type*"
            name="layoutType"
            type="select"
            value={formData.layoutType}
            onChange={handleChange}
            options={['Select', 'Single Column', 'Two Column', 'Grid Layout']}
          />

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

export default ContentPageSetup;
