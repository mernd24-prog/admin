import React from 'react'
import FormInput from '../../../../components/Atoms/FormInput/FormInput'
import { MdOutlineClose } from 'react-icons/md'
import ButtonTransparent from '../../../../components/ButtonTransparent/button'
import NewButton from '../../../../components/Button/NewButton'

const AddEditUsers = ({ isOpen, onClose, errors, handleChange, handleSubmit, formData }) => {

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isOpen ? 'block' : 'hidden'
        }`}
    >
      <div className="w-11/12 max-w-2xl p-6 bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh]"> 
        <div className="flex items-center justify-between pb-3 border-b">
          <h2 className="text-xl font-semibold">Add New User</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            <MdOutlineClose size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
          <FormInput
            label="User Type"
            name="userType"
            type="select"
            value={formData?.userType}
            onChange={handleChange}
            options={['Select User Type', 'Admin', 'User']}
          />
          {errors.userType && <p className="text-sm text-red-500">{errors.userType}</p>}

          <FormInput
            label="Username"
            name="username"
            type="text"
            value={formData?.username}
            onChange={handleChange}
            placeholder="Enter username"
          />
          {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}

          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData?.email}
            onChange={handleChange}
            placeholder="Enter email"
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}

          <FormInput
            label="User's Name"
            name="fullName"
            type="text"
            value={formData?.fullName}
            onChange={handleChange}
            placeholder="Enter full name"
          />
          {errors.fullName && <p className="text-sm text-red-500">{errors.fullName}</p>}

          <FormInput
            label="Date of Birth"
            name="dob"
            type="date"
            value={formData?.dob}
            onChange={handleChange}
          />

          <FormInput
            label="Phone"
            name="phone"
            type="tel"
            value={formData?.phone}
            onChange={handleChange}
            placeholder="+1..."
          />
          {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}

          <FormInput
            label="Country"
            name="country"
            type="select"
            value={formData?.country}
            onChange={handleChange}
            options={['Select Country', 'United States', 'Canada', 'India']}
          />

          <FormInput
            label="State"
            name="state"
            type="text"
            value={formData?.state}
            onChange={handleChange}
            placeholder="Enter state"
          />

          {/* Bank Details Section */}
          <FormInput
            label="Bank Name"
            name="bankName"
            type="text"
            value={formData?.bankName}
            onChange={handleChange}
            placeholder="Enter bank name"
          />

          <FormInput
            label="Account Number"
            name="accountNumber"
            type="text"
            value={formData?.accountNumber}
            onChange={handleChange}
            placeholder="Enter account number"
          />

          <FormInput
            label="IFSC Code"
            name="ifscCode"
            type="text"
            value={formData?.ifscCode}
            onChange={handleChange}
            placeholder="Enter IFSC code"
          />
        </form>
        <div className="flex justify-end gap-4 mt-6">
          <ButtonTransparent type="button" onClick={onClose}>
            Cancel
          </ButtonTransparent>
          <NewButton type="submit" onClick={handleSubmit}>
            Add User
          </NewButton>
        </div>
      </div>
    </div>
  )
}

export default AddEditUsers