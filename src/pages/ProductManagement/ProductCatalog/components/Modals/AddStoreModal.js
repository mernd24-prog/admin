import React from 'react'
import Input from '../../../../../components/Atoms/Input/Input';
import FilterSelect from '../../../../../components/Atoms/FilterSelect/FilterSelect';
import DefaultModal from '../../../../../components/Atoms/Modal/DefaultRightSideModal';




const AddStoreModal = ({ isOpen, onClose, handleSubmit, formValues, handleInputChange, formErrors, modifiedState = [], modifiedCountry = [], modifiedZipCode = [],
    handleSelectChange, modifiedCity = [], userData, modifiedSellerList

}) => {
    return (
        <div>
            <DefaultModal
                title={`Add Store`}
                isOpen={isOpen}
                onClose={onClose}
                onSubmit={handleSubmit}

            >
                <div className='p-2 space-y-4 py-6 text-xs'>
                    <div className='grid grid-cols-2 gap-4'>

                        {userData?.roleId !== 3 && (
                            <div className='col-span-2'>
                                <FilterSelect
                                    label="Seller *"
                                    name="user_id"
                                    value={modifiedSellerList.find(c => c.value === formValues.user_id) || null}
                                    onChange={(e) => handleSelectChange(e, 'user_id')}
                                    options={modifiedSellerList}
                                    placeholder="Select Seller"
                                    error={formErrors.country_code}
                                />

                            </div>
                        )}

                        <div>
                            <Input
                                labelName="Shop Name *"
                                name="name"
                                value={formValues.name}
                                onChange={handleInputChange}
                                // error={formErrors.name}
                                placeholder="Enter shop name"
                            />
                        </div>
                        <div>
                            <Input
                                labelName="Contact Person *"
                                name="contact_person"
                                value={formValues.contact_person}
                                onChange={handleInputChange}
                                // error={formErrors.contact_person}
                                placeholder="Enter contact person name"
                            />
                        </div>
                    </div>
                    <Input labelName={`GST`} value={formValues?.gstNumber} name={`gstNumber`} onChange={handleInputChange} error={formErrors.gstNumber} />
                    <Input labelName={`PAN`} value={formValues?.panNumber} name={`panNumber`} onChange={handleInputChange} error={formErrors.panNumber} />
                    <Input labelName={`Business License`} value={formValues?.businessLicense} name={`businessLicense`} onChange={handleInputChange}
                        error={formErrors.businessLicense} />
                    <div>
                        <Input
                            labelName="Address *"
                            name="address"
                            value={formValues.address}
                            onChange={handleInputChange}
                            // error={formErrors.address}
                            placeholder="Enter full address"
                        />
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <FilterSelect
                                label="Country *"
                                name="country_code"
                                value={modifiedCountry.find(c => c.value === formValues.country_code) || null}
                                onChange={(e) => handleSelectChange(e, 'COUNTRY')}
                                options={modifiedCountry}
                                placeholder="Select Country"
                            // error={formErrors.country_code}
                            />
                        </div>
                        <div>
                            <FilterSelect
                                label="State *"
                                name="state_code"
                                value={modifiedState.find(s => s.value === formValues.state_code) || null}
                                onChange={(e) => handleSelectChange(e, 'STATE')}
                                options={modifiedState}
                                placeholder="Select State"
                                disabled={!formValues.country_code}
                            // error={formErrors.state_code}
                            />
                        </div>
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <FilterSelect
                                label="City *"
                                name="city_code"
                                value={modifiedCity.find(c => c.value === formValues.city_code) || null}
                                onChange={(e) => handleSelectChange(e, 'CITY')}
                                options={modifiedCity}
                                placeholder="Select City"
                                disabled={!formValues.state_code}
                            // error={formErrors.city_code}
                            />
                        </div>
                        <div>
                            <FilterSelect
                                label="Zip Code *"
                                name="zip_code"
                                value={modifiedZipCode.find(z => z.value === formValues.zip_code) || null}
                                onChange={(e) => handleSelectChange(e, 'ZIP_CODE')}
                                options={modifiedZipCode}
                                placeholder="Select Zip Code"
                                disabled={!formValues.city_code}
                            // error={formErrors.zip_code}
                            />
                        </div>
                        <Input labelName={`Longitude's`} value={formValues?.location?.coordinates[0]} name={`coordinates`} onChange={(e) => handleInputChange(e, 0)}
                        />
                        <Input labelName={`Latitudes`} value={formValues?.location?.coordinates[1]} name={`coordinates`} onChange={(e) => handleInputChange(e, 1)}
                        />
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                        <div>
                            <Input
                                labelName="Phone"
                                name="phone"
                                value={formValues.phone}
                                onChange={handleInputChange}
                                // error={formErrors.phone}
                                placeholder="Enter phone number"
                            />
                        </div>
                        <div>
                            <Input
                                labelName="Mobile *"
                                name="mobile"
                                value={formValues.mobile}
                                onChange={handleInputChange}
                                // error={formErrors.mobile}
                                placeholder="Enter mobile number"
                            />
                        </div>
                    </div>
                    <div>
                        <Input
                            labelName="Email *"
                            name="email"
                            type="email"
                            value={formValues.email}
                            onChange={handleInputChange}
                            // error={formErrors.email}
                            placeholder="Enter email address"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Input
                                labelName="Open Time * (24hr format)"
                                name="open_time"
                                type="time"
                                value={formValues.open_time}
                                onChange={handleInputChange}
                                // error={formErrors.open_time}
                                placeholder="e.g., 900 for 9:00 AM"
                            />
                        </div>
                        <div>
                            <Input
                                labelName="Close Time * (24hr format)"
                                name="close_time"
                                type="time"
                                value={formValues.close_time}
                                onChange={handleInputChange}
                                // error={formErrors.close_time}
                                placeholder="e.g., 2100 for 9:00 PM"
                            />
                        </div>
                    </div>
                </div>
            </DefaultModal>
        </div>
    )
}

export default AddStoreModal