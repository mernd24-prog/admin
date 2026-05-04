import React, { useState } from 'react';
import { MdOutlineClose } from 'react-icons/md';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';

const AddEditShippingCompanyUsers = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    username1: '',
    userName: '',
    dob: '',
    phone: '',
    email: '',
    country: 'United States',
    state: '',
    city: '',
    trackingUrl: '',
  });



  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isOpen ? 'block' : 'hidden'
          }`}
      >
        <div className="w-11/12 max-w-xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b">
            <h2 className="text-xl font-semibold">Shipping company user setup</h2>
            <button onClick={onClose} className="text-gray-700 hover:text-black">
              <MdOutlineClose size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 space-y-1 md:grid-cols-2">
            <FormInput
              label="Username"
              name="username"
              value={formData.username1}
              onChange={handleChange}
              placeholder="Enter Username"
            />
            <FormInput
              label="User's name*"
              name="userName"
              value={formData.userName}
              onChange={handleChange}
              placeholder="Enter User's name"
            />
            <FormInput
              label="Date of birth"
              name="dob"
              type="date"
              value={formData.dob}
              onChange={handleChange}
            />
            <FormInput
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1"
            />
            <FormInput
              label="Email*"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
            />
            <FormInput
              label="Country*"
              name="country"
              type="select"
              value={formData.country}
              onChange={handleChange}
              options={['United States', 'Canada', 'Mexico']}
            />
            <FormInput
              label="State*"
              name="state"
              type="select"
              value={formData.state}
              onChange={handleChange}
              options={['Select State', 'California', 'Texas', 'Florida', 'New York']}
            />
            <FormInput
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter city"
            />

            {/* Full-width tracking URL */}
            <div className="md:col-span-2">
              <FormInput
                label="Tracking site URL"
                name="trackingUrl"
                type="url"
                value={formData.trackingUrl}
                onChange={handleChange}
                placeholder="https://example.com"
              />
            </div>
            <ButtonTransparent type="button" onClick={onClose}>
              Cancel
            </ButtonTransparent>
            <NewButton type="submit">Submit</NewButton>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddEditShippingCompanyUsers;
