import React from 'react'

import { IoIosCloseCircle } from 'react-icons/io'
import Button from '../Atoms/buttons/button'
 
 
const Modal = ({
  isOpen,
  closeModal,
  children,
  heading = '',
  transparentButtonClassName = "",
  buttonClassName = "",
  buttonStyle = {},
  modalClassName = "",
  headingClassName = "",
  childrenClassName = "",
  onSubmit = () => { },
  showFooter = true,
  showSubmitButton = true,
  showCancelButton = true,
  submitButtonChildren = "Submit",
  cancelButtonChildren = "Cancel",closeButton=false
}) => {
  if (!isOpen) return null

  const handleSubmit = () => {
    if (typeof onSubmit === 'function') {
      onSubmit()
      return
    }
    closeModal()
  }
 
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className={`bg-[#FAFAFA] rounded-lg w-11/12 lg:w-[900px] max-h-screen overflow-hidden ${modalClassName}`}>
        <div className="flex justify-between items-center border-b border-[#ffff]/10 py-3 pt-8 px-5">
          <h2 className={`text-xl text-[#212121] font-semibold ${headingClassName}`}>{heading}</h2>
          {closeButton&&(
            <IoIosCloseCircle onClick={closeModal} className='text-2xl text-black-400 mr-3'/>
          )}
        </div>
 
        <div className={`p-5 overflow-y-auto flex-1 ${childrenClassName}`} style={{ maxHeight: 'calc(100vh - 180px)' }}>
          {children}
        </div>
 
        {/* Footer */}
        {showFooter && (
          <div className="flex justify-end px-5 py-4 border-t ">
            <div className="flex justify-end gap-4 w-full md:w-1/2">
              {showCancelButton && (
                <Button
                  className={`!bg-[#F5F5F5] px-6 py-2 text-sm md:text-base w-full ${transparentButtonClassName}`}
                  onClick={closeModal}
                >
                  {cancelButtonChildren}
                </Button>
              )}
              {showSubmitButton && (
                <Button
                  className={`px-6 py-2 text-sm md:text-base w-full ${buttonClassName}`}
                  style={buttonStyle}
                  onClick={handleSubmit}
                >
                  {submitButtonChildren}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
 
  )
}
 
export default Modal
