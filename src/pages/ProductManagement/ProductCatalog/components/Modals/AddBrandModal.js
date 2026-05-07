import React from 'react';
import Input from '../../../../../components/Atoms/Input/Input';
import ImageUpload from '../../../../../components/Atoms/ImageGallery/ImageUpload';
import DefaultModal from '../../../../../components/Atoms/Modal/DefaultRightSideModal';


const AddBrandModal = ({
    formValues,
    handleInputChange,
    handleFileUpload,
    isOpen,
    handleCloseModal,
    handleSubmit,
    errors,
}) => {
    return (
        <DefaultModal
            title={'Add Brand'}
            isOpen={isOpen}
            onClose={handleCloseModal}
            onSubmit={handleSubmit}
        >
            <div className="p-4 space-y-4">
                <Input
                    labelName="Brand Name"
                    name="name"
                    value={formValues?.name}
                    onChange={handleInputChange}
                    error={errors?.name}
                    placeholder="Enter brand name"
                />
                <ImageUpload
                    label="Thumbnails"
                    onChange={(file) => handleFileUpload(file, 'THUMBNAILS')}
                    file={formValues?.thumbnails}
                />
                <ImageUpload
                    label="Logo"
                    onChange={(file) => handleFileUpload(file, 'BRANDS')}
                    file={formValues?.logo}
                />
            </div>
        </DefaultModal>
    );
};

export default AddBrandModal;
