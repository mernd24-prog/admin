import React, { useState } from 'react'
import { LuAsterisk } from 'react-icons/lu'
import { FaEyeSlash } from 'react-icons/fa'
import { MdOutlineLock } from 'react-icons/md'
import { FiEye } from 'react-icons/fi';


const PasswordInput = React.memo(
  ({
    id = 'default-id',
    name = 'default-name',
    placeholder = 'Enter password',
    label = '',
    icon: Icon = MdOutlineLock,
    inputClassName = '',
    iconClassName = '',
    containerClassName = '',
    labelClassName = '',
    autoComplete = 'off',
    errorMessage = '',
    required = false,
    value = '',
    ...rest
  }) => {
    const [type, setType] = useState('password')
    const clickEyeButton = () => {
      setType(type === 'password' ? 'text' : 'password')
    }

    return (
      <div className={containerClassName}>
        {label && (
          <label
            htmlFor={id}
            className={`label ${labelClassName}`}
          >
            {label}
            <LuAsterisk className='inline text-[#8B0A1A]  absolute' />
            {required && (
              <LuAsterisk className='inline ml-1 text-[#8B0A1A]' size={12} />
            )}
          </label>
        )}
        <div className='relative mt-1'>
          {/* <Icon
            className={`absolute left-3 top-3 text-black text-[1.3rem] ${iconClassName}`}
          /> */}
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            autoComplete={autoComplete}
            required={required}
            className={`bg-[#f3f6f9] text-[#474747] h-[2.625rem] w-full px-4 py-[0.6rem] text-[0.85rem] leading-[1.5] 
                   rounded-[3px] border border-transparent transition-all duration-300 ease-in-out 
                   appearance-none focus:outline-none focus:ring-2 focus:ring-blue-400
              ${inputClassName}
              ${errorMessage ? 'border-[#fe3c6a]/50' : ''}
            `}
            placeholder={placeholder}
            {...rest}
          />
          {type === 'password' ? (
            <FiEye
              size={15}
              className={`absolute right-3 top-3.5 text-lg  cursor-pointer text-gray-600 ${iconClassName}`}
              onClick={clickEyeButton}
            />
          ) : (
            <FaEyeSlash
              size={15}

              className={`absolute right-3 top-3.5  cursor-pointer text-gray-600 ${iconClassName}`}
              onClick={clickEyeButton}
            />
          )}
          {errorMessage && (
            <div className='text-[#8B0A1A] text-xs mt-1'>{errorMessage}</div>
          )}
        </div>
      </div>
    )
  }
)

export default PasswordInput
