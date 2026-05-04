import React, { useState } from 'react';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import { RxCross2 } from 'react-icons/rx';
import FormSubmitButton from '../../../../components/Atoms/FormButton/FormSubmitButton';

const BrandSetup = ({ isOpen, handleClose }) => {
  const [formData, setFormData] = useState({
    categoryIdentifier: '',
    categoryName: '',
    seoUrl: '',
    parentCategory: null,
    ratingType: ''
  });
  const [settings, setSettings] = useState({
    activate: true,
    approval: false,
    updateLanguages: false,
    featured: false,
    cashOnDelivery: false
  });
  const handleToggle = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value
    }));
  };

  return (
    <div className="font-sans">
      <div
        className={`fixed top-0 right-0 h-full w-[500px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out 
          overflow-auto border-l border-gray-200 z-50 ${isOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Brand setup</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <RxCross2 size={22} />
          </button>
        </div>

        <div className='p-6 space-y-2'>
          <FormInput
            label="Brand name"
            name="categoryIdentifier"
            value={formData.categoryIdentifier}
            onChange={handleChange}
            placeholder="Enter Brand name"
          />

          <FormInput
            label="Brand SEO-friendly URL"
            name="categoryName"
            value={formData.categoryName}
            onChange={handleChange}
            placeholder="Enter Brand SEO-friendly URL"
          />
          <div className="flex items-center justify-between p-4 mb-4 border rounded">
            <span className="font-medium text-gray-800">Brand status</span>
            <button
              className={`w-12 h-6 rounded-full relative ${settings.approval ? 'bg-blue-500' : 'bg-gray-200'}`}
              onClick={() => handleToggle('approval')}
            >
              <span className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-all ${settings.approval ? 'right-1' : 'left-1'}`}></span>
            </button>
          </div>
          <FormSubmitButton />
        </div>
      </div>
    </div>
  );
};

export default BrandSetup;
