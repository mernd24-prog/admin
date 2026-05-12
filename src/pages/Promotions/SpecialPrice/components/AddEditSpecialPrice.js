import React, { useState } from 'react';
import { MdOutlineClose } from 'react-icons/md';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';

const AddEditSpecialPrice = ({ isOpen, onClose, productOptions = [], onSubmit }) => {
  const [formData, setFormData] = useState({
    product: '',
    specialPrice: '',
    startDate: '',
    endDate: '',
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
    onSubmit?.(formData);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isOpen ? 'block' : 'hidden'
        }`}
    >
      <div className="w-11/12 max-w-xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-xl font-semibold">Special Price Setup</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <MdOutlineClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <FormInput
            label="Product"
            name="product"
            type="select"
            value={formData.product}
            onChange={handleChange}
            options={[{ value: '', label: 'Select' }, ...productOptions]}
          />
          <FormInput
            label="Special price"
            name="specialPrice"
            value={formData.specialPrice}
            onChange={handleChange}
            placeholder="Enter special price"
          />
          <FormInput
            label="Price start date"
            name="startDate"
            type='date'
            value={formData.startDate}
            onChange={handleChange}
          />
          <FormInput
            label="Price End date"
            name="endDate"
            type='date'
            value={formData.endDate}
            onChange={handleChange}
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

export default AddEditSpecialPrice;
