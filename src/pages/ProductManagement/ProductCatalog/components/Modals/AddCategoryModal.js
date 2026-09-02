import React from 'react'
import FormInput from '../../../../../components/Atoms/FormInput/FormInput'
import ImageUpload from '../../../../../components/Atoms/ImageGallery/ImageUpload'
import FormSelectGroup from '../../../../../components/Atoms/FormSelectGroup/FormSelectGroup'
import DefaultModal from '../../../../../components/Atoms/Modal/DefaultRightSideModal'
import FormToggleRow from '../../../../../components/Atoms/FormToggleRow/FormToggleRow'
import Input from '../../../../../components/Atoms/Input/Input'

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
                    subtext="Recommended: PNG or WEBP"
                    file={formData?.iconUrl}
                    onChange={(file) => handleFileUpload(file, 'iconUrl')}
                    onRemove={() => handleFileUpload('', 'iconUrl')}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                />
                <ImageUpload
                    id="category-banner"
                    label="Banner Image"
                    subtext="Recommended: JPG, PNG or WEBP"
                    file={formData?.bannerUrl}
                    onChange={(file) => handleFileUpload(file, 'bannerUrl')}
                    onRemove={() => handleFileUpload('', 'bannerUrl')}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                />

                <FormSelectGroup
                    label="Parent Category"
                    options={parentCategories}
                    value={formData?.parentCategory}
                    onChange={(selectedOption) => handleSelectChange(selectedOption, 'parentCategory')}
                    placeholder="Select parent category"
                />

                <FormToggleRow
                    title="Dashboard Visible"
                    isToggle={formData?.isDashboardVisible}
                    handleClick={handleDashboardVisible}
                />
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
