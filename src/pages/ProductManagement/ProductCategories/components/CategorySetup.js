import React, { useState, useEffect } from "react";
// import ReactSelect from 'react-select';
import FormInput from "../../../../components/Atoms/FormInput/FormInput";
import { RxCross2 } from "react-icons/rx";
import Button from "../../../../components/Atoms/buttons/button";
import TransparentButton from "../../../../components/Atoms/buttons/TransParentButton";
import FilterSelect from "../../../../components/Atoms/FilterSelect/FilterSelect";
import ImageUpload from "../../../../components/Atoms/ImageGallery/ImageUpload";
import { toast } from "sonner";
import { uploadFile } from "../../../../_helpers/globalFunctions";
import Loader from "../../../../components/Loader/Loader";
import ToggleButton from "../../../../components/Atoms/ToggleButton/ToggleButton";
import Input from "../../../../components/Atoms/Input/Input";
import DefaultModal from "../../../../components/Atoms/Modal/DefaultRightSideModal";

const CATEGORY_IMAGE_ACCEPT =
  "image/jpeg,image/jpg,image/png,image/webp,image/svg+xml";
const CATEGORY_IMAGE_HELPER_TEXT = "Supports: JPEG, PNG, WEBP, SVG";

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
  handleDashboardVisible,
}) => {
  const [localErrors, setLocalErrors] = useState({
    categoryName: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync errors with parent component
  useEffect(() => {
    if (errors) {
      setLocalErrors(errors);
    }
  }, [errors]);

  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "categoryName":
        if (!value.trim()) {
          error = "Category name is required";
        } else if (value.length > 50) {
          error = "Category name must be less than 50 characters";
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

    setLocalErrors((prev) => ({
      ...prev,
      [name]: error,
    }));

    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSelectChange = (selectedOption, name) => {
    setFormData((prevState) => ({
      ...prevState,
      [name]: selectedOption,
    }));
  };

  const validateForm = () => {
    const newErrors = {
      categoryName: validateField("categoryName", formData.categoryName),
    };

    setLocalErrors(newErrors);

    // Return true if no errors
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleLocalSubmit = () => {
    if (validateForm()) {
      handleSubmit();
    }
  };

  const handleImageUpload = async (file, fieldName) => {
    if (!file) return;
    const allowedTypes = [
      "image/png",
      "image/jpg",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ];
    const allowedExtensions = ["png", "jpg", "jpeg", "webp", "svg"];
    const fileExtension = file.name?.split(".").pop()?.toLowerCase();
    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(fileExtension)
    ) {
      toast.error("Only JPG/PNG/WEBP/SVG files are allowed");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File size should not exceed 5MB");
      return;
    }

    try {
      setIsLoading(true);
      const uploadedImageUrl = await uploadFile(file, "THUMBNAILS");
      setFormData((prev) => ({
        ...prev,
        [fieldName]: uploadedImageUrl,
      }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error(error || "Failed to upload image");
      console.error("File upload error:", error);
    } finally {
      setIsLoading(false);
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

      {/* Category Setup Side Drawer */}
      <DefaultModal
        isOpen={isOpen}
        onClose={handleClose}
        onSubmit={handleLocalSubmit}
        title={isEditing ? "Edit Category" : "Add New Category"}
        submitButtonText={isEditing ? "Update" : "Submit"}
        closeButtonText="Reset"
        isButtonView={true}
      >
        <div className="space-y-4 sm:space-y-6">
          {/* Category Name */}
          <div>
            <FormInput
              label="Category Name"
              name="categoryName"
              value={formData?.categoryName}
              onChange={handleChange}
              error={localErrors.categoryName}
              className={localErrors.categoryName ? "border-red-500" : ""}
              required
            />
          </div>

          {/* Category Icon */}
          <div>
            <ImageUpload
              id="category-icon"
              label="Icon"
              file={formData?.iconUrl}
              onChange={(file) => handleImageUpload(file, "iconUrl")}
              accept={CATEGORY_IMAGE_ACCEPT}
              helperText={CATEGORY_IMAGE_HELPER_TEXT}
            />
          </div>

          {/* Banner Image */}
          <div>
            <ImageUpload
              id="category-banner"
              label="Banner Image"
              file={formData?.bannerUrl}
              onChange={(file) => handleImageUpload(file, "bannerUrl")}
              accept={CATEGORY_IMAGE_ACCEPT}
              helperText={CATEGORY_IMAGE_HELPER_TEXT}
            />
          </div>

          {/* Parent Category */}
          <div>
            <label className="mb-1 block text-[#1E293B] text-sm font-medium">
              Parent Category
            </label>

            <FilterSelect
              options={parentCategories}
              value={formData?.parentCategory}
              onChange={(selectedOption) =>
                handleSelectChange(selectedOption, "parentCategory")
              }
              placeholder="Select parent category"
              className="w-full"
            />
          </div>

          {/* Publish Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 sm:p-4">
            <span className="text-sm font-medium text-gray-800 sm:text-base">
              Publish
            </span>

            <ToggleButton isToggle={isPublish} handleClick={handleIsPublish} />
          </div>

          {/* Dashboard Visible Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 sm:p-4">
            <span className="text-sm font-medium text-gray-800 sm:text-base">
              Dashboard Visible
            </span>

            <ToggleButton
              isToggle={formData?.isDashboardVisible}
              handleClick={handleDashboardVisible}
            />
          </div>

          {/* Priority */}
          {formData?.isDashboardVisible && (
            <div>
              <Input
                value={formData?.priority}
                name="priority"
                onChange={handleChange}
                labelName="Priority"
                type="number"
              />
            </div>
          )}
        </div>
      </DefaultModal>
    </>
  );
};

export default CategorySetup;
