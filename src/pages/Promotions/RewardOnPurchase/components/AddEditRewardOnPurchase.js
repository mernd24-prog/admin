import React, { useState } from 'react';
import { MdOutlineClose } from 'react-icons/md';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';

const AddEditRewardOnPurchase = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    minPurchaseAmount: '',
    rewardPoint: '',
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
    console.log('Reward on Purchase Data:', formData);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isOpen ? 'block' : 'hidden'
        }`}
    >
      <div className="w-11/12 max-w-xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-xl font-semibold">Reward on Purchase Setup</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <MdOutlineClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Minimum Purchase Amount"
              name="minPurchaseAmount"
              value={formData.minPurchaseAmount}
              onChange={handleChange}
              placeholder="e.g. 500"
            />

            <FormInput
              label="Reward Point"
              name="rewardPoint"
              value={formData.rewardPoint}
              onChange={handleChange}
              placeholder="e.g. 10"
            />
          </div>

          <div className="flex justify-end gap-4 mt-14">
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

export default AddEditRewardOnPurchase;
