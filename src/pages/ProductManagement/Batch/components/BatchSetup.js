import React from 'react';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import { RxCross2 } from 'react-icons/rx';
import TransparentButton from '../../../../components/Atoms/buttons/TransParentButton';
import Button from '../../../../components/Atoms/buttons/button';
import ToggleButton from '../../../../components/Atoms/ToggleButton/ToggleButton';

const BatchSetup = ({
  isOpen,
  handleClose,
  formValues,
  handleInputChange,
  handleToggleDisable,
  handleSubmit,
  errors,
  submitButtonText = "Submit",
  closeButtonText = "Reset",
}) => {

  return (
    <form onSubmit={handleSubmit} >
      <div
        className={`fixed top-0 right-0 h-full w-[500px] bg-white shadow-xl transform transition-transform duration-300 ease-in-out 
        overflow-auto border-l border-gray-200 z-50 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Batch Setup</h2>
          <button onClick={handleClose} type="button" className="text-gray-500 hover:text-gray-700">
            <RxCross2 size={22} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <FormInput
            label="Batch Code"
            name="batchCode"
            value={formValues.batchCode}
            onChange={handleInputChange}
            placeholder="Enter Batch Code"
            error={errors.batchCode}
          />

          <FormInput
            label="Manufacture Date"
            name="manufactureDate"
            type="date"
            value={formValues.manufactureDate}
            onChange={handleInputChange}
            error={errors.manufactureDate}
          />

          <FormInput
            label="Expiry Date"
            name="expiryDate"
            type="date"
            value={formValues.expiryDate}
            onChange={handleInputChange}
            error={errors.expiryDate}
          />

          <div className="flex items-center justify-between p-4 mb-4 border rounded">
            <span className="font-medium text-gray-800">Is Active</span>
            <ToggleButton isToggle={!formValues.isDisable} handleClick={handleToggleDisable} />

          </div>
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-4 bg-white border-t border-gray-200">
            <TransparentButton onClick={handleClose} label={closeButtonText} />
            <Button onClick={handleSubmit}>{submitButtonText}</Button>
          </div>

        </div>
      </div>
    </form>
  );
};

export default BatchSetup;
