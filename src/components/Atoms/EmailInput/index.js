import React, { useState, useCallback, useEffect, useRef } from 'react'
import { LuAsterisk } from 'react-icons/lu'
import { AiOutlineUser } from 'react-icons/ai'

const EmailInput = React.memo(
  ({
    id = 'email',
    name = 'email',
    value = '',
    placeholder = '',
    onChange,
    onBlur,
    icon: Icon = AiOutlineUser,
    className = '',
    containerClassName = '',
    inputClassName = '',
    label = '',
    labelClassName = '',
    errorMessage,
    iconClassName = '',
    isDisable = false,
    autoFocus = false,
    ...rest
  }) => {
    const [email, setEmail] = useState(value)
    const [, setIsValid] = useState(true)
    const MIN_EMAIL_LENGTH = 3

    const handleChange = useCallback(
      event => {
        const newEmail = event.target.value
        setEmail(newEmail)
        setIsValid(newEmail.length >= MIN_EMAIL_LENGTH)
        if (onChange) {
          onChange(event)
        }
      },
      [onChange]
    )

    const handleBlur = useCallback(
      event => {
        setIsValid(email.length >= MIN_EMAIL_LENGTH)
        if (onBlur) {
          onBlur(event)
        }
      },
      [email, onBlur]
    )

    useEffect(() => {
      setEmail(value)
      setIsValid(value.length >= MIN_EMAIL_LENGTH)
    }, [value])

    const inputRef = useRef()
    useEffect(() => {
      if (autoFocus && inputRef.current) {
        inputRef.current.focus()
      }
    }, [autoFocus])

    return (
      <div className={containerClassName}>
        {label && (
          <label
            htmlFor={id}
            className={`${labelClassName} label`}
          >
            {label}
            <LuAsterisk className='inline text-[#8B0A1A]  absolute' />
          </label>
        )}
        <div className='relative mt-1'>
          {/* <Icon
            className={`absolute left-3 top-3 text-black text-[1.3rem] ${iconClassName}`}
          /> */}
          <input
            disabled={isDisable}
            id={id}
            name={name}
            type='text'
            value={email}
            autoComplete='off'
            onChange={handleChange}
            onBlur={handleBlur}
            className={`
              bg-[#f3f6f9] text-[#474747] h-[2.625rem] w-full px-4 py-[0.6rem] text-[0.85rem] leading-[1.5] 
                   rounded-[3px] border border-transparent transition-all duration-300 ease-in-out 
                   appearance-none focus:outline-none focus:ring-2 focus:ring-blue-400
              ${inputClassName}
              ${errorMessage ? 'border-[#fe3c6a]/50' : ''}
            `}
            placeholder={placeholder}
            ref={inputRef}
            {...rest}
          />
          {errorMessage && (
            <div className='text-[#8B0A1A] text-[12px] mt-1'>
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    )
  }
)

export default EmailInput
