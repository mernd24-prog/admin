import React, { useState } from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa6';
import FilterSelect from '../../../../components/Atoms/FilterSelect/FilterSelect';
import Input from '../../../../components/Atoms/Input/Input';

const SpecificationsTab = ({ formData, countryList, handleSelectChange, stateList, cityList, zipCodeList, handleInputChange, error }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [specifications, setSpecifications] = useState([]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="w-full p-4 bg-white">
      <div className="flex items-center justify-between mb-4" onClick={toggleOpen}>
        <div>
          <h2 className="text-lg font-medium text-gray-900">Specifications</h2>
          <p className="text-sm text-gray-500">Manage the product-related specifications.</p>
        </div>
        <button className="text-gray-400">
          {isOpen ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-4">
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <FilterSelect
                label="Country *"
                name="mfd_country"
                value={countryList.find(c => c.value === formData?.mfdData?.mfd_country) || null}
                onChange={(e) => handleSelectChange(e, 'COUNTRY')}
                options={countryList}
                placeholder="Select Country" error={error?.mfd_country}
              />
            </div>
            <div>
              <FilterSelect
                label="State *"
                name="mfd_state"
                value={stateList.find(s => s.value === formData?.mfdData?.mfd_state) || null}
                onChange={(e) => handleSelectChange(e, 'STATE')}
                options={stateList}
                placeholder="Select State"
                disabled={!formData?.mfdData?.mfd_country} error={error?.mfd_state}
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <FilterSelect
                label="City *"
                name="mfd_city"
                value={cityList.find(c => c.value === formData?.mfdData?.mfd_city) || null}
                onChange={(e) => handleSelectChange(e, 'CITY')}
                options={cityList}
                placeholder="Select City"
                disabled={!formData?.mfdData?.mfd_state} error={error?.mfd_city}
              />
            </div>
            <div>
              <FilterSelect
                label="Zip Code *"
                name="mfd_zip_code"
                value={zipCodeList.find(z => z.value === formData?.mfdData?.mfd_zip_code) || null}
                onChange={(e) => handleSelectChange(e, 'ZIP_CODE')}
                options={zipCodeList}
                placeholder="Select Zip Code"
                disabled={!formData?.mfdData?.mfd_city} error={error?.mfd_zip_code}
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Input
                labelName="MFD Date"
                name="mfd_date"
                value={formData?.mfdData?.mfd_date || ''}
                onChange={handleInputChange} type={`date`}
                error={error?.mfd_date}

              />
            </div>
            <div>
              <Input
                labelName="Exp Date"
                name="expiry_date"
                value={formData?.mfdData?.expiry_date || ''}
                type={`date`} onChange={handleInputChange}
                error={error?.expiry_date}
              />
            </div>
          </div>

          {specifications.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 font-medium">Added Specifications:</h3>
              <div className="border divide-y rounded">
                {specifications.map((spec, index) => (
                  <div key={index} className="flex p-2">
                    <div className="w-1/3 font-medium">{spec.name}</div>
                    <div className="w-1/3">{spec.value}</div>
                    <div className="w-1/3 text-gray-500">{spec.group}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SpecificationsTab;