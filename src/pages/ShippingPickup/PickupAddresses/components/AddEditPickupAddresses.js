import React, { useState } from 'react';
import { MdOutlineClose } from 'react-icons/md';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';

const AddEditPickupAddresses = ({ isPickupAdOpen, onPickupAdClose }) => {
  const [formData, setFormData] = useState({
    language: 'English',
    addressLabel: '',
    name: '',
    addressLine1: '',
    addressLine2: '',
    country: '',
    state: '',
    city: '',
    postalCode: '',
    phone: '',
    slotTimings: 'individual',
    days: [
      { day: 'Sunday', from: '', to: '', selected: false },
      { day: 'Monday', from: '', to: '', selected: false },
      { day: 'Tuesday', from: '', to: '', selected: false },
      { day: 'Wednesday', from: '', to: '', selected: false },
      { day: 'Thursday', from: '', to: '', selected: false },
      { day: 'Friday', from: '', to: '', selected: false },
      { day: 'Saturday', from: '', to: '', selected: false },
    ],
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'slotTimings') {
      setFormData({ ...formData, slotTimings: value });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleDayChange = (index, field, value) => {
    const updatedDays = [...formData.days];
    updatedDays[index][field] = value;
    setFormData({ ...formData, days: updatedDays });
  };

  const handleDaySelect = (index) => {
    const updatedDays = [...formData.days];
    updatedDays[index].selected = !updatedDays[index].selected;
    setFormData({ ...formData, days: updatedDays });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log(formData);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isPickupAdOpen ? 'block' : 'hidden'
        }`}
    >
      <div className="w-11/12 max-w-xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between pb-3 mb-3 border-b">
          <h2 className="text-xl font-semibold">Pickup Address Setup</h2>
          <button onClick={onPickupAdClose} className="text-gray-700 hover:text-black">
            <MdOutlineClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Language"
            name="language"
            type="select"
            value={formData.language}
            onChange={handleChange}
            options={['English', 'Hindi', 'Other']}
          />

          <FormInput
            label="Address label*"
            name="addressLabel"
            value={formData.addressLabel}
            onChange={handleChange}
            placeholder="E.g: My Office Address"
          />

          <FormInput
            label="Name*"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter name"
          />

          <FormInput
            label="Address line 1*"
            name="addressLine1"
            value={formData.addressLine1}
            onChange={handleChange}
            placeholder="Enter address line 1"
          />

          <FormInput
            label="Address line 2"
            name="addressLine2"
            value={formData.addressLine2}
            onChange={handleChange}
            placeholder="Enter address line 2"
          />

          <FormInput
            label="Country*"
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="Enter country"
          />

          <FormInput
            label="State*"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="Enter state"
          />

          <FormInput
            label="City*"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Enter city"
          />

          <FormInput
            label="Postal code*"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
            placeholder="Enter postal code"
          />

          <FormInput
            label="Phone*"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
          />

          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Slot timings</label>
            <div className="flex items-center space-x-4">
              <label>
                <input
                  type="radio"
                  name="slotTimings"
                  value="individual"
                  checked={formData.slotTimings === 'individual'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Individual Days
              </label>
              <label>
                <input
                  type="radio"
                  name="slotTimings"
                  value="all"
                  checked={formData.slotTimings === 'all'}
                  onChange={handleChange}
                  className="mr-2"
                />
                All Days
              </label>
            </div>
          </div>

          {formData.slotTimings === 'all' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Days</th>
                    <th className="px-4 py-2">From</th>
                    <th className="px-4 py-2">To</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.days.map((day, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 border">{day.day}</td>
                      <td className="px-4 py-2 border">
                        <input
                          type="time"
                          value={day.from}
                          onChange={(e) => handleDayChange(index, 'from', e.target.value)}
                          className="w-full"
                        />
                      </td>
                      <td className="px-4 py-2 border">
                        <input
                          type="time"
                          value={day.to}
                          onChange={(e) => handleDayChange(index, 'to', e.target.value)}
                          className="w-full"
                        />
                      </td>
                      <td className="px-4 py-2 text-center border">
                        <button
                          type="button"
                          onClick={() => alert('Add functionality can go here')}
                          className="text-blue-600 hover:underline"
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr>
                    <th className="px-4 py-2">Select</th>
                    <th className="px-4 py-2">Day</th>
                    <th className="px-4 py-2">From</th>
                    <th className="px-4 py-2">To</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.days.map((day, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-center border">
                        <input
                          type="checkbox"
                          checked={day.selected}
                          onChange={() => handleDaySelect(index)}
                        />
                      </td>
                      <td className="px-4 py-2 border">{day.day}</td>
                      <td className="px-4 py-2 border">
                        <input
                          type="time"
                          value={day.from}
                          onChange={(e) => handleDayChange(index, 'from', e.target.value)}
                          disabled={!day.selected}
                          className="w-full"
                        />
                      </td>
                      <td className="px-4 py-2 border">
                        <input
                          type="time"
                          value={day.to}
                          onChange={(e) => handleDayChange(index, 'to', e.target.value)}
                          disabled={!day.selected}
                          className="w-full"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end gap-4 mt-6">
            <ButtonTransparent type="button" onClick={onPickupAdClose}>
              Cancel
            </ButtonTransparent>
            <NewButton type="submit">Submit</NewButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditPickupAddresses;