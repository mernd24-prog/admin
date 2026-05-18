import React, { useState, useEffect } from 'react';
// import ReactSelect from 'react-select';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import { RxCross2 } from 'react-icons/rx';
import Button from '../../../../components/Atoms/buttons/button';
import TransparentButton from '../../../../components/Atoms/buttons/TransParentButton'
import FilterSelect from '../../../../components/Atoms/FilterSelect/FilterSelect';
import ImageUpload from '../../../../components/Atoms/ImageGallery/ImageUpload';
import { toast } from 'sonner';
import { uploadFile } from '../../../../_helpers/globalFunctions';
import Loader from '../../../../components/Loader/Loader';
import ToggleButton from '../../../../components/Atoms/ToggleButton/ToggleButton';
import Input from '../../../../components/Atoms/Input/Input';

const CategorySetup = ({
  isOpen,
  handleClose,
  handleResetForm,
  formData,
  setFormData,
  parentCategories,
  handleSubmit,
  isPublish,
  handleIsPublish,
  errors, // Added errors prop
  setErrors, // Added setErrors prop
  isEditing, // Added isEditing prop
  handleDashboardVisible
}) => {
  const [localErrors, setLocalErrors] = useState({
    categoryName: '',
    seoUrl: ''
  });
  const [isLoading, setIsLoading] = useState(false)
  
  // Sync errors with parent component
  useEffect(() => {
    if (errors) {
      setLocalErrors(errors);
    }
  }, [errors]);

  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'categoryName':
        if (!value.trim()) {
          error = 'Category name is required';
        } else if (value.length > 50) {
          error = 'Category name must be less than 50 characters';
        }
        break;
      case 'seoUrl':
        if (!value.trim()) {
          error = 'Thumbnail URL is required';
        } else if (!/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(value)) {
          error = 'Please enter a valid URL';
        }
        break;
      default:
        break;
    }

    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validate the field
    const error = validateField(name, value);

    setLocalErrors(prev => ({
      ...prev,
      [name]: error
    }));

    setFormData((prevState) => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSelectChange = (selectedOption, name) => {
    setFormData((prevState) => ({
      ...prevState,
      [name]: selectedOption
    }));
  };

  const validateForm = () => {
    const newErrors = {
      categoryName: validateField('categoryName', formData.categoryName),
      seoUrl: validateField('seoUrl', formData.seoUrl)
    };

    setLocalErrors(newErrors);

    // Return true if no errors
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleLocalSubmit = () => {
    if (validateForm()) {
      handleSubmit();
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp'];
    const fileExtension = file.name?.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error('Only JPG/PNG/WEBP files are allowed');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size should not exceed 5MB');
      return;
    }

    try {
      setIsLoading(true)
      const uploadedImageUrl = await uploadFile(file, 'THUMBNAILS');
      setFormData((prev) => ({
        ...prev,
        seoUrl: uploadedImageUrl,
      }))
      setLocalErrors((prev) => ({
        ...prev,
        seoUrl: '',
      }));;

      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error(error || 'Failed to upload image');
      console.error('File upload error:', error);
    } finally {
      setIsLoading(false)
    }
  };

  return (
    <>
      <Loader loading={isLoading} />
      {/* Blur & dark overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-40"
          onClick={handleClose}
        ></div>
      )}

      {/* Responsive Slide-in Category Setup Drawer */}
      <div
        className={`fixed top-0 right-0 h-full 
          w-full sm:w-[500px] md:w-[500px] lg:w-[500px] 
          max-w-full sm:max-w-[500px]
          bg-white shadow-xl transform transition-transform duration-300 ease-in-out 
          border-l border-gray-200 z-50 
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header - Responsive padding */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 truncate pr-2">
            {isEditing ? 'Edit Category' : 'Add New Category'}
          </h2>
          <button 
            onClick={handleClose} 
            className="text-gray-500 hover:text-gray-700 flex-shrink-0 p-1"
          >
            <RxCross2 size={20} className="sm:w-[22px] sm:h-[22px]" />
          </button>
        </div>

        {/* Form Content - Responsive padding and spacing */}
        <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 
          h-[calc(100vh-140px)] sm:h-[calc(100vh-120px)] 
          overflow-hidden overflow-y-auto">

          {/* Category Name */}
          <div>
            <FormInput
              label="Category Name"
              name="categoryName"
              value={formData?.categoryName}
              onChange={handleChange}
              error={localErrors.categoryName}
              className={localErrors.categoryName ? 'border-red-500' : ''}
              required
            />
          </div>

          {/* Image Upload */}
          <div>
            <ImageUpload
              id="thumbnails"
              label="Thumbnails"
              file={formData?.seoUrl}
              onChange={(file) => handleFileUpload(file)}
              error={errors?.seoUrl}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              required
            />
            {localErrors.seoUrl && (
              <p className="mt-1 text-xs text-red-600">{localErrors.seoUrl}</p>
            )}
          </div>

          {/* Parent Category */}
          <div>
            <label className="block mb-1 text-[#1E293B] text-sm font-medium">
              Parent Category
            </label>
            <FilterSelect
              options={parentCategories}
              value={formData?.parentCategory}
              onChange={(selectedOption) => handleSelectChange(selectedOption, 'parentCategory')}
              placeholder="Select parent category"
              className="w-full"
            />
          </div>

          {/* Publish Toggle */}
          <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg">
            <span className="font-medium text-gray-800 text-sm sm:text-base">
              Publish
            </span>
            <button
              className={`w-11 sm:w-12 h-5 sm:h-6 rounded-full relative transition-colors duration-200 
                ${isPublish ? 'bg-blue-500' : 'bg-gray-200'}`}
              onClick={handleIsPublish}
            >
              <span className={`absolute w-3 sm:w-4 h-3 sm:h-4 bg-white rounded-full 
                top-1 transition-all duration-200 
                ${isPublish ? 'right-1' : 'left-1'}`}></span>
            </button>
          </div>

          {/* Dashboard Visible Toggle */}
          <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg">
            <span className="font-medium text-gray-800 text-sm sm:text-base">
              Dashboard Visible
            </span>
            <ToggleButton 
              isToggle={formData?.isDashboardVisible} 
              handleClick={handleDashboardVisible} 
            />
          </div>

          {/* Priority Input - Conditional */}
          {formData?.isDashboardVisible && (
            <div>
              <Input
                value={formData?.priority}
                name="priority"
                onChange={handleChange}
                labelName="Priority"
                type='number'
              />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 
          p-3 sm:p-4 flex flex-col-reverse sm:flex-row 
          justify-between items-stretch sm:items-center gap-3 sm:gap-0 z-10">
          <TransparentButton 
            onClick={handleResetForm} 
            label='Reset'
            className="w-full sm:w-auto"
          />
          <Button 
            onClick={handleLocalSubmit}
            className="w-full sm:w-auto"
          >
            {isEditing ? 'Update' : 'Submit'}
          </Button>
        </div>
      </div>
    </>
  );
};

export default CategorySetup;
