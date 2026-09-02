import React from 'react'
import FormInput from '../../../../../components/Atoms/FormInput/FormInput'
import ImageUpload from '../../../../../components/Atoms/ImageGallery/ImageUpload'
import FilterSelect from '../../../../../components/Atoms/FilterSelect/FilterSelect'
import DefaultModal from '../../../../../components/Atoms/Modal/DefaultRightSideModal'
import ToggleButton from '../../../../../components/Atoms/ToggleButton/ToggleButton'
import Input from '../../../../../components/Atoms/Input/Input'

const CATEGORY_IMAGE_ACCEPT =
    "image/jpeg,image/jpg,image/png,image/webp,image/svg+xml";
const CATEGORY_IMAGE_HELPER_TEXT = "Supports: JPEG, PNG, WEBP, SVG";

const toTitleCase = (str) =>
    str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

const AddCategoryModal = ({
    isOpen, handleCloseModal, formData, handleFileUpload, handleChange, handleSelectChange, parentCategories, handleSubmit, handleDashboardVisible
}) => {
    const handleNameBlur = (e) => {
        if (!e.target.value.trim()) return;
        const titled = toTitleCase(e.target.value);
        if (titled !== e.target.value) handleChange({ target: { name: e.target.name, value: titled } });
    };

    return (
        <DefaultModal
            title={'Add Category'}
            isOpen={isOpen}
            onClose={handleCloseModal}
            onSubmit={handleSubmit}
        >
            <div className="p-4 space-y-4">
                <div>
                    <FormInput
                        label="Category Name"
                        name="categoryName"
                        value={formData?.categoryName}
                        onChange={handleChange}
                        onBlur={handleNameBlur}
                        required
                    />
                </div>
                <ImageUpload
                    id="category-icon"
                    label="Icon"
                    file={formData?.iconUrl}
                    onChange={(file) => handleFileUpload(file, 'iconUrl')}
                    accept={CATEGORY_IMAGE_ACCEPT}
                    helperText={CATEGORY_IMAGE_HELPER_TEXT}
                />
                <ImageUpload
                    id="category-banner"
                    label="Banner Image"
                    file={formData?.bannerUrl}
                    onChange={(file) => handleFileUpload(file, 'bannerUrl')}
                    accept={CATEGORY_IMAGE_ACCEPT}
                    helperText={CATEGORY_IMAGE_HELPER_TEXT}
                />

                <div className="mb-4">
                    <label className="block mb-1 text-[#1E293B] text-[14px]">Parent Category</label>
                    <FilterSelect
                        options={parentCategories}
                        value={formData?.parentCategory}
                        onChange={(selectedOption) => handleSelectChange(selectedOption, 'parentCategory')}
                        placeholder="Select parent category"
                        className="w-full"
                    />
                </div>

                <div className="flex items-center justify-between p-3 sm:p-4 border rounded-lg">
                    <span className="font-medium text-gray-800 text-sm sm:text-base">
                        Dashboard Visible
                    </span>
                    <ToggleButton
                        isToggle={formData?.isDashboardVisible}
                        handleClick={handleDashboardVisible}
                    />
                </div>
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
        </DefaultModal>
    )
}

export default AddCategoryModal
