import React, { useState } from 'react';
import { MdOutlineClose } from 'react-icons/md';
import FormInput from '../../../../components/Atoms/FormInput/FormInput';
import ButtonTransparent from '../../../../components/ButtonTransparent/button';
import NewButton from '../../../../components/Button/NewButton';
import { RxCross2 } from 'react-icons/rx';
import TransparentButton from '../../../../components/Atoms/buttons/TransParentButton';
import Button from '../../../../components/Atoms/buttons/button';

const ProductOptionSetup = ({ isOpen,
  onClose,
  onSubmit,
  children,
  isButtonView = true,
  submitButtonText = "Submit",
  closeButtonText = "Reset",
  title,
  titleClassName = '' }) => {
  const [formData] = useState({
    product: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('FBT Data:', formData);
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 -top-3 transition-all duration-300 ease-in-out 
                       ${isOpen ? "bg-black bg-opacity-30 backdrop-blur-sm -top-3 h-full" : "bg-transparent backdrop-blur-0 pointer-events-none"}
                   `}
        onClick={onClose}
      />
      <div
        className={`
                       fixed -top-3 right-0 h-full md:w-[400px] lg:w-[500px] w-full  bg-white shadow-xl z-50 md:text-sm text-xs
                       transform transition-transform duration-300 ease-in-out
                       ${isOpen ? "translate-x-0" : "translate-x-full"}
                   `}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className={`text-xl font-semibold text-gray-800 ${titleClassName}`}>{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors duration-150"
          >
            <RxCross2 size={22} />
          </button>
        </div>

        <div className="h-[calc(100%-120px)] overflow-y-auto">{children}</div>

        {isButtonView && (
          <div className="absolute bottom-0 left-0 right-0 bg-white p-4 flex justify-between items-center border-t border-gray-200">
            <TransparentButton onClick={onClose} label={closeButtonText} />
            <Button onClick={onSubmit}>{submitButtonText}</Button>
          </div>
        )}
      </div>
    </>

  );
};

export default ProductOptionSetup;
