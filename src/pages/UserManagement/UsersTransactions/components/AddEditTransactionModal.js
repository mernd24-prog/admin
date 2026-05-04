import React, { useState } from 'react';
import { MdOutlineClose } from 'react-icons/md';
import { LuAsterisk } from 'react-icons/lu'; 
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';

const AddEditTransactionModal = ({ isOpen, onClose, onSubmit, users = [] }) => {
  const [formData, setFormData] = useState({
    userId: '',
    type: '',
    amount: '',
    description: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    ['userId', 'type', 'amount', 'description'].forEach((field) => {
      if (!formData[field]) {
        newErrors[field] = 'This field is required';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${
        isOpen ? 'block' : 'hidden'
      }`}
    >
      <div className="w-11/12 max-w-lg p-6 bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b">
          <h2 className="text-xl font-semibold">Add Transaction</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <MdOutlineClose size={24} />
          </button>
        </div> 
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center text-sm font-medium">
              User <LuAsterisk className="ml-1 text-red-500" size={15} />
            </label>
            <FormInput
              type="select"
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              options={['Select User', ...users.map((u) => `${u.name} (${u.email})`)]}
            />
            {errors.userId && <p className="text-sm text-red-500">{errors.userId}</p>}
          </div>

          {/* Type */}
          <div>
            <label className="flex items-center text-sm font-medium">
              Type <LuAsterisk className="ml-1 text-red-500" size={15} />
            </label>
            <FormInput
              type="select"
              name="type"
              value={formData.type}
              onChange={handleChange}
              options={['Select Type', 'Credit', 'Debit']}
            />
            {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="flex items-center text-sm font-medium">
              Amount <LuAsterisk className="ml-1 text-red-500" size={15} />
            </label>
            <FormInput
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Enter amount"
            />
            {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center text-sm font-medium">
              Description <LuAsterisk className="ml-1 text-red-500" size={15} />
            </label>
            <FormInput
              type="textarea"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description"
              rows={3}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-4 mt-6">
            <ButtonTransparent type="button" onClick={onClose}>
              Cancel
            </ButtonTransparent>
            <NewButton type="submit">Add Transaction</NewButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditTransactionModal;
