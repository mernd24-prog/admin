import React from 'react';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import { MdOutlineClose } from 'react-icons/md';
import Button from '../../../../components/Atoms/buttons/button';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import Select from 'react-select';


const AddEditSate = ({
  setIsOpen,
  isOpen,
  handleSubmit,
  formData,
  handleChange,
  setFormData,
  onClose,
  errors,
  isEditMode,
  stateList
}) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isOpen ? 'block' : 'hidden'
        }`}
    >
      <div className="w-11/12 max-w-xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[100vh]">
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-xl font-semibold">{isEditMode ? "Update City" : "Add City"}</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <MdOutlineClose size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">State</label>
            <Select
              options={stateList}
              value={stateList.find(option => option.value === formData.state_code)}
              onChange={selected => setFormData({ ...formData, state_code: selected.value })}
              placeholder="Select a state"
            />
            {errors.state_code && <p className="text-sm text-red-500">{errors.state_code}</p>}
          </div>
          <div>
            <FormInput
              label="City Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter city name"
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="flex justify-end pt-2 space-x-2">
            <ButtonTransparent onClick={() => setIsOpen(false)} children="Cancel" />
            <Button children="Submit" type="submit" />
          </div>
        </form>

      </div>
    </div>
  );
};

export default AddEditSate;
