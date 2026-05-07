import React, { useState } from 'react';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';
import { MdOutlineClose } from 'react-icons/md';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';

const Bannerlocationsetup = ({ onClose, isOpen }) => {
  const [formData, setFormData] = useState({
    title: '',
    bannerType: 'Product Detail page banner',
    cost: '3.0000',
    status: 'Active',
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
    console.log(formData);
    // Submit logic here
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isOpen ? 'block' : 'hidden'
        }`}
    >
      <div className="w-11/12 max-w-xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-xl font-semibold">Banner Location Setup</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <MdOutlineClose size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">

          <FormInput
            label="Banner Location Title*"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter banner location title"
          />

          <FormInput
            label="Banner Type"
            name="bannerType"
            type="select"
            value={formData.bannerType}
            onChange={handleChange}
            options={['Product Detail page banner', 'Homepage Banner', 'Category Page Banner']}
          />

          <FormInput
            label="Promotion Cost [$]"
            name="cost"
            type="number"
            value={formData.cost}
            onChange={handleChange}
            placeholder="Enter cost"
          />

          <FormInput
            label="Status"
            name="status"
            type="select"
            value={formData.status}
            onChange={handleChange}
            options={['Active', 'Inactive']}
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

export default Bannerlocationsetup;
