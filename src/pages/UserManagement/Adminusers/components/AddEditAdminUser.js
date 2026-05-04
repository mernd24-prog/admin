import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';
import { LuAsterisk } from 'react-icons/lu';
import { MdOutlineClose } from 'react-icons/md';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';

const AddEditAdminUser = ({
  handleSubmit,
  handleInputChange,
  isModalOpen,
  errors,
  form,
  closeModal,
  setErrors,
  rolesData,
  isEditMode = false,
}) => {
  const handleChange = (e) => {
    handleInputChange(e);
    const { name } = e.target;
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: undefined,
    }));
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#282827] bg-opacity-60 backdrop-blur-sm">
          <div className="w-11/12 lg:w-1/3 p-6 bg-[#ffffff] rounded-lg shadow-md">
            <div className="flex items-center justify-between border-b">
              <p className="text-lg font-bold text-[#000000]">
                {isEditMode ? 'Edit Admin Users' : 'Add Admin Users'}
              </p>
              <div className="flex items-center justify-center w-8 h-8 transition-all duration-700 rounded-full bg-white/20 hover:bg-white/40 hover:scale-105">
                <MdOutlineClose
                  size={20}
                  className="text-[#000000] cursor-pointer"
                  onClick={closeModal}
                  title="Close"
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="pt-4 space-y-4">
              <div>
                <label className="text-[#000000] font-[Poppins] flex items-start mb-1">
                  Full Name
                  <LuAsterisk className="ml-1 text-red-500" size={15} title="Name is required" />
                </label>
                <FormInput
                  name="fullName"
                  type="text"
                  value={form?.fullName}
                  placeholder="Enter Name..."
                  onChange={(e) => {
                    const regex = /^[a-zA-Z\s]*$/;
                    if (regex.test(e.target.value)) {
                      handleChange(e);
                    }
                  }}
                />
                {errors.fullName && <p className="text-sm text-red-500">{errors.fullName}</p>}
              </div>
              <div>
                <label className="text-[#000000] font-[Poppins] flex items-start mb-1">
                  Email
                  <LuAsterisk className="ml-1 text-red-500" size={15} title="Email is required" />
                </label>
                <FormInput
                  name="email"
                  type="email"
                  value={form?.email}
                  placeholder="Enter email..."
                  onChange={handleChange}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>
              {!isEditMode && (
                <>
                  <div className="relative">
                    <label className="text-[#000000] font-[Poppins] flex items-center mb-1">
                      Password
                      <LuAsterisk className="ml-1 text-red-500" size={15} title="Password is required" />
                    </label>
                    <FormInput
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form?.password}
                      placeholder="Enter Password..."
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-[45px] text-[#302e2edc]"
                    >
                      {showPassword ? <FaEye size={16} /> : <FaEyeSlash size={16} />}
                    </button>
                    {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                  </div>
                  <div className="relative">
                    <label className="text-[#000000] font-[Poppins] flex items-center mb-1">
                      Confirm Password
                      <LuAsterisk className="ml-1 text-red-500" size={15} title="Confirm Password is required" />
                    </label>
                    <FormInput
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={form?.confirmPassword}
                      placeholder="Enter Confirm Password..."
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={toggleConfirmPasswordVisibility}
                      className="absolute right-3 top-[45px] text-[#302e2edc]"
                    >
                      {showConfirmPassword ? <FaEye size={16} /> : <FaEyeSlash size={16} />}
                    </button>
                    {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
                  </div>
                </>
              )}
              <div>
                <label className="text-[#000000] font-[Poppins] flex items-start mb-1">
                  Role
                  <LuAsterisk className="ml-1 text-red-500" size={15} title="Role is required" />
                </label>
                <FormInput
                  type="select"
                  name="role"
                  value={form?.role || ''}
                  onChange={handleChange}
                  options={['Select Role']}
                />
                {errors.role && <p className="text-sm text-red-500">{errors.role}</p>}
              </div>
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div></div>
                <div></div>
                <ButtonTransparent type="button" onClick={closeModal}>Cancel</ButtonTransparent>
                <NewButton type="submit">{isEditMode ? 'Update' : 'Add'}</NewButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddEditAdminUser;
