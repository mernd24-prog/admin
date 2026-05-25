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

  const baseClasses = 'admin-input';

  const inputClasses = `${baseClasses} ${
    error
      ? '!border-red-500 focus:!ring-red-100'
      : ''
  } ${className}`;

  const selectClasses = `admin-input ${
    error ? '!border-red-500 focus:!ring-red-100' : ''
  }`;

  const textareaClasses = `admin-input !h-auto py-3 ${
    error ? '!border-red-500 focus:!ring-red-100' : ''
  }`;

  const dateClasses = `admin-input ${
    error ? '!border-red-500 focus:!ring-red-100' : ''
  }`;

  return (
    <div className="mb-4">
      <label className="admin-label">
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
