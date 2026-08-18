import React from 'react';
import { toast } from 'sonner';

import FormInput from '../../../../../components/Atoms/FormInput/FormInput';
import Input from '../../../../../components/Atoms/Input/Input';
import DefaultModal from '../../../../../components/Atoms/Modal/DefaultRightSideModal';

const AddHsnModal = ({
    isOpen,
    resetForm,
    handleSubmit,
    formData,
    handleInputChange,
    errors,
}) => {
    const handleModalSubmit = async (e) => {
        e?.preventDefault();

        try {
            await handleSubmit(e);
        } catch (error) {
            console.error('Failed to add HSN Code:', error);

            const errorMessage =
                error?.response?.data?.message ||
                error?.response?.data?.error?.message ||
                'Failed to add HSN Code. Please try again.';

            toast.error(errorMessage);
        }
    };

    return (
        <div>
            <DefaultModal
                title="Add HSN Code"
                isOpen={isOpen}
                onClose={resetForm}
                onSubmit={handleModalSubmit}
            >
                <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-2">
                    <Input
                        labelName="HSN Code"
                        type="text"
                        value={formData.code}
                        name="code"
                        onChange={handleInputChange}
                        error={errors.code}
                        required
                        placeholder="e.g., 49012"
                    />

                    <Input
                        labelName="IGST (%)"
                        type="number"
                        value={formData.IGST}
                        name="IGST"
                        onChange={handleInputChange}
                        error={errors.IGST}
                        required
                    />

                    <Input
                        labelName="CGST (%)"
                        type="number"
                        value={formData.CGST}
                        name="CGST"
                        onChange={handleInputChange}
                        error={errors.CGST}
                        required
                    />

                    <Input
                        labelName="SGST (%)"
                        type="number"
                        value={formData.SGST}
                        name="SGST"
                        onChange={handleInputChange}
                        error={errors.SGST}
                        required
                    />

                    <div className="col-span-1 md:col-span-2">
                        <Input
                            labelName="Additional Tax"
                            type="number"
                            value={formData.additionalTax}
                            name="additionalTax"
                            onChange={handleInputChange}
                            error={errors.additionalTax}
                            required
                        />
                    </div>

                    <div className="md:col-span-2">
                        <FormInput
                            type="textarea"
                            value={formData?.description}
                            onChange={handleInputChange}
                            name="description"
                            label="Description"
                            placeholder="Enter HSN code description..."
                            error={errors?.description}
                            required
                        />
                    </div>
                </div>
            </DefaultModal>
        </div>
    );
};

export default AddHsnModal;