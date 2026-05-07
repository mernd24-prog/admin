import React, { useState } from 'react';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import { MdOutlineClose } from 'react-icons/md';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';

const UserTransactionsSetup = ({ onCloseTransaction, isOpenTransaction }) => {
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    description: '',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isOpenTransaction ? 'block' : 'hidden'
          }`}
      >
        <div className="w-11/12 max-w-xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b">
            <h2 className="text-xl font-semibold">User transactions setup</h2>
            <button onClick={onCloseTransaction} className="text-gray-700 hover:text-black">
              <MdOutlineClose size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              label="Type*"
              name="type"
              type="select"
              value={formData.type}
              onChange={handleChange}
              options={['Select', 'Deposit', 'Withdrawal', 'Transfer']}
            />
            <FormInput
              label="Amount*"
              name="amount"
              type="number"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Enter amount"
            />
            <FormInput
              label="Description*"
              name="description"
              type="textarea"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description"
              rows={4}
            />

            <div className="flex justify-end gap-4 mt-6">
              <ButtonTransparent type="button" onClick={onCloseTransaction}>
                Cancel
              </ButtonTransparent>
              <NewButton type="submit">Submit</NewButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UserTransactionsSetup;
