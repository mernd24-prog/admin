import React from 'react';
import Select from 'react-select';

const customStyles = (error) => ({
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#F7FAFC',
    borderColor: error ? '' : 'transparent',
    boxShadow: error ? '0 0 0 1px #E53E3E' : 'none',
    borderRadius: '0.375rem',
    minHeight: '42px',
    paddingLeft: '0.5rem',
    paddingRight: '0.5rem',
    cursor: 'pointer',
    '&:hover': {
      borderColor: error ? '' : '#CBD5E0',
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#4A5568',
    fontSize: '0.875rem',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#2D3748',
    fontSize: '0.875rem',
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: '0 4px',
    // color: hasError ? '#DC3545' : '#718096',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
    position: 'absolute',
  }),
});

const FilterSelect = ({
  label,
  options,
  value,
  onChange,
  isDisabled = false,
  placeholder = label ? label : "Search by User's Name or Username",
  isMulti = false,
  error = "", // <-- new prop
  required
}) => {
  return (
    <div className='relative'>
      <label className="label block text-sm font-medium text-gray-700 mb-3">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative text-sm min-w-40">
        <Select
          styles={customStyles(error)}
          className='capitalize'
          options={options}
          value={value}
          onChange={onChange}
          isDisabled={isDisabled}
          placeholder={placeholder}
          isMulti={isMulti}
        />
        <span className='text-xs text-red-500'>{error}</span>
      </div>
    </div>
  );
};

export default FilterSelect;