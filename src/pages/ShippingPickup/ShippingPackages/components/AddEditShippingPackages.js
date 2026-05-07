import React, { useState } from 'react';
import { MdOutlineClose } from 'react-icons/md';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';

const AddEditShippingPackages = ({ isShippingPacOpen, onShippingPacClose }) => {
  const [formData, setFormData] = useState({
    packageName: '',
    unit: '',
    length: '',
    width: '',
    height: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log(formData);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isShippingPacOpen ? 'block' : 'hidden'
        }`}
    >
      <div className="w-11/12 max-w-xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between pb-3 mb-3 border-b">
          <h2 className="text-xl font-semibold">Shipping Package Setup</h2>
          <button onClick={onShippingPacClose} className="text-gray-700 hover:text-black">
            <MdOutlineClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 space-y-1 md:grid-cols-2">
          <FormInput
            label="Package name*"
            name="packageName"
            value={formData.packageName}
            onChange={handleChange}
            placeholder="Enter package name"
          />

          <FormInput
            label="Unit*"
            name="unit"
            type="select"
            value={formData.unit}
            onChange={handleChange}
            options={['Select', 'cm', 'inch', 'mm']}
          />

          <FormInput
            label="Length*"
            name="length"
            value={formData.length}
            onChange={handleChange}
            placeholder="Enter length"
          />

          <FormInput
            label="Width*"
            name="width"
            value={formData.width}
            onChange={handleChange}
            placeholder="Enter width"
          />

          <FormInput
            label="Height*"
            name="height"
            value={formData.height}
            onChange={handleChange}
            placeholder="Enter height"
          />

          <div className="flex justify-end gap-4 md:col-span-2">
            <ButtonTransparent type="button" onClick={onShippingPacClose}>
              Cancel
            </ButtonTransparent>
            <NewButton type="submit">Submit</NewButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditShippingPackages;
