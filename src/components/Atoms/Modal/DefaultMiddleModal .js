import React, { useEffect } from "react";
import { RxCross2 } from "react-icons/rx";
import Button from "../buttons/button";
import TransparentButton from "../buttons/TransParentButton";

const DefaultMiddleModal = ({
    isOpen,
    onClose,
    onSubmit,
    children,
    isButtonView = true,
    submitButtonText = "Submit",
    closeButtonText = "Reset",
    title,
    buttonsClassName
}) => {
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "auto";
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isOpen]);

    return (
        <>
            <div
                className={`fixed inset-0 z-40 transition-all duration-300 ease-in-out 
                    ${isOpen ? "bg-black bg-opacity-30 backdrop-blur-sm" : "bg-transparent backdrop-blur-0 pointer-events-none"}
                `}
                onClick={onClose}
            />

            <div
                className={`
                    fixed left-1/2 top-1/2 transform 
                    ${isOpen ? "-translate-y-1/2 opacity-100 scale-100" : "-translate-y-[200%] opacity-0 scale-95 pointer-events-none"}
                    -translate-x-1/2 bg-white rounded-lg shadow-xl z-50 flex flex-col
                    transition-all duration-500 ease-in-out 
                    w-[calc(100%-2rem)] md:w-[600px] lg:w-[700px]
                    max-h-[calc(100vh-4rem)]  
                `}
                style={{ willChange: "transform, opacity" }}
            >
                <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-gray-200">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors duration-150"
                        aria-label="Close modal"
                    >
                        <RxCross2 size={20} className="md:size-[22px]" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 md:p-6 flex-1">{children}</div>

                {isButtonView && (
                    <div className={`sticky bottom-0 left-0 right-0 bg-white p-3 md:p-4 flex justify-between items-center border-t border-gray-200 ${buttonsClassName}`}>
                        <TransparentButton onClick={onClose} label={closeButtonText} />
                        <Button onClick={onSubmit}>{submitButtonText}</Button>
                    </div>
                )}
            </div>
        </>
    );
};

export default DefaultMiddleModal;