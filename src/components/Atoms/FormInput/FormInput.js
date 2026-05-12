import React, { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi'; // ✅ React Icons

const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  placeholder,
  onChange,
  options = [],
  rows = 3,
  error = '',
  required = false,
  className = '',
  maxLength
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const baseClasses =
    'w-full p-2.5 text-[#475569] bg-[#f3f6f9] text-[14px] rounded border focus:outline-none focus:ring-1';

  const inputClasses = `${baseClasses} ${
    error
      ? 'border-red-500 focus:ring-red-300'
      : 'border-none focus:ring-black/30 peer-focus:outline-none peer-focus:ring-0'
  } ${className}`;

  const selectClasses = `w-full p-2.5 bg-transparent rounded border focus:outline-none focus:ring-1 ${
    error ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-black/30'
  }`;

  const textareaClasses = `w-full p-2 rounded border focus:outline-none focus:ring-1 ${
    error ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-black/30'
  }`;

  const dateClasses = `w-full p-1.5 border rounded focus:outline-none focus:ring-1 ${
    error ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-black/30'
  }`;

  return (
    <div className="mb-4">
      <label className="label block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {type === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={selectClasses}
        >
          {options.map((opt) => (
            <option
              key={typeof opt === 'object' ? (opt.value ?? opt.label) : opt}
              value={typeof opt === 'object' ? (opt.value ?? '') : opt}
            >
              {typeof opt === 'object' ? (opt.label ?? opt.value ?? '') : opt}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={rows}
          placeholder={placeholder}
          className={textareaClasses}
          maxLength={maxLength}
        ></textarea>
      ) : isPasswordField ? (
        <div className="relative">
          <input
            name={name}
            type={showPassword ? 'text' : 'password'}
            value={value}
            placeholder={placeholder}
            onChange={onChange}
            className={inputClasses}
            maxLength={maxLength}
            onInput={(e) => {
              const val = e.target.value.replace(/^[^a-zA-Z0-9]+/, '');
              e.target.value = val;
            }}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600"
          >
            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
      ) : (
        <input
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          className={type === 'date' ? dateClasses : inputClasses}
          maxLength={maxLength}
          onInput={(e) => {
            const val = e.target.value.replace(/^[^a-zA-Z0-9]+/, '');
            e.target.value = val;
          }}
        />
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default FormInput;
