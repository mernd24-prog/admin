import React from 'react'
import Input from '../../../../../components/Atoms/Input/Input'
import FormInput from '../../../../../components/Atoms/FormInput/FormInput'
import DefaultModal from '../../../../../components/Atoms/Modal/DefaultRightSideModal'

const AddQtyHead = ({ formData, handleInputChange, isOpen, handleCloseModal, handleSubmit,errors }) => {
    return (
        <DefaultModal
            title={'Add Quantity'}
            isOpen={isOpen}
            onClose={handleCloseModal}
            onSubmit={handleSubmit}
        >
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-3'>

                <Input
                    labelName='Name'
                    type='text'
                    value={formData.name}
                    name='name'
                    onChange={handleInputChange}
                    error={errors.name}
                    required
                />
                <Input
                    labelName='Value'
                    type='text'
                    value={formData.value}
                    name='value'
                    onChange={handleInputChange}
                    error={errors.value}
                    required
                />
                <div className='col-span-2'>
                    <Input
                        labelName='Example'
                        type='text'
                        value={formData.example}
                        name='example'
                        onChange={handleInputChange}
                        error={errors.example}
                        required
                    />
                </div>
                <div className='col-span-2'>
                    <FormInput type={`textarea`} value={formData?.description} name={`description`} onChange={handleInputChange} label={`Description`}
                    error={errors?.description} 
                    />
                </div>


            </div>
        </DefaultModal>
    )
}

export default AddQtyHead