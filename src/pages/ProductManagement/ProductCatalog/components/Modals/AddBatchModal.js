import React from 'react'
import DefaultModal from '../../../../../components/Atoms/Modal/DefaultRightSideModal'
import Input from '../../../../../components/Atoms/Input/Input'

const AddBatchModal = ({ formValues, handleInputChange, isOpen, handleCloseModal, handleSubmit, errors }) => {
    return (
        <DefaultModal
            title={'Add Batch'}
            isOpen={isOpen}
            onClose={handleCloseModal}
            onSubmit={handleSubmit}
        >
            <div className="p-6 space-y-4">
                <Input
                    labelName="Batch Code"
                    name="batchCode"
                    value={formValues.batchCode}
                    onChange={handleInputChange}
                    placeholder="Enter Batch Code"
                    error={errors.batchCode}
                />

                <Input
                    labelName="Manufacture Date"
                    name="manufactureDate"
                    type="date"
                    value={formValues.manufactureDate}
                    onChange={handleInputChange}
                    error={errors.manufactureDate}
                />

                <Input
                    labelName="Expiry Date"
                    name="expire_date"
                    type="date"
                    value={formValues.expire_date}
                    onChange={handleInputChange}
                    error={errors.expiryDate}
                />

            </div>
        </DefaultModal>
    )
}

export default AddBatchModal