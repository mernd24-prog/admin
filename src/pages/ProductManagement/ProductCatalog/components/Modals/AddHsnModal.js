import React from 'react'
import FormInput from '../../../../../components/Atoms/FormInput/FormInput'
import Input from '../../../../../components/Atoms/Input/Input'
import DefaultModal from '../../../../../components/Atoms/Modal/DefaultRightSideModal'

const AddHsnModal = ({ isOpen, resetForm, handleSubmit, formData, handleInputChange, errors }) => {
    return (
        <div>

            <DefaultModal
                title={'Add HSN Code'}
                isOpen={isOpen}
                onClose={resetForm}
                onSubmit={handleSubmit}
            >
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-3'>
                    <Input
                        labelName='HSN Code'
                        type='text'
                        value={formData.code}
                        name='code'
                        onChange={handleInputChange}
                        error={errors.code}
                        required
                        placeholder="e.g., 49012"
                    />

                    <Input
                        labelName='IGST (%)'
                        type='number'
                        value={formData.IGST}
                        name='IGST'
                        onChange={handleInputChange}
                        error={errors.IGST}

                    />

                    <Input
                        labelName='CGST (%)'
                        type='number'
                        value={formData.CGST}
                        name='CGST'
                        onChange={handleInputChange}
                        error={errors.CGST}

                    />

                    <Input
                        labelName='SGST (%)'
                        type='number'
                        value={formData.SGST}
                        name='SGST'
                        onChange={handleInputChange}
                        error={errors.SGST}

                    />
                    <div className='col-span-2'>
                        <Input
                            labelName='Additional Tax'
                            type='number'
                            value={formData.additionalTax}
                            name='additionalTax'
                            onChange={handleInputChange}

                        />
                    </div>

                    <div className="md:col-span-2">
                        <FormInput
                            type='textarea'
                            value={formData?.description}
                            onChange={handleInputChange}
                            name='description'
                            label='Description'
                            placeholder="Enter HSN code description..."
                            error={errors?.description}
                        />
                    </div>

                </div>
            </DefaultModal>
        </div>
    )
}

export default AddHsnModal